/**
 * `src/market.js` — bursa agen untuk dasbor Penerbit (B138, D70): daftar agen yang dikenal platform dengan fakta registry
 * (pemilik, dompet, tarif, rupa) yang dibaca saat itu juga, otak tercatat (B135), dan angka gabungan dari rekaman.
 *
 * Yang sengaja TIDAK ada di jawaban: teks esai, alamat peserta, alamat penyewa/penunjuk, pesan + tanda tangan, uang tagihan.
 * Bursa menjawab "agen mana, berapa, otaknya apa, seberapa teruji, kerja di mana" — bukan siapa membayar siapa.
 *
 * Cache 60 detik (membaca registry = 4 panggilan RPC per agen), dengan satu permintaan baca yang sedang berjalan dipakai
 * bersama; dibatalkan saat sewa, penunjukan, otak, atau klaim agen berubah lewat rute signer ini.
 */
// Lencana-B138 status=TERBUKA 2026-10-03 — bursa agen: entri per agen (fakta registry saat itu + otak tercatat + angka gabungan; tanpa teks esai/alamat peserta/tanda tangan), cache 60 detik dengan permintaan bersama dan pembatalan saat sewa/tunjuk/otak/klaim berubah. Buktikan ulang: npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http } from 'viem'

import { readAgent } from './erc8004.js'
import { hireProblem } from './agents.js'
import { rateCard, LADDER } from './pricing.js'
import { marketRecords } from './db.js'
import { parseAvatar, AVATAR_KEY } from '../../web/src/robot.ts'

const same = (a, b) => Boolean(a) && Boolean(b) && String(a).toLowerCase() === String(b).toLowerCase()
/** Teks dari berkas registrasi di chain: siapa pun bisa menulisnya — dipotong dan dibersihkan karakter kendali. */
const cleanText = (s, max) => (typeof s === 'string' && s.trim() ? s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : null)

export const MARKET_TTL_MS = 60_000

/** Satu entri bursa (fungsi murni): `a` = hasil `readAgent`, `rec` = hasil `marketRecords`. */
export function marketEntry (cfg, a, rec) {
  const id = String(a.agentId)
  const minted = rec.minted.find((r) => String(r.agent_id) === id) ?? null
  const b = rec.brains.find((r) => String(r.agent_id) === id) ?? null
  const problem = hireProblem(cfg, a)
  const graded = rec.graded.filter((g) => String(g.graded_by_agent) === id)
  const reviews = rec.reviews.filter((r) => String(r.reviewer_agent_id) === id)
  const labels = Object.fromEntries(LADDER.labels.map((l) => [l, 0]))
  for (const x of [...graded, ...reviews]) if (x.difficulty_label && x.difficulty_label in labels) labels[x.difficulty_label] += 1
  const verdicts = { approved: 0, adjusted: 0, rejected: 0 }
  for (const v of rec.verdicts) if (String(v.attempts?.graded_by_agent ?? '') === id && v.decision in verdicts) verdicts[v.decision] += 1
  // Otak hanya diiklankan bila berlaku: lolos kalibrasi DAN dicatat pemilik yang sekarang (sesudah NFT pindah, catat ulang).
  const brainValid = Boolean(b?.passed) && same(b.owner, a.owner)
  return {
    agentId: id,
    registry: a.registry,
    name: cleanText(a.registration?.name, 60),
    description: cleanText(a.registration?.description, 400),
    avatar: parseAvatar(a.registration?.[AVATAR_KEY]),
    image: typeof a.registration?.image === 'string' && a.registration.image.startsWith('data:image/svg+xml') && a.registration.image.length <= 12_000 ? a.registration.image : null,
    registrationRole: minted?.role ?? null,
    owner: a.owner,
    wallet: a.wallet ?? null,
    tariff: a.tariff ? { token: a.tariff.token, amount: a.tariff.amount.toString(), inPlatformToken: !cfg.token || same(a.tariff.token, cfg.token) } : null,
    rateCard: a.tariff ? rateCard(a.tariff.amount) : [],
    hireable: problem === null,
    problem,
    brain: brainValid ? { provider: b.provider, model: b.model, modelName: `${b.provider}/${b.model}`, calibration: b.calibration, at: b.updated_at } : null,
    work: {
      grading: rec.hires.filter((h) => String(h.agent_id) === id).map((h) => ({ courseId: h.course_id, stale: !same(h.agent_wallet, a.wallet), at: h.hired_at })),
      reviewing: rec.reviewers.filter((r) => String(r.agent_id) === id).map((r) => ({ courseId: r.course_id, stale: !same(r.reviewer, a.wallet), at: r.added_at })),
    },
    record: { graded: graded.length, reviews: reviews.length, verdicts, labels },
  }
}

let cache = null
let inflight = null
let generation = 0

/** Dipanggil rute yang mengubah isi bursa (sewa, tunjuk, otak, klaim) — permintaan berikutnya membaca ulang. */
export function invalidateMarket () {
  cache = null
  generation += 1
}

/**
 * @param ids   agentId yang dikenal platform (agen penerbit di manifest + `knownAgentIds`)
 * @param meta  `{ chainId, token: { address, symbol, decimals } }` untuk ditampilkan apa adanya
 */
export async function agentMarket (cfg, ids, meta) {
  if (cache && Date.now() - cache.at < MARKET_TTL_MS) return { ...cache.data, cached: true }
  if (inflight) return inflight
  const gen = generation
  inflight = (async () => {
    const client = createPublicClient({ transport: http(cfg.rpcUrl, { timeout: 20_000, retryCount: 1 }) })
    const unique = [...new Set(ids.map(String))].filter((x) => /^\d{1,12}$/.test(x))
    const read = await Promise.all(unique.map((id) => readAgent(client, { chainId: cfg.chainId, agentId: id }).catch(() => null)))
    const ok = read.filter((a) => a?.ok)
    const rec = await marketRecords(ok.map((a) => a.agentId))
    const data = {
      generatedAt: new Date().toISOString(),
      chainId: meta.chainId,
      token: meta.token,
      ladder: { labels: LADDER.labels, stepBps: LADDER.stepBps },
      agents: ok.map((a) => marketEntry(cfg, a, rec)),
      unreadable: unique.filter((id) => !ok.some((a) => a.agentId === id)),
      cached: false,
    }
    // Pembatalan selama pembacaan berlangsung menang: hasil ini tetap dijawab, tetapi tidak disimpan sebagai cache.
    if (gen === generation) cache = { at: Date.now(), data }
    return data
  })().finally(() => { inflight = null })
  return inflight
}
