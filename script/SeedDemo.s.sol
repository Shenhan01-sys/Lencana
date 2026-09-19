// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { CredentialResolver } from "../contracts/CredentialResolver.sol";
import { SoulboundCert } from "../contracts/SoulboundCert.sol";
import { IEAS, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData } from "../lib/bas/src/IEAS.sol";
import { EMPTY_UID } from "../lib/bas/src/Common.sol";

/// @title Data demo yang bisa dibuat ulang dalam satu perintah.
///
/// Dua alasan skrip ini ada:
/// 1. Halaman verifikasi hanya bermakna kalau ada kredensial nyata untuk diperiksa, dan
///    testnet bisa di-reset. Semua angka demo harus bisa dibangkitkan ulang persis sama.
/// 2. Ia menjadi bukti ujung-ke-ujung bahwa `CredentialResolver` dan `SoulboundCert` benar-benar
///    bisa dipakai, bukan hanya lulus di lingkungan test Foundry.
///
/// Yang dibangun: satu peserta lulus kursus dasar -> dapat artefak; kursus lanjutan
/// diterbitkan dengan prasyarat itu; lalu dasarnya DICABUT, supaya dua hal bisa didemokan
/// sekaligus: status yang berubah permanen, dan rantai di atasnya yang tertutup untuk
/// penerbitan baru.
///
/// Pemakaian (anvil fork chain 97 lokal):
///   forge script script/SeedDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast -vv
contract SeedDemo is Script {
    address constant BAS_97 = 0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD;
    address constant BAS_56 = 0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC;

    CredentialResolver internal resolver;
    SoulboundCert internal certs;
    IEAS internal bas;
    address internal issuer;
    bytes32 internal schemaId;

    function run() external {
        // SchemaResolver EAS adalah `payable`, jadi cast harus lewat payable(...) dulu.
        resolver = CredentialResolver(payable(vm.envAddress("RESOLVER_ADDRESS")));
        certs = SoulboundCert(vm.envAddress("CERT_ADDRESS"));
        uint256 issuerPk = vm.envUint("ISSUER_PRIVATE_KEY");
        issuer = vm.addr(issuerPk);

        address basCore = block.chainid == 97 ? BAS_97 : block.chainid == 56 ? BAS_56 : address(0);
        require(basCore != address(0), "chain ini tidak punya deployment BAS yang terverifikasi");
        bas = IEAS(payable(basCore));
        schemaId = resolver.schemaUID();

        // Pemilik resolver = yang menyiarkan perubahan whitelist. Dipisah dari kunci penerbit
        // supaya jelas bahwa "mengizinkan penerbit" dan "menjadi penerbit" dua hal berbeda.
        uint256 ownerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(ownerPk);
        require(resolver.owner() == owner, "DEPLOYER_PRIVATE_KEY bukan pemilik resolver ini");

        console2.log("==================================================");
        console2.log("Seed data demo");
        console2.log("  chainid  :", block.chainid);
        console2.log("  resolver :", address(resolver));
        console2.log("  certs    :", address(certs));
        console2.log("  issuer   :", issuer);
        console2.log("  schemaId :");
        console2.logBytes32(schemaId);

        vm.startBroadcast(ownerPk);
        if (!resolver.isIssuer(issuer)) resolver.addIssuer(issuer);
        vm.stopBroadcast();

        address learner = address(uint160(uint256(keccak256("peserta-demo-1"))));
        address second = address(uint160(uint256(keccak256("peserta-demo-2-tidak-tercabut"))));

        bytes32 courseBase = keccak256("web3-dasar-2026");
        bytes32 courseAdv = keccak256("web3-lanjut-2026");
        bytes32 courseOther = keccak256("web3-dasar-2026-b");

        uint64 expires = uint64(block.timestamp + 365 days);

        vm.startBroadcast(issuerPk);

        // 1. kursus dasar untuk peserta utama, plus artefaknya.
        (bytes32 baseHash, bytes32 baseUid) = _attest(learner, courseBase, EMPTY_UID, expires);
        _mintIfAbsent(learner, baseHash, "ipfs://demo/vc/web3-dasar.json");

        // 2. kursus lanjutan yang MENUMPANG dasarnya — rantai sah saat terbit.
        (bytes32 advHash, bytes32 advUid) = _attest(learner, courseAdv, baseUid, expires);
        _mintIfAbsent(learner, advHash, "ipfs://demo/vc/web3-lanjut.json");

        // 3. peserta kedua, tidak tersambung ke apa pun: kontrol bahwa pencabutan di bawah
        //    tidak menular ke kredensial yang tidak berhubungan.
        (bytes32 otherHash, bytes32 otherUid) = _attest(second, courseOther, EMPTY_UID, expires);
        _mintIfAbsent(second, otherHash, "ipfs://demo/vc/web3-dasar-b.json");

        // 4. DASARNYA DICABUT. Efek yang harus terlihat di halaman:
        //    base -> DICABUT, adv -> tetap ACTIVE tapi rantainya menunjuk yang dicabut,
        //    dan penerbitan baru di atas base tidak bisa lagi (dibuktikan di test fork).
        _revokeIfLive(baseUid);

        vm.stopBroadcast();

        console2.log("--------------------------------------------------");
        console2.log("HASIL - tempel nilai ini ke halaman verifikasi");
        console2.log("  [1] DICABUT  peserta demo");
        console2.log("      hash     :");
        console2.logBytes32(baseHash);
        console2.log("      uid      :");
        console2.logBytes32(baseUid);
        console2.log("      tokenId  :", uint256(baseHash));
        console2.log("      learner  :", learner);
        console2.log("  [2] AKTIF, menumpang yang dicabut");
        console2.log("      hash     :");
        console2.logBytes32(advHash);
        console2.log("      uid      :");
        console2.logBytes32(advUid);
        console2.log("      prasyarat:");
        console2.logBytes32(resolver.prerequisiteOf(advUid));
        console2.log("  [3] AKTIF, tidak berhubungan");
        console2.log("      hash     :");
        console2.logBytes32(otherHash);
        console2.log("      uid      :");
        console2.logBytes32(otherUid);
        console2.log("      learner  :", second);
        console2.log("--------------------------------------------------");
        console2.log("Bukti rantai: [2] masih berlaku, tapi dasarnya [1] sudah dicabut.");
        console2.log("Sertifikat SETELAH ini tidak bisa diterbitkan di atas [1] lagi - itu");
        console2.log("yang membedakan kita dari EAS mentah (lihat app/README.md).");
    }

    function _vcHash(address who, bytes32 courseId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("vc:", who, courseId));
    }

    /// @dev Idempoten SENGAJA. `forge script --slow` menjalankan ulang berkas ini untuk
    /// tiap transaksi, jadi panggilan kedua akan menemukan kredensial yang sudah terbit.
    /// Guard `AlreadyIssued` di CredentialResolver (fitur anti-duplikasi kita) akan
    /// menolaknya — bukan karena ada yang salah, tapi karena skripnya yang tidak boleh
    /// mengulang. Ini baru ketahuan saat probe halaman verifikasi dijalankan.
    function _attest(address who, bytes32 courseId, bytes32 prereq, uint64 expires)
        internal
        returns (bytes32, bytes32)
    {
        bytes32 credentialHash = _vcHash(who, courseId);
        bytes32 existing = resolver.attestationOf(credentialHash);
        if (existing != EMPTY_UID) {
            console2.log("  sudah terbit, dilewati");
            return (credentialHash, existing);
        }

        AttestationRequestData memory d = AttestationRequestData({
            recipient: who,
            expirationTime: expires,
            revocable: true,
            refUID: prereq,
            // Schema 3 field (D28.1): credentialHash, courseId, lessonId.
            // Skrip ini masih menabur level KURSUS saja (lessonId = EMPTY_UID); data demo
            // berantai lesson menyusul bersama backend-nya.
            data: abi.encode(credentialHash, courseId, EMPTY_UID),
            value: 0
        });
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
        return (credentialHash, resolver.attestationOf(credentialHash));
    }

    function _mintIfAbsent(address to, bytes32 credentialHash, string memory uri) internal {
        if (certs.tokenOfCredential(credentialHash) != 0) return;
        certs.mint(to, credentialHash, uri);
    }

    /// @dev Pencabutan juga idempoten — dan ini memang tidak bisa dibatalkan, jadi
    /// satu-satunya keadaan yang boleh dilewati adalah "sudah tercabut".
    function _revokeIfLive(bytes32 uid) internal {
        if (bas.getAttestation(uid).revocationTime != 0) return;
        bas.revoke(RevocationRequest({ schema: schemaId, data: RevocationRequestData({ uid: uid, value: 0 }) }));
    }
}
