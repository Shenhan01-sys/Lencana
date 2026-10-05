/**
 * `certificate.ts` — lembar sertifikat Lencana (B165), bagian murninya: tanpa DOM, tanpa jaringan.
 *
 * Lembar ini adalah desain S3 ("Kaca Segitiga", vault `03-Frontend/Sertifikat`) yang diberi data NYATA dari dokumen
 * kredensial publik di host tepi. Aturannya diwarisi dari desain itu:
 *  - isian yang tidak ada di dokumen TIDAK ditampilkan (bukan dikarang): nilai per komponen tidak ada di dokumen yang
 *    tertanda tangan, jadi cincin dalam hanya menggambarkan BOBOT dari kriteria;
 *  - status keberlakuan tidak ditulis sebagai klaim di lembar — hanya "dibaca dari chain pada <tanggal>" dan QR ke
 *    verifier; kredensial yang tidak BERLAKU tampil dengan penanda statusnya;
 *  - nama yang diketik pengguna tidak diverifikasi dan tidak ikut tanda tangan; alamat dompet tetap tampil.
 *
 * Berkas ini diuji `npm run probe` (grup B165) di Node, jadi tidak boleh menyentuh `document`/`window`.
 */
// Lencana-B165 status=SELESAI 2026-10-05 — lembar sertifikat dari dokumen kredensial nyata: pemetaan dokumen → lembar, geometri kristal dan cincin dari byte hash, QR, nama penerima. Buktikan ulang: cd web && npm run probe (grup B165). JANGAN dibalik/diulang tanpa membuka kembali baris B165 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { isAddress } from 'viem/utils'
import { LOGO } from './certificate-logo'

export type Hex = `0x${string}`
export type Address = `0x${string}`

// ------------------------------------------------------------------ status

export type StatusVerdict = 'BERLAKU' | 'DICABUT' | 'KEDALUWARSA' | 'PENERBIT DITARIK' | 'TIDAK DIKENAL' | 'BELUM TERBACA'
export type StatusRead = { verdict: StatusVerdict, readOn: string }

/** Satu-satunya pemetaan `statusOf` → kata status; sama urutannya dengan daftar kredensial (revoked lebih dulu dari expired). */
export function statusVerdict (exists: boolean, revoked: boolean, expired: boolean, delisted: boolean): StatusVerdict {
  return !exists ? 'TIDAK DIKENAL' : revoked ? 'DICABUT' : expired ? 'KEDALUWARSA' : delisted ? 'PENERBIT DITARIK' : 'BERLAKU'
}

// ------------------------------------------------------------------ dokumen publik

export type ParsedCredential = {
  id: string
  title: string
  learner: Address
  courseId: string | null
  issuerAgent: string
  validFrom: string
  validUntil: string
  score: number | null
  proof: { type: string, suite: string } | null
  format: string
  narrative: string | null
}

const isoOk = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(s) && !Number.isNaN(Date.parse(s))
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const rec = (v: unknown): Record<string, unknown> | null => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : null)
const lastSegment = (url: unknown): string | null => {
  const s = str(url)
  if (!s) return null
  const seg = s.split('#')[0]!.split('?')[0]!.replace(/\/+$/, '').split('/').pop() ?? ''
  try { return decodeURIComponent(seg) || null } catch { return null }
}
/** Slug kursus yang aman dipakai di URL tepi: huruf kecil, angka, tanda hubung. */
export const isCourseSlug = (s: unknown): s is string => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,80}$/.test(s)
export const isCredentialHash = (s: unknown): s is Hex => typeof s === 'string' && /^0x[0-9a-fA-F]{64}$/.test(s)

/**
 * Dokumen `GET /credentials/<hash>` (OpenBadgeCredential 3.0) → bidang yang dipakai lembar. `null` bila bentuknya tidak
 * cukup untuk membuat lembar jujur: butuh judul, alamat peserta yang sah, dan dua tanggal yang terbaca.
 */
