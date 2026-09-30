---
tags: [product-bar, roadmap, ordering, database]
status: active — read this before choosing work
updated: 2026-09-28
---

# 11 - Product Bar: penuhi standar umum dulu, baru jual pembeda kita

Halaman ini ada karena sebuah keputusan builder 28 Sep: **"Lencana harus masuk standar umum e-course
terlebih dahulu, baru kita tambah unique selling point."** Bukan aspirasi — ini urutan kerja, dan
versi sebelumnya (menonjolkan pembeda kredensial sambil kerangka belajarnya bolong) membuat produk
terbaca sebagai demo, yang persis kita kritik ke enam LMS.

## Bagian 1 — bar: kerangka umum e-course (12 elemen)

Daftar otoritatifnya ada di [[12-LMS-References/L7 - What an e-course must have]]; status di bawah
ini terverifikasi 28 Sep dengan **membaca kode**, bukan membaca catatan lama.

| # | elemen | kita | yang perlu dibuat |
|---|---|---|---|
| 1 | hierarki konten dengan id stabil | ✅ `content.ts` Course/Module/Lesson | — |
| 2 | gating sebagai data, ditegak server-side | ⚠️ prasyarat antar-kursus ditegak **chain** (`PrerequisiteRevoked`), gating per bab belum ada | aturan urutan per bab |
| 3 | **rekaman enrollment per peserta** | ✅ tabel + `POST /enroll` bertanda tangan peserta, nonce di DB (bukan memori proses), idempoten, `lessons_total` dihitung dari katalog; **halaman belajar sudah memanggilnya** (`web/src/learning.ts`) dan `issue --from-attempts` membacanya — `verify:db` 28/0 + satu alur HTTP di [[09-Testing/T22 - signer attempts-check.js]] (28 Sep) | pemulihan akun lintas perangkat (identitas hari ini = alamat penandatangan) |
| 4 | progres per peserta + state machine | ✅ `POST /progress` + mesin status ditegak server (lompat ilegal → 422, status sama → noop) + `progress_events`; **FE tidak lagi menjadikannya satu-satunya tempat state** — `#/learn` mengirim unlocked→started→completed lewat HTTP (terukur 57 POST pada run 28 Sep), `localStorage` tinggal cache yang diberi label "di perangkat ini" | draf esai masih lokal saja (sengaja, lihat B81) |
| 5 | rubric dengan skala eksplisit | ⚠️ `RubricItem{label,max}` itu bobot, bukan skala | skala berlabel-titik seperti ORA |
| 6 | **dua gerbang: selesai ≠ lulus** | ✅ view `course_gates` memisahkan `all_lessons_done` dan `best_score`, dan **penerbitan memakainya**: `issue --from-attempts` menolak kalau salah satu belum lewat (`NULL` = belum tahu = belum selesai). UI masih punya `readyForCredential` sendiri — itu tampilan, bukan keputusan | pindahkan label UI ke angka gerbang server |
| 7 | asal-usul nilai (siapa/apa yang menghasilkan angka) | ⚠️ **per jalur.** Kuis: `POST /grade` — klien mengirim *pilihan*, server yang menghitung terhadap kunci manifest, menyimpan komponen per soal, dan `attempt_hash` ikut tercetak di dokumen hasil (`…/results/…`) yang dirujuk `result[0].id`. Esai/praktik: angkanya masih laporan klien (`POST /attempts`). **Koreksi 30 Sep (B117):** untuk esai itu berhenti benar 29 Sep (B81) — esai masuk tanpa angka lewat `POST /essay`, angkanya hanya lewat tanda tangan EOA penerbit (`POST /essay/judgement`); tinggal praktik yang laporan klien | rute penyerahan praktik + gradebook |
| 8 | alur penilaian (manusia/model) dengan lock/regrade | ⚠️ *(tadinya ❌)* `judge.js` fail-closed + kontrol negatif; sejak 29 Sep ada antrean esai (tabel `submissions`, `npm run grade:essay`, B81) dan penilaian ulang melaporkan `replacedHash`. Belum: kunci/lease penilaian, pengesahan manusia. **30 Sep malam (B104 ditutup):** pengesahan manusia sekarang ada — angka model baru dihitung gerbang sesudah reviewer yang ditunjuk penerbit menandatangani `approved`/`adjusted` (`verify:db` 70/0); dan satu kertas uji terbit lewat rantai itu (`verify:attempts:live` 82/0); yang tetap belum: kunci/lease penilaian dan UI reviewer | kunci penilaian; UI reviewer |
| 9 | hasil akhir yang bisa dicek orang asing | ✅ **pembeda kita** (bagian 2) | — |
| 10 | harga + jalur bayar, dihitung server-side | ⚠️ x402 + `SettlementSplit` jalan **tapi menempel ke verifikasi**, bukan ke enrollment; panel browser = animasi (OI-11) | `POST /orders`, `platformBps` dihitung server |
| 11 | peran & izin | ⚠️ whitelist issuer + `onlyOwner` di chain; tanpa peran produk | roles learner/publisher/mentor |
| 12 | katalog yang bukan satu topik | ⚠️ struktural netral, praktis 2 kursus web3 | authoring tooling |

