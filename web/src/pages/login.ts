/**
 * `login.ts` — dialog masuk (RF7 langkah A, D59). Satu-satunya pintu ke halaman internal.
 *
 * Akun = login lewat layanan dompet tertanam (Privy, B82), tetapi halaman tidak menyebut mereknya: orang mengenal
 * "Google" dan "email". Tombol Google hanya muncul kalau metode itu benar-benar aktif di app login — dibaca dari
 * konfigurasi app saat dialog dibuka; tombol yang pasti gagal adalah klaim palsu. Email + kode 6 digit selalu ada.
 *
 * Tata letak mengikuti referensi builder (`References/b4492ab0d444891b66419c4717283b4f.jpg`): kartu terbelah, form di
 * kiri, potongan kertas berlapis di kanan yang membuka ilustrasi; di ponsel form menjadi kartu kaca di atas ilustrasi.
 * Paletnya Lencana: kertas gading, arang, emas — daun di referensi diganti ranting laurel dan kartu kredensial.
 */
import './login.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { finishGoogleLogin, loginMethods, sendPrivyCode, connectPrivyLearner, startGoogleLogin } from '../learning'

// Lencana-B123 status=SELESAI 2026-10-02 — dialog masuk satu pintu: akun lewat login (Google bila aktif di app, email + kode), tanpa kata Privy di halaman, tanpa kunci perangkat/dompet ekstensi/Demo Learner; sesi peserta = penanda akun. Buktikan ulang: cd web && npm run probe, lalu uji peramban tamu vs login (T43). JANGAN dibalik/diulang tanpa membuka kembali baris B123 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

type Lang = 'en' | 'id'
const COPY = {
  title: { en: 'Sign in', id: 'Masuk' },
  sub: { en: 'One account for your courses, your work and your proof.', id: 'Satu akun untuk kursus, tugas, dan bukti belajarmu.' },
  guard: { en: 'Sign in first to open that page.', id: 'Masuk dulu untuk membuka halaman itu.' },
  google: { en: 'Continue with Google', id: 'Lanjutkan dengan Google' },
  or: { en: 'or use your email', id: 'atau pakai email' },
  email: { en: 'Email', id: 'Email' },
  emailPh: { en: 'name@email.com', id: 'nama@email.com' },
  send: { en: 'Send code', id: 'Kirim kode' },
  sending: { en: 'Sending…', id: 'Mengirim…' },
  sent: { en: 'We sent a 6-digit code to', id: 'Kode 6 digit sudah dikirim ke' },
  spam: { en: 'Not there? Check the spam folder.', id: 'Tidak ada? Cek folder spam.' },
  code: { en: 'Code', id: 'Kode' },
  verify: { en: 'Sign in', id: 'Masuk' },
  verifying: { en: 'Checking…', id: 'Memeriksa…' },
  resend: { en: 'Send again', id: 'Kirim ulang' },
  change: { en: 'Use another email', id: 'Ganti email' },
  fine: { en: 'No password, no seed phrase.', id: 'Tanpa kata sandi, tanpa seed phrase.' },
  keyQ: { en: 'Who holds the key?', id: 'Siapa yang memegang kuncinya?' },
  keyA: {
    en: 'Your learning wallet is created when you first sign in. Its key sits in a secure enclave run by our sign-in provider and opens only through your sign-in — Lencana never holds it. Every record you send to a publisher is signed by it.',
    id: 'Dompet belajarmu dibuat saat pertama masuk. Kuncinya disimpan di enclave aman milik penyedia login kami dan hanya terbuka lewat login-mu — Lencana tidak pernah memegangnya. Setiap rekaman yang kamu kirim ke penerbit ditandatangani olehnya.',
  },
  close: { en: 'Close', id: 'Tutup' },
  badEmail: { en: 'That is not an email address.', id: 'Itu bukan alamat email.' },
  badCode: { en: 'The code is the 6 digits from the email.', id: 'Kodenya 6 digit angka dari email.' },
  toGoogle: { en: 'Opening Google…', id: 'Membuka Google…' },
  googleFail: { en: 'Google sign-in did not finish:', id: 'Masuk dengan Google tidak selesai:' },
  failed: { en: 'Sign-in failed:', id: 'Gagal masuk:' },
} satisfies Record<string, Record<Lang, string>>

/** Penanda sementara: ke mana peserta kembali sesudah pulang dari Google. */
const AFTER_KEY = 'lencana-after-login'

type Hooks = { onSignedIn: (address: string) => void }
let hooks: Hooks | null = null
let root: HTMLElement | null = null
let opener: HTMLElement | null = null
let lang: Lang = 'id'

