// Lencana-B112 status=SELESAI 2026-09-30 — marker aturan #18 dipindah ke token yang tidak mungkin berupa kode, dan penjaga ini sekarang menuntut bentuk sekaligus kelengkapan yang dulu mustahil dituntut (8 pemeriksaan, dari 4). Buktikan ulang: npm run check:labels lalu npm run check:labels -- --self-test; inventaris penuh: npm run check:labels -- --list. JANGAN dibalik/diulang tanpa membuka kembali baris B112 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run check:labels` — aturan #18 bagian KEDUA: bukan cuma "marker cocok dengan barisnya" (itu A9),
 * tapi "tiap ID tertutup punya marker atau alasan yang tertulis", dan "tidak ada marker cacat".
 *
 * Kenapa ini perlu (30 Sep): A9 hanya mengadili konsistensi dua arah. Kalau sebuah ID ditutup tanpa
 * satu pun marker — atau marker ditulis ke ID yang tidak ada — A9 tetap hijau, dan klaim "kode sudah
 * berlabel" berubah jadi angka di pesan chat yang tidak diulang siapa pun. Ini juga menagih nilai yang
 * sama ke dirinya sendiri: kalau jumlah ID tertutup tanpa marker NAIK dari baseline, merah.
 *
 * B112 opsi A (30 Sep, dipilih builder): bentuk marker diganti dari kurung-siku ke token
 * `Lencana-Bnn status=SELESAI|TERBUKA`. Sebabnya bukan selera — pola kurung-siku-B-angka juga dipakai
 * kode kami sendiri sebagai notasi tipe (terukur 21 lokasi, semuanya `abi(...)` dengan konstanta
 * bytes32), jadi selama keduanya berbagi bahasa, "temukan semua marker" tidak bisa dibedakan dari
 * "temukan array bytes32" dan KELENGKAPAN marker tidak mungkin dituntut alat. Yang dijaga sekarang:
 *   · bentuk lama yang tertinggal = TEMUAN (migrasi tidak boleh setengah jalan),
 *   · marker wajib duduk di baris komentar,
 *   · marker tanpa `status=` yang sah = TEMUAN (dulu lolos selamanya),
 *   · satu ID tidak boleh muncul dua kali di berkas yang sama.
 * Tidak ada daftar hitam nama: 21 lokasi notasi tipe itu lolos karena bahasanya memang bukan marker,
 * bukan karena dikecualikan.
 *
 * `--self-test` mengadili penjaga ini dengan fixture: yang harus merah wajib tertangkap, yang harus
 * hijau wajib tidak terlapor. Tanpanya, "penjaga hijau" tidak bisa dibedakan dari "penjaga buta".
 *
 * Baseline sengaja disimpan di berkas ini (bukan di kepala). Terukur 30 Sep pada keadaan akhir hari:
 *   82 marker di 48 ID · 69 baris backlog · 49 tertutup · 4 ID tertutup beralasan TANPA TAG KODE
 *   (B43 B71 B74 B76) · lubang 0 · bandel 0 · sisa bentuk lama 0.
 * Selisihnya dijelaskan supaya tidak ada yang mengira angka ini karangan: 82 = 78 hasil migrasi B112
 *   + 2 marker B112 (di berkas ini dan di blok A9 `audit-consistency.js`) + 1 marker B114 (di
 *   `sync-numbers.js`) + 1 marker B105 (di `web/src/main.ts`, status TERBUKA). Tertutup 49 = 46
 *   sesudah migrasi + B112 + B114 + B84 (B84 tidak menambah
 *   marker: markernya sudah ada di `identity-check.js` sejak 29 Sep, hanya di-flip ke SELESAI saat
 *   barisnya ditutup); 78/45/46 adalah keadaan tepat sesudah migrasi, sebelum baris-barisnya ditutup.
 * Turun itu bagus; naik itu regresi dan nama ID-nya dicetak.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const BACKLOG = path.join(REPO, 'vault', '07-Backlog', '03 - Findings and Tasks 2026-09-26.md')
