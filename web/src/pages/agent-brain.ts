/**
 * `agent-brain.ts` — otak agen di dasbor Agent Owner (B135, D69): pemilik memasang "kartrid" LLM ke robot penilainya.
 *
 * Benda di panggung (doktrin FE builder: wakili, jangan deskripsikan):
 *   rak kartrid     tujuh provider; kartrid terpilih naik, soket otak menyala hijau bila otaknya tercatat di server
 *   gantungan kunci API key — hanya di peramban ini (sesi, atau perangkat bila diingat); tidak pernah ke server Lencana
 *   pita model      daftar model dari endpoint provider (+ cari + ID manual; GLM: daftar cadangan)
 *   bangku uji      skala 0..100 dengan garis lulus; dua kertas uji meluncur ke angkanya — kosong harus berhenti di zona
 *                   merah, substantif di zona hijau (kontrol yang sama dengan `npm run judge`)
 *   baki antrean    esai yang menunggu dari kursus yang menyewa agen; "Nilai" → model mengisi penggaris rubrik (lebar
 *                   segmen = bobot kriteria, isi = angkanya), pemilik memilih anak tangga label, lalu cap tanda tangan
 * Angka per kriteria tidak bisa diubah pemilik: yang dikirim adalah jawaban model apa adanya, atas nama model itu.
 */
// Lencana-B135 status=TERBUKA 2026-10-03 — panel otak agen: rak tujuh provider, API key hanya di peramban (sesi/perangkat), daftar model dari endpoint provider, bangku uji kalibrasi, pasang otak bertanda tangan, antrean esai dompet agen dengan usulan model + label + tanda tangan. Buktikan ulang: cd signer && npm run verify:brain, lalu uji peramban T63. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './agent-brain.css'
import { h } from '../lib/ui'
import { steps } from '../lib/loading'
import { findCourse } from '../courses/index'
import { LLM_PROVIDERS, PROVIDER_IDS, isProvider, listModels, judgeEssayWith, type ProviderId, type ModelInfo } from '../llm'
import { runCalibration, calibrationSetup, CALIBRATION_COURSE, type CalibrationResult } from '../calibration'
import { saveAgentBrain, readAgentQueue, submitAgentJudgement, type OwnerAgent, type OwnerOverview, type QueueItem, type AgentBrainInfo } from '../learning'
import { formatLdc, PAY_TOKEN_SYMBOL } from '../pricing'

type Lang = 'en' | 'id'

