/**
 * Kunci jawaban kuis `keamanan-akun-2026` (B127, 2 Okt). Hanya `manifest-keys.ts` yang mengimpor berkas ini (B80).
 */
import type { QuizKeys } from '../content'

export const keamananAkunKeys: QuizKeys = {
  'kuis-keamanan': {
    q1: { answer: 1, why: 'Credential stuffing mencoba pasangan email + kata sandi dari kebocoran lama di layanan lain; panjangnya tidak menolong kalau ia sudah bocor.' },
    q2: { answer: 2, why: 'Passkey dan kunci keamanan terikat pada domain asli, jadi tidak bisa dipakai di situs palsu meski korbannya tertipu.' },
    q3: { answer: 1, why: 'Domain dibaca dari kanan, sebelum garis miring pertama: …verifikasi-akun.example. "bankcontoh.co.id" di depannya hanya subdomain milik pemilik verifikasi-akun.example.' },
    q4: { answer: 1, why: 'Desakan waktu adalah ciri phishing. Masuk lewat jalan yang kamu ketahui sendiri memastikan kamu berada di situs yang asli.' },
  },
}
