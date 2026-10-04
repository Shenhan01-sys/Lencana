// Lencana-B148 status=SELESAI 2026-10-05 — harness konteks JSON-LD tanpa jaringan: salinan = manifest, pemuat melayani dari memori, tanda tangan + verifikasi dengan fetch ke host konteks diblokir, kertas store diverifikasi ulang, cache disk hanya host konteks; --online membandingkan dengan versi online. Buktikan ulang: npm run check:contexts. JANGAN dibalik/diulang tanpa membuka kembali baris B148 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run check:contexts` — konteks JSON-LD kertas Lencana dilayani dari salinan di repo, bukan dari situs pihak
 * ketiga (B148). Tanpa jaringan ke host konteks: setiap `fetch` ke w3.org / w3id.org / purl.imsglobal.org DIBLOKIR
 * dan dihitung, jadi "lolos" berarti benar-benar tanpa situs itu.
 *
 *   A. salinan: manifest memuat keempat URL; isi tiap berkas = sha256 di manifest; salinan yang diubah membuat
 *      signer menolak jalan (diuji di proses anak dengan salinan di direktori sementara)
 *   B. pemuat: keempat URL dilayani dari memori dengan `documentUrl` manifest, tanpa satu pun permintaan; jawaban
 *      adalah salinan (diubah pemanggil, sumbernya tetap)
 *   C. tanda tangan: kertas contoh ditandatangani dan diverifikasi; kertas yang diubah ditolak
 *   D. kertas lama: setiap kertas di store lokal diverifikasi ulang dengan salinan (kunci publik dari `.keys/`) —
 *      bukti bahwa salinan = konteks yang dulu dipakai menandatanganinya
 *   E. cache disk: server lokal — sekali ambil lalu dipakai ulang lintas pemuat, berkas rusak diambil ulang, URL di
 *      luar daftar tidak pernah disimpan; daftar host konteks bawaan tidak memuat host dokumen penerbit
 *
 *   `-- --online` (TIDAK masuk baterai): salinan dibandingkan dengan versi online (isi + `documentUrl`), dan
 *   kanonisasi kertas contoh dengan pemuat online = dengan salinan. Jaringan yang tak terbaca dilaporkan
 *   TAK TERBACA (exit 3), bukan "berubah".
 */
import { mkdtemp, rm, cp, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:http'
import { spawnSync } from 'node:child_process'

// --- penjaga dipasang SEBELUM modul signer dimuat: klien HTTP jsonld bisa menangkap `fetch` saat diimpor -------------
const CONTEXT_HOST = /^https?:\/\/(www\.)?(w3\.org|w3id\.org|purl\.imsglobal\.org)\//
const blocked = []
let guardOn = true
const realFetch = globalThis.fetch
globalThis.fetch = async (input, init) => {
  const url = typeof input === 'string' ? input : (input?.url ?? String(input))
  if (guardOn && CONTEXT_HOST.test(url)) {
    blocked.push(url)
    throw new Error(`check:contexts guard: fetch to a context host is blocked (${url})`)
  }
  return realFetch(input, init)
}

const { CONTEXTS_DIR, CONTEXT_TARGETS, MANIFEST_FILE, cacheFileFor, contentHash, fetchContext, isContextUrl, readCached, vendoredContexts } = await import('../src/context-store.js')
const { makeDocumentLoader, signDocument, verifyDocument } = await import('../src/sign.js')
const { createIssuerKey, issuerDocument, listAgents } = await import('../src/issuer.js')
const { buildOpenBadgeCredential } = await import('../src/credential.js')
const { IndexAllocator } = await import('../src/statusList.js')
const { listCredentials } = await import('../src/store.js')
const jsonld = (await import('jsonld')).default
const rdfCanonize = await import('rdf-canonize')

const ONLINE = process.argv.includes('--online')
let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok  ' : 'GAGAL'}  ${name}${!ok && detail ? `\n          ${String(detail).slice(0, 300)}` : ''}`)
}
const head = (t) => console.log(`\n${t}`)
const json = (x) => { try { return JSON.stringify(x) } catch { return String(x) } }

