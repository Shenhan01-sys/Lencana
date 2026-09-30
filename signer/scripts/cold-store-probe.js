/**
 * `npm run probe:cold` — B42: server signer dijalankan dengan **store DINGIN**, seperti
 * orang yang datang dari `git clone`.
 *
 * Kenapa ini ada (dan kenapa ia bukan variasi kecil dari `probe:serve`): `serve-probe` menguji
 * server yang SEDANG BERJALAN dengan `.store/state.json` berisi 19 kertas kita. Semua jalur yang
 * bergantung pada isi store — `/credentials/<hash>`, `/results/<course>/<hash>`, panel "kertas ini
 * dokumen aslinya di mana" — karenanya selalu diuji pada keadaan paling ramah. Keadaan yang dilihat
 * orang pertama kali justru sebaliknya: store kosong. Di 29 Sep baris B42 masih menyebut celah ini
 * terbuka setelah langkah validatornya (yang juga bernama B41) dinyatakan selesai — jadi celah ini
 * kehilangan nomornya, bukan hilang. Baris baru: **B106**.
 *
 * Yang diuji di sini, dan apa yang membuatnya beda dari probe lain:
 *  1. store dingin → rute dokumen menjawab **404 dengan sebab yang bernama**, bukan 500 dan bukan
 *     200 berbadan kosong;
 *  2. identitas penerbit **tidak ikut hilang** bersama store (dokumen penerbit dirakit dari manifest
 *     + kunci, bukan dari `.store`) — ini yang membuat "verifikasi tanpa menghubungi kami" tetap
 *     berdiri di clone baru;
 *  3. `/healthz` tetap jujur: `ok:true` dengan `watched` yang berasal dari `STATUS_HASHES`, dan
 *     `startedAt` + `codeStamp` (penjaga B86) tersedia supaya tidak ada merah palsu;
 *  4. **store hangat tidak tersentuh** — `state.json` asli dibandingkan sebelum dan sesudah, karena
 *     harness yang menulis ke 19 kertas kita jauh lebih berbahaya daripada harness yang gagal.
 *
 * Ia TIDAK menulis apa pun ke repo: direktori store dibuat di `os.tmpdir()` dan dibersihkan.
 * Tidak ada transaksi, tidak ada publish, tidak ada uang sungguuhan.
 */

// Lencana-B42 status=SELESAI 2026-09-29 — keadaan clone (.store kosong) diuji; /healthz tidak boleh 500 di sana. Buktikan ulang: npm run probe:cold. JANGAN dibalik/diulang tanpa membuka kembali baris B42 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { spawn } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadFileEnvReport } from '../src/env.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
const STATE = join(SIGNER, '.store', 'state.json')

await loadFileEnvReport('probe:cold')

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { failed += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 170)}` : ''}`) }
}

// --- 0. keadaan awal: store hangat + satu hash nyata untuk diuji silang ---------------------
let warmHashes = []
let warmBefore = null
if (existsSync(STATE)) {
  warmBefore = statSync(STATE)
  try {
    const st = JSON.parse(readFileSync(STATE, 'utf8'))
    // KUNCI `credentials` adalah URL dokumen, bukan hash — hash ada di field-nya. Versi pertama
    // probe ini mencari hash di nama kunci, tidak menemukannya, lalu diam-diam pakai hash fiktif:
    // uji "hash nyata 404 di store dingin" pun berubah jadi uji "hash karangan 404". Bukan salah
    // servernya.
    warmHashes = Object.values(st.credentials ?? {}).map((c) => String(c.credentialHash ?? '').toLowerCase()).filter((h) => /^0x[0-9a-f]{64}$/.test(h))
  } catch (e) { console.log(`  info  store hangat tidak terbaca (${String(e.message).slice(0, 60)}) — uji silang pakai hash fiktif`) }
}
const REAL_HASH = warmHashes[0] ?? `0x${'ab'.repeat(32)}`
console.log(`\nprobe:cold — store hangat ${warmHashes.length} hash · objek uji ${REAL_HASH.slice(0, 14)}… (${warmHashes.length ? 'NYATA dari state.json' : 'FIKTIF — state.json tidak terbaca'})\n`)

// --- 1. nyalakan server dengan store DINGIN di luar repo ------------------------------------
const coldDir = mkdtempSync(join(tmpdir(), 'lencana-cold-'))
async function freePort (from) {
  for (let p = from; p < from + 14; p++) {
    try {
      await fetch(`http://127.0.0.1:${p}/healthz`, { signal: AbortSignal.timeout(600) })
      console.log(`      port ${p} dipegang proses lain — coba berikutnya`)
    } catch { return p }
  }
  return from
}
const PORT = Number(process.env.COLD_PROBE_PORT ?? await freePort(8817))
const BASE = `http://127.0.0.1:${PORT}`

