/**
 * `credentials.ts` — lapisan data "Kredensial saya" dan lembar sertifikat (B165): membaca chain (daftar, status,
 * artefak soulbound) dan dokumen publik di host tepi. Tanpa DOM, jadi `npm run probe` menguji jalur utuhnya di Node.
 *
 * Tiga aturan yang dijaga di sini, bukan di tampilan:
 *  - "kosong" ≠ "gagal baca": daftar kosong dari RPC yang gagal tidak pernah tampil sebagai "belum punya kredensial";
 *  - dokumen yang tidak tersaji (404) ≠ dokumen yang gagal diambil (jaringan/5xx) — keduanya dilaporkan terpisah;
 *  - lembar hanya dibuat untuk kredensial MILIK akun yang masuk: hash ada di `credentialsOf(alamat)` dan alamat
 *    peserta di dokumen sama dengan alamat itu. Tanpa ini siapa pun bisa mencetak lembar atas nama orang lain.
 */
// Lencana-B165 status=SELESAI 2026-10-05 — daftar kredensial peserta (chain + dokumen publik) dan pemuat lembar sertifikat; kepemilikan diperiksa dua arah dan "kosong"/"tidak tersaji" dibedakan dari "gagal". Buktikan ulang: cd web && npm run probe (grup B165). JANGAN dibalik/diulang tanpa membuka kembali baris B165 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { isAddress } from 'viem'
import { credentialResolverAbi } from './abi'
import { APP_HOST, CREDENTIAL_HOST, isConfigured, loadEndpoint } from './config'
import { artefactLayersOf, makeClient, type CertLayer } from './verify'
import {
  buildCertificate, isCourseSlug, isCredentialHash, parseCredentialDoc, parseCriteria, statusVerdict,
  type Address, type CertificateData, type Hex, type ParsedCredential, type StatusRead,
} from './certificate'

export const credentialDocUrl = (hash: string): string => `${CREDENTIAL_HOST}/credentials/${hash}`
export const criteriaDocUrl = (courseId: string): string => `${CREDENTIAL_HOST}/criteria/${encodeURIComponent(courseId)}`

type Fetched = { state: 'ok', json: unknown } | { state: 'missing' } | { state: 'failed', why: string }

async function getJson (url: string): Promise<Fetched> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(10_000) })
    if (r.status === 404) return { state: 'missing' }
    if (!r.ok) return { state: 'failed', why: `HTTP ${r.status}` }
    return { state: 'ok', json: await r.json() }
  } catch (e) {
    return { state: 'failed', why: e instanceof Error ? e.message : String(e) }
  }
}

/** Dokumen kredensial: `ok` = terbaca dan bentuknya cukup untuk lembar; `missing` = tidak tersaji atau bentuknya tidak cukup; `failed` = gagal diambil. */
export type DocResult = { state: 'ok', cred: ParsedCredential } | { state: 'missing' } | { state: 'failed', why: string }

export async function loadCredentialDoc (hash: string): Promise<DocResult> {
  const f = await getJson(credentialDocUrl(hash))
  if (f.state !== 'ok') return f
  const cred = parseCredentialDoc(f.json)
  return cred ? { state: 'ok', cred } : { state: 'missing' }
}

export type CredentialRow = {
  hash: Hex
  status: StatusRead
  doc: DocResult
  layers: CertLayer[]
}

const MAX_ROWS = 24

type ReadClient = ReturnType<typeof makeClient>

async function statusOfHash (client: ReadClient, resolver: Address, hash: Hex): Promise<StatusRead> {
  try {
    const s = (await client.readContract({ address: resolver, abi: credentialResolverAbi, functionName: 'statusOf', args: [hash] })) as readonly [boolean, boolean, boolean, boolean, string, bigint, bigint]
    return { verdict: statusVerdict(s[0], s[1], s[2], s[3]), readOn: new Date().toISOString() }
  } catch {
    return { verdict: 'BELUM TERBACA', readOn: new Date().toISOString() }
  }
}

export type ListResult = { ok: true, rows: CredentialRow[], total: number } | { ok: false, why: string }

