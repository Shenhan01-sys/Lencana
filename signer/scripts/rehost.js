/**
 * `npm run rehost` — memindahkan kertas yang URL-nya menunjuk host mati ke host tepi yang tetap (B65-b).
 *
 * BACA-DULU, TULIS KEDUA. Tanpa `--apply` tidak ada yang ditulis: skrip mencetak, untuk tiap kertas
 * yang tidak terbaca publik, siapa penandatangannya, di mana controller agen itu tinggal, dan apa
 * kata chain — lalu mengklasifikasi perbaikannya `gratis` / `butuh identitas` / `kunci asing`.
 *
 * Kenapa perpindahan host mungkin gratis. `credentialHash` = `keccak256("vc:", learner, courseId)`
 * (`src/credential.js:31`) — TIDAK memuat isi dokumen. Jadi mengubah URL di dalam kertas +
 * menandatangani ulang tidak menyentuh chain: uid tetap, nomor bit tetap, dan hash daftar status
 * yang sudah ter-anchor di BAS tetap hash yang sama. Tidak ada gas, tidak ada kertas baru.
 *
 * Kenapa kadang TIDAK gratis. `controller` agen ikut mengandung base URL
 * (`src/issuer.js:34`, `${baseUrl}/issuers/<slug>`), dan verifikasi Data Integrity mencari dokumen
 * controller di URL itu. Kertas yang agennya bercontroller di host mati tidak bisa dipindah cuma
 * dengan tanda tangan ulang — identitas penerbitnya yang harus pindah, dan itu penerbitan baru di
 * bawah `agent-edge` (persis yang sudah terjadi pada kertas tahan-lama 28 Sep), bukan pekerjaan skrip ini.
 *
 * Kenapa URL ditulis ulang, tidak dibangun ulang dari `buildOpenBadgeCredential`. Membangun ulang
 * berarti menyiapkan `course.name/description/criteria` dan `assessment.*` dari manifest + store,
 * dan satu kata yang berbeda akan menghasilkan kertas "sama" dengan tanda tangan baru padahal
 * isinya bergeser — justru hal yang tidak boleh terjadi pada dokumen bertanda tangan. Yang dilakukan di
 * mari lebih sempit dan bisa dibuktikan: ganti **origin** pada nilai string yang memang menunjuk
 * host lama, tanda tangani ulang, lalu bandingkan daun demi daun — kalau ada SATU path yang berubah
 * bukan karena origin, kertas itu tidak ditulis.
 */
import { createPublicClient, http, getAddress, parseAbi } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { forgetCredential, listCredentials, loadAllocator, rememberCredential } from '../src/store.js'
import { listAgents, loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader, signDocument, verifyDocument } from '../src/sign.js'
import { credentialHashOf } from '../src/credential.js'
import { REVOCATION, SUSPENSION } from '../src/lists.js'

/**
 * Nomor bit dibaca, tidak dialokasikan. `IndexAllocator.slot()` MENAMBAH nomor kalau belum ada,
 * dan skrip ini bukan sisi penerbit — kalau ia ikut mengalokasikan, nomor yang tercetak di kertas
 * bisa beda dari nomor yang di-anchor, dan kegagalannya sunyi (itu persis pelajaran di `statusList.js`).
 */
function peekSlot (alloc, purpose, uid) {
  for (const candidate of [uid, String(uid).toLowerCase(), String(uid).toUpperCase()]) {
    const v = alloc.peek(purpose, candidate)
    if (v !== undefined) return v
  }
  return undefined
}

const APPLY = process.argv.includes('--apply')
const ONLY = (() => { const i = process.argv.indexOf('--only'); return i > 0 ? process.argv[i + 1] : null })()

await loadFileEnvReport('rehost')
const env = process.env
const EDGE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
const RESOLVER = env.RESOLVER_ADDRESS
if (!EDGE || !/^https:\/\//.test(EDGE) || !RESOLVER || !env.RPC_URL) {
  console.error('butuh EDGE_BASE_URL (https), RESOLVER_ADDRESS, RPC_URL — tanpa itu tidak ada yang bisa disimpulkan')
  process.exit(2)
}
const edgeOrigin = new URL(EDGE).origin
const hostOf = (u) => { try { return new URL(String(u)).host } catch { return null } }
const edgeHost = new URL(EDGE).host

