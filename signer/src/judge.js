/**
 * `judge` untuk gerbang rubrik: pemanggil model yang GAGAL-TERUS-TUTUP (fail-closed).
 *
 * Kenapa berkas ini ada di `app/signer/` dan bukan di workspace agen: klaim "agen menilai" harus
 * bisa diulang dari clone Lencana. Fungsi yang cuma bisa dipanggil dari folder tetangga bukan
 * fitur — itu klaim yang tidak bisa dibuktikan orang.
 *
 * ## Model dipilih karena hasil ukur, bukan karena nama
 *
 * Diuji 24 Sep terhadap rubrik asli `esai-batas-bukti` (kunci dari environment, katalog model
 * dibaca dari API-nya sendiri — akun ini TIDAK punya `llama-3.3-70b` sama sekali):
 *
 * | model | hasil | keputusan |
 * |---|---|---|
 * | `openai/gpt-oss-120b` | 20–24 dari 25 per kriteria, JSON di `content`, 2,4–2,8 s | **dipakai** |
 * | `openai/gpt-oss-20b` | 20–23, 1,1–1,5 s | cadangan |
 * | `qwen/qwen3.8-27b` | **25/25/25/… di SEMUA kriteria** | **DITOLAK** |
 *
 * Yang terakhir itu alasan berkas ini ada: model yang memberi nilai sempurna ke apa pun membuat
 * rubrik jadi mesin lulus otomatis, dan kredensial yang terbit darinya tidak berarti apa pun.
 * Karena itu `scripts/judge-check.js` mewajibkan **kontrol negatif**: jawaban yang fasih tapi kosong
 * harus mendapat nilai DI BAWAH ambang lulus. Penilai yang tidak bisa menjatuhkan seorang peserta
 * tidak sedang menilai.
 *
 * Semua pemanggilan memakai `temperature: 0`. Itu bukan kebetulan: tanpa itu, nilai yang sama
 * bisa berbeda antar jalankan, dan kita tidak bisa lagi berkata "angka ini bisa ditelusuri".
 */
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_JUDGE_MODEL = 'openai/gpt-oss-120b'

const SYSTEM = [
  'Kamu adalah penilai rubrik untuk sebuah kursus. Kamu menilai SATU tulisan terhadap rubrik yang diberikan.',
  'Aturan keras:',
  '- Keluarkan HANYA satu objek JSON, tanpa teks lain, tanpa pagar kode.',
  '- Bentuknya: {"scores": {"<label kriteria persis seperti diberikan>": <angka bulat 0..max>>}}',
  '- Setiap label kriteria harus muncul persis seperti ditulis. Jangan menambah atau menghapus kriteria.',
  '- Beri 0 bila kriteria tidak terpenuhi. Nilai sempurna hanya untuk jawaban yang benar-benar memenuhi seluruh kriteria itu.',
  '- Jangan menaikkan nilai karena tulisan terdengar meyakinkan, panjang, atau percaya diri.',
].join('\n')

/**
 * @param {object} essay   bentuk `Lesson.essay` dari materi kursus
 * @param {string} text    tulisan peserta
 * @returns {Promise<{scores: Record<string, number>, model: string, tokens: object|null}>}
 * @throws kalau kunci tidak ada, permintaan gagal, atau jawabannya bukan JSON yang lengkap
 */
export async function judgeWithModel (text, essay, opts = {}) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY tidak ada di lingkungan — penilai tidak bisa dijalankan')
  if (!essay?.rubric?.length) throw new Error('rubrik kosong: tidak ada yang bisa dinilai')

  const model = opts.model ?? DEFAULT_JUDGE_MODEL
  const body = {
    model,
    temperature: 0,
    max_tokens: opts.maxTokens ?? 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: JSON.stringify({
          rubrik: essay.rubric.map((r) => ({ label: r.label, max: r.max })),
          tugas: essay.prompt,
          yang_tidak_diterima: essay.guidance,
          tulisan: text,
        }, null, 0),
      },
    ],
  }

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
  })
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')) .slice(0, 200)
    throw new Error(`penilaian gagal: HTTP ${res.status} ${detail}`)
  }
  const data = await res.json()
  const msg = data?.choices?.[0]?.message ?? {}
  const raw = msg.content || msg.reasoning || ''
  const parsed = parseJsonLoose(raw)
  if (!parsed || typeof parsed !== 'object') throw new Error('jawaban model bukan JSON: ' + raw.slice(0, 120))

  const given = parsed.scores ?? parsed
  const out = {}
  for (const r of essay.rubric) {
    const v = Number(given?.[r.label])
    // Kriteria yang hilang TIDAK diisi nol dan TIDAK diisi rata-rata: kami lebih baik berhenti
    // daripada menerbitkan angka yang sebagian berasal dari keheningan model.
    if (!Number.isFinite(v)) throw new Error(`kriteria "${r.label}" tidak dinilai model`)
    out[r.label] = Math.max(0, Math.min(r.max, Math.round(v)))
  }
  return { scores: out, model, tokens: data.usage ?? null }
}

/** Model boleh membungkus JSON; kami tidak memaksa ia menuruti format, tapi kami tidak mengarang isinya. */
function parseJsonLoose (text) {
  const s = String(text ?? '').trim()
  if (!s) return null
  try {
    return JSON.parse(s)
  } catch { /* lanjut */ }
  const a = s.indexOf('{')
  const b = s.lastIndexOf('}')
  if (a === -1 || b <= a) return null
  try {
    return JSON.parse(s.slice(a, b + 1))
  } catch {
    return null
  }
}

/**
 * Bentuk yang dipakai `gradeAgainstRubric({ judge })`.
 * Mengembalikan { label: angka } — pemanggil yang memutuskan apa artinya kalau ada yang hilang.
 */
export function groqJudge (opts = {}) {
  return async (essay, text) => {
    const { scores } = await judgeWithModel(text, essay, opts)
    return scores
  }
}
