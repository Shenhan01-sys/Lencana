/**
 * `judge-prompt.ts` — prompt penilai rubrik, SATU sumber untuk server dan peramban (B135, D69).
 *
 * Dipakai dua penilai yang berbeda pemiliknya:
 *   - jalur kunci penerbit (`signer/src/judge.js`, Groq `openai/gpt-oss-120b`, `npm run grade:essay -- --judge`);
 *   - otak agen milik akun (peramban pemilik, provider + model pilihan pemilik, B135).
 * Kalau prompt keduanya berbeda, "agen menilai dengan aturan yang sama" berhenti benar tanpa ada yang tahu — jadi teksnya
 * hidup di sini saja, dan `npm run verify:brain` memeriksa `judge.js` memakainya.
 *
 * Isi prompt TIDAK berubah dari versi 24 Sep di `judge.js` (dipindah, bukan ditulis ulang): kontrol negatif
 * `judge-check` dan pengukuran variansnya berlaku untuk teks ini.
 */
// Lencana-B135 status=TERBUKA 2026-10-03 — prompt penilai rubrik satu sumber untuk jalur kunci penerbit (judge.js) dan otak agen di peramban; pengurai JSON longgar dan pembaca nilai per kriteria yang menolak kriteria hilang. Buktikan ulang: cd signer && npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Essay } from './content'

export const JUDGE_SYSTEM = [
  'Kamu adalah penilai rubrik untuk sebuah kursus. Kamu menilai SATU tulisan terhadap rubrik yang diberikan.',
  'Aturan keras:',
  '- Keluarkan HANYA satu objek JSON, tanpa teks lain, tanpa pagar kode.',
  '- Bentuknya: {"scores": {"<label kriteria persis seperti diberikan>": <angka bulat 0..max>>}}',
  '- Setiap label kriteria harus muncul persis seperti ditulis. Jangan menambah atau menghapus kriteria.',
  '- Beri 0 bila kriteria tidak terpenuhi. Nilai sempurna hanya untuk jawaban yang benar-benar memenuhi seluruh kriteria itu.',
  '- Jangan menaikkan nilai karena tulisan terdengar meyakinkan, panjang, atau percaya diri.',
].join('\n')

/** Isi pesan pengguna: rubrik, tugas, contoh yang tidak diterima, dan tulisan — JSON satu baris. */
export function judgeUserContent (essay: Pick<Essay, 'rubric' | 'prompt' | 'guidance'>, text: string): string {
  return JSON.stringify({
    rubrik: essay.rubric.map((r) => ({ label: r.label, max: r.max })),
    tugas: essay.prompt,
    yang_tidak_diterima: essay.guidance,
    tulisan: text,
  }, null, 0)
}

/** Model boleh membungkus JSON; kami tidak memaksa ia menuruti format, tapi kami tidak mengarang isinya. */
export function parseJsonLoose (text: unknown): unknown {
  const s = String(text ?? '').trim()
  if (!s) return null
  try { return JSON.parse(s) } catch { /* lanjut */ }
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b <= a) return null
  try { return JSON.parse(s.slice(a, b + 1)) } catch { return null }
}

/**
 * Jawaban model → nilai per kriteria `{ label: angka }`, dibulatkan dan dijepit ke 0..max. Kriteria yang hilang TIDAK diisi
 * nol dan TIDAK diisi rata-rata: lebih baik berhenti daripada menerbitkan angka yang sebagian berasal dari keheningan model.
 */
export function scoresFromModel (raw: string, essay: Pick<Essay, 'rubric'>): Record<string, number> {
  const parsed = parseJsonLoose(raw) as { scores?: Record<string, unknown> } | Record<string, unknown> | null
  if (!parsed || typeof parsed !== 'object') throw new Error('jawaban model bukan JSON: ' + String(raw ?? '').slice(0, 120))
  const given = ('scores' in parsed && parsed.scores && typeof parsed.scores === 'object' ? parsed.scores : parsed) as Record<string, unknown>
  const out: Record<string, number> = {}
  for (const r of essay.rubric) {
    const v = Number(given?.[r.label])
    if (!Number.isFinite(v)) throw new Error(`kriteria "${r.label}" tidak dinilai model`)
    out[r.label] = Math.max(0, Math.min(r.max, Math.round(v)))
  }
  return out
}
