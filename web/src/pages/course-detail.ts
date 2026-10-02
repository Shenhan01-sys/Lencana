/**
 * `course-detail.ts` — halaman detail kursus PUBLIK `#/course/<id>` (RF7 langkah A2, B124).
 *
 * Orang yang belum masuk boleh melihat apa yang akan ia pelajari dan apa yang dibuktikan kredensialnya — silabus,
 * penerbit, aturan penilaian, HARGA — tetapi isi kelasnya tetap di balik akun dan, sejak B125, di balik pembayaran:
 * "Bayar & daftar" menandatangani izin token (tanpa gas) dan penerbit menyelesaikan pembayarannya sebelum kelas terbuka.
 */
import './dashboard.css'
import './dash-viz.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { findCourse } from '../courses/index'
import { manifestOf, rubricHashOf, shortHash } from '../manifest'
import { claimTestCoins, hasExplicitLearnerSession, isEnrolled, payAndEnroll } from '../learning'
import { PAY_TOKEN_SYMBOL, formatLdc, priceOf } from '../pricing'
import { balanceChanged, onBalance, readBalance } from '../balance'
import { coin } from '../lib/coin'
import { odometer, setOdometer } from '../lib/odometer'
import { skeleton } from '../lib/loading'
import { KIND_LABEL, classLink } from '../lesson-views'
import { openLogin } from './login'

type Lang = 'en' | 'id'
const COPY = {
  notFound: { en: 'This course is not in the catalogue.', id: 'Kursus ini tidak ada di katalog.' },
  back: { en: 'Back to the catalogue', id: 'Kembali ke katalog' },
  by: { en: 'Published by', id: 'Diterbitkan oleh' },
  modules: { en: 'modules', id: 'modul' },
  lessons: { en: 'lessons', id: 'lesson' },
  minutes: { en: 'minutes', id: 'menit' },
  start: { en: 'Start learning', id: 'Mulai belajar' },
  enroll: { en: 'Enroll', id: 'Daftar' },
  enrollNote: { en: 'Sign in with your account to open the class.', id: 'Masuk dengan akunmu untuk membuka kelasnya.' },
  outcome: { en: 'What you will be able to do', id: 'Yang akan kamu kuasai' },
  audience: { en: 'Who it is for', id: 'Untuk siapa' },
  syllabus: { en: 'Syllabus', id: 'Silabus' },
  proof: { en: 'What the credential proves', id: 'Apa yang dibuktikan kredensialnya' },
  weights: { en: 'Final score weights', id: 'Bobot nilai akhir' },
  pass: { en: 'Pass mark', id: 'Ambang lulus' },
  valid: { en: 'Valid for', id: 'Berlaku' },
  days: { en: 'days', id: 'hari' },
  rubric: { en: 'Grading rules locked in rubricHash', id: 'Aturan penilaian dikunci di rubricHash' },
  rubricNote: {
    en: 'Quizzes and their keys, the essay rubric, the weights and the pass mark are hashed together; the publisher cannot change them quietly, and every credential prints this hash.',
    id: 'Kuis beserta kuncinya, rubrik esai, bobot, dan ambang lulus di-hash bersama; penerbit tidak bisa menggantinya diam-diam, dan setiap kredensial mencetak hash ini.',
  },
  prereq: { en: 'Prerequisite', id: 'Prasyarat' },
  price: { en: 'Price', id: 'Harga' },
  coinNote: { en: 'test coin on BNB testnet — on mainnet the same price is paid in a stablecoin', id: 'koin uji di BNB testnet — di mainnet harga yang sama dibayar dengan stablecoin' },
  checking: { en: 'Checking your enrollment…', id: 'Memeriksa pendaftaranmu…' },
  enrolledAlready: { en: 'You are enrolled in this course.', id: 'Kamu sudah terdaftar di kursus ini.' },
  balance: { en: 'Your balance', id: 'Saldomu' },
  pay: { en: 'Pay & enroll', id: 'Bayar & daftar' },
  paying: { en: 'Sign the payment, then the publisher settles it on chain (a few seconds)…', id: 'Tandatangani pembayarannya, lalu penerbit menyelesaikannya di chain (beberapa detik)…' },
  paidOk: { en: 'Paid — opening the class…', id: 'Lunas — membuka kelas…' },
  needCoins: { en: 'Your balance is below the price. Get test coins first.', id: 'Saldomu di bawah harga. Ambil koin uji dulu.' },
  faucet: { en: 'Get test coins', id: 'Ambil koin uji' },
  faucetSending: { en: 'Sending test coins to your wallet…', id: 'Mengirim koin uji ke dompetmu…' },
  faucetOk: { en: 'Test coins arrived.', id: 'Koin uji sudah masuk.' },
  failed: { en: 'Did not go through:', id: 'Belum berhasil:' },
  gasNote: { en: 'You only sign — no gas, no wallet top-up. The publisher broadcasts the payment.', id: 'Kamu hanya menandatangani — tanpa gas, tanpa isi saldo BNB. Penerbit yang menyiarkan pembayarannya.' },
  quiz: { en: 'quiz', id: 'kuis' },
  essay: { en: 'essay', id: 'esai' },
  practice: { en: 'practice', id: 'praktik' },
} satisfies Record<string, Record<Lang, string>>

