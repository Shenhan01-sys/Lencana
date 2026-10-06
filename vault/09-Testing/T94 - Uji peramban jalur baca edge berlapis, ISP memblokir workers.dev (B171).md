---
tags: [testing, "T94"]
status: active
updated: 2026-10-06
command: server dev Vite sementara di 127.0.0.1:5174 (dimatikan sesudah uji); Chrome 154 tanpa kepala lewat `puppeteer-core`; lembar B153 dengan identitas uji (alamat B153 publik, kunci acak); blokir ISP DISIMULASIKAN dengan intersepsi permintaan: permintaan ke `https://lencana-edge…workers.dev` digagalkan (`namenotresolved`) dan `/edge/*` dijawab dari edge sungguhan lewat Node (meniru rewrite Vercel); chain 97 dan edge sungguhan; Cloudflare WARP menyala di mesin (edge terjangkau)
measured: 2026-10-06
result: JALUR BACA BERLAPIS BEKERJA — workers.dev diblokir (disimulasikan): lembar B153 termuat lewat proxy dan audit spesifikasi 14/14 sama dengan keadaan normal; keduanya gagal → pesan berpetunjuk + Coba lagi yang memuat tanpa muat ulang; tanpa blokir tetap normal; nol galat konsol
---

# T94 - Uji peramban jalur baca edge berlapis, ISP memblokir workers.dev (B171)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B171 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B171 - Jalur baca dokumen edge berlapis]] · **Summary:** [[08-Results/B171 - Executive Summary]]

## Pengukuran blokir (sebelum perbaikan), 6 Okt, DNS router → XL Axiata

| nama | jawaban DNS ISP |
|---|---|
| `foo-test-123.workers.dev`, `hansgunawan775.workers.dev`, `lencana-edge.hansgunawan775.workers.dev` | **`blockpage.xlaxiata.id`** |
| `workers.dev`, `pages.dev`, `example.pages.dev`, `lencana-psi.vercel.app`, `signer-production-e4f2.up.railway.app`, `bsc-testnet.publicnode.com`, `testnet.bscscan.com`, `bscscan.com`, `bnbchain.org` | normal |
| `binance.com` | `blockpage.xlaxiata.id` (terpisah; domain kita tidak memakainya) |
| 1.1.1.1, 8.8.8.8, DoH Cloudflare | IP Cloudflare asli (`172.67.158.143`, `104.21.40.248`) |

Dengan **Cloudflare WARP** menyala (`/cdn-cgi/trace`: `warp=on`, DNS lewat `connectivity-check.warp-svc`): edge `/healthz` 200, dokumen B153 200. Blokirnya intermiten (tembus pagi 6 Okt, gagal siang).

## Hasil (blokir disimulasikan)

| # | langkah | hasil |
|---|---|---|
| 1 | normal (tanpa blokir), buka `#/app/credentials/<hash B153>` | lembar "Kelas Uji — Membayar dengan Tanda Tangan" termuat; jalur: `direct:passed`, `proxy:200` (di dev proxy dijawab oleh intersepsi) |
| 2 | **`workers.dev` digagalkan**, proxy sehat | lembar termuat; jalur: `direct:blocked`, `proxy:200` |
| 3 | **keduanya digagalkan** | "Sertifikat belum bisa dibuat" — "Dokumen kredensial gagal diambil: Host dokumen tidak terjangkau dari jaringan ini (kemungkinan diblokir ISP atau DNS). Coba lagi, ganti DNS (mis. 1.1.1.1) atau jaringan, atau nyalakan VPN/WARP. (Failed to fetch)"; tombol "← Kredensial saya", **"Coba lagi"**, "Periksa di verifier". Proxy dipulihkan lalu klik "Coba lagi" → lembar termuat **tanpa muat ulang halaman** |
| 4 | verifier publik `?q=<hash B153>#/verify`: audit spesifikasi (membaca dokumen, status list revocation + suspension, `/healthz` dari edge) | diblokir: **"14 / 14 terpenuhi · 0 gagal · 0 tidak terbaca · 4644 ms"**; normal: "14 / 14 terpenuhi · 0 gagal · 0 tidak terbaca · 4327 ms"; semua GET edge (dokumen, `status/revocation`, `status/suspension`, `healthz`) lewat `proxy:200` saat langsung diblokir |
| 5 | galat | `pageerror` dan `console.error`: **0** |

**Gerbang 6 Okt:** `npx tsc --noEmit` exit 0; `npm run probe` **267 / 0** (253 + 14 grup B171); `npm run build` exit 0; `npm run build:api -- --check` segar. **Uji negatif:** pemeriksaan HTML dimatikan dan pemilihan jawaban nyata dimatikan di `edge-fallback.ts` → probe **crash** (`SyntaxError: Unexpected token '<'` pada uji HTML-SPA); dikembalikan → hijau.

## Batas

- Blokir **disimulasikan**; DNS ISP sungguhan belum diuji ulang dengan perbaikan ini (WARP menyala di mesin). AC-B171#15 menunggu builder mematikan WARP dan membuka produksi.
- Proxy `/edge/*` di langkah 1–4 dijawab oleh intersepsi di peramban, **bukan** oleh Vercel — rewrite Vercel sungguhan baru bisa dibuktikan sesudah dorongan (AC-B171#14).
- Hanya Chrome 154; dokumen B153 saja.

## Produksi, 6 Okt (sesudah dorongan `4a2026f..bed52bd`)

| langkah | hasil |
|---|---|
| `curl https://lencana-psi.vercel.app/edge/healthz` | 200 `application/json` — JSON edge (`edge:true`, `baseUrl` host edge); rewrite Vercel sungguhan bekerja |
| `/edge/credentials/<hash B153>` dan `/edge/credentials/<hash kredensial uji baru>` | 200 `application/json` keduanya (yang kedua setelah `publish:edge`) |
| Chrome terhadap produksi, **hanya host edge langsung yang digagalkan** (`namenotresolved`), `/edge/*` dijawab Vercel sungguhan: lembar B153 | termuat ("Kelas Uji — Membayar dengan Tanda Tangan") |
| verifier produksi `?q=<hash B153>#/verify`, spec audit | **"14 / 14 terpenuhi · 0 gagal · 0 tidak terbaca · 4729 ms"**; permintaan: `direct-blocked` lalu `proxy:/edge/credentials/…`, `status/revocation`, `status/suspension`, `healthz` |
| galat konsol | `pageerror`: **0** |

Yang belum: DNS ISP sungguhan dengan perbaikan ini (WARP menyala di mesin) — AC-B171#15 menunggu builder mematikan WARP dan membuka produksi.

**Tugas builder (dicatat 6 Okt malam):** uji di jaringan yang benar-benar memblokir `workers.dev` dengan WARP mati — langkah dan tempat mencatat hasil di [[07-Backlog/Acceptance-Criteria/AC-B171 - Jalur baca dokumen edge berlapis]] (bagian "Tugas builder") dan [[07-Backlog/01 - Backlog]] (butir 4 "What is blocking").
