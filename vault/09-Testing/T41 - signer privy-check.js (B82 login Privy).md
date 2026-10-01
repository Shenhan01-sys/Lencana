---
tags: [testing, "T41"]
status: active
updated: 2026-10-01
command: npm run verify:privy · npm run verify:privy -- --deployed=<url halaman>
measured: 2026-10-01
result: LOGIN PRIVY HIJAU — 38 pemeriksaan / 0 gagal (jalur positif dengan token sah TIDAK diuji — app belum punya akun uji Privy) · run pertama MERAH 36 / 1 (kontrol negatif membongkar endpoint pengaturan app yang publik) · kontrol negatif --deployed atas bundel Vercel yang belum memuat login (index-DtXy16cc.js): MERAH 42 / 2
---

# T41 - signer privy-check.js — B82: login peserta lewat Privy

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B82 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B82 - Login Privy]] · **Summary:** [[08-Results/B82 - Executive Summary]] ·
**Keputusan:** D57 di [[00-Overview/03 - Decisions]] · **Harness tetangga:** `npm run probe` di `web/` (88/0 — kontrak
`learning.ts` tetap, dan modul Privy tidak tersentuh saat `learning.ts` diimpor dari Node), `npm run verify:db` (70/0)

## Yang diuji, dan yang sengaja tidak

`npm run verify:privy` menguji semua yang bisa diuji **tanpa kotak masuk sungguhan**: app Privy dan secret-nya, verifikasi
token di server (lib dan HTTP), saringan dompet tertanam, tabel ikatan di Postgres nyata, dan bundel web. Yang **tidak**:
login positif (email → kode → dompet tertanam → `POST /auth/privy` 200). Itu butuh kode dari kotak masuk, atau akun uji
Privy (dasbor → *User management* → *Test accounts*); app Lencana belum punya akun uji — `getTestAccessToken()` gagal,
dan pengaturan app mencatat **0 user**. Bagian F harness berjalan sendiri begitu akun uji ada: token sah + alamat orang lain
→ 403, token sah + dompet tertanamnya → 200.

## Kontrol negatif yang merah di run pertama — dan kenapa itu bagus

Run pertama: **LOGIN PRIVY MERAH — 36 pemeriksaan, 1 gagal.** Pembuktian "app secret sah" memakai endpoint pengaturan app;
kontrol negatifnya (secret palsu) **juga diterima**. Endpoint itu publik — hijau di sana tidak membuktikan apa pun tentang
secret. Pemeriksaan sesudahnya (status saja yang dicetak):

```
users.list good OK data.length=0
users.list bad ERR 401 401 {"error":"Invalid app ID or app secret."}
getSettings good OK object
getSettings bad OK object
users._get(nonexistent) good ERR 404 404 {"error":"User not found"}
users._get(nonexistent) bad ERR 401 401 {"error":"Invalid app ID or app secret."}
```

Pembuktian secret dipindah ke API users — termasuk `users()._get`, persis panggilan yang dipakai rute — dan pengaturan app
tinggal dipakai untuk membaca konfigurasi, dengan label "endpoint publik — bukan bukti secret".

## Transkrip `npm run verify:privy` (2026-10-01T12:43Z)

