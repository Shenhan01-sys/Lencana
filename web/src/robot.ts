/**
 * `robot.ts` — rupa agen penilai: robot rakitan (B132, D68). DIPAKAI BERSAMA halaman dan server.
 *
 * Pemilik merakit agennya dari suku cadang (kepala, mata, badan, alat, warna) dan memberinya nama. Rupa itu disimpan di
 * berkas registrasi ERC-8004 agen (`setAgentURI` dari dompet pemilik) sebagai `lencana:avatar` + `image` (SVG data URI),
 * jadi siapa pun yang membaca registry melihat robot yang sama — bukan gambar yang hanya ada di database kami.
 *
 * Di dasbor, data agen dibaca dari bentuknya (`robotSvg` dengan `live`): mata menyala = dompet agen terverifikasi, lampu
 * antena = bisa disewa atau tidak, pelat dada = tarif dasar. Gambar yang disimpan di chain memakai bentuk statis (tanpa data
 * hidup) supaya tidak basi.
 *
 * Deterministik dan tanpa DOM: SVG berupa teks, sehingga server bisa memvalidasi rupa dan menghitung ulang gambar yang sama.
 */
// Lencana-B132 status=SELESAI 2026-10-03 — robot penilai rakitan: suku cadang tetap, validasi rupa dari berkas registrasi, SVG deterministik untuk chain (statis) dan dasbor (data hidup di bentuknya). Buktikan ulang: cd signer && npm run verify:studio, lalu uji peramban T61. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

export const ROBOT_PARTS = {
  head: ['kotak', 'kubah', 'kapsul', 'segi'] as const,
  eyes: ['bulat', 'visor', 'lensa', 'sipit'] as const,
  body: ['kotak', 'tong', 'trapesium'] as const,
  tool: ['pena', 'kaca', 'stempel'] as const,
  color: ['emas', 'biru', 'hijau', 'merah', 'ungu', 'perak'] as const,
}
export type RobotPart = keyof typeof ROBOT_PARTS
export type Avatar = { v: 1, head: typeof ROBOT_PARTS.head[number], eyes: typeof ROBOT_PARTS.eyes[number], body: typeof ROBOT_PARTS.body[number], tool: typeof ROBOT_PARTS.tool[number], color: typeof ROBOT_PARTS.color[number] }

/** Kunci perluasan di berkas registrasi ERC-8004 (bidang tambahan; spesifikasi mengizinkan JSON yang lebih kaya). */
export const AVATAR_KEY = 'lencana:avatar'
export const NAME_MAX = 40

export const DEFAULT_AVATAR: Avatar = { v: 1, head: 'kotak', eyes: 'bulat', body: 'kotak', tool: 'pena', color: 'emas' }

const HEX: Record<Avatar['color'], { main: string, dark: string, light: string }> = {
  emas: { main: '#f0b90b', dark: '#a37a00', light: '#ffe08a' },
  biru: { main: '#8ea8ff', dark: '#4d63b8', light: '#d4ddff' },
  hijau: { main: '#2bd98a', dark: '#11865a', light: '#b5f5d8' },
  merah: { main: '#ff6b7f', dark: '#b8293f', light: '#ffc7cf' },
  ungu: { main: '#b38cff', dark: '#6e45c2', light: '#e3d6ff' },
  perak: { main: '#c9ced6', dark: '#7c8592', light: '#f1f3f6' },
}
export const colorHex = (c: Avatar['color']): string => HEX[c].main

/** Rupa dari berkas registrasi (atau masukan apa pun) → `Avatar` sah, atau null. Bidang asing ditolak, bukan dibuang. */
export function parseAvatar (input: unknown): Avatar | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const o = input as Record<string, unknown>
  const keys = Object.keys(o)
  if (keys.some((k) => !['v', 'head', 'eyes', 'body', 'tool', 'color'].includes(k))) return null
  if (o.v !== 1) return null
  for (const part of Object.keys(ROBOT_PARTS) as RobotPart[]) {
    if (!(ROBOT_PARTS[part] as readonly string[]).includes(String(o[part]))) return null
  }
  return { v: 1, head: o.head, eyes: o.eyes, body: o.body, tool: o.tool, color: o.color } as Avatar
}

/** Nama agen yang ditulis pemilik: dipangkas, 1–40 karakter, tanpa karakter kendali. */
export function cleanName (input: unknown): string | null {
  if (typeof input !== 'string') return null
  // eslint-disable-next-line no-control-regex
  const s = input.replace(/[\u0000-\u001f\u007f]/g, '').trim()
  return s.length >= 1 && s.length <= NAME_MAX ? s : null
}

export type RobotLive = { eyesOn: boolean, bulb: 'ok' | 'bad' | 'idle', chest?: string }

/**
 * SVG robot. `standalone` → elemen `<svg>` lengkap (untuk data URI / gambar); selain itu `<g>` untuk ditanam di panggung.
 * Ukuran kanvas 200 × 240. Tanpa teks dalam gambar statis (nama ada di berkas registrasi), supaya gambar di chain tetap
 * kecil dan tidak bergantung pada font.
 */
