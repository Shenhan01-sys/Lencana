/**
 * `review-desk.ts` — meja pengesahan agen pengesah di dasbor Agent Owner (B144).
 *
 * Benda di meja (doktrin FE builder: wakili, jangan deskripsikan):
 *   tumpukan map    esai berusulan dari kursus tempat penerbit menunjuk agen ini; satu map = satu esai
 *   dua penggaris   usulan penilai (agen #id · model) dan — bila otaknya terpasang — pendapat otak pengesah sendiri, kriteria
 *                   sejajar, selisih tiap kriteria ditulis di sampingnya
 *   tiga cap        Setujui (angka usulan dipakai) · Sesuaikan (angka pengesah per kriteria) · Tolak (tidak ada angka yang sah)
 *   tangga label    tingkat berat yang dipilih pengesah menentukan bayarannya (D53/D54)
 * Teks esai dibaca karena agen ini yang menandatangani nilai akhirnya; alamat peserta tidak pernah sampai ke halaman ini.
 * Pendapat otak hanya bahan pertimbangan: yang dikirim adalah keputusan pemilik, ditandatangani dompet agennya.
 */
import './agent-brain.css'
import './review-desk.css'
import { h } from '../lib/ui'
import { findCourse } from '../courses/index'
import { isProvider, judgeEssayWith } from '../llm'
import { readReviewQueue, submitAgentReview, type OwnerAgent, type OwnerOverview, type ReviewDecision, type ReviewDesk, type ReviewItem } from '../learning'
import { formatLdc, PAY_TOKEN_SYMBOL } from '../pricing'
import { keyField, readKey } from './agent-brain'

type Lang = 'en' | 'id'

const COPY = {
  kicker: { en: 'Reviewer agent', id: 'Agen pengesah' },
  title: { en: 'Review desk', id: 'Meja pengesahan' },
  intro: {
    en: 'Essays from courses where a publisher appointed this agent as reviewer. A proposed score counts only after you approve or adjust it here; rejecting leaves the essay without a valid score.',
    id: 'Esai dari kursus tempat penerbit menunjuk agen ini sebagai pengesah. Nilai usulan baru dihitung sesudah kamu menyetujui atau menyesuaikannya di sini; menolak berarti esai itu tidak punya nilai yang sah.',
  },
  readBy: { en: 'Read by the reviewer agent’s wallet — the address that signs its decisions. Learner addresses are never shown.', id: 'Dibaca dompet agen pengesah — alamat yang menandatangani keputusannya. Alamat peserta tidak pernah ditampilkan.' },
  notOwnWallet: {
    en: 'The desk is read by the agent wallet, and this agent’s wallet is not your account’s. Verify the agent wallet with your account first — the publisher then appoints it again.',
    id: 'Meja dibaca dompet agen, dan dompet agen ini bukan dompet akunmu. Verifikasi dompet agen dengan akunmu dulu — lalu penerbit menunjuknya ulang.',
  },
  allStale: { en: 'Every appointment was made with another wallet — the publisher must appoint this agent again.', id: 'Semua penunjukan dibuat dengan dompet lain — penerbit harus menunjuk agen ini ulang.' },
  stale: { en: 'appointed with another wallet — the publisher must appoint again', id: 'ditunjuk dengan dompet lain — penerbit harus menunjuk ulang' },
  open: { en: 'Open the desk', id: 'Buka meja' },
  refresh: { en: 'Refresh', id: 'Muat ulang' },
  working: { en: 'Working…', id: 'Memproses…' },
  waitingN: { en: 'essays waiting for review', id: 'esai menunggu pengesahan' },
  empty: { en: 'Nothing to review — every proposal in your courses is settled.', id: 'Tidak ada yang perlu disahkan — semua usulan di kursusmu sudah diputuskan.' },
  attempt: { en: 'attempt', id: 'usaha' },
  words: { en: 'words', id: 'kata' },
  judged: { en: 'proposed', id: 'diusulkan' },
  inspect: { en: 'Review', id: 'Periksa' },
  task: { en: 'Task and what is not accepted', id: 'Tugas dan yang tidak diterima' },
  mech: { en: 'Mechanical checks', id: 'Tanda mekanis' },
  proposal: { en: 'Proposal', id: 'Usulan' },
  agentN: { en: 'agent', id: 'agen' },
  model: { en: 'model', id: 'model' },
  total: { en: 'Total', id: 'Total' },
  pass: { en: 'pass', id: 'lulus' },
  fail: { en: 'fail', id: 'tidak lulus' },
  opinion: { en: 'Second opinion', id: 'Pendapat kedua' },
  askBrain: { en: 'Ask', id: 'Tanya' },
  opinionNote: { en: 'Your brain grades the same essay on the same rubric and prompt. It is only advice — the decision you sign is yours.', id: 'Otakmu menilai esai yang sama dengan rubrik dan prompt yang sama. Ini hanya bahan pertimbangan — keputusan yang kamu tandatangani tetap milikmu.' },
  needKey: { en: 'Enter the API key for this brain’s provider to ask it.', id: 'Isi API key provider otak ini untuk bertanya.' },
  noBrain: { en: 'No calibrated brain on this agent — install one above to get a second opinion. Reviewing works without it.', id: 'Agen ini belum punya otak yang terkalibrasi — pasang di atas untuk pendapat kedua. Mengesahkan tetap bisa tanpanya.' },
  diff: { en: 'difference', id: 'selisih' },
  decide: { en: 'Decision', id: 'Keputusan' },
  approve: { en: 'Approve', id: 'Setujui' },
  approveNote: { en: 'the proposed score counts', id: 'angka usulan dipakai' },
  adjust: { en: 'Adjust', id: 'Sesuaikan' },
  adjustNote: { en: 'your score per criterion counts', id: 'angkamu per kriteria dipakai' },
  reject: { en: 'Reject', id: 'Tolak' },
  rejectNote: { en: 'no valid score; the essay gate stays closed', id: 'tidak ada angka yang sah; gerbang esai tetap tertutup' },
  fromBrain: { en: 'Fill from the second opinion', id: 'Isi dari pendapat kedua' },
  yours: { en: 'Your score', id: 'Angkamu' },
  pickLabel: { en: 'Difficulty label (sets your fee)', id: 'Label tingkat berat (menentukan bayaranmu)' },
  sign: { en: 'Sign & send decision', id: 'Tandatangani & kirim keputusan' },
  signNote: { en: 'Signed by the agent wallet: attempt, decision, final score and label. The publisher pays the fee for this review.', id: 'Ditandatangani dompet agen: usaha, keputusan, angka akhir, dan label. Penerbit membayar bayaran pengesahan ini.' },
  approved: { en: 'Approved', id: 'Disetujui' },
  adjusted: { en: 'Adjusted', id: 'Disesuaikan' },
  rejected: { en: 'Rejected', id: 'Ditolak' },
  feeDue: { en: 'fee due', id: 'bayaran jatuh tempo' },
} satisfies Record<string, Record<Lang, string>>

