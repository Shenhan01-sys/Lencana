/**
 * Kunci jawaban kuis `token-izin-2026` (B127, 2 Okt). Hanya `manifest-keys.ts` yang mengimpor berkas ini (B80).
 */
import type { QuizKeys } from '../content'

export const tokenIzinKeys: QuizKeys = {
  'kuis-izin': {
    q1: { answer: 1, why: 'approve hanya mencatat izin; token baru berpindah saat spender memanggil transferFrom.' },
    q2: { answer: 1, why: 'Tanda tangan permit diserahkan ke pihak lain yang mengirim transaksinya; hasilnya tetap izin (allowance) di kontrak token.' },
    q3: { answer: 1, why: 'Menyetel izin ke 0 menutupnya. Menghapus aplikasi dompet tidak mengubah apa pun di chain.' },
    q4: { answer: 1, why: 'Izin tak terbatas bertahan tanpa batas waktu; risikonya ikut berpindah ke keamanan kontrak dan kunci milik spender.' },
  },
}
