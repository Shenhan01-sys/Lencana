// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Cermin (mirror) dari bentuk yang dipakai x402ExactPermit2Proxy + Permit2 yang SUDAH
///      ter-deploy di BSC. Kenapa ditulis tangan dan bukan import library: library x402 tidak
///      bisa dikompilasi di rig kita, dan kontrak yang kita pakai memang bukan punya kita —
///      kita memanggil deployment nyata. Ini pola yang sama dengan `IEIP1271Getters` di
///      `test/CredentialResolver.fork.t.sol`: cermin untuk dibaca/dipanggil, bukan tiruan untuk
///      dipakai menggantikan.
///
///      Kalau field atau urutan salah, yang terjadi bukan test hijau yang salah: `settle()`
///      revert atau ABI decoding gagal, jadi kesalahan ini keras, bukan sunyi.
interface IPermit2 {
    struct TokenPermissions {
        address token;
        uint256 amount;
    }

    struct PermitTransferFrom {
        TokenPermissions permitted;
        uint256 nonce;
        uint256 deadline;
    }
}

interface IX402ExactPermit2Proxy {
    struct Witness {
        address to;
        uint256 validAfter;
    }

    /// Cermin `x402BasePermit2Proxy.EIP2612Permit`. Urutan field harus sama persis: struktur
    /// ini ikut di-ABI-encode, dan salah posisi = tanda tangan tidak cocok.
    struct EIP2612Permit {
        uint256 value;
        uint256 deadline;
        bytes32 r;
        bytes32 s;
        uint8 v;
    }

    /// Konstanta yang bisa dibaca dari kontrak ter-deploy — dipakai test untuk membuktikan bahwa
    /// alamat ini memang proxy `exact` milik x402, bukan sekadar "ada kontrak di alamat itu".
    function PERMIT2() external view returns (address);
    function WITNESS_TYPEHASH() external view returns (bytes32);
    function WITNESS_TYPE_STRING() external view returns (string memory);

    /// Jalur "klien sudah approve Permit2 sendiri". `to` di dalam witness mengunci tujuan dana,
    /// jadi fasilitator yang menyiarkan tidak bisa membelokkannya ke alamatnya sendiri.
    function settle(IPermit2.PermitTransferFrom calldata permit, address owner, Witness calldata witness, bytes calldata signature)
        external;

    /// Jalur "klien NOL gas": satu panggilan ini melakukan permit EIP-2612 ke Permit2 lalu
    /// memindahkan dananya. Klien tidak pernah mengirim transaksi — noncenya tidak bergerak.
    /// Inilah yang membuat pembayaran verifikasi masuk akal bagi peserta tanpa dompet terisi.
    function settleWithPermit(
        EIP2612Permit calldata tokenPermit,
        IPermit2.PermitTransferFrom calldata permit,
        address owner,
        Witness calldata witness,
        bytes calldata signature
    ) external;

    event Settled();
    event SettledWithPermit();
}
