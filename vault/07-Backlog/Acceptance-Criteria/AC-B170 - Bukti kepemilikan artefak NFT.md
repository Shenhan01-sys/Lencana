---
tags: [acceptance-criteria, B170]
status: active
updated: 2026-10-06
---

# AC-B170 - Bukti kepemilikan artefak NFT (tahap 3b B168)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B170 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T93 - Uji peramban cetak artefak dan bukti kepemilikan (B169 dan B170)]] (+ grup B170 di `probe`) ·
**Summary:** [[08-Results/B170 - Executive Summary]] · **Terkait:** [[03-Frontend/FE1 - Verifier page and verify.ts]], [[03-Frontend/FE4 - Mount contract with the maintainer]], [[03-Frontend/FE9 - Credentials page and certificate sheet]], B168, B169

Latar: `ownerOf(token)` di chain membuktikan DOMPET mana yang memegang artefak; yang belum terbukti ke orang lain adalah bahwa **pemegang akun ini mengendalikan dompet itu** (email tidak pernah ada di chain). Builder 6 Okt: tahap 3 **ya**.

**Rancangan yang dijalankan:** pemegang akun menandatangani **pernyataan baku** (9 baris: dompet, kontrak, token, kredensial, rantai, waktu) dengan dompet akunnya — tanpa transaksi, tanpa biaya — dan mendapat blok (pernyataan + tanda tangan),
tautan `…/?own=<blok>#/verify`, dan perintah `cast`. Siapa pun, tanpa akun, memeriksanya di halaman verifikasi: tanda tangan dipulihkan (`ecrecover`) dan dibandingkan dengan `ownerOf`/`credentialOf`/`locked` yang dibaca langsung dari chain.
Logika murni di `web/src/ownership.ts` (diuji `probe`); DOM di `pages/certificate-extras.ts` (sisi pemilik) dan `pages/ownership-check.ts` (pemeriksa).

