---
tags: [testing, "T72"]
status: active
updated: 2026-10-04
command: npm run check:contexts · npm run check:contexts -- --online · npm run contexts:fetch
measured: 2026-10-04
result: KONTEKS JSON-LD HIJAU — 23 pemeriksaan / 0 gagal (4 Okt, B148; run pertama 23 / 0 hijau)
---

# T72 - signer contexts-check.js — B148: konteks JSON-LD dari salinan repo

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B148 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Terkait:** [[09-Testing/T7 - signer check.js]] (dijalankan dengan host konteks diblokir)

Pertanyaan yang diuji: apakah menandatangani dan memverifikasi kertas masih bergantung pada `w3.org`, `w3id.org`, dan
`purl.imsglobal.org`. Sampai 4 Okt jawabannya ya. Pemuat bawaan `jsonld` tidak punya cache, sehingga satu run `check.js`
mengambil `credentials/v2` 41 kali. Konteks Open Badges butuh 2–7,7 detik per permintaan dan sesekali melewati batas 10 detik:
`check.js` gagal 2 dari 4 run malam itu (rincian di baris B148).

`signer/scripts/contexts-check.js`, dijalankan `npm run check:contexts` (di `signer/`), ikut baterai murah `npm run sync:numbers`.
Tanpa kunci, tanpa database, tanpa gas. Setiap `fetch` ke host konteks **diblokir dan dihitung** oleh penjaga yang dipasang
sebelum modul signer dimuat, jadi "lolos" berarti benar-benar tanpa situs itu.

| bagian | yang dibuktikan |
|---|---|
| A — salinan | manifest memuat tepat keempat URL (VC 2.0, OB 3.0.3, Data Integrity v2, Multikey v1); isi tiap berkas = sha256 di manifest, `documentUrl` tercatat; salinan yang diubah satu istilah → proses anak gagal dan menyebut berkasnya (diuji di direktori sementara lewat `LANCENA_CONTEXTS_DIR`) |
| B — pemuat | keempat URL dilayani dari memori dengan `documentUrl` manifest (dua `w3id.org` = URL sesudah pengalihan ke `w3.org/2025/credentials/vcdi/…`); jawaban adalah salinan — diubah pemanggil, sumbernya tetap; 0 permintaan ke host konteks |
| C — tanda tangan | kertas contoh (VC 2.0 + OB 3.0.3) ditandatangani dan diverifikasi tanpa jaringan; kertas yang diubah → ditolak; 0 permintaan |
| D — kertas lama | setiap kertas di store lokal (`signer/.store`) diverifikasi ulang dengan salinan, kunci publik dari `.keys/` — bukti bahwa salinan = konteks yang dulu dipakai menandatanganinya; store kosong (clone baru) = dilewati, bukan lolos |
| E — cache disk | server lokal: konteks diambil sekali lalu dipakai ulang oleh pemuat baru (= proses baru), berkas cache rusak diambil ulang, URL di luar daftar selalu dari jaringan dan tidak pernah disimpan; daftar host bawaan memuat host konteks dan TIDAK memuat host dokumen penerbit |

## Hasil (4 Okt malam)

```
KONTEKS JSON-LD HIJAU — 23 pemeriksaan, 0 gagal
```

- Bagian D: **30 kertas di store · 30 dengan kunci di `.keys/` · 30 dari 30 terverifikasi** dengan salinan.
- **`-- --online`** (tidak masuk baterai): keempat salinan **SAMA** dengan versi online (isi + `documentUrl`); kanonisasi kertas
  contoh dengan pemuat online = dengan salinan (**34 quad**). Konteks OB butuh 5.042 ms di run itu.
- **`npm run contexts:fetch`** sesudah `--apply`: "SALINAN SAMA dengan versi online".
- **Uji negatif** (aturan vault #14): salinan OB dihapus dari manifest di direktori sementara → **KONTEKS JSON-LD MERAH — 19 pemeriksaan,
  6 gagal**; penjaga menangkap pemuat yang mencoba ke `purl.imsglobal.org`, tanda tangan gagal, store 0 dari 30.
- **`check.js` dengan setiap `fetch` ke host konteks diblokir** (pemblokir dimuat lewat `node --import`, kode repo tidak disentuh):
  **CHECK HIJAU 114/0**, 0 percobaan ke host konteks. Sebelum B148, satu run yang lolos mengirim 44 permintaan
  (41 `credentials/v2` + 3 OB).
- Signer demo sesudah dinyalakan ulang mencatat "konteks JSON-LD: 4 salinan dimuat dari signer/contexts (sha256 cocok)".
- **Baterai `sync:numbers` 5 Okt 00.03 WIB: 35 harness · 35 hijau** (`check:contexts` 23/0 ikut di dalamnya; `check.js` 114/0,
  `serve-probe` 50/0, `cleanup` 6/0). Dua run baterai sebelumnya tidak dipakai, dan sebabnya dicatat di baris B148: proses node
  baterai yang dihentikan tetap hidup lalu menulis `numbers.json` berisi galat, dan `serve-probe` merah karena signer :8787 mati.

**Batas klaim:** yang tidak lagi butuh jaringan adalah konteks. Dokumen kunci penerbit lain tetap diambil dari jaringan
setiap kali, dengan sengaja, karena kunci yang dicabut harus segera berhenti diterima. Bagian D hanya mencakup kertas yang
ada di store mesin ini. Kertas di tepi diverifikasi oleh `verify:edge` / `verify:live-cert` di baterai yang sama. Salinan
dipaku pada isi 4 Okt; kalau W3C atau 1EdTech mengubah dokumennya, `-- --online` yang memberi tahu, dan salinan baru dipasang
lewat `contexts:fetch -- --apply` yang diikuti `check:contexts`.
