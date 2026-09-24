/**
 * `npm run x402` — klien sungguhan berbicara ke server sungguhan, dan bayarannya sungguhan.
 *
 * Kenapa tidak cukup fork test: yang belum pernah dieksekusi di proyek ini bukan settlement-nya,
 * tapi **genggamannya** — server menjawab `402`, klien mengirim `X-PAYMENT`, server menjadi
 * fasilitator, lalu membalas dengan `X-PAYMENT-RESPONSE`. Itu jalur yang klaim monetisasi kita
 * sandarkan padanya, dan sampai berkas ini ditulis belum ada satu pun baris kode yang pernah
 * menempuhnya.
 *
 * Yang diperiksa, berurutan, dan tiap kegagalan disebut dengan nomornya sendiri:
 *   1. `/healthz` melaporkan syarat pembayaran (harga, token, split) — bukan dari dokumentasi
 *   2. `POST /verify` TANPA header -> `402` + `accepts[]` yang bisa dibaca klien x402 mana pun
 *   3. klien menandatangani dua hal offline, nol transaksi
 *   4. `POST /verify` DENGAN `X-PAYMENT` -> `200` + laporan verifikasi + `X-PAYMENT-RESPONSE`
 *   5. dan ini bagian yang tidak bisa dipalsukan servernya sendiri: **angka di header dibandingkan
 *      dengan selisih saldo yang dibaca langsung dari chain**
 *
 * Butuh server hidup: `npm run serve` di terminal lain.
 */
import { readFile } from 'node:fs/promises'
import { createPublicClient, http, keccak256, toBytes } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { buildClientPayment, encodePaymentHeader } from '../src/x402.js'

const BASE = process.env.CHECK_BASE ?? `http://${process.env.HOST ?? '127.0.0.1'}:${process.env.PORT ?? 8787}`