const fmtDate = (lang: Lang, iso: string | null): string => (iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' }) : '—')
const fmtNum = (x: number): string => (Number.isInteger(x) ? String(x) : x.toFixed(2).replace(/\.?0+$/, ''))

/** Penggaris rubrik: lebar segmen = bobot kriteria, isi = angkanya; garis hijau di nilai lulus (bentuk yang sama dengan antrean B135). */
function ruler (rubric: { label: string, max: number }[], points: Record<string, number | null>, passMark: number, cls = ''): HTMLElement {
  const max = rubric.reduce((s, c) => s + c.max, 0)
  return h('div', { class: `ab-ruler ${cls}`.trim(), style: { '--pass': `${(passMark / max) * 100}%` } },
    ...rubric.map((c, k) => {
      const v = points[c.label]
      return h('span', { class: 'ab-seg', style: { flexGrow: String(c.max), '--f': `${v === null || v === undefined ? 0 : (v / c.max) * 100}%`, '--k': String(k) }, title: `${c.label}: ${v ?? '—'}/${c.max}` }, h('i', null))
    }))
}

/** Panel meja di kartu agen: hanya untuk agen yang ditunjuk sebagai pengesah. */
export function reviewDesk (lang: Lang, o: OwnerOverview, a: OwnerAgent): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const box = h('section', { class: 'ab rv lc-enter' },
    h('div', { class: 'ab-head' }, h('span', { class: 'app-kicker' }, `${T('kicker')} #${a.agentId}`), h('h2', null, T('title')), h('p', { class: 'app-muted' }, T('intro'))),
    h('small', { class: 'ab-muted' }, T('readBy')))
  if (a.walletState !== 'owner') { box.appendChild(h('p', { class: 'ab-warn' }, T('notOwnWallet'))); return box }
  if (!a.appointments.some((x) => !x.stale)) { box.appendChild(h('p', { class: 'ab-warn' }, T('allStale'))); return box }
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const tray = h('div', { class: 'ab-tray rv-tray' })
  const open = h('button', { type: 'button', class: 'app-btn primary small' }, T('open')) as HTMLButtonElement
  const load = () => {
    open.disabled = true
    status.className = 'seat-apply-status'
    status.textContent = T('working')
    void readReviewQueue(a.agentId).then((r) => {
      open.disabled = false
      if (!r.ok || !r.data) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      status.textContent = ''
      open.textContent = T('refresh')
      tray.replaceChildren(trayOf(lang, o, a, r.data))
    })
  }
  open.addEventListener('click', load)
  box.append(h('div', { class: 'seat-apply-row' }, open, status), tray)
  return box
}

