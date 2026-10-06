---
tags: [testing, "T93"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (kode baru; dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core` dengan izin papan klip; lembar B153 dengan identitas uji (alamat B153 publik, kunci acak); chain 97 dan host tepi publik sungguhan, kecuali yang disebut "dipalsukan" (jawaban `eth_call` dan rute `/me/mint` dicegat di peramban)
measured: 2026-10-06
result: CETAK DAN BUKTI KEPEMILIKAN BEKERJA — belum dicetak → kotak "Cetak artefak NFT" → permintaan memuat 4 bidang bertanda tangan → panel membaca ulang dan kotak hilang; ditolak/gagal baca/sudah ada ditangani; B153: dua kotak "Bukti kepemilikan" menghasilkan blok 11 baris + tautan + 3 perintah cast; pemeriksa di halaman verifikasi: VALID, SIGNER_MISMATCH, NOT_OWNER (chain sungguhan), MALFORMED, UNKNOWN_CONTRACT, NO_TOKEN, OTHER_CHAIN; tautan ?own= langsung memeriksa; Inggris mempertahankan isian; ponsel tanpa luapan; galat 0
---

# T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B169, B170 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B169 - Cetak artefak NFT dari app]], [[07-Backlog/Acceptance-Criteria/AC-B170 - Bukti kepemilikan artefak NFT]] ·
**Summary:** [[08-Results/B169 - Executive Summary]], [[08-Results/B170 - Executive Summary]] · **Terkait:** [[09-Testing/T91 - Uji peramban bukti NFT dan bagikan ke LinkedIn (B168)]], [[09-Testing/T92 - signer mint-check.js (B169 cetak artefak NFT dari app)]]

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara). Dua skrip puppeteer (alat sesi, di luar repo): satu untuk B169 (panel bukti), satu untuk B170 (pemilik + pemeriksa).
2. B169: `tokenOfCredential(bytes32)` dijawab 0 sampai rute `/me/mint` (dipalsukan, `https://signer-production-e4f2.up.railway.app/me/mint`) dipanggil; sesudahnya chain sungguhan (B153 memang punya artefak). Tubuh permintaan direkam.
3. B170: blok pernyataan **dibangun ulang di skrip dari spesifikasi** (bukan memakai `web/src/ownership.ts`), jadi penyimpangan bentuk tertangkap. Kunci uji acak menandatangani; `ownerOf/credentialOf/locked` lapis A dipalsukan hanya untuk kasus VALID.

## Hasil 6 Okt — B169 (kotak Cetak artefak NFT)

| # | langkah | hasil |
|---|---|---|
| 1 | B153 (sudah punya artefak) | dua kartu "✓ Terikat ke akun ini"; **tidak ada** kotak cetak |
| 2 | belum dicetak (`tokenOfCredential` = 0) → klik "Cetak artefak NFT" | kotak "Cetak artefak NFT" + teks "belum dicetak"; draf LinkedIn **tanpa** NFT. Permintaan ke `/me/mint`: **1**, `learner` = `0x12f6F95E…11DF`, `hash` = B153, pesan `lencana-mint nonce=<hex≥12>`, tanda tangan 65 byte, **tanpa bidang lain**. Sesudah jawaban 200: panel membaca ulang (2 kartu), kotak hilang, draf LinkedIn kini memuat NFT |
| 3 | rute menjawab 403 (jawaban dipalsukan dengan teks Indonesia; teks signer sungguhan berbahasa Inggris — D27/D28 — dan tampil apa adanya) | "Gagal mencetak: kredensial ini bukan milik akun yang meminta" (peran `alert`), tombol hidup lagi, nol kartu |
| 4 | rute menjawab 409 `already` | panel membaca ulang: dua kartu, kotak hilang |
| 5 | pembacaan chain gagal (`tokenOfCredential` galat) | tiga baris "Pembacaan lapis kontrak ini gagal — itu bukan "belum dicetak"", **tanpa** kotak cetak |
| 6 | Inggris + ponsel 390 px | "Mint the NFT artifact" / "Could not mint: …"; tanpa luapan horizontal |

## Hasil 6 Okt — B170 (bukti kepemilikan)

| # | langkah | hasil |
|---|---|---|
| 1 | **sisi pemilik** (B153) | dua kotak "Bukti kepemilikan" (satu per kartu). "Buat bukti kepemilikan" → "Siap dibagikan…"; blok 11 baris: header, kalimat, `dompet: 0x12f6F95E…11DF`, `kontrak: 0xc338AF7F…`, `token: 84121403…364593`, `kredensial: 0xb9fb06e5…`, `rantai: 97`, `waktu: <UTC>Z`, baris `tanda tangan: 0x…` (146 karakter = 14 + 132); tombol Salin blok (papan klip = blok), Salin tautan, "Buka halaman pemeriksaan ↗" (`https://lencana-psi.vercel.app/?own=…`); 3 perintah cast; catatan batas |
| 2 | halaman verifikasi (`#/verify`): bagian "Periksa bukti kepemilikan" ada, kosong; tempel blok dari langkah 1 | **SIGNER_MISMATCH** "Tidak terbukti: tanda tangan dari dompet lain" — kunci uji acak bukan pemilik dompet B153; dompet dinyatakan `0x12f6F95E…` vs dipulihkan `0xA8987270…` (benar: ini bukan kunci B153) |
| 3 | blok dari kunci uji, chain dipalsukan (pemilik = kunci uji) | **VALID** "Terbukti: penandatangan memegang kunci pemilik artefak ini", ✓ pada dipulihkan dan pemilik, "ya" terkunci, usia "2 mnt lalu", perintah cast; Inggris: judul, tombol, hasil berganti bahasa dan isian bertahan |
| 4 | tautan `?own=<blok>#/verify` | terisi (11 baris) dan **langsung diperiksa** → VALID |
| 5 | chain 97 **sungguhan**: kunci acak mengaku memegang B153 | **NOT_OWNER**, pemilik di chain `0x12f6F95E…11DF` ✗, terkunci "ya" |
| 6 | teks sampah / kontrak karangan / token 12345 / rantai 56 | MALFORMED / UNKNOWN_CONTRACT / NO_TOKEN / OTHER_CHAIN; Kosongkan → isian dan hasil hilang |
| 7 | ponsel 390 px | kartu 342 px dari layar 390, tanpa luapan |
| 8 | galat | `pageerror` dan `console.error`: **0** |

**Temuan saat menguji (diperbaiki):** pemanggilan `mountOwnershipCheck` dari `updateStaticText` terjadi dua kali saat muat → gambar ulang menghilangkan fokus/ketikan; kini tidak menggambar ulang bila bahasa sama.
Placement pertama (di dasar halaman, ±4500 px) dipindah ke bawah hasil verifier, sebelum matriks spesifikasi.

**Gerbang 6 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **253 / 0** (232 + 21 grup B170); `npm run build` exit 0 (8,47 dtk); `npm run build:api -- --check` segar. **Uji negatif B170:** pemeriksaan kontrak dikenal, kredensial, dan penandatangan dimatikan → **6 merah**; dikembalikan → hijau.

## Batas

- Kasus **VALID** memakai kunci uji dan chain dipalsukan untuk pemiliknya; terhadap chain sungguhan hanya penolakan (NOT_OWNER, HASH_MISMATCH, NO_TOKEN, UNREADABLE) yang bisa dibuktikan tanpa kunci akun nyata. VALID sungguhan menunggu builder (AC-B170#14).
- Cetak sungguhan lewat rute baru (transaksi) belum dijalankan (AC-B169#15); di sini rute dipalsukan.
- Tanda tangan dompet Privy (`personal_sign` tertanam) belum dicoba di jalur ini; identitas uji memakai kunci perangkat.
- Chrome 154 saja; papan klip diuji dengan izin yang diberikan skrip.
