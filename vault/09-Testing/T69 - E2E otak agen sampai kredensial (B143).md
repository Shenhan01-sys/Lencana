---
tags: [testing, "T69", e2e]
status: active
updated: 2026-10-04
command: npm run verify:brain-e2e:live (CLOUDFLARE_* di lingkungan) · uji peramban sisi peserta (rapor, kredensial, Verifier)
measured: 2026-10-04
result: OTAK SAMPAI KERTAS HIJAU — 31 pemeriksaan / 0 gagal (run pertama) · kertas 0x2a4acbbf…ab4121 LULUS 99 · peramban: rapor 99 di atas nilai lulus, kredensial BERLAKU, Verifier VALID · dua cacat ditemukan dan ditutup (B145, B146)
---

# T69 - E2E otak agen sampai kredensial (B143)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B143, B145, B146 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**Pendahulu:** [[09-Testing/T68 - E2E penuh esai sampai kredensial (4 Okt)]] (batasnya: tidak ada satu run dari usulan otak sampai
kertas terbit) · **Harness:** `signer/scripts/brain-e2e.js` (`npm run verify:brain-e2e:live`, ikut `sync:numbers -- --expensive`)

Diminta builder 4 Okt: "E2E B sampai terbit dulu". Harness, bukan run sekali jalan: identitas semuanya dari `app/.env`
(penerbit; penilai **#2534** — otak dicatat pemilik `AGENT_OWNER`, antrean + penilaian dompet `AGENT_GRADER`; pengesah **#2542**
dompet `AGENT_REVIEWER`) dan kredensial Cloudflare dari lingkungan, jadi siapa pun yang memegang `.env` bisa mengulangnya. Kursus
**Kelas Uji** `uji-bayar-2026` supaya esai uji di kursus lain (esai builder 719/720) tidak pernah masuk antrean run ini.

## Lintasan — `npm run verify:brain-e2e:live`, 4 Okt (31 / 0)

| # | tahap | hasil |
|---|---|---|
| 0 | prasyarat | #2534 tidak punya otak non-uji; server uji sendiri `origin=test`, paywall mati |
| 1 | tim kursus | penerbit menyewa #2534 untuk Kelas Uji (200), menunjuk agen #2542 (dompet `0x687ae07f…`) sebagai pengesah (200) |
| 2 | otak | kalibrasi **sungguhan** lewat adaptor peramban (`web/src/llm.ts`, Groq `openai/gpt-oss-120b`): substantif **100**, kosong **2**, temperature 0 → pemilik mencatat otak (201) |
| 3 | peserta (HTTP) | enroll; 4 lesson × 3 langkah (12 `POST /progress`); kuis dinilai server **100**; praktik `praktik-baca-koin` dinilai chain (3 `eth_call`, lulus); esai diserahkan (`awaiting_judge`, skor NULL) |
| 4 | otak menilai | dompet agen membaca antreannya — esai ini ada, teks utuh, rubrik penerbit; LLM yang sama mengusulkan **40 + 40 + 18 = 98**; `POST /essay/judgement` atas nama `groq/openai/gpt-oss-120b`, label `sedang` → 200, butuh pengesahan, tagihan jatuh tempo |
| 5 | penolakan | `issue --from-attempts` **DITOLAK** (usulan model tanpa pengesahan) dan belum ada attestation — sebelum gas |
| 6 | pengesahan | agen #2542 `approved` → 200, akhir 98; baris usaha: model otak, agen pengusul #2534, label; pengesahan `reviewer_agent_id` 2542; gerbang 4/4 lesson |
| 7 | terbit | `issue --from-attempts` exit 0; attestation di chain 97 — uid **`0x20384b09d2edea73f0cc12412d84b03bab19ad85a4b0e1704a51a108076b514f`**; `publish:edge` hijau (sisa hanya deviasi tercatat `pengantar-defi-2026`) |
| 8 | tepi | kertas **`0x2a4acbbf91a6b3252d816cb8495ab0aed4ce6f45a200a664d802c08590ab4121`** + dokumen hasilnya terhidang; id menunjuk host publik; esai = 98, rubrik = rubricHash kursus; `grader` = agen **#2534**, model `groq/openai/gpt-oss-120b`, label `sedang`; `reviews[0]` = agen **#2542**, approved, usulan = akhir; kalimat metode "**disahkan agen pengesah #2542**" (B145); tanpa teks esai dan kunci jawaban; keputusan **LULUS (99)** |
| 9 | bersih-bersih | otak #2534 (`origin=test`) dihapus, sisa 0 — `verify:agents` tetap menilai #2534 dengan nama model harness; sewa + penunjukan di Kelas Uji kembali ke keadaan sebelum run |

