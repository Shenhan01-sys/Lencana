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
 * Atau, ini yang kita pakai sejak 21 Sep: isi `app/.env` (RPC_URL publik 97 + keempat alamat) lalu
 * `npm run probe` tanpa anvil sama sekali. Berkas `./load-env` membaca `.env` itu sendiri — sejak
 * 28 Sep, karena tanpa itu `npm run probe` di clone bersih diam-diam memeriksa `0x0000…` di port
 * lokal dan keluar dengan kode 1, sementara README menjanjikan sebuah angka.
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

// Lencana-B100 status=SELESAI 2026-09-29 — probe mengadili penghitung yang sama seperti halaman, bukan menempel PASS. Buktikan ulang: npm run probe. JANGAN dibalik/diulang tanpa membuka kembali baris B100 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { reportLoaded } from './load-env'
import { verify, type Endpoint, type Report } from '../src/verify'
import { renderReport } from '../src/render'

reportLoaded('probe')

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
    // Judul vonis milik pemilik FE: redesign verifier 29 Sep (`54b3318`, masuk lewat merge
    // dex/lencana-fe-integration 1 Okt) mengganti "PENERBIT DILISTING" dengan bahasa konsumen. Yang
    // dijaga di sini MAKNANYA, bukan ejaannya: delisting punya label sendiri, dan label itu bukan
    // label "dicabut" (D30 — attestation-nya tidak dicabut).
    const { DICTIONARIES: D } = await import('../src/i18n')
    const delistedTitle = D.id.verdicts.ISSUER_DELISTED?.title ?? ''
    check('agen dijatuhkan -> renderer punya label sendiri (bukan label dicabut)',
      delistedTitle !== '' && renderReport(r6).includes(delistedTitle) && delistedTitle !== D.id.verdicts.REVOKED?.title, delistedTitle)
    check('agen dijatuhkan -> semua pembacaan berhasil', r6.readLog.every((l) => l.ok), r6.readLog.filter((l) => !l.ok).map((l) => l.label).join(', '))
  }

  // --- 8. isi kursus -----------------------------------------------------------
  // Bagian ini TIDAK butuh chain: ia mengaudit data yang menghasilkan angka di katalog dan di
  // README. Alasannya sama dengan alasan probe ini ada — angka yang tidak dihitung dari datanya
  // sendiri adalah klaim. Enam templat tidak boleh berubah jadi enam ribu halaman tanpa ada yang
  // memeriksa bahwa kuisnya punya kunci jawaban di dalam rentang pilihan.
  const { auditAll, catalogStats, findCourse, findLesson } = await import('../src/courses/index')
  const { LESSON_KINDS, courseIdOf, credentialHashOf } = await import('../src/content')
  const { keccak256, toBytes } = await import('viem')
  const problems = auditAll()
  check(
    'isi kursus lolos audit (slug unik, kunci jawaban sah, rubrik = 100, tautan absolut)',
    problems.length === 0,
    problems.slice(0, 4).map((p) => `${p.where}: ${p.what}`).join(' | '),
  )
  const cs = catalogStats()
  check('lebih dari satu kursus di katalog — satu kursus itu brosur, bukan LMS', cs.courses > 1, `${cs.courses}`)
  check('jumlah halaman dihitung dari struktur, bukan ditulis tangan',
    cs.pages === 1 + cs.courses + cs.modules + cs.lessons, `${cs.pages} halaman`)
  check('keenam jenis lesson benar-benar terpakai, bukan daftar hiasan',
    LESSON_KINDS.every((k) => cs.kinds[k] > 0), JSON.stringify(cs.kinds))
  check('kuis dan esai ada (yang dinilai rubrik, bukan hanya dibaca)',
    cs.quizQuestions >= 15 && cs.essays >= 2, `${cs.quizQuestions} soal, ${cs.essays} esai`)

  // Ini yang mengikat materi ke chain. `courseId = keccak256(id kursus)` dan `SeedDemo.s.sol`
  // memakai `keccak256("web3-dasar-2026")`, jadi kalau ada yang "merapikan" id kursus, yang
  // terputus adalah hubungan antara materi ini dan attestasi yang benar-benar tertambang.
  const dasar = findCourse('web3-dasar-2026')
  const lanjut = findCourse('web3-lanjut-2026')
  check('id kursus = konstanta SeedDemo (materi menunjuk attestasi yang ada)',
    !!dasar && !!lanjut, `${dasar ? 'ok' : 'web3-dasar-2026 HILANG'} / ${lanjut ? 'ok' : 'web3-lanjut-2026 HILANG'}`)
  if (dasar) {
    const cid = courseIdOf(dasar)
    check('courseId materi = keccak256("web3-dasar-2026"), dihitung ulang, bukan disalin',
      cid === keccak256(toBytes('web3-dasar-2026')), cid)
    // Adegan [1] di chain: LEARNER memegang web3-dasar-2026 dan kredensialnya DICABUT.
    // Peserta itu 0x2eF9… (bukan 0x5cA3…, itu peserta kedua di adegan [3]) — salah tempel di
    // baris ini akan menghasilkan "gagal" yang bunyinya seperti datanya rusak.
    const learner = '0x2eF9aF5e0601b93a0347166FBd7EC3F677b9A988'
    check('credentialHash adegan [1] bisa dihitung ulang dari sisi materi',
      credentialHashOf(learner, cid) === '0xf34bdc454438f193929207aee75c94b01f8bad0bd65f5041b37b3e2b66b256f2',
      credentialHashOf(learner, cid))
  }
  if (lanjut) {
    const first = lanjut.modules[0]?.lessons[0]
    check('lesson pertama kursus lanjut benar-benar bisa dicari lewat rute',
      !!first && !!findLesson(lanjut, first.slug), first?.slug ?? '(tidak ada lesson)')
    check('prasyarat kursus lanjut menunjuk kursus dasar, seperti rantai di chain',
      lanjut.prereqCourseId === 'web3-dasar-2026', String(lanjut.prereqCourseId))
  }

  // --- 8b. otoritas penilaian ------------------------------------------------
  // Lubang yang ditutup bagian ini nyata: `passMark` dan `weights` sebelumnya hanya teks
  // tampilan, dan angka kredensial datang dari argumen CLI manusia. Yang diperiksa di sini
  // BUKAN aritmetika (itu pekerjaan `npm run rubric`) — tapi bahwa setiap kursus yang bisa
  // dibuka orang punya kebijakan penerbit yang bisa ditunjuk sebuah dokumen. Kursus tanpa
  // manifest tidak punya itu, dan kredensialnya tidak bisa dijelaskan.
  const { COURSES } = await import('../src/courses/index')
  const { manifestOf, rubricHashOf } = await import('../src/manifest')
  const { computeScore, quizCount, essayCount } = await import('../src/score')
  for (const c of COURSES) {
    const mf = manifestOf(c.id)
    check(`"${c.id}" punya manifest penerbit`, !!mf, 'tanpa manifest, kriteria dokumen tidak punya sumber')
    if (!mf) continue
    check(`  rubricHash ${c.id} terbentuk benar`, /^0x[0-9a-f]{64}$/.test(rubricHashOf(mf)))
    const full = computeScore(mf, {
      quizScores: Array.from({ length: quizCount(mf) }, () => 90),
      praktikCompleted: true,
      essayScore: essayCount(mf) ? 90 : null,
    })
    check(`  bukti lengkap -> keputusan, bukan "belum lengkap"`,
      full.verdict !== 'BELUM_LENGKAP' && full.total !== null, `${full.verdict} ${full.total} vs ambang ${full.passMark}`)
    const none = computeScore(mf, { quizScores: [], praktikCompleted: false, essayScore: null })
    check(`  tanpa bukti -> menolak, BUKAN nol`, none.verdict === 'BELUM_LENGKAP' && none.total === null, String(none.total))
  }

  // Lencana-B127 status=TERBUKA 2026-10-02 — komponen berbobot 0 tidak menahan keputusan, dan audit menolak bobot tanpa lesson jenisnya (dua arah). Buktikan ulang: cd web && npm run probe. JANGAN dibalik/diulang tanpa membuka kembali baris B127 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  const { auditCourse } = await import('../src/content')
  const zeroWeight = COURSES.filter((c) => c.weights.praktik === 0)
  check(`B127: katalog memuat kursus tanpa praktik di chain (bobot praktik 0): ${zeroWeight.length}`, zeroWeight.length >= 1, zeroWeight.map((c) => c.id).join(', '))
  for (const c of zeroWeight) {
    const mf = manifestOf(c.id)
    if (!mf) continue
    const s = computeScore(mf, { quizScores: Array.from({ length: quizCount(mf) }, () => 90), praktikCompleted: false, essayScore: 90 })
    check(`  ${c.id}: kuis + esai lengkap tanpa praktik -> keputusan (praktik berbobot 0 tidak dinilai)`,
      s.verdict !== 'BELUM_LENGKAP' && s.total === 90, `${s.verdict} ${s.total} ${s.missing.join(' | ')}`)
  }
  const lanjutBase = findCourse('web3-lanjut-2026')
  if (lanjutBase) {
    const tanpaPraktik = { ...lanjutBase, modules: lanjutBase.modules.map((m) => ({ ...m, lessons: m.lessons.filter((l) => l.kind !== 'praktik') })) }
    check('B127: audit menolak bobot praktik >0 tanpa satu pun lesson praktik',
      auditCourse(tanpaPraktik).some((p) => p.what.includes('bobot praktik')), JSON.stringify(auditCourse(tanpaPraktik).map((p) => p.what)))
    const praktikTakDihitung = { ...lanjutBase, weights: { kuis: 40, esai: 60, praktik: 0 } }
    check('B127: audit menolak lesson praktik di komponen berbobot 0 (kerja yang tidak dihitung)',
      auditCourse(praktikTakDihitung).some((p) => p.what.includes('bobot praktik 0')), JSON.stringify(auditCourse(praktikTakDihitung).map((p) => p.what)))
  }
  // Lencana-B80 status=SELESAI 2026-10-01 — data kursus yang diimpor halaman tidak membawa kunci jawaban; pemindaian bundel lengkapnya ada di npm run verify:quizkeys (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B80 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  const soal = COURSES.flatMap((c) => c.modules.flatMap((m) => m.lessons)).flatMap((l) => l.quiz?.questions ?? [])
  check(`B80: ${soal.length} soal kuis yang diimpor halaman tanpa answer/why (kunci hanya di sisi server)`,
    soal.length > 0 && soal.every((q) => q.answer === undefined && q.why === undefined),
    soal.filter((q) => q.answer !== undefined || q.why !== undefined).map((q) => q.id).join(','))

  // ---------------------------------------------------------------- halaman penerbit (B105)
  // Yang dijaga di sini bukan "halamannya cantik", tapi dua hal yang paling mudah hilang
  // diam-diam: (1) rute + nav + mount-nya benar-benar terpasang, dan (2) kalimat yang MENGAKUI
  // keadaan custody hari ini masih ada di KEDUA bahasa. Tanpa (2), halaman ini bisa terbaca
  // sebagai "penerbit menandatangani sendiri" padahal kunci agen demo masih tinggal di mesin
  // platform — dan itu klaim yang justru kita jadikan pembeda.
  const { readFile } = await import('node:fs/promises')
  const { MANIFESTS } = await import('../src/manifest')
  const { DICTIONARIES } = await import('../src/i18n')
  const htmlPub = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const mainSrc = await readFile(new URL('../src/main.ts', import.meta.url), 'utf8')
  check('halaman #/publishers terpasang di index.html (page-view + nav + mount)',
    htmlPub.includes('id="page-publishers"') && htmlPub.includes('id="nav-publishers"') && htmlPub.includes('id="publishers-mount"'))
  check('rute #/publishers ditangani main.ts dan dipetakan ke nav-nya',
    mainSrc.includes("hash === '#/publishers'") && mainSrc.includes("'page-publishers': 'nav-publishers'"))
  check('isi registri diturunkan dari manifest saat runtime, bukan diketik ke HTML',
    mainSrc.includes('renderPublishers') && !/id="publishers-mount"[^>]*>\s*[^<]/.test(htmlPub))
  for (const lang of ['en', 'id'] as const) {
    const s = DICTIONARIES[lang].publishersSection
    check(`  kamus "${lang}" mengakui custody: kunci agen masih di mesin platform dan jalur self-custody BELUM dibangun`,
      s.onboardingCustody.includes('.keys/') && /(NOT built|BELUM dibangun)/.test(s.onboardingCustody),
      s.onboardingCustody.slice(0, 70))
    check(`  kamus "${lang}" menyatakan onboarding itu manual (addIssuer oleh platform, bukan pendaftaran swalayan)`,
      /addIssuer\(\)/.test(s.onboardingManual) && s.onboardingManual.length > 80)
  }
  check('setiap penerbit punya URL dokumen penerbit yang bisa dibuka orang',
    MANIFESTS.every((m) => /^https?:\/\//.test(m.issuer.controllerUrl)), MANIFESTS.map((m) => m.issuer.controllerUrl).join(' '))
  const slugUnik = new Set(MANIFESTS.map((m) => m.issuer.slug))
  check(`registri penerbit punya isi (${slugUnik.size} penerbit / ${MANIFESTS.length} manifest)`,
    slugUnik.size >= 1 && MANIFESTS.length >= 1)

  // Dokumen penerbit yang ditampilkan halaman ini harus benar-benar bisa dibuka orang lain. Yang di
  // manifest demo adalah host loopback (127.0.0.1:8787), jadi halaman menampilkan yang disajikan
  // tepi — dan itu diuji lewat jaringan sungguhan, bukan dengan membaca sumbernya saja.
  // `CREDENTIAL_HOST` TIDAK diimpor dari src/main: berkas itu kode DOM dan mengimpornya di Node akan
  // meledak. Konstantanya dibaca dari sumber, dan keberadaannya ikut diadili supaya tidak bisa
  // hilang diam-diam.
  const hostMatch = /export const CREDENTIAL_HOST = '([^']+)'/.exec(mainSrc)
  check('CREDENTIAL_HOST terdefinisi di main.ts (sumber URL dokumen penerbit publik)', !!hostMatch, hostMatch?.[1] ?? 'tidak ditemukan')
  const hostPublik = hostMatch?.[1] ?? ''
  // Dokumen agen yang hari ini menandatangani untuk penerbit demo — diuji lewat jaringan sungguhan.
  // Versi pertama pemeriksaan ini menurunkan URL dari slug manifest danlangsung MERAH: tepi menjawab
  // **404** untuk `/issuers/yayasan-nusantara`, karena tepi menyajikan dokumen per slug AGEN
  // (agent-edge/agent-b41/agent-demo) dan pemetaan penerbit→agen tidak ada di manifest. Kegagalan itu
  // yang membuat halamannya berhenti menebak URL, jadi pemeriksaannya ditulis terhadap URL yang
  // memang ditampilkan halaman.
  const urlDok = `${hostPublik}/issuers/agent-edge`
  let okDok = false
  let kunciDok = 0
  let errDok = ''
  try {
    const r = await fetch(urlDok, { signal: AbortSignal.timeout(20_000) })
    const j = await r.json() as { id?: string; assertionMethod?: unknown[] }
    kunciDok = (j.assertionMethod ?? []).length
    okDok = r.status === 200 && kunciDok > 0 && typeof j.id === 'string' && /^https:\/\//.test(j.id)
    if (!okDok) errDok = `status ${r.status}, ${kunciDok} kunci, id=${String(j.id).slice(0, 60)}`
  } catch (e) { errDok = String((e as Error).message ?? e).slice(0, 90) }
  check(`dokumen penerbit publik terbaca orang lain: ${urlDok}`, okDok, errDok || `${kunciDok} kunci assertionMethod, id host https`)
  check('halaman menampilkan URL yang sama dengan yang diuji di sini, bukan turunan dari slug manifest',
    mainSrc.includes('/issuers/agent-edge'))
  check('URL loopback di manifest dinamai apa adanya, bukan disodorkan sebagai tautan publik',
    mainSrc.includes('loopbackWarning') && /127\.0\.0\.1|localhost/.test(mainSrc))

  // ---------------------------------------------------------------- klien belajar (B72)
  // Yang diuji di sini KONTRAK antara browser dan penerbit, dengan `fetch` dan `sessionStorage`
  // dipalsukan. Sengaja tidak memanggil penerbit sungguhan: itu sudah dikerjakan
  // `npm run verify:db` di sisi signer, dan probe wajib bisa jalan tanpa jaringan supaya clone
  // orang lain tidak lebih merah dari punyanya sendiri.
  console.log('\n--klien belajar: apa yang boleh (dan tidak boleh) dikirim browser (B72)--')
  const { isAddress } = await import('viem')
  const { verifyMessage } = await import('viem/utils')
  const {
    completeLesson, createDeviceLearner, endpoint, forgetLearner, learnerAddress, markLesson,
    setEndpoint, snapshot, submitQuiz, syncCourse,
  } = await import('../src/learning')
  const g = globalThis as unknown as Record<string, unknown>
  const session = new Map<string, string>()
  g.sessionStorage = {
    getItem: (k: string) => session.get(k) ?? null,
    setItem: (k: string, v: string) => { session.set(k, v) },
    removeItem: (k: string) => { session.delete(k) },
  }
  const sent: { url: string, method: string, body: Record<string, unknown> | null }[] = []
  let progressMode: 'none' | 'ok' | 'reject' = 'none'
  // Klien mengirim URL penuh (`endpoint + path`), jadi stub mencocokkan path-nya saja — kalau tidak,
  // semuanya jatuh ke cabang "rute tidak dikenal" dan kegagalan yang keluar adalah kegagalan stub,
  // bukan perilaku halaman.
  const asPath = (u: string): string => {
    const i = u.indexOf('/', u.indexOf('://') + 3)
    return i === -1 ? '/' : u.slice(i)
  }
  const stub = async (url: string, init?: { method?: string, body?: string }) => {
    const method = (init?.method ?? 'GET').toUpperCase()
    let body: Record<string, unknown> | null = null
    try { body = init?.body ? JSON.parse(init.body as string) as Record<string, unknown> : null } catch { body = null }
    const u = asPath(url as string)
    sent.push({ url: u, method, body })
    const json = (obj: unknown, status = 200) => ({ status, ok: status < 400, json: async () => obj })
    if (u.startsWith('/progress?')) {
      if (progressMode === 'none') return json({ error: 'no enrollment yet for this learner/course' }, 404)
      return json({
        enrollmentId: 7, lessonsTotal: 19, lessonsCompleted: progressMode === 'ok' ? 1 : 0,
        allLessonsDone: false, completed: ['m1/l1'], lessons: [{ lessonId: 'm1/l1', status: 'completed' }],
        gradedAttempts: 1, bestScore: 80,
      })
    }
    // Stub yang jujur atas urutannya: SETELAH enroll barisnya memang ada, jadi pembacaan
    // berikutnya tidak boleh 404 lagi. Versi pertama lupa ini dan pemeriksaan "404 → enroll → baca
    // lagi" merah karena stub-nya, bukan karena halamannya.
    if (u === '/enroll') {
      if (progressMode === 'none') progressMode = 'ok'
      return json({ enrolled: true, created: true, enrollmentId: 7, course: 'web3-dasar-2026' })
    }
    if (u === '/progress') {
      if (progressMode === 'reject') {
        return json({ error: 'pindah status locked -> completed tidak diizinkan (mesin: locked -> unlocked -> started -> completed)' }, 422)
      }
      return json({ lesson: 7, from: 'locked', to: body?.status, noop: false })
    }
    if (u === '/grade') {
      return json({
        attemptHash: `0x${'ab'.repeat(32)}`, attemptId: 11, attemptNo: 1, lesson: body?.lesson, kind: 'kuis',
        rubricHash: `0x${'cd'.repeat(32)}`, score: 60, correct: 3, total: 5, passPct: 80, verdict: 'fail',
        gradedBy: 'server', components: 5,
        // B80: pembahasan sesudah penyerahan; butir ketiga sengaja berbentuk salah dan harus dibuang
        review: [
          { itemId: 'q1', correct: true, why: 'alasan satu' },
          { itemId: 'q2', correct: false, why: 'alasan dua' },
          { itemId: 'q3', correct: 'ya' },
        ],
      }, 201)
    }
    return json({ error: 'stub: rute tidak dikenal' }, 500)
  }
  const realFetch = globalThis.fetch
  g.fetch = stub
  try {
    forgetLearner()
    const before = await submitQuiz('web3-dasar-2026', 'm1/l2', [{ itemId: 'q1', choice: 0 }])
    check('tanpa identitas, submitQuiz menolak dan TIDAK mengirim apa pun',
      before === null && sent.length === 0, `${sent.length} permintaan terkirim`)
    const noId = await completeLesson('web3-dasar-2026', 'm1/l1', 0)
    check('tanpa identitas, completeLesson menolak (tidak ada tulis diam-diam)',
      noId.ok === false && /identitas/i.test(noId.why ?? ''), JSON.stringify(noId))

    const id = createDeviceLearner()
    check('identitas perangkat dibuat di browser (storage tersedia)', id !== null && isAddress(id.address), JSON.stringify(id))
    setEndpoint('http://127.0.0.1:8787/')
    check('endpoint dinormalisasi (tanpa / di ujung)', endpoint() === 'http://127.0.0.1:8787', endpoint())

    progressMode = 'none'
    const sum = await syncCourse('web3-dasar-2026')
    const enrollCall = sent.find((s) => s.url === '/enroll')
    check('GET /progress 404 -> klien enroll lebih dulu, lalu membaca lagi',
      sum !== null && Boolean(enrollCall) && sent.filter((s) => s.url.startsWith('/progress?')).length >= 2,
      `${sum?.lessonsTotal}/${sum?.lessonsCompleted}`)
    const msg = String(enrollCall?.body?.message ?? '')
    check('kiriman enroll membawa pesan bertanda tangan + nonce satu-kali',
      /lencana-enroll web3-dasar-2026 nonce=[0-9a-f]{12,}/.test(msg), msg)
    const sig = String(enrollCall?.body?.signature ?? '')
    // Dibungkus: verifikasi dengan string kosong MELEMPAR (viem menolak panjangnya), dan satu
    // lemparan di sini akan membunuh seluruh probe sebelum sisa pemeriksaan berjalan.
    let verified = false
    try {
      verified = id ? await verifyMessage({ address: id.address as `0x${string}`, message: msg, signature: sig as `0x${string}` }) : false
    } catch (e) {
      verified = false
      console.log(`      (verifyMessage melempar: ${String((e as Error)?.message ?? e).slice(0, 60)})`)
    }
    check('tanda tangan enroll sah untuk alamat pesertanya (bentuk yang diterima authorizeLearner)',
      verified === true && /^0x[0-9a-f]{130}$/.test(sig), `${verified} ${sig.slice(0, 12)}… (${sig.length} char)`)
    check('klien TIDAK mengirim lessons_total (penyebut "selesai" milik server)',
      enrollCall ? !('lessonsTotal' in (enrollCall.body ?? {})) && !('lessons_total' in (enrollCall.body ?? {})) : false,
      JSON.stringify(Object.keys(enrollCall?.body ?? {})))

    const beforeGrade = sent.length
    const graded = await submitQuiz('web3-dasar-2026', 'm1/l2', [{ itemId: 'q1', choice: 2 }, { itemId: 'q2', choice: 1 }])
    const gradeCall = sent.slice(beforeGrade).find((s) => s.url === '/grade')
    check('/grade dikirim dengan picks, dan jawabannya yang jadi angka di halaman',
      graded !== null && graded.score === 60 && graded.gradedBy === 'server' && String(gradeCall?.body?.picks ?? '').length > 0,
      JSON.stringify(graded))
    check('ISI /grade tidak memuat kata "score" sama sekali (browser tidak melaporkan nilai)',
      gradeCall ? !JSON.stringify(gradeCall.body).includes('score') : false,
      gradeCall ? JSON.stringify(Object.keys(gradeCall.body ?? {})) : 'tidak ada panggilan /grade')
    check('verdict datang dari ambang penerbit, bukan dari perasaan halaman',
      graded?.verdict === 'fail' && graded.passPct === 80, JSON.stringify(graded))
    check('B80: pembahasan diambil dari balasan /grade (benar/salah + alasan), butir berbentuk salah dibuang',
      graded?.review.length === 2 && graded.review[0].correct === true && graded.review[1].why === 'alasan dua',
      JSON.stringify(graded?.review))

    sent.length = 0
    progressMode = 'ok'
    const walk = await completeLesson('web3-dasar-2026', 'm9/l9', 4)
    const order = sent.filter((s) => s.url === '/progress').map((s) => s.body?.status)
    check('completeLesson berjalan sesuai mesin state: unlocked → started → completed',
      walk.ok === true && JSON.stringify(order) === JSON.stringify(['unlocked', 'started', 'completed']), JSON.stringify(order))

    sent.length = 0
    progressMode = 'reject'
    const jumped = await markLesson('web3-dasar-2026', 'm9/l9', 'completed', 4)
    check('kalau server menolak lompatan, alasannya ditampilkan apa adanya (bukan ditelan)',
      jumped.ok === false && /tidak diizinkan/.test(snapshot().error ?? ''), JSON.stringify({ jumped, err: snapshot().error }))

    progressMode = 'ok'
    forgetLearner()
    sent.length = 0
    const afterForget = await syncCourse('web3-dasar-2026')
    check('ganti identitas menghapus alamat dan berhenti mengirim', afterForget === null && learnerAddress() === null && sent.length === 0,
      `${sent.length} permintaan`)
  } finally {
    g.fetch = realFetch
    delete g.sessionStorage
  }

  // ---------------------------------------------------------------- lesson kuis/esai tercatat selesai (B160)
  // Penerbit tiruan yang MENEGAKKAN mesin state asli (`signer/src/db.js` ALLOWED_MOVE): kalau klien mengirim langkah yang salah,
  // jawabannya 422 seperti server sungguhan — bukan stub yang menerima apa saja.
  console.log('\n--lesson kuis/esai tercatat selesai di penerbit (B160)--')
  {
    const { lessonsWithEvidence, reconcileLessons, quizFinishes, essayFinishes } = await import('../src/learning')
    const lessons4 = [
      { slug: 'baca', kind: 'bacaan' },
      { slug: 'kuis', kind: 'kuis', quiz: {} },
      { slug: 'praktik', kind: 'praktik', proof: {} },
      { slug: 'esai', kind: 'esai', essay: {} },
    ]
    const att = (lesson: string, kind: string, verdict: string | null, chainChecked = false) => ({ lesson, kind, verdict, chainChecked })
    const sum = (...completed: string[]) => ({ lessons: completed.map((lessonId) => ({ lessonId, status: 'completed' })) })
    const ev = (attempts: ReturnType<typeof att>[], completed: string[] = []) => lessonsWithEvidence({ attempts, summary: sum(...completed) }, lessons4)

    check('kuis lulus = bukti; kuis gagal bukan', JSON.stringify(ev([att('kuis', 'kuis', 'pass')])) === '["kuis"]' && ev([att('kuis', 'kuis', 'fail')]).length === 0,
      JSON.stringify([ev([att('kuis', 'kuis', 'pass')]), ev([att('kuis', 'kuis', 'fail')])]))
    check('esai yang SUDAH dinilai (lulus atau tidak) = bukti; esai belum dinilai (incomplete) bukan',
      JSON.stringify(ev([att('esai', 'esai', 'pass')])) === '["esai"]' && JSON.stringify(ev([att('esai', 'esai', 'fail')])) === '["esai"]'
      && ev([att('esai', 'esai', 'incomplete')]).length === 0 && ev([att('esai', 'esai', null)]).length === 0)
    check('praktik = bukti hanya bila dinilai chain dan lulus (laporan peserta tidak dihitung, B121)',
      JSON.stringify(ev([att('praktik', 'praktik', 'pass', true)])) === '["praktik"]' && ev([att('praktik', 'praktik', 'pass', false)]).length === 0)
    check('bacaan tidak pernah punya bukti di server — hanya tombol "Tandai selesai"',
      ev([att('baca', 'kuis', 'pass'), att('baca', 'esai', 'pass'), att('baca', 'praktik', 'pass', true)]).length === 0)
    check('usaha untuk lesson LAIN dengan jenis yang sama tidak dihitung; lesson yang sudah completed tidak diulang',
      ev([att('kuis-lain', 'kuis', 'pass')]).length === 0 && ev([att('kuis', 'kuis', 'pass')], ['kuis']).length === 0)
    check('aturan selesai: kuis hanya bila lulus; esai hanya bila diterima untuk dinilai (bukan insufficient)',
      quizFinishes({ verdict: 'pass' }) && !quizFinishes({ verdict: 'fail' }) && essayFinishes({ state: 'awaiting_judge' }) && !essayFinishes({ state: 'insufficient' }))

    const lessonState = new Map<string, string>()
    let records: ReturnType<typeof att>[] = []
    let recordsFail = false
    const MOVES: Record<string, string[]> = { locked: ['unlocked'], unlocked: ['started', 'completed'], started: ['completed'], completed: [] }
    const summaryOf = () => ({
      enrollmentId: 9, lessonsTotal: 4, lessonsCompleted: [...lessonState.values()].filter((v) => v === 'completed').length, allLessonsDone: false,
      completed: [...lessonState].filter(([, v]) => v === 'completed').map(([k]) => k),
      lessons: [...lessonState].map(([lessonId, status]) => ({ lessonId, status })), gradedAttempts: records.length, bestScore: null,
    })
    const stub2 = async (url: string, init?: { method?: string, body?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      let body: Record<string, unknown> | null = null
      try { body = init?.body ? JSON.parse(init.body as string) as Record<string, unknown> : null } catch { body = null }
      const u = asPath(url as string)
      sent.push({ url: u, method, body })
      const json = (obj: unknown, status = 200) => ({ status, ok: status < 400, json: async () => obj })
      if (u.startsWith('/progress?')) return json(summaryOf())
      if (u === '/progress') {
        const lesson = String(body?.lesson); const to = String(body?.status); const from = lessonState.get(lesson) ?? 'locked'
        if (from === to) return json({ lesson: 9, from, to, noop: true })
        if (!MOVES[from].includes(to)) return json({ error: `status transition ${from} -> ${to} not allowed (state machine: locked -> unlocked -> started -> completed)` }, 422)
        lessonState.set(lesson, to)
        return json({ lesson: 9, from, to, noop: false })
      }
      if (u === '/me/records') {
        if (recordsFail) return json({ error: 'database sedang tidak terjangkau' }, 500)
        return json({ learner: '0x', courses: [{ courseId: 'uji-bayar-2026', status: 'active', enrolledAt: '', summary: summaryOf(), attempts: records, orders: [] }] })
      }
      return json({ error: 'stub: rute tidak dikenal' }, 500)
    }
    const posts = () => sent.filter((s) => s.url === '/progress' && s.method === 'POST').map((s) => `${String(s.body?.lesson)}:${String(s.body?.status)}`)
    const reads = () => sent.filter((s) => s.url === '/me/records')
    // Penjaga lintas-akun: progres perangkat (`lencana-progress-v1`) tidak dikunci per akun dan keluar akun tidak menghapusnya,
    // jadi rekonsiliasi TIDAK boleh membacanya — satu akses ke kunci itu dan akun kedua mewarisi lesson akun pertama.
    const touched: string[] = []
    g.sessionStorage = {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => { session.set(k, v) },
      removeItem: (k: string) => { session.delete(k) },
    }
    g.localStorage = { getItem: (k: string) => { touched.push(k); return null }, setItem: (k: string) => { touched.push(k) }, removeItem: (k: string) => { touched.push(k) } }
    const realFetch2 = globalThis.fetch
    g.fetch = stub2
    try {
      forgetLearner()
      createDeviceLearner()
      setEndpoint('http://127.0.0.1:8787/')

      records = [att('kuis', 'kuis', 'pass'), att('esai', 'esai', 'pass'), att('praktik', 'praktik', 'pass', false), att('baca', 'kuis', 'pass')]
      sent.length = 0
      const a = await reconcileLessons('uji-bayar-2026', lessons4)
      check('reconcile: kuis lulus + esai dinilai disusulkan; praktik laporan-peserta dan bacaan TIDAK',
        a.ok && JSON.stringify(a.completed) === '["kuis","esai"]' && a.failed.length === 0 && !lessonState.has('baca') && !lessonState.has('praktik'),
        JSON.stringify({ a, state: [...lessonState] }))
      check('reconcile menempuh mesin state untuk tiap lesson: unlocked → started → completed (server tiruan menolak lompatan)',
        JSON.stringify(posts()) === JSON.stringify(['kuis:unlocked', 'kuis:started', 'kuis:completed', 'esai:unlocked', 'esai:started', 'esai:completed']), JSON.stringify(posts()))
      const readCall = reads()[0]
      check('reconcile membaca bukti SATU kali lewat /me/records dengan pesan khusus bertanda tangan',
        reads().length === 1 && /^lencana-records nonce=[0-9a-f]{12,}$/.test(String(readCall?.body?.message ?? '')) && /^0x[0-9a-f]{130}$/.test(String(readCall?.body?.signature ?? '')),
        `${reads().length} baca · ${String(readCall?.body?.message ?? '')}`)
      check('tidak ada angka atau nilai yang dikirim klien (hanya status lesson bertanda tangan peserta)',
        sent.filter((s) => s.url === '/progress' && s.method === 'POST').every((s) => !('score' in (s.body ?? {})) && /^lencana-progress \S+ -> (unlocked|started|completed) nonce=[0-9a-f]{12,}$/.test(String(s.body?.message ?? ''))),
        JSON.stringify(sent.filter((s) => s.url === '/progress' && s.method === 'POST').slice(0, 1).map((s) => s.body)))

      sent.length = 0
      const again = await reconcileLessons('uji-bayar-2026', lessons4)
      check('reconcile idempoten: kedua kalinya hanya membaca, nol tulisan', again.ok && again.completed.length === 0 && posts().length === 0 && reads().length === 1,
        `${posts().length} tulis · ${reads().length} baca`)

      lessonState.clear(); lessonState.set('kuis', 'started')
      sent.length = 0
      const stuck = await reconcileLessons('uji-bayar-2026', lessons4)
      check('lesson yang macet di `started` hanya dikirimi `completed` (dulu `unlocked` lagi → 422 selamanya)',
        stuck.ok && JSON.stringify(posts().filter((p) => p.startsWith('kuis:'))) === '["kuis:completed"]' && lessonState.get('kuis') === 'completed', JSON.stringify({ posts: posts(), stuck }))
      lessonState.clear(); lessonState.set('baca', 'started')
      sent.length = 0
      await syncCourse('uji-bayar-2026')
      const direct = await completeLesson('uji-bayar-2026', 'baca', 0)
      check('completeLesson langsung: lesson `started` hanya dikirimi `completed`', direct.ok && JSON.stringify(posts()) === '["baca:completed"]', JSON.stringify({ direct, posts: posts() }))

      lessonState.clear()
      records = [att('kuis', 'kuis', 'fail'), att('esai', 'esai', 'incomplete')]
      sent.length = 0
      const none = await reconcileLessons('uji-bayar-2026', lessons4)
      check('kuis gagal dan esai belum dinilai: tidak ada yang ditulis (selesai ≠ lulus, tapi juga bukan "dianggap selesai")', none.ok && posts().length === 0 && none.completed.length === 0, JSON.stringify(none))

      records = [att('kuis', 'kuis', 'pass')]
      recordsFail = true
      sent.length = 0
      const down = await reconcileLessons('uji-bayar-2026', lessons4)
      check('bukti tak terbaca → berhenti dengan alasan apa adanya, nol tulisan', !down.ok && /tidak terjangkau/.test(down.why ?? '') && posts().length === 0, JSON.stringify(down))
      recordsFail = false

      check('rekonsiliasi TIDAK membaca progres perangkat (`lencana-progress-v1` tidak dikunci per akun)', !touched.includes('lencana-progress-v1'),
        `kunci yang disentuh: ${[...new Set(touched)].join(', ') || '—'}`)
    } finally {
      g.fetch = realFetch2
      delete g.sessionStorage
      delete g.localStorage
      forgetLearner()
    }
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
