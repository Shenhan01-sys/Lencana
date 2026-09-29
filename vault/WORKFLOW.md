---

> **Hook (aturan 12 `AGENTS.md`):** langkah 5 belum selesai sampai vault menampilkan angka
> run hari itu. Setiap item yang dianggap beres wajib menutup loop ini — bukan cuma kodenya.
> Kekunoan vault = klaim yang salah pelan-pelan; ukuran terakhirnya ada di baris **B93**
> [[07-Backlog/03 - Findings and Tasks 2026-09-26|status dan tugas terbaru]].
tags: [workflow, concept, global]
---

# 🔄 Global Development Workflow — 5 Langkah Wajib per Item/Fase

> Konsep global untuk pengembangan perangkat lunak berbasis vault/notes sebagai memori proyek. Berlaku untuk stack apa pun (web, mobile, backend). Setiap item/fitur/perbaikan/fase baru **WAJIB** melewati 5 langkah ini **berurutan, tanpa dilewati**. Satu item dianggap selesai hanya setelah langkah 1–4 lengkap, sebelum mulai item berikutnya.

---

## Langkah 1 — EKSEKUSI

1. **Migrasi/skema data dulu** (bila ada perubahan) — terapkan ke environment **SEBELUM** kode yang memakainya live. Konvensi nama: `YYYYMMDD_nama.sql` (atau konvensi migrasi stack-mu).
2. Tulis kode (FE/API/logika).
3. Verifikasi hijau: type-check (0 error) + unit test + build sukses.
4. **COMMIT LOKAL** dengan pesan deskriptif — **JANGAN push dulu**.

## Langkah 2 — SINKRONISASI ACCEPTANCE CRITERIA + BACKLOG

1. Buka dokumen **Acceptance Criteria (AC) per item** — bandingkan butir demi butir terhadap hasil **aktual**:
   - Tandai `PASS / FAIL / BLOCKED` + tanggal + bukti di kolom Status.
2. Bila implementasi **menyimpang** dari keputusan awal → **perbaiki entri backlog secara eksplisit** (bukan diam-diam!). Keputusan user final = tertulis di backlog.
3. Perbarui halaman vault terkait (skema, modul, arsitektur) + **tabel agregat di Hub**.

## Langkah 3 — TEST (tiga lapis), dicatat di file Testing per item

| Lapis | Alat | Cakupan |
|---|---|---|
| **Unit** | test framework stack-mu | logika murni: parser, kalkulator, formatter |
| **Integrasi** | skrip/service-role, lawan environment nyata | RPC/procedure, trigger, RLS/permission dua peran — artefak tes berlabel `TES-` **selalu dibersihkan** + bukti query sisa = 0 |
| **E2E** | panduan langkah-demi-langkah **untuk user** (format checkbox + tabel hasil; KPI mengikuti AC; termasuk uji perangkat fisik bila relevan) | alur nyata end-to-end |

Transkrip keluaran aktual ditempel ke file testing vault — bukan ringkasan ingatan.

## Langkah 4 — EXECUTIVE SUMMARY per item

Isi file `<Item> - Executive Summary.md` dengan format tetap:
1. **Apa yang diubah**
2. **Hasil vs KPI** (angka riil)
3. **Status** (SELESAI / PARSIAL / BLOCKED / LIVE)
4. **Risiko tersisa**
5. **Bukti** (id commit, id tes)

Tambahkan tautan balik di entri backlog + tabel riwayat Hub.

## Langkah 5 — COMMIT & PUSH (aturan pipeline)

- Setiap selesai langkah 1: perubahan kode+migrasi+skrip **di-commit ke branch utama LOKAL saja**, pesan deskriptif.
- **PUSH ke remote (deploy) HANYA setelah user menyetujui** hasil langkah 2–4 (user membaca exec summary + laporan tes).
- **Tanpa persetujuan = diam di lokal, jangan push.**

---

## Aturan Pendukung

1. **Keputusan user final = tertulis eksplisit di backlog.** Deviasi implementasi tanpa update backlog = utang dokumentasi.
2. **Jangan menilai kondisi fisik/perangkat dari foto saja** — minta user menandai foto dengan panah beranotasi (arah keluar, arah target) sebelum debugging hardware.
3. **Ukur fisik per sisi dengan acuan arah** — jangan terima "lebar×tinggi" tanpa acuan; angka yang salah = bolak-balik sia-sia.
4. **Verifikasi batas fisik SEBELUM eksekusi** — kalau permintaan bertentangan dengan batas (resolusi, ukuran, performa), sampaikan dulu, jangan eksekusi lalu gagal.
5. **Trial & error fisik itu valid** — kasih flag/konstanta yang gampang dibalik, buang fitur non-esensial sementara supaya tes fokus satu variabel.
6. **Isolasi variabel dengan test bawaan driver/OS/tool** — memastikan layer mana yang salah sebelum menyentuh kode.
7. **Cek setting pipeline via screenshot** (dialog print/deploy/build) — default tool sering menjadi sumber offset/skala/orientasi yang salah.
8. **Rollback itu murah dan tepat** kalau eksperimen bikin makin kacau — `git reset --hard <commit-terkonfirmasi>` + catat pelajarannya di vault, jangan berjuang memperbaiki di atas kerusakan.
9. **Commit LOKAL dulu, push atas persetujuan** — melindungi produksi dari eksperimen; eksperimen gagal = reset tanpa dampak remote.

## Tandai di kode setiap backlog yang selesai (aturan #18)

Sebelum menutup satu baris backlog: telusuri berkas yang ia sebut, tempel tag satu ID per berkas,
dengan apa yang dijaga + perintah pembuktinya. Contoh tag: `// [B67] SELESAI 2026-09-29 — alarm
eksternal tepi. Buktikan ulang: npm run monitor:edge.` Dua penjaga mengadilinya: `npm run audit`
(A9 — konsistensi tag ↔ baris, dua arah) dan `npm run check:labels` (T29 — kelengkapan: tiap ID
tertutup punya tag atau alasan 'TANPA TAG KODE' yang tertulis di barisnya).

## Struktur Dokumen per-Item (pelengkap)

Dokumen yang tumbuh per-item (AC, testing, exec summary) **WAJIB** pola **Hub + satu file per item**:

- **Hub** (`00 - Hub <Nama>.md`) berisi tabel peta: satu baris per item, menghubungkan backlog ↔ AC ↔ testing ↔ summary.
- **Satu file per item** — satu file = satu konteks.
- **Header tiap file wajib baris peta dua-arah** ke artefak lain; entri backlog juga menunjuk file itemnya.
- **ID stabil** (`E15#3`) konsisten lintas dokumen; ID baru = perbarui peta.