Urutan pengerjaan yang masuk akal terhadap bar ini = urutan yang sudah diurutkan di
[[12-LMS-References/L8 - Lencana vs LMS]] §C: **1 enrollment → 2 progres server-side → 3 kuis
dibobot server → 4 dua gerbang → 5 panel bayar nyata → 6 guard idempotensi → 7 gradebook**.
Keadaan 28 Sep sore: **1, 2, 3, 4, 6 selesai dan terukur** (satu alurnya lewat HTTP,
[[09-Testing/T22 - signer attempts-check.js]]), yang tersisa **5** (panel bayar nyata, OI-11) dan
**7** (gradebook) — ditambah angka esai/praktik yang masih laporan klien (B81) *(30 Sep: esai sudah
tidak — lihat koreksi di baris 7; tinggal praktik)*. Jangan membaca daftar
ini sebagai "kerangka umum sudah penuh": bar 2, 5, 8, 11, 12 masih ⚠️/❌ di tabel di atas.

## Bagian 2 — penyimpanan: Supabase (PostgreSQL)

Sebelum ini tidak ada DB sama sekali, dan itu bukan detail: `signer/src/store.js` menulis satu berkas
`signer/.store/state.json` (~90 KB, gitignored, tanpa transaksi, tanpa constraint, tanpa query), dan
sisi belajar hidup di localStorage. Menyebutnya "store" adalah slop saya; "baris store" di memo
sebelumnya mengimplikasikan sesuatu yang tidak kita punya.

**Diputuskan 28 Sep:** Supabase / PostgreSQL. Project ref `mdvnwepwseqsdtybtikw`. MCP:
`https://mcp.supabase.com/mcp?project_ref=mdvnwepwseqsdtybtikw&features=docs,account,database,debugging,development,functions,branching`.

**Sudah diterapkan 28 Sep** (sebelumnya nol: 0 tabel, 0 migrasi, advisory bersih) lewat
`app/supabase/migrations/0001_learning_surface.sql` + `0002_course_gates_security_invoker.sql`. Dua
hal yang perlu diketahui siapa pun yang melanjutkan: **API key tidak bisa membuat tabel** — PostgREST
hanya data-plane, POST ke tabel yang belum ada menjawab `PGRST205`, jadi DDL lewat MCP/CLI/dashboard;
dan linter menemukan lubang nyata sesudah apply — view `SECURITY DEFINER` melewati RLS tabel di
bawahnya sementara ia terekspos sebagai `/rest/v1/course_gates`. Diperbaiki dengan
`security_invoker = true` dan **dibuktikan dengan permintaan nyata**, bukan dengan mengira sudah beres:
`GET course_gates` → `[]` dengan publishable key, `POST enrollments` → `42501`.

Batas yang menahan diri-sendiri tetap berlaku:

- **chain tetap tempat yang dipercaya publik** — attestation, bit status di dua Bitstring Status List,
  anchor `timestamp()` di BAS. Tidak dipindah ke Postgres.
- **Postgres memegang state belajar**: enrollment, progres, attempt, nilai per komponen, order.
- **`attemptHash` ikut tercetak ke dokumen** (di `evidence`/`result`), supaya angka di kertas punya
  alamat asal — pola yang sama dengan `rubricHash` yang kita jual.
- **RLS tidak melindungi dari secret key.** Supabase: *"A secret key bypasses every Row Level Security
  policy you have"* — `service_role` membawa atribut `BYPASSRLS`, dan *"Policies never apply to a
  secret key"*. Signer kita **akan** memakai secret key, jadi "RLS aktif" hanya berarti aman untuk
  klien non-secret (browser, publik). Untuk jalur yang benar-benar dipakai produk, yang menahan akses
  adalah **otorisasi di dalam signer sendiri** — dokumen resmi Supabase menyebutnya: server adalah
  komponen yang *"run their own authorization checks"*. Kalau halaman ini suatu hari dibaca sebagai
  "RLS = aman", kalimat itu yang harus dibetulkan, bukan policy-nya.
- **Urutan evaluasi** (berlaku juga di atas): *"Postgres evaluates table grants first, and only then
  applies Row Level Security."* Arti praktisnya: hasil `[]` dari `/rest/v1/...` belum tentu salah
  policy — bisa jadi grants. Jangan menyimpulkan dari satu percobaan.
- **Kredensial legacy** (`anon`, `service_role`) deprecated akhir 2026 dan tetap hidup berdampingan
  dengan publishable/secret sampai dimatikan manual di Settings → API Keys: jangan menambah jalur baru
  yang memakainya. DDL juga **bukan** ranah project key: PostgREST hanya data-plane (`PGRST205` saat
  tabel belum ada), sementara SQL dijalankan lewat Management API dengan Personal Access Token —
  kredensial yang berbeda, dan MCP memakai yang kedua ini.
