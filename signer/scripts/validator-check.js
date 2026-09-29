/**
 * `npm run validator` — menjalankan ulang bukti interoperabilitas, bukan menyimpan tangkapannya.
 *
 * Kenapa perlu: satu-satunya hal yang mengubah "dibangun mengikuti spesifikasi" menjadi klaim yang
 * bisa diuji orang lain adalah verdict `vc.1ed.tech`. Verdict itu mudah basi: dokumen kita menunjuk
 * URL milik kita sendiri, jadi setiap kali host mati, daftar status tak lagi bisa diambil, dan
 * "lolos" kemarin jadi kalimat kosong hari ini. Skrip ini mengulangi seluruh rantainya — baca dokumen,
 * ikuti URL di dalamnya, unggah, tunggu verdict — dan keluar merah kalau hasilnya bukan VALID.
 *
 *   npm run validator -- --hash 0x…            (hash tertentu)
 *   npm run validator                          (DOC_HASH, lalu DEMO_HASH, dari .env)
 *   npm run validator -- --record              (menambah hasil ke vault/09-Testing/validator-runs.jsonl)
 *
 * Yang TIDAK dilakukan di sini: menebak verdict dari HTML. Halaman /validate menyimpan
 * "eligible to be submitted…" sebagai string template, jadi angka hanya dibaca dari /api/validate.
 */

// [B41] SELESAI 2026-09-29 — validator 1EdTech dijalankan dari kode kita sendiri; outcome selain VALID = merah, dan --record menambah app/vault/09-Testing/validator-runs.jsonl. Buktikan ulang: npm run validator. JANGAN dibalik/diulang tanpa membuka kembali baris B41 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { appendFile, readFile } from 'node:fs/promises'
import { createPublicClient, http, getAddress, parseAbi } from 'viem'
import { gunzipSync } from 'node:zlib'

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 || i + 1 >= process.argv.length ? fallback : process.argv[i + 1]
}

/** .env dibaca manual seperti di issue.js: menambah dotenv hanya untuk beberapa baris bukan perlu. */
async function readEnv () {
  const out = {}
  try {
    const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
    for (const line of text.split(/\r?\n/)) {
      const m = /^([A-Z][A-Z0-9_]+)=(.*)$/.exec(line.trim())
      if (m) out[m[1]] = m[2]
    }
  } catch { /* jalan dengan env proses saja */ }
  return out
}

const env = { ...await readEnv(), ...process.env }
const BASE = (env.BASE_URL ?? 'http://127.0.0.1:8787').replace(/\/$/, '')
const VALIDATOR = 'https://vc.1ed.tech'
const MIN_BITS = 131_072
const hash = (arg('hash') || env.DOC_HASH || env.DEMO_HASH || '').trim()