const COPY = {
  kicker: { en: 'Agent brain', id: 'Otak agen' },
  title: { en: 'Grading brain', id: 'Otak penilai' },
  none: { en: 'no brain yet', id: 'belum ada otak' },
  installed: { en: 'installed', id: 'terpasang' },
  oldOwner: { en: 'recorded by a previous owner — install again', id: 'dicatat pemilik sebelumnya — pasang ulang' },
  intro: {
    en: 'Pick a provider, bring your own API key, choose a model and pass the calibration test. The agent then proposes rubric scores for essays from courses that hire it; you pick the difficulty label and sign.',
    id: 'Pilih provider, pakai API key milikmu, pilih model, lalu lulus uji kalibrasi. Sesudah itu agen mengusulkan nilai rubrik untuk esai dari kursus yang menyewanya; kamu memilih label tingkat berat dan menandatangani.',
  },
  rack: { en: 'Provider', id: 'Provider' },
  socket: { en: 'Brain socket', id: 'Soket otak' },
  key: { en: 'API key', id: 'API key' },
  keyNote: { en: 'Stays in this browser only — never sent to Lencana’s server. Calls go straight from this page to the provider.', id: 'Hanya di peramban ini — tidak pernah dikirim ke server Lencana. Panggilan langsung dari halaman ini ke provider.' },
  remember: { en: 'Remember on this device', id: 'Ingat di perangkat ini' },
  rememberNote: { en: 'Personal devices only: anyone using this browser profile can read it.', id: 'Hanya di perangkat pribadi: siapa pun yang memakai profil peramban ini bisa membacanya.' },
  forget: { en: 'Forget key', id: 'Lupakan kunci' },
  getKey: { en: 'Get a key ↗', id: 'Ambil kunci ↗' },
  model: { en: 'Model', id: 'Model' },
  fetchModels: { en: 'Fetch models', id: 'Ambil daftar model' },
  fromEndpoint: { en: 'models from the provider’s list', id: 'model dari daftar provider' },
  fallbackList: { en: 'this provider’s model list could not be read — known IDs below, or type one', id: 'daftar model provider ini tidak terbaca — ID yang dikenal di bawah, atau ketik sendiri' },
  search: { en: 'Search models', id: 'Cari model' },
  manual: { en: 'Model ID', id: 'ID model' },
  calTitle: { en: 'Calibration bench', id: 'Bangku uji kalibrasi' },
  calNote: {
    en: 'Two test essays on the rubric of “{course}”: the substantive one must pass, the fluent-but-empty one must fail — the same negative control as the publisher’s judge.',
    id: 'Dua esai uji dengan rubrik “{course}”: yang substantif harus lulus, yang fasih-tapi-kosong harus gagal — kontrol negatif yang sama dengan penilai penerbit.',
  },
  notRun: { en: 'not run yet', id: 'belum diuji' },
  calibrate: { en: 'Run calibration', id: 'Jalankan uji kalibrasi' },
  c1: { en: 'Grading the substantive essay', id: 'Menilai esai substantif' },
  c2: { en: 'Grading the fluent-but-empty essay', id: 'Menilai esai fasih-tapi-kosong' },
  calPass: { en: 'Calibration passed', id: 'Kalibrasi lulus' },
  calFail: { en: 'Calibration failed — this model cannot be installed', id: 'Kalibrasi gagal — model ini tidak bisa dipasang' },
  hollowTag: { en: 'empty', id: 'kosong' },
  subTag: { en: 'substantive', id: 'substantif' },
  passLine: { en: 'pass', id: 'lulus' },
  tempNone: { en: 'this model refused temperature 0 — it ran without it, and the judgement records that', id: 'model ini menolak temperature 0 — dijalankan tanpa itu, dan penilaiannya mencatat begitu' },
  install: { en: 'Sign & install brain', id: 'Tandatangani & pasang otak' },
  installNote: {
    en: 'You sign the provider, the model and the two calibration scores. The server checks the rule and that you own the agent; it cannot replay the model call — the scores are your signed report.',
    id: 'Kamu menandatangani provider, model, dan dua angka kalibrasi. Server memeriksa aturannya dan bahwa agen ini milikmu; ia tidak bisa mengulang panggilan modelnya — angka itu laporanmu yang bertanda tangan.',
  },
  installedOk: { en: 'Brain installed.', id: 'Otak terpasang.' },
  change: { en: 'Change brain', id: 'Ganti otak' },
  cancel: { en: 'Cancel', id: 'Batal' },
  queue: { en: 'Essay queue', id: 'Antrean esai' },
  openQueue: { en: 'Open the queue', id: 'Buka antrean' },
  queueNote: { en: 'Read by the agent wallet — the address that signs the judgements.', id: 'Dibaca dompet agen — alamat yang menandatangani penilaiannya.' },
  queueWallet: {
    en: 'The queue is read by the agent wallet, and this agent’s wallet is not your account’s. Verify the agent wallet with your account first.',
    id: 'Antrean dibaca dompet agen, dan dompet agen ini bukan dompet akunmu. Verifikasi dompet agen dengan akunmu dulu.',
  },
  noHires: { en: 'No course hires this agent yet — the queue stays empty until a publisher hires it.', id: 'Belum ada kursus yang menyewa agen ini — antrean kosong sampai penerbit menyewanya.' },
  emptyQueue: { en: 'No essays waiting.', id: 'Tidak ada esai yang menunggu.' },
  waitingN: { en: 'essays waiting', id: 'esai menunggu' },
  stale: { en: 'hired with another wallet — the publisher must hire again', id: 'disewa dengan dompet lain — penerbit harus menyewa ulang' },
  words: { en: 'words', id: 'kata' },
  since: { en: 'waiting since', id: 'menunggu sejak' },
  attempt: { en: 'attempt', id: 'usaha' },
  grade: { en: 'Grade with', id: 'Nilai dengan' },
  needKey: { en: 'Enter the API key for this brain’s provider to grade.', id: 'Isi API key provider otak ini untuk menilai.' },
  task: { en: 'Task and what is not accepted', id: 'Tugas dan yang tidak diterima' },
  proposed: { en: 'Proposed by', id: 'Usulan' },
  total: { en: 'Total', id: 'Total' },
  pass: { en: 'pass', id: 'lulus' },
  fail: { en: 'fail', id: 'tidak lulus' },
  pickLabel: { en: 'Difficulty label (sets the fee)', id: 'Label tingkat berat (menentukan bayaran)' },
  sign: { en: 'Sign & send judgement', id: 'Tandatangani & kirim penilaian' },
  signNote: { en: 'Scores are the model’s, as returned. The reviewer the publisher appointed — a person or another agent — still approves them before they count.', id: 'Angka adalah jawaban model apa adanya. Pengesah yang ditunjuk penerbit — orang atau agen lain — tetap menyetujuinya sebelum dihitung.' },
  sent: { en: 'Sent', id: 'Terkirim' },
  feeDue: { en: 'fee due', id: 'bayaran jatuh tempo' },
  close: { en: 'Close', id: 'Tutup' },
  working: { en: 'Working…', id: 'Memproses…' },
  pickModel: { en: 'Pick or type a model first.', id: 'Pilih atau ketik model dulu.' },
} satisfies Record<string, Record<Lang, string>>

