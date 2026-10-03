/**
 * `src/chain-history.js` — membaca RIWAYAT chain (struk, transaksi, kepala blok yang sudah final) dengan RPC cadangan (B136).
 *
 * Kenapa ada: RPC publik di `RPC_URL` (`bsc-testnet.publicnode.com`) terbukti 3 Okt menjawab struk lama tidak konsisten — struk
 * `register()` #2546 (blok 134430227) dan struk tetap `verify:praktik` (blok 134188461) "tidak ditemukan" di baterai 13:36 dan 15:22
 * WIB tetapi `verify:studio` hijau di baterai 14:59 — sementara empat RPC resmi BNB Chain testnet selalu menemukannya. Klaim agen
 * swalayan (`owner.js`) dan bukti praktik "transaksi" (`praktik.js`) membaca struk seperti itu.
 *
 * Aturan pembacaan:
 *   - hanya untuk data yang TIDAK BERUBAH (struk, transaksi, blok yang sudah lewat) — keadaan sekarang (`ownerOf`, saldo) tetap dari
 *     `RPC_URL`;
 *   - RPC utama dulu, lalu cadangan berurutan; jawaban RPC cadangan dipakai hanya bila `eth_chainId`-nya sama dengan yang diminta;
 *   - "tidak ditemukan di RPC mana pun" (`missing`) dibedakan dari "RPC tidak bisa dibaca" (`unreachable`) — dulu keduanya
 *     terbaca "transaction not found" (`.catch(() => null)`), jadi galat jaringan menyamar sebagai transaksi yang tidak ada.
 * Cadangan: `RPC_HISTORY_URLS` (dipisah koma) atau bawaan per chain di bawah.
 */
// Lencana-B136 status=SELESAI 2026-10-03 — riwayat chain (struk, transaksi, blok) dibaca dari RPC utama lalu RPC cadangan yang chainId-nya sama; "tidak ditemukan" dibedakan dari "RPC tidak terbaca". Buktikan ulang: npm run verify:history. JANGAN dibalik/diulang tanpa membuka kembali baris B136 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http } from 'viem'

/** RPC resmi BNB Chain yang 3 Okt menemukan kedua struk lama yang tidak ditemukan publicnode (diukur eth_getTransactionReceipt). */
export const DEFAULT_HISTORY_RPCS = {
  97: ['https://bsc-testnet-dataseed.bnbchain.org', 'https://data-seed-prebsc-1-s1.bnbchain.org:8545'],
}

/** Urutan RPC untuk membaca riwayat: utama, lalu cadangan (env lebih dulu dari bawaan), tanpa duplikat. */
export function historyRpcs (primary, chainId, env = process.env) {
  const extra = String(env.RPC_HISTORY_URLS ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const list = [primary, ...(extra.length ? extra : DEFAULT_HISTORY_RPCS[Number(chainId)] ?? [])].filter(Boolean)
  return [...new Set(list)]
}

/** Galat viem yang berarti "data ini tidak ada di node ini" — bukan galat jaringan. */
export const isMissing = (e) => /NotFoundError|could not be found|not found/i.test(`${e?.name ?? ''} ${e?.shortMessage ?? ''} ${e?.message ?? ''}`)

const host = (url) => { try { return new URL(url).host } catch { return String(url) } }
const chainOf = new Map()

/**
 * Coba `read(client)` di setiap RPC berurutan.
 * @returns {{ ok: true, value: any, rpc: string, fallback: boolean } | { ok: false, kind: 'missing' | 'unreachable', why: string, tried: string[] }}
 * @param clientFor  untuk uji (fetch tiruan); bawaannya klien viem http.
 */
export async function readHistory (urls, chainId, read, { clientFor = (url) => createPublicClient({ transport: http(url, { timeout: 15_000, retryCount: 1 }) }) } = {}) {
  const tried = []
  const errors = []
  let missing = 0
  for (const [i, url] of urls.entries()) {
    const client = clientFor(url)
    tried.push(host(url))
    try {
      // Cadangan hanya dipercaya bila chain-nya sama (dicek sekali per URL per proses).
      if (i > 0) {
        if (!chainOf.has(url)) chainOf.set(url, Number(await client.getChainId()))
        if (chainOf.get(url) !== Number(chainId)) { errors.push(`${host(url)}: chain ${chainOf.get(url)}, bukan ${chainId}`); continue }
      }
      const value = await read(client)
      if (value === null || value === undefined) { missing += 1; continue }
      return { ok: true, value, rpc: host(url), fallback: i > 0 }
    } catch (e) {
      if (isMissing(e)) { missing += 1; continue }
      errors.push(`${host(url)}: ${String(e?.shortMessage ?? e?.message ?? e).split('\n')[0].slice(0, 120)}`)
    }
  }
  return missing > 0
    ? { ok: false, kind: 'missing', why: `not found on ${missing} of ${urls.length} RPC endpoints`, tried }
    : { ok: false, kind: 'unreachable', why: errors.join(' · ') || 'no RPC endpoint configured', tried }
}

/** Untuk uji: lupakan chainId yang sudah dicek. */
export function resetHistoryCache () { chainOf.clear() }

export const receiptFromHistory = (urls, chainId, hash, opts) => readHistory(urls, chainId, (c) => c.getTransactionReceipt({ hash }), opts)
export const txFromHistory = (urls, chainId, hash, opts) => readHistory(urls, chainId, (c) => c.getTransaction({ hash }), opts)
export const blockFromHistory = (urls, chainId, blockNumber, opts) => readHistory(urls, chainId, (c) => c.getBlock({ blockNumber }), opts)
