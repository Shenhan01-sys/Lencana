/**
 * `npm run migrate:tags` — B112 opsi A: memindahkan penanda aturan #18 dari bentuk kurung-siku ke
 * token yang tidak mungkin berupa kode, `Lencana-Bnn status=SELESAI|TERBUKA`.
 *
 * Kenapa bentuknya diganti, bukan penjaganya diperketat: pola kurung-siku-B-angka sudah dipakai di
 * kode kami sendiri sebagai notasi tipe — terukur 30 Sep ada 21 lokasi `[B32]` yang bukan tag sama
 * sekali (`abi('statusOf', [B32], [BOOL, …])` di e2e.js/journey.js/revoke.js/verify-live-cert.js).
 * Selama penanda dan notasi tipe berbagi bahasa, "temukan semua tag" tidak bisa dibedakan dari
 * "temukan array bytes32", dan kelengkapan tag tidak bisa dituntut alat.
 *
 * Alat ini sengaja BODOH dan sempit: ia mengganti SATU token dan tidak menulis ulang satu pun
 * kalimat. Tanggal, isi, ekor "Buktikan ulang / JANGAN dibalik", prefiks komentar (`//`, `///`,
 * `#`, `*`), indentasi, dan akhiran baris (CRLF/LF) tidak disentuh — supaya `git diff`-nya bisa
 * dibaca sebagai bukti, bukan sebagai teka-teki (aturan #13: alat penulis massa dibaca lewat diff).
 *
 * Tiga penahan, supaya "semuanya terganti" jadi pernyataan terukur dan bukan niat:
 *   1. ekspektasi jumlah dikunci di bawah; kalau korpus berubah sejak sketsa di-acc, alat MENOLAK
 *      jalan alih-alih menulis sebagian;
 *   2. hanya ekstensi kode yang disapu — `.md` sengaja di luar jangkauan, karena dokumen diubah
 *      tangan per baris dengan koreksi terlihat, bukan disapu mesin;
 *   3. tiap kandidat harus duduk di dalam komentar; kalau tidak, alat berhenti tanpa menulis.
 *
 * Default DRY-RUN. Menulis hanya dengan `--apply`.
 */
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const APPLY = process.argv.includes('--apply')

// Terukur 30 Sep 2026 oleh pembaca baca-saja `.qwen/tmp/ukur-tag.mjs` dan dikonfirmasi
// `npm run check:labels` ("78 tag di 45 ID · 46 tertutup"). Kebetulan yang mudah menyesatkan,
// karena itu ditulis eksplisit: 45 BERKAS kode dan 45 ID berbeda — dua hal berbeda, angka sama.
const EXPECT_TAGS = 78
const EXPECT_FILES = 45

