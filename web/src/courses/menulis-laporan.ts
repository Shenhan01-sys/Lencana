/**
 * Kursus non-teknis: Menulis Laporan yang Bisa Diulang Orang Lain (B127, 2 Okt).
 *
 * Kebiasaan yang dipakai vault ini sendiri — ruang lingkup, cara, temuan, batas — dijadikan kelas. Bobotnya berat di
 * esai karena menulis hanya bisa dinilai dari tulisan; tidak ada praktik di chain (bobot praktik 0).
 */
import type { Course } from '../content'

export const MENULIS_LAPORAN_ID = 'menulis-laporan-2026'

export const menulisLaporan: Course = {
  id: MENULIS_LAPORAN_ID,
  title: 'Menulis Laporan yang Bisa Diulang Orang Lain',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'menengah',
  topic: 'Menulis',
  blurb:
    'Laporan yang baik bisa diperiksa: ruang lingkupnya jelas, caranya bisa diulang, temuannya dibedakan dari dugaan, ' +
    'dan batasnya diakui.',
  audience: [
    'Analis, penguji, dan mahasiswa yang menulis laporan untuk dibaca orang lain',
    'Siapa pun yang pernah ditanya "datanya dari mana?"',
  ],
  outcome: [
    'Menulis ruang lingkup dan waktu pengamatan dalam satu paragraf',
    'Membedakan temuan, dugaan, dan rekomendasi di dalam satu laporan',
    'Menyatakan batas pemeriksaan tanpa melemahkan kesimpulan',
  ],
  criteria:
    'Nilai akhir >= 65 dari 100. Komposisi: kuis 30%, esai 70%. Kelas ini tidak punya praktik di chain: komponen ' +
    'praktik berbobot 0 dan tidak dinilai.',
  weights: { kuis: 30, esai: 70, praktik: 0 },
  passMark: 65,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Kerangka yang bisa diperiksa',
      blurb: 'Empat pertanyaan pembaca, dalam urutan yang mereka tanyakan.',
      lessons: [
        {
          slug: 'empat-bagian',
          title: 'Empat bagian yang wajib ada',
          minutes: 8,
          kind: 'bacaan',
          summary: 'Ruang lingkup, cara, temuan, batas — dan kenapa bagian keempat paling sering hilang.',
          blocks: [
            { t: 'p', text: 'Pembaca laporan bertanya empat hal, berurutan: apa yang diperiksa, dengan cara apa, apa hasilnya, dan apa yang tidak diperiksa. Laporan yang melewatkan salah satunya memaksa pembaca menebak — dan tebakan pembaca hampir selalu lebih buruk dari kenyataannya.' },
            {
              t: 'ol',
              items: [
                'Ruang lingkup: objek, sumber data, dan waktu pengamatan.',
                'Cara: langkah atau perintah yang dipakai, cukup rinci untuk diulang orang lain.',
                'Temuan: apa yang teramati — termasuk "tidak ditemukan".',
                'Batas: apa yang tidak diperiksa, dan kenapa itu bisa mengubah kesimpulan.',
              ],
            },
            { t: 'note', text: 'Bagian keempat paling sering hilang, termasuk di laporan berbayar. Tanpanya pembaca tidak tahu seberapa luas ketidaktahuan penulis.' },
          ],
        },
        {
          slug: 'temuan-vs-dugaan',
          title: 'Temuan, dugaan, rekomendasi',
          minutes: 6,
          kind: 'bacaan',
          summary: 'Ketiganya sah; yang merusak laporan adalah menyamarkan dugaan sebagai temuan.',
          blocks: [
            { t: 'p', text: 'Temuan adalah yang teramati dan bisa ditunjuk sumbernya. Dugaan adalah penjelasan yang belum dibuktikan. Rekomendasi adalah tindakan yang kamu sarankan. Laporan boleh memuat ketiganya — asal pembaca selalu tahu yang mana sedang dibacanya.' },
            {
              t: 'terms',
              items: [
                { term: 'Temuan', def: 'Fakta yang teramati, disertai sumber atau cara mengamatinya.' },
                { term: 'Dugaan', def: 'Penjelasan yang masuk akal tetapi belum diuji.' },
                { term: 'Rekomendasi', def: 'Tindakan yang diusulkan, dengan alasan yang menunjuk temuan.' },
              ],
            },
            { t: 'try', prompt: 'Ambil satu laporan atau pesan panjang yang pernah kamu tulis, lalu tandai setiap kalimat dengan T (temuan), D (dugaan), atau R (rekomendasi).' },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Modul 2 — Menguji tulisanmu',
      blurb: 'Kuis singkat untuk membedakan bagian-bagiannya, lalu satu laporan sungguhan.',
      lessons: [
        {
          slug: 'kuis-laporan',
          title: 'Kuis — Bagian mana ini?',
          minutes: 5,
          kind: 'kuis',
          summary: 'Empat soal tentang temuan, dugaan, cara, dan batas.',
          blocks: [{ t: 'p', text: 'Setiap soal berangkat dari kalimat yang sering muncul di laporan sungguhan.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Kalimat "Server lambat karena serangan DDoS" tanpa data pendukung adalah…',
                options: ['Temuan', 'Dugaan', 'Ruang lingkup', 'Batas'],
              },
              {
                id: 'q2',
                prompt: 'Bagian "cara" yang baik memungkinkan pembaca…',
                options: ['Percaya pada penulis', 'Mengulang pemeriksaan dan mendapat hasil yang sama', 'Melewati bagian temuan', 'Mengetahui pendapat penulis'],
              },
              {
                id: 'q3',
                prompt: 'Menulis "kami tidak memeriksa log sebelum 1 Oktober" di laporan…',
                options: ['Melemahkan laporan', 'Membuat batas pemeriksaan jelas sehingga kesimpulan bisa dinilai', 'Tidak perlu karena pembaca tidak peduli', 'Hanya perlu untuk laporan hukum'],
              },
              {
                id: 'q4',
                prompt: 'Urutan bagian yang paling mudah diperiksa pembaca adalah…',
                options: ['Kesimpulan, lalu cerita latar belakang', 'Ruang lingkup → cara → temuan → batas', 'Temuan → rekomendasi → ruang lingkup', 'Bebas, asal panjang'],
              },
            ],
          },
        },
        {
          slug: 'esai-laporan',
          title: 'Esai — Laporan satu halaman',
          minutes: 20,
          kind: 'esai',
          summary: 'Satu pemeriksaan kecil yang benar-benar kamu lakukan minggu ini, ditulis dengan empat bagian.',
          blocks: [{ t: 'p', text: 'Pilih pemeriksaan yang kecil tetapi sungguhan: membandingkan dua penawaran, mengecek tagihan, atau mencoba satu aplikasi. Yang dinilai adalah apakah orang lain bisa mengulangnya.' }],
          essay: {
            prompt:
              'Tulis laporan satu halaman tentang satu pemeriksaan kecil yang benar-benar kamu lakukan minggu ini ' +
              '(misalnya membandingkan dua penawaran, mengecek tagihan, atau menguji satu aplikasi). Pakai empat bagian: ' +
              'ruang lingkup, cara, temuan, dan batas.',
            minWords: 150,
            rubric: [
              { label: 'Ruang lingkup dan waktu pengamatan eksplisit', max: 20 },
              { label: 'Cara bisa diulang orang lain', max: 30 },
              { label: 'Temuan dibedakan dari dugaan', max: 30 },
              { label: 'Batas pemeriksaan dinyatakan', max: 20 },
            ],
            guidance: [
              'Tidak diterima: laporan tanpa satu pun langkah yang bisa diulang.',
              'Tidak diterima: dugaan yang ditulis sebagai temuan.',
              'Dihargai: temuan kosong ("tidak ditemukan X") beserta seberapa jauh kamu mencarinya.',
            ],
          },
        },
      ],
    },
  ],
}
