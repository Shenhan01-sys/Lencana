---
tags: [frontend, certificate-design, S5]
status: draft
updated: 2026-10-05
---

# S5 - Bukti Mentah — desain sertifikat (Data / Terminal)

**Hub:** [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]] · **Berkas:** `vault/03-Frontend/Sertifikat/s5-bukti-mentah.html` · **Backlog:** B163 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]]

## Design brief (doktrin §12)
- **PROCESS:** kredensial diperiksa — hash dibaca, penerima (alamat dompet), kelas, nilai terhadap batas lulus, tiga cek chain yang dibaca 5 Okt 2026, status snapshot, lalu QR untuk status dan tanda tangan terkini.
- **CORE OBJECT:** struk bukti — satu baris perintah yang mencetak keluarannya baris demi baris, ditutup cap BERLAKU yang bertanggal.
- **RELATIONSHIP:** kiri = sertifikat (siapa, kelas apa, seberapa baik, sampai kapan, siapa yang menandatangani) → garis sobek → kanan = potongan bukti (byte hash, cek chain, catatan chain, QR).
- **METAPHOR:** log atas→bawah; nilai = tangga batang blok (ladder); masa berlaku = sumbu waktu (axis); hash = hexdump yang digambar.
- **ENCODING:** x = nilai pada skala 0–100 dengan garis batas lulus 60; tebal = bobot 50/30/20; tinggi + kecerahan = nilai byte hash; posisi penanda = tanggal baca pada sumbu terbit → berlaku sampai; warna = emas untuk sinyal, hijau hanya untuk cek yang lolos.
- **CONTINUOUS:** kursor berkedip di baris perintah; garis pindai samar menyapu atas→bawah; titik di samping QR berdenyut (status terkini ada di balik QR).
- **MICRO-BEAT:** cap "BERLAKU · dibaca 5 Oktober 2026" menghantam sebagai ketukan terakhir, bingkai bergetar, satu kilat emas.
- **TRANSITION:** struktur tampil sejak bingkai 0; nilai menyusul (perintah diketik, gelombang byte, alamat mengendap dari derau hex, batang berpegas, `[ .. ]` → `[ ok ]`); ganti alamat ⇄ nama hanya mengetik ulang blok penerima.
- **ASSETS:** tanpa gambar; semuanya SVG/CSS; logo dan QR dari cangkang; satu-satunya ornamen (peta byte) diturunkan dari hash kredensial ini.
- **COPY:** judul, label bagian, kalimat `TXT.*` wajib, dan beberapa label teknis pendek (lihat bagian Keputusan).

## Sistem visual
- **Tipe:** JetBrains Mono 400/500/700/800 untuk semuanya — judul, isi, dan angka tabular. Cadangan `ui-monospace`/Cascadia/Consolas/Menlo; diuji dengan font Google diblokir, tata letak tetap utuh.
- **Palet:** lembar `#0b0e11`, panel `#181a20`, garis-rambut `#2b313a`, tinta `#eaecef`, redup `#848e9c`, emas `#f0b90b` / `#fcd535` (sinyal utama, bagian lewat batas lulus, cap, bidik), hijau `#0ecb81` (hanya cek lolos dan LULUS). `#f6465d` tidak dipakai.
- **Kedalaman:** datar, hanya garis-rambut (bingkai ganda, kisi, garis bagian). Tanpa bayangan, tanpa gradasi warna.
- **Motif:** garis bagian `── LABEL ───`, braket sudut emas, garis sobek putus-putus di antara sertifikat dan potongan bukti; tekstur garis pindai sangat tipis.
- **Gerak:** masuk — struktur langsung tampil, hanya nilai yang bergerak, selesai dalam rentang 3–3,5 dtk dengan cap sebagai ketukan terakhir (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:280`); berkelanjutan — kursor, sapuan pindai, denyut titik QR; interaksi — sel byte (arahkan atau fokus, panah) dan bidik emas di atas batang yang membaca skala; micro-beat — cap (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:321`). Cetak memakai varian terang hemat tinta (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:335`).

## Yang dikodekan geometri
- Peta byte (kanan atas) → 32 byte `CERT.hash` lewat `HASHART.bytes` → tinggi dan kecerahan batang ∝ nilai byte 0–255, hex tercetak di bawahnya; kredensial lain menghasilkan gambar lain (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:678`).
- Batang Kuis/Esai/Praktik → nilai 75/98/100 dan bobot 50/30/20 → panjang = nilai, tebal = bobot, sehingga luas batang = kontribusinya (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:708`).
- Batang total → kontribusi 37,5 + 29,4 + 20,0 = 86,9 disusun berurutan; garis emas di 60; bagian sesudah 60 diterangkan; angka besar 87 dari `CERT.score` (pembulatan menurut spesifikasi ada di `web/src/score.ts:132`).
- Daftar cek → `CERT.checks` (Attestation BAS: Tercatat; Penerbit terdaftar: Disetujui; Status pencabutan: Bersih), dibaca 5 Okt 2026 → `[ .. ]` berganti `[ ok ]` satu per satu (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:735`).
- Baris tanda tangan → `CERT.proof` → sengaja `[ -- ] Ditandatangani … ↓ QR`, tidak hijau (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:438`).
- Sumbu masa berlaku → terbit 5 Okt 2026, berlaku sampai 5 Okt 2027 (365 hari) → satu tik tiap awal bulan, tik tahun lebih tinggi; penanda di tanggal baca = hari ke-0 karena status dibaca pada hari terbit (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:738`).
- Sidik alamat → `CERT.learner` → kelompok 4 karakter dalam dua baris (gaya sidik jari kunci); pemisah emas tidak ikut tersalin. Mode nama tetap menampilkan alamat pendek dan `TXT.nameNote`.

