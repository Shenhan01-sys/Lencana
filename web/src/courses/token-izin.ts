/**
 * Kursus teknis singkat: Token BEP-20 dan Izin (B127, 2 Okt).
 *
 * Saldo memberi tahu apa yang kamu punya; izin memberi tahu siapa yang boleh mengambilnya. Praktiknya dinilai chain
 * (`eth-call`): `DOMAIN_SEPARATOR` token LDC-demo dan Permit2 — hash yang mengikat setiap tanda tangan izin ke satu
 * kontrak di satu chain. Keduanya dibaca 2 Okt dan tetap selama kontraknya tidak berganti.
 */
import type { Course } from '../content'

export const TOKEN_IZIN_ID = 'token-izin-2026'

const LDC = '0x0B2fA5050912F4CdB5f7C47A5FAd6A8F9398CBaf'
const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3'

export const tokenIzin: Course = {
  id: TOKEN_IZIN_ID,
  title: 'Token BEP-20 dan Izin — Approve, Permit, dan Cara Mencabutnya',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'menengah',
  topic: 'Web3',
  blurb: 'Saldo memberi tahu apa yang kamu punya; izin memberi tahu siapa yang boleh mengambilnya. Kelas ini tentang yang kedua.',
  audience: [
    'Pemakai dompet yang pernah menekan "approve" tanpa membaca jumlahnya',
    'Lulusan Web3 Dasar yang ingin lanjut ke keamanan token',
  ],
  outcome: [
    'Membedakan approve, transferFrom, dan permit (EIP-2612)',
    'Membaca izin satu spender dan menilai risikonya',
    'Mencabut izin yang tidak lagi dipakai',
  ],
  criteria:
    'Nilai akhir >= 70 dari 100. Komposisi: kuis 40%, praktik 30%, esai 30%. Praktik dinilai dari chain: jawabannya ' +
    'dibandingkan dengan pembacaan ulang penerbit.',
  weights: { kuis: 40, esai: 30, praktik: 30 },
  passMark: 70,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Izin, bukan saldo',
      blurb: 'Bagaimana izin dibuat, dipakai, dan dicabut — dan apa yang mengikat tanda tangannya.',
      lessons: [
        {
          slug: 'approve-dan-permit',
          title: 'Approve, transferFrom, dan permit',
          minutes: 9,
          kind: 'bacaan',
          summary: 'Tiga cara token berpindah atas izin, dan kenapa izin tak terbatas bertahan sampai dicabut.',
          blocks: [
            { t: 'p', text: '`approve(spender, jumlah)` mencatat izin: spender boleh memanggil `transferFrom` sampai jumlah itu. `permit` (EIP-2612) mencatat izin yang sama lewat tanda tangan — tanpa transaksi dari pemilik, tetapi efeknya sama: izin tercatat di kontrak token.' },
            {
              t: 'ul',
              items: [
                'Izin tidak memindahkan token; ia membuka jalan untuk dipindahkan nanti.',
                'Izin tak terbatas (nilai uint256 maksimum) bertahan sampai dicabut.',
                'permit punya batas waktu (deadline) dan nonce — tanda tangan lama tidak bisa dipakai ulang.',
                'Mencabut izin = menyetel izinnya ke 0 lewat approve(spender, 0).',
              ],
            },
            { t: 'note', text: 'Pembayaran kelas di Lencana memakai permit sebesar harga kelas dengan batas waktu pendek, lalu Permit2 memakainya sekali — sesudah itu izinnya habis.' },
          ],
        },
        {
          slug: 'kuis-izin',
          title: 'Kuis — Siapa boleh mengambil apa',
          minutes: 5,
          kind: 'kuis',
          summary: 'Empat soal tentang approve, permit, pencabutan, dan izin tak terbatas.',
          blocks: [{ t: 'p', text: 'Semua soal bisa dijawab dari bacaan sebelumnya.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: '`approve(spender, 100)` berarti…',
                options: ['100 token dikirim ke spender', 'spender boleh mengambil sampai 100 token lewat transferFrom', 'Saldo berkurang 100 sekarang', 'spender menjadi pemilik kontrak token'],
              },
              {
                id: 'q2',
                prompt: 'Apa beda permit (EIP-2612) dengan approve?',
                options: ['permit tidak membuat izin', 'permit membuat izin lewat tanda tangan, tanpa transaksi dari pemilik', 'permit selalu tak terbatas', 'permit hanya berlaku untuk NFT'],
              },
              {
                id: 'q3',
                prompt: 'Cara mencabut izin sebuah spender adalah…',
                options: ['Menghapus aplikasi dompet', 'approve(spender, 0)', 'Mengirim semua token ke alamat lain lalu kembali', 'Menunggu 24 jam'],
              },
              {
                id: 'q4',
                prompt: 'Kenapa izin tak terbatas tetap berisiko walau spender-nya kontrak terkenal?',
                options: ['Karena gasnya mahal', 'Kalau kontrak itu diretas atau kuncinya bocor, seluruh saldomu bisa diambil kapan saja', 'Karena explorer tidak menampilkannya', 'Tidak berisiko sama sekali'],
              },
            ],
          },
        },
        {
          slug: 'praktik-domain-izin',
          title: 'Praktik — Baca domain tanda tangan izin',
          minutes: 8,
          kind: 'praktik',
          // dua panggilan yang sama persis dengan blok kode di bawah; jawabannya keluaran mentah `cast call`
          proof: {
            type: 'eth-call',
            chainId: 97,
            reads: [
              { id: 'tokenDomain', to: LDC, signature: 'DOMAIN_SEPARATOR()', args: [] },
              { id: 'permit2Domain', to: PERMIT2, signature: 'DOMAIN_SEPARATOR()', args: [] },
            ],
          },
          summary: 'Setiap tanda tangan izin terikat ke satu domain — nama, versi, chain, dan alamat kontrak — yang tercatat sebagai satu hash.',
          blocks: [
            { t: 'p', text: `Tanda tangan permit untuk token LDC-demo (${LDC}) dan untuk Permit2 (${PERMIT2}) masing-masing terikat ke domainnya sendiri. Domain itu tersimpan di kontrak sebagai DOMAIN_SEPARATOR.` },
            {
              t: 'code',
              lang: 'bash',
              code:
                `RPC=https://bsc-testnet.publicnode.com\n` +
                `cast call ${LDC} "DOMAIN_SEPARATOR()" --rpc-url $RPC\n` +
                `cast call ${PERMIT2} "DOMAIN_SEPARATOR()" --rpc-url $RPC`,
            },
            { t: 'note', text: 'Tanda tangan untuk domain lain — token lain atau chain lain — tidak berlaku di sini. Itulah yang mencegah tanda tangan izinmu dipakai ulang di tempat yang tidak kamu maksud.' },
          ],
        },
        {
          slug: 'esai-izin',
          title: 'Esai — Izin di dompetmu sendiri',
          minutes: 10,
          kind: 'esai',
          summary: 'Periksa izin token dompet belajarmu, lalu putuskan mana yang dicabut.',
          blocks: [{ t: 'p', text: 'Bacaan izin bisa dari BscScan (Token Approvals) atau langsung lewat fungsi allowance. Tulis spender dan jumlahnya.' }],
          essay: {
            prompt:
              'Periksa izin token dompet belajarmu (lewat BscScan → Token Approvals, atau membaca allowance). Tulis ' +
              'spender apa saja yang punya izin, berapa jumlahnya, dan izin mana yang akan kamu cabut serta alasannya.',
            minWords: 70,
            rubric: [
              { label: 'Daftar spender dan jumlah izin dibaca dari chain', max: 40 },
              { label: 'Keputusan cabut atau biarkan beralasan risiko', max: 40 },
              { label: 'Bahasa jelas', max: 20 },
            ],
            guidance: [
              'Tidak diterima: menyimpulkan "aman" tanpa membaca satu pun izin.',
              'Dihargai: membedakan izin sekali-pakai (permit dengan jumlah tepat) dari izin tak terbatas.',
            ],
          },
        },
        {
          slug: 'referensi-izin',
          title: 'Referensi — Spesifikasi dan alat',
          minutes: 3,
          kind: 'referensi',
          summary: 'Spesifikasi permit dan alat untuk membaca serta mencabut izin.',
          blocks: [
            {
              t: 'links',
              items: [
                { label: 'EIP-2612 — permit untuk token ERC-20', url: 'https://eips.ethereum.org/EIPS/eip-2612', kind: 'resmi' },
                { label: 'Revoke.cash — membaca dan mencabut izin token', url: 'https://revoke.cash', kind: 'komunitas' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
