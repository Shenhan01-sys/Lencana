---
tags: [frontend, "FE7", merge]
status: active
updated: 2026-10-01
---

# FE7 - Merge cabang FE ke `main` (1 Okt malam)

**Part of:** [[03-Frontend/01 - Frontend]] · **Kebijakan yang dipakai:** [[03-Frontend/FE4 - Mount contract with the maintainer]]
(berkas presentasi = versi pemilik FE menang; model konten + router belajar = milik lapisan belajar) ·
**Terkait:** B82 ([[08-Results/B82 - Executive Summary]]), B80 (D56), B121 (D55), B116 (insiden kunci), OI-22

Builder 1 Okt malam: "pull dex/lencana-fe-integration lalu merge ke local kita, lalu lanjut pull dex/lencana-ui dan merge
lagi … merge itu based core system kita needsnya apa aja, kalau udh oke baru kita refactor FEnya". Sebelum merge:
ref cadangan lokal `backup/pre-fe-merge-2026-10-01` = `e66de10`.

## Dua cabang, diukur sebelum menyentuh apa pun

| cabang | commit di luar `main` | titik cabang | rahasia di patch (14 nilai `.env` dibandingkan) | konflik simulasi (`git merge-tree`) |
|---|---|---|---|---|
| `dex/lencana-fe-integration` (tip `c743400`, 30 Sep) | 13 | `6542582` (29 Sep) | **bersih** | 9 berkas, semuanya `web/` |
| `dex/lencana-ui` (tip `b57d51e`, 1 Okt 13:14) | 17 | `7fd2790` (29 Sep) | **bocor di `a6d0662`**: `DEPLOYER_PRIVATE_KEY`, `ISSUER_PRIVATE_KEY`, `ISSUER_B_PRIVATE_KEY` (`env_hans`) — B116, masih identik dengan `.env` | 12 berkas (7 sesudah merge pertama) |

Keduanya bertemu di `da5de44` (Privy RF3 versi FE, 29 Sep).

## Merge 1 — `dex/lencana-fe-integration` → `d51ad68` (lokal)

Diambil: halaman konsumen baru (`style.css` +3.535, `index.html`, `main.ts`, `i18n.ts`, `config.ts`), modal masuk, penjaga
rute learner ("sesi eksplisit"), audit alur bisnis 30 Sep (`AUDIT-BUSINESS-FLOW-2026-09-30.md`). Konflik diselesaikan
menurut kebutuhan core:

| yang ditemukan | keputusan |
|---|---|
| `privy.ts` versi FE: tanpa App ID sungguhan → "mode simulasi" (kode `123456` selalu lolos, Google tiruan); bentuk panggilan SDK tidak cocok dengan 0.77 (`sendCode({email})`), jadi jalur aslinya praktis selalu jatuh ke simulasi | `privy.ts` B82 dipakai; modal masuk FE dialihkan ke `sendPrivyCode` / `connectPrivyLearner` |
| `createPrivyLearner` membuat kunci lokal acak berlabel `privy` — dengan alamat Privy asli, kuncinya tidak cocok dan setiap tanda tangan ditolak | dihapus |
| `signMessage` tergabung otomatis jadi `perangkat || privy` → cabang dompet tertanam B82 tidak terjangkau | dikembalikan: `privy` menandatangani lewat dompet tertanam |
| penjaga rute mengusir tab baru sebelum sesi Privy dipulihkan | penanda login Privy dihitung sesi eksplisit |
| `lms.ts`/`main.ts` mengimpor `./privy` statis → modul login masuk chunk awal | impor statis dibuang (`verify:privy` E tetap hijau) |
| `#/publishers` (B105) ikut terkunci penjaga | dijadikan rute publik, seperti verifier |
| teks "kode OTP default 123456", "dapat diekspor kapan saja", opsi Google — salah untuk login sungguhan | dikoreksi; tombol Google disembunyikan (Google mati di app Privy) |
| formulir email inline B82 di kotak identitas | diganti tombol yang membuka modal FE — satu permukaan login |
| probe `PENERBIT DILISTING` (judul vonis diganti redesign verifier `54b3318`) | pemeriksaan menjaga makna: label sendiri, bukan label dicabut |

Gerbang sesudah merge: `tsc` bersih, probe web **88/0**, `verify:quizkeys` **30/0**, `verify:privy` **38/0**,
`check:labels` 8/0 (146 marker), `npm run audit` 12 · 0 temuan.

## Merge 2 — `dex/lencana-ui`: DITAHAN, menunggu keputusan builder

Cabang ini **mengganti seluruh permukaan belajar**, bukan menata ulangnya: `main.ts` membuang `renderLmsRoute`, `lms.ts`
dihapus, semua rute belajar dialihkan ke `#/class/…` (`new-app.ts`, `router.ts`, `pages/class.ts`, `pages/landing.ts`), dan
model konten diganti (`ClassData`, dibangkitkan `scratch/migrate.ts`). Diukur 1 Okt:

- `courses/web3-dasar.ts` + `web3-lanjut.ts` memuat **24 + 4 `answer` dan 24 + 4 `why`** — seluruh kunci kuis kembali ke
  bundel (B80/D56 mengeluarkannya);
- **0 `proof`** — keempat lesson praktik kehilangan aturan bukti yang dibaca `POST /praktik` (B121/D55);
- `pages/class.ts` menghitung nilai kuis **di browser** (`optIdx === q.answer`) — B72 memindahkannya ke server;
- server (`signer/`) mengimpor model yang sama lewat `manifest-keys.ts`, dan `rubricHash` kertas yang sudah terbit dijaga
  saat dimuat — model baru berarti server ikut ditulis ulang.
- Berkas non-produk: `env_hans` (kunci bocor), `scratch/`, `scratch_test/`, `web/index.backup.html`, `.agents/skills/` (14).

Menurut FE4, model konten dan router belajar milik lapisan belajar; tampilan kelas `ui` hanya bisa masuk kalau dipindah
ke model core dan penilaian server — itu langkah refactor FE. Merge biasa juga membawa `a6d0662` ke riwayat `main`
(B116); kalau diambil, bentuknya squash tanpa `env_hans`.
