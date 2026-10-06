/**
 * `agent-market.ts` — bursa agen di dasbor Penerbit `#/app/pub/agents` (B138, D70). Agen dipilih dari etalase, bukan diketik
 * nomornya.
 *
 * Benda di panggung (doktrin FE builder: wakili, jangan deskripsikan) — setiap agen berdiri di lapaknya sebagai robotnya sendiri
 * (rupa dari berkas registrasi ERC-8004, B132), dan datanya dibaca dari bentuknya:
 *   mata menyala     dompet agen terisi        lampu antena   layak disewa (merah = alasannya tertulis di bawah)
 *   pelat dada       tarif dasar               tangga kecil   tujuh label harga (tinggi = harga)
 *   chip otak        provider/model + dua titik kalibrasi di skala 0–100 dengan garis lulus (B135)
 *   batang rapor     keputusan pengesah atas usulannya: disetujui / disesuaikan / ditolak (B104)
 *   papan kursus     tempat agen bekerja (penilai / pengesah)
 * Di atas etalase: "Tim agen kursusmu" — kursi penilai dan pengesah tiap kursus, kursi kosong digambar putus-putus.
 * Sewa / tunjuk dari lapak: pilih kursus (kursus yang terhalang aturan ditandai alasannya), tanda tangan dari akunmu.
 * Aturan konflik di halaman = `web/src/market.ts`; yang memutuskan tetap server.
 */
// Lencana-B138 status=SELESAI 2026-10-03 — bursa agen di dasbor Penerbit: tim agen per kursus, etalase robot agen (harga, otak, rekam jejak, status, tempat bekerja), saring/urut/cari, sewa/tunjuk dari lapak dengan alasan konflik sebelum tombol ditekan. Buktikan ulang: cd signer && npm run verify:market, lalu uji peramban T65. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './agent-market.css'
import { h } from '../lib/ui'
import { findCourse } from '../courses/index'
import { robotSvg, DEFAULT_AVATAR } from '../robot'
import { LLM_PROVIDERS, isProvider } from '../llm'
import { formatLdc, PAY_TOKEN_SYMBOL } from '../pricing'
import { hireBlock, appointBlock, teamOf, marketView, type AgentMarket, type MarketAgent, type Block, type MarketSort } from '../market'
import { readAgentMarket, memberHireAgent, memberAppointReviewer, learnerAddress, type PublisherOverview } from '../learning'

type Lang = 'en' | 'id'
type Kind = 'hire' | 'appoint'

