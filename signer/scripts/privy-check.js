// Lencana-B82 status=TERBUKA 2026-10-01 — harness login Privy: konfigurasi app dibaca dengan app secret, token palsu ditolak (lib + HTTP), saringan dompet tertanam, ikatan alamat ↔ akun atomik dan tidak bisa ditimpa, RLS, bundel web (SDK di chunk lambat, secret tidak ada); yang belum: jalur positif dengan kode email sungguhan — uji dua peramban oleh builder. Buktikan ulang: npm run verify:privy. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run verify:privy` — B82 (D57): login peserta lewat Privy.
 *
 *   npm run verify:privy                              app Privy, verifikasi token, rute, tabel ikatan, bundel web
 *   npm run verify:privy -- --deployed=<url halaman>  + pindai bundel yang SEDANG TAYANG di url itu
 *
 * Yang TIDAK dibuktikan di sini, dan sengaja disebut di keluaran: login positif (email sungguhan + kode
 * dari kotak masuk → dompet tertanam → POST /auth/privy 200). Itu butuh kotak masuk atau akun uji
 * Privy, dan app Lencana belum punya akun uji. Karena itu B82 tetap TERBUKA sampai builder login dari
 * dua peramban dan mendapat alamat yang sama. Kalau akun uji dibuat di dasbor Privy, bagian F memakainya.
 *
 * Tidak ada nilai rahasia yang dicetak: app secret hanya dibandingkan (ada / tidak ada di bundel).
 * Baris uji di `learner_accounts` memakai DID berawalan `did:privy:lencanatest` dan dihapus di akhir;
 * sisanya dihitung ulang dan harus nol.
 */
import { spawn, spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generateKeyPairSync, randomBytes, sign as cryptoSign } from 'node:crypto'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { PrivyClient } from '@privy-io/node'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { bindLearnerAccount, learnerAccount } from '../src/db.js'
import { embeddedEthereumWallets, linkPrivyLearner, privyConfigured } from '../src/privy.js'

const SIGNER = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WEB = resolve(SIGNER, '..', 'web')
const DEPLOYED = (process.argv.find((a) => a.startsWith('--deployed=')) ?? '').slice('--deployed='.length) || null
await loadFileEnvReport('verify:privy')
const env = process.env
for (const k of ['PRIVY_APP_ID', 'PRIVY_APP_SECRET', 'SUPABASE_URL', 'SUPABASE_SECRET_KEY']) {
  if (!env[k]) { console.error(`${k} belum diisi — prasyarat, bukan kegagalan uji`); process.exit(2) }
}
const APP_ID = env.PRIVY_APP_ID
const SECRET = env.PRIVY_APP_SECRET
const TEST_PREFIX = 'did:privy:lencanatest'

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (ok) console.log(`  ok    ${name}`)
  else { failed++; console.log(`  GAGAL ${name}${detail ? ` -> ${String(detail).slice(0, 240)}` : ''}`) }
}
const json = (v) => JSON.stringify(v)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const fresh = () => privateKeyToAccount(generatePrivateKey()).address
const testDid = (tag) => `${TEST_PREFIX}${tag}${randomBytes(6).toString('hex')}`
const noSecret = (text) => !String(text).includes(SECRET)

// JWT palsu: bentuk dan klaim persis token akses Privy, tapi ditandatangani kunci acak milik harness.
const b64u = (x) => Buffer.from(x).toString('base64url')
function forgedJwt (alg = 'ES256') {
  const now = Math.floor(Date.now() / 1000)
  const h = b64u(json({ alg, typ: 'JWT', kid: 'lencana-forged' }))
  const p = b64u(json({
    sid: `cm${randomBytes(10).toString('hex')}`, sub: `did:privy:cm${randomBytes(10).toString('hex')}`,
    iss: 'privy.io', aud: APP_ID, iat: now, exp: now + 3600,
  }))
  if (alg === 'none') return `${h}.${p}.`
  const { privateKey } = generateKeyPairSync('ec', { namedCurve: 'P-256' })
  return `${h}.${p}.${b64u(cryptoSign('sha256', Buffer.from(`${h}.${p}`), { key: privateKey, dsaEncoding: 'ieee-p1363' }))}`
}

