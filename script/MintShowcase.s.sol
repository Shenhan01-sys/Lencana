// SPDX-License-Identifier: MIT

/// [B54] SELESAI 2026-09-29 — Riwayat angkanya sengaja dibiarkan terbaca, karena "tidak pernah ada kertas yang menganggur" adalah kalimat yang tidak boleh kita ucapkan. Ini bukan kosmetik: klaim ter Buktikan ulang: npm run verify:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B54 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { SoulboundCert } from "../contracts/SoulboundCert.sol";

/// @title Mengikat beberapa artefak showcase dalam SATU panggilan `mintBatch` pada lapis yang patuh.
///
/// Dua hal yang dibuktikan skrip ini, dan keduanya bukan hiasan:
///  1. D43 — bahwa jalur batch sungguh ada dan ditegakkan di instance yang HIDUP di chain 97, bukan
///     hanya di fork test; satu transaksi untuk beberapa artefak adalah angka yang kita kutip
///     (hemat 38.171 gas untuk batch 4, terukur di `test_GasBatchVersusSatuPerSatu`);
///  2. bahwa kertas yang ditandatangani di host tetap punya artefak yang menunjuk host yang sama —
///     yaitu hal yang sedang kita jual: validity yang bisa dibuka orang lain besok.
///
/// Datanya TIDAK diketik di berkas ini dan TIDAK dipilih oleh skrip ini. Pemanggil (
/// `scripts/mint-showcase.ps1`) menyusun MINT_HASHES / MINT_LEARNERS / MINT_URIS dari buku besar
/// validator (baris yang outcome-nya VALID di bawah host tepi) dan dari store — dan kalau ketiga
/// daftar itu tidak sama panjangnya, kami berhenti, bukan mengirim batch yang satu itemnya salah
/// pasangan. `mintBatch` semua-atau-batal justru supaya tidak ada keadaan setengah (D43).
contract MintShowcase is Script {
    function run() external {
        require(block.chainid == 97, "hanya untuk BSC testnet (97); lihat vault sebelum mainnet");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.addr(pk);
        SoulboundCert cert = SoulboundCert(vm.envAddress("LIVE_CERT_ADDRESS"));
        // Salah alamat adalah kegagalan yang paling mahal di sini: artefak yang terikat ke kontrak
        // lain tidak bisa dipindah, dan alamat itu akan dikutip halaman verifier.
        require(cert.owner() == owner, "LIVE_CERT_ADDRESS bukan lapis milik kunci ini");

        string[] memory hashes = vm.split(vm.envString("MINT_HASHES"), ",");
        string[] memory learners = vm.split(vm.envString("MINT_LEARNERS"), ",");
        string[] memory uris = vm.split(vm.envString("MINT_URIS"), ",");
        require(hashes.length == learners.length && learners.length == uris.length, "daftar tidak sama panjang");
        require(hashes.length > 0, "tidak ada yang mau diikat");

        // Yang sudah terikat disaring keluar: idempoten. Menjalankan ini ulang tidak boleh
        // menghasilkan AlreadyBound yang membatalkan seluruh batch.
        uint256 eligible = 0;
        for (uint256 i = 0; i < hashes.length; i++) {
            bytes32 h = vm.parseBytes32(hashes[i]);
            if (cert.tokenOfCredential(h) == 0) {
                eligible++;
            } else {
                console2.log("  sudah terikat, dilewati:", hashes[i]);
            }
        }
        require(eligible > 0, "semuanya sudah terikat - tidak ada yang dikerjakan");

        bytes32[] memory sendHashes = new bytes32[](eligible);
        address[] memory sendLearners = new address[](eligible);
        string[] memory sendUris = new string[](eligible);
        uint256 k = 0;
        for (uint256 i = 0; i < hashes.length; i++) {
            bytes32 h = vm.parseBytes32(hashes[i]);
            if (cert.tokenOfCredential(h) != 0) continue;
            sendHashes[k] = h;
            sendLearners[k] = vm.parseAddress(learners[i]);
            sendUris[k] = uris[i];
            k++;
        }

        console2.log("==================================================");
        console2.log("mintBatch showcase ke", address(cert));
        console2.log("  artefak baru:", eligible);
        console2.log("  peserta     :", sendLearners[0]);

        vm.startBroadcast(pk);
        uint256[] memory ids = cert.mintBatch(sendLearners, sendHashes, sendUris);
        vm.stopBroadcast();

        console2.log("  satu transaksi untuk", ids.length, "artefak (D43 di lapis yang hidup)");
        for (uint256 i = 0; i < ids.length; i++) {
            // Dibaca kembali dari state on-chain, bukan dari memori proses ini — yang bisa
            // diperiksa orang lain hanyalah apa yang ada di chain.
            require(cert.ownerOf(ids[i]) == sendLearners[i], "artefak tidak jatuh ke peserta");
            require(cert.tokenOfCredential(sendHashes[i]) == ids[i], "ikatan hash -> token tidak cocok");
            console2.log("  tokenURI:", cert.tokenURI(ids[i]));
        }
    }
}
