---
tags: [testing, "T87"]
status: active
updated: 2026-10-05
command: server dev Vite sementara di 127.0.0.1:5174 (kode baru) dan verifier produksi `https://lencana-psi.vercel.app` (kode lama, sebagai pembanding "sebelum"); Chrome 154 tanpa kepala lewat `puppeteer-core`; chain 97 publik lewat RPC publik; hash B153 `0xb9fb06e5…6430c31`, akun 1 `0x12f6…11DF`
measured: 2026-10-05
result: VERIFIER MEMBACA SEMUA LAPIS ARTEFAK — di kode baru, hash B153 tampil "Minted & Locked" (Token ID #84121403…, "🔒 Soulbound (ERC-5192)") tanpa menimpa konfigurasi; panel mendaftar tiga lapis (lama: tidak ada · A: ada, D42/D43 ✓ · B: ada, D42/D43 ✗); daftar kredensial akun 1 punya kolom "Artefak (NFT)" ("soulbound · 2 lapis"); panel konfigurasi menjatuhkan lapis tambahan bila `cert` diubah; nol galat konsol. Sebelum perbaikan (produksi): bawaan "Optional / Not Minted", dan "Minted & Locked" hanya bila `cert` ditimpa. `probe` 173 / 0 dengan uji negatif 15 merah. LIVE sudah: verifier produksi (`assets/index-BxD6KH3I.js`) menampilkan B153 "Minted & Locked" dengan tiga lapis, tanpa penimpaan konfigurasi dan tanpa galat konsol
---

# T87 - Uji peramban verifier membaca semua lapis artefak (B164)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B164 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B164 - Verifier membaca semua lapis artefak]] · **Summary:** [[08-Results/B164 - Executive Summary]] ·
**Terkait:** B153 (kredensial dan artefak yang dicetak), [[02-Contracts/C2 - SoulboundCert]]

Pertanyaan yang diuji: apakah verifier menampilkan artefak soulbound sebuah kredensial walau artefak itu ada di instance kontrak yang bukan alamat bawaan,
tanpa mengubah perilaku untuk artefak lama, dan tanpa menyamakan "gagal dibaca" dengan "belum dicetak".

## Cara mengulang

1. `cd web && npx vite --port 5174 --strictPort --host 127.0.0.1` (sementara; dimatikan sesudah uji).
2. Chrome tanpa kepala dengan profil bersih (tanpa `localStorage`): buka `http://127.0.0.1:5174/?q=0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31#/verify`,
   tunggu ±10 detik sampai pembacaan chain selesai, baca teks halaman dan buka tab "Soulbound NFT (ERC-5192)".
3. Di halaman yang sama jalankan `import('/src/lesson-views.ts')` lalu `readMyCredentials('0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF')`.
4. Isi kolom `cfg-cert` dengan alamat lain, picu `change`, lalu baca `localStorage['bnb-credential-endpoint-v1']`.
5. Pembanding "sebelum": buka alamat langkah 2 di `https://lencana-psi.vercel.app` (kode lama), tanpa dan dengan `cert` yang ditimpa lewat `localStorage`.

## Hasil 5 Okt malam

| # | langkah | hasil |
|---|---|---|
| 0 | **sebelum** (produksi, kode lama, tiga konfigurasi `cert`) | bawaan (`0xA5eB807A…`, `web/src/verify.ts:192`) → TOKEN ID `—`, "4. Soulbound NFT: **Optional / Not Minted**"; preset `bsc97` (`0xC6FD12B0…`) → "Minted & Locked", Token ID #84121403…, "🔒 Soulbound (ERC-5192)"; `0xc338AF7F…` diisi manual → "Minted & Locked" |
| 1 | kode baru, verifier bawaan untuk B153 | TOKEN ID **#8412140318679529892…**, LOCKED() "🔒 Soulbound (ERC-5192)", "4. Soulbound NFT: **Minted & Locked**" — tanpa konfigurasi apa pun |
| 2 | panel artefak (tab Soulbound) | "NFT Contract" `0xc338AF7F…` (lapis pertama yang memegang); "Contract layers read": `0xA5eB807A…` *none*, `0xc338AF7F…` *artifact present · D42/D43 ✓*, `0xC6FD12B0…` *artifact present · D42/D43 ✗*; "Layer enforces D42/D43?" yes; Token ID = hash kredensial dalam desimal; "Owned by" akun 1; `locked()` yes; ERC-5192 yes; "Token Metadata URI" menampilkan JSON `tokenURI` (name "Lencana — VALID", `external_url` = dokumen tepi) sebagai kode dengan tautan `external_url ↗` |
| 3 | `readMyCredentials(akun 1)` di dalam halaman | tabel punya kolom **"Artefak (NFT)"** dan baris "🔒 soulbound · 2 lapis"; tidak ada "belum dicetak" dan tidak ada "gagal dibaca" |
| 4 | panel konfigurasi: `cfg-cert` diubah ke `0xC6FD12B0…` | `localStorage` menyimpan `cert` = alamat itu dan `certs: []` — lapis tambahan dibuang (konfigurasi eksplisit satu instance); sebelum itu `localStorage` kosong |
| 5 | galat | `pageerror` dan `console.error`: **0** di langkah 1–4 |

**Uji negatif (`probe`):** `certCandidates` dikembalikan sementara hanya membaca `cert` → **15 pemeriksaan merah** dari 173, termasuk "B153 -> VALID dan artefaknya DITEMUKAN…" dengan
`token=null` (persis gejala "Not Minted"); dikembalikan → **173 / 0**, tidak ada sisa penanda `UJI-NEGATIF-B164` di berkas.

**Gerbang 5 Okt malam:** `npx tsc --noEmit` exit 0; `npm run probe` **173 / 0** (147 + 26 grup B164); `npm run build` exit 0.

## LIVE (5 Okt malam, sesudah dorongan `7259153..a962ff7`)

Skrip yang sama (tanpa langkah `readMyCredentials`, karena modul `/src/…` hanya ada di Vite dev) dijalankan terhadap `https://lencana-psi.vercel.app/` dengan konteks Chrome bersih
(tanpa `localStorage`), sesudah bundel produksi berganti dari `assets/index-CSniFuxJ.js` ke `assets/index-BxD6KH3I.js` (869.594 byte — nama dan ukuran sama dengan
`web/dist/assets/index-BxD6KH3I.js` dari `npm run build` 21.52 WIB, sebelum commit).

| langkah | hasil produksi |
|---|---|
| verifier bawaan, hash B153 | TOKEN ID **#841214031867952989208…**, "🔒 Soulbound (ERC-5192)", "4. Soulbound NFT: **Minted & Locked**" (sebelum dorongan: "Optional / Not Minted") |
| panel artefak | "NFT Contract" `0xc338AF7F…`; "Contract layers read": `0xA5eB807A…` *none*, `0xc338AF7F…` *artifact present · D42/D43 ✓*, `0xC6FD12B0…` *artifact present · D42/D43 ✗*; "Layer enforces D42/D43?" yes; Token ID = hash dalam desimal; "Owned by" `0x12f6F95E…11DF`; locked() yes; ERC-5192 yes; "Token Metadata URI" JSON "Lencana — VALID"; "NFT Wired to Active Resolver?" yes |
| `localStorage['bnb-credential-endpoint-v1']` sesudah memuat | kosong (`null`) — tidak ada penimpaan konfigurasi |
| hash asing (`0x1111…1111`) | "Could not verify — not recognized" (bukan kredensial; tidak ada klaim artefak) |
| galat | `pageerror` dan `console.error`: **0** |

Halaman `/app/credentials` produksi tetap di balik login; kolom "Artefak (NFT)" belum diamati sebagai pengguna masuk (AC-B164#7 PARTIAL).

## Perbaikan kecil yang ikut (bukan kriteria)

- Label "Layer enforces D42/D43?" semula terlalu panjang dan menimpa nilainya di kolom sempit; dipendekkan dan penjelasannya dipindah ke petunjuk.
- `tokenURI` kontrak yang hidup berupa JSON on-chain, bukan URL; sebelumnya ditaruh di `href` sehingga tampil sebagai tautan biru yang rusak. Kini JSON tampil sebagai kode dengan tautan `external_url`.

## Batas

- RPC **tidak dipaksa gagal**: tampilan "gagal dibaca" dan alasan pembacaan gagal hanya terbukti sebagai logika murni di `probe` (AC-B164#3 PARTIAL).
- `/app/credentials` yang asli ada di balik login; yang diuji adalah fungsi yang dipakainya dengan alamat akun 1 (AC-B164#7 PARTIAL).
- Langkah 1–5 menguji kode DEV lokal terhadap chain publik; ~~**Produksi belum** menjalankan kode baru (AC-B164#12 OPEN) sampai dorongan atas kata builder~~ produksi sudah menjalankan kode baru dan diuji di bagian "LIVE" (AC-B164#12 PASS).
- Hanya Chrome 154; hanya tab bahasa Inggris (bawaan) yang diperiksa visual — kamus Indonesia ditambahkan tetapi tidak dibuka di peramban.