```
env   : 44 dari berkas ../../.env

— A. app Privy (dibaca dengan app secret; nilainya tidak dicetak)
  ok    PRIVY_APP_ID dan PRIVY_APP_SECRET terisi di lingkungan server
  ok    app ID klien (web/src/privy.ts) = app ID server — cmuphc2db00kr0cl391vk3txa
  ok    app secret diterima API users Privy (HTTP 200)
  ok    kontrol negatif: secret palsu ditolak API users (HTTP 401)
  ok    jalur rute users()._get: user yang tidak ada -> 404 dengan secret kita, 401 dengan secret palsu (404/401)
  ok    pengaturan app "Lencana" terbaca (endpoint publik — bukan bukti secret)
  ok    login email aktif di app (jalur yang dipakai halaman belajar)
  ok    dompet tertanam mode "user-controlled-server-wallets-only", passcode tidak wajib — create({}) di klien adalah jalur resminya
  info  dompet dibuat otomatis saat login: off (klien membuatnya sendiri bila belum ada)
  info  allowed_domains: (kosong — Privy menerima login dari domain MANA PUN; isi di dasbor sebelum dibuka ke publik)

— B. verifikasi di server (src/privy.js), tanpa HTTP
  ok    learner bukan alamat -> 400
  ok    token bukan JWT -> 400
  ok    JWT palsu (klaim berbentuk Privy, aud = app kita, ditandatangani kunci acak) -> 401
  ok    JWT alg=none -> 401
  ok    tidak ada ikatan yang lahir dari empat kiriman itu
  ok    saringan kepemilikan: hanya dompet Ethereum tertanam (wallet_client privy) — eksternal, tiruan, Solana tidak dihitung

— C. POST /auth/privy lewat HTTP (server sendiri, origin=test)
  ok    kiriman kosong -> 400
  ok    learner rusak -> 400
  ok    token rusak -> 400
  ok    JWT palsu -> 401 "access token rejected"
  ok    jawaban tidak memantulkan token, dan tidak memuat app secret
  ok    tetap tidak ada ikatan untuk alamat itu sesudah lapis HTTP
  ok    server tanpa PRIVY_APP_SECRET -> 503 (gagal tertutup)

— D. learner_accounts (Postgres nyata; baris uji dihapus di akhir)
  ok    ikatan baru -> ok, created
  ok    ikatan ulang akun yang sama (alamat huruf kecil) -> ok, bukan baris baru, last_seen_at maju
  ok    alamat yang sama ke akun LAIN -> conflict (rute: 409), ikatan lama tidak ditimpa
  ok    dua ikatan SERENTAK ke dua akun berbeda -> tepat satu menang, satu conflict
  ok    kolom baris: account_id, last_seen_at, learner, linked_at, provider, wallet_type — tidak ada email (data pribadi tidak disimpan)
  ok    DB menolak account_id yang bukan did:privy (CHECK, 23514)
  ok    DB menolak provider selain privy (CHECK, 23514)
  ok    publishable key TIDAK bisa membaca learner_accounts (RLS aktif, tanpa policy) — dibaca SESUDAH baris uji ada

— E. bundel web yang dibangun dari kode ini
  ok    npm run build (web) berhasil
  ok    entry (index-D3D4ptpJ.js) TIDAK memuat SDK Privy
  ok    SDK Privy ada di chunk lambat (kontrol positif pemindai): index-DfVkEvpr.js
  ok    entry memuat modul login hanya lewat import() dinamis (privy-B0TAd0E6.js)
  ok    app ID publik ada di modul login (konfigurasi ter-inline)
  ok    app secret TIDAK ada di bundel mana pun (JS, source map, CSS, HTML)
  ok    web/src tidak menyebut PRIVY_APP_SECRET sama sekali
  ok    tidak ada variabel VITE_* yang berisi app secret (Vite mengirim VITE_* ke browser)

— F. jalur positif (token sah)
  info  akun uji Privy tidak tersedia (SDK menjawab: Cannot destructure property 'data' of '(intermediate value)' as it is undefined.)
  info  TIDAK DIUJI di run ini: token sah → dompet tertanam → POST /auth/privy 200. Butuh akun uji Privy
        (dasbor → User management → Test accounts) atau login manual. Kriteria tutup B82: builder
        login email dari dua peramban berbeda dan mendapat alamat peserta yang sama.

  bersih-bersih: 2 baris uji dihapus
  ok    sisa baris uji di learner_accounts = 0

LOGIN PRIVY HIJAU — 38 pemeriksaan, 0 gagal
```

## Baterai sesudah perubahan (`npm run sync:numbers`, 1 Okt, 22 harness · 0 gagal)

```
ringkas :
  check.js                                   106 total / 0 gagal   
  verify:db                                  70 total / 0 gagal   
  serve-probe                                50 total / 0 gagal   
  e2e                                        47 total / 0 gagal   
  verify:live-cert                           47 total / 0 gagal   
  verify:attempts (offline)                  39 total / 0 gagal   
  verify:edge                                10 total / 0 gagal   (26 dari 26)
  forge test (offline, tanpa *.fork.t.sol)   65 total / 0 gagal   
  probe (web)                                88 total / 0 gagal   
  check:samples (contoh UI × tepi × chain)   9 total / 0 gagal   
  check:spec (14 asersi dinilai)             14 total / 0 gagal   
  probe:cold (store dingin dari clone)       23 total / 0 gagal   
  check:labels (kelengkapan label aturan #18) 8 total / 0 gagal   
  check:identity (satu sumber identitas penerbit) 9 total / 0 gagal   
  cleanup (sisa baris tes = 0)               6 total / 0 gagal   
  verify:relay (rute relayer, tanpa gas)     31 total / 0 gagal   
  verify:deposit (setoran tenggat, tanpa gas) 27 total / 0 gagal   
  verify:agent (identitas ERC-8004, baca-saja) 24 total / 0 gagal   
  verify:agents (sewa agen + reviewer agen, tanpa gas) 34 total / 0 gagal   
  verify:praktik (slot praktik dinilai chain, tanpa gas) 32 total / 0 gagal   
  verify:quizkeys (kunci kuis di luar bundel browser) 30 total / 0 gagal   
  verify:privy (login Privy: token, ikatan akun, bundel) 38 total / 0 gagal
```