- **Kredensial: `app/.env` boleh, dan memang untuk itu dia ada.** Secret key Supabase (`sb_secret_...`)
  tinggal di `app/.env` bersama `DEPLOYER_PRIVATE_KEY` — server-side, gitignored (`.gitignore:19`), dan
  sudah dibuktikan tidak bisa keluar lewat bundel: `vite.config.ts` tidak menyetel `envDir`/`root`
  (default `web/`) dan `web/` tidak memakai `import.meta.env`/`VITE_`. Yang tetap dilarang: argv, pesan
  commit, log yang mencetak nilai, nama berawalan `VITE_`, dan `envDir` yang diarahkan ke akar `app/`.
  Dilarang juga memakai key legacy `anon`/`service_role` untuk jalur baru (deprecated akhir 2026).

## Bagian 2b — apa produk ini sebenarnya (kerangka kalimat, 28 Sep)

Builder menamainya langsung: **"Lencana itu sama saja seperti platform e-course lainnya, tapi
disisipkan gimmick on-chain."** Pembanding yang ia sebut sendiri: **Dicoding** (kursus lengkap +
sertifikasi + statistik), bukan Moodle; dan Google Classroom sebagai bentuk "kelas yang inklusif".
Konsekuensinya dua arah, dan keduanya wajib dijaga:

- **Ini bukan proyek blockchain yang mencari use-case.** Yang orang datang cari adalah kursus yang
  enak, progres yang kelihatan, sertifikat yang bisa dipamerkan. Kalau urutan ini kebalik, produknya
  jadi demo teknologi dan bar (bagian 1) tetap bolong.
- **Sertifikat NFT + kredensial on-chain justru bukan gimmick kecil** — itu alasan orang *membanggakan*
  sertifikatnya, dan bagian yang tidak bisa ditiru platform biasa. Jadi ia dijual, tapi **di dalam**
  bentuk produk ("e-course yang ijazahnya NFT + on-chain"), bukan sebagai pengganti bentuk produk.

**Sumber rujukan yang diberikan builder 28 Sep, statusnya BELUM diaudit:** `github.com/dicodingacademy`
dan `github.com/dicoding-dev`. Sebelum satu pun kalimat pembanding ditulis tentang mereka, jalankan
audit seperti enam LMS lain (lihat [[12-LMS-References/00 - Hub LMS References]]: baca kode di commit
yang di-pin, sebut yang tidak bisa diverifikasi). Sekarang halaman ini hanya mencatat bahwa keduanya
**ada sebagai referensi**, bukan bahwa kita sudah membacanya.

## Bagian 3 — setelah bar terpenuhi: yang boleh dijual

Tiga pembeda, masing-masing dengan perintah yang mencetak buktinya (hari ini semuanya hijau):

1. **Aturan penilaian dipaku ke kredensial saat terbit** — `rubricHash` di `achievement.criteria`;
   tidak satu pun dari enam LMS melakukan ini (Open edX menyimpan hash-nya tapi tak menegakkan dan
   tak mencetaknya).
2. **Status/cabut dibaca dari chain publik dan ter-anchor** — dua daftar (revocation permanen,
   suspension pulih); pembanding terukur: Moodle `// Signed is not implemented yet.`, Chamilo JSON
   tanpa `@context`/tanda tangan, LearnHouse tanpa kolom status.
3. **Agen milik institusi menandatangani sendiri, tanpa dompet dan tanpa gas** (`attestByDelegation`;
   platform menyiarkan dan membayar).

**Table stakes — jangan pernah dipakai sebagai nilai jual:** "bisa diverifikasi siapa pun", "tanpa
login", "ada URL checker gratis", "blockchain-secured". **Dilarang:** "compatible 1EdTech",
"certified", "unforgeable", "tamper-proof", dan kalimat yang menempatkan **dokumen** di chain.
Kata yang menopang klaim adalah "diam-diam"/"quietly", bukan "never" — penerbit boleh merevisi rubrik
untuk angkatan berikutnya dan boleh mencabut; yang tidak bisa adalah **mengubah diam-diam**.
Struktur tagline yang diterima builder: bentuk produk dulu, baru flex, baru akibat —
`Finish the course, get the credential, rubric signed, status on BNB Chain, nothing rewritten quietly.`
Detail: [[10-Contributors/Claims-Cheat-Sheet]] · [[00-Overview/08 - Submission Copy]].

## Mekanisme "jangan lupa"

Aturan ini ditulis di **empat** tempat karena satu saja tidak cukup: (1) `QWEN.md` di akar repo induk —
terinjeksi otomatis di awal sesi; (2) halaman ini; (3) aturan 0 di [[AGENTS|vault/AGENTS.md]] —
dibaca sebelum menyunting vault; (4) memory proyek penulis. Yang **tidak** lagi jadi tempat andalan:
ingatan sesi, dan kalimat "sudah dicatat" tanpa penunjuk.
