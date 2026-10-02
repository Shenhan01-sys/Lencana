/**
 * `src/agents.js` — agen penilai sewaan (B119) dan reviewer agen (B120): lem antara registry
 * ERC-8004 di chain, database, dan rel bayar x402. Keputusan builder D53 + D54 (1 Okt).
 *
 * Satu aturan yang dipegang di semua fungsi: **fakta tentang agen dibaca dari registry, bukan dari
 * kiriman siapa pun** — dompetnya, pemiliknya, berkas registrasinya, dan tarif dasarnya. Yang datang
 * dari kiriman hanya tanda tangan dan apa yang ditandatangani.
 *
 * Model D54 (opsi B): penerbit tetap attester. Agen menilai dan dibayar; ia tidak menandatangani
 * kredensial, tidak mencabut, dan tidak boleh sama dengan penerbit — dompet maupun pemiliknya.
 */

// Lencana-B119 status=SELESAI 2026-10-01 — sewa agen, penilaian agen, tagihan per aktivitas dan pembayarannya lewat x402 ke dompet agen; fakta agen dibaca dari registry ERC-8004. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B120 status=SELESAI 2026-10-01 — penunjukan reviewer agen: identitas ERC-8004 yang berbeda agentId DAN berbeda Agent Owner dari setiap agen penilai yang disewa untuk kursus itu; aktivitas pengesahannya ikut ditagih. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B120 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http, getAddress, isAddress } from 'viem'

import { readAgent, REGISTRATION_TYPE, ERC8004, identityAbi } from './erc8004.js'
import { priceFor, rateCard, LADDER, LADDER_HASH } from './pricing.js'
import {
  hireAgent, agentHire, agentHiresFor, reviewerAgentsFor, agentJudgeEssay, addReviewer, insertCharge, getCharge, markChargePaid,
} from './db.js'
import { settlePayment } from './x402.js'

const fail = (status, why) => ({ ok: false, status, why })
const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

function clientOf (cfg) {
  return createPublicClient({ transport: http(cfg.rpcUrl) })
}

/** Identitas agen yang layak disewa: ada, registrasinya sah dan menunjuk balik, punya dompet dan tarif. */
export async function agentFacts (cfg, agentId) {
  if (!/^\d+$/.test(String(agentId ?? ''))) return fail(422, 'agentId must be a non-negative integer')
  const a = await readAgent(clientOf(cfg), { chainId: cfg.chainId, agentId })
  if (!a.ok) return fail(404, a.why)
  if (a.registrationType !== REGISTRATION_TYPE || !a.pointsBack) return fail(422, `agent ${agentId} registration file is missing or does not point back to it`)
  if (!a.wallet) return fail(422, `agent ${agentId} has no agentWallet`)
  if (!a.tariff) return fail(422, `agent ${agentId} has published no base tariff (metadata lencana.baseTariff)`)
  if (cfg.token && !same(a.tariff.token, cfg.token)) return fail(422, `agent ${agentId} tariff is in ${a.tariff.token}, not the token this platform settles in`)
  if (same(a.wallet, cfg.publisher) || same(a.owner, cfg.publisher)) return fail(422, `agent ${agentId} is controlled by the publisher — under D54 the publisher stays the attester and the agent is a separate party`)
  return { ok: true, agent: a }
}

/**
 * Agen yang NFT identitasnya dimiliki `address` (B128): peran Agent Owner dibaca dari `ownerOf` di registry ERC-8004,
 * bukan dari tombol atau tabel. Registry tidak bisa ditanya "milik siapa saja", jadi yang diperiksa adalah daftar agen
 * yang dikenal platform (agen penerbit di manifest + yang pernah disewa/ditunjuk); agen yang gagal dibaca dilewati.
 */
