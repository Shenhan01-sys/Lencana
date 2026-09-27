// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICredentialRegistry
///
/// Kontrak yang dibutuhkan SoulboundCert untuk membuktikan bahwa artefak yang ia mint
/// benar-benar mewakili kredensial yang hidup. Dibuat interface (bukan kontrak konkret)
/// supaya mekanika soulbound bisa diuji lokal tanpa meniru BAS/EAS, sementara jalur
/// sebenarnya diuji terhadap deployment asli di fork test.
interface ICredentialRegistry {
    /// @notice Status lengkap sebuah kredensial. Urutan return-nya adalah kontrak
    /// verifikasi publik: SATU eth_call menjawab ada / dicabut / kedaluwarsa / penerbitnya
    /// sedang delisted / siapa.
    ///
    /// `revoked` dan `issuerDelisted` TIDAK boleh digabung oleh pemanggil: yang pertama
    /// berasal dari attester dan permanen, yang kedua penilaian platform dan bisa dipulihkan.
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
        );

    /// @notice Alamat peserta yang memegang kredensial ini. Tanpa cek ini, artefak
    /// soulbound bisa di-mint untuk orang yang salah.
    function holderOf(bytes32 credentialHash) external view returns (address);

    /// @notice UID attestation untuk sebuah credentialHash. Dibutuhkan lapis artefak karena
    /// "lesson atau kursus" tercatat pada UID, bukan pada hash-nya.
    function attestationOf(bytes32 credentialHash) external view returns (bytes32 uid);

    /// @notice `bytes32(0)` berarti kredensial level KURSUS; nilai lain adalah lesson yang
    /// diturunkan dari materi kursus. Ini yang membuat keputusan B39 bisa ditegakkan di
    /// kontrak dan bukan di disiplin pemanggilnya.
    function lessonOf(bytes32 uid) external view returns (bytes32 lessonId);
}
