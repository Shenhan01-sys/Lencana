// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { Vm } from "forge-std/Vm.sol";
import { console } from "forge-std/console.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { DemoCourseToken } from "../contracts/DemoCourseToken.sol";
import { SettlementSplit } from "../contracts/SettlementSplit.sol";
import { IX402ExactPermit2Proxy, IPermit2 } from "../contracts/interfaces/IX402ExactPermit2Proxy.sol";

/// @title SettlementSplitOnBscForkTest
///
/// Menjawab satu tuduhan spesifik terhadap `SettlementSplit`: test-nya main sama MOCK, dan
/// tidak ada satu pun pembayaran x402 sungguhan yang pernah masuk ke sana. Test ini menutup
/// celah itu TANPA dana dan TANPA menyiarkan transaksi:
///
///   Permit2 kanonis (ter-deploy di 56 & 97) + x402ExactPermit2Proxy kanonis + kontrak split
///   kita  ->  settlement nyata  ->  dananya mendarat di split  ->  dibagikan 90/10.
///
/// Kontrak x402nya BUKAN punya kita dan BUKAN tiruan: kita memanggil alamat yang akan dibaca
/// orang lain saat mereka mencoba membayar lewat jalur yang sama. Itu sebabnya test seperti ini
/// lebih kuat daripada deploy sendiri di anvil kosong.
///
/// Tipe hash dan bentuk permit disalin dari construction yang terbukti di
/// `_research/x402-bnb-poc/test/X402SettleOnBsc.fork.t.sol` — bukan ditulis ulang dari ingatan.
///
/// Jalankan:
///   forge test --match-contract SettlementSplitOnBscForkTest -vv --evm-version cancun \
///     --fork-url https://bsc-testnet.publicnode.com
/// Tanpa --fork-url, semuanya di-skip (bukan lulus palsu).
contract SettlementSplitOnBscForkTest is Test {
    address internal constant PERMIT2 = 0x000000000022D473030F116dDEE9F6B43aC78BA3;
    address internal constant CANONICAL_PROXY = 0x402085c248EeA27D92E8b30b2C58ed07f9E20001;

    uint256 internal constant BSC_TESTNET = 97;
    uint256 internal constant BSC_MAINNET = 56;

    bytes32 internal constant P2_DOMAIN_TYPEHASH =
        keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");
    bytes32 internal constant P2_WITNESS_TYPEHASH = keccak256(
        "PermitWitnessTransferFrom(TokenPermissions permitted,address spender,uint256 nonce,uint256 deadline,Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
    );
    bytes32 internal constant P2_TOKEN_PERMISSIONS_TYPEHASH =
        keccak256("TokenPermissions(address token,uint256 amount)");

    bytes32 internal constant TOPIC_SETTLED = keccak256("Settled()");
    bytes32 internal constant TOPIC_SETTLED_WITH_PERMIT = keccak256("SettledWithPermit()");

    /// Typehash EIP-2612 token KITA sendiri — berbeda dari typehash Permit2, jangan tertukar.
    bytes32 internal constant EIP2612_PERMIT_TYPEHASH =
        keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)");

    /// 0.001 unit pada 6 desimal — sama dengan `price: "$0.001"` di contoh resmi x402.
    /// Angka kecil ini sengaja: ia membuat pertanyaan "siapa yang dapat berapa" terjawab
    /// tanpa ditutupi pembulatan yang jauh.
    uint256 internal constant PRICE = 1000;
    uint256 internal constant FUNDED = 10_000e6;
    uint16 internal constant BPS10 = 1000;

    IX402ExactPermit2Proxy internal proxy;
    DemoCourseToken internal token;
    SettlementSplit internal split;

    uint256 internal payerKey;
    address internal payer;
    address internal issuer = makeAddr("penerbit");
    address internal platform = makeAddr("platform");
    bytes32 internal ref1 = keccak256("verification-payment-1");

    modifier onlyOnBsc() {
        vm.skip(block.chainid != BSC_TESTNET && block.chainid != BSC_MAINNET);
        _;
    }

    function setUp() public {
        payerKey = uint256(keccak256("lencana-fork-payer"));
        payer = vm.addr(payerKey);
        proxy = IX402ExactPermit2Proxy(CANONICAL_PROXY);

        token = new DemoCourseToken();
        token.mint(payer, FUNDED);

        // Pemilik split = kontrak test ini, sama seperti fasilitator memegang kendali operasi
        // di produksi. `platform` tetap alamat terpisah: yang memegang kunci bukan yang menerima.
        split = new SettlementSplit(payable(platform), BPS10, address(this));
    }

    // -------------------------------------------------------------- konstruksi

    function _domain() internal view returns (bytes32) {
        return keccak256(abi.encode(P2_DOMAIN_TYPEHASH, keccak256("Permit2"), block.chainid, PERMIT2));
    }

    function _witnessHash(IX402ExactPermit2Proxy.Witness memory w) internal view returns (bytes32) {
        return keccak256(abi.encode(proxy.WITNESS_TYPEHASH(), w.to, w.validAfter));
    }

    function _digest(uint256 amount, uint256 nonce, uint256 deadline, IX402ExactPermit2Proxy.Witness memory w)
        internal
        view
        returns (bytes32)
    {
        bytes32 th = keccak256(abi.encode(P2_TOKEN_PERMISSIONS_TYPEHASH, address(token), amount));
        bytes32 sh = keccak256(
            abi.encode(P2_WITNESS_TYPEHASH, th, CANONICAL_PROXY, nonce, deadline, _witnessHash(w))
        );
        return keccak256(abi.encodePacked("\x19\x01", _domain(), sh));
    }

    /// Tanda tangan klien: ditandatangani OFF-CHAIN, tidak pernah jadi transaksi.
    function _sign(uint256 amount, uint256 nonce, uint256 deadline, IX402ExactPermit2Proxy.Witness memory w)
        internal
        view
        returns (bytes memory)
    {
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(payerKey, _digest(amount, nonce, deadline, w));
        return abi.encodePacked(r, s, v);
    }

    /// Tanda tangan EIP-2612 atas nama klien. Pemisah domain DIBACA dari kontrak, tidak dihitung
    /// ulang di sini: kalau konstruksi domain kami berbeda dari yang dipakai OpenZeppelin, itu
    /// harus kelihatan sebagai tanda tangan ditolak di fork — bukan sebagai asumsi yang lolos.
    function _signEip2612(address spender, uint256 value, uint256 deadline)
        internal view returns (uint8 v, bytes32 r, bytes32 s)
    {
        bytes32 structHash = keccak256(
            abi.encode(EIP2612_PERMIT_TYPEHASH, payer, spender, value, token.nonces(payer), deadline)
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", token.DOMAIN_SEPARATOR(), structHash));
        (v, r, s) = vm.sign(payerKey, digest);
    }

    function _permit(uint256 amount, uint256 nonce, uint256 deadline)
        internal
        view
        returns (IPermit2.PermitTransferFrom memory)
    {
        return IPermit2.PermitTransferFrom({
            permitted: IPermit2.TokenPermissions({ token: address(token), amount: amount }),
            nonce: nonce,
            deadline: deadline
        });
    }

    function _emitted(bytes32 topic0) internal view returns (bool) {
        Vm.Log[] memory logs = vm.getRecordedLogs();
        for (uint256 i = 0; i < logs.length; i++) {
            if (logs[i].topics.length > 0 && logs[i].topics[0] == topic0) return true;
        }
        return false;
    }

    // -------------------------------------------------------------- identitas

    /// "ADA KODE di alamat itu" terlalu lemah. Yang diuji: konstanta on-chain cocok dengan proxy
    /// `exact` x402, jadi yang kita bayar memang infrastruktur yang sama dipakai orang lain.
    function test_fork_proxinya_memang_proxy_exact_x402() public onlyOnBsc {
        assertGt(PERMIT2.code.length, 0, "Permit2 tidak ada di chain ini");
        assertGt(CANONICAL_PROXY.code.length, 0, "proxy x402 tidak ada di chain ini");
        assertEq(address(proxy.PERMIT2()), PERMIT2, "proxy menunjuk Permit2 yang salah");
        assertEq(proxy.WITNESS_TYPEHASH(), keccak256("Witness(address to,uint256 validAfter)"));
        assertEq(
            proxy.WITNESS_TYPE_STRING(),
            "Witness witness)TokenPermissions(address token,uint256 amount)Witness(address to,uint256 validAfter)"
        );
        console.log("chainId test berjalan:", block.chainid);
        console.log("Permit2 code (byte)  :", PERMIT2.code.length);
        console.log("proxy code (byte)    :", CANONICAL_PROXY.code.length);
    }

    // -------------------------------------------------------------- alur uang

    /// Inti P2b: pembayaran x402 NYATA masuk ke kontrak split kita, lalu terbagi.
    function test_fork_pembayaran_masuk_ke_split_lalu_terbagi() public onlyOnBsc {
        vm.prank(payer);
        token.approve(PERMIT2, type(uint256).max);

        uint256 nonce = uint256(keccak256("lencana-nonce-1"));
        uint256 deadline = block.timestamp + 60;
        uint256 payerNonceBefore = vm.getNonce(payer);

        IX402ExactPermit2Proxy.Witness memory w =
            IX402ExactPermit2Proxy.Witness({ to: address(split), validAfter: block.timestamp });

        vm.recordLogs();
        // Di produksi baris ini dipanggil fasilitator, yang membayar gas.
        proxy.settle(_permit(PRICE, nonce, deadline), payer, w, _sign(PRICE, nonce, deadline, w));

        assertTrue(_emitted(TOPIC_SETTLED), "proxy tidak memancarkan Settled()");
        assertEq(token.balanceOf(address(split)), PRICE, "hasil settlement tidak mendarat di split");
        assertEq(vm.getNonce(payer), payerNonceBefore, "payer tidak seharusnya mengirim transaksi");

        split.splitErc20(IERC20(address(token)), issuer, PRICE, ref1);

        assertEq(token.balanceOf(issuer), 900, "penerbit harus terima 90%");
        assertEq(token.balanceOf(platform), 100, "platform harus terima 10%");
        assertEq(token.balanceOf(address(split)), 0, "tidak boleh ada saldo tertinggal");
        assertTrue(split.splitDone(ref1), "referensi pembayaran tidak ditandai");

        console.log("settlement -> split 90/10 lolos di chain", block.chainid);
    }

    /// Potongan yang dibagi harus bisa dibaca dari chain oleh pihak yang tidak percaya log kita.
    function test_fork_potongan_terbaca_dari_keadaan_kontrak() public onlyOnBsc {
        assertEq(split.platformBps(), BPS10);
        assertEq(split.MAX_BPS(), uint16(2500), "plafon platform boleh maksimal 25%");
        (uint256 p, uint256 i) = split.sharesOf(PRICE);
        assertEq(p + i, PRICE, "jumlah bagian harus sama dengan yang masuk");
    }

    /// Split hanya boleh membagikan uang yang benar-benar ada di dalamnya.
    function test_fork_tidak_bisa_membagi_lebih_dari_hasil_settlement() public onlyOnBsc {
        vm.prank(payer);
        token.approve(PERMIT2, type(uint256).max);
        uint256 nonce = uint256(keccak256("lencana-nonce-2"));
        uint256 deadline = block.timestamp + 60;
        IX402ExactPermit2Proxy.Witness memory w =
            IX402ExactPermit2Proxy.Witness({ to: address(split), validAfter: block.timestamp });
        proxy.settle(_permit(PRICE, nonce, deadline), payer, w, _sign(PRICE, nonce, deadline, w));

        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.InsufficientBalance.selector, PRICE + 1, PRICE));
        split.splitErc20(IERC20(address(token)), issuer, PRICE + 1, ref1);
        assertEq(token.balanceOf(issuer), 0, "tidak boleh keluar sebagian");
    }

    /// Satu pembayaran = satu pembagian. Guard replay tetap berlaku saat dananya nyata.
    function test_fork_ref_sama_ditolak_setelah_settlement_nyata() public onlyOnBsc {
        vm.prank(payer);
        token.approve(PERMIT2, type(uint256).max);
        uint256 nonce = uint256(keccak256("lencana-nonce-3"));
        uint256 deadline = block.timestamp + 60;
        IX402ExactPermit2Proxy.Witness memory w =
            IX402ExactPermit2Proxy.Witness({ to: address(split), validAfter: block.timestamp });
        proxy.settle(_permit(PRICE, nonce, deadline), payer, w, _sign(PRICE, nonce, deadline, w));

        split.splitErc20(IERC20(address(token)), issuer, PRICE, ref1);
        token.mint(address(split), PRICE); // dana baru, referensi lama: tetap harus ditolak
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.AlreadySplit.selector, ref1));
        split.splitErc20(IERC20(address(token)), issuer, PRICE, ref1);
    }

    /// `to` dikunci oleh tanda tangan: kalau tujuan diubah, settlementnya yang gagal —
    /// bukan dananya dibelokkan. Ini alasan fasilitator tidak perlu dipercayai.
    function test_fork_witness_dengan_tujuan_berbeda_gagal_ditandatangani() public onlyOnBsc {
        vm.prank(payer);
        token.approve(PERMIT2, type(uint256).max);
        uint256 nonce = uint256(keccak256("lencana-nonce-4"));
        uint256 deadline = block.timestamp + 60;

        IX402ExactPermit2Proxy.Witness memory signedFor =
            IX402ExactPermit2Proxy.Witness({ to: address(split), validAfter: block.timestamp });
        bytes memory sig = _sign(PRICE, nonce, deadline, signedFor);

        IX402ExactPermit2Proxy.Witness memory tampered =
            IX402ExactPermit2Proxy.Witness({ to: makeAddr("penyerang"), validAfter: block.timestamp });

        vm.expectRevert();
        proxy.settle(_permit(PRICE, nonce, deadline), payer, tampered, sig);
        assertEq(token.balanceOf(address(split)), 0, "tidak ada yang boleh masuk kalau tujuannya beda");
    }

    /// Jalur yang paling relevan untuk peserta: TANPA approve, TANPA transaksi klien. Satu
    /// panggilan fasilitator melakukan permit EIP-2612 ke Permit2 lalu memindahkan dana, dan
    /// noncenya klien tidak bergerak. Diuji sampai ke pembagian 90/10 supaya jalur "klien nol
    /// gas" dan "pendapatan terbagi" terbukti sebagai SATU rangkaian, bukan dua test yang berjauhan.
    function test_fork_klien_nol_gas_sampai_dana_terbagi() public onlyOnBsc {
        assertEq(token.allowance(payer, PERMIT2), 0, "harus mulai tanpa allowance: klien tidak approve apa pun");
        uint256 payerNonceBefore = vm.getNonce(payer);

        uint256 deadline = block.timestamp + 60;

        (uint8 v2612, bytes32 r2612, bytes32 s2612) = _signEip2612(PERMIT2, PRICE, deadline);
        IX402ExactPermit2Proxy.EIP2612Permit memory p2612 = IX402ExactPermit2Proxy.EIP2612Permit({
            value: PRICE, deadline: deadline, r: r2612, s: s2612, v: v2612
        });

        uint256 nonce = uint256(keccak256("lencana-nonce-nol-gas"));
        IX402ExactPermit2Proxy.Witness memory w =
            IX402ExactPermit2Proxy.Witness({ to: address(split), validAfter: block.timestamp });

        vm.recordLogs();
        proxy.settleWithPermit(p2612, _permit(PRICE, nonce, deadline), payer, w, _sign(PRICE, nonce, deadline, w));

        assertTrue(_emitted(TOPIC_SETTLED_WITH_PERMIT), "proxy tidak memancarkan SettledWithPermit()");
        assertEq(token.balanceOf(address(split)), PRICE, "dana tidak mendarat di split");
        assertEq(vm.getNonce(payer), payerNonceBefore, "klien tidak seharusnya mengirim transaksi");
        assertEq(token.balanceOf(payer), FUNDED - PRICE);

        split.splitErc20(IERC20(address(token)), issuer, PRICE, ref1);
        assertEq(token.balanceOf(issuer), 900);
        assertEq(token.balanceOf(platform), 100);
        assertEq(token.balanceOf(address(split)), 0);
    }
}
