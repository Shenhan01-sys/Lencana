/**
 * `judge` untuk gerbang rubrik: pemanggil model yang GAGAL-TERUS-TUTUP (fail-closed).
 *
 * Kenapa berkas ini ada di `app/signer/` dan bukan di workspace agen: klaim "agen menilai" harus
 * bisa diulang dari clone Lencana. Fungsi yang cuma bisa dipanggil dari folder tetangga bukan
 * fitur — itu klaim yang tidak bisa dibuktikan orang.
 *
 * ## Model dipilih karena hasil ukur, bukan karena nama
 *
 * Diuji 24 Sep terhadap rubrik asli `esai-batas-bukti` dengan DUA tulisan berbeda mutunya (kunci
 * dari environment; katalog model dibaca dari API-nya sendiri — akun ini TIDAK punya
 * `llama-3.3-70b`, dan `qwen/qwen3.8-27b` nyata ada, `owned_by: "Alibaba Cloud"`):
 *
 * | model | substantif | fasih-tapi-kosong | keputusan |
 * |---|---|---|---|
 * | `openai/gpt-oss-120b` | 99 | **6** | **dipakai** |
 * | `openai/gpt-oss-20b` | ~95 | 4 | cadangan |
 * | `qwen/qwen3.8-27b` | **100** | 8 | bukan default |
 *
 * KOREKSI yang sengaja dibiarkan tertulis di kode: laporan pertamaku mengklaim qwen memberi
 * "25/25 ke dua tulisan berbeda mutu". Itu SALAH — probe pertama cuma mengirim SATU esai ke semua
 * model, dan aku menyimpulkan perbandingan yang belum kujalankan. Sesudah diuji betulan, qwen
 * MENJATUHKAN jawaban kosong (8/100): dia bukan mesin lulus otomatis. Alasan sesungguhnya ia bukan
 * default lebih kecil dan harus disebut dengan benar: **plafonnya jenuh** (langsung 100, tanpa
 * kepala untuk membedakan "bagus" dari "sempurna") dan ia tidak menawarkan `structured_outputs`.
 *
 * Karena itu `scripts/judge-check.js` mewajibkan **kontrol negatif**: jawaban fasih tapi kosong harus
 * di bawah ambang lulus. Penilai yang tidak bisa menjatuhkan peserta tidak sedang menilai — dan
 * penilai yang mentok di 100 juga tidak menyisakan apa pun untuk dibandingkan.
 *
 * Semua pemanggilan memakai `temperature: 0`. Itu bukan kebetulan: tanpa itu, nilai yang sama bisa
 * berbeda antar jalankan, dan kita tidak bisa lagi berkata "angka ini bisa ditelusuri". Bahkan
 * dengannya hasilnya masih bergeser (99/100; 6 pada fixture kosong, 4 di panggilan lain) — jadi
 * yang kita klaim adalah "model dan jawabannya tercatat", bukan "direproduksi persis".
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
