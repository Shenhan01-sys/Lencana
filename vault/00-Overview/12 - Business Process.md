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

Delapan diagram di bawah ini level-2 dari kotak `P1`–`P6` di atas, ditambah dua proses yang di level 1
terlihat sebagai satu panah (`/verify` berbayar) dan satu proses yang **belum ada** (esai) supaya tidak
ada yang mengira kotak kosong itu bagian dari sistem. Konvensi sama di semua gambar: `{{ }}` proses,
`[( )]` tempat data, `(( ))` aktor, dan panah diberi nama isinya.

### DFD-2 · P1 Enrollment — dari tanda tangan ke baris peserta

```mermaid
flowchart LR
  PE([Peserta])
  RR{{"1.1 verifikasi tanda tangan<br/>db.js:authorizeLearner"}}
  NN{{"1.2 consume nonce<br/>db.js:consumeNonce"}}
  LT{{"1.3 lessons_total dari katalog<br/>server, BUKAN dari klien"}}
  UP{{"1.4 upsert enrollment<br/>on_conflict learner,course_id"}}
  S1[("used_nonces<br/>learner · nonce · used_at")]
  S2[("enrollments<br/>learner · course_id · lessons_total<br/>· completed_at · status")]
  CAT[("katalog penerbit<br/>web/src/manifest.ts")]

  PE -->|POST /enroll · learner · course · message · signature| RR
  S1 -.->|cek belum pernah dipakai| RR
  RR -->|pesan tersahihkan| NN
  NN -->|nonce ditutup| S1
  RR --> LT
  CAT -.->|jumlah lesson dihitung di sini| LT
  LT --> UP
  UP -->|INSERT ... ON CONFLICT DO NOTHING| S2
  UP -->|200 enrollmentId · created| PE
```

Yang ditegak di proses ini, dan itu yang membuatnya bukan "form pendaftaran biasa": **satu-satunya
bukti bahwa yang menulis adalah peserta adalah tanda tangan EIP-191-nya**, dan nonce-nya hidup di DB
sehingga dua proses signer tidak bisa memakai nonce yang sama.

### DFD-2 · P2 Progres belajar — mesin status di server

```mermaid
flowchart LR
  PE([Peserta])
  AU{{"2.1 authorize<br/>tanda tangan + nonce"}}
  SM{{"2.2 uji pindah status<br/>db.js:ALLOWED_MOVE"}}
  WR{{"2.3 tulis lesson_progress<br/>upsert per enrollment+lesson"}}
  EV{{"2.4 event-log perpindahan<br/>selalu append, noop tidak ditulis"}}
  RU{{"2.5 roll-up<br/>semua completed → enrollments.completed_at"}}
  CL([Kursus / katalog])
  A1[("lesson_progress<br/>enrollment_id · lesson_id · status<br/>· position · updated_at")]
  A2[("progress_events<br/>from_status · to_status · at")]
  A3[("enrollments<br/>completed_at")]

  PE -->|POST /progress · lesson · status · position| AU
  AU --> SM
  SM -->|ditolak 422 kalau lompat| PE
  SM --> WR
  WR --> A1
  WR --> EV
  EV --> A2
  RU --> A3
  A1 -.->|bool_and status = completed| RU
  CL -.->|posisi lesson| WR
```

### DFD-2 · P3 Penilaian kuis — angka masuk lewat server, bukan lewat peserta

```mermaid
flowchart LR
  BR([Browser #/learn])
  GR{{"3.0 tolak badan yang memuat score<br/>400 · satu angka satu jalan masuk"}}
  AU{{"3.1 authorize tanda tangan + nonce"}}
  KEY{{"3.2 baca kunci soal<br/>quiz.js:quizLesson · manifest sisi server"}}
  SC{{"3.3 hitung per soal + verdict<br/>passPct milik penerbit"}}
  NO{{"3.4 attempt_no dihitung server<br/>db.js:nextAttemptNo"}}
  HA{{"3.5 attempt_hash<br/>db.js:computeAttemptHash · keccak256 atas 7 string"}}
  W1{{"3.6 INSERT attempts"}}
  W2{{"3.7 INSERT attempt_components per soal"}}
  K1[("attempts<br/>kind · attempt_no · score · verdict<br/>· rubric_hash · attempt_hash")]
  K2[("attempt_components<br/>item_id · score · weight · graded_by")]
  CAT[("manifest penerbit<br/>kunci jawaban ada di sini, di server")]

  BR -->|POST /grade · lesson · picks itemId+choice| GR
  GR --> AU
  AU --> SC
  CAT -.->|kunci| KEY
  KEY -.-> SC
  SC --> NO
  NO --> HA
  HA --> W1
  W1 --> K1
  W2 --> K2
  W1 --> W2
  SC -->|201 score · correct · total · attemptHash · attemptNo · rubricHash| BR
  K1 -.->|dihitung ulang oleh klien tanpa secret key| BR
```

