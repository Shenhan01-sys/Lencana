/**
 * Ukur biaya CPU dari SATU tanda tangan daftar status.
 *
 * Ini angka yang menentukan B51: Workers Free punya 10 ms CPU per invokasi, Paid default 30 detik.
 * Kalau canonicalisation + Ed25519 untuk list kita makan X ms, kita tahu apakah host edge
 * realistis, butuh plan berbayar, atau tanda tangan harus tetap di Node.
 */
import { performance } from 'node:perf_hooks'
import { createPublicClient, http } from 'viem'
import { gunzipSync } from 'node:zlib'

import { loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader } from '../src/sign.js'
import { renderList } from '../src/lists.js'
import { servedHashes } from '../src/lists.js'

const RPC = process.env.RPC_URL || 'https://bsc-testnet.publicnode.com'
const RESOLVER = process.env.RESOLVER_ADDRESS

const slug = process.env.AGENT_SLUG || 'agent-b41'
const base = process.env.BASE_URL || 'http://127.0.0.1:8787'

const agent = await loadKey(slug)
const issuerDoc = issuerDocument(agent)
const loader = makeDocumentLoader({ [agent.controller]: issuerDoc })

const client = createPublicClient({ transport: http(RPC) })
const all = await servedHashes()
console.log(`hash yang dipantau: ${all.length} · resolver ${RESOLVER} · chain ${await client.getChainId()}`)

// Ukur per ukuran himpunan: biaya tidak linear terhadap kredensial yang DIPANTAU, tapi terhadap
// panjang bitstring yang tetap — jadi angkanya harus hampir datar. Kalau tidak, klaim "dirender
// ulang tiap permintaan" punya batas yang belum kita tulis di mana pun.
const sizes = [1, 3, 6, 12, all.length].filter((v, i, a) => v <= all.length && a.indexOf(v) === i)
for (const n of sizes) {
  const hashes = all.slice(0, n)
  const t0 = performance.now()
  const list = await renderList({
    purpose: 'revocation', baseUrl: base, rpcUrl: RPC, resolverAddress: RESOLVER,
    hashes, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  const ms = performance.now() - t0
  const bytes = gunzipSync(Buffer.from(list.encodedList.slice(1), 'base64url')).length
  console.log(
    `  n=${String(n).padStart(2)}  ${ms.toFixed(1).padStart(6)} ms` +
    `  · bitstring ${bytes * 8} bit` +
    `  · flag ${list.flagged}` +
    `  · proof ${(list.signed.proof?.proofValue ?? '').length} char` +
    `  · payload ${JSON.stringify(list.signed).length} char`,
  )
}

// Render penuh, setelah baca chain: waktu sajian yang sebenarnya dirasakan pembaca daftar.
const t1 = performance.now()
const { verifyDocument } = await import('../src/sign.js')
const again = await renderList({
  purpose: 'revocation', baseUrl: base, rpcUrl: RPC, resolverAddress: RESOLVER,
  hashes: all, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
})
const t2 = performance.now()
const v = await verifyDocument(again.signed, { controllerDocument: issuerDoc, documentLoader: loader })
const t3 = performance.now()
console.log(`\n  render penuh n=${all.length}: ${(t2 - t1).toFixed(1)} ms · verifikasi: ${(t3 - t2).toFixed(1)} ms · hasil ${v.verified}`)

// Lapis kedua: berapa bagian yang KRIPTO MURNI. Tanpa pemisahan ini, "biaya tanda tangan" yang
// kita laporkan sebenarnya biaya RPC — dan keputusan Workers-vs-Node bergantung ke angka yang benar.
const { signDocument } = await import('../src/sign.js')
const unsignedDoc = {
  '@context': ['https://www.w3.org/ns/credentials/v2'],
  id: `${base}/credentials/status/revocation`,
  type: ['VerifiableCredential', 'BitstringStatusListCredential'],
  issuer: issuerDoc.id,
  validFrom: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  credentialSubject: {
    id: `${base}/credentials/status/revocation#list`,
    type: 'BitstringStatusList',
    statusPurpose: 'revocation',
    encodedList: again.encodedList,
  },
}
const times = []
let signedOnce = null
for (let i = 0; i < 5; i++) {
  const a = performance.now()
  signedOnce = await signDocument(structuredClone(unsignedDoc), {
    key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  times.push(performance.now() - a)
}
const sorted = [...times].sort((x, y) => x - y)
console.log(`\nkripto murni (canonicalisation + Ed25519) pada dokumen daftar, 5×:`)
console.log(`  min ${sorted[0].toFixed(1)} · median ${sorted[2].toFixed(1)} · max ${sorted[4].toFixed(1)} ms`)
console.log(`  payload ${JSON.stringify(unsignedDoc).length} char · proofValue ${(signedOnce.proof?.proofValue ?? '').length} char`)
console.log('  inilah yang harus dibandingkan dengan 10 ms CPU/invokasi (Workers Free) dan 30.000 ms (Paid)')