## Keputusan, batas, dan klaim
**Kalimat dan label baru** (semuanya label teknis; tidak menyatakan keabsahan, identitas, atau status langsung):
- `$ periksa <hash>` — metafora sesi pemeriksaan yang dicetak, bukan perintah CLI yang benar-benar ada.
- "Cek chain · dibaca <tanggal>", "Masa berlaku · 365 hari", "dibaca · hari ke-0", "60 · batas lulus", "lebar = nilai · tebal = bobot", "tinggi batang = nilai byte (0–255)", "format Open Badges 3.0", "32 byte". Lolos aturan klaim: tidak ada "terverifikasi", "resmi", atau "anti-pemalsuan"; BERLAKU selalu bertanggal dan menunjuk ke QR lewat `TXT.statusNote`.
- Tanda tangan diberi `[ -- ]` dan "↓ QR" karena halaman statis ini tidak memeriksa tanda tangan (yang diizinkan hanya "ditandatangani (DataIntegrityProof)").
- Titik berdenyut sengaja ditaruh di samping QR, bukan di samping cap BERLAKU — menyimpang dari brief supaya kertas tidak terkesan memantau status secara langsung.
- Angka yang belum dihitung tampil sebagai `--` selama gerak masuk (konvensi terminal), bukan 0 (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:809`).

**Yang tidak ideal (jujur):**
- Penanda tanggal baca jatuh di hari ke-0, jadi menumpuk dengan tutup kiri sumbu dan batang sisa tampak penuh — benar secara data, lemah secara visual.
- Selama gerak masuk alamat sempat berupa derau hex (efek mengendap); tangkapan layar di tengah gerak bisa memperlihatkan alamat yang salah. Cetak dan `?motion=off` selalu menampilkan alamat asli.
- Bidik emas di atas batang hanya muncul dengan mouse (memakai `--mx/--my` dari cangkang; sentuh dan reduce-motion dilewati).
- Teks terkecil (label hex, huruf bulan, angka skala) tepat di batas 10 px.
- Hanya diuji di Chrome headless (layar lebar, lebar ponsel 390 px lewat iframe, simulasi cetak, font diblokir); Firefox dan Safari belum dilihat langsung.
- Temuan untuk kelima desain: di Chromium, `steps(n, end)` dengan durasi `n × ms` bisa berhenti sedikit di bawah progres 1 sehingga karakter terakhir tidak pernah muncul; S5 memakai `steps(n+1, jump-none)` (`vault/03-Frontend/Sertifikat/s5-bukti-mentah.html:286`). Skrip uji cetak di SPEC melempar SecurityError pada stylesheet Google Fonts (lintas asal) dan perlu `try/catch` per stylesheet.

**Perlu diputuskan builder:**
- Pertahankan atau hapus baris `$ periksa …` (kuat sebagai metafora, tetapi bisa dikira ada alat CLI).
- Cap BERLAKU tetap emas (sekarang) atau hijau seperti cek yang lolos.
- Sumbu masa berlaku tetap memakai tanggal baca sebagai acuan. Acuan "hari ini saat dibuka" akan menjadi klaim status langsung, jadi saran saya tetap snapshot.

## Cara memeriksa
- Buka `vault/03-Frontend/Sertifikat/s5-bukti-mentah.html` langsung di peramban (tanpa server). Gerak masuk berjalan otomatis; tombol "Ulangi gerak" memutarnya lagi.
- Tombol "Alamat dompet" / "Nama contoh": mode nama mengetik ulang nama dalam kurang dari 600 ms dan tetap menampilkan alamat pendek serta catatan nama; kembali ke alamat membuat alamat mengendap ulang.
- Tambahkan `?motion=off` pada URL: keadaan akhir tanpa gerak (sama dengan cetak dan reduce-motion).
- "Cetak / simpan PDF" (A4 lanskap, grafik latar aktif): varian terang hemat tinta, satu halaman, QR tetap di pelat putih.
- Keyboard: Tab ke peta byte, lalu panah/Home/End untuk berpindah sel; pembacaan indeks dan nilai muncul di bawah peta.