### DFD-2 · P4 Penerbitan dari rekaman — tiga gerbang, satu attestation, nol karangan angka

```mermaid
flowchart TB
  PB([Penerbit · npm run issue -- --from-attempts])
  G1{{"4.1 gerbang selesai<br/>courseGates.all_lessons_done · NULL = belum tahu"}}
  G2{{"4.2 gerbang lulus<br/>best_score >= passMark penerbit"}}
  RD{{"4.3 baca rekaman<br/>db.js:attemptsFor embed attempt_components"}}
  MP{{"4.4 komponen → masukan computeScore<br/>src/fromAttempts.js · tanpa komponen = ditolak"}}
  CS{{"4.5 computeScore + rubricHash<br/>web/src/score.ts · verdict harus LULUS"}}
  PR{{"4.6 prasyarat on-chain<br/>attestationOf prereqHash → refUID"}}
  AT{{"4.7 BAS attest(schema, data)<br/>attester = kunci AGEN, bukan platform"}}
  AL{{"4.8 alokasi nomor bit<br/>store.js:loadAllocator · slot REVOCATION + SUSPENSION"}}
  BD{{"4.9 susun dokumen OB 3.0<br/>credential.js:buildOpenBadgeCredential"}}
  SG{{"4.10 tanda tangani<br/>sign.js:signDocument · Ed25519 Multikey penerbit"}}
  VF{{"4.11 verifikasi sendiri sebelum disimpan<br/>sign.js:verifyDocument"}}
  ST{{"4.12 simpan rekaman<br/>store.js:rememberCredential · evidence + attempts"}}
  AN{{"4.13 anchor hash daftar<br/>anchor.js:anchorListHash oleh platform · readAnchor"}}
  PU{{"4.14 publish ke tepi"}}
  D1[("course_gates view")]
  D2[("attempts + attempt_components")]
  D3[("BAS · attestation uid<br/>statusOf · prerequisiteOf")]
  D4[("store .store/state.json<br/>uid · bit index · dokumen · jejak")]
  D5[("resolver · schemaUID · isIssuer")]

  PB --> G1
  D1 -.-> G1
  G1 --> G2
  G2 --> RD
  D2 -.-> RD
  RD --> MP
  MP --> CS
  CS --> PR
  D5 -.-> PR
  PR --> AT
  AT --> D3
  D3 --> AL
  AL --> BD
  BD --> SG
  SG --> VF
  VF --> ST
  ST --> AN
  D4 -.->|servedHashes atas SEMUA yang dipantau| AN
  ST --> PU
  AT -.->|pascakondisi: prerequisiteOf != 0| PB
```

Tiga penolakan di kiri atas (`G1`, `G2`, `CS`) **berhenti sebelum `4.7`** — itu yang diukur
`verify:attempts:live` dengan menuntut `attestationOf(hash)` tetap nol setelah penolakan.

### DFD-2 · P5 Penyajian publik — tepi tidak pernah menandatangani

