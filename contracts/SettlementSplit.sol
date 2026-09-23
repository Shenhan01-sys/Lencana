// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import { Ownable2Step, Ownable } from "@openzeppelin/contracts/access/Ownable2Step.sol";

/// @title SettlementSplit
///
/// Membagi hasil sebuah pembayaran x402 antara **penerbit** (yang kontennya dibeli) dan
/// **platform** (yang merawatkan rel, menalangi gas delegasi D31, dan menyajikan daftar status).
///
/// # Kenapa kontrak ini perlu ada sama sekali
///
/// Proxy `x402ExactPermit2Proxy` hanya punya **satu** `payTo` di dalam witness-nya
/// (`Witness(address to,uint256 validAfter)` — lihat `_research/x402-bnb-poc/`). Jadi secara
/// struktur pembayaran x402 tidak bisa langsung terbagi: dananya selalu mendarat di satu alamat,
/// lalu harus dipecah setelahnya. Kontrak ini adalah "satu alamat" itu.
///
/// # Tiga aturan yang sengaja dipakai
///
/// 1. **Potongan tetap (bps), bukan tarif per-transaksi.** Angka platform yang bisa dibaca dari
///    chain dan tidak perlu dipercaya. Ini yang membuat "platform hidup dari % kecil dari verifikasi
///    berbayar" jadi klaim yang bisa diperiksa, bukan slide.
///
/// 2. **Tidak ada buku utang.** Semua didorong keluar pada satu panggilan; kontrak tidak menyimpan
///    saldo milik siapa pun antar-transaksi. Begitu ledger "siapa owes berapa" ada, kita menambah
///    satu kelas bug baru (rekonisili, outstanding, klaim ganda) tanpa menambah satu pun kemampuan.
///    Kalau ada token yang tertinggal karena dikirim langsung ke alamat ini, `sweep()` mengembalikannya
///    ke platform — itu jalur penyelamat, bukan saldo yang dihitung-hitung.
///
/// 3. **`platformBps` hanya boleh TURUN.** Sama seperti arah failsafe di D30: input manusia hanya
///    boleh membuat keputusan lebih ketat untuk pihak lain, never lebih longgar. Platform tidak bisa
///    diam-diam menaikkan potongannya setelah penerbit bergabung; untuk menaikkan, harus deploy baru
///    dan itu terlihat.
///
/// # Yang TIDAK dilakukan kontrak ini
///
/// Ia tidak memverifikasi pembayaran x402, tidak menyentuh Permit2, dan tidak tahu-menahu soal
/// skema `exact`. Itu urusan fasilitator + `signer/`. Di sini hanya ada satu hal: sejumlah dana
/// masuk, dua pihak keluar.
contract SettlementSplit is Ownable2Step, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ------------------------------------------------------------------ kesalahan

    /// @dev Jumlah nol hampir selalu berarti pemanggil lupa menghitung, bukan "tidak ada pembayaran".
    error ZeroAmount();
    /// @dev `ref` sudah pernah dibagikan. Ini penolak replay, BUKAN buku utang: tidak ada saldo
    ///      yang disimpan per-`ref`, yang ada hanya "komando ini sudah dijalankan".
    error AlreadySplit(bytes32 ref);
    /// @dev Potongan awal di atas plafon — ditolak sejak konstruksi, bukan diam-diam dipotong.
    error BpsTooHigh(uint16 proposed, uint16 maximum);
    /// @dev Percobaan menaikkan/mensetel sama potongan platform. Hanya penurunan yang diterima.
    error BpsMayOnlyDecrease(uint16 current, uint16 proposed);
    /// @dev Saldo kontrak tidak cukup; lebih baik revert daripada membayar sebagian.
    error InsufficientBalance(uint256 needed, uint256 available);
    /// @dev Address nol tidak pernah jadi penerima atau platform.
    error ZeroAddress();
    /// @dev Pengiriman native gagal. Error ini dinyatakan terpisah karena `payee` bisa berupa
    ///      kontrak yang menolak BNB di fallback-nya, dan penyebab itu tidak boleh menyamar jadi
    ///      error lain.
    error NativeTransferFailed(address target, uint256 amount);

    // ------------------------------------------------------------------ tipe

    struct Shares {
        uint256 gross;
        uint256 platform;
        uint256 issuer;
    }

    // ------------------------------------------------------------------ keadaan

    uint16 public constant MAX_BPS = 2500; // 25% — plafon keras, platform tidak pernah mayoritas
    uint16 private constant BPS_DENOM = 10000;

    /// Penerima potongan platform. Bisa berupa kontrak multisig; yang penting bukan EOA pribadi.
    address payable public platform;

    /// Potongan platform dalam basis points. Satu-satunya angka kebijakan yang bisa berubah, dan
    /// hanya ke bawah.
    uint16 public platformBps;

    /// Penolak replay per referensi pembayaran (mis. UID payment x402 atau hash invoice).
    mapping(bytes32 => bool) public splitDone;

    event Split(bytes32 indexed ref, address indexed payee, address indexed token, Shares amounts);
    event PlatformChanged(address indexed previous, address indexed next);
    event BpsDecreased(uint16 from, uint16 to);

    // ------------------------------------------------------------------ setup

    /// @param platform_   alamat penerima potongan platform
    /// @param bps_        potongan awal, maksimum 2500 (25%)
    constructor(address payable platform_, uint16 bps_, address owner_) Ownable(owner_) {
        if (platform_ == address(0)) revert ZeroAddress();
        if (bps_ > MAX_BPS) revert BpsTooHigh(bps_, MAX_BPS);
        platform = platform_;
        platformBps = bps_;
    }

    /// BNB/ETH yang dikirim langsung (mis. pembayaran native) ditampung di sini sesaat, lalu dibagi.
    receive() external payable {}

    // ------------------------------------------------------------------ inti

    /// @dev Bagi rata tanpa pembulatan yang menguntungkan platform: sisa pembagian jatuh ke
    ///      penerbit. `amount * bps / 10000` membulat ke bawah, jadi penerbit tidak pernah
    ///      menerima lebih sedikit daripada hitungan kasarnya.
    function sharesOf(uint256 amount) public view returns (uint256 platformShare, uint256 issuerShare) {
        platformShare = (amount * platformBps) / BPS_DENOM;
        issuerShare = amount - platformShare;
    }

    /// @dev Path utama. Dananya SUDAH ada di kontrak ini — dalam alur x402 fasilitator men-settle
    ///      ke `payTo`, dan `payTo` itulah alamat kontrak ini (proxy hanya punya satu penerima,
    ///      jadi pembagian tidak mungkin terjadi di dalam settle itu sendiri). Karena itu tidak
    ///      ada `transferFrom` dan tidak ada approve: kontrak hanya mendorong keluar.
    /// @param token  ERC-20 yang diterima (diuji terhadap token non-standar juga, lihat test)
    /// @param payee  penerbit yang kontaknya dibeli
    /// @param amount jumlah kotor yang ditarik dari saldo kontrak ini
    /// @param ref    referensi pembayaran; pemakaian ulang ditolak
    function splitErc20(IERC20 token, address payee, uint256 amount, bytes32 ref)
        external
        onlyOwner
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (payee == address(0)) revert ZeroAddress();
        if (splitDone[ref]) revert AlreadySplit(ref);

        // Dibaca sebelum mendorong keluar: `amount` yang lebih besar dari saldo harus gagal
        // dengan sebab yang jelas, bukan dengan revert dari token.
        uint256 held = token.balanceOf(address(this));
        if (held < amount) revert InsufficientBalance(amount, held);

        splitDone[ref] = true; // effects sebelum interactions: replay tidak sempat ikut dieksekusi

        (uint256 platformShare, uint256 issuerShare) = sharesOf(amount);

        // Urutan: penerbit dulu, platform belakangan — sama seperti jalur native.
        // SafeERC20 dipakai karena BEP-20 di chain nyata tidak seragam: ada yang mengembalikan
        // `false` alih-alih revert, dan `transfer()` bawaan IERC20 akan menelan itu sebagai sukses.
        token.safeTransfer(payee, issuerShare);
        token.safeTransfer(platform, platformShare);

        emit Split(ref, payee, address(token), Shares(amount, platformShare, issuerShare));
    }

    /// @dev Versi native (BNB). Dana sudah masuk ke kontrak lewat `receive()`; `amount` dibatasi
    ///      saldo agar tidak pernah membayar sebagian lalu gagal di tengah.
    function splitNative(address payable payee, uint256 amount, bytes32 ref)
        external
        onlyOwner
        nonReentrant
    {
        if (amount == 0) revert ZeroAmount();
        if (payee == address(0)) revert ZeroAddress();
        if (splitDone[ref]) revert AlreadySplit(ref);
        if (address(this).balance < amount) revert InsufficientBalance(amount, address(this).balance);

        splitDone[ref] = true;

        (uint256 platformShare, uint256 issuerShare) = sharesOf(amount);

        // Urutan: penerbit dulu, platform belakangan. Kalau `payee` adalah kontrak yang revert di
        // fallback-nya, seluruh transaksi batal dan tidak ada dana yang hilang separuh — bukan
        // platform yang menerima lalu sisa nyangkut.
        (bool okI, ) = payee.call{ value: issuerShare }("");
        if (!okI) revert NativeTransferFailed(payee, issuerShare);
        (bool okP, ) = platform.call{ value: platformShare }("");
        if (!okP) revert NativeTransferFailed(platform, platformShare);

        emit Split(ref, payee, address(0), Shares(amount, platformShare, issuerShare));
    }

    // ------------------------------------------------------------------ kendali

    /// @dev Hanya boleh MENURUNKAN. Menaikkan potongan platform butuh deploy baru, supaya
    ///      kenaikan itu terlihat di alamat dan tidak bisa diselinapkan.
    function decreasePlatformBps(uint16 next) external onlyOwner {
        if (next >= platformBps) revert BpsMayOnlyDecrease(platformBps, next);
        uint16 previous = platformBps;
        platformBps = next;
        emit BpsDecreased(previous, next);
    }

    /// Platform berganti (mis. dari EOA ke multisig). Potongan tidak ikut berubah di sini.
    function setPlatform(address payable next) external onlyOwner {
        if (next == address(0)) revert ZeroAddress();
        address previous = platform;
        platform = payable(next);
        emit PlatformChanged(previous, next);
    }

    /// Jalur penyelamat: token/BNB yang salah kirim ke alamat ini tidak boleh jadi terlupakan.
    /// Bukan mekanisme pembayaran — kontrak ini sengaja tidak menyimpan saldo antar-transaksi.
    function sweep(IERC20 token) external onlyOwner returns (uint256 amount) {
        amount = token.balanceOf(address(this));
        if (amount > 0) token.safeTransfer(platform, amount);
    }
}
