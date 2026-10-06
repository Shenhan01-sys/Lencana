/**
 * `src/owner.js` — dasbor Agent Owner (B130, RF7 langkah C3, D65): dari identitas di registry ERC-8004 dan baris
 * database ke angka yang dibaca pemilik agen. Aturan yang sama dengan dasbor penerbit: setiap angka bisa ditelusuri —
 * identitas, dompet, dan tarif dari chain saat itu juga; sewa dan penunjukan dari `agent_hires`/`review_roles`; aktivitas
 * dari `attempts.graded_by_agent` dan `judgement_reviews.reviewer_agent_id`; uang dari `agent_charges` (dibayar ke dompet
 * agen pada saat tagihan dibuat — kolom `agent_wallet`).
 *
 * Model D65 (pilihan builder 2 Okt): platform mencetak identitas lalu memindahkannya ke akun; spesifikasi EIP-8004
 * mengosongkan `agentWallet` saat pemindahan, dan pemilik mengisinya lagi dengan dompet akunnya sendiri. Dasbor
 * melaporkan keadaan itu apa adanya: dompet kosong = belum bisa disewa, dengan alasannya.
 */
// Lencana-B130 status=SELESAI 2026-10-02 — dasbor Agent Owner dihitung dari identitas di registry + baris sewa/penunjukan/aktivitas/tagihan, dengan alasan layak-sewa yang sama dengan rute sewa; dompet agen kosong sesudah pemindahan dilaporkan, bukan disembunyikan. Buktikan ulang: npm run verify:owner. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseEther, parseAbi, parseAbiItem, decodeEventLog } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { rateCard, LADDER } from './pricing.js'
import { parseAvatar, AVATAR_KEY } from '../../web/src/robot.ts'
import { historyRpcs, receiptFromHistory } from './chain-history.js'

const same = (a, b) => String(a ?? '').toLowerCase() === String(b ?? '').toLowerCase()

/** Ambang "gas menipis" untuk transaksi pemilik (setAgentWallet / setMetadata ±50–100 ribu gas) dan jumlah tetesnya. */
export const GAS_LOW = parseEther('0.0005')
export const GAS_DRIP = parseEther('0.001')

export async function nativeBalance (rpcUrl, address) {
  return createPublicClient({ transport: http(rpcUrl, { timeout: 15_000, retryCount: 1 }) }).getBalance({ address })
}

/**
 * Platform mengisi gas pemilik agen (testnet) — sama dengan kebiasaan `npm run agent:identity` yang mengisi gas Agent
 * Owner. Menunggu struk supaya saldo yang dilaporkan sesudahnya benar.
 */
export async function sendGasDrip ({ rpcUrl, pk, to, value = GAS_DRIP }) {
  const account = privateKeyToAccount(pk)
  const pub = createPublicClient({ transport: http(rpcUrl, { timeout: 20_000, retryCount: 1 }) })
  const chainId = await pub.getChainId()
  const chain = { id: chainId, name: `chain-${chainId}`, nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 }, rpcUrls: { default: { http: [rpcUrl] } } }
  const wallet = createWalletClient({ account, chain, transport: http(rpcUrl) })
  const hash = await wallet.sendTransaction({ to, value })
  const r = await pub.waitForTransactionReceipt({ hash, timeout: 60_000 })
  if (r.status !== 'success') throw new Error(`gas drip reverted: ${hash}`)
  return { tx: hash, balance: await pub.getBalance({ address: to }) }
}
const units = (x) => { try { return BigInt(String(x ?? '0').split('.')[0]) } catch { return 0n } }