// `serve` dijalankan lewat npm, sama seperti attempts-check: server.js adalah sumber yang sama yang
// akan dipakai orang dari clone, dan `npm run serve` memakai tsx — memaksanya lewat `node` langsung
// membuat probe ini mati karena resolver, bukan karena servernya.
const child = spawn('npm', ['run', 'serve'], {
  cwd: SIGNER,
  env: { ...process.env, LANCENA_STORE: coldDir, PORT: String(PORT), HOST: '127.0.0.1', BASE_URL: BASE },
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true,
})
let errBuf = ''
child.stdout.on('data', () => {})
child.stderr.on('data', (d) => { errBuf += String(d) })
child.on('error', (e) => { errBuf += `spawn error: ${String(e.message ?? e)}` })

async function get (path) {
  const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12000) })
  const text = await res.text()
  let body = null
  try { body = JSON.parse(text) } catch { /* sengaja dibiarkan: uji di bawah menuntut JSON */ }
  return { status: res.status, body, text, ctype: res.headers.get('content-type') ?? '', stale: res.headers.get('x-lencana-stale') }
}

const finish = (code) => {
  // Windows: `npm run serve` ditanakkan di cangkang shell, jadi child.kill() hanya membunuh
  // cangkangnya dan node grandchildrenya tetap memegang port (pelajaran B86 — dua kali).
  if (process.platform === 'win32' && child.pid) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
  else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  let isi = -1
  try { isi = readdirSync(coldDir).length } catch { /* tidak tercipta */ }
  try { rmSync(coldDir, { recursive: true, force: true }) } catch { /* dibuang OS juga */ }
  console.log(`\nPROBE COLD ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal · store dingin meninggalkan ${isi} berkas (dibersihkan)`)
  process.exitCode = failed === 0 ? (code ?? 0) : 1
}