let fails = 0
const log = []
// State chain untuk hash yang diperiksa; dipakai untuk menetapkan HARAPAN validator, dan ikut
// tertulis di buku besar. `null` kalau chain-nya tidak teraih — itu dicatat, bukan diasumsikan lolos.
let revokedOnChain = null
function check (name, ok, detail = '') {
  log.push(`${ok ? 'ok  ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
  if (!ok) fails++
}

if (!hash) {
  console.error('pakai: npm run validator -- --hash <credentialHash>  (atau isi DOC_HASH/DEMO_HASH di .env)')
  process.exit(2)
}

// 1. Dokumen: yang diunggah adalah hasil HTTP, bukan salinan di disk — jadi yang kita uji adalah
//    apa yang benar-benar diterima verifier.
const docUrl = `${BASE}/credentials/${hash}`
const docRes = await fetch(docUrl)
if (!docRes.ok) {
  console.error(`dokumen ${docUrl} -> HTTP ${docRes.status}; server penyaji harus hidup untuk uji ini`)
  process.exit(1)
}
const doc = await docRes.json()
const raw = JSON.stringify(doc)

check('dokumen adalah Verifiable Credential berbentuk OpenBadgeCredential',
  Array.isArray(doc['@context']) && (doc.type ?? []).includes('OpenBadgeCredential'))
check('credentialStatus satu objek, bukan array (skema OB 3.0 menolak array)',
  doc.credentialStatus && !Array.isArray(doc.credentialStatus)
  && doc.credentialStatus.statusPurpose === 'revocation')
check('tidak ada satu pun URL loopback di dokumen',
  !raw.includes('127.0.0.1') && !/\/\/localhost/.test(raw))

// 2. Kita ikuti sendiri apa yang akan diikuti validator: dokumen issuer + daftar status.
const vmUrl = String(doc.proof?.verificationMethod ?? '').split('#')[0]
const issuerRes = await fetch(vmUrl)
check('issuer document teraih (sumber kunci verifier)', issuerRes.ok, `${vmUrl.slice(0, 58)}… -> ${issuerRes.status}`)

for (const purpose of ['revocation', 'suspension']) {
  const entry = doc.credentialStatus?.statusPurpose === purpose ? doc.credentialStatus : null
  const url = entry?.statusListCredential ?? `${BASE}/credentials/status/${purpose}`
  let list = null
  try { list = await (await fetch(url)).json() } catch (e) { check(`list ${purpose} teraih`, false, e.message); continue }
  check(`list ${purpose} teraih dan berupa BitstringStatusListCredential`,
    (list.type ?? []).includes('BitstringStatusListCredential'))
  const enc = String(list.credentialSubject?.encodedList ?? '')
  let bits = 0
  try { bits = gunzipSync(Buffer.from(enc.slice(1), 'base64url')).length * 8 } catch { /* di bawah */ }
  check(`list ${purpose}: ${bits} bit ≥ minimum BSL ${MIN_BITS}`, bits >= MIN_BITS, `${bits} bit`)
}

// 3. Unggah dan tunggu. Bentuk yang diterima validator: part `file` (bukan `uri` saja),
//    lalu hasilnya dibaca dari /api/validate dengan uploadId dari halaman /validate.
const form = new FormData()
form.append('file', new Blob([raw], { type: 'application/json' }), 'credential.json')
form.append('validatorId', 'OB30Inspector')
const page = await (await fetch(`${VALIDATOR}/upload`, { method: 'POST', body: form })).text()
const uploadId = (page.match(/uploadId"?\s*:\s*"(val[^"]+)"/) || page.match(/(val\d+\.json)/) || [])[1]
check('validator menerima unggahan dan memberi uploadId', Boolean(uploadId))
if (!uploadId) {
  console.error('\nhalaman respons disimpan untuk diperiksa:'); console.error(page.slice(0, 500))
  process.exit(1)
}

let verdict = null
for (let i = 0; i < 12; i++) {
  await new Promise((r) => setTimeout(r, 3000))
  const j = await fetch(`${VALIDATOR}/api/validate?validatorId=OB30Inspector&uploadId=${uploadId}`,
    { headers: { accept: 'application/json' } })
  if (!j.ok) continue
  const body = await j.json()
  if (body?.summary?.outcome && body.summary.outcome !== 'PENDING') { verdict = body; break }
}

if (!verdict) {
  check('verdict terbaca dari /api/validate', false, `uploadId ${uploadId} tidak mengembalikan hasil`)
} else {
  const s = verdict.summary
  console.log(`\n  outcome ${s.outcome} · ${s.totalRun} pemeriksaan · ${s.errors} error · ${s.warnings} warning · ${s.fatals} fatal · ${s.exceptions} exception`)
  // Semua kelompok pesan, bukan hanya `errors`. Run 29 Sep menemukan kenapa ini perlu: outcome
  // FATAL dengan `errors: []`, jadi sebabnya ada di keranjang lain (`fatals`) dan tidak pernah
  // tercetak — skrip melaporkan "merah" tanpa pernah bisa menjawab "karena apa". Buku besar
  // ikut menyimpan ini supaya jawaban itu masih ada tiga hari dari sekarang.
  const groups = Object.entries(verdict).filter(([, v]) => Array.isArray(v) && v.length)
  for (const [name, items] of groups) {
    for (const e of items) console.log(`    [${name}] ${e?.title ?? e?.code ?? ''}: ${e?.message ?? JSON.stringify(e).slice(0, 140)}`)
  }
  const allMessages = groups.flatMap(([, items]) => items.map((e) => `${e?.title ?? ''} ${e?.message ?? ''}`)).join(' ').toLowerCase()

  /**
   * Harapan datang dari CHAIN, bukan dari baris yang ditulis permanen di skrip.
   *
   * Versi sebelumnya menuntut `VALID` untuk hash apa pun yang diberikan. Untuk kredensial yang kita
   * cabut — dan pencabutan justru adegan demo kita — validator pihak ketiga berkata FATAL karena
   * bit revokasinya menyala, dan itu **produk yang bekerja** yang tercetak merah. Kegagalan yang
   * salah arah ini sudah pernah terjadi di `serve-probe` (harapan agregat yang basi) dan di sini
   * penyebabnya sama: angka harapan diambil dari ingatan penulis skrip, bukan dari state.
   *
   * Jadi: `revoked=true` di chain → kita TUNTUT validator menolaknya, dan penolakannya harus
   * menyebut status/revokasi (kalau tidak, ia ditolak karena sebab lain — tanda tangan rusak
   * sekalipun — dan itu tidak boleh lolos sebagai "sudah sesuai").
   */
  const chainClient = createPublicClient({ transport: http(env.RPC_URL) })
  revokedOnChain = await chainClient.readContract({
    address: getAddress(env.RESOLVER_ADDRESS),
    abi: parseAbi(['function statusOf(bytes32) view returns (bool,bool,bool,bool,address,uint64,uint64)']),
    functionName: 'statusOf',
    args: [hash],
  }).then(([exists, revoked]) => ({ exists, revoked })).catch(() => null)

  if (!revokedOnChain) {
    check('state chain terbaca (harus, supaya harapan validator bisa ditetapkan)', false, `${env.RPC_URL} / ${env.RESOLVER_ADDRESS}`)
  } else if (revokedOnChain.revoked) {
    const msgs = allMessages
    const mentionsStatus = /revok|status|bitstring|list/i.test(msgs)
    console.log(`    (chain: revoked=true → validator HARUS menolak; pesan: ${msgs.slice(0, 110) || '—'})`)
    check('kertas tercabut ditolak validator, dan sebabnya menyebut status revokasi',
      s.outcome !== 'VALID' && s.fatals + s.errors > 0 && mentionsStatus, `${s.outcome} · fatals=${s.fatals} errors=${s.errors}`)
  } else {
    check('hasil validator: VALID, nol error', s.outcome === 'VALID' && s.errors === 0 && s.fatals === 0 && s.exceptions === 0)
  }
}

// 4. Buku besar. Verdict yang tidak dicatat tanggal + hash-nya tidak bisa dibela tiga hari dari sekarang.
if (process.argv.includes('--record') && verdict) {
  const ledger = new URL('../../vault/09-Testing/validator-runs.jsonl', import.meta.url)
  const line = JSON.stringify({
    at: new Date().toISOString(), credentialHash: hash, docUrl, uploadId,
    issuerDocument: vmUrl, outcome: verdict.summary.outcome, summary: verdict.summary,
    // Semua kelompok pesan (bukan hanya `errors`), plus state chain yang jadi dasar harapan kita —
    // supaya baris buku besar bisa menjelaskan "kenapa FATAL" tanpa harus mengulang unggahan.
    messages: Object.fromEntries(Object.entries(verdict).filter(([, v]) => Array.isArray(v) && v.length)
      .map(([k, v]) => [k, v.map((e) => `${e?.title ?? e?.code ?? ''}${e?.message ? `: ${e.message}` : ''}`)])),
    chain: { revoked: revokedOnChain?.revoked ?? null, exists: revokedOnChain?.exists ?? null },
    baseUrl: BASE,
  }) + '\n'
  await appendFile(ledger, line, 'utf8')
  console.log(`  tercatat di vault/09-Testing/validator-runs.jsonl`)
}

console.log(`\n${fails === 0 ? 'VALIDATOR HIJAU' : 'VALIDATOR MERAH'} — ${log.filter((l) => l.startsWith('ok')).length}/${log.length} pemeriksaan`)
process.exitCode = fails === 0 ? 0 : 1
