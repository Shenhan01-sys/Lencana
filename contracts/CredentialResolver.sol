// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { SchemaResolver } from "bas/resolver/SchemaResolver.sol";
import { IEAS, Attestation } from "bas/IEAS.sol";
import { ISchemaRegistry } from "bas/ISchemaRegistry.sol";
import { ISchemaResolver } from "bas/resolver/ISchemaResolver.sol";
import { EMPTY_UID, NO_EXPIRATION_TIME } from "bas/Common.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";
import { ICredentialRegistry } from "./interfaces/ICredentialRegistry.sol";

/// @title CredentialResolver
///
/// SATU-SATUNYA kontrak inti yang benar-benar kita tulis untuk lapisan kredensial.
/// sisanya (anchor, revocation, bukti waktu, registry schema) dipakai dari BAS/EAS yang
/// sudah ter-deploy di BSC testnet chain 97.
///
/// ## Kenapa kontrak ini perlu ada
///
/// Registry BAS/EAS bersifat permissionless: siapa pun boleh `register()` schema dan
/// `attest()` atasnya (lihat `SchemaRegistry.register` — tanpa akses terbatas, tanpa fee).
/// Untuk sertifikat kursus, itu justru inti masalahnya: "siapa yang berhak menerbitkan"
/// adalah pertanyaan yang kalau dijawab asal-asalan membuat pasar dibanjiri palsu.
///
/// EAS menyediakan kaitannya lewat `SchemaResolver`. UID schema dihitung dari
/// keccak256(schema, resolver, revocable), jadi begitu schema terdaftar, resolver-nya
/// tidak bisa diganti — dan EAS memanggil `onAttest()` SEBELUM attestation diterima.
/// Mengembalikan false membuat seluruh `attest()` revert (`InvalidAttestation`).
///
/// ## Yang dijaga di sini
///
///  1. **Whitelist penerbit.** Hanya alamat aktif di `_issuer` yang boleh menerbitkan.
///  2. **Anti-duplikasi.** Satu `credentialHash` hanya boleh punya satu attestation.
///  3. **Rantai prasyarat yang PEKA-PENCABUTAN.** Ini celah NYATA di EAS, bukan
///     pelengkap: `_attest()` hanya mengecek keberadaan refUID
///     (`if (!isAttestationValid(request.refUID)) revert NotFound()`), dan
///     `isAttestationValid` hanya membaca `_db[uid].uid != EMPTY_UID`. Artinya EAS MEMBIARKAN
///     sertifikat lanjutan diterbitkan di atas sertifikat dasar yang SUDAH DICABUT atau
///     SUDAH KEDALUWARSA — dan juga di atas prasyarat milik orang lain. Keempatnya ditutup
///     di `_validatePrerequisite`, yang tidak bisa dilewati siapa pun karena ia berjalan
///     di dalam `attest()` milik BAS.
///  4. **Delisting penerbit pihak ketiga.** Penerbit di sini adalah agen AI milik orang lain:
///     mereka yang men-deploy, memegang kunci, dan bertanggung jawab atas isinya. Lencana
///     hanya menyediakan tempat mereka bekerja. Konsekuensinya keras dan sudah diverifikasi
///     dari sumber: EAS hanya mengizinkan attester asal yang mencabut, jadi platform
///     TIDAK BISA membatalkan kredensial agen lain. `delistIssuer` adalah rem yang tersisa —
///     ia menghentikan penerbitan baru, menolak kredensialnya dipakai sebagai prasyarat, dan
///     membuat `statusOf` mengembalikannya sebagai verdict tersendiri.
///
/// ## Yang TIDAK dilakukan di sini (dan itu disengaja)
///
/// Tidak ada data pribadi, tidak ada nama peserta, tidak ada nilai mentah on-chain. Yang
/// naik ke chain hanya `keccak256(JSON OpenBadgeCredential)` + ID kursus. Spesifikasi
/// ERC-721 sendiri sudah memperingatkan bahwa privasi gagal begitu `ownerOf` bisa diquery
/// lintas tokenId — jadi registry penerbit publik harus tetap terpisah dari data pribadi.
contract CredentialResolver is SchemaResolver, Ownable2Step, ICredentialRegistry {
    /// @dev String schema EAS. Bentuknya menentukan UID schema, jadi mengubah satu karakter
    /// pun menghasilkan schema yang berbeda di chain dan memecah verifier yang sudah ada.
    ///
    /// 🔴 TIGA field, dan ini keputusan yang tidak bisa diulang murah (D28.1). `lessonId` ada
    /// karena satu kursus punya banyak lesson dan sertifikat kursus adalah akumulasi semuanya.
    /// Ditambahkan SEBELUM deploy publik: sesudahnya, schema baru = UID baru = kredensial lama
    /// menunjuk UID lama dan verifier harus mendukung dua schema selamanya.
    ///
    /// Level lesson TIDAK menyimpan nilai. Skor hidup di dokumen VC off-chain
    /// (`credentialSubject.result[]` + `achievement.criteria`) dan ditandatangani penerbit.
    /// `lessonId` = EMPTY_UID untuk kredensial tingkat kursus.
    string public constant CREDENTIAL_SCHEMA = "bytes32 credentialHash,bytes32 courseId,bytes32 lessonId";

    /// @dev Harus tetap true. Tanpa kemampuan mencabut, sistem tidak bisa dipercaya
    /// institusi — dan attestation pada schema non-revocable tidak bisa diperbaiki lagi.
    bool public constant SCHEMA_REVOCABLE = true;

    /// @dev credentialHash => UID attestation yang menerbitkannya. EMPTY_UID bila belum ada.
    mapping(bytes32 => bytes32) public attestationOf;

    /// @dev uid attestation => UID prasyaratnya (EMPTY_UID bila tidak berprasyarat).
    mapping(bytes32 => bytes32) public prerequisiteOf;

    /// @dev uid attestation => lessonId-nya. EMPTY_UID untuk kredensial tingkat kursus.
    mapping(bytes32 => bytes32) public lessonOf;

    /// @dev true bila attestation ini diterbitkan lewat resolver ini. Ini yang membuat
    /// verifier bisa membedakan "attestation ada di chain" dari "attestation ini kredensial
    /// yang kami akui" — attestation lain di chain lain tidak ikut dianggap.
    mapping(bytes32 => bool) public issuedHere;

    /// @dev pemegang => daftar credentialHash miliknya, urut penerbitan.
    ///
    /// Ada karena **BAS tidak menyediakan Indexer untuk BSC** (hanya opBNB), jadi tidak ada cara
    /// murah menelusuri log untuk membangun "daftar sertifikat saya". Tanpa indeks ini dashboard
    /// peserta tidak bisa dibaca dari chain sama sekali.
    ///
    /// ⚠️ Biaya yang disadari: satu push array per penerbitan, dan array tumbuh tanpa batas untuk
    /// satu alamat. `credentialsOf` adalah view (gratis bagi pemanggil), tapi alamat dengan ribuan
    /// kredensial bisa melewati batas gas RPC saat dibaca — jadi backend tetap perlu paginasi.
    mapping(address => bytes32[]) internal _credentialsOf;

    mapping(address => bool) private _issuer;

    /// @dev Penerbit yang DITEKAN oleh platform karena sebab. Ini bukan sinonim dari
    /// "sudah dihapus dari whitelist" — dan pemisahannya disengaja:
    ///
    ///   `removeIssuer`  -> tidak boleh menerbitkan lagi, kredensial lama TETAP VALID
    ///   `delistIssuer`  -> tidak boleh menerbitkan lagi, kredensial lama dibaca DILISTING
    ///
    /// Kenapa perlu ada: penerbitnya adalah agen pihak ketiga yang kuncinya bukan milik kita.
    /// EAS hanya mengizinkan attester asal yang mencabut (`_revoke`:
    /// `if (attestation.attester != revoker) revert AccessDenied()`), dan jalur delegasinya pun
    /// tetap butuh tanda tangan attester itu sendiri per-UID — jadi TIDAK ADA cara bagi platform
    /// untuk mencabut kredensial agen lain, dan tidak ada blanket pre-authorization karena UID
    /// attestation yang belum terbit tidak bisa diketahui lebih dulu. Tanpa flag ini, agen yang
    /// kuncinya bocor tetap terbaca VALID di halaman verifikasi kita selamanya.
    ///
    /// Arah dayanya failsafe dan itu yang membuatnya aman: flag ini hanya bisa membuat verdict
    /// LEBIH KETAT, tidak pernah lebih longgar. Tidak ada input yang membuat kredensial mati
    /// terbaca hidup. Ia juga bisa dipulihkan lewat `relistIssuer`, dan keduanya ber-event.
    mapping(address => bool) private _delisted;

    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);
    event IssuerDelisted(address indexed issuer);
    event IssuerRelisted(address indexed issuer);
    event CredentialIssued(
        bytes32 indexed credentialHash,
        bytes32 indexed uid,
        address indexed holder,
        bytes32 prereqUid,
        bytes32 lessonId
    );
    event CredentialRevoked(bytes32 indexed credentialHash, bytes32 indexed uid, address indexed issuer);

    error ZeroAddress();
    error IssuerAlreadyExists(address issuer);
    error IssuerNotRegistered(address issuer);
    error IssuerNotDelisted(address issuer);

    /// @dev Sengaja bukan `addIssuer` yang bisa memulihkan agen yang didelisting. Re-admission
    /// harus tindakan terpisah yang terlihat dan ber-event, supaya pemulihan tidak pernah terjadi
    /// sebagai efek samping dari "menambah penerbit".
    error DelistedCannotBeReadmitted(address issuer);
    error NotAnIssuer(address sender);
    error AlreadyIssued(bytes32 credentialHash);
    error BadDataLength();
    error PrerequisiteRevoked(bytes32 prereqUid);
    error PrerequisiteExpired(bytes32 prereqUid);
    error PrerequisiteWrongHolder(bytes32 prereqUid);
    error PrerequisiteNotOurs(bytes32 prereqUid);

    /// @dev Tanpa ini delisting hanya kosmetik: agen yang sudah dinyatakan bermasalah masih
    /// bisa dipakai sebagai dasar untuk menerbitkan kredensial lanjutan, lewat agen lain yang
    /// sehat. Skenarionya nyata di marketplace — peserta pindah agen di tengah jalur belajar.
    error PrerequisiteIssuerDelisted(bytes32 prereqUid);
    error SchemaAlreadyRegistered();

    constructor(IEAS eas, address owner) SchemaResolver(eas) Ownable(owner) {
        if (address(eas) == address(0) || owner == address(0)) revert ZeroAddress();
    }

    // ------------------------------------------------------------- schema

    /// @notice UID schema tempat kredensial ini diterbitkan, dihitung dengan rumus yang
    /// persis sama dengan `SchemaRegistry._getUID`. View murni: tidak butuh state chain.
    function schemaUID() public view returns (bytes32) {
        return keccak256(abi.encodePacked(CREDENTIAL_SCHEMA, address(this), SCHEMA_REVOCABLE));
    }

    /// @notice Mendaftarkan schema ini ke registry BAS. Permissionless di sisi registry
    /// (siapa pun boleh memanggil), tapi hanya sekali per kombinasi (schema, resolver,
    /// revocable) — registry revert `AlreadyExists()` bila sudah ada.
    function registerSchema() external {
        if (_schemaRegistered()) revert SchemaAlreadyRegistered();
        ISchemaRegistry registry = _eas.getSchemaRegistry();
        registry.register(CREDENTIAL_SCHEMA, ISchemaResolver(address(this)), SCHEMA_REVOCABLE);
    }

    function _schemaRegistered() private view returns (bool) {
        return _eas.getSchemaRegistry().getSchema(schemaUID()).uid != EMPTY_UID;
    }

    // ------------------------------------------------------------ penerbit

    function addIssuer(address issuer) external onlyOwner {
        if (issuer == address(0)) revert ZeroAddress();
        if (_issuer[issuer]) revert IssuerAlreadyExists(issuer);
        if (_delisted[issuer]) revert DelistedCannotBeReadmitted(issuer);
        _issuer[issuer] = true;
        emit IssuerAdded(issuer);
    }

    /// @notice Mencabut HAK menerbitkan. Kredensial yang sudah terbit TIDAK ikut cabut dan
    /// tetap terbaca VALID: status kredensial hanya berubah lewat `revoke()` atas
    /// attestation-nya sendiri, yang hanya bisa dipanggil attester asalnya.
    /// Dipisahkan supaya pencabutan izin tidak jadi cara diam-diam membatalkan ribuan
    /// sertifikat milik penerbit yang bermasalah.
    ///
    /// Ini jalur keluar baik-baik: sebuah agen berhenti memakai Lencana, sertifikat alumninya
    /// tetap sah. Untuk agen yang bermasalah, pakai `delistIssuer`.
    function removeIssuer(address issuer) external onlyOwner {
        if (!_issuer[issuer]) revert IssuerNotRegistered(issuer);
        delete _issuer[issuer];
        emit IssuerRemoved(issuer);
    }

    /// @notice Menekan penerbit karena sebab: kehilangan hak menerbitkan DAN kredensial yang
    /// sudah ia terbitkan ikut terbaca sebagai delisted oleh `statusOf`.
    ///
    /// Ini satu-satunya rem yang platform punya atas agen pihak ketiga, dan batas itu harus
    /// diucapkan keras-keras: ia TIDAK mencabut attestation-nya. `revoked` tetap false dan
    /// kolom `revocationTime` di BAS tidak berubah — yang berubah adalah penilaian platform
    /// atas penerbitnya. Halaman verifikasi harus menampilkan keduanya sebagai dua hal
    /// berbeda, bukan menyamarkan delisting menjadi "revoked".
    function delistIssuer(address issuer) external onlyOwner {
        if (!_issuer[issuer]) revert IssuerNotRegistered(issuer);
        delete _issuer[issuer];
        _delisted[issuer] = true;
        emit IssuerDelisted(issuer);
    }

    /// @notice Memulihkan penerbit yang didelisting. Kredensial lamanya langsung terbaca
    /// normal lagi, karena flag-nya hidup di sisi penerbit, bukan disalin ke tiap kredensial.
    function relistIssuer(address issuer) external onlyOwner {
        if (!_delisted[issuer]) revert IssuerNotDelisted(issuer);
        delete _delisted[issuer];
        _issuer[issuer] = true;
        emit IssuerRelisted(issuer);
    }

    function isIssuer(address who) external view returns (bool) {
        return _issuer[who];
    }

    /// @dev Dipakai layar pilih-agen untuk menampilkan status admission tiap agen, dan dipakai
    /// halaman verifikasi tanpa harus mengambil satu kredensial lebih dulu.
    function isDelisted(address who) external view returns (bool) {
        return _delisted[who];
    }

    // ------------------------------------------- dipanggil oleh BAS/EAS sah saja

    /// @dev EAS memanggil ini sebelum menerima attestation. Revert = ditolak seluruhnya.
    function onAttest(Attestation calldata attestation, uint256) internal override returns (bool) {
        if (!_issuer[attestation.attester]) revert NotAnIssuer(attestation.attester);

        (bytes32 credentialHash,, bytes32 lessonId) = _decode(attestation.data);

        // Satu kredensial = satu attestation. Tidak bisa diduplikasi, dan tidak bisa
        // diterbitkan ulang dengan recipient berbeda sebagai "salinan sah".
        if (attestationOf[credentialHash] != EMPTY_UID) revert AlreadyIssued(credentialHash);

        bytes32 prereq = _validatePrerequisite(attestation);

        attestationOf[credentialHash] = attestation.uid;
        prerequisiteOf[attestation.uid] = prereq;
        lessonOf[attestation.uid] = lessonId;
        issuedHere[attestation.uid] = true;
        _credentialsOf[attestation.recipient].push(credentialHash);

        emit CredentialIssued(credentialHash, attestation.uid, attestation.recipient, prereq, lessonId);
        return true;
    }

    /// @dev EAS sudah memastikan hanya penerbit asal yang boleh mencabut
    /// (`attestation.attester != revoker -> AccessDenied`) dan menolak pencabutan ulang
    /// (`revocationTime != 0 -> AlreadyRevoked`). Yang ditambahkan di sini hanya jejak
    /// event supaya halaman verifikasi tidak perlu menelusuri log attestation.
    function onRevoke(Attestation calldata attestation, uint256) internal override returns (bool) {
        (bytes32 credentialHash,,) = _decode(attestation.data);
        emit CredentialRevoked(credentialHash, attestation.uid, attestation.attester);
        return true;
    }

    // ------------------------------------------------------------ pembacaan

    /// @notice Satu `eth_call` untuk verifier: status lengkap sebuah kredensial, tanpa
    /// wallet dan TANPA indexer. Ini penting: deployment BAS hanya menyediakan Indexer
    /// untuk opBNB, bukan untuk BSC — jadi verifikasi tidak boleh bergantung padanya.
    ///
    /// `revoked` dan `issuerDelisted` adalah DUA hal berbeda dan tidak boleh digabung di UI:
    /// `revoked` berasal dari attester-nya sendiri dan permanen; `issuerDelisted` adalah
    /// penilaian platform atas penerbitnya dan bisa dipulihkan.
    function statusOf(bytes32 credentialHash)
        external
        view
        returns (
            bool exists,
            bool revoked,
            bool expired,
            bool issuerDelisted,
            address issuer,
            uint64 issuedAt,
            uint64 expiresAt
        )
    {
        bytes32 uid = attestationOf[credentialHash];
        if (uid == EMPTY_UID || !issuedHere[uid]) {
            return (false, false, false, false, address(0), 0, 0);
        }

        Attestation memory a = _eas.getAttestation(uid);
        return (
            true,
            a.revocationTime != 0,
            a.expirationTime != NO_EXPIRATION_TIME && block.timestamp > a.expirationTime,
            _delisted[a.attester],
            a.attester,
            a.time,
            a.expirationTime
        );
    }

    /// @notice Alamat peserta pemilik kredensial. Dipakai SoulboundCert supaya artefak
    /// tidak bisa di-mint untuk orang lain, dan dipakai halaman verifikasi untuk
    /// menunjukkan alamat yang terikat — bukan nama orangnya.
    function holderOf(bytes32 credentialHash) external view returns (address) {
        bytes32 uid = attestationOf[credentialHash];
        if (uid == EMPTY_UID || !issuedHere[uid]) return address(0);
        return _eas.getAttestation(uid).recipient;
    }

    /// @notice Semua credentialHash milik satu alamat, urut penerbitan.
    /// @dev Ada karena BAS tidak punya Indexer untuk BSC, jadi "daftar sertifikat saya" tidak
    /// bisa dibangun dari log. ⚠️ Tidak berpaginasi: alamat dengan sangat banyak kredensial bisa
    /// membuat view ini mahal bagi node RPC — backend tetap harus membatasi.
    function credentialsOf(address holder) external view returns (bytes32[] memory) {
        return _credentialsOf[holder];
    }

    function credentialCount(address holder) external view returns (uint256) {
        return _credentialsOf[holder].length;
    }

    // --------------------------------------------------------------- internal

    /// @dev 96 byte = tiga word (credentialHash, courseId, lessonId). Panjangnya diperiksa
    /// eksplisit: kalau schema berubah di masa depan, kegagalan harus keras dan terbaca,
    /// bukan decode senyap yang menggeser semua field.
    function _decode(bytes calldata data)
        internal
        pure
        returns (bytes32 credentialHash, bytes32 courseId, bytes32 lessonId)
    {
        if (data.length != 96) revert BadDataLength();
        (credentialHash, courseId, lessonId) = abi.decode(data, (bytes32, bytes32, bytes32));
    }

    /// @dev Inti inovasi #1. Mengembalikan UID prasyarat (EMPTY_UID bila tidak ada).
    function _validatePrerequisite(Attestation calldata attestation) internal view returns (bytes32) {
        bytes32 prereq = attestation.refUID;
        if (prereq == EMPTY_UID) return EMPTY_UID;

        // Keberadaannya sudah dijamin EAS (NotFound). Yang TIDAK dijamin EAS: apakah itu
        // kredensial yang kami akui, apakah masih hidup, dan apakah milik orang yang sama.
        if (!issuedHere[prereq]) revert PrerequisiteNotOurs(prereq);

        Attestation memory base = _eas.getAttestation(prereq);

        if (base.revocationTime != 0) revert PrerequisiteRevoked(prereq);
        if (base.expirationTime != NO_EXPIRATION_TIME && block.timestamp > base.expirationTime) {
            revert PrerequisiteExpired(prereq);
        }
        if (base.recipient != attestation.recipient) revert PrerequisiteWrongHolder(prereq);

        // Yang ini bukan celah EAS melainkan konsekuensi model kepemilikan kita: penerbitnya
        // agen pihak ketiga, dan platform tidak bisa mencabut attestation mereka. Jadi
        // satu-satunya cara menghentikan pengaruh agen bermasalah adalah menolak kredensialnya
        // dipakai sebagai dasar. Urutannya disengaja terakhir: penolakan yang lebih spesifik
        // (dicabut / kedaluwarsa / salah pemegang) harus menang dulu.
        if (_delisted[base.attester]) revert PrerequisiteIssuerDelisted(prereq);

        return prereq;
    }
}
