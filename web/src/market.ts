/**
 * `market.ts` — bursa agen (B138, D70): bentuk data `GET /agents/market` dan aturan konflik sewa/tunjuk yang bisa dihitung
 * halaman SEBELUM tombol ditekan. Server tetap yang memutuskan (`signer/src/agents.js`: `hire`, `appointReviewerAgent`);
 * modul ini hanya menjelaskan lebih dulu, dan `npm run verify:market` memeriksa keduanya sepakat.
 *
 * Aturan yang dicerminkan (urutan alasan = urutan yang paling berguna dibaca orang, bukan urutan pemeriksaan server):
 *   sewa penilai   hak `hire=1` · agen layak sewa · bukan agen milik/dioperasikan penyewa (B129) · bukan pengesah di kursus itu,
 *                  dan pemiliknya bukan pemilik agen pengesah di sana (B120)
 *   tunjuk pengesah hak `appoint=1` · agen layak · bukan milik/dioperasikan penunjuk · bukan penilai di kursus itu, dan pemiliknya
 *                  bukan pemilik agen penilai di sana (B120)
 */
// Lencana-B138 status=SELESAI 2026-10-03 — bentuk data bursa agen dan aturan konflik sewa/tunjuk (B120/B129) yang dihitung halaman sebelum tombol ditekan; server tetap memutuskan. Buktikan ulang: cd signer && npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Avatar } from './robot'

export type MarketAgent = {
  agentId: string
  registry: string
  name: string | null
  description: string | null
  avatar: Avatar | null
  image: string | null
  /** `grader-account` = dicetak platform untuk akun · `grader-self` = didaftarkan pemiliknya sendiri · null = agen tim / di luar Lencana */
  registrationRole: string | null
  owner: string
  wallet: string | null
  tariff: { token: string, amount: string, inPlatformToken: boolean } | null
  rateCard: { label: string, amount: string }[]
  hireable: boolean
  problem: string | null
  /** Otak yang berlaku (lolos kalibrasi, dicatat pemilik sekarang) — null bila belum ada (B135). */
  brain: {
    provider: string, model: string, modelName: string, at: string,
    calibration: { course: string, lesson: string, passMark: number, substantive: number, hollow: number, temperature: 0 | null }
  } | null
  /** `stale` = dompet agen berubah sejak disewa/ditunjuk — rute penilaian/pengesahan menolaknya sampai diulang. */
  work: { grading: { courseId: string, stale: boolean, at: string }[], reviewing: { courseId: string, stale: boolean, at: string }[] }
  /** Angka gabungan dari rekaman: penilaian, pengesahan, keputusan pengesah atas usulan agen ini, label yang dipilihnya. */
  record: { graded: number, reviews: number, verdicts: { approved: number, adjusted: number, rejected: number }, labels: Record<string, number> }
}

export type AgentMarket = {
  generatedAt: string
  chainId: number
  token: { address: string | null, symbol: string, decimals: number }
  ladder: { labels: string[], stepBps: number }
  agents: MarketAgent[]
  /** agentId yang dikenal platform tetapi tidak terbaca dari registry saat itu (dilaporkan, tidak disembunyikan). */
  unreadable: string[]
  cached: boolean
}

/** Tim agen satu kursus menurut rekaman penerbit (`agents.hires` / `agents.reviewers` di dasbor Penerbit). */
export type CourseTeam = {
  graders: { agentId: string, owner: string | null }[]
  reviewers: { agentId: string | null, owner: string | null }[]
}

export type Block =
  | 'no-permission' | 'not-hireable' | 'own-agent' | 'already'
  | 'reviewer-here' | 'same-owner-reviewer' | 'grader-here' | 'same-owner-grader'

const same = (a?: string | null, b?: string | null): boolean => Boolean(a) && Boolean(b) && String(a).toLowerCase() === String(b).toLowerCase()

