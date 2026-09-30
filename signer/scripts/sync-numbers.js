/**
 * `npm run sync:numbers` — satu sumber angka untuk vault, dan penjaga yang bisa dipanggil CI.
 *
 * Kenapa ini ada (B93, terukur 29 Sep): vault sempat tertinggal dari angkanya sendiri di enam
 * berkas, dan tidak ada satu pun gerbang yang menangkapnya — `check-links` menjaga tautan,
 * `check-mermaid` menjaga diagram, `check-paste` menjaga lebar artefak. Yang tidak dijaga adalah
 * hal yang paling sering dikutip halaman: **berapa pemeriksaan yang lulus hari ini**. Angka yang
 * disalin berhenti jadi kebenaran pada saat harness pertama berubah, persis pelajaran B43/B56.
 *
 * Dua mode:
 *   npm run sync:numbers              jalankan harness, tulis 09-Testing/numbers.json, cetak tabel
 *   npm run sync:numbers -- --verify  JANGAN jalankan apa pun; bandingkan angka di numbers.json
 *                                     dengan angka yang tertulis di halaman vault. Merah kalau
 *                                     ada halaman yang masih menyebut angka lama.
 *
 * Aturan yang membuat ini berguna, bukan cuma nyaman:
 *   - Angka tidak pernah dikarang. Yang ditulis ke JSON adalah yang dicetak harness; kalau
 *     polanya tidak ketemu, metric-nya `null` dan tabelnya merah — bukan angka lama dipertahankan.
 *   - Yang menyentuh chain/tupe berbiaya (publish, live issuance) TIDAK ikut default; ia di balik
 *     `--expensive`, supaya `--verify` bisa dijalankan orang dari clone tanpa membakar gas.
 *   - Halaman yang boleh menyebut angka historis (mis. riwayat 8/14 → 19/19) tidak dianggap salah;
 *     yang salah adalah halaman yang mengaku "hari ini" dengan angka kemarin. Itu dibedakan lewat
 *     pola eksplisit di DOC_CLAIMS, bukan lewat menebak-nebak.
 */

// Lencana-B93 status=SELESAI 2026-09-29 — satu sumber angka + --verify memarahi halaman yang basi. Buktikan ulang: npm run sync:numbers -- --verify. JANGAN dibalik/diulang tanpa membuka kembali baris B93 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B107 status=SELESAI 2026-09-29 — merah harness wajib cetak prasyarat + 12 baris keluaran anak; --only menolak menulis numbers.json. Buktikan ulang: npm run sync:numbers -- --only=serveProbe. JANGAN dibalik/diulang tanpa membuka kembali baris B107 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { execFile } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const HERE = dirname(fileURLToPath(import.meta.url))
const SIGNER = resolve(HERE, '..')
const REPO = resolve(SIGNER, '..')
const OUT = join(REPO, 'vault', '09-Testing', 'numbers.json')
const VERIFY = process.argv.includes('--verify')
const EXPENSIVE = process.argv.includes('--expensive')
const _oi = process.argv.indexOf('--only')
const ONLY = (_oi > -1 ? process.argv[_oi + 1] : (process.argv.find((a) => a.startsWith('--only=')) ?? '').split('=')[1]) || null
// B107: keluaran anak disimpan supaya merah mana pun bisa dibaca penyebabnya, bukan sekadar
// "Command failed". Merah tanpa sebab membuat orang menonaktifkan gerbangnya, bukan harnessnya.
const texts = new Map()
const tailOf = (id, n = 12) => (texts.get(id) ?? '').split(/\r?\n/).filter((s) => s.trim()).slice(-n)

