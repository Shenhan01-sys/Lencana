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
// Lencana-B130 status=TERBUKA 2026-10-02 — dasbor Agent Owner dihitung dari identitas di registry + baris sewa/penunjukan/aktivitas/tagihan, dengan alasan layak-sewa yang sama dengan rute sewa; dompet agen kosong sesudah pemindahan dilaporkan, bukan disembunyikan. Buktikan ulang: npm run verify:owner. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, createWalletClient, http, parseEther } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { rateCard, LADDER } from './pricing.js'

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

/**
 * @param owned    hasil `ownedAgentFacts`: [{ agent, problem }]
 * @param records  hasil `ownerRecords`
 * @param minted   baris `platform_agents` untuk agen-agen itu
 * @param balance  saldo native (wei) alamat pemilik, untuk gas transaksi pemilik
 */
export function ownerOverview ({ address, owned, records, minted, balance, gasLow, token, chainId, publisher = null }) {
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
    return {
      agentId: id, registry: a.registry,
      name: a.registration?.name ?? null, description: a.registration?.description ?? null, pointsBack: a.pointsBack,
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
    }
  })
  return {
    address, chainId, token, generatedAt: new Date().toISOString(),
    gas: { balance: String(balance ?? 0n), low: Boolean(gasLow) },
    ladder: { labels: LADDER.labels, stepBps: LADDER.stepBps },
    agents,
  }
}
