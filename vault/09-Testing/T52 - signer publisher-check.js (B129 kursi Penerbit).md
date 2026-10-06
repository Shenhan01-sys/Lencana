---
tags: [testing, "T52"]
status: active
updated: 2026-10-06
command: npm run verify:publisher
measured: 2026-10-03
result: KURSI PENERBIT HIJAU — 89 pemeriksaan / 0 gagal (6 Okt malam: 67 sesudah Alur esai, +16 grup G admin Lencana D76, +6 admin-saja D77; uji negatif tiap grup merah lalu hijau; 3 Okt, sesudah B131 +4 pemeriksaan; 2 Okt, B129 53 / 0 — run pertama 51 / 0 hijau, +2 sesudah aturan "menunggu pengesahan" disamakan dengan view gerbang 0009)
---

> **5 Okt, koreksi prasyarat (Kelas Uji dipakai alur nyata):** baterai penuh 5 Okt siang menjadikan `verify:publisher` **merah 57 / 1** — satu-satunya
> yang gagal: "`uji-bayar-2026` belum punya agen penilai sebelum harness → `["2549"]`". Sebabnya data, bukan kode: harness ini memakai Kelas Uji sebagai
> kursus sandbox (kelas uji, `unlisted`), dan hari itu builder memakainya untuk alur nyata (sewa #2549 oleh akun 1, pengesah #2547). **Bukti bahwa data nyata
> tidak tersentuh:** bersih-bersih (bagian F) hanya menghapus baris milik anggota uji (`hired_by` / `added_by` ∈ anggota uji); baris `agent_hires` #2549 dan
> `review_roles` #2547 untuk `uji-bayar-2026` dibaca ulang sesudah baterai dan sesudah dua run harness: utuh. **Perbaikan:** prasyarat dikoreksi, bukan dihapus —
> dari "kursus tanpa penilai sama sekali" menjadi "agen yang akan disewa (#2534) dan ditunjuk (#2542) belum menempel", karena itu yang benar-benar dibutuhkan
> langkah di bawahnya (sewa yang ditolak karena agen sudah menempel akan merah karena sebab yang salah). Kontrol negatif (ekspresi yang sama, lima masukan):
> data nyata → lolos, kursus kosong → lolos, tanpa baris kursus → lolos, #2534 sudah disewa → **gagal**, #2542 sudah ditunjuk → **gagal**. Hasil: `verify:publisher`
> **57 / 0** (5 Okt). Berkas: `signer/scripts/publisher-check.js` (satu pemeriksaan; teks pemeriksaan berubah, jumlah pemeriksaan tetap 57).
>
> **3 Okt, B131 (D66):** satu akun nyata = satu peran. Kunci pemilik agen tim berperan Agent Owner, jadi tidak bisa diberi
> keanggotaan. Supaya aturan "anggota tidak menyewa/menunjuk agennya sendiri" tetap teruji (aturan itu masih berlaku untuk akun
> dev), harness ini menjadikan kedua kunci itu **akun dev selama run** (+2 pemeriksaan) dan menghapus tandanya di F (+1:
> `account_roles` sisa 0). Pengajuan pertama pemohon kini juga mencatat peran Penerbit (+1). Lihat
> [[09-Testing/T56 - signer account-check.js (B131 satu akun satu peran)]]: harness ini tidak boleh berjalan bersamaan dengan
> harness lain yang memakai kunci tim yang sama.

# T52 - signer publisher-check.js — B129: kursi Penerbit end-to-end

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B129 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B129 - Kursi Penerbit, pengajuan anggota, dasbor penerbit]] ·
**Uji peramban:** [[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]] · **Summary:** [[08-Results/B129 - Executive Summary]] ·
**Keputusan:** D64

`signer/scripts/publisher-check.js`, dijalankan `npm run verify:publisher` (di `signer/`). Prasyarat: `SUPABASE_URL` + secret key,
`ISSUER_PRIVATE_KEY`/`ISSUER_ADDRESS`, `RPC_URL`, `SPLIT_ADDRESS`, `DEMO_TOKEN_ADDRESS`, dan kunci kedua Agent Owner demo.
Server sendiri di port bebas dengan `LANCENA_ORIGIN=test`. Aksi agen memakai kelas uji `uji-bayar-2026` (unlisted) supaya sewa dan
penunjukan demo di `web3-dasar-2026` tidak tersentuh. Bagian F menghapus setiap baris buatan harness di empat tabel lalu menghitung
ulang sisanya.

