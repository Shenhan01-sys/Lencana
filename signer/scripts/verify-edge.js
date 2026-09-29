/**
 * `npm run verify:edge` — memeriksa apakah SEMUA yang kita punya sudah terbaca dari tepi sajian.
 *
 * Kenapa harness ini ada dan kenapa ia bukan `publish:edge`. Yang terakhir membuktikan "yang baruku
 * terbitkan sampai ke pembaca"; ia tidak bisa menjawab "ada yang belum kuterbitkan sama sekali".
 * Dan justru itu cara kegagalan yang paling diam: `npm run issue` mencetak kredensial baru yang di
 * dalamnya tertulis URL tepi, lalu kita lupa `publish:edge`. Kertasnya keluar dari printer dengan
 * alamat yang jawabannya 404. Tidak ada tanda tangan yang rusak, tidak ada bit yang meleset — hanya
 * dokumen yang tidak pernah dikirim.
 *
 * Ini juga bukan sekadar "dokumennya ada". Untuk setiap berkas, URL yang DICETAK DI DALAMNYA yang
 * diperiksa: `verificationMethod`, kedua `statusListCredential`, `achievement.criteria.id`,
 * `result[0].id`. Sebuah kredensial yang tersaji tapi menunjuk daftar yang belum tersaji adalah
 * klaim yang bisa dibantah satu klik oleh juri yang sedang iseng.
 *
 * Sumber kebenaran "apa yang kita punya" = store; "apa yang tepi klaim" = /healthz-nya sendiri.
 * Tidak ada angka yang diketik di berkas ini.
 */
import { listCredentials } from '../src/store.js'
import { EDGE_ROUTES, PURPOSES } from '../src/edgeKeys.js'
import { readAnchor } from '../src/anchor.js'
import { loadFileEnvReport } from '../src/env.js'

await loadFileEnvReport('verify:edge')
const env = process.env
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'

// Host dibaca dari tepi itu sendiri, bukan dari lingkungan: kalau `EDGE_BASE_URL` hari ini menunjuk
// tempat lain, yang mau kita uji adalah yang tercetak di kertas, dan itu ada di /healthz.
let BASE = (env.EDGE_BASE_URL || '').replace(/\/$/, '')
let health = null
try {
  const r = await fetch(`${BASE}/healthz`, { headers: { accept: 'application/json' } })
  health = await r.json().catch(() => null)
  if (!r.ok || !health?.ok) health = null
} catch { /* host mati -> ditangani di bawah */ }

if (!BASE || !health) {
  console.error('tepi tidak menjawab di EDGE_BASE_URL — tidak ada yang bisa disimpulkan')
  console.error(`  EDGE_BASE_URL = ${BASE || '(kosong)'}`)
  process.exit(1)
}

const edgeFromDocs = health.baseUrl ? String(health.baseUrl).replace(/\/$/, '') : null
if (edgeFromDocs && edgeFromDocs !== BASE) {
  console.log(`  info  tepi ini menyatakan baseUrl = ${edgeFromDocs} (kita memeriksa lewat sana)`)
  BASE = edgeFromDocs
}

let ran = 0
let fails = 0
function check (name, ok, detail = '') {
  ran += 1
  if (ok) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}

/** Satu fetch, satu bentuk jawaban: 200 + JSON. Selain itu dianggap belum sampai ke pembaca. */
async function get (path) {
  try {
    const r = await fetch(BASE + path, { headers: { accept: 'application/json' } })
    const body = await r.json().catch(() => null)
    return { status: r.status, body, stale: r.headers.get('x-lencana-stale') }
  } catch (e) {
    return { status: 0, body: null, error: String(e.message ?? e) }
  }
}

const records = await listCredentials()
const withDocs = records.filter((r) => r.document)
console.log(`\n  store   : ${records.length} rekaman, ${withDocs.length} dengan dokumen bertanda tangan`)
console.log(`  tepi    : publish ${health.publishedAt} · ${health.counts?.credentialsWithDocument ?? '?'} dokumen, ${health.counts?.results ?? '?'} hasil, ${health.counts?.courses?.length ?? '?'} kursus`)
console.log(`  chain   : ${health.revocation?.watched ?? '?'} hash dipantau · revocation cocok=${health.revocation?.matchesChainNow} · suspension cocok=${health.suspension?.matchesChainNow}`)

// Yang paling mudah terlewat: kita menambah kertas, tidak menambah terbitan.
check('tepi mengklaim jumlah dokumen sama dengan store',
  health.counts?.credentialsWithDocument === withDocs.length,
  `tepi=${health.counts?.credentialsWithDocument} store=${withDocs.length} — jalankan npm run publish:edge`)
check('kedua daftar status masih cocok dengan chain saat ini',
  health.revocation?.matchesChainNow === true && health.suspension?.matchesChainNow === true,
  JSON.stringify({ rev: health.revocation?.matchesChainNow, sus: health.suspension?.matchesChainNow }))

const missing = []
const byHost = new Map()
const LIVE_PROBE_MS = 6000
async function hostAlive (origin) {
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), LIVE_PROBE_MS)
    const r = await fetch(`${origin}/healthz`, { signal: ctl.signal, headers: { accept: 'application/json' } })
    clearTimeout(t)
    return r.ok
  } catch {
    return false
  }
}

