/**
 * `flow3d-scene.ts` — mesin alur bisnis 3D (FE8). Dimuat LAMBAT oleh `flow3d.ts` saat bagiannya masuk layar,
 * jadi three.js tidak ikut bundel awal landing.
 *
 * Bentuknya mengikuti tingkat polish referensi builder (`References/3D businessFlow.txt`, Agentic Factory 3D):
 * satu pelat mesin, stasiun prosedural di atasnya, satu benda berjalan di rel dari stasiun ke stasiun. Isinya
 * alur Lencana sendiri (`flow3d-data.ts`) — satu pelat per peran. Tanpa model, tanpa gambar.
 */
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { ROLES, findRole, type Kit, type Lang, type Role, type RoleId } from './flow3d-data'
import { MANIFESTS, rubricHashOf } from '../manifest'

export type FlowSceneOptions = {
  stage: HTMLElement
  canvasHost: HTMLElement
  labelsHost: HTMLElement
  lang: Lang
  fontFamily: string
  reduceMotion: boolean
  coarsePointer: boolean
  onStep: (role: RoleId, index: number, hovered: boolean) => void
  onPlayState: (playing: boolean) => void
  onReady: () => void
}

export type FlowSceneApi = {
  setRole: (id: RoleId) => void
  goTo: (index: number) => void
  next: () => void
  prev: () => void
  play: () => void
  pause: () => void
  isPlaying: () => boolean
  dispose: () => void
}

type Tone = 'gold' | 'green' | 'red'
type KitRuntime = {
  /** `since` = detik sejak benda tiba di stasiun ini (Infinity kalau belum), `active` = benda sedang di sini. */
  update: (since: number, active: boolean, time: number) => void
  tone: Tone
}

const C = {
  gold: 0xf0b90b, neon: 0xffe14d, steel: 0x2b3139, steelDark: 0x14181d, edge: 0x6b737e, chrome: 0xc3cad0,
  ivory: 0xe8e2cf, paper: 0xf4f1ea, green: 0x37d67a, red: 0xff4d4f, ink: 0x0c0f13,
}
const TRAVEL = 1.5
const DWELL = 2.6
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const easeInOut = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2)
const easeOut = (x: number) => 1 - Math.pow(1 - x, 3)
const easeOutBack = (x: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
/** 0 → 1 → 0 dalam jendela [start, start + dur]. */
const pulse = (since: number, start: number, dur: number) => { const x = (since - start) / dur; return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) }
const ramp = (since: number, start: number, dur: number) => clamp01((since - start) / dur)

/** Papan stasiun "Susun kursus" memakai kursus pertama: bobot, ambang, dan rubricHash-nya dibaca dari manifest
 *  publik (modul yang sama dengan halaman #/publishers), jadi papan ini tidak bisa basi terhadap aturannya. */
const POLICY = MANIFESTS[0]
const POLICY_HASH = rubricHashOf(POLICY)