function trayOf (lang: Lang, o: OwnerOverview, a: OwnerAgent, d: ReviewDesk): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  return h('div', null,
    h('div', { class: 'ab-tray-head' },
      h('span', { class: 'ab-stack', style: { '--n': String(Math.min(d.items.length, 8)) }, 'aria-hidden': 'true' }),
      h('strong', null, `${d.items.length} ${T('waitingN')}`),
      ...d.staleCourses.map((c) => h('small', { class: 'ab-warn' }, `${findCourse(c)?.title ?? c}: ${T('stale')}`))),
    d.items.length ? h('ul', { class: 'ab-papers' }, ...d.items.map((it, i) => folder(lang, o, a, d, it, i))) : h('p', { class: 'ab-muted' }, T('empty')))
}

/** Satu map esai: ringkasan usulan di sampulnya, dibuka → meja periksa. */
function folder (lang: Lang, o: OwnerOverview, a: OwnerAgent, d: ReviewDesk, it: ReviewItem, i: number): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const max = it.essay.rubric.reduce((s, c) => s + c.max, 0)
  const by = it.proposal.gradedByAgent ? `${T('agentN')} #${it.proposal.gradedByAgent}` : null
  const desk = h('div', { class: 'ab-desk rv-desk', hidden: true })
  const btn = h('button', { type: 'button', class: 'app-btn small' }, T('inspect')) as HTMLButtonElement
  const li = h('li', { class: 'ab-paper rv-folder lc-enter', style: { '--i': String(i) } },
    h('div', { class: 'ab-paper-top' },
      h('strong', null, findCourse(it.course)?.title ?? it.course),
      h('small', null, `${it.lesson} · ${T('attempt')} ${it.attemptNo ?? '—'} · ${it.words} ${T('words')} · ${T('judged')} ${fmtDate(lang, it.judgedAt)}`),
      btn),
    h('div', { class: 'rv-cover' },
      h('b', { class: 'rv-cover-score' }, `${fmtNum(it.proposal.total)}/${max}`),
      h('span', null, [by, it.proposal.judgeModel, it.proposal.label?.replace(/-/g, ' ')].filter(Boolean).join(' · '))),
    desk)
  btn.addEventListener('click', () => {
    btn.hidden = true
    desk.hidden = false
    desk.replaceChildren(inspect(lang, o, a, d, it, () => li.classList.add('done')))
  })
  return li
}

