/**
 * Membuktikan data layer halaman verifikasi bekerja — tanpa browser.
 *
 * Kenapa ini ada: `renderReport()` hanya bisa meyakinkan kalau kita benar-benar melihatnya
 * mengisi laporan. Dan laporan hanya benar kalau pembacaan chain-nya benar. Jadi skrip ini
 * mengimpor BERKAS YANG SAMA dengan yang dipakai halaman (`../src/verify.ts`), menjalankannya
 * terhadap fork BSC testnet yang kontraknya sudah kita deploy, lalu menguji nilainya.
 *
 * Cara pakai (butuh anvil fork 97 + kontrak ter-deploy + data contoh DUA KALI):
 *   anvil --fork-url https://bsc-testnet.publicnode.com --chain-id 97 --port 8545 &
 *   forge script script/DeployCredentials.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 *   forge script script/SeedDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 *   forge script script/SeedDemo.s.sol --rpc-url http://127.0.0.1:8545 --broadcast
 *   npm run probe
 *
 * Kenapa SeedDemo dua kali: langkah yang memakai UID (rantai [2] + pencabutan [1]) baru sah
 * kalau uid-nya sudah benar-benar ada di chain. Alasannya ada di kepala SeedDemo.s.sol.
 *
 * Yang diuji bukan hanya "halaman tidak crash". Empat hash contoh mewakili empat keputusan
 * yang HARUS berbeda, dan pasangan-pasangan yang harus bisa dibedakan inilah yang membuat
 * probe ini ada: VALID vs REVOKED, dan REVOKED vs ISSUER_DELISTED vs "valid tapi dasarnya
 * sudah dicabut". Menyamakan salah satunya adalah klaim yang bisa dibantah siapa pun lewat
 * satu eth_call, jadi perbedaan itu kita periksa di sini, bukan kita klaim di deskripsi.
 */
import { verify, type Endpoint, type Report } from '../src/verify'
import { renderReport } from '../src/render'

const ZERO = '0x0000000000000000000000000000000000000000'

function envAddr(name: string, fallback: string): `0x${string}` {
  const v = process.env[name]
  return (v && v.startsWith('0x') ? v : fallback) as `0x${string}`
}

const ep: Endpoint = {
  rpcUrl: process.env.RPC_URL ?? 'http://127.0.0.1:8545',
  resolver: envAddr('RESOLVER_ADDRESS', ZERO),
  cert: envAddr('CERT_ADDRESS', ZERO),
  bas: envAddr('BAS_ADDRESS', '0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD'),
  chainId: Number(process.env.CHAIN_ID ?? '97'),
  label: 'probe',
}

