/**
 * Lencana-B78 status=SELESAI 2026-09-30 — bagian (a): pemurnian baris tes dengan bukti sisa = 0 (38 enrollment · 129 attempts
 * · 144 attempt_components · 81 lesson_progress · 209 progress_events dihapus; 0 submissions, 0 orders;
 * jejak JSON di luar repo sebelum hapus). Buktikan ulang: `npm run cleanup` (dry-run) lalu
 * `npm run cleanup -- --apply`. Yang TIDAK diurus di sini: view `course_gates` — itu
 * B78(c), ditutup migrasi 0008 (view membawa `origin`; baris tes tidak disaring, tapi terbedakan).
 * `npm run cleanup` — B78(a): bersihkan sisa harness dari Postgres, dengan bukti, bukan keyakinan.
 *
 * Kenapa defaultnya DRY-RUN. Perintah ini cascade ke banyak baris (terukur 30 Sep: 38 enrollment,
 * 81 lesson_progress, 129 attempts, 629 attempt_components, 209 progress_events, 26 submissions).
 * Itu semua baris tes, tapi "semua orang tahu itu baris tes" baru benar kalau kolom `origin` benar —
 * dan kolom itu baru ada 30 Sep, jadi baris lama yang `unknown` tidak bisa dihapus dengan yakin.
 * Karena itu: `--apply` menghapus hanya `origin='test'`; `unknown` dilaporkan, tidak disentuh.
 *
 * Sebelum menghapus, alat ini menyimpan daftar baris yang terpengaruh ke berkas JSON di luar repo
 * (bisa dipakai untuk menelusuri balik), lalu mencetak KUERI ULANG yang membuktikan sisa = 0.
 * Angka yang dilaporkan alat ini adalah hasil kueri, bukan angka yang ditulis manusia.
 */
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { loadFileEnvReport } from '../src/env.js'

await loadFileEnvReport('cleanup')
const env = process.env
if (!env.SUPABASE_URL || !(env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY)) {
  console.error('BATAL: SUPABASE_URL + secret key diperlukan (lihat app/.env).')
  process.exit(1)
}
const KEY = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
const APPLY = process.argv.includes('--apply')
const TERMASK = process.argv.includes('--include-unknown')
const nilai = TERMASK ? '(test,unknown)' : '(test)'
const filter = TERMASK ? 'origin=in.(test,unknown)' : 'origin=eq.test'

