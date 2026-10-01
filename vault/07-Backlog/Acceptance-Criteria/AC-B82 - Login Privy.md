---
tags: [acceptance-criteria, B82]
status: active
updated: 2026-10-01
---

# AC-B82 - Login peserta lewat Privy (identitas lintas perangkat)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B82 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T41 - signer privy-check.js (B82 login Privy)]] ·
**Summary:** [[08-Results/B82 - Executive Summary]] · **Keputusan:** D57 di [[00-Overview/03 - Decisions]] ·
**Usulan asal:** [[11-Refactoring/RF3 - Onboarding and Identity]]

Kriteria baris B82 sampai 1 Okt: *"ekspor/impor kunci ber-frasa lewat tes dua browser"*. Builder memilih login Privy
(D57, "loginnya pasangin privy dong"), jadi mekanismenya berganti dan **tes dua perambannya tetap**: kriteria tutup
sekarang AC-B82#12. Baris B82 tetap **TERBUKA** sampai butir itu PASS.

| # | kriteria | asal | status | bukti |
|---|---|---|---|---|
| AC-B82#1 | SDK Privy **tidak** ikut bundel awal; peserta yang tidak memakai login email tidak mengunduhnya | D57 (halaman tanpa framework, verifier tetap ringan) | **PASS** 1 Okt | entry `index-D3D4ptpJ.js` tanpa `auth.privy.io`; SDK di chunk lambat `index-DfVkEvpr.js` (553,60 kB), dimuat lewat `import("./privy-B0TAd0E6.js")` (3,05 kB) |
| AC-B82#2 | app secret **sah** dan pembuktiannya bisa merah | AGENTS #14 | **PASS** 1 Okt | API users Privy menjawab 200 dengan secret kita, **401** dengan secret palsu; `users()._get` (jalur rute) 404 untuk user fiktif dengan secret kita, 401 dengan secret palsu. Run pertama memakai endpoint pengaturan app dan kontrol negatifnya **merah** — endpoint itu publik; diganti (T41) |
| AC-B82#3 | token palsu ditolak: JWT berklaim Privy (aud = app kita) bertanda tangan kunci acak, `alg=none`, bukan-JWT | D57 (4) | **PASS** 1 Okt | lib: 401 · 401 · 400; HTTP: 401 `access token rejected`, jawaban tidak memantulkan token dan tidak memuat secret |
| AC-B82#4 | ikatan hanya untuk dompet **tertanam** milik user token itu | D57 (4) | **PASS** 1 Okt (saringan) · **BLOCKED** (jalur 403/200 dengan token sah) | saringan: dari 5 akun tertaut hanya Ethereum `connector_type embedded` + `wallet_client privy` yang dihitung (eksternal, tiruan `wallet_client_type privy`, Solana tidak); jalur dengan token sah butuh akun uji Privy (AC-B82#13) |
| AC-B82#5 | satu alamat satu akun, tidak bisa ditimpa — termasuk dua permintaan serentak | B82 | **PASS** 1 Okt | Postgres nyata: ikatan baru `created`; ulang akun sama → bukan baris baru, `last_seen_at` maju; akun lain → `conflict` dan ikatan lama utuh; dua ikatan **serentak** ke dua akun → tepat satu menang. Versi pertama (baca lalu upsert) punya celah di antara dua langkah; diganti sisip-kalau-kosong + sentuh-akun-yang-sama sebelum dikomit |
| AC-B82#6 | data pribadi tidak disimpan; publik tidak bisa membaca ikatan | RF3 (custody/privasi) | **PASS** 1 Okt | kolom `account_id, last_seen_at, learner, linked_at, provider, wallet_type` — tanpa email; CHECK menolak `account_id` non-`did:privy` dan provider lain (23514); publishable key membaca `[]` **sesudah** baris uji ada |
| AC-B82#7 | server tanpa secret gagal tertutup | D57 | **PASS** 1 Okt | server anak dengan `PRIVY_APP_SECRET` kosong → **503** `not configured` |
| AC-B82#8 | secret tidak pernah sampai ke browser | RF3, D57 | **PASS** 1 Okt | 0 kemunculan di JS, source map, CSS, HTML `dist/`; `web/src` tidak menyebut `PRIVY_APP_SECRET`; tidak ada `VITE_*` berisi secret; Vite membaca env dari `web/`, bukan akar `app/` |
| AC-B82#9 | login tidak membuka jalan tulis tanpa tanda tangan | D57 (3) | **PASS** 1 Okt | `authorizeLearner` tidak berubah; `/auth/privy` tidak memberi sesi; `verify:db` 70/0 (tulisan tanpa tanda tangan ditolak) |
| AC-B82#10 | jalur tanpa akun tetap ada (kunci perangkat, dompet ekstensi) | RF3 | **PASS** 1 Okt | probe web **88/0** (identitas perangkat, enroll bertanda tangan, ganti identitas) — `learning.ts` diimpor dari Node tanpa menyentuh `privy.ts` |
| AC-B82#11 | berkas milik pemilik front-end tidak disentuh | AGENTS #10 | **PASS** 1 Okt | `index.html`, `main.ts`, `render.ts`, `style.css`, `i18n.ts` tidak berubah; perubahan `lms.ts`/`lms.css`/`learning.ts` dicatat di OI-22 |
| AC-B82#12 | **builder login email dari dua peramban berbeda → alamat peserta sama** (kriteria tutup) | baris B82 + D57 | **BLOCKED** — uji builder | panduan langkah di T41 bagian E2E |
| AC-B82#13 | jalur positif otomatis (token sah → 403 untuk alamat orang lain, 200 untuk dompetnya) | AGENTS #14 | **BLOCKED** — app belum punya akun uji Privy | harness bagian F berjalan sendiri begitu akun uji dibuat di dasbor |
| AC-B82#14 | login hanya dari domain kita | RF3 (ketergantungan pihak ketiga) | **BLOCKED** — dasbor Privy, keputusan builder | `allowed_domains` app = kosong (diukur 1 Okt) → login diterima dari domain mana pun |
| AC-B82#15 | bundel yang **tayang** di Vercel memuat login | — | **BLOCKED** — push menunggu acc builder (WORKFLOW langkah 5) | pemindainya sudah terbukti bisa merah: `--deployed` atas bundel yang tayang sekarang (`index-DtXy16cc.js`, deploy B80) → **MERAH 42 / 2** (modul login dan SDK tidak ada); diulang sesudah deploy |
| AC-B82#16 | yang lain tetap hijau | WORKFLOW langkah 3 | **PASS** 1 Okt | baterai `npm run sync:numbers`: **22 harness · 0 gagal** (termasuk `verify:privy` 38/0, `verify:db` 70/0, probe web 88/0, `verify:quizkeys` 30/0); `npm run audit` bersih |
