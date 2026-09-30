---
tags: [overview, business-process, diagrams]
status: active
updated: 2026-09-29
---

# 12 - Proses bisnis Lencana, dengan diagram yang bisa diperiksa

**Peta:** [[START-HERE]] · **Bar:** [[00-Overview/11 - Product Bar]] · **Arsitektur:** [[01-Architecture/01 - Architecture]] · **Perintah + angkanya:** [[09-Testing/00 - Hub Testing]] · **Klaim yang dilarang:** [[10-Contributors/Claims-Cheat-Sheet]]

Halaman ini menjelaskan **apa yang sebenarnya terjadi** ketika seseorang mendaftar, belajar, lulus,
dan ketika orang lain memeriksa kertasnya. Setiap panah di bawah punya alamat: nama rute, nama tabel,
atau nama fungsi kontrak. Tidak ada panah yang menggambarkan sesuatu yang belum ada — dan bagian
terakhir halaman ini justru mencatat apa yang **tidak** bisa dilakukan sistem, supaya diagramnya tidak
dibaca lebih dari yang ditegakkan kode.

Angka yang dikutip berasal dari run **29 September 2026** dengan perintah yang disebut di sampingnya.

---

## 1. Empat aktor dan apa yang mereka pegang

| aktor | pegang | tidak pegang |
|---|---|---|
| **Peserta** | alamat EVM + kunci penandatangan; draft esai di browsernya | nilai akhir yang bisa diedit; status on-chain |
| **Penerbit** (institusi / bootcamp) | materi kursus, rubrik + bobot, ambang lulus (`passMark`), kunci agen (`signer/.keys/<slug>.json`) | gas dan penyiaran (itu platform); daftar status (itu platform, atas perintahnya) |
| **Platform (Lencana)** | server signer, Postgres, penyiaraan ke chain, Bitstring Status Lists, Worker + KV tempat dokumen tayang | otoritas menilai: ia tidak pernah memutuskan siapa yang lulus |
| **Verifier** (HR, kampus lain, agen/otomasi) | hanya `credentialHash` — atau kunci pembayaran x402 | `.env` kita, kunci kita, laptop kita |

**Aturan yang membuat tabel ini berarti:** yang menandatangani kertas adalah kunci **penerbit**, dan
yang membaca status adalah **chain publik**. Platform menyiarkan dan membayar. Kalau platform besok
hilang, attestation dan daftar status tetap terbaca di BSC.

---

## 2. BPMN — alur end-to-end di empat jalur (lane)

Bentuknya BPMN-ish: tiap `subgraph` adalah jalur satu pihak, gerbang keputusan adalah tempat sistem
menolak (bukan memaafkan).

```mermaid
flowchart TB
  subgraph PESERTA["Jalur Peserta"]
    P1["buka #/learn<br/>pilih kursus"] --> P2{"punya identitas<br/>penandatangan?"}
    P2 -- tidak --> P2a["dompet ekstensi<br/>ATAU kunci perangkat sementara"]
    P2a --> P2
    P2 -- ya --> P3["POST /enroll<br/>tanda tangan nonce sekali-pakai"]
    P3 --> P4["belajar lesson<br/>POST /progress"]
    P4 --> P5["kumpulkan kuis<br/>POST /grade (kirim PILIHAN)"]
    P5 --> P6["esai: draf tetap di perangkat"]
  end

  subgraph PENERBIT["Jalur Penerbit"]
    E1["tulis materi + rubrik<br/>bobot · passMark · prasyarat"] --> E2["rubricHash<br/>dipaku ke dokumen kriteria"]
    E2 --> E3["agen penerbit memegang<br/>kunci Multikey sendiri"]
    E3 --> E7["perintah issue<br/>--from-attempts"]
  end

  subgraph PLATFORM["Jalur Platform"]
    S1["validasi tanda tangan<br/>+ nonce di Postgres"] --> S2["mesin state lesson<br/>locked → unlocked → started → completed"]
    S2 --> S3["server menilai kuis<br/>simpan attempt_components"]
    S3 --> G1{"gerbang 1<br/>all_lessons_done?"}
    G1 -- belum / belum diketahui --> X1["BERHENTI<br/>exit 3, sebelum gas"]
    G1 -- ya --> G2{"gerbang 2<br/>best_score >= passMark?"}
    G2 -- tidak --> X1
    G2 -- ya --> G3{"computeScore<br/>verdict LULUS?"}
    G3 -- belum lengkap / tidak lulus --> X1
    G3 -- ya --> S4["attestation ke BAS<br/>refUID = prasyarat"]
    S4 --> S5["tanda tangani dokumen OB 3.0<br/>dengan kunci PENERBIT"]
    S5 --> S6["alokasikan nomor bit<br/>+ publish ke Worker/KV"]
    S6 --> S7["anchor hash daftar ke chain"]
  end

  subgraph PUBLIK["Jalur Publik / Verifier"]
    V1["GET /credentials/0x…"] --> V2["GET issuer doc<br/>+ Bitstring Status List"]
    V2 --> V3{"cabut / tangguh / kedaluwarsa /<br/>penerbit dijatuhkan?"}
    V3 -- sah --> V4["VALID + artefak soulbound"]
    V3 -- tidak --> V5["status dibaca dari chain,<br/>kertasnya tetap bisa dibuka"]
  end

  E1 --> S1
  P6 --> E7
  E7 --> G1
  S5 --> V1
  S7 --> V2
```

