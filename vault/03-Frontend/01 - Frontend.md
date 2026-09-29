---
tags: [frontend, hub]
status: active
updated: 2026-09-25
---

# 01 - Frontend

`../web/` — two surfaces in one page, deliberately different in kind.

1. **The verifier** (`#/verify`, `?q=`): reads chain state directly from the browser over JSON-RPC,
   no server, no wallet. Its honesty depends on one design rule — `src/verify.ts` is **pure and
   DOM-free**, so the same file the page imports can be driven from Node by `scripts/probe.ts`. The
   moment someone wraps a component around the fetch, the probe becomes theatre
   → [[Concepts/DOM-free Verification Module]].
2. **The learning surface** (`#/learn`, `#/course/*`, `#/me`): hash-routed templates over typed
   course data, no UI framework. **34 pages** measured by `npm run inventory`, not counted by hand
   → [[05-Course-Content/01 - Course Content]].

Bilingual (`src/i18n.ts`, EN/ID, persisted). The rest of the routes (`#/`, `#/courses`, `#/submit`,
`#/portfolio`, `#/agent-hub`) are the frontend maintainer's — see
[[FE4 - Mount contract with the maintainer]] before editing anything in this folder.

## Parts

- [[FE1 - Verifier page and verify.ts]] — inputs accepted (hash / UID / token id / address), the four verdicts, the raw-evidence and `cast`/`curl` panels
- [[FE2 - Learning surface router]] — routes, templates, the lesson kinds, and where progress is stored
- [[FE4 - Mount contract with the maintainer]] — the DOM nodes and calls that must survive a redesign, and the merge policy
- [[FE6 - Quirks and open defects]] — what is currently misleading in the shipped UI, by reference to the open items

## Reproduce

```powershell
cd app/web
npx tsc --noEmit && npm run build        # both clean on 25 Sep
npx tsx scripts/probe.ts                 # 59 checks / 0 failed against public chain 97 (25 Sep)
```

**Related:** [[05-Course-Content/01 - Course Content]] · [[04-Signer-Service/01 - Signer Service]] · [[10-Contributors/00 - Hub Contributors]]

## 29 Sep — dua keputusan builder: judul e-course-dulu, dan tautan yang benar-benar hidup

**Judul.** `<title>Lencana — Autonomous AI Credentials on BNB Smart Chain</title>` membalik aturan
nomor 1 proyek ini (QWEN.md §1: standar umum dulu, baru pembeda). Produk ini **e-course**; sertifikat
adalah **hasil** menyelesaikan kursus, bukan nama kursusnya. Diganti menjadi
`Lencana — Online Courses with Auditable Certificates (BNB Smart Chain)`. Wording final tetap milik
Dave — yang tidak boleh balik lagi: *course* di depan, *certificate* sebagai konsekuensi, chain sebagai sifat.

**Tautan.** Halaman dibuka dari `https://lencana-psi.vercel.app` (200), dokumen disajikan dari `https://lencana-edge.hansgunawan775.workers.dev` (200, 19/19).
Salinan FE lama menulis `lencana.io` — domain yang tidak kita pegang dan **tidak resolve**
(`dns.resolve` ENOTFOUND untuk A maupun AAAA). Tombol berbagi juga menunjuk `0x0b95c83b…` yang
attestation-nya sah tapi dokumennya **404** di tepi. Sekarang: `APP_HOST` dan `CREDENTIAL_HOST`
dipisah, `publicVerifyUrl()` memakai origin halaman dengan fallback ke Vercel, dan hash berbagi
diganti ke `0x06be529b…` yang terukur 200 + sah di chain. Detail: **B100**. Masih terbuka: 4 hash
`SAMPLE_HASHES` lama belum satu-satu diverifikasi tersedia di tepi — yang dipakai di UI harus yang
200, bukan yang cuma ada di chain.

## 29 Sep 18:2x — salinan UI ikut jadi sasaran gerbang (B98/B101)

Yang diubah (EN + ID, karena keduanya disajikan ke juri):

| tempat | dulu | sekarang | alasan |
|---|---|---|---|
| `visualPipeline.sectionSub`, `learningLoop.sectionSub`, `portfolioSection.sub`, `index.html#portfolio-sub`, `FRONTEND_ITERATION.md:338` | "tamper-proof" / "anti-manipulasi" / "anti-pemalsuan" | "statusnya bisa dibaca siapa pun di BNB Smart Chain", "yang bisa kamu buktikan tanpa meminta izin kami" | yang tidak bisa dipalsukan hanyalah yang kami uji; pembeda kita adalah **status dibaca dari chain**, dan itu lebih kuat daripada kata yang tak bisa dibuktikan |
| `agent1Stat` / `agent2Stat` / `agent3Stat` | `1,420 Essays · 99.8%`, `856 Audits · 99.9%`, `640 Badges · 100% Lock Rate` | kalimat mekanik tanpa angka ("reads the rubric from the chain", "checks the attempt record against the rubric") | tidak ada satu pun perintah yang mencetak angka-angka itu — aturan klaim: tiap angka butuh perintah + tanggal |

Penjaga: `npm run audit` (A3) sekarang menyapu `web/index.html`, `web/src/i18n.ts`, `web/src/render.ts`, bukan hanya README/docs — gerbang yang buta terhadap tempat kalimat itu tinggal hanya terlihat bersih. Verifikasi: audit 8 pemeriksaan **0 TEMUAN**, `tsc --noEmit` bersih, build `✓ built in 2.65s` (29 Sep).

Yang **tidak boleh balik lagi**: jangan menaruh angka di beranda yang tidak dihasilkan harness, dan jangan menaruh kata "tamper-proof"/"unforgeable" di berkas yang dibaca orang — kecuali kalimatnya berubah jadi klaim yang bisa ditunjuk alatnya.

Sisa terbuka: `render.ts` menulis `status: 'PASS'` tetap untuk 14 baris dan tombol pulse tidak menguji apa pun — **B100**/OI-13.
