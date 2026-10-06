/**
 * Kursus ketiga: Kelas Uji — Membayar dengan Tanda Tangan (2026).
 *
 * Ada karena builder meminta kelas berbayar yang bisa ia daftari dengan akun sungguhan untuk menguji alur bayar
 * (B126, 2 Okt): akunnya sudah terdaftar di Web3 Dasar dan Web3 Lanjut sebelum harga berlaku, jadi kedua kelas itu
 * tidak lagi menagihnya. Supaya kelas uji ini tidak menjadi tiruan, isinya membahas persis apa yang terjadi saat
 * peserta membayar — tanda tangan izin token, saksi Permit2, settlement oleh penerbit — dan semua yang disebut bisa
 * diperiksa di chain 97.
 *
 * Tidak tampil di katalog publik (`unlisted`): ia alat uji, bukan produk. Tetap terbuka lewat tautannya dan tampil
 * di dashboard peserta dengan tanda "uji".
 */

// Lencana-B126 status=SELESAI 2026-10-02 — kelas uji berbayar (5 LDC-demo) untuk menguji bayar → kelas → dinilai dengan akun sungguhan; tidak tampil di katalog publik. Buktikan ulang: cd web && npm run probe, lalu cd ../signer && npm run verify:quizkeys && npm run verify:paywall. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Course } from '../content'

export const UJI_BAYAR_ID = 'uji-bayar-2026'

/** Koin uji yang dibayarkan peserta (`web/src/pricing.ts` menunjuk alamat yang sama). */
const LDC = '0x0B2fA5050912F4CdB5f7C47A5FAd6A8F9398CBaf'

