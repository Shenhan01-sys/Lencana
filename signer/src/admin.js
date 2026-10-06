// Lencana-B172 status=SELESAI 2026-10-06 — halaman Admin punya ringkasan platform, jejak keputusan keanggotaan, dan kesehatan sistem (hanya-baca, tanpa wewenang baru): bahan dibentuk di sini dari angka yang sudah ada (ringkasan penerbit, baris keanggotaan + pengajuan, kuota, saldo deployer); penandatangan tiap keputusan DIPULIHKAN dari pesan + tanda tangan tersimpan, bukan dipercaya dari kolom. Buktikan ulang: cd signer && npm run verify:publisher (grup G) dan uji peramban T96. JANGAN dibalik/diulang tanpa membuka kembali B172.
/**
 * `src/admin.js` — bahan dasbor Admin Lencana (B172), murni fungsi: tanpa jaringan, tanpa database, supaya bentuknya diuji harness.
 *
 *   buildTrail   jejak keputusan keanggotaan: pengajuan, hibah, penolakan, pencabutan — terbaru dulu. Tabelnya menyimpan SATU baris per
 *                anggota (hibah ulang menimpa baris lama), jadi jejak ini adalah keputusan terakhir per akun, bukan sejarah penuh.
 *   shapeSummary angka ringkasan platform dari `overview()` penerbit (angka yang sama dengan dasbor Penerbit, tanpa baris harness).
 */
import { getAddress, recoverMessageAddress } from 'viem'
import { cleanNote } from './publisher.js'

const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase()

/** Alamat penanda tangan pesan, dipulihkan dari tanda tangannya; null bila pesan atau tanda tangan tidak terbaca. */
export async function signerOf (message, signature) {
  if (typeof message !== 'string' || typeof signature !== 'string') return null
  try { return getAddress(await recoverMessageAddress({ message, signature })) } catch { return null }
}

/**
 * @param grants    baris `publisher_members` (aktif maupun dicabut)
 * @param requests  baris `member_requests`
 * @param issuer    alamat penerbit (kunci penerbit)
 * @param admins    Set alamat admin huruf kecil
 * @returns         kejadian terbaru dulu: { at, kind: requested|granted|rejected|revoked, who, by, byRole, perms?, note?, message, signature, test }
 */
export async function buildTrail ({ grants, requests, issuer, admins, limit = 60 }) {
  const ev = []
  for (const r of requests) {
    ev.push({ at: r.created_at, kind: 'requested', who: r.applicant, note: cleanNote(r.note), message: r.message, signature: r.signature, origin: r.origin })
    // Pengajuan yang disetujui tidak dicatat dua kali: hibahnya sendiri adalah kejadiannya.
    if (r.status === 'rejected' && r.decided_at) ev.push({ at: r.decided_at, kind: 'rejected', who: r.applicant, message: r.decided_message, signature: r.decided_signature, origin: r.origin })
  }
  for (const g of grants) {
    ev.push({
      at: g.granted_at, kind: 'granted', who: g.member, message: g.message, signature: g.signature, origin: g.origin,
      perms: { hire: g.can_hire === true, appoint: g.can_appoint === true, author: g.can_author === true, publish: g.can_publish === true },
    })
    if (g.revoked_at) ev.push({ at: g.revoked_at, kind: 'revoked', who: g.member, message: g.revoke_message, signature: g.revoke_signature, origin: g.origin })
  }
  ev.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  return Promise.all(ev.slice(0, limit).map(async (e) => {
    const by = await signerOf(e.message, e.signature)
    const byRole = by === null ? null : admins.has(by.toLowerCase()) ? 'admin' : same(by, issuer) ? 'publisher' : same(by, e.who) ? 'self' : 'other'
    const { origin, ...rest } = e
    return { ...rest, by, byRole, test: origin === 'test' }
  }))
}

/**
 * Ringkasan platform dari `overview()` penerbit. Uang = satuan terkecil token (string) + `platformBps` dari chain; null bila tidak terbaca.
 * @param ov        keluaran `overview()` (publisher.js)
 * @param agentIds  agen yang dikenal platform
 * @param members   anggota aktif
 * @param requests  pengajuan menunggu
 */
export function shapeSummary ({ ov, agentIds, members, requests }) {
  const t = ov.totals
  return {
    members: { active: members.length, pending: requests.length },
    courses: { total: t.courses, listed: t.listedCourses },
    learners: { unique: t.learners, enrollments: t.enrollments, paid: t.paidEnrollments, free: t.enrollments - t.paidEnrollments },
    money: { token: ov.token, platformBps: ov.platformBps, gross: t.gross, platform: t.platform, net: t.net, chargesDue: t.chargesDue, chargesPaid: t.chargesPaid },
    essays: { awaitingJudge: t.essaysAwaitingJudge, awaitingReview: t.essaysAwaitingReview, pipeline: ov.essays.pipeline },
    agents: { known: agentIds.length, hires: ov.agents.hires.length, reviewers: ov.agents.reviewers.length },
  }
}

/** Ambang saldo gas deployer di bawah ini ditandai rendah di halaman (0,02 tBNB: puluhan tetes gas + penyelesaian bayar). */
export const DEPLOYER_LOW_WEI = 20_000_000_000_000_000n

/** Kesehatan sistem untuk halaman Admin: hanya angka dan status, tanpa kunci, alamat admin, atau IP. */
export function shapeHealth ({ startedAt, chainId, db, rpc, deployer, quotas, paywall, admins }) {
  return {
    startedAt, chainId, db, rpc, paywall, admins,
    deployer: deployer ? { ...deployer, low: deployer.balanceWei === null ? null : BigInt(deployer.balanceWei) < DEPLOYER_LOW_WEI, lowWei: String(DEPLOYER_LOW_WEI) } : null,
    quotas,
  }
}
