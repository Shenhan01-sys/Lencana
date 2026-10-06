// Lencana-B171 status=SELESAI 2026-10-06 — dokumen edge dibaca browser lewat DUA jalur sekaligus (proxy Vercel /edge/* dan workers.dev langsung), yang berhasil duluan dipakai; ISP yang memblokir *.workers.dev (DNS XL Axiata, 6 Okt) tidak lagi melumpuhkan verifier dan lembar sertifikat. Buktikan ulang: cd web && npx tsx scripts/probe.ts (grup B171) dan uji peramban T94. JANGAN dibalik/diulang tanpa membuka kembali baris B171 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `edge-fallback.ts` — jalur baca berlapis untuk dokumen di host edge (B171).
 *
 * Masalah (terukur 6 Okt): DNS XL Axiata mengalihkan SEMUA `*.workers.dev` ke `blockpage.xlaxiata.id` (nama acak pun), sedangkan `vercel.app`,
 * `up.railway.app`, dan RPC lolos. Browser pengguna di ISP itu tidak bisa mengambil dokumen kredensial dari host edge, jadi lembar sertifikat dan
 * audit spesifikasi gagal walau edge-nya sehat.
 *
 * Perbaikan: setiap GET ke `CREDENTIAL_HOST` ditembakkan SERENTAK ke (1) proxy same-origin `/edge/<path>` (aturan `rewrites` di `vercel.json`) dan (2) host
 * edge langsung; jawaban pertama yang BERGUNA menang dan yang lain dibatalkan. Berguna = 2xx dan bukan HTML (di dev, `/edge/…` jatuh ke `index.html`
 * SPA dan tidak boleh dikira dokumen). Bila tidak ada yang berguna: jawaban HTTP nyata (mis. 404 "tidak tersaji") dikembalikan apa adanya; bila murni gagal
 * jaringan, dilempar `TypeError` dengan petunjuk yang menyebut kemungkinan blokir ISP — bukan "Failed to fetch" yang tidak memberi arah.
 *
 * Yang TIDAK diubah: dokumen bertanda tangan menyebut `id` di host edge (tidak bisa diganti tanpa menerbitkan ulang), integritasnya tetap dari tanda tangan
 * dan chain, bukan dari jalur yang dipakai membacanya. Permintaan non-GET dan ke host lain lewat tanpa disentuh.
 */
import { CREDENTIAL_HOST } from './hosts'

export const EDGE_PROXY_PREFIX = '/edge'
/** Batas tiap jalur; tanpa ini host yang diblokir DNS bisa menggantung sampai batas waktu peramban. */
export const EDGE_ATTEMPT_TIMEOUT_MS = 15_000

export const EDGE_UNREACHABLE_HINT = 'Host dokumen tidak terjangkau dari jaringan ini (kemungkinan diblokir ISP atau DNS). Coba lagi, ganti DNS (mis. 1.1.1.1) atau jaringan, atau nyalakan VPN/WARP.'

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>
export type EdgeDeps = { fetch: FetchLike, origin: string | null, host?: string, timeoutMs?: number }

const urlOf = (input: RequestInfo | URL): string => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url)
const methodOf = (input: RequestInfo | URL, init?: RequestInit): string => (init?.method ?? (typeof input === 'object' && 'method' in input ? input.method : 'GET')).toUpperCase()

/** Path (+ query) di host edge bila permintaan ini GET ke host edge, atau `null` (tidak disentuh). */
export function edgePathOf (input: RequestInfo | URL, init?: RequestInit, host: string = CREDENTIAL_HOST): string | null {
  if (methodOf(input, init) !== 'GET') return null
  const u = urlOf(input)
  if (!u.startsWith(`${host}/`)) return null
  return u.slice(host.length)
}

const isHtml = (r: Response) => /text\/html/i.test(r.headers.get('content-type') ?? '')
/** Berguna = 2xx dan bukan HTML. */
export const usable = (r: Response): boolean => r.ok && !isHtml(r)

class Unusable extends Error { constructor (public response: Response) { super(`HTTP ${response.status}`) } }

/**
 * Baca satu path edge lewat dua jalur serentak. Mengembalikan `Response` yang berguna; atau jawaban HTTP nyata bila tidak ada yang berguna;
 * atau melempar `TypeError(EDGE_UNREACHABLE_HINT + …)` bila kedua jalur gagal di jaringan.
 */
export async function edgeFetch (path: string, init: RequestInit | undefined, deps: EdgeDeps): Promise<Response> {
  const host = deps.host ?? CREDENTIAL_HOST
  const urls = [...(deps.origin ? [`${deps.origin}${EDGE_PROXY_PREFIX}${path}`] : []), `${host}${path}`]
  const timeoutMs = deps.timeoutMs ?? EDGE_ATTEMPT_TIMEOUT_MS
  const ctrls = urls.map(() => new AbortController())
  const timers = ctrls.map((c) => setTimeout(() => c.abort(), timeoutMs))
  const callerSignal = init?.signal
  const onCallerAbort = () => ctrls.forEach((c) => c.abort())
  if (callerSignal) { if (callerSignal.aborted) onCallerAbort(); else callerSignal.addEventListener('abort', onCallerAbort, { once: true }) }
  const cleanup = () => { timers.forEach(clearTimeout); callerSignal?.removeEventListener('abort', onCallerAbort) }

  const attempts = urls.map((u, i) => deps.fetch(u, { ...init, signal: ctrls[i]!.signal }).then(
    (r) => (usable(r) ? { i, r } : Promise.reject(new Unusable(r))),
  ))
  try {
    const win = await new Promise<{ i: number, r: Response }>((resolve, reject) => {
      let left = attempts.length
      const errors: unknown[] = []
      attempts.forEach((a) => a.then(resolve, (e: unknown) => { errors.push(e); if (--left === 0) reject(errors) }))
    })
    ctrls.forEach((c, j) => { if (j !== win.i) c.abort() })
    return win.r
  } catch (errs) {
    const list = Array.isArray(errs) ? errs as unknown[] : [errs]
    // HTTP nyata (404 "tidak tersaji", 5xx) lebih informatif daripada "jaringan gagal"; HTML 200 (SPA dev) bukan jawaban.
    const real = list.filter((e): e is Unusable => e instanceof Unusable && !(e.response.ok && isHtml(e.response)))
    const pick = real.find((e) => e.response.status < 500) ?? real[0]
    if (pick) return pick.response
    const first = list.find((e) => !(e instanceof Unusable)) as Error | undefined
    throw new TypeError(`${EDGE_UNREACHABLE_HINT}${first?.message ? ` (${first.message})` : ''}`)
  } finally {
    cleanup()
  }
}

/** Membungkus `window.fetch` sekali: GET ke host edge lewat `edgeFetch`, selebihnya tidak disentuh. Dipasang sebelum pita pemuatan supaya terhitung satu permintaan. */
export function installEdgeFallback (win: { fetch: FetchLike, location?: { origin?: string } & object, __edgeFallback?: boolean } = window as never): void {
  if (win.__edgeFallback) return
  win.__edgeFallback = true
  const real = win.fetch.bind(win)
  const origin = typeof win.location?.origin === 'string' && /^https?:/.test(win.location.origin) ? win.location.origin : null
  win.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const path = edgePathOf(input, init)
    return path === null ? real(input, init) : edgeFetch(path, init, { fetch: real, origin })
  }
}