export const ujiBayar: Course = {
  id: UJI_BAYAR_ID,
  title: 'Kelas Uji — Membayar dengan Tanda Tangan',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'dasar',
  unlisted: true,
  topic: 'Web3',
  blurb:
    'Kelas pendek untuk menguji alur bayar dengan akun sungguhan: ambil koin uji, bayar dengan tanda tangan, buka ' +
    'kelas, kerjakan kuisnya. Isinya menjelaskan apa yang baru saja terjadi saat kamu membayar.',
  audience: [
    'Builder dan penguji yang mau mencoba bayar, masuk kelas, lalu dinilai dengan akun sungguhan',
    'Peserta yang ingin tahu kenapa membayar di Lencana tidak membutuhkan gas',
  ],
  outcome: [
    'Menjelaskan apa saja yang kamu tandatangani saat membayar sebuah kelas',
    'Menemukan transaksi pembayaranmu sendiri di BscScan testnet',
    'Membedakan izin token (permit) dari transfer token',
  ],
  criteria:
    'Nilai akhir >= 60 dari 100. Komposisi: kuis 50%, praktik 20%, esai 30%. Kelas uji alur pembayaran: kredensialnya ' +
    'hanya menyatakan peserta menyelesaikan kelas pendek ini, bukan keahlian Web3.',
  weights: { kuis: 50, esai: 30, praktik: 20 },
  passMark: 60,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Apa yang terjadi saat kamu membayar',
      blurb: 'Tiga tanda tangan, satu transaksi yang dikirim penerbit, dan cara memeriksanya sendiri.',
      lessons: [
        {
          slug: 'izin-bukan-transfer',
          title: 'Izin, bukan transfer',
          minutes: 6,
          kind: 'bacaan',
          summary: 'Yang kamu tandatangani saat menekan "Bayar & daftar", dan kenapa dompetmu tidak butuh BNB untuk gas.',
          blocks: [
            { t: 'p', text: 'Saat kamu menekan "Bayar & daftar", dompet belajarmu tidak mengirim transaksi apa pun. Ia menandatangani dua pesan terstruktur (EIP-712) dan satu pesan pendaftaran. Penerbit — lewat server fasilitator x402-nya — yang mengirim transaksinya ke chain dan membayar gasnya.' },
            {
              t: 'ol',
              items: [
                'Izin token (EIP-2612 `permit`): kamu mengizinkan kontrak Permit2 memakai tepat sebesar harga kelas dari saldo LDC-demo-mu, sampai batas waktu tertentu.',
                'Saksi Permit2: kamu menyebut ke mana uang itu boleh pergi — kontrak pembagian `SettlementSplit` — dan siapa yang boleh mengeksekusinya, yaitu proxy x402.',
                'Pesan pendaftaran: kamu menyebut kelas mana yang kamu daftari, supaya pembayaranmu tidak bisa dipakai untuk mendaftarkan akun lain.',
              ],
            },
            { t: 'p', text: 'Penerbit memeriksa ketiganya sebelum mengeluarkan gas. Sesudah settlement berhasil di chain, kontrak pembagian memecah jumlahnya antara penerbit dan platform, pesananmu dicatat lunas, lalu kelas terbuka.' },
            { t: 'note', text: 'Tanda tangan izin hanya berlaku untuk token, jumlah, pihak yang diizinkan, dan batas waktu yang tertulis di dalamnya. Ia tidak memberi penerbit akses ke seluruh saldomu, dan sesudah batas waktunya lewat ia tidak bisa dipakai lagi.' },
            { t: 'try', prompt: 'Buka Dashboard → Dompet, buka tautan transaksi pembayaranmu, lalu cari tiga hal di BscScan: pengirim transaksi (bukan alamatmu), kontrak yang dipanggil, dan event Transfer yang menyebut alamatmu.' },
          ],
        },
        {
          slug: 'kuis-pembayaran',
          title: 'Kuis — Apa yang kamu tandatangani',
          minutes: 5,
          kind: 'kuis',
          summary: 'Empat soal tentang siapa membayar gas, apa isi izinmu, dan siapa yang tercatat di chain.',
          blocks: [{ t: 'p', text: 'Semua soal bisa dijawab dari bacaan sebelumnya dan dari transaksi pembayaranmu sendiri.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Saat kamu membayar kelas di Lencana, siapa yang membayar gas transaksinya?',
                options: ['Dompet belajarmu, dalam BNB', 'Penerbit, lewat server yang mengirim transaksi settlement', 'Tidak ada gas sama sekali — tanda tangan langsung menjadi transfer', 'Pemilik agen penilai'],
              },
              {
                id: 'q2',
                prompt: 'Izin EIP-2612 yang kamu tandatangani mengizinkan…',
                options: ['Penerbit mengambil seluruh saldomu kapan saja', 'Permit2 memakai sebesar harga kelas sampai batas waktunya', 'Siapa pun memindahkan token atas namamu', 'Platform mencetak koin baru ke dompetmu'],
              },
              {
                id: 'q3',
                prompt: 'Kenapa pesan pendaftaran ikut ditandatangani?',
                options: ['Supaya pembayaranmu tidak bisa dipakai mendaftarkan akun lain', 'Supaya harga bisa diubah sesudah kamu membayar', 'Karena BscScan memintanya', 'Untuk mencetak kredensial saat itu juga'],
              },
              {
                id: 'q4',
                prompt: 'Di BscScan, pengirim (`from`) transaksi settlement pembayaranmu adalah…',
                options: ['Alamat dompet belajarmu', 'Alamat server penerbit (fasilitator) yang mengirimnya', 'Alamat kontrak LDC-demo', 'Alamat nol'],
              },
            ],
          },
        },
        {
          slug: 'praktik-baca-koin',
          title: 'Praktik — Baca koin uji dari chain',
          minutes: 8,
          kind: 'praktik',
          // tiga panggilan yang sama persis dengan blok kode di bawah; jawabannya keluaran mentah `cast call`
          proof: {
            type: 'eth-call',
            chainId: 97,
            reads: [
              { id: 'name', to: LDC, signature: 'name()', args: [] },
              { id: 'symbol', to: LDC, signature: 'symbol()', args: [] },
              { id: 'decimals', to: LDC, signature: 'decimals()', args: [] },
            ],
          },
          summary: 'Panggil `name`, `symbol`, dan `decimals` koin yang kamu pakai membayar, lewat RPC biasa.',
          blocks: [
            { t: 'p', text: `Koin yang kamu pakai membayar adalah kontrak ${LDC} di BNB Smart Chain testnet (chainId 97). Kamu tidak butuh dompet untuk membacanya — fungsi view dibaca lewat eth_call tanpa gas.` },
            {
              t: 'code',
              lang: 'bash',
              code:
                `T=${LDC}\n` +
                'RPC=https://bsc-testnet.publicnode.com\n' +
                'cast call $T "name()" --rpc-url $RPC\n' +
                'cast call $T "symbol()" --rpc-url $RPC\n' +
                'cast call $T "decimals()" --rpc-url $RPC',
            },
            { t: 'note', text: '`decimals` menjawab 6: harga "5 LDC-demo" disimpan di chain sebagai 5000000. Angka yang tampil di halaman adalah angka chain dibagi 10^6 — bukan angka yang diketik tangan.' },
            { t: 'try', prompt: 'Panggil juga `balanceOf(address)` dengan alamat dompet belajarmu, lalu bandingkan dengan saldo di Dashboard → Dompet.' },
          ],
        },
        {
          slug: 'esai-pembayaranmu',
          title: 'Esai — Jelaskan pembayaranmu sendiri',
          minutes: 10,
          kind: 'esai',
          summary: 'Satu-dua paragraf: apa yang kamu tandatangani, siapa yang mengirim transaksinya, dan di mana orang lain bisa memeriksanya.',
          blocks: [
            { t: 'p', text: 'Tulis dengan kata-katamu sendiri dan tunjuk transaksimu sendiri. Penilaiannya memakai rubrik di bawah ini, yang ikut dikunci di rubricHash kelas ini.' },
          ],
          essay: {
            prompt:
              'Dalam satu-dua paragraf, jelaskan apa yang kamu tandatangani saat membayar kelas ini, siapa yang mengirim ' +
              'transaksinya ke chain, dan di mana orang lain bisa memeriksanya. Sebutkan satu hal yang TIDAK bisa dilakukan ' +
              'penerbit dengan tanda tanganmu.',
            minWords: 60,
            rubric: [
              { label: 'Menyebut apa saja yang ditandatangani dan untuk apa', max: 40 },
              { label: 'Menunjuk bukti di chain (transaksi atau event) yang bisa dibuka orang lain', max: 40 },
              { label: 'Bahasa jelas dan ringkas', max: 20 },
            ],
            guidance: [
              'Tidak diterima: menyalin bacaan tanpa menyebut transaksimu sendiri.',
              'Dihargai: menyebut batas izinmu — jumlah, pihak yang diizinkan, dan batas waktunya.',
            ],
          },
        },
      ],
    },
  ],
}