**Dua hal yang harus dibaca dari diagram ini, bukan hanya dilewati:**

1. **Tiga penolakan sebelum satu pun transaksi bergerak** (`X1`). Harness mencetaknya: `verify:attempts:live`
   55/0 menguji bahwa `issue --from-attempts` keluar non-nol dan bahwa **tidak ada attestation baru yang
   tercipta oleh penolakan itu** (`attestationOf(hash)` tetap nol).
2. **`NULL` pada gerbang 1 berarti "penyebutnya belum diketahui"**, bukan "lolos" — ini bug yang nyata
   pernah terjadi (`bool_and` atas nol baris) dan sekarang dijaga migrasi `0004` + view `course_gates`.

---

## 3. Sequence diagram — dari enroll sampai kertas tayang

```mermaid
sequenceDiagram
  autonumber
  participant B as Browser (#/learn)
  participant E as Penerbit (agen + kunci .keys)
  participant S as Signer (Node, src/server.js)
  participant DB as Postgres (Supabase)
  participant CH as Chain 97 (Resolver + BAS)
  participant W as Edge (Worker + KV)
  participant X as Verifier pihak ketiga

  B->>DB: nonce satu-kali dicatat lewat S (used_nonces)
  B->>S: POST /enroll {learner, course, message, signature}
  S->>DB: SELECT nonce · verifikasi personal_sign · INSERT enrollments
  Note over S,DB: lessons_total dihitung SERVER dari katalog,<br/>bukan dari angka yang dikirim klien
  S-->>B: 200 {enrollmentId, created}

  loop tiap lesson
    B->>S: POST /progress {lesson, status, position, tanda tangan}
    S->>DB: UPDATE lesson_progress · INSERT progress_events
    Note over S: lompat ilegal (locked → completed) = 422
  end

  B->>S: POST /grade {lesson, picks:[{itemId, choice}], tanda tangan}
  S->>S: gradeQuiz() terhadap kunci manifest · verdict dari passMark penerbit
  S->>DB: INSERT attempts + attempt_components · attempt_hash = keccak256(7 string)
  S-->>B: 201 {score, correct, total, attemptNo, rubricHash, attemptHash}
  Note over B,S: badan permintaan TIDAK memuat "score" —<br/>diperiksa di probe web 73/0

  E->>S: npm run issue -- --from-attempts --learner --course
  S->>DB: SELECT course_gates · attempts + attempt_components
  S->>S: computeScore dari komponen tersimpan · tolak flag angka
  S->>CH: attestation (schema, refUID prasyarat)
  CH-->>S: uid
  S->>S: buildOpenBadgeCredential + signDocument (kunci penerbit)
  S->>DB: simpan rekaman (bit index, evidence, attempts)
  S->>W: publish:edge (dokumen, daftar status, issuer doc, hasil)
  S->>CH: anchor hash kedua daftar
  W-->>X: GET /credentials/0x… · /issuers/… · /credentials/status/…
  X->>CH: statusOf(hash) → exists · revoked · expired · delisted · issuer
  X-->>X: outcome VALID (vc.1ed.tech, 14 checks, 0 error · 0 warning)
```

---

## 4. Data flow diagram (DFD level 1) — di mana tiap state benar-benar tinggal

```mermaid
flowchart LR
  PESERTA([Peserta])
  PENERBIT([Penerbit])
  PUBLIK([Verifier / publik])

  P1["1. Enrollment"]
  P2["2. Rekam progres"]
  P3["3. Nilai kuis"]
  P4["4. Terbitkan"]
  P5["5. Sajikan"]
  P6["6. Cabut / tangguhkan"]

  D1[("enrollments<br/>lesson_progress<br/>progress_events")]
  D2[("attempts<br/>attempt_components")]
  D3[("used_nonces")]
  D4[("course_gates (view)")]
  D5[("store .store/state.json<br/>bit index · dokumen · jejak")]
  C1{{"Chain 97<br/>attestation · statusOf<br/>holderOf · prerequisiteOf"}}
  C2{{"Chain 97<br/>hash daftar ter-anchor"}}
  K1{{"KV di Worker<br/>dokumen kredensial · hasil ·<br/>daftar status · issuer doc"}}

  PESERTA -->|tanda tangan + picks| P1
  PESERTA --> P2
  PESERTA --> P3
  P1 --> D1
  P2 --> D1
  P3 --> D2
  P1 --> D3
  P2 --> D3
  P3 --> D3
  D1 --> D4
  D2 --> D4
  PENERBIT -->|perintah issue| P4
  D4 -->|dua gerbang| P4
  D2 -->|komponen → computeScore| P4
  P4 --> C1
  P4 --> D5
  P4 --> P5
  D5 --> P5
  P5 --> K1
  P5 --> C2
  PUBLIK -->|HTTP| K1
  PUBLIK -->|read call| C1
  PENERBIT -->|revoke| P6
  P6 --> C1
  P6 --> D5
  P6 --> K1
```