/* ------------------------------------------------------------------ kunci: hanya di peramban ini */
const KEY_PREFIX = 'lencana.llm-key.'
function readKey (p: ProviderId): { key: string, remembered: boolean } {
  try { const s = sessionStorage.getItem(KEY_PREFIX + p); if (s) return { key: s, remembered: false } } catch { /* penyimpanan ditolak */ }
  try { const l = localStorage.getItem(KEY_PREFIX + p); if (l) return { key: l, remembered: true } } catch { /* penyimpanan ditolak */ }
  return { key: '', remembered: false }
}
function writeKey (p: ProviderId, key: string, remember: boolean): void {
  try { if (key) sessionStorage.setItem(KEY_PREFIX + p, key); else sessionStorage.removeItem(KEY_PREFIX + p) } catch { /* penyimpanan ditolak */ }
  try { if (key && remember) localStorage.setItem(KEY_PREFIX + p, key); else localStorage.removeItem(KEY_PREFIX + p) } catch { /* penyimpanan ditolak */ }
}

/** Gantungan kunci untuk satu provider: input sandi + "ingat" + lupakan + tautan ambil kunci. */
function keyField (lang: Lang, start: ProviderId, onChange: () => void): { el: HTMLElement, value: () => string, setProvider: (p: ProviderId) => void } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  let p = start
  const input = h('input', { type: 'password', class: 'ab-input', autocomplete: 'off', spellcheck: 'false', 'aria-label': T('key') }) as HTMLInputElement
  const remember = h('input', { type: 'checkbox' }) as HTMLInputElement
  const link = h('a', { class: 'ab-getkey', target: '_blank', rel: 'noopener noreferrer' }, T('getKey')) as HTMLAnchorElement
  const providerNote = h('small', { class: 'ab-warn' })
  const load = () => {
    const k = readKey(p)
    input.value = k.key
    remember.checked = k.remembered
    input.placeholder = LLM_PROVIDERS[p].keyHint
    link.href = LLM_PROVIDERS[p].keyUrl
    providerNote.textContent = LLM_PROVIDERS[p].note?.[lang] ?? ''
    providerNote.hidden = !LLM_PROVIDERS[p].note
  }
  input.addEventListener('input', () => { writeKey(p, input.value.trim(), remember.checked); onChange() })
  remember.addEventListener('change', () => writeKey(p, input.value.trim(), remember.checked))
  const forget = h('button', { type: 'button', class: 'ab-link' }, T('forget')) as HTMLButtonElement
  forget.addEventListener('click', () => { input.value = ''; remember.checked = false; writeKey(p, '', false); onChange() })
  load()
  const el = h('div', { class: 'ab-keyring' },
    h('span', { class: 'ab-keytag', 'aria-hidden': 'true' }),
    h('div', { class: 'ab-keybody' },
      h('label', { class: 'ab-field' }, h('span', { class: 'ab-label' }, T('key')), input),
      h('div', { class: 'ab-keyrow' }, h('label', { class: 'ab-check', title: T('rememberNote') }, remember, h('span', null, T('remember'))), forget, link),
      h('small', { class: 'ab-keynote' }, T('keyNote')),
      providerNote))
  return { el, value: () => input.value.trim(), setProvider: (x) => { p = x; load() } }
}

/* ------------------------------------------------------------------ SVG */
function svgEl (markup: string, cls: string, viewBox: string, label: string): SVGSVGElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" class="${cls}" role="img" aria-label="${escapeXml(label)}">${markup}</svg>`
  return wrap.firstElementChild as SVGSVGElement
}
function escapeXml (s: string): string {
  return s.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch] ?? ch)
}

