/**
 * `npm run check:identity` — B84: apakah "identitas penerbit" masih satu hal.
 *
 * Kenapa ini ada: B83 sudah memaksa penerbitan memakai SATU sumber (kode merakit dokumen dari
 * berkas kunci, bukan dari ingangan env), tapi itu hanya menjamin *satu jalur tulis*. Yang dibaca
 * orang adalah tiga salinan yang hidup terpisah: dokumen yang dibangun `issuer.js` sekarang, yang
 * disajikan signer lokal, dan yang tersimpan di KV tepi. Kalau ketiganya berbeda, verifier asing
 * resolving `proof.verificationMethod` ke host tepi akan menemukan kunci yang bukan pembubuh
 * tanda tangan di kertas — kegagalan yang persis terjadi pada `agent-b41.json` (host tunnel mati).
 *
 * Perbandingan dilakukan pada HASH DOKUMEN yang sama (bukan string `id` sepotong), karena yang
 * harus cocok adalah seluruh isi yang dipercaya verifier. Keluar: 0 = sama, 1 = berbeda.
 */
import { createHash } from 'node:crypto'
import { loadFileEnvReport } from '../src/env.js'
import { identityBase, issuerDocumentFor, listAgents, loadKey } from '../src/issuer.js'

await loadFileEnvReport('check:identity')
const env = process.env
const EDGE = (env.EDGE_BASE_URL ?? 'https://lencana-edge.hansgunawan775.workers.dev').replace(/\/$/, '')
const LOCAL = (env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const slug = env.AGENT_SLUG ?? 'agent-edge'

const hash = (o) => createHash('sha256').update(JSON.stringify(o)).digest('hex').slice(0, 16)
const get = async (url) => {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
    return { ok: r.ok, status: r.status, body: r.ok ? await r.json() : null }
  } catch (e) { return { ok: false, status: `gagal ${String(e?.name ?? e?.code ?? e)}`, body: null } }
}

const sumber = []
const agen = (await listAgents()).find((a) => a.agentSlug === slug)
if (!agen) { console.log(`BATAL agen ${slug} tidak ada di .keys/ — daftar: ${(await listAgents()).map((a) => a.agentSlug).join(', ')}`); process.exit(1) }
const kunci = agen // catatan dari .keys/: id + publicKeyMultibase + controller
const dibangun = issuerDocumentFor(agen)
sumber.push(['issuer.js (pembangun tunggal)', { ok: Boolean(dibangun), body: dibangun, status: dibangun ? 200 : 'builder mengembalikan objek kosong' }])
sumber.push(['signer lokal', await get(`${LOCAL}/issuers/${slug}`)])
sumber.push(['tepi (KV)', await get(`${EDGE}/issuers/${slug}`)])
sumber.push(['catatan .keys/ (via listAgents)', { ok: Boolean(kunci?.id && kunci?.publicKeyMultibase), body: { id: kunci?.id, controller: kunci?.controller, publicKeyMultibase: kunci?.publicKeyMultibase } }])

console.log(`\ncheck:identity — agen ${slug}, baseUrl identitas = ${identityBase(env)}`)
const dokumen = {}
for (const [nama, r] of sumber) {
  if (!r.ok) { console.log(`  TIDAK TERBACA ${nama} -> ${r.status}`); continue }
  const h = hash(r.body)
  dokumen[nama] = h
  console.log(`  ok    ${nama.padEnd(26)} hash=${h}`)
}
// yang dibandingkan adalah dokumen issuer utangnya (id + assertionMethod), bukan catatan kunci
// Catatan .keys/ BUKAN dokumen issuer — ia bahan bakunya ({id, controller, publicKeyMultibase}),
// jadi hash-nya memang tidak akan pernah sama dengan dokumen. Menuntutnya sama adalah salah
// tanya (ini ke-3 kalinya gerbang yang kutulis sendiri mengadili dua hal yang tak sebanding).
// Yang benar: ia harus TERMUAT di dalam dokumen — itu diperiksa oleh dua cek di bawah.
const dua = Object.entries(dokumen).filter(([n]) => !n.startsWith('catatan .keys/'))
let ran = 0; let gagal = 0
const cek = (label, ok, detail = '') => { ran++; if (!ok) { gagal++; console.log(`  GAGAL ${label}${detail ? ` -> ${detail}` : ''}`) } else console.log(`  ok    ${label}`) }
cek(`dokumen identitas identik di ${dua.length} sumber (builder, signer lokal, tepi)`, dua.length >= 2 && new Set(dua.map(([, h]) => h)).size === 1,
  dua.map(([n, h]) => `${n}=${h}`).join(' | ') || 'kurang sumber yang terbaca')
cek('baseUrl yang dipakai = host tetap tepi (bukan tunnel/loopback)', /^(https):\/\/[^/]+$/.test(String(identityBase(env))) && !/trycloudflare|127\.0\.0\.1|localhost/.test(identityBase(env)),
  identityBase(env))
// perbandingan EKSAK, bukan potongan: dulu aku membandingkan 24 karakter pertama, yang membuat
// pemeriksaan ini bisa hijau walau kuncinya beda sepanjang sisa stringnya.
cek('kunci pada dokumen tepi = kunci di berkas kita', (() => {
  const doc = sumber.find(([n]) => n.startsWith('tepi'))?.[1]?.body
  const entri = (doc?.assertionMethod ?? []).find((x) => x.id === kunci?.id)
  return Boolean(entri) && entri.publicKeyMultibase === kunci.publicKeyMultibase && entri.controller === kunci.controller
})(), `id=${kunci?.id} tidak ada/beda di assertionMethod tepi`)
cek('dokumen builder memakai kunci yang sama dengan berkas .keys/', (() => {
  const entri = (dibangun?.assertionMethod ?? []).find((x) => x.id === kunci?.id)
  return Boolean(entri) && entri.publicKeyMultibase === kunci.publicKeyMultibase
})(), 'builder menghasilkan kunci/controller lain dari berkas')
console.log(`\nIDENTITAS ${gagal === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${gagal} gagal`)
process.exitCode = gagal === 0 ? 0 : 1
