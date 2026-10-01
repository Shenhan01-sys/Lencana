// Lencana-B80 status=SELESAI 2026-10-01 — kunci jawaban kuis web3-lanjut-2026: hanya diimpor web/src/manifest-keys.ts (server dan skrip Node); bundel browser tidak boleh memuatnya — dijaga pemindaian bundel di npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * Kunci jawaban kuis `web3-lanjut-2026` (B80, 1 Okt). Dipindah dari `courses/web3-lanjut.ts` tanpa mengubah satu
 * nilai pun — skrip pemindahnya menolak menulis kalau satu pasang `answer`/`why` tidak sama dengan snapshot
 * sebelum perubahan, dan `rubricHash` kedua kursus diukur sama dengan HEAD sesudahnya.
 *
 * Kenapa terpisah: berkas kursus diimpor halaman belajar, jadi apa pun yang ada di sana ikut ke bundel
 * browser. Diukur 1 Okt sebelum pemindahan: bundel publik di Vercel memuat 28 dari 28 teks `why` dan
 * 28 literal `answer:<angka>`. Berkas ini hanya boleh diimpor `manifest-keys.ts`.
 */
import type { QuizKeys } from '../content'

export const web3LanjutKeys: QuizKeys = {
  'kuis-membaca': {
    q1: { answer: 1, why: 'Ia dieksekusi secara lokal di node. Karena itu halaman verifikasi kami bisa bekerja tanpa wallet.' },
    q2: { answer: 1, why: 'Nama adalah kenyamanan penamaan. Perilaku ada di bytecode, dan bisa diverifikasi lewat source terverifikasi atau pengujian di fork.' },
    q3: { answer: 1, why: 'Izin adalah catatan terpisah dari saldo. Saldo yang utuh hari ini tidak bercerita siapa yang boleh mengambilnya besok.' },
    q4: { answer: 1, why: 'Fork lokal memberi perilaku nyata tanpa biaya dan tanpa risiko. Kursus ini dibangun di atas kebiasaan itu: primitif yang kami klaim diuji pada deployment BAS yang sebenarnya.' },
  },
}
