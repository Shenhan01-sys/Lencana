/**
 * `npm run audit` — memeriksa diri sendiri dengan alat, bukan dengan ingatan.
 *
 * Kenapa ini ada: proyek ini punya banyak gerbang untuk SATU hal (angka lulus/gagal), dan hampir
 * tidak ada gerbang untuk hal-hal yang justru paling memalukan kalau ketahuan oleh juri:
 * alamat yang berbeda di dua sisi, klaim terlarang yang lolos ke salinan halaman, token tempat
 * penampung, dan berkas catatan yang mengaku sebuah blokir masih hidup padahal sudah selesai.
 *
 * Mode:
 *   npm run audit            → cetak laporan (tanpa menulis apa pun)
 *   npm run audit -- --log   → + tambahkan baris backlog untuk setiap temuan yang belum tercatat
 *
 * Semua pemeriksaan bersifat BACA terhadap berkas. Yang ditulis hanya baris backlog, dan hanya
 * kalau belum ada ID-nya (idempoten — menjalankan dua kali tidak menghasilkan dua baris).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createPublicClient, http, getAddress } from 'viem'

import { loadFileEnv } from '../src/env.js'

const run = promisify(execFile)
const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
const REPO = resolve(SIGNER, '..')
const LOG = process.argv.includes('--log')

await loadFileEnv()
const env = process.env
const findings = join(REPO, 'vault', '07-Backlog', '03 - Findings and Tasks 2026-09-26.md')

const read = async (p) => { try { return await readFile(p, 'utf8') } catch { return '' } }

/** Kata yang dilarang oleh `Claims-Cheat-Sheet` — kalau muncul di tempat yang dibaca orang, itu temuan. */
const FORBIDDEN = [
  { re: /\bkompatibel\s+1EdTech\b/i, why: 'lolos validator ≠ tersertifikasi 1EdTech; suite butuh keanggotaan' },
  { re: /\blolos\s+sertifikasi\b|\bsertified\b|\btersertifikasi\s+1EdTech\b/i, why: 'kita tidak bisa menunjuk badan penerbit sertifikat' },
  { re: /\bunforgeable\b|\btamper[- ]proof\b|\btidak bisa dipalsukan\b/i, why: 'yang tidak bisa dipalsukan hanya yang kami uji (byte dibalik → tanda tangan mati)' },
  { re: /\bblockchain-secured\b|\bdiamankan blockchain\b/i, why: 'frase tanpa mekanik: dokumen hidup di luar chain' },
  { re: /\banti[- ]curang\b/i, why: 'kunci jawaban kuis tetap terbundel (B80)' },
  { re: /\bdi chain\b(?=[^\n]{0,40}(dokumen|teks karangan|berkas lengkap))/i, why: 'dokumen tidak pernah masuk chain' },
  { re: /semua (?:artefak|kertas) (?:kami )?(?:selalu )?publik/i, why: 'ukur dengan verify:edge, jangan klaim tanpa angka' },
]

/** Berkas yang dibaca orang (juri membuka ini lebih dulu). */
const SURFACE = [
  'README.md', 'FRONTEND_ITERATION.md', 'web/README.md', 'signer/README.md', 'contracts/README.md',
  'docs/ARCHITECTURE.md', 'docs/CONTRACTS.md', 'docs/DEPLOY.md', 'docs/CREDENTIALS.md',
  'docs/AUDIT_TRUST.md', 'docs/EIP712_CONFORMANCE.md', 'docs/OPEN_BADGES.md', 'docs/PRODUCTION_READINESS.md',
  'docs/UX_ROADMAP.md', 'docs/adr/0003-onchain-anchor-for-read-model.md', 'docs/adr/0004-x402-for-machine-verification.md',
]

/** Tempat penampung yang tidak boleh masuk salinan halaman/publik. */
const STUBS = [/TODO:|FIXME:|TBD\b|XXX\b/, /lorem\s+ipsum/i, /placeholder text/i, /\bpayeeAddress\b\s*=\s*address\(0\)/, /your[-_ ]?api[-_ ]?key/i]