const SKIP = new Set(['node_modules', '.git', 'dist', 'out', 'cache', 'broadcast', 'lib', '.keys', '.store'])
const EXT = /\.(ts|js|mjs|sol|sql|yml|ps1)$/
const BASELINE_TERTUTUP_BLUM = 0
const BASELINE_BANDAL = 0

// Token sah: utuh dan case-sensitive. Korpus sudah punya `lencana-b41` sungguhan di dalam preimage
// keccak, jadi mencocokkan prefiksnya saja akan melahirkan positif-palsu berikutnya dari string itu.
const PREFIKS_TOKEN = /Lencana-B\d+/g
// Grup tangkapannya WAJIB memuat huruf B-nya: baris backlog diindeks `B67`, bukan `67`. Versi
// pertama menangkap angka saja dan membuat 46 marker tampak menunjuk ID yang tidak ada — ketahuan
// oleh pemeriksaan ini sendiri, bukan oleh mata.
const ID_TOKEN = /^Lencana-(B\d+)$/
const STATUS_TOKEN = /^ status=(SELESAI|TERBUKA)/
// Bentuk lama. Ditulis sebagai pola, bukan sebagai contoh harfiah: kalau contoh harfiahnya ada di
// berkas ini, pemeriksaan "sisa bentuk lama" akan membaca dirinya sendiri dan merah selamanya.
const BENTUK_LAMA = /\[(B\d+)\][ \t]*(?:SELESAI|TERBUKA)/g
const PREFIX_KOMENTAR = /^\s*(?:\/\/+|#+|--|\*+|\/\*+|<!--)/
const PEMBUKA_KOMENTAR = /\/\/|\/\*|#+|--|<!--/

/** Pindai satu isi berkas. Murni: tidak menyentuh disk, jadi `--self-test` bisa memakainya juga. */
function pindai (isi, nama = '(fixture)') {
  const sahih = []
  const cacat = []
  const bukanKomentar = []
  let sisaLama = 0
  isi.split('\n').forEach((l, i) => {
    const diKomentar = PREFIX_KOMENTAR.test(l)
    for (const m of l.matchAll(BENTUK_LAMA)) {
      sisaLama += 1
      cacat.push(`${nama}:${i + 1} bentuk LAMA tertinggal (migrasi B112 belum tuntas di sini) -> ${l.trim().slice(0, 90)}`)
    }
    for (const m of l.matchAll(PREFIKS_TOKEN)) {
      const st = STATUS_TOKEN.exec(l.slice(m.index + m[0].length))
      if (!st) {
        cacat.push(`${nama}:${i + 1} marker tanpa status yang sah -> ${l.trim().slice(0, 90)}`)
        continue
      }
      const rec = { id: ID_TOKEN.exec(m[0])[1], state: st[1], baris: i + 1 }
      if (diKomentar || PEMBUKA_KOMENTAR.test(l.slice(0, m.index))) sahih.push(rec)
      else bukanKomentar.push(`${nama}:${i + 1} marker bukan di baris komentar -> ${l.trim().slice(0, 90)}`)
    }
  })
  return { sahih, cacat, bukanKomentar, sisaLama }
}

/** Adili marker terhadap baris backlog. Murni, supaya fixture bisa mengujinya tanpa repo. */
function adili (marker, rows) {
  const perId = new Map()
  const duplikat = []
  for (const m of marker) {
    const kunci = `${m.id}@${m.berkas}`
    if (perId.has(kunci)) duplikat.push(`${m.berkas}: ${m.id} muncul dua kali (baris ${perId.get(kunci)} dan ${m.baris})`)
    else perId.set(kunci, m.baris)
  }
  const byId = new Map()
  for (const m of marker) {
    if (!byId.has(m.id)) byId.set(m.id, { state: m.state, berkas: [] })
    byId.get(m.id).berkas.push(m.berkas)
    if (byId.get(m.id).state !== m.state) byId.get(m.id).state = 'GANDA'
  }
  const bandel = []
  for (const [id, v] of byId) {
    const baris = rows.get(id)
    if (!baris) { bandel.push(`${id}: marker ${v.state} di ${v.berkas[0]} — tidak ada barisnya di backlog`); continue }
    if (v.state === 'GANDA') { bandel.push(`${id}: dua status berbeda dalam satu ID (${v.berkas.slice(0, 3).join(', ')})`); continue }
    if (baris.status !== v.state) bandel.push(`${id}: marker ${v.state} vs baris ${baris.status} (${v.berkas.slice(0, 3).join(', ')})`)
  }
  const tertutup = [...rows.entries()].filter(([, v]) => v.status === 'SELESAI').map(([k]) => k)
  const tanpaTag = [...rows.entries()].filter(([, v]) => v.status === 'SELESAI' && v.tanpaTag).map(([k]) => k)
  const berlubang = tertutup.filter((id) => !byId.has(id) && !tanpaTag.includes(id))
  const bohong = tanpaTag.filter((id) => byId.has(id))
  const klaimSelesai = [...byId.entries()].filter(([id, v]) => v.state === 'SELESAI' && rows.get(id)?.status === 'TERBUKA').map(([id]) => id)
  return { byId, bandel, berlubang, tanpaTag, tertutup, bohong, klaimSelesai, duplikat }
}

/** Baca baris backlog. Status HANYA dari sel pertama: kata SELESAI di dalam kalimat bukan status. */
function bacaBaris (teks) {
  const rows = new Map()
  for (const l of teks.split(/\r?\n/)) {
    const m = /^\|\s*\*\*(B\d+)\*\*/.exec(l)
    if (!m) continue
    const sel1 = l.split('|')[1] || ''
    const tertutup = /✅|DITUTUP|\bDONE\b/.test(sel1)
    const sebelumnya = rows.get(m[1])
    rows.set(m[1], {
      status: sebelumnya === 'TERBUKA' ? 'TERBUKA' : (tertutup ? 'SELESAI' : 'TERBUKA'),
      tanpaTag: (sebelumnya?.tanpaTag || false) || /TANPA TAG KODE/.test(l),
    })
  }
  return rows
}

// --------------------------------------------------------------------------- self-test
// Fixture DIRAKIT dari potongan, tidak pernah ditulis harfiah: bentuk lama yang ditulis lengkap di
// berkas ini akan tertangkap pemeriksaannya sendiri, dan penjaga yang merah karena membaca dirinya
// sendiri adalah penjaga yang tidak bisa dipakai (persis kejadian A3 dengan frasa terlarang).
const F = {
  komentarTanpaStatus: '// Lencana-B' + '999 — penanda tanpa status, harus merah',
  bentukLamaDiKomentar: '// [' + 'B999] SELESAI 2026-09-30 — sisa migrasi, harus merah',
  markerDiStringKode: "const x = 'Lencana-B" + "999 status=SELESAI'",
  notasiTipeBytes32: "const ABI = abi('statusOf', [" + 'B32], [BOOL, ADDR])',
  preimageKeccak: 'const p = keccak256("lencana-b' + '41-probe-learner")',
  markerSah: '// Lencana-B' + '67 status=SELESAI 2026-09-30 — fixture hijau',
  markerSahTerbuka: '/// Lencana-B' + '78 status=TERBUKA — fixture hijau',
  duplikatSatuBerkas: ['// Lencana-B' + '67 status=SELESAI — pertama', '// Lencana-B' + '67 status=SELESAI — kedua'],
}

function selfTest () {
  let ran = 0
  let luput = 0
  const harus = (nama, syarat, detail = '') => {
    ran++
    if (!syarat) { luput++ }
    console.log(`  ${syarat ? 'ok   ' : 'GAGAL'} ${nama}${detail ? ` -> ${detail}` : ''}`)
  }
  const rows = new Map([
    ['B67', { status: 'SELESAI', tanpaTag: false }],
    ['B78', { status: 'TERBUKA', tanpaTag: false }],
    ['B99', { status: 'SELESAI', tanpaTag: true }],
    ['B50', { status: 'SELESAI', tanpaTag: false }],
  ])
  console.log('\ncheck:labels --self-test — fixture diadili oleh fungsi yang sama dengan repo')

  const a = pindai(F.komentarTanpaStatus, 'fixture')
  harus('marker tanpa status tertangkap', a.cacat.length === 1 && a.sahih.length === 0, a.cacat[0] ?? 'tidak terlapor')
  const b = pindai(F.bentukLamaDiKomentar, 'fixture')
  harus('bentuk lama tertangkap sebagai sisa migrasi', b.sisaLama === 1 && b.cacat.length === 1, b.cacat[0] ?? 'tidak terlapor')
  const c = pindai(F.markerDiStringKode, 'fixture')
  harus('marker di dalam string kode ditolak (bukan komentar)', c.bukanKomentar.length === 1 && c.sahih.length === 0, c.bukanKomentar[0] ?? 'tidak terlapor')
  const d = pindai(F.notasiTipeBytes32, 'fixture')
  harus('notasi tipe bytes32 TIDAK terlapor', d.cacat.length === 0 && d.sahih.length === 0 && d.sisaLama === 0, JSON.stringify(d.cacat))
  const e = pindai(F.preimageKeccak, 'fixture')
  harus('preimage keccak lencana-b41 TIDAK terlapor', e.cacat.length === 0 && e.sahih.length === 0, JSON.stringify(e.cacat))
  const f = pindai(F.markerSah + '\n' + F.markerSahTerbuka, 'fixture')
  harus('marker sah terbaca dengan statusnya', f.sahih.length === 2 && f.cacat.length === 0, JSON.stringify(f.sahih))

  const g = adili([{ id: 'B78', state: 'SELESAI', berkas: 'x.js', baris: 1 }], rows)
  harus('marker SELESAI pada baris TERBUKA = bandel', g.bandel.length === 1, g.bandel[0] ?? 'tidak terlapor')
  const h = adili([{ id: 'B67', state: 'SELESAI', berkas: 'x.js', baris: 1 }], rows)
  harus('ID tertutup tanpa marker = lubang', h.berlubang.includes('B50') && h.berlubang.length === 1, h.berlubang.join(','))
  const i = adili([{ id: 'B99', state: 'SELESAI', berkas: 'x.js', baris: 1 }], rows)
  harus('ID yang mengumumkan TANPA TAG KODE tapi punya marker = bohong', i.bohong.length === 1 && i.bohong[0] === 'B99', i.bohong.join(','))
  const j = adili([{ id: 'B404', state: 'SELESAI', berkas: 'x.js', baris: 1 }], rows)
  harus('marker ke ID yang tidak punya baris = bandel', j.bandel.length === 1, j.bandel[0] ?? 'tidak terlapor')
  // Fixture duplikat sengaja dilewatkan lewat pindai() juga, jadi yang diuji bukan hanya adili()
  // melainkan rantai bacanya: dua baris komentar sah, ID sama, satu berkas.
  const kMasuk = F.duplikatSatuBerkas.flatMap((t, n) => pindai(t, 'sama.js').sahih.map((s) => ({ ...s, berkas: 'sama.js', baris: n + 1 })))
  const k = adili(kMasuk, rows)
  harus('satu ID dua kali di berkas yang sama = duplikat', k.duplikat.length === 1, k.duplikat[0] ?? 'tidak terlapor')
  const l = pindai(F.markerSah, 'fixture')
  const m2 = adili([{ ...l.sahih[0], berkas: 'y.js' }], rows)
  harus('marker sah pada baris yang cocok = bersih', m2.bandel.length === 0 && m2.berlubang.length === 1, JSON.stringify({ bandel: m2.bandel, lubang: m2.berlubang }))

  console.log(`\nSELF-TEST ${luput === 0 ? 'HIJAU' : 'MERAH'} — ${ran} fixture, ${luput} luput`)
  process.exitCode = luput === 0 ? 0 : 1
  return
}

if (process.argv.includes('--self-test')) { selfTest(); process.exit(process.exitCode) }

// --------------------------------------------------------------------------- repo
const berkas = []
;(function w (d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(d, e.name)
    e.isDirectory() ? w(p) : EXT.test(e.name) && berkas.push(p)
  }
})(REPO)