Pembagian yang harus dijaga: **state belajar di Postgres, yang dipercaya publik di chain, teks
karangan di perangkat peserta.** Angka apa pun yang tercetak di kertas bisa ditelusuri ke salah satu
dari tiga tempat itu — itu isi blok `attempts` pada `GET /results/<course>/<hash>`.

---
## 4b. DFD level 2 — tiap proses dibedah sampai nama fungsi, tabel, dan kolom

Konvensi di semua gambar bawah: `{{ }}` proses, `[( )]` tempat data, `([ ])` aktor. Setiap anak panah
diberi nama isinya, dan setiap kotak proses menyebut **nama fungsi yang benar-benar ada di repo** —
kalau suatu hari namanya berubah, gambarnya ikut salah, dan itu memang gunanya.

### DFD-2 · P1 Enrollment — `POST /enroll`

```mermaid
flowchart LR
  PE([Peserta])
  A1{{"authorizeLearner<br/>verifyMessage + consumeNonce"}}
  A2{{"enroll()<br/>lessonsTotal dari katalog"}}
  A3{{"findEnrollment<br/>cek baris yang sudah ada"}}
  N1[("used_nonces<br/>nonce unique")]
  T1[("enrollments<br/>unique(learner,course_id)<br/>lessons_total, status, completed_at")]
  MF[("manifest penerbit<br/>web/src/manifest.ts")]

  PE -->|"POST /enroll {learner, course, message, signature}"| A1
  A1 -->|"nonce dipakai sekali"| N1
  A1 -->|sah| A2
  MF -.->|"jumlah lesson, bukan angka kiriman klien"| A2
  A2 --> A3
  A3 -->|"upsert on_conflict=learner,course_id"| T1
  A2 -->|"200 {enrollmentId, created:false} kalau sudah ada"| PE
```

Dua hal yang ditegak di mari: tanda tangan EIP-191 atas nonce yang **hidup di DB** (bukan `Set` dalam
proses), dan penyebut "selesai" dihitung server. `created:false` pada enroll kedua itu hasil yang
benar, bukan kegagalan.

### DFD-2 · P2 Progres belajar — `POST /progress`, `GET /progress`

```mermaid
flowchart LR
  PE([Peserta])
  B1{{"authorizeLearner(scope progress)"}}
  B2{{"ALLOWED_MOVE<br/>locked → unlocked → started → completed"}}
  B3{{"tulis lesson_progress<br/>upsert (enrollment_id, lesson_id)"}}
  B4{{"tulis progress_events<br/>from_status, to_status"}}
  B5{{"roll-up: semua completed → enrollments.status"}}
  S1{{"progressSummary()<br/>+ courseGates() untuk GET"}}
  D1[("lesson_progress")]
  D2[("progress_events")]
  D3[("enrollments")]

  PE -->|"POST /progress {lesson, status, position, tanda tangan}"| B1
  B1 --> B2
  B2 -->|"422 kalau lompat (locked → completed)"| PE
  B2 --> B3
  B3 --> D1
  B3 --> B4
  B4 --> D2
  B5 --> D3
  D1 -.-> B5
  D1 -.-> S1
  D2 -.-> S1
  S1 -->|"200 {lessonsTotal, lessonsCompleted, allLessonsDone, completed[]}"| PE
```

`allLessonsDone` di jawaban adalah hasil `bool_and` atas `lesson_progress` — dan `NULL` (belum ada
baris sama sekali) **diterjemahkan jadi `false`** di `progressSummary`, bukan dihamburkan apa adanya.

### DFD-2 · P3 Penilaian kuis — `POST /grade`

```mermaid
flowchart LR
  BR([Browser #/learn])
  G0{{"tolak body.score → 400<br/>satu angka satu jalan masuk"}}
  G1{{"authorizeLearner(scope grade)"}}
  G2{{"gradeQuiz()<br/>kunci dibaca dari manifest di server"}}
  G3{{"nextAttemptNo()<br/>server yang menghitung, bukan klien"}}
  G4{{"computeAttemptHash()<br/>keccak256(7 string)"}}
  G5{{"storeAttempt()"}}
  K1[("attempts<br/>attempt_hash unique, verdict, score")]
  K2[("attempt_components<br/>item_id, score, weight, graded_by")]
  KB[("kunci jawaban<br/>HANYA di manifest sisi server")]

  BR -->|"POST /grade {lesson, picks:[{itemId, choice}], tanda tangan}"| G0
  G0 --> G1
  KB -.-> G2
  G1 --> G2
  G2 -->|"picks sebagian / soal asing /Choice di luar options → 422"| BR
  G2 --> G3
  G3 --> G4
  G4 --> G5
  G5 --> K1
  G5 --> K2
  G2 -->|"201 {score, correct, total, passPct, verdict, attemptNo, rubricHash, attemptHash}"| BR
```

