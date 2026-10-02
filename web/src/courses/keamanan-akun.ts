/**
 * Kursus non-teknis: Keamanan Akun Sehari-hari (B127, 2 Okt).
 *
 * Kebiasaan, bukan alat: kata sandi unik, verifikasi dua langkah yang tahan phishing, dan membaca tautan sebelum
 * mengekliknya. Tidak ada praktik di chain (bobot praktik 0). Contoh domain di kuis memakai bank fiktif — situs asli
 * tidak dijadikan contoh tautan palsu.
 */
import type { Course } from '../content'

export const KEAMANAN_AKUN_ID = 'keamanan-akun-2026'

export const keamananAkun: Course = {
  id: KEAMANAN_AKUN_ID,
  title: 'Keamanan Akun Sehari-hari — Kata Sandi, 2FA, dan Phishing',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'dasar',
  topic: 'Keamanan',
  blurb:
    'Kebiasaan kecil yang menutup sebagian besar pintu masuk: pengelola kata sandi, verifikasi dua langkah, dan ' +
    'membaca alamat tautan sebelum mengekliknya.',
  audience: [
    'Pekerja yang memegang akun kantor, email, dan dompet digital',
    'Orang tua dan pendamping yang mengurus akun keluarga',
  ],
  outcome: [
    'Menyusun kata sandi unik per akun dengan pengelola kata sandi',
    'Memilih metode verifikasi dua langkah yang tahan phishing',
    'Membaca domain sebuah tautan dan mengenali pesan phishing',
  ],
  criteria:
    'Nilai akhir >= 70 dari 100. Komposisi: kuis 60%, esai 40%. Kelas ini tidak punya praktik di chain: komponen ' +
    'praktik berbobot 0 dan tidak dinilai.',
  weights: { kuis: 60, esai: 40, praktik: 0 },
  passMark: 70,
  validDays: 365,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Menutup pintu yang paling sering dibuka',
      blurb: 'Kata sandi yang dipakai ulang dan verifikasi dua langkah yang lemah adalah dua jalan masuk tersering.',
      lessons: [
        {
          slug: 'kata-sandi-unik',
          title: 'Satu akun, satu kata sandi',
          minutes: 7,
          kind: 'bacaan',
          summary: 'Kenapa kata sandi yang dipakai ulang lebih berbahaya daripada kata sandi yang pendek.',
          blocks: [
            { t: 'p', text: 'Kebocoran jarang terjadi di akunmu sendiri. Yang sering terjadi: satu layanan bocor, lalu pasangan email dan kata sandi dari kebocoran itu dicoba otomatis di layanan lain (credential stuffing). Kata sandi unik per akun memutus rantai itu.' },
            {
              t: 'ul',
              items: [
                'Pakai pengelola kata sandi; cukup ingat satu frasa sandi panjang untuk membukanya.',
                'Frasa dari beberapa kata acak lebih kuat daripada kata pendek yang dihiasi simbol.',
                'Periksa apakah emailmu pernah muncul di kebocoran data, lalu ganti kata sandi akun yang terkait.',
              ],
            },
            { t: 'note', text: 'Pengelola kata sandi menyimpan semua kunci di satu tempat — karena itu frasa sandinya dan verifikasi dua langkahnya harus yang paling kuat di antara semua akunmu.' },
            { t: 'links', items: [{ label: 'Have I Been Pwned — periksa kebocoran email', url: 'https://haveibeenpwned.com', kind: 'komunitas' }] },
          ],
        },
        {
          slug: 'dua-langkah',
          title: 'Verifikasi dua langkah yang tahan phishing',
          minutes: 6,
          kind: 'bacaan',
          summary: 'SMS, aplikasi autentikator, dan passkey — dan kenapa urutannya penting.',
          blocks: [
            { t: 'p', text: 'SMS OTP lebih baik daripada tanpa verifikasi dua langkah, tetapi kodenya bisa dibajak lewat tukar SIM atau diminta penipu. Aplikasi autentikator lebih kuat. Passkey dan kunci keamanan paling kuat karena terikat pada alamat situs yang asli: di situs palsu ia tidak bekerja sama sekali.' },
            {
              t: 'ol',
              items: [
                'Aktifkan verifikasi dua langkah di email utama lebih dulu — email adalah kunci pemulihan akun-akun lain.',
                'Pilih passkey atau kunci keamanan bila tersedia, lalu aplikasi autentikator, baru SMS.',
                'Simpan kode cadangan di tempat yang terpisah dari ponsel.',
              ],
            },
            { t: 'try', prompt: 'Buka pengaturan keamanan email utamamu dan catat metode verifikasi dua langkah apa yang aktif hari ini.' },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Modul 2 — Membaca sebelum mengeklik',
      blurb: 'Domain dibaca dari kanan; desakan waktu adalah tanda. Lalu buktikan dengan akunmu sendiri.',
      lessons: [
        {
          slug: 'kuis-keamanan',
          title: 'Kuis — Akun, kode, dan tautan',
          minutes: 6,
          kind: 'kuis',
          summary: 'Empat soal tentang kata sandi, verifikasi dua langkah, dan membaca tautan.',
          blocks: [{ t: 'p', text: 'Soal ketiga memakai bank fiktif "Bank Contoh" dan domain contoh yang dicadangkan untuk dokumentasi. Baca alamatnya pelan-pelan.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Kenapa memakai ulang kata sandi berbahaya walau kata sandinya panjang?',
                options: ['Kata sandi panjang mudah ditebak', 'Bocor di satu layanan berarti bisa dicoba di layanan lain', 'Layanan melarang kata sandi panjang', 'Tidak berbahaya kalau ada simbol'],
              },
              {
                id: 'q2',
                prompt: 'Metode verifikasi dua langkah yang paling tahan phishing adalah…',
                options: ['SMS OTP', 'Pertanyaan keamanan', 'Passkey atau kunci keamanan', 'Kode lewat email'],
              },
              {
                id: 'q3',
                prompt: 'Tautan "https://bankcontoh.co.id.verifikasi-akun.example/login" sebenarnya membuka situs milik pemilik domain…',
                options: ['bankcontoh.co.id', 'verifikasi-akun.example', 'co.id', 'login'],
              },
              {
                id: 'q4',
                prompt: 'Email "dari tim keamanan" meminta kamu masuk lewat tautan karena akunmu "akan diblokir dalam 1 jam". Langkah terbaik…',
                options: ['Klik cepat sebelum diblokir', 'Buka aplikasi atau situs resminya sendiri, tanpa lewat tautan itu, lalu periksa notifikasinya', 'Balas email dengan kata sandimu', 'Teruskan ke teman untuk ditanyakan'],
              },
            ],
          },
        },
        {
          slug: 'esai-keamanan',
          title: 'Esai — Audit satu akun pentingmu',
          minutes: 12,
          kind: 'esai',
          summary: 'Periksa satu akun sungguhan: kata sandi, verifikasi dua langkah, kode cadangan — lalu laporkan.',
          blocks: [{ t: 'p', text: 'Jangan pernah menuliskan kata sandi atau kode cadangan aslimu di esai. Yang dinilai adalah apa yang kamu periksa dan ubah, bukan rahasianya.' }],
          essay: {
            prompt:
              'Audit keamanan satu akun pentingmu (misalnya email utama): apakah kata sandinya unik, metode verifikasi dua ' +
              'langkah apa yang aktif, dan di mana kode cadangannya. Tulis apa yang kamu temukan, apa yang kamu ubah, dan ' +
              'satu risiko yang masih tersisa.',
            minWords: 70,
            rubric: [
              { label: 'Temuan konkret per butir (kata sandi, verifikasi dua langkah, kode cadangan)', max: 40 },
              { label: 'Perubahan yang dilakukan beserta alasannya', max: 40 },
              { label: 'Risiko yang tersisa dinyatakan jujur', max: 20 },
            ],
            guidance: [
              'Tidak diterima: menuliskan kata sandi atau kode cadangan asli.',
              'Dihargai: menjelaskan kenapa metode verifikasi yang dipilih lebih tahan phishing.',
            ],
          },
        },
      ],
    },
  ],
}
