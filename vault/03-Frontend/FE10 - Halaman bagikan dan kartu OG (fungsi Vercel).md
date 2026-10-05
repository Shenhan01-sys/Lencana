---
tags: [frontend, "FE10", share, vercel]
status: built-local
updated: 2026-10-06
---

# FE10 - Halaman bagikan dan kartu OG (fungsi Vercel)

**Part of:** [[03-Frontend/01 - Frontend]] · **Backlog:** B168 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B168 - Bukti NFT dan kit LinkedIn]] · **Testing:** [[09-Testing/T91 - Uji peramban bukti NFT dan bagikan ke LinkedIn (B168)]] ·
**Sisi app:** [[03-Frontend/FE9 - Credentials page and certificate sheet]]

Dua fungsi Vercel yang membuat tautan LinkedIn per sertifikat punya **pratinjau yang benar**. Masalahnya: perayap LinkedIn membaca **HTML mentah** (tag Open Graph) tanpa menjalankan JavaScript, sedangkan
verifier adalah SPA dengan hash route — `web/index.html` tidak punya tag `og:*` dan bagian `#/verify` tidak pernah dikirim ke server. Jadi setiap sertifikat dapat halaman sendiri di server.

## Peta

| berkas | isi |
|---|---|
| `vercel.json` | rute `/s/:hash/card.png` → `/api/card?hash=:hash`, `/s/:hash` → `/api/share?hash=:hash`, lalu SPA; `functions` (`maxDuration`, `includeFiles` untuk font); `installCommand` memasang `web/` **dan** `api/` |
| `api/share.mjs` | `/s/<hash>` → HTML dengan tag OG + pengalihan JS ke `…/?q=<hash>#/verify`; cache `s-maxage=3600`; 400 hash rusak, 404 tidak tersaji, 502 dokumen gagal diambil |
| `api/card.mjs` | `/s/<hash>/card.png` → PNG 1200 × 630 (`socialCardSvg` → `@resvg/resvg-js`, Outfit); gagal render → 302 ke `/hero.jpg`; cache `s-maxage=86400` |
| `api/_lib/load.mjs` | memuat dokumen kredensial (wajib) dan kriteria (boleh gagal) dari host tepi, memetakan dengan kode yang sama dengan app; **tanpa chain** (status tidak ditulis) |
| `api/_lib/lencana-share.mjs` | **bundel yang DICOMMIT** dari `web/src/api-entry.ts` (`certificate.ts`, `share.ts`, `hosts.ts`, `certificate-logo.ts`); dibangun `cd web && npm run build:api`; **`probe` memeriksa kesegarannya** |
| `api/_fonts/` | Outfit Regular/SemiBold/Bold (SIL OFL 1.1; `OFL.txt` ikut) |
| `api/package.json` | satu dependensi: `@resvg/resvg-js` 2.6.2 (biner asli per platform; lockfile memuat varian Linux untuk Vercel) |
| `web/src/share.ts` | logika murni: tautan, `ogMeta`, `shareHtml`, `linkedinAddUrl`, `linkedinShareUrl`, `linkedinPost`, `castCommands`, `socialCardSvg`, `wrapLines` |
| `web/src/hosts.ts` | `CREDENTIAL_HOST` dan `APP_HOST` — tanpa impor, sumber tunggal (app lewat `config.ts`, server lewat bundel) |

## Kenapa begini (dan jebakannya)

- **Bundel dicommit, bukan dibangun di Vercel.** `web/` adalah paket `"type": "module"` dan `api/` fungsi Vercel; mengimpor `.ts` lintas paket membuat kompilasi di Vercel tidak terjamin. Dengan bundel ESM mandiri, yang diuji lokal adalah byte yang sama dengan yang dideploy,
  dan build Vercel tidak bergantung pada langkah tambahan. Harganya: **setelah mengubah `certificate.ts`, `share.ts`, `hosts.ts`, atau `certificate-logo.ts`, jalankan `npm run build:api`** — kalau lupa, `probe` merah.
- **Mengapa bukan Worker tepi:** Workers Free menagih 10 ms CPU per invokasi (lihat kepala `cloudflare/worker.mjs`); merender PNG tidak muat. Tepi tetap hanya menyajikan dokumen.
- **Status keberlakuan tidak ditulis** di halaman bagikan maupun gambar: perayap dan LinkedIn menyimpannya lama, dan status basi yang tampak resmi adalah klaim yang tidak boleh kita buat. Pratinjau hanya berisi fakta dokumen + batas klaim.
- **Kredensial yang belum diterbitkan ke host tepi tidak punya halaman bagikan (404)** — sumbernya dokumen di tepi (`npm run publish:edge`).
- **Yang baru terbukti saat LIVE:** pemasangan `api/` lewat `installCommand` dan pelacakan font oleh Vercel. Bila perenderan gagal, `api/card.mjs` mengalihkan ke gambar merek statis supaya pratinjau tidak kosong.
- LinkedIn menyimpan pratinjau; segarkan dengan Post Inspector (tautannya ada di dialog Bagikan).

## Batas

Pratinjau di LinkedIn sungguhan belum dilihat; fungsi baru diuji lokal (lihat AC-B168 §Batas klaim).
