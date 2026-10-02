/**
 * Kursus teknis singkat: Membaca BscScan (B127, 2 Okt).
 *
 * Halaman transaksi sebagai bukti: siapa penanda tangan, kontrak mana yang dipanggil, token apa yang berpindah, dan
 * berapa biayanya. Praktiknya dinilai chain (`eth-call`) atas kontrak pembagian pembayaran Lencana — angka yang dibaca
 * peserta sama dengan yang membagi setiap pembayaran kelas.
 */
import type { Course } from '../content'

export const MEMBACA_BSCSCAN_ID = 'membaca-bscscan-2026'

/** `SettlementSplit` di BNB testnet — dibaca 2 Okt: `platformBps()` = 1000, `MAX_BPS()` = 2500. */
const SPLIT = '0xcB00E62B888113A1B09Fe9bbd01afC946e8e1bBE'

export const membacaBscscan: Course = {
  id: MEMBACA_BSCSCAN_ID,
  title: 'Membaca BscScan — Transaksi, Event, dan Log',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'dasar',
  topic: 'Web3',
  blurb:
    'Satu halaman transaksi berisi lebih banyak bukti daripada tangkapan layar mana pun. Kelas ini mengajarkan ' +
    'membacanya baris demi baris.',
  audience: [
    'Peserta yang sudah punya dompet testnet dan ingin memeriksa transaksinya sendiri',
    'Penerima kredensial yang ingin tahu dari mana angka di layar berasal',
  ],
  outcome: [
    'Membedakan penanda tangan transaksi, kontrak yang dipanggil, dan pemilik token yang berpindah',
    'Membaca event Transfer di log sebuah transaksi',
    'Menghitung biaya transaksi dari gas terpakai dan harga gas',
  ],
  criteria:
    'Nilai akhir >= 65 dari 100. Komposisi: kuis 40%, praktik 30%, esai 30%. Praktik dinilai dari chain: jawabannya ' +
    'dibandingkan dengan pembacaan ulang penerbit.',
  weights: { kuis: 40, esai: 30, praktik: 30 },
  passMark: 65,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Satu transaksi, dibaca utuh',
      blurb: 'Dari kolom paling atas sampai log paling bawah — lalu buktikan dengan transaksimu sendiri.',
      lessons: [
        {
          slug: 'anatomi-transaksi',
          title: 'Anatomi halaman transaksi',
          minutes: 8,
          kind: 'bacaan',
          summary: 'Status, blok, from, to, nilai, biaya, dan log — apa arti masing-masing.',
          blocks: [
            { t: 'p', text: 'Halaman transaksi di BscScan memuat status, nomor blok, waktu, `from` (yang menandatangani dan membayar gas), `to` (kontrak atau alamat yang dipanggil), nilai BNB, biaya transaksi, dan log event. Token yang berpindah tidak tampil di kolom nilai — ia tampil di event Transfer.' },
            {
              t: 'ul',
              items: [
                '`from` = penanda tangan transaksi — tidak selalu pemilik token yang berpindah.',
                '`to` = kontrak yang dipanggil; fungsinya terbaca dari 4 byte pertama data input.',
                'Biaya = gas terpakai × harga gas, dibayar `from` dalam BNB.',
                'Event Transfer(from, to, value) mencatat token yang berpindah.',
              ],
            },
            { t: 'note', text: 'Pada pembayaran kelas di Lencana, `from` adalah server penerbit; alamatmu muncul di event Transfer, karena kamu hanya menandatangani izin.' },
            { t: 'links', items: [{ label: 'BscScan testnet', url: 'https://testnet.bscscan.com', kind: 'resmi' }] },
          ],
        },
        {
          slug: 'kuis-bscscan',
          title: 'Kuis — Membaca satu halaman transaksi',
          minutes: 5,
          kind: 'kuis',
          summary: 'Empat soal: siapa membayar gas, di mana token berpindah, berapa biayanya, apa arti gagal.',
          blocks: [{ t: 'p', text: 'Buka satu transaksi milikmu di samping soal ini kalau perlu.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Di halaman transaksi, siapa yang membayar biaya gas?',
                options: ['Alamat di kolom `to`', 'Alamat di kolom `from`', 'Pemilik token yang berpindah', 'Validator yang membuat blok'],
              },
              {
                id: 'q2',
                prompt: 'Token BEP-20 yang berpindah dalam sebuah transaksi terbaca dari…',
                options: ['Kolom nilai (Value) dalam BNB', 'Event Transfer di log', 'Nomor blok', 'Nonce'],
              },
              {
                id: 'q3',
                prompt: 'Gas terpakai 50.000 dengan harga gas 3 gwei. Biaya transaksinya…',
                options: ['150.000 gwei = 0,00015 BNB', '50.000 BNB', '3 gwei', '0,15 BNB'],
              },
              {
                id: 'q4',
                prompt: 'Status "Fail" pada sebuah transaksi berarti…',
                options: ['Transaksi tidak pernah masuk blok', 'Transaksi masuk blok tetapi eksekusinya dibatalkan — gasnya tetap terpakai', 'Gasnya dikembalikan penuh', 'Tokennya tetap berpindah'],
              },
            ],
          },
        },
        {
          slug: 'praktik-baca-pembagian',
          title: 'Praktik — Baca aturan pembagian pembayaran',
          minutes: 8,
          kind: 'praktik',
          // dua panggilan yang sama persis dengan blok kode di bawah; jawabannya keluaran mentah `cast call`
          proof: {
            type: 'eth-call',
            chainId: 97,
            reads: [
              { id: 'platformBps', to: SPLIT, signature: 'platformBps()', args: [] },
              { id: 'maxBps', to: SPLIT, signature: 'MAX_BPS()', args: [] },
            ],
          },
          summary: 'Bagian platform dari setiap pembayaran kelas bukan janji di halaman — ia angka di kontrak yang bisa kamu baca.',
          blocks: [
            { t: 'p', text: `Setiap pembayaran kelas dikirim ke kontrak SettlementSplit ${SPLIT}, yang membaginya antara penerbit dan platform. Bagian platform dan batas atasnya tersimpan di kontrak itu.` },
            {
              t: 'code',
              lang: 'bash',
              code:
                `S=${SPLIT}\n` +
                'RPC=https://bsc-testnet.publicnode.com\n' +
                'cast call $S "platformBps()" --rpc-url $RPC\n' +
                'cast call $S "MAX_BPS()" --rpc-url $RPC',
            },
            { t: 'note', text: 'Angkanya dalam basis poin: 1000 berarti 10%, 2500 berarti 25%. MAX_BPS adalah batas yang dikunci kontrak — platform tidak bisa menaikkan bagiannya melewati angka itu.' },
          ],
        },
        {
          slug: 'esai-bscscan',
          title: 'Esai — Satu transaksimu, dibaca baris demi baris',
          minutes: 10,
          kind: 'esai',
          summary: 'Jelaskan satu transaksi milikmu: from, to, biaya, dan event yang mencatat token berpindah.',
          blocks: [{ t: 'p', text: 'Sebutkan hash transaksinya supaya penilai bisa membuka transaksi yang sama.' }],
          essay: {
            prompt:
              'Buka satu transaksi milikmu di BscScan testnet (misalnya pembayaran kelas atau koin uji). Jelaskan baris ' +
              'demi baris: siapa `from`, apa `to`, berapa biayanya, dan event apa yang mencatat token berpindah.',
            minWords: 70,
            rubric: [
              { label: 'from, to, dan biaya dijelaskan dengan benar', max: 40 },
              { label: 'Event Transfer ditunjuk dan dibaca', max: 40 },
              { label: 'Bahasa jelas', max: 20 },
            ],
            guidance: [
              'Tidak diterima: tangkapan layar tanpa penjelasan.',
              'Dihargai: menyebut hash transaksinya supaya penilai bisa membuka transaksi yang sama.',
            ],
          },
        },
      ],
    },
  ],
}
