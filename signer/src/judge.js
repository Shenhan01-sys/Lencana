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
 * berbeda antar jalankan, dan kita tidak bisa lagi berkata "angka ini bisa ditelusuri".
 *
 * Tapi `temperature: 0` TIDAK membuat hasilnya tetap. Terukur 24 Sep, lima kali pada fixture yang
 * sama (`npm run judge-variance`): jawaban substantif **91–100 (spread 9, rata-rata 96,4)**,
 * jawaban kosong **2–3**, dan keputusan LULUS/TIDAK_LULUS **sama di kelimanya** — karena jarak dua
 * kelas itu 93,6 poin sementara ambangnya 70.
 *
 * Kalimat yang boleh ditulis: **"keputusannya stabil, angkanya punya rentang ±5"**. Yang tidak
 * boleh: "nilainya direproduksi persis". Menampilkan satu angka (96) tanpa rentangnya adalah cara
 * membuat penilaian model terlihat lebih presisi daripada adanya — persis hal yang kita tuntut
 * dari penerbit lain.
 */
import { JUDGE_SYSTEM, judgeUserContent, scoresFromModel } from '../../web/src/judge-prompt.ts'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
export const DEFAULT_JUDGE_MODEL = 'openai/gpt-oss-120b'
/**
 * Satu-satunya tempat angka ini boleh ditulis. Dokumen hasil (`src/results.js`) dan narasi
 * kredensial (`src/credential.js`) memetikkannya dari sini — menyatakan `temperature 0` di
 * tempat lain berarti mengklaim angka yang tidak kita simpan di mana pun.
 */
export const JUDGE_TEMPERATURE = 0

// B135 (D69): prompt + pengurai dipindah (bukan ditulis ulang) ke `web/src/judge-prompt.ts` — satu sumber untuk jalur ini
// dan otak agen di peramban pemilik. `npm run verify:brain` memeriksa berkas ini memakainya.
const SYSTEM = JUDGE_SYSTEM

/**
 * @param {object} essay   bentuk `Lesson.essay` dari materi kursus
 * @param {string} text    tulisan peserta
 * @returns {Promise<{scores: Record<string, number>, model: string, tokens: object|null}>}
 * @throws kalau kunci tidak ada, permintaan gagal, atau jawabannya bukan JSON yang lengkap
 */
export async function judgeWithModel (text, essay, opts = {}) {
  const key = process.env.GROQ_API_KEY
  if (!key) throw new Error('GROQ_API_KEY missing from the environment - the judge cannot run')
  if (!essay?.rubric?.length) throw new Error('empty rubric: nothing to grade')

  const model = opts.model ?? DEFAULT_JUDGE_MODEL
  const body = {
    model,
    temperature: JUDGE_TEMPERATURE,
    max_tokens: opts.maxTokens ?? 1500,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: judgeUserContent(essay, text) },
    ],
  }

  /**
   * `temperature: 0` tidak membuat model ini murah: kuota akun terukur di **8.000 token per menit**
   * untuk `openai/gpt-oss-120b`, dan satu panggilan penilaian memakai ±1.400 token (rubrik + dua
   * fixture + jawaban bernalar). Artinya ±5 panggilan/menit — dan 429 pertama yang kudapat datang
   * tepat di panggilan ketiga sebuah deretan.
   *
   * Ini bukan teori: penerbitan massal dengan penilaian model AKAN menabraknya. Jadi kami tunggu
   * dan coba lagi (membaca `retry-after` kalau server memberikannya), dan baru menyerah setelah
   * jeda kumulatif — menyerahkan kegagalan 429 yang sebenarnya cuma "tunggu" membuat orang
   * mengira penilainya rusak.
   */
  const maxWaitMs = opts.maxWaitMs ?? 180_000
  let waited = 0
  let res
  for (;;) {
    res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 90_000),
    })
    if (res.ok) break
    const detail = (await res.text().catch(() => '')).slice(0, 200)
    const rateLimited = res.status === 429
    const retryAfter = Number(res.headers.get('retry-after'))
    const pause = rateLimited ? (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 15_000) : 0
    if (!rateLimited || waited + pause > maxWaitMs) {
      throw new Error(`grading failed: HTTP ${res.status} ${detail}${rateLimited ? ` (waited ${waited / 1000}s)` : ''}`)
    }
    console.log(`  … kuota model habis (HTTP 429), menunggu ${Math.round(pause / 1000)}s — percobaan berikutnya`)
    await new Promise((r) => setTimeout(r, pause))
    waited += pause
  }
  const data = await res.json()
  const msg = data?.choices?.[0]?.message ?? {}
  const raw = msg.content || msg.reasoning || ''
  // Kriteria yang hilang TIDAK diisi nol dan TIDAK diisi rata-rata (lihat `scoresFromModel`).
  return { scores: scoresFromModel(raw, essay), model, tokens: data.usage ?? null }
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