```mermaid
flowchart LR
  OP([Operator · npm run publish:edge])
  WH{{"5.1 himpun yang dipantau<br/>lists.js:servedHashes + store.js:watchedHashes"}}
  RL{{"5.2 render dua Bitstring Status List<br/>lists.js:renderList · tanda tangan di Node"}}
  DOC{{"5.3 kumpulkan dokumen<br/>credential · results · criteria · issuers"}}
  KV{{"5.4 tulis KV per kunci<br/>lencana-docs"}}
  WKR{{"5.5 Worker melayani<br/>rute → lookup KV · tanpa kunci di tepi"}}
  K1[("KV credentials/0x…")]
  K2[("KV results/course/hash")]
  K3[("KV credentials/status/revocation · suspension")]
  K4[("KV issuers/slug · criteria/course")]
  PU([Verifier publik · browser · validator 1EdTech])

  OP --> WH
  WH --> RL
  RL --> DOC
  DOC --> KV
  KV --> K1
  KV --> K2
  KV --> K3
  KV --> K4
  PU -->|GET tanpa kredensial apa pun| WKR
  WKR --> K1
  WKR --> K2
  WKR --> K3
  WKR --> K4
  WKR -->|x-lencana-stale saat chain-diverged| PU
```

### DFD-2 · P6 Pencabutan & penangguhan — cabut permanen, dan itu dijaga tes

```mermaid
flowchart LR
  PB([Penerbit · npm run revoke -- --hash])
  RD{{"6.1 baca state sekarang<br/>resolver:statusOf → exists · revoked · expired · delisted · issuer"}}
  RF{{"6.2 menolak kalau sudah tercabut<br/>EAS tidak punya unrevoke · dijaga test_fork_TidakAdaJalurUnrevoke"}}
  RV{{"6.3 BAS revoke(schema, uid) oleh kunci AGEN"}}
  RB{{"6.4 baca ulang dari chain<br/>after[1] harus true, kalau tidak: merah"}}
  AN{{"6.5 re-anchor hash daftar yang berubah"}}
  PU{{"6.6 publish:edge supaya daftar tersaji ikut bergerak"}}
  C1[("BAS · uid tercabut")]
  C2[("store bit index REVOCATION")]
  C3[("KV daftar status")]
  CH([Chain 97])

  PB --> RD
  CH -.-> RD
  RD --> RF
  RF --> RV
  RV --> C1
  C1 --> RB
  RB --> AN
  C2 -.->|hash atas SEMUA yang dipantau| AN
  AN --> PU
  PU --> C3
```

### DFD-2 · P7 Verifikasi berbayar antar-mesin (x402) — satu-satunya proses yang menghasilkan uang

```mermaid
flowchart LR
  MA([Klien berbayar / agen])
  OF{{"7.1 tawarkan syarat bayar<br/>x402.js:paymentRequirements · 402 + accepts"}}
  DE{{"7.2 decode X-Payment"}}
  GU{{"7.3 penjaga: token · payTo = SPLIT kita · jumlah · EIP-2612 + witness"}}
  SE{{"7.4 settle sebagai fasilitator<br/>x402.js:settlePayment"}}
  SP{{"7.5 split di kontrak kita<br/>SettlementSplit · platformBps = 1000 = 10%"}}
  HE{{"7.6 header X-PAYMENT-RESPONSE<br/>settleTx · splitTx · splitRef"}}
  RE{{"7.7 laporan verifikasi<br/>statusOf per hash · batch diukur gas-nya"}}
  M1[("chain 97 · token demo + SettlementSplit")]
  M2[("chain 97 · resolver statusOf")]

  MA -->|POST /verify tanpa X-Payment| OF
  OF -->|402 accepts| MA
  MA -->|POST /verify + X-Payment| DE
  DE --> GU
  GU -->|ditolak kalau payTo bukan split kita| MA
  GU --> SE
  SE --> SP
  SP --> M1
  RE --> M2
  SE --> HE
  HE --> MA
  M2 -.-> RE
  RE --> MA
```

### DFD-2 · P8 Yang BELUM ada — penyerahan esai + antrean penilaian (B81)

Kotak ini sengaja digambar sebagai rencana, bukan realitas, supaya tidak dibaca dari diagram sebagai
fitur. **Bagian penilainya sudah ada** (`grade.js:gradeAgainstRubric` + juri model, dan `verdict`
`incomplete` + `graded_by` `human` sudah sah di skema); yang belum adalah permukaan penyerahan dan
antreannya.

