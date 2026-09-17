// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CredentialResolver } from "../contracts/CredentialResolver.sol";
import {
    IEAS,
    Attestation,
    AttestationRequest,
    AttestationRequestData,
    RevocationRequest,
    RevocationRequestData
} from "../lib/bas/src/IEAS.sol";
import { SchemaRecord } from "../lib/bas/src/ISchemaRegistry.sol";
import { EMPTY_UID, NO_EXPIRATION_TIME, AccessDenied, NotFound } from "../lib/bas/src/Common.sol";

/// Cermin penanda (selector) error EAS yang aslinya dideklarasikan di dalam badan
/// `contract EAS`. File itu dipaku ke `pragma solidity 0.8.19` dan tidak bisa ikut
/// dikompilasi bersama OpenZeppelin 5.1.0 (`^0.8.20`), jadi selectornya kita tirai di sini.
/// Namanya HARUS sama persis: selector error dihitung dari tanda tangannya.
error AlreadyRevoked();
error AlreadyTimestamped();
error AlreadyRevokedOffchain();

/// @title CredentialResolver diuji terhadap BAS yang BENAR-BENAR TER-DEPLOY di BSC
/// testnet (chain 97), bukan terhadap tiruan yang kita deploy sendiri.
///
/// Kenapa harus fork: BAS/EAS.sol tidak bisa dikompilasi di rig ini (lihat catatan di
/// atas), jadi satu-satunya cara menguji justru mengujinya terhadap deployment
/// sungguhan — yang kebetulan juga alamat yang akan dibuka juri di BscScan.
///
/// Kenapa chain 97 dan bukan 56: keputusan D9 — submission mensyaratkan address yang
/// resolve di bscscan.com, dan itu hanya BSC (56/97), bukan opBNB.
///
/// Jalankan (WAJIB --evm-version cancun; pelajaran dari _research/x402-bnb-poc):
///   forge test --match-contract CredentialResolverForkTest -vv \
///     --evm-version cancun --fork-url https://data-seed-prebsc-1-s1.binance.org:8545/
contract CredentialResolverForkTest is Test {
    /// @dev BAS core di BSC testnet. Diverifikasi 16 Sep 2026: eth_getCode = 18.881 B
    /// (identik dengan chain 56) DAN eth_call getSchemaRegistry() mengembalikan address
    /// yang persis sama dengan tabel deployment di README repo.
    address constant BAS_97 = 0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD;
    address constant REGISTRY_97 = 0x08C8b8417313fF130526862f90cd822B55002D72;

    /// @dev BAS di BSC mainnet. Size bytecode-nya identik dengan chain 97, dan
    /// `getSchemaRegistry()`-nya menjawab cocok dengan README — jadi deployment yang
    /// sama, dua chain. Tabel deployment: basdotio/bas-contract.
    address constant BAS_56 = 0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC;
    address constant REGISTRY_56 = 0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa;

    CredentialResolver internal resolver;
    IEAS internal bas;

    /// @dev Address primitif dipilih di setUp menurut `block.chainid`, supaya SATU berkas
    /// test ini bisa dipakai menguji chain 97 DAN 56 tanpa menyalin apa pun. Chain lain
    /// di-skip, bukan dianggap lulus.
    address internal basCore;
    address internal registryExpected;

    /// @dev UID schema di-cache di setUp. WAJIB: `resolver.schemaUID()` adalah external
    /// call, jadi kalau dievaluasi di dalam argumen sesudah `vm.prank`, prank-nya habis
    /// termakan oleh `schemaUID()` itu dan `attest()` berikutnya jalan sebagai
    /// `address(this)` — bukan sebagai penerbit. Gejalanya menipu: resolver melaporkan
    /// `NotAnIssuer(0x7Fa9...)` (alamat kontrak test), bukan kesalahan yang sebenarnya.
    bytes32 internal schemaId;

    address internal issuer = makeAddr("institusi-penerbit");
    address internal scholar = makeAddr("peserta");
    address internal other = makeAddr("orang-lain");
    address internal stranger = makeAddr("penyerang");

    bytes32 internal constant COURSE = keccak256("web3-dasar-2026");
    bytes32 internal constant ADV = keccak256("web3-lanjut-2026");

    uint256 internal constant YEAR = 365 days;

    function setUp() public {
        if (block.chainid == 97) {
            basCore = BAS_97;
            registryExpected = REGISTRY_97;
        } else if (block.chainid == 56) {
            basCore = BAS_56;
            registryExpected = REGISTRY_56;
        } else {
            // Jangan pernah menyatakan lulus pada chain yang tidak kita maksud.
            vm.skip(true);
            return;
        }

        bas = IEAS(payable(basCore));

        // Prasyarat arsitektur: kontraknya hidup dan registry-nya cocok dengan catatan kita.
        assertGt(basCore.code.length, 0, "BAS core tidak ada di chain ini");
        assertEq(address(bas.getSchemaRegistry()), registryExpected, "registry BAS bergeser dari catatan");

        resolver = new CredentialResolver(bas, address(this));
        resolver.registerSchema();
        resolver.addIssuer(issuer);
        schemaId = resolver.schemaUID();

        vm.deal(issuer, 10 ether);
    }

    // ------------------------------------------------------------- util

    function _hashOf(address who, bytes32 courseId) internal pure returns (bytes32) {
        // Di produk nyata ini keccak256 dari JSON OpenBadgeCredential-nya.
        return keccak256(abi.encodePacked("vc:", who, courseId));
    }

    /// @dev Mencoba menerbitkan, TANPA menilai hasilnya. Dipakai test yang justru
    /// mengharapkan penolakan: `vm.expectRevert` yang cocok menghentikan `attest()` tapi
    /// eksekusi test continues, jadi assert "berhasil" tidak boleh hidup di jalur yang sama.
    function _attempt(address who, bytes32 courseId, bytes32 prereq, uint64 expires) internal {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: who,
            expirationTime: expires,
            revocable: true,
            refUID: prereq,
            data: abi.encode(_hashOf(who, courseId), courseId),
            value: 0
        });
        vm.prank(issuer);
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
    }

    function _attemptNextYear(address who, bytes32 courseId, bytes32 prereq) internal {
        _attempt(who, courseId, prereq, uint64(block.timestamp + YEAR));
    }

    /// @dev Menerbitkan dan MENEGASKAN keberhasilannya, mengembalikan UID-nya.
    function _issue(address who, bytes32 courseId, bytes32 prereq) internal returns (bytes32) {
        return _issueExpiring(who, courseId, prereq, uint64(block.timestamp + YEAR));
    }

    function _issueExpiring(address who, bytes32 courseId, bytes32 prereq, uint64 expires) internal returns (bytes32) {
        _attempt(who, courseId, prereq, expires);
        bytes32 uid = resolver.attestationOf(_hashOf(who, courseId));
        assertNotEq(uid, EMPTY_UID, "attestation tidak tercatat resolver");
        return uid;
    }

    function _revoke(bytes32 uid, address by) internal {
        vm.prank(by);
        bas.revoke(RevocationRequest({ schema: schemaId, data: RevocationRequestData({ uid: uid, value: 0 }) }));
    }

    // --------------------------------------- 0. primitifnya memang ada dan cocok

    function test_fork_SchemaKitaTerdaftarDiRegistryLive() public view {
        SchemaRecord memory rec = bas.getSchemaRegistry().getSchema(resolver.schemaUID());
        assertEq(rec.uid, resolver.schemaUID(), "schema tidak terdaftar di registry BAS 97");
        assertEq(address(rec.resolver), address(resolver), "resolver pada schema salah");
        assertTrue(rec.revocable, "schema harus revocable supaya bisa dicabut");
        assertEq(keccak256(bytes(rec.schema)), keccak256(bytes(resolver.CREDENTIAL_SCHEMA())), "isi schema berbeda");
    }

    // ------------------------------------------- 1. whitelist penerbit (pertanyaan a)

    function test_fork_PenerbitTerdaftarBerhasilMenerbitkan() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);
        assertTrue(resolver.issuedHere(uid), "attestation tidak ditandai issuedHere");

        (bool exists, bool revoked, bool expired, address who,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertTrue(exists, "statusOf tidak menemukan kredensialnya");
        assertFalse(revoked);
        assertFalse(expired);
        assertEq(who, issuer, "penerbit yang tercatat salah");
    }

    function test_fork_BukanPenerbit_DitolakOnChain() public {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: EMPTY_UID,
            data: abi.encode(_hashOf(scholar, COURSE), COURSE),
            value: 0
        });
        vm.prank(stranger); // tidak pernah masuk whitelist
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.NotAnIssuer.selector, stranger));
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));

        assertFalse(resolver.isIssuer(stranger));
    }

    function test_fork_IzinDicabut_PenerbitanBaruDitolak() public {
        resolver.removeIssuer(issuer);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.NotAnIssuer.selector, issuer));
        _attemptNextYear(scholar, COURSE, EMPTY_UID);
    }

    function test_fork_IzinDicabut_KredensialLamaTetapBerlaku() public {
        // Pencabutan izin penerbit BUKAN pembatalan massal. Kalau tidak begitu, mencabut
        // satu penerbit nakal ikut memusnahkan hak semua peserta yang benar.
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);
        resolver.removeIssuer(issuer);

        (, bool revoked, bool expired,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(revoked, "izin dicabut tidak boleh membuat kredensial jadi tercabut");
        assertFalse(expired);
        assertTrue(bas.isAttestationValid(uid));
    }

    function test_fork_KredensialSamaTidakBisaDuaKali() public {
        _issue(scholar, COURSE, EMPTY_UID);
        bytes32 dup = _hashOf(scholar, COURSE);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.AlreadyIssued.selector, dup));
        _attempt(scholar, COURSE, EMPTY_UID, uint64(block.timestamp + YEAR));
    }

    // --------------------- 2. RANTAI PRASYARAT PEKA-PENCABUTAN (pertanyaan b + d)
    //
    // Ini uji yang membedakan kita dari EAS mentah. EAS hanya mengecek refUID ADA
    // (`if (!isAttestationValid(request.refUID)) revert NotFound()`), dan
    // `isAttestationValid` hanya membaca `_db[uid].uid != EMPTY_UID`. Tanpa resolver ini,
    // keempat kasus di bawah LOLOS — yaitu celah pemalsuan yang nyata.

    function test_fork_PrasaratHidup_MenerbitkanLanjutanBerhasil() public {
        bytes32 base = _issue(scholar, COURSE, EMPTY_UID);
        bytes32 adv = _issue(scholar, ADV, base);
        assertEq(resolver.prerequisiteOf(adv), base, "rantai tidak tersimpan");
    }

    function test_fork_PrasaratDicabut_PenerbitanLanjutanDitolak() public {
        bytes32 base = _issue(scholar, COURSE, EMPTY_UID);
        _revoke(base, issuer);

        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteRevoked.selector, base));
        _attemptNextYear(scholar, ADV, base);
    }

    function test_fork_PrasaratKedaluwarsa_PenerbitanLanjutanDitolak() public {
        uint64 exp = uint64(block.timestamp + 1 days);
        bytes32 base = _issueExpiring(scholar, COURSE, EMPTY_UID, exp);
        vm.warp(exp + 1);

        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteExpired.selector, base));
        _attemptNextYear(scholar, ADV, base);
    }

    function test_fork_PrasaratMilikOrangLain_Ditolak() public {
        bytes32 baseOfOther = _issue(other, COURSE, EMPTY_UID);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteWrongHolder.selector, baseOfOther));
        _attemptNextYear(scholar, ADV, baseOfOther);
    }

    function test_fork_PrasaratBukanKredensialKita_Ditolak() public {
        // attestation lain yang ADA di chain 97 tidak otomatis jadi prasyarat sah.
        bytes32 ghost = keccak256("uid tidak pernah diterbitkan");
        vm.expectRevert(NotFound.selector); // EAS menahan lebih dulu
        _attemptNextYear(scholar, ADV, ghost);
    }

    /// @dev Uji yang TIDAK bisa digantikan pengecekan EAS: prasyaratnya attestation yang
    /// **sah, ada, dan tidak dicabut** — tapi diterbitkan lewat schema/resolver lain.
    /// `isAttestationValid()` milik EAS meloloskan ini, jadi hanya guard `issuedHere`
    /// kami yang menolaknya. Tanpa guard itu siapa pun bisa membangun "rantai prasyarat"
    /// di atas attestation orang lain yang tidak ada hubungannya dengan kursus kita.
    function test_fork_PrasaratSahTapiTerbitDiResolverLain_Ditolak() public {
        CredentialResolver foreign = new CredentialResolver(bas, address(this));
        foreign.registerSchema();
        foreign.addIssuer(issuer);
        bytes32 foreignSchema = foreign.schemaUID();

        bytes32 foreignCourse = keccak256("kursus-asing");
        bytes32 foreignHash = keccak256(abi.encodePacked("vc:", scholar, foreignCourse));

        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: EMPTY_UID,
            data: abi.encode(foreignHash, foreignCourse),
            value: 0
        });
        vm.prank(issuer);
        bas.attest(AttestationRequest({ schema: foreignSchema, data: d }));

        bytes32 foreignUid = foreign.attestationOf(foreignHash);
        assertNotEq(foreignUid, EMPTY_UID, "attestation asing gagal terbit");
        assertTrue(bas.isAttestationValid(foreignUid), "harusnya valid di chain, inilah yang menipu EAS");
        assertFalse(resolver.issuedHere(foreignUid), "resolver kita tidak boleh mengakuinya");

        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteNotOurs.selector, foreignUid));
        _attemptNextYear(scholar, ADV, foreignUid);
    }

    function test_fork_RantaiTigaTingkat_DicabutDiTengahMemblokYangDiAtasnya() public {
        bytes32 l1 = _issue(scholar, COURSE, EMPTY_UID);
        bytes32 l2 = _issue(scholar, ADV, l1);
        assertEq(resolver.prerequisiteOf(l2), l1);

        _revoke(l1, issuer);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteRevoked.selector, l1));
        _attemptNextYear(scholar, keccak256("web3-mahir-2026"), l1);
    }

    // ------------------------------ 3. pencabutan permanen (pertanyaan d — klaim pembeda)

    function test_fork_StatusBerubahSetelahDicabut() public {
        bytes32 h = _hashOf(scholar, COURSE);
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);

        (, bool revokedBefore,,,,) = resolver.statusOf(h);
        assertFalse(revokedBefore, "seharusnya belum tercabut");

        _revoke(uid, issuer);

        (, bool revokedAfter,,,,) = resolver.statusOf(h);
        assertTrue(revokedAfter, "status pencabutan tidak terbaca");
    }

    /// @dev Inti klaim "non-repudiable": setelah dicabut TIDAK ADA jalur kembali.
    /// Dibuktikan dua arah — perilaku (cabut ulang revert) dan jejak (rekordnya tetap ada).
    function test_fork_TidakAdaJalurUnrevoke() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);
        _revoke(uid, issuer);

        vm.expectRevert(AlreadyRevoked.selector);
        _revoke(uid, issuer);

        Attestation memory a = bas.getAttestation(uid);
        assertGt(a.revocationTime, 0, "jejak pencabutan hilang");
        assertTrue(bas.isAttestationValid(uid), "rekordnya tidak boleh bisa dihapus dari chain");
    }

    function test_fork_PencabutanOlehBukanPenerbit_Ditolak() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);
        vm.expectRevert(AccessDenied.selector);
        _revoke(uid, stranger);

        (, bool revoked,,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(revoked, "percobaan mencabut diam-diam meninggalkan efek");
    }

    // ------------------------------- 4. BAS primitives yang kita pakai langsung apa adanya

    /// @dev `timestamp()` menggantikan `CredentialAnchor.anchor()` yang semula mau kita
    /// karang sendiri. Write-once di level kontraknya: `_timestamp` revert bila != 0.
    function test_fork_AnchorBuktiPenilaian_WriteOnce() public {
        bytes32 evidence = keccak256("bukti penilaian modul-3");

        vm.prank(issuer);
        uint64 t = bas.timestamp(evidence);
        assertGt(t, 0, "anchor tidak mengembalikan waktu");
        assertEq(bas.getTimestamp(evidence), t, "anchor tidak terbaca kembali");

        vm.prank(issuer);
        vm.expectRevert(AlreadyTimestamped.selector);
        bas.timestamp(evidence);
    }

    /// @dev Kunci pencabutan off-chain adalah pasangan (pencabut, hash) — jadi satu
    /// kredensial bisa punya status dari beberapa penerbit tanpa saling menimpa.
    function test_fork_PencabutanOffchainTerkikatKePencabutnya() public {
        bytes32 vcHash = keccak256("vc-off-chain");
        assertEq(bas.getRevokeOffchain(issuer, vcHash), 0, "seharusnya belum ada jejak");

        vm.prank(issuer);
        bas.revokeOffchain(vcHash);
        assertGt(bas.getRevokeOffchain(issuer, vcHash), 0, "pencabutan tidak tercatat");

        vm.prank(issuer);
        vm.expectRevert(AlreadyRevokedOffchain.selector);
        bas.revokeOffchain(vcHash);

        // Usaha pencabutan oleh pihak lain TIDAK mengubah status yang tercatat penerbit.
        vm.prank(stranger);
        bas.revokeOffchain(vcHash);
        assertEq(bas.getRevokeOffchain(issuer, vcHash), bas.getRevokeOffchain(issuer, vcHash), "jejak berubah");
    }

    // -------------------------------------------- 5. kedaluwarsa tanpa aksi siapa pun

    function test_fork_KedaluwarsaTerdeteksiTanpaAksiDanBedaDariPencabutan() public {
        bytes32 h = _hashOf(scholar, COURSE);
        uint64 exp = uint64(block.timestamp + 1 days);
        _issueExpiring(scholar, COURSE, EMPTY_UID, exp);

        (, bool revoked0, bool expired0,,,) = resolver.statusOf(h);
        assertFalse(revoked0);
        assertFalse(expired0, "seharusnya belum kedaluwarsa");

        vm.warp(exp + 1);

        (, bool revoked1, bool expired1,,,) = resolver.statusOf(h);
        assertTrue(expired1, "kedaluwarsa tidak terdeteksi");
        assertFalse(revoked1, "kedaluwarsa bukan pencabutan, keduanya harus bisa dibedakan");

        // Kredensial tanpa kedaluwarsa: kedaluwarsa tidak pernah true.
        bytes32 forever = _hashOf(other, COURSE);
        _issueExpiring(other, COURSE, EMPTY_UID, NO_EXPIRATION_TIME);
        vm.warp(block.timestamp + 100 * YEAR);
        (, bool rF, bool eF,,,) = resolver.statusOf(forever);
        assertFalse(eF, "tanpa expirationTime tidak boleh dianggap kedaluwarsa");
        assertFalse(rF);
    }
}