/** Bangku uji: skala 0..max, zona merah/hijau dipisah garis lulus, dua kertas uji di angkanya (posisi = angka). */
function gaugeSvg (lang: Lang, passMark: number, max: number, r: { substantive: number, hollow: number } | null): string {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const X0 = 36
  const W = 524
  const x = (v: number) => X0 + (W * Math.max(0, Math.min(max, v))) / max
  const px = x(passMark)
  // Label kertas di dekat ujung skala ditambatkan ke dalam supaya tidak terpotong tepi gambar (huruf membesar di ponsel).
  const anchor = (v: number) => (x(v) > 470 ? 'text-anchor="end" x="10"' : x(v) < 130 ? 'text-anchor="start" x="-10"' : 'text-anchor="middle" x="0"')
  let s = `<rect x="${X0}" y="64" width="${px - X0}" height="12" rx="6" fill="rgba(255,107,127,0.32)"/>`
    + `<rect x="${px}" y="64" width="${X0 + W - px}" height="12" rx="6" fill="rgba(55,214,122,0.32)"/>`
  for (let v = 0; v <= max; v += 10) s += `<line x1="${x(v)}" y1="79" x2="${x(v)}" y2="${v % 50 === 0 ? 87 : 83}" stroke="#5b6370"/>`
  s += `<text x="${X0 - 8}" y="74" text-anchor="end" font-size="11" fill="#848e9c">0</text><text x="${X0 + W + 8}" y="74" font-size="11" fill="#848e9c">${max}</text>`
  s += `<line x1="${px}" y1="50" x2="${px}" y2="92" stroke="#f0b90b" stroke-width="2" stroke-dasharray="4 3"/>`
    + `<text x="${px + 6}" y="59" font-size="10.5" font-weight="700" fill="#f0b90b">${escapeXml(T('passLine'))} ≥ ${passMark}</text>`
  const paper = (y: number) => `<path d="M-9 ${y}h13l5 5v17h-18z" fill="#f4f1ea" stroke="#c9c3b6"/><path d="M4 ${y}v5h5" fill="none" stroke="#c9c3b6"/>`
  if (r) {
    const hollowOk = r.hollow < passMark
    const subOk = r.substantive >= passMark && r.substantive > r.hollow
    // Posisi akhir lewat --x (CSS transform), gerak masuk dari 0: kertas "meluncur" ke angkanya.
    s += `<g class="ab-pin" style="--x:${x(r.hollow) - X0}px"><g transform="translate(${X0} 0)">`
      + `<text y="14" ${anchor(r.hollow)} font-size="11.5" font-weight="700" fill="${hollowOk ? '#37d67a' : '#ff6b7f'}">${escapeXml(T('hollowTag'))} · ${r.hollow}</text>`
      + `${paper(19)}<line x1="0" y1="42" x2="0" y2="63" stroke="#c9c3b6" stroke-width="1.5"/></g></g>`
    s += `<g class="ab-pin late" style="--x:${x(r.substantive) - X0}px"><g transform="translate(${X0} 0)">`
      + `<line x1="0" y1="77" x2="0" y2="100" stroke="#c9c3b6" stroke-width="1.5"/>${paper(100)}`
      + `<text y="136" ${anchor(r.substantive)} font-size="11.5" font-weight="700" fill="${subOk ? '#37d67a' : '#ff6b7f'}">${escapeXml(T('subTag'))} · ${r.substantive}</text></g></g>`
  } else {
    s += `<text x="${X0 + W / 2}" y="120" text-anchor="middle" font-size="12" fill="#848e9c">${escapeXml(T('notRun'))}</text>`
  }
  return s
}

