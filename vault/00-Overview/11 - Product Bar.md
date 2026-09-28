---
tags: [product-bar, roadmap, ordering, database]
status: active — read this before choosing work
updated: 2026-09-28
---

# 11 - Product Bar:enuhi standar umum dulu, baru jual pembeda kita

Halaman ini ada karena sebuah keputusan builder 28 Sep: **"Lencana harus masuk standar umum e-course
terlebih dahulu, baru kita tambah unique selling point."** Bukan aspirasi — ini urutan kerja, dan
versi sebelumnya (menonjolkan pembeda kredensial sambil kerangka belajarnya bolong) membuat produk
terbaca sebagai demo, yang persis kita kritik ke enam LMS.

## Bagian 1 — bar: kerangka umum e-course (12 elemen)

Daftar otoritatifnya ada di [[12-LMS-References/L7 - What an e-course must have.md]]; status di bawah
ini terverifikasi 28 Sep dengan **membaca kode**, bukan membaca catatan lama.

| # | elemen | kita | yang perlu dibuat |
|---|---|---|---|
| 1 | hierarki konten dengan id stabil | ✅ `content.ts` Course/Module/Lesson | — |
| 2 | gating sebagai data, ditegak server-side | ⚠️ prasyarat antar-kursus ditegak **chain** (`PrerequisiteRevoked`), gating per bab belum ada | aturan urutan per bab |
| 3 | **rekaman enrollment per peserta** | ❌ **tidak ada**; `btnEnroll` cuma entri kamus | `enrollments` + `POST /enroll` |
| 4 | progres per peserta + state machine | ❌ satu kunci `localStorage` global, `wipeCourse()` menghapusnya | `progress` per alamat + status `locked/unlocked/started/completed` |
| 5 | rubric dengan skala eksplisit | ⚠️ `RubricItem{label,max}` itu bobot, bukan skala | skala berlabel-titik seperti ORA |
| 6 | **dua gerbang: selesai ≠ lulus** | ⚠️ `readyForCredential = gradedWeights === 100` | pisahkan `completed` dan `passed` |
| 7 | asal-usul nilai (siapa/apa yang menghasilkan angka) | ⚠️ `result.method` + `rubricHash` ada, learner tak pernah lihat rinciannya | gradebook + `attemptHash` |
| 8 | alur penilaian (manusia/model) dengan lock/regrade | ❌ `judge.js` fail-closed + kontrol negatif, tapi tak ada antrian/kunci/regrade | antrian + event regrade |
| 9 | hasil akhir yang bisa dicek orang asing | ✅ **pembeda kita** (bagian 2) | — |
| 10 | harga + jalur bayar, dihitung server-side | ⚠️ x402 + `SettlementSplit` jalan **tapi menempel ke verifikasi**, bukan ke enrollment; panel browser = animasi (OI-11) | `POST /orders`, `platformBps` dihitung server |
| 11 | peran & izin | ⚠️ whitelist issuer + `onlyOwner` di chain; tanpa peran produk | roles learner/publisher/mentor |
| 12 | katalog yang bukan satu topik | ⚠️ struktural netral, praktis 2 kursus web3 | authoring tooling |

Urutan pengerjaan yang masuk akal terhadap bar ini = urutan yang sudah diurutkan di
[[12-LMS-References/L8 - Lencana vs LMS.md]] §C: **1 enrollment → 2 progres server-side → 3 kuis
dibobot server → 4 dua gerbang → 5 panel bayar nyata → 6 guard idempotensi → 7 gradebook**.

## Bagian 2 — penyimpanan: Supabase (PostgreSQL)

Sebelum ini tidak ada DB sama sekali, dan itu bukan detail: `signer/src/store.js` menulis satu berkas
`signer/.store/state.json` (~90 KB, gitignored, tanpa transaksi, tanpa constraint, tanpa query), dan
sisi belajar hidup di localStorage. Menyebutnya "store" adalah slop saya; "baris store" di memo
sebelumnya mengimplikasikan sesuatu yang tidak kita punya.

**Diputuskan 28 Sep:** Supabase / PostgreSQL. Project ref `mdvnwepwseqsdtybtikw`. MCP:
`https://mcp.supabase.com/mcp?project_ref=mdvnwepwseqsdtybtikw&features=docs,account,database,debugging,development,functions,branching`.

Batas yang menahan diri-sendiri tetap berlaku:

- **chain tetap tempat yang dipercaya publik** — attestation, bit status di dua Bitstring Status List,
  anchor `timestamp()` di BAS. Tidak dipindah ke Postgres.
- **Postgres memegang state belajar**: enrollment, progres, attempt, nilai per komponen, order.
- **`attemptHash` ikut tercetak ke dokumen** (di `evidence`/`result`), supaya angka di kertas punya
  alamat asal — pola yang sama dengan `rubricHash` yang kita jual.
- **Kredensial tidak masuk repo**: service key / token hanya lewat lingkungan proses. Jangan pernah ke
  `.env`, argv, commit, atau halaman ini.

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
terinjeksi otomatis di awal sesi; (2) halaman ini; (3) aturan 0 di [[../AGENTS|vault/AGENTS.md]] —
dibaca sebelum menyunting vault; (4) memory proyek penulis. Yang **tidak** lagi jadi tempat andalan:
ingatan sesi, dan kalimat "sudah dicatat" tanpa penunjuk.
