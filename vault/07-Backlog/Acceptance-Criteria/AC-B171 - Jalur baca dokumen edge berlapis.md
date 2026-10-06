---
tags: [acceptance-criteria, B171]
status: active
updated: 2026-10-06
---

# AC-B171 - Jalur baca dokumen edge berlapis (ISP memblokir `*.workers.dev`)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B171 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T94 - Uji peramban jalur baca edge berlapis, ISP memblokir workers.dev (B171)]] (+ grup B171 di `probe`) ·
**Summary:** [[08-Results/B171 - Executive Summary]] · **Terkait:** [[03-Frontend/FE4 - Mount contract with the maintainer]], [[03-Frontend/FE9 - Credentials page and certificate sheet]], [[03-Frontend/FE10 - Halaman bagikan dan kartu OG (fungsi Vercel)]]

**Latar (terukur 6 Okt, mesin builder, DNS router → XL Axiata):** semua `*.workers.dev` — termasuk nama acak `foo-test-123.workers.dev` — dijawab `blockpage.xlaxiata.id`; `workers.dev` (apex), `pages.dev`, `vercel.app`, `up.railway.app`,
`bsc-testnet.publicnode.com`, `bscscan.com` dijawab normal; 1.1.1.1, 8.8.8.8, dan DoH Cloudflare menjawab IP Cloudflare asli; dengan Cloudflare WARP menyala edge menjawab 200 (`warp=on`). Jadi edge sehat dan yang rusak langkah nama → IP di DNS ISP.
Browser pengguna di ISP itu tidak bisa mengambil dokumen kredensial dari host edge (lembar sertifikat, daftar "Kredensial saya", audit spesifikasi). Penyebab listingnya **tidak diketahui** (dugaan: kebijakan blokir hosting gratis; tidak terbukti).

**Rancangan yang dijalankan:** `web/src/edge-fallback.ts` — setiap `GET` ke host edge ditembakkan **serentak** ke proxy same-origin `/edge/<path>` (aturan `rewrites` `vercel.json` → host edge) dan ke host edge langsung; jawaban pertama yang **berguna** (2xx, bukan HTML) menang dan
yang lain dibatalkan; bila tidak ada, jawaban HTTP nyata (404/5xx) dikembalikan, dan bila murni gagal jaringan dilempar `TypeError` yang menyebut kemungkinan blokir ISP. Dipasang sekali sebagai pembungkus `window.fetch` di `main.ts` (sebelum pita pemuatan).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B171#1 | hanya `GET` ke host edge yang disentuh; `POST`, host lain, dan URL tanpa path lewat apa adanya | **PASS** | `probe` "edgePathOf …", "installEdgeFallback: … POST dan host lain lewat apa adanya" |
| AC-B171#2 | dua jalur serentak: yang berguna duluan menang, yang lain dibatalkan (signal aborted) | **PASS** | `probe` "proxy menjawab duluan …" |
| AC-B171#3 | **host edge diblokir ISP (gagal jaringan) → proxy dipakai**; proxy gagal → host langsung dipakai | **PASS** | `probe` 2 pemeriksaan; T94 langkah 2 (lembar B153 termuat, jalur `direct:blocked` + `proxy:200`) |
| AC-B171#4 | **HTML 200 bukan dokumen** (di dev, `/edge/…` jatuh ke `index.html` SPA) | **PASS** | `probe` "proxy mengembalikan HTML 200 …", "HTML 200 saja …"; uji negatif: pemeriksaan HTML dimatikan → probe crash `Unexpected token '<'` |
| AC-B171#5 | keduanya gagal jaringan → `TypeError` berpetunjuk ("kemungkinan diblokir ISP atau DNS … ganti DNS … VPN/WARP") dengan alasan asli di buritan; **bukan** "Failed to fetch" saja | **PASS** | `probe`; T94 langkah 3 (pesan di lembar) |
| AC-B171#6 | jawaban HTTP nyata tidak ditelan: keduanya 404 → 404 dikembalikan ("tidak tersaji" ≠ "jaringan gagal"); 502 vs 404 → 404 | **PASS** | `probe` 2 pemeriksaan; uji negatif: pemilihan jawaban nyata dimatikan → merah |
| AC-B171#7 | tiap jalur punya batas waktu 15 dtk (tanpa itu host yang diblokir DNS menggantung sampai batas peramban); pembatalan pemanggil membatalkan kedua jalur | **PASS** | `probe` "kedua jalur menggantung …", "pemanggil membatalkan …" |
| AC-B171#8 | pembungkus dipasang sekali (idempoten); tanpa origin http(s) hanya jalur langsung | **PASS** | `probe` |
| AC-B171#9 | `vercel.json`: `/edge/:path*` → `https://lencana-edge…/:path*` ada dan **sebelum** catch-all `/(.*)` (kalau sesudahnya `/edge/*` menjadi `index.html`) | **PASS** (berkas) | `probe` "vercel.json: rewrite …" |
| AC-B171#10 | UI saat `workers.dev` diblokir (disimulasikan di peramban: permintaan ke host edge digagalkan, `/edge/*` dijawab dari edge sungguhan): lembar sertifikat B153 termuat; **audit spesifikasi 14/14** sama dengan keadaan normal; semua GET edge (dokumen, status list, healthz) lewat proxy | **PASS** | T94 langkah 2, 4 |
| AC-B171#11 | keduanya gagal → lembar "Sertifikat belum bisa dibuat" dengan petunjuk + tombol **Coba lagi** yang memuat ulang lembar **tanpa muat ulang halaman** begitu jalur pulih | **PASS** | T94 langkah 3 |
| AC-B171#12 | service worker tidak mengganggu (`/edge/*` bukan navigasi dan bukan aset berhash) | **PASS** (dibaca) | `web/public/sw.js` |
| AC-B171#13 | gerbang | **PASS** (kecuali baterai) | `tsc` 0, `probe` **267 / 0** (253 + 14), `build` 0, `build:api --check` segar |
| AC-B171#14 | **LIVE:** produksi menjawab `https://lencana-psi.vercel.app/edge/healthz` dan `/edge/credentials/<hash B153>` dengan JSON edge; peramban terhadap produksi dengan `workers.dev` digagalkan tetap memuat lembar | **PASS** — didorong `4a2026f..bed52bd` 6 Okt; produksi `lencana-psi.vercel.app/edge/healthz` 200 JSON edge; dokumen B153 dan kredensial uji baru lewat `/edge/credentials/<hash>` 200; Chrome terhadap produksi dengan `workers.dev` digagalkan: lembar B153 termuat, audit spesifikasi **14 / 14**, semua GET edge (dokumen, status list, healthz) lewat proxy Vercel sungguhan, nol galat | curl + Chrome 6 Okt |
| AC-B171#15 | **di jaringan yang benar-benar memblokir** (builder mematikan WARP/DNS lain, membuka lembar dan verifier di produksi) | **OPEN — tugas builder** (dicatat 6 Okt malam; langkah di bagian bawah); di sini blokirnya hanya disimulasikan | — |

