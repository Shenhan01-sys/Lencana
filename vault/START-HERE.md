---
tags: [hub, start-here]
---

# 🎖️ Lencana — project vault

The long-term memory of **Lencana**: a learning platform where the credential is a real industry
format, not a picture of one. A learner studies on a data-driven learning surface, the **issuer**
(a third party's agent) grades against **its own rubric**, the result is signed as an
**Open Badges 3.0 / W3C VC 2.0** document and anchored on **BAS** (BNB Attestation Service), the
artifact is a **soulbound token**, status is readable by anyone through two **Bitstring Status
Lists** whose hashes are timestamped on chain, and the machine-to-machine payment path
(**x402**) splits revenue **in a contract we wrote**.

Everything above is live on the **public BSC testnet (chain 97)**, and each line has a command inside
this repository that re-runs it — with one caveat worth stating up front: those commands need our
`.env`, an issuer key in `signer/.keys/` and credentials in `signer/.store/`, all three deliberately
gitignored. A fresh clone re-runs the offline suites and `npm run rubric` / `inventory` unaided; the
chain-facing numbers need an issuer key, a funded testnet wallet and `npm run issue` first.

> **Arah baru, 1 Okt — [[00-Overview/03 - Decisions|D53]].** Agen penilai akan dimiliki peran baru
> *Agent Owner* dengan identitas di registry ERC-8004 yang disediakan BNB, dan penerbit menyewanya per
> aktivitas penilaian (tujuh label tingkat berat); reviewer diperlakukan sebagai penilai, boleh agen AI.
> **Keadaan sore 1 Okt — D54 (opsi B):** penerbit tetap penanda tangan dan pencabut kredensial; agen
> **hanya menilai**. Agen penilai ERC-8004 **#2534** dan agen reviewer **#2542** (dua Agent Owner berbeda)
> terdaftar di registry BNB; penerbit menyewa agen per aktivitas penilaian, agen memilih label tingkat
> berat, harga = tarif Agent Owner + 5%/tingkat, dibayar lewat x402 ke dompet agen (B118, B119, B120 —
> `npm run verify:agent`, `npm run verify:agents`). Belum ada UI untuk semua itu. *(Koreksi 2 Okt: sejak B129 anggota penerbit
> menyewa agen penilai dan menunjuk agen pengesah dari dasbor `#/app/pub` dengan tanda tangannya sendiri; membayar tagihan agen
> tetap tanpa UI, dan dasbor Agent Owner adalah C3 — [[08-Results/B129 - Executive Summary]].)* *(B130, 2 Okt: dasbor Agent Owner
> `#/app/owner` ada; platform mencetak agen untuk akun, pemiliknya mengisi dompet agen sendiri — [[08-Results/B130 - Executive Summary]].)* Di demo semua peran masih
> dijalankan tim kita di satu mesin. Gambaran alur dari kode:
> [[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]].

## ⏳ Position

| | |
|---|---|
| Today | ~~**2 Oktober 2026**~~ **3 Oktober 2026** *(Koreksi 3 Okt: daftar "B118–B129" di catatan berikut sudah tertinggal — B130 (dasbor Agent Owner) selesai 2 Okt malam, dan B131–B133 diusulkan 2 Okt malam dengan pilihan builder tercatat sebagai D66–D68; keadaan per baris ada di [[07-Backlog/01 - Backlog]].)* *(3 Okt dini hari: B131 dikerjakan — satu akun nyata satu peran, pemilih kursi hanya untuk akun dev builder; urutan berikutnya B133 lalu B132 — [[08-Results/B131 - Executive Summary]].)* *(3 Okt: B133 dikerjakan — Penerbit menyusun kursus dari halaman, kunci penerbit menerbitkan; berikutnya B132 — [[08-Results/B133 - Executive Summary]].)* *(3 Okt: B132 dikerjakan — robot agen rakitan, rupa di chain, agen pertama didaftarkan sendiri (#2548) — [[08-Results/B132 - Executive Summary]]; ketiga permintaan builder 2 Okt malam kini terbuka untuk uji login sungguhan.)* *(koreksi 2 Okt: baris ini menulis "30 September 2026 — hari tenggat" sejak 30 Sep; pekerjaan berlanjut 1–2 Okt, B118–B129. Sebelumnya, koreksi 30 Sep B117: "29 September" dengan "1 day left")* *(**5 Oktober 2026:** B140 dan B144 dikerjakan tapi masih terbuka (uji HP builder belum ada); ditutup B147, B148, B149 menu hamburger HP, B150 isi tidak keluar kartu, B151 ruang kelas HP, B152 PWA, B155 batas faucet/gas, B156 tanpa server lokal; B154 signer di Railway hidup, tinggal login Privy dari HP; B153 menunggu alamat dompet builder. Baterai `sync:numbers` **37 harness · 37 hijau** (1.420 pemeriksaan, 5 Okt 10.29 WIB). Ringkasan per item: [[08-Results/00 - Hub Results]].)* *(**5 Oktober 2026, sore:** B157 (formulir praktik `eth-call`, tahap 1), B158 (API key tersimpan), B159 (pemilih label tingkat berat), B160 (lesson kuis dan esai tercatat selesai di penerbit) dan B161 (antrean pengesahan memotong komponen di batas 1000 baris) ditutup. B158 dan B159 LIVE sejak dorongan `1a2df2e`; B157, B160, B161 ~~baru commit lokal — dorongan menunggu kata builder~~ didorong 5 Okt 15.14 WIB (`1a2df2e..6a865cc`) dan LIVE: bundel Vercel `index-CIcJcqoE.js`, signer cloud `startedAt` 2026-10-05T08:15Z. B153 (kredensial uji akun builder): empat penghalang ditemukan (lesson 1/4, esai #964 belum disahkan, praktik belum ada, penerbitan manual); dua dikerjakan di kode (B160, B157). Sesudah dorongan, builder: membuka Kelas Uji (kuis dan esai tersusul), mengirim bukti praktik, "Tandai selesai" di bacaan, akun 2 mengesahkan #964 → penerbit `issue --from-attempts` + `publish:edge`. Baterai terbaru: **37 harness · 37 hijau, 1.449 pemeriksaan** (5 Okt 15.03 WIB; web probe 147/0).)* *(**5 Oktober 2026, malam:** akun builder (enrollment #580, Kelas Uji) masih 1 dari 4 lesson di penerbit padahal kuis lulus (#963) dan esai disahkan (#964) — dibaca 5 Okt 15.50 WIB. Lubang B160 ditemukan dan ditutup di kode: penyusulan lesson tidak jalan bila kursus sudah disinkronkan halaman lain (login / bayar → kelas); ~~commit lokal, **belum LIVE** — dorongan menunggu kata builder~~ **LIVE** sejak dorongan `1cd68b1..52ed28e` atas kata builder (16.02 WIB; bundel Vercel `index-CSniFuxJ.js`, penerbit Railway `startedAt` 09:04Z). Penyebab 1/4 di akun itu belum terbukti lubang ini: halaman lama yang masih terbuka (B162, DIUSULKAN) sama mungkin. ~~Yang tersisa di tangan builder: tutup semua tab Lencana lalu buka URL lesson langsung (tab lama tidak tahu ada versi baru), kirim bukti praktik, dan "Tandai selesai" di bacaan.~~ Builder melakukannya: 4/4 lesson sejak 09:37Z (kuis dan esai tersusul 09:33Z, bukti praktik #1019 09:36Z). **Kredensial uji akun builder TERBIT 5 Okt 16.41 WIB (B153):** `npm run issue -- --from-attempts` (skor LULUS 87/60) lalu `publish:edge` (103/104 rute dari tepi; satu sisanya `pengantar-defi-2026`, keadaan korpus lama); hash `0xb9fb06e50c96…`, `credentialsOf(akun 1)` = 1 di chain. Dibaca sebagai uji alur — jawaban kuis, esai, dan keluaran praktik disediakan asisten atas permintaan builder. B153 ditutup sesudah builder melihat barisnya di `/app/credentials`. Rincian: [[09-Testing/T85 - Uji peramban lesson kuis dan esai tercatat selesai (B160)]] · baris B153 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]].)* *(**5 Oktober 2026, malam (B163):** lima desain sertifikat HTML (S1–S5; estetika berbeda dari Palet doktrin FE) selesai dan ditinjau, memakai data nyata kredensial B153; buka `vault/03-Frontend/Sertifikat/index.html` — hub dan pertanyaan untuk builder di [[03-Frontend/Sertifikat/00 - Hub Desain Sertifikat]]. Belum ada kode di aplikasi. ~~Artefak NFT soulbound untuk kredensial B153 **belum dicetak** (hanya BAS; simulasi cetak lolos di tiga instance, pilihan instance A/B menunggu builder — hub, pertanyaan 5).~~ Artefak NFT soulbound untuk kredensial B153 **dicetak 5 Okt malam di dua instance** atas pilihan builder A+B (`0xc338AF7F…` dan `0xC6FD12B0…`, tokenId = hash kredensial, terkunci); ~~verifier bawaan masih menulis "Optional / Not Minted" karena hanya membaca `0xA5eB807A…` — diusulkan **B164**.~~ **B164 ditutup di kode 5 Okt malam:** verifier membaca tiga lapis kontrak dan B153 tampil "Minted & Locked" tanpa konfigurasi ([[08-Results/B164 - Executive Summary]]; ~~LIVE menunggu dorongan~~ LIVE sejak dorongan `7259153..a962ff7`, dibaca di verifier produksi). **B165 (5 Okt malam, di kode; LIVE menunggu dorongan):** "Kredensial saya" di `/app/credentials` kini kartu (bukan tabel hash) dan `#/app/credentials/<hash>` membuka lembar sertifikat desain S3 dari dokumen kredensial nyata — alamat atau nama dipilih sebelum cetak, selalu gelap, hanya untuk kredensial milik akun ([[08-Results/B165 - Executive Summary]], [[03-Frontend/FE9 - Credentials page and certificate sheet]]). Builder memilih desain **S3 dengan palet FE Lencana** dan penerima dinamis (alamat atau nama); sedang disesuaikan.)* |
| Submission deadline | **30 September 2026, 23:59 WIB** — **hari ini** *(basi sejak 1 Okt; tanggalnya sendiri tidak diubah di sini)* |
| Repository | `github.com/Shenhan01-sys/Lencana` (public) |
| Runtime (sejak 5 Okt) | Front-end di Vercel (`https://lencana-psi.vercel.app`, bisa dipasang sebagai aplikasi — B152); backend (signer) di Railway project `lencana` (`https://signer-production-e4f2.up.railway.app`, D74), terdeploy dari dorongan ke `main` lewat GitHub Actions `deploy-signer` (D75); tidak ada server lokal yang dibutuhkan — dev lokal memakai signer cloud, baterai menyalakan signer sementaranya sendiri → [[08-Results/B154 - Executive Summary]] · [[08-Results/B156 - Executive Summary]] |
| Chain | BSC **testnet 97**. Nothing on mainnet, by choice: testnet satisfies the rules |
| On-chain layer | 5 contracts deployed (4 sampai 30 Sep sore; yang kelima `CourseDeposit` `0xbeB5…E6c3`, dideploy 30 Sep malam — B90, [[09-Testing/T34 - signer deposit-check.js]]) · **104 Foundry tests pass / 0 fail** on forks of **both 97 and 56** (re-run 28 Sep) · 30 Sep, fork 97 saja: **120 / 0** dalam 6 suite — 16 tambahannya milik `CourseDeposit` (saat angka ini diukur kontraknya belum dideploy; sejak 30 Sep malam sudah — B90 ditutup); fork 56 tidak diulang hari ini → [`09-Testing/`](09-Testing/) |
| Public host | Documents we sign are served from `https://lencana-edge.hansgunawan775.workers.dev` (Cloudflare Worker + KV, never signs anything) → [`04-Signer-Service/S10 - Edge surface.md`](04-Signer-Service/S10%20-%20Edge%20surface.md) |
| External verdict | `vc.1ed.tech` OB 3.0 validator: **`outcome: VALID`**, 14 checks, 0 errors / 0 warnings — **6 kredensial berbeda** diukur 28 Sep, termasuk satu yang terbit **dari rekaman belajar peserta** → [`09-Testing/T15 - 1EdTech validator.md`](09-Testing/T15%20-%201EdTech%20validator.md) |
| Learning surface | Enrollment, progres per lesson, dan nilai kuis yang **dihitung penerbit** (`POST /grade`) hidup di Postgres dan dipanggil halaman ~~`#/learn`~~ lewat HTTP (`web/src/learning.ts`); satu alur utuhnya terukur `npm run verify:attempts:live` ~~**67/0**~~ (esai sekarang lewat antrean + tanda tangan penerbit, B81) *(Koreksi 3 Okt: `#/learn` diganti ruang kelas `#/class/<kursus>` (FE7) di dalam area internal `#/app` (B124); peserta masuk lewat akun email (dompet tertanam Privy, D57 — satu-satunya pintu di UI sejak B123), dan kursus berbayar baru terbuka sesudah lunas: `POST /enroll` menjawab 402 → settlement x402 + `SettlementSplit` → order `paid` → kelas terbuka (B125, [[08-Results/B125 - Executive Summary]]). 67/0 adalah run 29 Sep; run live sesudahnya tercatat bertanggal di T22 dan [[09-Testing/T40 - E2E penuh sebelum FE (1 Okt)]].)* → [`09-Testing/T22 - signer attempts-check.js.md`](09-Testing/T22%20-%20signer%20attempts-check.js.md) |
| Publicly readable | **31 dari 31** kertas yang kita pegang bisa dibuka orang tanpa mesin ini — diukur `npm run verify:edge` (baterai `sync:numbers` 5 Okt malam), sesudah kredensial uji B153 menambah satu kertas (30 dari 30 pada 4 Okt sore, sesudah E2E otak agen ([[09-Testing/T69 - E2E otak agen sampai kredensial (B143)]]) menambah satu kertas uji; 29 dari 29 pagi harinya, sesudah [[09-Testing/T68 - E2E penuh esai sampai kredensial (4 Okt)]] menambah tiga; 26 dari 26 pada 1 Okt malam, sesudah [[09-Testing/T40 - E2E penuh sebelum FE (1 Okt)]]; 23 dari 23 sore harinya; 22 dari 22 pada 30 Sep malam; 19 dari 19 pada 29 Sep sore, jalur hari itu: 10 → 11 → 17 → 19; tambahan sesudahnya bukan peserta sungguhan: spesimen `expired` dan `delisted` milik B102, satu kertas uji lewat rantai pengesahan B104, satu kertas uji 1 Okt yang slot praktiknya dinilai chain — B121, lalu tiga kertas E2E 1 Okt malam, satu di antaranya sengaja dicabut). Yang dipindah bukan kertas baru: `npm run rehost` menulis ulang URL di dalam dokumen lalu menandatangani ulang dengan **kunci Multikey yang sama**, tanpa satu transaksi pun di chain — `credentialHash`, uid, nomor bit, dan hash daftar yang ter-anchor tidak berubah (B65-b, B83, [[09-Testing/T24 - signer rehost.js]]) |
| Honest limits | [`10-Contributors/Claims-Cheat-Sheet.md`](10-Contributors/Claims-Cheat-Sheet.md) — **read this before writing any claim**, including UI copy. Batas yang masih berlaku 30 Sep: kunci jawaban kuis memang ada di bundel browser (B80) *(1 Okt malam, B80 ditutup: kunci kini hanya di server — bundel dari kode ini 0/28 teks `why`, sebelumnya 28/28 di Vercel — `npm run verify:quizkeys` 30/0; batas yang menggantikannya: pembahasan per soal + ulangan tak terbatas tetap membuat kunci bisa ditebak, jadi tetap bukan "anti-curang")*, **praktik** belum punya permukaan penyerahan sendiri *(1 Okt, B121 core: sekarang ada `POST /praktik` yang menilai praktik dari bacaan chain 97 — `npm run verify:praktik` 32/0 — tapi halaman belajar belum memanggilnya, jadi dari sisi peserta batas ini masih berlaku)*, identitas peserta masih kunci perangkat yang hangus bersama tab (B82) *(1 Okt malam, D57: ada login email lewat Privy — dompet tertanam yang sama di perangkat mana pun, `npm run verify:privy`; baris B82 tetap terbuka sampai builder login dari dua peramban dan mendapat alamat yang sama)*, dan kunci agen penerbit demo masih dipegang platform (B105 c). *(Koreksi 30 Sep, B117 — dua hal yang tadinya tertulis di sini sudah tertutup 29 Sep dan tidak boleh dikutip lagi sebagai batas: "nilai esai masih laporan klien (B81)" — esai sekarang masuk antrean dan angkanya hanya bisa ditulis tanda tangan penerbit; dan "`check.js` 94 → 84 tanpa sebab (B85)" — sebabnya aritmetika per entri `credentialStatus`, dan `check.js` mencetak baris `info` yang merekonstruksinya.)* |

## 🚀 Start here, depending on who you are

**Judging / reviewing** →
1. [`08-Results/01 - Evidence and Limits.md`](08-Results/01%20-%20Evidence%20and%20Limits.md) — what is proven, what is not
2. [`09-Testing/00 - Hub Testing.md`](09-Testing/00%20-%20Hub%20Testing.md) — every number with the command that printed it
3. [`00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode).md`](00-Overview/13%20-%20Proses%20Bisnis%20End-to-End%20%28dibaca%20dari%20kode%29.md) —
   siapa melakukan apa, dari login dan bayar sampai verifikasi, diturunkan dari kode *(Koreksi 3 Okt: butir 3 dan 4 tadinya
   menunjuk ~~`12 - Business Process`~~ dan ~~`05 - Demo Scenes`~~ sebagai bacaan juri tanpa peringatan; keduanya menggambarkan
   keadaan sebelum B123 (satu pintu akun, simulasi dibuang) dan B125 (bayar dulu baru masuk kelas), jadi juri diarahkan ke
   halaman 13 — yang juga ditunjuk [[Index]]. Halaman 12 dan 05 tetap ada sebagai catatan bertanggal.)*
4. [`00-Overview/12 - Business Process.md`](00-Overview/12%20-%20Business%20Process.md) — lima bentuk diagram, keadaan
   sebelum B123/B125 (bertanggal); [`00-Overview/05 - Demo Scenes.md`](00-Overview/05%20-%20Demo%20Scenes.md) — walkthrough empat adegan, sama bertanggalnya

**Continuing the work (human or agent)** →
1. [`07-Backlog/01 - Backlog.md`](07-Backlog/01%20-%20Backlog.md) — what is left and what blocks it
2. [`00-Overview/02 - Roadmap to the Deadline.md`](00-Overview/02%20-%20Roadmap%20to%20the%20Deadline.md) — day by day to 30 Sep, including what only a human can do
3. [`Quick-Reference.md`](Quick-Reference.md) — commands, addresses, env names, one place
4. [`AGENTS.md`](AGENTS.md) — the rules that keep this folder trustworthy if you are an agent
4a. [`00-Overview/12 - Business Process.md`](00-Overview/12%20-%20Business%20Process.md) — proses bisnis
    end-to-end dalam enam bentuk diagram (BPMN swimlane · sequence · **DFD level 1 + level 2, delapan
    diagram: enrollment, progres, penilaian kuis, penerbitan, penyajian, pencabutan, pembayaran x402,
    dan ~~satu kotak "belum ada" untuk esai~~** *(Koreksi 3 Okt: halaman itu kini punya DFD-2 P8 untuk penyerahan esai +
    antrean penilaian — `POST /essay`, `POST /essay/judgement` (B81); keseluruhan halamannya menggambarkan keadaan sebelum
    B123/B125, lihat butir 3 di atas)* · state machine · activity · daur hidup status), tiap panahnya
    bernama rute/tabel/kolom/fungsi kontrak, ditutup tabel "yang TIDAK bisa dilakukan sistem ini" dan
    naskah 90 detik untuk video.
4b. [`WORKFLOW.md`](WORKFLOW.md) — the 5-step loop every item must pass: execute (schema first) →
    sync AC + backlog → three-layer testing → per-item executive summary → **commit local, push only
    on the builder's approval**. Where it disagrees with `AGENTS.md`, the disagreement is written as
    B76–B79 in `07-Backlog/03 - Findings and Tasks 2026-09-26.md`, not left implicit.

**Before you choose work** → [`00-Overview/11 - Product Bar.md`](00-Overview/11%20-%20Product%20Bar.md):
the 12-element e-course frame comes first, our three verified differentiators second, and the storage
decision with it (Supabase for learning state; chain stays what the public trusts).

**Frontend (`web/`) maintainer** →
[`10-Contributors/00 - Hub Contributors.md`](10-Contributors/00%20-%20Hub%20Contributors.md) — what you own, the mount
points that must survive a redesign, the open items raised against the current build.

**Understanding the design** →
[`00-Overview/01 - Briefing.md`](00-Overview/01%20-%20Briefing.md) →
[`01-Architecture/01 - Architecture.md`](01-Architecture/01%20-%20Architecture.md) →
the layer folders `02-`…`06-`.

## 📂 Structure

```
vault/
├─ START-HERE.md · Index.md · README.md      ← orientation
├─ Dashboard.md · Quick-Reference.md · Glossary.md · Conventions.md · AGENTS.md
├─ 00-Overview/        briefing, roadmap, decisions, corrections, demo scenes
├─ 01-Architecture/    layers, ownership, the EAS gap            (parts A1…)
├─ 02-Contracts/       one note per contract                     (parts C1…)
├─ 03-Frontend/        verifier page, learning surface           (parts FE1…)
├─ 04-Signer-Service/  document, lists, delegation, grading, payment (parts S1…)
├─ 05-Course-Content/  course data, manifests, grading authority  (parts K1…)
├─ 06-Spec-Research/   facts read from the raw specification       (parts R1…)
├─ 07-Backlog/         work left + Acceptance-Criteria/
├─ 08-Results/         evidence & limits + one summary per item
├─ 09-Testing/         one record per harness command
├─ 10-Contributors/    ownership, claims, Open-Items/
├─ 11-Refactoring/     consumer-readiness audit + target shape    (parts RF1…)
├─ 12-LMS-References/  six LMS read at pinned commits, L7/L8 synthesis (parts L1…)
├─ Concepts/ · Module-Guides/ · Notes/ · Templates/ · scripts/
└─ .obsidian/          local config (not committed; see Conventions)
```

## ⚙️ Working in this vault

```powershell
# from vault/
powershell -ExecutionPolicy Bypass -File scripts\sync-vault.ps1    # regenerate _Auto-Index + guide stubs
powershell -ExecutionPolicy Bypass -File scripts\check-links.ps1   # target: Broken: 0
powershell -ExecutionPolicy Bypass -File scripts\new-note.ps1 -Title "Credential Hash" -Kind concept
```

Open **this folder** in Obsidian (`File → Open folder as vault`) for the graph and the Dataview
tables below. Reading it on GitHub works too — but `[[wikilinks]]` only resolve inside Obsidian,
which is why every entry point above is a plain markdown link.

## 🗺️ Every note (auto)

```dataview
LIST FROM "" WHERE file.name != "START-HERE" AND file.name != "_Auto-Index" SORT file.folder ASC, file.name ASC
```

## 🧩 Concept notes (auto)

```dataview
LIST FROM #concept SORT file.name ASC
```

---
*Folder created 19 Sep as five essays; restructured into the layered vault on 25 Sep 2026.
If anything here contradicts a command you just ran, this folder is wrong — fix it.*