/* ------------------------------------------------------------------ panel */
export function agentBrain (lang: Lang, o: OwnerOverview, a: OwnerAgent, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const current: AgentBrainInfo | null = a.brain && a.brain.byCurrentOwner !== false && a.brain.passed ? a.brain : null
  const { essay: calEssay, passMark: calPass } = calibrationSetup()
  const calMax = calEssay.rubric.reduce((s, r) => s + r.max, 0)

  let sel: ProviderId = current && isProvider(current.provider) ? current.provider : 'groq'
  let model = current?.model ?? ''
  let cal: { result: CalibrationResult, temperature: 0 | null, provider: ProviderId, model: string } | null = null
  let busy = false

  // ---- soket + rak kartrid
  const socket = h('div', { class: `ab-socket ${current ? 'on' : a.brain ? 'old' : ''}` },
    h('span', { class: 'ab-led', 'aria-hidden': 'true' }),
    h('div', null,
      h('span', { class: 'ab-label' }, T('socket')),
      h('strong', null, current ? current.modelName : T('none')),
      a.brain && !current ? h('small', { class: 'ab-warn' }, T('oldOwner')) : null,
      current ? h('small', null, `${T('installed')} · ${new Date(current.at).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' })} · ${T('subTag')} ${current.calibration.substantive} / ${T('hollowTag')} ${current.calibration.hollow}`) : null))
  const chips = PROVIDER_IDS.map((id) => {
    const b = h('button', { type: 'button', class: `ab-chip ${id === sel ? 'on' : ''} ${current?.provider === id ? 'live' : ''}`, 'aria-pressed': id === sel ? 'true' : 'false', dataset: { p: id } },
      h('span', { class: 'ab-chip-name' }, LLM_PROVIDERS[id].label),
      h('span', { class: 'ab-chip-pins', 'aria-hidden': 'true' })) as HTMLButtonElement
    b.addEventListener('click', () => { if (!busy) choose(id) })
    return b
  })
  const rack = h('div', { class: 'ab-rack', role: 'group', 'aria-label': T('rack') }, ...chips)

  // ---- kunci, model, kalibrasi
  const keys = keyField(lang, sel, () => refresh())
  const modelNote = h('small', { class: 'ab-muted' })
  const search = h('input', { type: 'search', class: 'ab-input', placeholder: T('search'), 'aria-label': T('search'), hidden: true }) as HTMLInputElement
  const list = h('div', { class: 'ab-models', role: 'listbox', 'aria-label': T('model'), hidden: true })
  const manual = h('input', { type: 'text', class: 'ab-input mono', placeholder: T('manual'), 'aria-label': T('manual'), spellcheck: 'false', autocomplete: 'off' }) as HTMLInputElement
  manual.value = model
  let models: ModelInfo[] = []
  const drawModels = () => {
    const q = search.value.trim().toLowerCase()
    const shown = models.filter((m) => !q || m.id.toLowerCase().includes(q) || (m.label ?? '').toLowerCase().includes(q)).slice(0, 300)
    list.replaceChildren(...shown.map((m) => {
      const b = h('button', { type: 'button', role: 'option', class: `ab-model ${m.id === model ? 'on' : ''}`, 'aria-selected': m.id === model ? 'true' : 'false' },
        h('code', null, m.id), m.label ? h('small', null, m.label) : null, m.context ? h('small', null, `${Math.round(m.context / 1000)}k`) : null) as HTMLButtonElement
      b.addEventListener('click', () => { model = m.id; manual.value = m.id; cal = null; drawModels(); refresh() })
      return b
    }))
  }
  search.addEventListener('input', drawModels)
  manual.addEventListener('input', () => { model = manual.value.trim(); cal = null; drawModels(); refresh() })
  const fetchBtn = h('button', { type: 'button', class: 'app-btn small' }, T('fetchModels')) as HTMLButtonElement
  fetchBtn.addEventListener('click', () => {
    busy = true
    refresh()
    modelNote.className = 'ab-muted'
    modelNote.textContent = T('working')
    void listModels(sel, keys.value() || null).then((r) => {
      models = r.models
      modelNote.textContent = r.source === 'fallback' ? T('fallbackList') : `${r.models.length} ${T('fromEndpoint')}`
      search.hidden = list.hidden = false
      drawModels()
    }).catch((e: unknown) => {
      modelNote.className = 'ab-muted bad'
      modelNote.textContent = e instanceof Error ? e.message : String(e)
    }).finally(() => { busy = false; refresh() })
  })

  const course = findCourse(CALIBRATION_COURSE)
  const gauge = h('div', { class: 'ab-gauge' })
  const drawGauge = (r: { substantive: number, hollow: number } | null) => gauge.replaceChildren(svgEl(gaugeSvg(lang, calPass, calMax, r), 'ab-gauge-svg', '0 0 600 142', T('calTitle')))
  drawGauge(null) // bangku di formulir = uji BARU; hasil otak yang terpasang tampil di bangku statis di atasnya
  const calSteps = steps([T('c1'), T('c2')])
  calSteps.hidden = true
  const verdict = h('div', { class: 'ab-verdict', role: 'status' })
  const calBtn = h('button', { type: 'button', class: 'app-btn' }, T('calibrate')) as HTMLButtonElement
  const installBtn = h('button', { type: 'button', class: 'app-btn primary' }, T('install')) as HTMLButtonElement
  const installStatus = h('p', { class: 'seat-apply-status', role: 'status' })
  calBtn.addEventListener('click', () => {
    const key = keys.value()
    if (!model) { verdict.className = 'ab-verdict bad'; verdict.textContent = T('pickModel'); return }
    busy = true
    cal = null
    refresh()
    calSteps.hidden = false
    calSteps.set(0)
    verdict.className = 'ab-verdict'
    verdict.textContent = T('working')
    drawGauge(null)
    let temperature: 0 | null = 0
    let n = 0
    const p = sel
    const m = model
    void runCalibration(async (essay, text) => {
      calSteps.set(n++)
      const r = await judgeEssayWith(p, key, m, essay, text)
      if (r.temperature === null) temperature = null
      return r.total
    }).then((result) => {
      calSteps.set(2)
      cal = { result, temperature, provider: p, model: m }
      drawGauge(result)
      verdict.className = `ab-verdict ${result.pass ? 'ok' : 'bad'}`
      verdict.replaceChildren(h('strong', null, result.pass ? T('calPass') : T('calFail')),
        ...result.reasons.map((x) => h('small', null, x)),
        ...(temperature === null ? [h('small', { class: 'ab-warn' }, T('tempNone'))] : []))
    }).catch((e: unknown) => {
      calSteps.hidden = true
      verdict.className = 'ab-verdict bad'
      verdict.textContent = e instanceof Error ? e.message : String(e)
    }).finally(() => { busy = false; refresh() })
  })
  installBtn.addEventListener('click', () => {
    if (!cal?.result.pass) return
    busy = true
    refresh()
    installStatus.className = 'seat-apply-status'
    installStatus.textContent = T('working')
    void saveAgentBrain(a.agentId, cal.provider, cal.model, { substantive: cal.result.substantive, hollow: cal.result.hollow, temperature: cal.temperature }).then((r) => {
      busy = false
      if (!r.ok) {
        installStatus.className = 'seat-apply-status bad'
        installStatus.textContent = [r.why, ...(r.reasons ?? [])].filter(Boolean).join(' · ')
        refresh()
        return
      }
      installStatus.className = 'seat-apply-status ok'
      installStatus.textContent = T('installedOk')
      setTimeout(reload, 1200)
    })
  })

  const choose = (id: ProviderId) => {
    sel = id
    models = []
    model = current?.provider === id ? current.model : ''
    manual.value = model
    cal = null
    search.value = ''
    search.hidden = list.hidden = true
    modelNote.textContent = ''
    keys.setProvider(id)
    chips.forEach((c) => { const on = c.dataset.p === id; c.classList.toggle('on', on); c.setAttribute('aria-pressed', on ? 'true' : 'false') })
    drawGauge(null)
    verdict.textContent = ''
    calSteps.hidden = true
    refresh()
  }
  function refresh (): void {
    const hasKey = Boolean(keys.value())
    fetchBtn.disabled = busy || (!hasKey && !LLM_PROVIDERS[sel].modelsPublic)
    calBtn.disabled = busy || !hasKey || !model
    installBtn.disabled = busy || !(cal?.result.pass && cal.provider === sel && cal.model === model)
    chips.forEach((c) => { c.disabled = busy })
  }

  const calNote = T('calNote').replace('{course}', course?.title ?? CALIBRATION_COURSE)
  const config = h('div', { class: 'ab-config', hidden: Boolean(current) },
    h('div', { class: 'ab-step' }, h('span', { class: 'ab-num' }, '1'), h('div', null, h('span', { class: 'ab-label' }, T('rack')), rack)),
    h('div', { class: 'ab-step' }, h('span', { class: 'ab-num' }, '2'), keys.el),
    h('div', { class: 'ab-step' }, h('span', { class: 'ab-num' }, '3'),
      h('div', { class: 'ab-modelbox' },
        h('div', { class: 'ab-modelhead' }, h('span', { class: 'ab-label' }, T('model')), fetchBtn),
        modelNote, search, list, manual)),
    h('div', { class: 'ab-step' }, h('span', { class: 'ab-num' }, '4'),
      h('div', { class: 'ab-bench' },
        h('div', { class: 'ab-modelhead' }, h('span', { class: 'ab-label' }, T('calTitle')), calBtn),
        h('small', { class: 'ab-muted' }, calNote), gauge, calSteps, verdict)),
    h('div', { class: 'ab-step' }, h('span', { class: 'ab-num' }, '5'),
      h('div', { class: 'ab-installbox' }, installBtn, h('small', { class: 'ab-muted' }, T('installNote')), installStatus)))
  const changeBtn = current ? h('button', { type: 'button', class: 'app-btn small' }, T('change')) as HTMLButtonElement : null
  changeBtn?.addEventListener('click', () => {
    const open = config.hidden
    config.hidden = !open
    changeBtn.textContent = open ? T('cancel') : T('change')
  })
  refresh()

  const head = h('header', { class: 'ab-head' },
    h('span', { class: 'app-kicker' }, `${T('kicker')} · #${a.agentId}`),
    h('h2', null, T('title')),
    h('span', { class: `ab-pill ${current ? 'ok' : 'wait'}` }, current ? `${T('installed')} · ${current.modelName}` : a.brain ? T('oldOwner') : T('none')),
    h('p', { class: 'app-muted' }, T('intro')))
  return h('section', { class: 'ab lc-enter' },
    head,
    h('div', { class: 'ab-top' }, socket, changeBtn),
    current ? h('div', { class: 'ab-gauge static' }, (() => { const g = h('div', null); g.appendChild(svgEl(gaugeSvg(lang, calPass, calMax, current.calibration), 'ab-gauge-svg', '0 0 600 142', T('calTitle'))); return g })()) : null,
    config,
    current ? queuePanel(lang, o, a, current) : null)
}

