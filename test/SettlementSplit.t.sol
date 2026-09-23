// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SettlementSplit } from "../contracts/SettlementSplit.sol";

/// @dev Mock. Nama dan isinya sengaja jelek: ini bukan tiruan token mana pun, ini alat untuk
/// menanyakan satu hal pada kontrak split. Yang diuji di sini aritmetika, urutan, dan penjaga —
/// BUKAN integrasi x402/Permit2 (itu di `_research/x402-bnb-poc/`) dan bukan jalur HTTP `signer/`.
/// Jadi mock ini tidak pernah berdiri sebagai bukti bahwa pembayaran berbayar sudah end-to-end.
contract MockToken is IERC20 {
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    uint256 public totalSupply;

    function mint(address to, uint256 v) external {
        balanceOf[to] += v;
        totalSupply += v;
    }

    function approve(address sp, uint256 v) external returns (bool) {
        allowance[msg.sender][sp] = v;
        emit Approval(msg.sender, sp, v);
        return true;
    }

    function transfer(address to, uint256 v) external virtual returns (bool) {
        return _move(msg.sender, to, v);
    }

    function transferFrom(address from, address to, uint256 v) external virtual returns (bool) {
        uint256 a = allowance[from][msg.sender];
        if (a != type(uint256).max) {
            require(a >= v, "allowance");
            allowance[from][msg.sender] = a - v;
        }
        return _move(from, to, v);
    }

    /// Sengaja mengembalikan false (bukan revert) saat saldo kurang: itulah bentuk kegagalan
    /// yang membuat SafeERC20 berguna.
    function _move(address from, address to, uint256 v) internal returns (bool) {
        if (balanceOf[from] < v) return false;
        balanceOf[from] -= v;
        balanceOf[to] += v;
        emit Transfer(from, to, v);
        return true;
    }
}

/// @dev Token "kasar" ala BEP-20 lama: mengembalikan `false` alih-alih revert. `transfer()`
/// bawaan IERC20 akan menelan ini sebagai sukses kalau kita tidak memakai SafeERC20.
contract FalseToken is MockToken {
    function transfer(address, uint256) external pure override returns (bool) {
        return false;
    }
}

/// @dev Token yang membalik masuk ke kontrak split di tengah pembagian, memakai `ref` yang SAMA —
/// skenario terburuk: satu pembayaran dibagikan dua kali. Kalau guardnya bekerja, panggilan
/// balik itu revert; token mengeras `require(!ok)` sehingga kalau guard BOLONG seluruh test
/// gagal. Artinya test yang hijau adalah bukti guard bekerja, bukan bukti yang diam.
contract ReentrantToken is MockToken {
    SettlementSplit public target;
    address public payee;
    bytes32 public ref;
    bool public armed;

    function setAttacker(SettlementSplit t, address p, bytes32 r) external {
        target = t;
        payee = p;
        ref = r;
    }

    function arm() external {
        armed = true;
    }

    function transfer(address to, uint256 v) external override returns (bool) {
        bool moved = _move(msg.sender, to, v);
        if (armed) {
            armed = false;
            (bool ok, ) = address(target).call(
                abi.encodeCall(SettlementSplit.splitErc20, (IERC20(address(this)), payee, v, ref))
            );
            require(!ok, "reentrancy TIDAK diblokir - guard gagal");
        }
        return moved;
    }
}

/// @dev Penerima native yang menolak BNB di fallback.
contract RejectsNative {
    receive() external payable {
        revert("nope");
    }
}