export function parseCredentialDoc (raw: unknown): ParsedCredential | null {
  const d = rec(raw)
  if (!d) return null
  const subject = rec(d.credentialSubject)
  const ach = rec(subject?.achievement)
  const title = str(d.name) ?? str(ach?.name)
  const learner = lastSegment(subject?.id)
  if (!title || !learner || !isAddress(learner) || !isoOk(d.validFrom) || !isoOk(d.validUntil)) return null
  const results = Array.isArray(subject?.result) ? subject.result as unknown[] : []
  const rawScore = rec(results[0])?.value
  const score = typeof rawScore === 'string' || typeof rawScore === 'number' ? Number(rawScore) : NaN
  const proof = rec(d.proof)
  const types = Array.isArray(d.type) ? d.type : []
  const crit = rec(ach?.criteria)
  const courseId = lastSegment(ach?.id) ?? lastSegment(crit?.id)
  return {
    id: str(d.id) ?? '',
    title,
    learner: learner as Address,
    courseId: isCourseSlug(courseId) ? courseId : null,
    issuerAgent: str(rec(d.issuer)?.name) ?? '',
    validFrom: d.validFrom,
    validUntil: d.validUntil,
    score: Number.isFinite(score) && score >= 0 && score <= 100 ? score : null,
    proof: str(proof?.type) && str(proof?.cryptosuite) ? { type: str(proof?.type)!, suite: str(proof?.cryptosuite)! } : null,
    format: types.includes('OpenBadgeCredential') ? 'Open Badges 3.0' : 'Verifiable Credential',
    narrative: str(crit?.narrative),
  }
}

export type CertComponent = { key: string, label: string, weight: number }
export type ParsedCriteria = { publisher: string | null, passMark: number | null, weights: CertComponent[], narrative: string | null }

const COMPONENT_ORDER = ['kuis', 'esai', 'praktik']
const COMPONENT_LABEL: Record<string, string> = { kuis: 'Kuis', esai: 'Esai', praktik: 'Praktik' }

/** Dokumen `GET /criteria/<kursus>`: bobot dan batas lulus milik penerbit (bukan platform), nama penerbit. */
export function parseCriteria (raw: unknown): ParsedCriteria | null {
  const d = rec(raw)
  if (!d) return null
  const policy = rec(d.policy)
  const w = rec(policy?.weights) ?? {}
  // Kunci bobot menjadi label di SVG: hanya huruf, angka, garis — sisanya dibuang (dokumen berasal dari host tepi, tetapi
  // label tidak boleh membawa markup apa pun).
  const weights: CertComponent[] = Object.entries(w)
    .filter(([k, v]) => /^[A-Za-z0-9_-]{1,24}$/.test(k) && typeof v === 'number' && Number.isFinite(v) && v > 0)
    .map(([key, v]) => ({ key, label: COMPONENT_LABEL[key] ?? (key.charAt(0).toUpperCase() + key.slice(1)), weight: v as number }))
    .sort((a, b) => {
      const ia = COMPONENT_ORDER.indexOf(a.key), ib = COMPONENT_ORDER.indexOf(b.key)
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.key.localeCompare(b.key)
    })
  const pass = policy?.passMark ?? rec(d.scale)?.passingScore
  return {
    publisher: str(rec(d.issuer)?.name),
    passMark: typeof pass === 'number' && Number.isFinite(pass) && pass >= 0 && pass <= 100 ? pass : null,
    weights,
    narrative: str(d.narrative),
  }
}

/** "Yayasan X (institusi demo, fiktif)" → nama + catatan dalam kurung; tanpa kurung → catatan `null`. */
export function splitPublisher (name: string | null): { name: string | null, note: string | null } {
  if (!name) return { name: null, note: null }
  const m = /^(.*?)\s*\(([^()]*)\)\s*$/.exec(name)
  return m && m[1] ? { name: m[1].trim(), note: m[2]!.trim() || null } : { name: name.trim(), note: null }
}

