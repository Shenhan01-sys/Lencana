/**
 * Kursus non-teknis: Literasi Keuangan Digital (B127, 2 Okt).
 *
 * Ada karena RF4 ("katalog bukan katalog web3"): Lencana adalah tempatnya, bukan topiknya — kredensialnya bisa
 * diperiksa siapa pun, apa pun materinya. Kelas ini tidak punya praktik di chain: bobot praktiknya 0, dan sejak B127
 * `computeScore` tidak menuntut bukti untuk komponen berbobot 0.
 *
 * Angka di bacaan, kasus, dan kuis adalah contoh hitungan, bukan data pasar; semuanya bisa dihitung ulang dari teksnya.
 */
import type { Course } from '../content'

export const LITERASI_KEUANGAN_ID = 'literasi-keuangan-2026'

export const literasiKeuangan: Course = {
  id: LITERASI_KEUANGAN_ID,
  title: 'Literasi Keuangan Digital — Biaya, Bunga, dan Tanda Penipuan',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'dasar',
  topic: 'Keuangan',
  blurb:
    'Membaca biaya pinjaman online, paylater, dan janji imbal hasil dengan angka sendiri — sebelum menekan tombol ' +
    'setuju, dan sebelum seseorang meminta kode OTP-mu.',
  audience: [
    'Siapa pun yang memakai dompet digital, paylater, atau pinjaman online',
    'Pendamping keluarga yang sering ditanya "ini aman tidak?"',
  ],
  outcome: [
    'Menghitung biaya total sebuah pinjaman dari bunga harian, potongan di muka, dan tenornya',
    'Membedakan imbal hasil yang wajar dari janji yang mustahil',
    'Mengenali pola penipuan transfer dan tahu langkah pertama sesudah tertipu',
  ],
  criteria:
    'Nilai akhir >= 65 dari 100. Komposisi: kuis 50%, esai 50%. Kelas ini tidak punya praktik di chain: komponen ' +
    'praktik berbobot 0 dan tidak dinilai.',
  weights: { kuis: 50, esai: 50, praktik: 0 },
  passMark: 65,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Angka di balik tombol "setuju"',
      blurb: 'Biaya total, bukan bunga per hari; dan pola yang hampir selalu berarti penipuan.',
      lessons: [
        {
          slug: 'biaya-total',
          title: 'Biaya total, bukan bunga per hari',
          minutes: 7,
          kind: 'bacaan',
          summary: 'Tiga langkah menghitung berapa sebenarnya harga sebuah pinjaman.',
          blocks: [
            { t: 'p', text: 'Bunga 0,4% per hari terdengar kecil. Dalam 30 hari itu 12% dari pokok — belum termasuk biaya layanan, potongan di muka, dan denda. Yang perlu dibandingkan bukan bunga per hari, melainkan biaya total: berapa yang kamu bayar kembali dibanding uang yang benar-benar kamu terima.' },
            {
              t: 'ol',
              items: [
                'Catat uang yang benar-benar cair (sesudah potongan di muka), bukan angka pinjaman di iklan.',
                'Jumlahkan semua yang harus dibayar kembali: pokok + bunga untuk seluruh tenor + biaya layanan.',
                'Kurangi dengan uang yang cair, lalu bagi dengan uang yang cair — itulah biaya totalmu untuk tenor itu.',
              ],
            },
            { t: 'note', text: 'Potongan di muka membuat biaya sebenarnya lebih besar dari yang tertulis: bunganya tetap dihitung dari pokok penuh, padahal yang kamu terima lebih sedikit.' },
            { t: 'try', prompt: 'Ambil satu penawaran pinjaman atau paylater yang pernah kamu terima, lalu hitung biaya totalnya untuk satu tenor dengan tiga langkah di atas.' },
          ],
        },
        {
          slug: 'kasus-pinjaman',
          title: 'Kasus — Pinjaman Rp1 juta yang cair Rp900 ribu',
          minutes: 6,
          kind: 'kasus',
          summary: 'Satu hitungan lengkap, dari iklan sampai biaya total yang sebenarnya.',
          blocks: [
            { t: 'p', text: 'Iklan: pinjam Rp1.000.000, bunga 0,4% per hari, tenor 30 hari, "biaya layanan 10%". Biaya layanan dipotong di muka, jadi yang cair Rp900.000.' },
            {
              t: 'ol',
              items: [
                'Bunga: 0,4% × 30 hari = 12% dari Rp1.000.000 = Rp120.000.',
                'Dibayar kembali: Rp1.000.000 + Rp120.000 = Rp1.120.000.',
                'Biaya total: Rp1.120.000 − Rp900.000 = Rp220.000, yaitu sekitar 24% dari uang yang cair — dalam 30 hari.',
              ],
            },
            { t: 'note', text: 'Di iklan tertulis 0,4% per hari. Biaya yang sebenarnya kamu tanggung untuk sebulan hampir dua kali "12%" yang terlihat sekilas.' },
          ],
        },
        {
          slug: 'tanda-penipuan',
          title: 'Lima tanda penipuan yang berulang',
          minutes: 6,
          kind: 'bacaan',
          summary: 'Pola yang muncul lagi dan lagi — dan apa yang dilakukan pertama kali sesudah tertipu.',
          blocks: [
            {
              t: 'ul',
              items: [
                'Imbal hasil "pasti" dan tinggi — usaha sungguhan selalu punya risiko rugi.',
                'Desakan waktu: "hanya hari ini", "akunmu diblokir dalam 1 jam".',
                'Permintaan kode OTP, PIN, atau kata sandi — bank tidak pernah memintanya.',
                'Rekening tujuan atas nama pribadi untuk "perusahaan" atau "instansi".',
                'Mereka yang menghubungimu lebih dulu, lewat pesan pribadi.',
              ],
            },
            { t: 'p', text: 'Sesudah tertipu: hubungi bank lewat nomor resmi di kartu atau aplikasinya untuk memblokir transaksi, simpan semua bukti percakapan dan transfer, lalu laporkan. Semakin cepat, semakin besar peluang dana tertahan.' },
            { t: 'links', items: [{ label: 'Otoritas Jasa Keuangan — informasi dan pengaduan konsumen', url: 'https://www.ojk.go.id', kind: 'resmi' }] },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Modul 2 — Membuktikan bahwa kamu paham',
      blurb: 'Satu kuis hitungan dan satu esai atas penawaran yang kamu temui sendiri.',
      lessons: [
        {
          slug: 'kuis-keuangan',
          title: 'Kuis — Hitung sebelum setuju',
          minutes: 6,
          kind: 'kuis',
          summary: 'Empat soal: dua hitungan biaya, satu janji imbal hasil, satu permintaan OTP.',
          blocks: [{ t: 'p', text: 'Siapkan kalkulator. Semua soal bisa dijawab dengan langkah dari Modul 1.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Pinjaman Rp2.000.000, potongan di muka 5%, bunga 0,3% per hari dari pokok selama 20 hari. Berapa yang harus dibayar kembali?',
                options: ['Rp2.000.000', 'Rp2.120.000', 'Rp1.900.000', 'Rp2.006.000'],
              },
              {
                id: 'q2',
                prompt: 'Dari soal 1, berapa biaya total dibanding uang yang benar-benar cair?',
                options: ['6%', '5%', 'sekitar 12%', 'sekitar 1%'],
              },
              {
                id: 'q3',
                prompt: 'Penawaran investasi "pasti untung 5% per minggu" paling tepat dinilai sebagai…',
                options: ['Peluang langka yang harus cepat diambil', 'Tanda bahaya: imbal hasil pasti setinggi itu tidak wajar', 'Aman kalau ada testimoni', 'Aman kalau dibayar lewat transfer bank'],
              },
              {
                id: 'q4',
                prompt: 'Seseorang mengaku petugas bank dan meminta kode OTP untuk "membatalkan transaksi". Langkah yang benar…',
                options: ['Berikan, karena ia tahu nama lengkapmu', 'Jangan berikan; hubungi bank lewat nomor resmi di kartu atau aplikasinya', 'Berikan separuh kodenya saja', 'Matikan ponsel dan tunggu'],
              },
            ],
          },
        },
        {
          slug: 'esai-keuangan',
          title: 'Esai — Satu penawaran, dihitung sendiri',
          minutes: 12,
          kind: 'esai',
          summary: 'Hitung biaya atau imbal hasil sebenarnya dari satu penawaran yang kamu temui, lalu putuskan.',
          blocks: [{ t: 'p', text: 'Pakai penawaran sungguhan yang pernah kamu lihat — iklan, pesan, atau aplikasi. Tulis angkanya dan langkah hitungnya supaya penilai bisa mengulang.' }],
          essay: {
            prompt:
              'Pilih satu penawaran pinjaman, paylater, atau investasi yang pernah kamu lihat. Hitung biaya total atau ' +
              'imbal hasil sebenarnya dengan langkah dari Modul 1, lalu jelaskan apakah kamu akan mengambilnya dan kenapa.',
            minWords: 80,
            rubric: [
              { label: 'Angka dihitung dengan langkah yang bisa diulang (pokok, potongan, bunga, tenor disebut)', max: 50 },
              { label: 'Kesimpulan mengikuti angkanya, bukan perasaan', max: 30 },
              { label: 'Bahasa jelas dan ringkas', max: 20 },
            ],
            guidance: [
              'Tidak diterima: kesimpulan tanpa satu pun angka.',
              'Dihargai: menyebut biaya yang tersembunyi (potongan di muka, denda) dan dari mana kamu mengetahuinya.',
            ],
          },
        },
      ],
    },
  ],
}