/**
 * Host milik spesifikasi, bukan tempat tinggal kita. `@context[0]` adalah `https://www.w3.org/...`
 * dan `credentialSchema`/`type` menunjuk `purl.imsglobal.org` — itu **identifier namespace**, bukan
 * URL yang kita hidangkan. Versi pertama skrip ini tidak mengecualikannya dan menyimpulkan
 * "17 dari 17 kertas menunjuk host asing", padahal `verify:edge` mengukur 10 dari 17 — kalimat yang
 * benar secara harfiah tapi salah sebagai pengukuran, dan yang membuat sisanya tidak perlu dikerjakan.
 */
const SPEC_HOSTS = new Set(['www.w3.org', 'purl.imsglobal.org', 'schema.org', 'json-schema.org', 'ns.onedfd.org', 'w3id.org'])
/** Host yang kita akui hidup untuk produk ini. */
const servedHere = (u) => { const h = hostOf(u); return h === edgeHost }
const isForeign = (u) => { const h = hostOf(u); return !!h && !servedHere(u) && !SPEC_HOSTS.has(h) }

const client = createPublicClient({ transport: http(env.RPC_URL) })
const ResolverAbi = parseAbi([
  'function statusOf(bytes32) view returns (bool,bool,bool,bool,address,uint64,uint64)',
  'function attestationOf(bytes32) view returns (bytes32)',
])

/** Semua URL yang tercetak di dalam kertas — ini yang dibaca orang/validator. */
function urlFields (doc) {
  const out = {}
  const walk = (node, path) => {
    if (typeof node === 'string') { if (isForeign(node)) out[path] = node; return }
    if (Array.isArray(node)) { node.forEach((v, i) => walk(v, `${path}[${i}]`)); return }
    if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) walk(v, path ? `${path}.${k}` : k) }
  }
  walk(doc, '')
  return out
}

/**
 * Ganti origin lama → origin tepi, HANYA pada nilai yang hostnya memang bukan tepi.
 * Mengembalikan daftar path yang disentuh, supaya pemanggil bisa membuktikan tidak ada yang lain.
 */
