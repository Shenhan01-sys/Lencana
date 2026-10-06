/**
 * `admin-flow.ts` — diagram aliran (sankey) untuk tab Ringkasan halaman Admin (B172, 6 Okt malam; builder: "buat yang lebih creative, kurangi card-card").
 *
 * Doktrin FE builder: data jadi geometri. Platform ini sebuah jalur — peserta mendaftar, sebagian membayar, uangnya terbagi, esai mengalir ke
 * penilai lalu pengesah — jadi ringkasannya digambar sebagai ALIRAN: tebal pita = jumlah. Satu kanvas menggantikan tiga kartu dan sepuluh kotak angka.
 *
 * Murni tata letak + penanda SVG (tanpa jaringan, tanpa DOM global selain pembungkus yang dibuat pemanggil). Orientasi `h` (kiri → kanan) untuk layar lebar,
 * `v` (atas → bawah) untuk ponsel; rumus yang sama dengan sumbu ditukar.
 */

export type Tone = 'green' | 'gold' | 'gray' | 'blue' | 'red' | 'teal' | 'slate'
export type FlowNode = { id: string, layer: number, value: number, label: string, tone: Tone }
export type FlowLink = { from: string, to: string, value: number }
export type Orient = 'h' | 'v'

export const TONE: Record<Tone, string> = { green: '#0ecb81', gold: '#f0b90b', gray: '#848e9c', blue: '#4aa3ff', red: '#f6465d', teal: '#2dd4bf', slate: '#5d6672' }

const NODE_W = 12
const GAP = 16
const PAD = 8
const LABEL_H = 26
const CHAR_W = 6.9

const esc = (s: string) => s.replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c] ?? c)
let uid = 0

/**
 * @param along  panjang sumbu aliran (px dalam viewBox): lebar untuk `h`, tinggi untuk `v`
 * @param cross  lebar sumbu silang: tinggi untuk `h`, lebar untuk `v`
 * @returns      `{ svg, width, height }` — penanda `<svg>` lengkap
 */