const GENERIC_LIMIT = 'Menyatakan hasil kelas ini menurut kriteria yang tertanda tangan penerbit — bukan ijazah.'

/**
 * Kalimat batas klaim di kaki lembar: kalimat TERAKHIR narasi kriteria (yang tertanda tangan), apa adanya, bila ia
 * memuat "bukan"; kalau tidak ada, kalimat umum di atas. Tidak ditulis ulang supaya klaimnya tetap milik penerbit.
 */
export function limitLine (narrative: string | null): string {
  if (!narrative) return GENERIC_LIMIT
  const sentences = narrative.replace(/\[[^\]]*\]/g, '').trim().split(/(?<=\.)\s+/).filter(Boolean)
  const last = sentences[sentences.length - 1] ?? ''
  return /\bbukan\b/i.test(last) && last.length <= 240 ? last : GENERIC_LIMIT
}

// ------------------------------------------------------------------ data lembar

export type CertificateData = {
  hash: Hex
  learner: Address
  title: string
  courseId: string | null
  publisher: string | null
  publisherNote: string | null
  issuerAgent: string
  score: number | null
  passMark: number | null
  passed: boolean
  components: CertComponent[]
  issuedAt: string
  validUntil: string
  validDays: number
  proof: string | null
  format: string
  verifyUrl: string
  verifyUrlShort: string
  limit: string
  demo: string
  status: StatusRead
  statusNote: string
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const p2 = (n: number) => String(n).padStart(2, '0')
/** Jam dinding WIB dari instan ISO: geser +7 jam lalu baca bidang UTC. */
const wib = (iso: string) => new Date(new Date(iso).getTime() + 7 * 3600e3)
const MON3 = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const idDate = (iso: string): string => { const d = wib(iso); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
/** Tanggal pendek ("5 Okt 2026") untuk kaki lembar yang sempit. */
export const idDateShort = (iso: string): string => { const d = wib(iso); return `${d.getUTCDate()} ${MON3[d.getUTCMonth()]} ${d.getUTCFullYear()}` }
export const idTime = (iso: string): string => { const d = wib(iso); return `${p2(d.getUTCHours())}.${p2(d.getUTCMinutes())} WIB` }
export const mid = (s: string, a: number, b: number): string => s.slice(0, a) + '…' + s.slice(-b)
export const addressGroups = (addr: string): string => (addr.slice(2).match(/.{1,4}/g) ?? []).join(' ')

export function statusNoteFor (status: StatusRead): string {
  if (status.verdict === 'BELUM TERBACA') return 'Status belum terbaca dari chain; pindai QR untuk status terkini.'
  const on = idDateShort(status.readOn)
  return status.verdict === 'BERLAKU'
    ? `Status dibaca dari chain pada ${on}; pindai QR untuk status terkini.`
    : `Status dibaca dari chain pada ${on} (${status.verdict}); pindai QR untuk status terkini.`
}

/**
 * Menyusun data lembar dari dokumen kredensial + kriteria (boleh `null`: lembar tetap jujur, hanya tanpa penerbit dan
 * bobot) + status yang baru dibaca dari chain. `appHost` = asal halaman verifier tempat QR menuju.
 */
export function buildCertificate (input: {
  hash: Hex
  cred: ParsedCredential
  criteria: ParsedCriteria | null
  status: StatusRead
  appHost: string
  testnet: boolean
}): CertificateData {
  const { cred, criteria, status, hash } = input
  const pub = splitPublisher(criteria?.publisher ?? null)
  const days = Math.max(1, Math.round((Date.parse(cred.validUntil) - Date.parse(cred.validFrom)) / 86400e3))
  const passMark = criteria?.passMark ?? null
  const verifyUrl = `${input.appHost.replace(/\/+$/, '')}/?q=${hash}#/verify`
  const demo = [pub.note && /demo|fiktif/i.test(pub.note) ? 'Penerbit demo (fiktif)' : null, input.testnet ? 'jaringan uji' : null, 'bukan ijazah']
    .filter(Boolean).join(' · ')
  return {
    hash,
    learner: cred.learner,
    title: cred.title,
    courseId: cred.courseId,
    publisher: pub.name,
    publisherNote: pub.note,
    issuerAgent: cred.issuerAgent,
    score: cred.score,
    passMark,
    passed: cred.score !== null && passMark !== null && cred.score >= passMark,
    components: criteria?.weights ?? [],
    issuedAt: cred.validFrom,
    validUntil: cred.validUntil,
    validDays: days,
    proof: cred.proof ? `${cred.proof.type} · ${cred.proof.suite}` : null,
    format: cred.format,
    verifyUrl,
    verifyUrlShort: `${verifyUrl.replace(/^https?:\/\//, '').split('?')[0]}?q=${hash.slice(0, 10)}…#/verify`,
    limit: limitLine(criteria?.narrative ?? cred.narrative),
    demo,
    status,
    statusNote: statusNoteFor(status),
  }
}

// ------------------------------------------------------------------ penerima: alamat atau nama

export type Recipient = { mode: 'alamat' | 'nama', name: string }
export const NAME_MAX = 60

/**
 * Nama yang dipakai lembar: tab dan baris baru menjadi spasi (tempelan dua baris tidak boleh merapat jadi satu kata),
 * karakter kontrol lain dibuang, spasi dirapatkan, paling banyak 60 karakter. Selalu diperlakukan sebagai TEKS — penulisnya
 * memakai `textContent`, bukan HTML.
 */
export function cleanName (s: unknown): string {
  return String(s ?? '').replace(/[\t\n\r\v\f]/g, ' ').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX)
}
/** "nama" hanya berlaku bila namanya tidak kosong — baris utama lembar tidak pernah kosong (alamat tampil sebagai gantinya). */
export const effectiveMode = (r: Recipient): 'alamat' | 'nama' => (r.mode === 'nama' && cleanName(r.name) ? 'nama' : 'alamat')

const recipientKey = (addr: string) => `lencana.sertifikat.penerima:${addr.toLowerCase()}`
/** Pilihan terakhir untuk alamat ini, dari `localStorage` bila ada; tanpa penyimpanan pun jalan. Nama tidak pernah dikirim ke mana pun. */
export function loadRecipient (addr: string, store: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Recipient {
  try {
    const v = JSON.parse(store?.getItem(recipientKey(addr)) ?? 'null') as { mode?: unknown, name?: unknown } | null
    if (v && (v.mode === 'alamat' || v.mode === 'nama')) return { mode: v.mode, name: typeof v.name === 'string' ? v.name.slice(0, NAME_MAX) : '' }
  } catch { /* penyimpanan rusak atau tidak ada */ }
  return { mode: 'alamat', name: '' }
}
export function saveRecipient (addr: string, r: Recipient, store: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): void {
  try { store?.setItem(recipientKey(addr), JSON.stringify({ mode: r.mode, name: r.name })) } catch { /* tanpa penyimpanan: pilihan berlaku untuk sesi ini saja */ }
}

// ------------------------------------------------------------------ latar cetak (B167)

/**
 * Latar kertas SAAT DICETAK: `gelap` (seperti di layar, bawaan) atau `terang` (hemat tinta). Hanya berlaku di media `print` —
 * di layar lembar dan penampilnya selalu gelap. Pilihan ini khusus lembar sertifikat, bukan tema aplikasi (Lencana selalu gelap).
 */
export type Paper = 'gelap' | 'terang'
const paperKey = (addr: string) => `lencana.sertifikat.latar:${addr.toLowerCase()}`
export function loadPaper (addr: string, store: Pick<Storage, 'getItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): Paper {
  try { return store?.getItem(paperKey(addr)) === 'terang' ? 'terang' : 'gelap' } catch { return 'gelap' }
}
export function savePaper (addr: string, paper: Paper, store: Pick<Storage, 'setItem'> | null = typeof localStorage === 'undefined' ? null : localStorage): void {
  try { store?.setItem(paperKey(addr), paper === 'terang' ? 'terang' : 'gelap') } catch { /* tanpa penyimpanan: pilihan berlaku untuk sesi ini saja */ }
}

// ------------------------------------------------------------------ lambang (QR ada di `certificate-qr.ts` sejak B168)

export const logoSvgInner = (): string => `<path d="${LOGO.gold}" fill="var(--logo-a,#f0b90b)"/><path d="${LOGO.black}" fill="var(--logo-b,#0b0e11)"/>`
export const LOGO_VIEWBOX = `0 0 ${LOGO.w} ${LOGO.h}`

// ------------------------------------------------------------------ jejak hash

/** Geometri turunan hash kredensial: nilai sama → gambar sama; kredensial lain → gambar lain. */
export function hashBytes (hash: string): Uint8Array {
  return Uint8Array.from((hash.slice(2).match(/../g) ?? []).map((h) => parseInt(h, 16)))
}
export function hashArt (bytes: Uint8Array) {
  const n = bytes.length || 1
  const byteAt = (i: number) => bytes[((i % n) + n) % n] ?? 0
  /** PRNG deterministik (mulberry32); bibitnya 4 byte hash mulai offset `from`. */
  const rng = (from = 0) => {
    let a = ((byteAt(from) << 24) | (byteAt(from + 1) << 16) | (byteAt(from + 2) << 8) | byteAt(from + 3)) >>> 0
    return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  }
  return { byteAt, rng }
}

type RGB = [number, number, number]
type P3 = [number, number, number]

const W = 1122
const H = 793
const ORIGIN = [900, 262]
const STOPS: [number, RGB][] = [[0, [18, 20, 25]], [0.35, [27, 31, 37]], [0.6, [43, 49, 58]], [0.76, [54, 56, 55]], [0.85, [92, 72, 10]], [0.91, [138, 106, 0]],
  [0.97, [217, 158, 0]], [1.02, [240, 185, 11]], [1.1, [252, 213, 53]], [1.2, [255, 241, 190]]]
/** Zona bebas-facet di belakang teks (judul, penerima — termasuk nama terpanjang —, kelas): teks kecil tidak pernah duduk di atas kristal. */
const KEEP = [[52, 104, 660, 292], [52, 286, 696, 446], [52, 440, 690, 512]]
const inKeep = (x: number, y: number) => KEEP.some((r) => x > r[0]! - 18 && x < r[2]! + 18 && y > r[1]! - 18 && y < r[3]! + 18)
const mixc = (c1: RGB, c2: RGB, k: number): RGB => [c1[0] + (c2[0] - c1[0]) * k, c1[1] + (c2[1] - c1[1]) * k, c1[2] + (c2[2] - c1[2]) * k]
const ramp = (t: number): RGB => {
  if (t <= STOPS[0]![0]) return STOPS[0]![1]
  for (let i = 1; i < STOPS.length; i++) if (t <= STOPS[i]![0]) return mixc(STOPS[i - 1]![1], STOPS[i]![1], (t - STOPS[i - 1]![0]) / (STOPS[i]![0] - STOPS[i - 1]![0]))
  return STOPS[STOPS.length - 1]![1]
}
const VEIN: RGB = [240, 185, 11]
const WARM: RGB = [255, 236, 170]
const DEEP: RGB = [4, 5, 7]
const LIGHT = (() => { const v = [-0.48, -0.7, 0.9]; const n = Math.hypot(v[0]!, v[1]!, v[2]!); return v.map((x) => x / n) as [number, number, number] })()
const rgb = (c: RGB) => 'rgb(' + c.map((v) => Math.max(0, Math.min(255, Math.round(v)))).join(',') + ')'
type Cluster = { id: 'tr' | 'bl', cx: number, cy: number, rx: number, ry: number, x0: number, y0: number, x1: number, y1: number, cell: number, seed: number, hz: number }
const CLUSTERS: Cluster[] = [
  { id: 'tr', cx: W, cy: 0, rx: 545, ry: 660, x0: 470, y0: -70, x1: W + 70, y1: 780, cell: 58, seed: 0, hz: 34 },
  { id: 'bl', cx: 0, cy: H, rx: 310, ry: 250, x0: -70, y0: 500, x1: 380, y1: H + 70, cell: 52, seed: 16, hz: 30 },
]

/**
 * Medan facet kristal: kisi bergetar → segitiga; tinggi tiap titik = byte hash, cahaya dari kiri atas. Palet FE:
 * arang di inti → amber → emas di tepi. Keluarannya potongan `<polygon>` untuk empat lapis SVG (`tr`, `bl`, `front`,
 * dan tiga lapis kilau `g`).
 */
export function facets (bytes: Uint8Array): { tr: string[], bl: string[], front: string[], g: [string[], string[], string[]] } {
  const HA = hashArt(bytes)
  const out = { tr: [] as string[], bl: [] as string[], front: [] as string[], g: [[], [], []] as [string[], string[], string[]] }
  const facet = (o: Cluster, t: P3[], idx: number) => {
    const cx = (t[0]![0] + t[1]![0] + t[2]![0]) / 3, cy = (t[0]![1] + t[1]![1] + t[2]![1]) / 3
    const f = Math.hypot((cx - o.cx) / o.rx, (cy - o.cy) / o.ry)
    const by = HA.byteAt(idx * 7 + (idx >> 5) * 11), by2 = HA.byteAt(idx * 5 + 3 + (idx >> 5) * 5)
    const thr = 0.86 + 0.16 * (by2 / 255)
    let kind: 'core' | 'shard'
    if (f < thr) kind = 'core'
    else if (f < thr + 0.16 && by > 196) kind = 'shard'
    else return
    if (t.some((p) => inKeep(p[0], p[1])) || inKeep(cx, cy)) return
    const u = [t[1]![0] - t[0]![0], t[1]![1] - t[0]![1], t[1]![2] - t[0]![2]] as P3
    const v = [t[2]![0] - t[0]![0], t[2]![1] - t[0]![1], t[2]![2] - t[0]![2]] as P3
    let nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0]
    if (nz < 0) { nx = -nx; ny = -ny; nz = -nz }
    const s = (nx * LIGHT[0] + ny * LIGHT[1] + nz * LIGHT[2]) / (Math.hypot(nx, ny, nz) || 1)
    let col = ramp(f)
    if (by % 13 === 0 && f > 0.3 && f < 0.8) col = mixc(col, VEIN, 0.32) // urat emas: hanya byte hash kelipatan 13
    const k = (s - 0.85) * 1.7 + (by / 255 - 0.5) * 0.1
    col = k > 0 ? mixc(col, WARM, Math.min(0.34, k)) : mixc(col, DEEP, Math.min(0.4, -k))
    let pts: [number, number, number][] | [number, number][] = t
    let op = 1
    if (kind === 'shard') {
      pts = t.map((p) => [cx + (p[0] - cx) * 0.66, cy + (p[1] - cy) * 0.66] as [number, number])
      op = 0.5 + 0.28 * (by2 / 255)
      col = mixc(ramp(0.8 + 0.26 * (by / 255)), WARM, Math.max(0, k) * 0.4)
    } else if (f > thr - 0.1) op = 0.88
    const dly = Math.round(Math.hypot(cx - ORIGIN[0]!, cy - ORIGIN[1]!) / 30) * 32
    const ps = (pts as number[][]).map((p) => p[0]!.toFixed(1) + ',' + p[1]!.toFixed(1)).join(' ')
    const c = rgb(col)
    const el = `<polygon class="f" points="${ps}" fill="${c}"` + (op < 1 ? ` fill-opacity="${op.toFixed(2)}"` : ` stroke="${c}" stroke-width=".7" stroke-linejoin="round"`) + ` style="--d:${dly}ms"/>`
    ;(kind === 'shard' ? out.front : out[o.id]).push(el)
    if (kind === 'core' && o.id === 'tr' && f >= 0.35 && (s > 0.96 || by > 226)) out.g[idx % 3]!.push(`<polygon points="${ps}"/>`)
  }
  let n = 0
  for (const o of CLUSTERS) {
    const rnd = HA.rng(o.seed)
    const cols = Math.ceil((o.x1 - o.x0) / o.cell) + 1, rows = Math.ceil((o.y1 - o.y0) / o.cell) + 1
    const P: P3[][] = []
    for (let j = 0; j < rows; j++) {
      const row: P3[] = []
      for (let i = 0; i < cols; i++) {
        const jx = (rnd() - 0.5) * o.cell * 0.64, jy = (rnd() - 0.5) * o.cell * 0.64
        row.push([o.x0 + i * o.cell + jx, o.y0 + j * o.cell + jy, HA.byteAt(i * 7 + j * 13 + o.seed) / 255 * o.hz])
      }
      P.push(row)
    }
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = P[j]![i]!, b = P[j]![i + 1]!, c = P[j + 1]![i]!, d = P[j + 1]![i + 1]!
        const d1 = (a[0] - d[0]) ** 2 + (a[1] - d[1]) ** 2, d2 = (b[0] - c[0]) ** 2 + (b[1] - c[1]) ** 2
        const tris: P3[][] = d1 < d2 ? [[a, b, d], [a, d, c]] : [[a, b, c], [b, d, c]]
        for (const t of tris) facet(o, t, n++)
      }
    }
  }
  return out
}

