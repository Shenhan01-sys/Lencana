// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import { ERC20Permit } from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/// @title DemoCourseToken
/// @dev Koin mainan untuk membuktikan ALUR pembayaran verifikasi — bukan produk, bukan aset
///      yang bisa diperdagangkan, dan tidak dimaksudkan untuk dipakai di mainnet.
///
///      Kenapa tidak pakai token yang sudah ada di testnet: supaya jumlahnya bisa ditentukan
///      bulat (1000 = harga `"$0.001"` pada contoh resmi x402) dan pengujian tidak bergantung
///      pada siapa yang mau mentransfer kita token sungguhan.
///
///      Kenapa ada `permit` (EIP-2612): ini yang memungkinkan jalur `settleWithPermit` — klien
///      menandatangani, fasilitator yang menyiarkan dan membayar gas, dan klien TIDAK PERNAH
///      mengirim transaksi. Tanpa EIP-2612, "klien tidak perlu pegang BNB" butuh approve yang
///      justru memerlukan BNB: lingkaran yang sama yang baru saja kita selesaikan di sisi agen.
///
///      `DOMAIN_SEPARATOR()` sudah disediakan `ERC20Permit` bawaan OpenZeppelin dan dipakai apa
///      adanya oleh test: salah hitung domain = tanda tangan ditolak, dan fork test yang akan
///      memberitahunya, bukan asumsi kami.
///
///      Kenapa `mint()` terbuka: ini testnet dan pesertanya alat uji. Fungsi ini TIDAK akan
///      pernah ada di token apa pun yang dipakai di produksi — dan kalau suatu hari kontrak ini
///      mendarat di chain 56, itu kesalahan, bukan fitur.
contract DemoCourseToken is ERC20, ERC20Permit {
    /// @param to   penerima
    /// @param amount jumlah dalam satuan terkecil (6 desimal seperti USDT di BSC)
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    constructor() ERC20("Lencana Demo Coin", "LDC-demo") ERC20Permit("Lencana Demo Coin") {
        _mint(msg.sender, 1_000_000e6);
    }
}