const marker = []
const cacat = []
const bukanKomentar = []
let sisaLama = 0
let jumlahToken = 0
for (const f of berkas) {
  let isi = ''
  try { isi = fs.readFileSync(f, 'utf8') } catch { continue }
  const rel = path.relative(REPO, f).replace(/\\/g, '/')
  const r = pindai(isi, rel)
  for (const s of r.sahih) marker.push({ ...s, berkas: rel })
  cacat.push(...r.cacat)
  bukanKomentar.push(...r.bukanKomentar)
  sisaLama += r.sisaLama
  jumlahToken += r.sahih.length
}

const rows = bacaBaris(fs.readFileSync(BACKLOG, 'utf8'))
const v = adili(marker, rows)

// `--list` mencetak inventaris penuh: setiap marker dengan ID, statusnya di kode, status barisnya,
// dan lokasinya. Alasannya: "semua sudah terlabeli" harus bisa diperiksa orang lain dari repo, bukan
// dipercaya dari ringkasan di chat. Tanpa flag ini, keluaran tetap ringkas untuk harness.
if (process.argv.includes('--list')) {
  console.log('\n--list — inventaris marker (ID · status di kode · cocok/tidak dengan baris · lokasi)')
  const urut = [...marker].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }) || a.berkas.localeCompare(b.berkas))
  for (const m of urut) {
    const r = rows.get(m.id)
    const cocok = r && r.status === m.state ? 'cocok' : `BEDA(baris=${r ? r.status : 'TIDAK ADA'})`
    console.log(`  ${m.id.padEnd(6)} ${m.state.padEnd(8)} ${cocok.padEnd(20)} ${m.berkas}:${m.baris}`)
  }
  const tanpaMarker = [...rows.entries()].filter(([id, r]) => r.status === 'SELESAI' && !v.byId.has(id))
  console.log(`  total ${urut.length} marker di ${v.byId.size} ID · ${v.tertutup.length} ID tertutup`)
  console.log(`  ID tertutup tanpa marker (harus mengumumkan TANPA TAG KODE): ${tanpaMarker.map(([id]) => id).join(' ') || '(nol)'}`)
}

