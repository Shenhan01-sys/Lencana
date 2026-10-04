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

// Lencana-B111 status=SELESAI 2026-09-29 — A10 mengadili angka pada tabel bukti README terhadap numbers.json — README tidak bisa lagi basi tanpa ketahuan. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B111 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B101 status=SELESAI 2026-09-29 — SURFACE termasuk salinan UI dan berkas yang hilang = TEMUAN. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B101 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B96 status=SELESAI 2026-09-29 — A8/A8b menjaga bahasa identifier, pesan keluaran, dan pola assertion harness. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B96 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B103 status=SELESAI 2026-09-29 — SURFACE hanya berkas yang ada; berkas yang hilang = TEMUAN, bukan dilewati diam-diam. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B103 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync, readdirSync } from 'node:fs'
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
  // 30 Sep: alternatif tengahnya dulu ditulis `\bsertified\b` — typo, kata itu tidak pernah ada,
  // jadi 'certified' bahasa Inggris lolos selamanya (dan `conformant` / '1EdTech compatible' tidak
  // pernah masuk daftar sama sekali). `bolehNegasi` menjaga ini tetap berguna:Disclaimer kita sendiri
  // menulis **not** "certified" — gerbang yang menghukum kalimat yang menyangkal frasa itu akan
  // dibisukan orang dalam dua hari (kelas kegagalan yang sama dengan A5).
  { re: /\blolos\s+sertifikasi\b|\bcertified\b|\btersertifikasi\s+1EdTech\b|\bconformant\b|\b1EdTech\s+compatible\b/i, why: 'kita tidak bisa menunjuk badan penerbit sertifikat', bolehNegasi: true },
  { re: /\bunforgeable\b|\btamper[- ]proof\b|\btidak bisa dipalsukan\b/i, why: 'yang tidak bisa dipalsukan hanya yang kami uji (byte dibalik → tanda tangan mati)' },
  { re: /\bblockchain-secured\b|\bdiamankan blockchain\b/i, why: 'frase tanpa mekanik: dokumen hidup di luar chain' },
  // B80 (1 Okt) menutup "kunci terbaca di bundel", BUKAN kecurangan: pembahasan per soal datang sesudah
  // penyerahan dan penyerahan boleh diulang, jadi kunci bisa ditebak lewat beberapa usaha. Larangannya tetap.
  { re: /\banti[- ]curang\b/i, why: 'kunci tidak lagi di bundel (B80), tapi pembahasan per soal + ulangan tak terbatas membuat kunci bisa ditebak' },
  { re: /\bdi chain\b(?=[^\n]{0,40}(dokumen|teks karangan|berkas lengkap))/i, why: 'dokumen tidak pernah masuk chain' },
  { re: /semua (?:artefak|kertas) (?:kami )?(?:selalu )?publik/i, why: 'ukur dengan verify:edge, jangan klaim tanpa angka' },
]

/**
 * Berkas yang dibaca orang (juri membuka ini lebih dulu) — dan sekarang hanya yang **benar-benar ada**.
 *
 * `docs/*` yang dulu ada di daftar ini tidak pernah ada di repo: dokumen teknis hidup di `vault/`
 * (lihat `vault/11-Refactoring/RF6`). Vault sengaja TIDAK disapu pemeriksaan ini:
 * `vault/10-Contributors/Claims-Cheat-Sheet.md` justru memuat daftar frasa terlarang untuk
 * melarangnya, sama seperti komentar sejarah di `main.ts` (lihat A5). Gerbang yang menghukum
 * dokumentasinya sendiri akan dibisukan orang dalam dua hari.
 */
const SURFACE = [
  'README.md', 'FRONTEND_ITERATION.md', 'signer/README.md',
  'web/index.html', 'web/src/i18n.ts', 'web/src/render.ts',
]

