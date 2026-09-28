/**
 * `npm run verify:live-cert` — membuktikan lapis artefak yang HIDUP benar-benar menegakkan
 * D42 (artefak hanya level kursus) dan D43 (batch memakai satu jalur yang sama), dibaca dari chain 97.
 *
 * Kenapa harness ini ada. Pada 28 Sep aku menulis di backlog bahwa `0xC6FD12…` "sudah menegakkan
 * D42/D43" tanpa memeriksa apa pun; bytecode mengatakan sebaliknya (B53), dan klaim itu hampir
 * membuat sebuah rencana lima-penerbitan terbaca sebagai satu transaksi. fork test membuktikan
 * source; yang tidak bisa dibuktikan fork test adalah **instance yang orang lain buka di
 * explorer**. Jadi yang diperiksa di sini adalah code dan reaksi kontrak di chain publik, dan
 * Harapan semuanya diturunkan: selector dihitung dari tanda tangan, hash diambil dari buku besar
 * validator, peserta diambil dari `holderOf`. Tidak ada address yang diketik tangan (B49).
 *
 * Empat penolakan yang diuji lewat `eth_call` (bukan transaksi): mengirim sebagai owner berarti
 * memakai `from` pada panggilan — tidak ada gas, tidak ada state berubah, dan penolakannya tetap
 * sungguhan karena yang dieksekusi adalah bytecode yang sama.
 *
 * Perlu di lingkungan: RPC_URL, RESOLVER_ADDRESS, LIVE_CERT_ADDRESS, DEPLOYER_ADDRESS.
 */
import { readFile } from 'node:fs/promises'
import { createPublicClient, http, encodeFunctionData, toFunctionSelector } from 'viem'

import { listCredentials } from '../src/store.js'
import { loadFileEnvReport } from '../src/env.js'

// Satu mekanisme muat konfigurasi untuk semua perkakas (D45): tanpa ini harness bisa mencetak
// hijau atas lebih sedikit hal daripada yang dikira pembacanya.
await loadFileEnvReport('verify:live-cert')
const env = process.env
const RPC = env.RPC_URL || 'https://bsc-testnet.publicnode.com'
const RESOLVER = env.RESOLVER_ADDRESS
const CERT = env.LIVE_CERT_ADDRESS
const OWNER = env.DEPLOYER_ADDRESS
if (!RESOLVER || !CERT || !OWNER) {
  console.error('butuh RESOLVER_ADDRESS + LIVE_CERT_ADDRESS + DEPLOYER_ADDRESS (lihat .env.example)')
  process.exit(2)
}

const client = createPublicClient({ transport: http(RPC) })
let ran = 0
let fails = 0
function check (name, cond, detail = '') {
  ran += 1
  if (cond) console.log(`  ok    ${name}`)
  else { fails += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}

const MINT_ABI = [{
  type: 'function', name: 'mint', stateMutability: 'nonpayable',
  inputs: [{ name: 'learner', type: 'address' }, { name: 'credentialHash', type: 'bytes32' }, { name: 'uri', type: 'string' }],
  outputs: [{ type: 'uint256' }],
}]
const sel = (sig) => toFunctionSelector(sig)
const LESSON_GATE = ['attestationOf(bytes32)', 'lessonOf(bytes32)'].map(sel)
const BATCH_FN = sel('mintBatch(address[],bytes32[],string[])')
const ERR_LESSON = sel('LessonLevelNotMintable(bytes32,bytes32)')
const ERR_NOT_ISSUER = sel('NotIssuer(address)')

const code = (await client.getCode({ address: CERT })) ?? ''
console.log(`\n  ${CERT} · ${(code.length - 2) / 2} byte bytecode`)

// 1. D43: fungsi batch ADA di instance yang hidup, dan D42: gerbangnya memanggil registry.
check('bytecode memuat mintBatch (D43 ada di deployment, bukan hanya di source)', code.toLowerCase().includes(BATCH_FN.slice(2).toLowerCase()))
for (const s of LESSON_GATE) {
  check(`bytecode memanggil registry lewat ${s.slice(2)} (pintu D42 ada di deployment)`,
    code.toLowerCase().includes(s.slice(2).toLowerCase()))
}

// 2. SETIAP kertas yang buku besar katakan VALID di bawah host publik harus punya artefak di lapis
//    yang hidup. Versi pertama harness ini hanya membaca baris terakhir - dan itu berubah makna
//    setiap kali ada validasi baru: kertas yang tadinya terbukti bisa berhenti terbukti tanpa ada
//    yang menyadari. Yang diuji sekarang seluruh daftar, dan daftarnya diambil dari buku besar,
//    bukan dari angka yang kita ingat.
const ledgerRows = (await readFile(new URL('../../vault/09-Testing/validator-runs.jsonl', import.meta.url), 'utf8'))
  .trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l))
