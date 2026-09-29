/**
 * Pengukur: render daftar suspension dengan dua baseUrl (edge & loopback), bandingkan hash-nya
 * dengan (a) apa yang dihidangkan tepi, (b) apa yang ter-anchor di BAS.
 */
import { createPublicClient, http } from 'viem'
import { loadFileEnvReport } from '../src/env.js'
import { SUSPENSION, REVOCATION, renderList, servedHashes } from '../src/lists.js'
import { readAnchor } from '../src/anchor.js'
import { loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader } from '../src/sign.js'
import { EDGE_ROUTES, PURPOSES } from '../src/edgeKeys.js'

await loadFileEnvReport('diag-lists')
const env = process.env
const EDGE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
const LOCAL = (env.BASE_URL || 'http://127.0.0.1:8787').replace(/\/$/, '')
const agent = await loadKey(env.AGENT_SLUG || 'agent-edge')
const issuerDoc = issuerDocument(agent)
const loader = makeDocumentLoader({ [agent.controller]: issuerDoc })
const hashes = await servedHashes()
console.log(`store     : ${hashes.length} hash dipantau`)

for (const purpose of [REVOCATION, SUSPENSION]) {
  const edgeList = await renderList({
    purpose, baseUrl: EDGE, rpcUrl: env.RPC_URL, resolverAddress: env.RESOLVER_ADDRESS,
    hashes, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  const localList = await renderList({
    purpose, baseUrl: LOCAL, rpcUrl: env.RPC_URL, resolverAddress: env.RESOLVER_ADDRESS,
    hashes, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  console.log(`\n${purpose}`)
  console.log(`  hash render baseUrl=edge   : ${edgeList.hash}`)
  console.log(`  hash render baseUrl=local  : ${localList.hash}  ${edgeList.hash === localList.hash ? '(sama — baseUrl tidak masuk hash)' : '(BEDA!)'}`)
  console.log(`  watched/flagged            : ${edgeList.watched}/${edgeList.flagged}`)
  const client = createPublicClient({ transport: http(env.RPC_URL) })
  for (const [label, h] of [['edge', edgeList.hash], ['local', localList.hash]]) {
    const t = await readAnchor({ rpcUrl: env.RPC_URL, basAddress: env.BAS_ADDRESS, data: h })
    console.log(`  getTimestamp(${label})     : ${t}`)
  }
  // apa yang benar-benar disajikan tepi
  try {
    const kv = await (await fetch(`${EDGE}${EDGE_ROUTES.list(purpose)}`, { signal: AbortSignal.timeout(30_000) })).json()
    const enc = kv?.credentialSubject?.encodedList ?? kv?.encodedList
    const health = await (await fetch(`${EDGE}/healthz`, { signal: AbortSignal.timeout(30_000) })).json()
    const reported = purpose === REVOCATION ? health?.revocation : health?.suspension
    console.log(`  tepi sajikan             : checksum ${reported?.hash ?? '(?)'} · matchesChainNow=${reported?.matchesChainNow}`)
    console.log(`  cocok dengan render edge  : ${reported?.hash === edgeList.hash}`)
    if (enc) console.log(`  encodedList sajian      : ${String(enc).slice(0, 24)}… (${String(enc).length} char b64)`)
  } catch (e) { console.log(`  tepi tidak teraih       : ${String(e.message ?? e).slice(0, 70)}`) }
}
console.log(`\nPURPOSES = ${JSON.stringify(Object.keys(PURPOSES ?? {}))}`)