/** Meja periksa satu esai: teks, usulan, pendapat kedua (opsional), tiga cap, tangga label, tanda tangan. */
function inspect (lang: Lang, o: OwnerOverview, a: OwnerAgent, d: ReviewDesk, it: ReviewItem, onDone: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const rubric = it.essay.rubric
  const max = rubric.reduce((s, c) => s + c.max, 0)
  const proposed: Record<string, number | null> = Object.fromEntries(it.proposal.criteria.map((c) => [c.label, c.points]))
  let opinion: Record<string, number> | null = null

  // --- usulan + (opsional) pendapat kedua, kriteria sejajar
  const crit = h('ol', { class: 'ab-crit rv-crit' })
  const drawCrit = () => crit.replaceChildren(...rubric.map((c) => {
    const p = proposed[c.label]
    const q = opinion?.[c.label]
    const delta = opinion && p !== null && p !== undefined && q !== undefined ? q - p : null
    return h('li', null, h('span', null, c.label),
      h('b', null, `${p ?? '—'}/${c.max}`),
      opinion ? h('em', { class: `rv-delta${delta === 0 ? ' same' : ''}`, title: T('diff') }, `${q ?? '—'}${delta === null || delta === 0 ? '' : ` (${delta > 0 ? '+' : ''}${fmtNum(delta)})`}`) : null)
  }))
  drawCrit()
  const passed = it.proposal.total >= it.passMark
  const opinionSlot = h('div', { class: 'rv-opinion' })
  const brain = d.brain
  const provider = brain && brain.passed && brain.byCurrentOwner !== false && isProvider(brain.provider) ? brain.provider : null
  if (!brain || !provider) {
    opinionSlot.appendChild(h('small', { class: 'ab-muted' }, T('noBrain')))
  } else {
    const keys = keyField(lang, provider, () => {})
    const keyWrap = h('div', { class: 'ab-queue-key', hidden: Boolean(readKey(provider).key) }, h('small', { class: 'ab-muted' }, T('needKey')), keys.el)
    const ask = h('button', { type: 'button', class: 'app-btn small' }, `${T('askBrain')} ${brain.modelName}`) as HTMLButtonElement
    const out = h('div', { class: 'rv-opinion-out' })
    ask.addEventListener('click', () => {
      const key = keys.value() || readKey(provider).key
      if (!key) { keyWrap.hidden = false; return }
      ask.disabled = true
      out.replaceChildren(h('p', { class: 'ab-muted' }, T('working')))
      void judgeEssayWith(provider, key, brain.model, it.essay, it.text).then((r) => {
        opinion = r.scores
        drawCrit()
        fillBtn.hidden = false
        const ok = r.total >= it.passMark
        out.replaceChildren(
          h('span', { class: 'ab-label' }, `${T('opinion')} · ${brain.modelName}${r.temperature === null ? ' · temperature —' : ' · temperature 0'}`),
          ruler(rubric, r.scores, it.passMark, 'rv-ruler-2'),
          h('div', { class: 'ab-total' }, h('b', { class: ok ? 'ok' : 'bad' }, `${T('total')} ${fmtNum(r.total)}/${max}`), h('small', null, `${ok ? T('pass') : T('fail')} (≥ ${it.passMark})`)))
      }).catch((e: unknown) => {
        ask.disabled = false
        out.replaceChildren(h('p', { class: 'seat-apply-status bad' }, e instanceof Error ? e.message : String(e)))
      })
    })
    opinionSlot.append(h('div', { class: 'rv-opinion-head' }, ask, h('small', { class: 'ab-muted' }, T('opinionNote'))), keyWrap, out)
  }

  // --- keputusan: tiga cap
  let decision: ReviewDecision | null = null
  let label = ''
  const mine: Record<string, number> = Object.fromEntries(rubric.map((c) => [c.label, Number(proposed[c.label] ?? 0)]))
  const mineTotal = h('b', null)
  const drawMineTotal = () => {
    const t = rubric.reduce((s, c) => s + Math.max(0, Math.min(c.max, Math.round(Number(mine[c.label])))), 0)
    mineTotal.textContent = `${T('total')} ${fmtNum(t)}/${max} · ${t >= it.passMark ? T('pass') : T('fail')}`
    mineTotal.className = t >= it.passMark ? 'ok' : 'bad'
  }
  const inputs = rubric.map((c) => {
    const inp = h('input', { type: 'number', min: '0', max: String(c.max), step: '1', inputmode: 'numeric', class: 'ab-input rv-num', 'aria-label': c.label }) as HTMLInputElement
    inp.value = String(mine[c.label])
    inp.addEventListener('input', () => { mine[c.label] = Number(inp.value); drawMineTotal(); refresh() })
    return { c, inp }
  })
  const fillBtn = h('button', { type: 'button', class: 'ab-link', hidden: true }, T('fromBrain')) as HTMLButtonElement
  fillBtn.addEventListener('click', () => {
    if (!opinion) return
    for (const { c, inp } of inputs) { mine[c.label] = Math.round(Number(opinion[c.label] ?? 0)); inp.value = String(mine[c.label]) }
    drawMineTotal()
    refresh()
  })
  const editor = h('div', { class: 'rv-adjust', hidden: true },
    h('span', { class: 'ab-label' }, T('yours')),
    h('ol', { class: 'rv-adjust-list' }, ...inputs.map(({ c, inp }) => h('li', null, h('span', null, c.label), h('label', { class: 'rv-num-wrap' }, inp, h('small', null, `/ ${c.max}`))))),
    h('div', { class: 'ab-total' }, mineTotal, fillBtn))
  drawMineTotal()
  const stamps = h('div', { class: 'rv-stamps', role: 'radiogroup', 'aria-label': T('decide') },
    ...(['approved', 'adjusted', 'rejected'] as const).map((k) => {
      const [name, note] = k === 'approved' ? [T('approve'), T('approveNote')] : k === 'adjusted' ? [T('adjust'), T('adjustNote')] : [T('reject'), T('rejectNote')]
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', class: `rv-stamp s-${k}` }, h('strong', null, name), h('small', null, note)) as HTMLButtonElement
      b.addEventListener('click', () => {
        decision = k
        stamps.querySelectorAll('.rv-stamp').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false') })
        b.classList.add('on')
        b.setAttribute('aria-checked', 'true')
        editor.hidden = k !== 'adjusted'
        refresh()
      })
      return b
    }))

  // --- tangga label + tanda tangan
  const sign = h('button', { type: 'button', class: 'app-btn primary' }, T('sign')) as HTMLButtonElement
  sign.disabled = true
  const validAdjust = () => inputs.every(({ c }) => Number.isFinite(Number(mine[c.label])) && Number(mine[c.label]) >= 0 && Number(mine[c.label]) <= c.max)
  const refresh = () => { sign.disabled = !decision || !label || (decision === 'adjusted' && !validAdjust()) }
  const ladder = h('div', { class: 'ab-ladder', role: 'radiogroup', 'aria-label': T('pickLabel') },
    ...o.ladder.labels.map((l, k) => {
      const price = a.rateCard.find((x) => x.label === l)?.amount
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', class: 'ab-rung', style: { '--k': String(k) } },
        h('span', null, l.replace(/-/g, ' ')), price ? h('small', null, formatLdc(BigInt(price))) : null) as HTMLButtonElement
      b.addEventListener('click', () => {
        label = l
        ladder.querySelectorAll('.ab-rung').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false') })
        b.classList.add('on')
        b.setAttribute('aria-checked', 'true')
        refresh()
      })
      return b
    }))
  const result = h('div', { class: 'ab-stamp-slot', role: 'status' })
  sign.addEventListener('click', () => {
    if (!decision || !label) return
    sign.disabled = true
    result.replaceChildren(h('p', { class: 'ab-muted' }, T('working')))
    const chosen = decision
    void submitAgentReview(it, chosen, label, chosen === 'adjusted' ? mine : undefined).then((x) => {
      if (!x.ok) { refresh(); result.replaceChildren(h('p', { class: 'seat-apply-status bad' }, x.why ?? '')); return }
      onDone()
      fillBtn.hidden = true
      for (const el of [...stamps.querySelectorAll('button'), ...ladder.querySelectorAll('button'), ...inputs.map((y) => y.inp)]) (el as HTMLButtonElement | HTMLInputElement).disabled = true
      const word = chosen === 'approved' ? T('approved') : chosen === 'adjusted' ? T('adjusted') : T('rejected')
      result.replaceChildren(h('div', { class: `ab-stamp rv-done s-${chosen}` },
        h('strong', null, x.finalScore === null || x.finalScore === undefined ? word : `${word} · ${fmtNum(x.finalScore)} · ${x.verdict === 'pass' ? T('pass') : T('fail')}`),
        x.charge ? h('small', null, `${formatLdc(BigInt(x.charge.amount))} ${PAY_TOKEN_SYMBOL} ${T('feeDue')}`) : null))
    })
  })

  return h('div', { class: 'ab-judged rv-inspect' },
    h('div', { class: 'ab-paper-text', tabindex: '0' }, it.text),
    h('details', { class: 'ab-task' }, h('summary', null, T('task')), h('p', null, it.essay.prompt), h('ul', null, ...it.essay.guidance.map((g) => h('li', null, g)))),
    it.proposal.mechanical.length
      ? h('div', { class: 'rv-mech' }, h('span', { class: 'ab-label' }, T('mech')), ...it.proposal.mechanical.map((m) => h('span', { class: `rv-mech-tag${m.passed ? ' ok' : ''}` }, m.check)))
      : null,
    h('div', { class: 'ab-score' },
      h('span', { class: 'ab-label' }, `${T('proposal')} · ${[it.proposal.gradedByAgent ? `${T('agentN')} #${it.proposal.gradedByAgent}` : null, it.proposal.judgeModel ? `${T('model')} ${it.proposal.judgeModel}` : null].filter(Boolean).join(' · ')}`),
      ruler(rubric, proposed, it.passMark),
      h('div', { class: 'ab-total' }, h('b', { class: passed ? 'ok' : 'bad' }, `${T('total')} ${fmtNum(it.proposal.total)}/${max}`), h('small', null, `${passed ? T('pass') : T('fail')} (≥ ${it.passMark})`)),
      crit),
    opinionSlot,
    h('span', { class: 'ab-label' }, T('decide')),
    stamps,
    editor,
    h('span', { class: 'ab-label' }, T('pickLabel')),
    ladder,
    h('div', { class: 'ab-installbox' }, sign, h('small', { class: 'ab-muted' }, T('signNote'))),
    result)
}
