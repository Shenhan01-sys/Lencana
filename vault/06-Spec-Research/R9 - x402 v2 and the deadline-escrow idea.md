---
tags: [spec-research, "R9", x402, payments, concept]
status: active — dibaca dari sumber, bukan dari halaman pemasaran
updated: 2026-09-29
source: https://raw.githubusercontent.com/x402-foundation/x402/main/specs/x402-specification-v2.md (38.469 byte, diambil 29 Sep 2026)
---

# R9 - x402 v2: apa yang sebenarnya dikatakan spec, dan apa artinya untuk ide "durasi mandiri + cashback"

**Hub:** [[06-Spec-Research/01 - Spec Research]] · **Pembanding kita:** [[04-Signer-Service/S7 - Server routes and lifecycle]] · **Belum diputus:** B90 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26|status dan tugas terbaru]]

Aturan proyek ini: kebenaran x402/ERC-8004 dibaca dari **source**, bukan dari halaman launch
(`Claims-Cheat-Sheet` melarang kalimat yang lebih besar dari yang diukur). Halaman launch-nya sendiri
mengatakan "session" dan "subscription-like access"; spec-nya mengatakan hal yang lebih sempit.
Perbedaan itu penting karena ide durasi-mandiri dibangun di atasnya.

## 1. Yang dikatakan spec v2, dikutip apa adanya

| pertanyaan | jawaban sumber | identifier verbatim |
|---|---|---|
| Apakah **session** didefinisikan di core spec? | **Tidak.** Ia dikeluarkan dari lingkup dokumen; §12.6 menyebutnya sebagai pola tingkat aplikasi | `Document Scope → Out of Scope:` "**Session handling mechanisms**"; §12.6 "**Session management** for time-based access control" |
| Skema pembayaran v2 | Tiga di daftar lingkup dokumen, satu folder lagi ada di `specs/schemes/` | `exact`, `upto`, `batch-settlement` (+ folder `auth-capture`) |
| Kapan uang bergerak (yang selama ini kutulis "defer") | Bukan `defer`. Yang ada adalah **Payment Flow Models** di §6.1 | `upfront` = `settle → resource → respond`; `authorization` (default) = `verify → resource → settle → respond` — "funds move only after it completes successfully"; `escrow` = `settle → resource → settle → respond` |
| Escrow | **Ada sebagai flow model**, dua tahap: "A first settle commits a deposit or ceiling, the resource executes, and a second settle records the final charge." | `escrow` |
| Pelepasan bersyarat | Implisit lewat `upto` + `escrow`, **bukan** primitif bernama. Di `upto`, `amount` adalah "maximum authorized amount at verification time, but the actual amount to settle at settlement time" | `upto`, §7.2 |
| Refund / pembalikan | **Tidak ada** di semantik core. Sekali settle dan terbroadcast, final. `settlement_pending` hanya untuk rekonsiliasi saat konfirmasi gagal | `settlement_pending`, `insufficient_funds`, `invalid_transaction_state` |
| Transport v2 | HTTP, MCP, A2A | `specs/transports-v2/{http,mcp,a2a}.md` |
| Header | v2 memindahkan data pembayaran ke header | `PAYMENT-SIGNATURE`, `PAYMENT-REQUIRED`, `PAYMENT-RESPONSE`; `SIGN-IN-WITH-X` ("coming soon", CAIP-122) — halaman launch, bukan core spec |

Repo yang dikutip: `github.com/x402-foundation/x402` (bukan hanya `coinbase/x402`; README-nya sendiri
tidak menyebut v2/sessions — jadi kalau hanya membaca itu, kesimpulannya akan salah).

## 2. Idemu, dipetakan ke apa yang benar-benar ada

> "User enroll → pilih durasi 5/7/9 hari → makin cepat selesai makin besar cashback → gagal
> menyelesaikan dalam durasi sendiri maka dana hangus; 9 hari = tanpa cashback."

| bagian ide | padanannya | status |
|---|---|---|
| setor di muka, hitung final nanti | flow model **`escrow`** (§6.1): `settle → resource → settle → respond` | ada di spec, **tidak ada di kode kita** |
| "makin cepat → makin besar kembaliannya" | angka final ditentukan di **settle kedua** | cocok bentuknya; butuh aturan + kontrak penahan |
| "gagal → hangus" | juga settle kedua (pelepasan penuh ke penerbit/platform) | sama |
| oracle "selesai dalam N hari" | **sudah kita punya, dan itu kekuatan kita**: waktu attestation di BAS (`getTimestamp`) + `validFrom` kredensial + `course_gates.all_lessons_done` / `best_score >= passMark` | ada — lihat [[09-Testing/T18 - signer verify-edge.js]] |
| session untuk mengulang akses | keluar lingkup core spec (§12.6, aplikasi) | jangan dijual sebagai "fitur x402 v2" |
| `batch-settlement` / `upto` | **ini** yang paling berguna bagi kita sekarang: `POST /verify` banyak hash sekaligus + batas per pemakaian, dan `verifyListAgainstChain` kita baru saja membuktikan bahwa jumlah panggilan per invokasi itu biaya nyata (B89) | langsung relevan, biaya kecil |

## 3. Yang TIDAK bisa diberikan x402 v2 untuk ide ini

**Tidak ada refund.** Sekali settlement terbroadcast, final. Jadi "cashback" **bukan** pembatalan
transaksi — ia harus salah satu dari:

- **(A) kontrak penahan** (escrow sungguhan): dana learner masuk kontrak; settle kedua melepas
  sebagian ke learner dan sebagian ke penerbit. Butuh kontrak baru + audit + gas, dan
  `SettlementSplit.sol` kita **tidak** bisa dipakai apa adanya: ia pass-through
  (`splitErc20(token, payee, amount, ref)` idempoten per `ref`, `platformBps` hanya-turun, plafon
  `MAX_BPS = 2500`, plus `sweep` owner-only). Tidak ada keadaan "menahan".