function retarget (node, path, touched) {
  if (typeof node === 'string') {
    // `@context` = identifier namespace (mengubahnya merusak dokumen), `issuer.*` = identitas
    // penerbit (memindahkannya = mengubah siapa yang menerbitkan, dan itu keputusan terpisah),
    // `proof.*` = tanda tangan lama yang memang akan dibuat ulang.
    if (/^(@context|issuer|proof)(\.|\[|$)/.test(path.replace(/^\./, ''))) return node
    const h = hostOf(node)
    if (!h || h === edgeHost || SPEC_HOSTS.has(h)) return node
    for (const origin of candidateOrigins(node)) {
      if (node.includes(origin)) {
        touched.push({ path, from: node, to: node.split(origin).join(edgeOrigin) })
        return node.split(origin).join(edgeOrigin)
      }
    }
    return node
  }
  if (Array.isArray(node)) return node.map((v, i) => retarget(v, `${path}[${i}]`, touched))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = retarget(v, path ? `${path}.${k}` : k, touched)
    return out
  }
  return node
}
const candidateOrigins = (value) => {
  const set = new Set()
  for (const r of value.matchAll(/https?:\/\/[^/"'\s]+/g)) set.add(r[0].replace(/\/$/, ''))
  return [...set].filter((o) => isForeign(o))
}

const records = (await listCredentials()).filter((r) => r?.credentialHash && r?.document)
const agents = await listAgents()
const agentByVm = new Map(agents.map((a) => [String(a.id).toLowerCase(), a]))
const { alloc } = await loadAllocator()

const stale = records.filter((r) => Object.keys(urlFields(r.document)).length > 0)
console.log(`\nstore   : ${records.length} rekaman bertanda tangan · ${stale.length} menunjuk host selain ${edgeHost}`)
console.log(`agen    : ${agents.map((a) => `${a.agentSlug}@${hostOf(a.controller)}`).join(' · ')}`)
console.log(`mode    : ${APPLY ? 'MENERAPKAN' : 'BACA-DULU — tidak ada yang ditulis'}\n`)

const plan = []
for (const r of stale) {
  if (ONLY && !r.credentialHash.startsWith(ONLY)) continue
  const short = r.credentialHash.slice(0, 10)
  const vm = String(r.document?.proof?.verificationMethod ?? '')
  const agentMeta = agentByVm.get(vm.toLowerCase())
  const dead = Object.entries(urlFields(r.document)).filter(([, u]) => isForeign(u))
  const status = await client.readContract({
    address: getAddress(RESOLVER), abi: ResolverAbi, functionName: 'statusOf', args: [r.credentialHash],
  }).catch(() => null)
  const uidChain = await client.readContract({
    address: getAddress(RESOLVER), abi: ResolverAbi, functionName: 'attestationOf', args: [r.credentialHash],
  }).catch(() => null)
  const uid = r.uid ?? uidChain
  const slots = uid ? { rev: peekSlot(alloc, REVOCATION, uid), sus: peekSlot(alloc, SUSPENSION, uid) } : null
  const sameHash = credentialHashOf(r.learner, r.course).toLowerCase() === r.credentialHash.toLowerCase()
  const agentHost = agentMeta ? hostOf(agentMeta.controller) : null
  // `gratis` = kuncinya kita pegang DAN controllernya sudah hidup di tepi (sisanya cuma URL kertas).
  const kind = !agentMeta ? 'asing' : agentHost === edgeHost ? 'gratis' : 'butuh identitas'
  plan.push({ r, short, agentMeta, agentSlug: agentMeta?.agentSlug, kind, dead, status, uid, slots, sameHash })

  console.log(`  ${short}… ${r.course} · peserta ${r.learner.slice(0, 8)}… · ${r.score ?? '?'}/100 ${r.verdict ?? ''}`)
  console.log(`    URL mati        : ${dead.map(([p, u]) => `${p}→${hostOf(u)}`).join(', ').slice(0, 150)}`)
  console.log(`    penandatangan   : ${agentMeta ? `${agentMeta.agentSlug} (controller@${agentHost})` : `tidak dikenal: ${vm.slice(0, 46)}`} → ${kind.toUpperCase()}`)
  console.log(`    chain           : ${status ? `exists=${status[0]} revoked=${status[1]} expired=${status[2]} delisted=${status[3]} issuer=${getAddress(status[4])}` : 'TIDAK terbaca'} · bit ${slots && slots.rev !== undefined ? `${slots.rev}/${slots.sus}` : '—'} · hash cocok=${sameHash}`)
}

const tally = { gratis: 0, 'butuh identitas': 0, asing: 0 }
for (const p of plan) tally[p.kind] = (tally[p.kind] ?? 0) + 1
console.log(`\nringkas : ${tally.gratis} gratis (tanpa gas) · ${tally['butuh identitas']} butuh identitas penerbit baru · ${tally.asing} kunci asing`)
console.log('          gratis = uid, nomor bit, dan hash daftar ter-anchor TIDAK berubah; yang berubah cuma URL di dalam kertas + tanda tangannya')

if (!APPLY) {
  console.log('\nbaca-dulu selesai. Tambah --apply untuk menandatangani ulang yang berlabel "gratis".')
  process.exit(0)
}

let done = 0
for (const p of plan) {
  if (p.kind !== 'gratis') {
    console.log(`\n  LEWAT ${p.short}: ${p.kind} — tidak ada tanda tangan baru yang dibuat untuk hal yang identitasnya belum pindah`)
    continue
  }
  if (!p.sameHash) {
    console.log(`  LEWAT ${p.short}: credentialHash tidak cocok dengan (learner, course) — kertas ini bukan hasil rumus kita`)
    continue
  }
  if (!p.slots || p.slots.rev === undefined) {
    console.log(`  LEWAT ${p.short}: nomor bit tidak ada di alokator — dokumen tanpa bit yang cocok = status yang tidak bisa ditunjuk`)
    continue
  }
  const agent = await loadKey(p.agentSlug)
  const issuerDoc = issuerDocument(agent)
  const loader = makeDocumentLoader({ [agent.controller]: issuerDoc })
  const touched = []
  const rewritten = retarget(p.r.document, '', touched)
  if (!touched.length) { console.log(`  LEWAT ${p.short}: tidak ada URL yang perlu dipindah`); continue }
  // `proof` dibuang lalu dibuat ulang — tanda tangan lama tidak berlaku untuk isi baru.
  delete rewritten.proof
  let signed
  try {
    signed = await signDocument(rewritten, { key: agent.key, controllerDocument: issuerDoc, documentLoader: loader })
  } catch (e) {
    console.log(`  GAGAL ${p.short}: penandatanganan ulang: ${String(e?.message ?? e).slice(0, 120)}`)
    continue
  }
  const ok = await verifyDocument(signed, { controllerDocument: issuerDoc, documentLoader: loader })
  if (!ok.verified) { console.log(`  GAGAL ${p.short}: hasil rehost tidak lolos verifikasi sendiri — tidak disimpan`); continue }

  /**
   * Bukti bahwa "hanya URL yang pindah": bandingkan daun lama vs baru. Path yang berubah selain
   * `proof.*` HARUS berisi perpindahan origin; satu saja tidak, kertas ini tidak kita tulis.
   */
  const before = { ...p.r.document }
  delete before.proof
  // `proof` memang diganti — membandingkannya akan selalu menemukan perbedaan, dan itu bukan bukti
  // apa pun. Yang dibandingkan di sini isinya, dan isi diverifikasi lewat tanda tangan baru di bawah.
  const after = { ...signed }
  delete after.proof
  const diffs = []
  const leaf = (node, path, acc) => {
    if (Array.isArray(node)) { node.forEach((v, i) => leaf(v, `${path}[${i}]`, acc)); return acc }
    if (node && typeof node === 'object') { for (const [k, v] of Object.entries(node)) leaf(v, `${path ? `${path}.${k}` : k}`, acc); return acc }
    acc[path] = node
    return acc
  }
  const a = leaf(before, '', {})
  const b = leaf(after, '', {})
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    if (a[k] === b[k]) continue
    diffs.push({ path: k, from: a[k], to: b[k] })
  }
  const bad = diffs.filter((d) => !(typeof d.from === 'string' && typeof d.to === 'string'
    && candidateOrigins(d.from).includes(new URL(d.from).origin) && d.to === d.from.split(new URL(d.from).origin).join(edgeOrigin)))
  if (bad.length) {
    console.log(`  GAGAL ${p.short}: ${bad.length} perubahan BUKAN perpindahan URL — tidak menulis apa pun`)
    for (const d of bad.slice(0, 4)) console.log(`        ${d.path}: ${String(d.from).slice(0, 60)} → ${String(d.to).slice(0, 60)}`)
    continue
  }
  // Nomor bit harus tetap angka yang sama seperti sebelum dipindah: `statusListIndex` itulah yang
  // dipakai verifier mencari bit-nya di daftar yang ter-anchor. Kalau bergeser, kertas ini menunjuk
  // status milik orang lain.
  const idx = Number(signed.credentialStatus?.statusListIndex)
  if (idx !== Number(p.slots.rev)) {
    console.log(`  GAGAL ${p.short}: statusListIndex berubah (${p.slots.rev} → ${signed.credentialStatus?.statusListIndex}) — tidak disimpan`)
    continue
  }

  const moved = { ...p.r, document: signed, id: signed.id, signedAt: new Date().toISOString(), rehostedAt: new Date().toISOString(), rehostFrom: p.dead.map(([, u]) => hostOf(u)) }
  const previousId = p.r.id
  await rememberCredential(moved)
  /**
   * Kunci penyimpanan adalah `document.id`, dan id itulah yang barusan pindah host. Kalau catatan
   * lamanya ditinggal, store punya DUA record untuk satu `credentialHash` — persis yang terjadi pada
   * run pertama alat ini (17 jadi 18, dan `verify:edge` tetap menghitung versi loopback-nya).
   */
  if (previousId && previousId !== signed.id) {
    const gone = await forgetCredential(previousId)
    if (!gone.removed) console.log(`        ⚠ catatan lama tidak terhapus (${gone.reason}) — store bisa punya dua catatan untuk hash yang sama`)
    else if (gone.hash?.toLowerCase() !== p.r.credentialHash.toLowerCase()) console.log(`        ⚠ catatan yang terhapus hashnya lain: ${gone.hash}`)
  }
  const stillTwo = (await listCredentials()).filter((c) => String(c.credentialHash).toLowerCase() === p.r.credentialHash.toLowerCase())
  if (stillTwo.length !== 1) console.log(`        GAGAL: ${stillTwo.length} catatan untuk hash yang sama setelah rehost`)
  done += 1
  console.log(`  ok    ${p.short}: ${signed.id}`)
  console.log(`        ${touched.length} URL dipindah · kadaluarsa tidak diubah (${before.validUntil} → ${signed.validUntil}) · bit ${p.slots.rev}/${p.slots.sus} tetap · catatan lama dibuang`)
}

const still = plan.filter((p) => p.kind !== 'gratis')
console.log(`\nselesai: ${done} kertas dipindah, ${still.length} menunggu keputusan identitas penerbit.`)
if (still.length) {
  console.log('Yang "butuh identitas" TIDAK kusentuh: memindahkannya = menerbitkan ulang di bawah agen tepi')
  console.log('(attestation baru + gas testnet), dan itu harus builder yang memutuskan — bukan efek samping skrip URL.')
}
console.log('lanjutkan: npm run publish:edge  →  npm run verify:edge  →  npm run verify:live-cert  →  npm run validator')