// --- A. salinan --------------------------------------------------------------------------------------------------------
head('A. salinan konteks = manifest')
const { manifest } = vendoredContexts()
const want = CONTEXT_TARGETS.map((t) => t.url).sort()
const have = (manifest.contexts ?? []).map((c) => c.url).sort()
check('manifest memuat tepat keempat URL konteks (VC 2.0, OB 3.0.3, Data Integrity v2, Multikey v1)', json(want) === json(have), json(have))
for (const entry of manifest.contexts ?? []) {
  const doc = JSON.parse(await readFile(join(CONTEXTS_DIR, entry.file), 'utf8'))
  check(`${entry.file}: sha256 isi = manifest, documentUrl tercatat`, contentHash(doc) === entry.sha256 && /^https:\/\//.test(entry.documentUrl ?? ''), `${contentHash(doc).slice(0, 16)} vs ${String(entry.sha256).slice(0, 16)}`)
}
{
  // Salinan yang diubah satu karakter pun harus membuat pemuatnya menolak — diuji di proses anak, salinan di direktori sementara.
  const tmp = await mkdtemp(join(tmpdir(), 'lencana-contexts-'))
  try {
    await cp(CONTEXTS_DIR, tmp, { recursive: true })
    const victim = join(tmp, CONTEXT_TARGETS[1].file)
    const doc = JSON.parse(await readFile(victim, 'utf8'))
    doc['@context'].diubahHarness = 'https://contoh.invalid/ns#diubah'
    await writeFile(victim, JSON.stringify(doc, null, 2), 'utf8')
    const storeUrl = new URL('../src/context-store.js', import.meta.url).href
    const r = spawnSync(process.execPath, ['--input-type=module', '-e', `import(${json(storeUrl)}).then((m) => { m.vendoredContexts(); console.log('DIMUAT') })`], { env: { ...process.env, LANCENA_CONTEXTS_DIR: tmp }, encoding: 'utf8' })
    check('salinan yang diubah → pemuat menolak (proses gagal, sebutkan berkasnya)', r.status !== 0 && /does not match its manifest/.test(r.stderr) && r.stderr.includes(CONTEXT_TARGETS[1].file) && !r.stdout.includes('DIMUAT'), (r.stderr || r.stdout).slice(0, 240))
  } finally {
    await rm(tmp, { recursive: true, force: true })
  }
}

// --- B. pemuat ---------------------------------------------------------------------------------------------------------
head('B. pemuat melayani konteks dari memori')
{
  const loader = makeDocumentLoader({}, { cacheDir: null })
  for (const entry of manifest.contexts ?? []) {
    const r = await loader(entry.url)
    check(`${entry.url} → dari salinan (documentUrl ${entry.documentUrl === entry.url ? 'sama' : 'sesudah pengalihan'})`, r?.documentUrl === entry.documentUrl && contentHash(r.document) === entry.sha256, json({ documentUrl: r?.documentUrl }))
  }
  const first = await loader(CONTEXT_TARGETS[0].url)
  first.document['@context'].diubahPemanggil = 'x'
  const again = await loader(CONTEXT_TARGETS[0].url)
  check('jawaban pemuat adalah salinan: diubah pemanggil, sumbernya tetap', contentHash(again.document) === manifest.contexts.find((c) => c.url === CONTEXT_TARGETS[0].url).sha256)
  check('tidak ada satu pun permintaan ke host konteks', blocked.length === 0, json(blocked))
}

// --- C. tanda tangan ---------------------------------------------------------------------------------------------------
head('C. tanda tangan + verifikasi dengan host konteks diblokir')
const BASE = 'https://contexts-check.invalid'
const issuer = await createIssuerKey({ baseUrl: BASE, agentSlug: 'contexts-check', name: 'Penguji Konteks' })
const issuerDoc = issuerDocument(issuer)
const sampleLoader = makeDocumentLoader({ [issuer.controller]: issuerDoc }, { cacheDir: null })
const { unsigned } = buildOpenBadgeCredential({
  baseUrl: BASE, issuer,
  course: { slug: 'uji-konteks', name: 'Uji Konteks', description: 'Kertas contoh harness check:contexts', criteria: 'Nilai akhir >= 70 dari 100' },
  learner: { address: '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B' },
  uid: '0x' + 'cb'.repeat(32),
  assessment: { score: '88', method: 'kuis + esai' },
  issuedAtUnix: 1_800_000_000, expiresAtUnix: 1_800_000_000 + 365 * 24 * 3600, allocator: new IndexAllocator(),
})
let signed = null
try {
  signed = await signDocument(unsigned, { key: issuer.key, controllerDocument: issuerDoc, documentLoader: sampleLoader })
  check('kertas contoh (VC 2.0 + OB 3.0.3) ditandatangani tanpa jaringan', Boolean(signed?.proof?.proofValue))
  const ok = await verifyDocument(signed, { controllerDocument: issuerDoc, documentLoader: sampleLoader })
  check('kertas contoh terverifikasi tanpa jaringan', ok.verified === true, json(ok.raw?.error?.message ?? ok.raw?.results?.[0]?.error?.message))
  const tampered = structuredClone(signed)
  tampered.credentialSubject.achievement.name = 'Kursus Lain'
  const bad = await verifyDocument(tampered, { controllerDocument: issuerDoc, documentLoader: sampleLoader })
  check('kertas yang diubah → ditolak', bad.verified === false)
} catch (e) {
  check('tanda tangan + verifikasi berjalan tanpa pengecualian', false, String(e?.message ?? e))
}
check('tidak ada satu pun permintaan ke host konteks', blocked.length === 0, json(blocked))

// --- D. kertas lama ----------------------------------------------------------------------------------------------------
head('D. kertas di store diverifikasi ulang dengan salinan')
{
  const issued = (await listCredentials()).filter((r) => r?.document?.proof)
  if (issued.length === 0) {
    console.log('  info  : store lokal kosong (clone baru) — bagian D dilewati, bukan lolos')
  } else {
    const byPub = new Map((await listAgents()).map((a) => [String(a.publicKeyMultibase).split('#').pop(), a]))
    let tried = 0
    let verified = 0
    let noKey = 0
    const bad = []
    for (const rec of issued) {
      const proof = Array.isArray(rec.document.proof) ? rec.document.proof[0] : rec.document.proof
      const vm = String(proof?.verificationMethod ?? '')
      const [base, frag] = vm.split('#')
      const agent = byPub.get(frag)
      if (!base || !frag || !agent) { noKey++; continue }
      const ctrl = issuerDocument({ controller: base, name: agent.name, key: { id: vm, publicKeyMultibase: frag } })
      tried++
      try {
        const r = await verifyDocument(rec.document, { controllerDocument: ctrl, documentLoader: makeDocumentLoader({ [base]: ctrl }, { cacheDir: null }) })
        if (r.verified) verified++
        else bad.push(`${rec.course} ${String(rec.credentialHash).slice(0, 10)}`)
      } catch (e) {
        bad.push(`${rec.course}: ${String(e?.message ?? e).slice(0, 80)}`)
      }
    }
    console.log(`  info  : ${issued.length} kertas di store · ${tried} dengan kunci di .keys/ · ${noKey} kuncinya tidak ada di mesin ini`)
    check(`setiap kertas yang kuncinya ada terverifikasi dengan salinan (${verified} dari ${tried})`, tried > 0 && verified === tried, bad.join(' · '))
  }
  check('tidak ada satu pun permintaan ke host konteks', blocked.length === 0, json(blocked))
}

// --- E. cache disk -----------------------------------------------------------------------------------------------------
head('E. cache disk: hanya konteks, sekali ambil')
{
  const hits = new Map()
  const ctxDoc = { '@context': { '@version': 1.1, contoh: 'https://contoh.invalid/ns#contoh' } }
  const server = createServer((req, res) => {
    hits.set(req.url, (hits.get(req.url) ?? 0) + 1)
    res.setHeader('content-type', 'application/ld+json')
    res.end(JSON.stringify(req.url.startsWith('/ctx/') ? ctxDoc : { '@context': { lain: 'https://contoh.invalid/ns#lain' } }))
  })
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok))
  const origin = `http://127.0.0.1:${server.address().port}`
  const dir = await mkdtemp(join(tmpdir(), 'lencana-jsonld-cache-'))
  try {
    const cacheable = (u) => u.startsWith(`${origin}/ctx/`)
    const ctxUrl = `${origin}/ctx/a`
    const otherUrl = `${origin}/dokumen/b`
    const r1 = await makeDocumentLoader({}, { cacheDir: dir, cacheable })(ctxUrl)
    check('konteks pertama kali: diambil sekali dari jaringan lalu tersimpan di disk', hits.get('/ctx/a') === 1 && (await readCached(ctxUrl, dir)) !== null && contentHash(r1.document) === contentHash(ctxDoc), json([...hits]))
    const r2 = await makeDocumentLoader({}, { cacheDir: dir, cacheable })(ctxUrl)
    check('pemuat baru (= proses baru) memakai disk, tanpa permintaan lagi', hits.get('/ctx/a') === 1 && contentHash(r2.document) === contentHash(ctxDoc) && r2.documentUrl === r1.documentUrl, json([...hits]))
    await writeFile(cacheFileFor(ctxUrl, dir), '{rusak', 'utf8')
    await makeDocumentLoader({}, { cacheDir: dir, cacheable })(ctxUrl)
    check('berkas cache rusak → diambil ulang dan ditulis ulang', hits.get('/ctx/a') === 2 && (await readCached(ctxUrl, dir)) !== null, json([...hits]))
    const L = makeDocumentLoader({}, { cacheDir: dir, cacheable })
    await L(otherUrl)
    await L(otherUrl)
    check('URL di luar daftar: selalu dari jaringan, tidak pernah disimpan', hits.get('/dokumen/b') === 2 && (await readCached(otherUrl, dir)) === null, json([...hits]))
  } catch (e) {
    check('cache disk berjalan tanpa pengecualian', false, String(e?.message ?? e))
  } finally {
    server.close()
    await rm(dir, { recursive: true, force: true })
  }
  const yes = ['https://www.w3.org/ns/credentials/v2', 'https://w3id.org/security/multikey/v1', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json']
  const no = ['https://lencana-edge.hansgunawan775.workers.dev/issuers/agent-demo', 'http://127.0.0.1:8787/issuers/agent-demo', 'https://contoh.invalid/ctx']
  check('daftar bawaan: host konteks masuk, dokumen penerbit tidak', yes.every(isContextUrl) && !no.some(isContextUrl), json({ yes: yes.map(isContextUrl), no: no.map(isContextUrl) }))
}

