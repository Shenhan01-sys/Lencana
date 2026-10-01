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

## Merge 2 — `dex/lencana-ui`: ditahan, lalu builder memilih "port ke core" (squash, lokal)

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

**Keputusan builder (1 Okt malam): "Port ke core"; push ditahan — dicatat sebagai D58 di [[00-Overview/03 - Decisions]].** Yang dikerjakan, sebagai satu commit squash —
riwayat `a6d0662` tidak masuk `main`:

| bagian | keputusan |
|---|---|
| `env_hans`, `scratch/`, `scratch_test/`, `web/index.backup.html`, `.agents/skills/` (14) | **tidak diambil** — kunci bocor (B116) dan berkas kerja, bukan produk |
| `FRONTEND_STATE.md`, `vault/03-Frontend/FE_CURRENT_STATE.md` | **tidak diambil** — potret cabang sebelum port (masih menyebut `lms.ts`, Privy dengan fallback simulasi, "dapat diekspor kapan saja", EAS) dan menaut path lokal `C:/Project_Dave/…`; isinya tidak benar untuk `main`. Tetap terbaca di cabangnya |
| `content.ts`, `courses/*.ts`, `courses/index.ts`, `manifest.ts`, `score.ts`, `progress.ts`, `web/scripts/*` | **versi core** — model, kunci di server (B80), `lesson.proof` (B121), `rubricHash` terbit tidak bergeser |
| `router.ts`, `lib/markdown.ts` | tidak diambil — tidak dipakai sesudah port (isi lesson dirender dari blok core) |
| `style.css` (+1.846), gambar `public/*.jpg`, `lib/ui.ts`, `new-app.ts`, nav `index.html`, kamus `lmsV2` | **diambil** |
| `pages/landing.ts`, `pages/class.ts` | **diambil lalu di-port**: cangkang FE (topbar, pohon modul, rail) + isi dari `lesson-views.ts` — templat `lms.ts` yang disalin baris demi baris oleh skrip (kuis lewat `/grade` dengan pembahasan server, esai tanpa angka, kotak identitas + rekaman penerbit, `#/me` + baca chain). Aksi `bindLms` pindah ke `bindLearningActions`. `lms.ts` dihapus; `lms.css` dikunci ulang ke `.lesson-engine` |
| `main.ts` | rute FE (`new-app` untuk `#/`, katalog, `#/class/…`, `#/me`) + penjaga sesi `fe-integration`; `#/learn` dan `#/course/<id>/l/<slug>` dipetakan ke lesson yang sama (versi cabang memetakannya ke modul bernama "l"); `#/publishers` dan Trust & Limits publik untuk tamu |
| teks `lmsV2` yang tampil | dikoreksi menurut Claims: bukan "dinilai agen AI otonom"/"tanpa bias" (usulan agen disahkan kunci kedua), BAS bukan EAS, attestation bisa dicabut (bukan "selamanya"), validator OB 3.0 dengan angkanya, tanpa "kami tidak menyembunyikan kunci Anda" |

**Uji:** `tsc` bersih, build, probe web **88/0**, `verify:quizkeys` **30/0** (0 kunci di bundel; tidak ada berkas
`web/src` yang mengimpor kunci), `verify:privy` (modul login tetap lambat), `check:labels` 8/0, `npm run audit` 0 temuan,
dan **uji peramban sungguhan** — [[09-Testing/T42 - Uji peramban ruang kelas (FE7)]]. Uji peramban itu menemukan **B122** (preflight CORS 405: halaman belajar tidak
pernah bisa menulis dari peramban) dan dua bug halaman yang terbawa dari `lms.ts`; ketiganya ditutup di port ini.

## 2 Okt — hero: kartu kredensial "LENCANA" + logo resmi (permintaan builder)

- **Gambar kanan hero diganti kartu `proof-plate`** dari beranda 26 Sep (commit `6f2c4cb`, Stylenecy — "movable credential
  card"): markup dan kelas CSS yang sama, gerak miring dipindah dari `initHeroCardTilt` (`main.ts`, terikat ke hero lama)
  ke `pages/landing.ts`. Isinya bukan karangan: kartu menunjuk `SAMPLE_HASHES.valid` milik verifier — satu sumber yang
  diadili `check:samples` — dan menampilkan isi dokumen kredensial itu di tepi (Web3 Dasar, nilai 92); "03 · PUBLIC PROOF"
  membuka verifier dengan hash itu. Teks contoh lama ("AI EVALUATION 93 / 100 · HONORS") tidak dipakai.
- Ukuran wordmark diikat ke lebar kartu (`cqw`): ukuran dasar `6vw` meluber ke kolom status di kolom hero ini (terukur:
  teks berakhir di 1063px, kolom status mulai 1114px sesudah perbaikan). Tidak ada geser horizontal di 500px.
- **Logo resmi** (`Logo-Fix1.jpeg` dari builder → `web/public/lencana-logo.jpg`) menggantikan ikon belah ketupat di navbar
  dan tanda ✕ di segel kartu. JPEG-nya berlatar putih, jadi ditaruh di ubin terang (bagian hitamnya hilang di latar gelap).
- Uji: `tsc` bersih, build, probe web 88/0, `check:samples` (sampel valid/revoked cocok di tepi dan chain), audit 0 temuan;
  peramban: kartu tampil di 1440px dan 500px, gerak miring mengikuti kursor (`rx 12.7° / ry 2.7°` di pojok kanan atas,
  kembali ke `4° / −6°` saat kursor keluar) dan diam untuk `prefers-reduced-motion`.