## Tugas builder: uji di jaringan yang benar-benar memblokir (AC-B171#15)

1. **Buktikan dulu bahwa jaringanmu memang memblokir:** matikan Cloudflare WARP dan VPN; `nslookup lencana-edge.hansgunawan775.workers.dev` harus menjawab `blockpage.xlaxiata.id` (atau `curl -m 15 https://lencana-edge.hansgunawan775.workers.dev/healthz` timeout). Kalau tidak, tes ini tidak berarti apa-apa.
2. Chrome biasa (Secure DNS **mati**, bukan jendela yang memakai DoH): buka `https://lencana-psi.vercel.app/?q=0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31#/verify`. **Harapan:** hasil verifier tampil, dan matriks spesifikasi akhirnya "14 / 14 terpenuhi" (±5 dtk).
3. Masuk dengan akunmu, buka `https://lencana-psi.vercel.app/#/app/credentials` lalu kartu B153. **Harapan:** lembar sertifikat termuat (bukan "Sertifikat belum bisa dibuat").
4. Bandingkan dengan perilaku lama bila mau: `https://lencana-edge.hansgunawan775.workers.dev/healthz` langsung di tab baru tetap tidak terbuka — itu normal, bukan kegagalan perbaikan.
5. Catat hasilnya di AC-B171#15 (PASS atau FAIL + pesan yang tampil + tangkapan layar). Bila FAIL dengan pesan "Host dokumen tidak terjangkau …", berarti `vercel.app` juga terblokir di jaringanmu — kabari, itu artinya domain sendiri jadi perlu.

**Hasil (isi saat selesai):** _belum diuji_ — tanggal, jaringan/ISP, PASS atau FAIL, pesan yang tampil, tangkapan layar.

**Batas klaim:** jalur ini hanya membantu **selama `vercel.app` tidak ikut diblokir** di jaringan itu (dan sebaliknya: bila Vercel diblokir, jalur langsung tetap dicoba). Ia tidak membantu jika kedua domain diblokir — penutup yang lebih kuat adalah domain sendiri di depan Worker (belum dikerjakan, butuh domain).
`id` di dalam dokumen bertanda tangan tetap menunjuk host edge (tidak bisa diganti tanpa menerbitkan ulang); integritas dokumen tetap dari tanda tangan dan chain, bukan dari jalur baca. Pengambil dari server (validator 1EdTech, perayap LinkedIn, fungsi Vercel) tidak terpengaruh blokir DNS pengguna.
Status kredensial di verifier dibaca dari chain (RPC publik) dan tidak melewati proxy; yang melewati proxy hanya dokumen dan daftar status dari edge. Sebab listing `*.workers.dev` oleh ISP tidak diketahui.
