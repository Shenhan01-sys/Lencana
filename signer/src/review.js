/**
 * `src/review.js` — meja pengesahan agen pengesah (B144).
 *
 *   POST /owner/agents/review-queue   DOMPET agen pengesah (agentWallet) membaca esai yang sudah punya usulan dan belum
 *                                     disahkan, dari kursus tempat penerbit menunjuknya sebagai pengesah.
 *                                     Pesan: `lencana-agent-review-queue agent=<id> nonce=<hex>`.
 *
 * Aturan bacanya sama dengan antrean penilai (B135): yang membaca tulisan peserta adalah yang menandatangani nilai
 * akhirnya — dompet pengesah yang ditunjuk penerbit, bukan setiap pemilik NFT yang dompet agennya orang lain. Alamat
 * peserta tidak dikirim. Keputusannya tetap lewat `POST /essay/review` (pesan `lencana-essay-review attempt=… decision=…
 * final=… label=… nonce=…`), jadi tidak ada aturan pengesahan baru di sini — hanya daftar yang menyaring lebih dulu esai
 * yang akan ditolak rute itu.
 */
// Lencana-B144 status=TERBUKA 2026-10-05 — antrean pengesahan dibaca dompet agen pengesah yang ditunjuk penerbit: esai berusulan yang belum disahkan, teks + rubrik + usulan per kriteria, tanpa alamat peserta; esai yang akan ditolak rute pengesahan tidak ikut. Buktikan ulang: npm run verify:review. JANGAN dibalik/diulang tanpa membuka kembali baris B144 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress } from 'viem'

import { agentFacts } from './agents.js'
import { projectBrain } from './brain.js'
import { agentBrains, graderOwnersOf, queuePendingReviews, reviewRolesOfAgent } from './db.js'

const fail = (status, why) => ({ ok: false, status, why })
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
const round2 = (x) => Math.round(Number(x) * 100) / 100

export const REVIEW_QUEUE_RE = /^lencana-agent-review-queue agent=(\d{1,12}) nonce=[0-9a-f]{12,}$/
export const REVIEW_QUEUE_HINT = 'message must be "lencana-agent-review-queue agent=<id> nonce=<hex>"'

/**
 * Esai yang menunggu pengesahan → butir meja (fungsi murni). Yang tidak ikut, sama dengan yang akan ditolak `POST /essay/review`:
 * usulan agen ini sendiri, usulan agen penilai milik Agent Owner yang sama, dan tulisan dompet / pemilik pengesah sendiri.
 * @param graderOwners  `Map<courseId, Map<agentId, owner>>` dari `agent_hires`
 * @param essayOf       `essayLesson` dari `quiz.js` — rubrik dibaca dari manifest penerbit, sama dengan rute pengesahan
 */
export function reviewItems ({ pending, reviewer, graderOwners, essayOf }) {
  const out = []
  for (const s of pending ?? []) {
    if (same(s.learner, reviewer.wallet) || same(s.learner, reviewer.owner)) continue
    const a = s.attempts ?? {}
    const by = a.graded_by_agent ? String(a.graded_by_agent) : null
    if (by && by === String(reviewer.agentId)) continue
    if (by && same(graderOwners.get(s.course_id)?.get(by), reviewer.owner)) continue
    const found = essayOf(s.course_id, s.lesson_key)
    if (found.error) continue
    const e = found.lesson.essay
    const comps = s.components ?? []
    const crit = new Map(comps.filter((c) => String(c.item_id).startsWith('crit:')).map((c) => [String(c.item_id).slice(5), c]))
    out.push({
      attemptId: Number(s.attempt_id), course: s.course_id, lesson: s.lesson_key, attemptNo: a.attempt_no ?? null,
      words: Number(s.words) || 0, judgedAt: s.judged_at ?? null, text: String(s.body ?? ''),
      essay: { prompt: e.prompt, guidance: e.guidance ?? [], rubric: e.rubric.map((r) => ({ label: r.label, max: Number(r.max) })) },
      passMark: found.manifest.course.passMark,
      proposal: {
        total: round2(a.score), verdict: a.verdict ?? null, judgeModel: a.judge_model ?? null, gradedByAgent: by, label: a.difficulty_label ?? null,
        // Komponen tersimpan sebagai persen dengan weight = poin maksimum (bentuk `judgeEssay`) → dikembalikan ke poin.
        criteria: e.rubric.map((r) => {
          const c = crit.get(String(r.label))
          return { label: r.label, max: Number(r.max), points: c ? round2((Number(c.score) * Number(r.max)) / 100) : null }
        }),
        mechanical: comps.filter((c) => String(c.item_id).startsWith('mech:')).map((c) => ({ check: String(c.item_id).slice(5), passed: Number(c.score) >= 50 })),
      },
    })
  }
  return out
}

/**
 * Dompet agen pengesah membaca mejanya: agen layak, penanda tangan = agentWallet. Otak tidak wajib — pendapat otak opsional.
 * `includeTest` menampilkan esai peserta harness (`origin=test`); bawaannya tersembunyi.
 */
export async function reviewQueue (cfg, { agentId, signer, essayOf, perCourse = 20, includeTest = false }) {
  const f = await agentFacts(cfg, agentId)
  if (!f.ok) return f
  const a = f.agent
  if (!same(a.wallet, signer)) {
    return fail(403, `agent ${a.agentId}'s review queue is read by its agentWallet (${a.wallet}) — the address that signs its reviews`)
  }
  const roles = await reviewRolesOfAgent(a.agentId)
  const live = roles.filter((r) => same(r.reviewer, a.wallet))
  const [pending, owners, [brainRow]] = await Promise.all([
    Promise.all(live.map((r) => queuePendingReviews(r.course_id, perCourse, { includeTest }))).then((x) => x.flat()),
    Promise.all(live.map(async (r) => [r.course_id, new Map((await graderOwnersOf(r.course_id)).map((h) => [String(h.agent_id), h.agent_owner]))])),
    agentBrains([a.agentId]),
  ])
  return {
    ok: true, status: 200,
    queue: {
      agentId: a.agentId, wallet: getAddress(a.wallet), owner: getAddress(a.owner),
      // Pendapat otak hanya ditawarkan halaman bila otaknya lolos kalibrasi DAN dicatat pemilik yang sekarang.
      brain: projectBrain(brainRow ?? null, a.owner),
      courses: live.map((r) => ({ courseId: r.course_id, appointedAt: r.added_at })),
      // Ditunjuk dengan dompet lain: rute pengesahan menolaknya (403) sampai penerbit menunjuk ulang — dilaporkan, tidak disembunyikan.
      staleCourses: roles.filter((r) => !same(r.reviewer, a.wallet)).map((r) => r.course_id),
      items: reviewItems({ pending, reviewer: { agentId: a.agentId, wallet: a.wallet, owner: a.owner }, graderOwners: new Map(owners), essayOf }),
    },
  }
}