export function flowSvg (opts: { nodes: FlowNode[], links: FlowLink[], orient: Orient, along: number, cross: number, label: string }): { svg: string, width: number, height: number } {
  const { nodes, links, orient, along, cross } = opts
  const id = `adm-fl-${(uid += 1)}`
  const layers = [...new Set(nodes.map((n) => n.layer))].sort((a, b) => a - b)
  const L = layers.length
  const byLayer = layers.map((l) => nodes.filter((n) => n.layer === l))
  const total = (xs: FlowNode[]) => xs.reduce((s, n) => s + n.value, 0)
  // Satu skala tebal untuk semua lapis (pita yang sama tebalnya di kedua ujung); tersisa ruang untuk celah dan label.
  const room = cross - 2 * PAD - LABEL_H
  const k = Math.min(...byLayer.map((xs) => (room - (xs.length - 1) * GAP) / Math.max(total(xs), 1e-9)))
  // Ruang di ujung aliran untuk label lapis terakhir (di luar pita): selebar label terpanjang (h) atau tiga baris pil (v).
  const lastLabelW = Math.max(0, ...(byLayer[L - 1] ?? []).map((n) => Math.ceil(n.label.length * CHAR_W) + 18))
  const tail = orient === 'h' ? lastLabelW + 12 : 3 * (22 + 4) + 8
  const step = L > 1 ? (along - NODE_W - tail) / (L - 1) : 0

  type Placed = FlowNode & { a: number, c: number, t: number, out: number, inn: number }
  const placed = new Map<string, Placed>()
  byLayer.forEach((xs, li) => {
    const h = xs.reduce((s, n) => s + Math.max(n.value * k, 3), 0) + (xs.length - 1) * GAP
    let c = PAD + (room - h) / 2
    for (const n of xs) {
      const t = Math.max(n.value * k, 3)
      placed.set(n.id, { ...n, a: li * step, c, t, out: 0, inn: 0 })
      c += t + GAP
    }
  })

  const P = (a: number, c: number) => (orient === 'h' ? `${a.toFixed(1)},${c.toFixed(1)}` : `${c.toFixed(1)},${a.toFixed(1)}`)
  const defs: string[] = []
  const ribbons: string[] = []
  links.forEach((lk, i) => {
    const s = placed.get(lk.from), d = placed.get(lk.to)
    if (!s || !d || lk.value <= 0) return
    const w = Math.max(lk.value * k, 2)
    const a0 = s.a + NODE_W, a1 = d.a, am = (a0 + a1) / 2
    const c0 = s.c + s.out, c1 = d.c + d.inn
    s.out += w; d.inn += w
    const gid = `${id}-g${i}`
    const [x1, y1] = (orient === 'h' ? [a0, c0] : [c0, a0]), [x2, y2] = (orient === 'h' ? [a1, c1] : [c1, a1])
    defs.push(`<linearGradient id="${gid}" gradientUnits="userSpaceOnUse" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"><stop offset="0" stop-color="${TONE[s.tone]}"/><stop offset="1" stop-color="${TONE[d.tone]}"/></linearGradient>`)
    const path = `M${P(a0, c0)} C${P(am, c0)} ${P(am, c1)} ${P(a1, c1)} L${P(a1, c1 + w)} C${P(am, c1 + w)} ${P(am, c0 + w)} ${P(a0, c0 + w)} Z`
    ribbons.push(`<path class="adm-rb ${orient}" style="animation-delay:${60 * i}ms" d="${path}" fill="url(#${gid})"><title>${esc(s.label)} → ${esc(d.label)}</title></path>`)
  })

  const rects = [...placed.values()].map((n) => (orient === 'h'
    ? `<rect class="adm-nd" x="${n.a.toFixed(1)}" y="${n.c.toFixed(1)}" width="${NODE_W}" height="${n.t.toFixed(1)}" rx="3" fill="${TONE[n.tone]}"/>`
    : `<rect class="adm-nd" x="${n.c.toFixed(1)}" y="${n.a.toFixed(1)}" width="${n.t.toFixed(1)}" height="${NODE_W}" rx="3" fill="${TONE[n.tone]}"/>`)).join('')

  // Label = pil gelap di atas pita (terbaca di atas warna apa pun). Pil selapis yang bertabrakan di sumbu silang digeser satu baris.
  const pills: string[] = []
  byLayer.forEach((xs) => {
    const rowEnds = [-1e9, -1e9, -1e9] // v: pil yang berdekatan di sumbu silang turun ke baris berikutnya
    const sorted = [...xs].sort((a, b) => placed.get(a.id)!.c - placed.get(b.id)!.c)
    for (const n0 of sorted) {
      const n = placed.get(n0.id)!
      const w = Math.ceil(n.label.length * CHAR_W) + 18
      const hgt = 22
      let ax: number, cx: number
      if (orient === 'h') {
        ax = n.a + NODE_W + 6
        cx = n.c + n.t / 2 - hgt / 2
        ax = Math.max(0, Math.min(ax, along - w))
        pills.push(pill(ax, cx, w, hgt, n.label, TONE[n.tone]))
      } else {
        const left = Math.max(0, Math.min(n.c + n.t / 2 - w / 2, cross - w))
        let row = rowEnds.findIndex((e) => left >= e + 6)
        if (row < 0) row = rowEnds.indexOf(Math.min(...rowEnds))
        rowEnds[row] = left + w
        ax = n.a + NODE_W + 6 + row * (hgt + 4)
        pills.push(pill(left, ax, w, hgt, n.label, TONE[n.tone]))
      }
    }
  })

  const width = orient === 'h' ? along : cross
  const height = orient === 'h' ? cross : along
  const svg = `<svg class="adm-flow ${orient}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(opts.label)}" xmlns="http://www.w3.org/2000/svg"><defs>${defs.join('')}</defs>${ribbons.join('')}${rects}${pills.join('')}</svg>`
  return { svg, width, height }
}

function pill (x: number, y: number, w: number, h: number, text: string, tone: string): string {
  return `<g class="adm-pill"><rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w}" height="${h}" rx="11" fill="#181a20" stroke="${tone}" stroke-width="1.5"/>`
    + `<text x="${(x + w / 2).toFixed(1)}" y="${(y + h / 2 + 4.5).toFixed(1)}" text-anchor="middle" fill="#eaecef" font-size="12.5" font-weight="700">${esc(text)}</text></g>`
}
