// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { CourseDeposit } from "../contracts/CourseDeposit.sol";

/// @title Deploy `CourseDeposit` saja (B90) — tidak menyentuh resolver, BAS, split, atau artefak.
///
/// Token dan penerbit dibaca dari `.env` (`DEMO_TOKEN_ADDRESS`, `ISSUER_ADDRESS`), bukan diketik:
/// alamat yang diketik ulang adalah kelas kesalahan yang sudah pernah kita bayar (B49).
/// Sesudah ini `DEPOSIT_ADDRESS` diisi ke `.env`, dan `npm run verify:deposit` membaca
/// `token()` / `issuer()` / `owner()` balik dari chain — log "SUCCESSFUL" bukan bukti.
// Lencana-B90 status=SELESAI 2026-09-30 — skrip deploy CourseDeposit; sudah dijalankan sekali di chain 97 (0xbeB57bC1a3Ad050b66Ad6ce1E2e42a6cd040E6c3) — menjalankannya lagi membuat kontrak KEDUA dan memecah alamat. Buktikan ulang: npm run verify:deposit (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
contract DeployCourseDeposit is Script {
    function run() external {
        require(block.chainid == 97, "hanya untuk BSC testnet (97)");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address token = vm.envAddress("DEMO_TOKEN_ADDRESS");
        address issuer = vm.envAddress("ISSUER_ADDRESS");
        require(token.code.length > 0, "DEMO_TOKEN_ADDRESS bukan kontrak di chain ini");

        vm.startBroadcast(pk);
        CourseDeposit dep = new CourseDeposit(IERC20(token), issuer);
        vm.stopBroadcast();

        // Dibaca BALIK dari kontrak, bukan dari variabel lokal skrip ini.
        console2.log("CourseDeposit:", address(dep));
        console2.log("  token  :", address(dep.token()));
        console2.log("  issuer :", dep.issuer());
        console2.log("  owner  :", dep.owner());
        require(address(dep.token()) == token && dep.issuer() == issuer, "konstruktor tidak menyimpan yang dikirim");
    }
}