Yang membuat rute ini berarti: `verdict` dihitung dari `lesson.quiz.passPct` **milik penerbit**, dan
jawaban memuat `attemptNo` + `rubricHash` supaya klien bisa menghitung ulang hash tanpa secret key.
Batas yang jujur: kunci tetap terbundel ke browser (B80) — yang dihapus adalah *laporan angka oleh
peserta*, bukan *keterbukaan soal*.

### DFD-2 · P4 Penerbitan dari rekaman — `issue --from-attempts`

```mermaid
flowchart TB
  PB([Penerbit: npm run issue -- --from-attempts])
  C1{{"courseGates()<br/>gerbang 1: all_lessons_done · gerbang 2: best_score >= passMark"}}
  C2{{"attemptsFor()<br/>attempts + attempt_components dalam 1 panggilan"}}
  C3{{"evidenceFromAttempts()<br/>komponen → masukan computeScore"}}
  C4{{"computeScore() + rubricHashOf()<br/>verdict harus LULUS"}}
  C5{{"cek prasyarat: attestationOf(prereqHash)<br/>refUID dikirim kalau ada"}}
  C6{{"BAS attest(schemaUID, data)<br/>attester = EOA agen penerbit"}}
  C7{{"allocator.slot(REVOCATION|SUSPENSION, uid)<br/>nomor sekali jadi, disimpan di store"}}
  C8{{"buildOpenBadgeCredential + signDocument<br/>kunci Multikey penerbit"}}
  C9{{"verifyDocument() sebelum disimpan<br/>+ prerequisiteOf(uid) dibaca ulang"}}
  C10{{"anchorListHash() oleh kunci platform<br/>hash atas SEMUA yang dipantau"}}
  C11{{"publish:edge → KV"}}
  V1[("course_gates view")]
  V2[("attempts · attempt_components")]
  V3[("BAS: attestation, uid")]
  V4[("store: uid, bit index, dokumen, attempts")]
  V5[("BAS: hash daftar ter-anchor")]

  PB --> C1
  V1 -.-> C1
  C1 -->|"keluar exit 3 SEBELUM gas"| PB
  C1 --> C2
  V2 -.-> C2
  C2 --> C3
  C3 --> C4
  C4 --> C5
  C5 --> C6
  C6 --> V3
  C6 --> C7
  C7 --> C8
  C8 --> C9
  C9 --> V4
  C9 --> C10
  C10 --> V5
  C10 --> C11
```

Empat penolakan (gerbang 1, gerbang 2, `BELUM_LENGKAP`, `TIDAK_LULUS`) semuanya terjadi **sebelum**
kotak `C6`. Itulah yang diukur `verify:attempts:live`: penolakannya exit non-nol, dan
`attestationOf(hash)` tetap nol — artinya tidak ada satu pun transaksi yang lahir dari percobaan
menembus gerbang.

### DFD-2 · P5 Penyajian publik — `publish:edge` lalu Worker

```mermaid
flowchart LR
  OP([Operator: npm run publish:edge])
  E1{{"servedHashes() + watchedHashes()<br/>korpus yang dipantau, bukan yang lagi diuji"}}
  E2{{"renderList(REVOCATION|SUSPENSION)<br/>ditandatangani di Node, bukan di tepi"}}
  E3{{"credential doc · results doc · criteria · issuer doc"}}
  E4{{"kvPut per kunci ke lencana-docs"}}
  W1{{"Worker: rute → lookup KV<br/>TIDAK pernah menandatangani"}}
  KV[("KV: credentials/0x…, results/<course>/<hash>,<br/>credentials/status/<purpose>, issuers/<slug>, criteria/<course>")]
  PU([Verifier: browser · vc.1ed.tech · dompet])

  OP --> E1
  E1 --> E2
  E2 --> E3
  E3 --> E4
  E4 --> KV
  PU -->|"GET tanpa kredensial"| W1
  W1 --> KV
  W1 -->|"x-lencana-stale: chain-diverged + 503<br/>kalau hash daftar != yang ter-anchor"| PU
```

Fungsi P5 yang sering salah dimengerti: tepi adalah **cache yang bisa dibaca orang**, bukan sumber
kebenaran. Kalau ia menyimpulkan hash daftar tidak cocok dengan chain, ia menjawab 503 — jujur, bukan
menyajikan status yang mungkin basi.

### DFD-2 · P6 Pencabutan & penangguhan — `npm run revoke`

