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

    function test_MenghasilkanArtefakUntukPemegangYangBenar() public {
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
    function test_MetadataMengikutiStatusSetelahDicabut() public {
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
    function test_UriBerbayaDitolakSaatMint() public {
        vm.prank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.UnsafeUri.selector, 18));
        cert.mint(learner, keccak256("berbahaya"), "https://a.example/\"\"); ");
    }

    function test_LockedSentiasaTrueUntukTokenAda() public {
        uint256 id = _mintCert(learner, credHash, uri);
        assertTrue(cert.locked(id));
    }

    function test_LockedMenolakTokenTidakAda() public {
        vm.expectRevert();
        cert.locked(12345);
    }

    function test_MintOlehBukanPenerbit_Ditolak() public {
        vm.prank(attacker);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.NotIssuer.selector, attacker));
        cert.mint(learner, credHash, uri);
    }

    // ------------------------------- artefak tidak boleh ada tanpa kredensial hidup

    function test_KredensialBelumAda_MintDitolak() public {
        StubCredentialRegistry empty = new StubCredentialRegistry();
        SoulboundCert c = new SoulboundCert(ICredentialRegistry(address(empty)), "S", "S", platform);
        vm.prank(platform);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialNotFound.selector, credHash));
        c.mint(learner, credHash, uri);
    }

    function test_KredensialDicabut_MintDitolak() public {
        registry.setRevoked(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialRevoked.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    function test_KredensialKedaluwarsa_MintDitolak() public {
        registry.setExpired(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.CredentialExpired.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    /// @dev Penerbit yang didelisting tidak mendapat artefak. Perhatikan apa yang TIDAK
    /// terjadi di sini: `revoked` tetap false. Jadi ini penahanan artefak, bukan pembatalan
    /// sertifikat — dan halaman verifikasi harus menampilkannya sebagai verdict sendiri.
    function test_PenerbitDelisted_MintDitolak() public {
        registry.setDelisted(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.IssuerDelisted.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    /// @dev Klaim "bisa dipulihkan" harus diuji, bukan cuma dinyatakan di komentar.
    /// Sesudah flag dilepas, mint yang sama harus berhasil tanpa perubahan apa pun pada
    /// kredensialnya — itu bukti bahwa delisting menekan artefak baru, bukan menghapusnya.
    function test_PenerbitDipulihkan_MintJalanLagi() public {
        registry.setDelisted(true);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.IssuerDelisted.selector, credHash));
        _mintCert(learner, credHash, uri);

        registry.setDelisted(false);
        uint256 tokenId = _mintCert(learner, credHash, uri);
        assertEq(cert.ownerOf(tokenId), learner, "artefak tidak sampai ke peserta sesudah pemulihan");
    }

    function test_MintUntukOrangSalah_Ditolak() public {
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.WrongHolder.selector, credHash, learner, attacker));
        _mintCert(attacker, credHash, uri);
    }

    function test_SatuKredensialSatuArtefak() public {
        _mintCert(learner, credHash, uri);
        vm.expectRevert(abi.encodeWithSelector(SoulboundCert.AlreadyBound.selector, credHash));
        _mintCert(learner, credHash, uri);
    }

    function test_HashNolDitolak() public {
        vm.expectRevert(SoulboundCert.ZeroCredential.selector);
        _mintCert(learner, bytes32(0), uri);
    }

    function test_UriKosongDitolak() public {
        vm.expectRevert(SoulboundCert.EmptyURI.selector);
        _mintCert(learner, keccak256("kredensial lain"), "");
    }

    function test_MintKeAddressNolDitolak() public {
        registry.setLive(address(0), platform, uint64(block.timestamp + 365 days));
        vm.expectRevert(SoulboundCert.ZeroAddress.selector);
        vm.prank(platform);
        cert.mint(address(0), credHash, uri);
    }

    // -------------------------------------------------- tak bisa pindah, tak bisa jual

    function test_TransferFrom_DitolakBahkanOlehPemegangSendiri() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.transferFrom(learner, attacker, id);
    }

    function test_SafeTransferFrom_DitolakDuaDuaVarian() public {
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

    function test_PendelegasianDitolak() public {
        uint256 id = _mintCert(learner, credHash, uri);

        vm.startPrank(learner);

        vm.expectRevert(SoulboundCert.NotDelegable.selector);
        cert.approve(attacker, id);

        vm.expectRevert(SoulboundCert.NotDelegable.selector);
        cert.setApprovalForAll(attacker, true);

        vm.stopPrank();
    }

    /// @dev Upaya dari pihak yang bukan pemegang pun tidak mengubah apa pun.
    function test_KredensialTetapUtuhSetelahSemuaUpayaPemindahan() public {
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
    function testFuzz_TidakAdaPemindahanYangLolos(address to) public {
        uint256 id = _mintCert(learner, credHash, uri);
        vm.assume(to != address(0));

        vm.prank(learner);
        vm.expectRevert(SoulboundCert.NotTransferable.selector);
        cert.transferFrom(learner, to, id);

        assertEq(cert.ownerOf(id), learner);
    }
}
