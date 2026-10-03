/**
 * `llm.ts` — otak agen: adaptor tujuh provider LLM (B135, D69). Dipakai di PERAMBAN pemilik agen; API key tidak pernah
 * dikirim ke server Lencana. `fetchImpl` bisa disuntik sehingga `npm run verify:brain` menguji bentuk permintaan dan
 * pembacaan jawaban tiap provider tanpa jaringan dan tanpa kunci.
 *
 * Fakta yang dicek 3 Okt sebelum ditulis (lihat D69):
 *   daftar model   OpenAI, Anthropic, Groq, Qwen (DashScope intl), DeepSeek, GLM (BigModel) → `GET …/models` dengan kunci;
 *                  xKiro → `GET /v1/models` publik (129 model chat)
 *   CORS           diuji dari peramban sungguhan (T63, kunci palsu → 401 terbaca = lolos): GET daftar model DAN POST chat
 *                  lolos untuk ketujuh provider di bawah (Anthropic hanya dengan `anthropic-dangerous-direct-browser-access`)
 *   chat           Anthropic → `POST /v1/messages`; enam lainnya kompatibel OpenAI → `POST …/chat/completions`
 *
 * KOREKSI 3 Okt (dibiarkan terlihat): GLM semula diarahkan ke Z.ai internasional (`api.z.ai/api/paas/v4`) dengan klaim
 * "semua mengizinkan peramban" — itu hanya benar untuk `GET /models`. Preflight `POST /chat/completions` Z.ai (juga jalur
 * `coding` dan `anthropic`-nya) dijawab 200 TANPA satu pun header CORS, jadi peramban memblokir penilaian ("Failed to
 * fetch", T63). GLM kini lewat Zhipu BigModel (`open.bigmodel.cn/api/paas/v4`), yang mengizinkan keduanya; kunci Z.ai
 * internasional tidak bisa dipakai dari peramban — model GLM tetap tersedia lewat xKiro (`z-ai/glm-*`).
 *
 * Parameter yang ditolak sebagian model (mis. `temperature` ≠ 1 atau `max_tokens` pada model penalar OpenAI terbaru,
 * `response_format` di sebagian provider) dicoba ulang tanpa parameter itu — dan yang BENAR-BENAR terpakai dilaporkan
 * (`temperature` null bila dibuang), supaya penilaian tidak mengklaim "temperature 0" yang tidak terjadi.
 */
// Lencana-B135 status=TERBUKA 2026-10-03 — adaptor tujuh provider LLM untuk otak agen (daftar model dari endpoint provider, chat JSON, coba ulang tanpa parameter yang ditolak dan melaporkan yang terpakai), dipakai di peramban pemilik; kunci tidak pernah ke server. Buktikan ulang: cd signer && npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Essay } from './content'
import { JUDGE_SYSTEM, judgeUserContent, scoresFromModel } from './judge-prompt'

export type ProviderId = 'openai' | 'anthropic' | 'qwen' | 'xkiro' | 'groq' | 'glm' | 'deepseek'
type Provider = {
  label: string
  base: string
  style: 'openai' | 'anthropic'
  modelsPath: string
  /** Daftar model bisa dibaca tanpa kunci (xKiro). */
  modelsPublic?: boolean
  /** Dipakai bila endpoint daftar model tidak ada (GLM): ID tetap bisa diketik manual. */
  fallback?: string[]
  /** Kirim `response_format: json_object` (provider yang terdokumentasi mendukungnya). */
  jsonMode: boolean
  keyHint: string
  keyUrl: string
  /** Catatan yang wajib dibaca pemilik sebelum memakai provider ini (mis. akun mana yang kuncinya berlaku). */
  note?: { en: string, id: string }
}