// ------------------------------------------------------------------ cincin nilai

const escXml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
const R = 160
const RC = 118
const G = 0.007
const ang = (f: number) => (f * 360 - 90) * Math.PI / 180
const P2 = (r: number, f: number): [number, number] => [r * Math.cos(ang(f)), r * Math.sin(ang(f))]
const fx = (v: number) => v.toFixed(2)
const arc = (r: number, f0: number, f1: number, ccw = false) => {
  const s = P2(r, ccw ? f1 : f0), e = P2(r, ccw ? f0 : f1)
  return `M${fx(s[0])} ${fx(s[1])}A${r} ${r} 0 ${f1 - f0 > 0.5 ? 1 : 0} ${ccw ? 0 : 1} ${fx(e[0])} ${fx(e[1])}`
}
/** Kuis (bobot terbesar) paling terang dan tebal → komponen berikutnya makin redup dan tipis: terbaca tanpa membaca warna. */
const COMP: [string, number][] = [['#fcd535', 8], ['#f0b90b', 6], ['#b38600', 4.5]]

/**
 * Cincin di dalam medali: busur luar emas = nilai akhir (mulai pukul 12, searah jarum jam) dengan takik di batas lulus;
 * cincin dalam = komposisi bobot dari kriteria (panjang busur sebanding bobot). Nilai per komponen TIDAK digambar:
 * ia tidak ada di dokumen kredensial yang tertanda tangan. Nilai atau batas lulus yang tidak diketahui → bagian itu
 * tidak digambar.
 */
