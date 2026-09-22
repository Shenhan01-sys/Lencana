/**
 * Gerbang penilaian terhadap rubrik — termasuk hak untuk MENOLAK menilai.
 *
 * Kenapa ini ada di `signer/` dan bukan cuma di workspace agen: dokumen kredensial yang kita
 * terbitkan mengklaim sebuah angka hasil penilaian. Kalau angka itu bisa muncul tanpa ada satu pun
 * berkas di repo ini yang memeriksa bagaimana ia diperoleh, klaimnya tidak bisa diulang orang lain
 * — dan bagian "agen" dari cerita kita tinggal jadi hiasan. Letaknya di sini supaya jalur
 * `nilai -> terbit` utuh di satu repo.
 *
 * Bentuknya sengaja tidak enak: dua angka yang TIDAK boleh digabung diam-diam.
 *   scoreMechanical -> apa yang benar-benar bisa diperiksa dengan aturan yang tertulis
 *   finalScore      -> null, kecuali ada `judge` yang disuntik (model atau manusia)
 * Sebagian kriteria pada rubrik memang penilaian ("temuan dibedakan dari dugaan") dan tidak ada
 * regex yang boleh mengaku bisa itu. Pemeriksaan yang menyamar jadi penilaian adalah cara tercepat
 * membuat produk yang menipu verifiernya sendiri.
 *
 * `judge` adalah satu-satunya tempat model masuk. Tanpa itu, agen tidak menerbitkan — dan itu
 * jawaban yang benar, bukan keterbatasan yang perlu ditutupi.
 */

/**
 * Tanda yang bisa diperiksa dari teks peserta saja. Dipetakan ke rubrik yang ditulis peserta
 * di depan mata mereka (`web/src/courses/*`), jadi tidak ada kriteria yang dirahasiakan.
 */
const MECHANICAL_SIGNS = [
  { label: 'panjang tulisan', test: (t) => t.words >= t.minWords, detail: (t) => `${t.words}/${t.minWords} kata` },
  { label: 'menyebutkan alamat 0x…', test: (t) => /0x[0-9a-fA-F]{6,}/.test(t.text) },
  { label: 'menyebutkan sumber yang bisa dibuka (URL)', test: (t) => /https?:\/\//.test(t.text) },
  { label: 'menyebutkan fungsi/perintah konkret', test: (t) => /\b[a-z]+[A-Z]\w+\b|`[^`]+`|cast |eth_call/.test(t.text) },
  { label: 'menyatakan batas kesimpulannya sendiri', test: (t) => /tidak dapat|tidak bisa|belum (?:saya |kita )?[a-z]|terbatas/i.test(t.text) },
]

export const GRADER_NAME = 'rubric-mechanical-v1'

/**
 * @param text      isi tulisan peserta
 * @param essay     bentuk `Lesson.essay` dari data kursus: { prompt, minWords, rubric[], guidance[] }
 * @param judge     (opsional) async (essay, text) => { [labelKriteria]: number }
 */
export async function gradeAgainstRubric ({ text, essay, judge }) {
  if (!essay?.rubric?.length) return { verdict: 'NOT_AN_ESSAY_LESSON' }

  const trimmed = String(text ?? '').trim()
  const words = trimmed ? trimmed.split(/\s+/).length : 0
  const t = { text: trimmed, words, minWords: essay.minWords }

  const mechanical = MECHANICAL_SIGNS.map((s) => ({
    label: s.label,
    ok: s.test(t),
    ...(s.detail ? { detail: s.detail(t) } : {}),
  }))
  const passed = mechanical.filter((m) => m.ok).length
  const scoreMechanical = Math.round((passed / mechanical.length) * 100)
  const base = { grader: GRADER_NAME, words, scoreMechanical, mechanical }

  // Gerbang. Di bawah setengah panjang minimum, atau tanpa satu pun tanda mekanis, menilai apa pun
  // di atasnya berarti mengarang.
  if (words < Math.ceil(essay.minWords * 0.5) || passed === 0) {
    return {
      ...base,
      verdict: 'INSUFFICIENT_EVIDENCE',
      finalScore: null,
      note: `Terlalu sedikit untuk dinilai: ${words} kata, ${passed}/${mechanical.length} tanda terpenuhi. Menolak menilai lebih benar daripada memberi angka.`,
    }
  }

  const perCriterion = essay.rubric.map((r) => ({ label: r.label, max: r.max, method: 'requires-judgement', score: null }))

  if (!judge) {
    return {
      ...base,
      verdict: 'AWAITING_JUDGE',
      perCriterion,
      finalScore: null,
      note: `Yang bisa dibuktikan sudah dihitung (${passed}/${mechanical.length}). Sisanya kriteria penilaian — tidak dinilai oleh pemeriksaan ini. Suntik \`judge\` untuk mengubahnya jadi kredensial.`,
    }
  }

  const given = await judge(essay, trimmed)
  let total = 0
  for (const c of perCriterion) {
    const v = Number(given?.[c.label])
    if (Number.isFinite(v)) {
      c.score = Math.max(0, Math.min(c.max, Math.round(v)))
      c.method = 'judge'
      total += c.score
    }
  }
  const judged = perCriterion.filter((c) => c.score !== null)
  if (judged.length < perCriterion.length) {
    return {
      ...base,
      verdict: 'PARTIAL_JUDGEMENT',
      perCriterion,
      finalScore: null,
      note: `${perCriterion.length - judged.length} kriteria tidak dinilai judge — tidak ada nilai akhir dari rubrik yang hanya sebagian terisi.`,
    }
  }
  return { ...base, verdict: 'GRADED', perCriterion, finalScore: total }
}

/** Ringkas untuk dicetak di CLI tanpa menyembunyikan apa pun. */
export function formatVerdict (r) {
  const signs = r.mechanical
    ? r.mechanical.map((m) => `${m.ok ? '+' : '-'}${m.label}`).join(' ')
    : ''
  return `${r.verdict}${Number.isFinite(r.scoreMechanical) ? ` mekanis=${r.scoreMechanical}` : ''}` +
    `${r.finalScore === null ? '' : ` akhir=${r.finalScore}`}${signs ? `  [${signs}]` : ''}`
}