/**
 * Panel bayar untuk akun yang sudah masuk (B125): sudah terdaftar → mulai belajar; belum → saldo koin dari chain,
 * "Ambil koin uji" bila kurang, dan "Bayar & daftar". Semua angka di sini dibaca (chain atau penerbit), tidak diketik.
 */
function payPanel (courseId: string, price: bigint, T: (k: keyof typeof COPY) => string): HTMLElement {
  const status = h('p', { class: 'cd-pay-status', role: 'status', 'aria-live': 'polite' })
  // B126: saldo = koin + angka bergulir dari pembaca saldo bersama (chip navbar ikut berubah).
  const amount = odometer('0')
  const coinSlot = h('span', { class: 'cd-balance-coin' }, coin(34))
  const balanceBox = h('div', { class: 'cd-balance', hidden: true },
    coinSlot,
    h('div', { class: 'cd-balance-text' }, h('span', null, T('balance')), h('b', null, amount, h('small', null, PAY_TOKEN_SYMBOL))))
  const payBtn = h('button', { type: 'button', class: 'cd-cta', disabled: true }, `${T('pay')} · ${formatLdc(price)} ${PAY_TOKEN_SYMBOL}`) as HTMLButtonElement
  const faucetBtn = h('button', { type: 'button', class: 'cd-ghost', hidden: true }, T('faucet')) as HTMLButtonElement
  const panel = h('div', { class: 'cd-pay' }, skeleton('panel', T('checking')))
  const say = (text: string, bad = false) => { status.textContent = text; status.classList.toggle('bad', bad) }
  const show = (bal: bigint | null) => {
    if (bal === null) { balanceBox.hidden = true; return }
    balanceBox.hidden = false
    setOdometer(amount, formatLdc(bal))
    const short = bal < price
    balanceBox.classList.toggle('short', short)
    faucetBtn.hidden = !short
    payBtn.disabled = short
    if (short) say(T('needCoins'))
  }
  const stop = onBalance((v) => { if (!panel.isConnected && panel.dataset.ready) { stop(); return } show(v) })
  void isEnrolled(courseId).then(async (enrolled) => {
    panel.dataset.ready = '1'
    if (!panel.isConnected) return
    if (enrolled) {
      stop()
      panel.replaceChildren(h('p', { class: 'cd-pay-status ok' }, T('enrolledAlready')), h('a', { class: 'cd-cta', href: classLink(courseId) }, T('start')))
      return
    }
    panel.replaceChildren(payBtn, faucetBtn, balanceBox, status, h('p', { class: 'cd-cta-note' }, T('gasNote')))
    await readBalance(true)
  })
  payBtn.addEventListener('click', async () => {
    payBtn.disabled = true
    faucetBtn.disabled = true
    say(T('paying'))
    const r = await payAndEnroll(courseId)
    faucetBtn.disabled = false
    if (r.ok) { say(T('paidOk')); balanceChanged(); setTimeout(() => { window.location.hash = classLink(courseId) }, 900); return }
    if (r.needCoins) { await readBalance(true); return }
    payBtn.disabled = false
    say(`${T('failed')} ${r.why ?? ''}`.trim(), true)
  })
  faucetBtn.addEventListener('click', async () => {
    faucetBtn.disabled = true
    say(T('faucetSending'))
    const r = await claimTestCoins()
    faucetBtn.disabled = false
    if (r.ok) {
      say(T('faucetOk'))
      coinSlot.replaceChildren(coin(34, { drop: true }))
      balanceChanged(r.balance)
      return
    }
    say(`${T('failed')} ${r.why ?? ''}`.trim(), true)
  })
  return panel
}

/**
 * B127: panel bayar yang sama, dipasang di luar halaman ini (pratinjau di halaman Kursus). Dibungkus `.course-detail
 * .cd-embed` supaya gayanya ikut tanpa tata letak halaman. null = kursus tanpa harga.
 */
export function embeddedPayPanel (courseId: string): HTMLElement | null {
  const price = priceOf(courseId)
  if (price === null) return null
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  return h('div', { class: 'course-detail cd-embed' }, payPanel(courseId, price, T))
}

