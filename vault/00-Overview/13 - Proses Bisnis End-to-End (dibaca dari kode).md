---
tags: [overview, business-process, diagrams]
status: active
updated: 2026-09-30
---

# 13 - Proses Bisnis End-to-End (dibaca dari kode)

**Peta:** [[Index]] · [[START-HERE]] · **Backlog:** [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Rute:** [[04-Signer-Service/S7 - Server routes and lifecycle]] · **Kontrak:** [[02-Contracts/01 - Contracts]] ·
**Klaim yang boleh diucapkan:** [[10-Contributors/Claims-Cheat-Sheet]] · **Testing:** [[09-Testing/00 - Hub Testing]]

> **Asal halaman ini.** Ditulis 30 Sep atas permintaan builder: "paparkan proses bisnis Lencana dari
> pemahamanmu sendiri, jangan langsung percaya halaman proses bisnis yang sudah ada". Jadi sumbernya
> **kode dan kontrak**, bukan [[00-Overview/06 - Business Process]] atau [[00-Overview/12 - Business Process]].
> Yang kubaca: `web/src/learning.ts`, `web/src/verify.ts`, `web/src/manifest.ts`, `web/src/score.ts`,
> `signer/src/server.js`, `signer/src/db.js`, `signer/src/quiz.js`, `signer/src/grade.js`,
> `signer/src/judge.js`, `signer/src/fromAttempts.js`, `signer/src/credential.js`,
> `signer/src/relay.js`, `signer/src/deposit.js`, `signer/src/x402.js`, `signer/scripts/issue.js`,
> `signer/scripts/grade-essay.js`, `signer/scripts/revoke.js`, `signer/scripts/publish.js`,
> `cloudflare/worker.mjs`, `contracts/CredentialResolver.sol`, `contracts/SoulboundCert.sol`,
> `contracts/SettlementSplit.sol`, `contracts/CourseDeposit.sol`, `supabase/migrations/`.
> **Aku belum mencocokkannya baris per baris dengan dua halaman lama itu** — kalau ada selisih, yang
> benar adalah kodenya, dan selisihnya layak jadi koreksi terlihat di halaman lama.
>
> **Perubahan arah sesudah halaman ini ditulis — D53, 1 Okt.** Builder memutuskan tiga hal yang
> mengubah bagian 2, 7, dan 11 di bawah (keadaan kodenya belum berubah; halaman ini tetap menggambarkan
> kode hari ini): (1) agen penilai dimiliki peran baru **Agent Owner**, dan **penerbit menyewanya per
> aktivitas penilaian** dengan tujuh label tingkat berat (sangat ringan … sangat berat) — B119;
> (2) identitas agen memakai **registry ERC-8004 yang disediakan BNB** — B118; (3) **reviewer
> diperlakukan sebagai penilai**, boleh agen AI — B120. Lihat [[00-Overview/03 - Decisions]] D53.
>
> Halaman ini sengaja hampir tanpa angka. Angka harness hidup di `09-Testing/numbers.json`
> (`npm run sync:numbers`).

## 1. Lencana dalam satu paragraf

Lencana adalah platform e-course yang **tidak memutuskan siapa yang lulus**. Peserta belajar dan
mengerjakan tugas di halaman Lencana. Yang menilai dan menerbitkan ijazah adalah **penerbit kursus**
lewat kunci miliknya sendiri. Lencana menyediakan relnya: menyimpan rekaman belajar, menyiarkan
transaksi, menyajikan dokumen di alamat yang tahan lama, dan menjaga daftar penerbit yang diakui.
Ijazahnya punya dua wujud yang saling menunjuk: **attestation di chain** (BNB Attestation Service,
dibaca siapa pun lewat satu `eth_call`) dan **dokumen Open Badges 3.0 bertanda tangan** (dibaca
verifier standar yang tidak mengenal chain). Pemeriksa tidak perlu percaya Lencana: status sah,
dicabut, kadaluarsa, atau penerbit-didelisting dibaca dari chain.

## 2. Siapa saja, dan kunci apa yang mereka pegang

Di Lencana **otoritas = kunci**. Tidak ada akun dan kata sandi di sisi server; setiap tulisan dibuktikan
dengan tanda tangan.

| aktor | kunci yang dipegang | yang boleh ia lakukan | yang TIDAK bisa ia lakukan |
|---|---|---|---|
| **Peserta** | alamat EVM: dompet ekstensi, atau "kunci perangkat" yang dibuat browser dan mati bersama tab (`web/src/learning.ts`) | mendaftar, mencatat progres, mengirim jawaban kuis dan teks esai | mengirim angka nilai kuis atau esai; menerbitkan apa pun |
| **Penerbit kursus** (institusi) | **EOA agen** (secp256k1, tercatat sebagai `attester`) dan **kunci dokumen** Ed25519 (`signer/src/issuer.js`) | menetapkan rubrik lewat manifest, menilai esai, menunjuk reviewer, menerbitkan dan mencabut kredensial | mengesahkan angka modelnya sendiri; menerbitkan kalau alamatnya tidak ada di daftar resolver |
| **Reviewer** | EOA yang ditunjuk penerbit per kursus | menandatangani `approved` / `adjusted` / `rejected` atas angka usulan model | menilai esai yang bukan usulan model; mengesahkan esainya sendiri |
| **Platform Lencana** | kunci owner resolver = kunci pembayar gas (`DEPLOYER_PRIVATE_KEY`) | mendaftarkan dan mendelisting penerbit, menyiarkan transaksi atas nama agen, menyegel daftar status, mencetak artefak soulbound, menyajikan dokumen | **mencabut** kredensial penerbit, mengubah isi klaim, menilai peserta |
| **Pemeriksa** (HRD, kampus lain, siapa pun) | tidak ada | membaca status dari chain, membuka dokumen dari tepi publik | — |
| **Klien mesin** | EOA pemegang token | membayar per permintaan untuk verifikasi massal (`POST /verify`) | — |
| ***Agent Owner*** — D53; **identitasnya sudah ada (B118), sewanya belum (B119)** | pemilik NFT identitas ERC-8004 agen (#2534, `0x067c…0c4f`) | merawat berkas registrasi dan dompet agen; kelak disewa penerbit per aktivitas penilaian | — (batas wewenangnya belum diputuskan; lihat dampak di B119) |

⚠️ **Yang harus dibaca bersama tabel ini.** Di demo hari ini kunci agen penerbit (`ISSUER_PRIVATE_KEY`
dan `signer/.keys/`) berada di mesin yang sama dengan kunci platform. Pemisahan peran di atas
**ditegakkan oleh kontrak dan oleh bentuk tanda tangan**, tetapi orang yang menjalankannya satu.
"Agen milik institusi yang menandatangani sendiri" baru benar-benar terjadi kalau institusi memegang
kuncinya sendiri dan menyerahkan hasil tanda tangannya lewat `POST /relay`.

## 3. Gambar besar — siapa bicara dengan siapa

```mermaid
flowchart LR
  subgraph ORANG["Orang dan kunci mereka"]
    P["Peserta<br/>dompet atau kunci perangkat"]
    I["Penerbit kursus<br/>EOA agen + kunci dokumen"]
    R["Reviewer<br/>EOA yang ditunjuk penerbit"]
    V["Pemeriksa<br/>tanpa kunci"]
    M["Klien mesin<br/>EOA pembayar"]
  end
  subgraph LENCANA["Platform Lencana"]
    W["Halaman web<br/>belajar + verifikasi"]
    S["Signer service<br/>rute HTTP + perintah CLI"]
    DB[("Postgres<br/>rekaman belajar")]
    E["Tepi publik<br/>Worker + KV"]
  end
  subgraph CHAIN["BNB Chain testnet 97"]
    BAS["BAS<br/>attestation + stempel waktu"]
    RES["CredentialResolver<br/>daftar penerbit + status"]
    SBT["SoulboundCert<br/>artefak tak terpindahkan"]
    UANG["SettlementSplit<br/>CourseDeposit"]
  end
  P -->|"belajar"| W
  W -->|"tulis bertanda tangan"| S
  S --> DB
  I -->|"menilai, menerbitkan, mencabut"| S
  R -->|"mengesahkan angka model"| S
  S -->|"attest, segel, cetak"| BAS
  BAS -->|"memanggil onAttest"| RES
  SBT -->|"membaca status"| RES
  S -->|"publish dokumen"| E
  V -->|"baca status"| RES
  V -->|"baca dokumen"| E
  W -->|"verifikasi: eth_call langsung"| RES
  M -->|"bayar lalu minta verifikasi"| S
  S -->|"settlement"| UANG
```

Dua hal yang gambar ini sengaja tunjukkan: halaman verifikasi **tidak lewat server kita** (ia membaca
resolver langsung), dan pemeriksa punya **dua jalan** yang sama-sama tidak butuh laptop kami.

## 4. Data tinggal di mana, dan siapa yang dipercaya untuknya

| # | tempat | isinya | siapa yang bisa menulis | siapa yang dipercaya pembaca |
|---|---|---|---|---|
| D1 | **Postgres** (Supabase) | `enrollments`, `lesson_progress`, `progress_events`, `attempts`, `attempt_components`, `submissions` (teks esai), `used_nonces`, `review_roles`, `judgement_reviews`, view `course_gates` | signer service saja (secret key). RLS aktif tanpa policy, jadi kunci publik tidak membaca apa pun | platform — ini rekaman kerja, bukan bukti publik |
| D2 | `signer/.store/state.json` | kredensial yang dipantau, nomor bit tiap kredensial, rekaman penerbitan + dokumen bertanda tangan | perintah penerbitan di mesin signer | platform |
| D3 | `signer/.keys/` | kunci dokumen Ed25519 tiap agen | `npm run agent` | penerbit (hari ini: di mesin platform) |
| D4 | **Workers KV** di tepi | dokumen kredensial, dokumen hasil, dokumen kriteria, dokumen penerbit, dua daftar status | `npm run publish:edge` | siapa pun bisa membaca; tanda tangan dokumennya yang dipercaya, bukan host-nya |
| D5 | **Chain 97** | attestation BAS, status di resolver, stempel waktu hash daftar status, artefak soulbound, setoran | agen (klaim), platform (daftar penerbit, segel, artefak) | **tidak perlu percaya siapa pun** |

```mermaid
flowchart TB
  PES["Peserta"]
  PEN["Penerbit"]
  REV["Reviewer"]
  PEM["Pemeriksa"]

  P1("1. Mendaftar dan belajar")
  P2("2. Menilai")
  P3("3. Menerbitkan")
  P4("4. Menyajikan")
  P5("5. Memverifikasi")
  P6("6. Mencabut atau mendelisting")

  D1[("D1 Postgres")]
  D2[("D2 store signer")]
  D4[("D4 KV tepi")]
  D5[("D5 chain 97")]

  PES -->|"tanda tangan + progres + pilihan kuis + teks esai"| P1
  P1 -->|"enrollment, progres, usaha"| D1
  PEN -->|"angka per kriteria, bertanda tangan"| P2
  REV -->|"keputusan pengesahan, bertanda tangan"| P2
  D1 -->|"antrean esai"| P2
  P2 -->|"komponen nilai + pengesahan"| D1
  D1 -->|"dua gerbang + komponen tersimpan"| P3
  PEN -->|"kunci agen"| P3
  P3 -->|"attestation"| D5
  P3 -->|"dokumen bertanda tangan + nomor bit"| D2
  D2 -->|"dokumen + daftar status"| P4
  D5 -->|"status tiap kredensial"| P4
  P4 -->|"blob bertanda tangan"| D4
  P4 -->|"segel hash daftar"| D5
  PEM -->|"hash kredensial"| P5
  D5 -->|"status"| P5
  D4 -->|"dokumen"| P5
  P5 -->|"putusan + alasan"| PEM
  PEN -->|"revoke"| P6
  P6 -->|"revocationTime atau status delisting"| D5
```

## 5. Alur A — penerbit menyiapkan kursus dan agennya

Ini bagian yang paling manual, dan harus dibaca apa adanya.

1. **Kursus ditulis sebagai data** (`web/src/courses/*.ts`): modul, lesson, soal kuis beserta kuncinya,
   rubrik esai per kriteria, bobot (`weights`), ambang lulus (`passMark`), masa berlaku (`validDays`),
   dan kursus prasyarat (`prereqCourseId`).
2. Data itu dibungkus **manifest penerbit** (`web/src/manifest.ts`). Dari manifest dihitung dua sidik
   jari: `rubricHash` (aturan penilaian: bobot, ambang, kunci, rubrik) dan `manifestHash` (seluruh
   isi, termasuk materi). Keduanya yang membuat pertanyaan "angka ini dinilai dengan aturan versi
   mana" punya jawaban.
3. Penerbit membuat **kunci dokumen** (`npm run agent`) — dokumen penerbitnya lalu tersaji di
   `/issuers/<slug>`, berisi kunci publik yang dipakai verifier standar.
4. **Platform** mendaftarkan EOA agen ke resolver (`addIssuer`, hanya owner). Tanpa ini setiap
   attestation agen itu ditolak `NotAnIssuer`.
5. Kriteria kursus tersaji publik di `/criteria/<courseId>` — bobot, ambang, rubrik, **tanpa** kunci
   jawaban kuis.

Tidak ada pendaftaran mandiri untuk penerbit: menambah kursus berarti mengubah kode, dan menambah
penerbit berarti platform menjalankan satu transaksi.

## 6. Alur B — peserta belajar

```mermaid
sequenceDiagram
  autonumber
  participant P as Peserta
  participant W as Halaman belajar
  participant S as Signer service
  participant DB as Postgres

  P->>W: pilih identitas (dompet atau kunci perangkat)
  W->>S: POST /enroll (alamat, pesan ber-nonce, tanda tangan)
  S->>S: periksa tanda tangan, lalu pakai nonce sekali
  S->>DB: enrollments (jumlah lesson dihitung server dari katalog)
  loop tiap lesson
    W->>S: POST /progress (unlocked, started, completed)
    S->>S: tolak lompatan status yang tidak sah (422)
    S->>DB: lesson_progress + progress_events
  end
  P->>W: jawab kuis
  W->>S: POST /grade (PILIHAN jawaban, bukan angka)
  S->>S: nilai terhadap kunci di manifest penerbit
  S->>DB: attempts + komponen per soal + attempt_hash
  S-->>W: skor, verdict, attempt_hash
  P->>W: tulis esai
  W->>S: POST /essay (TEKS saja)
  S->>S: periksa tanda mekanis
  S->>DB: attempts (skor kosong) + submissions
  S-->>W: menunggu penilaian penerbit
```

Aturan yang ditegakkan kode di alur ini:

- **Setiap tulisan ditandatangani peserta** atas pesan ber-nonce; nonce disimpan di database, jadi
  pesan yang sama tidak bisa dipakai dua kali (`signer/src/db.js` `authorizeLearner`).
- **Progres adalah mesin status**: `locked → unlocked → started → completed`. Melompat ditolak.
- **"Selesai" dihitung server**: penyebutnya (`lessons_total`) dibaca dari katalog penerbit, bukan dari
  kiriman klien.
- **Kuis dinilai server.** `/grade` menolak kiriman yang membawa `score`.
- **Esai masuk tanpa angka.** `/essay` menolak `score`, `rubric`, `max`. Yang diperiksa saat itu hanya
  lima tanda mekanis (panjang, menyebut alamat `0x…`, menyebut URL, menyebut fungsi atau perintah,
  menyatakan batas kesimpulannya). Kurang dari cukup → `insufficient`; cukup → masuk antrean.
- **`attempt_hash`** adalah sidik jari satu baris usaha (peserta, kursus, lesson, jenis, nomor usaha,
  skor, `rubricHash`). Ia yang nanti tercetak di dokumen hasil sebagai "alamat" angka itu.

## 7. Alur C — penilaian: siapa yang memberi angka

| jenis tugas | siapa yang menghitung angkanya | apa yang membuktikannya |
|---|---|---|
| **kuis** | server, terhadap kunci di manifest penerbit | komponen per soal tersimpan |
| **esai** | penerbit: lewat model, atau manusia | tanda tangan EOA penerbit; kalau dari model, tambah tanda tangan reviewer |
| **praktik** | **peserta sendiri** — `POST /attempts` menerima angka kiriman klien | hanya tanda tangan peserta. Ini lubang, lihat bagian 13 |

```mermaid
sequenceDiagram
  autonumber
  participant I as Penerbit (CLI grade-essay)
  participant M as Model penilai
  participant S as Signer service
  participant DB as Postgres
  participant R as Reviewer

  I->>DB: baca antrean esai (state awaiting_judge)
  alt dinilai model
    I->>M: teks + rubrik penerbit, temperature 0
    M-->>I: angka per kriteria
    I->>S: POST /essay/judgement (angka, nama model, tanda tangan EOA penerbit)
    S->>DB: komponen graded_by=model, attempts.judge_model terisi
    Note over S,DB: angka ini USULAN. Gerbang belum menghitungnya.
    I->>S: POST /essay/reviewers (menunjuk reviewer, bertanda tangan)
    R->>S: POST /essay/review (approved, adjusted, atau rejected)
    S->>S: reviewer terdaftar? bukan penerbit? pesan mengikat usaha + keputusan + angka akhir?
    alt approved
      S->>DB: judgement_reviews, angka model dipakai
    else adjusted
      S->>DB: komponen diganti angka reviewer (graded_by=human), hash usaha dihitung ulang
    else rejected
      S->>DB: judgement_reviews tanpa angka akhir, gerbang tetap tertutup
    end
  else dinilai manusia penerbit
    I->>S: POST /essay/judgement (angka, tanpa nama model, tanda tangan)
    S->>DB: komponen graded_by=human, langsung dihitung gerbang
  end
```

```mermaid
stateDiagram-v2
  [*] --> Antre: teks diserahkan, tanda mekanis cukup
  [*] --> Kurang: tanda mekanis tidak cukup
  Antre --> DinilaiPenerbit: penerbit menilai tanpa model
  Antre --> UsulanModel: penerbit menandatangani angka model
  UsulanModel --> Disahkan: reviewer approved atau adjusted
  UsulanModel --> Ditolak: reviewer rejected
  Disahkan --> UsulanModel: penerbit menilai ulang, pengesahan gugur
  Ditolak --> UsulanModel: penerbit menilai ulang
  DinilaiPenerbit --> [*]: dihitung gerbang
  Disahkan --> [*]: dihitung gerbang
```

Hanya dua keadaan yang **dihitung gerbang**: `DinilaiPenerbit` dan `Disahkan`. "Ditolak reviewer"
tidak sama dengan "nilai nol" — tidak ada angka yang ditulis.

## 8. Alur D — penerbitan

Penerbitan **dijalankan penerbit lewat perintah** (`npm run issue -- --from-attempts --course … --learner …`),
bukan otomatis oleh halaman. Perintah itu membaca rekaman, dan boleh menolak.

```mermaid
flowchart TD
  A["issue --from-attempts<br/>kursus + alamat peserta"] --> B{"Ada enrollment?"}
  B -- tidak --> X1["BERHENTI<br/>tidak ada baris untuk dibaca"]
  B -- ya --> C{"Gerbang 1<br/>semua lesson selesai?"}
  C -- tidak --> X2["BERHENTI<br/>belum selesai belajar"]
  C -- ya --> D{"Gerbang 2<br/>nilai terbaik >= ambang penerbit?"}
  D -- tidak --> X3["BERHENTI<br/>di bawah ambang"]
  D -- ya --> E{"Bukti bisa diturunkan<br/>dari komponen tersimpan?"}
  E -- "esai model belum disahkan" --> X4["BERHENTI<br/>butuh pengesahan manusia"]
  E -- "usaha tanpa komponen" --> X5["BERHENTI<br/>angka tanpa rincian bukan penilaian"]
  E -- ya --> F{"computeScore terhadap<br/>bobot manifest = LULUS?"}
  F -- "belum lengkap atau tidak lulus" --> X6["BERHENTI<br/>rubrik penerbit bilang belum"]
  F -- LULUS --> G{"EOA agen terdaftar<br/>di resolver?"}
  G -- tidak --> X7["BERHENTI<br/>bukan penerbit yang diizinkan"]
  G -- ya --> H{"Kursus punya prasyarat?"}
  H -- "ya, dan belum tercatat di chain" --> X8["BERHENTI<br/>terbitkan prasyaratnya dulu"]
  H -- "tidak, atau sudah ada" --> T["Mulai menulis ke chain"]
```

Semua kotak BERHENTI terjadi **sebelum gas bergerak**. Angka yang dipakai tidak pernah diambil dari
kolom `score`: `signer/src/fromAttempts.js` menurunkannya ulang dari `attempt_components`, dan kalau
perintah diberi angka lewat flag bersamaan dengan `--from-attempts`, ia menolak ("satu angka tidak
boleh punya dua jalan masuk").

```mermaid
sequenceDiagram
  autonumber
  participant I as Penerbit (issue.js, kunci agen)
  participant BAS as BAS
  participant RES as CredentialResolver
  participant ST as Store signer
  participant PL as Platform (kunci pembayar gas)
  participant E as Tepi publik

  I->>BAS: attest (penerima, kadaluarsa, refUID prasyarat, data 3 x bytes32)
  BAS->>RES: onAttest
  RES->>RES: attester terdaftar? hash belum pernah terbit? prasyarat hidup, milik orang yang sama, penerbitnya tidak didelisting?
  RES-->>BAS: terima, atau revert bernama
  I->>RES: baca balik attestationOf dan prerequisiteOf
  I->>ST: tetapkan nomor bit di dua daftar status
  I->>I: rakit dokumen OpenBadgeCredential 3.0
  I->>I: tanda tangani dengan kunci dokumen (eddsa-rdfc-2022), lalu verifikasi sendiri
  I->>ST: simpan rekaman + dokumen
  PL->>BAS: timestamp(hash daftar status yang disajikan)
  PL->>E: publish:edge (dokumen, hasil, kriteria, dokumen penerbit, dua daftar status)
  E-->>PL: dibaca balik lewat URL publik
```

Yang dihasilkan satu penerbitan:

- **Attestation** di BAS. `attester` = EOA agen penerbit, `recipient` = alamat peserta, `expirationTime`
  = hari ini + `validDays` penerbit. Identitas kredensialnya `credentialHash = keccak256("vc:", alamat
  peserta, id kursus)`, jadi **satu peserta satu kertas per kursus** — resolver menolak duplikat
  (`AlreadyIssued`).
- **Dokumen** Open Badges 3.0 / VC 2.0 di `…/credentials/<credentialHash>`, yang mencetak URL penerbit,
  URL kriteria, URL hasil, dan entri daftar status (`signer/src/credential.js`).
- **Dokumen hasil** di `…/results/<courseId>/<credentialHash>`: angka, rubrik, `attempt_hash` tiap usaha,
  siapa menilai (model apa), dan siapa mengesahkan. Tanpa teks esai dan tanpa kunci jawaban.
- **Dua daftar status** (Bitstring Status List): `revocation` dan `suspension` (= penerbit didelisting).
  Bitnya **diturunkan dari chain**, bukan dari catatan kita, dan hash daftar yang disajikan distempel
  ke BAS.

**Dua jalur lain ke chain**, untuk penerbit yang memegang kuncinya sendiri dan tidak mau memegang BNB:

- `npm run delegate` — agen menandatangani permintaan attestation (EIP-712), platform yang menyiarkan
  dan membayar gas. `attester` yang tercatat tetap agen.
- `POST /relay` — bentuk layanan dari hal yang sama: agen menyerahkan delegasi bertanda tangan lewat
  HTTP; rute menolak sebelum gas segala yang pasti revert. Siaran mati kecuali `RELAY_BROADCAST=1`.
  Jalur ini hanya membuat attestation; dokumennya tetap dari `issue.js`.

**Artefak soulbound** (`contracts/SoulboundCert.sol`) adalah langkah terpisah dan milik **platform**:
hanya owner kontrak yang boleh `mint`/`mintBatch`, dan kontrak menolak kalau kredensialnya tidak ada,
dicabut, kadaluarsa, penerbitnya didelisting, pemegangnya bukan alamat itu, atau ia kredensial tingkat
lesson (artefak hanya untuk tingkat kursus). Token tidak bisa dipindahkan, dan `tokenURI` dirakit saat
dibaca dari status resolver — jadi artefak kredensial yang dicabut ikut terbaca dicabut.

## 9. Alur E — verifikasi: tiga jalan, tidak satu pun butuh percaya Lencana

| jalan | siapa | apa yang dibaca | batasnya |
|---|---|---|---|
| **Halaman verifikasi** | manusia | `statusOf` di resolver lewat RPC publik, langsung dari browser (`web/src/verify.ts`) | butuh RPC yang menjawab |
| **Verifier standar** (mis. validator Open Badges) | alat pihak ketiga | dokumen → dokumen penerbit → daftar status, semuanya lewat URL yang tercetak di dokumen | hanya melihat `revocation`; **delisting tidak terlihat** dari dokumen saja |
| **`POST /verify` berbayar** | mesin | logika yang sama dengan halaman, sampai 25 hash per pembayaran | lewat server kita |

```mermaid
flowchart TD
  IN["Masukan: credentialHash, uid attestation,<br/>tokenId artefak, atau alamat"] --> A{"Tercatat di resolver,<br/>dan diterbitkan lewat resolver kita?"}
  A -- tidak --> NF["NOT_FOUND"]
  A -- ya --> B{"Dicabut penerbitnya?"}
  B -- ya --> RV["REVOKED<br/>permanen"]
  B -- tidak --> C{"Jam chain melewati<br/>tanggal kadaluarsa?"}
  C -- ya --> EX["EXPIRED<br/>berubah sendiri"]
  C -- tidak --> D{"Penerbitnya sedang<br/>didelisting platform?"}
  D -- ya --> DL["ISSUER_DELISTED<br/>bisa dipulihkan"]
  D -- tidak --> OK["VALID"]
```

Sejak 1 Okt (B118) halaman juga membaca **identitas ERC-8004 agen penerbit**: manifest penerbit menyebut
`agentId`, lalu halaman membuktikan ke registry BNB bahwa `agentWallet` identitas itu = attester kertas.
Hasilnya satu kalimat alasan; verdict di bawah **tidak** berubah karenanya.

Urutannya disengaja: fakta tentang **kredensial** (dicabut, kadaluarsa) menang atas penilaian tentang
**penerbit** (didelisting). Halaman juga menelusuri rantai prasyarat (`prerequisiteOf`, berulang) dan
menampilkan keadaan tiap mata rantainya, serta artefak soulbound kalau ada.

Tepi publik (`cloudflare/worker.mjs`) tidak menandatangani apa pun. Tapi untuk kedua daftar status ia
**membaca chain saat permintaan datang** dan mencocokkan tiap bit dengan blob yang disajikan; kalau
berbeda, jawabannya 503 bertanda `x-lencana-stale`, bukan daftar lama yang tanda tangannya masih sah.

## 10. Alur F — sesudah terbit: mencabut, mendelisting, kadaluarsa

```mermaid
stateDiagram-v2
  [*] --> Sah: attestation diterima resolver
  Sah --> Dicabut: agen penerbit memanggil revoke di BAS
  Sah --> Kadaluarsa: jam chain melewati expirationTime
  Sah --> PenerbitDidelisting: owner resolver memanggil delistIssuer
  PenerbitDidelisting --> Sah: owner resolver memanggil relistIssuer
  PenerbitDidelisting --> Dicabut: agen tetap boleh mencabut miliknya
  Dicabut --> [*]
  Kadaluarsa --> [*]
```

| kejadian | siapa yang bisa memicu | bisa dibatalkan? | akibat turunannya |
|---|---|---|---|
| **Pencabutan** | hanya `attester` asal (agen penerbit) — BAS menolak pihak lain, termasuk platform | tidak | bit `revocation` menyala; tidak bisa dipakai sebagai prasyarat; artefak baru ditolak |
| **Kadaluarsa** | tidak ada — waktu | tidak | sama dengan di atas, tanpa transaksi |
| **Delisting penerbit** | owner resolver (platform) | ya, `relistIssuer` | agen tidak bisa menerbitkan lagi; **semua** kertas lamanya terbaca `ISSUER_DELISTED`; bit `suspension` menyala; attestation-nya sendiri tidak disentuh |
| **Berhenti baik-baik** | owner resolver (`removeIssuer`) | — | agen tidak bisa menerbitkan lagi, kertas lama **tetap sah** |

Sesudah pencabutan atau delisting: daftar status disusun ulang dari chain, hash barunya distempel
(`npm run anchor`), lalu diterbitkan ulang ke tepi (`npm run publish:edge`). `npm run revoke -- --hash … --publish`
merangkai ketiganya.

Kredensial yang dicabut **merobohkan yang bergantung padanya hanya ke depan**: kertas lanjutan yang
sudah terbit tidak ikut tercabut, tetapi rantainya terbaca di halaman verifikasi, dan kredensial itu
tidak lagi diterima sebagai prasyarat penerbitan baru.

## 11. Alur G — uang

Verifikasi oleh manusia **gratis**. Dua tempat uang bergerak, dan keduanya memakai token demo.

**a. Verifikasi massal berbayar (x402).** Yang dijual bukan datanya — status chain memang publik —
melainkan pekerjaan membaca banyak kredensial sekaligus.

```mermaid
sequenceDiagram
  autonumber
  participant C as Klien mesin
  participant S as Signer service (fasilitator)
  participant PX as Permit2 + proxy x402
  participant SP as SettlementSplit
  participant RES as Resolver

  C->>S: POST /verify tanpa pembayaran
  S-->>C: 402 + syarat (token, tujuan = kontrak pembagian, harga)
  C->>C: tanda tangani izin token + perintah transfer
  C->>S: POST /verify + header X-PAYMENT + daftar hash
  S->>S: token benar? tujuan = kontrak pembagian kita? jumlah >= harga? belum kadaluarsa?
  S->>PX: settlement (server yang membayar gas)
  PX->>SP: dana masuk kontrak pembagian
  S->>SP: bagi: bagian penerbit + bagian platform
  S->>RES: verifikasi tiap hash
  S-->>C: laporan per hash + X-PAYMENT-RESPONSE (tx settlement, tx pembagian)
```

Klien tidak memegang BNB dan tidak mengirim transaksi. Yang dibayar adalah **penerbit**; platform
mengambil bagiannya lewat kontrak, dan `platformBps` di kontrak itu hanya bisa **turun**.

**b. Premi tenggat (`CourseDeposit`).** Peserta memilih tenggat 5 atau 7 hari dan menyetor premi;
selesai tepat waktu → premi kembali utuh; telat → premi hangus ke penerbit. Harga kursusnya sendiri
tidak pernah masuk kontrak ini.

```mermaid
sequenceDiagram
  autonumber
  participant P as Peserta
  participant S as Signer service
  participant CD as CourseDeposit
  participant BAS as BAS
  participant PL as Platform (kunci pembayar gas)
  participant I as Penerbit

  P->>S: GET /deposit/policy/kursus
  S-->>P: aturan tenggat + policyHash (termasuk kalimat telat = hangus)
  P->>CD: deposit(kursus, jumlah, hari, policyHash, payee)
  PL->>BAS: timestamp(recordHash) sebagai bukti tenggat ada sebelum hasil
  Note over P,I: peserta belajar, penerbit menerbitkan kredensial kursusnya
  I->>S: POST /deposit/finalize (refundBps + tanda tangan penerbit)
  S->>BAS: baca waktu terbit kredensial (bukan dari badan permintaan)
  S->>S: refundBps sesuai aturan? tanda tangan pulih ke penerbit kontrak?
  S->>CD: finalize (platform membayar gas)
  CD-->>P: premi kembali kalau tepat waktu
```

Stempel `recordHash` di langkah 4 hari ini hanya dilakukan harness (`npm run verify:deposit:live`)
dengan kunci platform — belum ada rute atau perintah produk yang melakukannya.

**Yang tidak ada:** pembelian kursus. Tabel `orders` ada di skema tetapi tidak ada kode yang menulisnya;
peserta mendaftar tanpa membayar, dan kontrak premi tidak dipanggil halaman mana pun.

## 12. Siapa memutuskan apa

| keputusan | yang memutuskan | ditegakkan di |
|---|---|---|
| rubrik, bobot, ambang lulus, masa berlaku, prasyarat | penerbit | manifest → `rubricHash` tercetak di tiap kertas |
| angka kuis | aturan penerbit, dihitung server | `signer/src/quiz.js` |
| angka esai | penerbit; kalau dari model, harus disahkan reviewer | `judgeEssay`, `reviewEssay`, view `course_gates`, `fromAttempts.js` |
| lulus atau tidak | `computeScore` terhadap manifest — bukan platform, bukan operator | `web/src/score.ts`, `signer/scripts/issue.js` |
| siapa boleh jadi penerbit | platform | `addIssuer` / `delistIssuer` (owner resolver) |
| mencabut satu kredensial | penerbit yang menerbitkannya, tidak ada orang lain | BAS (`attester == revoker`) |
| kredensial boleh jadi prasyarat | kontrak | `_validatePrerequisite` di resolver |
| siapa mendapat artefak | platform, tapi hanya untuk kredensial yang hidup | `SoulboundCert._mintOne` |
| status saat ini | chain | `statusOf` |

Kalimat ringkasnya: **platform memegang waktu dan daftar tamu, penerbit memegang isi.** Platform bisa
menunda atau menolak menyiarkan, dan bisa berhenti mengakui sebuah penerbit; ia tidak bisa mengarang,
mengubah, atau mencabut klaim penerbit.

## 13. Sambungan yang putus — yang belum menjadi satu alur

Ini bagian yang tidak akan terlihat kalau hanya membaca diagram di atas.

1. **Praktik tidak bisa diselesaikan dari halaman.** `computeScore` menuntut satu usaha `praktik` yang
   dinilai, dan satu-satunya jalan masuknya `POST /attempts` — yang **tidak dipanggil halaman belajar**
   (`grep -rn "/attempts" web/src` → nol pemanggil; harness memanggilnya langsung). Jadi peserta yang
   memakai halaman saja akan berhenti di "praktik: belum dikerjakan" saat penerbitan. Dan rute itu
   sendiri menerima angka kiriman peserta. Dicatat sebagai **B121** (1 Okt).
2. **Penerbitan tidak dipicu peserta.** Tidak ada rute "saya sudah selesai, terbitkan". Penerbit
   menjalankan `npm run issue` per peserta.
3. **Penerbit dan platform satu mesin.** Kunci agen ada di `signer/.keys/` dan `.env` platform. Jalur
   untuk memisahkannya ada (`/relay`), belum dipakai penerbit sungguhan.
4. **Reviewer adalah alamat.** Tidak ada identitas, tidak ada pencabutan penunjukan, tidak ada UI —
   hanya rute HTTP.
5. **Kunci jawaban kuis ada di bundel browser** (B80). Angka kuis tidak dilaporkan peserta, tetapi
   soalnya bisa dijawab dengan membaca bundel.
6. **Identitas peserta tidak tahan lama** kalau memakai kunci perangkat: tab ditutup = alamat baru =
   rekaman baru (B82).
7. **Tidak ada pembayaran kursus**, dan premi tenggat tidak tersambung ke halaman (bagian 11).
8. **Penerbit tidak bisa mendaftar sendiri**, dan halaman penerbit belum membaca data hidup (B105).
9. **Jalur hangus premi** hanya terbukti di uji kontrak, tidak di chain publik.
10. **Dua kursus, satu penerbit demo.** Penerbitnya fiktif dan disebut fiktif di namanya sendiri
    (`web/src/manifest.ts`); kursus kedua (`web3-lanjut-2026`) mensyaratkan yang pertama.
11. ~~**"Agen" belum punya identitas di luar resolver kita.**~~ **Ditutup 1 Okt (B118 F1):** agen penerbit
    sekarang agen ERC-8004 #2534 di IdentityRegistry BNB, pemiliknya Agent Owner, dompetnya = attester, dan
    halaman verifikasi membuktikannya per kertas. Yang masih putus di jalur ini: sewa per aktivitas (**B119**),
    reviewer sebagai penilai (**B120**), dan reputasi (B118 F2) — belum ada.

## 14. Cara membuktikan ulang tiap alur

| alur | perintah (dari `app/signer/`) | halaman uji |
|---|---|---|
| B belajar + C penilaian + pengesahan | `npm run verify:db` | [[09-Testing/T21 - signer db-probe.js]] |
| C → D, satu kertas dari rekaman | `npm run verify:attempts` · `npm run verify:attempts:live` | [[09-Testing/T22 - signer attempts-check.js]] |
| D dokumen + daftar status | `npm run check` · `npm run probe:serve` | [[09-Testing/T7 - signer check.js]] |
| D jalur delegasi | `npm run verify:relay` | [[09-Testing/T33 - signer relay-check.js]] |
| D → E tersaji publik | `npm run verify:edge` | [[09-Testing/T18 - signer verify-edge.js]] |
| E empat putusan | `npm run probe` (di `web/`) · `npm run check:samples` | [[09-Testing/T26 - signer sample-check.js]] |
| F pencabutan dan delisting | `npm run revoke` · `npm run specimen` | [[09-Testing/T26 - signer sample-check.js]] |
| G x402 | `npm run x402` | [[04-Signer-Service/S6 - x402 paid verification]] |
| G premi tenggat | `npm run verify:deposit` | [[09-Testing/T34 - signer deposit-check.js]] |
| A/E identitas agen ERC-8004 | `npm run verify:agent` | [[09-Testing/T35 - signer agent-identity-check.js]] |
| kontrak | `forge test` (di `app/`) | [[09-Testing/T1 - forge test on chain 97]] |