contract SettlementSplitTest is Test {
    /// Deklarasi ulang event supaya `expectEmit` punya pembanding. Tipe struct-nya diambil dari
    /// kontrak aslinya: kalau bentuk event berubah, test ini yang gagal lebih dulu.
    event Split(
        bytes32 indexed ref, address indexed payee, address indexed token, SettlementSplit.Shares amounts
    );

    SettlementSplit internal split;
    MockToken internal token;
    address internal platform = makeAddr("platform");
    address internal issuer = makeAddr("issuer");
    address internal owner = makeAddr("owner");
    bytes32 internal ref1 = keccak256("payment-1");

    uint16 internal constant BPS10 = 1000;

    function setUp() public {
        split = new SettlementSplit(payable(platform), BPS10, owner);
        token = new MockToken();
    }

    /// @dev Dalam alur sungguhan dana tiba sendiri: fasilitator x402 men-settle ke `payTo`, dan
    /// `payTo`-nya adalah kontrak ini. Di test, "dana tiba" berarti token dimint ke kontrak.
    function _arrived(uint256 amount) internal {
        token.mint(address(split), amount);
    }

    function _split(address payee, uint256 amount, bytes32 r) internal {
        vm.prank(owner);
        split.splitErc20(IERC20(address(token)), payee, amount, r);
    }

    // ------------------------------------------------------------------ aritmetika

    function test_potonganSepuluhPersen() public {
        _arrived(1000);
        _split(issuer, 1000, ref1);
        assertEq(token.balanceOf(issuer), 900, "penerbit harus terima 90%");
        assertEq(token.balanceOf(platform), 100, "platform harus terima 10%");
    }

    /// Sisa pembagian TIDAK boleh jatuh ke platform: 999 x 1000/10000 = 99,9 -> platform 99 dan
    /// satu unit sisanya sampai ke penerbit, bukan menguap.
    function test_sisaPembulatanKepadaPenerbit() public {
        _arrived(999);
        _split(issuer, 999, ref1);
        (uint256 p, uint256 i) = split.sharesOf(999);
        assertEq(p, 99);
        assertEq(i, 900);
        assertEq(token.balanceOf(platform), 99);
        assertEq(token.balanceOf(issuer), 900);
        assertEq(token.balanceOf(address(split)), 0, "tidak boleh ada sisa tertinggal di kontrak");
    }

    /// Jumlah yang potongan platform-nya membulat ke nol tetap sah dibagikan: pembayaran kecil
    /// tetap pembayaran, dan ini tidak boleh revert.
    function test_potonganNolUntukJumlahKecilTetapTerbagi() public {
        _arrived(9);
        _split(issuer, 9, ref1);
        assertEq(token.balanceOf(issuer), 9);
        assertEq(token.balanceOf(platform), 0);
    }

    function test_jumlahTidakBolehMelebihiSaldo() public {
        _arrived(100);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.InsufficientBalance.selector, 101, 100));
        split.splitErc20(IERC20(address(token)), issuer, 101, ref1);
        assertEq(token.balanceOf(issuer), 0, "tidak boleh ada sebagian yang terlanjur keluar");
    }

    // ------------------------------------------------------------------ penjaga

    function test_refSamaDitolak() public {
        _arrived(200);
        _split(issuer, 100, ref1);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.AlreadySplit.selector, ref1));
        split.splitErc20(IERC20(address(token)), issuer, 100, ref1);
    }

    function test_refBerbedaKeduanyaJalan() public {
        _arrived(200);
        vm.startPrank(owner);
        split.splitErc20(IERC20(address(token)), issuer, 100, ref1);
        split.splitErc20(IERC20(address(token)), issuer, 100, keccak256("payment-2"));
        vm.stopPrank();
        assertEq(token.balanceOf(issuer), 180);
        assertEq(token.balanceOf(platform), 20);
    }

    function test_hanyaOwner() public {
        _arrived(100);
        vm.prank(makeAddr("oranglain"));
        vm.expectRevert(
            abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", makeAddr("oranglain"))
        );
        split.splitErc20(IERC20(address(token)), issuer, 100, ref1);
    }

    function test_jumlahNolDitolak() public {
        _arrived(100);
        vm.prank(owner);
        vm.expectRevert(SettlementSplit.ZeroAmount.selector);
        split.splitErc20(IERC20(address(token)), issuer, 0, ref1);
    }

    function test_penerimaNolDitolak() public {
        _arrived(100);
        vm.prank(owner);
        vm.expectRevert(SettlementSplit.ZeroAddress.selector);
        split.splitErc20(IERC20(address(token)), address(0), 100, ref1);
    }

    function test_konstruksiDiAtasPlafonDitolak() public {
        vm.expectRevert(
            abi.encodeWithSelector(SettlementSplit.BpsTooHigh.selector, uint16(2501), uint16(2500))
        );
        new SettlementSplit(payable(platform), 2501, owner);
    }

    function test_konstruksiPlatformNolDitolak() public {
        vm.expectRevert(SettlementSplit.ZeroAddress.selector);
        new SettlementSplit(payable(address(0)), BPS10, owner);
    }

    /// Arah ratchet: platform boleh berkorban, tidak boleh memperbesar dirinya sendiri.
    function test_bpsHanyaBolehTurun() public {
        vm.startPrank(owner);
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.BpsMayOnlyDecrease.selector, BPS10, uint16(2000)));
        split.decreasePlatformBps(2000);
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.BpsMayOnlyDecrease.selector, BPS10, BPS10));
        split.decreasePlatformBps(BPS10);
        split.decreasePlatformBps(500);
        vm.stopPrank();
        assertEq(split.platformBps(), 500);
        _arrived(1000);
        _split(issuer, 1000, ref1);
        assertEq(token.balanceOf(platform), 50, "bps baru harus terpakai, bukan cuma tersimpan");
    }

    /// "Tidak ada buku utang" diuji sebagai keadaan, bukan sebagai niat.
    function test_setelahSplitKontrakTidakMenyimpanSaldo() public {
        _arrived(12_345);
        _split(issuer, 12_345, ref1);
        assertEq(token.balanceOf(address(split)), 0);
        assertEq(address(split).balance, 0);
    }

    function test_eventMemuatAngkaYangDibagikan() public {
        _arrived(1000);
        vm.expectEmit(true, true, true, true, address(split));
        emit Split(ref1, issuer, address(token), SettlementSplit.Shares(1000, 100, 900));
        _split(issuer, 1000, ref1);
    }

    // ------------------------------------------------------------------ token kasar

    function test_tokenYangBalikFalseTidakLolos() public {
        FalseToken bad = new FalseToken();
        bad.mint(address(split), 100);
        vm.prank(owner);
        vm.expectRevert(); // SafeERC20 menolak `false`
        split.splitErc20(IERC20(address(bad)), issuer, 100, ref1);
        assertEq(bad.balanceOf(issuer), 0, "penerbit tidak boleh menerima apa pun");
        assertEq(bad.balanceOf(address(split)), 100, "dan dana tidak boleh hilang separuh");
    }

    function test_reentrancyDenganRefSamaDitolak() public {
        ReentrantToken evil = new ReentrantToken();
        evil.mint(address(split), 100);
        evil.setAttacker(split, issuer, ref1);
        evil.arm();
        vm.prank(owner);
        split.splitErc20(IERC20(address(evil)), issuer, 100, ref1);
        // Sampai di sini berarti panggilan balik itu revert (lihat require di token).
        assertEq(evil.balanceOf(issuer), 90, "penerbit terima bagiannya, tepat sekali");
        assertEq(evil.balanceOf(platform), 10);
        assertEq(evil.balanceOf(address(split)), 0);
    }

    // ------------------------------------------------------------------ jalur native

    function test_nativeTerbagi() public {
        vm.deal(address(split), 1 ether);
        vm.prank(owner);
        split.splitNative(payable(issuer), 1 ether, ref1);
        assertEq(issuer.balance, 0.9 ether);
        assertEq(platform.balance, 0.1 ether);
        assertEq(address(split).balance, 0);
    }

    /// Penerima yang menolak BNB: semuanya batal, TERMASUK bagian platform. Urutan
    /// (penerbit dikirim lebih dulu) yang menjamin ini, dan test ini mengunci urutan itu.
    function test_nativePenolakBNBmembatalkanSemua() public {
        RejectsNative rejecting = new RejectsNative();
        vm.deal(address(split), 1 ether);
        uint256 platformBefore = platform.balance;
        vm.prank(owner);
        vm.expectRevert(
            abi.encodeWithSelector(
                SettlementSplit.NativeTransferFailed.selector, address(rejecting), 900000000000000000
            )
        );
        split.splitNative(payable(address(rejecting)), 1 ether, ref1);
        assertEq(platform.balance, platformBefore, "platform tidak boleh sudah menerima apa pun");
        assertEq(address(split).balance, 1 ether, "dana tidak boleh hilang separuh");
    }

    function test_nativeSaldoKurangDitolak() public {
        vm.deal(address(split), 10);
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(SettlementSplit.InsufficientBalance.selector, 100, 10));
        split.splitNative(payable(issuer), 100, ref1);
    }

    // ------------------------------------------------------------------ penyelamat & admin

    function test_sweepMengembalikanYangNyasar() public {
        token.mint(address(split), 77);
        vm.prank(owner);
        uint256 n = split.sweep(IERC20(address(token)));
        assertEq(n, 77);
        assertEq(token.balanceOf(platform), 77);
        assertEq(token.balanceOf(address(split)), 0);
    }

    function test_gantiPlatformBerlakuUntukPembagianBerikutnya() public {
        address newPlatform = makeAddr("multisig");
        vm.prank(owner);
        split.setPlatform(payable(newPlatform));
        _arrived(1000);
        _split(issuer, 1000, ref1);
        assertEq(token.balanceOf(newPlatform), 100, "potongan ikut pindah ke platform baru");
        assertEq(token.balanceOf(platform), 0);
        assertEq(split.platformBps(), BPS10, "ganti alamat tidak boleh mengubah potongan");
    }

    function test_kirimLangsungKeKontrakTidakMembagiSiapaPun() public {
        (bool ok, ) = address(split).call{ value: 1 ether }("");
        assertTrue(ok);
        assertEq(platform.balance, 0);
        assertEq(issuer.balance, 0);
    }
}
