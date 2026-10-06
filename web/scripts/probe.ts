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
import { verify, certCandidates, pickArtefactLayer, enforcesCourseLevel, defaultEndpoint, CERT_LAYERS_97, type CertLayer, type Endpoint, type Report } from '../src/verify'
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
  // hilang diam-diam. Sejak B165 ia didefinisikan di src/config.ts (halaman `#/app` butuh host ini dan tidak boleh
  // mengimpor main.ts); main.ts mengekspor ulang namanya yang sama.
  // B168: sumbernya `src/hosts.ts` (tanpa impor; dipakai juga fungsi Vercel); config.ts dan main.ts mengekspor ulang.
  const hostsSrc = await readFile(new URL('../src/hosts.ts', import.meta.url), 'utf8')
  const configSrc = await readFile(new URL('../src/config.ts', import.meta.url), 'utf8')
  const hostMatch = /export const CREDENTIAL_HOST = '([^']+)'/.exec(hostsSrc)
  check('CREDENTIAL_HOST terdefinisi di hosts.ts (sumber URL dokumen penerbit publik)', !!hostMatch, hostMatch?.[1] ?? 'tidak ditemukan')
  check('config.ts dan main.ts mengekspor ulang CREDENTIAL_HOST dan APP_HOST tanpa definisi ganda; hosts.ts tanpa impor',
    /export \{[^}]*\bCREDENTIAL_HOST\b[^}]*\}/.test(configSrc) && /export \{[^}]*\bAPP_HOST\b[^}]*\}/.test(configSrc) &&
    /export \{[^}]*\bCREDENTIAL_HOST\b[^}]*\}/.test(mainSrc) && /export \{[^}]*\bAPP_HOST\b[^}]*\}/.test(mainSrc) &&
    !/export const (CREDENTIAL_HOST|APP_HOST) =/.test(configSrc) && !/export const (CREDENTIAL_HOST|APP_HOST) =/.test(mainSrc) && !/^\s*import\s/m.test(hostsSrc))
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

  // ---------------------------------------------------------------- formulir praktik (B157)
  // Yang diuji: apa yang HALAMAN kirim ke `POST /praktik` (bentuk isian, isi permintaan, tidak ada angka dari klien) dan apa yang
  // dilakukannya dengan jawaban server. Cocok-tidaknya jawaban dengan chain adalah urusan server: `npm run verify:praktik`.
  console.log('\n--formulir praktik: apa yang dikirim halaman ke POST /praktik (B157)--')
  {
    const { ethCallAnswers, submitPraktik, praktikRejection } = await import('../src/learning')
    const { COURSES } = await import('../src/courses/index')
    const reads = [{ id: 'name' }, { id: 'symbol' }, { id: 'decimals' }]
    const hex = (c: string) => `0x${c.repeat(64)}`

    const good = ethCallAnswers(reads, { name: `  ${hex('a')} `, symbol: hex('b'), decimals: '0x06', extra: 'diabaikan' })
    check('isian: spasi di ujung dibuang, kolom di luar `reads` diabaikan, kunci hasil persis `reads[].id`',
      good.ok && JSON.stringify(Object.keys(good.results)) === '["name","symbol","decimals"]' && good.results.name === hex('a') && !('extra' in good.results), JSON.stringify(good))
    const blank = ethCallAnswers(reads, { name: hex('a'), symbol: '   ', decimals: '0x06' })
    check('isian kosong ditolak sebelum dikirim, dengan nama kolomnya', !blank.ok && blank.field === 'symbol', JSON.stringify(blank))
    const notHex = ethCallAnswers(reads, { name: 'LDC', symbol: hex('b'), decimals: '0x06' })
    const noPrefix = ethCallAnswers(reads, { name: hex('a'), symbol: 'b'.repeat(64), decimals: '0x06' })
    const bare = ethCallAnswers(reads, { name: hex('a'), symbol: '0x', decimals: '0x06' })
    check('isian bukan heksadesimal 0x… (teks biasa, tanpa 0x, atau "0x" saja) ditolak sebelum dikirim',
      !notHex.ok && notHex.field === 'name' && !noPrefix.ok && noPrefix.field === 'symbol' && !bare.ok && bare.field === 'symbol', JSON.stringify([notHex, noPrefix, bare]))

    const rejected = praktikRejection('3 of 3 checks do not match what chain 97 says', ['eth-call:name', 'eth-call:decimals'], 3, 97)
    const serverSide = praktikRejection('learner not enrolled in this course — no row to attach the practice attempt to', undefined, 3, 97)
    check('penolakan jawaban salah: kalimat Indonesia dengan jumlah + NAMA pemeriksaan, tanpa satu pun nilai heksadesimal',
      JSON.stringify(rejected.names) === '["name","decimals"]' && /2 dari 3 pemeriksaan tidak cocok/.test(rejected.text) && !/0x[0-9a-f]/i.test(rejected.text), JSON.stringify(rejected))
    check('penolakan yang BUKAN salah jawaban (belum daftar, tanda tangan, chain tak terbaca): alasan server apa adanya, tanpa nama pemeriksaan',
      serverSide.names.length === 0 && /not enrolled/.test(serverSide.text), JSON.stringify(serverSide))

    const ethLessons = COURSES.flatMap((c) => c.modules.flatMap((m) => m.lessons.map((l) => ({ c: c.id, l })))).filter((x) => x.l.proof?.type === 'eth-call')
    check('semua lesson praktik `eth-call` di katalog bisa diisi formulir: tiap pembacaan punya id unik dan tak kosong',
      ethLessons.length > 0 && ethLessons.every(({ l }) => {
        const rs = l.proof?.type === 'eth-call' ? l.proof.reads : []
        return rs.length > 0 && new Set(rs.map((r) => r.id)).size === rs.length && rs.every((r) => r.id.length > 0)
      }), `${ethLessons.length} lesson: ${ethLessons.map((x) => `${x.c}/${x.l.slug}`).join(', ')}`)

    const praktikSent: { url: string, method: string, body: Record<string, unknown> | null }[] = []
    let praktikMode: 'ok' | 'wrong' | 'down' = 'ok'
    const stub3 = async (url: string, init?: { method?: string, body?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase()
      let body: Record<string, unknown> | null = null
      try { body = init?.body ? JSON.parse(init.body as string) as Record<string, unknown> : null } catch { body = null }
      const u = asPath(url as string)
      praktikSent.push({ url: u, method, body })
      const json = (obj: unknown, status = 200) => ({ status, ok: status < 400, json: async () => obj })
      if (u.startsWith('/progress?')) return json({ enrollmentId: 9, lessonsTotal: 4, lessonsCompleted: 0, allLessonsDone: false, completed: [], lessons: [], gradedAttempts: 0, bestScore: null })
      if (u === '/praktik') {
        if (praktikMode === 'wrong') return json({ error: '1 of 3 checks do not match what chain 97 says — re-read and resubmit (the correct values are not returned)', failed: ['eth-call:decimals'] }, 422)
        if (praktikMode === 'down') return json({ error: 'practice checking is not configured on this server (no RPC_URL)' }, 503)
        return json({
          attemptHash: `0x${'12'.repeat(32)}`, attemptId: 970, attemptNo: 1, lesson: body?.lesson, kind: 'praktik', rubricHash: `0x${'cd'.repeat(32)}`,
          score: 100, verdict: 'pass', gradedBy: 'chain', proofType: 'eth-call', proofKey: null, blockNumber: '134950900',
          checks: ['eth-call:name', 'eth-call:symbol', 'eth-call:decimals'],
        }, 201)
      }
      return json({ error: 'stub: rute tidak dikenal' }, 500)
    }
    g.sessionStorage = {
      getItem: (k: string) => session.get(k) ?? null,
      setItem: (k: string, v: string) => { session.set(k, v) },
      removeItem: (k: string) => { session.delete(k) },
    }
    const realFetch3 = globalThis.fetch
    g.fetch = stub3
    try {
      forgetLearner()
      const noId = await submitPraktik('uji-bayar-2026', 'praktik-baca-koin', good.ok ? good.results : {})
      check('tanpa identitas, submitPraktik menolak dan TIDAK mengirim apa pun', !noId.ok && /identitas/i.test(noId.why) && praktikSent.length === 0, JSON.stringify({ noId, sent: praktikSent.length }))

      const id = createDeviceLearner()
      setEndpoint('http://127.0.0.1:8787/')
      praktikSent.length = 0
      const done = await submitPraktik('uji-bayar-2026', 'praktik-baca-koin', good.ok ? good.results : {})
      const call = praktikSent.find((s) => s.url === '/praktik')
      check('praktik lulus: tanda terima dari server (percobaan, jenis bukti, blok, nama pemeriksaan) — angkanya tidak dihitung klien',
        done.ok && done.receipt.attemptNo === 1 && done.receipt.proofType === 'eth-call' && done.receipt.blockNumber === '134950900'
        && JSON.stringify(done.receipt.checks) === '["eth-call:name","eth-call:symbol","eth-call:decimals"]', JSON.stringify(done))
      check('isi /praktik: learner, course, lesson, answers.results (persis isian), message, signature — dan tidak ada yang lain',
        Boolean(call) && JSON.stringify(Object.keys(call?.body ?? {}).sort()) === JSON.stringify(['answers', 'course', 'learner', 'lesson', 'message', 'signature'])
        && JSON.stringify(call?.body?.answers) === JSON.stringify({ results: good.ok ? good.results : {} }), JSON.stringify(Object.keys(call?.body ?? {})))
      check('/praktik tidak membawa score / verdict / components / rubricHash (server menolaknya dengan 400)',
        call ? !/"(score|verdict|components|rubricHash)"/.test(JSON.stringify(call.body)) : false)
      const msg = String(call?.body?.message ?? '')
      let verified = false
      try {
        verified = id ? await verifyMessage({ address: id.address as `0x${string}`, message: msg, signature: String(call?.body?.signature ?? '') as `0x${string}` }) : false
      } catch { verified = false }
      check('pesan menyebut kursus + lesson (server memeriksa `lesson=<slug>`) + nonce satu-kali, dan tanda tangannya sah untuk peserta',
        /^lencana-praktik-submit course=uji-bayar-2026 lesson=praktik-baca-koin nonce=[0-9a-f]{12,}$/.test(msg) && verified === true, `${msg} · sah=${verified}`)

      praktikMode = 'wrong'
      praktikSent.length = 0
      const wrong = await submitPraktik('uji-bayar-2026', 'praktik-baca-koin', good.ok ? good.results : {})
      check('jawaban salah: ditolak dengan NAMA pemeriksaan yang gagal saja (tanpa nilai yang benar), dan tidak ada tulisan progres',
        !wrong.ok && JSON.stringify(wrong.failed) === '["eth-call:decimals"]' && !/0x[0-9a-f]{8,}/i.test(wrong.why)
        && praktikSent.every((s) => s.url !== '/progress'), JSON.stringify(wrong))
      praktikMode = 'down'
      const down = await submitPraktik('uji-bayar-2026', 'praktik-baca-koin', good.ok ? good.results : {})
      check('server tak bisa memeriksa chain (503): alasannya ditampilkan apa adanya, bukan "salah jawaban"', !down.ok && /not configured/.test(down.why) && down.failed === undefined, JSON.stringify(down))
    } finally {
      g.fetch = realFetch3
      delete g.sessionStorage
      forgetLearner()
    }
  }

  // --- 9. artefak soulbound di SEMUA lapis kontrak (B164) ------------------------
  // Lencana-B164 status=SELESAI 2026-10-05 — probe mengadili pemilihan lapis artefak: murni (urutan, duplikat, gagal-baca ≠ kosong, bytecode D42/D43) dan, di chain 97 publik, terhadap kredensial B153 yang artefaknya tercetak di DUA lapis. Buktikan ulang: cd web && npm run probe (grup B164). JANGAN dibalik/diulang tanpa membuka kembali baris B164 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  {
    console.log('\n--artefak soulbound di semua lapis kontrak (B164)--')
    type Addr = `0x${string}`
    const LA: Addr = '0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa'
    const LB: Addr = '0xC6FD12B06e4dB9B85C8C807826998f98DA51c4cd'
    const LC: Addr = '0xA5eB807A98BB73432fE5a1F171bb1154dE9c309c'
    const NOL = ZERO as Addr
    const same = (a: readonly string[], b: readonly string[]) => JSON.stringify(a.map((x) => x.toLowerCase())) === JSON.stringify(b.map((x) => x.toLowerCase()))
    check('lapis dibaca berurutan: cert dulu, lalu certs; duplikat (huruf besar/kecil) dan alamat nol dibuang',
      same(certCandidates({ cert: LC, certs: [LA, LB, LC.toLowerCase() as Addr, NOL] }), [LC, LA, LB]), JSON.stringify(certCandidates({ cert: LC, certs: [LA, LB, LC, NOL] })))
    check('konfigurasi eksplisit satu instance (tanpa certs) hanya membaca cert; cert nol tanpa certs = tidak ada lapis',
      same(certCandidates({ cert: LB }), [LB]) && certCandidates({ cert: NOL }).length === 0)
    const L = (address: Addr, tokenId: string | null, readOk = true): CertLayer => ({ address, tokenId, readOk, enforcesCourseLevel: null })
    check('tidak ada lapis yang memegang artefak -> tetap menampilkan lapis utama, tanpa lapis lain',
      (() => { const p = pickArtefactLayer([L(LC, null), L(LA, null), L(LB, null)], LC); return p.chosen === LC && p.others.length === 0 })())
    check('lapis pertama (menurut urutan baca) yang memegang artefak dipilih; lapis lain yang juga memegangnya dicatat',
      (() => { const p = pickArtefactLayer([L(LC, null), L(LA, '5'), L(LB, '5')], LC); return p.chosen === LA && p.others.length === 1 && p.others[0].address === LB })())
    check('pembacaan yang GAGAL tidak dihitung memegang artefak (gagal-baca ≠ ada, dan ≠ kosong)',
      (() => { const p = pickArtefactLayer([L(LC, null, false), L(LA, '5')], LC); return p.chosen === LA && p.others.length === 0 })())
    const { toFunctionSelector } = await import('viem')
    const sels = ['mintBatch(address[],bytes32[],string[])', 'attestationOf(bytes32)', 'lessonOf(bytes32)'].map((sg) => toFunctionSelector(sg).slice(2))
    check('bytecode dengan ketiga selector (mintBatch, attestationOf, lessonOf) = menegakkan D42/D43',
      enforcesCourseLevel(`0x6080${sels.join('00')}` as Addr) === true)
    check('bytecode tanpa mintBatch = tidak menegakkan (lapis sebelum D43)', enforcesCourseLevel(`0x6080${sels[1]}00${sels[2]}` as Addr) === false)
    check('bytecode kosong atau tak terbaca -> null (tidak ditebak)', enforcesCourseLevel('0x') === null && enforcesCourseLevel(undefined) === null && enforcesCourseLevel(null) === null)
    check('bawaan chain 97: cert tetap lapis paling tua (D46) dan ketiga lapis dibaca, dengan cert lebih dulu',
      (() => { const d = defaultEndpoint(); const c = certCandidates(d); return d.cert === LC && c.length === 3 && c[0] === LC && same(CERT_LAYERS_97, [LA, LB, LC]) })())
    const { PRESETS, loadEndpoint } = await import('../src/config')
    // fork lokal: hanya cert hasil SeedDemo (1 lapis); mainnet: cert masih nol dan tidak mewarisi lapis chain 97 (0 lapis).
    check('preset fork lokal dan mainnet tidak mewarisi lapis publik',
      (() => { const n = (id: string) => certCandidates(PRESETS.find((p) => p.id === id)?.endpoint ?? { cert: NOL }).length; return n('anvil') === 1 && n('bsc56') === 0 })(),
      PRESETS.map((p) => `${p.id}:${certCandidates(p.endpoint).length}`).join(' '))
    check('preset bsc97 membaca cert-nya lebih dulu lalu dua lapis lain',
      (() => { const p = PRESETS.find((x) => x.id === 'bsc97'); const c = p ? certCandidates(p.endpoint) : []; return c.length === 3 && c[0] === LB })())
    const gg = globalThis as unknown as { localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } }
    const savedLS = gg.localStorage
    try {
      let stored: string | null = null
      gg.localStorage = { getItem: () => stored, setItem: (_k, v) => { stored = v } }
      stored = JSON.stringify({ rpcUrl: 'https://x.invalid' })
      check('konfigurasi tersimpan lama (tanpa certs) di deployment publik tetap mewarisi ketiga lapis', certCandidates(loadEndpoint()).length === 3)
      stored = JSON.stringify({ resolver: '0x' + '12'.repeat(20) })
      check('konfigurasi tersimpan yang menunjuk resolver lain TIDAK mewarisi lapis publik', certCandidates(loadEndpoint()).length === 1)
      stored = JSON.stringify({ cert: LB, certs: [] })
      check('certs kosong yang disimpan eksplisit dihormati (satu instance)', same(certCandidates(loadEndpoint()), [LB]))
    } finally {
      if (savedLS) gg.localStorage = savedLS
      else delete gg.localStorage
    }

    // Terhadap chain 97 publik: kredensial B153 (terbit 5 Okt 2026) punya artefak di DUA lapis (A dan B), dan tidak di lapis paling tua.
    const B153: Addr = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31'
    const B153_LEARNER = '0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF'
    const publicDeploy = ep.chainId === 97 && ep.resolver.toLowerCase() === defaultEndpoint().resolver.toLowerCase()
    if (!publicDeploy) {
      skipped.push('B164 terhadap B153 (hanya ada di deployment publik chain 97)')
    } else {
      const epL: Endpoint = { ...ep, cert: LC, certs: [...CERT_LAYERS_97] }
      const rb = await verify(B153, epL)
      const byAddr = (a: string) => rb.cert.layers.find((l) => l.address.toLowerCase() === a.toLowerCase())
      check('B153 -> VALID dan artefaknya DITEMUKAN walau lapis utama (paling tua) kosong', rb.verdict === 'VALID' && Boolean(rb.cert.tokenId), `${rb.verdict} token=${rb.cert.tokenId}`)
      check('B153 -> tokenId = angka dari credentialHash dan artefak terkunci milik peserta',
        rb.cert.tokenId === BigInt(B153).toString() && rb.cert.locked === true && rb.cert.owner?.toLowerCase() === B153_LEARNER.toLowerCase(), `${rb.cert.tokenId} ${rb.cert.locked} ${rb.cert.owner}`)
      check('B153 -> yang ditampilkan lapis D42/D43 (pertama yang memegang), bukan lapis paling tua', rb.cert.address?.toLowerCase() === LA.toLowerCase(), String(rb.cert.address))
      check('B153 -> ketiga lapis dibaca; paling tua kosong, dua lainnya memegang artefak',
        rb.cert.layers.length === 3 && byAddr(LC)?.tokenId === null && byAddr(LC)?.readOk === true && Boolean(byAddr(LA)?.tokenId) && Boolean(byAddr(LB)?.tokenId),
        JSON.stringify(rb.cert.layers.map((l) => [l.address.slice(0, 8), l.tokenId ? 'ada' : l.readOk ? 'kosong' : 'gagal'])))
      check('B153 -> penegakan D42/D43 diukur dari bytecode: lapis A ya, lapis B tidak', byAddr(LA)?.enforcesCourseLevel === true && byAddr(LB)?.enforcesCourseLevel === false, JSON.stringify(rb.cert.layers.map((l) => l.enforcesCourseLevel)))
      check('B153 -> alasan menyebut artefak di dua lapis, dan semua pembacaan berhasil', rb.reasons.some((x) => /2 lapis/.test(x)) && rb.readLog.every((l) => l.ok), rb.readLog.filter((l) => !l.ok).map((l) => l.label).join(', '))
      check('B153 -> perintah ulang menyertakan satu tokenOfCredential per lapis', rb.reproduction.cast.filter((x) => /tokenOfCredential\(bytes32\)/.test(x)).length === 3)
      const { DICTIONARIES: DI } = await import('../src/i18n')
      const htmlB = renderReport(rb)
      check('B153 -> panel menampilkan semua lapis, label "ada artefak", dan penanda D42/D43',
        htmlB.includes(DI.id.panels.soulboundArtifact.layerHolds) && htmlB.includes(LA) && htmlB.includes(LC) && /D42\/D43 [✓✗]/.test(htmlB))
      const ra = await verify(B153_LEARNER, epL)
      check('alamat peserta B153 -> jumlah artefak dijumlahkan dari semua lapis (≥ 2), bukan hanya lapis utama', Number(ra.cert.holderBalance ?? '0') >= 2, String(ra.cert.holderBalance))
      const rs = await verify(BigInt(B153).toString(), epL)
      check('tokenId desimal milik B153 -> dikenali di lapis mana pun dan kembali ke credentialHash-nya', rs.input.interpretedAs === 'sbtTokenId' && rs.credential.hash?.toLowerCase() === B153, `${rs.input.interpretedAs} ${rs.credential.hash}`)
      const rx = await verify('0x' + '11'.repeat(32), epL)
      check('hash asing -> semua lapis dibaca, tidak ada yang memegang artefak, dan tidak ada yang ditandai gagal', rx.cert.layers.length === 3 && rx.cert.layers.every((l) => l.tokenId === null && l.readOk))
      if (demo && demoHash) {
        const rd = await verify(demoHash, epL)
        check('kredensial demo lama -> artefaknya tetap terbaca di lapis utama (korpus D46 tidak hilang)',
          Boolean(rd.cert.tokenId) && rd.cert.address?.toLowerCase() === LC.toLowerCase(), `${rd.cert.address} ${rd.cert.tokenId}`)
      }
    }
  }

  // --- 10. lembar sertifikat dari dokumen kredensial nyata (B165) ---------------------
  // Lencana-B165 status=SELESAI 2026-10-05 — probe mengadili pemetaan dokumen → lembar (murni), geometri kristal/cincin/QR, nama penerima, dan jalur data: kepemilikan dua arah, "tidak tersaji" ≠ "gagal", terhadap kredensial B153 di chain 97 publik. Buktikan ulang: cd web && npm run probe (grup B165). JANGAN dibalik/diulang tanpa membuka kembali baris B165 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  {
    console.log('\n--lembar sertifikat dari dokumen kredensial (B165)--')
    const C = await import('../src/certificate')
    const Q = await import('../src/certificate-qr')
    const CR = await import('../src/credentials')
    const { CREDENTIAL_HOST: EDGE, APP_HOST: APP } = await import('../src/config')
    const H153 = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31' as const
    const L153 = '0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF' as const
    const NARR = 'Nilai akhir >= 60 dari 100. Komposisi: kuis 50%, praktik 20%, esai 30%. Kelas uji alur pembayaran: kredensialnya hanya menyatakan peserta menyelesaikan kelas pendek ini, bukan keahlian Web3. [rubrik 6d33c95b4ecc]'
    const LIMIT153 = 'Kelas uji alur pembayaran: kredensialnya hanya menyatakan peserta menyelesaikan kelas pendek ini, bukan keahlian Web3.'
    const fxDoc = (over: Record<string, unknown> = {}, subjectId: string = `${EDGE}/learners/${L153}`) => ({
      id: `${EDGE}/credentials/${H153}`, type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: { id: `${EDGE}/issuers/agent-edge`, type: 'Profile', name: 'Lencana Demo Agent' },
      validFrom: '2026-10-05T09:41:01Z', validUntil: '2027-10-05T09:41:01Z', name: 'Kelas Uji — Membayar dengan Tanda Tangan',
      credentialSubject: {
        id: subjectId, type: 'AchievementSubject',
        achievement: { id: `${EDGE}/achievements/uji-bayar-2026`, type: ['Achievement'], name: 'Kelas Uji — Membayar dengan Tanda Tangan', criteria: { id: `${EDGE}/criteria/uji-bayar-2026`, type: 'Criteria', narrative: NARR } },
        result: [{ id: `${EDGE}/results/uji-bayar-2026/${H153}`, type: ['Result'], value: '87' }],
      },
      proof: { type: 'DataIntegrityProof', cryptosuite: 'eddsa-rdfc-2022', proofPurpose: 'assertionMethod' },
      ...over,
    })
    const fxCrit = (over: Record<string, unknown> = {}) => ({
      id: `${EDGE}/criteria/uji-bayar-2026`, name: 'Kelas Uji — Membayar dengan Tanda Tangan', narrative: NARR.replace(' [rubrik 6d33c95b4ecc]', ''),
      issuer: { slug: 'yayasan-nusantara', name: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)' },
      policy: { passMark: 60, validDays: 365, weights: { praktik: 20, kuis: 50, esai: 30 } }, ...over,
    })

    // pemetaan dokumen
    const pc = C.parseCredentialDoc(fxDoc())
    check('dokumen B153 -> judul, alamat peserta, kursus, nilai 87, bukti dan format terbaca dari dokumen',
      pc?.title === 'Kelas Uji — Membayar dengan Tanda Tangan' && pc.learner === L153 && pc.courseId === 'uji-bayar-2026' && pc.score === 87 &&
      pc.proof?.type === 'DataIntegrityProof' && pc.proof.suite === 'eddsa-rdfc-2022' && pc.format === 'Open Badges 3.0' && pc.issuerAgent === 'Lencana Demo Agent', JSON.stringify(pc))
    check('dokumen tanpa alamat peserta yang sah, tanpa judul, atau dengan tanggal rusak -> ditolak (null), tidak dikarang',
      C.parseCredentialDoc(fxDoc({}, `${EDGE}/learners/bukan-alamat`)) === null && C.parseCredentialDoc(fxDoc({ name: '', credentialSubject: { id: `${EDGE}/learners/${L153}`, achievement: {} } })) === null &&
      C.parseCredentialDoc(fxDoc({ validUntil: 'kemarin' })) === null && C.parseCredentialDoc(null) === null && C.parseCredentialDoc('x') === null && C.parseCredentialDoc([]) === null)
    check('nilai di luar 0-100 atau bukan angka -> nilai null (lembar tidak menampilkan angka), dokumennya tetap terbaca',
      [101, -1, 'abc', null].every((v) => { const d = fxDoc(); (d.credentialSubject.result[0] as { value: unknown }).value = v; const p = C.parseCredentialDoc(d); return p !== null && p.score === null }))
    check('slug kursus yang tidak aman (garis miring, titik, huruf besar) tidak dipakai untuk URL tepi',
      !C.isCourseSlug('../x') && !C.isCourseSlug('A') && !C.isCourseSlug('a/b') && !C.isCourseSlug('') && C.isCourseSlug('uji-bayar-2026'))
    const pk = C.parseCriteria(fxCrit())
    check('kriteria -> penerbit, batas lulus 60, bobot berurutan kuis 50, esai 30, praktik 20 (urutan sumber diabaikan)',
      pk?.publisher === 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)' && pk.passMark === 60 && JSON.stringify(pk.weights.map((w) => [w.key, w.weight])) === '[["kuis",50],["esai",30],["praktik",20]]', JSON.stringify(pk))
    check('bobot 0 atau bukan angka dibuang; kunci tak dikenal tetap ditampilkan setelah yang dikenal; kunci bermarkup (label SVG) dibuang',
      JSON.stringify(C.parseCriteria(fxCrit({ policy: { passMark: 70, weights: { zeta: 10, kuis: 60, esai: 0, praktik: 'x', '<img src=x onerror=alert(1)>': 5 } } }))?.weights.map((w) => [w.label, w.weight])) === '[["Kuis",60],["Zeta",10]]' &&
      !C.dialSvg(50, 60, [{ key: 'k', label: '<script>x</script>', weight: 10 }]).includes('<script>'))
    check('penerbit "nama (catatan)" dipisah; tanpa kurung atau null tidak dikarang',
      JSON.stringify(C.splitPublisher('Yayasan X (institusi demo, fiktif)')) === '{"name":"Yayasan X","note":"institusi demo, fiktif"}' &&
      JSON.stringify(C.splitPublisher('PT Maju')) === '{"name":"PT Maju","note":null}' && JSON.stringify(C.splitPublisher(null)) === '{"name":null,"note":null}' &&
      C.splitPublisher('A (b) (c)').name === 'A (b)')
    check('kalimat batas klaim = kalimat terakhir narasi yang tertanda tangan, apa adanya (tanpa [rubrik …]); tanpa "bukan" -> kalimat umum',
      C.limitLine(NARR) === LIMIT153 && /bukan ijazah/.test(C.limitLine('Nilai akhir >= 60.')) && /bukan ijazah/.test(C.limitLine(null)) && C.limitLine('Lulus. ' + 'bukan '.repeat(60)) !== 'Lulus. ' + 'bukan '.repeat(60))
    check('status dari statusOf: tidak ada, dicabut, kedaluwarsa, penerbit ditarik, berlaku — urutan sama dengan daftar kredensial',
      C.statusVerdict(false, false, false, false) === 'TIDAK DIKENAL' && C.statusVerdict(true, true, true, true) === 'DICABUT' && C.statusVerdict(true, false, true, true) === 'KEDALUWARSA' &&
      C.statusVerdict(true, false, false, true) === 'PENERBIT DITARIK' && C.statusVerdict(true, false, false, false) === 'BERLAKU')

    // data lembar
    const readOn = '2026-10-05T14:00:00Z'
    const cert = C.buildCertificate({ hash: H153, cred: pc!, criteria: pk, status: { verdict: 'BERLAKU', readOn }, appHost: APP, testnet: true })
    check('lembar B153 -> penerbit + catatan, nilai 87 dari batas 60 = lulus, tiga komponen, 365 hari, bukti dan limit dari dokumen',
      cert.publisher === 'Yayasan Literasi Digital Nusantara' && cert.publisherNote === 'institusi demo, fiktif' && cert.score === 87 && cert.passMark === 60 && cert.passed &&
      cert.components.length === 3 && cert.validDays === 365 && cert.proof === 'DataIntegrityProof · eddsa-rdfc-2022' && cert.limit === LIMIT153, JSON.stringify([cert.publisher, cert.passed, cert.validDays]))
    check('QR/verifier: tautan = host aplikasi + ?q=<hash>#/verify (sama bentuknya dengan verifyLink), singkatan menyingkat hash',
      cert.verifyUrl === `${APP}/?q=${H153}#/verify` && cert.verifyUrlShort === `${APP.replace('https://', '')}/?q=${H153.slice(0, 10)}…#/verify`, cert.verifyUrlShort)
    check('kaki lembar: penerbit demo di jaringan uji -> "Penerbit demo (fiktif) · jaringan uji · bukan ijazah"; penerbit nyata di mainnet -> hanya "bukan ijazah"',
      cert.demo === 'Penerbit demo (fiktif) · jaringan uji · bukan ijazah' &&
      C.buildCertificate({ hash: H153, cred: pc!, criteria: C.parseCriteria(fxCrit({ issuer: { name: 'PT Maju' } })), status: cert.status, appHost: APP, testnet: false }).demo === 'bukan ijazah')
    const noCrit = C.buildCertificate({ hash: H153, cred: pc!, criteria: null, status: cert.status, appHost: APP, testnet: true })
    check('tanpa dokumen kriteria -> tanpa penerbit, tanpa bobot, tanpa batas lulus, dan TIDAK ditandai lulus (tidak dikarang)',
      noCrit.publisher === null && noCrit.components.length === 0 && noCrit.passMark === null && noCrit.passed === false && noCrit.score === 87)
    const noteB = C.statusNoteFor({ verdict: 'BERLAKU', readOn }), noteR = C.statusNoteFor({ verdict: 'DICABUT', readOn }), noteU = C.statusNoteFor({ verdict: 'BELUM TERBACA', readOn })
    check('catatan status: berlaku TIDAK ditulis sebagai klaim (hanya "dibaca ... pada <tanggal>"); dicabut menyebut statusnya; gagal baca dinyatakan gagal',
      noteB === 'Status dibaca dari chain pada 5 Okt 2026; pindai QR untuk status terkini.' && !/BERLAKU/.test(noteB) && noteR === 'Status dibaca dari chain pada 5 Okt 2026 (DICABUT); pindai QR untuk status terkini.' &&
      /belum terbaca/.test(noteU) && !/pada/.test(noteU), `${noteB} | ${noteR} | ${noteU}`)
    check('tanggal WIB: 09.41 UTC = 16.41 WIB di hari yang sama; 20.00 UTC tanggal 31 = 1 Januari WIB',
      C.idDate('2026-10-05T09:41:01Z') === '5 Oktober 2026' && C.idTime('2026-10-05T09:41:01Z') === '16.41 WIB' && C.idDate('2026-12-31T20:00:00Z') === '1 Januari 2027')
    check('alamat dikelompokkan 4 karakter (5 x 2), ringkasan hash/alamat memakai elipsis',
      C.addressGroups(L153) === '12f6 F95E 5b04 1ea9 Af2f 1e0F ed55 066a 775a 11DF' && C.mid(L153, 6, 4) === '0x12f6…11DF')

    // nama penerima
    check('cleanName: karakter kontrol dibuang, spasi dirapatkan, paling banyak 60, bukan teks -> kosong; HTML tidak dieksekusi tetapi tetap teks',
      C.cleanName('  a\u0000  b\n\tc ') === 'a b c' && C.cleanName('Budi\nSantoso\r\n') === 'Budi Santoso' && C.cleanName('x'.repeat(80)).length === 60 && C.cleanName(null) === '' && C.cleanName(undefined) === '' && C.cleanName(42) === '42' &&
      C.cleanName('<img src=x onerror=alert(1)>') === '<img src=x onerror=alert(1)>')
    check('mode "nama" dengan nama kosong atau hanya spasi jatuh ke alamat — baris utama tidak pernah kosong',
      C.effectiveMode({ mode: 'nama', name: '   ' }) === 'alamat' && C.effectiveMode({ mode: 'nama', name: 'Nadia' }) === 'nama' && C.effectiveMode({ mode: 'alamat', name: 'Nadia' }) === 'alamat')
    {
      const mem = new Map<string, string>()
      const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
      C.saveRecipient(L153, { mode: 'nama', name: 'Nadia Rahmawati' }, store)
      const other = '0x' + '34'.repeat(20)
      check('pilihan penerima disimpan per alamat (huruf besar/kecil sama), tidak bocor ke alamat lain, dan bisa dibaca kembali',
        JSON.stringify(C.loadRecipient(L153.toLowerCase(), store)) === '{"mode":"nama","name":"Nadia Rahmawati"}' && JSON.stringify(C.loadRecipient(other, store)) === '{"mode":"alamat","name":""}' && mem.size === 1)
      mem.set(`lencana.sertifikat.penerima:${other}`, '{rusak')
      const bad = { getItem: () => { throw new Error('diblokir') }, setItem: () => { throw new Error('diblokir') } }
      check('penyimpanan rusak, diblokir, atau tidak ada -> pilihan bawaan (alamat), tidak melempar galat',
        JSON.stringify(C.loadRecipient(other, store)) === '{"mode":"alamat","name":""}' && JSON.stringify(C.loadRecipient(L153, bad)) === '{"mode":"alamat","name":""}' &&
        (() => { try { C.saveRecipient(L153, { mode: 'nama', name: 'x' }, bad); C.saveRecipient(L153, { mode: 'nama', name: 'x' }, null); return true } catch { return false } })())
    }

    // latar cetak (B167): gelap bawaan; terang hanya bila dipilih, disimpan per alamat, tahan penyimpanan rusak
    // Lencana-B167 status=SELESAI 2026-10-05 — latar cetak sertifikat (gelap bawaan, terang hemat tinta) dipilih di dialog cetak, disimpan per alamat, hanya berlaku di media print. Buktikan ulang: cd web && npm run probe (grup B165) dan uji peramban T90. JANGAN dibalik/diulang tanpa membuka kembali baris B167 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
    {
      const mem = new Map<string, string>()
      const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
      const other = '0x' + '56'.repeat(20)
      check('latar cetak: bawaan gelap; "terang" disimpan per alamat (huruf besar/kecil sama) dan tidak bocor ke alamat lain',
        C.loadPaper(L153, store) === 'gelap' && (C.savePaper(L153, 'terang', store), C.loadPaper(L153.toLowerCase(), store) === 'terang') && C.loadPaper(other, store) === 'gelap' && mem.size === 1)
      C.savePaper(L153, 'gelap', store)
      mem.set(`lencana.sertifikat.latar:${other}`, 'ungu')
      const bad = { getItem: () => { throw new Error('diblokir') }, setItem: () => { throw new Error('diblokir') } }
      check('latar cetak: kembali ke gelap bila dipilih lagi, nilai asing di penyimpanan, penyimpanan diblokir, atau tidak ada — tanpa melempar galat',
        C.loadPaper(L153, store) === 'gelap' && C.loadPaper(other, store) === 'gelap' && C.loadPaper(L153, bad) === 'gelap' && C.loadPaper(L153, null) === 'gelap' &&
        (() => { try { C.savePaper(L153, 'terang', bad); C.savePaper(L153, 'terang', null); return true } catch { return false } })())
    }

    // QR, kristal, cincin
    const qr = Q.qrPath(cert.verifyUrl)
    const grid = Array.from({ length: qr.modules }, () => new Array<boolean>(qr.modules).fill(false))
    for (const m of qr.path.matchAll(/M(\d+) (\d+)h(\d+)v1h-\d+z/g)) for (let i = 0; i < Number(m[3]); i++) grid[Number(m[2])]![Number(m[1]) + i] = true
    const finder = (r0: number, c0: number) => { for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) { const edge = r === 0 || r === 6 || c === 0 || c === 6, core = r >= 2 && r <= 4 && c >= 2 && c <= 4; if (grid[r0 + r]![c0 + c] !== (edge || core)) return false } return true }
    const n = qr.modules
    check('QR tautan verifier B153: 45 modul (versi 7, koreksi M) dengan tiga pola pencari di sudut kiri-atas, kanan-atas, kiri-bawah dan nol modul gelap di luar kisi',
      n === 45 && finder(0, 0) && finder(0, n - 7) && finder(n - 7, 0) && !qr.path.includes('NaN') && JSON.stringify(Q.qrPath(cert.verifyUrl)) === JSON.stringify(qr), `modul=${n}`)
    check('QR berbeda untuk hash berbeda dan sama untuk hash sama (deterministik)',
      Q.qrPath(`${APP}/?q=0x${'11'.repeat(32)}#/verify`).path !== qr.path)
    const bytes = C.hashBytes(H153)
    const art = C.hashArt(bytes)
    check('jejak hash: 32 byte dari hash, byteAt melingkar (tanpa indeks negatif), PRNG deterministik per bibit dan beda antar bibit',
      bytes.length === 32 && bytes[0] === 0xb9 && art.byteAt(32) === bytes[0] && art.byteAt(-1) === bytes[31] && art.rng(0)() === art.rng(0)() && art.rng(0)() !== art.rng(16)())
    const fa = C.facets(bytes), fb = C.facets(C.hashBytes('0x' + '5a'.repeat(32)))
    const flat = (f: ReturnType<typeof C.facets>) => [...f.tr, ...f.bl, ...f.front, ...f.g.flat()].join('')
    check('kristal dari byte hash: deterministik (hash sama -> gambar sama), kredensial lain -> kristal lain, ada ratusan facet dan tanpa NaN',
      flat(fa) === flat(C.facets(bytes)) && flat(fa) !== flat(fb) && fa.tr.length > 100 && fa.bl.length > 10 && !flat(fa).includes('NaN') && !flat(fa).includes('undefined'), `tr=${fa.tr.length} bl=${fa.bl.length} front=${fa.front.length}`)
    const KEEPZ = [[52, 104, 660, 292], [52, 286, 696, 446], [52, 440, 690, 512]]
    const centres = [...fa.tr, ...fa.bl, ...fa.front].map((el) => { const pts = /points="([^"]+)"/.exec(el)![1]!.split(' ').map((p) => p.split(',').map(Number)); return [pts.reduce((a, p) => a + p[0]!, 0) / pts.length, pts.reduce((a, p) => a + p[1]!, 0) / pts.length] })
    check('facet tidak pernah duduk di belakang judul, penerima (termasuk nama terpanjang), dan nama kelas — teks kecil tidak di atas kristal',
      centres.every(([x, y]) => !KEEPZ.some((r) => x! > r[0]! && x! < r[2]! && y! > r[1]! && y! < r[3]!)), `${centres.length} facet diperiksa`)
    const dial = C.dialSvg(87, 60, cert.components)
    const lens = [...dial.matchAll(/class="s3-cf"[^>]*--len:([\d.]+)px/g)].map((m) => Number(m[1]))
    check('cincin: nilai 87 dan batas lulus 60 tergambar, tiga komponen berlabel BOBOT (bukan nilai) dan panjang busurnya menurun mengikuti bobot 50 > 30 > 20',
      dial.includes('class="s3-arc"') && dial.includes('batas 60') && dial.includes('Kuis 50%') && dial.includes('Esai 30%') && dial.includes('Praktik 20%') && !/Kuis 75|Esai 98|Praktik 100/.test(dial) &&
      lens.length === 3 && lens[0]! > lens[1]! && lens[1]! > lens[2]! && !dial.includes('NaN'), JSON.stringify(lens))
    const dialNone = C.dialSvg(null, null, [])
    check('cincin tanpa nilai dan tanpa batas lulus: busur nilai, takik, dan label batas TIDAK digambar (tidak dikarang)',
      !dialNone.includes('class="s3-arc"') && !dialNone.includes('class="s3-notch"') && !dialNone.includes('class="s3-tick"') && !dialNone.includes('batas') && !dialNone.includes('NaN'))

    // jalur data terhadap chain 97 publik
    const epPub = ep.chainId === 97 && ep.resolver.toLowerCase() === defaultEndpoint().resolver.toLowerCase()
    if (!epPub) {
      skipped.push('B165 jalur data terhadap B153 (hanya ada di deployment publik chain 97)')
    } else {
      const real = await CR.listMyCredentials(L153)
      const row = real.ok ? real.rows.find((r) => r.hash.toLowerCase() === H153) : undefined
      check('daftar kredensial peserta B153 membaca chain + dokumen publik: ada B153 dengan judul, nilai 87, status terbaca, dan artefak di >= 2 lapis',
        real.ok && real.total >= 1 && !!row && row.doc.state === 'ok' && row.doc.cred.title.startsWith('Kelas Uji') && row.doc.cred.score === 87 && row.status.verdict !== 'BELUM TERBACA' &&
        row.layers.filter((l) => l.tokenId !== null).length >= 2, real.ok ? `${real.total} kredensial; status ${row?.status.verdict}` : real.why)
      check('alamat tanpa kredensial -> daftar kosong yang SAH (ok, nol baris), bukan galat; alamat tidak sah -> galat',
        await (async () => { const e = await CR.listMyCredentials('0x' + '77'.repeat(20)); return e.ok && e.rows.length === 0 && e.total === 0 })() && (await CR.listMyCredentials('bukan')).ok === false)
      const lc = await CR.loadCertificate(H153, L153)
      check('lembar B153 dari chain + tepi: dokumen, kriteria, status, dan artefak terbaca; penerbit, batas lulus 60, tiga bobot, lulus, tautan verifier',
        lc.ok && lc.cert.learner === L153 && lc.cert.publisher === 'Yayasan Literasi Digital Nusantara' && lc.cert.passMark === 60 && lc.cert.components.length === 3 && lc.cert.passed &&
        lc.cert.limit === LIMIT153 && lc.cert.verifyUrl === `${APP}/?q=${H153}#/verify` && lc.cert.status.verdict !== 'BELUM TERBACA' && lc.layers.length === 3, lc.ok ? lc.cert.status.verdict : `${lc.kind}: ${lc.why}`)
      const stranger = await CR.loadCertificate(H153, '0x' + '88'.repeat(20))
      check('kredensial orang lain -> TIDAK ada lembar (not-mine) — siapa pun tidak bisa mencetak atas nama peserta lain',
        !stranger.ok && stranger.kind === 'not-mine', stranger.ok ? 'lembar dibuat!' : stranger.kind)
      const wrongHash = await CR.loadCertificate('0x' + '11'.repeat(32), L153)
      check('hash yang tidak ada di daftar akun -> not-mine; hash bukan 0x+64 heksadesimal atau alamat tidak sah -> invalid',
        !wrongHash.ok && wrongHash.kind === 'not-mine' && (await CR.loadCertificate('0xabc', L153) as { kind?: string }).kind === 'invalid' && (await CR.loadCertificate(H153, 'x') as { kind?: string }).kind === 'invalid')

      // dokumen tepi dipalsukan di lapisan fetch (hanya URL tepi; RPC chain tetap sungguhan)
      const realFetch = globalThis.fetch
      type Reply = { status: number, body?: unknown } | 'jaringan-putus'
      const edge = (routes: Record<string, Reply>) => {
        globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
          const url = String(typeof input === 'object' && 'url' in input ? input.url : input)
          if (!url.startsWith(EDGE)) return realFetch(input, init)
          const rep = routes[url.slice(EDGE.length)] ?? { status: 404 }
          if (rep === 'jaringan-putus') throw new TypeError('fetch failed')
          return new Response(rep.body === undefined ? null : JSON.stringify(rep.body), { status: rep.status, headers: { 'content-type': 'application/json' } })
        }) as typeof fetch
      }
      try {
        const CRED = `/credentials/${H153}`, CRIT = '/criteria/uji-bayar-2026'
        edge({ [CRED]: { status: 404 } })
        const m404 = await CR.loadCertificate(H153, L153)
        edge({ [CRED]: { status: 500 } })
        const m500 = await CR.loadCertificate(H153, L153)
        edge({ [CRED]: 'jaringan-putus' })
        const mNet = await CR.loadCertificate(H153, L153)
        check('dokumen tidak tersaji (404) -> no-document dengan alasan yang menyebut kredensial tetap sah; 500 dan jaringan putus -> failed — tiga keadaan berbeda, tidak ada lembar karangan',
          !m404.ok && m404.kind === 'no-document' && /tetap sah di chain/.test(m404.why) && !m500.ok && m500.kind === 'failed' && !mNet.ok && mNet.kind === 'failed', JSON.stringify([m404.ok || m404.kind, m500.ok || m500.kind, mNet.ok || mNet.kind]))
        edge({ [CRED]: { status: 200, body: fxDoc({}, `${EDGE}/learners/${'0x' + '99'.repeat(20)}`) } })
        const swapped = await CR.loadCertificate(H153, L153)
        check('hash milik akun di chain tetapi dokumen menyebut alamat peserta lain -> not-mine (dicek dua arah)', !swapped.ok && swapped.kind === 'not-mine' && /tidak sama/.test(swapped.why), swapped.ok ? 'lembar dibuat!' : swapped.kind)
        edge({ [CRED]: { status: 200, body: fxDoc() }, [CRIT]: { status: 404 } })
        const noC = await CR.loadCertificate(H153, L153)
        check('dokumen ada tetapi kriteria tidak tersaji -> lembar tetap dibuat, jujur: tanpa penerbit, tanpa bobot, tidak ditandai lulus',
          noC.ok && noC.cert.publisher === null && noC.cert.components.length === 0 && noC.cert.passed === false && noC.cert.score === 87, noC.ok ? 'ok' : noC.why)
        edge({ [CRED]: { status: 404 } })
        const list404 = await CR.listMyCredentials(L153)
        edge({ [CRED]: { status: 503 } })
        const list503 = await CR.listMyCredentials(L153)
        const st = (l: Awaited<ReturnType<typeof CR.listMyCredentials>>) => l.ok ? l.rows.find((r) => r.hash.toLowerCase() === H153)?.doc.state : l.why
        check('daftar kredensial: dokumen 404 -> baris "missing"; 503 -> baris "failed"; kredensial tetap tampil dengan status chain-nya', st(list404) === 'missing' && st(list503) === 'failed', `${st(list404)} / ${st(list503)}`)
      } finally { globalThis.fetch = realFetch }
    }
  }

  // --- 11. bukti NFT dan kit LinkedIn (B168) ------------------------------------------
  // Lencana-B168 status=SELESAI 2026-10-06 — probe mengadili bukti on-chain artefak (pemilik, locked, ERC-5192 dari chain 97 publik), tautan/OG/kit LinkedIn (murni, tanpa klaim terlarang), kartu 1200x630, dan fungsi Vercel yang dijalankan lokal terhadap dokumen tepi sungguhan; bundel api/ harus segar. Buktikan ulang: cd web && npm run probe (grup B168). JANGAN dibalik/diulang tanpa membuka kembali baris B168 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  {
    console.log('\n--bukti NFT dan kit LinkedIn (B168)--')
    const C = await import('../src/certificate')
    const S = await import('../src/share')
    const CR = await import('../src/credentials')
    const { APP_HOST: APP } = await import('../src/hosts')
    const H153 = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31' as const
    const L153 = '0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF' as const
    const EDGE = (await import('../src/hosts')).CREDENTIAL_HOST
    const doc = {
      id: `${EDGE}/credentials/${H153}`, type: ['VerifiableCredential', 'OpenBadgeCredential'], issuer: { name: 'Lencana Demo Agent' },
      validFrom: '2026-10-05T09:41:01Z', validUntil: '2027-10-05T09:41:01Z', name: 'Kelas Uji — Membayar dengan Tanda Tangan',
      credentialSubject: { id: `${EDGE}/learners/${L153}`, achievement: { id: `${EDGE}/achievements/uji-bayar-2026`, name: 'x', criteria: { narrative: 'Nilai akhir >= 60 dari 100. Kelas uji: hanya menyatakan peserta menyelesaikan kelas pendek ini, bukan keahlian Web3.' } }, result: [{ value: '87' }] },
      proof: { type: 'DataIntegrityProof', cryptosuite: 'eddsa-rdfc-2022' },
    }
    const crit = { issuer: { name: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)' }, policy: { passMark: 60, weights: { kuis: 50, esai: 30, praktik: 20 } } }
    const mk = (over: Record<string, unknown> = {}, c: unknown = crit, testnet = true) => {
      const cred = C.parseCredentialDoc({ ...doc, ...over })!
      return C.buildCertificate({ hash: H153, cred, criteria: C.parseCriteria(c), status: { verdict: 'BELUM TERBACA', readOn: '2026-10-06T00:00:00Z' }, appHost: APP, testnet })
    }
    const cert = mk()
    const real = mk({}, { issuer: { name: 'PT Maju Belajar' }, policy: { passMark: 60, weights: { kuis: 100 } } }, false)

    check('tautan bagikan: /s/<hash> dan /s/<hash>/card.png dari host aplikasi (garis miring akhir dibuang); penjelajah testnet vs mainnet; token ?a=<id>',
      S.shareUrl(APP + '/', H153) === `${APP}/s/${H153}` && S.cardUrl(APP, H153) === `${APP}/s/${H153}/card.png` && S.explorerAddressUrl(L153) === `https://testnet.bscscan.com/address/${L153}` &&
      S.explorerAddressUrl(L153, false) === `https://bscscan.com/address/${L153}` && S.explorerTokenUrl('0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa', '123') === 'https://testnet.bscscan.com/token/0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa?a=123')
    const cmds = S.castCommands({ contract: '0xc338AF7F20F12E71eD858F0eeD66e2A5632d62aa', tokenId: '84121403', hash: H153 }, 'https://rpc.example')
    check('perintah cast: ownerOf, locked, supportsInterface(0xb45a3c0e), tokenOfCredential — masing-masing dengan kontrak, token/hash, dan RPC',
      cmds.length === 4 && cmds.every((c) => c.startsWith('cast call 0xc338AF7F') && c.endsWith('--rpc-url https://rpc.example')) && /ownerOf\(uint256\)\(address\)" 84121403/.test(cmds[0]!) && /locked\(uint256\)\(bool\)" 84121403/.test(cmds[1]!) &&
      /0xb45a3c0e/.test(cmds[2]!) && cmds[3]!.includes(H153))
    const og = S.ogMeta(cert, APP)
    check('OG B153: judul "Sertifikat: …", deskripsi memuat nilai 87/100, "testnet", dan label demo; gambar = kartu per sertifikat; TANPA kata status keberlakuan',
      og.title === 'Sertifikat: Kelas Uji — Membayar dengan Tanda Tangan' && /Nilai 87\/100/.test(og.description) && /testnet/.test(og.description) && /Penerbit demo \(fiktif\)/.test(og.description) &&
      og.image === `${APP}/s/${H153}/card.png` && og.url === `${APP}/s/${H153}` && !/berlaku|dicabut|kedaluwarsa|valid/i.test(og.description) && og.description.length <= 300 && og.title.length <= 150, og.description)
    const ogReal = S.ogMeta(real, APP)
    check('OG penerbit nyata di mainnet: tanpa "Penerbit demo" dan tanpa "testnet"', !/Penerbit demo|testnet/.test(ogReal.description) && /bukan ijazah/.test(ogReal.description), ogReal.description)
    const evil = S.ogMeta({ ...cert, title: '"><script>alert(1)</script>&' }, APP)
    const html = S.shareHtml(evil, `${APP}/?q=${H153}#/verify</script><script>x`)
    check('halaman bagikan: semua nilai di-escape (judul bermarkup tidak menjadi tag), pengalihan JS tidak bisa menutup <script>, tag og:image lengkap dengan ukuran 1200 × 630',
      !/<script>alert/.test(html) && html.includes('&lt;script&gt;alert(1)&lt;/script&gt;&amp;') && !/location\.replace\([^)]*<\/script>/.test(html) && /og:image:width" content="1200"/.test(html) && /og:image:height" content="630"/.test(html) &&
      /twitter:card" content="summary_large_image"/.test(html) && /og:title/.test(html) && /og:description/.test(html) && /og:url/.test(html) && /noindex/.test(html))
    const add = new URL(S.linkedinAddUrl(cert, S.shareUrl(APP, H153)))
    const g = (k: string) => add.searchParams.get(k)
    check('tambah-ke-profil LinkedIn: parameter resmi terisi dari sertifikat (nama diberi "(demo)", penerbit + catatan, bulan/tahun WIB, tautan pratinjau, ID = hash); tanpa organizationId',
      add.origin === 'https://www.linkedin.com' && add.pathname === '/profile/add' && g('startTask') === 'CERTIFICATION_NAME' && g('name') === 'Kelas Uji — Membayar dengan Tanda Tangan (demo)' &&
      g('organizationName') === 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)' && g('issueYear') === '2026' && g('issueMonth') === '10' && g('expirationYear') === '2027' && g('expirationMonth') === '10' &&
      g('certUrl') === `${APP}/s/${H153}` && g('certId') === H153 && !add.searchParams.has('organizationId'))
    const addReal = new URL(S.linkedinAddUrl(real, 'https://x.example/s'))
    const addNone = new URL(S.linkedinAddUrl({ ...cert, publisher: null, publisherNote: null, title: 'T'.repeat(150) }, 'https://x.example/s'))
    check('tambah-ke-profil: penerbit nyata tanpa "(demo)"; penerbit tidak diketahui -> "Lencana"; nama dipotong 100 karakter; spasi %20 (bukan +)',
      addReal.searchParams.get('name') === real.title && addReal.searchParams.get('organizationName') === 'PT Maju Belajar' && addNone.searchParams.get('organizationName') === 'Lencana' && (addNone.searchParams.get('name') ?? '').length === 100 && !/\+/.test(S.linkedinAddUrl(cert, 'https://x.example/s').replace(/%2B/g, '')))
    check('bagikan sebagai post: URL komposer memuat tautan pratinjau ter-encode', S.linkedinShareUrl(`${APP}/s/${H153}`) === `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(`${APP}/s/${H153}`)}`)
    const FORBIDDEN = [/ijazah on-chain/i, /anti-?pemalsuan/i, /terverifikasi/i, /\bresmi\b/i, /diakui/i, /siap produksi/i, /tidak bisa dipalsukan/i, /1EdTech/i, /official/i, /accredited/i, /tamper-?proof/i, /verified (person|learner|graduate)/i]
    const posts = (['id', 'en'] as const).flatMap((lang) => [true, false].map((nft) => ({ lang, nft, text: S.linkedinPost(cert, { lang, nft, link: S.shareUrl(APP, H153) }) })))
    check('draf post: judul, tautan, tagar, dan nilai ada; kalimat NFT HANYA bila artefaknya ada; catatan demo/jaringan uji/bukan ijazah ada; tanpa satu pun frasa terlarang; < 3.000 karakter',
      posts.every((p) => p.text.includes(cert.title) && p.text.includes(S.shareUrl(APP, H153)) && p.text.includes('#BNBChain') && /87\/100/.test(p.text) && p.text.length < 3000 && FORBIDDEN.every((f) => !f.test(p.text)) &&
        (p.nft ? /NFT/.test(p.text) : !/NFT/.test(p.text)) && (p.lang === 'id' ? /bukan ijazah/.test(p.text) && /jaringan uji/.test(p.text) : /not a diploma/.test(p.text) && /test network/.test(p.text))), posts.map((p) => `${p.lang}/${p.nft}:${p.text.length}`).join(' '))
    const postReal = S.linkedinPost(real, { lang: 'id', nft: false, link: 'https://x.example/s' })
    check('draf post penerbit nyata di mainnet: tidak menyebut demo, fiktif, atau jaringan uji (tidak ada yang perlu disangkal), tetap tanpa NFT bila tidak ada', !/demo|fiktif|jaringan uji|NFT/.test(postReal) && FORBIDDEN.every((f) => !f.test(postReal)), postReal.slice(0, 120))
    check('pemecah baris kartu: tiap baris ≤ batas, kata utuh, ellipsis bila terpotong, kosong -> tanpa baris',
      JSON.stringify(S.wrapLines('Kelas Uji Membayar dengan Tanda Tangan', 20, 3)) === '["Kelas Uji Membayar","dengan Tanda Tangan"]' && S.wrapLines('a b c d e f g h i j k l m n o p q r s t', 8, 2).length === 2 &&
      S.wrapLines('a b c d e f g h i j k l m n o p q r s t', 8, 2)[1]!.endsWith('…') && S.wrapLines('   ', 10, 2).length === 0 && S.wrapLines('x'.repeat(60), 10, 1)[0]!.length === 10)
    const svg = S.socialCardSvg(cert)
    const svgEvil = S.socialCardSvg({ ...cert, title: '<b onload=alert(1)>&"x"', publisher: '</text><script>' })
    const svgNone = S.socialCardSvg({ ...cert, score: null, passed: false })
    check('kartu 1200 × 630: SVG utuh (xmlns, ukuran), memuat judul, nilai 87 dan LULUS, kristal dari hash, tanpa NaN/undefined; teks bermarkup di-escape; tanpa nilai -> tanpa LULUS; < 100 KB',
      svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"') && svg.includes('>87<') && svg.includes('LULUS') && svg.includes('Kelas Uji') && !/NaN|undefined/.test(svg) && svg.length < 100_000 && /<polygon/.test(svg) &&
      !/<b onload|<script>|<\/text><script/.test(svgEvil) && svgEvil.includes('&lt;b onload=alert(1)&gt;') && !svgNone.includes('LULUS') && svg !== S.socialCardSvg({ ...cert, hash: ('0x' + '5a'.repeat(32)) as `0x${string}` }), `${svg.length} byte`)

    // bundel fungsi Vercel harus segar dan fungsinya jalan terhadap dokumen tepi sungguhan
    // Impor lewat URL (bukan literal) supaya `tsc` tidak menuntut berkas tipe untuk .mjs di luar paket ini.
    const { bundle } = await import(new URL('./build-api.mjs', import.meta.url).href) as { bundle: () => Promise<string> }
    const bundlePath = new URL('../../api/_lib/lencana-share.mjs', import.meta.url)
    const have = await readFile(bundlePath, 'utf8').catch(() => '')
    check('bundel api/_lib/lencana-share.mjs SEGAR terhadap web/src (dibangun ulang di memori = isi berkas); bukan hasil sunting tangan', have.length > 10_000 && have === await bundle(), `${have.length} byte`)
    type Handler = (q: unknown, r: unknown) => Promise<void>
    const apiOk = await import(new URL('../../api/share.mjs', import.meta.url).href).then(async (s: { default: Handler }) => ({ share: s.default, card: ((await import(new URL('../../api/card.mjs', import.meta.url).href)) as { default: Handler }).default }), () => null)
    const epPub = ep.chainId === 97 && ep.resolver.toLowerCase() === defaultEndpoint().resolver.toLowerCase()
    if (!apiOk) skipped.push('B168 fungsi Vercel (api/node_modules belum dipasang: cd api && npm install)')
    if (!epPub) skipped.push('B168 bukti NFT dan fungsi Vercel terhadap B153 (hanya ada di deployment publik chain 97)')
    if (apiOk && epPub) {
      const call = async (fn: (q: unknown, r: unknown) => Promise<void>, path: string, method = 'GET') => {
        const headers: Record<string, string> = {}; let status = 200; const chunks: Buffer[] = []
        const res = { set statusCode (v: number) { status = v }, get statusCode () { return status }, setHeader (k: string, v: string) { headers[k.toLowerCase()] = v }, end (b?: Uint8Array | string) { if (b !== undefined) chunks.push(Buffer.from(b)) } }
        await fn({ url: path, method }, res)
        return { status, headers, body: Buffer.concat(chunks) }
      }
      const rs = await call(apiOk.share, `/api/share?hash=${H153}`)
      const body = rs.body.toString('utf8')
      check('fungsi share (lokal, dokumen tepi sungguhan): 200 HTML, tag OG sama dengan ogMeta, cache publik, pengalihan ke verifier; hash berhuruf besar tetap dikenali',
        rs.status === 200 && /text\/html/.test(rs.headers['content-type'] ?? '') && /s-maxage/.test(rs.headers['cache-control'] ?? '') && body.includes(`content="${S.ogMeta(cert, APP).title}"`) && body.includes(`og:image" content="${APP}/s/${H153}/card.png"`) &&
        body.includes(`${APP}/?q=${H153}#/verify`) && (await call(apiOk.share, `/api/share?hash=${H153.toUpperCase().replace('0X', '0x')}`)).status === 200, `${rs.status} ${rs.body.length} byte`)
      const rc = await call(apiOk.card, `/api/card?hash=${H153}`)
      const png = rc.body
      check('fungsi card (lokal): 200 image/png, tanda tangan PNG, 1200 × 630, > 50 KB, cache panjang',
        rc.status === 200 && rc.headers['content-type'] === 'image/png' && png.subarray(1, 4).toString() === 'PNG' && png.readUInt32BE(16) === 1200 && png.readUInt32BE(20) === 630 && png.length > 50_000 && /s-maxage=86400/.test(rc.headers['cache-control'] ?? ''), `${rc.status} ${png.length} byte`)
      const bad = [await call(apiOk.share, '/api/share?hash=abc'), await call(apiOk.share, `/api/share?hash=0x${'11'.repeat(32)}`), await call(apiOk.card, '/api/card'), await call(apiOk.card, `/api/card?hash=${encodeURIComponent('"><script>')}`), await call(apiOk.card, `/api/card?hash=0x${'22'.repeat(32)}`)]
      check('fungsi bagikan menolak dengan benar: hash rusak/kosong/bermarkup -> 400, hash yang tidak tersaji di tepi -> 404, tanpa gambar atau HTML karangan',
        JSON.stringify(bad.map((b) => b.status)) === '[400,404,400,400,404]' && bad.every((b) => /text\/plain/.test(b.headers['content-type'] ?? '')), JSON.stringify(bad.map((b) => b.status)))
      const head = await call(apiOk.share, `/api/share?hash=${H153}`, 'HEAD')
      check('HEAD tanpa badan', head.status === 200 && head.body.length === 0)
      const lc = await CR.loadCertificate(H153, L153)
      if (!lc.ok) check('B153 termuat untuk bukti NFT', false, lc.why)
      else {
        const pr = await CR.loadNftProof(lc.layers, L153)
        check('bukti NFT B153: dua lapis memegang token; di tiap lapis pemilik = alamat akun, locked = true, ERC-5192 = true, semua terbaca, tanpa lapis gagal',
          pr.held.length === 2 && pr.failed.length === 0 && pr.testnet && pr.held.every((l) => l.owner?.toLowerCase() === L153.toLowerCase() && l.ownerIsAccount === true && l.locked === true && l.erc5192 === true && l.readOk && l.tokenId === BigInt(H153).toString()), JSON.stringify(pr.held.map((l) => [l.address.slice(0, 8), l.ownerIsAccount, l.locked, l.erc5192])))
        const other = await CR.loadNftProof(lc.layers, '0x' + '99'.repeat(20))
        check('bukti NFT untuk akun LAIN: token tetap terkunci tetapi ownerIsAccount = false (bukan milik akun itu) — tidak dianggap terikat',
          other.held.length === 2 && other.held.every((l) => l.ownerIsAccount === false && l.locked === true && l.readOk))
        const broken = await CR.loadNftProof([{ address: '0x0000000000000000000000000000000000000001', tokenId: '5', readOk: true, enforcesCourseLevel: null }, { address: '0x0000000000000000000000000000000000000002', tokenId: null, readOk: false, enforcesCourseLevel: null }], L153)
        check('bukti NFT: pembacaan yang gagal tampil sebagai null/readOk=false (bukan "tidak terkunci" atau "bukan milikmu"); lapis yang gagal dicatat terpisah dari yang kosong',
          broken.held.length === 1 && broken.held[0]!.owner === null && broken.held[0]!.ownerIsAccount === null && broken.held[0]!.readOk === false && broken.failed.length === 1)
      }
    }
  }

  // --- 12. bukti kepemilikan artefak NFT (B170) ----------------------------------------
  // Lencana-B170 status=SELESAI 2026-10-06 — probe mengadili pernyataan kepemilikan: bentuk baku, pemulihan penandatangan, urutan putusan, kontrak karangan ditolak, dan bacaan chain 97 sungguhan (ownerOf/credentialOf/locked). Buktikan ulang: cd web && npx tsx scripts/probe.ts
  {
    console.log('\n--bukti kepemilikan artefak NFT (B170)--')
    const OW = await import('../src/ownership')
    const { privateKeyToAccount, generatePrivateKey } = await import('viem/accounts')
    const H153 = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31' as const
    const L153 = '0x12f6F95E5b041ea9Af2f1e0Fed55066a775a11DF' as const
    const LAYER_A = CERT_LAYERS_97[0]!
    const acct = privateKeyToAccount(generatePrivateKey())
    const other = privateKeyToAccount(generatePrivateKey())
    const NOW = Date.parse('2026-10-06T12:00:00Z')
    const fields = { wallet: acct.address, contract: LAYER_A, tokenId: String(BigInt(H153)), credential: H153, chainId: 97, issuedAt: '2026-10-06T10:20:30Z' } as const
    const st = OW.ownershipStatement(fields)
    const lines = st.split('\n')
    check('pernyataan baku: 9 baris, header + kalimat, alamat bercek, hash huruf kecil, waktu UTC tanpa milidetik',
      lines.length === 9 && lines[0] === OW.STATEMENT_HEADER && lines[2] === '' && lines[3] === `dompet: ${acct.address}` && lines[6] === `kredensial: ${H153}` && lines[8] === 'waktu: 2026-10-06T10:20:30Z' && OW.stampOf(Date.parse('2026-10-06T10:20:30.987Z')) === '2026-10-06T10:20:30Z', st)
    const pr = OW.parseStatement(st)
    check('parseStatement membaca ulang pernyataan baku menjadi bidang yang sama (pulang-pergi)', pr.ok && JSON.stringify(pr.fields) === JSON.stringify({ ...fields }), JSON.stringify(pr))
    const bad: Array<[string, string]> = [
      ['header lain', st.replace(OW.STATEMENT_HEADER, 'Pernyataan lain')],
      ['baris waktu hilang', lines.slice(0, 8).join('\n')],
      ['urutan baris tertukar', [...lines.slice(0, 4), lines[5]!, lines[4]!, ...lines.slice(6)].join('\n')],
      ['token bukan bilangan bulat', st.replace(/token: \d+/, 'token: 1e5')],
      ['hash pendek', st.replace(H153, '0x1234')],
      ['waktu bukan ISO', st.replace('2026-10-06T10:20:30Z', '6 Oktober 2026')],
      ['alamat huruf kecil (tulisan lain dari yang baku)', st.replace(acct.address, acct.address.toLowerCase())],
      ['baris tambahan di akhir', `${st}\ncatatan: dititipkan`],
      ['alamat bukan alamat', st.replace(acct.address, '0xZZ')],
    ]
    const badRes = bad.map(([n, t]) => [n, OW.parseStatement(t)] as const)
    check('parseStatement menolak 9 bentuk rusak/tidak baku (tidak ada yang lolos)', badRes.every(([, r]) => !r.ok), JSON.stringify(badRes.filter(([, r]) => r.ok).map(([n]) => n)))
    const sig = await acct.signMessage({ message: st })
    const blk = OW.ownershipBlock(st, sig)
    const pb = OW.parseBlock(blk)
    check('blok = pernyataan + baris tanda tangan; parseBlock memisahkannya persis (juga dengan CRLF dan spasi di ujung)',
      pb.ok && pb.statement === st && pb.signature === sig && (() => { const c = OW.parseBlock(blk.replace(/\n/g, '\r\n') + '  \r\n'); return c.ok && c.statement === st })(), JSON.stringify(pb).slice(0, 160))
    check('parseBlock menolak blok tanpa tanda tangan / tanda tangan terlalu pendek', !OW.parseBlock(st).ok && !OW.parseBlock(`${st}\n\ntanda tangan: 0x1234`).ok)

    type Over = { owner?: string, credential?: string, throwWith?: Error, chainId?: number }
    const mkReader = (over: Over = {}) => {
      const calls = { read: 0 }
      const reader: import('../src/ownership').OwnershipReader = {
        chainId: over.chainId ?? 97, rpcUrl: 'https://rpc.invalid', known: (c) => c.toLowerCase() === LAYER_A.toLowerCase(),
        async read () {
          calls.read++
          if (over.throwWith) throw over.throwWith
          return { owner: (over.owner ?? acct.address) as `0x${string}`, credential: (over.credential ?? H153) as `0x${string}`, locked: true }
        },
      }
      return { reader, calls }
    }
    const okR = mkReader()
    const valid = await OW.checkOwnership(blk, okR.reader, NOW)
    check('VALID: penandatangan = dompet yang dinyatakan = ownerOf di chain, token memang milik kredensial itu (usia 5970 detik)',
      valid.verdict === 'VALID' && valid.signer === acct.address && valid.owner === acct.address && valid.locked === true && valid.ageSeconds === 5970 && valid.future === false, JSON.stringify(valid))

    const readsAfterValid = okR.calls.read
    const tampered = await OW.checkOwnership(OW.ownershipBlock(st.replace(/token: \d+/, 'token: 5'), sig), okR.reader, NOW)
    check('teks diubah sesudah ditandatangani (token 5) → SIGNER_MISMATCH, bukan VALID', tampered.verdict === 'SIGNER_MISMATCH', JSON.stringify(tampered))
    const forged = await OW.checkOwnership(OW.ownershipBlock(st, await other.signMessage({ message: st })), okR.reader, NOW)
    check('tanda tangan dompet LAIN atas pernyataan yang menyebut dompet ini → SIGNER_MISMATCH', forged.verdict === 'SIGNER_MISMATCH' && forged.signer === other.address, JSON.stringify(forged))
    const junk = await OW.checkOwnership(OW.ownershipBlock(st, `0x${'11'.repeat(64)}1b`), okR.reader, NOW)
    check('tanda tangan sampah berbentuk benar tidak pernah VALID (BAD_SIGNATURE atau SIGNER_MISMATCH)', junk.verdict === 'BAD_SIGNATURE' || junk.verdict === 'SIGNER_MISMATCH', JSON.stringify(junk))
    check('urutan putusan: kegagalan sebelum pembacaan chain TIDAK menyentuh chain (pembacaan tetap 1 sesudah tiga tolakan)', okR.calls.read === readsAfterValid, `pembacaan: ${okR.calls.read}`)

    const oc = mkReader({ chainId: 56 })
    const ocRes = await OW.checkOwnership(blk, oc.reader, NOW)
    check('pernyataan rantai 97 diperiksa di pemeriksa rantai 56 → OTHER_CHAIN, tanpa membaca chain', ocRes.verdict === 'OTHER_CHAIN' && oc.calls.read === 0, JSON.stringify(ocRes))
    const stFake = OW.ownershipStatement({ ...fields, contract: '0x00000000000000000000000000000000DeaDBeef' })
    const uk = mkReader()
    const ukRes = await OW.checkOwnership(OW.ownershipBlock(stFake, await acct.signMessage({ message: stFake })), uk.reader, NOW)
    check('kontrak karangan yang "menjawab" sesuka hati → UNKNOWN_CONTRACT (tidak pernah VALID), tanpa membaca chain', ukRes.verdict === 'UNKNOWN_CONTRACT' && uk.calls.read === 0, JSON.stringify(ukRes))
    const rev = await OW.checkOwnership(blk, mkReader({ throwWith: new OW.OwnershipReadError(true, 'revert') }).reader, NOW)
    const net = await OW.checkOwnership(blk, mkReader({ throwWith: new OW.OwnershipReadError(false, 'fetch failed') }).reader, NOW)
    check('chain menjawab "tidak ada" → NO_TOKEN; jaringan mati → UNREADABLE (dua hal berbeda, bukan satu "gagal")', rev.verdict === 'NO_TOKEN' && net.verdict === 'UNREADABLE' && /fetch failed/.test(net.why), `${rev.verdict} / ${net.verdict}`)
    const hm = await OW.checkOwnership(blk, mkReader({ credential: '0x' + 'cd'.repeat(32) }).reader, NOW)
    check('token ada tetapi terikat ke kredensial lain → HASH_MISMATCH', hm.verdict === 'HASH_MISMATCH', JSON.stringify(hm))
    const no = await OW.checkOwnership(blk, mkReader({ owner: other.address }).reader, NOW)
    check('pemilik token di chain bukan penandatangan → NOT_OWNER dan pemilik sebenarnya dilaporkan', no.verdict === 'NOT_OWNER' && no.owner === other.address, JSON.stringify(no))
    const fut = await OW.checkOwnership(blk, okR.reader, Date.parse('2026-10-06T09:00:00Z'))
    check('waktu pernyataan 1 jam 20 menit di depan jam pemeriksa → tetap VALID menurut chain, tetapi future = true (peringatan)', fut.verdict === 'VALID' && fut.future === true && (fut.ageSeconds ?? 0) < 0, JSON.stringify(fut))
    const cast = OW.ownershipCast(pr.ok ? pr.fields : fields, st, sig, 'https://rpc.invalid')
    const q = /\$'((?:[^'\\]|\\.)*)'/.exec(cast[0]!)
    check('perintah cast: verify memakai pesan berkutip $\'…\' yang bila diuraikan = pernyataan persis; ownerOf + credentialOf ikut dicetak',
      cast.length === 3 && cast[0]!.startsWith(`cast wallet verify --address ${acct.address} `) && cast[0]!.endsWith(sig) && !!q && q[1]!.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\\\/g, '\\') === st && /ownerOf\(uint256\)\(address\)/.test(cast[1]!) && /credentialOf\(uint256\)\(bytes32\)/.test(cast[2]!), cast[0]!.slice(0, 120))

    const epPub = ep.chainId === 97 && ep.resolver.toLowerCase() === defaultEndpoint().resolver.toLowerCase()
    if (!epPub) skipped.push('B170 bacaan chain sungguhan (hanya ada di deployment publik chain 97)')
    else {
      const real = OW.chainReader()
      const sB153 = OW.ownershipStatement({ ...fields, wallet: other.address })
      const r1 = await OW.checkOwnership(OW.ownershipBlock(sB153, await other.signMessage({ message: sB153 })), real)
      check('chain 97 sungguhan: dompet acak mengaku memegang artefak B153 → NOT_OWNER; pemilik yang dilaporkan = akun B153 (ownerOf), locked = true, credentialOf cocok',
        r1.verdict === 'NOT_OWNER' && r1.owner?.toLowerCase() === L153.toLowerCase() && r1.locked === true, JSON.stringify(r1))
      const sBadHash = OW.ownershipStatement({ ...fields, wallet: other.address, credential: `0x${'ab'.repeat(32)}` })
      const r2 = await OW.checkOwnership(OW.ownershipBlock(sBadHash, await other.signMessage({ message: sBadHash })), real)
      check('chain 97 sungguhan: token B153 dengan kredensial yang salah → HASH_MISMATCH (credentialOf dibaca dari chain)', r2.verdict === 'HASH_MISMATCH', JSON.stringify(r2))
      const sNone = OW.ownershipStatement({ ...fields, wallet: other.address, tokenId: '12345' })
      const r3 = await OW.checkOwnership(OW.ownershipBlock(sNone, await other.signMessage({ message: sNone })), real)
      check('chain 97 sungguhan: token yang tidak pernah dicetak → NO_TOKEN (revert terbaca sebagai "tidak ada", bukan jaringan mati)', r3.verdict === 'NO_TOKEN', JSON.stringify(r3))
      const g = globalThis as unknown as { localStorage?: unknown }
      const had = g.localStorage
      g.localStorage = { getItem: () => JSON.stringify({ ...defaultEndpoint(), rpcUrl: 'http://127.0.0.1:9' }), setItem () {}, removeItem () {} }
      try {
        const dead = OW.chainReader()
        const r4 = await OW.checkOwnership(OW.ownershipBlock(sB153, await other.signMessage({ message: sB153 })), dead)
        check('RPC mati (127.0.0.1:9) → UNREADABLE, bukan NO_TOKEN dan bukan NOT_OWNER', r4.verdict === 'UNREADABLE', JSON.stringify(r4))
      } finally { if (had === undefined) delete g.localStorage; else g.localStorage = had }
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
