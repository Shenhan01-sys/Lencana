// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { CredentialResolver } from "../contracts/CredentialResolver.sol";
import { SoulboundCert, IERC5192 } from "../contracts/SoulboundCert.sol";
import { ICredentialRegistry } from "../contracts/interfaces/ICredentialRegistry.sol";
import {
    IEAS,
    AttestationRequest,
    AttestationRequestData,
    RevocationRequest,
    RevocationRequestData
} from "../lib/bas/src/IEAS.sol";
import { EMPTY_UID } from "../lib/bas/src/Common.sol";

/// @title Ujung-ke-ujung di atas deployment BAS yang sebenarnya.
///
/// Berkas ini ada karena alasan spesifik: SoulboundCert.t.sol memakai STUB registry.
/// Stub membuktikan mekanika token, TIDAK membuktikan kedua lapis produk kita bisa
/// digabung. Yang dibuktikan di sini adalah alur demo yang sebenarnya:
///
///   terbitkan kredensial (attest ke BAS, dijaga resolver kita)
///     → mint artefak soulbound untuk peserta
///     → SATU eth_call ke resolver memberi keputusan lengkap
///     → cabut → keputusan berubah sendiri, tanpa ada yang perlu memberi tahu siapa pun
///     → artefaknya tetap ada dan tetap tidak bisa dipindah
///
/// Dijalankan di chain 97 DAN 56; chain lain di-skip, bukan dihitung lulus.
contract CredentialEndToEndOnBscForkTest is Test {
    address constant BAS_97 = 0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD;
    address constant REGISTRY_97 = 0x08C8b8417313fF130526862f90cd822B55002D72;
    address constant BAS_56 = 0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC;
    address constant REGISTRY_56 = 0x5e905F77f59491F03eBB78c204986aaDEB0C6bDa;

    CredentialResolver internal resolver;
    SoulboundCert internal certs;
    IEAS internal bas;
    bytes32 internal schemaId;

    address internal platform = makeAddr("platform");
    address internal issuer = makeAddr("institusi-penerbit");
    address internal agent = makeAddr("agen-penerbit");
    address internal learner = makeAddr("peserta");
    address internal recruiter = makeAddr("rekruter");

    bytes32 internal constant COURSE = keccak256("web3-dasar-2026");
    bytes32 internal constant ADV = keccak256("web3-lanjut-2026");
    bytes32 internal constant MASTER = keccak256("web3-mahir-2026");
    uint256 internal constant YEAR = 365 days;

    function setUp() public {
        if (block.chainid != 97 && block.chainid != 56) {
            vm.skip(true);
            return;
        }

        address core = block.chainid == 97 ? BAS_97 : BAS_56;
        address registry = block.chainid == 97 ? REGISTRY_97 : REGISTRY_56;

        bas = IEAS(payable(core));
        assertGt(core.code.length, 0, "BAS core tidak ada");
        assertEq(address(bas.getSchemaRegistry()), registry, "registry BAS bergeser dari catatan");

        resolver = new CredentialResolver(bas, platform);
        resolver.registerSchema(); // permissionless di sisi registry
        vm.startPrank(platform);
        resolver.addIssuer(issuer);
        resolver.addIssuer(agent);
        vm.stopPrank();
        schemaId = resolver.schemaUID();

        // Kunci penerbit artefak = kunci agen: dalam produk, pihak yang sama yang
        // menandatangani VC-lah yang mencetak artefaknya.
        certs = new SoulboundCert(ICredentialRegistry(address(resolver)), "Sertifikat Kursus", "CERT", agent);

        vm.deal(issuer, 10 ether);
        vm.deal(agent, 10 ether);
    }

    // ------------------------------------------------------------- util alur nyata

    function _vcHash(address who, bytes32 courseId) internal pure returns (bytes32) {
        // Di produk: keccak256 dari JSON OpenBadgeCredential-nya.
        return keccak256(abi.encodePacked("vc:", who, courseId));
    }

    function _attest(address by, address who, bytes32 courseId, bytes32 prereq, uint64 expires)
        internal
        returns (bytes32)
    {
        bytes32 uid = _attemptAttest(by, who, courseId, prereq, expires);
        assertNotEq(uid, EMPTY_UID, "attestation tidak tercatat resolver");
        return uid;
    }

    /// @dev Menerbitkan dan MENGEMBALIKAN uid tanpa menilai hasilnya — untuk jalur yang
    /// justru mengharapkan penolakan.
    function _attemptAttest(address by, address who, bytes32 courseId, bytes32 prereq, uint64 expires)
        internal
        returns (bytes32)
    {
        AttestationRequestData memory d = AttestationRequestData({
            recipient: who,
            expirationTime: expires,
            revocable: true,
            refUID: prereq,
            data: abi.encode(_vcHash(who, courseId), courseId, EMPTY_UID),
            value: 0
        });
        vm.prank(by);
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
        return resolver.attestationOf(_vcHash(who, courseId));
    }

    function _nextYear() internal view returns (uint64) {
        return uint64(block.timestamp + YEAR);
    }

    function _revoke(bytes32 uid) internal {
        vm.prank(agent);
        bas.revoke(RevocationRequest({ schema: schemaId, data: RevocationRequestData({ uid: uid, value: 0 }) }));
    }

    function _mint(bytes32 h, address to) internal returns (uint256) {
        vm.prank(agent);
        return certs.mint(to, h, "https://example.org/vc/1.json");
    }

    // Helper baca tipis. Alasannya praktis: `statusOf` mengembalikan 6 nilai, dan salah
    // menghitung slot destructuring membuat test gagal dengan pesan yang tidak menjelaskan
    // apa-apa. Satu tempat hitung, nol salah hitung.

    function _exists(bytes32 h) internal view returns (bool) {
        (bool e,,,,,) = resolver.statusOf(h);
        return e;
    }

    function _isRevoked(bytes32 h) internal view returns (bool) {
        (, bool r,,,,) = resolver.statusOf(h);
        return r;
    }

    function _isExpired(bytes32 h) internal view returns (bool) {
        (, , bool x,,,) = resolver.statusOf(h);
        return x;
    }

    // =========================================== adegan demo 1: verifikasi tanpa wallet

    /// @dev Inilah yang dilihat rekruter: SATU eth_call, tanpa wallet, tanpa indexer, dan
    /// tanpa menyentuh backend kita. Indexer BAS hanya ada untuk opBNB, bukan BSC, jadi
    /// jalur verifikasi rzeczywnya harus berupa pembacaan langsung seperti ini.
    function test_Adegan1_VerifikasiLewatSatuEthCall() public {
        bytes32 h = _vcHash(learner, COURSE);
        bytes32 uid = _attest(issuer, learner, COURSE, EMPTY_UID, _nextYear());

        vm.prank(recruiter);
        (bool exists, bool revoked, bool expired, address who, uint64 issuedAt, uint64 expiresAt) =
            resolver.statusOf(h);

        assertTrue(exists, "kredensial tidak ditemukan");
        assertFalse(revoked);
        assertFalse(expired);
        assertEq(who, issuer, "penerbit yang ditampilkan salah");
        assertGt(issuedAt, 0);
        assertGt(expiresAt, block.timestamp);
        assertEq(resolver.attestationOf(h), uid);
        assertEq(resolver.holderOf(h), learner, "pemegang yang ditampilkan salah");
    }

    // =========================================== adegan demo 3: pemalsuan yang gagal

    function test_Adegan3_ArtefakTerikatDanTakBisaDipindah() public {
        bytes32 h = _vcHash(learner, COURSE);
        _attest(agent, learner, COURSE, EMPTY_UID, _nextYear());

        uint256 id = _mint(h, learner);
        assertEq(id, uint256(h), "tokenId bukan hash kredensial");
        assertEq(certs.ownerOf(id), learner);
        assertTrue(certs.locked(id));
        assertTrue(certs.supportsInterface(type(IERC5192).interfaceId), "wallet tak akan melihat ini soulbound");

        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        certs.transferFrom(learner, recruiter, id);
    }

    /// @dev Artefak tidak bisa dicetak untuk kredensial yang belum ada. Ini yang membuat
    /// "SBT sertifikat" kami bukan NFT tempelan.
    function test_Adegan3_TidakBisaMintArtefakKosong() public {
        bytes32 fake = _vcHash(recruiter, COURSE);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialNotFound.selector, fake));
        _mint(fake, recruiter);
    }

    function test_Adegan3_TidakBisaMintUntukOrangLain() public {
        bytes32 h = _vcHash(learner, COURSE);
        _attest(agent, learner, COURSE, EMPTY_UID, _nextYear());

        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.WrongHolder.selector, h, learner, recruiter));
        _mint(h, recruiter);
    }

    /// @dev VC yang diedit satu byte berubah hash-nya, jadi ia tidak dikenali sama sekali —
    /// bukan "valid dengan isi berbeda".
    function test_Adegan3_VcDieditSatuByteTidakDikenal() public {
        bytes32 h = _vcHash(learner, COURSE);
        _attest(agent, learner, COURSE, EMPTY_UID, _nextYear());

        bytes32 tampered = bytes32(h ^ bytes32(uint256(1)));
        assertFalse(_exists(tampered), "hash hasil ubahan tidak boleh dikenali");
    }

    // =========================================== adegan demo 2: pencabutan non-repudiable

    function test_Adegan2_CabutDiTengah_RantaiTertutupArtefakTetapAda() public {
        bytes32 baseH = _vcHash(learner, COURSE);
        bytes32 base = _attest(agent, learner, COURSE, EMPTY_UID, _nextYear());
        uint256 baseToken = _mint(baseH, learner);

        bytes32 adv = _attest(agent, learner, ADV, base, _nextYear());
        assertEq(resolver.prerequisiteOf(adv), base, "rantai tidak tersimpan");

        _revoke(base);

        // 1. keputusan verifikasi berubah, tanpa ada yang memberi tahu siapa pun
        assertTrue(_isRevoked(baseH), "status pencabutan tidak terbaca");

        // 2. penerbitan yang menumpang dasarnya tertutup — ini yang EAS saja tidak cegah
        vm.expectRevert(abi.encodeWithSelector(CredentialResolver.PrerequisiteRevoked.selector, base));
        _attemptAttest(agent, learner, MASTER, base, _nextYear());

        // 3. artefaknya tetap ada, tetap terkunci, tetap milik peserta
        assertEq(certs.ownerOf(baseToken), learner);
        assertTrue(certs.locked(baseToken));
        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        certs.transferFrom(learner, recruiter, baseToken);
    }

    /// @dev Pencabutan meninggalkan jejak yang tidak bisa dihapus dan tidak bisa diulang.
    function test_Adegan2_JejakPencabutanTidakBisaDihapusAtauDiulang() public {
        bytes32 uid = _attest(agent, learner, COURSE, EMPTY_UID, _nextYear());
        _revoke(uid);

        vm.prank(agent);
        vm.expectRevert(AlreadyRevoked.selector);
        bas.revoke(RevocationRequest({ schema: schemaId, data: RevocationRequestData({ uid: uid, value: 0 }) }));

        assertTrue(bas.isAttestationValid(uid), "rekord tidak boleh hilang dari chain");
        assertGt(bas.getAttestation(uid).revocationTime, 0, "jejak pencabutan hilang");
    }

    // ------------------------------------------------- batas yang harus tetap jujur

    /// @dev Setelah kedaluwarsa, artefak TIDAK berubah dan tidak bisa dipindah; yang
    /// berubah hanya keputusan verifikasi. Test ini mengingatkan bahwa artefak bukan bukti
    /// keberlakuan — kalimat itu harus muncul di UI, bukan disembunyikan.
    function test_BatasKlaim_KedaluwarsaTidakMenghapusArtefak() public {
        bytes32 h = _vcHash(learner, COURSE);
        uint64 exp = uint64(block.timestamp + 1 days);
        _attest(agent, learner, COURSE, EMPTY_UID, exp);
        uint256 id = _mint(h, learner);

        vm.warp(exp + 1);

        assertTrue(_exists(h));
        assertTrue(_isExpired(h), "kedaluwarsa tidak terdeteksi");
        assertFalse(_isRevoked(h), "kedaluwarsa bukan pencabutan, keduanya harus dibedakan");
        assertEq(certs.ownerOf(id), learner, "artefak hilang diam-diam");
    }

    /// @dev Kontrol negatif: hash yang tidak pernah ada harus menjawab "tidak ada".
    function test_KontrolNegatif_KredensialTidakDikenal() public view {
        bytes32 ghost = keccak256("vc yang tidak pernah ada");
        assertFalse(_exists(ghost));
        assertFalse(_isRevoked(ghost));
        assertFalse(_isExpired(ghost));
        assertEq(resolver.holderOf(ghost), address(0));
    }
}

/// Cermin selector error EAS (`AlreadyRevoked` dideklarasikan di badan `contract EAS`,
/// yang dipaku ke pragma 0.8.19 dan tidak bisa ikut dikompilasi di rig ini).
error AlreadyRevoked();
