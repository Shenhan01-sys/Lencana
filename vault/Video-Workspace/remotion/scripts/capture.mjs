// B173 — capture REAL Lencana pages (English UI) for the browser frames in the video.
//
//   node scripts/capture.mjs [--only id1,id2] [--base https://lencana-psi.vercel.app/] [--local http://127.0.0.1:5174/]
//
// Public pages come from production. Signed-in pages use fixture identities: CAPTURE_KEYS points to a text
// file with lines "LABEL 0x<privateKey> ..." (kept outside the repo; keys are read, never printed). The
// certificate pages of the B153 holder are read by ADDRESS only (a random device key, like browser test T93),
// so no real key is needed there. Admin needs the local signer (ADMIN_ADDRESSES = fixture) and --local.
//
// Output: public/captures/<id>.png (deviceScaleFactor 2) + public/captures/<id>.json (element boxes in CSS px,
// page size, url, time) so the video can lift real elements out of the page.
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const puppeteer = require('puppeteer-core')
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'public/captures')
fs.mkdirSync(OUT, { recursive: true })
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1] }
const PROD = arg('base', 'https://lencana-psi.vercel.app/')
const LOCAL = arg('local', 'http://127.0.0.1:5174/')
const only = arg('only', '') ? new Set(arg('only', '').split(',')) : null
const W = 1600, H = 1000, DPR = 2
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const B153 = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31'
const L153 = '0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF'
const REVOKED = '0xdbd7c72fc3511078d36c1789b446ed8acb548cecdeb698aaf23cd6aa4ae95e42'