export function robotSvg (a: Avatar, opts: { live?: RobotLive, standalone?: boolean } = {}): string {
  const c = HEX[a.color]
  const live = opts.live
  const eyeFill = live ? (live.eyesOn ? '#7dffcf' : '#3a4048') : '#7dffcf'
  const bulb = live ? ({ ok: '#2bd98a', bad: '#ff6b7f', idle: '#f0b90b' })[live.bulb] : c.light
  const ink = '#14171c'

  const head = {
    kotak: `<rect x="52" y="34" width="96" height="76" rx="14" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
    kubah: `<path d="M52 110 V74 a48 44 0 0 1 96 0 V110 Z" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
    kapsul: `<rect x="44" y="40" width="112" height="66" rx="33" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
    segi: `<path d="M74 32 H126 L152 70 L126 110 H74 L48 70 Z" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
  }[a.head]
  const eyes = {
    bulat: `<circle cx="80" cy="72" r="11" fill="${ink}"/><circle cx="120" cy="72" r="11" fill="${ink}"/><circle class="r-eye" cx="80" cy="72" r="6" fill="${eyeFill}"/><circle class="r-eye" cx="120" cy="72" r="6" fill="${eyeFill}"/>`,
    visor: `<rect x="66" y="60" width="68" height="24" rx="12" fill="${ink}"/><rect class="r-eye" x="74" y="67" width="52" height="10" rx="5" fill="${eyeFill}"/>`,
    lensa: `<circle cx="84" cy="72" r="16" fill="${ink}" stroke="${c.light}" stroke-width="3"/><circle class="r-eye" cx="84" cy="72" r="8" fill="${eyeFill}"/><circle cx="122" cy="72" r="7" fill="${ink}"/><circle class="r-eye" cx="122" cy="72" r="3.5" fill="${eyeFill}"/>`,
    sipit: `<rect x="68" y="66" width="24" height="10" rx="5" fill="${ink}"/><rect x="108" y="66" width="24" height="10" rx="5" fill="${ink}"/><rect class="r-eye" x="72" y="69" width="16" height="4" rx="2" fill="${eyeFill}"/><rect class="r-eye" x="112" y="69" width="16" height="4" rx="2" fill="${eyeFill}"/>`,
  }[a.eyes]
  const mouth = `<rect x="86" y="92" width="28" height="5" rx="2.5" fill="${ink}" opacity="0.55"/>`
  const body = {
    kotak: `<rect x="58" y="124" width="84" height="70" rx="12" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
    tong: `<rect x="54" y="122" width="92" height="74" rx="30" fill="${c.main}" stroke="${c.dark}" stroke-width="4"/>`,
    trapesium: `<path d="M66 124 H134 L148 194 H52 Z" fill="${c.main}" stroke="${c.dark}" stroke-width="4" stroke-linejoin="round"/>`,
  }[a.body]
  const plate = `<rect x="74" y="140" width="52" height="30" rx="6" fill="${ink}" opacity="0.85"/>`
  const chest = live?.chest ? `<text x="100" y="160" text-anchor="middle" font-family="ui-monospace,monospace" font-size="11" font-weight="700" fill="${c.light}">${escapeXml(live.chest)}</text>` : `<rect x="82" y="152" width="36" height="6" rx="3" fill="${c.light}" opacity="0.6"/>`
  const neck = `<rect x="90" y="108" width="20" height="18" fill="${c.dark}"/>`
  const antenna = `<line x1="100" y1="34" x2="100" y2="14" stroke="${c.dark}" stroke-width="4" stroke-linecap="round"/><circle class="r-bulb" cx="100" cy="12" r="7" fill="${bulb}" stroke="${c.dark}" stroke-width="2"/>`
  const armL = `<path d="M58 140 Q36 156 40 180" fill="none" stroke="${c.dark}" stroke-width="8" stroke-linecap="round"/>`
  const armR = `<path d="M142 140 Q166 150 168 170" fill="none" stroke="${c.dark}" stroke-width="8" stroke-linecap="round"/>`
  const tool = {
    pena: `<g class="r-tool"><rect x="160" y="150" width="10" height="44" rx="3" transform="rotate(-24 165 172)" fill="#f6465d" stroke="#8e1d2e" stroke-width="2"/><path d="M176 190 l4 10 l-9 -4 z" fill="#f4f1ea"/></g>`,
    kaca: `<g class="r-tool"><circle cx="172" cy="160" r="14" fill="#cfe6ff" fill-opacity="0.35" stroke="#e9eef5" stroke-width="5"/><line x1="166" y1="172" x2="158" y2="190" stroke="#7c8592" stroke-width="6" stroke-linecap="round"/></g>`,
    stempel: `<g class="r-tool"><rect x="160" y="150" width="16" height="22" rx="4" fill="#7c4a2a"/><rect x="154" y="172" width="28" height="10" rx="3" fill="#f6465d"/></g>`,
  }[a.tool]
  const feet = `<rect x="66" y="196" width="26" height="12" rx="5" fill="${c.dark}"/><rect x="108" y="196" width="26" height="12" rx="5" fill="${c.dark}"/>`
  const g = `<g class="r-robot r-${a.head}">${antenna}${head}${eyes}${mouth}${neck}${armL}${body}${plate}${chest}${armR}${tool}${feet}</g>`
  return opts.standalone ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 240" width="200" height="240">${g}</svg>` : g
}

function escapeXml (s: string): string {
  return s.replace(/[<>&"']/g, (ch) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[ch] ?? ch)
}

/**
 * Berkas registrasi baru dari templat penerbit (yang menunjuk balik ke agen ini) + nama + rupa. Bidang lain templat tidak
 * disentuh: `registrations` (menunjuk balik), `description` (kalimat peran yang benar), `services`, `type`.
 */
export function withAvatar (template: Record<string, unknown>, name: string, avatar: Avatar, imageDataUri: string): Record<string, unknown> {
  return { ...template, name, image: imageDataUri, [AVATAR_KEY]: avatar }
}