const T = (k: keyof typeof COPY) => COPY[k][lang]
const $ = <E extends HTMLElement = HTMLElement>(sel: string) => root?.querySelector(sel) as E | null

const GOOGLE_G = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/></svg>'

/** Ilustrasi sisi kanan: lapisan kertas gading bergelombang membuka ruang gelap berisi ranting laurel emas dan kartu kredensial. */
function artSvg (): string {
  const W = 480
  const H = 640
  const layers = [
    { base: 150, a: 34, b: 14, k: 0.3, fill: '#c9bea6' },
    { base: 118, a: 30, b: 12, k: 1.4, fill: '#d9d0bd' },
    { base: 88, a: 26, b: 10, k: 2.3, fill: '#e7e0d0' },
    { base: 58, a: 22, b: 9, k: 3.1, fill: '#f4f1ea' },
  ]
  const edge = (base: number, a: number, b: number, k: number) => {
    const pts: string[] = []
    for (let y = 0; y <= H; y += 16) {
      const x = base + a * Math.sin(y / 88 + k) + b * Math.sin(y / 31 + k * 2.1) + (y > H * 0.62 ? (y - H * 0.62) * 0.55 : 0)
      pts.push(`${x.toFixed(1)},${y}`)
    }
    return `M0,0 L${pts.join(' L')} L0,${H} Z`
  }
  const leaves = (cx: number, cy: number, r: number, from: number, to: number, side: 1 | -1, n: number) => {
    let out = ''
    for (let i = 0; i < n; i++) {
      const t = from + ((to - from) * i) / (n - 1)
      const x = cx + r * Math.cos(t)
      const y = cy + r * Math.sin(t)
      const tangent = (t * 180) / Math.PI + 90
      const len = 30 - i * 1.1
      for (const s of [1, -1]) {
        const ang = tangent + s * 38 * side
        out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(len / 2).toFixed(1)}" ry="${(len / 5.2).toFixed(1)}" transform="rotate(${ang.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)}) translate(${(len / 2.2).toFixed(1)} 0)" fill="url(#leaf)"/>`
      }
    }
    return out
  }
  const stem = (cx: number, cy: number, r: number, from: number, to: number) => {
    const pts: string[] = []
    for (let i = 0; i <= 24; i++) {
      const t = from + ((to - from) * i) / 24
      pts.push(`${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`)
    }
    return `<path d="M${pts.join(' L')}" stroke="#b88a0a" stroke-width="3" fill="none" stroke-linecap="round"/>`
  }
  return `<svg class="login-art-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs>
    <radialGradient id="artBg" cx="62%" cy="42%" r="70%"><stop offset="0" stop-color="#2b2414"/><stop offset=".55" stop-color="#14171c"/><stop offset="1" stop-color="#0b0d10"/></radialGradient>
    <linearGradient id="leaf" x1="0" x2="1"><stop offset="0" stop-color="#ffe14d"/><stop offset=".55" stop-color="#f0b90b"/><stop offset="1" stop-color="#8a6508"/></linearGradient>
    <filter id="paper" x="-20%" y="-5%" width="140%" height="110%"><feDropShadow dx="7" dy="4" stdDeviation="7" flood-color="#000" flood-opacity=".42"/></filter>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#000" flood-opacity=".55"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#artBg)"/>
  <circle cx="300" cy="270" r="170" fill="#f0b90b" opacity=".07"/>
  <g filter="url(#soft)">
    ${stem(410, 380, 150, 2.3, 3.85)}
    ${leaves(410, 380, 150, 2.45, 3.75, 1, 9)}
    ${stem(200, 400, 150, -0.72, 0.7)}
    ${leaves(200, 400, 150, -0.62, 0.55, -1, 9)}
  </g>
  <g transform="translate(250 300) rotate(-9)" filter="url(#soft)">
    <rect x="-96" y="-60" width="192" height="120" rx="12" fill="#0d1014" stroke="#f0b90b" stroke-width="3"/>
    <text x="-80" y="-30" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1.5" fill="#8b919a">VERIFIABLE LEARNING CREDENTIAL</text>
    <text x="-82" y="18" font-family="Inter, system-ui, sans-serif" font-weight="900" font-size="38" fill="#f0b90b">LENCANA</text>
    <text x="-80" y="42" font-family="ui-monospace, monospace" font-size="8" letter-spacing="1" fill="#d9d8cd">SOULBOUND · BAS · OB 3.0</text>
  </g>
  ${layers.map((l) => `<path d="${edge(l.base, l.a, l.b, l.k)}" fill="${l.fill}" filter="url(#paper)"/>`).join('\n  ')}
</svg>`
}