/* ------------------------------------------------------------------ baki antrean */
function queuePanel (lang: Lang, o: OwnerOverview, a: OwnerAgent, brain: AgentBrainInfo): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const box = h('div', { class: 'ab-queue' }, h('div', { class: 'ab-modelhead' }, h('h3', null, T('queue')), h('small', { class: 'ab-muted' }, T('queueNote'))))
  if (a.walletState !== 'owner') { box.appendChild(h('p', { class: 'ab-muted' }, T('queueWallet'))); return box }
  if (!a.hires.length) { box.appendChild(h('p', { class: 'ab-muted' }, T('noHires'))); return box }
  const provider = isProvider(brain.provider) ? brain.provider : null
  if (!provider) return box
  const keys = keyField(lang, provider, () => {})
  const keyWrap = h('div', { class: 'ab-queue-key', hidden: Boolean(readKey(provider).key) }, h('small', { class: 'ab-muted' }, T('needKey')), keys.el)
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const tray = h('div', { class: 'ab-tray' })
  const open = h('button', { type: 'button', class: 'app-btn primary small' }, T('openQueue')) as HTMLButtonElement
  open.addEventListener('click', () => {
    open.disabled = true
    status.className = 'seat-apply-status'
    status.textContent = T('working')
    void readAgentQueue(a.agentId).then((r) => {
      open.disabled = false
      if (!r.ok || !r.data) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      status.textContent = ''
      const q = r.data
      tray.replaceChildren(
        h('div', { class: 'ab-tray-head' },
          h('span', { class: 'ab-stack', style: { '--n': String(Math.min(q.items.length, 8)) }, 'aria-hidden': 'true' }),
          h('strong', null, `${q.items.length} ${T('waitingN')}`),
          ...q.staleCourses.map((c) => h('small', { class: 'ab-warn' }, `${findCourse(c)?.title ?? c}: ${T('stale')}`))),
        q.items.length ? h('ul', { class: 'ab-papers' }, ...q.items.map((it, i) => paper(lang, o, a, brain, provider, it, i, keys))) : h('p', { class: 'ab-muted' }, T('emptyQueue')))
    })
  })
  box.append(keyWrap, h('div', { class: 'seat-apply-row' }, open, status), tray)
  return box
}

