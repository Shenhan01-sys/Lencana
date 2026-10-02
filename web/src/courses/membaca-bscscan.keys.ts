/**
 * Kunci jawaban kuis `membaca-bscscan-2026` (B127, 2 Okt). Hanya `manifest-keys.ts` yang mengimpor berkas ini (B80).
 */
import type { QuizKeys } from '../content'

export const membacaBscscanKeys: QuizKeys = {
  'kuis-bscscan': {
    q1: { answer: 1, why: 'Gas dibayar penanda tangan transaksi, yaitu `from`. Di pembayaran kelas Lencana itu server penerbit, bukan peserta.' },
    q2: { answer: 1, why: 'Kolom Value hanya untuk BNB. Perpindahan token dicatat kontrak tokennya sebagai event Transfer di log.' },
    q3: { answer: 0, why: '50.000 × 3 gwei = 150.000 gwei; 1 BNB = 10^9 gwei, jadi biayanya 0,00015 BNB.' },
    q4: { answer: 1, why: 'Transaksi gagal tetap tercatat di blok dan membayar gas untuk eksekusi sampai titik gagal; perubahan state-nya dibatalkan.' },
  },
}
