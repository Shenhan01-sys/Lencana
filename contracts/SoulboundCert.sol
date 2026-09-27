// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC721 } from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ICredentialRegistry } from "./interfaces/ICredentialRegistry.sol";

/// @dev Antarmuka ERC-5192 (Final, 2022-07-01). interfaceId-nya 0xb45a3c0e, yang adalah
/// selector dari `locked(uint256)` — dihitung ulang dan dicocokkan di test, tidak dipercaya
/// dari ringkasan riset. OZ 5.1.0 tidak menyediakan berkas IERC5192, jadi dideklarasikan di sini.
interface IERC5192 {
    event Locked(uint256 indexed tokenId, address indexed owner);

    function locked(uint256 tokenId) external view returns (bool);
}

/// @title SoulboundCert
///
/// ARTEFAK, bukan kredensial.
///
/// Ini adalah benda yang dilihat, dimiliki, dan dipamerkan peserta: NFT yang tidak bisa
/// dipindahtangankan. Kredensial yang sebenarnya tetap JSON `OpenBadgeCredential`
/// bertanda tangan DID penerbit, dan sumber kebenaran statusnya tetap attestation BAS di
/// chain. Yang dilakukan kontrak ini hanyalah memberi artefak itu satu jaminan tambahan:
///
///   **artefaknya tidak bisa ada kalau kredensialnya tidak hidup.**
///
/// `mint()` membaca registry (BAS lewat CredentialResolver) dan menolak kalau kredensialnya
/// tidak ada, sudah dicabut, sudah kedaluwarsa, atau alamat penerimanya bukan orang yang
/// di-mint. Tanpa jaminan ini, "SBT sertifikat" bisa dicetak sendiri oleh siapa pun dan
/// justru jadi alat pemalsuan — persis kegagalan yang ingin kita hapus.
///
/// ## Kenapa transfer diblokir sampai tiga lapis
///
/// Non-transferability adalah satu-satunya hal yang membuat artefak ini berarti (jawaban
/// pertanyaan (b) di hub T02: kalau sertifikat bisa dijual, nilainya nol). Karena itu:
///  - `transferFrom` / `safeTransferFrom` / `approve` / `setApprovalForAll` langsung revert
///    dengan pesan yang jelas, supaya pengguna dan wallet tahu alasannya, bukan kegagalan
///    misterius dari dalam ERC-721; DAN
///  - `_update()` dijaga sebagai backstop struktural, karena di OZ 5.x SEMUA jalur
///    pemindahan (termasuk `_burn`) lewat situ. Kalau nanti ada kode yang memanggil
///    `_update` langsung, ia tetap tidak bisa memindahkan atau memusnahkan sertifikat.
///
/// Burn juga diblokir: pemegang tidak boleh bisa menghancurkan bukti, dan platform pun
/// tidak — sejarah sebuah kredensial harus tetap terbaca setelah dicabut.
///
/// ## Batas yang harus ditulis di UI, bukan disembunyikan
///
/// - Soulbound TIDAK mencegah screenshot, dan tidak mengikat sertifikat ke MANUSIA —
///   yang terikat adalah sebuah alamat. (ERC-721 sendiri memperingatkan privasi gagal
///   begitu `ownerOf` bisa diquery lintas tokenId; karena itu data pribadi tidak pernah
///   menyentuh kontrak ini.)
/// - `tokenURI()` bukan string yang disimpan lalu dilupakan. Metadatanya DIRAKIT setiap
///   panggilan dan statusnya dibaca dari `CredentialResolver`, jadi "koleksi" di wallet
///   ikut berubah bersama kenyataannya — see B38 in the vault. Yang beku hanyalah
///   `external_url`, dan itu memang alamat dokumen, bukan isinya.
contract SoulboundCert is ERC721, Ownable2Step, IERC5192 {
    /// @dev interfaceId ERC-5192 = selector `locked(uint256)` = 0xb45a3c0e.
    bytes4 private constant ERC5192_INTERFACE_ID = 0xb45a3c0e;

    ICredentialRegistry public immutable registry;

    /// @dev credentialHash => tokenId. tokenId = uint256(credentialHash), jadi pemetaan ini
    /// sekaligus membuktikan "tidak ada dua artefak untuk satu kredensial".
    mapping(bytes32 => uint256) public tokenOfCredential;

    /// @dev tokenId => credentialHash yang diwakilinya.
    mapping(uint256 => bytes32) public credentialOf;

    /// @dev tokenId => lokasi JSON kredensial (bukan isinya; tidak ada data pribadi on-chain).
    mapping(uint256 => string) private _uris;

    event CertBound(uint256 indexed tokenId, address indexed learner, bytes32 indexed credentialHash, address issuer);

    error NotIssuer(address sender);
    error CredentialNotFound(bytes32 credentialHash);
    error CredentialRevoked(bytes32 credentialHash);
    error CredentialExpired(bytes32 credentialHash);
    error IssuerDelisted(bytes32 credentialHash);
    error WrongHolder(bytes32 credentialHash, address expected, address asked);
    error AlreadyBound(bytes32 credentialHash);
    error NotTransferable();
    error NotDelegable();
    error ZeroAddress();
    error ZeroCredential();
    error EmptyURI();
    /// @dev `uri` disisipkan apa adanya ke dalam JSON yang kita rakit di `tokenURI()`. Satu tanda
    /// kutip atau backslash di dalamnya bukan sekadar jelek: itu merusak metadata semua koleksi.
    error UnsafeUri(uint256 byteAt);

    constructor(ICredentialRegistry registry_, string memory name_, string memory symbol_, address owner_)
        ERC721(name_, symbol_)
        Ownable(owner_)
    {
        if (address(registry_) == address(0) || owner_ == address(0)) revert ZeroAddress();
        registry = registry_;
    }

    // ------------------------------------------------------------------ mint

    /// @notice Mencetak artefak untuk satu kredensial yang sedang hidup.
    /// @dev `msg.sender` harus owner kontrak ini. sejak D30 itu BUKAN agen penerbit:
    /// penerbitnya banyak dan milik pihak ketiga, sedangkan satu kunci mint hanya bisa
    /// satu alamat. Pembagian yang tersisa dan yang kami pakai:
    ///   attestation = klaim AGEN, dicatat di BAS atas nama agen itu (D30/D31);
    ///   artefak     = salinan penyajian dari PLATFORM, dicetak di sini.
    /// Jadi `NotIssuer` di bawah ini dibaca "bukan pencetak artefak yang sah", dan yang
    /// sah itu alamat platform — yang juga publik, dan juga bisa diganti lewat
    /// `transferOwnership`. Yang tidak berubah: artefak tetap tidak punya daya apa pun
    /// atas kredensialnya; ia hanya menunjuk hash-nya.
    function mint(address learner, bytes32 credentialHash, string calldata uri) external returns (uint256) {
        if (msg.sender != owner()) revert NotIssuer(msg.sender);
        if (learner == address(0)) revert ZeroAddress();
        if (bytes(uri).length == 0) revert EmptyURI();
        _requireJsonSafe(uri);
        if (credentialHash == bytes32(0)) revert ZeroCredential();

        // Lossless: bytes32 <-> uint256 adalah reinterpretasi 256 bit yang sama, bukan
        // pemotongan. Karena tokenId diturunkan dari hash-nya, "satu kredensial satu
        // artefak" ditegakkan oleh tumpang tindih kunci, bukan oleh pembukuan tambahan.
        uint256 tokenId = uint256(credentialHash);
        if (credentialOf[tokenId] != bytes32(0)) revert AlreadyBound(credentialHash);

        (bool exists, bool revoked, bool expired, bool delisted,,,) = registry.statusOf(credentialHash);
        if (!exists) revert CredentialNotFound(credentialHash);
        if (revoked) revert CredentialRevoked(credentialHash);
        if (expired) revert CredentialExpired(credentialHash);
        // Penerbit yang didelisting tidak mendapat artefak baru. Yang ditahan hanyalah
        // artefaknya: kredensial peserta tidak berubah status, dan setelah `relistIssuer`
        // mint ini langsung bisa jalan. Alasannya bukan menghukum peserta — mencetak
        // artefak adalah tindakan platform, dan platform baru saja menyatakan tidak
        // berdiri di belakang penerbit itu.
        if (delisted) revert IssuerDelisted(credentialHash);

        address holder = registry.holderOf(credentialHash);
        if (holder != learner) revert WrongHolder(credentialHash, holder, learner);

        credentialOf[tokenId] = credentialHash;
        tokenOfCredential[credentialHash] = tokenId;
        _uris[tokenId] = uri;

        _mint(learner, tokenId);
        emit Locked(tokenId, learner);
        emit CertBound(tokenId, learner, credentialHash, msg.sender);
        return tokenId;
    }

    // ------------------------------------------------------------- pembacaan

    /// @dev Selalu true untuk token yang ada. Inilah yang membuat wallet bisa menampilkan
    /// sertifikat ini sebagai tak tersalin: ERC-165 + `locked()` adalah jalur standar,
    /// bukan hasil override diam-diam yang tak terdeteksi.
    function locked(uint256 tokenId) external view override returns (bool) {
        _requireOwned(tokenId);
        return true;
    }

    /// @dev Metadata koleksi, DIRAKIT setiap panggilan — bukan string yang beku saat mint.
    ///
    /// Alasannya konkret dan pernah jadi bohong di repo ini: wallet dan marketplace hanya melihat
    /// `tokenURI`. Selama metadata berisi apa yang ditulis saat mint, sebuah kredensial yang
    /// dicabut tetap tampil "lulus" selamanya, dan tempat itu satu-satunya tempat cerita kita
    /// tidak benar (B38). Sekarang status datang dari `CredentialResolver` pada saat dibaca,
    /// jadi mencabut kredensial ikut mengubah artefaknya — tanpa burn, karena sejarah tidak
    /// boleh bisa dihapus (lihat `_update`).
    ///
    /// Urutan kata mengikuti halaman verifier: revoked → expired → issuerDelisted → VALID.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        bytes32 hash = credentialOf[tokenId];
        (, bool revoked, bool expired, bool delisted,,,) = registry.statusOf(hash);
        string memory status = _statusWord(revoked, expired, delisted);

        return string(
            abi.encodePacked(
                '{"name":"',
                name(),
                // `unicode` wajib: Solidity menolak karakter non-ASCII di string literal biasa,
                // dan em dash ini memang bagian dari teks yang dibaca orang.
                unicode" — ",
                status,
                '","description":"Soulbound artefact issued by Lencana. The credential itself is a signed Open Badges 3.0 document served off chain; the status in this metadata is read live from the CredentialResolver, so a revoked credential never presents itself as valid.","external_url":"',
                _uris[tokenId],
                '","attributes":[{"trait_type":"Credential status","value":"',
                status,
                '"},{"trait_type":"Credential hash","value":"',
                _toHex(hash),
                '"}]}'
            )
        );
    }

    /// @dev Kata status yang sama dengan yang dibaca orang di halaman verifikasi.
    function _statusWord(bool revoked, bool expired, bool delisted) internal pure returns (string memory) {
        if (revoked) return "REVOKED";
        if (expired) return "EXPIRED";
        if (delisted) return "ISSUER_DELISTED";
        return "VALID";
    }

    /// @dev `uri` masuk apa adanya ke JSON, jadi karakter yang butuh escaping kita tolak di depan
    /// pintu: lebih baik satu mint gagal daripada seluruh koleksi menghasilkan metadata rusak.
    function _requireJsonSafe(string memory s) internal pure {
        bytes memory b = bytes(s);
        for (uint256 i = 0; i < b.length; i++) {
            uint8 c = uint8(b[i]);
            if (c == 0x22 || c == 0x5c || c < 0x20) revert UnsafeUri(i);
        }
    }

    bytes16 private constant HEX = "0123456789abcdef";

    function _toHex(bytes32 v) internal pure returns (string memory) {
        bytes memory out = new bytes(66);
        out[0] = "0";
        out[1] = "x";
        for (uint256 i = 0; i < 32; i++) {
            uint8 b = uint8(v[i]);
            out[2 + i * 2] = HEX[b >> 4];
            out[3 + i * 2] = HEX[b & 0x0f];
        }
        return string(out);
    }

    function supportsInterface(bytes4 interfaceId) public view override returns (bool) {
        return interfaceId == ERC5192_INTERFACE_ID || super.supportsInterface(interfaceId);
    }

    // ------------------------------------------- pemindahan & pendelegasian: mati

    function transferFrom(address, address, uint256) public pure override {
        revert NotTransferable();
    }

    /// @dev Hanya varian 4-argumen yang `virtual` di OZ 5.1.0 — dan itu cukup, karena
    /// `safeTransferFrom(from, to, id)` memanggil `safeTransferFrom(from, to, id, "")`
    /// secara internal.
    function safeTransferFrom(address, address, uint256, bytes memory) public pure override {
        revert NotTransferable();
    }

    /// @dev Approval tidak ada gunanya pada token yang tak bisa dipindah, dan membiarkannya
    /// hanya memberi illusion of control di wallet.
    function approve(address, uint256) public pure override {
        revert NotDelegable();
    }

    function setApprovalForAll(address, bool) public pure override {
        revert NotDelegable();
    }

    /// @dev Backstop struktural: di OZ 5.x semua pemindahan dan burn lewat sini.
    /// from != address(0) berarti ini transfer atau burn — dua-duanya ditolak.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = _ownerOf(tokenId);
        if (from != address(0)) revert NotTransferable();
        return super._update(to, tokenId, auth);
    }
}
