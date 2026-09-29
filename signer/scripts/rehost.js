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

// [B51] SELESAI 2026-09-29 — kertas pindah ke host tetap tanpa transaksi; identitas issuer ikut dipindah, host sementara ditolak. Buktikan ulang: npm run rehost. JANGAN dibalik/diulang tanpa membuka kembali baris B51 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createPublicClient, http, getAddress, parseAbi } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { forgetCredential, listCredentials, loadAllocator, rememberCredential } from '../src/store.js'
import { agentAt, issuerDocument, issuerDocumentFor, listAgents, loadKey } from '../src/issuer.js'
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
/**
 * `--move-identity` = izin memindahkan **URL tempat tinggal penerbit** (B83; builder 29 Sep:
 * "kalau bisa ya benerin aja"). Tanpa bendera ini, kelas `butuh identitas` tetap tidak disentuh.
 *
 * Yang berubah: `issuer.id`, `issuer.verificationMethod[].id/.controller`, `proof.verificationMethod`.
 * Semuanya URL. Yang TIDAK berubah — dan itu yang membedakan perpindahan dari pemalsuan: kunci publik
 * Multikey (dibuktikan sama byte-per-byte sebelum dan sesudah), `credentialHash` (tidak memuat isi
 * dokumen), uid attestation, nomor bit di daftar status, hash daftar yang sudah ter-anchor di BAS,
 * dan tanggal kadaluarsa. Berkas `.keys/*.json` tidak ditulis: controller aslinya tetap di disk,
 * yang tayang adalah turunannya (`src/issuer.js:agentAt`).
 */
const MOVE_ID = process.argv.includes('--move-identity')
/**
 * `--fix-status-shape` = izin mengubah SATU hal di luar URL: `credentialStatus` yang dulunya
 * array (dua entri, tanpa `credentialStatusPurpose`) jadi satu objek revokasi — bentuk yang
 * sekarang kita sajikan dan yang diterima skema OB 3.0 (`[0..1]`, B68/OI-12).
 *
 * Kenapa butuh bendera sendiri dan tidak boleh numpang `--move-identity`: ini perubahan ISI pada
 * dokumen bertanda tangan. Ia dilakukan atas kertas yang hari ini toh tidak bisa dibaca siapa pun
 * (host-nya mati), tapi "tidak ada yang bisa membaca" bukan alasan untuk mengubah isi diam-diam.
 * Maka entri yang dibuang disimpan di record store (`droppedStatusEntries`) supaya masih bisa
 * dibandingkan, dan diff daun memaksa setiap path lain tetap cuma perpindahan URL.
 *
 * Hanya berlaku kalau array-nya benar-benar bentuk lama yang kita kenali: persis dua entri,
 * tujuan revocation + suspension, dan index-nya cocok dengan alokator. Bentuk lain → ditolak.
 */