export function createFlowScene (o: FlowSceneOptions): FlowSceneApi {
  const cleanups: Array<() => void> = []
  const disposables = new Set<{ dispose: () => void }>()
  const track = <T extends { dispose: () => void }>(x: T): T => { disposables.add(x); return x }

  // ------------------------------------------------------------------ renderer, kamera, cahaya
  const W = () => Math.max(1, o.stage.clientWidth)
  const H = () => Math.max(1, o.stage.clientHeight)
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  renderer.setClearColor(0x000000, 0)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W() < 900 ? 1.5 : 1.75))
  renderer.setSize(W(), H())
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.08
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  o.canvasHost.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(34, W() / H(), 0.1, 120)
  const target = new THREE.Vector3(0, 0.3, 0.2)
  /** Bingkai dihitung dari rasio panggung, bukan dipilih dari dua posisi tetap: tepi depan pelat (yang
   *  paling lebar di layar) selalu muat. Di ponsel kamera lebih curam supaya kedalaman pelat mengisi tinggi. */
  const frame = () => {
    const aspect = W() / H()
    const compact = W() < 700
    camera.fov = compact ? 38 : 34
    camera.aspect = aspect
    camera.updateProjectionMatrix()
    const polar = compact ? 0.72 : 1.02
    const tanHalfW = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * aspect
    const dist = Math.max(15.7, 7.6 / tanHalfW + 4.2 * Math.sin(polar))
    camera.position.set(target.x, target.y + dist * Math.cos(polar), target.z + dist * Math.sin(polar))
  }
  frame()

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.target.copy(target)
  controls.enableDamping = true
  controls.dampingFactor = 0.07
  controls.enablePan = false
  controls.enableZoom = false
  controls.rotateSpeed = 0.5
  controls.minPolarAngle = 0.5
  controls.maxPolarAngle = 1.22
  controls.minAzimuthAngle = -0.7
  controls.maxAzimuthAngle = 0.7
  // Di layar sentuh jari harus menggulir halaman, bukan memutar mesin. Mematikan rotasi saja tidak cukup:
  // OrbitControls memasang touch-action: none di canvas, jadi gesekan di atas panggung tidak menggulir.
  // Lepaskan pendengarnya (ini juga memulihkan touch-action); ketukan tetap lewat pendengar kita sendiri.
  if (o.coarsePointer) controls.disconnect()
  controls.update()

  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const env = track(pmrem.fromScene(room, 0.04))
  scene.environment = env.texture
  scene.environmentIntensity = 0.55
  room.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xdbe5f4, 0x2a2318, 1.8))
  const key = new THREE.DirectionalLight(0xfff1d8, 3.8)
  key.position.set(-5, 12, 8)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -10, right: 10, top: 8, bottom: -8, near: 0.5, far: 40 })
  key.shadow.normalBias = 0.035
  scene.add(key)
  const rim = new THREE.DirectionalLight(0xc4d4ed, 2.6)
  rim.position.set(4, 7, -9)
  scene.add(rim)
  const warm = new THREE.PointLight(C.gold, 22, 22, 2)
  warm.position.set(-5, 5, 4)
  scene.add(warm)

  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(80, 80)), track(new THREE.ShadowMaterial({ opacity: 0.22 })))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.45
  floor.receiveShadow = true
  scene.add(floor)

  // ------------------------------------------------------------------ bahan dan primitif
  const mat = (color: number, metalness = 0.2, roughness = 0.45, extra: THREE.MeshStandardMaterialParameters = {}) =>
    track(new THREE.MeshStandardMaterial({ color, metalness, roughness, ...extra }))
  const M = {
    base: mat(0x20252c, 0.85, 0.32),
    body: mat(C.steel, 0.75, 0.3),
    edge: mat(C.edge, 0.85, 0.24),
    chrome: mat(C.chrome, 0.92, 0.18),
    dark: mat(C.steelDark, 0.45, 0.4),
    gold: mat(C.gold, 0.65, 0.26),
    paper: mat(C.paper, 0, 0.85),
    ivory: mat(C.ivory, 0.35, 0.35),
    glass: mat(0x9fb0bb, 0.4, 0.1, { transparent: true, opacity: 0.22, depthWrite: false }),
    rail: mat(C.gold, 0.4, 0.3, { emissive: C.gold, emissiveIntensity: 0.35 }),
  }
  /** Bahan menyala milik satu benda — dikloning supaya tiap stasiun bisa berdenyut sendiri. */
  const glow = (color: number, intensity = 0.25, base = color) => mat(base, 0.3, 0.35, { emissive: color, emissiveIntensity: intensity })
  const setGlow = (m: THREE.Material, v: number) => { (m as THREE.MeshStandardMaterial).emissiveIntensity = v }

  const geos = new Map<string, THREE.BufferGeometry>()
  const geo = (k: string, make: () => THREE.BufferGeometry) => { if (!geos.has(k)) geos.set(k, track(make())); return geos.get(k)! }
  const mesh = (parent: THREE.Object3D, g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, shadow = true) => {
    const o3 = new THREE.Mesh(g, m)
    o3.position.set(x, y, z)
    o3.castShadow = shadow
    o3.receiveShadow = shadow
    parent.add(o3)
    return o3
  }
  const box = (p: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, m: THREE.Material = M.body, r = 0.03) =>
    mesh(p, geo(`b${w},${h},${d},${r}`, () => (r ? new RoundedBoxGeometry(w, h, d, 2, Math.min(r, w / 3, h / 3, d / 3)) : new THREE.BoxGeometry(w, h, d))), m, x, y, z)
  const cyl = (p: THREE.Object3D, r: number, h: number, x: number, y: number, z: number, m: THREE.Material = M.chrome, r2 = r, seg = 28) =>
    mesh(p, geo(`c${r},${r2},${h},${seg}`, () => new THREE.CylinderGeometry(r, r2, h, seg)), m, x, y, z)
  const ball = (p: THREE.Object3D, r: number, x: number, y: number, z: number, m: THREE.Material = M.chrome) =>
    mesh(p, geo(`s${r}`, () => new THREE.SphereGeometry(r, 18, 12)), m, x, y, z, false)
  const ring = (p: THREE.Object3D, r: number, t: number, x: number, y: number, z: number, m: THREE.Material, arc = Math.PI * 2) =>
    mesh(p, geo(`t${r},${t},${arc}`, () => new THREE.TorusGeometry(r, t, 12, 48, arc)), m, x, y, z, false)

  type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  const canvasTex = (w: number, h: number, draw: Draw) => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')!
    draw(ctx, w, h)
    const t = track(new THREE.CanvasTexture(c))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
    return t
  }
  const print = (ctx: CanvasRenderingContext2D, txt: string, x: number, y: number, size = 20, color = '#f4f1ea', weight = 600, align: CanvasTextAlign = 'left') => {
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.font = `${weight} ${size}px ${o.fontFamily}`
    ctx.fillText(txt, x, y)
  }
  const plane = (p: THREE.Object3D, w: number, h: number, x: number, y: number, z: number, map: THREE.Texture) => {
    const m = track(new THREE.MeshBasicMaterial({ map, toneMapped: false, transparent: true }))
    return mesh(p, geo(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h)), m, x, y, z, false)
  }
  const T = (en: string, id: string) => (o.lang === 'en' ? en : id)

  /** Kartu LENCANA mini (sama dengan kartu di hero) — dipakai stasiun Terbit dan Cabut. */
  const cardTexture = (state: 'ok' | 'revoked') => canvasTex(512, 320, (c, w, h) => {
    c.fillStyle = '#0d1014'
    c.fillRect(0, 0, w, h)
    c.strokeStyle = state === 'ok' ? '#f0b90b' : '#ff4d4f'
    c.lineWidth = 10
    c.strokeRect(14, 14, w - 28, h - 28)
    print(c, 'VERIFIABLE LEARNING CREDENTIAL', 44, 70, 20, '#8b919a', 600)
    print(c, 'LENCANA', 40, 200, 104, state === 'ok' ? '#f0b90b' : '#ff6b6b', 900)
    print(c, state === 'ok' ? 'SOULBOUND · BAS · OB 3.0' : T('REVOKED BY ITS ISSUER', 'DICABUT PENERBITNYA'), 44, 262, 22, state === 'ok' ? '#d9d8cd' : '#ff8f8f', 700)
  })

  // ------------------------------------------------------------------ kit stasiun
  type Ctx = { g: THREE.Group }
  const kits: Record<Kit, (k: Ctx) => KitRuntime> = {
    terminal: ({ g }) => {
      box(g, 0.22, 0.62, 0.22, 0, 0.31, -0.28)
      const s = new THREE.Group()
      s.position.set(0, 0.84, -0.24)
      s.rotation.x = -0.32
      g.add(s)
      box(s, 1.08, 0.72, 0.07, 0, 0, 0, M.dark, 0.05)
      plane(s, 0.98, 0.64, 0, 0, 0.041, canvasTex(512, 336, (c, w, h) => {
        c.fillStyle = '#0c0f13'; c.fillRect(0, 0, w, h)
        print(c, 'LENCANA', 34, 70, 44, '#f0b90b', 900)
        c.strokeStyle = '#3a414b'; c.lineWidth = 3; c.strokeRect(34, 110, w - 68, 64)
        print(c, T('you@email.com', 'kamu@email.com'), 54, 152, 26, '#9aa2ad', 500)
        c.fillStyle = '#f0b90b'; c.fillRect(34, 200, w - 68, 62)
        print(c, T('SEND CODE', 'KIRIM KODE'), w / 2, 242, 28, '#0c0f13', 800, 'center')
        print(c, T('6-digit code → embedded wallet', 'kode 6 digit → dompet tertanam'), 34, 306, 20, '#8b919a', 500)
      }))
      const cardM = glow(C.gold, 0.3)
      const card = box(g, 0.52, 0.05, 0.32, 0, 0.06, 0.42, cardM, 0.03)
      return {
        tone: 'gold',
        update: (since, active) => {
          const p = active ? easeOutBack(ramp(since, 0.15, 0.6)) : 0
          card.position.y = 0.06 + p * 0.5
          card.rotation.x = -p * 0.9
          setGlow(cardM, active ? 0.4 + 1.1 * ramp(since, 0.2, 0.5) : 0.25)
        },
      }
    },
    pages: ({ g }) => {
      const slabs = [0, 1, 2, 3, 4].map((i) => {
        const m = mat(C.ivory, 0.15, 0.55, { emissive: C.gold, emissiveIntensity: 0 })
        return { m, o: box(g, 0.98, 0.05, 0.66, (i - 2) * 0.035, 0.07 + i * 0.13, (2 - i) * 0.03, m, 0.02) }
      })
      return {
        tone: 'gold',
        update: (since, active) => slabs.forEach((s, i) => setGlow(s.m, active ? 1.2 * ramp(since, 0.2 + i * 0.28, 0.25) : 0.04)),
      }
    },
    press: ({ g }) => {
      for (const x of [-0.56, 0.56]) box(g, 0.12, 1.32, 0.14, x, 0.66, 0, M.chrome)
      box(g, 1.32, 0.16, 0.3, 0, 1.34, 0, M.body)
      box(g, 0.92, 0.12, 0.72, 0, 0.06, 0)
      const sheetM = mat(C.paper, 0, 0.8, { emissive: C.green, emissiveIntensity: 0 })
      box(g, 0.72, 0.02, 0.5, 0, 0.13, 0, sheetM, 0)
      const piston = cyl(g, 0.12, 0.5, 0, 1.0, 0)
      const headM = glow(C.gold, 0.2)
      const head = box(g, 0.6, 0.08, 0.46, 0, 0.74, 0, headM)
      return {
        tone: 'gold',
        update: (since, active) => {
          const p = active ? pulse(since, 0.2, 0.9) : 0
          head.position.y = 0.74 - p * 0.55
          piston.position.y = 1.0 - p * 0.55
          setGlow(headM, 0.2 + p * 1.4)
          setGlow(sheetM, active ? 0.8 * ramp(since, 0.75, 0.3) : 0)
        },
      }
    },
    tray: ({ g }) => {
      box(g, 1.12, 0.06, 0.82, 0, 0.03, 0.08, M.body)
      const walls: [number, number, number, number][] = [[1.12, 0.05, 0, 0.49], [1.12, 0.05, 0, -0.33], [0.05, 0.82, 0.54, 0.08], [0.05, 0.82, -0.54, 0.08]]
      for (const [w, d, x, z] of walls) box(g, w, 0.18, d, x, 0.12, z, M.edge, 0.01)
      for (const i of [0, 1]) box(g, 0.52, 0.03, 0.34, 0, 0.08 + i * 0.05, -0.62, M.paper, 0.01)
      const env = box(g, 0.52, 0.035, 0.34, 0, 1.2, 0.08, M.paper, 0.01)
      const aiM = glow(C.neon, 0.1, C.steelDark)
      const ai = box(g, 0.26, 0.26, 0.06, -0.32, 0.95, -0.5, aiM, 0.04)
      plane(ai, 0.2, 0.2, 0, 0, 0.031, canvasTex(128, 128, (c, w, h) => { c.fillStyle = '#14181d'; c.fillRect(0, 0, w, h); print(c, 'AI', w / 2, 84, 60, '#ffe14d', 900, 'center') }))
      const keyM = glow(C.green, 0, C.gold)
      const keyHead = ring(g, 0.07, 0.022, 0.34, 0.95, -0.5, keyM)
      const keyBit = box(g, 0.16, 0.035, 0.035, 0.46, 0.95, -0.5, keyM, 0.01)
      return {
        tone: 'gold',
        update: (since, active, time) => {
          const drop = active ? easeOut(ramp(since, 0.1, 0.55)) : 1
          env.position.y = active ? 1.2 - drop * 1.08 : 0.12
          setGlow(aiM, active ? 0.2 + 1.3 * pulse(since, 0.8, 1.0) : 0.1 + 0.08 * Math.sin(time * 2))
          setGlow(keyM, active ? 1.2 * ramp(since, 1.6, 0.4) : 0)
          keyHead.visible = keyBit.visible = !active || since > 1.5
        },
      }
    },
    probe: ({ g }) => {
      const tiles = [-0.42, 0, 0.42].map((x) => {
        box(g, 0.36, 0.36, 0.36, x, 0.18, 0.1)
        const m = glow(C.green, 0, C.steelDark)
        box(g, 0.28, 0.02, 0.28, x, 0.37, 0.1, m, 0)
        return m
      })
      for (const x of [-0.21, 0.21]) { const l = cyl(g, 0.035, 0.12, x, 0.18, 0.1, M.gold); l.rotation.z = Math.PI / 2 }
      box(g, 0.08, 1.2, 0.08, 0.62, 0.6, -0.45, M.chrome)
      box(g, 0.7, 0.07, 0.07, 0.3, 1.18, -0.45, M.chrome)
      const needle = cyl(g, 0.03, 0.4, 0, 0.98, -0.45, M.gold, 0.008)
      return {
        tone: 'green',
        update: (since, active) => {
          const p = active ? easeOut(ramp(since, 0.1, 0.45)) : 0
          needle.position.set(0, 0.98 - p * 0.42, -0.45 + p * 0.55)
          tiles.forEach((m, i) => setGlow(m, active ? 1.3 * ramp(since, 0.55 + i * 0.3, 0.2) : 0.04))
        },
      }
    },
    mint: ({ g }) => {
      box(g, 1.1, 0.42, 0.8, 0, 0.21, 0)
      box(g, 0.82, 0.02, 0.09, 0, 0.43, 0, M.dark, 0)
      const stripM = glow(C.gold, 0.4)
      box(g, 0.9, 0.04, 0.02, 0, 0.12, 0.41, stripM, 0)
      const card = new THREE.Group()
      g.add(card)
      box(card, 0.74, 0.03, 0.46, 0, 0, 0, M.dark, 0.02)
      const face = plane(card, 0.7, 0.42, 0, 0.017, 0, cardTexture('ok'))
      face.rotation.x = -Math.PI / 2
      return {
        tone: 'gold',
        update: (since, active, time) => {
          const p = active ? easeOutBack(ramp(since, 0.15, 0.8)) : 0
          card.position.set(0, 0.22 + p * 0.95, p * 0.15)
          card.rotation.set(-p * 1.15, active ? Math.sin(time * 1.4) * 0.12 * p : 0, 0)
          card.visible = active
          setGlow(stripM, active ? 0.5 + 1.1 * pulse(since, 0.1, 0.9) : 0.35)
        },
      }
    },
    lens: ({ g }) => {
      cyl(g, 0.06, 0.72, 0, 0.36, 0, M.chrome)
      cyl(g, 0.3, 0.06, 0, 0.03, 0, M.body)
      const lensG = new THREE.Group()
      lensG.position.set(0, 1.08, 0)
      g.add(lensG)
      const ringM = glow(C.gold, 0.25)
      const rim2 = ring(lensG, 0.42, 0.055, 0, 0, 0, ringM)
      const discM = mat(0x9fb0bb, 0.3, 0.1, { transparent: true, opacity: 0.35, emissive: C.green, emissiveIntensity: 0, depthWrite: false })
      const disc = cyl(lensG, 0.4, 0.02, 0, 0, 0, discM)
      disc.rotation.x = Math.PI / 2
      const tickM = glow(C.green, 1.4)
      const tick = new THREE.Group()
      lensG.add(tick)
      const a = box(tick, 0.16, 0.05, 0.03, -0.08, -0.03, 0.04, tickM, 0.01)
      a.rotation.z = -0.8
      const b = box(tick, 0.32, 0.05, 0.03, 0.08, 0.04, 0.04, tickM, 0.01)
      b.rotation.z = 0.9
      return {
        tone: 'green',
        update: (since, active, time) => {
          rim2.rotation.z = time * 0.6
          lensG.rotation.y = Math.sin(time * 0.7) * 0.25
          setGlow(discM, active ? 1.1 * ramp(since, 0.3, 0.4) : 0)
          const pop = active ? easeOutBack(ramp(since, 0.55, 0.4)) : 0
          tick.scale.setScalar(Math.max(0.001, pop))
          setGlow(ringM, active ? 0.6 + 0.6 * Math.sin(time * 6) * 0.5 : 0.25)
        },
      }
    },
    blueprint: ({ g }) => {
      const board = new THREE.Group()
      board.position.set(0, 0.42, 0)
      board.rotation.x = 0.55
      g.add(board)
      box(board, 1.24, 0.05, 0.86, 0, 0, 0, M.body)
      const face = plane(board, 1.16, 0.8, 0, 0.027, 0, canvasTex(512, 352, (c, w, h) => {
        c.fillStyle = '#0f2a44'; c.fillRect(0, 0, w, h)
        c.strokeStyle = 'rgba(160,200,255,.18)'; c.lineWidth = 1
        for (let x = 0; x < w; x += 32) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke() }
        for (let y = 0; y < h; y += 32) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke() }
        const { weights: wt, passMark } = POLICY.course
        print(c, T(`QUIZ ${wt.kuis} · ESSAY ${wt.esai} · PRACTICE ${wt.praktik}`, `KUIS ${wt.kuis} · ESAI ${wt.esai} · PRAKTIK ${wt.praktik}`), 28, 70, 24, '#cfe3ff', 700)
        print(c, T(`PASS MARK ${passMark}`, `AMBANG LULUS ${passMark}`), 28, 110, 24, '#cfe3ff', 700)
        print(c, 'rubricHash', 28, 250, 24, '#f0b90b', 700)
        print(c, `${POLICY_HASH.slice(0, 10)}…${POLICY_HASH.slice(-12)}`, 28, 288, 26, '#ffe14d', 800)
      }))
      face.rotation.x = -Math.PI / 2
      const sealM = glow(C.gold, 0.3)
      const seal = cyl(g, 0.17, 0.09, 0.32, 1.3, 0.05, sealM)
      return {
        tone: 'gold',
        update: (since, active) => {
          const p = active ? easeOut(ramp(since, 0.2, 0.5)) : 1
          seal.position.y = active ? 1.3 - p * 0.86 : 0.44
          setGlow(sealM, active ? 0.3 + 1.4 * pulse(since, 0.6, 0.8) : 0.3)
        },
      }
    },
    pillar: ({ g }) => {
      cyl(g, 0.24, 1.5, 0, 0.75, 0, M.body)
      box(g, 0.56, 0.09, 0.56, 0, 1.55, 0, M.gold, 0.03)
      const bands = [0, 1, 2, 3, 4].map((i) => { const m = glow(C.gold, 0.06); ring(g, 0.255, 0.028, 0, 0.25 + i * 0.27, 0, m).rotation.x = Math.PI / 2; return m })
      return {
        tone: 'gold',
        update: (since, active) => bands.forEach((m, i) => setGlow(m, active ? 1.4 * ramp(since, 0.15 + i * 0.22, 0.2) : 0.06)),
      }
    },
    dock: ({ g }) => {
      cyl(g, 0.55, 0.05, 0.35, 0.03, 0, M.dark)
      const padM = glow(C.gold, 0.15)
      ring(g, 0.55, 0.025, 0.35, 0.06, 0, padM).rotation.x = Math.PI / 2
      const bot = new THREE.Group()
      g.add(bot)
      box(bot, 0.42, 0.45, 0.32, 0, 0.3, 0)
      box(bot, 0.32, 0.22, 0.26, 0, 0.66, 0, M.body)
      const eyeM = glow(C.neon, 1.2)
      box(bot, 0.22, 0.045, 0.02, 0, 0.67, 0.135, eyeM, 0.01)
      cyl(bot, 0.015, 0.16, 0.08, 0.85, 0, M.chrome)
      const coin = cyl(g, 0.12, 0.035, 0, 0, 0, M.gold)
      coin.rotation.x = Math.PI / 2
      return {
        tone: 'gold',
        update: (since, active, time) => {
          const slide = active ? easeOut(ramp(since, 0.05, 0.7)) : 0
          bot.position.set(-0.55 + slide * 0.9, 0, 0)
          setGlow(padM, active ? 0.3 + 0.9 * slide : 0.15)
          const f = active ? ramp(since, 0.9, 0.6) : 0
          coin.visible = active && f > 0 && f < 1
          coin.position.set(0.9 - f * 0.55, 0.9 + Math.sin(Math.PI * f) * 0.45, 0.25 - f * 0.25)
          coin.rotation.y = time * 8
          setGlow(eyeM, 0.8 + 0.4 * Math.sin(time * 4))
        },
      }
    },
    stamp: ({ g }) => {
      box(g, 0.82, 0.02, 0.6, 0, 0.02, 0, M.paper, 0)
      const markM = glow(C.green, 1.2)
      const mark = box(g, 0.34, 0.006, 0.22, 0, 0.034, 0, markM, 0)
      const st = new THREE.Group()
      g.add(st)
      box(st, 0.36, 0.1, 0.26, 0, 0, 0, M.gold)
      cyl(st, 0.06, 0.4, 0, 0.25, 0, M.body)
      ball(st, 0.11, 0, 0.5, 0, M.dark)
      return {
        tone: 'green',
        update: (since, active) => {
          const p = active ? pulse(since, 0.15, 0.75) : 0
          st.position.y = 0.95 - p * 0.86
          mark.visible = active && since > 0.5
          mark.scale.setScalar(active ? Math.max(0.001, easeOutBack(ramp(since, 0.5, 0.3))) : 0.001)
          setGlow(markM, 1.2)
        },
      }
    },
    gates: ({ g }) => {
      const beams = [-0.45, 0, 0.45].map((x) => {
        for (const z of [-0.28, 0.28]) box(g, 0.08, 0.7, 0.08, x, 0.35, z, M.chrome)
        const m = glow(C.gold, 0.08)
        box(g, 0.08, 0.08, 0.64, x, 0.72, 0, m)
        return m
      })
      const card = box(g, 0.34, 0.03, 0.22, 0.72, 0.18, 0, glow(C.gold, 1.0), 0.02)
      return {
        tone: 'gold',
        update: (since, active) => {
          beams.forEach((m, i) => setGlow(m, active ? 1.4 * ramp(since, 0.15 + i * 0.3, 0.2) : 0.08))
          const p = active ? easeOutBack(ramp(since, 1.1, 0.4)) : 0
          card.scale.setScalar(Math.max(0.001, p))
          card.position.y = 0.18 + p * 0.2
        },
      }
    },
    revoke: ({ g }) => {
      box(g, 0.56, 0.1, 0.3, 0, 0.05, 0)
      const card = new THREE.Group()
      card.position.set(0, 0.4, 0)
      g.add(card)
      const okFace = plane(card, 0.66, 0.42, 0, 0, 0.017, cardTexture('ok'))
      const badFace = plane(card, 0.66, 0.42, 0, 0, 0.018, cardTexture('revoked'))
      box(card, 0.7, 0.46, 0.03, 0, 0, 0, M.dark, 0.02)
      const cutM = glow(C.red, 1.5)
      const cut = box(g, 0.82, 0.02, 0.06, 0, 0.7, 0.05, cutM, 0)
      return {
        tone: 'red',
        update: (since, active) => {
          const p = active ? easeInOut(ramp(since, 0.25, 0.6)) : 0
          cut.visible = active && p > 0 && p < 1
          cut.position.y = 0.7 - p * 0.6
          badFace.visible = active && since > 0.7
          okFace.visible = !badFace.visible
        },
      }
    },
    splitter: ({ g }) => {
      cyl(g, 0.3, 0.34, 0, 1.08, 0, M.gold, 0.08)
      const left = cyl(g, 0.22, 0.2, -0.38, 0.1, 0.05, M.dark)
      const right = cyl(g, 0.15, 0.16, 0.42, 0.08, 0.05, M.dark)
      left.material = glow(C.gold, 0.1, C.steelDark)
      right.material = glow(C.edge, 0.05, C.steelDark)
      const coins = [0, 1, 2].map(() => { const c = cyl(g, 0.085, 0.03, 0, 0, 0, M.gold); c.rotation.x = Math.PI / 2; return c })
      return {
        tone: 'gold',
        update: (since, active, time) => {
          coins.forEach((c, i) => {
            const f = active ? ramp(since, 0.2 + i * 0.45, 0.55) : 0
            const toX = i === 2 ? 0.42 : -0.38
            c.visible = active && f > 0 && f < 1
            c.position.set(toX * easeInOut(f), 0.9 - f * 0.7, 0.05)
            c.rotation.y = time * 6
          })
          setGlow(left.material as THREE.Material, active ? 0.2 + 0.9 * ramp(since, 0.6, 0.6) : 0.1)
        },
      }
    },
    badge: ({ g }) => {
      cyl(g, 0.05, 0.6, 0, 0.3, 0, M.chrome)
      cyl(g, 0.28, 0.06, 0, 0.03, 0, M.body)
      const b = new THREE.Group()
      b.position.set(0, 1.02, 0)
      g.add(b)
      const hexM = glow(C.gold, 0.25)
      const hex = cyl(b, 0.46, 0.08, 0, 0, 0, hexM, 0.46, 6)
      hex.rotation.x = Math.PI / 2
      const tex = canvasTex(256, 256, (c, w, h) => {
        c.fillStyle = '#0d1014'; c.beginPath(); c.arc(w / 2, h / 2, 118, 0, Math.PI * 2); c.fill()
        print(c, 'ERC', w / 2, 98, 30, '#8b919a', 800, 'center')
        print(c, '8004', w / 2, 158, 62, '#f0b90b', 900, 'center')
        print(c, '#2534', w / 2, 200, 26, '#d9d8cd', 700, 'center')
      })
      plane(b, 0.6, 0.6, 0, 0, 0.045, tex)
      const back = plane(b, 0.6, 0.6, 0, 0, -0.045, tex)
      back.rotation.y = Math.PI
      return {
        tone: 'gold',
        update: (since, active, time) => {
          b.rotation.y = active ? time * 0.6 + easeOut(ramp(since, 0, 0.9)) * Math.PI * 2 : Math.sin(time * 0.5) * 0.4
          setGlow(hexM, active ? 0.4 + 0.9 * pulse(since, 0.1, 1.2) : 0.25)
        },
      }
    },
    ladder: ({ g }) => {
      const steps = [0, 1, 2, 3, 4, 5, 6].map((i) => {
        const h = 0.12 + i * 0.1
        const m = glow(C.gold, 0.06, C.steel)
        box(g, 0.15, h, 0.5, -0.54 + i * 0.18, h / 2, 0, m, 0.02)
        return m
      })
      return {
        tone: 'gold',
        update: (since, active, time) => steps.forEach((m, i) => setGlow(m, active ? 1.3 * ramp(since, 0.15 + i * 0.17, 0.15) : 0.05 + 0.04 * Math.sin(time * 2 + i))),
      }
    },
    handshake: ({ g }) => {
      const pubM = glow(C.gold, 0.2)
      const pub = box(g, 0.4, 0.4, 0.4, -0.6, 0.2, 0, pubM, 0.06)
      const agent = new THREE.Group()
      g.add(agent)
      box(agent, 0.4, 0.4, 0.4, 0, 0.2, 0, M.body, 0.06)
      box(agent, 0.24, 0.045, 0.02, 0, 0.26, 0.205, glow(C.neon, 1.1), 0.01)
      const sparkM = glow(C.neon, 2.0)
      const spark = ball(g, 0.09, 0, 0.3, 0, sparkM)
      return {
        tone: 'gold',
        update: (since, active) => {
          const p = active ? easeOut(ramp(since, 0.1, 0.6)) : 0
          pub.position.x = -0.6 + p * 0.38
          agent.position.x = 0.6 - p * 0.38
          spark.scale.setScalar(Math.max(0.001, active ? pulse(since, 0.65, 0.6) * 1.6 : 0))
          setGlow(pubM, 0.2 + p * 0.6)
        },
      }
    },
    arm: ({ g }) => {
      box(g, 0.82, 0.02, 0.6, 0.1, 0.02, 0.1, M.paper, 0)
      cyl(g, 0.18, 0.12, -0.55, 0.06, -0.3, M.body)
      const upper = new THREE.Group()
      upper.position.set(-0.55, 0.14, -0.3)
      g.add(upper)
      box(upper, 0.1, 0.7, 0.1, 0, 0.35, 0, M.chrome)
      const fore = new THREE.Group()
      fore.position.set(0, 0.7, 0)
      upper.add(fore)
      box(fore, 0.62, 0.08, 0.08, 0.31, 0, 0, M.chrome)
      const chipM = glow(C.gold, 1.1)
      const chip = box(fore, 0.18, 0.04, 0.12, 0.62, -0.06, 0, chipM, 0.01)
      const placed = box(g, 0.18, 0.04, 0.12, 0.2, 0.05, 0.15, glow(C.gold, 1.1), 0.01)
      return {
        tone: 'gold',
        update: (since, active, time) => {
          const p = active ? pulse(since, 0.1, 1.2) : 0
          upper.rotation.set(0, -0.55, -0.15 - p * 0.55)
          fore.rotation.z = -0.25 - p * 0.35
          chip.visible = !active || since < 0.72
          placed.visible = active && since >= 0.72
          setGlow(chipM, 0.8 + 0.3 * Math.sin(time * 5))
        },
      }
    },
    wallet: ({ g }) => {
      box(g, 0.82, 0.46, 0.28, 0, 0.23, 0, M.body, 0.06)
      const flapM = glow(C.gold, 0.25)
      box(g, 0.84, 0.08, 0.3, 0, 0.42, 0.01, flapM, 0.03)
      box(g, 0.5, 0.02, 0.05, 0, 0.47, 0, M.dark, 0)
      const cup = cyl(g, 0.12, 0.12, 0.62, 0.06, 0.25, M.dark)
      const coins = [0, 1, 2, 3].map(() => { const c = cyl(g, 0.08, 0.03, 0, 0, 0, M.gold); c.rotation.x = Math.PI / 2; return c })
      return {
        tone: 'gold',
        update: (since, active, time) => {
          coins.forEach((c, i) => {
            const f = active ? ramp(since, 0.15 + i * 0.35, 0.5) : 0
            const platform = i === 3
            c.visible = active && f > 0 && f < 1
            c.position.set(platform ? 0.62 * easeInOut(f) : 0, 1.15 - f * (platform ? 1.05 : 0.7), platform ? 0.25 * f : 0)
            c.rotation.y = time * 7
          })
          setGlow(flapM, active ? 0.3 + 0.9 * ramp(since, 0.6, 0.8) : 0.25)
          cup.rotation.y = time * 0.3
        },
      }
    },
    lock: ({ g }) => {
      const bodyM = glow(C.red, 0, C.gold)
      box(g, 0.5, 0.42, 0.22, -0.22, 0.21, 0, bodyM, 0.05)
      const shackle = ring(g, 0.15, 0.045, -0.22, 0.6, 0, M.chrome, Math.PI)
      box(g, 0.44, 0.44, 0.44, 0.45, 0.22, -0.05, M.glass, 0.02)
      const keyM = glow(C.gold, 0.8)
      ring(g, 0.07, 0.025, 0.38, 0.24, -0.05, keyM)
      box(g, 0.16, 0.035, 0.035, 0.52, 0.24, -0.05, keyM, 0.01)
      return {
        tone: 'red',
        update: (since, active, time) => {
          const p = active ? easeOutBack(ramp(since, 0.15, 0.5)) : 0
          shackle.position.y = 0.66 - p * 0.12
          setGlow(bodyM, active ? 0.9 * ramp(since, 0.4, 0.3) : 0)
          setGlow(keyM, 0.6 + 0.4 * Math.sin(time * 3))
        },
      }
    },
  }

  // ------------------------------------------------------------------ pelat per peran
  type Built = {
    role: Role
    group: THREE.Group
    curve: THREE.CatmullRomCurve3
    docks: THREE.Vector3[]
    anchors: THREE.Vector3[]
    hits: THREE.Mesh[]
    rims: THREE.Material[]
    kits: KitRuntime[]
    labels: HTMLDivElement[]
  }
  const built = new Map<RoleId, Built>()
  const hitGeo = track(new THREE.BoxGeometry(1.8, 2.4, 1.8))
  const hitMat = track(new THREE.MeshBasicMaterial({ visible: false }))

  function buildRole (role: Role): Built {
    const group = new THREE.Group()
    const n = role.stations.length
    // Pelat berlapis + nameplate terukir, seperti mesin referensi tapi dengan emas Lencana.
    box(group, 14.2, 0.36, 8.4, 0, -0.09, 0, M.base, 0.17)
    box(group, 14.0, 0.05, 8.2, 0, 0.12, 0, M.edge, 0.1)
    box(group, 13.9, 0.08, 8.1, 0, 0.18, 0, M.body, 0.09)
    box(group, 13.2, 0.025, 0.03, 0, -0.17, 4.2, glow(C.gold, 1.4), 0.01)
    for (const x of [-6.4, 6.4]) for (const z of [-3.6, 3.6]) cyl(group, 0.06, 0.03, x, 0.235, z, M.chrome, 0.06, 12)
    const nameplate = plane(group, 6.4, 0.62, -3.2, 0.23, 3.6, canvasTex(1280, 124, (c, w, h) => {
      c.fillStyle = '#20252c'; c.fillRect(0, 0, w, h)
      c.strokeStyle = '#4d545c'; c.lineWidth = 2; c.strokeRect(2, 2, w - 4, h - 4)
      print(c, role.plate[o.lang], 30, 78, 40, '#d9d8cd', 700)
      print(c, `No. 0${ROLES.indexOf(role) + 1}`, w - 30, 78, 30, '#f0b90b', 700, 'right')
    }))
    nameplate.rotation.x = -Math.PI / 2

    const docks: THREE.Vector3[] = []
    const anchors: THREE.Vector3[] = []
    const hits: THREE.Mesh[] = []
    const rims: THREE.Material[] = []
    const kitsRt: KitRuntime[] = []
    const labels: HTMLDivElement[] = []
    role.stations.forEach((st, i) => {
      const x = n === 1 ? 0 : -5.6 + (11.2 * i) / (n - 1)
      const z = i % 2 === 0 ? 1.45 : -1.55
      const sg = new THREE.Group()
      sg.position.set(x, 0.46, z)
      group.add(sg)
      box(sg, 1.6, 0.24, 1.6, 0, -0.12, 0, M.body, 0.08)
      const rimM = glow(C.gold, 0.15)
      box(sg, 1.64, 0.03, 1.64, 0, -0.2, 0, rimM, 0.02)
      rims.push(rimM)
      plane(sg, 0.42, 0.2, -0.55, -0.11, 0.805, canvasTex(160, 76, (c, w, h) => { c.fillStyle = '#14181d'; c.fillRect(0, 0, w, h); print(c, String(i + 1).padStart(2, '0'), w / 2, 56, 46, '#f0b90b', 800, 'center') }))
      kitsRt.push(kits[st.kit]({ g: sg }))
      const dock = new THREE.Vector3(x, 0.3, z * 0.32)
      docks.push(dock)
      // lengan penghubung rel → alas stasiun
      const arm = box(group, 0.18, 0.05, Math.abs(z - dock.z) - 0.7, x, 0.25, (z + dock.z) / 2 - Math.sign(z) * 0.35, M.edge, 0.01)
      arm.castShadow = false
      anchors.push(new THREE.Vector3(x, 2.35, z))
      const hit = new THREE.Mesh(hitGeo, hitMat)
      hit.position.set(x, 1.2, z)
      hit.userData.index = i
      group.add(hit)
      hits.push(hit)
      const label = document.createElement('div')
      label.className = 'flow3d-label'
      label.innerHTML = `<b>${String(i + 1).padStart(2, '0')}</b><span></span>`
      label.querySelector('span')!.textContent = st.title[o.lang]
      label.dataset.index = String(i)
      o.labelsHost.appendChild(label)
      labels.push(label)
    })
    const curve = new THREE.CatmullRomCurve3(docks, false, 'centripetal')
    mesh(group, track(new THREE.TubeGeometry(curve, 240, 0.09, 8, false)), M.dark, 0, -0.03, 0, false)
    mesh(group, track(new THREE.TubeGeometry(curve, 240, 0.045, 8, false)), M.rail, 0, 0.03, 0, false)
    return { role, group, curve, docks, anchors, hits, rims, kits: kitsRt, labels }
  }
  function getBuilt (id: RoleId): Built {
    let b = built.get(id)
    if (!b) { b = buildRole(findRole(id)); built.set(id, b) }
    return b
  }

  // ------------------------------------------------------------------ benda yang berjalan
  const travelerM = glow(C.gold, 1.3)
  const traveler = new THREE.Group()
  box(traveler, 0.5, 0.12, 0.34, 0, 0, 0, travelerM, 0.04)
  const travelerLight = new THREE.PointLight(C.gold, 4, 3, 2)
  travelerLight.position.y = 0.3
  traveler.add(travelerLight)
  scene.add(traveler)
  const TONES: Record<Tone, number> = { gold: C.gold, green: C.green, red: C.red }

  // ------------------------------------------------------------------ keadaan
  let current = getBuilt('learner')
  scene.add(current.group)
  let leaving: Built | null = null
  let switchStart = -1
  let index = 0
  let phase: 'dwell' | 'travel' | 'wrap' = 'dwell'
  let phaseStart = 0
  let from = 0
  let to = 0
  let playing = !o.reduceMotion
  let hover = -1
  /** Tujuan yang diminta saat benda masih berjalan — ketukan cepat menumpuk, bukan saling menimpa. */
  let queued = -1
  let visible = true
  let raf = 0
  let arrived: number[] = []
  const t0 = performance.now()
  const now = () => (performance.now() - t0) / 1000
  const resetArrivals = () => { arrived = current.role.stations.map(() => -Infinity) }
  resetArrivals()
  const labelMode = (b: Built) => b.labels.forEach((l, i) => { l.classList.toggle('active', i === index); l.classList.toggle('hover', i === hover) })
  const showLabels = (b: Built, on: boolean) => b.labels.forEach((l) => { l.style.display = on ? '' : 'none' })
  for (const [, b] of built) showLabels(b, b === current)

  function arrive (i: number) {
    index = i
    phase = 'dwell'
    phaseStart = now()
    arrived[i] = now()
    o.onStep(current.role.id, i, false)
    if (queued >= 0) { const q = queued; queued = -1; if (q !== i) goTo(q) }
  }
  arrive(0)

  /** Stasiun yang sedang dituju (atau ditempati) — dasar untuk maju/mundur berikutnya. */
  const heading = () => (queued >= 0 ? queued : phase === 'dwell' ? index : to)
  const tAt = (b: Built, i: number) => (b.docks.length < 2 ? 0 : i / (b.docks.length - 1))

  function setRole (id: RoleId) {
    if (id === current.role.id) return
    const next = getBuilt(id)
    leaving = current
    current = next
    scene.add(next.group)
    showLabels(leaving, false)
    showLabels(next, true)
    switchStart = o.reduceMotion ? -1 : now()
    if (o.reduceMotion) { scene.remove(leaving.group); leaving = null; next.group.position.y = 0 }
    hover = -1
    queued = -1
    resetArrivals()
    arrive(0)
  }
  function goTo (i: number) {
    const n = current.role.stations.length
    const j = ((i % n) + n) % n
    if (phase !== 'dwell') { queued = j; return }
    if (j === index) { arrived[j] = now(); return }
    from = index
    to = j
    phase = Math.abs(j - index) === 1 ? 'travel' : 'wrap'
    phaseStart = now()
  }

  // ------------------------------------------------------------------ interaksi
  const raycaster = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  let downAt: { x: number, y: number } | null = null
  const pick = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect()
    pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(current.hits, false)[0]
    return hit ? Number(hit.object.userData.index) : -1
  }
  const listen = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (ev: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn as EventListener)
    cleanups.push(() => el.removeEventListener(type, fn as EventListener))
  }
  listen(renderer.domElement, 'pointermove', (ev) => {
    if (switchStart >= 0) return
    const h = pick(ev)
    if (h !== hover) {
      hover = h
      renderer.domElement.style.cursor = h >= 0 ? 'pointer' : ''
      o.onStep(current.role.id, h >= 0 ? h : index, h >= 0)
    }
  })
  listen(renderer.domElement, 'pointerleave', () => { if (hover !== -1) { hover = -1; renderer.domElement.style.cursor = ''; o.onStep(current.role.id, index, false) } })
  listen(renderer.domElement, 'pointerdown', (ev) => { downAt = { x: ev.clientX, y: ev.clientY } })
  listen(renderer.domElement, 'pointerup', (ev) => {
    if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 6) return
    const h = pick(ev)
    if (h >= 0) goTo(h)
  })
  // Label juga bisa diketuk (di layar sentuh canvas tidak memutar, jadi label adalah jalannya).
  listen(o.labelsHost, 'click', (ev) => {
    const el = (ev.target as HTMLElement).closest('.flow3d-label') as HTMLElement | null
    if (el) goTo(Number(el.dataset.index))
  })

  const ro = new ResizeObserver(() => { renderer.setSize(W(), H()); frame(); controls.update() })
  ro.observe(o.stage)
  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting)
    if (visible && !raf) loop()
  }, { threshold: 0.01 })
  io.observe(o.stage)
  const onVis = () => { if (!document.hidden && visible && !raf) loop() }
  document.addEventListener('visibilitychange', onVis)
  cleanups.push(() => document.removeEventListener('visibilitychange', onVis))

  // ------------------------------------------------------------------ putaran gambar
  const tmp = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  let ready = false
  let disposed = false
  function loop () {
    raf = 0
    // Landing dirender ulang atau ditinggal: panggungnya lepas dari dokumen — berhenti dan lepaskan GPU.
    if (!o.stage.isConnected) { dispose(); return }
    if (!visible || document.hidden) return
    const time = now()
    const b = current

    // ganti peran: pelat lama turun, pelat baru naik (easeOutBack = mendarat dengan bobot)
    if (switchStart >= 0) {
      const p = clamp01((time - switchStart) / 0.85)
      if (leaving) {
        const q = clamp01(p / 0.5)
        leaving.group.position.y = -q * q * 6
        if (q >= 1) { scene.remove(leaving.group); leaving = null }
      }
      b.group.position.y = -6 + 6 * easeOutBack(clamp01((p - 0.25) / 0.75))
      if (p >= 1) { switchStart = -1; b.group.position.y = 0 }
    }

    // mesin keadaan benda
    if (playing && phase === 'dwell' && switchStart < 0 && time - phaseStart > DWELL) {
      const n = b.role.stations.length
      from = index
      to = (index + 1) % n
      phase = to === 0 ? 'wrap' : 'travel'
      phaseStart = time
    }
    let tone: Tone = b.kits[index]?.tone ?? 'gold'
    if (phase === 'travel') {
      const p = clamp01((time - phaseStart) / (o.reduceMotion ? 0.35 : TRAVEL))
      const e = easeInOut(p)
      const t = tAt(b, from) + (tAt(b, to) - tAt(b, from)) * e
      b.curve.getPoint(t, tmp)
      traveler.position.set(tmp.x, tmp.y + b.group.position.y + 0.12 + Math.sin(Math.PI * e) * 0.35, tmp.z)
      traveler.scale.setScalar(1)
      tone = 'gold'
      if (p >= 1) arrive(to)
    } else if (phase === 'wrap') {
      // lompat (balik ke awal atau melompati stasiun): mengecil di sini, muncul di tujuan
      const p = clamp01((time - phaseStart) / (o.reduceMotion ? 0.3 : 0.9))
      const at = p < 0.5 ? b.docks[from] : b.docks[to]
      const s = p < 0.5 ? 1 - easeInOut(p * 2) : easeOutBack((p - 0.5) * 2)
      traveler.position.set(at.x, at.y + b.group.position.y + 0.12, at.z)
      traveler.scale.setScalar(Math.max(0.001, s))
      if (p >= 1) { traveler.scale.setScalar(1); arrive(to) }
    } else {
      const at = b.docks[index]
      traveler.position.set(at.x, at.y + b.group.position.y + 0.12 + (o.reduceMotion ? 0 : Math.sin(time * 2.4) * 0.04), at.z)
    }
    traveler.rotation.y = o.reduceMotion ? 0 : time * 0.8
    const tc = TONES[tone]
    travelerM.color.setHex(tc)
    travelerM.emissive.setHex(tc)
    travelerLight.color.setHex(tc)

    // stasiun: gerak mikro + cincin menyala
    b.kits.forEach((k, i) => {
      const active = phase === 'dwell' && i === index
      k.update(active ? time - arrived[i] : Infinity, active, o.reduceMotion ? 0 : time)
      setGlow(b.rims[i], active ? 1.5 : i === hover ? 0.9 : 0.15)
    })
    if (!o.reduceMotion && playing && switchStart < 0) b.group.rotation.y = Math.sin(time * 0.18) * 0.05

    // label menempel di layar
    const w = W(), h = H()
    b.anchors.forEach((a, i) => {
      tmp.copy(a)
      tmp.y += b.group.position.y
      tmp.applyAxisAngle(UP, b.group.rotation.y)
      tmp.project(camera)
      const el = b.labels[i]
      el.style.transform = `translate(-50%, -100%) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`
    })
    labelMode(b)

    controls.update()
    renderer.render(scene, camera)
    // Frame pertama bisa lama (kompilasi shader di perangkat lemah): stasiun pertama baru mulai dihitung saat terlihat.
    if (!ready) { ready = true; phaseStart = arrived[index] = now(); o.onReady() }
    raf = requestAnimationFrame(loop)
  }
  loop()

  return {
    setRole,
    goTo,
    next: () => goTo(heading() + 1),
    prev: () => goTo(heading() - 1),
    play: () => { playing = true; phaseStart = now(); o.onPlayState(true) },
    pause: () => { playing = false; o.onPlayState(false) },
    isPlaying: () => playing,
    dispose,
  }
  function dispose () {
    if (disposed) return
    disposed = true
    if (raf) cancelAnimationFrame(raf)
    raf = 0
    visible = false
    ro.disconnect()
    io.disconnect()
    for (const fn of cleanups.reverse()) fn()
    cleanups.length = 0
    controls.dispose()
    for (const b of built.values()) b.labels.forEach((l) => l.remove())
    // Pelat peran yang sedang tidak tampil juga dilepas (ia tidak ada di `scene`).
    for (const b of built.values()) scene.add(b.group)
    scene.traverse((obj) => {
      const m = obj as THREE.Mesh
      if (m.isMesh) {
        m.geometry?.dispose()
        const mats = Array.isArray(m.material) ? m.material : [m.material]
        mats.forEach((x) => x?.dispose())
      }
    })
    for (const d of disposables) d.dispose()
    renderer.dispose()
    // Lepaskan konteksnya juga: peramban membatasi jumlah konteks WebGL per tab, dan ganti bahasa membuat scene baru.
    renderer.forceContextLoss()
    renderer.domElement.remove()
  }
}