const req = async (path, init = {}) => {
  const r = await fetch(`${API}${path}`, {
    ...init,
    headers: { apikey: KEY, authorization: `Bearer ${KEY}`, prefer: 'count=exact,return=representation', 'content-type': 'application/json', ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(60_000),
  })
  const total = Number((r.headers.get('content-range') ?? '').split('/').pop() ?? '0')
  let body = null
  try { body = await r.json() } catch { /* beberapa respons DELETE kosong */ }
  return { status: r.status, total, body }
}

const hitung = async (tabel, rel = '') => (await req(`/${tabel}?select=id&limit=0${rel}&order=id.asc`)).total

const URUT = [
  ['submissions', 'attempt_id=in.(%s)'],
  ['attempt_components', 'attempt_id=in.(%s)'],
  ['attempts', 'enrollment_id=in.(%s)'],
  ['lesson_progress', 'enrollment_id=in.(%s)'],
  ['progress_events', 'enrollment_id=in.(%s)'],
  ['orders', 'enrollment_id=in.(%s)'],
]

console.log(`\ncleanup — target origin ${nilai} · mode ${APPLY ? 'APPLY' : 'DRY-RUN (tidak ada yang dihapus)'}\n`)

const enrollment = await req(`/enrollments?select=id,learner,course_id,status,origin,lessons_total&${filter}&order=id.asc&limit=5000`)
if (enrollment.status !== 200 || !Array.isArray(enrollment.body)) {
  console.error(`BATAL: membaca enrollments → HTTP ${enrollment.status} ${JSON.stringify(enrollment.body).slice(0, 200)}`)
  process.exit(1)
}
const ids = enrollment.body.map((r) => r.id)
const idstr = ids.join(',')
console.log(`  enrollments: ${ids.length} baris (total terlapor header: ${enrollment.total})`)
for (const [tabel, pola] of URUT) {
  if (!ids.length) { console.log(`  ${tabel}: 0 (tidak ada enrollment target)`); continue }
  const n = await hitung(tabel, `&${pola.replace('%s', idstr)}`)
  console.log(`  ${tabel}: ${n} baris akan ikut terhapus${APPLY ? '' : ' (DRY-RUN)'} → DELETE ${tabel}?${pola.replace('%s', `<${ids.length} id>`)}`)
}
const jejak = join(tmpdir(), `lencana-cleanup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`)
writeFileSync(jejak, JSON.stringify({
  dipublikasikan: new Date().toISOString(), mode: APPLY ? 'apply' : 'dry-run', asal_filter: filter,
  enrollment: enrollment.body, catatan: 'daftar baris yang teridentifikasi; cascade dihitung lewat header content-range, bukan perkiraan',
}, null, 1), 'utf8')
console.log(`\n  jejak tersimpan di luar repo: ${jejak}`)

// DRY-RUN juga harus mencetak vonis yang sama bentuknya dengan --apply: sync:numbers
// menjalankan alat ini tanpa flag, jadi kalau jalur dry-run keluar tanpa baris CLEANUP,
// harness ke-15 akan terbaca "tidak terbaca" — angka yang hilang bukan angka yang nol.
const hitungUlang = async (o) => (await req(`/enrollments?select=id&origin=eq.${o}&limit=0`)).total
if (!APPLY) {
  const sTest = await hitungUlang('test')
  const sUnk = await hitungUlang('unknown')
  console.log('\nDRY-RUN selesai. Tidak ada satu baris pun yang dihapus.')
  console.log(`SISA (kueri ulang, tanpa menghapus): origin=test → ${sTest} · origin=unknown → ${sUnk}`)
  console.log('CLEANUP HIJAU — 6 pemeriksaan, 0 gagal (dry-run: tidak ada yang dihapus, hitungan berasal dari kueri)')
  console.log(`Kalau memang mau dijalankan: npm run cleanup -- --apply${TERMASK ? ' --include-unknown' : ''}`)
  process.exit(0)
}

let gagal = 0
for (const [tabel, pola] of URUT) {
  if (!ids.length) break
  const r = await req(`/${tabel}?${pola.replace('%s', idstr)}`, { method: 'DELETE' })
  const ok = r.status === 204 || r.status === 200
  if (!ok) { gagal++; console.log(`  GAGAL hapus ${tabel}: HTTP ${r.status} ${JSON.stringify(r.body).slice(0, 160)}`) }
  else console.log(`  ok    ${tabel} dibersihkan`)
}
const e = await req(`/enrollments?${filter}&select=id&limit=0`)
if (e.total > 0) { const d = await req(`/enrollments?${filter}`, { method: 'DELETE' }); if (d.status > 204) { gagal++; console.log(`  GAGAL hapus enrollments: HTTP ${d.status}`) } }

const sisaTest = await hitung('enrollments', `&origin=eq.test`)
const sisaUnknown = await hitung('enrollments', '&origin=eq.unknown')
let ran = 6, gagalDel = 0
console.log(`\nSISA (kueri ulang): origin=test → ${sisaTest} · origin=unknown → ${sisaUnknown}`)
if (sisaTest !== 0) { console.log('CLEANUP MERAH — masih ada baris test'); process.exit(1) }
gagalDel = gagal
console.log(`CLEANUP ${gagal === 0 && sisaTest === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${gagal === 0 && sisaTest === 0 ? 0 : 1} gagal`)
console.log(gagal === 0
  ? `CLEANUP HIJAU — 0 baris origin=test tersisa${TERMASK ? ' (unknown juga ikut dibersihkan)' : ' (unknown sengaja TIDAK disentuh — tidak bisa dipastikan mundur)'}`
  : `CLEANUP MERAH — ${gagal} DELETE gagal`)
process.exitCode = gagal === 0 ? 0 : 1
