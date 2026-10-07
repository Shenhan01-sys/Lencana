---
tags: [overview, submission, copy]
status: active
updated: 2026-09-26
---

# 08 - Submission Copy

Kalimat yang kita kirim ke formulir, beserta baris bukti yang menopangnya. Batas karakter tiap field
dikutip dari form saat builder mengisinya — angka di bawah adalah hasil `len()` dari berkas ini, bukan
perkiraan.

## Tagline (satu kalimat)

> Finish the course, get the credential, rubric signed, status on BNB Chain, nothing rewritten quietly.

Ditolak sebelumnya, beserta alasannya: "learning credentials that anyone can verify" (table stakes —
sistem sertifikat mana pun menulis begitu), "...by the school" (mempermalukan pelanggan B2B kita),
versi bertitik dua (lebih rapi, lebih lembek), "courses that end in proof" (kehilangan on-chain).

Kata yang menopang kejujuran adalah **"quietly"**: penerbit boleh merevisi rubrik untuk angkatan berikut
(menghasilkan `rubricHash` baru) dan boleh mencabut. Yang tidak bisa mereka lakukan adalah melakukannya
**tanpa terlihat**. Jangan pernah dipangkas jadi "can't be changed" — itu klaim yang salah.

## Problem Statement

```text
A finished course leaves the learner holding a PDF. That PDF proves nothing on its own: to check it,
someone has to find the issuer, ask, and trust the answer. The certificate's value is borrowed from
the institution's reputation, which means a small honest publisher cannot produce credible proof at
all, while a loud one can put anything on paper.

The record underneath it is editable, and silently. Rubric, weights and grades live in the issuer's
own database and can change after the certificate was handed out; nothing on the certificate shows
that it happened. Revocation is barely modelled either. We read the code of six open-source learning
platforms at pinned commits (Moodle, Open edX, Canvas, Chamilo, Frappe LMS, LearnHouse); in none of
them can a stranger tell whether a credential is still valid without asking the platform that issued
it. Moodle's badge exporter says the reason out loud: "Signed is not implemented yet."

The learner owns nothing in the deal. When the school's site or the LMS goes away, the proof goes
with it.

And the cost of issuing sits in the wrong place: an admin account, a login, a role, a paid service.
For the on-chain versions of this idea, also a wallet and gas money, held by the party with least
reason to want either.

What we are trying to fix is therefore not course quality, it is the proof layer, and it has to keep
three things true at once: the rules a learner was graded under are sealed together with the result,
the status of a credential stays checkable from a public record rather than a vendor's database, and
verification is free and instant and needs no account on our side or the issuer's.
```

### Baris bukti untuk tiap klaim di atas

| kalimat | yang membuktikannya |
|---|---|
| "rubric ... can change after ... silently" | `web/src/manifest.ts` → `rubricHashOf()`; `npm run rubric` 17/17; hash tercetak di `achievement.criteria` |
| angka enam platform + "no stranger check" | `12-LMS-References/L1`–`L6` (SHA tercatat) dan kesimpulannya di `L8 - Lencana vs LMS` |
| kutipan `Signed is not implemented yet.` | `references/moodle/public/badges/classes/local/backpack/ob/v2p0/assertion_exporter.php` (lihat L4) |
| "LearnHouse tanpa status" | `L1`: `CertificateUser` tidak punya kolom status + anotasi `# No RBAC check` |
| verifikasi gratis & tanpa akun | `web/src/verify.ts` membaca chain langsung; `npm run probe` 59/59; `08-Results/01 - Evidence and Limits` |

## Yang TIDAK boleh masuk formulir

| jangan ditulis | alasannya |
|---|---|
| "1EdTech compatible" / "standards-validated" / "certified" | **Yang boleh ditulis persis:** `outcome: VALID`, 14 checks, 0 error / 0 warning dari `vc.1ed.tech` (28 Sep, dokumen + `verificationMethod` + kedua daftar dibaca dari host tetap `lencana-edge…workers.dev`). Yang dilarang bukan angkanya tapi labelnya: itu validator **member**, bukan sertifikasi konformansi, dan responsnya melaporkan jumlah tanpa merinci per pemeriksaan — lihat [[09-Testing/T15 - 1EdTech validator]] dan [[09-Testing/T16 - npm run publish edge]] |
| statistic pasar ("X% rekruter …", "pasar e-learning $Y") | **nol bukti** di korpus kita; ini lubang P6 yang belum tertutup |
| "real publishers use it", "institutions onboarded" | penerbit demo kita fiktif dan diberi label fiktif |
| "tamper-proof", "unforgeable", "secured by blockchain" | yang teruji: satu byte dibalik → tanda tangan mati |
| "on-chain diploma", "certificate stored on chain" | dokumennya di luar chain; yang di chain izin penerbit + status |
| opBNB dalam bentuk apa pun | nol deployment, nol pengukuran di sana |