| # | kriteria | status | bukti |
|---|---|---|---|
| AC-B170#1 | pernyataan **baku**: header + kalimat + 6 baris `kunci: nilai` berurutan; alamat bercek, hash huruf kecil, waktu UTC `…Z` tanpa milidetik; pemeriksa hanya menerima teks yang bila dibentuk ulang dari bidangnya **sama persis** dengan yang ditandatangani | **PASS** | `probe` "pernyataan baku", "parseStatement … pulang-pergi", "menolak 9 bentuk rusak/tidak baku" |
| AC-B170#2 | blok = pernyataan + `tanda tangan: 0x…` (65 byte); `parseBlock` memisahkannya persis (juga CRLF dan spasi di ujung), menolak yang tanpa/dengan tanda tangan pendek | **PASS** | `probe` "blok = pernyataan + baris tanda tangan", "parseBlock menolak" |
| AC-B170#3 | **VALID** hanya bila penandatangan (dipulihkan) = dompet yang dinyatakan = `ownerOf` di chain DAN `credentialOf(token)` = kredensial yang disebut | **PASS** | `probe` "VALID: …"; T93 langkah 3 (chain dipalsukan untuk pemilik = kunci uji) |
| AC-B170#4 | teks diubah sesudah ditandatangani, atau tanda tangan dompet LAIN, atau tanda tangan sampah → **tidak pernah VALID** (`SIGNER_MISMATCH` / `BAD_SIGNATURE`) | **PASS** | `probe` 3 pemeriksaan; T93 langkah 2 (blok dari kunci acak yang mengaku dompet B153 → "tanda tangan dari dompet lain") |
| AC-B170#5 | urutan putusan dari yang murah ke yang butuh jaringan: kegagalan bentuk/tanda tangan/rantai/kontrak **tidak menyentuh chain** | **PASS** | `probe` "urutan putusan …", "OTHER_CHAIN … tanpa membaca chain" |
| AC-B170#6 | **kontrak karangan** (bukan lapis artefak Lencana yang dikenal) tidak pernah VALID walau "menjawab" sesuka hati | **PASS** | `probe` "UNKNOWN_CONTRACT …"; T93 langkah 6; uji negatif: pemeriksaan `known` dimatikan → merah |
| AC-B170#7 | `NO_TOKEN` (chain menjawab "tidak ada"), `UNREADABLE` (jaringan mati), `HASH_MISMATCH`, `NOT_OWNER` (pemilik sebenarnya dilaporkan) dibedakan; "gagal baca" tidak pernah jadi "bukan pemilik" | **PASS** | `probe` 4 pemeriksaan fake + **chain 97 sungguhan**: dompet acak mengaku memegang B153 → `NOT_OWNER` dengan pemilik `0x12f6F95E…11DF`, `locked` true; kredensial salah → `HASH_MISMATCH`; token 12345 → `NO_TOKEN`; RPC `127.0.0.1:9` → `UNREADABLE` |
| AC-B170#8 | waktu pernyataan di depan jam pemeriksa >10 menit → tetap diputuskan chain, tetapi diberi peringatan `future` | **PASS** | `probe` "waktu pernyataan 1 jam 20 menit di depan" |
| AC-B170#9 | perintah `cast` yang setara ikut dicetak (`cast wallet verify --address … $'<pernyataan>' <tanda tangan>`, `ownerOf`, `credentialOf`); pesan berkutip bash bila diuraikan = pernyataan persis | **PASS** | `probe` "perintah cast …"; **dijalankan dengan `cast` sungguhan di bash 6 Okt:** pernyataan asli → "Validation succeeded. Address … signed this message." (exit 0), token diubah → "Validation failed" (exit 1) |
| AC-B170#10 | sisi pemilik: di tiap kartu artefak yang pemiliknya = dompet akun, kotak "Bukti kepemilikan" (tombol → tanda tangan → blok, tautan pemeriksaan, perintah cast, catatan batas); `signOwnershipStatement` menolak pernyataan yang menyebut dompet selain akun yang masuk | **PASS** | T93 langkah 1 (B153: 2 kotak; blok 11 baris, tanda tangan 132 karakter, tautan `https://lencana-psi.vercel.app/?own=…`, 3 perintah cast) |
| AC-B170#11 | halaman verifikasi punya bagian **Periksa bukti kepemilikan** (di bawah hasil verifier, sebelum matriks spesifikasi): tempel blok → putusan berwarna + rincian + perintah cast + batas klaim; tautan `?own=` mengisi dan langsung memeriksa; bahasa Inggris mempertahankan isian dan hasil; Kosongkan; ponsel 390 px tanpa luapan | **PASS** | T93 langkah 2–7 |
| AC-B170#12 | perubahan di berkas milik maintainer **hanya tambahan**: `index.html` +1 `<section id="ownership-check">` (+ komentar), `main.ts` +1 import +1 panggilan di `updateStaticText`; elemen hilang → fungsi diam; verifier (`input/go/out/status/banner`) tidak disentuh | **PASS** | `git diff --stat` (`index.html` +3, `main.ts` +4); T93 langkah 2 (verifier tidak terganggu) |
| AC-B170#13 | gerbang | **PASS** (kecuali baterai) | `tsc` 0, `probe` **253 / 0** (232 + 21), `build` 0; baterai 6 Okt (run ke-7): 38 harness, 38 hijau, 1.616 pemeriksaan (`probe` 267/0 sesudah B171) — Summary |
| AC-B170#14 | **bukti VALID sungguhan**: akun nyata (Privy) menandatangani di produksi dan pemeriksa menjawab VALID terhadap chain 97 | **OPEN** — kunci akun builder tidak ada pada kami; jalur VALID terbukti dengan kunci uji dan chain dipalsukan untuk pemiliknya, dan penolakannya terhadap chain sungguhan. Menunggu dorongan (LIVE) lalu builder menekan "Buat bukti kepemilikan" dan menempel hasilnya di halaman verifikasi | — |
| AC-B170#15 | **LIVE:** bagian "Periksa bukti kepemilikan" ada di halaman verifikasi produksi dan memeriksa terhadap chain 97 sungguhan | **PASS** | didorong `f312539..b77ba40` 6 Okt; Chrome terhadap `lencana-psi.vercel.app/#/verify`: blok dari kunci acak yang mengaku memegang B153 → **NOT_OWNER**; tautan `?own=<blok>#/verify` langsung memeriksa → **NOT_OWNER**; `pageerror` 0; HTML produksi memuat `<section id="ownership-check">` |

**Batas klaim:** bukti ini menyatakan bahwa penandatangan mengendalikan dompet yang memegang token — **bukan** identitas orang di dunia nyata (dompet tertanam terikat ke login), dan ia berupa potret: `ownerOf` dibaca saat diperiksa. Dompet kontrak pintar (EIP-1271)
tidak didukung. Perintah `cast wallet verify` dijalankan sungguhan (6 Okt); `ownerOf`/`credentialOf` mengikuti bentuk yang sama dengan panel B168. Tanpa akun produksi nyata, tanda tangan Privy (embedded wallet `personal_sign`) belum dibuktikan di jalur ini; `signMessage` yang sama dipakai semua rute bertanda tangan lain.