const COPY = {
  kicker: { en: 'AGENT MARKET · ERC-8004 · BNB TESTNET', id: 'BURSA AGEN · ERC-8004 · BNB TESTNET' },
  title: { en: 'Pick agents for your courses', id: 'Pilih agen untuk kursusmu' },
  sub: {
    en: 'Every agent is an ERC-8004 identity. Owner, wallet, tariff and look are read from the registry now; brain, work and record from the publisher’s records.',
    id: 'Setiap agen adalah identitas ERC-8004. Pemilik, dompet, tarif, dan rupanya dibaca dari registry saat ini; otak, tempat kerja, dan rekam jejaknya dari rekaman penerbit.',
  },
  loading: { en: 'Reading the agent registry…', id: 'Membaca registry agen…' },
  failed: { en: 'The market could not be read:', id: 'Bursa tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  refresh: { en: 'Refresh', id: 'Muat ulang' },
  agentsN: { en: 'agents', id: 'agen' },
  updated: { en: 'read', id: 'dibaca' },
  unreadable: { en: 'not readable from the registry right now', id: 'tidak terbaca dari registry saat ini' },
  team: { en: 'Your courses’ agent team', id: 'Tim agen kursusmu' },
  teamSub: { en: 'Grader and reviewer seats per course. Empty seats are dashed — fill them from the market below.', id: 'Kursi penilai dan pengesah tiap kursus. Kursi kosong bergaris putus — isi dari bursa di bawah.' },
  graderSeat: { en: 'grader', id: 'penilai' },
  reviewerSeat: { en: 'reviewer', id: 'pengesah' },
  emptySeat: { en: 'empty', id: 'kosong' },
  addressSeat: { en: 'address', id: 'alamat' },
  noTeam: { en: 'courses without a grader or reviewer yet', id: 'kursus belum punya penilai maupun pengesah' },
  staleSeat: { en: 'wallet changed — hire again', id: 'dompet berubah — sewa ulang' },
  search: { en: 'Search name or #number', id: 'Cari nama atau #nomor' },
  onlyHireable: { en: 'Hireable', id: 'Bisa disewa' },
  onlyBrain: { en: 'Has a brain', id: 'Punya otak' },
  sort: { en: 'Sort', id: 'Urutkan' },
  sortExperience: { en: 'Most experienced', id: 'Paling berpengalaman' },
  sortPrice: { en: 'Cheapest', id: 'Termurah' },
  sortNewest: { en: 'Newest', id: 'Terbaru' },
  nothing: { en: 'No agent matches.', id: 'Tidak ada agen yang cocok.' },
  owner: { en: 'owner', id: 'pemilik' },
  mine: { en: 'yours', id: 'milikmu' },
  roleSelf: { en: 'registered by its owner', id: 'didaftarkan pemiliknya' },
  roleMinted: { en: 'minted by the platform', id: 'dicetak platform' },
  plainLook: { en: 'look not assembled', id: 'rupa belum dirakit' },
  from: { en: 'from', id: 'mulai' },
  perGrading: { en: 'per grading', id: 'per penilaian' },
  upTo: { en: 'up to', id: 's.d.' },
  noTariff: { en: 'no tariff yet', id: 'belum ada tarif' },
  noBrain: { en: 'no brain — its operator types the scores', id: 'tanpa otak — angkanya diketik operatornya' },
  brainCal: { en: 'calibration: substantive {s} · empty {e}', id: 'kalibrasi: substantif {s} · kosong {e}' },
  gradings: { en: 'gradings', id: 'penilaian' },
  reviews: { en: 'reviews', id: 'pengesahan' },
  approved: { en: 'approved', id: 'disetujui' },
  adjusted: { en: 'adjusted', id: 'disesuaikan' },
  rejected: { en: 'rejected', id: 'ditolak' },
  verdictsOf: { en: 'reviewers’ verdicts on its proposals', id: 'keputusan pengesah atas usulannya' },
  noRecord: { en: 'no track record yet', id: 'belum ada rekam jejak' },
  worksAt: { en: 'works at', id: 'bekerja di' },
  idle: { en: 'not working anywhere yet', id: 'belum bekerja di mana pun' },
  hireable: { en: 'Hireable', id: 'Bisa disewa' },
  notHireable: { en: 'Not hireable', id: 'Belum bisa disewa' },
  hire: { en: 'Hire as grader', id: 'Sewa sebagai penilai' },
  appoint: { en: 'Appoint as reviewer', id: 'Tunjuk sebagai pengesah' },
  course: { en: 'Course', id: 'Kursus' },
  signHire: { en: 'Sign & hire', id: 'Tandatangani & sewa' },
  signAppoint: { en: 'Sign & appoint', id: 'Tandatangani & tunjuk' },
  rehire: { en: 'hire again (wallet changed)', id: 'sewa ulang (dompet berubah)' },
  signing: { en: 'Signing and sending…', id: 'Menandatangani dan mengirim…' },
  doneHire: { en: 'Hired — recorded under your address.', id: 'Disewa — tercatat atas alamatmu.' },
  doneAppoint: { en: 'Appointed — recorded under your address.', id: 'Ditunjuk — tercatat atas alamatmu.' },
  close: { en: 'Close', id: 'Tutup' },
  cancel: { en: 'Cancel', id: 'Batal' },
  dealHire: { en: 'Hiring contract · grader', id: 'Kontrak sewa · penilai' },
  dealAppoint: { en: 'Appointment · reviewer', id: 'Penunjukan · pengesah' },
  fee: { en: 'Fee', id: 'Bayaran' },
  perReview: { en: 'per review', id: 'per pengesahan' },
  feeNote: { en: 'The agent picks the difficulty label per activity; the fee is charged per activity to its wallet.', id: 'Agen memilih label tingkat berat per aktivitas; bayaran ditagih per aktivitas ke dompet agen.' },
  brainLabel: { en: 'Brain', id: 'Otak' },
  noBrainShort: { en: 'no brain — its operator types the scores', id: 'tanpa otak — angkanya diketik operatornya' },
  signer: { en: 'Signed by', id: 'Ditandatangani' },
  signerNote: { en: 'your account — recorded as the one who hired', id: 'akunmu — tercatat sebagai penyewanya' },
  signerNoteAppoint: { en: 'your account — recorded as the one who appointed', id: 'akunmu — tercatat sebagai yang menunjuk' },
  serverDecides: { en: 'The server checks the same rules again and decides.', id: 'Server memeriksa aturan yang sama sekali lagi dan yang memutuskan.' },
  testTag: { en: 'test', id: 'uji' },
} satisfies Record<string, Record<Lang, string>>

const BLOCK: Record<Block, Record<Lang, string>> = {
  'no-permission': { en: 'your membership does not include this', id: 'keanggotaanmu tidak mencakup ini' },
  'not-hireable': { en: 'not hireable', id: 'belum layak disewa' },
  'own-agent': { en: 'your own agent — not with the publisher’s money', id: 'agen milikmu — tidak dengan uang penerbit' },
  already: { en: 'already working here', id: 'sudah bekerja di sini' },
  'reviewer-here': { en: 'it reviews this course', id: 'ia pengesah kursus ini' },
  'same-owner-reviewer': { en: 'same owner as this course’s reviewer agent', id: 'pemiliknya sama dengan agen pengesah kursus ini' },
  'grader-here': { en: 'it grades this course', id: 'ia penilai kursus ini' },
  'same-owner-grader': { en: 'same owner as this course’s grading agent', id: 'pemiliknya sama dengan agen penilai kursus ini' },
}

const short = (a: string | null | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')
const enter = (i: number) => ({ '--i': String(i) }) as Partial<CSSStyleDeclaration>
const same = (a?: string | null, b?: string | null) => Boolean(a) && Boolean(b) && String(a).toLowerCase() === String(b).toLowerCase()

function svgEl (markup: string, cls: string, viewBox: string, label: string): SVGSVGElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" role="img" aria-label="${label.replace(/[<>&"']/g, '')}">${markup}</svg>`
  return wrap.firstElementChild as SVGSVGElement
}

/** Robot agen dengan data hidup: mata = dompet terisi, lampu = layak sewa, dada = tarif dasar. Dibungkus elemen HTML. */
function robotOf (a: MarketAgent, cls: string): HTMLElement {
  const chest = a.tariff ? formatLdc(BigInt(a.tariff.amount)) : '—'
  const markup = robotSvg(a.avatar ?? DEFAULT_AVATAR, { live: { eyesOn: Boolean(a.wallet), bulb: a.hireable ? 'ok' : 'bad', chest } })
  const holder = h('span', { class: `${cls}${a.avatar ? '' : ' plain'}` })
  holder.appendChild(svgEl(markup, 'am-svg', '-10 -8 220 256', a.name ?? `#${a.agentId}`))
  return holder
}

let memo: AgentMarket | null = null

/**
 * Tab Agen: tim agen kursusmu + etalase. `extra` = bagian dasbor yang tetap (cari dengan nomor, tagihan agen).
 * `reload` memuat ulang dasbor Penerbit sesudah sewa/tunjuk berhasil.
 */
export function agentMarketView (lang: Lang, o: PublisherOverview, reload: () => void, extra: HTMLElement[]): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const body = h('div', { class: 'am-body' })
  const wrap = h('div', { class: 'app-stack am' },
    h('header', { class: 'am-head lc-enter', style: enter(0) },
      h('span', { class: 'app-kicker' }, T('kicker')),
      h('h2', null, T('title')),
      h('p', { class: 'app-muted' }, T('sub'))),
    body, ...extra)
  const load = (fresh: boolean) => {
    if (!fresh && memo) { body.replaceChildren(market(lang, o, memo, reload, () => load(true))); return }
    body.replaceChildren(h('div', { class: 'app-card am-loading', role: 'status' }, h('span', { class: 'am-spin', 'aria-hidden': 'true' }), T('loading')))
    void readAgentMarket().then((r) => {
      if (r.ok && r.data) memo = r.data
      if (!body.isConnected) return // tab sudah ditinggalkan; hasilnya tetap disimpan untuk kunjungan berikutnya
      if (!r.ok || !r.data) {
        body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: () => load(true) }, T('retry'))))
        return
      }
      body.replaceChildren(market(lang, o, r.data, reload, () => load(true)))
    })
  }
  load(false)
  return wrap
}