const EXT = /\.(ts|js|mjs|sol|sql|yml|ps1)$/
const LAMA = /\[(B\d+)\][ \t]*(SELESAI|TERBUKA)/g
const ADA_LAMA = /\[(B\d+)\][ \t]*(?:SELESAI|TERBUKA)/
const BARU = /Lencana-B\d+ status=(?:SELESAI|TERBUKA)/g
const PREFIX_KOMENTAR = /^\s*(?:\/\/+|#+|--|\*+|\/\*+|<!--)/
const PEMBUKA_KOMENTAR = /\/\/|\/\*|#+|--|<!--/

const ganti = (s) => s.replace(LAMA, (_m, id, st) => `Lencana-${id} status=${st}`)

const berkas = execSync('git ls-files', { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
  .split(/\r?\n/).filter(Boolean).filter((f) => EXT.test(f))

const rencana = []
const menolak = []
let total = 0
let tokenBaruAwal = 0

for (const rel of berkas) {
  const abs = path.join(REPO, rel)
  let isi
  try { isi = fs.readFileSync(abs, 'utf8') } catch { continue }
  // Dihitung SEBELUM continue: berkas yang sudah termigrasi tidak punya bentuk lama lagi, dan
  // justru merekalah bukti bahwa pekerjaan ini pernah selesai.
  tokenBaruAwal += (isi.match(BARU) || []).length
  if (!ADA_LAMA.test(isi)) continue

  let n = 0
  let contoh = null
  isi.split('\n').forEach((l, i) => {
    for (const m of l.matchAll(LAMA)) {
      const diKomentar = PREFIX_KOMENTAR.test(l) || PEMBUKA_KOMENTAR.test(l.slice(0, m.index))
      if (!diKomentar) {
        menolak.push(`${rel}:${i + 1} -> kandidat ini BUKAN di dalam komentar: ${l.trim().slice(0, 90)}`)
        continue
      }
      n += 1
      if (!contoh) contoh = { no: i + 1, lama: l.trim(), baru: ganti(l).trim() }
    }
  })
  if (!n) continue

  const sesudah = ganti(isi)
  const hitungSesudah = (sesudah.match(BARU) || []).length
  if (hitungSesudah !== n) {
    menolak.push(`${rel} -> hitungan substitusi tidak stabil (${n} kandidat, ${hitungSesudah} token baru)`)
    continue
  }
  total += n
  rencana.push({ rel, n, contoh, sesudah })
}

console.log(`\nmigrate:tags — ${APPLY ? 'APPLY' : 'DRY-RUN'} · ${berkas.length} berkas kode terlacak disapu`)

if (menolak.length) {
  console.log(`\nDITOLAK sebelum menulis apa pun — ${menolak.length} kandidat tidak aman:`)
  for (const x of menolak.slice(0, 10)) console.log(`  ${x}`)
  console.log('\nMIGRASI MERAH — 0 berkas ditulis')
  process.exit(1)
}

console.log(`\nrencana: ${total} tag di ${rencana.length} berkas · ekspektasi terkunci ${EXPECT_TAGS} tag di ${EXPECT_FILES} berkas`)
for (const r of rencana.sort((a, b) => b.n - a.n || a.rel.localeCompare(b.rel))) {
  console.log(`  ${String(r.n).padStart(2)}  ${r.rel}`)
}

console.log('\ncontoh substitusi (token saja, kalimatnya tidak ditulis ulang):')
for (const r of rencana.slice(0, 3)) {
  console.log(`  ${r.rel}:${r.contoh.no}`)
  console.log(`    lama  ${r.contoh.lama.slice(0, 150)}`)
  console.log(`    baru  ${r.contoh.baru.slice(0, 150)}`)
}

if (total === 0 && tokenBaruAwal >= EXPECT_TAGS) {
  // Bukan kegagalan: alat ini satu-kali pakai, dan "0 bentuk lama tersisa" adalah hasil yang
  // diinginkan. Dibedakan dari penyimpangan korpus supaya tidak ada alarm palsu berikutnya —
  // kelas kesalahan yang sama dengan tiga tembakan palsu check:identity.
  console.log(`\nSUDAH TERMIGRASI — 0 tag bentuk lama tersisa; ${tokenBaruAwal} token bentuk baru terbaca di berkas kode.`)
  console.log('Tidak ada yang ditulis. Yang menjaga bentuk ini dari sekarang: `npm run check:labels` (sisa bentuk lama = TEMUAN).')
  console.log(`\nMIGRASI HIJAU — 0 bentuk lama, ${tokenBaruAwal} bentuk baru (tidak ada yang ditulis)`)
  process.exit(0)
}

if (total !== EXPECT_TAGS || rencana.length !== EXPECT_FILES) {
  console.log(`\nDITOLAK: korpus tidak lagi sama dengan yang diukur saat sketsa di-acc `
    + `(terbaca ${total} tag bentuk lama di ${rencana.length} berkas; ekspektasi ${EXPECT_TAGS} di ${EXPECT_FILES}).`)
  console.log(`Token bentuk baru yang sudah ada di korpus: ${tokenBaruAwal}.`)
  console.log('Ukur ulang dulu, perbarui ekspektasi dengan angka yang dicetak hari itu, baru jalankan lagi.')
  console.log('\nMIGRASI MERAH — 0 berkas ditulis')
  process.exit(1)
}

if (!APPLY) {
  console.log('\nDRY-RUN: tidak ada satu berkas pun yang ditulis.')
  console.log('Kalau rencananya sudah dibaca sebagai diff dan memang benar: npm run migrate:tags -- --apply')
  console.log(`\nMIGRASI HIJAU — ${total} tag di ${rencana.length} berkas (dry-run, 0 ditulis)`)
  process.exit(0)
}

let ditulis = 0
for (const r of rencana) {
  fs.writeFileSync(path.join(REPO, r.rel), r.sesudah, 'utf8')
  ditulis += 1
}

// Baca ulang dari disk, bukan dari memori: yang diadili adalah keadaan repo sesudah ditulis.
let sisaLama = 0
let tokenBaru = 0
for (const rel of berkas) {
  let isi
  try { isi = fs.readFileSync(path.join(REPO, rel), 'utf8') } catch { continue }
  sisaLama += (isi.match(new RegExp(ADA_LAMA.source, 'g')) || []).length
  tokenBaru += (isi.match(BARU) || []).length
}

console.log(`\nsesudah apply (baca ulang dari disk): ${ditulis} berkas ditulis · token bentuk baru ${tokenBaru} · sisa bentuk lama ${sisaLama}`)
const ok = ditulis === EXPECT_FILES && tokenBaru === EXPECT_TAGS && sisaLama === 0
console.log(ok
  ? `\nMIGRASI HIJAU — ${tokenBaru} tag di ${ditulis} berkas (apply, sisa bentuk lama ${sisaLama})`
  : `\nMIGRASI MERAH — diharapkan ${EXPECT_TAGS} token baru dan 0 sisa; terbaca ${tokenBaru} dan ${sisaLama}`)
console.log('Selanjutnya wajib: baca `git diff` penuh (aturan #13), lalu `npm run check:labels` + `npm run audit`.')
process.exit(ok ? 0 : 1)