for (const rec of withDocs) {
  const hash = String(rec.credentialHash).toLowerCase()
  const doc = rec.document
  const printed = [
    doc?.proof?.verificationMethod,
    doc?.credentialStatus?.statusListCredential,
    ...(Array.isArray(doc?.credentialStatus) ? doc.credentialStatus.map((e) => e?.statusListCredential) : []),
    doc?.issuer?.id ?? (typeof doc?.issuer === 'string' ? doc.issuer : null),
    doc?.achievement?.criteria?.id,
    (Array.isArray(doc?.result) ? doc.result[0]?.id : doc?.result?.id),
  ].filter((u) => typeof u === 'string' && u.startsWith('http'))

  const hosts = [...new Set(printed.map((u) => new URL(u).host))].sort()
  const key = hosts.join(' , ') || '(tanpa URL http)'
  const bucket = byHost.get(key) ?? { n: 0, hashes: [] }
  bucket.n += 1; bucket.hashes.push(hash)
  byHost.set(key, bucket)

  const paths = new Set([EDGE_ROUTES.credential(hash)])
  for (const u of printed) {
    let parsed
    try { parsed = new URL(u) } catch { continue }
    if (parsed.origin !== BASE) continue // host lain: dihitung di bawah, bukan sebagai rute yang gagal
    paths.add(decodeURIComponent(parsed.pathname))
  }

  const got = await get(EDGE_ROUTES.credential(hash))
  if (got.status !== 200 || !got.body?.proof) {
    missing.push({ hash, path: EDGE_ROUTES.credential(hash), status: got.status, why: got.stale ?? got.error ?? 'tanpa proof', fatal: true })
    continue
  }
  for (const path of [...paths].filter((p) => p !== EDGE_ROUTES.credential(hash))) {
    const part = await get(path)
    if (part.status !== 200) {
      missing.push({ hash, path, status: part.status, why: part.stale ?? part.error ?? 'tidak menjawab', fatal: true })
    }
  }
}

/**
 * Kertas yang menunjuk host LAIN tidak bisa disembuhkan dengan menerbitkan ulang ke tepi - URL-nya
 * tertulis di dalam dokumen yang sudah bertanda tangan. Yang bisa kita lakukan adalah mengukur dan
 * menyebut angkanya: berapa kertas yang hari ini bisa diperiksa orang sampai tuntas, dan host mana
 * yang sudah mati.
 */
const edgeHost = new URL(BASE).host
const foreign = []
for (const [key, bucket] of byHost) {
  if (key === edgeHost) continue
  const first = key.split(' , ')[0]
  const alive = first ? await hostAlive(`http://${first}`) : false
  foreign.push({ key, n: bucket.n, alive })
}

console.log('\n  kertas per host yang dicetak di dalamnya:')
for (const [key, bucket] of [...byHost.entries()].sort((a, b) => b[1].n - a[1].n)) {
  console.log(`   ${String(bucket.n).padStart(2)} kertas -> ${key}`)
}

const fatal = missing.filter((m) => m.fatal)
const grouped = new Map()
for (const m of fatal) {
  const k = `${m.status} ${m.why}`
  grouped.set(k, (grouped.get(k) ?? []).concat(m.path))
}
for (const [k, list] of grouped) {
  check(`tidak ada bagian yang tertinggal di tepi (${k})`, false, `${list.length} rute: ${list.slice(0, 4).join(', ')}${list.length > 4 ? ', …' : ''}`)
}
/**
 * INARIAN yang belum dijaga siapa pun sampai 29 Sep: untuk SETIAP kertas yang tayang di tepi,
 * `proof.verificationMethod` harus benar-benar tercantum di `assertionMethod` dokumen penerbit yang
 * ia menunjuk. `serve-probe` memeriksa ini untuk SATU `DOC_HASH`; verifier nyata memeriksa untuk
 * setiap kertas yang dibukanya.
 *
 * Kenapa ini ada di sini sekarang: waktu memindah enam kertas ke host tepi (B65-b) aku menulis ulang
 * `issuer.id` kertasnya tanpa sempat memastikan daftar kunci di sisi penerbit ikut berpindah —
 * dan tidak ada gerbang yang menangkapnya selain `serve-probe` yang kebetulan sedang menguji satu
 * hash. Kertas seperti itu bukan "tidak terverifikasi oleh kami", tapi "tidak terverifikasi oleh
 * siapa pun, selamanya, dengan tanda tangan yang kelihatan utuh". Itu kegagalan terburuk yang bisa
 * kita produksi, karena ia senyap.
 */