let ran = 0
let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
}
console.log(`\ncheck:labels — ${jumlahToken} marker di ${v.byId.size} ID · ${rows.size} baris backlog · ${v.tertutup.length} tertutup`)
check(`tiap ID tertutup punya marker atau alasan tertulis (lubang ${v.berlubang.length}, baseline ${BASELINE_TERTUTUP_BLUM})`,
  v.berlubang.length <= BASELINE_TERTUTUP_BLUM, v.berlubang.join(', '))
check(`tiap marker cocok dengan barisnya (bandel ${v.bandel.length}, baseline ${BASELINE_BANDAL})`,
  v.bandel.length <= BASELINE_BANDAL, v.bandel.slice(0, 6).join(' | '))
check('ID yang dinyatakan TANPA TAG KODE memang benar-benar tanpa marker',
  v.bohong.length === 0, `mengklaim tanpa marker tapi ada: ${v.bohong.join(', ') || '(nol)'}`)
check('tidak ada marker SELESAI untuk baris TERBUKA', v.klaimSelesai.length === 0, v.klaimSelesai.join(', '))
check('tidak ada sisa bentuk lama di berkas kode (migrasi B112 tuntas)',
  sisaLama === 0 && cacat.filter((x) => x.includes('bentuk LAMA')).length === 0,
  cacat.filter((x) => x.includes('bentuk LAMA')).slice(0, 6).join(' | '))
check('tiap marker duduk di baris komentar', bukanKomentar.length === 0, bukanKomentar.slice(0, 6).join(' | '))
check('tidak ada marker cacat (tanpa status yang sah)',
  cacat.filter((x) => !x.includes('bentuk LAMA')).length === 0,
  cacat.filter((x) => !x.includes('bentuk LAMA')).slice(0, 6).join(' | '))
check('satu ID tidak muncul dua kali di berkas yang sama', v.duplikat.length === 0, v.duplikat.slice(0, 6).join(' | '))
console.log(`\nLABEL ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exitCode = failed === 0 ? 0 : 1