| bagian | yang dibuktikan |
|---|---|
| A — pengajuan | pesan menyebut penerbit lain → 400; kunci lain atas nama akun → 401; catatan > 280 karakter → 400; pengajuan sah → 201 `pending` dengan catatan; pengajuan kedua selagi menunggu → 409 + menunjuk yang ada; `/me/roles` tetap peserta saja dengan status `pending`; dasbor → 403 (pengajuan tidak memberi kursi); tolak bertanda tangan kunci lain → 401; tolak oleh kunci penerbit → `rejected`; tolak lagi → 400; ajukan lagi → 201; hibah kunci penerbit → 200 dan **menutup pengajuan itu** (`approvedRequest`); `/me/roles` → `via member`; anggota mengajukan lagi → 409 |
| B — dasbor | tanpa pesan → 400; tanda tangan keperluan lain → 400; kunci lain → 401; akun tanpa kursi → 403; anggota → 200 dengan penerbit + kursi pembacanya; satu baris per kursus manifest (8); `platformBps` = nilai yang dibaca harness sendiri dari `SettlementSplit` (1000); platform + bersih = kotor; platform = kotor × bps / 10000 (pembulatan ke bawah seperti kontrak); jumlah per kursus = total; total = jumlah order lunas yang terdaftar, tiap order membawa tx 32 byte; tanpa baris `origin=test` kecuali diminta; `includeTest` tidak mengurangi; alur esai lengkap kategorinya; "menunggu pengesahan" hanya usulan model/agen dan nilai langsung kunci penerbit tidak ikut (aturan view gerbang `0009`); tidak ada `body`/`answer`/`signature`/`message` di jawaban; tim mencantumkan anggota dengan wewenangnya |
| C — sewa oleh anggota | ~~`uji-bayar-2026` belum punya agen penilai sebelum harness~~ *(koreksi 5 Okt, lihat catatan di bawah)* `uji-bayar-2026`: agen yang akan disewa (#2534) dan ditunjuk (#2542) belum menempel sebelum harness; anggota tanpa `hire=1` → 403; bukan anggota → 403; pesan tanpa agentId → 401; kunci lain → 401; Agent Owner #2534 sebagai anggota menyewa agennya sendiri → **422**; anggota `hire=1` menyewa #2534 → 200, `hiredBy` = anggota; dasbor menandai sewa itu `byMember` |
| D — tunjuk oleh anggota | dompet #2542 dibaca dari registry; anggota tanpa `appoint=1` → 403; Agent Owner #2542 menunjuk agennya sendiri → **422**; aturan B120 tetap: penilai kursus ini (#2534) tidak bisa jadi pengesahnya → 422; anggota `appoint=1` menunjuk #2542 → 200, `addedBy` = anggota; dasbor menandainya; baris kursus memuat penilai #2534 + pengesah `agent:2542` |
| F — bersih-bersih | `review_roles`, `agent_hires`, `publisher_members`, `member_requests`: baris uji dihapus, sisa 0 (kueri ulang) |

```
KURSI PENERBIT HIJAU — 51 pemeriksaan, 0 gagal          (B129, run pertama, 2 Okt)
KURSI PENERBIT HIJAU — 53 pemeriksaan, 0 gagal          (sesudah aturan "menunggu pengesahan" = view gerbang 0009)
KURSI PENERBIT HIJAU — 89 pemeriksaan, 0 gagal          (6 Okt malam: grup G admin Lencana D76 + admin-saja D77; run penuh ke-9)
```

**Kenapa ada dua pemeriksaan tambahan.** Uji peramban [[09-Testing/T53 - Uji peramban dasbor penerbit (B129)]] memperlihatkan
"5 esai menunggu pengesahan" sementara hitungan database memberi 3: dua esai dinilai langsung oleh kunci penerbit (tanpa model),
dan view gerbang di `supabase/migrations/0009_judgement_reviews.sql` tidak menahan nilai seperti itu. Dasbor kini memakai aturan
yang sama, dan harness menuntutnya — angka "menunggu" yang lebih besar dari kenyataan adalah klaim yang salah, bukan kehati-hatian.

Regresi harness lama sesudah `hireAgent`/`addReviewer`/`grantMember` berubah: `verify:agents` 34/0 dan `verify:roles` 39/0 (2 Okt).
Yang tidak diuji di sini: halaman (T53), login sungguhan, pembayaran tagihan agen (tetap kunci penerbit, `verify:agents:live`).