/**
 * Baca daftar jalur dan LAPORKAN yang tidak ada.
 *
 * Kenapa (29 Sep malam): `SURFACE` mendaftarkan 19 jalur, `app/docs/` **tidak pernah ada di repo** —
 * 13 di antaranya mengembalikan string kosong, `if (!t) continue` melompat diam-diam, dan detail-nya
 * mencetak `SURFACE.length`: "19 berkas disapu, 0 cocok". Angka itu kukutip sebagai cakupan. Gerbang
 * yang hijau karena tidak melihat lebih berbahaya daripada tidak ada gerbang — ia berhenti membuat
 * orang memeriksa. Bagian yang hilang sekarang menjadi temuan, dan hitungan yang dicetak adalah
 * berkas yang benar-benar dibaca.
 */
async function readSurface (list) {
  const texts = []
  const absent = []
  for (const f of list) {
    const t = await read(join(REPO, f))
    if (t) texts.push({ f, t })
    else absent.push(f)
  }
  return { texts, absent }
}

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
  const surface = await readSurface(SURFACE)
  for (const { f, t } of surface.texts) {
    t.split(/\r?\n/).forEach((line, i) => {
      for (const c of FORBIDDEN) {
        if (!c.re.test(line)) continue
        // penyangkalan eksplisit: `**not** "certified"`, `bukan "tersertifikasi"`, `jangan tulis "conformant"`
        if (c.bolehNegasi && /(?:\*\*(?:not|never)\*\*|\b(?:not|never|bukan|jangan)\b)[^|\n]{0,24}["“”]/i.test(line)) continue
        bad.push(`${f}:${i + 1} [${c.why}] ${line.trim().slice(0, 90)}`)
      }
    })
  }
  findingsOut.push({
    id: 'A3', kind: bad.length || surface.absent.length ? 'TEMUAN' : 'bersih',
    title: 'kalimat terlarang Claims-Cheat-Sheet di README/docs (dan daftar berkas yang benar-benar terbaca)',
    detail: bad.length ? bad.slice(0, 8).join('\n      ')
      : `${surface.texts.length} berkas disapu, 0 cocok` + (surface.absent.length ? `\n      TIDAK ADA di repo (daftarnya basi — perbarui SURFACE atau pulangkan berkasnya): ${surface.absent.join(', ')}` : ''),
  })

  // 4) Tempat penampung yang tertinggal di kode yang dilihat publik.
  const PUB_CODE = ['web/src/main.ts', 'web/src/verify.ts', 'web/src/lesson-views.ts', 'web/src/pages/class.ts', 'web/src/pages/landing.ts', 'web/src/learning.ts', 'web/src/specAudit.ts', 'signer/src/server.js', 'signer/src/db.js', 'signer/src/credential.js', 'contracts/SoulboundCert.sol', 'contracts/CredentialResolver.sol', 'contracts/CourseDeposit.sol']
  const stubs = []
  const pub = await readSurface(PUB_CODE)
  for (const { f, t } of pub.texts) {
    t.split(/\r?\n/).forEach((line, i) => { for (const re of STUBS) if (re.test(line)) stubs.push(`${f}:${i + 1} ${line.trim().slice(0, 80)}`) })
  }
  findingsOut.push({
    id: 'A4', kind: stubs.length || pub.absent.length ? 'TEMUAN' : 'bersih',
    title: 'TODO/placeholder di berkas yang dibaca orang',
    detail: stubs.length ? stubs.slice(0, 8).join('\n      ')
      : `${pub.texts.length} berkas, 0 cocok` + (pub.absent.length ? `\n      TIDAK ADA di repo: ${pub.absent.join(', ')}` : ''),
  })

  // 5) Dokumen yang disimpan di berkas tapi menyebut domain yang tidak kita pegang.
  //
  // Komentar TIDAK dihitung, dan ini penting: setelah B94 diperbaiki, pemeriksaan ini tetap merah —
  // yang ditandai ternyata baris komentar yang MENJELASKAN kesalahan lamanya ("Versi sebelumnya
  // menulis https://lencana.io/…"). Alat yang menghukum dokumentasinya sendiri akan dibisukan orang
  // dalam dua hari, dan itulah cara gerbang mati. Yang dicari di sini hanyalah KODE yang menyusun
  // URL itu. `lencana.io` sendiri sudah diverifikasi tidak ada: `dns.resolve` → ENOTFOUND untuk A
  // dan AAAA, `fetch https://lencana.io` → ENOTFOUND, sementara `/healthz` tepi kita menjawab 200.
  const fake = []
  const commentish = (line) => /^\s*(\/\/|\*|\/\*|<!--)/.test(line)
  const main = await read(join(REPO, 'web', 'src', 'main.ts'))
  main.split(/\r?\n/).forEach((line, i) => { if (!commentish(line) && /lencana\.io|#key-1\b/.test(line)) fake.push(`web/src/main.ts:${i + 1} ${line.trim().slice(0, 76)}`) })
  findingsOut.push({
    id: 'A5', kind: fake.length ? 'TEMUAN' : 'bersih',
    title: 'dokumen OB3.0 tulisan-tangan dengan URL yang bukan milik kita (R1a)',
    detail: fake.length ? `${fake.length} baris KODE; contoh:\n      ${fake.slice(0, 5).join('\n      ')}` : '0 baris kode (komentar sejarah diabaikan supaya gerbang tidak menghukum dokumentasinya sendiri)',
  })

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

  // 8) BAHASA — keputusan D27/D28: identifier dan pesan yang keluar dari proses = Inggris.
  //
  // Kenapa ini ada: sampai 29 Sep, `forge test` mencetak **87 dari 120** nama fungsi uji dalam
  // bahasa Indonesia (perkiraan pertama kita "5", lalu "41" — dua-duanya salah, dan itu pelajaran:
  // cakupan harus keluar dari alat + diff, bukan dari ingatan). Malam ini 87-nya dipindah ke Inggris
  // dan tiap pasangan kunomori dari diff; `forge test` offline tetap 66/0. Lanjutannya 29 Sep
  // ~13:0xZ: **69** literal `error`/`why`/`reason`/`detail` yang sampai ke klien ikut dipindah ke
  // Inggris, dan `web/scripts/probe.ts` — yang mengassert satu pesan Indonesia apa adanya — dibetulkan
  // pada lintasan yang sama. Baseline turun ke NOL: satu pesan Indonesia baru pun langsung merah.
  // Yang Indonesia dibiarkan hidup: komentar kode, log operator di `scripts/`, dan seluruh `vault/`
  // (bahasa kerja kita; `Claims-Cheat-Sheet`
  // bahkan memuat daftar frasa terlarang untuk melarangnya).
  const ID_WORDS = /\b(tidak|belum|sudah|hanya|dengan|untuk|atas|milik|di luar|butuh|harus|peserta|kursus|penerbit|kredensial|arteofak|artefak|rantai|cabut|dicabut|setelah|karena|verifikasi|kedaluwarsa|prasyarat|prasarat|delegasi|pencabutan|saldo|kosong|nol|sisa|terbagi|ditolak|terdaftar|enumerasi|tanpa|jejak|adegan|ganti|berlaku|berhasil|memegang|orang|siapa|pun|bisa|jalan|lagi|kirimi|kirim|langsung|menyimpan|membagi|plafon|turun|kecil|potongan|pembulatan)\b/i
  const ID_IDENT = /(Tidak|Belum|Sudah|Hanya|Ditolak|Dicabut|Setelah|Karena|Untuk|Dengan|Atas|Milik|Orang|Saldo|Kosong|Nol|Sama|Terdaftar|Enumerasi|Tanpa|Terbagi|Penerbit|Artefak|Kursus|Peserta|Rantai|Adegan|Verifikasi|Kedaluwarsa|Delegasi|Prasarat|Prasyarat|Pencabutan|Menyimpan|Membagi|Plafon|Potongan|Pembulatan|Ganti|Berlaku|Berhasil|Pemegang|Jalan|Lagi|Langsung|Kecil|Sisa|Sentiasa|Dipulihkan|Menandai|Tanpa)/
  const solFiles = []
  for (const dir of ['test', 'contracts']) {
    const abs = join(REPO, dir)
    if (!existsSync(abs)) continue
    for (const e of readdirSync(abs)) if (e.endsWith('.sol')) solFiles.push(join(abs, e))
  }
  const idNames = []
  let testNames = 0
  for (const f of solFiles) {
    const t = await readFile(f, 'utf8')
    t.split(/\r?\n/).forEach((l) => {
      const m = /function\s+(test\w*|check\w*|invariant\w*)/.exec(l)
      if (!m) return
      testNames++
      if (ID_IDENT.test(m[1])) idNames.push(`${f.replace(REPO, '')}: ${m[1]}`)
    })
  }
  const jsSrc = []
  if (existsSync(join(SIGNER, 'src'))) for (const e of readdirSync(join(SIGNER, 'src'))) if (e.endsWith('.js')) jsSrc.push(join(SIGNER, 'src', e))
  const idMsgs = []
  for (const f of jsSrc) {
    const t = await readFile(f, 'utf8')
    t.split(/\r?\n/).forEach((l, i) => {
      const m = /(?:error|why|reason|detail):\s*[`'"]([^`'"\n]{8,})/.exec(l) ?? /new Error\(\s*[`'"]([^`'"\n]{8,})/.exec(l)
      if (m && ID_WORDS.test(m[1])) idMsgs.push(`${f.replace(REPO, '')}:${i + 1}`)
    })
  }
  // 9) TAG BACKLOG DI KODE (aturan #18) — tag 'SELESAI' wajib punya baris tertutup di backlog, dan
  //    baris yang sudah tertutup tidak boleh ditandai 'TERBUKA' di kode. Tag yang tidak diadili
  //    hanyalah klaim kedua: ia basi pada hari ketiga dan tidak ada yang tahu.
  {
    const skipTag = new Set(['node_modules', '.git', 'dist', 'out', 'cache', 'broadcast', 'lib', '.keys', '.store'])
    const berkas = []
    const walkTag = (d) => {
      let es = []
      try { es = readdirSync(d, { withFileTypes: true }) } catch { return }
      for (const e of es) {
        if (skipTag.has(e.name)) continue
        const p = join(d, e.name)
        if (e.isDirectory()) walkTag(p)
        // `sh` sejak B154 (skrip start signer cloud membawa marker).
        else if (/\.(ts|js|mjs|sol|sql|yml|ps1|sh)$/.test(e.name)) berkas.push(p)
      }
    }
    walkTag(REPO)
    const rowsTag = {}
    for (const l of (await read(findings)).split(/\r?\n/)) {
      const m = /^\|\s*\*\*(B\d+)\*\*/.exec(l)
      if (m) {
        const tertutup = /✅|DITUTUP|\bDONE\b/.test(l.split('|')[1] || '')
        // Halaman ini punya DUA tabel (kerja 29 Sep + tabel lama 21 Sep) dan ID yang sama bisa muncul
        // di keduanya. Yang menang adalah TERBUKA: duplikat basi tidak boleh bersembunyi di balik
        // baris baru yang sudah tertutup — itu persis kelas yang dijaga aturan #1.
        rowsTag[m[1]] = (!tertutup || rowsTag[m[1]] === 'TERBUKA') ? 'TERBUKA' : 'SELESAI'
      }
    }
    // Lencana-B112 status=SELESAI 2026-09-30 — A9 membaca token marker bentuk baru, bukan kurung-siku. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B112 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
    // Bentuk kurung-siku ditinggalkan karena ia juga notasi tipe di kode kami (21 lokasi bytes32),
    // jadi A9 tidak bisa menuntut kelengkapan; kelengkapan dijaga `npm run check:labels`.
    const salah = []
    let jumlah = 0
    for (const f of berkas) {
      const isi = await readFile(f, 'utf8')
      for (const m of isi.matchAll(/Lencana-(B\d+) status=(SELESAI|TERBUKA)/g)) {
        jumlah += 1
        const status = rowsTag[m[1]]
        if (!status) { salah.push(`${f.replace(REPO, '')}: Lencana-${m[1]} tidak punya baris di backlog`); continue }
        if (status !== m[2]) salah.push(`${f.replace(REPO, '')}: Lencana-${m[1]} ditandai ${m[2]} padahal backlog ${status}`)
      }
    }
    findingsOut.push({
      id: 'A9', kind: salah.length ? 'TEMUAN' : 'bersih',
      title: 'marker backlog di kode cocok dengan keadaan barisnya di vault (aturan #18)',
      detail: `${jumlah} marker diperiksa` + (salah.length ? `, ${salah.length} TIDAK cocok:\n      ${salah.slice(0, 8).join('\n      ')}` : ' — semuanya cocok dua arah'),
    })
  }


  const MSG_BASELINE = 0
  findingsOut.push({
    id: 'A8', kind: idNames.length || idMsgs.length > MSG_BASELINE ? 'TEMUAN' : 'bersih',
    title: 'bahasa identifier & pesan keluaran (D27/D28) — nol nama test Indonesia dan nol pesan klien Indonesia',
    detail: `${testNames} nama fungsi uji, ${idNames.length} masih Indonesia`
      + `\n      pesan signer ke klien yang masih Indonesia: ${idMsgs.length} (baseline 29 Sep: ${MSG_BASELINE})`
      + (idMsgs.length ? ` — B96 belum selesai: ${idMsgs.slice(0, 6).join(', ')}${idMsgs.length > 6 ? ', …' : ''}` : ' — B96 tertutup untuk kedua lapisan'),
  })

// 8b)Harness: pola yang dicocokkan ke pesan (body.error / why) wajib Inggris.
  //
  // Dua kali hari ini terjemahan membuat gerbang merah bukan karena produknya salah, tapi karena
  // `db-probe.js` mengassert potongan Indonesia (`/tidak diizinkan/`, `/kriteria asing/`).
  // Yang benar: pesan Inggris + assertion Inggris; penomoran label boleh tetap Indonesia karena
  // itu log operator. Pemeriksaan ini menghitung polanya, supaya tidak perlu ditemukan lagi.
  const polaAsli = []
  {
    const dir = join(SIGNER, 'scripts')
    if (existsSync(dir)) for (const e of readdirSync(dir)) {
      if (!/\.js$/.test(e)) continue
      const t = await readFile(join(dir, e), 'utf8')
      t.split(/\r?\n/).forEach((l, i) => {
        const m = /\/([^/*\n][^\n]{3,70}?)\/[a-z]*\.test\(([^)]*(?:error|why)[^)]*)\)/.exec(l)
        if (m && ID_WORDS.test(m[1])) polaAsli.push(`${e}:${i + 1} /${m[1]}/`)
      })
    }
  }
  findingsOut.push({
    id: 'A8b', kind: polaAsli.length ? 'TEMUAN' : 'bersih',
    title: 'pola assertion harness atas pesan (harus Inggris — label Indonesia boleh)',
    detail: polaAsli.length ? `${polaAsli.length} pola masih berbahasa Indonesia: ${polaAsli.slice(0, 6).join(', ')}` : 'tidak ada pola Indonesia yang dicocokkan ke body.error/why',
  })


  // 10) ANGKA README vs numbers.json (B111) — README adalah tabel yang dibaca juri, dan ia
  //     dibiarakan basi oleh alat apa pun: 29 Sep tabelnya menulis web probe 59 / check 76 /
  //     verify:edge 5 / live-cert 17 sementara hari itu yang tercetak 73 / 88 / 9 / 35.
  //    Perintah yang tidak punya metrik di numbers.json (x402, validator, publish:edge, rubric,
  //    inventory, delegate) sengaja TIDAK dibandingkan — mengecualikan tanpa alasan adalah
  //    cara lain untuk membuat gerbang hijau palsu, jadi daftarnya eksplisit.
  {
    const NJ = join(SIGNER, '..', 'vault', '09-Testing', 'numbers.json')
    const README = join(REPO, 'README.md')
    if (!existsSync(NJ) || !existsSync(README)) {
      findingsOut.push({ id: 'A10', kind: 'TEMUAN', title: 'angka README vs numbers.json', detail: 'salah satu berkas tidak terbaca — tidak ada yang dibandingkan' })
    } else {
      const items = JSON.parse(await readFile(NJ, 'utf8')).items ?? {}
      const PETA = {
        'npm run check': 'check', 'npm run verify:db': 'verifyDb', 'npm run probe:serve': 'serveProbe',
        'npm run e2e': 'e2e', 'npm run verify:live-cert': 'liveCert', 'npm run verify:attempts': 'attempts',
        'npm run verify:edge': 'edge', 'npm run probe': 'webProbe', 'npm run check:samples': 'samples',
        'npm run check:spec': 'spec', 'npm run probe:cold': 'coldProbe', 'npm run check:labels': 'labels',
        'npm run check:identity': 'identity', 'forge test': 'forgeOffline',
        // Lencana-B82 status=TERBUKA 2026-10-01 — baris README `verify:privy` diadili terhadap numbers.json sejak hari ia ditulis. (Ditemukan sambil menambahkannya: baris verify:quizkeys/praktik/relay/deposit/agent/agents di README punya metrik di numbers.json tapi tidak ada di peta ini — dicatat di T41, belum dikerjakan.) Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:privy': 'privy',
        // 2 Okt: baris README `verify:records` (B124) dan `verify:paywall` (B125) — temuan B128 — ditulis dan langsung diadili.
        'npm run verify:records': 'records', 'npm run verify:paywall': 'paywall',
        // Lencana-B128 status=TERBUKA 2026-10-02 — baris README `verify:roles` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:roles': 'roles',
        // Lencana-B129 status=TERBUKA 2026-10-02 — baris README `verify:publisher` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:publisher': 'publisher',
        // Lencana-B130 status=TERBUKA 2026-10-02 — baris README `verify:owner` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:owner': 'owner',
        // Lencana-B131 status=TERBUKA 2026-10-03 — baris README `verify:account` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:account': 'account',
        // Lencana-B133 status=TERBUKA 2026-10-03 — baris README `verify:authoring` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:authoring': 'authoring',
        // Lencana-B132 status=TERBUKA 2026-10-03 — baris README `verify:studio` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:studio': 'studio',
        // Lencana-B135 status=TERBUKA 2026-10-03 — baris README `verify:brain` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:brain': 'brain',
        // Lencana-B138 status=TERBUKA 2026-10-03 — baris README `verify:market` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:market': 'market',
        // Lencana-B136 status=SELESAI 2026-10-03 — baris README `verify:history` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B136 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:history': 'history',
        // Lencana-B140 status=TERBUKA 2026-10-04 — baris README `verify:manage` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B140 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:manage': 'manage',
        // Lencana-B148 status=SELESAI 2026-10-05 — baris README `check:contexts` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B148 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run check:contexts': 'contexts',
        // Lencana-B144 status=TERBUKA 2026-10-05 — baris README `verify:review` diadili terhadap numbers.json sejak hari ia ditulis. Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B144 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
        'npm run verify:review': 'review',
      }
      const salah = []
      let banding = 0
      const readme = await readFile(README, 'utf8')
      readme.split(/\r?\n/).forEach((line, i) => {
        const cmd = Object.keys(PETA).sort((a, b) => b.length - a.length).find((c) => line.includes(c))
        // Baris `forge test` hanya dibandingkan dengan metrik OFFLINE, dan itu pun hanya pada baris
        // yang menyebut --no-match-path: angka fork memang beda dan itu sah (65 offline dengan
        // --no-match-path — itulah perintah yang dijalankan harness sejak B114; 66 untuk `forge test`
        // polos dengan 9 skip; 120 dengan fork aktif di 97; 104 di 56). Membandingkan semuanya =
        // A10 merah selamanya.
        if (line.includes('forge test') && !line.includes('no-match-path')) return
        if (!cmd) return
        const m = line.match(/\*\*\s*(\d{1,4})\s*(?:checks\s*\/|passed\s*\/|\/)\s*(\d{1,3})/)
        const it = items[PETA[cmd]]
        if (!m || !it) return
        banding += 1
        if (Number(m[1]) !== it.pass || Number(m[2]) !== it.fail) {
          salah.push(`README:${i + 1} ${cmd} mengklaim ${m[1]}/${m[2]} · numbers.json ${it.pass}/${it.fail}`)
        }
      })
      findingsOut.push({
        id: 'A10', kind: salah.length ? 'TEMUAN' : 'bersih',
        title: 'angka pada tabel bukti README sama dengan yang dicetak harness (B111)',
        detail: `${banding} klaim dibandingkan` + (salah.length ? `, ${salah.length} BEDA:\n      ${salah.join('\n      ')}` : ' — semua cocok dengan numbers.json'),
      })
    }
  }

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
