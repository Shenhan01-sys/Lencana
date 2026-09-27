// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { DemoCourseToken } from "../contracts/DemoCourseToken.sol";

/// @title Menukar token demo saja — tidak menyentuh resolver, BAS, split, atau artefak.
///
/// Dipakai 28 Sep setelah `npm run verify:deploy` menemukan bahwa token yang ter-deploy
/// melaporkan 18 desimal sementara seluruh dokumentasi kami (dan constructor kontraknya
/// sendiri, `1_000_000e6`) mengasumsikan 6. Deploy ulang karena desimal tidak bisa diubah
/// pada kontrak yang sudah ada.
///
/// Setelah ini: `DEMO_TOKEN_ADDRESS` di .env menunjuk ke alamat baru, `npm run x402`
/// membuktikan jalur berbayar tetap menyelesaikan dan membagi, `npm run verify:deploy`
/// membandingkan klaim dengan chain. Yang lama TETAP ada di chain — tidak bisa dihapus, dan
/// settlement 23-24 Sep terjadi di atasnya; itu sebabnya riwayat itu tidak kita tulis ulang.
contract RedeployDemoToken is Script {
    function run() external {
        require(block.chainid == 97, "hanya untuk BSC testnet (97)");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);

        console2.log("==================================================");
        console2.log("Redeploy token demo (6 desimal)");
        console2.log("  chainid :", block.chainid);
        console2.log("  deployer:", deployer);

        vm.startBroadcast(pk);
        DemoCourseToken token = new DemoCourseToken();
        vm.stopBroadcast();

        // Dibaca BALIK dari chain, bukan dari memori proses ini.
        console2.log("  DemoCourseToken:", address(token));
        console2.log("  decimals  :", uint256(token.decimals()));
        console2.log("  symbol    :", token.symbol());
        console2.log("  totalSupply:", token.totalSupply());
        require(token.decimals() == 6, "token baru harus 6 desimal");
    }
}