// Lencana-B132 status=SELESAI 2026-10-03 — agen yang didaftarkan pemiliknya sendiri dikenal platform hanya sesudah struk transaksinya dibaca dari chain: register() ke registry ERC-8004, event Registered menyebut agentId itu dengan pemilik = akun, dan ownerOf sekarang masih akun itu. Buktikan ulang: npm run verify:studio. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
const REGISTERED = parseAbiItem('event Registered(uint256 indexed agentId, string agentURI, address indexed owner)')
/**
 * Bukti bahwa `owner` mendaftarkan `agentId` sendiri lewat `txHash`: struk sukses, ditujukan ke registry, memuat event
 * `Registered(agentId, …, owner)`, dan `ownerOf(agentId)` = `owner` saat ini. Tidak ada yang dipercaya dari kiriman halaman.
 */
export async function verifySelfRegistration ({ rpcUrl, registry, agentId, txHash, owner }) {
  if (!/^0x[0-9a-fA-F]{64}$/.test(String(txHash ?? ''))) return { ok: false, status: 400, why: 'registerTx must be a transaction hash' }
  if (!/^\d+$/.test(String(agentId ?? ''))) return { ok: false, status: 400, why: 'agentId must be a number' }
  const pub = createPublicClient({ transport: http(rpcUrl, { timeout: 20_000, retryCount: 1 }) })
  // B136: struk lama dibaca dari RPC utama lalu cadangan (publicnode tidak konsisten untuk riwayat); galat RPC ≠ "tidak ada".
  const chainId = await pub.getChainId().catch(() => null)
  if (chainId === null) return { ok: false, status: 503, why: 'the chain could not be read right now (RPC error) — try again' }
  const got = await receiptFromHistory(historyRpcs(rpcUrl, chainId), chainId, txHash)
  if (!got.ok) {
    return got.kind === 'missing'
      ? { ok: false, status: 400, why: 'transaction not found on this chain (yet)' }
      : { ok: false, status: 503, why: `the chain could not be read right now (RPC error: ${got.why.slice(0, 120)}) — try again` }
  }
  const receipt = got.value
  if (receipt.status !== 'success') return { ok: false, status: 400, why: 'transaction reverted' }
  if (String(receipt.to ?? '').toLowerCase() !== String(registry).toLowerCase()) return { ok: false, status: 400, why: 'transaction was not sent to the ERC-8004 identity registry' }
  const ev = receipt.logs
    .filter((l) => String(l.address).toLowerCase() === String(registry).toLowerCase())
    .map((l) => { try { return decodeEventLog({ abi: [REGISTERED], data: l.data, topics: l.topics }) } catch { return null } })
    .find((d) => d && String(d.args.agentId) === String(agentId))
  if (!ev) return { ok: false, status: 400, why: `no Registered event for agent ${agentId} in this transaction` }
  if (String(ev.args.owner).toLowerCase() !== String(owner).toLowerCase()) return { ok: false, status: 403, why: 'this agent was registered by another address' }
  const now = await pub.readContract({ address: registry, abi: parseAbi(['function ownerOf(uint256) view returns (address)']), functionName: 'ownerOf', args: [BigInt(agentId)] }).catch(() => null)
  if (String(now ?? '').toLowerCase() !== String(owner).toLowerCase()) return { ok: false, status: 403, why: 'this account no longer owns the agent' }
  return { ok: true, agentId: String(agentId), registerTx: txHash, block: Number(receipt.blockNumber) }
}

/**
 * @param owned    hasil `ownedAgentFacts`: [{ agent, problem }]
 * @param records  hasil `ownerRecords`
 * @param minted   baris `platform_agents` untuk agen-agen itu
 * @param balance  saldo native (wei) alamat pemilik, untuk gas transaksi pemilik
 * @param brains   baris `agent_brains` untuk agen-agen itu (B135) — tanpa pesan + tanda tangan
 */
