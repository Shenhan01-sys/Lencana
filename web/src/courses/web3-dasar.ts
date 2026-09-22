/**
 * Kursus: Web3 Dasar untuk Praktisi (2026).
 *
 * Id-nya `web3-dasar-2026` BUKAN kebetulan: `SeedDemo.s.sol` mendefinisikan
 * `COURSE_BASE = keccak256("web3-dasar-2026")`, jadi kredensial tingkat kursus dari halaman
 * belajar ini menunjuk attestation yang SUDAH tertambang di chain 97 publik. Mengubah id ini
 * berarti memutus hubungan itu dan menciptakan kursus baru di chain.
 *
 * Institusinya fiktif dan ditulis demikian di mana pun ia muncul. Menerbitkan "ijazah" dari
 * nama kampus sungguhan untuk demo adalah cara tercepat kehilangan poin integritas — dan
 * spesifikasi Open Badges tidak melarangnya, jadi penahan satu-satunya adalah kita.
 */
import type { Course } from '../content'

export const WEB3_DASAR_ID = 'web3-dasar-2026'

export const web3Dasar: Course = {
  id: WEB3_DASAR_ID,
  title: 'Web3 Dasar untuk Praktisi',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'dasar',
  blurb:
    'Seratus sembilan puluh menit yang mengubah kamu dari "pernah dengar blockchain" menjadi orang yang ' +
    'buka explorer, baca transaksi, dan menolak klaim sertifikat yang tidak bisa diverifikasi.',
  audience: [
    'Mahasiswa tingkat akhir yang melamar kerja di industri web3 Indonesia',
    'Staf lembaga pelatihan dan kampus yang perlu menilai bukti belajar digital',
    'Pengajar yang ingin menerbitkan sertifikat yang bisa diperiksa orang lain tanpa harus mempercayainya',
  ],
  outcome: [
    'Membedakan address, kunci privat, dan checksum — serta tahu mana yang boleh dibagikan',
    'Membaca transaksi BNB Chain sendiri: nonce, gas, status, dan receipt',
    'Menjelaskan kenapa saldo bukan hak dan apa jebakan `approve`/allowance',
    'Memanggil fungsi view kontrak lewat RPC tanpa wallet, dan membaca hasilnya apa adanya',
    'Memverifikasi sebuah kredensial belajar dari chain, bukan dari tampilan halaman',
    'Menyatakan batas sebuah bukti: apa yang dibuktikan on-chain dan apa yang tidak',
  ],
  criteria:
    'Nilai akhir >= 70 dari 100. Komposisi: kuis 40%, tugas praktik 20%, esai dinilai agen penerbit 40%. ' +
    'Semua kuis harus dikerjakan; kuis bukan gerbang, tapi tanpa semuanya tidak ada yang bisa dinilai. ' +
    'Esai dinilai terhadap rubrik yang sama yang dipakai penerbit, dan rubriknya dibuka di depan peserta.',
  weights: { kuis: 40, esai: 40, praktik: 20 },
  passMark: 70,
  validDays: 730,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Fondasi dan keselamatan',
      blurb:
        'Sebelum menyentuh kontrak: apa arti "tidak perlu percaya siapa pun", dan bagian mana dari ' +
        'kalimat itu yang paling sering disalahpahami sampai orang kehilangan aset.',
      lessons: [
        {
          slug: 'kenapa-tanpa-kepercayaan',
          title: 'Kamu tidak perlu percaya siapa pun — tapi bukan berarti kamu aman',
          minutes: 12,
          kind: 'bacaan',
          summary:
            'Apa yang benar-benar dijanjikan sistem tanpa-izin, dan tiga hal yang tetap jadi tanggung jawab kamu.',
          blocks: [
            {
              t: 'p',
              text: 'Kalimat "desentralisasi" dipakai untuk banyak hal berbeda, dan kebanyakan pembicaraan berhenti sebelum bedanya jelas. Untuk kursus ini cukup satu definisi operasional: sebuah catatan bisa diperiksa dan dilewati tanpa meminta izin kepada pihak yang mengelola catatan itu.',
            },
            {
              t: 'h',
              text: 'Tiga hal yang dihapus, tiga yang tinggal',
            },
            {
              t: 'ul',
              items: [
                'Yang dihapus: kewajiban mempercayai bahwa saldo kamu dicatat benar, bahwa transaksi kamu tidak disensor, dan bahwa riwayat tidak bisa dibersihkan diam-diam.',
                'Yang tinggal: kewajiban menjaga kunci privat, kewajiban membaca apa yang kamu tanda tangani, dan kewajiban tidak menyimpulkan "aman" dari "berjalan di blockchain".',
                'Yang berpindah: kepercayaan terhadap bank berpindah menjadi kepercayaan terhadap kode kontrak — yang bisa dibaca, tapi hanya kalau kamu bisa membacanya.',
              ],
            },
            {
              t: 'note',
              text: 'Kalimat "kode itu sendiri hukumnya" benar secara teknis dan menyesatkan secara komersial. Kontrak yang berjalan sempurna tetap bisa menguras saldo kamu kalau kamu memberi izin yang salah. Yang berubah bukan risikonya, tapi bentuk risikonya: dari risiko pihak lain berbohong menjadi risiko kamu salah membaca.',
            },
            {
              t: 'p',
              text: 'BNB Smart Chain dipakai sebagai contoh di seluruh kursus ini bukan karena ia "paling bagus", tapi karena ia chain tempat kredensial demo kita benar-benar tertambang, sehingga setiap angka yang kamu lihat bisa kamu ulangi sendiri lewat RPC publik.',
            },
            {
              t: 'try',
              prompt:
                'Tulis satu paragraf dengan bahasamu sendiri: sebutkan satu hal yang tidak perlu kamu percayai lagi ketika memakai chain publik, dan satu hal yang justru sekarang sepenuhnya beban kamu.',
              hint: 'Kalau sulit, mulai dari pertanyaan: apa yang terjadi kalau penyedia dompet besok hilang?',
            },
          ],
        },
        {
          slug: 'alamat-dan-kunci',
          title: 'Address, kunci privat, dan checksum yang melindungi kamu',
          minutes: 14,
          kind: 'bacaan',
          summary:
            'Satu address adalah 20 byte. Cara ia ditulis membawa tanda tangan terhadap dirinya sendiri, dan itu bukan hiasan.',
          blocks: [
            {
              t: 'p',
              text: 'Address EVM adalah 20 byte, ditulis sebagai 40 angka heksadesimal dengan awalan 0x. Kunci privat adalah 32 byte yang menandatangani transaksi; siapa pun yang memilikinya bisa memindahkan aset di address itu, di chain mana pun, selamanya, sampai kuncinya diganti dengan memindahkan asetnya.',
            },
            {
              t: 'code',
              lang: 'ts',
              code:
                'import { getAddress, isAddress } from "viem"\n' +
                'const raw = "0xaec63f6cebbfacdc3516992b6ec396147c9c8361"\n' +
                'isAddress(raw)          // true  - bentuknya sah\n' +
                'getAddress(raw)        // 0xAEc63F6cEbBfacdC3516992b6ec396147c9c8361\n' +
                'getAddress("0xAEc63F6cEbBfacdC3516992b6ec396147c9c8362") // melempar: checksum tidak cocok',
            },
            {
              t: 'p',
              text: 'Campuran huruf besar/kecil pada address bukan gaya: ia checksum EIP-55, hasil dari hash address itu sendiri. Salin satu karakter salah dan `getAddress` akan menolak. Karena itu alamat yang muncul seluruhnya huruf kecil dari sebuah website perlu dicurigai: sebagian alat membuang checksum justru untuk menyembunyikan bahwa alamatnya sudah diganti.',
            },
            {
              t: 'h',
              text: 'Kasus yang membuat ini nyata',
            },
            {
              t: 'quote',
              text: 'Perhatikan bentuknya: address ini punya 39 karakter heks, bukan 40.',
              source: 'Catatan yang benar-benar terjadi saat menyiapkan deployment kursus ini — satu karakter hilang ketika menyalin address dompet, dan alat menolak memakainya.',
            },
            {
              t: 'note',
              text: 'Jangan pernah menyimpulkan address orang lain dari ingatan atau dari potongan layar. Salin dari tempatnya, lalu tempel ke alat yang memverifikasi checksum.',
            },
            {
              t: 'ul',
              items: [
                'Boleh dibagikan: address penerimaan, hash transaksi, UID attestation.',
                'Tidak boleh dibagikan: frasa pemulihan, kunci privat, file keystore beserta passfrase-nya.',
                'Sering salah dianggap aman: "kunci khusus testnet". Kalau dompet yang sama dipakai di mainnet, kuncinya satu kunci yang sama.',
              ],
            },
          ],
        },
        {
          slug: 'kuis-keselamatan',
          title: 'Kuis 1 — Keselamatan dasar',
          minutes: 10,
          kind: 'kuis',
          summary: 'Lima soal. Setiap kunci jawaban disertai alasannya, termasuk yang kamu jawab benar.',
          blocks: [
            { t: 'p', text: 'Kuis ini tidak menahan kamu masuk lesson berikutnya. Ia ada supaya kamu tahu bagian mana yang belum kamu kuasai sebelum bagian itu berbiaya nyata.' },
          ],
          quiz: {
            passPct: 80,
            questions: [
              {
                id: 'q1',
                prompt: 'Manakah yang boleh ditempel ke grup tanpa membuka asetmu ke risiko?',
                options: [
                  'Frasa pemulihan 12 kata',
                  'Kunci privat berbentuk 0x…',
                  'Address penerimaan dengan checksum',
                  'Passfrase file keystore',
                ],
                answer: 2,
                why: 'Address hanya menunjuk tempat. Yang mengendalikan aset adalah kunci penandatangan, dan address tidak membocorkannya.',
              },
              {
                id: 'q2',
                prompt: 'Campuran huruf besar-kecil pada address EVM berfungsi untuk…',
                options: [
                  'Memperbesar kapasitas alamat',
                  'Checksum: mendeteksi salah ketik dan salah salin',
                  'Menandai chain asal alamat',
                  'Menyembunyikan alamat dari pemindai',
                ],
                answer: 1,
                why: 'EIP-55 memakai hash alamat untuk menentukan kapitalisasi. Salin satu karakter salah dan alat yang memeriksa akan menolak.',
              },
              {
                id: 'q3',
                prompt: 'Kamu "hanya" menandatangani transaksi di sebuah situs agar bisa klaim hadiah. Yang paling menentukan risiko adalah…',
                options: [
                  'Apakah situsnya pakai https',
                  'Isi data yang kamu tanda tangani, bukan tampilan tombolnya',
                  'Berapa lama situs itu ada',
                  'Apakah dompetmu populer',
                ],
                answer: 1,
                why: 'Antarmuka bisa menampilkan apa saja. Yang dieksekusi jaringan adalah payload-nya: izin, jumlah, dan tujuan.',
              },
              {
                id: 'q4',
                prompt: 'Sebuah sertifikat berkata "sudah tercatat di blockchain". Itu membuktikan…',
                options: [
                  'Isi sertifikat benar',
                  'Penerbitnya terpercaya',
                  'Ada rekaman pada waktu tertentu yang tidak bisa dibersihkan diam-diam',
                  'Pemiliknya lulus uji',
                ],
                answer: 2,
                why: 'Chain membuktikan keberadaan sebuah rekaman pada suatu waktu dan bahwa rekamannya tidak bisa dihapus. Kebenaran isi tetap milik penerbitnya.',
              },
              {
                id: 'q5',
                prompt: 'Cara paling aman memakai dompet khusus testnet untuk belajar kontrak pintar adalah…',
                options: [
                  'Ekspor kunci dompet utama ke perangkat uji',
                  'Buat dompet baru yang tidak pernah memegang aset nyata',
                  'Pakai dompet utama tapi hanya jaringan testnet',
                  'Simpan kunci di catatan teks lalu hapus',
                ],
                answer: 1,
                why: 'Satu kunci tidak mengenal jaringan. Kunci yang pernah menyentuh aset nyata tetap bisa dipakai di mainnet, jadi pisahkan dari awalnya.',
              },
            ],
          },
        },
        {
          slug: 'dompet-burner-dan-faucet',
          title: 'Praktik 1 — Dompet sekali-pakai dan faucet',
          minutes: 18,
          kind: 'praktik',
          summary:
            'Membuat dompet yang boleh kamu korbankan, lalu mengisi testnet BNB — termasuk syarat yang membuat faucet resmi menolak dompet baru.',
          blocks: [
            { t: 'p', text: 'Semua latihan berikutnya memakai BNB Smart Chain testnet (chainId 97). Yang kamu butuhkan: satu address yang tidak pernah memegang aset nyata, dan sedikit gas testnet.' },
            { t: 'h', text: 'Langkah' },
            {
              t: 'ol',
              items: [
                'Buat dompet baru khusus belajar. Simpan frasa pemulihannya hanya offline.',
                'Tambahkan BNB Smart Chain Testnet secara manual (chainId 97, RPC publik, simbol tBNB).',
                'Klaim gas. Pilih faucet yang tidak mensyaratkan kamu sudah memegang aset di mainnet.',
                'Cek sendiri hasilnya lewat RPC, jangan lewat tampilan dompet: `cast balance <address> --rpc-url https://bsc-testnet.publicnode.com`.',
              ],
            },
            {
              t: 'note',
              text: 'Bagian ini punya syarat yang tidak terlihat dari luar dan akan menjebak kamu kalau dipercaya sebagai "masalah CAPTCHA": faucet resmi mensyaratkan saldo kecil di BNB mainnet, dan sebagian faucet lain mensyaratkan saldo ETH di Ethereum mainnet. Dompet baru yang bersih akan selalu gagal, dan itu bukan kesalahan langkah kamu — itu aturan kelayakan mereka untuk menahan bot.',
            },
            { t: 'try', prompt: 'Catat saldo yang kamu terima dalam wei DAN dalam BNB dari satu perintah `cast balance`. Kalau dua-duanya tidak cocok dengan mata kamu sendiri, baca lagi bagian 18 desimal.' },
            {
              t: 'links',
              items: [
                { label: 'BNB Chain testnet faucet (resmi)', url: 'https://www.bnbchain.org/en/testnet-faucet', kind: 'resmi' },
                { label: 'QuickNode faucet (tanpa saldo mainnet)', url: 'https://faucet.quicknode.com/binance-smart-chain/bnb-testnet', kind: 'resmi' },
                { label: 'BNB Chain RPC publik', url: 'https://bsc-testnet.publicnode.com', kind: 'kode' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Modul 2 — Transaksi dan gas',
      blurb:
        'Satu transaksi dibedah sampai habis: kenapa ia gagal, siapa yang dibayar, dan bagian mana yang tidak bisa diubah setelah tertambang.',
      lessons: [
        {
          slug: 'anatomi-transaksi',
          title: 'Anatomi transaksi: nonce, gas, dan dua harga yang berbeda',
          minutes: 15,
          kind: 'bacaan',
          summary: 'Enam field yang menentukan apakah transaksimu jalan, mahal, atau nyangkut.',
          blocks: [
            { t: 'p', text: 'Sebuah transaksi EVM pada dasarnya adalah pesan berurut dari satu alamat. Enam field ini yang membuatnya bisa dipahami jaringan tanpa mempercayai pengirimnya.' },
            {
              t: 'ul',
              items: [
                '`from` — diturunkan dari tanda tangan, tidak bisa dipilih sendiri.',
                '`nonce` — hitungan transaksi dari alamat itu. Loncat satu angka dan transaksi berikutnya menunggu; pakai angka sama dua kali dan yang satu akan menggantikan yang lain.',
                '`gasLimit` — batas langkah yang kamu izinkan. Sisa yang tidak terpakai dikembalikan.',
                '`gasPrice` (atau `maxFeePerGas` + `maxPriorityFeePerGas`) — harga per langkah. Batas langkah tidak menentukan harga, dan harga tidak menentukan batas.',
                '`to` dan `data` — alamat tujuan dan calldata. Untuk penerbitan attestation, `data` inilah yang berisi skema dan hasilmu.',
                '`value` — BNB yang dipindahkan. Banyak operasi penting bernilai 0.',
              ],
            },
            { t: 'h', text: 'Biaya nyata = gas terpakai × harga, bukan gasLimit × harga' },
            {
              t: 'p',
              text: 'Ini bedanya yang paling sering membuat orang kaget: gasLimit adalah plafon, bukan tagihan. Transaksi yang revert tetap membayar semua langkah yang sudah dieksekusi sampai titik gagal — karena node sudah mengerjakannya.',
            },
            {
              t: 'code',
              lang: 'bash',
              code:
                '# deployment 4 transaksi kita, terukur di chain 97 publik:\n' +
                '# 4.191.202 gas; pada 0,1 gwei itu 0,0004191202 BNB\n' +
                'cast gas-price --rpc-url https://bsc-testnet.publicnode.com',
            },
            {
              t: 'note',
              text: 'Angka gas dan harga pada contoh ini hasil ukur, bukan tabel di dokumentasi. Harga berubah, jadi biasakan mengukur sebelum menyimpulkan sebuah operasi "murah" atau "mahal".',
            },
          ],
        },
        {
          slug: 'bedah-satu-transaksi',
          title: 'Studi kasus — Membongkar satu penerbitan kredensial',
          minutes: 16,
          kind: 'kasus',
          summary:
            'Ambil satu hash transaksi nyata dari deployment kita, lalu baca field-fieldnya sampai ke sebab revert.',
          blocks: [
            { t: 'p', text: 'Di bawah ini transaksi yang benar-benar terjadi saat deployment 21 Sep: pendaftaran schema kita ke registry BAS di chain 97. Kerjakan berurutan; setiap langkah menghasilkan angka yang akan kamu pakai lagi di modul 4.' },
            { t: 'try', prompt: 'Buka receipt-nya: `cast receipt 0x197381cfa08ff5154c740242eede140e8b92e64d14f6712696a47877b134c19f --rpc-url https://bsc-testnet.publicnode.com`. Catat status, gas terpakai, dan alamat `to`.' },
            {
              t: 'p',
              text: '`to` pada transaksi itu bukan kontrak kami — ia alamat schema registry BAS. Kami hanya memanggilnya. Ini poin yang sering terbalik: kontrakmu memanggil infrastruktur yang sudah ada, bukan sebaliknya.',
            },
            { t: 'h', text: 'Kalau transaksinya gagal' },
            {
              t: 'ol',
              items: [
                'Receipt hanya bilang gagal, tanpa sebab. Ambil fungsi dan argumennya.',
                'Ulangi panggilan yang sama sebagai `eth_call` pada blok sebelum transaksi itu. Error aslinya keluar di sana.',
                'Cocokkan 4 byte pertama penyebabnya dengan daftar error kontrak. `cast keccak "NotFound()"` lalu ambil 8 heks pertama.',
              ],
            },
            {
              t: 'note',
              text: 'Langkah kedua bukan trik, ia satu-satunya cara yang jujur: simulasi ulang pada keadaan sebelum transaksi memberi kita revert asli tanpa mengubah apa pun. Karena itu skrip `_research/read_tx.py` ada di repo.',
            },
            {
              t: 'links',
              items: [
                { label: 'Explorer testnet untuk address & transaksi', url: 'https://testnet.bscscan.com', kind: 'resmi' },
                { label: 'Dokumentasi BNB Chain RPC', url: 'https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/', kind: 'resmi' },
              ],
            },
          ],
        },
        {
          slug: 'kuis-gas',
          title: 'Kuis 2 — Gas, nonce, dan kegagalan',
          minutes: 8,
          kind: 'kuis',
          summary: 'Enam soal tentang hal yang paling sering disalahpahami saat biaya jadi masalah.',
          blocks: [{ t: 'p', text: 'Semua soalnya tentang bedanya plafon, tagihan, dan antrean.' }],
          quiz: {
            passPct: 80,
            questions: [
              {
                id: 'q1',
                prompt: 'gasLimit 500.000, gas terpakai 316.384, harga 1 gwei. Biayanya…',
                options: ['0,0005 BNB', '0,000316384 BNB', '0,000000316384 BNB', '500.000 BNB'],
                answer: 1,
                why: 'Dibayar yang terpakai, bukan plafonnya: 316.384 × 10^9 wei = 0,000316384 BNB.',
              },
              {
                id: 'q2',
                prompt: 'Transaksi revert. Biayanya…',
                options: ['Kembali seluruhnya', 'Dibayar sampai langkah kegagalan', 'Nol karena tidak ada perubahan state', 'Ditanggung node yang menambang'],
                answer: 1,
                why: 'Pekerjaan komputasi sudah dilakukan. Yang dibatalkan hanya perubahan state-nya.',
              },
              {
                id: 'q3',
                prompt: 'Nonce 5 sudah masuk, lalu kamu kirim nonce 3. Yang terjadi…',
                options: ['Ditolak sebagai transaksi kadaluarsa', 'Antre di belakang dan jalan setelah 5', 'Menggantikan transaksi nonce 3 sebelumnya bila gasnya cukup tinggi', 'Buat alamat itu terkunci'],
                answer: 0,
                why: 'Nonce di bawah yang sudah dipakai tidak bisa dieksekusi — transaksi lama tidak bisa diulang. Penggantian hanya berlaku untuk nonce yang SAMA dan belum tertambang.',
              },
              {
                id: 'q4',
                prompt: 'Menaikkan harga gas pada nonce yang sama di jaringan BSC disebut…',
                options: ['Retry', 'Replace-by-fee', 'Reorg', 'Revert'],
                answer: 1,
                why: 'Transaksi baru dengan nonce identik menggantikan yang lama bila harganya cukup lebih tinggi — karena nonce tidak boleh dipakai dua kali.',
              },
              {
                id: 'q5',
                prompt: 'Sebab revert sebuah transaksi tidak ada di receipt. Cara membacanya…',
                options: ['Tunggu indexer', 'Ulangi panggilan sebagai eth_call pada blok sebelumnya', 'Baca log kontrak tetangga', 'Tidak ada cara'],
                answer: 1,
                why: 'Simulasi ulang di keadaan sebelum transaksi memunculkan error aslinya tanpa mengubah chain.',
              },
              {
                id: 'q6',
                prompt: 'Empat transaksi sebuah skrip dikirim cepat tanpa menunggu. Yang paling mungkin bikin sebagian gagal…',
                options: ['Harga gas berubah', 'Nomor nonce dipakai berantai dan satu koneksi putus meninggalkan lubang di antrean', 'Kontrak menolak transaksi beruntun', 'RPC menyimpan duplikat'],
                answer: 1,
                why: 'Nonce harus menaik tanpa celah. Koneksi yang putus di tengah membuat satu nomor tidak pernah masuk, dan transaksi sesudahnya menunggu selamanya.',
              },
            ],
          },
        },
        {
          slug: 'praktik-kirim-dan-baca',
          title: 'Praktik 2 — Kirim, tunggu, baca receipt',
          minutes: 20,
          kind: 'praktik',
          summary: 'Satu transfer kecil, lalu buktikan sendiri bahwa ia terjadi — tanpa membuka dompet.',
          blocks: [
            { t: 'p', text: 'Kirim 0,001 tBNB ke address lain milikmu, lalu baca ulang dari chain. Yang dilatih di sini bukan mengirimnya, tapi MEMBUKTIKAN mengirimnya dengan alat yang tidak kamu percayai.' },
            { t: 'h', text: 'Yang harus kamu dapat di akhir' },
            { t: 'ul', items: ['hash transaksi', 'nomor blok dan waktu blok', 'gas terpakai nyata', 'selisih saldo sebelum dan sesudah, termasuk biaya'] },
            { t: 'try', prompt: 'Bandingkan `cast block <nomor>` dengan waktu jam dindingmu. Kalau bedanya besar, salah satu penjelasannya adalah waktu blok, bukan waktu yang dikirim dompetmu.' },
            {
              t: 'note',
              text: 'Selisih saldo yang tidak sama dengan jumlah yang kamu kirim adalah hasil yang benar: biaya gas dipotong terpisah. Peserta yang mengira angkanya harus sama biasanya berhenti di sini; lanjutkan, itu bukan bug.',
            },
            {
              t: 'links',
              items: [
                { label: 'Dokumentasi cast (perintah yang dipakai di latihan ini)', url: 'https://book.getfoundry.sh/reference/cast/', kind: 'resmi' },
              ],
            },
          ],
        },
      ],
    },
    {
      id: 'm3',
      title: 'Modul 3 — Token, kontrak, dan cara membacanya',
      blurb:
        'Saldo, izin, dan ABI. Termasuk jebakan yang membuat orang kehilangan aset tanpa menandatangani satu pun transfer.',
      lessons: [
        {
          slug: 'token-bukan-uang',
          title: 'ERC-20 / BEP-20: saldo bukan uang, izin bukan hak',
          minutes: 16,
          kind: 'bacaan',
          summary: 'Tiga fungsi yang menjelaskan sebagian besar berita "disedot" yang kamu baca.',
          blocks: [
            { t: 'p', text: 'Sebuah token adalah satu kontrak dengan tiga catatan: siapa punya berapa, siapa boleh memindahkan milik siapa, dan siapa yang boleh mengubah aturan itu. Sebagian besar kerugian bukan karena kuncinya bocor, tapi karena catatan kedua diisi dengan benar oleh pemiliknya sendiri.' },
            {
              t: 'code',
              lang: 'ts',
              code:
                '// allowance: berapa banyak PIHAK KEDUA boleh ambil dari milik kita\n' +
                'IERC20.approve(spender, amount)\n' +
                'IERC20.allowance(owner, spender) -> uint256\n' +
                'IERC20.transferFrom(from, to, amount)  // butuh allowance dari from',
            },
            {
              t: 'h',
              text: 'Kenapa izin jadi senjata',
            },
            {
              t: 'ul',
              items: [
                'Izin tidak terpotong oleh transaksi berikutnya: ia tinggal di kontrak sampai dipakai atau kamu setel ke nol.',
                'Mengesahkan "unlimited approve" untuk dompet pihak ketiga berarti memberi nomor yang tidak kedaluwarsa.',
                'Izin tidak menyebut aset apa pun selain kontrak yang kamu tanda tangani. Beda kontrak, beda izin.',
              ],
            },
            {
              t: 'note',
              text: 'Saran praktis yang tidak akan berubah: setel allowance ke jumlah yang diperlukan, lalu setel kembali ke nol setelah selesai. Ini satu-satunya bagian dari web3 yang biayanya cuma gas.',
            },
            { t: 'try', prompt: 'Periksa address belajarmu di explorer dan buka tab token approvals-nya kalau ada. Kalau kosong, catat bahwa ketiadaan izin juga sebuah hasil pemeriksaan.' },
          ],
        },
        {
          slug: 'kontrak-dan-abi',
          title: 'Kontrak pintar dan ABI: interface tanpa mempercayai implementasi',
          minutes: 14,
          kind: 'bacaan',
          summary: 'ABI memberi bentuk, bytecode memberi perilaku, dan keduanya bisa berbohong dengan caranya sendiri.',
          blocks: [
            { t: 'p', text: 'ABI adalah deskripsi fungsi: nama, tipe argumen, tipe balikan, dan view atau tidak. Dari situ 4 byte pertama hash signature menjadi pemilih fungsi. Itu sebabnya `eth_call` hanya perlu 4 byte dan argumen yang sudah di-encode.' },
            {
              t: 'code',
              lang: 'bash',
              code:
                'cast keccak "isIssuer(address)"\n' +
                '# 0x877b9a67…  -> pemilih fungsi: 877b9a67\n' +
                'cast keccak "isDelisted(address)"\n' +
                '# 0x38cf5a51…  -> hampir berurutan dengan di atas, dan inilah yang bikin salah tebak mahal',
            },
            {
              t: 'note',
              text: 'Dua selector di atas berjarak satu karakter pada bagian yang tidak kamu perhatikan. Menulis eth_call manual dengan mengingat selector adalah cara menghasilkan "GAGAL" yang sebenarnya berarti tebakan saya salah. Ukur, jangan ingat.',
            },
            { t: 'h', text: 'Sumber kebenaran yang harus dibedakan' },
            { t: 'ul', items: ['Source terverifikasi di explorer -> yang paling kuat, tapi sering tidak tersedia di chain testnet.', 'ABI yang dipublikasikan proyek -> bentuk fungsi, bukan perilaku.', 'Bytecode di chain -> perilaku nyata; bisa dicocokkan dengan selector yang kamu harapkan.', 'Komentar dan README -> klaim. Berguna, tidak pernah membuktikan.'] },
          ],
        },
        {
          slug: 'praktik-eth-call',
          title: 'Praktik 3 — Baca kontrak kita tanpa wallet',
          minutes: 22,
          kind: 'praktik',
          summary:
            'Panggil `isIssuer`, `isDelisted`, `schemaUID`, dan `statusOf` pada deployment publik kami lewat RPC biasa.',
          blocks: [
            { t: 'p', text: 'Kontrak yang dipakai latihan ini benar-benar ada di chain 97: resolver 0x7CA624caFDe5cA3A27b33d26be56F73a90792065 dan artefak 0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c. Tidak ada backend kami di jalur ini — hanya kamu dan satu RPC publik.' },
            {
              t: 'code',
              lang: 'bash',
              code:
                'R=0x7CA624caFDe5cA3A27b33d26be56F73a90792065\n' +
                'RPC=https://bsc-testnet.publicnode.com\n' +
                'cast call $R "schemaUID()" --rpc-url $RPC\n' +
                'cast call $R "isIssuer(address)" 0x82113098D1C287Fee862D5c2F1BE3f382c87F7DE --rpc-url $RPC\n' +
                'cast call $R "statusOf(bytes32)" 0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa --rpc-url $RPC',
            },
            {
              t: 'note',
              text: 'Dua hal yang akan kamu lihat dan jangan kamu salah artikan: `schemaUID` adalah fungsi view yang dihitung dari address kontrak itu sendiri, jadi ia tidak membaca chain sama sekali; sedangkan `statusOf` mengembalikan TUJUH nilai dan salah satunya adalah flag penerbit yang ditarik — bukan pencabutan.',
            },
            { t: 'try', prompt: 'Ganti hash `0x0b95…` dengan `0xf34b…` dan catat bedanya pada posisi kedua. Itu bedanya "berlaku" dan "dicabut penerbitnya" di tempat yang paling tidak bisa dibohengi: balikan kontrak.' },
            { t: 'try', prompt: 'Terakhir: panggil `statusOf` dengan hash acak 32 byte. Perhatikan bahwa "tidak ada" dan "gagal baca" harus tetap bisa kamu bedakan.' },
          ],
        },
        {
          slug: 'kuis-token',
          title: 'Kuis 3 — Token, izin, dan ABI',
          minutes: 9,
          kind: 'kuis',
          summary: 'Lima soal. Tiga di antaranya tentang izin, bukan tentang harga.',
          blocks: [{ t: 'p', text: 'Kalau kamu menjawab semuanya benar tanpa membuka dokumentasi, Modul 3 selesai.' }],
          quiz: {
            passPct: 80,
            questions: [
              {
                id: 'q1',
                prompt: '`approve(spender, 1000)` berarti…',
                options: ['1000 token dikirim ke spender', 'spender boleh mengambil sampai 1000 dari saldo kita lewat transferFrom', 'saldo kita berkurang 1000 sekarang', 'spender tidak bisa lagi mengambil apa pun'],
                answer: 1,
                why: 'approve hanya mengisi catatan allowance. Saldo bergerak ketika pihak itu memanggil transferFrom.',
              },
              {
                id: 'q2',
                prompt: 'Yang membuat "unlimited approve" berbahaya adalah…',
                options: ['Angka maksimum yang bisa dipegang uint256', 'Izin tinggal sampai diubah, tidak kedaluwarsa sendiri', 'Kontrak token wajib menghormati izin', 'Explorer tidak menampilkannya'],
                answer: 1,
                why: 'Bukan besarnya semata, tapi tidak ada batas waktunya. Aset yang masuk ke address itu kemudian bisa diambil kapan pun.',
              },
              {
                id: 'q3',
                prompt: '4 byte pertama pemilih fungsi dihitung dari…',
                options: ['address kontrak', 'hash signature fungsi, diambil 4 byte terdepan', 'nomor baris di source', 'opcode di bytecode'],
                answer: 1,
                why: 'keccak256 dari teks signature seperti "transfer(address,uint256)", lalu 4 byte pertama.',
              },
              {
                id: 'q4',
                prompt: 'Fungsi `view` yang dihitung dari address kontraknya sendiri…',
                options: ['harus dibaca dari chain supaya benar', 'bisa dihitung di sisi klien tanpa membaca state', 'tidak bisa dipanggil lewat RPC', 'selalu mengembalikan nol'],
                answer: 1,
                why: 'Tidak ada state yang dibaca. Karena itu hasil seperti UID schema bisa dicek silang secara lokal — dan kalau lokal dan chain tidak cocok, yang salah adalah address-nya.',
              },
              {
                id: 'q5',
                prompt: 'Source kontrak tidak terverifikasi di explorer. Bukti terkuat yang masih bisa kamu kumpulkan…',
                options: ['README proyek', 'bytecode di chain dicocokkan dengan selector dan perilaku yang diuji', 'jumlah transaksi', 'usia address'],
                answer: 1,
                why: 'Bytecode adalah perilaku nyata. Cocokkan selector yang kamu harapkan, lalu uji lewat fork — bukan lewat klaim di dokumen.',
              },
            ],
          },
        },
      ],
    },
    {
      id: 'm4',
      title: 'Modul 4 — Bukti belajar dan batasnya',
      blurb:
        'Bagian yang membuat kursus ini bukan kursus web3 generik: apa yang bisa dan tidak bisa dibuktikan sebuah kredensial on-chain.',
      lessons: [
        {
          slug: 'kenapa-ijazah-digital-gagal',
          title: 'Kenapa ijazah digital sering tidak dipercaya',
          minutes: 13,
          kind: 'bacaan',
          summary: 'Tiga kegagalan: tidak bisa diperiksa, bisa disembunyikan, dan tidak jelas siapa yang menanggung pernyataan.',
          blocks: [
            { t: 'p', text: 'Sertifikat PDF gagal di tiga tempat berbeda, dan sebagian besar upaya "sertifikat digital" hanya memperbaiki yang pertama.' },
            { t: 'ol', items: ['Tidak bisa diperiksa: penerimanya harus menghubungi penerbit, atau mempercayai tampilan halaman.', 'Bisa disembunyikan: penerbit menutup servernya, riwayatnya hilang. Yang mati bukan prestasinya, tapi bukti bahwa prestasinya ada.', 'Tidak jelas penanggung jawabnya: siapa yang menyatakan lulus, dan apakah pernyataan itu bisa ditarik.'] },
            { t: 'h', text: 'Tiga lapis yang menjawab tiga kegagalan itu, masing-masing tidak saling menggantikan' },
            {
              t: 'ul',
              items: [
                'Dokumen (Open Badges 3.0 / Verifiable Credential) -> isinya: siapa, apa, nilainya, rubriknya. Ditandatangani penerbit.',
                'Registry di chain -> penerbitnya diizinkan atau tidak, statusnya dicabut atau tidak, dan kapan rekamannya ada.',
                'Artefak (token tak bisa dipindahtangankan) -> pegangan peserta yang bisa ditunjuk, bukan file yang harus dipercaya.',
              ],
            },
            {
              t: 'note',
              text: 'Yang TIDAK dibuktikan salah satu lapis mana pun: bahwa penilaian itu benar. Chain membuktikan bahwa sebuah pernyataan dibuat oleh pihak tertentu pada waktu tertentu. Kualitas pernyataan itu tetap urusan penerbit dan rubriknya — dan halaman verifikasi kami menuliskan batas ini apa adanya.',
            },
            { t: 'try', prompt: 'Ambil satu sertifikat yang kamu punya sekarang. Untuk tiap satu dari tiga kegagalan di atas, tulis berapa lama waktu yang dibutuhkan orang untuk memeriksanya.' },
          ],
        },
        {
          slug: 'pencabutan-yang-bisa-dibuktikan',
          title: 'Pencabutan, penarikan, dan kenapa keduanya harus berbeda',
          minutes: 15,
          kind: 'bacaan',
          summary:
            'Ada perbedaan antara "penerbit menarik pernyataannya" dan "platform menarik dukungannya". Menyamarakannya merusak riwayat.',
          blocks: [
            { t: 'p', text: 'Pada sistem attestation, hanya pihak yang membuat rekaman yang bisa mencabutnya. Tidak ada tombol "batalkan" untuk pihak ketiga. Kalau sebuah platform memegang kunci semua penerbit, platform itu berhenti menjadi tempat dan menjadi penerbit.' },
            { t: 'h', text: 'Dua kata yang tidak boleh ditumpuk jadi satu' },
            {
              t: 'ul',
              items: [
                '**Dicabut**: penerbitnya sendiri yang membatalkan. Permanen, tidak bisa dipulihkan, kredensialnya mati.',
                '**Penerbit ditarik**: platform menyatakan tidak lagi mendukung penerbit itu. Rekaman penerbitan tidak disentuh, dan kredensial bisa kembali terbaca berlaku kalau penarikan dicabut.',
                'Dipisah supaya keluar baik-baik tidak jadi pembatalan massal: agen yang berhenti memakai sebuah platform tetap sah sertifikat alumninya.',
              ],
            },
            {
              t: 'note',
              text: 'Perhatikan arah dayanya: penarikan hanya membuat keputusan LEBIH KETAT, tidak pernah sebaliknya. Tidak ada input yang membuat kredensial mati terbaca hidup. Kalau tidak begitu, ia jadi alat sensor, bukan alat akuntabilitas.',
            },
            { t: 'p', text: 'Konsekuensi praktisnya: supaya dua keadaan ini bisa dibaca pihak ketiga tanpa mempercayai server kami, keduanya harus muncul di tempat yang berbeda. Karena itu daftar status kami dua, bukan satu dengan tiga nilai.' },
            { t: 'try', prompt: 'Kasus: sebuah agen bubar baik-baik dan domainnya mati. Sertifikat alumninya berlaku atau tidak? Sekarang kasus kedua: kunci agen itu bocor dan dipakai menerbitkan seribu sertifikat palsu. Mana yang harus terjadi pada masing-masing?' },
          ],
        },
        {
          slug: 'esai-batas-bukti',
          title: 'Esai — Menilai sebuah klaim sertifikat',
          minutes: 45,
          kind: 'esai',
          summary:
            'Satu kasus nyata-style: kamu diberi dua kandidat dan dua tautan verifikasi. Tulis keputusannya beserta apa yang tidak bisa kamu simpulkan.',
          blocks: [
            { t: 'p', text: 'Ini tugas yang dinilai agen penerbit, bukan nilai otomatis. Rubriknya dibuka di depan karena penilaian yang rubriknya rahasia bukan penilaian, itu tebakan.' },
            {
              t: 'p',
              text: 'Kasus: Kandidat A menyerahkan sertifikat dari lembaga pelatihan X; halaman verifikasinya bilang "valid", tidak ada alamat kontrak, dan tidak ada dokumen yang bisa diunduh. Kandidat B menyerahkan hash kredensial 32 byte dan sebuah address kontrak; kamu berhasil membaca `statusOf`-nya dan mendapat penerbit yang ada di daftar izin, tapi esai nilainya tidak bisa kamu lihat.',
            },
            { t: 'try', prompt: 'Tulis 400-700 kata. Sebutkan: (1) mana yang lebih bisa kamu periksa dan kenapa, (2) apa yang tetap belum terbukti dari masing-masing, (3) satu pertanyaan yang akan kamu ajukan ke masing-masing kandidat, (4) apa yang akan berubah kalau lembaga itu berhenti memakai platform ini besok.' },
          ],
          essay: {
            prompt:
              'Bandingkan kedua kandidat di atas dan ambil keputusan: siapa yang bukti belajar lebih dapat dipercaya, dengan syarat kamu harus menyebut minimal satu hal yang TIDAK bisa disimpulkan dari bukti mana pun.',
            minWords: 400,
            rubric: [
              { label: 'Memisahkan "bisa diperiksa sendiri" dari "tampilan meyakinkan"', max: 25 },
              { label: 'Menyatakan batas bukti secara eksplisit, bukan menyamarinkannya', max: 25 },
              { label: 'Memakai konsep dengan benar: penerbit, izin, status, waktu', max: 25 },
              { label: 'Pertanyaan lanjutan yang spesifik dan bisa dijawab', max: 15 },
              { label: 'Struktur dan kejelasan bahasa', max: 10 },
            ],
            guidance: [
              'Tidak diterima: "yang B lebih bagus karena ada address-nya" tanpa menjelaskan apa yang address itu buat bisa diperiksa dan apa yang tidak.',
              'Tidak diterima: menyimpulkan nilai/isi dokumen dari fakta bahwa ia tercatat di chain.',
              'Tidak diterima: menyebut "blockchain tidak bisa dipalsukan" tanpa menyebutkan bagian mana yang tidak bisa dan siapa yang masih bisa berbohong.',
              'Dihargai: menyebut bahwa penerbit pihak ketiga bisa ditarik dukungannya dan bahwa itu bukan pencabutan.',
            ],
          },
        },
        {
          slug: 'referensi-dan-glosarium',
          title: 'Referensi — Glosarium dan bacaan lanjut',
          minutes: 10,
          kind: 'referensi',
          summary: 'Istilah yang dipakai di kursus ini, dengan nama standarnya, supaya kamu bisa cari sendiri.',
          blocks: [
            {
              t: 'terms',
              items: [
                { term: 'attestation', def: 'Rekaman bahwa sebuah pernyataan dibuat. Pada EAS/BAS punya UID yang diturunkan dari isinya, termasuk waktu penambangan.' },
                { term: 'schema', def: 'Deskripsi bentuk data sebuah attestation. Kombinasi (schema, resolver, revocable) menentukan UID schema.' },
                { term: 'resolver', def: 'Kontrak yang boleh menolak attestation sebelum diterima. Di sinilah daftar izin penerbit dan rantai prasyarat ditegakkan.' },
                { term: 'Verifiable Credential', def: 'Dokumen berisi pernyataan penerbit, ditandatangani, dengan bentuk yang bisa diperiksa pihak ketiga. Kami memakai VC Data Model 2.0.' },
                { term: 'Open Badges 3.0', def: 'Profil VC untuk kredensial belajar: achievement, criteria, result. Final Release sejak 27 Mei 2024.' },
                { term: 'Bitstring Status List', def: 'Cara memampatkan status banyak kredensial jadi satu bitstring terkompresi, disajikan lewat satu URL.' },
                { term: 'ERC-5192', def: 'Interface "locked" untuk token yang tidak bisa dipindahtangankan, supaya alat dompet bisa menampilkan alasannya.' },
              ],
            },
            {
              t: 'links',
              items: [
                { label: 'Spesifikasi Open Badges 3.0 (1EdTech)', url: 'https://1_edtech.gitbook.io/open-badges-3.0', kind: 'resmi' },
                { label: 'W3C Verifiable Credentials Data Model 2.0', url: 'https://www.w3.org/TR/vc-data-model-2.0/', kind: 'resmi' },
                { label: 'Bitstring Status List v1.0', url: 'https://www.w3.org/TR/vc-bitstring-status-list/', kind: 'resmi' },
                { label: 'BNB Attestation Service', url: 'https://github.com/bnb-chain/bas', kind: 'kode' },
                { label: 'BNB Chain developer docs', url: 'https://docs.bnbchain.org/', kind: 'resmi' },
                { label: 'Validator VC online (1EdTech)', url: 'https://vc.1edtech.org', kind: 'resmi' },
              ],
            },
            { t: 'note', text: 'URL di atas adalah milik badan/agensi yang bersangkutan. Kalau salah satu mati, itu tidak mengubah apa pun yang terbukti di chain — dan justru itu poin kursusnya.' },
          ],
        },
      ],
    },
    {
      id: 'm5',
      title: 'Modul 5 — Merangkai semuanya',
      blurb: 'Satu rangkaian penutup: kamu memverifikasi kredensial nyata dengan alat yang kamu pegang sendiri.',
      lessons: [
        {
          slug: 'verifikasi-sendiri',
          title: 'Verifikasi sebuah kredensial sampai ke akarnya',
          minutes: 20,
          kind: 'bacaan',
          summary: 'Delapan pemeriksaan berurutan, dari hash sampai tanda tangan, lengkap dengan yang gagal di tiap langkah.',
          blocks: [
            { t: 'p', text: 'Urutan ini bukan daftar fitur, ia jalur kegagalan. Setiap langkah punya alasan sendiri untuk bisa gagal, dan menggabungkan langkah membuatmu tidak tahu mana yang bocor.' },
            {
              t: 'ol',
              items: [
                'Hitung hash kredensial dari (address peserta, id kursus). Kalau alat hitung dan chain tidak cocok, berhenti: ada yang salah di address atau di kurs.',
                'Baca status dari resolver. Yang keluar: ada/tidak, dicabut, kedaluwarsa, penerbit ditarik, siapa penerbitnya, kapan, dan kapan berakhir.',
                'Cocokkan penerbit dengan daftar izin yang kamu harapkan. Ada di chain != ada di daftar yang kamu akui.',
                'Periksa rantai prasyarat kalau ada. Mata rantai yang dicabut harus terlihat, dan keputusan atasnya tidak boleh ikut berubah diam-diam.',
                'Baca rekaman waktunya di infrastruktur attestation, bukan hanya stempel yang dibuat server penerbit.',
                'Ambil dokumen kredensialnya dari URL yang tertulis di dalamnya. Kalau URL-nya mati, dokumennya tidak bisa diverifikasi oleh orang lain.',
                'Periksa tanda tangan dokumen terhadap kunci yang dinyatakan dokumen penerbit. Perhatikan bahwa kunci yang bentuknya sah tapi tidak terdaftar harus tetap ditolak.',
                'Bandingkan bit pada daftar status di indeks yang DITULIS dokumen itu sendiri. Indeks yang menunjuk bit orang lain lolos verifikasi tanda tangan, dan itu kegagalan sunyi.',
              ],
            },
            { t: 'note', text: 'Langkah 6 dan 8 adalah alasan backend kami butuh URL publik. Dokumen yang sempurna tapi menunjuk alamat 127.0.0.1 tidak bisa diverifikasi oleh orang lain — dan "tidak bisa diverifikasi orang lain" adalah kegagalan produk, bukan kegagalan demo.' },
            { t: 'try', prompt: 'Jalankan langkah 1-3 untuk hash 0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa. Catat hasilnya, lalu bandingkan dengan apa yang ditampilkan halaman verifikasi kami. Beda? Salah satu dari kalian salah.' },
          ],
        },
        {
          slug: 'empat-keputusan',
          title: 'Studi kasus — Empat kredensial, satu halaman, empat keputusan',
          minutes: 18,
          kind: 'kasus',
          summary:
            'Empat keadaan yang sudah tertambang di chain 97. Tugasmu: prediksikan keputusannya sebelum membukanya.',
          blocks: [
            { t: 'p', text: 'Semuanya nyata dan bisa kamu baca sekarang. Jangan buka halaman verifikasinya dulu — tulis prediksimu, baru uji.' },
            {
              t: 'code',
              lang: 'text',
              code:
                '[1] 0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2\n' +
                '[2] 0x15a85427896a4b1bab9a77f015e39936a9818515810fcdb08706e32d8999b8de\n' +
                '[3] 0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa\n' +
                '[4] 0x4d0ffdf32d174796a2c8bbe38e739c26ec6e205e6cdf48409f7240d28552df1c',
            },
            { t: 'h', text: 'Pertanyaan sebelum kamu buka' },
            { t: 'ol', items: ['Mana yang berkedaluwarsa, mana yang dicabut, mana yang penerbitnya ditarik — dan mana yang ketiganya tidak terjadi?', 'Ada satu kredensial yang prasyaratnya sudah dicabut. Apakah ia ikut mati? Tulis alasanmu.', 'Ada satu kredensial yang attestation-nya TIDAK dicabut tapi tetap tidak kamu percaya. Yang mana, dan apa yang membuatnya mati?', 'Kalau satu dari empat ini penerbitnya kembali didukung besok, mana yang bisa hidup lagi?'] },
            { t: 'try', prompt: 'Buka halaman verifikasi dengan keempat hash itu dan cocokkan dengan prediksimu. Untuk setiap yang meleset, tulis satu kalimat tentang apa yang kamu asumsikan dan dari mana asumsi itu datang.' },
            { t: 'note', text: 'Jawaban "keduanya mati, jadi sama saja" untuk pertanyaan kedua adalah jawaban yang salah, dan salah secara produk: pencabutan adalah pernyataan penerbit atas satu kredensial, penarikan adalah penilaian platform atas sebuah agen. Yang pertama permanen, yang kedua bisa dipulihkan. Kalau keduanya disatukan jadi satu bit, perbedaannya hilang begitu keluar dari server kami.' },
          ],
        },
        {
          slug: 'kuis-akhir',
          title: 'Kuis akhir — Ujian seluruh modul',
          minutes: 12,
          kind: 'kuis',
          summary: 'Delapan soal lintas modul. Dua di antaranya tentang apa yang TIDAK bisa dibuktikan.',
          blocks: [{ t: 'p', text: 'Nilai kuis ini masuk ke bobot 40% kuis pada rubrik kelulusan. Dua percobaan, nilai terbaik yang dipakai.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Sebuah kredensial terbaca VALID di halaman kami. Yang sudah pasti benar…',
                options: ['Pesertanya lulus dengan nilai bagus', 'Penerbitnya di daftar izin dan attestation-nya tidak dicabut saat dibaca', 'Dokumennya lolos validasi 1EdTech', 'Institusinya terakreditasi'],
                answer: 1,
                why: 'Yang terbukti: penerbitnya dikenali dan rekamannya tidak dicabut pada waktu pembacaan. Nilai ada di dokumen, akreditasi tidak diklaim sama sekali.',
              },
              {
                id: 'q2',
                prompt: 'Kredensial B berprasyarat pada A, dan A dicabut. Keputusan B…',
                options: ['Ikut menjadi REVOKED', 'Tetap VALid untuk dirinya sendiri, dengan rantai atasnya ditandai', 'Menjadi ISSUER_DELISTED', 'Hilang dari chain'],
                answer: 1,
                why: 'Pencabutan tidak merambat mengubah status rekaman lain. Yang dilarang adalah MENGGUNAKAN A sebagai prasyarat penerbitan baru; B yang sudah terbit tidak diubah diam-diam, dan mata rantainya ditampilkan.',
              },
              {
                id: 'q3',
                prompt: 'Penerbit sebuah kredensial ditarik dukungannya. Yang benar…',
                options: ['Attestation-nya dicabut', 'Kredensialnya terbaca dengan verdict sendiri dan bisa kembali berlaku', 'Artinya penerbit kehilangan hak menerbitkan untuk semua orang selamanya', 'Artefaknya hilang dari dompet peserta'],
                answer: 1,
                why: 'Penarikan adalah penilaian platform atas penerbitnya, bukan pembatalan rekaman. Karena bisa dipulihkan, ia harus punya verdict sendiri dan tidak boleh disamarkan jadi REVOKED.',
              },
              {
                id: 'q4',
                prompt: 'Kenapa kami menyimpan nomor bit di sisi penerbit, bukan di server yang menyajikan daftar?',
                options: ['Supaya server tidak perlu state', 'Karena nomor bit ditulis ke dalam dokumen saat terbit; kalau ia mengikuti urutan permintaan, ia bisa menunjuk bit orang lain', 'Karena chain tidak menyimpan bit', 'Untuk menghemat gas'],
                answer: 1,
                why: 'Ini kegagalan yang tidak terlihat di verifikasi tanda tangan: dokumennya tetap sah, cuma menunjuk bit yang salah.',
              },
              {
                id: 'q5',
                prompt: 'Bitstring daftar status dikompres lalu di-hash dan hash-nya direkam di chain. Gunanya…',
                options: ['Menambah kecepatan baca', 'Menyembunyikan isi daftar', 'Membuktikan bahwa daftar yang kamu baca bukan hasil suntingan server', 'Menggantikan pencabutan'],
                answer: 2,
                why: 'Server tetap dipercaya untuk MENYAJIKAN. Yang tidak bisa ia lakukan tanpa ketahuan adalah MENGUBAH isinya. Batas ini harus disebut, tidak boleh dijual sebagai "tanpa kepercayaan".',
              },
              {
                id: 'q6',
                prompt: 'Dokumen kredensial menunjuk URL daftar status di 127.0.0.1. Apa artinya bagi pihak ketiga?',
                options: ['Dokumennya rusak', 'Dokumennya sah tapi tidak bisa diverifikasi orang lain', 'Kredensialnya tidak berlaku', 'Perlu wallet untuk membacanya'],
                answer: 1,
                why: 'Tanda tangannya tetap sah. Yang gagal adalah langkah verifikasi pihak ketiga: validator membuka URL itu, dan tidak ada yang menjawab.',
              },
              {
                id: 'q7',
                prompt: 'Mana yang TIDAK bisa dibuktikan sistem ini?',
                options: ['Bahwa sebuah pernyataan dibuat pada waktu tertentu', 'Bahwa penerbitnya ada di daftar izin', 'Bahwa penilaiannya benar dan jujur', 'Bahwa sebuah rekaman tidak dicabut'],
                answer: 2,
                why: 'Kebenaran hasil penilaian bukan milik chain. Yang terbukti hanya bahwa pihak berizin menyatakan peserta ini lulus — dan itu kami tulis apa adanya di halaman verifikasi.',
              },
              {
                id: 'q8',
                prompt: 'Sebuah halaman verifikasi menampilkan "tidak ada" dan "gagal baca" sebagai dua hal berbeda. Alasannya…',
                options: ['Estetika', 'Kegagalan jaringan tidak boleh terbaca sebagai kredensial palsu, dan sebaliknya', 'Chain tidak menyimpan kredensial', 'RPC tidak mengembalikan penyebabnya'],
                answer: 1,
                why: 'Menyatukan keduanya membuat gangguan teknis jadi vonis, dan vonis jadi gangguan. Dua-duanya berbahaya, dan keduanya bisa dihindari.',
              },
            ],
          },
        },
      ],
    },
  ],
}