async function readEnv () {
  const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const env = { ...await readEnv(), ...process.env }
const RPC = env.RPC_URL
const TOKEN = env.DEMO_TOKEN_ADDRESS
const SPLIT = env.SPLIT_ADDRESS
const PAYEE = env.ISSUER_ADDRESS
const CHAIN_ID = Number(env.CHAIN_ID ?? 97)
const CREDENTIAL = env.DEMO_REVOKED_HASH

if (!RPC || !TOKEN || !SPLIT || !PAYEE) {
  console.error('butuh RPC_URL + DEMO_TOKEN_ADDRESS + SPLIT_ADDRESS + ISSUER_ADDRESS di app/.env')
  process.exit(2)
}

const public_ = createPublicClient({ transport: http(RPC) })
const abi = [
  { type: 'function', name: 'balanceOf', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
  { type: 'function', name: 'nonces', stateMutability: 'view', inputs: [{ name: 'a', type: 'address' }], outputs: [{ type: 'uint256' }] },
]

// Klien demo yang sama seperti di PaidVerificationDemo: kunci turunan seed, TIDAK pernah pegang BNB.
const client = privateKeyToAccount(keccak256(toBytes('lencana-paid-demo-client')))

let ran = 0
let fails = 0
const check = (name, cond, detail = '') => {
  ran += 1
  console.log(`  ${cond ? 'ok  ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
  if (!cond) fails += 1
}

const bal = (a) => public_.readContract({ address: TOKEN, abi, functionName: 'balanceOf', args: [a] })

console.log(`server   : ${BASE}`)
console.log(`klien    : ${client.address}  (BNB: ${await public_.getBalance({ address: client.address })})`)
console.log(`penerbit : ${PAYEE}`)

const health = await (await fetch(`${BASE}/healthz`)).json()
if (!health.payment?.configured) {
  console.error('server belum dikonfigurasi untuk pembayaran — hentikan, ini bukan kegagalan tes')
  process.exit(2)
}
check('1. /healthz menyebut harga, token, dan split', Boolean(health.payment.priceAtomic && health.payment.token && health.payment.split),
  JSON.stringify(health.payment))

const price = BigInt(health.payment.priceAtomic)

// `platform` dibaca dari kontrak, bukan dari .env: yang mau kita bandingkan adalah apa yang
// terjadi di chain, bukan apa yang kita kira tentang konfigurasi sendiri.
const platformAddr = await public_.readContract({
  address: SPLIT,
  abi: [{ type: 'function', name: 'platform', stateMutability: 'view', inputs: [], outputs: [{ type: 'address' }] }],
})
const clientBefore = await bal(client.address)
const before = { payee: await bal(PAYEE), platform: await bal(platformAddr) }

const noPay = await fetch(`${BASE}/verify`, {
  method: 'POST', headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ credentialHash: CREDENTIAL }),
})
const noPayBody = await noPay.json().catch(() => ({}))
check('2. tanpa X-PAYMENT -> 402', noPay.status === 402, `dapat ${noPay.status}`)
const req0 = noPayBody.accepts?.[0]
check('   402 membawa accepts[] skema exact', req0?.scheme === 'exact' && req0?.network === `eip155:${CHAIN_ID}`,
  JSON.stringify({ scheme: req0?.scheme, network: req0?.network }))
check('   accepts.payTo = kontrak pembagian kita', String(req0?.payTo).toLowerCase() === SPLIT.toLowerCase())
check('   accepts.asset = token yang kita terima', String(req0?.asset).toLowerCase() === TOKEN.toLowerCase())
check('   www-authenticate ikut dikirim', Boolean(noPay.headers.get('www-authenticate')))

const now = Math.floor(Date.now() / 1000)
const deadline = now + Number(req0?.maxTimeoutSeconds ?? 600)
const nonce = Date.now()
const tokenNonce = await public_.readContract({ address: TOKEN, abi, functionName: 'nonces', args: [client.address] })

const { eip2612, witnessSig } = await buildClientPayment({
  account: client, token: TOKEN, chainId: CHAIN_ID, amount: price,
  payTo: req0.payTo, nonce, deadline, validAfter: now - 5, tokenNonce,
})

const payment = {
  x402Version: 1, scheme: 'exact', network: `eip155:${CHAIN_ID}`,
  payload: {
    token: TOKEN, amount: String(price), payer: client.address, nonce, deadline,
    validAfter: now - 5, payTo: req0.payTo, resource: req0.resource, eip2612, witnessSig,
  },
}

const paid = await fetch(`${BASE}/verify`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'x-payment': encodePaymentHeader(payment) },
  body: JSON.stringify({ credentialHash: CREDENTIAL }),
})
const paidBody = await paid.json().catch(() => ({}))
check('4. dengan X-PAYMENT -> 200', paid.status === 200, `dapat ${paid.status}: ${JSON.stringify(paidBody).slice(0, 160)}`)

const report = paidBody.report ?? {}
// Field aslinya `verdict`/`reasons` (tipe Report di web/src/verify.ts). Versi pertama menanyakan
// `decision` — nama yang saya karang sendiri, dan yang merah adalah tesnya, bukan produknya.
check('   laporan verifikasi ikut terisi', typeof report.verdict === 'string' && report.verdict.length > 0
  && Array.isArray(report.reasons), JSON.stringify({ verdict: report.verdict }))
// Lebih dari bentuk: kami tahu jawabannya harus REVOKED — hash yang diminta memang adegan
// pencabutan di SeedDemo. Kalau keluar VALID, ada yang bocor diam-diam di jalur berbayar.
check('   verdict yang keluar benar untuk kredensial yang diminta', report.verdict === 'REVOKED',
  `dapat ${report.verdict}`)

const responseHeader = paid.headers.get('x-payment-response')
let decoded = null
try {
  decoded = JSON.parse(Buffer.from(responseHeader ?? '', 'base64').toString('utf8'))
} catch { /* dibiarkan: pemeriksaan di bawah yang melaporkan */ }
check('   X-PAYMENT-RESPONSE bisa di-decode', Boolean(decoded?.success === true && decoded?.transaction),
  JSON.stringify({ success: decoded?.success, tx: String(decoded?.transaction).slice(0, 18) }))

// Yang di atas baru memeriksa header. Yang di bawah inilah satu-satunya bukti yang berarti:
// angka yang dilaporkan server dibandingkan dengan SELISIH saldo di chain.
const after = { payee: await bal(PAYEE), platform: await bal(platformAddr) }
const payeeGain = after.payee - before.payee
const platformGain = after.platform - before.platform
const clientDrop = clientBefore - await bal(client.address)

check('5. penerbit menerima bagiannya di chain, bukan hanya di respons', payeeGain > 0n, `selisih ${payeeGain}`)
check('   platform menerima bagian sisanya', platformGain > 0n, `selisih ${platformGain}`)
check('   keduanya berjumlah tepat sebesar harga', payeeGain + platformGain === price,
  `${payeeGain} + ${platformGain} vs ${price}`)
check('   klien membayar tepat seharga, dan nol transaksi darinya', clientDrop === price, `selisih ${clientDrop}`)
check('   split tidak menahan sisa (kontrak tanpa buku utang)', (await bal(SPLIT)) === 0n, `sisa ${await bal(SPLIT)}`)
check('   settlement + split tx dilaporkan', Boolean(decoded?.settlement?.settleTx && decoded?.settlement?.splitTx),
  JSON.stringify(decoded?.settlement ?? {}))

// --- 6. satu pembayaran harus melayani BEBERAPA verifikasi ------------------
// Ini bukan fitur tambahan: ini satu-satunya hal yang membuat tarif 1000 satuan terkecil masuk
// akal. Satu settlement on-chain = 190.659 gas (terukur dari receipt). Kalau satu pembayaran cuma
// melayani satu kredensial, 10% platform dikalahkan harga BNB; kalau melayani N, biayanya dibagi
// N. Yang diuji di bawah adalah klaim ekonomi, bukan kenyamanan.
const batchWanted = [CREDENTIAL, env.DEMO_HASH].filter(Boolean).filter((h) => /^0x[0-9a-fA-F]{64}$/.test(h))
if (batchWanted.length === 2) {
  const nonce2 = nonce + 1
  const tokenNonce2 = await public_.readContract({ address: TOKEN, abi, functionName: 'nonces', args: [client.address] })
  const { eip2612: e2, witnessSig: w2 } = await buildClientPayment({
    account: client, token: TOKEN, chainId: CHAIN_ID, amount: price,
    payTo: req0.payTo, nonce: nonce2, deadline, validAfter: now - 5, tokenNonce: tokenNonce2,
  })
  const pay2 = {
    x402Version: 1, scheme: 'exact', network: `eip155:${CHAIN_ID}`,
    payload: {
      token: TOKEN, amount: String(price), payer: client.address, nonce: nonce2, deadline,
      validAfter: now - 5, payTo: req0.payTo, resource: req0.resource, eip2612: e2, witnessSig: w2,
    },
  }
  const batchRes = await fetch(`${BASE}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-payment': encodePaymentHeader(pay2) },
    body: JSON.stringify({ credentialHashes: batchWanted }),
  })
  const batchBody = await batchRes.json().catch(() => ({}))
  const verdicts = (batchBody.reports ?? []).map((r) => r.verdict).sort().join(',')
  check('6. satu pembayaran melayani 2 verifikasi', batchRes.status === 200 && batchBody.batch?.served === 2,
    `status ${batchRes.status} · served ${batchBody.batch?.served} · ${JSON.stringify(batchBody).slice(0, 140)}`)
  check('   kedua laporan keluar dengan verdict YANG BERBEDA (bukan satu hasil disalin dua kali)',
    verdicts === 'REVOKED,VALID', verdicts || '(kosong)')
  let bDec = null
  try {
    bDec = JSON.parse(Buffer.from(batchRes.headers.get('x-payment-response') ?? '', 'base64').toString('utf8'))
  } catch { /* dilaporkan oleh pemeriksaan berikutnya */ }
  check('   hanya SATU settlement untuk keduanya', Boolean(bDec?.settlement?.settleTx)
    && bDec.settlement.settleTx !== decoded?.settlement?.settleTx && bDec.served === 2,
    JSON.stringify({ served: bDec?.served, settleTx: String(bDec?.settlement?.settleTx).slice(0, 14) }))
  const payeeAfter2 = await bal(PAYEE)
  check('   pendapatan naik tepat satu harga lagi, bukan dua', payeeAfter2 - after.payee === 900n,
    `selisih ${payeeAfter2 - after.payee}`)
} else {
  console.log('  lewat: batch tidak diuji (lingkungan tidak punya 2 hash yang sah)')
}

console.log(`\n${fails === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
console.log(`settleTx : ${decoded?.settlement?.settleTx ?? '(tidak ada)'}`)
console.log(`splitTx  : ${decoded?.settlement?.splitTx ?? '(tidak ada)'}`)
process.exitCode = fails ? 1 : 0