/** Kredensial milik alamat ini di chain, terbaru dulu (paling banyak 24), masing-masing dengan status, dokumen publik, dan artefak. */
export async function listMyCredentials (addr: string): Promise<ListResult> {
  if (!isAddress(addr)) return { ok: false, why: 'Bukan address yang sah.' }
  const ep = loadEndpoint()
  if (!isConfigured(ep)) return { ok: false, why: 'Address resolver belum diisi di panel "Konfigurasi pembacaan" pada halaman verifier.' }
  const client = makeClient(ep)
  let hashes: readonly Hex[]
  try {
    hashes = (await client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'credentialsOf', args: [addr] })) as readonly Hex[]
  } catch (e) {
    return { ok: false, why: e instanceof Error ? e.message : String(e) }
  }
  const newest = [...hashes].reverse().slice(0, MAX_ROWS)
  const rows = await Promise.all(newest.map(async (hash): Promise<CredentialRow> => {
    const [status, doc, layers] = await Promise.all([
      statusOfHash(client, ep.resolver, hash),
      loadCredentialDoc(hash),
      artefactLayersOf(hash, ep, client),
    ])
    return { hash, status, doc, layers }
  }))
  // Terbaru dulu menurut tanggal terbit di dokumen bila ada; yang tanpa dokumen tetap di urutan chain (terbaru dulu).
  rows.sort((a, b) => (b.doc.state === 'ok' ? Date.parse(b.doc.cred.validFrom) : 0) - (a.doc.state === 'ok' ? Date.parse(a.doc.cred.validFrom) : 0))
  return { ok: true, rows, total: hashes.length }
}

export type CertificateResult =
  | { ok: true, cert: CertificateData, layers: CertLayer[] }
  | { ok: false, kind: 'invalid' | 'not-mine' | 'no-document' | 'failed', why: string }

/**
 * Memuat lembar untuk satu kredensial milik `addr`. Urutan: bentuk hash → kepemilikan di chain → dokumen publik →
 * kriteria (boleh gagal: lembar tetap jujur tanpa penerbit dan bobot) → status yang baru dibaca → artefak.
 */
export async function loadCertificate (hash: string, addr: string): Promise<CertificateResult> {
  if (!isCredentialHash(hash)) return { ok: false, kind: 'invalid', why: 'Bukan ID kredensial yang sah (0x + 64 karakter heksadesimal).' }
  if (!isAddress(addr)) return { ok: false, kind: 'invalid', why: 'Belum ada akun yang masuk.' }
  const ep = loadEndpoint()
  if (!isConfigured(ep)) return { ok: false, kind: 'failed', why: 'Address resolver belum diisi.' }
  const client = makeClient(ep)
  let mine: readonly Hex[]
  try {
    mine = (await client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'credentialsOf', args: [addr] })) as readonly Hex[]
  } catch (e) {
    return { ok: false, kind: 'failed', why: `Daftar kredensial tidak terbaca dari chain: ${e instanceof Error ? e.message : String(e)}` }
  }
  if (!mine.some((h) => h.toLowerCase() === hash.toLowerCase())) {
    return { ok: false, kind: 'not-mine', why: 'Kredensial ini bukan milik akun yang sedang masuk, jadi lembarnya tidak dibuat.' }
  }
  const doc = await loadCredentialDoc(hash)
  if (doc.state === 'failed') return { ok: false, kind: 'failed', why: `Dokumen kredensial gagal diambil: ${doc.why}` }
  if (doc.state === 'missing') return { ok: false, kind: 'no-document', why: 'Dokumen kredensial ini belum tersaji di host publik, jadi lembarnya belum bisa dibuat. Kredensialnya tetap sah di chain dan bisa diperiksa di verifier.' }
  if (doc.cred.learner.toLowerCase() !== addr.toLowerCase()) {
    return { ok: false, kind: 'not-mine', why: 'Alamat peserta di dokumen tidak sama dengan akun yang sedang masuk, jadi lembarnya tidak dibuat.' }
  }
  const [crit, status, layers] = await Promise.all([
    doc.cred.courseId && isCourseSlug(doc.cred.courseId) ? getJson(criteriaDocUrl(doc.cred.courseId)) : Promise.resolve<Fetched>({ state: 'missing' }),
    statusOfHash(client, ep.resolver, hash as Hex),
    artefactLayersOf(hash as Hex, ep, client),
  ])
  const criteria = crit.state === 'ok' ? parseCriteria(crit.json) : null
  const cert = buildCertificate({ hash: hash as Hex, cred: doc.cred, criteria, status, appHost: APP_HOST, testnet: ep.chainId === 97 })
  return { ok: true, cert, layers }
}
