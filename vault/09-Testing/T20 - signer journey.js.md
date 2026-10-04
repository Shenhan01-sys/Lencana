---
tags: [testing, "T20"]
command: npm run journey
measured: 2026-09-28
result: 34 checks / 0 failed (10 stages; 2 surfaces reported as not-in-core, not as passes) · ulang 4 Okt (T68): JOURNEY HIJAU 34 / 0 — esai dinilai model (--judge), A 0x5e5d…f8e0 dicabut, B 0xa334…7049 tetap VALID, validator 1EdTech VALID 14/0/0 keduanya
---

# T20 - signer journey.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/03 - Findings and Tasks 2026-09-26]] B57, B58 · **AC:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]]

## Kenapa journey ini ada, dan kenapa ia bukan `e2e`

[[09-Testing/T19 - signer e2e.js]] memeriksa **keadaan yang sudah ada**. Journey menjalankan produk
**seperti calon penggunanya menjalankannya**: peserta yang belum pernah ada, ujian yang belum dinilai,
kertas yang belum diterbitkan, artefak yang belum ada — lalu dicabut di depan mata. Itu satu-satunya
cara menjawab pertanyaan yang benar-benar kita hadapi sekarang: **permukaan mana yang siap dipanggil
front-end.**

Journey **tidak** menulis ulang logika terbitan. Setiap tahap memanggil perintah yang juga bisa
dijalankan manusia — `npm run issue`, `anchor`, `publish:edge`, `validator`, `revoke`,
`script/MintShowcase.s.sol`. Kalau journey lulus memakai salinan logikanya sendiri, itu bukti bahwa
aku menulis tes yang tidak menguji apa pun.

## Command

```powershell
cd app/signer
# butuh di lingkungan: CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID (untuk tahap publik),
# ISSUER_PRIVATE_KEY + DEPLOYER_PRIVATE_KEY (.env), GROQ_API_KEY untuk jalur penilai model
npm run journey
npm run journey -- --skip-edge      # tanpa tepi: tahap publik dicatat MERAH, bukan dilewati diam-diam
```

**Ia berhenti sebelum menyentuh chain kalau tahap publiknya tidak bisa dituntaskan.** Aturan itu
lahir dari run pertama hari ini (lihat di bawah), bukan dari kepindahan.

## Run 28 Sep — 34 / 0, sepuluh tahap

Peserta **A** `0x9D7aC5Ce4ED40f494e8079B8C8eBB7371Fe8BcA3` · peserta **B** `0xd75F74A60D1cbf2001794DF6C05A9D43A0664f84` · keduanya kunci baru yang diturunkan di dalam journey (tidak ada alamat yang diketik — B49). Katalog dibaca dari manifest: 5 modul · 19 lesson · 86 blok · 24 soal kuis · ambang lulus 70.

| tahap | yang terbukti | angka |
|---|---|---|
| [3] guard prasyarat | kursus lanjutan **ditolak sebelum gas bergerak** untuk peserta tanpa prasyarat | exit ≠ 0, 0 attestation baru |
| [4] ujian akhir → terbit | kuis 24 soal + esai dinilai model + praktik → LULUS, attestation BAS | `100/70`, gas **333.496**, hash A `0x0acb171e…` |
| [5] prasyarat jadi rantai | lanjutan terbit **dan `prerequisiteOf` menunjuk uid brevet dasar** (bukan nol, bukan uid lain) | gas 387.290, hash B `0x537ca53d…` |
| [6] disajikan publik | kedua kertas 200 dari tepi; indeks A=40, B=42 dibaca dari dokumennya sendiri | `publish:edge` **38/39**, kedua daftar `matchesChainNow` |
| [7] pihak ketiga | `vc.1ed.tech` berkata **VALID untuk kedua kertas** | 14 checks, 0 error, 0 warning |
| [8] artefak | satu `mintBatch` untuk kedua artefak; `ownerOf` = peserta, bukan platform | tokenId B = 3.77…45 |
| [9] cabut prasyaratnya | chain: A revoked, **B tetap berlaku**; daftar yang disajikan menyalakan bit A dan tidak menyalakan bit B; kertas A tetap bisa dibuka; metadata B **masih VALID padahal prasyaratnya tercabut**; metadata A **berubah jadi REVOKED tanpa ada yang menulis ulang token-nya | revoke gas **75.532**, re-anchor 4 bit |

`[9]` adalah adegan tersulit kita — "kredensial tetap berlaku walaupun prasyaratnya dicabut, dan
pencabutan itu kelihatan di semua tempat" — dan sejak hari ini ia terbukti di **lapis tahan-lama**,
bukan hanya di anvil fork.

## Yang TIDAK dipura-purakan: dua permukaan yang tidak dimiliki core

1. **Akun peserta / enrollment / pengumpulan jawaban tidak ada.** Journey menyimpan kunci peserta di
   memori proses; alamat itu hanya bermakna sebagai penerima attestation. Tidak ada `POST /enroll`,
   tidak ada penyimpanan progres, tidak ada usaha ujian di backend.FE yang menyimpan progres peserta
   akan menyimpan state yang **tidak dimiliki core** — itu bukan tugas FE untuk menutupi, itu
   keputusan produk (lihat [[11-Refactoring/RF5 - Enrollment and the Paid Path]]: tidak ada
   enrollment = tidak ada yang dibayar). Tercatat sebagai **B58**.
2. **Pendaftaran event, pengisian form portal, dan perekaman video adalah aksi manusia.** Journey bisa
   menjaga angkanya tetap segar dan mencetak blok "keluaran untuk manusia"; `npm run e2e` adalah
   gerbang pra-rekam. Tidak ada skrip yang bisa menggantikan klik itu, dan journey tidak
   berpura-pura menggantikannya.

## Dua kegagalan di run-run sebelumnya, keduanya milik journey-nya sendiri

| run | merah | yang sebenarnya |
|---|---|---|
| 1 (sebelum koreksi) | menulis attestation **lalu** gagal `publish:edge` karena token CF tidak ada di lingkungan → kertas teranchur di chain tapi tidak bisa dibaca siapa pun | perjalanan yang salah urutan: state publik harus dijamin bisa dituntaskan **sebelum** transaksi pertama. Sekarang itu gerbang di baris 1 skrip, keluar dengan `exit 2` |
| 1 & 2 | "guard prasyarat harus menolak" dites ke peserta yang prasyaratnya **baru saja diterbitkan journey di tahap sebelumnya** → dia lulus, dan `set showcase` tidak memuat kertas yang tidak divalidasi | asumsi urutan tesku yang salah, bukan pipeline-nya. Guard sekarang dites dengan peserta B yang memang belum punya apa pun, dan bagian sisanya jadi pemeriksaan **positif** (`prerequisiteOf != 0`) — yang justru lebih kuat |

## What this does NOT prove

- Tidak ada peserta nyata, tidak ada pekerjaan nyata: esainya fixture, nilainya kita set sempurna, dan
  journey menyebut itu di barisnya sendiri.
- Tidak menyentuh `web/` sama sekali — itu memang pertanyaannya. Journey adalah permukaan yang akan
  dipanggil FE, bukan FE.
- Tidak membuktikan penetrasi pasar atau penerbit asing (B58 dan [[08-Results/01 - Evidence and Limits]] tetap berlaku).

**Related:** [[09-Testing/T19 - signer e2e.js]] · [[09-Testing/T15 - 1EdTech validator]] ·
[[09-Testing/T17 - signer verify-live-cert.js]] · [[04-Signer-Service/S4 - Delegated issuance]] ·
[[11-Refactoring/RF5 - Enrollment and the Paid Path]]
