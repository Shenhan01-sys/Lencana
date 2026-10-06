---
tags: [acceptance-criteria, B173, video]
status: active
updated: 2026-10-07
---

# AC-B173 - Video pitch 90 detik (motion graphics + frame website imersif, Remotion, bahasa Inggris)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B173 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Rencana:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Keputusan:** D79 di [[00-Overview/03 - Decisions]] · **Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] ·
**Testing:** [[09-Testing/T97 - Uji video pitch 90 detik (B173)]] · **Summary:** menyusul sesudah acc builder atas render final ·
**Terkait:** B65 (rekam + unggah video = aksi builder)

Permintaan builder 7 Okt dini hari: video pitch **±90 detik**, motion graphics yang inklusif sekaligus imersif, banyak
interaksi langsung dengan website Lencana ("immersive frame website lencana di page yang ingin dijelaskan + animasi
immersivenya"), komersial untuk semua orang karena ini consumer app; **Remotion, bukan HyperFrames** (NOTE.txt);
**voice over, caption, dan label berbahasa Inggris**; dikerjakan di `vault/Video-Workspace` dengan workflow vault.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B173#1 | berkas: 1920×1080, 30 fps, H.264 + AAC, durasi **85–95 detik** | **PASS** 7 Okt (draf 2) | T97 §1: 1920×1080 · 30/1 · h264 + aac 48 kHz · 89,10 dtk |
| AC-B173#2 | bahasa: VO, caption, dan semua label layar berbahasa **Inggris**; UI situs direkam dalam mode EN (`?lang=en`); judul kursus boleh tetap berbahasa Indonesia karena materinya memang berbahasa Indonesia | **PASS** 7 Okt — dengan catatan: halaman kelas dan lembar sertifikat produk memang berbahasa Indonesia di UI-nya (tampil ±2 dtk dan ±5 dtk); semua teks yang ditambahkan video berbahasa Inggris | T97 §5; `src/data/script.json` |
| AC-B173#3 | caption tampil untuk **100%** kalimat VO, maksimal dua baris, tinggi huruf ≥ 44 px pada 1080p, kontras teks ≥ 4,5:1 terhadap latarnya | **PASS** 7 Okt | T97 §1: 196 kata dari naskah + timing VO, 46 px, kontras 10,5 / 16,0 / 7,4 : 1 |
| AC-B173#4 | setiap kalimat klaim di naskah dipetakan ke baris [[10-Contributors/Claims-Cheat-Sheet]] atau README; **nol** frasa terlarang (daftar di rencana §9), diperiksa skrip atas teks naskah dan caption | **PASS** 7 Okt — satu klaim salah tertangkap dan diperbaiki saat produksi ("single signature" → "pay by signing — no gas fees") | rencana §3; T97 §1 (1.411 potong teks) + §6 |
| AC-B173#5 | angka di layar dicetak ulang perintahnya **pada hari render**: `platformBps()` = 1000, verdict validator 1EdTech, data ringkasan admin bertanggal; label "testnet", "demo publisher (fictional)", "test token" terbaca di layar | **PASS** 7 Okt — `platformBps` 1000 dibaca dari chain lewat `POST /admin/overview` (bukan `cast call` terpisah) | T97 §4; label di S3/S5/S7 |
| AC-B173#6 | rekaman situs = produk sungguhan: produksi `lencana-psi.vercel.app`, atau build lokal dari commit yang sama dengan backend produksi (commit dicatat); identitas fixture; **tidak ada** API key, private key, atau email orang lain di layar | **PASS** 7 Okt | T97 §5 (tabel asal tiap layar, commit `46ed3eb`) |
| AC-B173#7 | audio: loudness terintegrasi **−14 ± 1 LUFS**, true peak ≤ −1 dBTP; musik turun di bawah VO | **PASS** 7 Okt | T97 §1–§2: −14,0 LUFS · −1,4 dBTP; musik ×0,15 di bawah suara (≈11,5 dB di bawah VO) |
| AC-B173#8 | aman fotosensitif: tidak ada kedipan terang-gelap lebih dari 3 kali per detik (WCAG 2.3.1), diperiksa skrip luminansi per frame | **PASS** 7 Okt (alat diuji jalur merah) | T97 §1 |
| AC-B173#9 | dibangun dengan **Remotion**; source di `vault/Video-Workspace/remotion/`; satu perintah render mereproduksi MP4; bahan referensi, `node_modules`, tangkapan, dan render tidak masuk git | **PASS** 7 Okt | `remotion/README.md`; `.gitignore` (akar + proyek) |
| AC-B173#10 | gerbang B65 tetap berlaku: `npm run e2e` (dan `npm run journey` bila gas testnet cukup) hijau pada hari render | **PASS** 7 Okt — `e2e` **48/0**, `journey` **34/0**; baris uji dibersihkan (`origin=test` sisa 0) | T97 §4 |
| AC-B173#11 | vault ikut selesai: rencana, AC, T97, Summary B173, baris backlog, hub, keputusan diperbarui; `check-links` Broken 0 · `check-mermaid` Hazards 0 · `check-lang` CJK 0 · `check-paste` hijau | TERBUKA (Summary menunggu render final) | keluaran skrip vault |
| AC-B173#12 | builder menyetujui (a) naskah + rencana, (b) still gaya, (c) render draf, (d) render final | (a) **PASS** 7 Okt 03.35 ("Gas" + empat jawaban); (b) dilewati — draf penuh langsung dikirim; (c)(d) TERBUKA | kata builder |
| AC-B173#13 | unggah ke YouTube/portal dan isi form submission — **aksi builder** (B65, B64) | TERBUKA (aksi manusia) | tautan dari builder |

**Batas klaim:** video adalah materi pemasaran untuk produk yang berjalan di **BSC testnet (chain 97)**. Semua kalimat
tunduk pada [[10-Contributors/Claims-Cheat-Sheet]]; yang tidak ada di sana tidak diucapkan. Penerbit di demo adalah penerbit
demo **fiktif** dan token pembayaran adalah token uji — keduanya diberi label di layar.

**Temuan sampingan saat menyiapkan (7 Okt):** `vault/scripts/check-lang.ps1` (1) ikut memindai `node_modules` kit
Motion-as-Code di `Video-Workspace` → 4 token CJK dari README pihak ketiga; kini daftar lewatinya sama dengan `check-links.ps1`;
(2) berkas `.md` satu baris **tidak pernah benar-benar terpindai** (`Get-Content` mengembalikan string, `$lines[0]` = karakter
pertama) — ditemukan oleh uji jalur merah, diperbaiki dengan `@()`. Uji: berkas satu baris dan tiga baris ber-CJK → 2 temuan,
keluar 1; CJK di `node_modules` → tidak dilaporkan; sesudah dibersihkan → `Files scanned: 305 | CJK tokens: 0`, keluar 0.
Setelah proyek Remotion (dengan `node_modules`-nya) masuk `Video-Workspace`, dua penjaga lain ikut tersandung hal yang sama:
`check-links.ps1` bagian wikilink hanya melewati `.obsidian` (bagian tautan md-nya sudah melewati `node_modules`) → 3 wikilink
"rusak" dari README `fast-glob`; `check-mermaid.ps1` → 1 hazard dari README pihak ketiga. Keduanya kini memakai daftar lewati
yang sama. Uji jalur merah: catatan sementara di vault dengan `[[No Such Note Anywhere]]` + `;` di sequenceDiagram → Broken 1 /
Hazards 1, keluar 1; berkas yang sama di `node_modules` → tidak dilaporkan; sesudah dihapus → Broken 0 (3.312 wikilink), Hazards 0 (50 blok).
`signer/scripts/validator-check.js` masih memakai `BASE_URL` bawaan `127.0.0.1:8787` — sejak B156 tidak ada signer lokal, jadi
perintah tanpa `BASE_URL` gagal `ECONNREFUSED`; dijalankan dengan `BASE_URL` host tepi (catatan, belum diubah).