```mermaid
flowchart LR
  PB([Penerbit: npm run revoke -- --hash])
  R1{{"statusOf(hash) dulu<br/>exists, revoked, expired, issuerDelisted, issuer"}}
  R2{{"tolak: hash tidak dikenal / sudah tercabut<br/>EAS tidak punya jalur unrevoke"}}
  R3{{"BAS revoke(schema, uid) oleh KUNCI AGEN<br/>bukan kunci platform"}}
  R4{{"allocator: bit REVOCATION untuk uid ini = 1"}}
  R5{{"anchorListHash() ulang kedua daftar"}}
  R6{{"publish:edge supaya daftar tersaji ikut bergerak"}}
  R7{{"baca ulang revoked dari chain<br/>kalau tidak true: merah, bukan kuning"}}
  X1[("BAS: uid revoked")]
  X2[("store: daftar bit + hash")]
  X3[("KV: daftar status tersaji")]

  PB --> R1
  R1 --> R2
  R2 --> R3
  R3 --> X1
  R3 --> R4
  R4 --> X2
  R4 --> R5
  R5 --> R6
  R6 --> X3
  X1 -.->|dibaca ulang| R7
```

`revoke` dijalankan dengan kunci **agen penerbit**, karena pencabutan adalah pernyataan institusi itu,
bukan pernyataan platform. Kalau `--publish` tidak dipakai, skrip **mencetak** bahwa daftar belum
bergerak — keadaan setengah jadi tidak dibuat terlihat selesai.

### DFD-2 · P7 Verifikasi berbayar mesin-ke-mesin — `POST /verify` (x402)

```mermaid
flowchart LR
  MA([Klien berbayar: agen, otomasi])
  Y1{{"paymentRequirements()<br/>token, payTo = SPLIT, amount, network"}}
  Y2{{"402 + accepts[] + WWW-Authenticate"}}
  Y3{{"decodePaymentHeader + checkPayment()<br/>token benar? payTo ke split kita? jumlah? tanda tangan?"}}
  Y4{{"settlePayment() sebagai fasilitator<br/>settle → SettlementSplit.splitErc20"}}
  Y5{{"X-PAYMENT-RESPONSE: settleTx, splitTx, splitRef"}}
  Y6{{"laporan verifikasi: statusOf per hash<br/>batch = 190.659 gas per settlement terukur"}}
  Z1[("chain: SettlementSplit<br/>platformBps = 1000 = 10%, plafon 2500")]
  Z2[("chain: resolver statusOf")]

  MA -->|"POST /verify tanpa X-Payment"| Y1
  Y1 --> Y2
  Y2 --> MA
  MA -->|"POST /verify + X-Payment"| Y3
  Y3 -->|ditolak kalau payTo bukan kontrak kita| MA
  Y3 --> Y4
  Y4 --> Z1
  Y4 --> Y5
  Y5 --> MA
  Z2 -.-> Y6
  Y6 --> MA
```

Uangnya mengalir di sini, dan ini satu-satunya proses yang menyebut angka pembagian: 10% platform,
sisanya ke penerbit, **dieksekusi kontrak yang kita tulis** — bukan oleh kode Node kita. Karena itu
kalimat "pembagiannya bisa diaudit" benar, dan kalimat "kami menarik biaya kursus" belum (bar 10,
OI-11: enrollment belum menempel ke harga).

### DFD-2 · P8 Penyerahan esai + antrean penilaian — `POST /essay`, `POST /essay/judgement`

```mermaid
flowchart LR
  PE([Peserta])
  IN([Penerbit: npm run grade:essay])
  F1{{"essayLesson() dari manifest<br/>rubrik + max per kriteria"}}
  F2{{"gradeAgainstRubric() tanpa judge<br/>5 tanda mekanis, TIDAK ada angka akhir"}}
  F3{{"submitEssay()<br/>attempts(score NULL, verdict incomplete)<br/>+ komponen mech:* weight 0<br/>+ submissions(state awaiting_judge)"}}
  F4{{"authorizeLearner<br/>tanda tangan peserta"}}
  Q1[("attempts · attempt_components")]
  Q2[("submissions<br/>body teks, state, judged_at")]
  H1{{"judgeEssay()<br/>tuntutan: tanda tangan EOA penerbit<br/>+ nonce + semua kriteria terisi<br/>+ label asing ditolak + max>0"}}
  H2{{"komponen crit:* disimpan sebagai PERSEN 0..100<br/>weight = max penerbit"}}
  H3{{"hash dihitung ulang (skor berubah)<br/>hash lama dilaporkan sebagai replacedHash"}}
  GT{{"courseGates: graded_attempts/best_score<br/>baru bergerak sesudah dinilai"}}
  PUB([Dokumen hasil /results/…<br/>menunjuk attempt_hash yang baru])

  PE -->|"POST /essay {lesson, teks, message, signature}"| F4
  F4 --> F1
  F1 --> F2
  F2 -->|INSUFFICIENT_EVIDENCE → state insufficient| F3
  F2 -->|AWAITING_JUDGE| F3
  F3 --> Q1
  F3 --> Q2
  IN -->|"queuePendingEssays() lalu tanda tangani penilaian"| H1
  Q2 -.->|teks dibaca penerbit, TIDAK ada rute anonim untuk mengambil antrean| H1
  F1 -.->|rubrik: sumber max yang sah| H1
  H1 --> H2
  H2 --> Q1
  H2 --> H3
  H3 --> Q1
  H3 -->|state judged| Q2
  Q1 -.-> GT
  Q1 -.-> PUB
```