function keyOf (label) {
  const file = process.env.CAPTURE_KEYS
  if (!file) throw new Error('CAPTURE_KEYS not set')
  for (const f of file.split(';')) {
    if (f.endsWith('.json')) { const j = JSON.parse(fs.readFileSync(f, 'utf8')); if (path.basename(f, '.json') === label && j.pk) return j.pk; continue }
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      if (!line.startsWith(label + ' ')) continue
      const m = line.match(/0x[0-9a-fA-F]{64}/)
      if (m) return m[0]
    }
  }
  throw new Error(`no key for ${label}`)
}
/** Team identities of this testnet deployment (publisher key, agent owners) from app/.env — read, never printed. */
function envKey (name) {
  const line = fs.readFileSync(path.resolve(ROOT, '../../../.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith(name + '='))
  if (!line) throw new Error(`${name} missing in app/.env`)
  return line.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '')
}
/** Click a tab/button by its visible text, then wait for the panel to settle. Never used on write actions. */
async function clickText (p, re, wait = 3500) {
  const ok = await p.evaluate((src) => {
    const rx = new RegExp(src, 'i')
    const el = [...document.querySelectorAll('[role="tab"], button, a')].find((e) => rx.test((e.textContent || '').trim()))
    if (!el) return false
    el.click(); return true
  }, re.source)
  if (!ok) errors.push(`no clickable /${re.source}/ on ${p.url()}`)
  await sleep(wait)
  return ok
}
async function addressOf (pk) {
  const { privateKeyToAccount } = createRequire(path.resolve(ROOT, '../../../web/package.json'))('viem/accounts')
  return privateKeyToAccount(pk).address
}

const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--no-sandbox', '--hide-scrollbars'] })
const errors = []

async function page ({ identity = null, base = PROD } = {}) {
  const ctx = await browser.createBrowserContext()
  const p = await ctx.newPage()
  await p.setViewport({ width: W, height: H, deviceScaleFactor: DPR })
  p.on('pageerror', (e) => errors.push(`pageerror ${String(e.message).slice(0, 160)}`))
  await p.evaluateOnNewDocument((ident) => {
    try {
      localStorage.setItem('lencana_lang', 'en')
      if (ident) { sessionStorage.setItem('lencana-learner-v1', JSON.stringify({ address: ident.address, kind: 'perangkat', pk: ident.pk })); localStorage.setItem('lencana-privy-v1', '1') }
    } catch { /* storage blocked */ }
    window.print = () => {}
  }, identity)
  p.__base = base
  return p
}
const go = async (p, hash, query = '') => { await p.goto(`${p.__base}?lang=en${query}${hash}`, { waitUntil: 'networkidle2', timeout: 90000 }).catch((e) => errors.push(`goto ${hash}: ${e.message}`)); await p.evaluate(() => document.fonts && document.fonts.ready) }
async function boxes (p, sels) {
  return p.evaluate((sels) => {
    const r = {}
    for (const [k, s] of Object.entries(sels)) {
      const els = [...document.querySelectorAll(s)]
      r[k] = els.slice(0, 12).map((e) => { const b = e.getBoundingClientRect(); return { x: Math.round(b.x + scrollX), y: Math.round(b.y + scrollY), w: Math.round(b.width), h: Math.round(b.height), text: (e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60) } })
    }
    return { boxes: r, scrollY: Math.round(scrollY), pageH: document.documentElement.scrollHeight }
  }, sels)
}
async function save (p, id, { full = false, sels = {}, extra = {} } = {}) {
  const meta = await boxes(p, sels)
  await p.screenshot({ path: path.join(OUT, `${id}.png`), fullPage: full, captureBeyondViewport: full })
  fs.writeFileSync(path.join(OUT, `${id}.json`), JSON.stringify({ id, url: p.url(), full, viewport: { w: W, h: H, dpr: DPR }, at: new Date().toISOString(), ...meta, ...extra }, null, 1))
  console.log(`  ✓ ${id}  ${full ? 'full ' + meta.pageH + 'px' : 'viewport'}  scrollY=${meta.scrollY}  ${Object.entries(meta.boxes).map(([k, v]) => `${k}:${v.length}`).join(' ')}`)
}
const scrollTo = async (p, sel, offset = 120) => { await p.evaluate((s, o) => { const e = document.querySelector(s); if (e) window.scrollTo(0, e.getBoundingClientRect().top + scrollY - o) }, sel, offset); await sleep(700) }

const SHOTS = {
  async landing () {
    const p = await page(); await go(p, '#/'); await sleep(3500)
    await save(p, 'landing', { sels: { h1: 'h1', plate: '.proof-plate, .hero-plate, [class*="plate"]', cta: 'a.btn, .hero a, button' } })
    await save(p, 'landing-full', { full: true })
    await p.close()
  },
  async catalog () {
    const p = await page(); await go(p, '#/courses'); await sleep(3500)
    await save(p, 'catalog', { sels: { cards: '[class*="course-card"], .cg-card, article' } })
    await p.close()
  },
  async course () {
    const p = await page(); await go(p, '#/course/web3-dasar-2026'); await sleep(4500)
    await save(p, 'course', { sels: { cta: '[class*="cd-cta"] button, [class*="cd-cta"] a, button.primary', price: '[class*="price"]' } })
    await save(p, 'course-full', { full: true })
    await p.close()
    // signed-in learner who has not paid: the real pay panel ("Pay & enroll", price in the test token)
    const pk = keyOf('C_learner'); const address = await addressOf(pk)
    const q = await page({ identity: { address, pk } }); await go(q, '#/course/web3-dasar-2026'); await sleep(6500)
    await save(q, 'course-learner', { sels: { cta: '[class*="cd-cta"] button, [class*="cd-cta"] a', pay: '[class*="pay"], [class*="cd-cta"]', price: '[class*="price"]' } })
    await scrollTo(q, '[class*="cd-cta"]', 220)
    await save(q, 'course-learner-cta', { sels: { cta: '[class*="cd-cta"] button, [class*="cd-cta"] a', pay: '[class*="pay"], [class*="cd-cta"]' } })
    await q.close()
  },
  async login () {
    const p = await page(); await go(p, '#/login'); await sleep(3000)
    await save(p, 'login', { sels: { input: 'input[type="email"], input[name="email"], input' } })
    const input = await p.$('input[type="email"], input[name="email"]')
    if (input) { await input.click(); await p.keyboard.type('you@example.com', { delay: 40 }); await sleep(500); await save(p, 'login-typed', { sels: { input: 'input[type="email"], input[name="email"]', send: 'button' } }) }
    await p.close()
  },
  async verify () {
    for (const [id, hash] of [['verify-valid', B153], ['verify-revoked', REVOKED]]) {
      const p = await page(); await go(p, '#/verify', `&q=${hash}`)
      await p.waitForSelector('#out section.verdict:not(.muted)', { timeout: 60000 }).catch(() => errors.push(`${id}: no verdict`))
      await sleep(2500)
      await save(p, `${id}-top`, { sels: { verdict: '#out section.verdict' } })
      await scrollTo(p, '#out section.verdict', 160)
      await save(p, id, { sels: { verdict: '#out section.verdict', title: '#out .verdict-title' } })
      await p.close()
    }
  },
  async trust () {
    const p = await page(); await go(p, '#/agent-hub'); await sleep(3500)
    await save(p, 'trust', { sels: { cards: '[class*="agent-card"], article' } })
    await p.close()
  },
  async cert () {
    const p = await page({ identity: { address: L153, pk: '0x' + randomBytes(32).toString('hex') } })
    await go(p, `#/app/credentials/${B153}`)
    await p.waitForSelector('.cert-sheet', { timeout: 90000 }).catch(() => errors.push('cert: no sheet'))
    await sleep(6500)
    await save(p, 'cert', { sels: { sheet: '.cert-sheet' } })
    await p.waitForSelector('.cert-proof-card', { timeout: 60000 }).catch(() => errors.push('cert: no proof card'))
    // the certificate viewer is an overlay with its own scroll container: scroll the card into view inside it
    await p.evaluate(() => document.querySelector('.cert-proof-card')?.scrollIntoView({ block: 'start' })); await sleep(900)
    await save(p, 'cert-proof', { sels: { proof: '.cert-proof-card' } })
    const share = await p.evaluateHandle(() => [...document.querySelectorAll('button')].find((b) => /Share on LinkedIn/i.test(b.textContent || '')))
    if (share && share.asElement()) { await share.asElement().click(); await sleep(1800); await save(p, 'cert-share', { sels: { dialog: 'dialog.cert-share' } }) } else errors.push('cert: no share button')
    await p.close()
    const q = await page({ identity: { address: L153, pk: '0x' + randomBytes(32).toString('hex') } })
    await go(q, '#/app/credentials'); await sleep(6000)
    await save(q, 'credentials', { sels: { cards: '[class*="cred-card"], article' } })
    await q.close()
  },
  async certMotion () {
    // B173 draft 5 — the certificate's OWN entrance motion ("▶ Replay motion", B165/B167), frame-exact at DPR 2.
    // After the replay click every CSS animation of the sheet is paused and SEEKED to k/30 s (Web Animations API), and
    // the score count-up — JS, not CSS — is written with the page's own formula (certificate-view.ts: 650 ms delay,
    // 1300 ms, cubic-bezier(.22,1,.36,1)). A screencast would be real-time at CSS resolution; this is sharp and exact.
    const p = await page({ identity: { address: L153, pk: '0x' + randomBytes(32).toString('hex') } })
    await go(p, `#/app/credentials/${B153}`)
    await p.waitForSelector('.cert-sheet', { timeout: 90000 }).catch(() => errors.push('certMotion: no sheet'))
    await sleep(6500)
    const box = await p.evaluate(() => { const r = document.querySelector('.cert-sheet').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    const score = await p.evaluate(() => Number((document.querySelector('[data-s3-score]')?.textContent || '').trim()))
    const anims = await p.evaluate(() => {
      document.querySelector('[data-act="replay"]').click()
      const list = document.querySelector('.cert-sheet').getAnimations({ subtree: true })
      list.forEach((a) => a.pause())
      window.__certAnims = list
      return list.length
    })
    await sleep(2600) // the page's own count-up runs in real time; let it finish so it stops writing the score
    const dir = path.join(OUT, 'cert-motion')
    fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir)
    const FRAMES = 240 // 8 s
    const clip = { x: Math.floor(box.x) - 2, y: Math.floor(box.y) - 2, width: Math.ceil(box.w) + 4, height: Math.ceil(box.h) + 4 }
    for (let k = 0; k < FRAMES; k++) {
      await p.evaluate((t, to) => {
        for (const a of window.__certAnims) a.currentTime = t
        const bez = (x1, y1, x2, y2) => {
          const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by
          const X = (u) => ((ax * u + bx) * u + cx) * u, Y = (u) => ((ay * u + by) * u + cy) * u, dX = (u) => (3 * ax * u + 2 * bx) * u + cx
          return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let u = x; for (let i = 0; i < 8; i++) { const e = X(u) - x, d = dX(u); if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break; u -= e / d } return Y(Math.min(1, Math.max(0, u))) }
        }
        const span = document.querySelector('[data-s3-score] span') || document.querySelector('[data-s3-score]')
        span.textContent = t < 650 ? '0' : String(Math.round(to * bez(0.22, 1, 0.36, 1)(Math.min(1, (t - 650) / 1300))))
        return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
      }, (k * 1000) / 30, score)
      await p.screenshot({ path: path.join(dir, `f${String(k).padStart(4, '0')}.png`), clip })
      if (k % 30 === 0) console.log(`  · certMotion ${k}/${FRAMES}`)
    }
    const { spawnSync } = await import('node:child_process')
    const enc = spawnSync('ffmpeg', ['-v', 'error', '-y', '-framerate', '30', '-i', path.join(dir, 'f%04d.png'), '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', path.join(OUT, 'cert-motion.mp4')], { encoding: 'utf8' })
    if (enc.status !== 0) errors.push(`certMotion encode: ${enc.stderr.slice(0, 200)}`)
    fs.writeFileSync(path.join(OUT, 'cert-motion.json'), JSON.stringify({ id: 'cert-motion', url: p.url(), at: new Date().toISOString(), box, clip, dpr: DPR, fps: 30, frames: FRAMES, animations: anims, score }, null, 1))
    console.log(`  ✓ cert-motion  ${FRAMES} frames · ${anims} animations seeked · score ${score} · clip ${clip.width}x${clip.height}`)
    await p.close()
  },
  async learner () {
    const pk = keyOf('L_b143'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    for (const [id, hash] of [['class', '#/class/uji-bayar-2026'], ['grades', '#/app/grades'], ['classes', '#/app/classes']]) {
      await go(p, hash); await sleep(6000)
      await save(p, id, { sels: { lessons: '[class*="lesson"]', cards: 'article, [class*="card"]' } })
    }
    await p.close()
  },
  async owner () {
    const pk = keyOf('R_owner'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/owner'); await sleep(7000)
    await save(p, 'owner', { sels: { robot: 'svg', chips: '[class*="ab-"], [class*="provider"]' } })
    await save(p, 'owner-full', { full: true })
    await p.close()
  },
  async fixtures () {
    // which fixture learners still have real classes (records of origin=test runs get cleaned)
    for (const label of ['fixture-b126']) {
      try {
        const pk = keyOf(label); const address = await addressOf(pk)
        const p = await page({ identity: { address, pk } }); await go(p, '#/app/classes'); await sleep(6000)
        await save(p, `probe-classes-${label}`, { sels: { cards: 'article, [class*="card"]' } }); await p.close()
      } catch (e) { errors.push(`${label}: ${e.message}`) }
    }
  },
  async issuer () {
    const pk = envKey('ISSUER_PRIVATE_KEY'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/pub'); await sleep(8000)
    await save(p, 'pub-overview', { sels: { tabs: '[role="tab"]' } })
    const tabs = await p.evaluate(() => [...document.querySelectorAll('[role="tab"], .app-side a, nav a')].map((e) => (e.textContent || '').trim()).filter(Boolean).slice(0, 30))
    fs.writeFileSync(path.join(OUT, 'pub-tabs.json'), JSON.stringify(tabs, null, 1))
    for (const [id, rx] of [['pub-agents', /^agents/], ['pub-essays', /^essays/], ['pub-revenue', /^revenue/], ['pub-learners', /^learners/]]) {
      if (await clickText(p, rx, 7000)) { await save(p, id, { sels: { cards: 'article, [class*="card"], [class*="stall"]' } }); await save(p, id + '-full', { full: true }) }
    }
    await p.close()
  },
  async essaysBelt () {
    // B174 essay belt (until it is pushed, only the local build has it): same identity, local base, plus the belt in motion
    const pk = envKey('ISSUER_PRIVATE_KEY'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk }, base: LOCAL })
    await go(p, '#/app/pub/essays')
    await p.waitForSelector('.eb-line', { timeout: 120000 }).catch(() => errors.push('essaysBelt: no belt'))
    await sleep(4000)
    await save(p, 'pub-essays', { sels: { card: '.pb-pipe', st: '.eb-st', rows: '.pb-table tbody tr' } })
    const b = await p.evaluate(() => { const r = document.querySelector('.eb-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    const crop = { x: Math.max(0, Math.round(b.x - 12)), y: Math.max(0, Math.round(b.y - 12)), width: Math.round((b.w + 24) / 2) * 2, height: Math.round((b.h + 24) / 2) * 2 }
    const rec = await p.screencast({ path: path.join(OUT, 'essays-belt.webm'), crop, fps: 30, quality: 12 })
    await sleep(9000)
    await rec.stop()
    fs.writeFileSync(path.join(OUT, 'essays-belt.json'), JSON.stringify({ crop }, null, 1))
    await p.close()
  },
  async graderOwner () {
    const pk = envKey('AGENT_OWNER_PRIVATE_KEY'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/owner'); await sleep(8000)
    await save(p, 'owner2534', { sels: { tabs: '[role="tab"]' } })
    for (const [id, rx] of [['owner2534-look', /^look$/], ['owner2534-brain', /^brain/], ['owner2534-roles', /roles/]]) {
      if (await clickText(p, rx, 6000)) { await save(p, id, { sels: { chips: '[class*="ab-chip"], [class*="provider"] button, .ab-prov button', robot: 'svg' } }); await save(p, id + '-full', { full: true }) }
    }
    await p.close()
  },
  async reviewerOwner () {
    const pk = envKey('REVIEWER_OWNER_PRIVATE_KEY'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/owner'); await sleep(8000)
    await save(p, 'owner2542', { sels: { tabs: '[role="tab"]' } })
    for (const [id, rx] of [['owner2542-roles', /roles/]]) {
      if (await clickText(p, rx, 6000)) { await save(p, id, { sels: { desk: '[class*="desk"], [class*="rd-"]' } }); await save(p, id + '-full', { full: true }) }
    }
    await p.close()
  },
  async ownerLook () {
    const pk = keyOf('R_owner'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/owner'); await sleep(8000)
    if (await clickText(p, /^look$/, 6000)) await save(p, 'owner2548-look', { sels: { robot: 'svg' } })
    await p.close()
  },
  async admin () {
    // needs: local signer (LANCENA_ORIGIN=test, ADMIN_ADDRESSES=<A_admin>) + vite on --local pointing to it
    const pk = keyOf('A_admin'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk }, base: LOCAL })
    await go(p, '#/app/admin')
    await p.waitForSelector('.ln-line', { timeout: 120000 }).catch(() => errors.push('admin: no belt'))
    await sleep(5000)
    await save(p, 'admin', { sels: { wrap: '.ln-wrap', st: '.ln-st' } })
    const b = await p.evaluate(() => { const r = document.querySelector('.ln-wrap').getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })
    const crop = { x: Math.max(0, Math.round(b.x - 24)), y: Math.max(0, Math.round(b.y - 24)), width: Math.round((b.w + 48) / 2) * 2, height: Math.round((b.h + 48) / 2) * 2 }
    const rec = await p.screencast({ path: path.join(OUT, 'admin-belt.webm'), crop, fps: 30, quality: 12 })
    await sleep(9000)
    await rec.stop()
    fs.writeFileSync(path.join(OUT, 'admin-belt.json'), JSON.stringify({ crop, viewport: { w: W, h: H, dpr: DPR } }, null, 1))
    await p.evaluate(() => document.querySelectorAll('.ln-st')[4]?.click()); await sleep(1800)
    await save(p, 'admin-popup', { sels: { dlg: 'dialog[open]' } })
    await p.close()
  },
  async publisher () {
    const pk = keyOf('M_member'); const address = await addressOf(pk)
    const p = await page({ identity: { address, pk } })
    await go(p, '#/app/pub'); await sleep(7000)
    await save(p, 'pub', { sels: { tabs: '[role="tab"]', cards: '[class*="market"], [class*="stall"], article' } })
    await save(p, 'pub-full', { full: true })
    await p.close()
  },
}

try {
  for (const [id, fn] of Object.entries(SHOTS)) {
    if (only && !only.has(id)) continue
    console.log(id)
    try { await fn() } catch (e) { errors.push(`${id}: ${e.message}`) }
  }
} finally { await browser.close() }
if (errors.length) console.log('errors:\n  ' + errors.join('\n  '))