export const LLM_PROVIDERS: Record<ProviderId, Provider> = {
  openai: { label: 'OpenAI', base: 'https://api.openai.com/v1', style: 'openai', modelsPath: '/models', jsonMode: true, keyHint: 'sk-…', keyUrl: 'https://platform.openai.com/api-keys' },
  anthropic: { label: 'Anthropic', base: 'https://api.anthropic.com/v1', style: 'anthropic', modelsPath: '/models?limit=100', jsonMode: false, keyHint: 'sk-ant-…', keyUrl: 'https://console.anthropic.com/settings/keys' },
  qwen: { label: 'Qwen (Alibaba Cloud)', base: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', style: 'openai', modelsPath: '/models', jsonMode: true, keyHint: 'sk-…', keyUrl: 'https://modelstudio.console.alibabacloud.com/' },
  xkiro: { label: 'xKiro', base: 'https://api.xkiro.com/v1', style: 'openai', modelsPath: '/models', modelsPublic: true, jsonMode: false, keyHint: 'kunci xKiro', keyUrl: 'https://docs.xkiro.com/guides/authentication/' },
  groq: { label: 'Groq', base: 'https://api.groq.com/openai/v1', style: 'openai', modelsPath: '/models', jsonMode: true, keyHint: 'gsk_…', keyUrl: 'https://console.groq.com/keys' },
  glm: {
    label: 'GLM (Zhipu)', base: 'https://open.bigmodel.cn/api/paas/v4', style: 'openai', modelsPath: '/models',
    // Cadangan bila daftar model tidak terbaca: ID GLM yang dimuat xKiro 3 Okt (`z-ai/<id>`), tanpa awalan vendornya.
    fallback: ['glm-5.3', 'glm-5.2', 'glm-5.1', 'glm-5', 'glm-4.7', 'glm-4.5-air', 'glm-4.5-flash'],
    jsonMode: false, keyHint: 'kunci BigModel', keyUrl: 'https://open.bigmodel.cn/usercenter/apikeys',
    note: {
      en: 'Uses a Zhipu BigModel key (open.bigmodel.cn). Z.ai international keys cannot be used from a browser — Z.ai refuses cross-origin chat calls; GLM models are also available through xKiro.',
      id: 'Memakai kunci Zhipu BigModel (open.bigmodel.cn). Kunci Z.ai internasional tidak bisa dipakai dari peramban — Z.ai menolak panggilan chat lintas asal; model GLM juga tersedia lewat xKiro.',
    },
  },
  deepseek: { label: 'DeepSeek', base: 'https://api.deepseek.com', style: 'openai', modelsPath: '/models', jsonMode: true, keyHint: 'sk-…', keyUrl: 'https://platform.deepseek.com/api_keys' },
}
export const PROVIDER_IDS = Object.keys(LLM_PROVIDERS) as ProviderId[]
export const isProvider = (x: unknown): x is ProviderId => typeof x === 'string' && x in LLM_PROVIDERS

export type ModelInfo = { id: string, label: string | null, context: number | null }
type Fetch = (input: string, init?: RequestInit) => Promise<Response>

/** Model yang jelas bukan model chat (embedding, suara, gambar, moderasi) disembunyikan dari pilihan. */
const NOT_CHAT = /(embed|tts|whisper|dall-e|moderation|audio|realtime|transcri|image|speech|playai|rerank|guard)/i

function headersFor (p: Provider, key: string | null, json = false): Record<string, string> {
  const h: Record<string, string> = json ? { 'content-type': 'application/json' } : {}
  if (p.style === 'anthropic') {
    if (key) h['x-api-key'] = key
    h['anthropic-version'] = '2023-06-01'
    h['anthropic-dangerous-direct-browser-access'] = 'true'
  } else if (key) {
    h.authorization = `Bearer ${key}`
  }
  return h
}

async function failText (res: Response): Promise<string> {
  const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 220)
  if (res.status === 401 || res.status === 403) return `API key ditolak provider (HTTP ${res.status})`
  if (res.status === 429) return `kuota/batas laju provider habis (HTTP 429)${res.headers.get('retry-after') ? ` — coba lagi dalam ${res.headers.get('retry-after')} detik` : ''}`
  return `HTTP ${res.status}${body ? `: ${body}` : ''}`
}

/** Daftar model dari endpoint provider. Tanpa endpoint (GLM) → daftar cadangan, `source: 'fallback'`. */
export async function listModels (id: ProviderId, key: string | null, fetchImpl: Fetch = fetch): Promise<{ models: ModelInfo[], source: 'endpoint' | 'fallback' }> {
  const p = LLM_PROVIDERS[id]
  if (!key && !p.modelsPublic) throw new Error('isi API key dulu')
  let res: Response
  try {
    res = await fetchImpl(`${p.base}${p.modelsPath}`, { headers: headersFor(p, key) })
  } catch (e) {
    if (p.fallback) return { models: p.fallback.map((m) => ({ id: m, label: null, context: null })), source: 'fallback' }
    throw new Error(`tidak bisa menghubungi ${p.label}: ${e instanceof Error ? e.message : String(e)}`)
  }
  if (!res.ok) {
    if (p.fallback && (res.status === 404 || res.status === 405)) return { models: p.fallback.map((m) => ({ id: m, label: null, context: null })), source: 'fallback' }
    throw new Error(await failText(res))
  }
  const j = await res.json() as { data?: unknown[], models?: unknown[] }
  const rows = (Array.isArray(j?.data) ? j.data : Array.isArray(j?.models) ? j.models : []) as Record<string, unknown>[]
  const models = rows
    .map((m) => ({
      id: String(m.id ?? m.name ?? ''),
      label: typeof m.display_name === 'string' ? m.display_name : null,
      context: Number.isFinite(Number(m.context_length ?? m.context_window)) ? Number(m.context_length ?? m.context_window) : null,
    }))
    .filter((m) => m.id && !NOT_CHAT.test(m.id))
    .sort((a, b) => a.id.localeCompare(b.id))
  return { models, source: 'endpoint' }
}

