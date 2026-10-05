---
tags: [testing, "T91"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (kode baru; dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core` dengan izin papan klip; lembar B153 dengan identitas uji (alamat B153 publik, kunci acak); chain 97 dan host tepi publik sungguhan, kecuali yang disebut "dipalsukan" (jawaban `eth_call` dicegat di peramban); fungsi Vercel diuji lewat `probe` (handler dijalankan lokal terhadap dokumen tepi sungguhan)
measured: 2026-10-06
result: PANEL BUKTI DAN KIT LINKEDIN BEKERJA — B153: dua kartu artefak, masing-masing "Terikat ke akun ini" (ownerOf = alamat akun, locked, ERC-5192) dengan tautan penjelajah dan perintah cast; tanpa NFT → "belum dicetak"; ownerOf gagal → "Tidak terbaca"; panel tidak ikut tercetak (1 halaman); dialog Bagikan: tombol tambah-ke-profil terisi, bagikan sebagai post, draf teks Indonesia/Inggris, salin teks dan tautan, Esc menutup dialog dulu; ponsel 390 px dan Inggris; nol galat konsol. Gambar pratinjau di dialog tersembunyi di dev karena belum disajikan produksi. LIVE belum
---

# T91 - Uji peramban bukti NFT dan bagikan ke LinkedIn (B168)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B168 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B168 - Bukti NFT dan kit LinkedIn]] · **Summary:** [[08-Results/B168 - Executive Summary]] · **Terkait:** T88 (lembar), [[03-Frontend/FE10 - Halaman bagikan dan kartu OG (fungsi Vercel)]]

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara). Skrip puppeteer (alat sesi) memasang identitas uji seperti T88 dan membuka `#/app/credentials/<hash B153>`, menunggu panel bukti selesai membaca chain.
2. Langkah 3 dan 4 mencegat `eth_call` di peramban: `tokenOfCredential(bytes32)` dijawab 0 (tanpa artefak) dan `ownerOf(uint256)` dijawab galat JSON-RPC; permintaan lain jalan sungguhan.
3. Izin papan klip diberikan lewat `overridePermissions`; isi papan klip dibaca lewat `navigator.clipboard.readText()` (Windows mengganti `\n` menjadi `\r\n`, jadi dibandingkan setelah dinormalkan).

## Hasil 6 Okt

| # | langkah | hasil |
|---|---|---|
| 1 | panel **Bukti on-chain** (B153) | judul "Bukti on-chain"; **dua** kartu "Artefak NFT soulbound" — instance `0xc338AF7F…62aa` dan `0xC6FD12B0…c4cd` — masing-masing chip "✓ Terikat ke akun ini"; token ID `84121403…364593` (tombol Salin → "Tersalin", papan klip = token); pemilik `0x12f6F95E…775a11DF` "— ✓ sama dengan alamat dompet akunmu"; "Terkunci (locked()): ✓ ya — tidak bisa dipindahkan"; "ERC-5192: ✓ ya"; tautan "Buka token di penjelajah ↗" ke `https://testnet.bscscan.com/token/<kontrak>?a=<tokenId>` dan "Periksa di verifier"; `<details>` "Periksa sendiri (perintah Foundry cast)" dengan 4 perintah; catatan "Token terikat ke alamat dompet akunmu (login → dompet tertanam), bukan ke emailmu — email tidak pernah ada di chain."; tanpa luapan mendatar. Media print: `.cert-proof` dan dialog `display:none`, lembar (0,0) 1122 × 793, PDF **1 halaman** |
| 2 | dialog **Bagikan ke LinkedIn** | terbuka dengan fokus di dalamnya; catatan demo "Sertifikat ini dari penerbit demo (fiktif) di jaringan uji …"; tombol "Tambahkan ke profil LinkedIn" → `https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME&name=Kelas%20Uji%20—%20Membayar%20dengan%20Tanda%20Tangan%20(demo)&organizationName=Yayasan%20Literasi%20Digital%20Nusantara%20(institusi%20demo%2C%20fiktif)&issueYear=2026&issueMonth=10&expirationYear=2027&expirationMonth=10&certUrl=<tautan pratinjau>&certId=<hash>`, `target=_blank`, `rel=noopener noreferrer`; "Bagikan sebagai post" → `…/sharing/share-offsite/?url=<tautan pratinjau ter-encode>`; draf Indonesia (utuh, dengan kalimat NFT) dan Inggris saat radio diganti; "Salin teks" → papan klip = isi textarea; "Salin tautan" → `https://lencana-psi.vercel.app/s/<hash>`; **Esc pertama menutup dialog (hash tetap, fokus kembali ke "Bagikan ke LinkedIn"), Esc kedua kembali ke daftar** |
| 3 | tanpa artefak (`tokenOfCredential` = 0) | "Artefak NFT belum dicetak untuk kredensial ini. Kredensialnya tetap sah tanpa itu — artefak bersifat opsional."; nol kartu; draf post **tanpa** kata NFT |
| 4 | `ownerOf` dipalsukan galat | kedua kartu: chip **"Tidak terbaca"**, pemilik "tidak terbaca" (bukan "BUKAN alamat dompet akunmu"), terkunci tetap terbaca |
| 5 | ponsel 390 px | panel 366 px, tanpa luapan; dialog 358 px (tinggi 812 dari layar 844, dapat digulir), tanpa luapan |
| 6 | bahasa Inggris | "On-chain proof", "✓ Bound to this account", "0x12f6F95E…775a11DF — ✓ same as your account’s wallet address", tombol "Share on LinkedIn" |
| 7 | pratinjau gambar di dialog | `src` = `https://lencana-psi.vercel.app/s/<hash>/card.png`; di dev (produksi belum menyajikannya) gambar gagal dimuat dan pembungkusnya **disembunyikan** (label tidak tampil tanpa gambar) |
| 8 | galat | `pageerror` dan `console.error`: **0** |

**Gerbang 6 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **232 / 0** (212 + 20 grup B168: murni + fungsi lokal + bukti NFT dari chain 97); `npm run build` exit 0. **Uji negatif:** `escapeHtml` dimatikan dan kata
"BERLAKU" ditambahkan ke deskripsi OG → **4 merah** (OG, halaman bagikan, kartu, kesegaran bundel); dikembalikan → hijau.

## Batas

- Fungsi Vercel diuji lokal dengan bundel yang sama persis dengan yang dideploy, **bukan di runtime Vercel**; pratinjau di LinkedIn sungguhan dan URL tambah-ke-profil terhadap akun LinkedIn belum diuji.
- Gambar pratinjau di dialog baru bisa dilihat sesudah produksi menyajikan `/s/<hash>/card.png` (LIVE).
- Chrome 154 saja; papan klip diuji dengan izin yang diberikan skrip (di peramban pengguna, izin diminta lewat gestur klik).
- Cetak di kertas dan `cast call` oleh pihak ketiga tidak dijalankan di sini (perintah dibaca ulang dengan `cast` 6 Okt: hasilnya sama dengan panel).
