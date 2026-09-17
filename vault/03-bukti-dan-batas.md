# 03 — Bukti dan batas

Aturan main dokumen ini: **setiap angka berasal dari perintah yang dijalankan**, dan
"belum diuji" ditulis sebagai "belum diuji", bukan dilewatkan.

## Yang SUDAH dibuktikan

| perintah | hasil | artinya |
|---|---|---|
| `forge test --no-match-path "*.fork.t.sol"` | **19 lulus / 0 gagal** (offline, ±25 ms) | mekanika artefak soulbound benar: transfer, approve, dan burn ditolak; `locked()` selalu true; interfaceId ERC-5192 cocok |
| `forge test --evm-version cancun --fork-url <BSC-97>` | **47 lulus / 0 gagal** | seluruh lapis on-chain berjalan terhadap **BAS yang benar-benar ter-deploy di chain 97** |
| `forge test --evm-version cancun --fork-url <BSC-56>` | **47 lulus / 0 gagal**, **angka gas identik** | kontrol silang: primitifnya sama di mainnet; hasil tidak bergantung kebetulan state |
| `forge script DeployCredentials --rpc-url http://127.0.0.1:8545` (dry-run di fork) | sukses · **3.827.994 gas = 0,0003828 BNB** | jalur deploy siap; biayanya recehan |
| siaran deploy ke anvil fork chain 97 | sukses · dibayar **0,0002934787 BNB** | resolver + artefak + `registerSchema()` + whitelist benar-benar berfungsi di state chain nyata |
| `npm run probe` di `web/` | **19/19 pemeriksaan lulus** | halaman verifikasi **membaca chain sungguhan dengan benar** — identitas, status, pemegang, artefak, rantai |
| `eth_getCode` + `eth_call` ke BAS | 18.881 B identik di 56 & 97; `getSchemaRegistry()` menjawab persis tabel README | primitif yang kita andalkan nyata dan terdokumentasi dengan benar |
| pembacaan spesifikasi OB3.0 | 6 dokumen spesifikasi + 8 README repo diunduh mentah; klaim diverifikasi ulang oleh skrip sendiri | bentuk kredensial, tipe status, dan nama field **dibaca dari sumbernya**, bukan ditebak |

Khusus angka 47 itu komponennya: 19 test resolver (fork) + 9 test ujung-ke-ujung (fork) +
19 test artefak (lokal). Yang **fork** semuanya diuji terhadap deployment pihak ketiga, bukan
tiruan yang kita deploy sendiri.

## Yang BELUM dibuktikan — jangan ditulis seolah sudah

| klaim | status sebenarnya |
|---|---|
| ❌ "kontrak kami live di testnet" | Semua keberhasilan adalah **fork** (state nyata, tanpa transaksi nyata) atau **anvil lokal**. Address publik kami **belum ada** |
| ❌ "halaman verifikasi lolos pengujian ujung-ke-ujung" | Probe lulus, tapi **baru pada jalur kredensial aktif**. Jalur **DICABUT** di halaman ini dibuktikan oleh **forge test**, belum oleh probe — karena data demonya belum lengkap (lihat di bawah) |
| ❌ "kredensial kami kompatibel dengan validator 1EdTech" | **Belum pernah dijalankan.** Ini target, bukan hasil |
| ❌ "pembayaran HTTP 402 berjalan" | Yang terbukti di x402 adalah **settlement on-chain**. Server membalas `402` + klien mengirim header `PAYMENT` **belum pernah dijalankan** |
| ❌ angka pasar e-learning Indonesia | **Nol bukti primer**, bukan angka diperkecil. Jangan diisi tebakan |
| ❌ "tidak ada pesaing di ceruk ini" | Kompetitor credentialing (POAP/Galxe/Layer3/Sismo/Gitcoin Passport) **tidak pernah diteliti**. Klaim "nol pesaing" cuma bersandar pada 4 submission yang ter-scrape |
| ⚠️ "BAS proyek terawat" | address-nya hidup, tapi repo 3 bintang, commit fungsional terakhir Mei 2024 |

## Yang diketahui rusak dan belum dibereskan

**`script/SeedDemo.s.sol` meninggalkan state demo tidak lengkap di fork lokal.**

