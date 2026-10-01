// Lencana-B80 status=SELESAI 2026-10-01 — kunci jawaban kuis web3-dasar-2026: hanya diimpor web/src/manifest-keys.ts (server dan skrip Node); bundel browser tidak boleh memuatnya — dijaga pemindaian bundel di npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * Kunci jawaban kuis `web3-dasar-2026` (B80, 1 Okt). Dipindah dari `courses/web3-dasar.ts` tanpa mengubah satu
 * nilai pun — skrip pemindahnya menolak menulis kalau satu pasang `answer`/`why` tidak sama dengan snapshot
 * sebelum perubahan, dan `rubricHash` kedua kursus diukur sama dengan HEAD sesudahnya.
 *
 * Kenapa terpisah: berkas kursus diimpor halaman belajar, jadi apa pun yang ada di sana ikut ke bundel
 * browser. Diukur 1 Okt sebelum pemindahan: bundel publik di Vercel memuat 28 dari 28 teks `why` dan
 * 28 literal `answer:<angka>`. Berkas ini hanya boleh diimpor `manifest-keys.ts`.
 */
import type { QuizKeys } from '../content'

export const web3DasarKeys: QuizKeys = {
  'kuis-keselamatan': {
    q1: { answer: 2, why: 'Address hanya menunjuk tempat. Yang mengendalikan aset adalah kunci penandatangan, dan address tidak membocorkannya.' },
    q2: { answer: 1, why: 'EIP-55 memakai hash alamat untuk menentukan kapitalisasi. Salin satu karakter salah dan alat yang memeriksa akan menolak.' },
    q3: { answer: 1, why: 'Antarmuka bisa menampilkan apa saja. Yang dieksekusi jaringan adalah payload-nya: izin, jumlah, dan tujuan.' },
    q4: { answer: 2, why: 'Chain membuktikan keberadaan sebuah rekaman pada suatu waktu dan bahwa rekamannya tidak bisa dihapus. Kebenaran isi tetap milik penerbitnya.' },
    q5: { answer: 1, why: 'Satu kunci tidak mengenal jaringan. Kunci yang pernah menyentuh aset nyata tetap bisa dipakai di mainnet, jadi pisahkan dari awalnya.' },
  },
  'kuis-gas': {
    q1: { answer: 1, why: 'Dibayar yang terpakai, bukan plafonnya: 316.384 × 10^9 wei = 0,000316384 BNB.' },
    q2: { answer: 1, why: 'Pekerjaan komputasi sudah dilakukan. Yang dibatalkan hanya perubahan state-nya.' },
    q3: { answer: 0, why: 'Nonce di bawah yang sudah dipakai tidak bisa dieksekusi — transaksi lama tidak bisa diulang. Penggantian hanya berlaku untuk nonce yang SAMA dan belum tertambang.' },
    q4: { answer: 1, why: 'Transaksi baru dengan nonce identik menggantikan yang lama bila harganya cukup lebih tinggi — karena nonce tidak boleh dipakai dua kali.' },
    q5: { answer: 1, why: 'Simulasi ulang di keadaan sebelum transaksi memunculkan error aslinya tanpa mengubah chain.' },
    q6: { answer: 1, why: 'Nonce harus menaik tanpa celah. Koneksi yang putus di tengah membuat satu nomor tidak pernah masuk, dan transaksi sesudahnya menunggu selamanya.' },
  },
  'kuis-token': {
    q1: { answer: 1, why: 'approve hanya mengisi catatan allowance. Saldo bergerak ketika pihak itu memanggil transferFrom.' },
    q2: { answer: 1, why: 'Bukan besarnya semata, tapi tidak ada batas waktunya. Aset yang masuk ke address itu kemudian bisa diambil kapan pun.' },
    q3: { answer: 1, why: 'keccak256 dari teks signature seperti "transfer(address,uint256)", lalu 4 byte pertama.' },
    q4: { answer: 1, why: 'Tidak ada state yang dibaca. Karena itu hasil seperti UID schema bisa dicek silang secara lokal — dan kalau lokal dan chain tidak cocok, yang salah adalah address-nya.' },
    q5: { answer: 1, why: 'Bytecode adalah perilaku nyata. Cocokkan selector yang kamu harapkan, lalu uji lewat fork — bukan lewat klaim di dokumen.' },
  },
  'kuis-akhir': {
    q1: { answer: 1, why: 'Yang terbukti: penerbitnya dikenali dan rekamannya tidak dicabut pada waktu pembacaan. Nilai ada di dokumen, akreditasi tidak diklaim sama sekali.' },
    q2: { answer: 1, why: 'Pencabutan tidak merambat mengubah status rekaman lain. Yang dilarang adalah MENGGUNAKAN A sebagai prasyarat penerbitan baru; B yang sudah terbit tidak diubah diam-diam, dan mata rantainya ditampilkan.' },
    q3: { answer: 1, why: 'Penarikan adalah penilaian platform atas penerbitnya, bukan pembatalan rekaman. Karena bisa dipulihkan, ia harus punya verdict sendiri dan tidak boleh disamarkan jadi REVOKED.' },
    q4: { answer: 1, why: 'Ini kegagalan yang tidak terlihat di verifikasi tanda tangan: dokumennya tetap sah, cuma menunjuk bit yang salah.' },
    q5: { answer: 2, why: 'Server tetap dipercaya untuk MENYAJIKAN. Yang tidak bisa ia lakukan tanpa ketahuan adalah MENGUBAH isinya. Batas ini harus disebut, tidak boleh dijual sebagai "tanpa kepercayaan".' },
    q6: { answer: 1, why: 'Tanda tangannya tetap sah. Yang gagal adalah langkah verifikasi pihak ketiga: validator membuka URL itu, dan tidak ada yang menjawab.' },
    q7: { answer: 2, why: 'Kebenaran hasil penilaian bukan milik chain. Yang terbukti hanya bahwa pihak berizin menyatakan peserta ini lulus — dan itu kami tulis apa adanya di halaman verifikasi.' },
    q8: { answer: 1, why: 'Menyatukan keduanya membuat gangguan teknis jadi vonis, dan vonis jadi gangguan. Dua-duanya berbahaya, dan keduanya bisa dihindari.' },
  },
}
