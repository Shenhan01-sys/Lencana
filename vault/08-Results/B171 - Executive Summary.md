---
tags: [results, executive-summary, B171]
status: active
updated: 2026-10-06
---

# B171 - Executive Summary — jalur baca dokumen edge berlapis (ISP memblokir `*.workers.dev`)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B171 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B171 - Jalur baca dokumen edge berlapis]] · **Testing:** [[09-Testing/T94 - Uji peramban jalur baca edge berlapis, ISP memblokir workers.dev (B171)]] (+ grup B171 di `probe`)

Temuan 6 Okt siang saat `verify:mint:live` dan baterai: host edge `lencana-edge…workers.dev` tidak terjangkau dari mesin builder. Diagnosis (T94): DNS XL Axiata mengalihkan **semua** `*.workers.dev` ke `blockpage.xlaxiata.id`; edge sehat, Cloudflare/IP tidak diblokir,
`vercel.app`, `up.railway.app`, RPC lolos. Efeknya untuk pengguna dan juri di ISP serupa: lembar sertifikat dan audit spesifikasi gagal mengambil dokumen. Builder mengonfirmasi dengan menyalakan WARP (edge 200). Sebab listingnya tidak diketahui.

## 1. Apa yang diubah

- **`web/src/edge-fallback.ts`:** setiap `GET` ke host edge ditembakkan serentak ke proxy same-origin `/edge/<path>` dan ke host edge langsung; yang berguna (2xx, bukan HTML) duluan dipakai, yang lain dibatalkan. Gagal semua → jawaban HTTP nyata bila ada (404 "tidak tersaji"), atau `TypeError` yang menyebut kemungkinan blokir ISP. Batas 15 dtk per jalur.
- **`vercel.json`:** `rewrites` `/edge/:path*` → host edge, sebelum catch-all SPA.
- **`main.ts`:** +1 import +1 panggilan `installEdgeFallback()` (berkas milik maintainer; hanya tambahan). **Lembar sertifikat:** tombol **Coba lagi** pada keadaan gagal ambil dokumen.
- **Tidak** disentuh: edge Worker, kontrak, signer, dokumen bertanda tangan (`id` tetap host edge).

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| lembar B153 saat `workers.dev` diblokir (disimulasikan) | gagal ("Failed to fetch") | termuat lewat proxy (T94 langkah 2) |
| audit spesifikasi saat diblokir | tidak bisa membaca dokumen | **14 / 14** sama dengan normal (T94 langkah 4) |
| pesan saat semua jalur gagal | "Failed to fetch" | petunjuk blokir ISP/DNS + tombol Coba lagi tanpa muat ulang |
| `probe` · `tsc` · `build` | 253/0 · 0 · 0 | **267/0** (+14) · 0 · 0 |

## 3. Status

**SELESAI · LIVE** — didorong `4a2026f..bed52bd` 6 Okt; AC-B171#14 PASS (produksi `lencana-psi.vercel.app/edge/healthz` 200 JSON edge; dokumen B153 dan kredensial uji baru lewat `/edge/credentials/<hash>` 200; Chrome terhadap produksi dengan `workers.dev` digagalkan: lembar B153 termuat, audit spesifikasi **14 / 14**, semua GET edge (dokumen, status list, healthz) lewat proxy Vercel sungguhan, nol galat). AC-B171#15 (uji di jaringan yang benar-benar memblokir, oleh builder dengan WARP dimatikan) OPEN.

## 4. Risiko tersisa

- **Bila `vercel.app` ikut diblokir di suatu jaringan, jalur langsung tetap jadi satu-satunya** (dan sebaliknya). Dua domain diblokir sekaligus tidak tertolong; penutup yang lebih kuat adalah domain sendiri di depan Worker (butuh domain, belum dikerjakan).
- ~~Rewrite Vercel ke alamat luar baru terbukti sesudah dorongan~~ **Terbukti 6 Okt di produksi** (lihat §3); di uji peramban lokal proxy dijawab intersepsi.
- Klaim "halaman membaca chain langsung, tanpa backend kami di jalur verifikasi" tetap benar untuk **status** (RPC publik); dokumen dan daftar status dari edge kini bisa lewat Vercel — integritasnya tetap dari tanda tangan, bukan jalur baca.
- Sebab ISP memblokir `*.workers.dev` tidak diketahui (cek TrustPositif / tanya XL / uji ISP lain belum dilakukan); blokirnya intermiten.
- **Efek samping lain hari ini, selesai:** kredensial uji `verify:mint:live` dipublish ke tepi atas acc builder 6 Okt (`publish:edge` 106/107 rute terbaca benar; sisanya keadaan korpus lama: kursus `pengantar-defi-2026` tidak ada di MANIFESTS); `verify:edge` hijau 10/0, 32 dari 32; `/s/<hash>` untuk kredensial itu 200.

## 5. Bukti

T94 (pengukuran DNS + 5 langkah peramban), `probe` grup B171 (14 pemeriksaan + uji negatif), `web/src/edge-fallback.ts`, `vercel.json`, `web/src/pages/certificate-view.ts` (Coba lagi).