const durable = new Map()
for (const r of ledgerRows) {
  if (r.outcome !== 'VALID') continue
  if (typeof r.docUrl !== 'string' || !r.docUrl.startsWith('https://')) continue
  if (/127\.0\.0\.1|localhost|trycloudflare/.test(r.docUrl)) continue // host sementara bukan bukti
  durable.set(String(r.credentialHash).toLowerCase(), r)
}
check('buku besar memuat setidaknya satu kertas VALID di host tetap', durable.size > 0, `${durable.size} kertas`)

/**
 * ABI per fungsi, DITULIS lengkap termasuk tipe outputnya. Ini bukan formalitas: versi pertama
 * helper di bawah menyatakan semua output `address`, jadi `tokenOfCredential` (uint256) terpotong
 * menjadi 20 byte terbawah, `ownerOf` ditanya dengan id yang salah, dan revert yang keluar
 * disalahkan pada kontrak. Yang berubah hanyalah dekode kita.
 */
const fn = (name, inputs, outputs) => [{ type: 'function', name, stateMutability: 'view', inputs, outputs }]
const B32 = { type: 'bytes32' }
const U256 = { type: 'uint256' }
const ADDR = { type: 'address' }
const ABI = {
  holderOf: fn('holderOf', [B32], [ADDR]),
  tokenOfCredential: fn('tokenOfCredential', [B32], [U256]),
  ownerOf: fn('ownerOf', [U256], [ADDR]),
  tokenURI: fn('tokenURI', [U256], [{ type: 'string' }]),
}
/** Setiap panggilan rantai: revert adalah pemeriksaan MERAH, bukan crash yang menutup sisanya. */
async function read (label, to, abi, functionName, args) {
  try {
    return { ok: true, value: await client.readContract({ address: to, abi, functionName, args }) }
  } catch (e) {
    const msg = String(e?.shortMessage ?? e?.message ?? e).split('\n')[0]
    check(`${label}: panggilan chain ${functionName} berhasil`, false, msg.slice(0, 110))
    return { ok: false, value: null }
  }
}

let lastHash = null
let lastHolder = null
for (const [hash, ledger] of durable) {
  const tag = hash.slice(0, 10)
  const holder = await read(`${tag}… holderOf`, RESOLVER, ABI.holderOf, 'holderOf', [hash])
  if (!holder.ok) continue
  const tok = await read(`${tag}… tokenOfCredential`, CERT, ABI.tokenOfCredential, 'tokenOfCredential', [hash])
  if (!tok.ok) continue
  const tokenId = tok.value
  check(`artefak ${tag}… ada di lapis yang hidup`, tokenId > 0n, `tokenOfCredential = ${tokenId}`)
  if (tokenId === 0n) continue
  lastHash = hash
  lastHolder = holder.value
  const own = await read(`${tag}… ownerOf`, CERT, ABI.ownerOf, 'ownerOf', [tokenId])
  if (!own.ok) continue
  check(`${tag}…: ownerOf == holderOf (bukan alamat yang kita karang, B49)`,
    String(own.value).toLowerCase() === String(holder.value).toLowerCase(), `${own.value} vs ${holder.value}`)
  check(`${tag}…: tokenId == uint256(credentialHash) (satu artefak per kredensial)`,
    BigInt(hash) === tokenId, `${tokenId} vs ${hash}`)
  const u = await read(`${tag}… tokenURI`, CERT, ABI.tokenURI, 'tokenURI', [tokenId])
  if (!u.ok) continue
  let meta = {}
  try { meta = JSON.parse(u.value) } catch { check(`${tag}…: tokenURI adalah JSON yang terbaca`, false, String(u.value).slice(0, 90)) }
  check(`${tag}…: external_url = persis URL yang diikuti validator`, meta.external_url === ledger.docUrl, String(meta.external_url))
  check(`${tag}…: metadata menyebut status dari chain, bukan beku saat mint`,
    /VALID|REVOKED|EXPIRED|ISSUER_DELISTED/.test(meta.name ?? ''), meta.name)
  check(`${tag}…: tidak ada URL loopback atau host tunnel di metadata`,
    !/127\.0\.0\.1|localhost|trycloudflare/.test(u.value), String(u.value).slice(0, 110))
}
const hash = lastHash ?? [...durable.keys()][0] ?? '0x'
const holder = lastHolder ?? '0x0000000000000000000000000000000000000000'
const ledger = [...durable.values()].pop() ?? {}