Yang membedakan proses ini dari `POST /attempts`: **angka masuk lewat kunci penerbit**, bukan lewat
peserta. Peserta hanya mengirim teks; `verdict`-nya `incomplete`; `score`-nya `NULL`; dan selagi
begitu, `issue --from-attempts` menolak terbit (bar 6: belum dinilai ≠ nol, dan `ungraded` tidak
dianggap lulus).

**Satu jebakan yang harus tercatat di sini, karena dia mengubah angka tanpa membuat satu pun baris
merah.** `attempts.score` dan `attempt_components.score` sama-sama persen 0..100, tapi kriteria rubrik
esai penerbit berbentuk `{label, max}` dengan max 25/25/25/15/10 = 100. Kalau komponen disimpan apa
adanya (`score = 25`, `weight = 25`), rata-rata berbobot di `fromAttempts` menghasilkan
`(25·25+25·25+25·25+15·15+10·10)/100 = 22` untuk karangan yang **nilainya penuh** — kertas tercetak
sah dengan angka yang salah. Karena itu `judgeEssay` menyimpan persen (`v/max·100`) dengan `weight =
max`, dan dijaga dua sisi: `attempts-check.js` menguji 100% → 100 dan 50% → 50, `verify:db` menguji
esai penuh menghasilkan `score 100` lewat HTTP.

---

## 5. UML activity + state machine

### 5a. Mesin status satu lesson (ditegak server, bukan dihias di UI)

```mermaid
stateDiagram-v2
    [*] --> locked
    locked --> unlocked: POST /progress unlocked
    unlocked --> started: POST /progress started
    started --> completed: POST /progress completed
    locked --> started: 422 ditolak
    locked --> completed: 422 ditolak
    unlocked --> completed: 422 ditolak
    completed --> completed: noop (status sama)
```

### 5b. Aktivitas penerbitan, dengan tiga gerbang dan satu pascakondisi

```mermaid
flowchart TD
  A["issue --from-attempts"] --> B{"dbConfigured()?"}
  B -- tidak --> Z1["exit 2 · sebabnya disebut"]
  B -- ya --> C{"rekaman enrollment ada?"}
  C -- tidak --> Z2["exit 2 · gerbang tidak bisa dibaca dari baris yang tidak ada"]
  C -- ya --> D{"gerbang 1: all_lessons_done == true?"}
  D -- false / NULL --> Z3["exit 3 · SEBELUM gas"]
  D -- ya --> E{"gerbang 2: best_score >= passMark?"}
  E -- tidak --> Z3
  E -- ya --> F["baca attempts + attempt_components"]
  F --> G{"tiap usaha punya komponen?"}
  G -- tidak --> Z4["exit 3 · kolom score bukan bahan rubrik"]
  G -- ya --> H["computeScore dari komponen (satu jalan masuk)"]
  H --> I{"verdict?"}
  I -- BELUM_LENGKAP --> Z3
  I -- TIDAK_LULUS --> Z3
  I -- LULUS --> J["tolak flag --quiz/--essay-score/--essay/--lesson/--no-praktik"]
  J --> K["attestation ke BAS (prasyarat lewat refUID)"]
  K --> L["tanda tangani dokumen OB 3.0 dengan kunci penerbit"]
  L --> M["publish ke KV + anchor hash daftar"]
  M --> N{"PASCASONDISI: prerequisiteOf(uid) != 0 kalau ada prasyarat?"}
  N -- tidak --> Z5["berhenti: guard yang hanya niat akan jatuh diam"]
  N -- ya --> O["selesai · attempt_hash tercetak di /results/…"]
```

---

## 6. Dua proses kedua yang juga nyata

### 6a. Verifikasi berbayar antar-mesin (x402) — satu-satunya jalur yang menghasilkan uang

```mermaid
sequenceDiagram
  autonumber
  participant M as Klien berbayar (agen / otomasi)
  participant S as Signer
  participant T as Token demo (ERC-20)
  participant SP as SettlementSplit (kontrak kita)
  participant CH as Chain 97

  M->>S: POST /verify (tanpa X-Payment)
  S-->>M: 402 Payment Required + accepts[] (token · payTo = split · jaringan)
  M->>M: tanda tangan payload EIP-2612 + witness
  M->>S: POST /verify dengan header X-Payment
  S->>S: checkPayment: token · payTo menunjuk SPLIT · jumlah · tanda tangan
  S->>CH: settlePayment sebagai fasilitator
  CH->>SP: transfer + split
  SP-->>CH: issuer share · platform share (platformBps = 1000 = 10%)
  S-->>M: laporan verifikasi + X-PAYMENT-RESPONSE (settleTx · splitTx · splitRef)
  Note over S,SP: settlement yang tidak menunjuk kontrak pembagian kita DITOLAK,<br/>jadi "pembagian 10% itu janji" tidak bisa dibayar di tempat lain
```