function market (lang: Lang, o: PublisherOverview, m: AgentMarket, reload: () => void, refresh: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const byId = new Map(m.agents.map((a) => [a.agentId, a]))
  const member = learnerAddress()

  // ---- tim agen kursusmu: kursi penilai + pengesah per kursus
  const seat = (kind: 'grader' | 'reviewer', agentId: string | null, label: string | null, stale: boolean) => {
    const a = agentId ? byId.get(agentId) : undefined
    return h('li', { class: `am-seat ${kind}${agentId || label ? '' : ' empty'}${stale ? ' stale' : ''}`, title: stale ? T('staleSeat') : '' },
      a ? robotOf(a, 'am-seat-bot') : h('span', { class: 'am-seat-ghost', 'aria-hidden': 'true' }),
      h('small', null, kind === 'grader' ? T('graderSeat') : T('reviewerSeat')),
      h('b', null, a ? (a.name ?? `#${a.agentId}`) : agentId ? `#${agentId}` : label ?? T('emptySeat')),
      agentId ? h('code', null, `#${agentId}`) : null)
  }
  // Kursus yang sudah punya agen tampil dengan kursinya; yang belum sama sekali dirangkum satu baris (tanpa itu 8 baris kursi
  // kosong mendorong etalase jauh ke bawah — T65).
  const staffed = o.courses.filter((c) => o.agents.hires.some((x) => x.courseId === c.id) || o.agents.reviewers.some((x) => x.courseId === c.id))
  const unstaffed = o.courses.filter((c) => !staffed.includes(c))
  const team = h('section', { class: 'app-card am-team lc-enter', style: enter(1) },
    h('div', { class: 'am-row-head' }, h('h3', null, T('team')), h('small', { class: 'app-muted' }, T('teamSub'))),
    h('ul', { class: 'am-courses' }, ...staffed.map((c) => {
      const graders = o.agents.hires.filter((x) => x.courseId === c.id)
      const reviewers = o.agents.reviewers.filter((x) => x.courseId === c.id)
      const staleG = (id: string) => byId.get(id)?.work.grading.find((g) => g.courseId === c.id)?.stale ?? false
      return h('li', { class: 'am-course' },
        h('div', { class: 'am-course-name' }, h('b', null, c.title), c.unlisted ? h('span', { class: 'app-tag' }, T('testTag')) : null),
        h('ul', { class: 'am-seats' },
          ...(graders.length ? graders.map((g) => seat('grader', g.agentId, null, staleG(g.agentId))) : [seat('grader', null, null, false)]),
          ...(reviewers.length ? reviewers.map((r) => seat('reviewer', r.agentId, r.agentId ? null : `${T('addressSeat')} ${short(r.reviewer)}`, false)) : [seat('reviewer', null, null, false)])))
    }),
    unstaffed.length
      ? h('li', { class: 'am-course am-unstaffed' },
        h('div', { class: 'am-course-name' }, h('b', null, `${unstaffed.length} ${T('noTeam')}`)),
        h('ul', { class: 'am-empty-courses' }, ...unstaffed.map((c) => h('li', null, c.title, c.unlisted ? h('span', { class: 'app-tag' }, T('testTag')) : null))))
      : null))

  // ---- alat etalase: cari, saring, urut
  let q = ''
  let hireableOnly = false
  let brainOnly = false
  let sort: MarketSort = 'experience'
  const grid = h('div', { class: 'am-grid' })
  const draw = () => {
    const list = marketView(m.agents, { q, hireableOnly, brainOnly, sort })
    grid.replaceChildren(...(list.length ? list.map((a, i) => booth(lang, o, a, i, member, reload)) : [h('p', { class: 'app-muted am-nothing' }, T('nothing'))]))
  }
  const search = h('input', { type: 'search', class: 'am-search', placeholder: T('search'), 'aria-label': T('search') }) as HTMLInputElement
  search.addEventListener('input', () => { q = search.value; draw() })
  const chip = (label: string, on: () => boolean, flip: () => void) => {
    const b = h('button', { type: 'button', class: 'am-chip', 'aria-pressed': 'false' }, label) as HTMLButtonElement
    b.addEventListener('click', () => { flip(); b.classList.toggle('on', on()); b.setAttribute('aria-pressed', on() ? 'true' : 'false'); draw() })
    return b
  }
  const sortSel = h('select', { class: 'am-sort', 'aria-label': T('sort') },
    h('option', { value: 'experience' }, T('sortExperience')), h('option', { value: 'price' }, T('sortPrice')), h('option', { value: 'newest' }, T('sortNewest'))) as HTMLSelectElement
  sortSel.addEventListener('change', () => { sort = sortSel.value as MarketSort; draw() })
  const when = new Date(m.generatedAt).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'id-ID', { hour: '2-digit', minute: '2-digit' })
  const tools = h('div', { class: 'am-tools lc-enter', style: enter(2) },
    search,
    chip(T('onlyHireable'), () => hireableOnly, () => { hireableOnly = !hireableOnly }),
    chip(T('onlyBrain'), () => brainOnly, () => { brainOnly = !brainOnly }),
    h('label', { class: 'am-sort-wrap' }, h('span', null, T('sort')), sortSel),
    h('span', { class: 'am-meta' }, `${m.agents.length} ${T('agentsN')} · ${T('updated')} ${when}`,
      m.unreadable.length ? h('em', null, ` · #${m.unreadable.join(', #')} ${T('unreadable')}`) : null),
    h('button', { type: 'button', class: 'app-btn small', onClick: refresh }, T('refresh')))
  draw()
  return h('div', { class: 'app-stack' }, team, tools, grid)
}

