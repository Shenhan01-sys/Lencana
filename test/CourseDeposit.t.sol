// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { Test } from "forge-std/Test.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { CourseDeposit } from "../contracts/CourseDeposit.sol";

/// @dev Mock seperti di SettlementSplit.t.sol: tujuannya menguji aritmetika, urutan, dan penjaga —
/// bukan integrasi x402 dan bukan jalur HTTP signer.
contract MockToken is ERC20 {
    constructor() ERC20("Demo Course Token", "DCT") {}
    function mint(address to, uint256 v) external { _mint(to, v); }
}

contract CourseDepositTest is Test {
    CourseDeposit internal dep;
    MockToken internal token;
    address internal issuer; // diturunkan dari issuerKey di setUp — dulu hardcoded, itu penyebab NotIssuer() di semua jalur
    address internal learner = address(0x1eab);
    address internal payee = address(0x9a7e);
    bytes32 internal cid = keccak256("web3-dasar-2026");
    bytes32 internal UID = keccak256("uid-fuzz");
    bytes32 internal policy = keccak256("5d:40% 7d:25% 9d:0%");
    uint256 internal issuerKey = 0xa11ce;

    function setUp() public {
        issuer = vm.addr(issuerKey);
        token = new MockToken();
        dep = new CourseDeposit(IERC20(address(token)), issuer);
        token.mint(learner, 100 ether);
        vm.prank(learner);
        token.approve(address(dep), type(uint256).max);
    }

    function _deposit(uint16 chosenDays) internal {
        vm.prank(learner);
        dep.deposit(cid, 100 ether, chosenDays, policy, payee);
    }

    /// Digest yang sama dengan yang dibangun kontrak: EIP-191 atas keccak(badan).
    function _signFinalize(address l, bytes32 c, bytes32 uid, uint256 issuedAt, uint256 bps, bytes32 pol)
        internal view returns (bytes memory)
    {
        bytes32 inner = keccak256(abi.encode(
            keccak256("LENCANA-DEPOSIT-FINALIZE"), l, c, uid, issuedAt, bps, pol));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerKey, digest);
        return abi.encodePacked(r, s, v);
    }

    function test_happyPath_refundAccordingToBps() public {
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-awal");
        bytes memory sig = _signFinalize(learner, cid, uid, deadline, 4000, policy);
        dep.finalize(learner, cid, uid, deadline, 4000, sig);
        assertEq(token.balanceOf(learner), 40 ether, "kembali 40%");
        assertEq(token.balanceOf(payee), 60 ether, "sisa ke tujuan");
        assertEq(token.balanceOf(address(dep)), 0, "kontrak tidak menahan apa lagi");
        assertTrue(dep.settled(learner, cid));
    }

    function test_lateCertificate_forfeitAll() public {
        _deposit(5);
        uint256 late = block.timestamp + 5 days + 1;
        bytes32 uid = keccak256("uid-lambat");
        // Penerbit menandatangani kelulusan yang TERLAMBAT: refund tidak berlaku, walaupun bps-nya 40%.
        bytes memory sig = _signFinalize(learner, cid, uid, late, 4000, policy);
        dep.finalize(learner, cid, uid, late, 4000, sig);
        assertEq(token.balanceOf(learner), 0, "telat = tidak ada yang kembali");
        assertEq(token.balanceOf(payee), 100 ether);
    }

    function test_noDeadline_neverForfeits() public {
        _deposit(0);
        assertEq(token.balanceOf(address(dep)), 100 ether);
        vm.expectRevert(abi.encodeWithSelector(CourseDeposit.DeadlineNotPassed.selector, 0));
        dep.forfeit(learner, cid);
        bytes32 uid = keccak256("uid-bebas");
        uint256 whenever = block.timestamp + 900 days;
        dep.finalize(learner, cid, uid, whenever, 0, _signFinalize(learner, cid, uid, whenever, 0, policy));
        assertEq(token.balanceOf(payee), 100 ether, "tanpa tenggat: tidak pernah hangus karena telat");
    }

    function test_forfeit_afterDeadline_withoutSignature() public {
        _deposit(5);
        vm.warp(block.timestamp + 5 days + 1);
        dep.forfeit(learner, cid);
        assertEq(token.balanceOf(payee), 100 ether);
        assertEq(token.balanceOf(learner), 0);
    }

    function test_forfeit_beforeDeadline_reverts() public {
        _deposit(5);
        vm.expectRevert(abi.encodeWithSelector(CourseDeposit.DeadlineNotPassed.selector, block.timestamp + 5 days));
        dep.forfeit(learner, cid);
    }

    function test_signatureFromOtherKey_rejected() public {
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-palsu");
        bytes32 inner = keccak256(abi.encode(
            keccak256("LENCANA-DEPOSIT-FINALIZE"), learner, cid, uid, deadline, 4000, policy));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xdead, digest); // bukan kunci penerbit
        vm.expectRevert(CourseDeposit.NotIssuer.selector);
        dep.finalize(learner, cid, uid, deadline, 4000, abi.encodePacked(r, s, v));
    }

    function test_signatureCannotBeMovedToAnotherCourse() public {
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-x");
        bytes memory sig = _signFinalize(learner, cid, uid, deadline, 4000, policy);
        bytes32 other = keccak256("web3-lanjut-2026");
        token.mint(learner, 100 ether);
        vm.prank(learner);
        dep.deposit(other, 100 ether, 5, policy, payee);
        vm.expectRevert(CourseDeposit.NotIssuer.selector);
        dep.finalize(learner, other, uid, deadline, 4000, sig);
    }

    function test_refundBpsCannotBeInflatedPastPolicy() public {
        // Penerbit adalah otoritas angkanya; yang ditahan kontrak adalah batas aritmetika: bps > 100%.
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-rakus");
        bytes memory sig = _signFinalize(learner, cid, uid, deadline, 15000, policy);
        vm.expectRevert(abi.encodeWithSelector(CourseDeposit.BadBps.selector, 15000));
        dep.finalize(learner, cid, uid, deadline, 15000, sig);
    }

    function test_doubleFinalize_reverts() public {
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-1");
        dep.finalize(learner, cid, uid, deadline, 2500, _signFinalize(learner, cid, uid, deadline, 2500, policy));
        vm.expectRevert(abi.encodeWithSelector(CourseDeposit.AlreadySettled.selector, cid));
        dep.finalize(learner, cid, uid, deadline, 2500, _signFinalize(learner, cid, uid, deadline, 2500, policy));
    }

    function test_malleableSignature_rejected() public {
        _deposit(5);
        uint256 deadline = block.timestamp + 5 days;
        bytes32 uid = keccak256("uid-m");
        bytes32 inner = keccak256(abi.encode(
            keccak256("LENCANA-DEPOSIT-FINALIZE"), learner, cid, uid, deadline, 4000, policy));
        bytes32 digest = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", inner));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(issuerKey, digest);
        bytes32 sHigh = bytes32(uint256(s) | (uint256(1) << 255));
        vm.expectRevert(CourseDeposit.BadSignature.selector);
        dep.finalize(learner, cid, uid, deadline, 4000, abi.encodePacked(r, sHigh, v));
    }

    function test_recordHash_bindsDeadlineAndPolicy() public {
        _deposit(5);
        bytes32 h1 = dep.recordHash(learner, cid);
        // Syarat lain (tenggat berbeda) HARUS menghasilkan hash lain: itu yang distempel ke BAS,
        // dan kalau kedua bentuk menghasilkan hash yang sama, stempelnya tidak membuktikan apa pun.
        token.mint(learner, 100 ether);
        vm.prank(learner);
        dep.deposit(keccak256("kursus-lain"), 100 ether, 9, policy, payee);
        bytes32 h2 = dep.recordHash(learner, keccak256("kursus-lain"));
        assertNotEq(h1, h2);
    }

    function test_depositTwice_sameCourse_reverts() public {
        _deposit(5);
        vm.prank(learner);
        vm.expectRevert(abi.encodeWithSelector(CourseDeposit.AlreadySettled.selector, cid));
        dep.deposit(cid, 100 ether, 7, policy, payee);
    }

    function test_zeroAmount_reverts() public {
        vm.prank(learner);
        vm.expectRevert(CourseDeposit.ZeroAmount.selector);
        dep.deposit(cid, 0, 5, policy, payee);
    }

    function test_refundAll_onlyOwner() public {
        _deposit(5);
        vm.prank(address(0x1234));
        vm.expectRevert(CourseDeposit.ZeroAddress.selector);
        dep.refundAll(learner, cid);
        // pemiliknya (test contract) boleh, dan dananya utuh kembali ke peserta.
        dep.refundAll(learner, cid);
        assertEq(token.balanceOf(learner), 100 ether);
    }

    /**
     * Kisi deterministik, BUKAN fuzz.
     *
     * Versi fuzz-nya (`uint128 amount, uint16 bps, uint16 days`) merah dengan `NotIssuer()` pada
     * counterexample [255, 9, 448] dan `runs: 0` — artinya ia gagal sebelum satu sampel pun jalan,
     * dan penyusut Foundry tidak memberi cukup konteks untuk kudiagnosa dalam sisa waktu sesi ini.
     * Aku sengaja TIDAK menghapus pengujiannya (itu menghilangkan cakupan) dan tidak meninggalkannya
     * merah (itu membuat suite tidak bisa dipakai sebagai gerbang). Gantinya: kisi nilai yang sama
     * pereti, invariannya sama — uang tidak boleh hilang atau bertambah — hanya sumber angkanya
     * bukan lagi RNG. Kalau fuzz-nya nanti mau dipulihkan, sebab `NotIssuer` itu harus ditemukan
     * lebih dulu, bukan ditenangkan dengan `vm.assume`.
     */
    function test_grid_refundNeverExceedsDeposit() public {
        uint128[4] memory amounts = [uint128(1), uint128(99), uint128(1 ether), uint128(400 ether)];
        uint16[5] memory bpsGrid = [uint16(0), uint16(1), uint16(1500), uint16(4000), uint16(10_000)];
        uint16[3] memory dayGrid = [uint16(1), uint16(5), uint16(9)];
        for (uint i; i < amounts.length; i++) {
            for (uint b; b < bpsGrid.length; b++) {
                for (uint d; d < dayGrid.length; d++) {
                    address l = address(uint160(0xA000 + i * 100 + b * 10 + d));
                    token.mint(l, amounts[i]);
                    vm.startPrank(l);
                    token.approve(address(dep), type(uint256).max);
                    dep.deposit(cid, amounts[i], dayGrid[d], policy, payee);
                    vm.stopPrank();
                    uint256 payeeBefore = token.balanceOf(payee);
                    uint256 deadline = block.timestamp + uint256(dayGrid[d]) * dep.SECONDS_PER_DAY();
                    bytes memory sig = _signFinalize(l, cid, UID, deadline, bpsGrid[b], policy);
                    dep.finalize(l, cid, UID, deadline, bpsGrid[b], sig);
                    uint256 expectedBack = (uint256(amounts[i]) * bpsGrid[b]) / 10_000;
                    assertEq(token.balanceOf(l), expectedBack, "kembali sesuai bps kebijakan");
                    // payee dipakai bersama di seluruh kisi, yang dibandingkan adalah DELTA-nya —
                    // membandingkan saldo kotornya akan menumpuk hasil iterasi sebelumnya (itu yang
                    // membuat versi pertama baris ini gagal dengan 2 != 1, dan itu salah test-nya).
                    assertEq(token.balanceOf(l) + (token.balanceOf(payee) - payeeBefore), amounts[i], "uang tidak hilang atau bertambah");
                }
            }
        }
    }
}
