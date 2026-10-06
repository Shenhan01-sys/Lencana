---
tags: [results, executive-summary, B168]
status: active
updated: 2026-10-06
---

# B168 - Executive Summary — bukti NFT di lembar dan "Bagikan ke LinkedIn" (tahap 1 + 2)

**Hub:** [[08-Results/00 - Hub Results]] · **Backlog:** B168 di [[07-Backlog/03 - Findings and Tasks 2026-09-26]] ·
**AC:** [[07-Backlog/Acceptance-Criteria/AC-B168 - Bukti NFT dan kit LinkedIn]] · **Testing:** [[09-Testing/T91 - Uji peramban bukti NFT dan bagikan ke LinkedIn (B168)]] ·
**Terkait:** [[03-Frontend/FE10 - Halaman bagikan dan kartu OG (fungsi Vercel)]], [[03-Frontend/FE9 - Credentials page and certificate sheet]]

Pertanyaan builder 5 Okt malam: bagaimana membuktikan bahwa itu NFT dan terikat ke akunnya, dan bagaimana membawa narasi NFT sertifikat ini ke LinkedIn. Keputusan builder: gambar pratinjau **per sertifikat**, tahap 3 **ya**.

## 1. Apa yang diubah

- **Panel Bukti on-chain** di bawah lembar (tidak tercetak): per lapis yang memegang artefak — kontrak, token ID, `ownerOf` (✓ bila = alamat akun), `locked()`, ERC-5192, tautan penjelajah, perintah `cast`; "belum dicetak" dan "tidak terbaca" dibedakan.
  Dibaca dari chain lewat `loadNftProof` (`web/src/credentials.ts`).
- **Dialog Bagikan ke LinkedIn:** tombol "Tambahkan ke profil" (URL formulir Lisensi & sertifikasi LinkedIn terisi; penerbit demo diberi "(demo)"), "Bagikan sebagai post", draf teks Indonesia/Inggris yang jujur (NFT hanya bila ada; demo, jaringan uji, bukan ijazah) dan tautan pratinjau per sertifikat.
- **Halaman bagikan + kartu per sertifikat** (fungsi Vercel `api/share.mjs`, `api/card.mjs`): `/s/<hash>` memberi tag Open Graph untuk perayap LinkedIn lalu mengalihkan ke verifier; `/s/<hash>/card.png` PNG 1200 × 630 dari dokumen sungguhan.
- Penunjang: `web/src/share.ts` (murni), `hosts.ts` (host publik, sumber tunggal), `certificate-qr.ts`, `api-entry.ts` + `scripts/build-api.mjs` (bundel `api/_lib/lencana-share.mjs` dicommit, kesegaran dijaga `probe`), `vercel.json` (rute + `installCommand` untuk `api/`).
- **Tidak** disentuh: kontrak, database, signer, `CERT_ADDRESS`.

## 2. Hasil vs KPI

| KPI | sebelum | sesudah |
|---|---|---|
| bukti artefak di UI | "NFT soulbound · N lapis" tanpa bukti | kontrak, token, pemilik = akun ✓, locked ✓, ERC-5192 ✓, tautan penjelajah, perintah `cast` (T91 langkah 1) |
| "gagal baca" vs "belum dicetak" vs "bukan milikmu" | — | tiga keadaan berbeda (T91 langkah 3, 4; `probe`) |
| pratinjau tautan LinkedIn | generik (SPA tanpa tag `og:*`) | per sertifikat: judul, deskripsi, gambar kartu (**LIVE 6 Okt:** `/s/<hash>` 200 + tag OG, `card.png` PNG 1200 × 630 di produksi) |
| tambah ke profil LinkedIn | manual | URL terisi dari sertifikat, label "(demo)" untuk penerbit demo |
| draf teks post | tidak ada | Indonesia/Inggris, tanpa frasa terlarang, NFT hanya bila ada |
| `probe` | 212/0 | **232/0** (+20: 12 murni + bundel + fungsi lokal + 3 bukti NFT dari chain 97) |
| `tsc` · `build` | 0 · 0 | 0 · 0 |

## 3. Status

**SELESAI · LIVE** — didorong `f312539..b77ba40` 6 Okt; AC-B168#17 PASS (pratinjau di LinkedIn sungguhan belum dilihat). Tahap 3 dipecah dan dikerjakan sesudahnya (6 Okt, di kode): [[08-Results/B169 - Executive Summary]] (cetak artefak NFT dari app) dan [[08-Results/B170 - Executive Summary]] (bukti kepemilikan).

## 4. Risiko tersisa

- ~~**Fungsi Vercel belum berjalan di runtime Vercel**~~ **Terbukti 6 Okt di produksi:** pemasangan `api/` lewat `installCommand`, pelacakan font (Outfit tampil di kartu), dan perutean `/s/*` jalan. Bila perenderan gagal, kartu dialihkan ke `hero.jpg`; bila fungsi tidak terpasang, hanya `/s/*` yang 404 (app tidak terpengaruh).
- Pratinjau di LinkedIn sungguhan dan URL tambah-ke-profil terhadap akun LinkedIn belum diuji (format dari dokumentasi/sumber publik).
- Halaman bagikan hanya ada untuk kredensial yang dokumennya tersaji di host tepi.
- Penerbit B153 fiktif di jaringan uji: draf dan entri profil menyebutnya; pengguna yang menghapus catatan itu menanggung klaimnya sendiri.
- Hash 66 karakter di `certId` LinkedIn dan panjang nama dipotong 100 mengikuti batas yang diketahui, belum diuji terhadap formulir sungguhan.

## 5. Bukti

T91 langkah 1–8; `probe` grup B168 (20 pemeriksaan) + uji negatif 4 merah; `web/src/share.ts`, `web/src/pages/certificate-extras.ts`, `web/src/credentials.ts` (`loadNftProof`), `api/share.mjs`, `api/card.mjs`, `api/_lib/`.
