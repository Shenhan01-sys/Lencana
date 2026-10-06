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
import { execFile, spawn, spawnSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { createServer } from 'node:net'
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

// Lencana-B156 status=SELESAI 2026-10-05 — baterai tidak lagi menuntut signer lokal menyala terus: harness `ownSigner` (serve-probe) dijalankan terhadap signer sementara di port bebas yang dinyalakan dan dimatikan baterai sendiri; BASE_URL di lingkungan tetap menang. Buktikan ulang: npm run sync:numbers -- --only=serveProbe dengan :8787 mati. JANGAN dibalik/diulang tanpa membuka kembali baris B156 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
const freePort = () => new Promise((ok, no) => {
  const s = createServer()
  s.on('error', no)
  s.listen(0, '127.0.0.1', () => { const { port } = s.address(); s.close(() => ok(port)) })
})
/**
 * Signer sementara untuk harness yang menguji server yang SEDANG berjalan. Sejak backend hanya di Railway (B156) tidak ada
 * lagi signer lokal yang menyala terus, jadi baterai menyalakannya sendiri — kode dan `.store` di mesin ini, port bebas,
 * `LANCENA_ORIGIN=test` (konvensi harness yang menyalakan servernya sendiri) — lalu mematikan pohon prosesnya.
 * `BASE_URL` di lingkungan menang: dengan itu probe tetap bisa diarahkan ke signer yang sudah berjalan.
 */
async function withOwnSigner (fn) {
  if (process.env.BASE_URL) return fn({})
  const port = await freePort()
  const base = `http://127.0.0.1:${port}`
  const child = spawn('npm', ['run', 'serve'], {
    cwd: SIGNER, stdio: 'ignore', shell: true, detached: process.platform !== 'win32',
    env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', BASE_URL: base, LANCENA_ORIGIN: 'test' },
  })
  const stop = () => {
    if (!child.pid) return
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else { try { process.kill(-child.pid) } catch { child.kill() } }
  }
  try {
    let up = false
    for (let i = 0; i < 120 && !up; i++) {
      try { up = (await fetch(`${base}/catalog/published`, { signal: AbortSignal.timeout(3000) })).ok } catch { /* belum mendengarkan */ }
      if (!up) await new Promise((r) => setTimeout(r, 500))
    }
    if (!up) throw new Error(`signer sementara tidak menjawab di ${base} dalam 60 detik`)
    return await fn({ BASE_URL: base })
  } finally {
    stop()
  }
}

/** Harness yang jadi sumber angka. `re` wajib menangkap "lulus / gagal". */
// Lencana-B128 status=SELESAI 2026-10-02 — lima pola pertama dulu hanya cocok dengan "HIJAU", jadi run merah (mis. "CHECK MERAH — 106 pemeriksaan, 1 gagal", 2 Okt) dilaporkan "tidak berjalan" alih-alih jumlah gagalnya; kini HIJAU|MERAH seperti harness lain. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
const HARNESS = [
  { id: 'check', label: 'check.js', cwd: SIGNER, cmd: ['npm', ['run', 'check']], re: /CHECK (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'verifyDb', label: 'verify:db', cwd: SIGNER, cmd: ['npm', ['run', 'verify:db']], re: /DB (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'serveProbe', label: 'serve-probe', ownSigner: true, needs: 'signer sementara dinyalakan baterai sendiri (port bebas, LANCENA_ORIGIN=test) lalu dimatikan — B156; untuk menguji signer yang sudah berjalan: BASE_URL=<url> npm run probe:serve', cwd: SIGNER, cmd: ['npm', ['run', 'probe:serve']], re: /PROBE SERVE (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'e2e', label: 'e2e', cwd: SIGNER, cmd: ['npm', ['run', 'e2e']], re: /E2E (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'liveCert', label: 'verify:live-cert', cwd: SIGNER, cmd: ['npm', ['run', 'verify:live-cert']], re: /LAPIS ARTEFAK (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
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
  // Lencana-B97 status=SELESAI 2026-09-30 — rute relayer ikut jadi sumber angka; ia menyalakan servernya sendiri dengan store dingin dan tidak mengeluarkan gas. Buktikan ulang: npm run sync:numbers -- --only=relay. JANGAN dibalik/diulang tanpa membuka kembali baris B97 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'relay', label: 'verify:relay (rute relayer, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:relay']], re: /RELAY (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B90 status=SELESAI 2026-09-30 — rute setoran tenggat ikut jadi sumber angka; mode tanpa gas, servernya sendiri dengan store dingin. Buktikan ulang: npm run sync:numbers -- --only=deposit. JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'deposit', label: 'verify:deposit (setoran tenggat, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:deposit']], re: /DEPOSIT (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B118 status=SELESAI 2026-10-01 —identitas agen ERC-8004 ikut jadi sumber angka; baca-saja, tanpa transaksi. Buktikan ulang: npm run sync:numbers -- --only=agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'agent', label: 'verify:agent (identitas ERC-8004, baca-saja)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:agent']], re: /AGEN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B119 status=SELESAI 2026-10-01 — sewa agen per aktivitas (B119) dan reviewer agen (B120) ikut jadi sumber angka; mode tanpa gas, server sendiri, baris origin=test. Buktikan ulang: npm run sync:numbers -- --only=agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'agents', label: 'verify:agents (sewa agen + reviewer agen, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:agents']], re: /AGEN SEWA (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B121 status=SELESAI 2026-10-01 — slot praktik dinilai chain ikut jadi sumber angka; mode tanpa gas (transaksi tetap KNOWN_TX), server sendiri, baris origin=test; B121 tetap terbuka sampai halaman belajar memanggil POST /praktik. Buktikan ulang: npm run sync:numbers -- --only=praktik. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'praktik', label: 'verify:praktik (slot praktik dinilai chain, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:praktik']], re: /PRAKTIK (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B80 status=SELESAI 2026-10-01 — kunci jawaban kuis di luar bundel browser ikut jadi sumber angka: harness membangun bundel web, memindainya, dan menguji /grade. Buktikan ulang: npm run sync:numbers -- --only=quizkeys. JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'quizkeys', label: 'verify:quizkeys (kunci kuis di luar bundel browser)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:quizkeys']], re: /KUNCI KUIS (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B82 status=SELESAI 2026-10-01 — login Privy ikut jadi sumber angka: app secret diuji ke API users Privy (dengan kontrol secret palsu), token palsu ditolak, ikatan alamat ↔ akun atomik, RLS, bundel web; yang belum: jalur positif dengan kode email sungguhan (uji dua peramban oleh builder). Buktikan ulang: npm run sync:numbers -- --only=privy. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'privy', label: 'verify:privy (login Privy: token, ikatan akun, bundel)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:privy']], re: /LOGIN PRIVY (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'records', label: 'verify:records (rekaman milik peserta, bertanda tangan)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:records']], re: /REKAMAN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'paywall', label: 'verify:paywall (bayar dulu baru masuk kelas, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:paywall']], re: /PAYWALL (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'roles', label: 'verify:roles (peran akun: penerbit, anggota, Agent Owner)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:roles']], re: /PERAN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'publisher', label: 'verify:publisher (pengajuan anggota, dasbor penerbit, aksi anggota)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:publisher']], re: /KURSI PENERBIT (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'owner', label: 'verify:owner (dasbor Agent Owner, gas, agregasi dompet agen)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:owner']], re: /AGENT OWNER (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'account', label: 'verify:account (satu akun satu peran, akun dev)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:account']], re: /SATU PERAN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'authoring', label: 'verify:authoring (susun kursus, terbit oleh kunci penerbit)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:authoring']], re: /SUSUN KURSUS (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  { id: 'studio', label: 'verify:studio (robot agen: rupa, templat registrasi, klaim swalayan)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:studio']], re: /BENGKEL AGEN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B135 status=SELESAI 2026-10-03 — verify:brain ikut baterai (tanpa kunci LLM, tanpa gas); --live tidak, karena memakai kuota Groq tim. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'brain', label: 'verify:brain (otak agen: tujuh provider, kalibrasi, antrean dompet agen)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:brain']], re: /OTAK AGEN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B138 status=SELESAI 2026-10-03 — verify:market ikut baterai (tanpa gas, sewa ulang #2534 idempoten). Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'market', label: 'verify:market (bursa agen: konflik sewa/tunjuk, entri tanpa data peserta, cache)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:market']], re: /BURSA AGEN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B136 status=SELESAI 2026-10-03 — verify:history ikut baterai (baca saja: RPC cadangan untuk riwayat chain). Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B136 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'history', label: 'verify:history (riwayat chain: RPC cadangan, missing ≠ unreachable)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:history']], re: /RIWAYAT CHAIN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B140 status=SELESAI 2026-10-04 — verify:manage ikut baterai murah (tanpa gas): versi kursus, arsip, terbit/tolak dari dasbor dengan jejak peminta. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B140 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'manage', label: 'verify:manage (kelola kursus: versi, arsip, terbit dari dasbor)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:manage']], re: /KELOLA KURSUS (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B148 status=SELESAI 2026-10-05 — check:contexts ikut baterai murah: konteks JSON-LD dari salinan repo, fetch ke host konteks diblokir di dalam harness. Yang online (-- --online) sengaja TIDAK di sini supaya baterai tidak bergantung situs pihak ketiga. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B148 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'contexts', label: 'check:contexts (konteks JSON-LD dari salinan repo, tanpa jaringan)', cwd: SIGNER, cmd: ['npm', ['run', 'check:contexts']], re: /KONTEKS JSON-LD (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B144 status=SELESAI 2026-10-05 — verify:review ikut baterai murah (tanpa gas): meja pengesahan agen pengesah, rubrik pengesahan/penilaian milik esainya sendiri, bersih-bersih baris peserta uji. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B144 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'review', label: 'verify:review (meja pengesahan: antrean dompet pengesah, rubrik milik esainya)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:review']], re: /MEJA PENGESAHAN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B155 status=SELESAI 2026-10-05 — verify:limits ikut baterai murah (tanpa gas): batas faucet + gas per IP dan kuota harian, IP klien hanya dari proxy tepercaya, /faucet ditolak sebelum tanda tangan dipakai. Buktikan ulang: npm run sync:numbers. JANGAN dibalik/diulang tanpa membuka kembali baris B155 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  { id: 'limits', label: 'verify:limits (batas faucet + gas per IP dan kuota harian, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:limits']], re: /BATAS PEMBERIAN (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
  // Lencana-B169 status=SELESAI 2026-10-06 — verify:mint ikut baterai murah (tanpa gas): POST /me/mint (cetak artefak NFT atas permintaan pemegang kredensial), aturan kontrak dibaca lewat eth_call sebagai platform, nonce tidak terbakar saat ditolak. `--live` (menerbitkan kredensial + gas) TIDAK ikut. Buktikan ulang: npm run sync:numbers
  { id: 'mint', label: 'verify:mint (cetak artefak NFT atas permintaan peserta, tanpa gas)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:mint']], re: /CETAK ARTEFAK (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ },
]
if (EXPENSIVE) {
  HARNESS.push({ id: 'attemptsLive', label: 'verify:attempts:live (rantai + gas testnet)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:attempts:live']], re: /^(\d+) pemeriksaan \/ (\d+) gagal/m })
  HARNESS.push({ id: 'publishEdge', label: 'publish:edge', cwd: SIGNER, cmd: ['npm', ['run', 'publish:edge']], re: /PUBLISH HIJAU — (\d+)\/(\d+)/ })
  // Lencana-B143 status=SELESAI 2026-10-04 — verify:brain-e2e:live ikut lapis mahal (gas + LLM sungguhan + publish ke tepi; butuh CLOUDFLARE_* di lingkungan). Buktikan ulang: npm run sync:numbers -- --expensive. JANGAN dibalik/diulang tanpa membuka kembali baris B143 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  HARNESS.push({ id: 'brainE2e', label: 'verify:brain-e2e:live (esai → otak agen → kertas; gas + LLM)', cwd: SIGNER, cmd: ['npm', ['run', 'verify:brain-e2e:live']], re: /OTAK SAMPAI KERTAS (?:HIJAU|MERAH) — (\d+) pemeriksaan, (\d+) gagal/ })
}

const fmt = (m) => (m == null ? '?' : m.pass === 0 && m.total === 0 ? '—' : `${m.pass}/${m.fail}`)

async function collect () {
  const out = {}
  for (const h of HARNESS.filter((x) => !ONLY || x.id === ONLY || x.label === ONLY)) {
    try {
      const exec = (env) => run(h.cmd[0], h.cmd[1], { cwd: h.cwd, maxBuffer: 24 * 1024 * 1024, shell: true, env: { ...process.env, ...env } })
      const { stdout, stderr } = h.ownSigner ? await withOwnSigner(exec) : await exec({})
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
      if (!h?.ownSigner && /ECONNREFUSED|fetch failed|tidak menjawab|server .* tidak|connect/i.test(lines.join('\n'))) {
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
  { file: '09-Testing/T33 - signer relay-check.js.md', metric: 'relay', want: (m) => `RELAY HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T33 (rute relayer)' },
  { file: 'Quick-Reference.md', metric: 'relay', want: (m) => new RegExp(`RELAY HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:relay di QR' },
  { file: '09-Testing/T34 - signer deposit-check.js.md', metric: 'deposit', want: (m) => `DEPOSIT HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T34 (setoran tenggat)' },
  { file: 'Quick-Reference.md', metric: 'deposit', want: (m) => new RegExp(`DEPOSIT HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:deposit di QR' },
  { file: '09-Testing/T35 - signer agent-identity-check.js.md', metric: 'agent', want: (m) => `AGEN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T35 (identitas ERC-8004)' },
  { file: 'Quick-Reference.md', metric: 'agent', want: (m) => new RegExp(`AGEN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:agent di QR' },
  { file: '09-Testing/T36 - signer agents-check.js (B119 sewa agen).md', metric: 'agents', want: (m) => `AGEN SEWA HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T36 (sewa agen)' },
  { file: 'Quick-Reference.md', metric: 'agents', want: (m) => new RegExp(`AGEN SEWA HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:agents di QR' },
  { file: '09-Testing/T38 - signer praktik-check.js (B121 praktik dinilai chain).md', metric: 'praktik', want: (m) => `PRAKTIK HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T38 (praktik dinilai chain)' },
  { file: 'Quick-Reference.md', metric: 'praktik', want: (m) => new RegExp(`PRAKTIK HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:praktik di QR' },
  { file: '09-Testing/T39 - signer quiz-keys-check.js (B80 kunci kuis).md', metric: 'quizkeys', want: (m) => `KUNCI KUIS HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T39 (kunci kuis)' },
  { file: 'Quick-Reference.md', metric: 'quizkeys', want: (m) => new RegExp(`KUNCI KUIS HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:quizkeys di QR' },
  { file: '09-Testing/T41 - signer privy-check.js (B82 login Privy).md', metric: 'privy', want: (m) => `LOGIN PRIVY HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T41 (login Privy)' },
  { file: '09-Testing/T45 - signer records-check.js (B124 rekaman milik peserta).md', metric: 'records', want: (m) => `REKAMAN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T45 (rekaman milik peserta)' },
  { file: '09-Testing/T46 - signer paywall-check.js (B125 bayar dulu).md', metric: 'paywall', want: (m) => `PAYWALL HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T46 (bayar dulu baru masuk kelas)' },
  { file: '09-Testing/T50 - signer roles-check.js (B128 peran akun).md', metric: 'roles', want: (m) => `PERAN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T50 (peran akun)' },
  { file: '09-Testing/T52 - signer publisher-check.js (B129 kursi Penerbit).md', metric: 'publisher', want: (m) => `KURSI PENERBIT HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T52 (kursi Penerbit)' },
  { file: '09-Testing/T54 - signer owner-check.js (B130 kursi Agent Owner).md', metric: 'owner', want: (m) => `AGENT OWNER HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T54 (kursi Agent Owner)' },
  { file: 'Quick-Reference.md', metric: 'owner', want: (m) => new RegExp(`AGENT OWNER HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:owner di QR' },
  { file: 'Quick-Reference.md', metric: 'privy', want: (m) => new RegExp(`LOGIN PRIVY HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:privy di QR' },
  // 2 Okt: empat harness yang tercantum di QR hari ini juga dijaga di sana, bukan hanya di halaman T-nya.
  { file: 'Quick-Reference.md', metric: 'records', want: (m) => new RegExp(`REKAMAN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:records di QR' },
  { file: 'Quick-Reference.md', metric: 'paywall', want: (m) => new RegExp(`PAYWALL HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:paywall di QR' },
  { file: 'Quick-Reference.md', metric: 'roles', want: (m) => new RegExp(`PERAN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:roles di QR' },
  { file: 'Quick-Reference.md', metric: 'publisher', want: (m) => new RegExp(`KURSI PENERBIT HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:publisher di QR' },
  { file: '09-Testing/T56 - signer account-check.js (B131 satu akun satu peran).md', metric: 'account', want: (m) => `SATU PERAN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T56 (satu akun satu peran)' },
  { file: 'Quick-Reference.md', metric: 'account', want: (m) => new RegExp(`SATU PERAN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:account di QR' },
  { file: '09-Testing/T58 - signer authoring-check.js (B133 susun kursus).md', metric: 'authoring', want: (m) => `SUSUN KURSUS HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T58 (susun kursus)' },
  { file: 'Quick-Reference.md', metric: 'authoring', want: (m) => new RegExp(`SUSUN KURSUS HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:authoring di QR' },
  { file: '09-Testing/T60 - signer studio-check.js (B132 robot agen).md', metric: 'studio', want: (m) => `BENGKEL AGEN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T60 (robot agen)' },
  { file: 'Quick-Reference.md', metric: 'studio', want: (m) => new RegExp(`BENGKEL AGEN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:studio di QR' },
  { file: '09-Testing/T62 - signer brain-check.js (B135 otak agen).md', metric: 'brain', want: (m) => `OTAK AGEN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T62 (otak agen)' },
  { file: 'Quick-Reference.md', metric: 'brain', want: (m) => new RegExp(`OTAK AGEN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:brain di QR' },
  { file: '09-Testing/T64 - signer market-check.js (B138 bursa agen).md', metric: 'market', want: (m) => `BURSA AGEN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T64 (bursa agen)' },
  { file: 'Quick-Reference.md', metric: 'market', want: (m) => new RegExp(`BURSA AGEN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:market di QR' },
  { file: '09-Testing/T66 - signer history-check.js (B136 riwayat chain).md', metric: 'history', want: (m) => `RIWAYAT CHAIN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T66 (riwayat chain)' },
  { file: 'Quick-Reference.md', metric: 'history', want: (m) => new RegExp(`RIWAYAT CHAIN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:history di QR' },
  { file: '09-Testing/T71 - signer manage-check.js (B140 kelola kursus).md', metric: 'manage', want: (m) => `KELOLA KURSUS HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T71 (kelola kursus)' },
  { file: 'Quick-Reference.md', metric: 'manage', want: (m) => new RegExp(`KELOLA KURSUS HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:manage di QR' },
  { file: '09-Testing/T72 - signer contexts-check.js (B148 konteks JSON-LD).md', metric: 'contexts', want: (m) => `KONTEKS JSON-LD HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T72 (konteks JSON-LD)' },
  { file: 'Quick-Reference.md', metric: 'contexts', want: (m) => new RegExp(`KONTEKS JSON-LD HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris check:contexts di QR' },
  { file: '09-Testing/T74 - signer review-check.js (B144 meja pengesahan).md', metric: 'review', want: (m) => `MEJA PENGESAHAN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T74 (meja pengesahan)' },
  { file: 'Quick-Reference.md', metric: 'review', want: (m) => new RegExp(`MEJA PENGESAHAN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:review di QR' },
  { file: '09-Testing/T82 - signer limits-check.js (B155 batas pemberian).md', metric: 'limits', want: (m) => `BATAS PEMBERIAN HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T82 (batas pemberian)' },
  { file: 'Quick-Reference.md', metric: 'limits', want: (m) => new RegExp(`BATAS PEMBERIAN HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:limits di QR' },
  { file: '09-Testing/T92 - signer mint-check.js (B169 cetak artefak NFT dari app).md', metric: 'mint', want: (m) => `CETAK ARTEFAK HIJAU — ${m.pass} pemeriksaan / ${m.fail} gagal`, note: 'front matter T92 (cetak artefak NFT)' },
  { file: 'Quick-Reference.md', metric: 'mint', want: (m) => new RegExp(`CETAK ARTEFAK HIJAU — ${m.pass}( pemeriksaan)?, ${m.fail} gagal`), note: 'baris verify:mint di QR' },
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
