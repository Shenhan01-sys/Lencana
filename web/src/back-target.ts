// Lencana-B124 status=SELESAI 2026-10-06 — tombol kembali di detail kursus dan topbar ruang kelas: peserta yang sudah masuk kembali ke dasbor (`#/app`), bukan ke landing/katalog publik; tamu tetap ke katalog. Buktikan ulang: uji peramban T95 (builder 6 Okt malam: "tombol back harusnya redirect ke /app"). JANGAN dibalik/diulang tanpa membuka kembali baris B124 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `back-target.ts` — tujuan tombol "kembali" di halaman kursus (`#/course/<id>`) dan ruang kelas (`#/class/<id>/…`).
 *
 * Dulu keduanya menunjuk `#catalog` (landing publik) untuk siapa pun. Peserta yang sudah masuk datang dari dasbor (`#/app`),
 * jadi kembali ke sana; tamu yang melihat katalog publik tetap kembali ke katalog.
 */
import { hasExplicitLearnerSession } from './learning'

export type BackTarget = { href: string, label: string }

export function backTarget (lang: 'en' | 'id', catalogLabel: string): BackTarget {
  return hasExplicitLearnerSession()
    ? { href: '#/app', label: lang === 'en' ? 'Dashboard' : 'Dasbor' }
    : { href: '#catalog', label: catalogLabel }
}