async function collect () {
  const findingsOut = []

  // 1) SATU hal yang harus sama di seluruh proyek: alamat registry yang benar-benar dipakai.
  //
  // ⚠️ Versi pertama pemeriksaan ini menghasilkan DUA tembakan palsu, dan itu pelajaran yang lebih
  // berharga daripada temuan yang dikiranya: ia mengumpulkan semua `0x…` di berkas lalu MELABELINYA
  // lewat regex bentuk alamat, bukan lewat nama variabelnya. Akibatnya `BAS_ADDRESS` (0x6C22… — EAS/
  // BAS pihak ketiga, 18.881 byte, dan memang TIDAK punya `schemaUID()`) dilaporkan sebagai
  // "resolver kedua" dan sebagai "address yang bukan registry hidup". Sekarang setiap address
  // dipasangkan dengan NAMA variabelnya lewat `named`, dan yang dibandingkan di A1 hanya yang
  // memang RESOLVER.
  const ENV_NAMES = {
    RESOLVER_ADDRESS: 'RESOLVER (registry kita)', BAS_ADDRESS: 'BAS/EAS pihak ketiga',
    CERT_ADDRESS: 'lapis artefak demo', LIVE_CERT_ADDRESS: 'lapis artefak penegak D42/D43',
    SPLIT_ADDRESS: 'Settlement.sol', DEMO_TOKEN_ADDRESS: 'token demo x402',
    ISSUER_ADDRESS: 'EOA penerbit', PERMIT2_ADDRESS: 'Permit2 (bukan milik kita)',
    X402_PROXY_ADDRESS: 'proxy x402 exact (bukan milik kita)',
  }
  const named = new Map()
  for (const [k, v] of Object.entries(env)) {
    const who = ENV_NAMES[k]
    if (who && /^0x[0-9a-fA-F]{40}$/.test(String(v))) named.set(getAddress(String(v)), who)
  }
  const envResolver = env.RESOLVER_ADDRESS ? getAddress(env.RESOLVER_ADDRESS) : null
  const scan = (text) => [...new Set((text.match(/0x[0-9a-fA-F]{40}/g) ?? []).map(getAddress))]
    .map((a) => ({ addr: a, who: named.get(a) ?? (a === envResolver ? 'RESOLVER (registry kita)' : null) }))
    .filter((h) => h.who)
  const files = [
    ['web/src/config.ts', join(REPO, 'web', 'src', 'config.ts')],
    ['web/scripts/probe.ts', join(REPO, 'web', 'scripts', 'probe.ts')],
    ['docs/DEPLOY.md', join(REPO, 'docs', 'DEPLOY.md')],
    ['docs/ARCHITECTURE.md', join(REPO, 'docs', 'ARCHITECTURE.md')],
  ]
  const mentions = []
  for (const [label, path] of files) {
    for (const h of scan(await read(path))) mentions.push({ ...h, at: label })
  }
  const registry = mentions.filter((m) => /RESOLVER/.test(m.who))
  const distinctRegistry = [...new Set(registry.map((m) => m.addr))]
  findingsOut.push({
    id: 'A1', kind: distinctRegistry.length > 1 ? 'TEMUAN' : 'bersih',
    title: 'satu RESOLVER untuk semua sisi (hanya address ber-nama RESOLVER yang dibandingkan)',
    detail: distinctRegistry.length
      ? distinctRegistry.map((a) => `${a} ← ${registry.filter((m) => m.addr === a).map((m) => m.at).join(', ')}`).join('   |   ')
      : 'tidak ada satu pun berkas yang menyebut address registry berbeda',
  })
  const others = [...new Set(mentions.filter((m) => !/RESOLVER/.test(m.who)).map((m) => `${m.addr} = ${m.who} (${m.at})`))]
  findingsOut.push({ id: 'A1b', kind: 'info', title: 'address SAH lainnya di berkas yang sama — sengaja tidak dibandingkan', detail: others.join('\n        ') || '—' })

  // 2) Baca tiap RESOLVER yang dikutip dari chain: benar registry hidup dan berskema?
  if (env.RPC_URL && (distinctRegistry.length || envResolver)) {
    const client = createPublicClient({ transport: http(env.RPC_URL) })
    const abi = [{ name: 'schemaUID', type: 'function', stateMutability: 'view', outputs: [{ type: 'bytes32' }], inputs: [] }]
    const probes = []
    for (const addr of (distinctRegistry.length ? distinctRegistry : [envResolver])) {
      let code = '0x'; let schema = null
      try { code = await client.getCode({ address: addr }) } catch { /* network mati */ }
      try { schema = await client.readContract({ address: addr, abi, functionName: 'schemaUID' }) } catch { /* bukan registry */ }
      probes.push({ addr, bytes: (code ?? '').length / 2 - 1, schemaUID: schema ? String(schema).slice(0, 14) + '…' : null })
    }
    findingsOut.push({
      id: 'A2', kind: probes.some((p) => p.bytes <= 0 || !p.schemaUID) ? 'TEMUAN' : 'bersih',
      title: 'tiap RESOLVER yang dikutip = registry hidup dengan skema terpasang',
      detail: probes.map((p) => `${p.addr} code=${p.bytes}B schema=${p.schemaUID ?? 'TIDAK ADA'}`).join('\n        '),
    })
  }


  // 3) Klaim terlarang di salinan yang dibaca orang.
  const bad = []
  for (const f of SURFACE) {
    const t = await read(join(REPO, f))
    if (!t) continue
    t.split(/\r?\n/).forEach((line, i) => {
      for (const c of FORBIDDEN) if (c.re.test(line)) bad.push(`${f}:${i + 1} [${c.why}] ${line.trim().slice(0, 90)}`)
    })
  }
  findingsOut.push({ id: 'A3', kind: bad.length ? 'TEMUAN' : 'bersih', title: 'kalimat terlarang Claims-Cheat-Sheet di README/docs', detail: bad.length ? bad.slice(0, 8).join('\n      ') : `${SURFACE.length} berkas disapu, 0 cocok` })

  // 4) Tempat penampung yang tertinggal di kode yang dilihat publik.
  const stubs = []
  for (const f of ['web/src/main.ts', 'web/src/verify.ts', 'web/src/lms.ts', 'web/src/learning.ts', 'signer/src/server.js', 'signer/src/db.js', 'signer/src/credential.js', 'contracts/SoulboundCert.sol', 'contracts/CredentialResolver.sol', 'contracts/CourseDeposit.sol']) {
    const t = await read(join(REPO, f))
    if (!t) continue
    t.split(/\r?\n/).forEach((line, i) => { for (const re of STUBS) if (re.test(line)) stubs.push(`${f}:${i + 1} ${line.trim().slice(0, 80)}`) })
  }
  findingsOut.push({ id: 'A4', kind: stubs.length ? 'TEMUAN' : 'bersih', title: 'TODO/placeholder di berkas yang dibaca orang', detail: stubs.length ? stubs.slice(0, 8).join('\n      ') : '0 cocok' })

  // 5) Dokumen yang disimpan di berkas tapi menyebut domain yang tidak kita pegang.
  const fake = []
  const main = await read(join(REPO, 'web', 'src', 'main.ts'))
  main.split(/\r?\n/).forEach((line, i) => { if (/lencana\.io|#key-1\b/.test(line)) fake.push(`web/src/main.ts:${i + 1} ${line.trim().slice(0, 76)}`) })
  findingsOut.push({ id: 'A5', kind: fake.length ? 'TEMUAN' : 'bersih', title: 'dokumen OB3.0 tulisan-tangan dengan URL yang bukan milik kita (R1a)', detail: fake.length ? `${fake.length} baris; contoh:\n      ${fake.slice(0, 5).join('\n      ')}` : 'tidak ada' })

  // 6) Berkas catatan yang mengklaim sebuah blokir masih hidup padahal sudah selesai.
  const stale = []
  const rootPending = await read(resolve(REPO, '..', 'Vault', 'Notes', 'Pending-Tasks.md'))
  if (rootPending) {
    const done = [
      ['sediakan URL PUBLIK', 'tepi tetap hidup (verify:edge 19 dari 19, lencana-edge…workers.dev)'],
      ['jalankan satu kredensial kita di `https://vc.1ed.tech`', 'buku besar validator: 12 hash berbeda, outcome VALID'],
      ['`PaymentSplitter`', 'kontraknya ada: Settlement.sol + 22 test + siaran nyata di 97'],
    ]
    for (const [needle, fact] of done) {
      const re = new RegExp(`(- \\[ \\][^\\n]*${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^\\n]*)`, 'i')
      const m = re.exec(rootPending)
      if (m) stale.push(`masih ditandai terbuka padahal ${fact}\n      ${m[1].trim().slice(0, 90)}`)
    }
  }
  findingsOut.push({ id: 'A6', kind: stale.length ? 'TEMUAN' : 'bersih', title: 'Vault akar: blokir lama yang sebenarnya sudah selesai', detail: stale.length ? stale.join('\n      ') : (rootPending ? 'tidak ada yang kontradiktif' : 'berkas tidak ketemu') })

  // 7) Item yang HIDUP di vault akar dan tidak punya baris di backlog app/.
  const missing = [
    { id: 'B94', needle: 'B94', title: 'R1a — dokumen OB3.0 TIRUAN di web/src/main.ts', detail: 'objek OpenBadgeCredential tulisan tangan dengan URL lencana.io, #key-1, tanpa proof, dan hash asli di dalamnya — menyentuh klaim terkuat kita ("tidak ada data palsu"). Belum pernah jadi baris di app/vault.' },
    { id: 'B95', needle: 'B95', title: 'riset pasar / model bisnis / kompetitor credentialing (P6)', detail: 'pilar impact & viability; tidak ada satu pun URL sumber di korpus kita.' },
    { id: 'B96', needle: 'B96', title: 'keputusan bahasa nama test & pesan revert (D27 vs kenyataan)', detail: 'harus dikunci SEBELUM video direkam; kalau diubah setelahnya, rekaman dan README tidak sama.' },
    { id: 'B97', needle: 'B97', title: 'relayer penerbitan masih skrip, bukan layanan', detail: 'primitif attestByDelegation terbukti di chain publik; yang belum adalah endpoint yang menerima permintaan agen dan mengantrekan siaran.' },
  ]
  let t = await read(findings)
  const missingRows = missing.filter((m) => !t.includes(`**${m.id}**`))
  findingsOut.push({
    id: 'A7', kind: missingRows.length ? 'TEMUAN' : 'bersih',
    title: 'item vault akar yang belum jadi baris backlog app/',
    detail: missingRows.length ? missingRows.map((m) => `${m.id} ${m.title}`).join('\n      ') : 'semuanya sudah punya baris',
  })

  if (LOG && missingRows.length && t) {
    const anchor = '| **B73** | Audit Dicoding'
    const add = missingRows.map((m) => `| **${m.id}** 🔴 Temuan audit ` + new Date().toISOString().slice(0, 10) + ` (dipindah dari \`Vault/Notes/Pending-Tasks.md\`, sebelumnya hanya hidup di sana) | **${m.title}** | ${m.detail} | Belum tercatat di \`app/vault\` sama sekali: sesi yang hanya membaca backlog repo tidak akan pernah menemukannya. Inilah alasan baris ini ada — aturan \`AGENTS.md\` #6: kalau klaim/pekerjaan berpindah tempat, catatannya ikut berpindah. |\n`).join('')
    if (t.includes(anchor)) {
      t = t.replace(anchor, add + anchor)
      await writeFile(findings, t, 'utf8')
      console.log(`\ntercatat di backlog: ${missingRows.map((m) => m.id).join(', ')}`)
    } else console.log('\nANCHOR tidak ditemukan — tidak kutempel sembarangan; tambahkan manual sebelum | **B73** |')
  }

  return findingsOut
}

const out = await collect()
const tally = out.filter((r) => r.kind === 'TEMUAN').length
console.log(`\naudit proyek — ${out.length} pemeriksaan · ${tally} TEMUAN${LOG ? ' (+ penulisan backlog)' : ''}\n`)
for (const r of out) {
  console.log(`  ${r.kind === 'TEMUAN' ? 'TEMUAN ' : 'bersih '} ${r.id} · ${r.title}`)
  if (r.detail) console.log(`        ${r.detail}`)
}
console.log(`\n${tally === 0 ? 'AUDIT BERSIH' : `AUDIT ${tally} TEMUAN`} — ini hasil run, bukan ingatan; jalankan ulang sebelum mengutipnya.`)
process.exitCode = 0