export function dialSvg (score: number | null, passMark: number | null, components: CertComponent[]): string {
  let svg = `<defs>
    <linearGradient id="s3-arcg" gradientUnits="userSpaceOnUse" x1="120" y1="-170" x2="-120" y2="170"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#fcd535"/><stop offset="1" stop-color="#f0b90b"/></linearGradient>`
  if (passMark !== null) svg += `
    <mask id="s3-notchm" maskUnits="userSpaceOnUse" x="-180" y="-180" width="360" height="360"><rect x="-180" y="-180" width="360" height="360" fill="#fff"/><rect x="-4" y="${-R - 16}" width="8" height="32" fill="#000" transform="rotate(${fx(passMark / 100 * 360)})"/></mask>`
  svg += '\n  </defs>'
  const mask = passMark !== null ? ' mask="url(#s3-notchm)"' : ''
  svg += `<g class="s3-trk"${mask}><circle r="${R}" fill="none" stroke="#000000" stroke-opacity=".45" stroke-width="13"/><circle r="${R}" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="9"/></g>`
  if (score !== null) {
    const sc = score / 100, lenA = 2 * Math.PI * R * sc
    svg += `<g${mask}><path class="s3-arc" d="${arc(R, 0, Math.max(sc, 0.001))}" fill="none" stroke="url(#s3-arcg)" stroke-width="9" stroke-linecap="round" style="--len:${fx(lenA)}px;stroke-dasharray:${fx(lenA)} ${fx(lenA + 40)}"/></g>`
  }
  if (passMark !== null) {
    const pm = passMark / 100, pp = P2(R + 42, pm)
    svg += `<g transform="rotate(${fx(pm * 360)})"><polygon class="s3-notch" points="0,${-R - 8} -8,${-R - 24} 8,${-R - 24}" fill="#ffffff" stroke="#0b0e11" stroke-opacity=".6" stroke-width="1"/></g>`
    svg += `<g transform="translate(${fx(pp[0])} ${fx(pp[1])})"><g class="s3-pillg"><rect class="s3-pillbg" x="-30" y="-11" width="60" height="22" rx="11"/><text class="s3-pilltxt" text-anchor="middle" dy="3.8">batas ${passMark}</text></g></g>`
  }
  if (score !== null) {
    const sc = score / 100
    svg += `<g transform="rotate(${fx(sc * 360)})"><g class="s3-tick"><line x1="0" y1="${-R + 13}" x2="0" y2="${-R - 13}" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/><circle cx="0" cy="${-R}" r="6.5" fill="#ffffff" stroke="#0b0e11" stroke-opacity=".5" stroke-width="1.5"/></g></g>`
  }
  const total = components.reduce((a, c) => a + c.weight, 0)
  let f0 = 0.25
  components.forEach((c, i) => {
    const span = c.weight / (total || 1), a0 = f0 + G, a1 = f0 + span - G
    if (a1 <= a0) { f0 += span; return }
    const st = COMP[i % 3]!, Lc = 2 * Math.PI * RC * (a1 - a0)
    svg += `<path class="s3-cf" d="${arc(RC, a0, a1)}" fill="none" stroke="${st[0]}" stroke-width="${st[1]}" stroke-linecap="round" style="--len:${fx(Lc)}px;--cd:${1150 + i * 120}ms;stroke-dasharray:${fx(Lc)} ${fx(Lc + 30)}"/>`
    const mid = f0 + span / 2, bottom = Math.sin(ang(mid)) > 0.2, rr = bottom ? RC - 11 : RC - 15, half = Math.min(span / 2 - 2 * G, 0.16)
    svg += `<path id="s3-lp${i}" d="${arc(rr, mid - half, mid + half, bottom)}" fill="none"/>`
    svg += `<text class="s3-lab"><textPath href="#s3-lp${i}" startOffset="50%" text-anchor="middle">${escXml(c.label)} ${Number(c.weight)}%</textPath></text>`
    f0 += span
  })
  return svg
}

/** Teks label komponen untuk pembaca layar (cincin dalam tidak terbaca sebagai teks). */
export const componentSummary = (components: CertComponent[]): string[] => components.map((c) => `${c.label}: bobot ${c.weight}%`)