function build (): HTMLElement {
  const dialog = h('div', { class: 'login-dialog', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'login-title', hidden: true },
    h('div', { class: 'login-backdrop', 'data-close': '' }),
    h('div', { class: 'login-card' },
      h('button', { type: 'button', class: 'login-close', 'data-close': '', 'data-t': 'close' }, '×'),
      h('section', { class: 'login-form-side' },
        h('div', { class: 'login-brand' }, h('img', { src: '/lencana-logo.jpg', alt: '', width: 34, height: 34 }), h('span', null, 'Lencana')),
        h('h2', { class: 'login-title', id: 'login-title', 'data-t': 'title' }),
        h('p', { class: 'login-sub', 'data-role': 'sub' }),
        h('div', { class: 'login-step', 'data-step': 'email' },
          h('button', { type: 'button', class: 'login-google', 'data-act': 'google', hidden: true, dangerouslySetInnerHTML: { __html: `${GOOGLE_G}<span data-t="google"></span>` } }),
          h('div', { class: 'login-divider', 'data-role': 'divider', hidden: true }, h('span', { 'data-t': 'or' })),
          h('label', { class: 'login-label', for: 'login-email', 'data-t': 'email' }),
          h('input', { class: 'login-input', id: 'login-email', type: 'email', autocomplete: 'email', inputmode: 'email', spellcheck: 'false' }),
          h('button', { type: 'button', class: 'login-primary', 'data-act': 'send', 'data-t': 'send' }),
        ),
        h('div', { class: 'login-step', 'data-step': 'code', hidden: true },
          h('p', { class: 'login-note' }, h('span', { 'data-t': 'sent' }), ' ', h('b', { 'data-role': 'sent-to' }), '. ', h('span', { 'data-t': 'spam' })),
          h('label', { class: 'login-label', for: 'login-code', 'data-t': 'code' }),
          h('input', { class: 'login-input login-code', id: 'login-code', type: 'text', inputmode: 'numeric', maxlength: 6, autocomplete: 'one-time-code', placeholder: '••••••' }),
          h('button', { type: 'button', class: 'login-primary', 'data-act': 'verify', 'data-t': 'verify' }),
          h('div', { class: 'login-links' },
            h('button', { type: 'button', class: 'login-link', 'data-act': 'resend', 'data-t': 'resend' }),
            h('span', { 'aria-hidden': 'true' }, '·'),
            h('button', { type: 'button', class: 'login-link', 'data-act': 'change', 'data-t': 'change' }),
          ),
        ),
        h('p', { class: 'login-status', 'data-role': 'status', role: 'status', 'aria-live': 'polite' }),
        h('div', { class: 'login-fine' },
          h('span', { 'data-t': 'fine' }),
          h('details', null, h('summary', { 'data-t': 'keyQ' }), h('p', { 'data-t': 'keyA' })),
        ),
      ),
      h('section', { class: 'login-art', 'aria-hidden': 'true', dangerouslySetInnerHTML: { __html: artSvg() } }),
    ),
  )
  return dialog
}

function applyCopy (): void {
  if (!root) return
  root.querySelectorAll<HTMLElement>('[data-t]').forEach((el) => {
    const key = el.dataset.t as keyof typeof COPY
    if (key === 'close') el.setAttribute('aria-label', T('close'))
    else el.textContent = T(key)
  })
  const email = $<HTMLInputElement>('#login-email')
  if (email) email.placeholder = T('emailPh')
}

function status (text: string, bad = false): void {
  const el = $('[data-role="status"]')
  if (!el) return
  el.textContent = text
  el.classList.toggle('bad', bad)
}

function showStep (step: 'email' | 'code'): void {
  root?.querySelectorAll<HTMLElement>('.login-step').forEach((el) => { el.hidden = el.dataset.step !== step })
  const focus = step === 'email' ? $<HTMLInputElement>('#login-email') : $<HTMLInputElement>('#login-code')
  focus?.focus()
}

function busy (act: string, on: boolean, label: keyof typeof COPY): void {
  const btn = $<HTMLButtonElement>(`[data-act="${act}"]`)
  if (!btn) return
  btn.disabled = on
  btn.textContent = T(label)
}

async function sendCode (): Promise<void> {
  const email = ($<HTMLInputElement>('#login-email')?.value ?? '').trim()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { status(T('badEmail'), true); return }
  busy('send', true, 'sending')
  status('')
  const res = await sendPrivyCode(email)
  busy('send', false, 'send')
  if (!res.ok) { status(`${T('failed')} ${res.why ?? ''}`.trim(), true); return }
  const to = $('[data-role="sent-to"]')
  if (to) to.textContent = email
  const code = $<HTMLInputElement>('#login-code')
  if (code) code.value = ''
  showStep('code')
}

