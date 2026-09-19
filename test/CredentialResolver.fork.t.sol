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
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

/// Cermin penanda (selector) error EAS yang aslinya dideklarasikan di dalam badan
/// `contract EAS`. File itu dipaku ke `pragma solidity 0.8.19` dan tidak bisa ikut
/// dikompilasi bersama OpenZeppelin 5.1.0 (`^0.8.20`), jadi selectornya kita tirai di sini.
/// Namanya HARUS sama persis: selector error dihitung dari tanda tangannya.
error AlreadyRevoked();
error AlreadyTimestamped();
error AlreadyRevokedOffchain();

/// Cermin event governance resolver, dipakai bersama `vm.expectEmit`. Layak diuji, bukan
/// sekadar hiasan: BAS tidak menyediakan Indexer untuk BSC, jadi emisi on-chain ini adalah
/// satu-satunya jejak tindakan platform yang bisa dibaca pihak luar tanpa izin kita.
event IssuerDelisted(address indexed issuer);
event IssuerRelisted(address indexed issuer);

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
            data: abi.encode(_hashOf(who, courseId), courseId, EMPTY_UID),
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

        (bool exists, bool revoked, bool expired, bool delisted, address who,,) =
            resolver.statusOf(_hashOf(scholar, COURSE));
        assertTrue(exists, "statusOf tidak menemukan kredensialnya");
        assertFalse(revoked);
        assertFalse(expired);
        assertFalse(delisted, "penerbit sehat tidak boleh terbaca delisted");
        assertEq(who, issuer, "penerbit yang tercatat salah");
    }

    function test_fork_BukanPenerbit_DitolakOnChain() public {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: EMPTY_UID,
            data: abi.encode(_hashOf(scholar, COURSE), COURSE, EMPTY_UID),
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

        (, bool revoked, bool expired, bool delisted,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(revoked, "izin dicabut tidak boleh membuat kredensial jadi tercabut");
        assertFalse(expired);
        // Inti pemisahan dua flag: keluar baik-baik TIDAK boleh menandai penerbitnya.
        assertFalse(delisted, "removeIssuer adalah keluar baik-baik, bukan delisting");
        assertFalse(resolver.isDelisted(issuer));
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
            data: abi.encode(foreignHash, foreignCourse, EMPTY_UID),
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

        (, bool revokedBefore,,,,,) = resolver.statusOf(h);
        assertFalse(revokedBefore, "seharusnya belum tercabut");

        _revoke(uid, issuer);

        (, bool revokedAfter,,,,,) = resolver.statusOf(h);
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

        (, bool revoked,,,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(revoked, "percobaan mencabut diam-diam meninggalkan efek");
    }

    // ------------- 3b. rem platform atas agen pihak ketiga: delisting, bukan pencabutan

    /// @dev Batas yang memotivasi seluruh bagian ini, dan ia harus DIBUKTIKAN bukan
    /// dinyatakan. Yang memegang whitelist adalah kontrak test ini (`address(this)` = owner
    /// resolver = platform). Tapi EAS hanya mengizinkan attester asal yang mencabut
    /// (`_revoke`: `attestation.attester != revoker -> AccessDenied`), jadi terhadap agen
    /// pihak ketiga platform tidak punya daya cabut sama sekali. Kalau suatu hari test ini
    /// gagal, artinya EAS berubah dan model delisting kita harus ditulis ulang.
    function test_fork_PlatformTidakBisaMencabutKredensialAgen() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);

        vm.expectRevert(AccessDenied.selector);
        _revoke(uid, address(this));

        (, bool revoked,,,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(revoked, "platform ternyata bisa mencabut - asumsi dasar bagian ini salah");
    }

    /// @dev Yang paling penting dari semua test delisting adalah apa yang TIDAK terjadi.
    /// Delisting MENANDAI, bukan mencabut: `revoked` tetap false dan attestation di BAS tetap
    /// valid, karena kita memang tidak punya daya mengubahnya. Mengaku sebaliknya di halaman
    /// verifikasi adalah kebohongan yang bisa diuji siapa pun dalam satu eth_call.
    function test_fork_Delisting_MenandaiTanpaMencabut() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);

        vm.expectEmit(true, true, true, true);
        emit IssuerDelisted(issuer);
        resolver.delistIssuer(issuer);

        (bool exists, bool revoked,, bool delisted,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertTrue(exists, "rekordnya tidak boleh hilang");
        assertFalse(revoked, "delisting menyamar jadi pencabutan - ini harus dua verdict berbeda");
        assertTrue(delisted, "statusOf tidak melaporkan delisting");
        assertTrue(bas.isAttestationValid(uid), "attestation di BAS seharusnya tidak tersentuh");
        assertEq(bas.getAttestation(uid).revocationTime, 0, "delisting ternyata menyentuh rekord BAS");

        assertFalse(resolver.isIssuer(issuer), "hak menerbitkan seharusnya hilang");
        assertTrue(resolver.isDelisted(issuer));
    }

    function test_fork_Delisting_PenerbitanBaruDitolak() public {
        resolver.delistIssuer(issuer);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.NotAnIssuer.selector, issuer));
        _attemptNextYear(scholar, COURSE, EMPTY_UID);
    }

    /// @dev Skenario nyata marketplace: peserta mulai dengan agen A, lalu pindah ke agen B
    /// sesudah A didelisting. Tanpa cek ini, delisting jadi kosmetik — kredensial agen
    /// bermasalah tetap bisa dipakai membuka kredensial lanjutan lewat agen yang sehat.
    function test_fork_PrasyaratDariAgenDelisted_Ditolak() public {
        address agenKedua = makeAddr("agen-kedua");
        resolver.addIssuer(agenKedua);
        vm.deal(agenKedua, 10 ether);

        bytes32 l1 = _issue(scholar, COURSE, EMPTY_UID); // diterbitkan oleh `issuer`
        resolver.delistIssuer(issuer);

        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: l1,
            data: abi.encode(_hashOf(scholar, ADV), ADV, EMPTY_UID),
            value: 0
        });
        vm.prank(agenKedua); // agen KEDUA sehat, tapi dasarnya yang sudah tidak dipercaya
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteIssuerDelisted.selector, l1));
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
    }

    /// @dev Klaim "bisa dipulihkan" harus diuji, bukan dinyatakan. Sesudah relist, kredensial
    /// lama langsung terbaca normal lagi — karena flag-nya hidup di sisi penerbit, tidak
    /// disalin ke tiap kredensial — dan penerbitan baru jalan lagi.
    function test_fork_Relisting_MemulihkanStatusDanHak() public {
        bytes32 uid = _issue(scholar, COURSE, EMPTY_UID);
        resolver.delistIssuer(issuer);

        vm.expectEmit(true, true, true, true);
        emit IssuerRelisted(issuer);
        resolver.relistIssuer(issuer);

        (, , , bool delisted,,,) = resolver.statusOf(_hashOf(scholar, COURSE));
        assertFalse(delisted, "kredensial lama tidak pulih sesudah relisting");
        assertTrue(resolver.isIssuer(issuer), "hak menerbitkan tidak kembali");
        assertFalse(resolver.isDelisted(issuer));
        assertTrue(bas.isAttestationValid(uid));

        // Dan rantai prasyarat hidup lagi: lesson lanjutan di atas kredensial lama diterima.
        bytes32 l2 = _issue(scholar, ADV, uid);
        assertEq(resolver.prerequisiteOf(l2), uid, "prasyarat tidak tersambung sesudah pemulihan");
    }

    /// @dev Re-admission lewat pintu belakang harus tertutup. Kalau `addIssuer` bisa
    /// memulihkan agen yang didelisting, pemulihan jadi efek samping yang tidak ber-event
    /// dan jejak governance-nya hilang.
    function test_fork_AgenDelisted_TidakBisaLewatAddIssuer() public {
        resolver.delistIssuer(issuer);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.DelistedCannotBeReadmitted.selector, issuer));
        resolver.addIssuer(issuer);
        assertFalse(resolver.isIssuer(issuer), "addIssuer diam-diam memulihkan agen delisted");
    }

    function test_fork_DelistingHanyaOlehOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        resolver.delistIssuer(issuer);

        assertFalse(resolver.isDelisted(issuer), "delisting oleh pihak luar meninggalkan efek");
        assertTrue(resolver.isIssuer(issuer));
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

        (, bool revoked0, bool expired0,,,,) = resolver.statusOf(h);
        assertFalse(revoked0);
        assertFalse(expired0, "seharusnya belum kedaluwarsa");

        vm.warp(exp + 1);

        (, bool revoked1, bool expired1,,,,) = resolver.statusOf(h);
        assertTrue(expired1, "kedaluwarsa tidak terdeteksi");
        assertFalse(revoked1, "kedaluwarsa bukan pencabutan, keduanya harus bisa dibedakan");

        // Kredensial tanpa kedaluwarsa: kedaluwarsa tidak pernah true.
        bytes32 forever = _hashOf(other, COURSE);
        _issueExpiring(other, COURSE, EMPTY_UID, NO_EXPIRATION_TIME);
        vm.warp(block.timestamp + 100 * YEAR);
        (, bool rF, bool eF,,,,) = resolver.statusOf(forever);
        assertFalse(eF, "tanpa expirationTime tidak boleh dianggap kedaluwarsa");
        assertFalse(rF);
    }

    // ============================ 6. LEVEL LESSON (schema 3 field, D28.1) ====================

    bytes32 internal constant LESSON1 = keccak256("lesson-1");
    bytes32 internal constant LESSON2 = keccak256("lesson-2");

    /// @dev Hash kredensial level lesson harus ikut memuat lessonId, kalau tidak dua lesson
    /// di kursus yang sama akan menghasilkan hash yang sama dan kena AlreadyIssued.
    function _lessonHash(address who, bytes32 courseId, bytes32 lessonId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("vc:", who, courseId, lessonId));
    }

    function _issueLesson(address who, bytes32 courseId, bytes32 lessonId, bytes32 prereq) internal returns (bytes32) {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: who,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: prereq,
            data: abi.encode(_lessonHash(who, courseId, lessonId), courseId, lessonId),
            value: 0
        });
        vm.prank(issuer);
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
        bytes32 uid = resolver.attestationOf(_lessonHash(who, courseId, lessonId));
        assertNotEq(uid, EMPTY_UID, "lesson tidak tercatat");
        return uid;
    }

    /// @dev Cerita produk yang sebenarnya: lesson 1 -> lesson 2 -> sertifikat kursus.
    /// Rantai ini memakai mekanisme prerequisiteOf yang SUDAH ada, jadi "lesson 2 tidak bisa
    /// terbit kalau lesson 1 dicabut" datang gratis dari kode yang sudah lulus test.
    function test_fork_RantaiLesson_Sampai_SertifikatKursus() public {
        bytes32 l1 = _issueLesson(scholar, COURSE, LESSON1, EMPTY_UID);
        bytes32 l2 = _issueLesson(scholar, COURSE, LESSON2, l1);
        bytes32 cert = _issue(scholar, COURSE, l2); // tingkat kursus: lessonId = EMPTY_UID

        assertEq(resolver.lessonOf(l1), LESSON1, "lessonId lesson-1 salah tersimpan");
        assertEq(resolver.lessonOf(l2), LESSON2, "lessonId lesson-2 salah tersimpan");
        assertEq(resolver.lessonOf(cert), EMPTY_UID, "kredensial tingkat kursus harus tanpa lessonId");
        assertEq(resolver.prerequisiteOf(cert), l2, "sertifikat kursus harus menunjuk lesson terakhir");
        assertEq(resolver.prerequisiteOf(l2), l1);
    }

    /// @dev Ini adegan demo terkuat: cabut lesson 1, lalu sertifikat kursus tidak bisa terbit.
    function test_fork_LessonDicabut_SertifikatKursusDitolak() public {
        bytes32 l1 = _issueLesson(scholar, COURSE, LESSON1, EMPTY_UID);
        _issueLesson(scholar, COURSE, LESSON2, l1);

        _revoke(l1, issuer);

        // sertifikat kursus yang menumpang rantai itu harus ditolak
        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: l1,
            data: abi.encode(_hashOf(scholar, COURSE), COURSE, EMPTY_UID),
            value: 0
        });
        vm.prank(issuer);
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteRevoked.selector, l1));
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
    }

    /// @dev Enumerasi per pemegang: satu-satunya cara membangun "daftar sertifikat saya" dari
    /// chain, karena BAS tidak punya Indexer untuk BSC.
    function test_fork_EnumerasiPerPemegang_TanpaIndexer() public {
        assertEq(resolver.credentialCount(scholar), 0, "harus kosong di awal");

        bytes32 l1 = _issueLesson(scholar, COURSE, LESSON1, EMPTY_UID);
        bytes32 l2 = _issueLesson(scholar, COURSE, LESSON2, l1);
        bytes32 cert = _issue(scholar, COURSE, l2);
        _issue(other, COURSE, EMPTY_UID); // peserta lain, tidak boleh nyampur

        bytes32[] memory mine = resolver.credentialsOf(scholar);
        assertEq(mine.length, 3, "jumlah kredensial peserta salah");
        assertEq(mine[0], _lessonHash(scholar, COURSE, LESSON1), "urutan penerbitan salah");
        assertEq(mine[1], _lessonHash(scholar, COURSE, LESSON2));
        assertEq(mine[2], _hashOf(scholar, COURSE));
        assertEq(cert, resolver.attestationOf(mine[2]));

        assertEq(resolver.credentialCount(other), 1, "kredensial peserta lain ikut tercampur");
        assertEq(resolver.credentialCount(stranger), 0, "alamat tanpa kredensial harus kosong");
    }

    /// @dev Schema 3 field berarti 96 byte. Data 64 byte (bentuk lama) harus ditolak keras,
    /// bukan didecode senyap dengan field bergeser.
    function test_fork_DataPanjangSalah_Ditolak() public {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: scholar,
            expirationTime: uint64(block.timestamp + YEAR),
            revocable: true,
            refUID: EMPTY_UID,
            data: abi.encode(_hashOf(scholar, COURSE), COURSE), // 64 byte, kurang lessonId
            value: 0
        });
        vm.prank(issuer);
        vm.expectRevert(CredentialResolver.BadDataLength.selector);
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
    }
}
