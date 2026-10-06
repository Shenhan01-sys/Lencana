---
tags: [acceptance-criteria, B173, video]
status: active
updated: 2026-10-07
---

# AC-B173 - Video pitch 90 detik (motion graphics + frame website imersif, Remotion, bahasa Inggris)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B173 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Rencana:** [[Video-Workspace/B173 - Rencana Video Pitch 90 detik]] ·
**Keputusan:** D79 di [[00-Overview/03 - Decisions]] · **Klaim:** [[10-Contributors/Claims-Cheat-Sheet]] ·
**Testing / Summary:** menyusul sesudah render pertama (T97, Summary B173) · **Terkait:** B65 (rekam + unggah video = aksi builder)

Permintaan builder 7 Okt dini hari: video pitch **±90 detik**, motion graphics yang inklusif sekaligus imersif, banyak
interaksi langsung dengan website Lencana ("immersive frame website lencana di page yang ingin dijelaskan + animasi
immersivenya"), komersial untuk semua orang karena ini consumer app; **Remotion, bukan HyperFrames** (NOTE.txt);
**voice over, caption, dan label berbahasa Inggris**; dikerjakan di `vault/Video-Workspace` dengan workflow vault.

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B173#1 | berkas: 1920×1080, 30 fps, H.264 + AAC, durasi **85–95 detik** | TERBUKA | keluaran `ffprobe` di T97 |
| AC-B173#2 | bahasa: VO, caption, dan semua label layar berbahasa **Inggris**; UI situs direkam dalam mode EN (`?lang=en`); judul kursus boleh tetap berbahasa Indonesia karena materinya memang berbahasa Indonesia | TERBUKA | daftar caption + tangkapan |
| AC-B173#3 | caption tampil untuk **100%** kalimat VO, maksimal dua baris, tinggi huruf ≥ 44 px pada 1080p, kontras teks ≥ 4,5:1 terhadap latarnya | TERBUKA | pemeriksa caption (skrip) + still |
| AC-B173#4 | setiap kalimat klaim di naskah dipetakan ke baris [[10-Contributors/Claims-Cheat-Sheet]] atau README; **nol** frasa terlarang (daftar di rencana §9), diperiksa skrip atas teks naskah dan caption | TERBUKA | tabel peta klaim di rencana §3 + keluaran skrip |
| AC-B173#5 | angka di layar dicetak ulang perintahnya **pada hari render**: `platformBps()` = 1000 (`cast call`), verdict validator 1EdTech (`npm run validator -- --hash … --record`), data ringkasan admin bertanggal; label "testnet", "demo publisher (fictional)", "test token" terbaca di layar | TERBUKA | keluaran perintah di T97 |
| AC-B173#6 | rekaman situs = produk sungguhan: produksi `lencana-psi.vercel.app`, atau build lokal dari commit yang sama dengan backend produksi (commit dicatat); identitas fixture; **tidak ada** API key, private key, atau email orang lain di layar | TERBUKA | daftar tangkapan + commit + pemeriksaan per still |
| AC-B173#7 | audio: loudness terintegrasi **−14 ± 1 LUFS**, true peak ≤ −1 dBTP; musik turun di bawah VO | TERBUKA | cetakan `ebur128`/`loudnorm` |
| AC-B173#8 | aman fotosensitif: tidak ada kedipan terang-gelap lebih dari 3 kali per detik (WCAG 2.3.1), diperiksa skrip luminansi per frame | TERBUKA | keluaran skrip |
| AC-B173#9 | dibangun dengan **Remotion**; source di `vault/Video-Workspace/remotion/`; satu perintah render mereproduksi MP4; bahan referensi, `node_modules`, tangkapan, dan render tidak masuk git | TERBUKA | `git check-ignore` + perintah render |
| AC-B173#10 | gerbang B65 tetap berlaku: `npm run e2e` (dan `npm run journey` bila gas testnet cukup) hijau pada hari render | TERBUKA | keluaran perintah |
| AC-B173#11 | vault ikut selesai: rencana, AC, T97, Summary B173, baris backlog, hub, keputusan diperbarui; `check-links` Broken 0 · `check-mermaid` Hazards 0 · `check-lang` CJK 0 · `check-paste` hijau | TERBUKA | keluaran skrip vault |
| AC-B173#12 | builder menyetujui (a) naskah + rencana, (b) still gaya, (c) render draf, (d) render final | TERBUKA | kata builder |
| AC-B173#13 | unggah ke YouTube/portal dan isi form submission — **aksi builder** (B65, B64) | TERBUKA (aksi manusia) | tautan dari builder |

**Batas klaim:** video adalah materi pemasaran untuk produk yang berjalan di **BSC testnet (chain 97)**. Semua kalimat
tunduk pada [[10-Contributors/Claims-Cheat-Sheet]]; yang tidak ada di sana tidak diucapkan. Penerbit di demo adalah penerbit
demo **fiktif** dan token pembayaran adalah token uji — keduanya diberi label di layar.

**Temuan sampingan saat menyiapkan (7 Okt):** `vault/scripts/check-lang.ps1` (1) ikut memindai `node_modules` kit
Motion-as-Code di `Video-Workspace` → 4 token CJK dari README pihak ketiga; kini daftar lewatinya sama dengan `check-links.ps1`;
(2) berkas `.md` satu baris **tidak pernah benar-benar terpindai** (`Get-Content` mengembalikan string, `$lines[0]` = karakter
pertama) — ditemukan oleh uji jalur merah, diperbaiki dengan `@()`. Uji: berkas satu baris dan tiga baris ber-CJK → 2 temuan,
keluar 1; CJK di `node_modules` → tidak dilaporkan; sesudah dibersihkan → `Files scanned: 305 | CJK tokens: 0`, keluar 0.