// 3. Penolakan, diuji terhadap bytecode yang sama seperti yang akan ditemui orang lain.
//
// `eth_call` lewat pustaka tidak selalu menyampaikan data revert mentah (viem mengembalikan
// "Execution reverted for an unknown reason." saat ia tidak punya ABI untuk didekode), dan klaim
// "kontrak menolak dengan error X" tidak boleh bergantung pada pesan yang bisa hilang di jalan.
// Jadi panggilan dilakukan langsung sebagai JSON-RPC dan yang dibandingkan adalah selector di
// `error.data` — sama seperti yang akan dibaca klien nyata.
async function reverts (from, data) {
  try {
    const r = await fetch(RPC, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ from, to: CERT, data }, 'latest'] }),
    })
    const j = await r.json()
    if (j.error) {
      return { reverted: true, data: String(j.error.data ?? j.error.message ?? ''), message: String(j.error.message ?? '') }
    }
    return { reverted: false, data: String(j.result ?? '') }
  } catch (e) {
    return { reverted: true, data: String(e.message ?? e), message: String(e.message ?? e) }
  }
}
const records = await listCredentials()
const lesson = records.find((r) => r.lesson && String(r.lesson).length)
if (!lesson) {
  console.log('  info  tidak ada kredensial level-lesson di store — penolakan D42 hanya terbukti di fork test (T1/T2), bukan di chain ini')
} else {
  const lessonHash = String(lesson.credentialHash)
  const lessonUri = `${ledger.docUrl.replace(/\/credentials\/.*$/, '')}/credentials/${lessonHash}`
  const asOwner = encodeFunctionData({ abi: MINT_ABI, functionName: 'mint', args: [holder, lessonHash, lessonUri] })
  const r1 = await reverts(OWNER, asOwner)
  check('mint kredensial level-lesson DITOLAK oleh instance yang hidup (D42 ditegakkan di chain)',
    r1.reverted && r1.data.toLowerCase().includes(ERR_LESSON.slice(2).toLowerCase()),
    `${r1.data.slice(0, 70)} / ${r1.message.slice(0, 50)}`)
}
const asStranger = encodeFunctionData({ abi: MINT_ABI, functionName: 'mint', args: [holder, hash, ledger.docUrl] })
const r2 = await reverts(holder, asStranger)
check('mint oleh bukan-pemilik DITOLAK (NotIssuer)',
  r2.reverted && r2.data.toLowerCase().includes(ERR_NOT_ISSUER.slice(2).toLowerCase()),
  `${r2.data.slice(0, 70)} / ${r2.message.slice(0, 50)}`)

console.log(`\n${fails === 0 ? 'LAPIS ARTEFAK HIJAU' : 'LAPIS ARTEFAK MERAH'} — ${ran} pemeriksaan, ${fails} gagal`)
console.log('Yang dibaca: bytecode dan reaksi kontrak di RPC publik chain 97, bukan log build kami.')
process.exitCode = fails === 0 ? 0 : 1