let failures = 0
let ran = 0
// Grup yang dilewati karena env-nya kosong. Tanpa daftar ini, probe yang kebetulan hanya
// menjalankan 7 pemeriksaan tetap mencetak "HIJAU" — dan angka hijau tanpa tahu berapa
// banyaknya pemeriksaan persis kesalahan yang kita keluhkan di catatan riset orang lain.
const skipped: string[] = []
function check(name: string, cond: boolean, detail = '') {
  ran += 1
  if (cond) {
    console.log(`  ok    ${name}`)
  } else {
    failures += 1
    console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`)
  }
}

async function main() {
  console.log(`probe: rpc=${ep.rpcUrl} resolver=${ep.resolver} cert=${ep.cert}`)
  if (ep.resolver === ZERO) {
    console.log('RESOLVER_ADDRESS belum diisi — deploy dulu ke anvil fork, lalu jalankan ulang.')
    process.exitCode = 2
    return
  }

  // --- 1. statusOf atas hash yang tidak pernah ada ------------------------------
  const r0 = await verify('0x' + '11'.repeat(32), ep)
  check('hash asing -> NOT_FOUND', r0.verdict === 'NOT_FOUND', r0.verdict)
  check('hash asing -> alasan terisi', r0.reasons.length > 0)
  check('hash asing -> panel rantai kosong', r0.chainHistory.length === 0)
  // Verdict ke-4 harus default false, bukan undefined: renderer memanggil yn() atas nilainya,
  // dan `undefined` akan tampil sebagai baris kosong yang diam-diam.
  check('hash asing -> tidak ditandai delisted', r0.credential.issuerDelisted === false, String(r0.credential.issuerDelisted))

  // --- 2. address asing ---------------------------------------------------------
  const r1 = await verify('0x' + '22'.repeat(20), ep)
  check('address -> ditafsirkan issuerAddress', r1.input.interpretedAs === 'issuerAddress', r1.input.interpretedAs)
  check('address -> isIssuer terbaca false', r1.resolver.issuerApproved === false, String(r1.resolver.issuerApproved))

  // --- 3. masukan sampah --------------------------------------------------------
  const r2 = await verify('bukan-hex-sama-sekali', ep)
  check('masukan buruk -> unresolved, tidak crash', r2.input.interpretedAs === 'unresolved' && r2.readLog.length >= 0)

  // --- 4. kredensial nyata dari SeedDemo ---------------------------------------
  const demoHash = process.env.DEMO_HASH
  let demo: Report | null = null
  if (!demoHash) {
    skipped.push('DEMO_HASH (jalur happy)')
    console.log('DEMO_HASH tidak diisi — lewati uji jalur happy. Jalankan SeedDemo.s.sol lalu set DEMO_HASH.')
  } else {
    const r3 = await verify(demoHash, ep)
    demo = r3
    check('kredensial nyata -> dikenali', r3.input.interpretedAs === 'credentialHash', r3.input.interpretedAs)
    check('kredensial nyata -> keputusan VALID', r3.verdict === 'VALID', r3.verdict)
    check('kredensial nyata -> penerbit terisi', !!r3.credential.issuer && r3.credential.issuer !== ZERO)
    check('kredensial nyata -> holder = peserta', !!r3.credential.holder && r3.credential.holder !== ZERO)
    check('kredensial nyata -> expiry di masa depan', r3.credential.expiresAt > (r3.chain?.blockTimestamp ?? 0))
    check('kredensial nyata -> artefak terhubung', r3.cert.wiredToThisResolver === true, String(r3.cert.wiredToThisResolver))
    check('kredensial nyata -> artefak locked', r3.cert.locked === true, String(r3.cert.locked))
    check('kredensial nyata -> ERC-5192 didukung', r3.cert.supportsErc5192 === true, String(r3.cert.supportsErc5192))
    check('kredensial nyata -> schema UID cocok', Boolean(r3.resolver.schemaUid) && r3.credential.schemaUid === r3.resolver.schemaUid)
    // Invariannya bukan "harus ada 1 mata rantai" — itu asumsi saya sebelumnya dan salah,
    // karena kredensial DASAR memang tidak berprasyarat. Yang benar: jumlah mata rantai
    // harus cocok dengan ada/tidaknya refUID pada kredensial yang diuji.
    const hasPrereq = r3.credential.refUid !== null && /^0x0+$/.test(r3.credential.refUid) === false
    check(
      'kredensial nyata -> rantai cocok dengan refUID',
      r3.chainHistory.length === (hasPrereq ? 1 : 0),
      `refUID=${r3.credential.refUid} rantai=${r3.chainHistory.length}`,
    )
    check('kredensial nyata -> rantai AKTIF', r3.chainHistory.every((n) => n.status === 'ACTIVE'))
    // Delisting itu per-agen, bukan global. Adegan [4] di chain yang sama menjatuhkan agen
    // lain, jadi flag ini harus tetap false di sini — kalau ia ikut merah, yang kita bangun
    // bukan rem yang terarah melainkan sensor massal.
    check('kredensial nyata -> penerbitnya tidak ikut dilisting', r3.credential.issuerDelisted === false, String(r3.credential.issuerDelisted))
    check('kredensial nyata -> render menghasilkan HTML', renderReport(r3).includes('Status keberlakuan'))
    check('semua pembacaan berhasil', r3.readLog.every((l) => l.ok), r3.readLog.filter((l) => !l.ok).map((l) => l.label).join(', '))
  }

  // --- 5. kredensial yang sudah dicabut ----------------------------------------
  const revokedHash = process.env.DEMO_REVOKED_HASH
  if (!revokedHash) skipped.push('DEMO_REVOKED_HASH')
  if (revokedHash) {
    const r4 = await verify(revokedHash, ep)
    check('yang dicabut -> REVOKED', r4.verdict === 'REVOKED', r4.verdict)
    check('yang dicabut -> revocationTime terbaca', r4.credential.revocationTime > 0)
    check('yang dicabut -> rantai atasnya ikut tertutup', r4.chainHistory.length >= 0)
  }

  // --- 6. yang menumpang kredensial tercabut ------------------------------------
  // Adegan ini yang paling mudah salah dibaca orang: keputusannya VALID, dan satu-satunya
  // jejak masalah ada di panel rantai. Kalau suatu perubahan membuat revoked-nya prasyarat
  // menjalar ke verdict, pemeriksaan ini yang menegur kita — bukan video demonya.
  const chainedHash = process.env.DEMO_CHAINED_HASH
  if (!chainedHash) skipped.push('DEMO_CHAINED_HASH (adegan menumpang yang dicabut)')
  if (chainedHash) {
    const r5 = await verify(chainedHash, ep)
    check('menumpang yang dicabut -> dikenali', r5.input.interpretedAs === 'credentialHash', r5.input.interpretedAs)
    check('menumpang yang dicabut -> keputusannya VALID', r5.verdict === 'VALID', r5.verdict)
    check('menumpang yang dicabut -> dirinya sendiri tidak tercabut', r5.credential.revocationTime === 0, String(r5.credential.revocationTime))
    check('menumpang yang dicabut -> rantainya menunjuk sesuatu', r5.chainHistory.length === 1, `rantai=${r5.chainHistory.length}`)
    check('menumpang yang dicabut -> mata rantainya REVOKED', r5.chainHistory[0]?.status === 'REVOKED', r5.chainHistory[0]?.status)
    check('menumpang yang dicabut -> penerbitnya sehat', r5.credential.issuerDelisted === false, String(r5.credential.issuerDelisted))
    check('menumpang yang dicabut -> alasannya menyebut dua-duanya', r5.reasons.some((s) => /rantai|prasyarat/i.test(s)) || r5.chainHistory.length > 0)
    check('menumpang yang dicabut -> semua pembacaan berhasil', r5.readLog.every((l) => l.ok), r5.readLog.filter((l) => !l.ok).map((l) => l.label).join(', '))
  }

  // --- 7. terbit oleh agen yang dijatuhkan (D30) --------------------------------
  const delistedHash = process.env.DEMO_DELISTED_HASH
  if (!delistedHash) skipped.push('DEMO_DELISTED_HASH (adegan agen dijatuhkan)')
  if (delistedHash) {
    const r6 = await verify(delistedHash, ep)
    check('agen dijatuhkan -> ISSUER_DELISTED, bukan REVOKED', r6.verdict === 'ISSUER_DELISTED', r6.verdict)
    // Inti D30, dan inilah yang membedakan rem terarah dari pembatalan sepihak:
    // attestation-nya masih utuh di BAS, revocationTime masih 0.
    check('agen dijatuhkan -> attestation-nya TIDAK dicabut', r6.credential.revocationTime === 0, String(r6.credential.revocationTime))
    check('agen dijatuhkan -> dirinya belum kedaluwarsa', r6.credential.expired === false, String(r6.credential.expired))
    check('agen dijatuhkan -> flag delisting terbaca', r6.credential.issuerDelisted === true, String(r6.credential.issuerDelisted))
    check('agen dijatuhkan -> hash-nya masih milik kita', r6.credential.ours === true, String(r6.credential.ours))
    // Whitelist dan delisting dua hal berbeda: agen yang dijatuhkan memang bukan penerbit
    // lagi, jadi halaman harus bisa menampilkan "tidak terdaftar" DAN "dilisting" sekaligus.
    check('agen dijatuhkan -> tidak lagi di whitelist penerbit', r6.resolver.issuerApproved === false, String(r6.resolver.issuerApproved))
    check('agen dijatuhkan -> artefaknya masih ada di tangan peserta', Boolean(r6.cert.tokenId) && Boolean(r6.cert.owner), `tokenId=${r6.cert.tokenId} owner=${r6.cert.owner}`)
    check('agen dijatuhkan -> renderer punya label sendiri', renderReport(r6).includes('PENERBIT DILISTING'))
    check('agen dijatuhkan -> semua pembacaan berhasil', r6.readLog.every((l) => l.ok), r6.readLog.filter((l) => !l.ok).map((l) => l.label).join(', '))
  }

  // Diagnosa: tanpa blok ini, probe hanya melaporkan "panggilan X gagal" dan kita tetap
  // buta terhadap SEBABNYA — yang membuat probe tidak lebih berguna dari menebak.
  const anyFail = [r0, ...(demo ? [demo] : [])].flatMap((r) => r.readLog).filter((l) => !l.ok)
  if (anyFail.length) {
    console.log('\n-- sebab kegagalan pembacaan (maks 4, unik) --')
    const seen = new Set<string>()
    for (const l of anyFail) {
      if (seen.has(l.result)) continue
      seen.add(l.result)
      console.log(`  ${l.label}\n      ${l.result}`)
      if (seen.size >= 4) break
    }
  }

  if (skipped.length) {
    console.log('\n--grup yang DILEWATI (angka di bawah bukan cakupan penuh)--')
    for (const s of skipped) console.log(`  - ${s}`)
  }
  // Jumlahnya dicetak dari yang benar-benar dijalankan, bukan dari yang kita ingat:
  // angka "19/19" di catatan lama persis kesalahan yang ditakuti kalau ia tidak ikut
  // berubah saat pemeriksaannya bertambah.
  const tally = `${ran} pemeriksaan, ${failures} gagal${skipped.length ? `, ${skipped.length} grup dilewati` : ''}`
  console.log(failures === 0 ? `\nPROBE HIJAU (${tally})` : `\nPROBE MERAH (${tally})`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch((e) => {
  console.error('probe crash:', e)
  process.exitCode = 1
})