export async function agentsOwnedBy (cfg, address, agentIds) {
  if (!isAddress(String(address ?? ''))) return []
  const client = clientOf(cfg)
  const registry = ERC8004[cfg.chainId]?.identity
  if (!registry) return []
  // Dua tahap supaya akun yang tidak memiliki agen (kebanyakan) cukup satu putaran ke RPC: `ownerOf` semua agen
  // serentak, lalu baca lengkap (dompet, tarif) hanya untuk yang dimiliki alamat ini. Diukur 2 Okt: 1,6–4,2 detik → lihat T50.
  const ids = [...new Set(agentIds.map(String))].filter((id) => /^\d+$/.test(id))
  const owners = await Promise.all(ids.map((id) => client.readContract({ address: registry, abi: identityAbi, functionName: 'ownerOf', args: [BigInt(id)] }).catch(() => null)))
  const owned = ids.filter((_, i) => same(owners[i], address))
  const read = await Promise.all(owned.map(async (id) => {
    const a = await readAgent(client, { chainId: cfg.chainId, agentId: id }).catch(() => null)
    if (!a?.ok || !same(a.owner, address)) return null
    return {
      agentId: a.agentId, registry: a.registry, wallet: a.wallet ?? null,
      tariff: a.tariff ? { token: a.tariff.token, amount: a.tariff.amount.toString() } : null,
    }
  }))
  return read.filter((x) => x !== null)
}

/** Tabel harga satu agen: tarif dasar Agent Owner × tangga Lencana. */
export async function rates (cfg, agentId) {
  const f = await agentFacts(cfg, agentId)
  if (!f.ok) return f
  return {
    ok: true, status: 200, agentId: f.agent.agentId, registry: f.agent.registry, owner: f.agent.owner, wallet: f.agent.wallet,
    token: f.agent.tariff.token, baseTariff: f.agent.tariff.amount.toString(), ladder: LADDER, ladderHash: LADDER_HASH,
    rateCard: rateCard(f.agent.tariff.amount),
  }
}

export async function hire (cfg, body, knownCourse) {
  if (!knownCourse(body?.course)) return fail(404, `course ${body?.course} is not in the catalogue`)
  if (!same(body?.publisher, cfg.publisher)) return fail(401, `agents are hired by the configured publisher (${cfg.publisher})`)
  const f = await agentFacts(cfg, body?.agentId)
  if (!f.ok) return f
  // B120, arah sebaliknya: aturan "penilai ≠ reviewer" dijaga saat menyewa JUGA, bukan hanya saat
  // menunjuk reviewer. Tanpa ini, menunjuk reviewer dulu lalu menyewanya sebagai penilai lolos —
  // dan itu terjadi sungguhan 1 Okt (baris residu dari run harness pertama, dicatat di T37).
  for (const rv of await reviewerAgentsFor(body.course)) {
    if (String(rv.agent_id) === f.agent.agentId) return fail(422, `agent ${f.agent.agentId} is appointed as a reviewer for this course — it cannot also grade here`)
    if (same(rv.agent_owner, f.agent.owner)) return fail(422, `agent ${f.agent.agentId} has the same Agent Owner as reviewer agent ${rv.agent_id}`)
  }
  const out = await hireAgent({ courseId: body.course, agent: f.agent, publisher: cfg.publisher, message: body.message, signature: body.signature })
  if (!out.ok) return fail(out.kind === 'auth' ? 401 : 422, out.why)
  return { ok: true, status: 200, ...out, baseTariff: f.agent.tariff.amount.toString(), token: f.agent.tariff.token }
}

async function chargeFor ({ attemptId, activity, agent, label }) {
  const amount = priceFor(agent.tariff.amount, label)
  return insertCharge({
    attempt_id: attemptId, activity, agent_id: String(agent.agentId), agent_wallet: getAddress(agent.wallet), agent_owner: getAddress(agent.owner),
    label, base_amount: agent.tariff.amount.toString(), step_bps: LADDER.stepBps, amount: amount.toString(),
    token: getAddress(agent.tariff.token), ladder_hash: LADDER_HASH,
  })
}

/** Penilaian oleh agen sewaan, lalu tagihannya. Agen harus disewa untuk kursus itu dan dompetnya masih sama. */
export async function agentJudge (cfg, body, found) {
  const hireRow = await agentHire(body.course, body.agentId)
  if (!hireRow) return fail(403, `agent ${body.agentId} is not hired for ${body.course}`)
  const f = await agentFacts(cfg, body.agentId)
  if (!f.ok) return f
  if (!same(f.agent.wallet, hireRow.agent_wallet)) return fail(409, `agent ${body.agentId} changed its agentWallet since it was hired — the publisher must hire it again`)
  const out = await agentJudgeEssay({
    attemptId: body.attemptId, courseId: body.course, agent: { agentId: f.agent.agentId, wallet: f.agent.wallet },
    scores: body.scores, essay: found.lesson.essay, passMark: found.manifest.course.passMark,
    judgeModel: body.judgeModel, judgeTemp: body.judgeTemp, message: body.message, signature: body.signature,
  })
  if (!out.ok) return fail(out.kind === 'auth' ? 401 : 422, out.why)
  const charge = await chargeFor({ attemptId: out.attemptId, activity: 'grade', agent: f.agent, label: out.label })
  return { ok: true, status: 200, ...out, agentId: f.agent.agentId, charge }
}