/** Satu lapak: robot + nama + harga + otak + rapor + tempat kerja + status + aksi. */
function booth (lang: Lang, o: PublisherOverview, a: MarketAgent, i: number, member: string | null, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const mine = same(a.owner, member) || same(a.wallet, member)
  const role = a.registrationRole === 'grader-self' ? T('roleSelf') : a.registrationRole === 'grader-account' ? T('roleMinted') : null

  // harga: tangga tujuh label, tinggi = harga dinormalkan min–maks (selisih per anak tangga cuma 5% — tanpa itu batangnya rata)
  const amounts = a.rateCard.map((x) => BigInt(x.amount))
  const top = amounts.reduce((mx, x) => (x > mx ? x : mx), 0n)
  const low = amounts.reduce((mn, x) => (x < mn ? x : mn), top)
  const span = top - low
  const price = a.tariff && amounts.length
    ? h('div', { class: 'am-price' },
      h('div', null, h('small', null, T('from')), h('b', null, `${formatLdc(amounts[0])} ${PAY_TOKEN_SYMBOL}`), h('small', null, `${T('perGrading')} · ${T('upTo')} ${formatLdc(top)}`)),
      h('ol', { class: 'am-ladder', 'aria-hidden': 'true' }, ...amounts.map((x, k) => h('li', { style: { '--h': `${span > 0n ? 28 + Number(((x - low) * 72n) / span) : 60}%`, '--k': String(k) } }))))
    : h('div', { class: 'am-price none' }, h('small', null, T('noTariff')))

  // otak: chip provider/model + dua titik kalibrasi pada skala 0–100, garis lulus
  const b = a.brain
  const brain = b
    ? h('div', { class: 'am-brain' },
      h('span', { class: 'am-brain-chip' }, h('i', { 'aria-hidden': 'true' }), isProvider(b.provider) ? LLM_PROVIDERS[b.provider].label : b.provider),
      h('code', null, b.model),
      h('div', { class: 'am-cal', style: { '--pass': `${b.calibration.passMark}%`, '--e': `${b.calibration.hollow}%`, '--s': `${b.calibration.substantive}%` }, title: T('brainCal').replace('{s}', String(b.calibration.substantive)).replace('{e}', String(b.calibration.hollow)) },
        h('span', { class: 'am-cal-e' }), h('span', { class: 'am-cal-s' })),
      h('small', null, T('brainCal').replace('{s}', String(b.calibration.substantive)).replace('{e}', String(b.calibration.hollow))))
    : h('div', { class: 'am-brain none' }, h('small', null, T('noBrain')))

  // rapor: keputusan pengesah atas usulannya
  const v = a.record.verdicts
  const judged = v.approved + v.adjusted + v.rejected
  const record = h('div', { class: 'am-record' },
    h('div', { class: 'am-counts' }, h('span', null, h('b', null, String(a.record.graded)), ` ${T('gradings')}`), h('span', null, h('b', null, String(a.record.reviews)), ` ${T('reviews')}`)),
    judged
      ? h('div', null,
        h('div', { class: 'am-verdicts', title: T('verdictsOf') },
          ...(['approved', 'adjusted', 'rejected'] as const).filter((k) => v[k]).map((k) => h('span', { class: k, style: { flexGrow: String(v[k]) } }))),
        h('small', null, `${T('verdictsOf')}: ${(['approved', 'adjusted', 'rejected'] as const).filter((k) => v[k]).map((k) => `${v[k]} ${T(k)}`).join(' · ')}`))
      : (a.record.graded || a.record.reviews ? null : h('small', { class: 'app-muted' }, T('noRecord'))))

  // tempat bekerja
  const plates = [
    ...a.work.grading.map((g) => ({ c: g.courseId, k: T('graderSeat'), stale: g.stale })),
    ...a.work.reviewing.map((r) => ({ c: r.courseId, k: T('reviewerSeat'), stale: r.stale })),
  ]
  const work = h('div', { class: 'am-work' },
    plates.length
      ? h('ul', null, ...plates.map((p) => h('li', { class: p.stale ? 'stale' : '', title: p.stale ? T('staleSeat') : '' }, h('small', null, p.k), findCourse(p.c)?.title ?? p.c)))
      : h('small', { class: 'app-muted' }, T('idle')))

  // aksi: kartu kontrak sewa / tunjuk sebagai popup (permintaan builder 3 Okt, Uji 1: "mending munculin popup card aja")
  const hireBtn = h('button', { type: 'button', class: 'app-btn primary small' }, T('hire')) as HTMLButtonElement
  const apptBtn = h('button', { type: 'button', class: 'app-btn small' }, T('appoint')) as HTMLButtonElement
  hireBtn.addEventListener('click', () => openDeal(lang, o, a, 'hire', member, reload, hireBtn))
  apptBtn.addEventListener('click', () => openDeal(lang, o, a, 'appoint', member, reload, apptBtn))
  hireBtn.disabled = !o.seat.canHire
  apptBtn.disabled = !o.seat.canAppoint

  return h('article', { class: `am-booth lc-enter${a.hireable ? '' : ' blocked'}${mine ? ' mine' : ''}`, style: enter(3 + Math.min(i, 8)) },
    h('div', { class: 'am-stage' },
      robotOf(a, 'am-bot'),
      role ? h('span', { class: 'am-ribbon' }, role) : null,
      a.avatar ? null : h('small', { class: 'am-plain-note' }, T('plainLook'))),
    h('div', { class: 'am-name' },
      h('h3', null, a.name ?? `#${a.agentId}`),
      h('code', null, `#${a.agentId}`),
      h('small', null, `${T('owner')} ${short(a.owner)}`, mine ? h('span', { class: 'am-mine' }, T('mine')) : null)),
    price, brain, record,
    h('div', { class: 'am-where' }, h('small', { class: 'am-label' }, T('worksAt')), work),
    h('div', { class: `am-status ${a.hireable ? 'ok' : 'bad'}` }, h('span', { class: 'am-lamp', 'aria-hidden': 'true' }),
      h('span', null, a.hireable ? T('hireable') : `${T('notHireable')} — ${a.problem ?? ''}`)),
    h('div', { class: 'am-actions' }, hireBtn, apptBtn))
}

