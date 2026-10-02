// Lencana-B126 status=TERBUKA 2026-10-02 — kunci jawaban kuis uji-bayar-2026: hanya diimpor web/src/manifest-keys.ts (server dan skrip Node); bundel browser tidak boleh memuatnya — dijaga pemindaian bundel di npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * Kunci jawaban kuis `uji-bayar-2026` (B126, 2 Okt). Sama dengan kursus lain sejak B80: berkas kursus diimpor halaman
 * belajar, jadi kuncinya hidup di sini dan hanya `manifest-keys.ts` yang mengimpornya.
 */
import type { QuizKeys } from '../content'

export const ujiBayarKeys: QuizKeys = {
  'kuis-pembayaran': {
    q1: { answer: 1, why: 'Kamu hanya menandatangani. Server penerbit (fasilitator x402) yang mengirim transaksi settlement ke chain dan membayar gasnya dengan kuncinya sendiri.' },
    q2: { answer: 1, why: 'Izin memuat token, jumlah, pihak yang diizinkan (Permit2), nonce, dan batas waktu. Di luar itu tanda tangannya tidak berlaku.' },
    q3: { answer: 0, why: 'Penerbit memeriksa bahwa pembayar sama dengan peserta yang mendaftar dan bahwa pesan pendaftaran ditandatangani kunci yang sama — sebelum mengeluarkan gas.' },
    q4: { answer: 1, why: 'Transaksinya dikirim server penerbit. Alamatmu muncul di event Transfer sebagai pemilik token yang berpindah, bukan sebagai pengirim transaksi.' },
  },
}
