/**
 * Kursus kedua: Web3 Lanjut (2026).
 *
 * Ada karena dua alasan yang bukan kosmetik:
 *  1. `SeedDemo.s.sol` memakai `keccak256("web3-lanjut-2026")` untuk kredensial [2] — yang
 *     prasyaratnya (kursus dasar) SUDAH DICABUT tapi dirinya sendiri tetap berlaku. Itu adegan
 *     paling penting di seluruh proyek ini, dan tanpa kursus kedua-nya ia cuma angka di halaman.
 *  2. Sebuah katalog dengan satu kursus bukan LMS; ia brosur. Yang diuji pembaca di sini adalah
 *     apakah `prereqCourseId` benar-benar menunjuk kursus yang ada.
 */
import type { Course } from '../content'

export const WEB3_LANJUT_ID = 'web3-lanjut-2026'

export const web3Lanjut: Course = {
  id: WEB3_LANJUT_ID,
  title: 'Web3 Lanjut — Kontrak, Izin, dan Audit Sendiri',
  institution: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  level: 'lanjutan',
  blurb:
    'Untuk yang sudah bisa membaca transaksi sendiri. Sisanya: membaca kontrak yang tidak kamu ' +
    'percayai, dan menulis kesimpulan yang tahan ditanya.',
  audience: [
    'Lulusan jalur dasar yang mau berhenti memakai alat orang lain begitu saja',
    'Orang yang harus memutuskan apakah sebuah kontrak boleh diberi izin',
  ],
  outcome: [
    'Membedakan fungsi view, pure, dan state-changing dari ABI saja',
    'Menelusuri pemegang izin sebuah token dan menyimpulkan risikonya',
    'Mengevaluasi sebuah klaim "audit" tanpa ikut mempercayai nama auditor',
    'Menulis catatan teknis yang bisa diperiksa ulang orang lain',
  ],
  prereqCourseId: 'web3-dasar-2026',
  criteria:
    'Nilai akhir >= 70 dari 100. Komposisi: kuis 30%, praktik 30%, esai 40%. Prasyarat: kredensial ' +
    'Web3 Dasar. Yang dicatat di chain hanyalah pernyataan kelulusan penerbit — kualitasnya urusan rubrik ini.',
  weights: { kuis: 30, esai: 40, praktik: 30 },
  passMark: 70,
  validDays: 730,
  modules: [
    {
      id: 'm1',
      title: 'Modul 1 — Membaca kontrak yang tidak kamu percayai',
      blurb: 'Empat pertanyaan yang bisa dijawab dari ABI dan RPC, tanpa menunggu siapa pun menjamin.',
      lessons: [
        {
          slug: 'view-vs-writing',
          title: 'View, pure, dan yang mengubah keadaan',
          minutes: 14,
          kind: 'bacaan',
          summary: 'Yang boleh kamu panggil gratis, yang berbayar, dan kenapa bedanya penting untuk penilaian risiko.',
          blocks: [
            { t: 'p', text: 'Fungsi view hanya membaca; memanggilnya ke RPC tidak menghabiskan gas dan tidak bisa mengubah apa pun. Fungsi state-changing bisa menolak, bisa menghabiskan gas, dan bisa mengubah izin milikmu. ABI memberi tahu mana yang mana — tapi hanya kalau kamu membacanya, bukan menampilkan tombolnya.' },
            { t: 'ul', items: ['`view`/`pure` -> aman dipanggil sendiri lewat eth_call.', '`payable` -> bisa membawa BNB; periksa `value`-nya.', 'Yang tidak `view` -> asumsikan mengubah state sampai kamu bukti sebaliknya.', 'Fungsi milik kontrak pihak lain -> nama fungsinya tidak menjamin apa pun; implementasinya yang menentukan.'] },
            { t: 'note', text: 'Nama fungsi adalah komentar yang tidak bisa diedit. `mint`, `owner`, `upgrade` bisa melakukan apa saja tergantung isinya. Karena itu langkah pertama menilai kontrak adalah membaca perilakunya, bukan daftar fiturnya.' },
            { t: 'try', prompt: 'Ambil ABI resolver kita dari repo (`web/src/abi.ts`). Kelompokkan fungsinya jadi baca dan tulis. Sebutkan satu yang kamu kira baca ternyata butuh tanda tangan.' },
          ],
        },
        {
          slug: 'kuis-membaca',
          title: 'Kuis 1 — Membaca ABI',
          minutes: 8,
          kind: 'kuis',
          summary: 'Empat soal tentang apa yang boleh kamu panggil dan apa yang harus kamu curigai.',
          blocks: [{ t: 'p', text: 'Semua soal bisa dijawab tanpa membuka dokumentasi kalau catatan modulnya kamu baca.' }],
          quiz: {
            passPct: 75,
            questions: [
              {
                id: 'q1',
                prompt: 'Memanggil fungsi `view` lewat `eth_call`…',
                options: ['Butuh gas dan tanda tangan', 'Tidak mengubah state dan tidak berbiaya', 'Hanya bisa dari kontrak lain', 'Selalu mengembalikan nol di testnet'],
                answer: 1,
                why: 'Ia dieksekusi secara lokal di node. Karena itu halaman verifikasi kami bisa bekerja tanpa wallet.',
              },
              {
                id: 'q2',
                prompt: 'Fungsi bernama `upgrade` pada kontrak pihak lain…',
                options: ['Pasti mengubah kode kontrak', 'Namanya tidak menjamin perilakunya; baca implementasinya', 'Pasti hanya bisa dipanggil owner', 'Termasuk fungsi view'],
                answer: 1,
                why: 'Nama adalah kenyamanan penamaan. Perilaku ada di bytecode, dan bisa diverifikasi lewat source terverifikasi atau pengujian di fork.',
              },
              {
                id: 'q3',
                prompt: 'Kamu ingin tahu siapa yang boleh mengambil token milikmu. Yang kamu baca…',
                options: ['`balanceOf`', '`allowance(owner, spender)` untuk tiap spender yang kamu kenali', '`totalSupply`', '`decimals`'],
                answer: 1,
                why: 'Izin adalah catatan terpisah dari saldo. Saldo yang utuh hari ini tidak bercerita siapa yang boleh mengambilnya besok.',
              },
              {
                id: 'q4',
                prompt: 'Tidak ada source terverifikasi di explorer. Langkah terkuat berikutnya…',
                options: ['Percayai README-nya', 'Deploy fork chain itu lokal dan jalankan perilakunya di sana', 'Gunakan TVL sebagai jaminan', 'Tunggu audit'],
                answer: 1,
                why: 'Fork lokal memberi perilaku nyata tanpa biaya dan tanpa risiko. Kursus ini dibangun di atas kebiasaan itu: primitif yang kami klaim diuji pada deployment BAS yang sebenarnya.',
              },
            ],
          },
        },
        {
          slug: 'praktik-rantai-izin',
          title: 'Praktik 1 — Memetakan siapa yang boleh mengambil',
          minutes: 25,
          kind: 'praktik',
          summary: 'Bangun daftar pemegang izin pada satu token, lalu simpulkan sendiri risikonya.',
          blocks: [
            { t: 'p', text: 'Latihan ini menghasilkan satu dokumen pendek yang akan kamu pakai lagi di esai. Tidak ada alat khusus: RPC dan satu loop.' },
            { t: 'ol', items: ['Pilih satu token BEP-20 di testnet dan baca `balanceOf` address belajarmu.', 'Baca `allowance(address, spender)` untuk beberapa spender yang kamu kenal dari aktivitas di explorer.', 'Urutkan dari izin terbesar, tandai yang tidak lagi kamu kenali.', 'Setel yang tidak kamu kenali ke nol. Catat gas yang kamu bayar untuk ketenangan itu.'] },
            { t: 'try', prompt: 'Tulis tiga kalimat: apa yang kamu temukan, apa yang menurutmu berisiko, dan apa yang TIDAK bisa kamu simpulkan dari data itu.' },
            { t: 'note', text: 'Yang tidak bisa disimpulkan biasanya ini: izin yang besar tidak berarti sudah disalahgunakan, dan izin nol tidak berarti aman — bisa jadi kamu hanya belum pernah memeriksa kontrak yang tepat.' },
          ],
        },
      ],
    },
    {
      id: 'm2',
      title: 'Modul 2 — Menulis kesimpulan yang tahan ditanya',
      blurb: 'Bagian yang membedakan "bisa pakai alat" dari "bisa dipercaya menilai".',
      lessons: [
        {
          slug: 'esai-audit-sendiri',
          title: 'Esai — Catatan evaluasi sebuah kontrak',
          minutes: 50,
          kind: 'esai',
          summary: 'Satu halaman: apa yang kamu periksa, apa hasilnya, apa yang tidak kamu periksa dan kenapa itu penting.',
          blocks: [
            { t: 'p', text: 'Format bebas, tapi empat bagian ini harus ada. Penilaiannya adalah agen penerbit dengan rubrik yang sama yang kamu baca sekarang.' },
            { t: 'ol', items: ['Ruang lingkup: kontrak mana, chain mana, waktu pembacaan.', 'Cara: perintah atau fungsi yang kamu pakai, supaya orang lain bisa mengulang.', 'Temuan: termasuk temuan kosong — "tidak ada izin aktif yang saya kenali" juga hasil.', 'Batas: apa yang tidak kamu periksa, dan seberapa besar kemungkinan itu mengubah kesimpulan.'] },
            { t: 'note', text: 'Bagian keempat adalah bagian yang paling sering hilang, termasuk di laporan berbayar. Tanpa itu, pembaca tidak tahu seberapa luas ketidaktahuanmu.' },
          ],
          essay: {
            prompt:
              'Tulis catatan evaluasi satu halaman atas kontrak yang kamu pakai di Praktik 1. Kamu harus menyebut ' +
              'satu hal yang TIDAK kamu periksa dan kenapa hal itu bisa mengubah kesimpulan.',
            minWords: 350,
            rubric: [
              { label: 'Ruang lingkup dan waktu pembacaan eksplisit', max: 15 },
              { label: 'Cara bisa diulang orang lain (fungsi/perintah disebut)', max: 30 },
              { label: 'Temuan dibedakan dari dugaan', max: 25 },
              { label: 'Batas pemeriksaan dinyatakan, bukan disembunyikan', max: 20 },
              { label: 'Bahasa dan struktur', max: 10 },
            ],
            guidance: [
              'Tidak diterima: kesimpulan tanpa cara. "Kontraknya aman" tanpa satu pun fungsi yang kamu sebut.',
              'Tidak diterima: menempel keluaran alat tanpa satu kalimat pun tentang apa artinya.',
              'Dihargai: menyebut bahwa ketiadaan temuan bukan jaminan, plus seberapa jauh kamu sudah melihat.',
            ],
          },
        },
        {
          slug: 'referensi-lanjut',
          title: 'Referensi — Lanjut ke mana',
          minutes: 8,
          kind: 'referensi',
          summary: 'Tiga jalur lanjutan yang bisa kamu jalankan sendiri dari mesin ini.',
          blocks: [
            { t: 'ul', items: ['Arah pengembangan: fork sebuah chain publik di mesin sendiri lalu deploy kontrakmu ke situ — itu persis cara kami menguji 68 test di chain 97 dan 56.', 'Arah keamanan: biasakan mengevaluasi kontrak yang tidak dikenal di fork sebelum memberi izin apa pun.', 'Arah verifikasi: ambil satu kredensial apa pun yang kamu punya, dan coba buktikan kebalikannya.'] },
            { t: 'links', items: [{ label: 'Foundry — fork, uji, dan deploy', url: 'https://book.getfoundry.sh/', kind: 'resmi' }, { label: 'Standar ERC-5192 (token terkunci)', url: 'https://eips.ethereum.org/EIPS/eip-5192', kind: 'resmi' }] },
          ],
        },
      ],
    },
  ],
}
