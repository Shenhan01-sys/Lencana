/**
 * `npm run course:publish -- --list | <draftId> [--apply] | <draftId> --reject ["catatan"] [--apply]` — kunci penerbit
 * memutuskan draf kursus yang diajukan anggota (B133, D67: "anggota menyusun, kunci penerbit menerbitkan").
 *
 * Terbit: audit ulang dari isi + kunci yang TERSIMPAN (bukan dari apa kata halaman), hitung `rubricHash` (aturan penilaian)
 * dan `manifestHash` (isi + waktu terbit), lalu kunci penerbit menandatangani `lencana-course publish draft=<id>
 * course=<id> rubric=<rubricHash> nonce=…`. Sejak itu kursus ada di katalog server (dimuat ulang dalam ≤ 30 detik) dan
 * halaman. Dokumen criteria-nya di tepi menyusul saat `npm run publish:edge` dijalankan builder.
 *
 * Tanpa `--apply` hanya rencana — tidak ada yang ditandatangani atau ditulis.
 */
// Lencana-B133 status=TERBUKA 2026-10-03 — penerbitan draf kursus hanya oleh kunci penerbit: audit ulang dari isi tersimpan, rubricHash + manifestHash dihitung di sini dan ikut ditandatangani. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { randomBytes } from 'node:crypto'
import { privateKeyToAccount } from 'viem/accounts'
import { loadFileEnvReport } from '../src/env.js'
import { dbConfigured, dbMissingReason, draftsOf, draftById, decideDraft } from '../src/db.js'
import { publishPlan } from '../src/drafts.js'

await loadFileEnvReport('course:publish')
const env = process.env
const args = process.argv.slice(2)
if (!dbConfigured()) { console.error(`database belum dikonfigurasi: ${dbMissingReason()}`); process.exit(2) }
if (!env.ISSUER_PRIVATE_KEY || !env.ISSUER_ADDRESS) { console.error('ISSUER_PRIVATE_KEY + ISSUER_ADDRESS diperlukan — hanya kunci penerbit yang menerbitkan kursus'); process.exit(2) }
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
if (publisher.address.toLowerCase() !== env.ISSUER_ADDRESS.toLowerCase()) { console.error('ISSUER_PRIVATE_KEY bukan kunci ISSUER_ADDRESS'); process.exit(1) }

if (args.includes('--list')) {
  const rows = (await draftsOf(publisher.address, { includeTest: args.includes('--test') })).filter((r) => r.status === 'submitted' || args.includes('--all'))
  console.log(`draf ${args.includes('--all') ? '(semua status)' : 'yang menunggu keputusan'} untuk penerbit ${publisher.address}: ${rows.length}`)
  for (const r of rows) {
    const lessons = (r.content?.modules ?? []).reduce((n, m) => n + (m.lessons?.length ?? 0), 0)
    console.log(`  #${r.id}  ${r.course_id}  "${r.content?.title ?? ''}"  ${r.status}  penyusun ${r.author}  ${lessons} lesson  harga ${r.price_units ?? 'gratis'}  masalah ${(r.problems ?? []).length}  asal ${r.origin}`)
  }
  if (rows.length) console.log('\nterbitkan: npm run course:publish -- <id> --apply   ·   tolak: npm run course:publish -- <id> --reject "alasan" --apply')
  process.exit(0)
}

const id = Number(args.find((a) => /^\d+$/.test(a)))
if (!Number.isInteger(id) || id <= 0) { console.error('pakai: npm run course:publish -- --list [--all] [--test] | <draftId> [--apply] | <draftId> --reject ["catatan"] [--apply]'); process.exit(2) }
const row = await draftById(id)
if (!row) { console.error(`draf #${id} tidak ada`); process.exit(1) }
if (row.status !== 'submitted') { console.error(`draf #${id} berstatus ${row.status} — hanya draf yang diajukan yang bisa diputuskan`); process.exit(1) }
const rejectAt = args.indexOf('--reject')
const reject = rejectAt >= 0
const note = reject && args[rejectAt + 1] && !args[rejectAt + 1].startsWith('--') ? args[rejectAt + 1] : null
const apply = args.includes('--apply')
const nonce = randomBytes(10).toString('hex')

console.log(`draf #${id} — ${row.course_id} "${row.content?.title ?? ''}" oleh ${row.author} · harga ${row.price_units ?? 'gratis'} · asal ${row.origin}`)
if (reject) {
  const message = `lencana-course reject draft=${id} nonce=${nonce}`
  if (!apply) { console.log(`rencana: TOLAK${note ? ` ("${note}")` : ''} — tanpa --apply tidak ada yang ditandatangani`); process.exit(0) }
  const out = await decideDraft({ draftId: id, issuer: publisher.address, decision: 'reject', note, message, signature: await publisher.signMessage({ message }) })
  if (!out.ok) { console.error(`DITOLAK: ${out.why}`); process.exit(1) }
  console.log(`ditolak: draf #${id} — penyusun bisa menyuntingnya lagi`)
  process.exit(0)
}

const plan = await publishPlan(row)
if (plan.problems.length) {
  console.error(`berhenti: ${plan.problems.length} masalah pada isi tersimpan (audit ulang):`)
  for (const p of plan.problems.slice(0, 12)) console.error(`  ${p.where}: ${p.what}`)
  process.exit(1)
}
console.log(`  rubricHash   ${plan.rubricHash}`)
console.log(`  manifestHash ${plan.manifestHash}`)
console.log(`  terbit       ${plan.publishedAt}`)
if (!apply) { console.log('rencana: TERBITKAN — tanpa --apply tidak ada yang ditandatangani'); process.exit(0) }
const message = `lencana-course publish draft=${id} course=${row.course_id} rubric=${plan.rubricHash} nonce=${nonce}`
const out = await decideDraft({
  draftId: id, issuer: publisher.address, decision: 'publish', rubricHash: plan.rubricHash, manifestHash: plan.manifestHash,
  publishedAt: plan.publishedAt, message, signature: await publisher.signMessage({ message }),
})
if (!out.ok) { console.error(`DITOLAK: ${out.why}`); process.exit(1) }
console.log(`diterbitkan: ${row.course_id} (draf #${id}) — server memuatnya dalam ≤ 30 detik; criteria di tepi menyusul publish:edge`)
console.log(`pesan bertanda tangan: ${message}`)
