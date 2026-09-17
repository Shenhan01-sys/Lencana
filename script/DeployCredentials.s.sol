// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console2 } from "forge-std/Script.sol";
import { CredentialResolver } from "../contracts/CredentialResolver.sol";
import { SoulboundCert } from "../contracts/SoulboundCert.sol";
import { ICredentialRegistry } from "../contracts/interfaces/ICredentialRegistry.sol";
import { IEAS } from "../lib/bas/src/IEAS.sol";

/// @title Deploy lapis kredensial ke BSC testnet (97) — atau mainnet (56) bila perlu.
///
/// Pemakaian:
///   copy .env.example .env      # isi DEPLOYER_PRIVATE_KEY dan ISSUER_ADDRESS
///   forge script script/DeployCredentials.s.sol --rpc-url bscTestnet --broadcast -vvvv
///
/// Kenapa `schemaUID` wajib dicatat, bukan dihitung ulang nanti:
/// UID schema = keccak256(schemaString, resolver, revocable) — jadi ia ditentukan oleh
/// ALAMAT RESOLVER. Resolver tidak bisa "diperbaiki" dengan deploy ulang diam-diam:
/// alamat baru = UID baru = verifier lama tidak mengenali kredensial yang sudah terbit.
///
/// Sumber BAS TIDAK di-deploy ulang — script ini menunjuk ke deployment chain yang sudah
/// diverifikasi keberadaannya (lihat Vault/Concepts/BNB-Attestation-Service).
contract DeployCredentials is Script {
    address constant BAS_97 = 0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD;
    address constant BAS_56 = 0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC;

    function run() external {
        uint256 pk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address issuer = vm.envAddress("ISSUER_ADDRESS");

        address basCore;
        if (block.chainid == 97) {
            basCore = BAS_97;
        } else if (block.chainid == 56) {
            basCore = BAS_56;
        } else {
            revert("chain ini tidak punya deployment BAS yang terverifikasi");
        }

        IEAS bas = IEAS(payable(basCore));
        address deployer = vm.addr(pk);

        // Hanya untuk dry-run di fork: `forge script` mode simulasi mendukung vm.deal, mode
        // broadcast TIDAK (transaksinya akan gagal sendiri). Ini bukan jalan pintas produksi —
        // tuasnya harus dipasang sadar-sadar lewat SIMULATE_TOPUP=true.
        if (vm.envOr("SIMULATE_TOPUP", false)) {
            vm.deal(deployer, 10 ether);
            console2.log("  (simulasi: deployer diisi 10 BNB)");
        }

        console2.log("==================================================");
        console2.log("Deploy lapis kredensial");
        console2.log("  chainid  :", block.chainid);
        console2.log("  BAS core :", basCore);
        console2.log("  registry :", address(bas.getSchemaRegistry()));
        console2.log("  deployer :", deployer);
        require(deployer.balance > 0, "deployer tidak punya BNB - isi dulu lewat faucet, atau pakai SIMULATE_TOPUP=true untuk dry-run");

        vm.startBroadcast(pk);

        CredentialResolver resolver = new CredentialResolver(bas, deployer);
        resolver.registerSchema();
        resolver.addIssuer(issuer);

        // Kunci penerbit artefak = issuer: pihak yang menandatangani VC-lah yang mencetak
        // artefaknya, supaya identitas penerbit konsisten di lapis dokumen dan lapis chain.
        // Nama & symbol ini yang tampil di wallet peserta, jadi ini bagian dari produk.
        SoulboundCert certs = new SoulboundCert(ICredentialRegistry(address(resolver)), "Lencana", "LNC", issuer);

        vm.stopBroadcast();

        console2.log("--------------------------------------------------");
        console2.log("  CredentialResolver :", address(resolver));
        console2.log("  schemaUID          :");
        console2.logBytes32(resolver.schemaUID());
        console2.log("  SoulboundCert      :", address(certs));
        console2.log("  issuer             :", issuer);
        console2.log("  isIssuer(issuer)   :", resolver.isIssuer(issuer));
        console2.log("==================================================");
        console2.log("Buka address di explorer (chain 97 -> testnet.bscscan.com).");
        console2.log("Verifikasi source bisa gagal: Etherscan V2 untuk BSC = Paid Tier Only,");
        console2.log("  API V1 BscScan sudah deprecated. Address tetap resolve & terbaca lewat RPC.");
    }
}
