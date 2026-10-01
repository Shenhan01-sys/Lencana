/**
 * `flow3d.ts` — bagian "cara Lencana bekerja" di landing (FE8): toggle tiga peran, panggung 3D, dan panel
 * satu-kalimat per stasiun. Menggantikan bagian tiga langkah teks ("Certification Flow").
 *
 * Mesin 3D-nya (`flow3d-scene.ts`, three.js) dimuat LAMBAT saat bagian ini mendekati layar: landing tidak
 * bertambah berat untuk orang yang tidak menggulir sampai sini. Tanpa WebGL, alur yang sama tampil sebagai
 * daftar. Hanya satu mesin hidup pada satu waktu — render ulang landing melepaskan yang lama.
 */
import './flow3d.css'
import { h } from '../lib/ui'
import { getSavedLanguage } from '../i18n'
import { FLOW_COPY, ROLES, findRole, type Lang, type RoleId } from './flow3d-data'
import type { FlowSceneApi } from './flow3d-scene'

let live: FlowSceneApi | null = null
let lastRole: RoleId = 'learner'

const pad = (n: number) => String(n).padStart(2, '0')

export function renderFlow3D (): HTMLElement {
  const lang: Lang = getSavedLanguage() === 'en' ? 'en' : 'id'
  const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches
  let api: FlowSceneApi | null = null
  let role: RoleId = lastRole

  const step = h('span', { class: 'flow3d-step' })
  const name = h('strong', { class: 'flow3d-name' })
  const line = h('p', { class: 'flow3d-line' })
  const prevBtn = h('button', { type: 'button', class: 'flow3d-btn', 'aria-label': FLOW_COPY.prev[lang], disabled: true }, '‹') as HTMLButtonElement
  const playBtn = h('button', { type: 'button', class: 'flow3d-btn', 'aria-label': FLOW_COPY.pause[lang], disabled: true }, '❚❚') as HTMLButtonElement
  const nextBtn = h('button', { type: 'button', class: 'flow3d-btn', 'aria-label': FLOW_COPY.next[lang], disabled: true }, '›') as HTMLButtonElement
  const panel = h('div', { class: 'flow3d-panel', 'aria-live': 'polite' },
    step,
    h('div', null, name, line),
    h('div', { class: 'flow3d-controls' }, prevBtn, playBtn, nextBtn),
    h('span', { class: 'flow3d-hint' }, (coarse ? FLOW_COPY.hintTouch : FLOW_COPY.hint)[lang]),
  )

  const showStep = (roleId: RoleId, i: number, hovered: boolean) => {
    const r = findRole(roleId)
    const st = r.stations[i]
    if (!st) return
    step.textContent = `${pad(i + 1)} / ${pad(r.stations.length)}`
    name.textContent = st.title[lang]
    line.textContent = st.line[lang]
    panel.classList.toggle('hovered', hovered)
  }
  const setPlayState = (playing: boolean) => {
    playBtn.textContent = playing ? '❚❚' : '▶'
    playBtn.setAttribute('aria-label', playing ? FLOW_COPY.pause[lang] : FLOW_COPY.play[lang])
    // Saat berjalan sendiri panel berganti tiap beberapa detik — pembaca layar cukup diberi tahu kalau penggunanya yang melangkah.
    panel.setAttribute('aria-live', playing ? 'off' : 'polite')
  }

  const fallbackList = h('ol', { class: 'flow3d-fallback-list' })
  const renderFallback = () => {
    fallbackList.innerHTML = ''
    findRole(role).stations.forEach((st, i) => fallbackList.appendChild(
      h('li', null, h('b', null, pad(i + 1)), h('div', null, h('strong', null, st.title[lang]), h('p', null, st.line[lang]))),
    ))
  }
  const canvasHost = h('div', { class: 'flow3d-canvas', role: 'img', 'aria-label': `${FLOW_COPY.title[lang]} — ${FLOW_COPY.desc[lang]}` })
  const labelsHost = h('div', { class: 'flow3d-labels' })
  const stage = h('div', { class: 'flow3d-stage' },
    canvasHost,
    labelsHost,
    h('div', { class: 'flow3d-loading' }, FLOW_COPY.loading[lang]),
    h('div', { class: 'flow3d-fallback' }, h('p', { class: 'flow3d-fallback-note' }, FLOW_COPY.noWebgl[lang]), fallbackList),
  )

  const roleButtons = ROLES.map((r) => h('button', {
    type: 'button',
    class: 'flow3d-role',
    'aria-pressed': r.id === role ? 'true' : 'false',
    dataset: { role: r.id },
    onClick: () => selectRole(r.id),
  }, r.name[lang]) as HTMLButtonElement)
  const selectRole = (id: RoleId) => {
    role = id
    lastRole = id
    roleButtons.forEach((b) => b.setAttribute('aria-pressed', b.dataset.role === id ? 'true' : 'false'))
    if (api) api.setRole(id)
    else { showStep(id, 0, false); renderFallback() }
  }

  prevBtn.addEventListener('click', () => api?.prev())
  nextBtn.addEventListener('click', () => api?.next())
  playBtn.addEventListener('click', () => { if (!api) return; if (api.isPlaying()) api.pause(); else api.play() })

  const section = h('section', { class: 'flow3d-section', id: 'how-it-works', 'aria-labelledby': 'flow3d-title' },
    h('div', { class: 'flow3d-head' },
      h('span', { class: 'flow3d-eyebrow' }, FLOW_COPY.eyebrow[lang]),
      h('h2', { class: 'flow3d-title', id: 'flow3d-title' }, FLOW_COPY.title[lang]),
      h('p', { class: 'flow3d-desc' }, FLOW_COPY.desc[lang]),
      h('div', { class: 'flow3d-roles', role: 'group', 'aria-label': FLOW_COPY.seats[lang] }, ...roleButtons),
    ),
    stage,
    panel,
  )
  showStep(role, 0, false)
  renderFallback()
  setPlayState(!reduceMotion)

  // Tanpa WebGL daftar menggantikan panggung: panel langkah + tombolnya tidak berguna, jadi ikut disembunyikan.
  const fail = () => { stage.classList.add('failed'); section.classList.add('is-flat') }
  const start = async () => {
    try {
      const mod = await import('./flow3d-scene')
      if (!section.isConnected) return
      await document.fonts?.ready
      live?.dispose()
      api = mod.createFlowScene({
        stage,
        canvasHost,
        labelsHost,
        lang,
        fontFamily: getComputedStyle(section).fontFamily || 'system-ui, sans-serif',
        reduceMotion: Boolean(reduceMotion),
        coarsePointer: Boolean(coarse),
        onStep: showStep,
        onPlayState: setPlayState,
        onReady: () => stage.classList.add('ready'),
      })
      live = api
      if (role !== 'learner') api.setRole(role)
      prevBtn.disabled = playBtn.disabled = nextBtn.disabled = false
    } catch (err) {
      console.warn('flow3d: 3D scene unavailable, showing the list', err)
      fail()
    }
  }
  if (typeof IntersectionObserver === 'undefined') {
    void start()
  } else {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return
      io.disconnect()
      void start()
    }, { rootMargin: '320px 0px' })
    io.observe(section)
  }
  return section
}