## Solution (one paste-ready block)

```text
Lencana is a micro-course platform whose output is a credential that stands on its own.

The issuer is the institution, not us. Every course ships with a manifest carrying that institution's
own criteria, weights and pass mark, and the hash of that policy is written into every credential
issued under it. A grade cannot be re-explained after the fact, by the school or by us. Work is scored
against those rules by a mechanical scorer plus an optional model judge, both of which refuse to
invent a number when evidence is missing.

The party that signs is the institution's own agent. It signs attestations through delegation on BNB
Attestation Service, a public EAS deployment we do not own, and it never needs a wallet or gas money,
because Lencana broadcasts and pays for it.

Verification asks nothing of the person checking. The page reads issuer permission and credential
status directly from BNB Chain: no account, no wallet, nothing of ours on the request path.
Revocation is real rather than implied. Two bitstring status lists, revocation and suspension, are
derived from chain state at publication and re-checked against the chain on every read, and both list
hashes are timestamped on chain, so our own endpoint cannot quietly rewrite what a verifier reads.

Learners also receive a soulbound artefact: one per credential, mintable only while the credential is
live, never transferable.

And the proof has a commercial shape. Machine callers buy verification in batches over x402; the
payment is split on chain, the publisher keeps the majority, the platform's share is a fixed
percentage that can only ever be lowered, and nothing is held back as debt.

Live on BNB Chain testnet, with one demo issuer and its own test corpus.
```

## Smart contract & network untuk form

```
Smart contract : 0x7CA624caFDe5cA3A27b33d26be56F73a90792065   (CredentialResolver)
Network        : BSC Testnet (97)
```

Sisanya (`SoulboundCert`, `SettlementSplit`, `DemoCourseToken`) masuk description, bukan field. BAS
`0x6c227029…` **bukan milik kita** dan harus disebut sebagai pihak ketiga. Lihat
[[07-Backlog/01 - Backlog]] untuk status source-verification di explorer.

## Field "Project Detail" — plafon 5,600 karakter (bukan 68k)

Dikoreksi 27 Sep saat builder mengisi form: plafonnya **5,600 karakter**, dan kami sudah menulis halaman
sepanjang 67,345 karakter untuk itu. Teks yang ditempel sekarang:

> `00-Overview/10 - Project Detail (long form) - Copy.md` — **5,587 karakter LF**, 93 baris, **dua** diagram
> Mermaid: urutan bisnis (`sequenceDiagram`) dan aliran data + uang (`flowchart`, "Where each fact lives").
> Tabel kontrak ikut. Tanpa wikilink, tanpa jalur `vault/`, tanpa ID tiket internal, tanpa data kursus,
> **tanpa hasil testing**. Sisa ruang tinggal **13 karakter**.
>
> Yang menguruskannya: `powershell -File vault/scripts/check-paste.ps1` — ia menghitung **setelah
> normalisasi LF** (working copy bisa berisi CRLF, dan ~40 byte ujung baris tidak pernah sampai ke
> form), lalu menuntut: ≤ 5.600, nol wikilink, nol `vault/`, nol ID tiket, maksimal dua diagram, dan
> tidak ada kalimat yang kehilangan titik karena dipangkas. Ada di ritual. Ini bukan penjaga yang
> kita tambahkan karena indah: 28 Sep berkas ini diam-diam naik ke **5.604 — empat karakter lewat**,
> hijau di semua gerbang lain, dan hanya ketahuan karena hari itu aku mengukur alih-alih mengingat
> angka yang kutulis sendiri sehari sebelumnya ("sisa 35"). Satu kata terlalu panjang membuat seluruh
> tempelan tertolak saat form menutup.

strukturnya, sesuai permintaan builder 27 Sep: **apa Lencana itu → problem yang mau kita selesaikan →
how it works (diagram + 7 langkah) → di mana tiap fakta tinggal (DFD) → kontrak**.