/** Harness yang jadi sumber angka. `re` wajib menangkap "lulus / gagal". */
const HARNESS = [
  { id: 'check', label: 'check.js', cwd: SIGNER, cmd: ['npm', ['run', 'check']], re: /CHECK HIJAU — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'verifyDb', label: 'verify:db', cwd: SIGNER, cmd: ['npm', ['run', 'verify:db']], re: /DB HIJAU — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'serveProbe', label: 'serve-probe', needs: 'signer lokal hidup — jalankan npm run serve lebih dulu (probe ini menguji proses yang sedang berjalan, bukan menyalakannya)', cwd: SIGNER, cmd: ['npm', ['run', 'probe:serve']], re: /PROBE SERVE HIJAU — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'e2e', label: 'e2e', cwd: SIGNER, cmd: ['npm', ['run', 'e2e']], re: /E2E HIJAU — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'liveCert', label: 'verify:live-cert', cwd: SIGNER, cmd: ['npm', ['run', 'verify:live-cert']], re: /LAPIS ARTEFAK HIJAU — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'attempts', label: 'verify:attempts (offline)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:attempts']], re: /^(\d+) pemeriksaan \/ (\d+) gagal/m },
  { id: 'edge', label: 'verify:edge', cwd: SIGNER, cmd: ['npm', ['run', 'verify:edge']], re: /TEPI HIJAU — (\d+) pemeriksaan, (\d+) gagal/, also: /terukur : (\d+) dari (\d+)/ },
  // Lencana-B114 status=SELESAI 2026-09-30 — perintah harness ini sekarang PERSIS perintah yang
  // dinamai barisnya di README (`forge test --no-match-path "*.fork.t.sol"`). Sebelumnya harness
  // menjalankan `forge test` polos (66 passed, 0 failed, 9 skipped) sementara baris README menempelkan
  // angka itu pada perintah --no-match-path yang mencetak 65/0/0 — dan A10 tetap hijau, karena ia
  // membandingkan angka dengan angka, bukan angka dengan perintah yang menamainya. Buktikan ulang:
  // npm run sync:numbers lalu npm run audit (A10). JANGAN dibalik/diulang tanpa membuka kembali baris B114 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'forgeOffline', label: 'forge test (offline, tanpa *.fork.t.sol)', cwd: REPO, cmd: ['forge', ['test', '--no-match-path', '*.fork.t.sol']], re: /(\d+) tests passed, (\d+) failed, (\d+) skipped/ },
  { id: 'webProbe', label: 'probe (web)', cwd: join(REPO, 'web'), cmd: ['npm', ['run', 'probe']], re: /PROBE HIJAU \((\d+) pemeriksaan, (\d+) gagal\)/ },
  { id: 'samples', label: 'check:samples (contoh UI × tepi × chain)', cwd: SIGNER, cmd: ['npm', ['run', 'check:samples']], re: /CONTOH UI (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'spec', label: 'check:spec (14 asersi dinilai)', cwd: join(REPO, 'web'), cmd: ['npm', ['run', 'check:spec']], re: /hasil: (\d+) lulus · (\d+) gagal/ },
  { id: 'coldProbe', label: 'probe:cold (store dingin dari clone)', cwd: SIGNER, cmd: ['npm', ['run', 'probe:cold']], re: /PROBE COLD (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'labels', label: 'check:labels (kelengkapan label aturan #18)', cwd: SIGNER, cmd: ['npm', ['run', 'check:labels']], re: /LABEL (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'identity', label: 'check:identity (satu sumber identitas penerbit)', cwd: SIGNER, cmd: ['npm', ['run', 'check:identity']], re: /IDENTITAS (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'cleanup', label: 'cleanup (sisa baris tes = 0)', cwd: SIGNER, cmd: ['npm', ['run', 'cleanup']], re: /CLEANUP (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
]
if (EXPENSIVE) {
  HARNESS.push({ id: 'attemptsLive', label: 'verify:attempts:live (rantai + gas testnet)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:attempts:live']], re: /^(\d+) pemeriksaan \/ (\d+) gagal/m })
  HARNESS.push({ id: 'publishEdge', label: 'publish:edge', cwd: SIGNER, cmd: ['npm', ['run', 'publish:edge']], re: /PUBLISH HIJAU — (\d+)\/(\d+)/ })
}

const fmt = (m) => (m == null ? '?' : m.pass === 0 && m.total === 0 ? '—' : `${m.pass}/${m.fail}`)

async function collect () {
  const out = {}
  for (const h of HARNESS.filter((x) => !ONLY || x.id === ONLY || x.label === ONLY)) {
    try {
      const { stdout, stderr } = await run(h.cmd[0], h.cmd[1], { cwd: h.cwd, maxBuffer: 24 * 1024 * 1024, shell: true })
      const text = `${stdout}\n${stderr}`
      texts.set(h.id, text)
      const m = h.re.exec(text)
      if (!m) { out[h.id] = { total: 0, pass: 0, fail: 0, error: 'pola keluaran tidak ketemu — angka TIDAK dikarang' }; console.log(`  MERAH  ${h.label}: tidak terbaca`); continue }
      const g = m.slice(1).map(Number)
      const total = g[0] ?? 0
      const fail = g[1] ?? 0
      const skipped = g[2] ?? 0
      out[h.id] = { total, fail, skipped, pass: total - fail }
      if (h.also) {
        const extra = h.also.exec(text)
        if (extra) out[h.id].ratio = { a: Number(extra[1]), b: Number(extra[2]) }
      }
      console.log(`  ${fail === 0 ? 'ok    ' : 'MERAH '} ${h.label}: ${total} total, ${fail} gagal${skipped ? `, ${skipped} di-skip` : ''}`)
    } catch (e) {
      const text = `${e.stdout ?? ''}\n${e.stderr ?? ''}`
      texts.set(h.id, text)
      const m = h.re.exec(text)
      if (m) {
        const g = m.slice(1).map(Number)
        out[h.id] = { total: g[0] ?? 0, fail: g[1] ?? 0, skipped: g[2] ?? 0, pass: (g[0] ?? 0) - (g[1] ?? 0), error: 'keluar non-nol' }
        console.log(`  MERAH  ${h.label}: ${out[h.id].total} total, ${out[h.id].fail} gagal (exit non-nol)`)
      } else {
        out[h.id] = { total: 0, fail: 0, pass: 0, error: String(e.message ?? e).slice(0, 120) }
        console.log(`  MERAH  ${h.label}: tidak berjalan — ${out[h.id].error}`)
      }
    }
  }
  const merah = Object.entries(out).filter(([, m]) => m && m.error)
  if (merah.length) {
    console.log('\n  DIAGONOSA (B107) — harness yang tidak hijau, dengan sebab dan cara mengulanginya:')
    for (const [id, m] of merah) {
      const h = HARNESS.find((x) => x.id === id)
      const lines = tailOf(id)
      console.log('  · ' + (h?.label ?? id) + ': ' + m.error)
      if (h?.needs) console.log('      prasyarat : ' + h.needs)
      if (/ECONNREFUSED|fetch failed|tidak menjawab|server .* tidak|connect/i.test(lines.join('\n'))) {
        console.log('      penyelamat: npm run serve   (lalu ulangi harness ini saja)')
      }
      if (lines.length) {
        console.log('      12 baris terakhir keluaran anak:')
        for (const s of lines) console.log('        | ' + s.slice(0, 150))
      } else console.log('      (anak tidak mencetak apa pun — keluaran hilang, BUKAN nol)')
    }
    console.log('  Ulangi satu harness: npm run sync:numbers -- --only=<id>   (mis. --only=serveProbe)')
  }
  if (ONLY) console.log('\n  (--only=' + ONLY + ': ' + Object.keys(out).length + ' harness saja dijalankan — angka ini SEBAGIAN, tidak layak untuk numbers.json)')
  return out
}

/**
 * Klaim yang tertulis di halaman vault. `where` adalah pola yang harus ADA di berkas itu dengan
 * angka dari JSON; kalau tidak ada, kita cetak baris yang sekarang supaya bisa diperbaiki.
 */
const DOC_CLAIMS = [
  { file: '09-Testing/T21 - signer db-probe.js.md', metric: 'verifyDb', want: (m) => `result: ${m.total} checks / 0 failed`, note: 'front matter T21' },
  { file: '09-Testing/T22 - signer attempts-check.js.md', metric: 'attempts', want: (m) => `${m.pass}/${m.fail} offline`, note: 'front matter T22 (offline)' },
  { file: '09-Testing/T22 - signer attempts-check.js.md', metric: 'verifyDb', want: (m) => `\`verify:db\` **${m.pass}/${m.fail}**`, note: 'baris regresi T22' },
  { file: '09-Testing/T24 - signer rehost.js.md', metric: 'verifyDb', want: (m) => `\`verify:db\` **${m.pass}/${m.fail}**`, note: 'baris regresi T24' },
  { file: '09-Testing/T24 - signer rehost.js.md', metric: 'check', want: (m) => `\`check.js\` **${m.pass}/${m.fail}**`, note: 'baris regresi T24' },
  { file: '09-Testing/T25 - web spec-audit-check.ts.md', metric: 'spec', want: (m) => `**${m.pass}/${m.fail}** lulus`, note: 'front matter T25 (14 asersi dinilai)' },
  { file: '09-Testing/T25 - web spec-audit-check.ts.md', metric: 'spec', want: (m) => `hasil: ${m.pass} lulus · ${m.fail} gagal`, note: 'blok angka T25' },
  { file: '09-Testing/T26 - signer sample-check.js.md', metric: 'samples', want: (m) => `check:samples **${m.pass}/${m.fail}**`, note: 'front matter T26 (contoh UI × tepi × chain)' },
  { file: '09-Testing/T26 - signer sample-check.js.md', metric: 'samples', want: (m) => `HIJAU — ${m.pass} pemeriksaan, ${m.fail} gagal`, note: 'blok angka T26' },
  { file: '09-Testing/T29 - signer label-coverage.js.md', metric: 'labels', want: (m) => `LABEL HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T29 (kelengkapan label)' },
  { file: '09-Testing/T31 - signer identity-check.js.md', metric: 'identity', want: (m) => `IDENTITAS HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T31 (satu sumber identitas)' },
  { file: '00-Overview/12 - Business Process.md', metric: 'verifyDb', want: (m) => `\`npm run verify:db\` **${m.pass}/${m.fail}**`, note: 'tabel §7 baris 1' },
  { file: '10-Contributors/Claims-Cheat-Sheet.md', metric: 'check', want: (m) => `signer check **${m.pass}/${m.fail}**`, note: 'baris ringkasan harness' },
  // Catatan matcher: halaman ini menulis `verify:edge **8/0 · 19 dari 19**`, jadi polanya sengaja
  // berhenti sebelum `**` penutup. Versi pertama menuntut `**8/0**` persis dan menghasilkan "BEDA"
  // untuk halaman yang sebenarnya benar — penjaga dengan pola yang salah lebih berbahaya daripada
  // tidak ada penjaga, karena ia melatih orang mengabaikan barisnya.
  { file: '10-Contributors/Claims-Cheat-Sheet.md', metric: 'edge', want: (m) => `verify:edge **${m.pass}/${m.fail}`, note: 'baris ringkasan harness' },
  { file: 'START-HERE.md', metric: 'edge', want: (m) => m.ratio ? `**${m.ratio.a} dari ${m.ratio.b}**` : 'TIDAK ADA RASIO', note: 'baris Publicly readable' },
  // B114: kolom Quick-Reference berjudul "angka terakhir yang dicetak", jadi tiap barisnya yang punya
  // metrik di numbers.json WAJIB kini — dan mulai hari ini dijaga, bukan dibiarkan pada ingatan.
  // Baris hub Testing SENGAJA tidak ikut: kolomnya bertanggal, isinya rekaman pengukuran hari itu,
  // dan memaksanya sama dengan hari ini berarti menyuruh orang menulis ulang sejarah. Garisnya:
  // QR = klaim kini, hub = rekaman bertanggal. Polanya regex dan longgar pada kata "pemeriksaan",
  // karena QR menulis bentuk pendek ("CLEANUP HIJAU — 6, 0 gagal") sementara alatnya mencetak panjang.
  { file: 'Quick-Reference.md', metric: 'labels', want: (m) => new RegExp(`LABEL HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris check:labels di QR' },
  { file: 'Quick-Reference.md', metric: 'identity', want: (m) => new RegExp(`IDENTITAS HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris check:identity di QR' },
  { file: 'Quick-Reference.md', metric: 'cleanup', want: (m) => new RegExp(`CLEANUP HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris cleanup di QR' },
  { file: 'Quick-Reference.md', metric: 'samples', want: (m) => new RegExp(`CONTOH UI HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris check:samples di QR' },
  { file: 'Quick-Reference.md', metric: 'coldProbe', want: (m) => new RegExp(`PROBE COLD HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris probe:cold di QR' },
  { file: 'Quick-Reference.md', metric: 'serveProbe', want: (m) => new RegExp(`PROBE SERVE HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris probe:serve di QR' },
  { file: 'Quick-Reference.md', metric: 'spec', want: (m) => new RegExp(`${m.pass} lulus · ${m.fail} gagal`), note: 'baris check:spec di QR' },
  { file: 'Quick-Reference.md', metric: 'attempts', want: (m) => new RegExp(`${m.pass}/${m.fail} offline`), note: 'baris verify:attempts di QR' },
  { file: 'Quick-Reference.md', metric: 'edge', want: (m) => (m.ratio ? new RegExp(`npm run rehost[^\\n]*${m.ratio.a} dari ${m.ratio.b}`) : 'TIDAK ADA RASIO'), note: 'baris rehost di QR' },
  { file: 'Quick-Reference.md', metric: 'verifyDb', want: (m) => new RegExp(`npm run grade:essay[^\\n]*verify:db.{0,3}${m.pass}/${m.fail}`), note: 'baris grade:essay di QR (mengutip angka verify:db)' },
  // Ketahuan saat mengerjakan B105: angka probe web di Claims-Cheat-Sheet tidak dijaga klaim mana pun,
  // jadi ia sempat basi (tertulis 73/0 padahal run hari itu mencetak 82/0) tanpa ada yang merah —
  // A10 hanya menyapu README akar. Kelas lubang yang sama dengan B114, jadi ditutup dengan cara yang
  // sama: klaimnya didaftarkan, bukan angkanya dihafal.
  { file: '10-Contributors/Claims-Cheat-Sheet.md', metric: 'webProbe', want: (m) => `probe web **${m.pass}/${m.fail}**`, note: 'baris ringkasan harness (probe web)' },
]

async function verifyDocs (numbers) {
  let bad = 0
  for (const c of DOC_CLAIMS) {
    const m = numbers[c.metric]
    if (!m || m.error) { console.log(`  MERAH  ${c.file}: sumber ${c.metric} tidak terbaca (${m?.error ?? 'kosong'})`); bad += 1; continue }
    const want = c.want(m)
    let text
    try { text = await readFile(join(REPO, 'vault', c.file), 'utf8') } catch { console.log(`  MERAH  ${c.file}: berkas tidak ada`); bad += 1; continue }
    const hit = want instanceof RegExp ? want.test(text) : text.includes(want)
    if (hit) continue
    bad += 1
    const label = c.metric === 'edge' ? /verify:edge|verify:edge `|Publicly readable/ : new RegExp(c.metric.replace(/^verify:/, ''))
    const lines = text.split(/\r?\n/)
    const hits = lines.map((l, i) => (label.test(l) && /\*\*[0-9]+\/[0-9]+\*\*|[0-9]+\/0 offline|result:/.test(l) ? `      ${i + 1}: ${l.trim().slice(0, 120)}` : null)).filter(Boolean)
    console.log(`  BEDA   ${c.file} (${c.note}) — harus memuat "${want}"`)
    for (const h of hits.slice(0, 3)) console.log(h)
  }
  // Jumlah klaim DICETAK, bukan diingat: Quick-Reference mengutip angka ini, dan angka yang tidak
  // bisa dicetak perintahnya sendiri tidak boleh dikutip siapa pun (termasuk olehku).
  console.log(`  klaim halaman yang diperiksa: ${DOC_CLAIMS.length}`)
  return bad
}

if (VERIFY) {
  if (!existsSync(OUT)) { console.error('numbers.json belum ada — jalankan npm run sync:numbers dulu'); process.exit(1) }
  // Bug yang ketahuan begitu jalur ini DIPERIKSA, bukan dibaca: berkas ditulis sebagai
  // { capturedAt, note, items } tapi baris ini memanggil JSON.parse(...).numbers → undefined,
  // lalu TypeError di karakter pertama laporan. Alat yang tidak dijalankan di semua jalurnya
  // bukan alat — itu skrip yang kelihatan benar.
  const doc = JSON.parse(await readFile(OUT, 'utf8'))
  const numbers = doc.items ?? {}
  console.log(`\nsync:numbers --verify (sumber ${OUT}, dicatat ${doc.capturedAt})`)
  const bad = await verifyDocs(numbers)
  console.log(bad === 0 ? '\nANGKA HIJAU — halaman vault sepakat dengan numbers.json' : `\nANGKA MERAH — ${bad} klaim halaman tidak cocok. Perbaiki halamannya, jangan angka JSON-nya.`)
  process.exit(bad === 0 ? 0 : 1)
}

console.log('\nsync:numbers — menjalankan harness (yang murah saja; --expensive untuk yang berbiaya)\n')
const items = await collect()
const ratio = items.edge?.ratio ?? null
// B107: run sebagian TIDAK boleh menimpa keadaan utuh.
if (ONLY) {
  console.log('\n  numbers.json TIDAK ditulis (--only=' + ONLY + ' = angka sebagian; 11 metrik lain akan tertulis "tidak dijalankan")')
  process.exit(0)
}
await writeFile(OUT, JSON.stringify({
  capturedAt: new Date().toISOString(),
  note: 'Dihasilkan npm run sync:numbers. Halaman vault yang mengutip angka harness wajib cocok dengan berkas ini (verify: npm run sync:numbers -- --verify).',
  items,
}, null, 2), 'utf8')
console.log('\nringkas :')
for (const h of HARNESS) {
  const m = items[h.id]
  console.log(`  ${h.label.padEnd(42)} ${m && !m.error ? `${m.total} total / ${m.fail} gagal` : `TIDAK TERBACA: ${m?.error ?? 'tidak dijalankan'}`}   ${ratio && h.id === 'edge' ? `(${ratio.a} dari ${ratio.b})` : ''}`)
}
console.log(`\ntertulis: ${OUT}`)