/** Satu kertas esai di baki: buka → model mengisi penggaris rubrik → pilih anak tangga label → cap tanda tangan. */
function paper (lang: Lang, o: OwnerOverview, a: OwnerAgent, brain: AgentBrainInfo, provider: ProviderId, it: QueueItem, i: number, keys: { value: () => string }): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const when = it.awaitingSince ? new Date(it.awaitingSince).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' }) : '—'
  const desk = h('div', { class: 'ab-desk', hidden: true })
  const gradeBtn = h('button', { type: 'button', class: 'app-btn small' }, `${T('grade')} ${brain.modelName}`) as HTMLButtonElement
  const li = h('li', { class: 'ab-paper lc-enter', style: { '--i': String(i) } },
    h('div', { class: 'ab-paper-top' },
      h('strong', null, findCourse(it.course)?.title ?? it.course),
      h('small', null, `${it.lesson} · ${T('attempt')} ${it.attemptNo ?? '—'} · ${it.words} ${T('words')} · ${T('since')} ${when}`),
      gradeBtn),
    desk)
  gradeBtn.addEventListener('click', () => {
    const key = keys.value() || readKey(provider).key
    if (!key) { desk.hidden = false; desk.replaceChildren(h('p', { class: 'ab-warn' }, T('needKey'))); return }
    gradeBtn.disabled = true
    desk.hidden = false
    desk.replaceChildren(h('p', { class: 'ab-muted' }, T('working')))
    void judgeEssayWith(provider, key, brain.model, it.essay, it.text).then((r) => {
      desk.replaceChildren(judged(lang, o, a, brain, it, r, () => { gradeBtn.hidden = true }))
    }).catch((e: unknown) => {
      gradeBtn.disabled = false
      desk.replaceChildren(h('p', { class: 'seat-apply-status bad' }, e instanceof Error ? e.message : String(e)))
    })
  })
  return li
}

