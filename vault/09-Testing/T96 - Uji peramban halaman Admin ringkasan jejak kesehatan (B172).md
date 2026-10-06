---
tags: [testing, "T96"]
status: active
updated: 2026-10-06
command: signer lokal 127.0.0.1:8787 (`LANCENA_ORIGIN=test`, `ADMIN_ADDRESSES` = akun uji acak) + vite sementara 127.0.0.1:5174 (`VITE_SIGNER_URL` ke signer lokal); Chrome 154 headless via `puppeteer-core`; identitas admin lewat server kunci sekali-pakai 127.0.0.1:8999 (kunci dihapus sesudah uji); data nyata dari database produksi (hanya dibaca), satu pengajuan uji `origin=test` dibuat lalu dihapus
measured: 2026-10-06
result: HALAMAN ADMIN EMPAT TAB TERUJI — Ringkasan (kartu statistik + bar bertumpuk), Persetujuan (setujui lewat dialog izin berfungsi), Jejak (garis waktu, penandatangan dipulihkan, bukti terbuka), Kesehatan (gauge saldo + kuota, status layanan); ponsel 390 px tanpa gulir samping; nol galat konsol
---

# T96 - Uji peramban halaman Admin: ringkasan, jejak, kesehatan (B172)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B172 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **AC:** [[07-Backlog/Acceptance-Criteria/AC-B172 - Halaman Admin ringkasan jejak kesehatan]] · **Summary:** [[08-Results/B172 - Executive Summary]]

## Cara mengulang

1. Signer lokal berkode terbaru: `cd signer && LANCENA_ORIGIN=test ADMIN_ADDRESSES=<alamat uji> PORT=8787 npx tsx src/server.js`; vite: `cd web && VITE_SIGNER_URL=http://127.0.0.1:8787 npx vite --port 5174 --strictPort --host 127.0.0.1`.
2. Server kunci sekali-pakai 127.0.0.1:8999 menyerahkan identitas admin uji ke halaman lalu mati (skrip alat sesi, tidak dikomit); satu pengajuan uji dikirim dengan kunci acak.
3. Skrip puppeteer (alat sesi) `b174-admin.mjs`: membuka `#/app/admin`, membaca DOM tiap tab, menyetujui pengajuan uji lewat dialog, mengambil tangkapan layar desktop dan 390 px.

## Hasil 6 Okt malam

| # | langkah | hasil |
|---|---|---|
| 1 | judul dan tab | h1 "Admin Lencana"; empat tab Ringkasan · Persetujuan · Jejak · Kesehatan; Ringkasan terpilih; lencana jumlah pada Persetujuan (1 saat ada pengajuan, 0 sesudah diputuskan) |
| 2 | Ringkasan: kartu | Anggota penerbit, Pengajuan menunggu (bertepi jingga bila > 0), Kursus 8 (7 terdaftar), Peserta 10, Kotor 27 LDC-demo, Tagihan agen jatuh tempo 2 (0,0052 LDC-demo), Agen dikenal 6, Sewa agen 3, Pengesah ditunjuk 5; spanduk "1 pengajuan menunggu keputusanmu" + tombol Tinjau |
| 3 | Ringkasan: bentuk | bar Pendaftaran (13: berbayar 3 / gratis 10, lebar segmen sebanding), bar pembagian order lunas (Bagian Lencana 10% = 2,7 LDC-demo, Bersih penerbit 24,3 LDC-demo; legenda memakai satuan token, bukan satuan terkecil), bar Alur esai (menunggu pengesah 3, disahkan 1, disesuaikan 3, dinilai langsung 2) |
| 4 | Persetujuan | satu pengajuan uji: tombol Setujui membuka dialog izin (4 kotak), Tanda tangan & setujui → pengajuan hilang, anggota bertambah, lencana 0 |
| 5 | Jejak | garis waktu 3 kejadian nyata: Dicabut `0x632D…38AF` oleh kunci penerbit (pencabutan hak akun shenhan604 malam itu), dua Disetujui (wewenang tercantum sebagai chip); "Bukti" terbuka menampilkan pesan `lencana-member revoke member=… nonce=…`, penandatangan terpulihkan = `0x8211…F7DE` (kunci penerbit), dan tanda tangan; baris uji (pengajuan uji) tidak tampil |
| 6 | Kesehatan | gauge Dompet deployer 0,4853 tBNB (hijau, "Cukup · rendah di bawah 0,0200"), tiga gauge kuota 0/200 (faucet), 0/30 (gas), 0/60 (cetak) — arc kosong tidak menggambar titik; layanan: Database Baik, RPC chain 97 Baik (±300 ms), Kursus berbayar Menyala, Akun admin 1, Server berjalan sejak |
| 7 | ponsel 390 px | tab dua baris tanpa terpotong, kartu satu–dua kolom, bar dan legenda membungkus, tanpa gulir samping |
| 8 | galat | `pageerror` dan `console.error`: **0** |
| 9 | harness | `verify:publisher` **97 / 0** (89 + 8 cek B172: bentuk ringkasan, jejak dengan baris uji, penandatangan admin, urutan + bukti, penyaringan baris uji, kesehatan, `buildTrail` pesan diubah, bukan admin tanpa isi) |

Tangkapan layar (alat sesi): `b174-summary`, `b174-approve`, `b174-trail`, `b174-health`, `b174-summary-mobile`, `b174-health-mobile`.

## Temuan saat uji (sudah dibetulkan)

- Legenda bagian uang menampilkan satuan terkecil (`2700000`) di samping jumlah berformat → ditambah `shown` pada segmen bar.
- Kartu tagihan memecah "LDC-demo" di tengah kata → angka besar = jumlah, satuan pindah ke keterangan.
- Gauge kuota 0 menggambar titik (ujung garis bulat panjang 0) → kelas `zero` menyembunyikan busur.
- Kartu dompet deployer sendirian terlalu lebar → digabung dengan tiga kuota dalam satu baris gauge.
- Cek harness "tidak ada alamat admin di respons" salah cakup (jejak memang memuat alamat penandatangan) → dipersempit ke blok `health`.

## Batas

- Diuji dengan signer lokal berkode baru; produksi baru memuat kode ini sesudah dorongan (AC-B172#10).
- Satu pengajuan uji dibuat dan dihapus dari database (`cleanup` sisa 0); baris uji sengaja tidak tampil di jejak, sehingga persetujuan uji itu tidak terlihat di Jejak.
- Chrome 154 saja; penghitung angka hanya animasi tampilan (teks akhir selalu ada di DOM, dilewati bila `prefers-reduced-motion`).
