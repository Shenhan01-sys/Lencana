/**
 * `src/brain.js` — otak agen milik akun, semi-otomatis (B135, D69).
 *
 * Dua rute, dua penanda tangan yang berbeda dengan sengaja:
 *   POST /owner/agents/brain   PEMILIK agen (ownerOf di registry ERC-8004) mencatat provider + model + hasil uji kalibrasi.
 *                              Pesan: `lencana-agent-brain agent=<id> provider=<p> model=<m> sub=<n> empty=<n> temp=<0|none> nonce=<hex>`.
 *   POST /owner/agents/queue   DOMPET agen (agentWallet) membaca esai yang menunggu nilai dari kursus yang menyewanya.
 *                              Pesan: `lencana-agent-queue agent=<id> nonce=<hex>`. Yang membaca tulisan peserta adalah yang
 *                              menandatangani nilainya — bukan setiap pemilik NFT yang dompet agennya orang lain.
 *
 * Yang TIDAK lewat sini: API key. Kalibrasi dan penilaian dijalankan peramban pemilik dengan kuncinya sendiri
 * (`web/src/llm.ts`), jadi angka kalibrasi adalah LAPORAN pemilik yang ia tandatangani. Server memeriksa aturannya
 * (`judgeCalibration`, sama dengan `npm run judge`) — ia tidak bisa mengulang panggilan modelnya, dan tidak mengaku bisa.
 */
// Lencana-B135 status=SELESAI 2026-10-03 — rute otak agen: pemilik (ownerOf) mencatat provider + model + kalibrasi yang lolos aturan judge-check, dompet agen membaca antrean esai dari kursus yang menyewanya (tanpa esai milik operatornya sendiri); kunci LLM tidak pernah lewat server. Buktikan ulang: npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress } from 'viem'

import { isProvider, PROVIDER_IDS } from '../../web/src/llm.ts'
import { calibrationSetup, judgeCalibration, CALIBRATION_COURSE, CALIBRATION_LESSON } from '../../web/src/calibration.ts'
import { agentFacts, ownedAgentFacts } from './agents.js'
import { agentBrains, saveAgentBrain, hiresOfAgent, queuePendingEssays } from './db.js'

const fail = (status, why, extra = {}) => ({ ok: false, status, why, ...extra })
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

/** ID model provider: tanpa spasi, 1–120 karakter (mis. `openai/gpt-oss-120b`, `claude-sonnet-4-5`, `glm-4.6`). */
export const MODEL_ID = /^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,119}$/
const BRAIN_RE = /^lencana-agent-brain agent=(\d{1,12}) provider=([a-z]+) model=(\S{1,120}) sub=(\d{1,3}) empty=(\d{1,3}) temp=(0|none) nonce=[0-9a-f]{12,}$/
export const BRAIN_HINT = `message must be "lencana-agent-brain agent=<id> provider=<${PROVIDER_IDS.join('|')}> model=<id> sub=<n> empty=<n> temp=<0|none> nonce=<hex>"`
export const QUEUE_RE = /^lencana-agent-queue agent=(\d{1,12}) nonce=[0-9a-f]{12,}$/
export const QUEUE_HINT = 'message must be "lencana-agent-queue agent=<id> nonce=<hex>"'

/** Pesan otak → bagian-bagiannya, atau null bila bentuknya salah (dipanggil SEBELUM nonce dipakai). */
export function parseBrainMessage (message) {
  const m = BRAIN_RE.exec(String(message ?? ''))
  if (!m) return null
  const [, agentId, provider, model, sub, empty, temp] = m
  if (!isProvider(provider) || !MODEL_ID.test(model)) return null
  return { agentId, provider, model, substantive: Number(sub), hollow: Number(empty), temperature: temp === '0' ? 0 : null }
}

/** Bentuk publik satu baris otak. `byCurrentOwner` = dicatat oleh pemilik yang sekarang (sesudah NFT pindah, catat ulang). */
export function projectBrain (row, currentOwner = null) {
  if (!row) return null
  return {
    agentId: String(row.agent_id), provider: row.provider, model: row.model, modelName: `${row.provider}/${row.model}`,
    calibration: row.calibration, passed: Boolean(row.passed), at: row.updated_at, recordedBy: row.owner,
    byCurrentOwner: currentOwner ? same(row.owner, currentOwner) : null,
  }
}

