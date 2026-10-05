---
tags: [testing, "T77"]
status: active
updated: 2026-10-05
command: vite dev + signer demo lokal + Chromium headless; iframe 375×812, 1000 px, dan 1440 px; peserta sekali-pakai terdaftar di uji-bayar-2026 + web3-dasar-2026
measured: 2026-10-05
result: RUANG KELAS BISA DIPAKAI PENUH DARI HP — 10 halaman kelas di dua kursus tanpa luapan, kurikulum jadi laci, kuis dinilai server dan esai terkirim dari 375 px; tablet dua kolom; desktop tiga kolom tidak berubah; 3 cacat ditemukan dan ditutup
---

# T77 - Uji peramban ruang kelas di HP (B151)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B151 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Untuk pemelihara front-end:** OI-31 di [[10-Contributors/Open-Items-for-Dave]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B151 - Ruang kelas di HP]] · **Summary:** [[08-Results/B151 - Executive Summary]]

Pertanyaan yang diuji: sesudah `web/src/pages/class.css` (baru) dan perubahan kecil di `web/src/pages/class.ts`, apakah
peserta bisa belajar penuh dari layar HP di `#/class/<kursus>` — membaca, berpindah lesson lewat kurikulum, mengerjakan
kuis, dan mengirim esai — tanpa isi yang terdorong keluar layar, dan apakah tablet serta desktop tetap waras.

## Cara mengulang

1. `cd web && npm run dev` (5173); `cd signer && LANCENA_ORIGIN=demo npm run serve` (8787).
2. Peserta sekali-pakai dibuat dan didaftarkan ke `uji-bayar-2026` dan `web3-dasar-2026` lewat signer penyemai sementara
   (`LANCENA_ORIGIN=demo`, `ENROLL_PAYWALL=off`, port 8791), dengan skrip di luar repo. Kuncinya hanya di berkas scratchpad
   dan diserahkan ke halaman lewat server `127.0.0.1` sekali pakai; tidak dicetak.
3. Halaman dimuat di iframe dari asal yang sama (Chromium headless tidak bisa lebih sempit dari 500 px), dimuat penuh per
   rute. Audit per halaman: elemen terlihat yang melewati tepi kiri/kanan layar (laci kurikulum yang tertutup tidak dihitung).

## Hasil 5 Okt

**Sebelum B151 (audit 375 px 5 Okt):** kurikulum 320 px + rail 240 px tetap berdampingan, isi lesson di luar layar ke
kanan, bilah atas pecah per kata; 30–31 elemen melewati layar di `uji-bayar-2026` dan `web3-dasar-2026`.

| # | halaman / langkah (375 px kecuali disebut) | hasil |
|---|---|---|
| 1 | ringkasan `uji-bayar-2026` | **0** luapan; bilah atas 56 px: ←, judul kursus terpotong, "0%" + bar kecil, tombol **Kurikulum**; kurikulum `position: fixed` + `visibility: hidden` (tidak tercapai Tab); rail tidak tampil |
| 2 | 9 halaman lain: bacaan, kuis, praktik, esai `uji-bayar-2026`; ringkasan, bacaan, kuis, praktik, studi kasus, esai `web3-dasar-2026` | **0** luapan di setiap halaman |
| 3 | buka Kurikulum di halaman lesson | laci 0–323 px setinggi layar, latar gelap, gulir halaman terkunci; fokus ke lesson yang sedang dibuka; kaki laci: alamat ringkas + "Belajar & kredensialku" (pengganti grup alamat di bilah atas) |
| 4 | pilih lesson Esai dari laci | rute `…/esai-pembayaranmu`, laci tertutup, kunci gulir lepas |
| 5 | Esc · ketuk latar | tertutup, kunci gulir lepas; Esc mengembalikan fokus ke tombol Kurikulum (tombol × hanya dipakai menutup laci di sela langkah, tanpa diukur tersendiri) |
| 6 | "Belajar & kredensialku" dari laci | `#/app`, kunci gulir lepas (tidak terbawa ke dasbor) |
| 7 | kuis `kuis-pembayaran`: 4 jawaban dipilih, kirim | dinilai server: **"1/4 benar = 25 · terbaik 25 · ambang 75"**, tercatat di penerbit; tombol kirim 328 px; tetap 0 luapan sesudah hasil tampil |
| 8 | esai `esai-pembayaranmu`: 121 kata, kirim | **"Terkirim ke penerbit · 2/5 tanda mekanis terpenuhi · 121 kata"**; area tulis 328 px; bilah atas tetap menempel di atas saat digulir (`top: 0` di gulir 1190 px) |
| 9 | tombol Sebelumnya / Selanjutnya | **159 / 159 px**, tinggi 48 px |
| 10 | 1000 px (tablet), kuis `web3-dasar-2026` | kurikulum kolom 0–320, isi 320–985, rail disembunyikan, tombol Kurikulum tidak tampil, 0 luapan |
| 11 | 1440 px (desktop), halaman yang sama | tiga kolom tetap: kurikulum 0–320, isi 320–1185, rail 1185–1425; bilah atas 64 px dengan teks lengkap; tombol Kurikulum, ×, kaki laci, latar `display: none`; judul 40 px; pager flex |

**Cacat yang ditemukan uji ini (ditutup):**
1. Fokus saat laci dibuka jatuh ke tombol × walau ada lesson aktif — `querySelector` dengan daftar selektor mengambil
   urutan dokumen. Kini lesson aktif dicari lebih dulu.
2. Lesson aktif tetap tidak bisa difokus (fokus jatuh ke `body`): `.lesson-item` di `style.css` punya `transition: all`,
   jadi `visibility` yang diwarisi dari laci ikut ditransisikan dan item masih `hidden` saat laci baru dibuka. Di HP
   transisinya dibatasi ke warna/border/bayangan.
3. Dua tombol pager tidak sama lebar (174 vs 144 px): dengan flex, padding tombol "Sebelumnya" menahan basisnya. Kini grid
   dua kolom.

**Temuan lama yang terlihat dan ikut ditutup:** tautan kursus di breadcrumb lesson tampil biru bergaris bawah bawaan
peramban di atas tema gelap, di desktop dan HP. Kini abu seperti teks breadcrumb, emas saat disorot (berlaku di semua lebar).

**Gerbang 5 Okt:** `npm run build` (tsc + vite) exit 0; `npm run probe` **118 / 0**.

## Batas

- Iframe di Chromium headless, bukan HP sungguhan; builder melihatnya di HP sendiri.
- Identitas uji memakai kunci perangkat, bukan login Privy builder.
- Praktik tidak dikirim dari halaman (formulirnya memang belum ada — OI-20); yang diuji tata letaknya.
- Desktop dibandingkan lewat ukuran dan computed style elemen kunci serta tangkapan layar, bukan perbandingan computed
  style semua elemen terhadap HEAD.

## Bersih-bersih

Saringan persis (alamat peserta uji + `origin=demo`) menghapus 2 enrollment, 2 usaha, 1 submission esai, dan 9 komponen
nilai; `account_roles` dan `learner_accounts` untuk alamat itu memang 0. Kueri ulang: enrollment 0, usaha 0, submission 0.
Berkas kunci peserta dihapus; peramban ditutup sesudah penyimpanannya dikosongkan.
