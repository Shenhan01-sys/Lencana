// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { SoulboundCert } from "../contracts/SoulboundCert.sol";
import { ICredentialRegistry } from "../contracts/interfaces/ICredentialRegistry.sol";

/// @title Menukar lapis artefak saja — tanpa menyentuh resolver, BAS, atau kontrak uang.
///
/// Dipakai 27 Sep setelah `tokenURI` diubah menjadi metadata yang dirakit on-chain (B38).
/// Resolver tidak kita sentuh: alamatnyalah yang dikutip field "smart contract" di formulir
/// submission dan alamatnyalah yang dibaca halaman verifier. Mengganti satu lapis sambil
/// membawa sisanya ikut berarti alamat yang dikutip orang jadi salah — jadi lapis ini
/// di-deploy sendiri, dan alamat barunya dicatat di `broadcast/` bersama jejak mint-nya.
///
/// Env: DEPLOYER_PRIVATE_KEY, RESOLVER_ADDRESS (dari .env), lalu opsional
/// CREDENTIAL_HASH + LEARNER_ADDRESS + CREDENTIAL_URI untuk langsung mengikat satu artefak.
contract DeployCertOnly is Script {
    function run() external {
        require(block.chainid == 97, "hanya untuk BSC testnet (97); lihat vault sebelum ke mainnet");

        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        ICredentialRegistry registry = ICredentialRegistry(vm.envAddress("RESOLVER_ADDRESS"));

        string memory name_ = vm.envOr("CERT_NAME", string("Lencana"));
        string memory symbol_ = vm.envOr("CERT_SYMBOL", string("LNC"));

        console2.log("==================================================");
        console2.log("Deploy lapis artefak (metadata hidup)");
        console2.log("  chainid  :", block.chainid);
        console2.log("  resolver :", address(registry));
        console2.log("  deployer :", deployer);

        vm.startBroadcast(pk);
        SoulboundCert cert = new SoulboundCert(registry, name_, symbol_, deployer);
        console2.log("  SoulboundCert:", address(cert));

        bytes32 hash = vm.envOr("CREDENTIAL_HASH", bytes32(0));
        if (hash != bytes32(0)) {
            address learner = vm.envAddress("LEARNER_ADDRESS");
            string memory uri = vm.envString("CREDENTIAL_URI");
            uint256 tokenId = cert.mint(learner, hash, uri);
            require(cert.ownerOf(tokenId) == learner, "artefak tidak jatuh ke peserta");
            // Dicetak dari CHAIN, bukan dari memori proses ini: yang kita klaim ke juri adalah
            // apa yang bisa dibaca siapa pun lewat RPC publik.
            console2.log("  tokenId (uint256 of hash):", tokenId);
            console2.log("  tokenURI:", cert.tokenURI(tokenId));
            (bool exists, bool revoked, bool expired, bool delisted,,,) = registry.statusOf(hash);
            // Satu argumen per baris: console2 tidak punya overload untuk empat bool sekaligus,
            // dan kegagalan kompilasi di sini bukan tempat untuk menebak-nebak.
            console2.log("  statusOf exists:", exists);
            console2.log("  statusOf revoked:", revoked);
            console2.log("  statusOf expired:", expired);
            console2.log("  statusOf delisted:", delisted);
        }
        vm.stopBroadcast();
    }
}