async function verifyCode (): Promise<void> {
  const email = ($<HTMLInputElement>('#login-email')?.value ?? '').trim()
  const code = ($<HTMLInputElement>('#login-code')?.value ?? '').trim()
  if (!/^\d{6}$/.test(code)) { status(T('badCode'), true); return }
  busy('verify', true, 'verifying')
  status('')
  const res = await connectPrivyLearner(email, code)
  busy('verify', false, 'verify')
  if (!res.ok || !res.identity) { status(`${T('failed')} ${res.why ?? ''}`.trim(), true); return }
  signedIn(res.identity.address)
}

async function google (): Promise<void> {
  status(T('toGoogle'))
  try { sessionStorage.setItem(AFTER_KEY, window.location.hash || '#/') } catch { /* tanpa storage: kembali ke beranda */ }
  const res = await startGoogleLogin(`${window.location.origin}${window.location.pathname}`)
  if (!res.ok) status(`${T('googleFail')} ${res.why ?? ''}`.trim(), true)
}

function signedIn (address: string): void {
  closeLogin()
  hooks?.onSignedIn(address)
}

function onKey (e: KeyboardEvent): void {
  if (!root || root.hidden) return
  if (e.key === 'Escape') { e.preventDefault(); closeLogin(); return }
  if (e.key === 'Tab') {
    // Fokus tetap di dalam dialog selama ia terbuka.
    const items = [...root.querySelectorAll<HTMLElement>('button:not([disabled]):not([hidden]), input:not([hidden]), summary')]
      .filter((el) => el.offsetParent !== null)
    if (!items.length) return
    const first = items[0]
    const last = items[items.length - 1]
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
  }
}

export function initLogin (h0: Hooks): void {
  hooks = h0
  if (root) return
  root = build()
  document.body.appendChild(root)
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement
    if (t.closest('[data-close]')) { closeLogin(); return }
    const act = (t.closest('[data-act]') as HTMLElement | null)?.dataset.act
    if (act === 'send' || act === 'resend') void sendCode()
    else if (act === 'verify') void verifyCode()
    else if (act === 'change') { status(''); showStep('email') }
    else if (act === 'google') void google()
  })
  root.addEventListener('keydown', (e) => {
    const t = e.target as HTMLElement
    if (e.key !== 'Enter') return
    if (t.id === 'login-email') { e.preventDefault(); void sendCode() }
    if (t.id === 'login-code') { e.preventDefault(); void verifyCode() }
  })
  document.addEventListener('keydown', onKey)
}

export function openLogin (opts: { guarded?: boolean } = {}): void {
  if (!root) return
  lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  applyCopy()
  const sub = $('[data-role="sub"]')
  if (sub) sub.textContent = opts.guarded ? T('guard') : T('sub')
  status('')
  opener = document.activeElement as HTMLElement | null
  root.hidden = false
  document.documentElement.classList.add('login-open')
  showStep('email')
  // Google hanya ditawarkan kalau metode itu aktif di app login.
  void loginMethods().then((m) => {
    const g = $<HTMLButtonElement>('[data-act="google"]')
    const d = $('[data-role="divider"]')
    if (g) g.hidden = !m.google
    if (d) d.hidden = !m.google
  })
}

export function closeLogin (): void {
  if (!root || root.hidden) return
  root.hidden = true
  document.documentElement.classList.remove('login-open')
  opener?.focus?.()
  opener = null
}

/**
 * Pulang dari Google: alamat membawa `privy_oauth_code` + `privy_oauth_state`. Tukar dengan sesi, bersihkan alamat
 * (kode sekali-pakai tidak boleh tertinggal di riwayat), lalu kembali ke halaman semula. true = alamat ini memang
 * kepulangan dari Google (berhasil atau tidak).
 */
export async function completeGoogleReturn (): Promise<boolean> {
  const q = new URLSearchParams(window.location.search)
  const code = q.get('privy_oauth_code')
  const state = q.get('privy_oauth_state')
  if (!code || !state) return false
  let back = '#/'
  try { back = sessionStorage.getItem(AFTER_KEY) || '#/'; sessionStorage.removeItem(AFTER_KEY) } catch { /* tanpa storage */ }
  window.history.replaceState(window.history.state, '', `${window.location.pathname}${back}`)
  const res = await finishGoogleLogin(code, state)
  if (res.ok && res.identity) { hooks?.onSignedIn(res.identity.address); return true }
  openLogin()
  status(`${T('googleFail')} ${res.why ?? ''}`.trim(), true)
  return true
}