## Kontrol negatif `--deployed` (2026-10-01T12:44Z) — bundel Vercel yang belum memuat login

Push menunggu acc builder, jadi yang tayang masih bundel deploy B80. Pemindai bundel tayang **harus** merah di sana — dan
memang merah di tepat dua pemeriksaan yang menuntut modul login dan SDK-nya; dua yang lain (entry tanpa SDK, secret
tidak ada) sah hijau juga untuk bundel lama:

```
— E'. bundel yang sedang tayang di https://lencana-psi.vercel.app/
  info  entry index-DtXy16cc.js · modul login - · SDK -
  ok    tayang: entry TIDAK memuat SDK Privy
  GAGAL tayang: modul login dimuat lambat dan membawa app ID publik
  GAGAL tayang: SDK Privy ada di chunk yang dimuat modul login (kontrol positif)
  ok    tayang: app secret tidak ada di HTML, entry, modul login, maupun SDK
...
LOGIN PRIVY MERAH — 42 pemeriksaan, 2 gagal
```

Sesudah push + deploy, `npm run verify:privy -- --deployed=https://lencana-psi.vercel.app/` diulang dan hasilnya ditulis
di sini; sampai itu terjadi, klaim "login ada di halaman yang tayang" **tidak boleh** dipakai.

## Kebersihan

- `learner_accounts`: tiap run menghapus baris ujinya sendiri (DID berawalan `did:privy:lencanatest`) dan menghitung ulang — **sisa 0** di run baterai, run transkrip, dan run `--deployed` (2 baris uji per run).
- Sesudah baterai: `npm run cleanup -- --apply` menghapus **6** enrollment `origin=test` (+12 attempts, 1 progres, 2 event) yang lahir dari harness lain di baterai; kueri ulang: `origin=test → 0`, `origin=unknown → 0`.
- Server harness dimatikan sinkron (`spawnSync taskkill`); sesudah semua run, tidak ada pendengar di 8787/88xx/89xx.

## Celah gerbang yang ditemukan sambil mengerjakan (dicatat, tidak dikerjakan)

A10 `npm run audit` membandingkan angka tabel README dengan `numbers.json` hanya untuk perintah di peta `PETA`. Baris
README `verify:privy` didaftarkan hari ini; baris `verify:quizkeys`, `verify:praktik`, `verify:relay`, `verify:deposit`,
`verify:agent`, dan `verify:agents` punya metrik di `numbers.json` tapi **tidak** ada di peta itu, jadi README bisa basi untuk
enam baris itu tanpa ketahuan. Satu baris di sini, bukan pekerjaan baru malam ini.

## E2E — panduan untuk builder (kriteria tutup B82)

Prasyarat: signer lokal hidup (`cd signer && npm run serve`), halaman dev (`cd web && npm run dev` →
`http://127.0.0.1:5173/#/learn`), dua peramban berbeda (mis. Chrome dan Edge — bukan dua tab).

- [ ] Peramban A: buka `#/course/web3-dasar-2026` → kotak "Rekaman belajar" → isi email → **Kirim kode**
- [ ] Ketik 6 digit dari email → **Masuk** → catat alamat `0x…` dan pastikan labelnya "login email … · tertaut di penerbit"
- [ ] Tandai satu lesson selesai → "Tercatat di penerbit"
- [ ] Peramban B: email yang **sama** → kode → **Masuk** → alamatnya **harus sama** dengan A, dan rekaman lesson tadi terbaca
- [ ] Tutup tab B, buka lagi `#/learn` → "Memulihkan login email…" lalu alamat yang sama tanpa kode baru
- [ ] **Ganti identitas** di B → kembali ke kotak masuk (sesi Privy keluar)

| langkah | alamat A | alamat B | sama? | catatan |
|---|---|---|---|---|
| login email | | | | |
