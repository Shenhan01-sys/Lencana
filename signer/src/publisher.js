/**
 * `src/publisher.js` — dasbor penerbit (B129, RF7 langkah C2, D64): dari baris mentah ke angka yang dibaca anggota
 * penerbit. Satu aturan: setiap angka bisa ditelusuri ke barisnya — pendapatan dari `orders` yang lunas (dengan tx-nya),
 * potongan platform dari `platformBps` yang dibaca dari kontrak pembagian di chain (bukan konstanta), alur esai dari
 * `attempts` + `submissions` + `judgement_reviews`, agen dari `agent_hires` + `review_roles` + `agent_charges`.
 *
 * Yang sengaja TIDAK ada di sini: teks esai, kunci jawaban, pesan + tanda tangan. Dasbor memantau; ia tidak membaca
 * karangan peserta.
 */

// Lencana-B129 status=SELESAI 2026-10-02 — dasbor penerbit dihitung dari baris yang bisa ditelusuri (orders lunas + platformBps dari chain, alur esai, agen dan tagihannya), tanpa teks esai; baris harness disaring kecuali diminta. Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http, parseAbi } from 'viem'

const splitAbi = parseAbi(['function platformBps() view returns (uint16)'])
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()
const units = (x) => { try { return BigInt(String(x ?? '0').split('.')[0]) } catch { return 0n } }
/** Catatan pengajuan untuk ditampilkan: tanpa karakter kontrol, spasi dirapatkan, maksimum 280 karakter; kosong → null. */
export const cleanNote = (n) => {
  const t = String(n ?? '').replace(/[\x00-\x1f\x7f-\x9f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280)
  return t || null
}

/** Potongan platform yang berlaku hari ini, dibaca dari `SettlementSplit` — null kalau chain tidak terbaca. */
export async function readPlatformBps (rpcUrl, split) {
  if (!rpcUrl || !split) return null
  try {
    const client = createPublicClient({ transport: http(rpcUrl, { timeout: 15_000, retryCount: 1 }) })
    return Number(await client.readContract({ address: split, abi: splitAbi, functionName: 'platformBps' }))
  } catch {
    return null
  }
}

/**
 * Status satu esai di alur penerbit: diserahkan → diusulkan (model/agen) → disahkan, disesuaikan, atau ditolak.
 * Aturan yang sama dengan view gerbang (`supabase/migrations/0009_judgement_reviews.sql`): hanya nilai dari model/agen
 * (`judge_model` terisi) yang menunggu pengesahan; nilai yang ditandatangani langsung oleh kunci penerbit sudah final.
 */
function essayStatus (attempt, submission, review) {
  if (review) return review.decision
  if (attempt.score === null || attempt.score === undefined) return submission?.state === 'insufficient' ? 'insufficient' : 'awaitingJudge'
  return attempt.judge_model || attempt.graded_by_agent ? 'awaitingReview' : 'graded'
}

/**
 * @param manifests  manifest milik penerbit ini (dengan `course`)
 * @param priceOf    harga kursus dalam satuan terkecil token (`web/src/pricing.ts`), null = gratis
 * @param records    hasil `publisherRecords`
 */
export function overview ({ issuer, seat, manifests, priceOf, records, platformBps, split: splitAddress = null, token, members, pending, requests = [], includeTest, courseMeta = () => null }) {
  const byEnrollment = new Map(records.enrollments.map((e) => [e.id, e]))
  const paidOrders = records.orders.filter((o) => o.state === 'paid' && same(o.asset, token.address))
  const orderByEnrollment = new Map(paidOrders.map((o) => [o.enrollment_id, o]))
  const split = (amount) => {
    if (platformBps === null) return { platform: null, net: null }
    const platform = (amount * BigInt(platformBps)) / 10000n // pembulatan sama dengan `sharesOf` di kontrak (floor)
    return { platform, net: amount - platform }
  }
  const subByAttempt = new Map(records.submissions.map((s) => [s.attempt_id, s]))
  const reviewByAttempt = new Map(records.reviews.map((r) => [r.attempt_id, r]))
  const essays = records.essays.map((a) => {
    const e = byEnrollment.get(a.enrollment_id)
    const sub = subByAttempt.get(a.id)
    const rv = reviewByAttempt.get(a.id)
    return {
      attemptId: Number(a.id), courseId: e?.course_id ?? null, learner: e?.learner ?? null, lesson: a.lesson_key, attemptNo: a.attempt_no,
      status: essayStatus(a, sub, rv), words: sub?.words ?? null,
      proposed: a.score === null || a.score === undefined ? null : Number(a.score),
      proposedBy: a.graded_by_agent ? `agent:${a.graded_by_agent}` : a.judge_model ? 'model' : null,
      label: a.difficulty_label ?? null,
      review: rv ? { decision: rv.decision, finalScore: rv.final_score === null ? null : Number(rv.final_score), reviewerAgent: rv.reviewer_agent_id ?? null, at: rv.reviewed_at } : null,
      at: a.created_at,
    }
  })
  const pipeline = { awaitingJudge: 0, insufficient: 0, awaitingReview: 0, approved: 0, adjusted: 0, rejected: 0, graded: 0 }
  for (const x of essays) pipeline[x.status] = (pipeline[x.status] ?? 0) + 1

  const sumOf = (list) => list.reduce((s, x) => s + x, 0n)
  const courses = manifests.map((m) => {
    const c = m.course
    const enr = records.enrollments.filter((e) => e.course_id === c.id)
    const orders = enr.map((e) => orderByEnrollment.get(e.id)).filter(Boolean)
    const gross = sumOf(orders.map((o) => units(o.amount)))
    const s = split(gross)
    const ce = essays.filter((x) => x.courseId === c.id)
    const price = priceOf(c.id)
    // B140 (D72): kursus database membawa nomor draf terbitnya, versinya, dan status arsip — dasar tombol Sunting / Arsipkan.
    const meta = courseMeta(c.id)
    return {
      id: c.id, title: c.title, level: c.level, topic: c.topic ?? null, unlisted: c.unlisted === true,
      source: meta ? 'database' : 'file', draftId: meta?.draftId ?? null, version: meta?.version ?? null, archived: meta?.archived === true,
      price: price === null || price === undefined ? null : String(price),
      passMark: c.passMark, weights: c.weights, rubricHash: m.rubricHash ?? null,
      enrollments: enr.length, paid: orders.length, free: enr.length - orders.length,
      gross: String(gross), platform: s.platform === null ? null : String(s.platform), net: s.net === null ? null : String(s.net),
      essays: {
        awaitingJudge: ce.filter((x) => x.status === 'awaitingJudge').length,
        awaitingReview: ce.filter((x) => x.status === 'awaitingReview').length,
        reviewed: ce.filter((x) => ['approved', 'adjusted', 'rejected', 'graded'].includes(x.status)).length,
      },
      graders: records.hires.filter((h) => h.course_id === c.id).map((h) => String(h.agent_id)),
      reviewers: records.reviewers.filter((r) => r.course_id === c.id).map((r) => (r.agent_id ? `agent:${r.agent_id}` : r.reviewer)),
    }
  })

  const gross = sumOf(paidOrders.map((o) => units(o.amount)))
  const total = split(gross)
  const chargeSum = (status) => {
    const list = records.charges.filter((c) => c.status === status)
    return { count: list.length, amount: String(sumOf(list.map((c) => units(c.amount)))) }
  }
  const learners = records.enrollments.slice(0, 200).map((e) => {
    const o = orderByEnrollment.get(e.id)
    return {
      learner: e.learner, courseId: e.course_id, status: e.status, enrolledAt: e.enrolled_at, origin: e.origin,
      paid: o ? { amount: String(units(o.amount)), tx: o.tx_hash ?? null, at: o.created_at } : null,
    }
  })
  return {
    issuer, seat, includeTest, generatedAt: new Date().toISOString(),
    token, platformBps, split: splitAddress,
    totals: {
      courses: manifests.length, listedCourses: manifests.filter((m) => m.course.unlisted !== true).length,
      learners: new Set(records.enrollments.map((e) => String(e.learner).toLowerCase())).size,
      enrollments: records.enrollments.length, paidEnrollments: paidOrders.length,
      gross: String(gross), platform: total.platform === null ? null : String(total.platform), net: total.net === null ? null : String(total.net),
      essaysAwaitingReview: pipeline.awaitingReview, essaysAwaitingJudge: pipeline.awaitingJudge,
      chargesDue: chargeSum('due'), chargesPaid: chargeSum('paid'),
    },
    courses,
    learners,
    essays: { pipeline, recent: essays.slice(0, 30) },
    agents: {
      hires: records.hires.map((h) => ({
        courseId: h.course_id, agentId: String(h.agent_id), wallet: h.agent_wallet, owner: h.agent_owner, hiredBy: h.hired_by,
        byMember: Boolean(h.hired_by) && !same(h.hired_by, issuer.address), at: h.hired_at,
      })),
      reviewers: records.reviewers.map((r) => ({
        courseId: r.course_id, reviewer: r.reviewer, agentId: r.agent_id ?? null, owner: r.agent_owner ?? null, addedBy: r.added_by,
        byMember: !same(r.added_by, issuer.address), at: r.added_at,
      })),
      charges: records.charges.slice(0, 20).map((c) => ({
        id: Number(c.id), attemptId: Number(c.attempt_id), activity: c.activity, agentId: String(c.agent_id), label: c.label,
        amount: String(units(c.amount)), status: c.status, tx: c.settle_tx ?? null, at: c.created_at,
      })),
    },
    revenue: {
      orders: paidOrders.slice(0, 50).map((o) => {
        const e = byEnrollment.get(o.enrollment_id)
        const s = split(units(o.amount))
        return {
          courseId: e?.course_id ?? null, learner: e?.learner ?? null, amount: String(units(o.amount)),
          platform: s.platform === null ? null : String(s.platform), net: s.net === null ? null : String(s.net), tx: o.tx_hash ?? null, at: o.created_at,
        }
      }),
    },
    team: {
      members: members.map((m) => ({ member: m.member, canHire: m.can_hire === true, canAppoint: m.can_appoint === true, canAuthor: m.can_author === true, canPublish: m.can_publish === true, since: m.granted_at })),
      pendingRequests: pending,
      // B129 (6 Okt): daftar pengajuan yang menunggu HANYA untuk pemegang kunci penerbit (yang memutuskan); anggota hanya menerima jumlahnya.
      // Catatan pemohon adalah teks bebas dari akun lain: karakter kontrol dibuang, spasi dirapatkan, dipotong 280. Pesan + tanda tangan tidak ikut.
      requests: seat.via === 'issuer' ? requests.map((r) => ({ address: r.applicant, note: cleanNote(r.note), at: r.created_at })) : [],
    },
  }
}
