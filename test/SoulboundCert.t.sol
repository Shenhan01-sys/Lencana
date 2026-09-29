// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { SoulboundCert, IERC5192 } from "../contracts/SoulboundCert.sol";
import { ICredentialRegistry } from "../contracts/interfaces/ICredentialRegistry.sol";
import { JsonText } from "./support/JsonText.sol";

/// @dev Stub registry: hanya meniru APA YANG DIBACA SoulboundCert, supaya mekanika
/// soulbound bisa diuji cepat dan offline. Jalur nyata (BAS + CredentialResolver) diuji
/// terpisah di test/CredentialEndToEndOnBsc.fork.t.sol terhadap deployment sungguhan — jadi
/// stub ini tidak pernah berdiri sebagai bukti bahwa integrasinya bekerja.
contract StubCredentialRegistry is ICredentialRegistry {
    bool public exists;
    bool public revoked;
    bool public expired;
    bool public delisted;
    address public issuer;
    address public holder;
    uint64 public issuedAt;
    uint64 public expiresAt;

    function setLive(address holder_, address issuer_, uint64 expiresAt_) external {
        exists = true;
        revoked = false;
        expired = false;
        delisted = false;
        holder = holder_;
        issuer = issuer_;
        issuedAt = uint64(block.timestamp);
        expiresAt = expiresAt_;
    }

    function setRevoked(bool v) external {
        revoked = v;
    }

    function setExpired(bool v) external {
        expired = v;
    }

    function setDelisted(bool v) external {
        delisted = v;
    }

    function statusOf(bytes32) external view returns (bool, bool, bool, bool, address, uint64, uint64) {
        return (exists, revoked, expired, delisted, issuer, issuedAt, expiresAt);
    }

    function holderOf(bytes32) external view returns (address) {
        return exists ? holder : address(0);
    }

    /// @dev Dua fungsi ini ada karena B39 ditegakkan di kontrak artefak: ia bertanya "kredensial
    /// ini level kursus atau lesson?" lewat registry, bukan lewat disiplin pemanggilnya. Default
    /// `lessonToReturn = 0` berarti level KURSUS, jadi test lama tetap bicara tentang mekanika
    /// soulbound dan bukan tentang granularitas.
    bytes32 public uidToReturn = keccak256("attestation-stub");
    bytes32 public lessonToReturn;

    function attestationOf(bytes32) external view returns (bytes32) {
        return uidToReturn;
    }

    function lessonOf(bytes32) external view returns (bytes32) {
        return lessonToReturn;
    }

    function setLesson(bytes32 lessonId) external {
        lessonToReturn = lessonId;
    }
}