/** Tim agen tiap kursus dari dasbor Penerbit (bentuk minimal supaya modul ini tidak bergantung pada `learning.ts`). */
export function teamOf (agents: { hires: { courseId: string, agentId: string, owner: string | null }[], reviewers: { courseId: string, agentId: string | null, owner: string | null }[] }, courseId: string): CourseTeam {
  return {
    graders: agents.hires.filter((x) => x.courseId === courseId).map((x) => ({ agentId: x.agentId, owner: x.owner })),
    reviewers: agents.reviewers.filter((x) => x.courseId === courseId).map((x) => ({ agentId: x.agentId, owner: x.owner })),
  }
}

/**
 * Kenapa `member` tidak bisa menyewa `a` sebagai penilai kursus ini — null = boleh (server tetap memutuskan).
 * `member` null = kunci penerbit sendiri (jalur B119: aturan milik-sendiri tidak berlaku).
 */
export function hireBlock (a: MarketAgent, courseId: string, team: CourseTeam, member: string | null, canHire: boolean): Block | null {
  if (!canHire) return 'no-permission'
  if (!a.hireable) return 'not-hireable'
  if (member && (same(a.owner, member) || same(a.wallet, member))) return 'own-agent'
  for (const r of team.reviewers) {
    if (!r.agentId) continue
    if (r.agentId === a.agentId) return 'reviewer-here'
    if (same(r.owner, a.owner)) return 'same-owner-reviewer'
  }
  // Sewa ulang agen yang dompetnya berubah memang perlu (penilaiannya ditolak 409 sampai itu) — hanya yang masih segar "sudah".
  const here = a.work.grading.find((g) => g.courseId === courseId)
  if (here && !here.stale) return 'already'
  return null
}

/** Kenapa `member` tidak bisa menunjuk `a` sebagai pengesah kursus ini — null = boleh (server tetap memutuskan). */
export function appointBlock (a: MarketAgent, courseId: string, team: CourseTeam, member: string | null, canAppoint: boolean): Block | null {
  if (!canAppoint) return 'no-permission'
  if (!a.hireable) return 'not-hireable'
  if (member && (same(a.owner, member) || same(a.wallet, member))) return 'own-agent'
  for (const g of team.graders) {
    if (g.agentId === a.agentId) return 'grader-here'
    if (same(g.owner, a.owner)) return 'same-owner-grader'
  }
  const here = a.work.reviewing.find((r) => r.courseId === courseId)
  if (here && !here.stale) return 'already'
  return null
}

export type MarketSort = 'experience' | 'price' | 'newest'
export type MarketFilter = { q?: string, hireableOnly?: boolean, brainOnly?: boolean, sort?: MarketSort }

/** Tarif dasar (satuan terkecil token) — null bila belum ada tarif. */
export const baseTariff = (a: MarketAgent): bigint | null => (a.tariff ? BigInt(a.tariff.amount) : null)

/** Saring + urutkan etalase. `q` cocok dengan nama atau nomor agen (dengan atau tanpa `#`). */
export function marketView (agents: MarketAgent[], f: MarketFilter = {}): MarketAgent[] {
  const q = (f.q ?? '').trim().toLowerCase().replace(/^#/, '')
  const list = agents.filter((a) => (!f.hireableOnly || a.hireable) && (!f.brainOnly || a.brain)
    && (!q || a.agentId.includes(q) || (a.name ?? '').toLowerCase().includes(q)))
  const byId = (x: MarketAgent, y: MarketAgent) => Number(y.agentId) - Number(x.agentId)
  const sorters: Record<MarketSort, (x: MarketAgent, y: MarketAgent) => number> = {
    experience: (x, y) => (y.record.graded + y.record.reviews) - (x.record.graded + x.record.reviews) || byId(x, y),
    price: (x, y) => {
      const a = baseTariff(x)
      const b = baseTariff(y)
      if (a === null || b === null) return a === b ? byId(x, y) : a === null ? 1 : -1
      return a === b ? byId(x, y) : a < b ? -1 : 1
    },
    newest: byId,
  }
  return [...list].sort(sorters[f.sort ?? 'experience'])
}
