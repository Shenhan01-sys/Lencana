// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @dev Assertion untuk metadata JSON yang DIRAKIT kontrak.
///
/// Membandingkan seluruh string berarti menyalin formatter ke dalam test — dan itu menyembunyikan
/// perubahan, bukan menjaganya. Yang diuji di sini hal yang benar-benar penting: kata kunci status
/// dan alamat dokumen ada di tempatnya, dan statusnya ikut berubah ketika kenyataannya berubah.
library JsonText {
    function contains(string memory hay, string memory needle) internal pure returns (bool) {
        bytes memory h = bytes(hay);
        bytes memory n = bytes(needle);
        if (n.length > h.length) return false;
        for (uint256 i = 0; i + n.length <= h.length; i++) {
            bool same = true;
            for (uint256 j = 0; j < n.length; j++) {
                if (h[i + j] != n[j]) {
                    same = false;
                    break;
                }
            }
            if (same) return true;
        }
        return false;
    }
}