/**
 * Satu panggilan chat yang meminta JSON. Parameter yang ditolak model dibuang dan dicoba ulang (paling banyak 3 kali);
 * hasilnya menyebut `temperature` yang benar-benar terkirim (0, atau null bila provider/model menolaknya).
 */
export async function chatJson (id: ProviderId, key: string, model: string, system: string, user: string, fetchImpl: Fetch = fetch, opts: { maxTokens?: number, timeoutMs?: number } = {}): Promise<{ text: string, temperature: 0 | null }> {
  const p = LLM_PROVIDERS[id]
  if (!key) throw new Error('isi API key dulu')
  const max = opts.maxTokens ?? 1500
  let useTemp = true
  let useJson = p.jsonMode
  let tokensParam: 'max_tokens' | 'max_completion_tokens' = 'max_tokens'
  for (let attempt = 0; attempt < 4; attempt++) {
    const body = p.style === 'anthropic'
      ? { model, max_tokens: max, ...(useTemp ? { temperature: 0 } : {}), system, messages: [{ role: 'user', content: user }] }
      : {
          model, [tokensParam]: max, ...(useTemp ? { temperature: 0 } : {}),
          ...(useJson ? { response_format: { type: 'json_object' } } : {}),
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        }
    const res = await fetchImpl(`${p.base}${p.style === 'anthropic' ? '/messages' : '/chat/completions'}`, {
      method: 'POST', headers: headersFor(p, key, true), body: JSON.stringify(body),
      ...(opts.timeoutMs ? { signal: AbortSignal.timeout(opts.timeoutMs) } : {}),
    })
    if (res.ok) {
      const j = await res.json() as Record<string, unknown>
      const text = p.style === 'anthropic'
        ? ((j.content as { type?: string, text?: string }[] | undefined) ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('')
        : (() => {
            const msg = ((j.choices as { message?: Record<string, unknown> }[] | undefined)?.[0]?.message) ?? {}
            return String(msg.content || msg.reasoning_content || msg.reasoning || '')
          })()
      return { text, temperature: useTemp ? 0 : null }
    }
    const why = await failText(res.clone())
    const detail = (await res.text().catch(() => '')).toLowerCase()
    if (res.status === 400 && useTemp && detail.includes('temperature')) { useTemp = false; continue }
    if (res.status === 400 && tokensParam === 'max_tokens' && detail.includes('max_tokens') && p.style === 'openai') { tokensParam = 'max_completion_tokens'; continue }
    if (res.status === 400 && useJson && detail.includes('response_format')) { useJson = false; continue }
    throw new Error(why)
  }
  throw new Error('provider menolak setiap bentuk permintaan')
}

/** Penilaian satu esai dengan rubrik penerbit: nilai per kriteria (semua kriteria wajib ada), total, temperature terpakai. */
export async function judgeEssayWith (id: ProviderId, key: string, model: string, essay: Pick<Essay, 'rubric' | 'prompt' | 'guidance'>, text: string, fetchImpl: Fetch = fetch): Promise<{ scores: Record<string, number>, total: number, temperature: 0 | null }> {
  const r = await chatJson(id, key, model, JUDGE_SYSTEM, judgeUserContent(essay, text), fetchImpl, { timeoutMs: 95_000 })
  const scores = scoresFromModel(r.text, essay)
  return { scores, total: Object.values(scores).reduce((a, b) => a + b, 0), temperature: r.temperature }
}

/** Nama model yang dicatat bersama penilaian: `<provider>/<model>` (mis. `groq/openai/gpt-oss-120b`). */
export const judgeModelName = (id: ProviderId, model: string): string => `${id}/${model}`