```mermaid
flowchart LR
  PE([Peserta]):::rencana
  SU{{"9.1 POST /essay menyimpan TEKS<br/>butuh kolom/tabel + kebijakan retensi"}}:::rencana
  IN{{"9.2 attempts verdict=incomplete<br/>score NULL · belum dinilai bukan nol"}}:::sudahada
  Q[("antrean penilaian<br/>BELUM ADA")]:::rencana
  JD{{"9.3 gradeAgainstRubric · mechanical gates + model<br/>SUDAH ADA, dipakai jalur CLI"}}:::sudahada
  HB{{"9.4 reviewer manusia menulis ulang komponen<br/>graded_by=human · tabel per-penerbit BELUM ADA"}}:::rencana
  GA{{"9.5 gerbang terbit menolak incomplete<br/>SUDAH ditegak computeScore → BELUM_LENGKAP"}}:::sudahada
  TX[(teks karangan<br/>hari ini hanya di perangkat peserta)]:::rencana

  PE -.->|BELUM ada rute ini| SU
  SU -.-> TX
  SU -.-> IN
  IN -.-> Q
  Q -.-> JD
  Q -.-> HB
  JD -->|komponen graded_by=model| GA
  HB -->|komponen graded_by=human| GA

  classDef rencana stroke-dasharray:5 5,color:#888
  classDef sudahada stroke:#2e7d32
```

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
ujinya sendiri di `npm run probe` (web) **73/0** dan `npm run check` **84/0** (29 Sep).

---

## 7. Tahapan ↔ jaminan ↔ perintah yang membuktikannya

| # | tahap | yang dijamin | perintah (29 Sep) |
|---|---|---|---|
| 1 | identitas peserta | tanda tangan EIP-191 atas nonce satu-kali; nonce hidup di DB, bukan di `Set` dalam proses | `npm run verify:db` **28/0** |
| 2 | enrollment | baris per `(learner, course)`; `lessons_total` dari katalog; idempoten | `verify:attempts:live` 55/0 |
| 3 | belajar | state machine ditegak server, setiap perpindahan di-event-log | 57 POST progres, `walkFails = 0` |
| 4 | kuis | angka dihitung **server**; klien mengirim pilihan; `attempt_no` server yang naik; `verdict` dari ambang penerbit | `verify:db` (9 pemeriksaan `/grade`) |
| 5 | gerbang kelulusan | `all_lessons_done` **dan** `best_score >= passMark`, `NULL` = belum selesai | penolakan terukur + `attestationOf` tetap nol |
| 6 | penerbitan | kunci penerbit menandatangani; platform yang menyiarkan + bayar gas; prasyarat lewat `refUID` + pascakondisi `prerequisiteOf` | `npm run issue` / `npm run journey` 34/0 |
| 7 | sajian publik | 17 dari 17 kertas dapat dibuka tanpa laptop kami; kunci tiap kertas terdaftar di dokumen penerbitnya | `npm run verify:edge` **8/0** |
| 8 | penilaian eksternal | `outcome: VALID`, 14 checks, 0 error / 0 warning | `npm run validator -- --hash … --record` |
| 9 | pencabutan | `npm run revoke` di dalam repo; cabut permanen; status dibaca dari chain | `e2e` 46/0 · `check.js` 84/0 |
| 10 | jejak angka | `attempt_hash` tercetak di `/results/<course>/<hash>` dan bisa dihitung ulang dari baris Postgres | `verify:attempts` 25/0 |
| 11 | uang | pembayaran harus menunjuk kontrak pembagian kita; 10% platform di on-chain | `verify:x402` 20/0 (24 Sep) |

---

## 8. Yang TIDAK bisa dilakukan sistem ini (jangan diucapkan di video)

| batasan | keadaan sebenarnya | kalimat yang boleh dipakai |
|---|---|---|
| **B81 — esai/praktik masih laporan klien** | `POST /attempts` menerima `score`; yang sudah server-authoritative baru **kuis** (`/grade`). Yang kurang cuma tiga hal dan mesin penilainya sudah ada (`grade.js:gradeAgainstRubric`, `verdict='incomplete'`, `graded_by='model'|'human'` sudah sah di skema): tempat menyimpan teks, rute penyerahan, panggilan judge dari server. **±3 jam, bukan mustahil** — lihat DFD-2 **P8** di halaman ini | "angka kuis dihitung penerbit dan bisa ditunjuk barisnya; esai saat ini dinilai lewat jalur penerbit (`issue --essay --judge`) dan penyerahannya dari halaman belum kami bangun" |
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