/**
 * Kartu kontrak sewa / tunjuk (popup; di ponsel lembar dari bawah): robot + peran + kursus + bayaran + otak + penanda tangan.
 * Kursus yang terhalang aturan tetap terlihat dengan alasannya dan tidak bisa dipilih. Esc / latar / Batal menutup.
 */
function openDeal (lang: Lang, o: PublisherOverview, a: MarketAgent, kind: Kind, member: string | null, reload: () => void, opener: HTMLElement): void {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  document.querySelector('.am-modal-root')?.remove()
  const can = kind === 'hire' ? o.seat.canHire : o.seat.canAppoint
  const rows = o.courses.map((c) => {
    const team = teamOf(o.agents, c.id)
    const why = kind === 'hire' ? hireBlock(a, c.id, team, member, can) : appointBlock(a, c.id, team, member, can)
    const stale = kind === 'hire' ? a.work.grading.find((g) => g.courseId === c.id)?.stale : a.work.reviewing.find((r) => r.courseId === c.id)?.stale
    return { c, why, stale: Boolean(stale) }
  })
  const sel = h('select', { class: 'am-course-sel', 'aria-label': T('course') },
    ...rows.map(({ c, why, stale }) => {
      const reason = why === 'not-hireable' ? (a.problem ?? BLOCK[why][lang]) : why ? BLOCK[why][lang] : stale ? T('rehire') : ''
      const opt = h('option', { value: c.id }, `${c.title}${c.unlisted ? ` (${T('testTag')})` : ''}${reason ? ` — ${reason}` : ''}`) as HTMLOptionElement
      opt.disabled = Boolean(why)
      return opt
    })) as HTMLSelectElement
  const firstOk = rows.find((r) => !r.why)
  if (firstOk) sel.value = firstOk.c.id
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const go = h('button', { type: 'button', class: 'app-btn primary' }, kind === 'hire' ? T('signHire') : T('signAppoint')) as HTMLButtonElement
  const cancel = h('button', { type: 'button', class: 'app-btn' }, T('cancel')) as HTMLButtonElement
  const x = h('button', { type: 'button', class: 'am-x', 'aria-label': T('close') }, '×') as HTMLButtonElement
  go.disabled = !firstOk
  let done = false
  const close = (): void => {
    root.classList.remove('in')
    document.documentElement.classList.remove('am-lock')
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('hashchange', close)
    setTimeout(() => root.remove(), 220)
    if (!done) opener.focus()
  }
  const onKey = (ev: KeyboardEvent): void => { if (ev.key === 'Escape') close() }
  cancel.addEventListener('click', close)
  x.addEventListener('click', close)
  go.addEventListener('click', () => {
    const courseId = sel.value
    if (rows.find((r) => r.c.id === courseId)?.why) return
    go.disabled = true
    sel.disabled = true
    status.className = 'seat-apply-status'
    status.textContent = T('signing')
    const act = kind === 'hire' ? memberHireAgent(courseId, a.agentId) : memberAppointReviewer(courseId, a.agentId, a.wallet ?? '')
    void act.then((r) => {
      if (!r.ok) { go.disabled = false; sel.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      done = true
      status.className = 'seat-apply-status ok'
      status.textContent = kind === 'hire' ? T('doneHire') : T('doneAppoint')
      root.querySelector('.am-modal')?.classList.add('signed')
      memo = null // server membatalkan cache bursa; halaman juga membaca ulang
      setTimeout(() => { close(); reload() }, 1100)
    })
  })

  // isi kontrak: bayaran = tangga tarif agen (label dipilih agen per aktivitas), otak, penanda tangan
  const amounts = a.rateCard.map((r) => BigInt(r.amount))
  const fee = amounts.length
    ? `${formatLdc(amounts[0])}–${formatLdc(amounts[amounts.length - 1])} ${PAY_TOKEN_SYMBOL} ${kind === 'hire' ? T('perGrading') : T('perReview')}`
    : T('noTariff')
  const brain = a.brain ? `${isProvider(a.brain.provider) ? LLM_PROVIDERS[a.brain.provider].label : a.brain.provider} · ${a.brain.model}` : T('noBrainShort')
  const root = h('div', { class: 'am-modal-root', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'am-modal-title' },
    h('div', { class: 'am-backdrop', onClick: close }),
    h('section', { class: 'am-modal' },
      h('header', { class: 'am-modal-head' },
        robotOf(a, 'am-modal-bot'),
        h('div', null,
          h('small', { class: 'am-label' }, kind === 'hire' ? T('dealHire') : T('dealAppoint')),
          h('h3', { id: 'am-modal-title' }, a.name ?? `#${a.agentId}`),
          h('code', null, `#${a.agentId} · ${T('owner')} ${short(a.owner)}`)),
        x),
      h('dl', { class: 'am-deal' },
        h('dt', null, T('course')), h('dd', null, sel),
        h('dt', null, T('fee')), h('dd', null, fee, h('small', null, T('feeNote'))),
        h('dt', null, T('brainLabel')), h('dd', null, brain),
        // Lencana-B142 status=SELESAI 2026-10-04 — kartu penunjukan tidak lagi menulis "tercatat sebagai penyewanya" (teks kartu sewa); temuan uji peramban T68. Buktikan ulang: buka kartu "Tunjuk sebagai pengesah" di bursa. JANGAN dibalik/diulang tanpa membuka kembali baris B142 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        h('dt', null, T('signer')), h('dd', null, h('code', null, short(member)), h('small', null, T(kind === 'hire' ? 'signerNote' : 'signerNoteAppoint')))),
      h('div', { class: 'am-modal-actions' }, cancel, go),
      status,
      h('small', { class: 'app-muted' }, T('serverDecides'))))
  document.body.appendChild(root)
  document.documentElement.classList.add('am-lock')
  window.addEventListener('keydown', onKey)
  window.addEventListener('hashchange', close)
  requestAnimationFrame(() => root.classList.add('in'))
  ;(firstOk ? go : cancel).focus()
}