const FIX_SHAPE = process.argv.includes('--fix-status-shape')
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
function retarget (node, path, touched, identity = null) {
  if (typeof node === 'string') {
    // `@context` = identifier namespace: mengubahnya merusak dokumen, apa pun izinnya.
    if (/^@context(\.|\[|$)/.test(path.replace(/^\./, ''))) return node
    // `proof.*` akan dibuat ulang, jadi tidak perlu disentuh.
    if (/^proof(\.|\[|$)/.test(path.replace(/^\./, ''))) return node
    // `issuer.*` = identitas penerbit. Default: TIDAK disentuh (itu keputusan B83). Dengan izin
    // `--move-identity` yang ditulis ulang hanyalah URL lamanya → URL turunan dari `agentAt()`.
    if (/^issuer(\.|\[|$)/.test(path.replace(/^\./, ''))) {
      if (!identity) return node
      const oldCtrl = String(node)
      if (hostOf(oldCtrl) === edgeHost) return node
      // Hanya nilai yang memang URL identitas; `issuer.name` (string biasa) tidak boleh ikut terganti.
      if (!/^https?:\/\//.test(oldCtrl)) return node
      const to = identityUrl(oldCtrl, identity)
      if (!to) return node
      touched.push({ path, from: oldCtrl, to, kind: 'identitas' })
      return to
    }
    const h = hostOf(node)
    if (!h || h === edgeHost || SPEC_HOSTS.has(h)) return node
    for (const origin of candidateOrigins(node)) {
      if (node.includes(origin)) {
        touched.push({ path, from: node, to: node.split(origin).join(edgeOrigin), kind: 'url' })
        return node.split(origin).join(edgeOrigin)
      }
    }
    return node
  }
  if (Array.isArray(node)) return node.map((v, i) => retarget(v, `${path}[${i}]`, touched, identity))
  if (node && typeof node === 'object') {
    const out = {}
    for (const [k, v] of Object.entries(node)) out[k] = retarget(v, path ? `${path}.${k}` : k, touched, identity)
    return out
  }
  return node
}

/**
 * URL identitas lama → baru, lewat SATU konstruksi (`agentAt`). Kalau dulu di sini kutulis
 * `node.replace(oldOrigin, edgeOrigin)` sendiri, `publish.js` dan `rehost.js` bisa menghasilkan
 * string yang beda tipis (slash, fragmen) dan gejalanya muncul di tempat orang lain:
 * "verification method tidak dikenal", bukan "ada dua perakit URL di repo ini".
 */
function identityUrl (value, identity) {
  const hash = value.indexOf('#')
  // Tanpa fragmen → itu URL dokumen penerbit (`issuer.id`).
  if (hash === -1) return value === identityOldController(value, identity) ? identity.controller : null
  // Dengan fragmen → hanya boleh kalau fragmennya memang kunci kita; kalau bukan, jangan tebak.
  const pub = value.slice(hash + 1)
  return pub === identity.publicKeyMultibase ? `${identity.controller}#${pub}` : null
}
/**
 * Base URL lama agen dikenal dari berkas kuncinya (`listAgents()` membacanya), jadi pemindahan
 * terjadi pada URL yang kita tahu memang milik agen itu — bukan pada string apa pun yang kebetulan
 * mirip URL. Tidak cocok → `null` → tidak ditulis.
 */
function identityOldController (value, identity) {
  const old = identity.oldController
  return old && value === old ? old : null
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
  // `pindah identitas` = kunci kita pegang, controller masih di host mati, dan `--move-identity` diberikan.
  const kind = !agentMeta ? 'asing' : agentHost === edgeHost ? 'gratis' : MOVE_ID ? 'pindah identitas' : 'butuh identitas'
  plan.push({ r, short, agentMeta, agentSlug: agentMeta?.agentSlug, kind, dead, status, uid, slots, sameHash })

  console.log(`  ${short}… ${r.course} · peserta ${r.learner.slice(0, 8)}… · ${r.score ?? '?'}/100 ${r.verdict ?? ''}`)
  console.log(`    URL mati        : ${dead.map(([p, u]) => `${p}→${hostOf(u)}`).join(', ').slice(0, 150)}`)
  console.log(`    penandatangan   : ${agentMeta ? `${agentMeta.agentSlug} (controller@${agentHost})` : `tidak dikenal: ${vm.slice(0, 46)}`} → ${kind.toUpperCase()}`)
  const shape = Array.isArray(r.document?.credentialStatus) ? `credentialStatus ARRAY(${r.document.credentialStatus.length}) — bentuk lama, B68` : 'objek (bentuk sekarang)'
  console.log(`    chain           : ${status ? `exists=${status[0]} revoked=${status[1]} expired=${status[2]} delisted=${status[3]} issuer=${getAddress(status[4])}` : 'TIDAK terbaca'} · bit ${slots && slots.rev !== undefined ? `${slots.rev}/${slots.sus}` : '—'} · hash cocok=${sameHash}`)
  console.log(`    bentuk status   : ${shape}`)
}

const tally = {}
for (const p of plan) tally[p.kind] = (tally[p.kind] ?? 0) + 1
console.log(`\nringkas : ${Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(' · ') || '0 basi'}`)
console.log('          kedua kelas yang bisa dikerjakan sama-sama TIDAK menyentuh chain: uid, nomor bit, dan hash daftar ter-anchor tetap; yang berubah cuma URL + tanda tangannya')

if (!APPLY) {
  console.log('\nbaca-dulu selesai. Tambah --apply (dan --move-identity kalau kelas "pindah identitas" memang diizinkan) untuk menulis.')
  process.exit(0)
}

let done = 0
for (const p of plan) {
  if (p.kind !== 'gratis' && p.kind !== 'pindah identitas') {
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
  let issuerDoc
  if (p.kind === 'pindah identitas') {
    /**
     * Pemindahan tempat tinggal penerbit, dengan kunci yang harus tetap sama.
     *
     * Ditulis sebagai pemeriksaan, bukan sebagai asumsi: kalau `publicKeyMultibase` berubah walau
     * satu karakter, yang terjadi bukan "kertas pindah host" tapi "kertas sekarang diklaim diterbitkan
     * oleh pihak lain" — dan tanda tangannya akan tetap terlihat sah. Itu kegagalan yang tidak boleh
     * lolos tanpa suara.
     */
    const moved = agentAt(p.agentMeta, EDGE)
    // Controller LAMA diambil dari berkas kunci, jadi hanya URL yang memang kita kenali yang bisa
    // terganti. Tanpa ini, string apa pun yang kebetulan berbentuk URL akan ikut ditulis ulang.
    moved.oldController = p.agentMeta.controller
    const pubBefore = agent.key.publicKeyMultibase
    agent.key.id = moved.id
    agent.key.controller = moved.controller
    if (agent.key.id !== moved.id) { console.log(`  GAGAL ${p.short}: id kunci tidak bisa dipindah (properti read-only?)`); continue }
    if (agent.key.publicKeyMultibase !== pubBefore || pubBefore !== moved.publicKeyMultibase) {
      console.log(`  GAGAL ${p.short}: kunci publik berubah di tengah pemindahan URL — ini BUKAN kertas yang sama`)
      continue
    }
    issuerDoc = issuerDocumentFor(moved)
    // Entri, bukan hanya dokumen — lihat catatan yang sama di `publish.js`: verifier membandingkan
    // `proof.verificationMethod` dengan `assertionMethod[].id`, dan dokumen yang `id` entri-nya
    // masih host lama membuat tanda tangan yang sah kelihatan rusak.
    if (issuerDoc.id !== moved.controller
      || !issuerDoc.assertionMethod.some((m) => m.id === `${moved.controller}#${pubBefore}` && m.publicKeyMultibase === pubBefore)) {
      console.log(`  GAGAL ${p.short}: assertionMethod turunan tidak memuat "${moved.controller}#${pubBefore.slice(0, 12)}…" (dokumen: ${issuerDoc.id})`)
      continue
    }
    p.moved = moved
  } else {
    issuerDoc = issuerDocument(agent)
  }
  const loader = makeDocumentLoader({ [agent.controller]: issuerDoc, [issuerDoc.id]: issuerDoc })

  /**
   * `--fix-status-shape`: array lama → satu objek revokasi.
   *
   * Di-normalisasi TERLEBIH DAHULU, baru URL dipindah, supaya diff daun tetap bermakna: kalau
   * pemetaan bentuk terjadi sesudah perbandingan, "tidak ada perubahan selain URL" jadi kalimat
   * kosong. Yang diizinkan hanya bentuk yang kita kenali dari koreksi 27 Sep — dua entri,
   * revocation + suspension, dan **nomor revokasi yang sama dengan yang dikunci alokator**. Kalau
   * index-nya beda, yang ada di kertas bukan kertas ini, dan itu tidak kusentuh.
   */
  const source = structuredClone(p.r.document)
  let dropped = null
  if (Array.isArray(source.credentialStatus)) {
    if (!FIX_SHAPE) {
      console.log(`  LEWAT ${p.short}: credentialStatus masih ARRAY (bentuk lama, B68) — memindah host tidak mengubah isi; tambah --fix-status-shape kalau memang itu yang dimaksud`)
      continue
    }
    const cs = source.credentialStatus
    const rev = cs.find((c) => c?.statusPurpose === 'revocation')
    const sus = cs.find((c) => c?.statusPurpose === 'suspension')
    if (cs.length !== 2 || !rev || !sus) {
      console.log(`  LEWAT ${p.short}: array credentialStatus bukan bentuk lama yang kukenali (${cs.length} entri) — tidak menebak`)
      continue
    }
    if (String(rev.statusListIndex) !== String(p.slots.rev) || String(sus.statusListIndex) !== String(p.slots.sus)) {
      console.log(`  LEWAT ${p.short}: index di kertas (${rev.statusListIndex}/${sus.statusListIndex}) != alokator (${p.slots.rev}/${p.slots.sus}) — berhenti, ini bukan kertas yang sama`)
      continue
    }
    source.credentialStatus = rev
    dropped = sus
    console.log(`    bentuk  : credentialStatus array(2) → objek revokasi (index ${rev.statusListIndex}); entri suspension dibuang dan disimpan di record sebagai droppedStatusEntries`)
  }

  const touched = []
  const rewritten = retarget(source, '', touched, p.kind === 'pindah identitas' ? p.moved : null)
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
   * Bukti bahwa "hanya URL yang pindah": bandingkan daun lama vs baru, dan yang dibandingkan adalah
   * hasil normalisasi bentuk (bukan dokumen mentah) — kalau tidak, perubahan bentuk yang barusan
   * kuperbaiki secara dinyatakan menyamar sebagai "perpindahan URL" dan guard ini kehilangan artinya.
   * Path yang berubah selain `proof.*` HARUS perpindahan origin; satu saja tidak, kertas ini tidak ditulis.
   */
  const before = { ...source }
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
  // Perbedaan yang diizinkan HANYA dua bentuk: (1) origin URL kertas dipindah ke tepi,
  // (2) URL identitas penerbit lama → turunan `agentAt`. Selain itu, kertas ini tidak ditulis.
  const allowed = (d) => {
    if (typeof d.from !== 'string' || typeof d.to !== 'string') return false
    if (candidateOrigins(d.from).includes(new URL(d.from).origin) && d.to === d.from.split(new URL(d.from).origin).join(edgeOrigin)) return true
    if (p.kind === 'pindah identitas') {
      if (d.path === 'issuer.id') return d.to === p.moved.controller
      if (d.path === 'issuer.verificationMethod[0].id') return d.to === p.moved.id
      if (d.path === 'issuer.verificationMethod[0].controller') return d.to === p.moved.controller
      // `name` penerbit tidak boleh ikut berubah saat alamatnya pindah.
      if (d.path === 'proof.verificationMethod') return d.to === p.moved.id
    }
    return false
  }
  const bad = diffs.filter((d) => !allowed(d))
  if (bad.length) {
    console.log(`  GAGAL ${p.short}: ${bad.length} perubahan BUKAN perpindahan URL — tidak menulis apa pun`)
    for (const d of bad.slice(0, 4)) console.log(`        ${d.path}: ${String(d.from).slice(0, 60)} → ${String(d.to).slice(0, 60)}`)
    continue
  }
  if (p.kind === 'pindah identitas') {
    const pub = String(signed.proof?.verificationMethod ?? '').split('#').pop()
    if (pub !== p.agentMeta.publicKeyMultibase || signed.issuer?.id !== p.moved.controller) {
      console.log(`  GAGAL ${p.short}: identitas baru tidak konsisten dengan kunci lama — tidak disimpan`)
      continue
    }
  }
  // Nomor bit harus tetap angka yang sama seperti sebelum dipindah: `statusListIndex` itulah yang
  // dipakai verifier mencari bit-nya di daftar yang ter-anchor. Kalau bergeser, kertas ini menunjuk
  // status milik orang lain.
  const idx = Number(signed.credentialStatus?.statusListIndex)
  if (idx !== Number(p.slots.rev)) {
    console.log(`  GAGAL ${p.short}: statusListIndex berubah (${p.slots.rev} → ${signed.credentialStatus?.statusListIndex}) — tidak disimpan`)
    continue
  }

  const moved = {
    ...p.r,
    document: signed,
    id: signed.id,
    signedAt: new Date().toISOString(),
    rehostedAt: new Date().toISOString(),
    rehostFrom: p.dead.map(([, u]) => hostOf(u)),
    // Jejak operasi, bukan hiasan: siapa yang boleh merekonstruksi harus tahu bahwa kertas ini
    // pernah menunjuk host lain dan — untuk yang bentuknya dibetulkan — entri mana yang dibuang.
    rehostIdentity: p.kind === 'pindah identitas' ? { from: p.agentMeta.controller, to: p.moved.controller, publicKeyMultibase: p.agentMeta.publicKeyMultibase } : null,
    droppedStatusEntries: dropped ? [dropped] : (p.r.droppedStatusEntries ?? []),
  }
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

const left = plan.filter((p) => !['gratis', 'pindah identitas'].includes(p.kind))
const shapeLeft = plan.filter((p) => Array.isArray(p.r.document?.credentialStatus) && !FIX_SHAPE)
console.log(`\nselesai: ${done} kertas dipindah, ${left.length} tidak dikerjakan.`)
if (shapeLeft.length) {
  console.log(`${shapeLeft.length} di antaranya masih ber-bentuk lama (credentialStatus array, B68):`)
  console.log('  memindah host TIDAK mengubah isi dokumen, dan aku tidak mengubah isi tanpa izin yang bernama.')
  console.log('  Kalau itu yang dimaksud: tambah --fix-status-shape (satu objek revokasi, entri suspension')
  console.log('  dibuang tapi disimpan di record, dan nomor bit harus tetap sama dengan alokator).')
}
if (left.length - shapeLeft.length > 0) {
  console.log('Yang "butuh identitas" tidak kusentuh tanpa --move-identity: controller agen mengandung BASE_URL,')
  console.log('jadi memindah alamatnya = mengubah klaim "siapa yang menerbitkan" pada kertas yang sudah terbit.')
}
console.log('lanjutkan: npm run publish:edge  →  npm run verify:edge  →  npm run verify:live-cert  →  npm run validator')
