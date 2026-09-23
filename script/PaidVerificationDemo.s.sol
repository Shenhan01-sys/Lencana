// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Script, console } from "forge-std/Script.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DemoCourseToken } from "../contracts/DemoCourseToken.sol";
import { SettlementSplit } from "../contracts/SettlementSplit.sol";
import { IX402ExactPermit2Proxy, IPermit2 } from "../contracts/interfaces/IX402ExactPermit2Proxy.sol";

/// @title PaidVerificationDemo
///
/// Menjalankan alur "verifikasi berbayar" yang sebenarnya di chain publik, sampai uangnya
/// terbagi. Ini yang membedakan "kontraknya ada dan lulus uji" dari "pembayarannya pernah
/// terjadi".
///
/// Rantainya:
///   1. deploy DemoCourseToken + SettlementSplit (penerima 90% = alamat agen yang sudah ada di
///      whitelist resolver; platform = pemanggil, dan memang dia yang bayar gas)
///   2. klien demo (kunci turunan seed) menandatangani dua hal offline — permit EIP-2612 ke
///      Permit2, dan permit-with-witness ke proxy
///   3. fasilitator memanggil `settleWithPermit` pada proxy x402 KANONIS: satu transaksi, dan
///      nonce klien tidak bergerak
///   4. `splitErc20` membagikan 90/10
///   5. semuanya DIBACA KEMBALI dari chain dan dibandingkan dengan yang kita klaim
///
/// Alamat Permit2/proxy disengaja konstanta yang sama dengan fork test: kalau di chain tujuan
/// kontraknya bukan itu, langkah 3 revert — tidak ada jalan melaporkan "sukses" untuk sesuatu
/// yang tidak terjadi.
///
/// `run()` sengaja dipecah jadi tahap-tahap kecil. Versi pertama menaruh semuanya dalam satu
/// fungsi dan Solidity menyerah dengan `Stack too deep`; bukan alasan untuk mengaktifkan via-ir
/// di seluruh proyek demi satu skrip demo.
///
/// Jalankan:
///   forge script script/PaidVerificationDemo.s.sol --rpc-url <97> --broadcast --slow
contract PaidVerificationDemo is Script {
    /// Permit2 kanonis + x402ExactPermit2Proxy kanonis. Keduanya diverifikasi ADA dan cocok
    /// dengan proxy `exact` di chain 97 (dan 56) oleh `SettlementSplitOnBscForkTest`.
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant PROXY = 0x402085c248EeA27D92E8b30b2C58ed07f9E20001;

    uint256 internal constant PRICE = 1000; // 0,001 pada 6 desimal
    uint256 internal constant CLIENT_START = 10_000e6; // bekal klien demo, hanya token
    uint16 internal constant BPS10 = 1000; // 10% platform, plafon 25%

    bytes32 internal constant P2_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");
    bytes32 internal constant P2_WITNESS_TYPEHASH = keccak256(
        "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
    );
    bytes32 internal constant P2_TOKEN_PERMISSIONS_TYPEHASH =
        keccak256("TokenPermissions(address token,uint256 amount)");
    bytes32 internal constant EIP2612_PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    uint256 internal constant CLIENT_SEED = 1;

    struct Setup {
        DemoCourseToken token;
        SettlementSplit split;
        address client;
        uint256 clientPk;
        uint256 issuerBefore;
        uint256 platformBefore;
    }

    function run() external {
        uint256 platformPk = vm.envUint("DEPLOYER_PRIVATE_KEY");
        Setup memory s = _stage1Deploy(platformPk);
        bytes32 ref = _stage2Settle(platformPk, s);
        _stage3Verify(s, ref);
    }

    // ------------------------------------------------------------- tahap 1

    function _stage1Deploy(uint256 platformPk) internal returns (Setup memory s) {
        address platform = vm.addr(platformPk);
        s.clientPk = uint256(keccak256("lencana-paid-demo-client"));
        s.client = vm.addr(s.clientPk);

        vm.startBroadcast(platformPk);
        s.token = new DemoCourseToken();
        s.split = new SettlementSplit(payable(platform), BPS10, platform);
        // "Klien punya saldo token" — dan hanya itu yang dia pegang. Tidak ada BNB di alamatnya,
        // dan itu memang seluruh poin demo ini.
        s.token.mint(s.client, CLIENT_START);
        vm.stopBroadcast();

        require(s.token.balanceOf(s.client) == CLIENT_START, "klien tidak terdanai");
        console.log("DemoCourseToken :", address(s.token));
        console.log("SettlementSplit :", address(s.split));
    }

    // ------------------------------------------------------------- tahap 2

    function _stage2Settle(uint256 platformPk, Setup memory s) internal returns (bytes32 ref) {
        uint256 deadline = block.timestamp + 600;
        uint256 nonce = uint256(keccak256("lencana-paid-demo-permit-1"));
        ref = keccak256("lencana-paid-demo-ref-1");

        IX402ExactPermit2Proxy.Witness memory w =
            IX402ExactPermit2Proxy.Witness({ to: address(s.split), validAfter: block.timestamp });

        require(s.token.allowance(s.client, PERMIT2) == 0, "klien tidak boleh sudah approve apa pun");
        uint256 nonceBefore = vm.getNonce(s.client);

        // Yang diukur di bawah adalah SELISIH, bukan saldo absolut: konstruktor token mencetak
        // suplai awalnya ke deployer, dan deployer adalah platform — jadi "platform punya 100"
        // tidak akan pernah benar dan juga bukan klaim yang ingin kita buat.
        s.issuerBefore = s.token.balanceOf(vm.envAddress("ISSUER_ADDRESS"));
        s.platformBefore = s.token.balanceOf(vm.envAddress("DEPLOYER_ADDRESS"));

        IX402ExactPermit2Proxy.EIP2612Permit memory p2612 = _eip2612(s, PRICE, deadline);
        IPermit2.PermitTransferFrom memory permit = _permit(s.token, PRICE, nonce, deadline);
        bytes memory witnessSig = _witnessSignature(s, PRICE, nonce, deadline, w);

        vm.broadcast(platformPk);
        IX402ExactPermit2Proxy(PROXY).settleWithPermit(p2612, permit, s.client, w, witnessSig);

        vm.broadcast(platformPk);
        s.split.splitErc20(IERC20(address(s.token)), vm.envAddress("ISSUER_ADDRESS"), PRICE, ref);

        require(vm.getNonce(s.client) == nonceBefore, "klien ternyata mengirim transaksi");
        console.log("nonce klien (harus tetap 0):", vm.getNonce(s.client));
    }

    // ------------------------------------------------------------- tahap 3

    /// Semua angka di bawah dibaca dari chain, dan yang dibandingkan adalah SELISIH akibat
    /// pembayaran ini — bukan saldo absolut. Platform sudah memegang suplai awal token
    /// (konstruktor mencetaknya ke deployer), jadi saldo absolut tidak menjawab apa pun.
    function _stage3Verify(Setup memory s, bytes32 ref) internal view {
        address issuer = vm.envAddress("ISSUER_ADDRESS");
        address platform = vm.envAddress("DEPLOYER_ADDRESS");

        uint256 gainIssuer = s.token.balanceOf(issuer) - s.issuerBefore;
        uint256 gainPlatform = s.token.balanceOf(platform) - s.platformBefore;
        uint256 left = s.token.balanceOf(address(s.split));
        uint256 clientNow = s.token.balanceOf(s.client);

        console.log("penerbit menerima   :", gainIssuer);
        console.log("platform menerima   :", gainPlatform);
        console.log("klien membayar      :", CLIENT_START - clientNow);
        console.log("sisa di split       :", left);
        console.log("splitDone(ref)      :", s.split.splitDone(ref));
        console.log("platformBps on-chain:", s.split.platformBps());

        require(gainIssuer == 900, "penerbit tidak menerima 90%");
        require(gainPlatform == 100, "platform tidak menerima 10%");
        require(clientNow == CLIENT_START - PRICE, "jumlah yang keluar dari klien tidak sama dengan harga");
        require(left == 0, "split masih menyimpan saldo");
        require(s.split.splitDone(ref), "referensi pembayaran tidak tercatat");

        console.log("");
        console.log("ALUR PEMBAYARAN TERBUKTI DI CHAIN PUBLIK: 90/10 terbagi, klien nol transaksi, nol gas.");
    }

    // ------------------------------------------------------------- tanda tangan

    /// Domain dibaca DARI KONTRAK token. `vm.sign` mengembalikan struct (v,r,s), bukan bytes.
    function _eip2612(Setup memory s, uint256 value, uint256 deadline)
        internal view returns (IX402ExactPermit2Proxy.EIP2612Permit memory p)
    {
        bytes32 structHash = keccak256(
            abi.encode(EIP2612_PERMIT_TYPEHASH, s.client, PERMIT2, value, s.token.nonces(s.client), deadline)
        );
        (uint8 v, bytes32 r, bytes32 ss) =
            vm.sign(s.clientPk, keccak256(abi.encodePacked("\x19\x01", s.token.DOMAIN_SEPARATOR(), structHash)));
        p = IX402ExactPermit2Proxy.EIP2612Permit({ value: value, deadline: deadline, r: r, s: ss, v: v });
    }

    function _permit(DemoCourseToken token, uint256 amount, uint256 nonce, uint256 deadline)
        internal view returns (IPermit2.PermitTransferFrom memory)
    {
        return IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({ token: address(token), amount: amount }),
            nonce: nonce,
            deadline: deadline
        });
    }

    /// `spender` pada digest ini adalah PROXY, dan `witness.to` ikut dihash: tujuan dana
    /// dikunci oleh tanda tangan klien, jadi fasilitator tidak bisa membelokkannya.
    function _witnessSignature(Setup memory s, uint256 amount, uint256 nonce, uint256 deadline,
        IX402ExactPermit2Proxy.Witness memory w) internal view returns (bytes memory)
    {
        bytes32 witnessHash = keccak256(abi.encode(IX402ExactPermit2Proxy(PROXY).WITNESS_TYPEHASH(), w.to, w.validAfter));
        bytes32 tokenPerms = keccak256(abi.encode(P2_TOKEN_PERMISSIONS_TYPEHASH, address(s.token), amount));
        bytes32 p2Domain = keccak256(abi.encode(P2_DOMAIN_TYPEHASH, keccak256("Permit2"), block.chainid, PERMIT2));
        bytes32 structHash =
            keccak256(abi.encode(P2_WITNESS_TYPEHASH, tokenPerms, PROXY, nonce, deadline, witnessHash));
        (uint8 v, bytes32 r, bytes32 ss) =
            vm.sign(s.clientPk, keccak256(abi.encodePacked("\x19\x01", p2Domain, structHash)));
        return abi.encodePacked(r, ss, v);
    }
}