function judged (lang: Lang, o: OwnerOverview, a: OwnerAgent, brain: AgentBrainInfo, it: QueueItem, r: { scores: Record<string, number>, total: number, temperature: 0 | null }, onSent: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const max = it.essay.rubric.reduce((s, x) => s + x.max, 0)
  const passed = r.total >= it.passMark
  // Penggaris rubrik: lebar segmen = bobot kriteria, isi = angka model; garis lulus di posisi nilai lulus.
  const ruler = h('div', { class: 'ab-ruler', style: { '--pass': `${(it.passMark / max) * 100}%` } },
    ...it.essay.rubric.map((c, k) => h('span', { class: 'ab-seg', style: { flexGrow: String(c.max), '--f': `${(r.scores[c.label] / c.max) * 100}%`, '--k': String(k) }, title: `${c.label}: ${r.scores[c.label]}/${c.max}` }, h('i', null))))
  const legend = h('ol', { class: 'ab-crit' }, ...it.essay.rubric.map((c) => h('li', null, h('span', null, c.label), h('b', null, `${r.scores[c.label]}/${c.max}`))))
  let label = ''
  const sign = h('button', { type: 'button', class: 'app-btn primary' }, T('sign')) as HTMLButtonElement
  sign.disabled = true
  const steps7 = h('div', { class: 'ab-ladder', role: 'radiogroup', 'aria-label': T('pickLabel') },
    ...o.ladder.labels.map((l, k) => {
      const price = a.rateCard.find((x) => x.label === l)?.amount
      const b = h('button', { type: 'button', role: 'radio', 'aria-checked': 'false', class: 'ab-rung', style: { '--k': String(k) } },
        h('span', null, l.replace(/-/g, ' ')), price ? h('small', null, formatLdc(BigInt(price))) : null) as HTMLButtonElement
      b.addEventListener('click', () => {
        label = l
        steps7.querySelectorAll('.ab-rung').forEach((x) => { x.classList.remove('on'); x.setAttribute('aria-checked', 'false') })
        b.classList.add('on')
        b.setAttribute('aria-checked', 'true')
        sign.disabled = false
      })
      return b
    }))
  const status = h('div', { class: 'ab-stamp-slot', role: 'status' })
  sign.addEventListener('click', () => {
    if (!label) return
    sign.disabled = true
    status.replaceChildren(h('p', { class: 'ab-muted' }, T('working')))
    void submitAgentJudgement(a.agentId, it, r.scores, label, brain.modelName, r.temperature).then((x) => {
      if (!x.ok) { sign.disabled = false; status.replaceChildren(h('p', { class: 'seat-apply-status bad' }, x.why ?? '')); return }
      onSent()
      steps7.querySelectorAll('button').forEach((b) => { (b as HTMLButtonElement).disabled = true })
      status.replaceChildren(h('div', { class: 'ab-stamp' },
        h('strong', null, `${T('sent')} · ${x.score} · ${x.verdict === 'pass' ? T('pass') : T('fail')}`),
        x.charge ? h('small', null, `${formatLdc(BigInt(x.charge.amount))} ${PAY_TOKEN_SYMBOL} ${T('feeDue')}`) : null))
    })
  })
  return h('div', { class: 'ab-judged' },
    h('div', { class: 'ab-paper-text', tabindex: '0' }, it.text),
    h('details', { class: 'ab-task' }, h('summary', null, T('task')), h('p', null, it.essay.prompt), h('ul', null, ...it.essay.guidance.map((g) => h('li', null, g)))),
    h('div', { class: 'ab-score' },
      h('span', { class: 'ab-label' }, `${T('proposed')} ${brain.modelName}${r.temperature === null ? ' · temperature —' : ' · temperature 0'}`),
      ruler,
      h('div', { class: 'ab-total' }, h('b', { class: passed ? 'ok' : 'bad' }, `${T('total')} ${r.total}/${max}`), h('small', null, `${passed ? T('pass') : T('fail')} (≥ ${it.passMark})`)),
      legend),
    h('span', { class: 'ab-label' }, T('pickLabel')),
    steps7,
    h('div', { class: 'ab-installbox' }, sign, h('small', { class: 'ab-muted' }, T('signNote'))),
    status)
}
