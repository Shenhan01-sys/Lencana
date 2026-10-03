// Lencana-B136 status=SELESAI 2026-10-03 — harness pembaca riwayat chain: RPC utama lalu cadangan (chainId diperiksa), "tidak ditemukan" ≠ "RPC tidak terbaca", dan dua struk lama yang 3 Okt hilang dari publicnode terbaca lewat cadangan. Buktikan ulang: npm run verify:history. JANGAN dibalik/diulang tanpa membuka kembali baris B136 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:history` — pembaca riwayat chain dengan RPC cadangan (B136). Baca saja, tanpa gas, tanpa kunci.
 *
 *   A. `signer/src/chain-history.js` dengan klien tiruan: urutan RPC (utama, env, bawaan, tanpa duplikat); utama tidak menemukan →
 *      cadangan menemukan (ditandai `fallback`); cadangan di chain lain diabaikan; semua tidak menemukan → `missing`; semua galat
 *      jaringan → `unreachable` (bukan "tidak ditemukan"); galat jaringan di utama + cadangan menemukan → ok;
 *   B. chain 97 sungguhan: dua struk lama yang 3 Okt "tidak ditemukan" publicnode — `register()` #2546 dan transfer KNOWN_TX
 *      `verify:praktik` — terbaca lewat pembaca ini (dari RPC mana pun yang menemukannya; hasilnya dicetak).
 */
import { loadFileEnvReport } from '../src/env.js'
import { historyRpcs, readHistory, receiptFromHistory, txFromHistory, blockFromHistory, resetHistoryCache, isMissing, DEFAULT_HISTORY_RPCS } from '../src/chain-history.js'

await loadFileEnvReport('verify:history')
const env = process.env

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail !== '' ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v, (_k, x) => (typeof x === 'bigint' ? x.toString() : x))

/* ================================================================== A. murni (klien tiruan) */
console.log('\n— A. urutan RPC, cadangan, chainId, missing vs unreachable')
const P = 'https://utama.example'
const F1 = 'https://cadangan-1.example'
const F2 = 'https://cadangan-2.example'
check('urutan: utama → RPC_HISTORY_URLS (bila diisi) → bawaan chain; tanpa duplikat',
  json(historyRpcs(P, 97, {})) === json([P, ...DEFAULT_HISTORY_RPCS[97]])
  && json(historyRpcs(P, 97, { RPC_HISTORY_URLS: `${F1}, ${F2},${P}` })) === json([P, F1, F2])
  && json(historyRpcs(P, 56, {})) === json([P]), json(historyRpcs(P, 97, {})))
const notFound = () => { const e = new Error('Transaction receipt with hash "0xab" could not be found.'); e.name = 'TransactionReceiptNotFoundError'; return e }
const netErr = () => { const e = new Error('HTTP request failed. Details: fetch failed'); e.name = 'HttpRequestError'; return e }
/** Klien tiruan per URL: `chain`, dan `answer` = nilai | 'missing' | 'net'. */
const fake = (spec) => (url) => ({
  getChainId: async () => spec[url]?.chain ?? 97,
  probe: async () => {
    const a = spec[url]?.answer
    if (a === 'missing') throw notFound()
    if (a === 'net') throw netErr()
    if (a === 'null') return null
    return a
  },
})
const run = async (urls, spec) => { resetHistoryCache(); return readHistory(urls, 97, (c) => c.probe(), { clientFor: fake(spec) }) }
const r1 = await run([P, F1], { [P]: { answer: 'missing' }, [F1]: { answer: { status: 'success' } } })
check('utama tidak menemukan → cadangan menemukan (fallback: true, nama host RPC ikut)', r1.ok && r1.fallback === true && r1.rpc === 'cadangan-1.example', json(r1))
const r2 = await run([P, F1, F2], { [P]: { answer: 'missing' }, [F1]: { chain: 56, answer: { status: 'palsu' } }, [F2]: { answer: { status: 'success' } } })
check('cadangan di chain lain (56) diabaikan — jawabannya tidak dipakai', r2.ok && r2.rpc === 'cadangan-2.example' && r2.value.status === 'success', json(r2))
const r3 = await run([P, F1], { [P]: { answer: 'missing' }, [F1]: { answer: 'null' } })
check('semua tidak menemukan → kind missing (bukan galat jaringan)', !r3.ok && r3.kind === 'missing', json(r3))
const r4 = await run([P, F1], { [P]: { answer: 'net' }, [F1]: { answer: 'net' } })
check('semua galat jaringan → kind unreachable dengan sebabnya (dulu terbaca "transaction not found")', !r4.ok && r4.kind === 'unreachable' && /fetch failed/.test(r4.why), json(r4))
const r5 = await run([P, F1], { [P]: { answer: 'net' }, [F1]: { answer: { status: 'success' } } })
check('galat jaringan di utama + cadangan menemukan → ok', r5.ok && r5.fallback === true, json(r5))
const r6 = await run([P], { [P]: { answer: { status: 'success' } } })
check('utama menemukan → dipakai tanpa memanggil cadangan (fallback: false)', r6.ok && r6.fallback === false && r6.rpc === 'utama.example', json(r6))
check('pengenal galat "tidak ada": NotFoundError ya, galat HTTP tidak', isMissing(notFound()) && !isMissing(netErr()))

/* ================================================================== B. chain 97 sungguhan */
console.log('\n— B. dua struk lama di chain 97 (baca saja)')
if (!env.RPC_URL) { console.error('RPC_URL belum diisi — prasyarat bagian B, bukan kegagalan uji'); process.exit(2) }
const urls = historyRpcs(env.RPC_URL, 97)
resetHistoryCache()
const REG2546 = '0x373515c0500d02e5dd216b2dfbb2f87f456d461e65061ab444e91c97d65dc955'
const KNOWN_TX = env.PRAKTIK_TX ?? '0xea4617d3c258cf5b13063fba1e878daab3b25c505625cc794006f38f19414845'
for (const [label, hash] of [['register() agen #2546 (2 Okt, dipakai verify:studio)', REG2546], ['transfer KNOWN_TX (dipakai verify:praktik)', KNOWN_TX]]) {
  const [rc, tx] = await Promise.all([receiptFromHistory(urls, 97, hash), txFromHistory(urls, 97, hash)])
  const blk = rc.ok ? await blockFromHistory(urls, 97, rc.value.blockNumber) : { ok: false }
  console.log(`        ${label}: struk dari ${rc.ok ? rc.rpc + (rc.fallback ? ' (cadangan)' : ' (utama)') : rc.kind}, transaksi dari ${tx.ok ? tx.rpc : tx.kind}`)
  check(`${label} → struk + transaksi + blok terbaca (status success, blok ${rc.ok ? rc.value.blockNumber : '?'})`,
    rc.ok && tx.ok && blk.ok && rc.value.status === 'success' && blk.value.number === rc.value.blockNumber, json({ rc: rc.ok ? rc.rpc : rc, tx: tx.ok ? tx.rpc : tx }))
}

console.log(`\nRIWAYAT CHAIN ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exit(failed === 0 ? 0 : 1)