Satu settlement = **190.659 gas** (diukur dari receipt, dicatat di `server.js`). Karena itu rute ini
membatch: harga per item harus turun lewat batch supaya 10% platform tetap masuk akal.

### 6b. Daur hidup status setelah kertas terbit

```mermaid
stateDiagram-v2
    [*] --> Terbit: attestation on-chain
    Terbit --> Sah: tidak ada flag
    Terbit --> Ditangguhkan: bit suspension 1 (skors, bisa dicabut kembali)
    Terbit --> Tercabut: bit revocation 1 (TIDAK ada jalur unrevoke di EAS)
    Ditangguhkan --> Sah: suspension dihapus
    Tercabut --> Tercabut: permanen
    Sah --> PenerbitDijatuhkan: delistIssuer(issuer)
    PenerbitDijatuhkan --> Sah: relistIssuer(issuer)
    Sah --> Kadaluarsa: validUntil lewat
```

Pembeda yang harus disebut saat menjelaskan: **penerbit dijatuhkan ≠ kredensial dicabut.** Peserta
yang memegang kertas dari agen yang sudah tidak dipercaya dapat verdict `ISSUER_DELISTED`, sementara
attestation-nya sendiri tetap utuh dan artefaknya tetap di wallet-nya. Empat kasus ini punya baris
ujinya sendiri di `npm run probe` (web) **73/0** dan `npm run check` **88/0** (29 Sep).

---

## 7. Tahapan ↔ jaminan ↔ perintah yang membuktikannya

| # | tahap | yang dijamin | perintah (29 Sep) |
|---|---|---|---|
| 1 | identitas peserta | tanda tangan EIP-191 atas nonce satu-kali; nonce hidup di DB, bukan di `Set` dalam proses | `npm run verify:db` **70/0** (30 Sep malam; 48/0 sebelum B78(c) dan B104) |
| 2 | enrollment | baris per `(learner, course)`; `lessons_total` dari katalog; idempoten | `verify:attempts:live` 55/0 |
| 3 | belajar | state machine ditegak server, setiap perpindahan di-event-log | 57 POST progres, `walkFails = 0` |
| 4 | kuis | angka dihitung **server**; klien mengirim pilihan; `attempt_no` server yang naik; `verdict` dari ambang penerbit | `verify:db` (9 pemeriksaan `/grade`) |
| 5 | gerbang kelulusan | `all_lessons_done` **dan** `best_score >= passMark`, `NULL` = belum selesai | penolakan terukur + `attestationOf` tetap nol |
| 6 | penerbitan | kunci penerbit menandatangani; platform yang menyiarkan + bayar gas; prasyarat lewat `refUID` + pascakondisi `prerequisiteOf` | `npm run issue` / `npm run journey` 34/0 |
| 7 | sajian publik | 19 dari 19 kertas dapat dibuka tanpa laptop kami; kunci tiap kertas terdaftar di dokumen penerbitnya; kedua daftar status 200 tanpa `x-lencana-stale` dan healthz melaporkan `checked:27 / unchecked:0` | `npm run verify:edge` **8/0** (29 Sep sore) |
| 8 | penilaian eksternal | `outcome: VALID`, 14 checks, 0 error / 0 warning | `npm run validator -- --hash … --record` |
| 9 | pencabutan | `npm run revoke` di dalam repo; cabut permanen; status dibaca dari chain | `e2e` 46/0 · `check.js` 84/0 |
| 10 | jejak angka | `attempt_hash` tercetak di `/results/<course>/<hash>` dan bisa dihitung ulang dari baris Postgres | `verify:attempts` 25/0 |
| 11 | uang | pembayaran harus menunjuk kontrak pembagian kita; 10% platform di on-chain | `verify:x402` 20/0 (24 Sep) |
| 12 | **esai: penyerahan + antrean + penilaian penerbit** | teks masuk TANPA angka (`score NULL`, `verdict incomplete`); angka hanya bisa ditulis oleh tanda tangan EOA penerbit atas nonce; kriteria asing/sebagian ditolak; `attempt_hash` dihitung ulang dan hash lama dilaporkan | `verify:db` **45/0** (17 pemeriksaan esai) — 29 Sep |

---

## 8. Yang TIDAK bisa dilakukan sistem ini (jangan diucapkan di video)