/** Pemilik (ownerOf saat ini) mencatat otak agennya. Kalibrasi yang tidak lolos aturan tidak dicatat sama sekali. */
export async function recordBrain (cfg, { owner, parsed, message, signature }) {
  const mine = await ownedAgentFacts(cfg, owner, [parsed.agentId])
  if (!mine.length) return fail(403, `this account does not own agent ${parsed.agentId} (ownerOf in the ERC-8004 registry)`)
  const { essay, passMark } = calibrationSetup()
  const max = essay.rubric.reduce((s, r) => s + Number(r.max), 0)
  if (parsed.substantive > max || parsed.hollow > max) return fail(400, `calibration scores must be between 0 and ${max}`)
  const cal = judgeCalibration(parsed.substantive, parsed.hollow, passMark)
  if (!cal.pass) {
    return fail(422, `calibration does not pass: the hollow essay must score below ${passMark}, the substantive one at least ${passMark} and above the hollow one`, { reasons: cal.reasons })
  }
  const row = await saveAgentBrain({
    agentId: parsed.agentId, owner, provider: parsed.provider, model: parsed.model, passed: true, message, signature,
    calibration: { course: CALIBRATION_COURSE, lesson: CALIBRATION_LESSON, passMark, substantive: parsed.substantive, hollow: parsed.hollow, temperature: parsed.temperature },
  })
  if (!row) return fail(500, 'the brain record was not stored')
  return { ok: true, status: 201, brain: projectBrain(row, owner) }
}

/**
 * Antrean esai satu agen → butir yang bisa dinilai (fungsi murni). Esai milik operator agen sendiri (dompet atau pemiliknya)
 * tidak pernah masuk — tidak ada yang menilai tulisannya sendiri. Alamat peserta tidak ikut dikirim: penilai tidak perlu tahu.
 * @param essayOf  `essayLesson` dari `quiz.js` — rubrik dibaca dari manifest penerbit, sama dengan rute penilaian.
 */
export function queueItems ({ pending, exclude, essayOf }) {
  const out = []
  for (const s of pending ?? []) {
    if (exclude.some((a) => same(a, s.learner))) continue
    const found = essayOf(s.course_id, s.lesson_key)
    if (found.error) continue
    const e = found.lesson.essay
    out.push({
      attemptId: Number(s.attempt_id), course: s.course_id, lesson: s.lesson_key, attemptNo: s.attempts?.attempt_no ?? null,
      words: Number(s.words) || 0, awaitingSince: s.awaiting_since ?? null, text: String(s.body ?? ''),
      essay: { prompt: e.prompt, guidance: e.guidance ?? [], rubric: e.rubric.map((r) => ({ label: r.label, max: Number(r.max) })) },
      passMark: found.manifest.course.passMark,
    })
  }
  return out
}

/** Dompet agen membaca antreannya: agen layak, penanda tangan = agentWallet, otak lolos kalibrasi dari pemilik sekarang. */
export async function agentQueue (cfg, { agentId, signer, essayOf, perCourse = 20 }) {
  const f = await agentFacts(cfg, agentId)
  if (!f.ok) return f
  const a = f.agent
  if (!same(a.wallet, signer)) {
    return fail(403, `agent ${a.agentId}'s queue is read by its agentWallet (${a.wallet}) — the address that signs its judgements`)
  }
  const [row] = await agentBrains([a.agentId])
  if (!row?.passed) return fail(409, `agent ${a.agentId} has no calibrated brain yet — its owner records one first`)
  if (!same(row.owner, a.owner)) return fail(409, `agent ${a.agentId}'s brain was recorded by a previous owner — the current owner records it again`)
  const hires = await hiresOfAgent(a.agentId)
  const live = hires.filter((h) => same(h.agent_wallet, a.wallet))
  const pending = (await Promise.all(live.map((h) => queuePendingEssays(h.course_id, perCourse)))).flat()
  return {
    ok: true, status: 200,
    queue: {
      agentId: a.agentId, wallet: getAddress(a.wallet), owner: getAddress(a.owner), brain: projectBrain(row, a.owner),
      courses: live.map((h) => ({ courseId: h.course_id, hiredAt: h.hired_at })),
      // Disewa dengan dompet lain: rute penilaian menolaknya (409) sampai penerbit menyewa ulang — dilaporkan, tidak disembunyikan.
      staleCourses: hires.filter((h) => !same(h.agent_wallet, a.wallet)).map((h) => h.course_id),
      items: queueItems({ pending, exclude: [a.wallet, a.owner], essayOf }),
    },
  }
}