## Peramban — sisi peserta

Peserta harness memakai identitas fixture `0xea817a33…1E0F0b` (`E2E_LEARNER_PK` dari lingkungan, kuncinya hanya di scratchpad,
diserahkan ke halaman oleh server lokal sekali-pakai). vite `:5173` + signer demo `:8787`.

| # | layar | hasil |
|---|---|---|
| 1 | Grades & work (`#/app/grades`) — sebelum B146 | **SALAH:** esai "waiting for approval", "70 points collected so far · Incomplete", padahal kertasnya sudah terbit LULUS 99 → B146 |
| 2 | Grades & work — sesudah B146 (signer dinyalakan ulang) | "Essays approved **1/1**", "**99** estimated final score · Above the pass mark", kuis 100 → 50.0, esai "98 → 29.4 points · Approved", praktik "checked on chain → 20.0" |
| 3 | My credentials (`#/app/credentials`) | `0x2a4acbbf91…` — status chain **BERLAKU** |
| 4 | Verifier (`?q=<kertas>#/verify`) | **VALID · 29 on-chain calls** (blok 134828109): credentialHash `0x2a4acbbf…`, Attestation UID (BAS) `0x20384b09…` = uid harness, pemegang `0xea817a33…`, penerbit `0x82113098…`, "Penerbit memakai agen penilai ERC-8004 #2534 … identitasnya terbaca dari chain" |

## Cacat yang ditemukan run ini

- **B145** — sebelum run, saat merancang: dokumen hasil menulis "disahkan manusia" untuk setiap pengesahan. Dibetulkan
  SEBELUM kertas terbit (`reviews[]` dibekukan saat terbit); tahap 8 membuktikan kalimat barunya di tepi.
- **B146** — rapor peserta salah membaca sematan pengesahan (objek dibaca sebagai array). Uji dulu: pemeriksaan rapor di
  `verify:agents` → MERAH 35 / 1; sesudah perbaikan → HIJAU 35 / 0; layar #2 di atas.

## Batas

- Penilaian otak di harness memakai adaptor Node yang sama dengan peramban; jalur layar penilai sendiri dibuktikan T68 bagian B.
- Pengesahan agen #2542 tetap lewat API bertanda tangan — layarnya belum ada (B144, diusulkan).
- Tagihan agen dari run ini dibiarkan jatuh tempo; pembayaran x402 tagihan agen dibuktikan `verify:agents:live` (T68 #6).
- Akun Privy builder belum menjalankan jalur ini (AC-B135#10, AC-B138#10).

## Gerbang sesudah run

Baterai `sync:numbers` 4 Okt sore: **33 harness · 33 hijau** — `check` 112 → **114 / 0** dan `verify:edge` **30 dari 30** (kertas
B143 masuk korpus), `verify:agents` 34 → **35 / 0** (pemeriksaan rapor B146); `--verify` sempat merah 6 klaim + README A10 1 —
dikoreksi terlihat, lalu **ANGKA HIJAU — 62 klaim** dan **AUDIT BERSIH**; `check:labels` 8 / 0; `tsc` 0; gerbang vault hijau.

## Kebersihan

Baris peserta, tagihan agen, dan kertas run ini **tetap ada** (B78), sama dengan `verify:attempts:live`; korpus bertambah satu
kertas. Penyimpanan peramban dikosongkan sebelum instans ditutup. Kunci Cloudflare dan kunci peserta fixture dikirim ke proses
anak lewat env, tidak lewat argv; log disaring (0 kemunculan `[REDACTED]` — tidak ada yang perlu disaring).