| batasan | keadaan sebenarnya | kalimat yang boleh dipakai |
|---|---|---|
| **B81 sudah ditutup untuk esai — sisanya **praktik**** | Esai: `POST /essay` + `POST /essay/judgement` + `npm run grade:essay` (29 Sep). Praktik: belum punya rute sendiri — kalau suatu hari butuh bukti berupa berkas/tautan, itu tabel + rute baru, bukan kolom tambahan di `attempts` | "esai diserahkan ke penerbit dan dinilai dengan kunci penerbit; praktik belum punya permukaan penyerahan" |
| **B80 — kunci kuis ada di bundel browser** | `web/src/manifest.ts` menyalin `answer`; `/grade` menghapus **laporan angka oleh peserta**, bukan keterbukaan soalnya | "peserta tidak bisa melaporkan nilainya sendiri" — bukan "kuis tidak bisa dicurangi" |
| **B82 — tidak ada pemulihan akun** | identitas = alamat penandatangan; "kunci perangkat" viem di `sessionStorage` hangus bersama tab | "identitas peserta hari ini adalah alamat EVM-nya; dompet = akun" + sebut bahwa ini tahap awal |
| **Tidak ada peran learner/publisher/mentor sebagai produk** | Yang SUDAH ada: `publisher` punya padanan on-chain berupa **allowlist** (`addIssuer`/`delistIssuer`/`isIssuer` di `CredentialResolver.sol`). Yang belum: identitas **staf** (signer hanya mengenali tanda tangan peserta), tabel peran, dan custodia kunci agen (hari ini di `signer/.keys/` mesin ini). Tiga jalur + biayanya ada di **B87** — termasuk jalur mentor yang tidak menyentuh chain dan hanya ±½ hari | jangan sebut multi-institusi, onboarding self-service, atau peran mentor. Yang boleh: "penerbit terdaftar di allowlist on-chain; otoritas menilai tetap di sisi penerbit" |
| **Testnet 97 saja** | atas pilihan sadar (aturan hackathon membolehkan testnet); nol dana asli | "prototipe di BSC testnet; tidak ada dana riil di jalur ini" |
| **Reproducibility dari clone ada batasnya** | suite offline + `rubric`/`inventory` jalan dari clone; yang menyentuh chain butuh `.env`, kunci agen, dan store | "perintahnya ada di repo; angkanya dicetak oleh `.env` kami" — jangan "siapa pun bisa mengulang angka kami" |
| **Angka harness yang berubah sudah dijelaskan, bukan dihindari** | `check.js` 88 → 94 → 84. Sebab (29 Sep): pemeriksaan daftar sajian berlipat **per entri** `credentialStatus`; 5 dokumen lama masih array dua entri (22 entri) lalu dinormalkan jadi satu objek (17 entri) → 22−17 = 5 × 2 = **tepat 10**. `check.js` sekarang mencetak `info : 17 rekaman · 17 entri status × 2 = 34 pemeriksaan daftar sajian` supaya jumlahnya bisa direkonstruksi (B85 tertutup) | "84/0 pada 29 Sep, dan jumlah itu mengikuti bentuk korpus — baris `info` mencetak rinciannya" |

---

## 9. Naskah 90 detik untuk video (peta ke adegan)

1. **Masalah (10 dtk).** Ijazah digital hari ini adalah gambar: tidak ada yang bisa menjawab "masih
   sahkah ini, dari rubrik yang mana, dan angkanya dari mana".
2. **Standar umum dulu (20 dtk).** Buka `#/learn`: daftar → progres per lesson tercatat di backend →
   kuis dinilai **server** → progres dan usaha terbaca di kotak "Rekaman di penerbit".
3. **Sisipan on-chain (25 dtk).** `issue --from-attempts` → dua gerbang → attestation BAS → kertas
   Open Badges 3.0 ditandatangani **kunci institusi**, platform yang bayar gas → artefak soulbound.
4. **Yang bisa diperiksa orang (20 dtk).** `verify:edge` 17/17 · `vc.1ed.tech` `outcome: VALID` ·
   cabut kertasnya → bit berbalik → kertasnya **tetap terbaca**, statusnya berubah; dan prasyarat yang
   tercabut membuat ijazah turunannya terdeteksi lewat `prerequisiteOf`.
5. **Batas yang kami akui (15 dtk).** Testnet; esai masih jalur penerbit; identitas = dompet.

Perintah yang menggerakkan adegan 2-4 tanpa akting: `npm run journey` (sepuluh tahap, satu alur nyata)
lalu `npm run e2e` (menyatukan chain · daftar · URL di dalam kertas · artefak · verdict pihak ketiga).

---

## 10. Baca lanjutan

- [[00-Overview/11 - Product Bar]] — 12 elemen e-course + mana yang sudah/belum kita penuhi
- [[01-Architecture/01 - Architecture]] — pembagian lapis dan pemiliknya
- [[04-Signer-Service/S10 - Edge surface]] — kenapa tepi tidak pernah menandatangani
- [[12-LMS-References/L7 - What an e-course must have]] — kerangka umum yang jadi pembanding
- [[09-Testing/00 - Hub Testing]] — setiap angka di halaman ini dengan keluaran aslinya