Dua keputusan builder yang kutandatangani sendiri waktu itu dan sekarang dicabut — dicatat supaya tidak
kubantah lagi nanti: data kursus dibuang (27 Sep, "emangnya itu menceritakan lencana?"), dan bagian
**Measured / Limits dibuang** ("juri ga perlu tahu hasil testing teknisnya kayak gimana"). Angka hari
ini — `104/0` fork 97 **dan** 56, `49/0` offline, `76/0` check, `48/0` serve-probe, `59/0` web probe,
`17/0` verify:live-cert, `26/27` publish:edge, `10/0 + VALID` validator — dan batas-batasnya sekarang
hidup di [[08-Results/01 - Evidence and Limits]] dan di halaman referensi: tetap terukur, hanya bukan
di field ini. (Daftar angka di kalimat ini sendiri pernah basi — `97/0 · 53/0 · 7/0` — dan itu
pengingat bahwa "sudah dicatat" tidak sama dengan "masih benar".)
Yang tetap tinggal di teks submission adalah klaim yang masih bisa mereka cek sendiri: jalur perintah
(`POST /verify`, `statusOf`), alamat kontrak, dan angka 190.659 gas yang menggerakkan keputusan batch.

Aturan yang berlaku untuk field ini, supaya tidak perlu ditulis ulang tiga kali:

| aturan | alasannya |
|---|---|
| tidak ada `[[wikilink]]` | juri tidak punya vault kita; linknya mati di layar mereka |
| tidak ada jalur `vault/…` atau `07-Backlog/…` | itu penomoran internal kita, bukan alamat yang bisa dibuka |
| tidak ada ID tiket (B41, RF5, OI-11) | tanpa halaman tujuannya, angka itu hanya bunyi |
| jalur **source** (`web/src/verify.ts`, `contracts/…`) dan **perintah** (`npm run x402`) tetap ada | inilah yang bisa mereka cek sendiri di repo publik |
| setiap bilangan tetap disebut tanggal + perintahnya | sama seperti di [[08-Results/01 - Evidence and Limits]] |

Sisa ruang tinggal **114 karakter**. Yang paling aman dikorbankan kalau perlu nambah: langkah 6
(penilai mekanis + model) atau klausa break-even BNB di bagian kontrak — dua-duanya masih ada tempat
lainnya di vault.

Versi panjangnya tetap hidup sebagai referensi: [[00-Overview/10 - Project Detail (long form)]]. Kalau
nanti field-nya ternyata bisa lebih panjang (mis. ada field "full documentation" terpisah), itu yang
dikirim — jangan hasil pangkas ini.

## Tinjauan 7 Okt — teks yang ditulis ulang builder di `13-SubmissionDocs/`

Builder 7 Okt 10.22 menulis ulang empat teks ke `vault/13-SubmissionDocs/` dan bertanya "apakah narasinya
udah benar?". Aslinya **tidak disentuh**; koreksi ada di berkas `*-revisi.txt` di folder yang sama. Panjang
dihitung `[...text].length` hari ini; frasa diuji dengan daftar terlarang `qa.mjs` + tiga overclaim di bawah.

| berkas | panjang | temuan | perbaikan |
|---|---|---|---|
| `TagLine-OneSentence.txt` | 101 | sama dengan tagline di atas | — |
| `Problem.txt` | 1.379 / 2.000 | bukti enam LMS + kutipan Moodle terbuang (bukti terkuat bagian ini); "existing blockchain solutions get it wrong" = klaim tentang pihak lain tanpa bukti | `Problem-revisi.txt` 1.482: bukti LMS kembali, "on-chain attempts often…" |
| `Solution.txt` | 1.977 / 2.000 | "**a grade cannot be altered**" (aturan tagline di atas: jangan pernah "can't be changed"), "self-sovereign", "immutable manifest" (manifest boleh direvisi → `rubricHash` baru), "decentralized"; "mechanical scorer + optional model judge" tertinggal dari produk (esai = usulan agen AI, berlaku sesudah reviewer kedua yang ditunjuk penerbit menyetujui — Cheat-Sheet); daftar status "dynamically rebuilt … on every call" ≠ "derived at publication, re-checked on every read" | `Solution-revisi.txt` 1.765 |
| `Project-Detail-Maks2000chars.txt` | **5.590** | nama berkas "maks 2000" tapi isinya 5.590 — plafon field menurut catatan ini 5.600 (dikoreksi 27 Sep); **dua alamat basi**: SoulboundCert `0xA5eB…309c` (aktif `0xC6FD…c4cd`, `web/src/config.ts:41`) dan DemoCourseToken `0xEd19…CDDe` (aktif `0x0B2f…CBaf`); "rebuilt from chain state per request"; langkah 6 versi lama; "break-even ≈ $5.24 BNB" salah satuan (yang benar: harga BNB titik impas ≈ $5,24 — salah ini juga ada di artefak tempel kita, diperbaiki hari ini, PASTE 5.594/5.600) | `Project-Detail-revisi.txt` 5.517; kalau field memang 2.000: `Project-Detail-ringkas-2000.txt` 1.812 |

**Related:** [[00-Overview/06 - Business Process]] · [[10-Contributors/Claims-Cheat-Sheet]] · [[08-Results/01 - Evidence and Limits]]
