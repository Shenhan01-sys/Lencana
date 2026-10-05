---
tags: [acceptance-criteria, B164]
status: active
updated: 2026-10-05
---

# AC-B164 - Verifier membaca semua lapis artefak soulbound

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B164 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T87 - Uji peramban verifier membaca semua lapis artefak (B164)]] ·
**Summary:** [[08-Results/B164 - Executive Summary]] · **Terkait:** B153 (kredensial yang artefaknya dicetak), D46 di [[00-Overview/03 - Decisions]],
[[02-Contracts/C2 - SoulboundCert]], [[03-Frontend/FE1 - Verifier page and verify.ts]]

Ditemukan 5 Okt malam saat mencetak artefak NFT untuk kredensial B153 di dua instance (A `0xc338AF7F…`, B `0xC6FD12B0…`): verifier bawaan
(`defaultEndpoint()`, `web/src/verify.ts`) hanya membaca satu alamat, `0xA5eB807A…` — instance paling tua — sehingga kedua artefak itu tampil
"Optional / Not Minted" padahal ada dan terkunci. Kesalahan membaca yang pertama (klaim saya bahwa bawaan = `0xC6FD12B0…`) dikoreksi di Findings, hub
desain sertifikat, dan START-HERE. Builder menyetujui pengerjaannya ("Gas B164"). Kontrak, database, dan `CERT_ADDRESS` tidak diubah (D46).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B164#1 | verifier bawaan (tanpa menimpa konfigurasi) menampilkan kredensial B153 sebagai artefak "Minted & Locked" dengan tokenId = hash kredensial, terkunci, milik peserta | **PASS** 5 Okt malam di kode (dev) — ~~**LIVE belum**~~ **LIVE PASS** 5 Okt malam (#12) | T87 langkah 1; `probe` "B153 -> VALID dan artefaknya DITEMUKAN…", "…tokenId = angka dari credentialHash…" |
| AC-B164#2 | panel artefak mendaftar SEMUA lapis yang dibaca dengan keadaan masing-masing (ada artefak / tidak ada / gagal dibaca), dan menandai apakah lapis yang ditampilkan menegakkan D42/D43 — **diukur dari bytecode** (selector `mintBatch`, `attestationOf`, `lessonOf`), bukan dari catatan | **PASS** | T87 langkah 2 (lapis `0xA5eB…` tidak ada, `0xc338…` ada · D42/D43 ✓, `0xC6FD…` ada · D42/D43 ✗); `probe` 4 pemeriksaan murni bytecode + "B153 -> penegakan D42/D43 diukur dari bytecode" |
| AC-B164#3 | pembacaan yang GAGAL tidak pernah tampil sebagai "belum dicetak": tidak dihitung memegang artefak, ditandai `readOk=false`, dan diberi alasan terpisah | **PARTIAL** | `probe` "pembacaan yang GAGAL tidak dihitung memegang artefak" (logika murni); teks alasan dan label "gagal dibaca" tidak diamati di peramban karena RPC tidak dipaksa gagal |
| AC-B164#4 | artefak korpus demo di lapis lama tetap terbaca dan lapis lama tetap yang utama (D46: `cert` tidak dipindah) | **PASS** | `probe` "kredensial demo lama -> artefaknya tetap terbaca di lapis utama"; "bawaan chain 97: cert tetap lapis paling tua…" |
| AC-B164#5 | konfigurasi yang tidak boleh mewarisi lapis publik: preset fork lokal dan mainnet, konfigurasi tersimpan yang menunjuk resolver lain, `certs` kosong yang disimpan eksplisit, dan perubahan `cert`/resolver/chain di panel | **PASS** | `probe` 6 pemeriksaan (preset, tiga bentuk `loadEndpoint`); T87 langkah 4 (panel: `cert` diubah → `certs: []` tersimpan) |
| AC-B164#6 | masukan address peserta menjumlahkan artefak di semua lapis; masukan tokenId desimal dikenali di lapis mana pun | **PASS** | `probe` "alamat peserta B153 -> … (≥ 2)", "tokenId desimal milik B153 -> dikenali…" |
| AC-B164#7 | `/app/credentials` (fungsi `readMyCredentials`) menampilkan kolom "Artefak (NFT)": ada (jumlah lapis), belum dicetak, atau gagal dibaca | **PARTIAL** | T87 langkah 3: fungsi dijalankan di dalam halaman dengan alamat akun 1 → kolom ada, "soulbound · 2 lapis". Halaman aslinya di balik login, jadi tidak diamati sebagai pengguna masuk |
| AC-B164#8 | perintah ulang (`cast call … tokenOfCredential`) ada satu per lapis, supaya "belum dicetak" bisa dicek tanpa halaman | **PASS** | `probe` "B153 -> perintah ulang menyertakan satu tokenOfCredential per lapis" |
| AC-B164#9 | kontrak, database, signer, dan `CERT_ADDRESS` tidak disentuh | **PASS** — dibaca dari `git status`: hanya `web/src/{verify,render,i18n,config,main,lesson-views}.ts` dan `web/scripts/probe.ts` | — |
| AC-B164#10 | uji punya gigi: perilaku lama dikembalikan sementara → pemeriksaan merah | **PASS** | `certCandidates` dikembalikan hanya membaca `cert` → **15 merah** dari 173 (termasuk "B153 -> VALID token=null", persis gejala aslinya), lalu dikembalikan → 173 / 0 |
| AC-B164#11 | gerbang | **PASS** 5 Okt malam | `tsc` 0, `probe` **173 / 0** (147 + 26), `build` 0; `npm run audit` bersih (12 pemeriksaan, 0 temuan), `check:labels` hijau 8/0, baterai `sync:numbers` 37 harness · 37 hijau (1.477 pemeriksaan) dan `sync:numbers -- --verify` hijau (70 klaim halaman); 5 skrip vault bersih (`Broken: 0`, `Hazards: 0`, `CJK tokens: 0`, `PASTE HIJAU`) |
| AC-B164#12 | **LIVE:** verifier produksi menampilkan "Minted & Locked" untuk hash B153 tanpa konfigurasi | ~~**OPEN** — menunggu dorongan atas kata builder~~ **PASS** 5 Okt malam — didorong `7259153..a962ff7` atas kata builder ("Kalau udh di push dulu aja", 5 Okt 21.54 WIB); bundel produksi `assets/index-BxD6KH3I.js` sama dengan hasil `npm run build` lokal (869.594 byte) dan memuat teks panel lapis; Chrome 154 bersih membuka verifier produksi untuk hash B153 → TOKEN ID #841214031867952989208…, "🔒 Soulbound (ERC-5192)", "4. Soulbound NFT: Minted & Locked", tiga lapis terdaftar, `localStorage` kosong, galat konsol 0 | T87 §LIVE |

**Batas klaim:** "artefak terbaca di semua lapis yang dikenal" — daftar lapis ada di `CERT_LAYERS_97` (tiga instance di chain 97). Instance baru yang kelak
di-deploy tidak otomatis terbaca; ia harus ditambahkan ke daftar itu. Artefak bukan kredensial dan bukan bukti keberlakuan (C2): kredensialnya tetap dokumen
bertanda tangan + attestation BAS. Satu kredensial kini bisa punya dua token (satu per instance); itu sah secara kontrak dan sekarang terlihat apa adanya di panel.