Skripnya sudah dibuat idempoten (dulu gagal 3 transaksi, sekarang 1) — tapi **satu transaksi
`attest` masih gagal**, dan `--slow` **menghentikan seluruh transaksi setelahnya**. Akibatnya:
kredensial **dasar** ada dan berstatus AKTIF, sedangkan kredensial **lanjutan** dan peristiwa
**pencabutan** tidak pernah mendarat. Sebab gagalnya **belum dipastikan**; yang terbukti baru ini:
`eth_call` dengan panggilan yang sama, pada blok tepat sebelumnya, **berhasil** — jadi ini
masalah urutan/keadaan saat disiarkan, bukan isi calldata-nya.

Ini bukan blocker produk dan bukan blocker keamanan. Ini blocker **kenyamanan demo**, dan
catatan pentingnya justru sebaliknya: penyebabnya kemungkinan besar **guard anti-duplikasi
kita sendiri** (`AlreadyIssued`) yang **bekerja dengan benar** ketika `--slow` menjalankan ulang
skrip. Fitur kita terbukti di produksi oleh skrip kita sendiri.

## Daftar klaim yang DILARANG kami tulis

Bukan saran gaya. Ini kesimpulan yang sudah dibuktikan keliru oleh spesifikasi atau oleh test kami:

| klaim | kenapa dilarang |
|---|---|
| "Sertifikat **sah** secara hukum / institusional" | "Sah" menyiratkan pengakuan hukum. **Nol dasar.** Yang bisa: *terverifikasi kriptografis dan dapat diaudit publik* |
| "Sertifikat **tidak bisa dipalsukan**" | Yang terbukti hanya otentisitas tanda tangan + keberadaan anchor. **Isi klaim tidak dievaluasi.** VC 2.0: *"Verification of a credential does not imply evaluation of the truth of claims encoded in the credential."* |
| "Soulbound mencegah screenshot" | Yang terikat adalah **alamat**, dan metadata bisa off-chain/mutable. Gambar badge memang bisa disalin |
| "Terbukti orangnya yang belajar" | DID Core: *"cryptographic proof alone is insufficient for high-assurance identity decisions"* |
| "Hanya penerbit sah yang bisa mint **karena ini NFT**" | Bukan sifat standar token: ERC-721 *"minting and burning are outside the specification"*. Yang melarang adalah **whitelist kita** |
| "Data peserta privat **karena on-chain**" | ERC-721: *"privacy cannot be achieved if `ownerOf` can be queried across token IDs"*. Karena itu **tidak ada data pribadi di chain** — yang naik hanya hash kredensial + ID kursus |
| "Revocation non-repudiable itu inovasi kami" | Itu **perilaku bawaan EAS/BAS**. Kita pakai, bukan temukan |
| "Trustless" / "zkML-verified" / "TEE-verified" | Tidak ada padanan yang bisa kita jalankan di BSC untuk 17 hari. ERC-7857 butuh `IERC7857DataVerifier` + Sealed Executor — **tidak kita implementasikan** |
| "BAS program resmi BNB Chain" | Tidak ada di repo-nya |
| "Kompatibel dengan validator 1EdTech" | Belum dijalankan |

## Yang BOLEH kami tulis — dan ini tetap kuat

1. Kredensial mengikuti **W3C VC Data Model 2.0** dan berbentuk **Open Badges 3.0** (Final Release
   sejak 27 Mei 2024) → portabel ke verifier yang memahami standarnya.
2. **Identitas penerbit** terikat pada kunci yang menandatangani dokumen **dan** terdaftar di
   kontrak publik yang resolve di BscScan.
3. **Keberadaan dan waktu terbit** bisa dibuktikan dari hash + blok, dan **tidak bisa diubah
   retroaktif**.
4. **Pencabutan tidak bisa disangkal**: sekali tercabut, terbaca tercabut selamanya.
5. **Verifikasi tidak butuh wallet, akun, atau crypto** — cukup browser, dan perintahnya kami
   tampilkan supaya bisa diulang tanpa halaman kami.
6. **Batasnya kami tulis sendiri**: sistem ini tidak membuktikan kebenaran klaim, tidak
   membuktikan manusia di balik alamat, dan tidak mencegah penyalinan tampilan.

Poin 6 bukan pengalah. Menyatakan batas sendiri adalah alasan poin 1–5 bisa dipercaya.