try {
  // --- 2. server dingin harus menjawab ------------------------------------------------------
  // "Menjawab" ≠ "menjawab 200". Versi pertama probe ini mencampur keduanya, jadi `/healthz` yang
  // membalas **500** (servernya hidup, route-nya yang crash) dilaporkan sebagai "server tidak naik"
  // — yaitu menyalahkan proses untuk kesalahan kode. Sekarang: apa pun responsnya dihitung naik,
  // dan status 5xx dibedakan dengan badannya.
  let health = null
  for (let i = 0; i < 60 && !health; i++) {
    try { health = await get('/healthz') } catch { /* belum listen */ }
    if (!health) await new Promise((r) => setTimeout(r, 500))
  }
  check('server store dingin menjawab /healthz dalam <30 s (hidup)', Boolean(health), health ? `HTTP ${health.status}` : `tidak ada respons sama sekali · stderr: ${errBuf.slice(0, 200)}`)
  if (!health) throw new Error('server dingin tidak menjawab sama sekali — sisa pemeriksaan tidak bisa dijalankan')
  check('route /healthz tidak crash pada store dingin (harus 200)', health.status === 200,
    `HTTP ${health.status} · badan: ${health.text.slice(0, 220)} · stderr anak: ${errBuf.trim().slice(-220) || '(kosong)'}`)
  if (health.status !== 200) throw new Error(`/healthz menjawab ${health.status} — ini temuan B42, bukan kegagalan probe`)

  const h = health.body
  check('/healthz ok:true pada store kosong (probe tidak menghukum clone baru)', h?.ok === true, JSON.stringify(h).slice(0, 120))
  check('/healthz melaporkan identitas yang ia sajikan', typeof h?.agent === 'string' && Array.isArray(h?.agentSlugs) && h.agentSlugs.length > 0,
    `agent=${h?.agent} slugs=${JSON.stringify(h?.agentSlugs)}`)
  check('startedAt + codeStamp ada (penjaga B86 bekerja di proses cold juga)', Boolean(h?.startedAt) && Boolean(h?.codeStamp), JSON.stringify({ s: h?.startedAt, c: h?.codeStamp }))
  check('watched berasal dari STATUS_HASHES, bukan dari isi store', Number.isInteger(h?.watched) && h.watched >= 0, `watched=${h?.watched}`)
  check('baseUrl self-report = alamat cold (tidak mewarisi 8787)', h?.baseUrl === BASE, `${h?.baseUrl} vs ${BASE}`)

  // --- 3. identitas penerbit TIDAK boleh bergantung pada store ------------------------------
  const iss = await get(`/issuers/${h.agent}`)
  check(`GET /issuers/${h.agent} -> 200 dengan assertionMethod`, iss.status === 200 && Array.isArray(iss.body?.assertionMethod) && iss.body.assertionMethod.length > 0,
    `${iss.status} ${iss.text.slice(0, 90)}`)
  check('kunci Multikey tersaji walau store dingin', typeof iss.body?.assertionMethod?.[0]?.publicKeyMultibase === 'string',
    JSON.stringify(iss.body?.assertionMethod?.[0] ?? {}).slice(0, 120))

  // --- 4. dua daftar status tetap disajikan --------------------------------------------------
  for (const purpose of ['revocation', 'suspension']) {
    const l = await get(`/credentials/status/${purpose}`)
    check(`GET /credentials/status/${purpose} -> 200 (bukan 503 'not-published' saat store dingin)`, l.status === 200,
      `${l.status} stale=${l.stale ?? '-'} ${l.text.slice(0, 80)}`)
    check(`daftar ${purpose} bertanda tangan dan ber-bentuk BitstringStatusListCredential`,
      (l.body?.type ?? []).includes('BitstringStatusListCredential') && typeof l.body?.proof?.proofValue === 'string',
      `type=${JSON.stringify(l.body?.type)} proof=${typeof l.body?.proof?.proofValue}`)
  }

  // --- 5. INTI B42: rute yang bergantung dokumen menjawab jujur, bukan crash ----------------
  // Yang membuat pemeriksaan di bawah berarti: objek uji yang sama harus 200 di tepi sajian kita.
  // Tanpa jangkar ini, "404 di store dingin" tidak membedakan store dingin dari dokumen yang memang
  // hilang di mana-mana — dan hijau yang tidak bisa salah bukan bukti, tapi kebetulan.
  const EDGE = (process.env.EDGE_BASE_URL ?? 'https://lencana-edge.hansgunawan775.workers.dev').replace(/\/$/, '')
  let atEdge = null
  try { atEdge = (await fetch(`${EDGE}/credentials/${REAL_HASH}`, { signal: AbortSignal.timeout(15000) })).status } catch (e) { atEdge = `gagal ${e?.name ?? ''}` }
  check(`objek uji adalah kertas yang benar-benar terbit (${EDGE} menjawab 200)`, atEdge === 200,
    `${REAL_HASH.slice(0, 14)}… → ${atEdge}`)

  const doc = await get(`/credentials/${REAL_HASH}`)
  check(`GET /credentials/<hash nyata> pada store dingin -> 404, bukan 500/200`, doc.status === 404,
    `${doc.status} ${doc.text.slice(0, 120)}`)
  check('404-nya menyebut sebab yang bisa dibaca orang', typeof doc.body?.error === 'string' && doc.body.error.length > 12, JSON.stringify(doc.body).slice(0, 150))
  check('404-nya menjawab dengan JSON (bukan HTML/stack)', doc.ctype.includes('application/json') && doc.body !== null, `content-type=${doc.ctype}`)

  const res = await get(`/results/web3-dasar-2026/${REAL_HASH}`)
  check('GET /results/<course>/<hash> -> 404 dengan sebab bernama', res.status === 404 && typeof res.body?.error === 'string',
    `${res.status} ${JSON.stringify(res.body).slice(0, 120)}`)

  const bogus = await get('/credentials/0x' + 'cd'.repeat(32))
  check('hash yang tidak ada di mana pun -> 404, tanpa menabrak chain', bogus.status === 404, `${bogus.status} ${bogus.text.slice(0, 110)}`)

  const unknown = await get('/issuers/tidak-ada-slug-ini')
  check('slug agen asing -> 404 yang menyebut slug yang dikenal', unknown.status === 404 && Array.isArray(unknown.body?.known) && unknown.body.known.length > 0,
    `${unknown.status} ${JSON.stringify(unknown.body?.known ?? unknown.body)}`)

  // --- 6. store hangat terjamin tidak tersentuh ----------------------------------------------
  const coldStatePath = join(coldDir, 'state.json')
  if (existsSync(coldStatePath)) {
    const cs = JSON.parse(readFileSync(coldStatePath, 'utf8'))
    check('store dingin terISOLASI: state.json miliknya berisi 0 kredensial (19 kertas kita tidak menetes ke clone)',
      Object.keys(cs.credentials ?? {}).length === 0, `kredensial di cold = ${Object.keys(cs.credentials ?? {}).length}`)
  } else {
    check('pembacaan tidak memicu tulis-menulis di store dingin', true, '(tidak ada state.json dibuat — lebih baik dari yang diharapkan)')
  }
  if (warmBefore) {
    const after = statSync(STATE)
    check('state.json Hangat TIDAK berubah ukuran/mtime oleh probe ini',
      after.size === warmBefore.size && after.mtimeMs === warmBefore.mtimeMs,
      `sebelum ${warmBefore.size}B @${warmBefore.mtime.toISOString()} → sesudah ${after.size}B @${after.mtime.toISOString()}`)
  } else check('state.json hangat tersedia untuk dibandingkan', false, 'berkas tidak ada — pemeriksaan proteksi tidak bisa jalan')

  check('server masih hidup setelah semua pembacaan (tidak ada route yang crash proses)', child.exitCode === null && !child.killed, `exit=${child.exitCode}`)
  if (errBuf.trim()) console.log(`  info  stderr anak: ${errBuf.trim().slice(0, 220)}`)
  finish(0)
} catch (e) {
  console.log(`  BATAL ${String(e?.message ?? e).slice(0, 160)}`)
  finish(1)
}
