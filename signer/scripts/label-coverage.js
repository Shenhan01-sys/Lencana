/**
 * `npm run check:labels` — aturan #18 bagian KEDUA: bukan cuma "tag cocok dengan barisnya" (itu A9),
 * tapi "tiap ID tertutup punya tag atau alasan yang tertulis".
 *
 * Kenapa ini perlu (30 Sep): A9 hanya mengadili konsistensi dua arah. Kalau sebuah ID ditutup tanpa
 * satu pun tag — atau tag ditulis ke ID yang tidak ada — A9 tetap hijau, dan klaim "kode sudah
 * berlabel" berubah jadi angka di pesan chat yang tidak diulang siapa pun. Ini juga menagih nilai
 * yang sama ke dirinya sendiri: kalau jumlah ID tertutup tanpa tag NAIK dari baseline, merah.
 *
 * Baseline sengaja disimpan di berkas ini (bukan di kepala): 30 Sep terukur
 *   tertutup 47 = bertanda 41 + beralasan 6 (B43 B71 B74 B76 B77 B99), tag 73 di 42 ID, 0 bandel.
 * Turun itu bagus; naik itu regresi dan nama ID-nya dicetak.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.resolve(HERE, '..', '..')
const BACKLOG = path.join(REPO, 'vault', '07-Backlog', '03 - Findings and Tasks 2026-09-26.md')
const SKIP = new Set(['node_modules', '.git', 'dist', 'out', 'cache', 'broadcast', 'lib', '.keys', '.store'])
const BASELINE_TERTUTUP_BLUM = 0
const BASELINE_BANDAL = 0

const berkas = []
;(function w (d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue
    const p = path.join(d, e.name)
    e.isDirectory() ? w(p) : /\.(ts|js|mjs|sol|sql|yml|ps1)$/.test(e.name) && berkas.push(p)
  }
})(REPO)

const tag = new Map()
let jumlahTag = 0
for (const f of berkas) {
  let t = ''
  try { t = fs.readFileSync(f, 'utf8') } catch { continue }
  for (const m of t.matchAll(/\[(B\d+)\] (SELESAI|TERBUKA)/g)) {
    jumlahTag++
    if (!tag.has(m[1])) tag.set(m[1], { state: m[2], berkas: [] })
    tag.get(m[1]).berkas.push(path.relative(REPO, f).replace(/\\/g, '/'))
  }
}

const st = new Map()
for (const l of fs.readFileSync(BACKLOG, 'utf8').split(/\r?\n/)) {
  const m = /^\|\s*\*\*(B\d+)\*\*/.exec(l)
  if (!m) continue
  // 'SELESAI' boleh muncul di dalam kalimat (mis. menyebut tag [Bxx] SELESAI), jadi ia bukan penanda
    // status. Yang menentukan: apa yang tertulis di sel pertama setelah ID.
    const sel1 = (l.split('|')[1] || '')
    const tertutup = /✅|DITUTUP|\bDONE\b/.test(sel1)
    const dijanjikan = /TANPA TAG KODE/.test(l)
  const sebelumnya = st.get(m[1])
  st.set(m[1], {
    status: sebelumnya === 'TERBUKA' ? 'TERBUKA' : (tertutup ? 'SELESAI' : 'TERBUKA'),
    tanpaTag: (sebelumnya?.tanpaTag || false) || dijanjikan,
  })
}

const bandel = []
for (const [id, v] of tag) {
  const baris = st.get(id)
  if (!baris) { bandel.push(`${id}: tag ${v.state} di ${v.berkas[0]} — tidak ada barisnya`); continue }
  if (baris.status !== v.state) bandel.push(`${id}: tag ${v.state} vs baris ${baris.status} (${v.berkas.slice(0, 3).join(', ')})`)
}
const tertutup = [...st.entries()].filter(([, v]) => v.status === 'SELESAI').map(([k]) => k)
const tanpaTag = [...st.entries()].filter(([, v]) => v.status === 'SELESAI' && v.tanpaTag).map(([k]) => k)
const berlubang = tertutup.filter((id) => !tag.has(id) && !tanpaTag.includes(id))

let ran = 0; let failed = 0
const check = (name, ok, detail = '') => {
  ran++
  if (!ok) failed++
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${detail ? ` -> ${detail}` : ''}`)
}
console.log(`\ncheck:labels — ${jumlahTag} tag di ${tag.size} ID · ${st.size} baris backlog · ${tertutup.length} tertutup`)
check(`tiap ID tertutup punya tag atau alasan tertulis (lubang ${berlubang.length}, baseline ${BASELINE_TERTUTUP_BLUM})`,
  berlubang.length <= BASELINE_TERTUTUP_BLUM, berlubang.join(', '))
check(`tiap tag cocok dengan barisnya (bandel ${bandel.length}, baseline ${BASELINE_BANDAL})`,
  bandel.length <= BASELINE_BANDAL, bandel.slice(0, 6).join(' | '))
const bohong = tanpaTag.filter((id) => tag.has(id))
check('ID yang dinyatakan TANPA TAG KODE memang benar-benar tanpa tag',
  bohong.length === 0, `mengklaim tanpa tag tapi ada tag: ${bohong.join(', ') || '(nol)'}`)
check('tidak ada tag untuk baris TERBUKA yang mengklaim SELESAI',
  [...tag.entries()].filter(([id, v]) => v.state === 'SELESAI' && st.get(id)?.status === 'TERBUKA').length === 0)
console.log(`\nLABEL ${failed === 0 ? 'HIJAU' : 'MERAH'} — ${ran} pemeriksaan, ${failed} gagal`)
process.exitCode = failed === 0 ? 0 : 1
