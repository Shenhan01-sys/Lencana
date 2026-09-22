/**
 * `node scripts/anchor.js` — kunci daftar status yang SEDANG kita sajikan ke chain.
 *
 * Kenapa berkas ini ada: hash yang kita anchor adalah saksi atas bitstring pada satu jam. Kalau
 * sebuah bit BERUBAH (ada pencabutan atau penarikan penerbit), hash baru tidak punya stempel waktu
 * dan perbedaannya terlihat. Alat ini menutup celah itu: ia membandingkan hash daftar sajian
 * sekarang dengan `getTimestamp(hash)` dan menulis bila belum ada. Idempoten — tidak membakar gas
 * dua kali untuk saksi yang sama.
 *
 * 🔴 BATAS YANG DIUKUR HARI INI, BUKAN ASUMSI. Percobaan nyata: tiga kredensial lesson diadopsi
 * (5 → 8 anggotanya), dan hash kedua daftar TETAP `0x1c27a7…` / `0x1c6997…`. Sebabnya ada di
 * `statusList.js`: `new Uint8Array(LIST_BITS / 8)` — bitstring selalu 2048 byte, jadi anggota baru
 * yang bitnya nol tidak mengubah satu byte pun.
 *
 * Konsekuensinya harus disebut apa adanya, karena ia mengurangi klaim yang boleh kita tulis:
 *   - Yang dibuktikan anchor: **bit mana yang terpasang** dalam bitstring 2048 byte.
 *   - Yang TIDAK dibuktikannya: **siapa saja anggota daftar itu**. Server tetap dipercaya untuk
 *     menentukan himpunan `watched`; anchor tidak mengikat himpunan itu.
 * Sisanya ditangani di tempat lain, bukan di sini: `/healthz` melaporkan `watched`, `flagged`, dan
 * `unallocated`, dan `scripts/check.js` bagian 5 mewajibkan setiap kredensial yang diawasi dikenali
 * chain. Jadi kehilangan anggota tetap kelihatan — cuma tidak lewat stempel waktu on-chain.
 *
 * Kalau suatu saat ikatan anggota itu memang dibutuhkan, perbaikannya bukan alat baru: masukkan
 * digest himpunan anggota ke data yang di-anchor, dan terima bahwa setiap adopsi akan menulis
 * stempel baru.
 *
 * Membaca `process.env` (bukan `app/.env`): jalankan lewat pembungkus env yang sama dengan
 * `check.js`. Konvensi ini dipilih supaya "belum dikonfigurasi" tidak pernah menyamar sebagai
 * "berhasil".
 *
 *   RPC_URL=… RESOLVER_ADDRESS=… BAS_ADDRESS=… node scripts/anchor.js [--dry-run]
 */
import { REVOCATION, SUSPENSION, renderList, servedHashes } from '../src/lists.js'
import { loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader } from '../src/sign.js'
import { anchorListHash, readAnchor } from '../src/anchor.js'

const RPC_URL = process.env.RPC_URL
const RESOLVER = process.env.RESOLVER_ADDRESS
const BAS = process.env.BAS_ADDRESS
const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
const AGENT_SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const PLATFORM_PK = process.env.DEPLOYER_PRIVATE_KEY
const DRY = process.argv.includes('--dry-run')

if (!RPC_URL || !RESOLVER || !BAS) {
  console.error('butuh RPC_URL + RESOLVER_ADDRESS + BAS_ADDRESS di lingkungan (lihat _research/run_with_env.ps1)')
  process.exit(2)
}

const hashes = await servedHashes()
if (!hashes.length) {
  console.error('tidak ada kredensial yang dipantau — store kosong dan STATUS_HASHES tidak diisi')
  process.exit(2)
}

const { key, controller, name } = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument({ controller, name, key })
const documentLoader = makeDocumentLoader({ [controller]: issuerDoc })

console.log(`daemon ${name} · ${hashes.length} kredensial dipantau · ${DRY ? 'DRY RUN (tidak menulis)' : 'menulis bila perlu'}`)

let wrote = 0
let fails = 0
for (const purpose of [REVOCATION, SUSPENSION]) {
  const list = await renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes,
    key, controllerDocument: issuerDoc, documentLoader,
  })
  const seen = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: list.hash })
  const line = `${purpose}: ${list.watched} kredensial, ${list.flagged} bit terpasang, hash ${list.hash.slice(0, 18)}…`

  if (seen > 0n) {
    console.log(`  sudah ter-anchor  ${line} sejak ${seen}`)
    continue
  }
  if (DRY) {
    console.log(`  PERLU DIANCHOR    ${line}`)
    continue
  }
  if (!PLATFORM_PK) {
    console.error(`  tidak bisa menulis: DEPLOYER_PRIVATE_KEY tidak ada di lingkungan`)
    fails += 1
    continue
  }
  const a = await anchorListHash({ rpcUrl: RPC_URL, basAddress: BAS, privateKey: PLATFORM_PK, encodedList: list.encodedList })
  const back = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: a.data })
  // Dibaca ulang, dan dibandingkan: nilai return dari penulisan bukan bukti.
  if (back === 0n) { console.error(`  GAGAL ${purpose}: tertulis tapi tidak terbaca kembali`); fails += 1; continue }
  if (a.data !== list.hash) { console.error(`  GAGAL ${purpose}: hash tertambang ${a.data} != yang dirender ${list.hash}`); fails += 1; continue }
  wrote += 1
  console.log(`  ter-anchor      ${line}`)
  console.log(`                    tx ${a.txHash} · gas ${a.gasUsed} · jam ${back}`)
}

console.log(`\n${fails ? `${fails} GAGAL` : 'bersih'} — ${wrote} anchor baru ditulis`)
if (!wrote && !fails && !DRY) console.log('(daftar sajian belum berubah sejak anchor terakhir — tidak ada yang perlu dibakar)')
process.exitCode = fails ? 1 : 0