/// @title Mekanika soulbound diuji lokal; integrasinya tidak.
contract SoulboundCertTest is Test {
    StubCredentialRegistry internal registry;
    SoulboundCert internal cert;

    address internal platform = makeAddr("platform");
    address internal learner = makeAddr("peserta");
    address internal attacker = makeAddr("penyerang");

    bytes32 internal credHash = keccak256("openbadgecredential-json");
    string internal uri = "https://example.org/vc/1.json";

    function setUp() public {
        registry = new StubCredentialRegistry();
        cert = new SoulboundCert(ICredentialRegistry(address(registry)), "Sertifikat Kursus", "CERT", platform);
        registry.setLive(learner, platform, uint64(block.timestamp + 365 days));
    }

    /// @dev Setiap mint harus lewat kunci penerbit. Kalau dilupakan, yang gagal adalah
    /// `NotIssuer` dan pesan itu menutupi hal yang sebenarnya sedang diuji.
    function _mintCert(address to, bytes32 h, string memory u) internal returns (uint256) {
        vm.prank(platform);
        return cert.mint(to, h, u);
    }

    // ------------------------------------------------------- identitas & standar

    function test_Metadata() public view {
        assertEq(cert.name(), "Sertifikat Kursus");
        assertEq(cert.symbol(), "CERT");
    }

    /// @dev interfaceId ERC-5192 TIDAK dipercaya dari ringkasan riset: angka yang sama
    /// dihitung ulang di sini lewat `type(IERC5192).interfaceId` dan dicocokkan dengan
    /// konstanta yang dipakai kontrak.
    function test_SupportsInterface_Erc5192DanErc721() public view {
        assertTrue(cert.supportsInterface(type(IERC5192).interfaceId), "ERC-5192 tidak terdeteksi");
        assertEq(
            uint256(uint32(type(IERC5192).interfaceId)),
            0xb45a3c0e,
            "interfaceId ERC-5192 tidak sama dengan yang diklaim catatan riset"
        );
        assertTrue(cert.supportsInterface(0x80ac58cd), "ERC-721 tidak terdeteksi"); // IERC721
        assertFalse(cert.supportsInterface(0xffffffff), "interfaceId asing tidak boleh true");
    }

    // ------------------------------------------------------------------- mint

    function test_ProducesArtifactForTheRightHolder() public {
        uint256 id = _mintCert(learner, credHash, uri);
        assertEq(id, uint256(credHash), "tokenId tidak diturunkan dari hash kredensial");
        assertEq(cert.ownerOf(id), learner);
        assertEq(cert.credentialOf(id), credHash);
        assertEq(cert.tokenOfCredential(credHash), id);
        // `external_url` beku (memang alamat dokumen), TAPI metadatanya dirakit ulang setiap
        // panggilan — lihat test_MetadataMengikutiStatus di bawah, dan B38 di vault.
        string memory meta = cert.tokenURI(id);
        assertTrue(JsonText.contains(meta, '"external_url":"https://example.org/vc/1.json"'), meta);
        assertTrue(JsonText.contains(meta, '"value":"VALID"'), meta);
        assertTrue(JsonText.contains(meta, vm.toString(credHash)), "hash kredensial harus terbaca di metadata");
        assertEq(cert.balanceOf(learner), 1);
    }

    /// @dev B38, bagian lokal: sebelum 27 Sep string ini disimpan saat mint, jadi artefak dari
    /// kredensial yang dicabut SELAMANYA terlihat sah di wallet. Yang diuji di sini bukan bentuk
    /// JSON-nya, tapi hubungan sebab-akibat antara chain dan apa yang dilihat orang.
    function test_MetadataFollowsStatusAfterRevocation() public {
        uint256 id = _mintCert(learner, credHash, uri);
        assertTrue(JsonText.contains(cert.tokenURI(id), "VALID"));
        assertFalse(JsonText.contains(cert.tokenURI(id), "REVOKED"), "baru mint, belum dicabut");

        registry.setRevoked(true);
        string memory pascaCabut = cert.tokenURI(id);
        assertTrue(JsonText.contains(pascaCabut, '"value":"REVOKED"'), pascaCabut);
        assertFalse(JsonText.contains(pascaCabut, '"value":"VALID"'), "masih melaporkan VALID setelah dicabut");
        // Judul yang dibaca wallet berubah (em dash sesudahnya sengaja tidak diuji: Solidity
        // menolak non-ASCII di literal biasa, dan `unicode"…"` di test hanya akan menyamarkan
        // hal yang sebenarnya kita pastikan di atas — bahwa status masuk ke `name`.)
        assertTrue(JsonText.contains(pascaCabut, '"name":"Sertifikat Kursus '), pascaCabut);

        registry.setRevoked(false);
        registry.setDelisted(true);
        assertTrue(JsonText.contains(cert.tokenURI(id), "ISSUER_DELISTED"), "delisting harus terbaca beda");

        registry.setDelisted(false);
        registry.setExpired(true);
        assertTrue(JsonText.contains(cert.tokenURI(id), "EXPIRED"));
    }

    /// @dev Metadata dibangun dengan menyisipkan `uri` mentah. Satu tanda kutip di dalam URI
    /// akan merusak JSON untuk SELURUH koleksi, jadi ia ditolak di pintu, bukan dikoreksi diam-diam.
    function test_PaidUriRejectedWhenMinting() public {
        vm.prank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.UnsafeUri.selector, 18));
        cert.mint(learner, keccak256("berbahaya"), "https://a.example/\"\"); ");
    }

    function test_LockedAlwaysTrueForExistingToken() public {
        uint256 id = _mintCert(learner, credHash, uri);
        assertTrue(cert.locked(id));
    }

    function test_LockedRejectsUnknownToken() public {
        vm.expectRevert();
        cert.locked(12345);
    }

    function test_MintByNonIssuer_Rejected() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.NotIssuer.selector, attacker));
        cert.mint(learner, credHash, uri);
    }

    // ------------------------------- artefak tidak boleh ada tanpa kredensial hidup

    function test_CredentialMissing_MintRejected() public {
        StubCredentialRegistry empty = new StubCredentialRegistry();
        SoulboundCert c = new SoulboundCert(ICredentialRegistry(address(empty)), "S", "S", platform);
        vm.prank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialNotFound.selector, credHash));
        c.mint(learner, credHash, uri);
    }

    function test_CredentialRevoked_MintRejected() public {
        registry.setRevoked(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialRevoked.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    function test_CredentialExpired_MintRejected() public {
        registry.setExpired(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialExpired.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    /// @dev Penerbit yang didelisting tidak mendapat artefak. Perhatikan apa yang TIDAK
    /// terjadi di sini: `revoked` tetap false. Jadi ini penahanan artefak, bukan pembatalan
    /// sertifikat — dan halaman verifikasi harus menampilkannya sebagai verdict sendiri.
    function test_DelistedIssuer_MintRejected() public {
        registry.setDelisted(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.IssuerDelisted.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    /// @dev Klaim "bisa dipulihkan" harus diuji, bukan cuma dinyatakan di komentar.
    /// Sesudah flag dilepas, mint yang sama harus berhasil tanpa perubahan apa pun pada
    /// kredensialnya — itu bukti bahwa delisting menekan artefak baru, bukan menghapusnya.
    function test_IssuerRestored_MintingWorksAgain() public {
        registry.setDelisted(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.IssuerDelisted.selector, credHash));
        _mintCert(learner, credHash, uri);

        registry.setDelisted(false);
        uint256 tokenId = _mintCert(learner, credHash, uri);
        assertEq(cert.ownerOf(tokenId), learner, "artefak tidak sampai ke peserta sesudah pemulihan");
    }

    function test_MintToWrongPerson_Rejected() public {
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.WrongHolder.selector, credHash, learner, attacker));
        _mintCert(attacker, credHash, uri);
    }

    function test_OneCredentialOneArtifact() public {
        _mintCert(learner, credHash, uri);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.AlreadyBound.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    function test_ZeroHashRejected() public {
        vm.expectRevert(SoulboundCert.ZeroCredential.selector);
        _mintCert(learner, bytes32(0), uri);
    }

    function test_EmptyUriRejected() public {
        vm.expectRevert(SoulboundCert.EmptyURI.selector);
        _mintCert(learner, keccak256("kredensial lain"), "");
    }

    function test_MintToZeroAddressRejected() public {
        registry.setLive(address(0), platform, uint64(block.timestamp + 365 days));
        vm.expectRevert(SoulboundCert.ZeroAddress.selector);
        vm.prank(platform);
        cert.mint(address(0), credHash, uri);
    }

    // -------------------------------------------------- tak bisa pindah, tak bisa jual

    function test_TransferFrom_RejectedEvenByHolder() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.transferFrom(learner, attacker, id);
    }

    function test_SafeTransferFrom_RejectedInBothVariants() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.startPrank(learner);

        // Varian 3-argumen tidak `virtual` di OZ, tapi memanggil varian 4-argumen,
        // jadi guard kita tetap menangkapnya.
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.safeTransferFrom(learner, attacker, id);

        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.safeTransferFrom(learner, attacker, id, "");

        vm.stopPrank();
    }

    function test_ApprovalRejected() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.startPrank(learner);

        vm.expectRevert(SoulboundCert.NotDelegable.selector);
        cert.approve(attacker, id);

        vm.expectRevert(SoulboundCert.NotDelegable.selector);
        cert.setApprovalForAll(attacker, true);

        vm.stopPrank();
    }

    /// @dev Upaya dari pihak yang bukan pemegang pun tidak mengubah apa pun.
    function test_CredentialIntactAfterEveryTransferAttempt() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.transferFrom(learner, attacker, id);

        vm.expectRevert(SoulboundCert.NotDelegable.selector);
        cert.approve(attacker, id);

        vm.prank(attacker);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.safeTransferFrom(learner, attacker, id);

        assertEq(cert.ownerOf(id), learner, "kepemilikan berubah");
        assertEq(cert.balanceOf(learner), 1);
        assertEq(cert.balanceOf(attacker), 0);
    }

    /// @dev Tidak ada alamat penerima yang membuat pemindahan lolos.
    function testFuzz_NoTransferEverPasses(address to) public {
        uint256 id = _mintCert(learner, credHash, uri);
        vm.assume(to != address(0));

        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.transferFrom(learner, to, id);

        assertEq(cert.ownerOf(id), learner);
    }

    /// @dev B39: kredensial lesson TIDAK mencetak artefak. Yang diuji bukan "mint menolak" secara
    /// umum, tapi bahwa penolakannya datang dari granularitas — jadi ia tetap lolos untuk level
    /// kursus yang sama, dan pesan revert-nya menyebut lessonId yang jadi sebab.
    function test_ArtifactOnlyAtCourseLevel() public {
        bytes32 lessonId = keccak256("lesson:m2-gas-bayar");

        // level kursus: jalan
        uint256 id = _mintCert(learner, credHash, uri);
        assertEq(cert.ownerOf(id), learner);

        // level lesson: ditolak, dan sebabnya terbaca
        registry.setLesson(lessonId);
        bytes32 otherHash = keccak256("kredensial-lesson");
        vm.prank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.LessonLevelNotMintable.selector, otherHash, lessonId));
        cert.mint(learner, otherHash, uri);
        assertEq(cert.balanceOf(learner), 1, "penolakan harus tidak meninggalkan artefak");
    }

    /// @dev B40 bagian atomisitas. Jujur tentang cakupannya: stub registry di berkas ini bersifat
    /// GLOBAL (satu status untuk semua hash), jadi test ini membuktikan "batch yang gagal tidak
    /// meninggalkan artefak sama sekali", BUKAN kasus "yang pertama hidup, yang kedua mati" -
    /// yang itu ditegakkan oleh `require` di dalam `mint` (satu jalur untuk batch dan tunggal)
    /// dan butuh dua kredensial dengan status berbeda di chain nyata, jadi tempatnya di fork test.
    function test_FailedBatchLeavesNoArtifact() public {
        address[] memory learners = new address[](2);
        learners[0] = learner;
        learners[1] = learner;
        bytes32[] memory hashes = new bytes32[](2);
        hashes[0] = keccak256("batch-1");
        hashes[1] = keccak256("batch-2");
        string[] memory uris = new string[](2);
        uris[0] = uri;
        uris[1] = "https://example.org/vc/2.json";

        registry.setLive(learner, platform, uint64(block.timestamp + 365 days));
        registry.setRevoked(true); // global: kedua hash mati

        vm.prank(platform);
        // Error-nya membawa argumen (hash yang mana), jadi selector saja tidak cukup - dan itu
        // justru yang kita inginkan: test membaca sebabnya, bukan sekadar "ada revert".
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialRevoked.selector, hashes[0]));
        cert.mintBatch(learners, hashes, uris);

        assertEq(cert.balanceOf(learner), 0, "batch yang gagal tidak boleh meninggalkan artefak");
        assertEq(cert.balanceOf(address(this)), 0);
    }

    /// @dev B40 dalam angka. Yang dibandingkan di sini bukan "batch lebih murah karena sihir",
    /// tapi overhead yang memang hilang: satu verifikasi tanda tangan + satu biaya dasar
    /// transaksi untuk N artefak, bukan N kali. Yang mahal per artefak (SSTORE + LOG) tetap
    /// dibayar per artefak, dan test ini mencetaknya supaya kami tidak mengklaim penghematan
    /// yang lebih besar daripada yang terjadi.
    function test_GasOfBatchVersusOneByOne() public {
        registry.setLive(learner, platform, uint64(block.timestamp + 365 days));

        bytes32[] memory hs = new bytes32[](4);
        for (uint256 i = 0; i < hs.length; i++) {
            hs[i] = keccak256(abi.encode("batch-gas", i));
        }

        uint256 separateStart = gasleft();
        for (uint256 i = 0; i < hs.length; i++) {
            vm.prank(platform);
            cert.mint(learner, hs[i], uri);
        }
        uint256 separate = separateStart - gasleft();

        bytes32[] memory bh = new bytes32[](4);
        address[] memory bl = new address[](4);
        string[] memory bu = new string[](4);
        for (uint256 i = 0; i < 4; i++) {
            bh[i] = keccak256(abi.encode("batch-gas-b", i));
            bl[i] = learner;
            bu[i] = uri;
        }
        vm.prank(platform);
        uint256 batchStart = gasleft();
        cert.mintBatch(bl, bh, bu);
        uint256 batch = batchStart - gasleft();

        assertEq(cert.balanceOf(learner), 8);
        // Overhead loop test ini masuk ke kedua pengukuran; yang dijamin di sini arahnya,
        // besaran sebenarnya dicetak untuk dibaca, bukan untuk dikarang di dokumen.
        assertLt(batch, separate, "batch harus lebih murah daripada satu-per-satu");
        emit log_named_uint("gas 4x mint terpisah (termasuk overhead test)", separate);
        emit log_named_uint("gas mintBatch(4)", batch);
        emit log_named_uint("hemat untuk 4 artefak", separate - batch);
    }

    /// @dev Bentuk batch dijaga sebelum satu artefak pun tercetak.
    function test_BatchShapeRejectedBeforeMinting() public {
        address[] memory one = new address[](1);
        one[0] = learner;
        bytes32[] memory two = new bytes32[](2);
        string[] memory none = new string[](0);

        vm.startPrank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.BatchLengthMismatch.selector, 1, 2, 0));
        cert.mintBatch(one, two, none);

        address[] memory zero = new address[](0);
        bytes32[] memory hashesZero = new bytes32[](0);
        string[] memory urisZero = new string[](0);
        vm.expectRevert(SoulboundCert.EmptyBatch.selector);
        cert.mintBatch(zero, hashesZero, urisZero);

        uint256 max = cert.MAX_BATCH();
        address[] memory bigL = new address[](max + 1);
        bytes32[] memory bigH = new bytes32[](max + 1);
        string[] memory bigU = new string[](max + 1);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.BatchTooLarge.selector, max + 1, max));
        cert.mintBatch(bigL, bigH, bigU);
        vm.stopPrank();
    }
}