- **(B) bayar-maju**: penerbit/platform mengirim pembayaran baru sebagai insentif. Jujur secara
  teknis, tapi biayanya dua settlement dan kalimatnya jadi "kami membayar orang yang selesai cepat",
  bukan "uangmu dikembalikan".
- **(C) tidak ada uang yang ditahan**: diskon di muka (harga 5 hari > 9 hari, selesai cepat dapat
  potongan untuk pembelian berikutnya). Zero kontrak baru, dan satu-satunya varian yang muat
  sebelum tenggat — tapi itu bukan cashback, dan jangan disebut begitu.

## 4. Empat hal yang tidak boleh dilupakan kalau ini jadi

1. **"Hangus 100%" adalah penalti, bukan harga.** Untuk produk edukasi, mekanisme yang mengambil
   seluruh dana karena telat beberapa hari adalah subjek pertanyaan perlindungan konsumen — dan
   jurinya bisa bertanya, "kalau peserta sakit?" Jawaban yang jujur: **floor**, misalnya hangus hanya
   sebagian (mis. 25%), sisanya jadi kredit kursus berikutnya, dan aturannya tercetak di kriteria
   penerbit, bukan di konfigurasi kita.
2. **Adverse selection strukturnya sendiri.** Peserta yang memilih 5 hari adalah yang paling percaya
   diri, bukan yang paling mampu; peserta yang ragu memilih 9 hari = tanpa insentif. Yang terjadi bisa
   justru mendanai diri dari pesertanya sendiri. Kalau mau diukur dulu: simulasi di atas rekaman
   `progress_events` kita (kita sudah punya 57 event per peserta uji) sebelum menaruh uang diaturnya.
3. **Deadline jangan dinilai jam kita.** Oracle harus angka yang ada di chain
   (`getTimestamp(anchoredListHash)` / `validFrom` kredensial), bukan `NOW()` di Postgres —
   kalau tidak, pihak yang memegang DB (kami) jadi hakim, dan seluruh pembeda "buktinya bukan dari
   platform" hilang lewat pintu ini.
4. **Aturannya milik penerbit, bukan kami** — sama seperti rubrik (B62) dan ambang lulus. Kalau
   durasi/cashback jadi konstanta di kontrak kita, Lencana berubah dari "rel bukti" jadi "rumah
   gadai". Ini yang paling menentukan apakah ide ini boleh masuk produk.

## 5. Biaya jujur per varian

| varian | kerja | bukti yang bisa ditampilkan 30 Sep |
|---|---|---|
| **(C)** diskon di muka, tanpa penahan | ±1 jam (rute + kolom `orders.state` yang sudah ada) | angka di halaman kriteria + `verify:db` |
| **(A)** kontrak escrow + test | ±½–1 hari untuk kontrak + Foundry test **offline** (`forge test --evm-version cancun`, 49/0 hari ini); deploy + audit tidak realistis sebelum tenggat | "kontraknya ada, diuji di fork, belum dipakai menerbitkan apa pun" — kalimat yang boleh diucapkan |
| **sesi x402 v2** untuk `/verify` | belum jelas: core spec menyatakan sesi out-of-scope, jadi ini pekerjaan di atas aplikasi kita, bukan upgrade header | jangan dijanjikan |

## 6. Keputusan yang dibutuhkan (B90)

> **Catatan 30 Sep malam — bagian ini sejarah, dibiarkan terbaca.** Builder memilih jalur (A) dan
> kemudian mengizinkan deploy. Keadaan sekarang: `CourseDeposit` ter-deploy di chain 97
> (`0xbeB57bC1a3Ad050b66Ad6ce1E2e42a6cd040E6c3`), punya rute HTTP, dan satu setoran uji diselesaikan
> dari setor sampai premi kembali — lihat [[09-Testing/T34 - signer deposit-check.js]] dan baris B90.
> Kalimat "TIDAK dideploy" di butir 2 di bawah adalah pilihan yang ditawarkan waktu itu, bukan keadaan hari ini.

Aku **tidak** mengimplementasikan apa pun dari bagian ini hari ini; yang kukerjakan adalah memastikan
kalimatnya benar. Pilih salah satu, nanti malam atau besok:

1. **(C) saja, tulis sebagai kebijakan penerbit** — murah, jujur, dan tidak mengubah klaim apa pun.
2. **(A) kontrak + test, TIDAK dideploy, TIDAK diklaim hidup** — bagus untuk slide "jalur uang kami
   bisa jadi escrow", jelek kalau sampai membuat juri mengira produknya menahan dana orang.
3. **Lewati dari submission, simpan sebagai rencana** — pilihan default-ku: yang merah kemarin
   (B89) baru saja membuktikan bahwa setiap permukaan baru bisa salah bicara kepada orang yang tidak
   bersalah — dan kalau permukaan itu memegang uang, yang salah bukan angka di dashboard, hak orang.

Yang tidak boleh terjadi: menyebutnya "didukung x402 v2 sessions". Yang didukung v2 adalah **flow
`escrow`** dan skema `upto`/`batch-settlement`; sesi justru dinyatakan **out of scope** di core
spec-nya.

**Related:** [[06-Spec-Research/R5 - x402 exact Permit2 and the proxy]] (v1 yang kita pasang hari ini) ·
[[04-Signer-Service/S6 - x402 paid verification]] · [[04-Signer-Service/S7 - Server routes and lifecycle]] ·
[[00-Overview/11 - Product Bar]] bar 10 (harga yang menempel ke enrollment) ·
[[10-Contributors/Claims-Cheat-Sheet]]
