/**
 * Kunci jawaban kuis `literasi-keuangan-2026` (B127, 2 Okt). Sama dengan kursus lain sejak B80: hanya `manifest-keys.ts`
 * yang mengimpor berkas ini, jadi kuncinya tidak ikut ke bundel browser.
 */
import type { QuizKeys } from '../content'

export const literasiKeuanganKeys: QuizKeys = {
  'kuis-keuangan': {
    q1: { answer: 1, why: '0,3% × 20 hari = 6% dari pokok Rp2.000.000 = Rp120.000; yang dibayar kembali Rp2.120.000, walau yang cair hanya Rp1.900.000.' },
    q2: { answer: 2, why: 'Rp2.120.000 − Rp1.900.000 = Rp220.000; dibagi Rp1.900.000 yang cair ≈ 11,6%, jadi sekitar 12% dalam 20 hari — dua kali "6%" yang terlihat.' },
    q3: { answer: 1, why: 'Dimajemukkan 52 minggu, 5% per minggu menjadi lebih dari 1.000% per tahun. Usaha wajar tidak bisa menjanjikannya dengan pasti — itu pola klasik skema Ponzi.' },
    q4: { answer: 1, why: 'Bank tidak pernah meminta OTP. OTP adalah tanda persetujuan transaksi; siapa pun yang memegangnya bisa memindahkan uangmu.' },
  },
}