/** B120 — penunjukan reviewer agen: agen lain, pemilik lain, dari setiap penilai yang disewa kursus itu. */
export async function appointReviewerAgent (cfg, body) {
  const graderHires = await agentHiresFor(body?.course)
  const f = await agentFacts(cfg, body?.agentId)
  if (!f.ok) return f
  if (!isAddress(String(body?.reviewer ?? '')) || !same(body.reviewer, f.agent.wallet)) {
    return fail(422, `reviewer ${body?.reviewer} is not the agentWallet of agent ${body?.agentId} (${f.agent.wallet})`)
  }
  for (const g of graderHires) {
    if (String(g.agent_id) === f.agent.agentId) return fail(422, `agent ${f.agent.agentId} is hired as a grader for this course — it cannot review its own kind of work here`)
    if (same(g.agent_owner, f.agent.owner)) return fail(422, `agent ${f.agent.agentId} has the same Agent Owner as grader agent ${g.agent_id}`)
  }
  const out = await addReviewer({
    courseId: body.course, reviewer: f.agent.wallet, issuer: body.issuer, message: body.message, signature: body.signature,
    agent: { agentId: f.agent.agentId, owner: f.agent.owner },
  })
  if (!out.ok) return fail(out.kind === 'auth' ? 401 : 422, out.why)
  return { ok: true, status: 200, ...out, agentOwner: f.agent.owner }
}

/** Sesudah pengesahan yang sah: kalau pengesahnya agen, aktivitasnya ditagih. */
export async function chargeReview (cfg, review) {
  if (!review?.reviewerAgent) return null
  const f = await agentFacts(cfg, review.reviewerAgent.agentId)
  if (!f.ok) return { error: f.why }
  return chargeFor({ attemptId: review.attemptId, activity: 'review', agent: f.agent, label: review.label })
}

/**
 * Bayar satu tagihan lewat x402: `payTo` = kontrak pembagian, `payee` = dompet agen. Penolakan
 * terjadi sebelum gas: tagihan harus `due`, token dan tujuan harus milik kita, jumlah ≥ tagihan.
 */
export async function payCharge (cfg, id, payment) {
  const charge = await getCharge(id)
  if (!charge) return fail(404, `no agent charge ${id}`)
  if (charge.status !== 'due') return fail(409, `charge ${id} is already ${charge.status}`)
  const p = payment?.payload ?? {}
  if (!same(p.token, charge.token)) return fail(402, 'payment token is not the token this charge is due in')
  if (!same(p.payTo, cfg.split)) return fail(402, 'payment is not addressed to our split contract')
  let amount
  try { amount = BigInt(p.amount ?? -1) } catch { return fail(402, 'payment amount is not an integer') }
  if (amount < BigInt(charge.amount)) return fail(402, `amount below the charge (${charge.amount})`)
  if (Number(p.deadline ?? 0) * 1000 < Date.now()) return fail(402, 'payment has expired')
  if (!p.eip2612 || !p.witnessSig || !isAddress(String(p.payer ?? ''))) return fail(402, 'payment payload carries no signatures or payer')
  const settled = await settlePayment({
    rpcUrl: cfg.rpcUrl, facilitatorPk: cfg.facilitatorPk, payment, split: cfg.split, payee: charge.agent_wallet,
    splitRefSalt: `agent-charge:${charge.id}:${p.nonce}`,
  })
  const paid = await markChargePaid({ id: charge.id, payer: p.payer, settleTx: settled.settleTx, splitTx: settled.splitTx })
  if (!paid) return fail(409, `charge ${id} was settled on chain (${settled.settleTx}) but was no longer due in the database`)
  return { ok: true, status: 200, charge: paid, settled }
}

export { getCharge }