// PostgREST langsung, untuk hal yang sengaja TIDAK disediakan db.js (baris mentah, kiriman yang harus ditolak DB).
const API = `${String(env.SUPABASE_URL).replace(/\/$/, '')}/rest/v1`
async function pg (method, path, body, key = env.SUPABASE_SECRET_KEY) {
  const r = await fetch(`${API}/${path}`, {
    method, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(20000),
    headers: { apikey: key, authorization: `Bearer ${key}`, 'content-type': 'application/json', prefer: 'return=representation' },
  })
  const text = await r.text()
  let parsed = null
  try { parsed = JSON.parse(text) } catch { /* kosong */ }
  return { status: r.status, body: parsed, text }
}

/** Server sendiri (origin=test). `extra` menimpa env anak — dipakai untuk server tanpa app secret. */
async function serve (port, extra = {}) {
  const base = `http://127.0.0.1:${port}`
  const child = spawn('npm', ['run', 'serve'], {
    cwd: SIGNER, env: { ...env, PORT: String(port), HOST: '127.0.0.1', BASE_URL: base, LANCENA_ORIGIN: 'test', ...extra }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  })
  let errBuf = ''
  child.stdout.on('data', () => {})
  child.stderr.on('data', (d) => { errBuf += String(d) })
  const call = async (method, path, body) => {
    const r = await fetch(`${base}${path}`, { method, headers: { 'content-type': 'application/json' }, body: body === undefined ? undefined : json(body), signal: AbortSignal.timeout(60000) })
    const text = await r.text()
    let parsed = null
    try { parsed = JSON.parse(text) } catch { /* pemeriksaan menuntut JSON */ }
    return { status: r.status, body: parsed, text }
  }
  const stop = () => {
    if (process.platform === 'win32' && child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else { try { child.kill('SIGKILL') } catch { /* sudah mati */ } }
  }
  let up = null
  for (let i = 0; i < 80 && !up; i++) {
    try { up = await call('GET', '/healthz') } catch { /* belum listen */ }
    if (!up) await sleep(750)
  }
  if (up?.status !== 200) { stop(); throw new Error(`server tidak naik: ${errBuf.slice(-200)}`) }
  return { call, stop }
}

const servers = []
try {
  // ===================================================================== A. app Privy
  console.log('\n— A. app Privy (dibaca dengan app secret; nilainya tidak dicetak)')
  check('PRIVY_APP_ID dan PRIVY_APP_SECRET terisi di lingkungan server', privyConfigured())
  const webAppId = /VITE_PRIVY_APP_ID \|\| '([^']+)'/.exec(readFileSync(join(WEB, 'src', 'privy.ts'), 'utf8'))?.[1]
  check(`app ID klien (web/src/privy.ts) = app ID server — ${APP_ID}`, webAppId === APP_ID, `${webAppId} vs ${APP_ID}`)
  const privy = new PrivyClient({ appId: APP_ID, appSecret: SECRET })
  const fake = new PrivyClient({ appId: APP_ID, appSecret: `palsu${randomBytes(16).toString('hex')}` })
  // Pembuktian secret memakai API users — yang dipanggil rute (`users()._get`). Pengaturan app TIDAK
  // dipakai untuk itu: run pertama 1 Okt menemukan endpoint pengaturan menjawab secret palsu juga
  // (publik), jadi hijau di sana tidak membuktikan apa pun tentang secret.
  const status = async (fn) => { try { await fn(); return 200 } catch (e) { return e?.status ?? String(e?.message ?? e).slice(0, 80) } }
  const ghost = `did:privy:cm${'0'.repeat(23)}`
  const listOk = await status(() => privy.users().list({ limit: 1 }))
  const listFake = await status(() => fake.users().list({ limit: 1 }))
  check(`app secret diterima API users Privy (HTTP ${listOk})`, listOk === 200, String(listOk))
  check(`kontrol negatif: secret palsu ditolak API users (HTTP ${listFake})`, listFake === 401, String(listFake))
  const getGhost = await status(() => privy.users()._get(ghost))
  const getGhostFake = await status(() => fake.users()._get(ghost))
  check(`jalur rute users()._get: user yang tidak ada -> 404 dengan secret kita, 401 dengan secret palsu (${getGhost}/${getGhostFake})`,
    getGhost === 404 && getGhostFake === 401, `${getGhost}/${getGhostFake}`)
  let settings = null
  try { settings = await privy.apps().getSettings() } catch (e) { settings = { error: String(e?.status ?? e?.message ?? e) } }
  check(`pengaturan app "${settings?.name}" terbaca (endpoint publik — bukan bukti secret)`, settings?.id === APP_ID, settings?.error ?? settings?.id)
  check('login email aktif di app (jalur yang dipakai halaman belajar)', settings?.email_auth === true)
  const ew = settings?.embedded_wallet_config ?? {}
  check(`dompet tertanam mode "${ew.mode}", passcode tidak wajib — create({}) di klien adalah jalur resminya`,
    ew.mode === 'user-controlled-server-wallets-only' && ew.require_user_password_on_create === false, json(ew))
  console.log(`  info  dompet dibuat otomatis saat login: ${ew.ethereum?.create_on_login ?? ew.create_on_login} (klien membuatnya sendiri bila belum ada)`)
  const domains = settings?.allowed_domains ?? []
  console.log(`  info  allowed_domains: ${domains.length ? domains.join(', ') : '(kosong — Privy menerima login dari domain MANA PUN; isi di dasbor sebelum dibuka ke publik)'}`)

  // ===================================================================== B. verifikasi di server (lib)
  console.log('\n— B. verifikasi di server (src/privy.js), tanpa HTTP')
  const someone = fresh()
  const b1 = await linkPrivyLearner({ learner: 'bukan-alamat', accessToken: forgedJwt() })
  check('learner bukan alamat -> 400', b1.status === 400, json(b1))
  const b2 = await linkPrivyLearner({ learner: someone, accessToken: 'bukan.jwt' })
  check('token bukan JWT -> 400', b2.status === 400, json(b2))
  const b3 = await linkPrivyLearner({ learner: someone, accessToken: forgedJwt('ES256') })
  check('JWT palsu (klaim berbentuk Privy, aud = app kita, ditandatangani kunci acak) -> 401', b3.status === 401, json(b3))
  const b4 = await linkPrivyLearner({ learner: someone, accessToken: forgedJwt('none') })
  check('JWT alg=none -> 401', b4.status === 401, json(b4))
  check('tidak ada ikatan yang lahir dari empat kiriman itu', (await learnerAccount(someone)) === null)
  const [ext, spoof, emb] = [fresh(), fresh(), fresh()]
  const user = {
    linked_accounts: [
      { type: 'email', address: 'peserta@example.com' },
      { type: 'wallet', chain_type: 'ethereum', connector_type: 'injected', wallet_client: 'unknown', wallet_client_type: 'metamask', address: ext },
      { type: 'wallet', chain_type: 'ethereum', connector_type: 'embedded', wallet_client: 'unknown', wallet_client_type: 'privy', address: spoof },
      { type: 'wallet', chain_type: 'ethereum', connector_type: 'embedded', wallet_client: 'privy', wallet_client_type: 'privy', address: emb },
      { type: 'wallet', chain_type: 'solana', connector_type: 'embedded', wallet_client: 'privy', wallet_client_type: 'privy', address: 'So11111111111111111111111111111111111111112' },
    ],
  }
  const picked = embeddedEthereumWallets(user).map((w) => w.address)
  check('saringan kepemilikan: hanya dompet Ethereum tertanam (wallet_client privy) — eksternal, tiruan, Solana tidak dihitung',
    json(picked) === json([emb]), json(picked))

  // ===================================================================== C. rute HTTP
  console.log('\n— C. POST /auth/privy lewat HTTP (server sendiri, origin=test)')
  const s1 = await serve(Number(env.PRIVY_PROBE_PORT ?? await freePort(8927)))
  servers.push(s1)
  const c1 = await s1.call('POST', '/auth/privy', {})
  check('kiriman kosong -> 400', c1.status === 400, c1.text.slice(0, 140))
  const c2 = await s1.call('POST', '/auth/privy', { learner: '0x1234', accessToken: forgedJwt() })
  check('learner rusak -> 400', c2.status === 400, c2.text.slice(0, 140))
  const c3 = await s1.call('POST', '/auth/privy', { learner: someone, accessToken: 'abc' })
  check('token rusak -> 400', c3.status === 400, c3.text.slice(0, 140))
  const forged = forgedJwt()
  const c4 = await s1.call('POST', '/auth/privy', { learner: someone, accessToken: forged })
  check('JWT palsu -> 401 "access token rejected"', c4.status === 401 && /access token rejected/.test(c4.body?.error ?? ''), c4.text.slice(0, 160))
  check('jawaban tidak memantulkan token, dan tidak memuat app secret', !c4.text.includes(forged) && noSecret(c4.text))
  check('tetap tidak ada ikatan untuk alamat itu sesudah lapis HTTP', (await learnerAccount(someone)) === null)
  s1.stop()
  // Server tanpa app secret: rute harus menolak terang-terangan, bukan diam-diam menerima.
  const s2 = await serve(Number(await freePort(8937)), { PRIVY_APP_SECRET: '' })
  servers.push(s2)
  const c5 = await s2.call('POST', '/auth/privy', { learner: someone, accessToken: forged })
  check('server tanpa PRIVY_APP_SECRET -> 503 (gagal tertutup)', c5.status === 503 && /not configured/.test(c5.body?.error ?? ''), c5.text.slice(0, 160))
  s2.stop()

  // ===================================================================== D. tabel ikatan
  console.log('\n— D. learner_accounts (Postgres nyata; baris uji dihapus di akhir)')
  const L1 = fresh()
  const did1 = testDid('a')
  const d1 = await bindLearnerAccount({ learner: L1, accountId: did1 })
  check('ikatan baru -> ok, created', d1.ok && d1.created === true, json(d1))
  const row1 = (await pg('GET', `learner_accounts?learner=eq.${L1}&select=*`)).body?.[0]
  await sleep(1100)
  const d2 = await bindLearnerAccount({ learner: L1.toLowerCase(), accountId: did1 })
  const row2 = (await pg('GET', `learner_accounts?learner=eq.${L1}&select=*`)).body?.[0]
  check('ikatan ulang akun yang sama (alamat huruf kecil) -> ok, bukan baris baru, last_seen_at maju',
    d2.ok && d2.created === false && row2?.learner === L1 && new Date(row2.last_seen_at) > new Date(row1.last_seen_at), json({ d2, a: row1?.last_seen_at, b: row2?.last_seen_at }))
  const d3 = await bindLearnerAccount({ learner: L1, accountId: testDid('b') })
  const row3 = (await pg('GET', `learner_accounts?learner=eq.${L1}&select=account_id`)).body?.[0]
  check('alamat yang sama ke akun LAIN -> conflict (rute: 409), ikatan lama tidak ditimpa', !d3.ok && d3.kind === 'conflict' && row3?.account_id === did1, json({ d3, row3 }))
  const L2 = fresh()
  const race = await Promise.all([bindLearnerAccount({ learner: L2, accountId: testDid('c') }), bindLearnerAccount({ learner: L2, accountId: testDid('d') })])
  check('dua ikatan SERENTAK ke dua akun berbeda -> tepat satu menang, satu conflict',
    race.filter((r) => r.ok).length === 1 && race.filter((r) => r.kind === 'conflict').length === 1, json(race))
  const cols = Object.keys(row2 ?? {}).sort()
  check(`kolom baris: ${cols.join(', ')} — tidak ada email (data pribadi tidak disimpan)`, cols.length > 0 && !cols.some((c) => /mail/i.test(c)), json(cols))
  const badDid = await pg('POST', 'learner_accounts', [{ learner: fresh(), provider: 'privy', account_id: 'bukan-did', wallet_type: 'privy-embedded' }])
  check('DB menolak account_id yang bukan did:privy (CHECK, 23514)', badDid.status === 400 && badDid.body?.code === '23514', badDid.text.slice(0, 160))
  const badProv = await pg('POST', 'learner_accounts', [{ learner: fresh(), provider: 'google', account_id: testDid('e'), wallet_type: 'privy-embedded' }])
  check('DB menolak provider selain privy (CHECK, 23514)', badProv.status === 400 && badProv.body?.code === '23514', badProv.text.slice(0, 160))
  if (env.SUPABASE_PUBLISHABLE_KEY) {
    const pub = await pg('GET', 'learner_accounts?select=*', undefined, env.SUPABASE_PUBLISHABLE_KEY)
    check('publishable key TIDAK bisa membaca learner_accounts (RLS aktif, tanpa policy) — dibaca SESUDAH baris uji ada',
      pub.status === 200 && pub.text.trim() === '[]', `${pub.status} ${pub.text.slice(0, 60)}`)
  } else {
    check('pemeriksaan RLS sisi publik dapat dilakukan (isi SUPABASE_PUBLISHABLE_KEY)', false, 'var belum diisi')
  }

  // ===================================================================== E. bundel web
  console.log('\n— E. bundel web yang dibangun dari kode ini')
  const built = spawnSync('npm', ['run', 'build'], { cwd: WEB, shell: true, encoding: 'utf8' })
  check('npm run build (web) berhasil', built.status === 0, (built.stdout + built.stderr).slice(-300))
  const dist = join(WEB, 'dist')
  const html = readFileSync(join(dist, 'index.html'), 'utf8')
  const entryNames = [...html.matchAll(/src="\.\/assets\/([^"]+\.js)"/g)].map((m) => m[1])
  const files = Object.fromEntries(readdirSync(join(dist, 'assets')).map((f) => [f, readFileSync(join(dist, 'assets', f), 'utf8')]))
  const entry = entryNames.map((n) => files[n] ?? '').join('')
  const sdkChunks = Object.keys(files).filter((f) => f.endsWith('.js') && files[f].includes('auth.privy.io'))
  const wrapper = Object.keys(files).find((f) => /^privy-.*\.js$/.test(f))
  check(`entry (${entryNames.join(', ')}) TIDAK memuat SDK Privy`, entryNames.length > 0 && !entry.includes('auth.privy.io'))
  check(`SDK Privy ada di chunk lambat (kontrol positif pemindai): ${sdkChunks.join(', ')}`, sdkChunks.length > 0 && sdkChunks.every((f) => !entryNames.includes(f)))
  check(`entry memuat modul login hanya lewat import() dinamis (${wrapper})`, !!wrapper && entry.includes(`import("./${wrapper}")`))
  check('app ID publik ada di modul login (konfigurasi ter-inline)', !!wrapper && files[wrapper].includes(APP_ID))
  check('app secret TIDAK ada di bundel mana pun (JS, source map, CSS, HTML)', Object.values(files).every(noSecret) && noSecret(html))
  const srcHits = []
  const walk = (d) => {
    for (const n of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, n.name)
      if (n.isDirectory()) walk(p)
      else if (/PRIVY_APP_SECRET/.test(readFileSync(p, 'utf8'))) srcHits.push(p.slice(WEB.length + 1))
    }
  }
  walk(join(WEB, 'src'))
  check('web/src tidak menyebut PRIVY_APP_SECRET sama sekali', srcHits.length === 0, json(srcHits))
  check('tidak ada variabel VITE_* yang berisi app secret (Vite mengirim VITE_* ke browser)',
    Object.entries(env).every(([k, v]) => !k.startsWith('VITE_') || v !== SECRET))

  if (DEPLOYED) {
    console.log(`\n— E'. bundel yang sedang tayang di ${DEPLOYED}`)
    const get = async (u) => (await fetch(u, { signal: AbortSignal.timeout(30000) })).text()
    const liveHtml = await get(DEPLOYED)
    const liveEntries = [...liveHtml.matchAll(/src="([^"]+\.js)"/g)].map((m) => new URL(m[1], DEPLOYED).toString())
    let liveEntry = ''
    for (const u of liveEntries) liveEntry += await get(u)
    const liveWrapper = /import\("\.\/(privy-[^"]+\.js)"\)/.exec(liveEntry)?.[1]
    const wrapperUrl = liveWrapper ? new URL(`assets/${liveWrapper}`, DEPLOYED).toString() : null
    const liveWrapperText = wrapperUrl ? await get(wrapperUrl) : ''
    const sdkName = /import\("\.\/([^"]+\.js)"\)/.exec(liveWrapperText)?.[1]
    const liveSdk = sdkName ? await get(new URL(`assets/${sdkName}`, DEPLOYED).toString()) : ''
    console.log(`  info  entry ${liveEntries.map((u) => u.split('/').pop()).join(', ')} · modul login ${liveWrapper ?? '-'} · SDK ${sdkName ?? '-'}`)
    check('tayang: entry TIDAK memuat SDK Privy', liveEntries.length > 0 && !liveEntry.includes('auth.privy.io'))
    check('tayang: modul login dimuat lambat dan membawa app ID publik', liveWrapperText.includes(APP_ID))
    check('tayang: SDK Privy ada di chunk yang dimuat modul login (kontrol positif)', liveSdk.includes('auth.privy.io'))
    check('tayang: app secret tidak ada di HTML, entry, modul login, maupun SDK', [liveHtml, liveEntry, liveWrapperText, liveSdk].every(noSecret))
  }

  // ===================================================================== F. jalur positif
  console.log('\n— F. jalur positif (token sah)')
  let testToken = null
  try { testToken = (await privy.apps().getTestAccessToken())?.access_token ?? null } catch (e) { console.log(`  info  akun uji Privy tidak tersedia (SDK menjawab: ${String(e?.message ?? e).slice(0, 100)})`) }
  if (!testToken) {
    console.log('  info  TIDAK DIUJI di run ini: token sah → dompet tertanam → POST /auth/privy 200. Butuh akun uji Privy')
    console.log('        (dasbor → User management → Test accounts) atau login manual. Kriteria tutup B82: builder')
    console.log('        login email dari dua peramban berbeda dan mendapat alamat peserta yang sama.')
  } else {
    const s3 = await serve(Number(await freePort(8947)))
    servers.push(s3)
    const notMine = await s3.call('POST', '/auth/privy', { learner: fresh(), accessToken: testToken })
    check('token SAH + alamat yang bukan dompet user itu -> 403', notMine.status === 403, notMine.text.slice(0, 160))
    const claims = await privy.utils().auth().verifyAccessToken(testToken)
    const tuser = await privy.users()._get(claims.user_id)
    const [w] = embeddedEthereumWallets(tuser)
    if (!w) console.log('  info  akun uji belum punya dompet tertanam — login sekali lewat halaman untuk membuatnya; jalur 200 tidak diuji')
    else {
      const mine = await s3.call('POST', '/auth/privy', { learner: w.address, accessToken: testToken })
      check('token SAH + dompet tertanam user itu -> 200, terikat', mine.status === 200 && mine.body?.linked === true, mine.text.slice(0, 160))
      await pg('DELETE', `learner_accounts?learner=eq.${mine.body?.learner ?? w.address}&account_id=eq.${encodeURIComponent(claims.user_id)}`)
    }
    s3.stop()
  }
} catch (e) {
  check('harness selesai tanpa pengecualian', false, String(e?.stack ?? e).slice(0, 400))
} finally {
  for (const s of servers) s.stop()
  const del = await pg('DELETE', `learner_accounts?account_id=like.${TEST_PREFIX}*`)
  const left = await pg('GET', `learner_accounts?account_id=like.${TEST_PREFIX}*&select=learner`)
  console.log(`\n  bersih-bersih: ${Array.isArray(del.body) ? del.body.length : 0} baris uji dihapus`)
  check('sisa baris uji di learner_accounts = 0', left.status === 200 && Array.isArray(left.body) && left.body.length === 0, left.text.slice(0, 120))
  console.log(`\nLOGIN PRIVY ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
  setTimeout(() => process.exit(failed === 0 ? 0 : 1), 300)
}