console.log(`\nKONTEKS JSON-LD ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)

// --- online (terpisah, tidak masuk baterai) ----------------------------------------------------------------------------
if (ONLINE) {
  guardOn = false
  head('ONLINE. salinan dibandingkan dengan versi online')
  let changed = 0
  let unreachable = 0
  const live = new Map()
  for (const entry of manifest.contexts ?? []) {
    try {
      const r = await fetchContext(entry.url)
      live.set(entry.url, r)
      const same = contentHash(r.document) === entry.sha256 && r.documentUrl === entry.documentUrl
      if (!same) changed++
      console.log(`  ${same ? 'SAMA   ' : 'BERUBAH'} ${entry.url} (${r.ms} ms, percobaan ${r.attempt})`)
    } catch (e) {
      unreachable++
      console.log(`  TAK TERBACA ${entry.url} — ${String(e?.message ?? e).slice(0, 120)}`)
    }
  }
  const canon = async (doc, documentLoader) => {
    const opts = { algorithm: 'RDFC-1.0', format: 'application/n-quads', base: null, safe: true }
    const dataset = await jsonld.toRDF(doc, { rdfDirection: 'i18n-datatype', ...opts, produceGeneralizedRdf: false, format: undefined, documentLoader })
    return rdfCanonize.canonize(dataset, opts)
  }
  if (signed && unreachable === 0) {
    const liveLoader = async (url) => live.get(url) ?? jsonld.documentLoader(url)
    const a = await canon(signed, sampleLoader)
    const b = await canon(signed, liveLoader)
    if (a !== b) changed++
    console.log(`  ${a === b ? 'SAMA   ' : 'BERUBAH'} kanonisasi kertas contoh: salinan vs online (${a.split('\n').filter(Boolean).length} quad)`)
  }
  console.log(`\nKONTEKS ONLINE ${unreachable ? 'TAK TERBACA' : changed ? 'BERUBAH' : 'SAMA'} — ${manifest.contexts.length} salinan, ${changed} berubah, ${unreachable} tak terbaca`)
  process.exit(failed ? 1 : changed ? 1 : unreachable ? 3 : 0)
}
process.exit(failed === 0 ? 0 : 1)
