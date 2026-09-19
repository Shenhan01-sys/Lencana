// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { CredentialResolver } from "../contracts/CredentialResolver.sol";
import { SoulboundCert } from "../contracts/SoulboundCert.sol";
import { IEAS, AttestationRequest, AttestationRequestData, RevocationRequest, RevocationRequestData } from "../lib/bas/src/IEAS.sol";
import { EMPTY_UID } from "../lib/bas/src/Common.sol";

/// @title Data demo yang bisa dibuat ulang dengan satu perintah, dua kali.
///
/// Dua alasan skrip ini ada:
/// 1. Halaman verifikasi hanya bermakna kalau ada kredensial nyata untuk diperiksa, dan
///    testnet bisa di-reset. Semua angka demo harus bisa dibangkitkan ulang persis sama.
/// 2. Ia menjadi bukti ujung-ke-ujung bahwa `CredentialResolver` dan `SoulboundCert` benar-benar
///    bisa dipakai, bukan hanya lulus di lingkungan test Foundry.
///
/// Empat keadaan yang harus tampil berbeda di halaman yang sama:
///   [1] dasar        -> DICABUT
///   [2] lanjutan     -> AKTIF, tapi rantainya menunjuk [1] yang sudah dicabut
///   [3] tak terkait  -> AKTIF (bukti bahwa pencabutan tidak menular)
///   [4] agen dijemput-> ISSUER_DELISTED: artefak tetap di tangan peserta, attestation tetap
///       utuh di BAS, yang berubah hanya penilaian platform atas penerbitnya (D30)
///
/// == KENAPA SKRIP INI BUTUH DUA KALI JALAN (DAN BUKAN KELALAAN) ==
/// UID sebuah attestation EAS =
///   keccak256(schema, recipient, attester, TIME, expirationTime, revocable, refUID, data, bump)
/// dan `TIME` adalah `block.timestamp` transaksi ASLINYA. `forge script` menjalankan badan
/// skrip di EVM simulasi yang memakai perkiraan timestamp, jadi selama sebuah kredensial BARU
/// terbit di proses yang sama, uid yang terlihat di dalam proses itu hanyalah tebakan yang
/// boleh salah. Dua langkah tidak boleh memakai tebakan:
///   - `revoke(uid)`                -> uid salah = AttestationNotFound, revert di chain;
///   - `attest(refUID: uid)` [2]    -> uid salah = InvalidUID, [2] gagal terbit.
/// Karena itu adegan yang bergantung uid hanya dijalankan kalau [1] SUDAH ada di chain SEBELUM
/// proses ini — yaitu pada panggilan kedua, yang tidak menerbitkan apa pun lagi sehingga
/// semua bacaannya asli. Skripnya idempoten dan konvergen: pass pertama menabur, pass kedua
/// menyambung + mencabut + melaporkan, pass ketiga dan seterusnya tidak mengubah apa pun.
///
/// Pemakaian:
///   forge script script/SeedDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast -vv
///   forge script script/SeedDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast -vv
contract SeedDemo is Script {
    address constant BAS_97 = 0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD;
    address constant BAS_56 = 0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC;

    CredentialResolver internal resolver;
    SoulboundCert internal certs;
    IEAS internal bas;
    address internal issuer;
    address internal issuerB;
    bytes32 internal schemaId;

    // Peserta dan kursus adalah konstanta: hash kredensialnya jadi deterministik lintas
    // panggilan DAN lintas chain, yang precisely mengapa halaman demo bisa di-bookmark.
    address internal constant LEARNER = address(uint160(uint256(keccak256("peserta-demo-1"))));
    address internal constant SECOND = address(uint160(uint256(keccak256("peserta-demo-2-tidak-tercabut"))));
    address internal constant DR_LEARNER = address(uint160(uint256(keccak256("peserta-demo-3-agen-dilisting"))));
    bytes32 internal constant COURSE_BASE = keccak256("web3-dasar-2026");
    bytes32 internal constant COURSE_ADV = keccak256("web3-lanjut-2026");
    bytes32 internal constant COURSE_OTHER = keccak256("web3-dasar-2026-b");
    bytes32 internal constant COURSE_DR = keccak256("web3-dasar-2026-c");

    bytes32 internal baseHash;
    bytes32 internal advHash;
    bytes32 internal otherHash;
    bytes32 internal drHash;
    // Status "sudah ada sebelum proses ini" — satu-satunya dasar yang sah untuk memakai UID.
    bool internal baseWasLive;
    bool internal advWasLive;

    function run() external {
        // SchemaResolver EAS adalah `payable`, jadi cast harus lewat payable(...) dulu.
        resolver = CredentialResolver(payable(vm.envAddress("RESOLVER_ADDRESS")));
        certs = SoulboundCert(vm.envAddress("CERT_ADDRESS"));
        uint256 issuerPk = vm.envUint("ISSUER_PRIVATE_KEY");
        issuer = vm.addr(issuerPk);
        // Agen penerbit kedua = pihak ketiga LAIN yang tidak bermasalah. Dibutuhkan supaya
        // adegan delisting tidak merusak tiga kredensial pertama: yang dijatuhkan hanya agen
        // ini, dan itu justru keadaan yang ingin ditunjukkan ke juri.
        uint256 issuerBPk = vm.envUint("ISSUER_B_PRIVATE_KEY");
        issuerB = vm.addr(issuerBPk);

        address basCore = block.chainid == 97 ? BAS_97 : block.chainid == 56 ? BAS_56 : address(0);
        require(basCore != address(0), "chain ini tidak punya deployment BAS yang terverifikasi");
        bas = IEAS(payable(basCore));
        schemaId = resolver.schemaUID();

        // Pemilik resolver = yang menyiarkan perubahan whitelist. Dipisah dari kunci penerbit
        // supaya jelas bahwa "mengizinkan penerbit" dan "menjadi penerbit" dua hal berbeda.
        uint256 ownerPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        require(resolver.owner() == vm.addr(ownerPk), "DEPLOYER_PRIVATE_KEY bukan pemilik resolver ini");

        baseHash = _vcHash(LEARNER, COURSE_BASE);
        advHash = _vcHash(LEARNER, COURSE_ADV);
        otherHash = _vcHash(SECOND, COURSE_OTHER);
        drHash = _vcHash(DR_LEARNER, COURSE_DR);

        // Dibaca SEBELUM transaksi apa pun di proses ini, supaya nilainya tidak pernah
        // tercampur perkiraan simulasi.
        baseWasLive = resolver.attestationOf(baseHash) != EMPTY_UID;
        advWasLive = resolver.attestationOf(advHash) != EMPTY_UID;

        console2.log("==================================================");
        console2.log("Seed data demo");
        console2.log("  chainid  :", block.chainid);
        console2.log("  resolver :", address(resolver));
        console2.log("  certs    :", address(certs));
        console2.log("  issuer   :", issuer);
        console2.log("  issuer B :", issuerB);
        console2.log("  pass     :", baseWasLive ? "2+ (menyambung + mencabut + melapor)" : "1 (menabur; langkah ber-uid ditunda)");
        console2.log("  schemaId :");
        console2.logBytes32(schemaId);

        _admitOwnerOfPlatform(ownerPk);
        _issueBasics(issuerPk);
        _mintArtifacts(ownerPk);
        _sceneDelisting(ownerPk, issuerBPk);
        _issueChainedAndRevoke(issuerPk, ownerPk);

        _check();
        _report();
    }

    /// @dev Yang mengizinkan penerbit adalah lapis platform, bukan penerbitnya sendiri.
    function _admitOwnerOfPlatform(uint256 ownerPk) internal {
        vm.startBroadcast(ownerPk);
        if (!resolver.isIssuer(issuer)) resolver.addIssuer(issuer);
        vm.stopBroadcast();
    }

    /// @dev [1] dan [3]: tidak menyandarkan apa pun pada uid, jadi keduanya sah di pass berapa pun.
    function _issueBasics(uint256 issuerPk) internal {
        vm.startBroadcast(issuerPk);
        // 1. kursus dasar untuk peserta utama.
        _issue(LEARNER, COURSE_BASE, EMPTY_UID);
        // 3. peserta tak terkait: kontrol bahwa pencabutan dan delisting di bawah tidak
        //    menular ke kredensial yang tidak berhubungan.
        _issue(SECOND, COURSE_OTHER, EMPTY_UID);
        vm.stopBroadcast();
    }

    /// @dev Artefak SELALU dicetak kunci platform, bukan kunci agennya: `mint()` hanya
    ///   mengakui satu owner, sedangkan penerbitnya banyak dan bukan milik kami (D30).
    ///   Kalau suatu saat tiap agen harus mencetak sendiri, yang harus berubah adalah
    ///   SoulboundCert (daftar minter), bukan cerita ini.
    function _mintArtifacts(uint256 ownerPk) internal {
        vm.startBroadcast(ownerPk);
        _mintIfAbsent(LEARNER, baseHash, "ipfs://demo/vc/web3-dasar.json");
        _mintIfAbsent(SECOND, otherHash, "ipfs://demo/vc/web3-dasar-b.json");
        vm.stopBroadcast();
    }

    /// @dev Adegan keempat (D30). Blok broadcast TERPISAH bukan gaya bertele-tele: yang
    ///   mengizinkan, yang menerbitkan, dan yang menjatuhkan adalah tiga pihak berbeda.
    ///   Platform tidak pernah menjadi penerbit di skrip ini.
    function _sceneDelisting(uint256 ownerPk, uint256 issuerBPk) internal {
        vm.startBroadcast(ownerPk);
        // Guard isDelisted wajib: addIssuer sengaja menolak membaca ulang agen yang sudah
        // dijatuhkan (DelistedCannotBeReadmitted), jadi jalankan ulang skrip ini tanpa guard
        // akan revert — dan gejalanya kelihatan seperti bug kontrak, padahal skripnya.
        if (!resolver.isIssuer(issuerB) && !resolver.isDelisted(issuerB)) resolver.addIssuer(issuerB);
        vm.stopBroadcast();

        // Yang menandatangani klaim = agen itu sendiri, di depan publik, tanpa kami
        // menyentuh kunci atau menyalami alamatnya sebagai penerbit.
        vm.startBroadcast(issuerBPk);
        _issue(DR_LEARNER, COURSE_DR, EMPTY_UID);
        vm.stopBroadcast();

        vm.startBroadcast(ownerPk);
        // Artefaknya SENGAJA dicetak SEBELUM delisting, supaya keadaan yang tampil di
        // halaman adalah yang paling jujur dan paling jarang: NFT-nya masih di tangan
        // peserta, attestation-nya masih utuh di BAS, dan yang berubah hanyalah penilaian
        // platform atas penerbitnya. Setelah delisting, mint ditolak `IssuerDelisted` —
        // itu juga bagian dari cerita, tapi bukan yang mau ditunjukkan di sini.
        _mintIfAbsent(DR_LEARNER, drHash, "ipfs://demo/vc/web3-dasar-c.json");
        if (resolver.isIssuer(issuerB)) resolver.delistIssuer(issuerB);
        vm.stopBroadcast();
    }

    /// @dev [2] + pencabutan [1]: keduanya butuh uid [1] yang ASLI, jadi hanya jalan di
    ///   pass kedua dst. Lihat kepala berkas.
    function _issueChainedAndRevoke(uint256 issuerPk, uint256 ownerPk) internal {
        if (!baseWasLive) return;
        bytes32 baseUid = resolver.attestationOf(baseHash);
        vm.startBroadcast(issuerPk);
        // 2. kursus lanjutan yang MENUMPANG dasarnya — rantai sah saat terbit.
        _issue(LEARNER, COURSE_ADV, baseUid);
        vm.stopBroadcast();

        _mintOne(ownerPk, LEARNER, advHash, "ipfs://demo/vc/web3-lanjut.json");

        vm.startBroadcast(issuerPk);
        // DASARNYA DICABUT, setelah [2] terbit: urutannya penting. [2] harus terbukti
        // diterbitkan secara sah di atas dasar yang masih hidup, baru dasarnya mati —
        // keadaan yang tidak bisa ditiru ledger biasa.
        _revokeIfLive(baseUid);
        vm.stopBroadcast();
    }

    function _mintOne(uint256 pk, address to, bytes32 credentialHash, string memory uri) internal {
        vm.startBroadcast(pk);
        _mintIfAbsent(to, credentialHash, uri);
        vm.stopBroadcast();
    }

    /// @dev Baca ulang dari chain, bukan dari memori skrip. Kalau ada satu yang meleset,
    ///   skripnya yang berhenti di sini, bukan laporannya yang diam-diam berdusta.
    function _check() internal view {
        (, bool baseRevoked,, bool baseDelisted,,,) = resolver.statusOf(baseHash);
        (, bool advRevoked,, bool advDelisted,,,) = resolver.statusOf(advHash);
        (, bool otherRevoked,, bool otherDelisted,,,) = resolver.statusOf(otherHash);
        (bool drExists, bool drRevoked, bool drExpired, bool drDelisted, address drIssuer,,) =
            resolver.statusOf(drHash);

        // Delisting harus per-agen: kalau menjatuhkan satu agen lalu [1][2][3] ikut merah,
        // yang terbukti hanyalah sensor massal, bukan rem yang terarah.
        require(!baseDelisted && !advDelisted && !otherDelisted, "[1][2][3] ikut dilisting - delisting harusnya per-agen");
        require(drExists && !drRevoked && !drExpired && drDelisted, "[4] seharusnya ISSUER_DELISTED tanpa pencabutan");
        require(drIssuer == issuerB, "[4] penerbitnya bukan agen kedua");
        require(resolver.isDelisted(issuerB), "[4] resolver tidak menandai agen kedua delisted");
        require(!resolver.isDelisted(issuer), "[4] agen pertama ikut jatuh - delisting harusnya per-agen");
        require(certs.tokenOfCredential(drHash) != 0, "[4] artefak [4] tidak tercetak - adegan ini tidak membuktikan apa pun");
        require(!baseRevoked || baseWasLive, "[1] terbit pass ini tapi sudah terbaca dicabut");

        if (baseWasLive) {
            require(baseRevoked, "[1] seharusnya sudah DICABUT pada pass kedua");
            (bool advExists,,,, address advIssuer,,) = resolver.statusOf(advHash);
            require(advExists && !advRevoked && !advDelisted, "[2] seharusnya AKTIF - rantainya yang menunjuk yang dicabut");
            require(advIssuer == issuer, "[2] penerbitnya bukan agen pertama");
            require(!otherRevoked && !otherDelisted, "[3] seharusnya tidak tersentuh apa pun");
            // Pemeriksaan ini mengambil argumen UID, jadi hanya sah kalau uid [2] sendiri
            // berasal dari chain, bukan dari pass yang sedang berjalan.
            if (advWasLive) {
                require(resolver.prerequisiteOf(resolver.attestationOf(advHash)) == resolver.attestationOf(baseHash),
                    "[2] rantainya tidak menunjuk uid [1] yang asli");
            }
        }
    }

    function _report() internal view {
        console2.log("--------------------------------------------------");
        console2.log("HASIL - yang ditempel ke halaman adalah HASH. uid di bawah boleh jadi");
        console2.log("        perkiraan pass ini; pasti hanya mulai pass ke-2+.");
        _reportOne("[1] DICABUT", baseHash, LEARNER);
        _reportOne("[2] AKTIF, menumpang yang dicabut", advHash, LEARNER);
        _reportOne("[3] AKTIF, tidak berhubungan", otherHash, SECOND);
        _reportOne("[4] ISSUER_DELISTED, penerbitnya agen kedua", drHash, DR_LEARNER);
        console2.log("  penerbit [4] :", issuerB);
        console2.log("  isDelisted B :", resolver.isDelisted(issuerB));
        console2.log("  agen 1 utuh  :", !resolver.isDelisted(issuer));
        console2.log("--------------------------------------------------");
        if (!baseWasLive) {
            console2.log(">>> PASS 1 SELESAI. JALANKAN SKRIP INI SEKALI LAGI <<<");
            console2.log("    Pass kedua menerbitkan [2] di atas uid [1] yang asli,");
            console2.log("    mencabut [1], lalu mencetak laporan yang bisa dipercaya.");
        } else {
            console2.log("Data demo lengkap. Buka halaman verifikasi dan tempel keempat hash");
            console2.log("di atas: satu halaman, empat keputusan berbeda, nol backend kami.");
        }
    }

    function _reportOne(string memory label, bytes32 credentialHash, address holder) internal view {
        console2.log(label);
        console2.log("      hash     :");
        console2.logBytes32(credentialHash);
        console2.log("      holder   :", holder);
        console2.log("      tokenId  :", uint256(credentialHash));
        console2.log("      uid      :");
        console2.logBytes32(resolver.attestationOf(credentialHash));
    }

    function _vcHash(address who, bytes32 courseId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked("vc:", who, courseId));
    }

    /// @dev Idempoten SENGAJA. `forge script --slow` menjalankan ulang badan skrip untuk
    /// tiap transaksi, jadi panggilan kedua akan menemukan kredensial yang sudah terbit.
    /// Guard `AlreadyIssued` di CredentialResolver (fitur anti-duplikasi kita) akan
    /// menolaknya — bukan karena ada yang salah, tapi karena skripnya yang tidak boleh
    /// mengulang. Ini baru ketahuan saat probe halaman verifikasi dijalankan.
    function _issue(address who, bytes32 courseId, bytes32 prereq) internal {
        bytes32 credentialHash = _vcHash(who, courseId);
        if (resolver.attestationOf(credentialHash) != EMPTY_UID) {
            console2.log("  sudah terbit, dilewati");
            return;
        }

        AttestationRequestData memory d = AttestationRequestData({
            recipient: who,
            // +365 hari: expiry harus lewat, tapi tidak boleh sedemikian jauh sampai
            // halaman verifikasi tak pernah bisa menunjukkan keadaan EXPIRED.
            expirationTime: uint64(block.timestamp + 365 days),
            revocable: true,
            refUID: prereq,
            // Schema 3 field (D28.1): credentialHash, courseId, lessonId.
            // Skrip ini masih menabur level KURSUS saja (lessonId = EMPTY_UID); data demo
            // berantai lesson menyusul bersama backend-nya.
            data: abi.encode(credentialHash, courseId, EMPTY_UID),
            value: 0
        });
        bas.attest(AttestationRequest({ schema: schemaId, data: d }));
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