export function renderCourseDetail (courseId: string): HTMLElement {
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const course = findCourse(courseId)
  if (!course) {
    return h('div', { class: 'course-detail' },
      h('p', { class: 'cd-empty' }, T('notFound')),
      h('a', { class: 'cd-link', href: '#catalog' }, `← ${T('back')}`))
  }
  const manifest = manifestOf(course.id)
  const lessons = course.modules.flatMap((m) => m.lessons)
  const minutes = lessons.reduce((n, l) => n + (l.minutes || 0), 0)
  const signedIn = hasExplicitLearnerSession()
  const prereq = course.prereqCourseId ? findCourse(course.prereqCourseId) : undefined

  const price = priceOf(course.id)
  const priceLine = price === null ? null : h('div', { class: 'cd-price' },
    h('span', null, T('price')),
    h('strong', null, `${formatLdc(price)} ${PAY_TOKEN_SYMBOL}`),
    h('small', null, T('coinNote')),
  )
  const cta = signedIn
    ? (price === null ? h('a', { class: 'cd-cta', href: classLink(course.id) }, T('start')) : payPanel(course.id, price, T))
    : h('button', {
      type: 'button',
      class: 'cd-cta',
      onClick: () => {
        try { sessionStorage.setItem('lencana_enroll_target', course.id) } catch { /* tanpa storage: kembali ke dashboard */ }
        openLogin()
      },
    }, price === null ? T('enroll') : `${T('enroll')} · ${formatLdc(price)} ${PAY_TOKEN_SYMBOL}`)

  return h('div', { class: 'course-detail' },
    h('a', { class: 'cd-link', href: '#catalog' }, `← ${T('back')}`),
    h('header', { class: 'cd-hero' },
      h('div', { class: 'cd-hero-text' },
        h('span', { class: 'cd-level' }, course.level),
        h('h1', { class: 'cd-title' }, course.title),
        h('p', { class: 'cd-blurb' }, course.blurb),
        h('p', { class: 'cd-by' }, `${T('by')} `, h('strong', null, manifest?.issuer.name ?? course.institution)),
        h('div', { class: 'cd-stats' },
          h('span', null, h('b', null, String(course.modules.length)), ` ${T('modules')}`),
          h('span', null, h('b', null, String(lessons.length)), ` ${T('lessons')}`),
          h('span', null, h('b', null, String(minutes)), ` ${T('minutes')}`),
        ),
      ),
      h('div', { class: 'cd-cta-box' },
        priceLine,
        cta,
        signedIn ? null : h('p', { class: 'cd-cta-note' }, T('enrollNote')),
        prereq ? h('p', { class: 'cd-cta-note' }, `${T('prereq')}: `, h('a', { href: `#/course/${encodeURIComponent(prereq.id)}` }, prereq.title)) : null,
      ),
    ),
    h('div', { class: 'cd-grid' },
      h('section', { class: 'cd-card' },
        h('h2', null, T('outcome')),
        h('ul', { class: 'cd-list' }, ...course.outcome.map((o) => h('li', null, o))),
      ),
      h('section', { class: 'cd-card' },
        h('h2', null, T('audience')),
        h('ul', { class: 'cd-list' }, ...course.audience.map((a) => h('li', null, a))),
      ),
    ),
    h('section', { class: 'cd-card cd-syllabus' },
      h('h2', null, T('syllabus')),
      ...course.modules.map((m, mi) => h('div', { class: 'cd-module' },
        h('div', { class: 'cd-module-head' },
          h('span', { class: 'cd-module-no' }, String(mi + 1).padStart(2, '0')),
          h('div', null, h('h3', null, m.title), h('p', null, m.blurb)),
        ),
        h('ol', { class: 'cd-lessons' }, ...m.lessons.map((l) => h('li', null,
          h('span', { class: 'cd-lesson-title' }, l.title),
          h('span', { class: `cd-kind cd-kind-${l.kind}` }, KIND_LABEL[l.kind] ?? l.kind),
          h('span', { class: 'cd-min' }, `${l.minutes} ${T('minutes')}`),
        ))),
      )),
    ),
    h('section', { class: 'cd-card cd-proof' },
      h('h2', null, T('proof')),
      h('p', null, course.criteria),
      h('dl', { class: 'cd-facts' },
        h('div', null, h('dt', null, T('weights')),
          h('dd', null, `${T('quiz')} ${course.weights.kuis}% · ${T('essay')} ${course.weights.esai}% · ${T('practice')} ${course.weights.praktik}%`)),
        h('div', null, h('dt', null, T('pass')), h('dd', null, String(course.passMark))),
        h('div', null, h('dt', null, T('valid')), h('dd', null, `${course.validDays} ${T('days')}`)),
        manifest ? h('div', null, h('dt', null, T('rubric')), h('dd', null, h('code', null, shortHash(rubricHashOf(manifest))))) : null,
      ),
      h('p', { class: 'cd-muted' }, T('rubricNote')),
    ),
  )
}