export function ownerOverview ({ address, owned, records, minted, balance, gasLow, token, chainId, publisher = null, brains = [] }) {
  const agents = owned.map(({ agent: a, problem }) => {
    const id = String(a.agentId)
    const charges = records.charges.filter((c) => String(c.agent_id) === id)
    const sum = (status) => {
      const list = charges.filter((c) => c.status === status)
      return { count: list.length, amount: String(list.reduce((s, c) => s + units(c.amount), 0n)) }
    }
    const graded = records.graded.filter((g) => String(g.graded_by_agent) === id)
    const reviews = records.reviews.filter((r) => String(r.reviewer_agent_id) === id)
    // Sebaran label tingkat berat yang dipilih agen ini — tujuh anak tangga, urutan tangga Lencana.
    const labels = Object.fromEntries(LADDER.labels.map((l) => [l, 0]))
    for (const x of [...graded, ...reviews]) if (x.difficulty_label && x.difficulty_label in labels) labels[x.difficulty_label] += 1
    const m = minted.find((r) => String(r.agent_id) === id) ?? null
    const b = brains.find((r) => String(r.agent_id) === id) ?? null
    return {
      agentId: id, registry: a.registry,
      name: a.registration?.name ?? null, description: a.registration?.description ?? null, pointsBack: a.pointsBack,
      // B132: rupa robot dari berkas registrasi di chain (divalidasi; bidang asing = tidak ada rupa) + gambarnya bila SVG data URI.
      avatar: parseAvatar(a.registration?.[AVATAR_KEY]),
      image: typeof a.registration?.image === 'string' && a.registration.image.startsWith('data:image/svg+xml') && a.registration.image.length <= 12_000 ? a.registration.image : null,
      // Peran berkas registrasi untuk templat (agen cetakan platform / didaftarkan pemiliknya sendiri).
      registrationRole: m?.role ?? null,
      wallet: a.wallet ?? null,
      walletState: !a.wallet ? 'unset' : same(a.wallet, address) ? 'owner' : 'other',
      tariff: a.tariff ? { token: a.tariff.token, amount: a.tariff.amount.toString(), inPlatformToken: !token.address || same(a.tariff.token, token.address) } : null,
      rateCard: a.tariff ? rateCard(a.tariff.amount) : [],
      hireable: problem === null, problem,
      hires: records.hires.filter((h) => String(h.agent_id) === id).map((h) => ({
        courseId: h.course_id, hiredBy: h.hired_by, byPublisherKey: Boolean(publisher) && same(h.hired_by, publisher), at: h.hired_at, walletAtHire: h.agent_wallet,
        // Rute penilaian menolak (409) kalau dompet agen berubah sejak disewa — penerbit harus menyewa ulang.
        stale: !same(h.agent_wallet, a.wallet),
      })),
      appointments: records.reviewers.filter((r) => String(r.agent_id) === id).map((r) => ({
        courseId: r.course_id, reviewer: r.reviewer, addedBy: r.added_by, byPublisherKey: Boolean(publisher) && same(r.added_by, publisher), at: r.added_at, stale: !same(r.reviewer, a.wallet),
      })),
      activity: { graded: graded.length, reviews: reviews.length, labels },
      charges: {
        due: sum('due'), paid: sum('paid'),
        recent: charges.slice(0, 15).map((c) => ({
          id: Number(c.id), activity: c.activity, label: c.label, amount: String(units(c.amount)), status: c.status,
          paidTo: c.agent_wallet, tx: c.settle_tx ?? null, at: c.created_at,
        })),
      },
      minted: m ? { by: m.minted_by, registerTx: m.register_tx, transferTx: m.transfer_tx, gasTx: m.gas_tx, ownerTo: m.owner_to, at: m.created_at } : null,
      // B135 (D69): otak yang tercatat — provider/model + kalibrasi yang dilaporkan pemilik. Catatan pemilik lama tidak berlaku.
      brain: b ? {
        provider: b.provider, model: b.model, modelName: `${b.provider}/${b.model}`, calibration: b.calibration, passed: Boolean(b.passed),
        at: b.updated_at, byCurrentOwner: same(b.owner, address),
      } : null,
    }
  })
  return {
    address, chainId, token, generatedAt: new Date().toISOString(),
    gas: { balance: String(balance ?? 0n), low: Boolean(gasLow) },
    ladder: { labels: LADDER.labels, stepBps: LADDER.stepBps },
    agents,
  }
}