const perIssuer = new Map()
for (const r of withDocs) {
  const doc = r.document ?? {}
  const iss = typeof doc.issuer === 'string' ? doc.issuer : doc.issuer?.id
  const vm = doc.proof?.verificationMethod
  const host = (() => { try { return new URL(String(vm ?? iss ?? '')).host } catch { return null } })()
  if (!host || host !== edgeHost || !vm) continue
  const base = vm.split('#')[0]
  if (!perIssuer.has(base)) perIssuer.set(base, { keys: new Set(), creds: [] })
  perIssuer.get(base).creds.push(String(r.credentialHash).slice(0, 10))
  try {
    const j = await (await fetch(base, { signal: AbortSignal.timeout(20_000) })).json()
    for (const m of j.assertionMethod ?? []) perIssuer.get(base).keys.add(typeof m === 'string' ? m : m.id)
    if (j.id) perIssuer.get(base).docId = j.id
  } catch (e) {
    perIssuer.get(base).error = String(e.message ?? e).slice(0, 60)
  }
}
for (const [base, info] of perIssuer) {
  // Perbandingan dilakukan per kredensial, bukan per himpunan kunci: yang harus dijawab adalah
  // "kunci milik kertas mana yang tidak terdaftar", supaya merahnya bisa ditindaklanjuti.
  const missingVms = []
  for (const r of withDocs) {
    const doc = r.document ?? {}
    const iss = typeof doc.issuer === 'string' ? doc.issuer : doc.issuer?.id
    const vm = doc.proof?.verificationMethod
    if (!vm || vm.split('#')[0] !== base) continue
    if (!info.keys.has(vm)) missingVms.push(`${String(r.credentialHash).slice(0, 10)}→${vm.slice(0, 30)}…`)
  }
  check(`kunci ${base.replace(/^https?:\/\//, '')} terdaftar di assertionMethod-nya (${info.creds.length} kertas)`,
    !info.error && missingVms.length === 0 && info.keys.size > 0,
    info.error ? `dokumen penerbit tidak teraih: ${info.error}` : (missingVms.length ? missingVms.join(', ') : `0 kunci, ${info.creds.length} kertas`))
  if (info.docId && info.docId !== base) {
    check(`dokumen penerbit ${base.slice(0, 40)}… mengidentifikasi dirinya dengan id yang sama`, false, `id tersaji: ${info.docId}`)
  }
}

const fully = byHost.get(edgeHost)?.n ?? 0
// Ini DIUKUR dan DINYATAKAN, bukan dibuat merah: kertas yang menunjuk host lain tidak bisa
// disembuhkan oleh `publish` - URL-nya sudah tertulis di dalam dokumen bertanda tangan, jadi satu-satunya
// obatnya adalah menerbitkan kertas baru. Pemeriksaan yang permanen merah adalah pemeriksaan yang
// pada akhirnya akan kuabaikan; yang bisa kita sembuhkan (rute hilang, daftar basi) tetap merah.
const privateish = (host) => /^127\.0\.0\.1|^localhost$|^0\.0\.0\.0$|\[::1\]/.test(host)
console.log(`\n  terukur : ${fully} dari ${withDocs.length} kertas dapat diperiksa orang sampai tuntas tanpa laptop kami`)
for (const f of foreign) {
  // Loopback yang menjawab dari mesin ini BUKAN menjawab untuk pembaca lain. Melabelinya "MASIH
  // MENJAWAB" adalah cara harness berbohong dengan kalimat yang benar.
  const state = privateish(f.key)
    ? 'hanya hidup di mesin yang menjalankannya — bagi pembaca lain ini mati'
    : (f.alive ? 'host itu MASIH MENJAWAB' : 'host itu MATI')
  console.log(`            ${f.n} kertas menunjuk ${f.key} — ${state}`)
}
check('tepi menyajikan semua kertas yang menunjuk dirinya, dan tidak ada yang setengah terkirim',
  fatal.length === 0, `${fatal.length} rute belum benar`)

// Peserta akan mengeklik tautan di kertas, dan kertas itu mengklaim daftar yang terkunci di chain.
// Jadi dua hal terakhir yang diperiksa: daftar masih tersaji, dan segelnya masih ada di BAS —
// dibaca dengan fungsi yang sama yang dipakai `npm run anchor`, bukan lewat asumsi baru.
for (const purpose of PURPOSES) {
  const list = health[purpose]
  if (!list?.hash) { check(`daftar ${purpose} dilaporkan tepi`, false, 'healthz tidak memuat hash'); continue }
  const got = await get(EDGE_ROUTES.list(purpose))
  let sealed = null
  let sealError = ''
  if (env.BAS_ADDRESS) {
    try {
      sealed = await readAnchor({ rpcUrl: RPC, basAddress: env.BAS_ADDRESS, data: list.hash })
    } catch (e) {
      sealError = String(e.message ?? e).slice(0, 90)
    }
  } else sealError = 'BAS_ADDRESS kosong'
  check(`daftar ${purpose}: tersaji dan segelnya masih tercatat di BAS (${env.BAS_ADDRESS ?? 'tanpa BAS_ADDRESS'})`,
    got.status === 200 && Boolean(sealed),
    `HTTP ${got.status} · timestamp on-chain = ${sealed ?? `tidak terbaca: ${sealError}`}`)
}

console.log(`\n${fails === 0 ? 'TEPI HIJAU' : 'TEPI MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
if (fails > 0) console.log('Yang biasanya menyembuhkan ini: cd signer && npm run publish:edge')
process.exitCode = fails === 0 ? 0 : 1
