/**
 * `npm run check` — bukti bahwa backend ini melakukan apa yang klaimnya katakan.
 *
 * Pola yang sama dengan `web/scripts/probe.ts`: berkas yang sama dengan produksi, dijalankan di
 * Node, angka pemeriksaan dicetak dari yang benar-benar dijalankan. Alasannya juga sama —
 * `verify()` yang selalu mengembalikan sesuatu bisa "hijau" tanpa memeriksa apa pun.
 *
 * Yang membuat berkas ini bukan sekadar uji unit: ia memuat angka yang DIUKUR dari chain.
 * Check pertama mengikat turunan `credentialHash` di TypeScript ke hash yang benar-benar ada di
 * BSC testnet hasil `SeedDemo`. Kalau nanti ada yang mengubah `_vcHash()` di Solidity tanpa
 * mengubah sini (atau sebaliknya), berkas ini yang berteriak — bukan demonya.
 */

// [B85] SELESAI 2026-09-29 — perubahan jumlah pemeriksaan harus punya sebab yang dicetak, bukan diam-diam. Buktikan ulang: npm run check. JANGAN dibalik/diulang tanpa membuka kembali baris B85 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// [B68] SELESAI 2026-09-29 — front-end (builder mengizinkan penyuntingan 28 Sep) Buktikan ulang: lihat baris B68 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B68 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// [B50] SELESAI 2026-09-29 — kredensial yang TERSAJE di halaman kita sekarang tidak sama bentuknya dengan kredensial yang LOLOS validator. Untuk juri yang membuka "lihat dokumen", yang ia salin/ung Buktikan ulang: lihat baris B50 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B50 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// [B44] SELESAI 2026-09-29 — the artefact answers "which rubric" but not "who ran it", so "an agent graded this" is checkable only against our own logs Buktikan ulang: lihat baris B44 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B44 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { buildOpenBadgeCredential, credentialHashOf, sha256Hex } from '../src/credential.js'
import { IndexAllocator, LIST_BITS, REVOCATION, SUSPENSION, encodeList, decodeBit, statusListCredential } from '../src/statusList.js'
import { gunzipSync } from 'node:zlib'
import { createIssuerKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader, signDocument, verifyDocument, CRYPTOSUITE_NAME } from '../src/sign.js'
import { loadFileEnvReport } from '../src/env.js'

// Bagian 5 membaca chain, dan bagian itu DILEWATI tanpa gagal kalau env-nya tidak ada — hijau
// dengan angka kecil adalah cara paling mudah menyesatkan. Env berkas dibaca di sini supaya
// "72 pemeriksaan" berarti 72 pemeriksaan di mesin mana pun, sementara lingkungan proses tetap
// menang atas isi berkas (itu cara operator mengevaluasi hal lain).
await loadFileEnvReport('check')

let ran = 0
let failures = 0
function check (name, cond, detail = '') {
  ran += 1
  if (cond) console.log(`  ok    ${name}`)
  else { failures += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}
// Bagian 5 hanya jalan kalau ada chain untuk dibaca. Tanpa daftar ini, angka hijau bisa berarti
// "belum diuji" — kesalahan yang persis sama kita keluhkan di catatan riset orang lain.
const skipped = []

const BASE = 'https://lencana.example'
const NOW = 1_800_000_000            // 2027, tetap di dalam rentang demo
const YEAR = 365 * 24 * 3600

// --- 1. ikatan ke chain -------------------------------------------------------
// Learner + course ketiga dari SeedDemo.s.sol, dan hash yang DIBACA dari chain 97 pada 19 Sep.
const SEED_LEARNER = '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
const SEED_COURSE = 'web3-dasar-2026-b'
const SEED_HASH_ONCHAIN = '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa'
check(
  'credentialHash TypeScript == hash yang terbaca di chain',
  credentialHashOf(SEED_LEARNER, SEED_COURSE) === SEED_HASH_ONCHAIN,
  credentialHashOf(SEED_LEARNER, SEED_COURSE),
)

// --- 2. bentuk dokumen --------------------------------------------------------
const allocator = new IndexAllocator()
const learner = { address: SEED_LEARNER }
const course = {
  slug: SEED_COURSE, name: 'Web3 Dasar (bagian B)', description: 'Kursus dasar web3 untuk peserta Indonesia',
  criteria: 'Nilai akhir >= 70 dari 100, tugas esai dinilai agen',
}
const issuer = await createIssuerKey({ baseUrl: BASE, agentSlug: 'agent-demo', name: 'Agen Penerbit Demo' })
const uid = '0x' + 'ab'.repeat(32)
const expiresAt = NOW + YEAR

const { unsigned, indices } = buildOpenBadgeCredential({
  baseUrl: BASE, issuer, course, learner, uid,
  assessment: { score: '87', method: 'esai + kuis', comment: 'Lulus dengan catatan' },
  issuedAtUnix: NOW, expiresAtUnix: expiresAt, allocator,
})

check('@context dua URI dan urutannya benar', unsigned['@context'][0] === 'https://www.w3.org/ns/credentials/v2'
  && unsigned['@context'][1] === 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json')
check('type memuat VerifiableCredential + OpenBadgeCredential',
  unsigned.type.includes('VerifiableCredential') && unsigned.type.includes('OpenBadgeCredential'))
check('validFrom ada, issuanceDate TIDAK (VC 1.1 bukan VC 2.0)',
  !!unsigned.validFrom && unsigned.issuanceDate === undefined)
check('validUntil ada, expirationDate TIDAK',
  !!unsigned.validUntil && unsigned.expirationDate === undefined)
check('achievement.criteria wajib dan terisi', !!unsigned.credentialSubject.achievement.criteria?.narrative)

// --- 2b. B44: metode penilaian harus terbaca DI KERTAS, bukan hanya di log kita --------------
{
  const { DEFAULT_JUDGE_MODEL, JUDGE_TEMPERATURE } = await import('../src/judge.js')
  const { resultDocument } = await import('../src/results.js')
  const narOf = (doc) => doc.credentialSubject.achievement.criteria.narrative

  check('narasi tanpa catatan penilai tidak menampung spasi/rujuhan kosong',
    !/\s$/.test(narOf(unsigned)) && !/ {2}/.test(narOf(unsigned)), JSON.stringify(narOf(unsigned).slice(-24)))

  const judged = buildOpenBadgeCredential({
    baseUrl: BASE, issuer, course, learner, uid: '0x' + 'cd'.repeat(32),
    assessment: {
      score: '92',
      judgeNote: `· esai "esai-batas-bukti" dinilai ${DEFAULT_JUDGE_MODEL} (temperature ${JUDGE_TEMPERATURE})`,
    },
    issuedAtUnix: NOW, expiresAtUnix: expiresAt, allocator: new IndexAllocator(),
  }).unsigned
  check('narasi menyebut model penilai + temperature (B44 ditutup)',
    narOf(judged).includes(DEFAULT_JUDGE_MODEL) && narOf(judged).includes(`temperature ${JUDGE_TEMPERATURE}`),
    narOf(judged).slice(-86))

  const rd = resultDocument({
    baseUrl: BASE,
    record: {
      course: SEED_COURSE, credentialHash: SEED_HASH_ONCHAIN, uid, learner: SEED_LEARNER,
      score: '92', verdict: 'LULUS', rubricRef: '2a45d00bc4',
      rubricHash: '0x2a45d00bc4ffff',
      essayGrading: {
        lesson: 'esai-batas-bukti', judgeModel: DEFAULT_JUDGE_MODEL, temperature: JUDGE_TEMPERATURE,
        score: 99,
        // Bentuk ASLI seperti yang tersimpan di store: array tanda, bukan angka. Versi pertama
        // kode ini menulis `${eg.mechanical}` dan menghasilkan "penilai mekanis [object Object]…"
        // di URL publik — pemeriksaan di bawah ada supaya kelas bug itu tidak balik.
        mechanical: [
          { label: 'panjang tulisan', ok: true, detail: '451/400 kata' },
          { label: 'menyebutkan alamat 0x…', ok: false },
          { label: 'menyebutkan sumber yang bisa dibuka (URL)', ok: false },
          { label: 'menyebutkan fungsi/perintah konkret', ok: true },
          { label: 'menyatakan batas kesimpulannya sendiri', ok: true },
        ],
        perCriterion: [{ label: 'Kriteria contoh', score: 25, max: 25 }],
      },
      // `essayText` sengaja diisi di test ini: kalau suatu hari ikut terserialisasi, pemeriksaan
      // di bawah harus merah — dokumen hasil adalah untuk publik, teks peserta bukan.
      evidence: { quizScores: { 'kuis-gas': 100 }, praktikCompleted: true, essayScore: 99, essayText: 'TES-RAHASIA-PESERTA' },
      document: judged,
    },
  })
  const rdJson = JSON.stringify(rd)
  check('dokumen hasil menjawab "siapa menilai, dengan aturan apa"',
    rd.method.includes(DEFAULT_JUDGE_MODEL) && rd.grader.temperature === JUDGE_TEMPERATURE
    && rd.rubric.criteria.length === 1, rd.method)
  check('dokumen hasil TIDAK memuat kunci jawaban atau teks esai peserta',
    !rdJson.includes('"answer"') && !rdJson.includes('TES-RAHASIA-PESERTA')
    && rd.evidence.essayTextIncluded === false && rd.evidence.quizAnswerKeysIncluded === false)
  check('dokumen hasil melaporkan nilai yang sama dengan yang tercetak di kertas',
    String(rd.result) === String(judged.credentialSubject.result[0].value))
  // Bug nyata 28 Sep: `${eg.mechanical}` pada array menghasilkan "penilai mekanis [object Object]…"
  // yang akan tampil di URL publik. Penjaga ini lebih murah daripada satu tangkapan layar memalukan.
  check('tidak ada "[object Object]" yang bocor ke dokumen hasil',
    !rdJson.includes('[object Object]') && !rdJson.includes('[object Map]'), rd.method)
  check('tanda mekanis dilaporkan sebagai daftar yang bisa dibaca, bukan angka kabur',
    rd.mechanical?.passed === 3 && rd.mechanical?.total === 5
    && rd.mechanical.signs.length === 5 && rd.mechanical.signs[1].passed === false
    && rd.method.includes('3 dari 5'), JSON.stringify(rd.mechanical)?.slice(0, 120))
}
check('subject: id XOR identifier, tepat salah satu',
  (unsigned.credentialSubject.id === undefined) !== (unsigned.credentialSubject.identifier === undefined))
check('result[] membawa nilai lewat `value` (bukan resultScore ala OB 2.0)',
  unsigned.credentialSubject.result?.[0]?.value === '87'
  && unsigned.credentialSubject.result[0].resultScore === undefined
  && unsigned.credentialSubject.result[0].achievementId === undefined)
check('kadaluarsa dokumen berasal dari SATU angka dengan attestation',
  Date.parse(unsigned.validUntil) / 1000 === expiresAt)
check('statusListIndex string basis 10 (bukan angka)',
  typeof unsigned.credentialStatus.statusListIndex === 'string'
  && /^\d+$/.test(unsigned.credentialStatus.statusListIndex),
  JSON.stringify(typeof unsigned.credentialStatus.statusListIndex))
// Bentuk ini hasil langsung dari `vc.1ed.tech` 27 Sep: `$.credentialStatus: array found, object
// expected`. Skema OB 3.0 memberi branch array untuk `proof`, `credentialSchema`, `termsOfUse` dan
// `evidence` — dan dengan tegas tidak untuk `credentialStatus` ($defs `type: object`, tabel data
// menulis [0..1]). VC 2.0 boleh himpunan; yang memeriksa dokumen kita adalah OB 3.0.
check('credentialStatus SATU objek, purpose revocation (skema OB 3.0 menolak array)',
  !Array.isArray(unsigned.credentialStatus)
  && unsigned.credentialStatus?.type === 'BitstringStatusListEntry'
  && unsigned.credentialStatus?.statusPurpose === REVOCATION)
check('id entri status BUKAN URL list-nya sendiri',
  unsigned.credentialStatus.id !== unsigned.credentialStatus.statusListCredential)
// BSL §3.2 langkah 9: panjang(bitstring)/statusSize ≥ 131.072. "16KB" di §2.2/§6.1 adalah
// 16.384 BYTE. Komentar lama kita menulis "16384 bit" — satuan yang tertukar, dan validator
// menangkapnya: "revocation bitstring length is less than minimumNumberOfEntries".
check('panjang bitstring = 131.072 entri (minimum algoritme validasi BSL)',
  LIST_BITS === 131_072, `${LIST_BITS} bit`)
{
  const inflated = gunzipSync(Buffer.from(encodeList({ slots: new Map(), flagged: new Set() }).slice(1), 'base64url'))
  check('yang benar-benar ter-encode: 16.384 byte uncompressed',
    inflated.length === LIST_BITS / 8, `dapat ${inflated.length} byte`)
}

// --- 3. tanda tangan ----------------------------------------------------------
const issuerDoc = issuerDocument({ ...issuer })
const loader = makeDocumentLoader({ [issuer.controller]: issuerDoc })

const signed = await signDocument(unsigned, { key: issuer.key, controllerDocument: issuerDoc, documentLoader: loader })
const proof = Array.isArray(signed.proof) ? signed.proof[0] : signed.proof

check('proof.type = DataIntegrityProof', proof.type === 'DataIntegrityProof', proof.type)
check(`proof.cryptosuite = ${CRYPTOSUITE_NAME} (yang ada di daftar sertifikasi)`,
  proof.cryptosuite === CRYPTOSUITE_NAME, proof.cryptosuite)
check('proofPurpose = assertionMethod (wajib §B.1.24)', proof.proofPurpose === 'assertionMethod', proof.proofPurpose)
check('verificationMethod = URL HTTP, bukan DID', /^https?:\/\//.test(proof.verificationMethod), proof.verificationMethod)
check('proofValue multibase base58btc (awalan z)', typeof proof.proofValue === 'string' && proof.proofValue.startsWith('z'))

const ok = await verifyDocument(signed, { controllerDocument: issuerDoc, documentLoader: loader })
check('verifikasi round-trip LULUS', ok.verified, JSON.stringify(ok.raw?.results ?? ok.raw?.error ?? ''))

const tampered = structuredClone(signed)
tampered.credentialSubject.result[0].value = '100'
const tamperedResult = await verifyDocument(tampered, { controllerDocument: issuerDoc, documentLoader: loader })
check('nilai diubah -> tanda tangan MATI', tamperedResult.verified === false)

// Lebih tajam daripada "sodorkan kunci lain": kunci VERIFIKASI dibaca dari dokumen, jadi
// pemanggil tidak bisa membantu hasilnya. Yang diuji di sini adalah memalsukan *siapa* yang
// dinyatakan menandatangani — menunjuk kunci lain yang sah bentuknya, tanpa mengubah isinya.
const otherKey = await createIssuerKey({ baseUrl: BASE, agentSlug: 'agen-lain' })
const swapped = structuredClone(signed)
const swappedProof = Array.isArray(swapped.proof) ? swapped.proof[0] : swapped.proof
swappedProof.verificationMethod = otherKey.key.id
const swappedResult = await verifyDocument(swapped, { controllerDocument: issuerDoc, documentLoader: loader })
check('proof dialihkan ke kunci lain -> tolak', swappedResult.verified === false)

// Ini padanan dokumen dari whitelist chain: kunci yang tidak terdaftar di `assertionMethod`
// dokumen issuer harus ditolak, walaupun tanda tangannya sendiri sah.
const unlistedDoc = issuerDocument({ ...issuer })
unlistedDoc.assertionMethod = []
const unlistedLoader = makeDocumentLoader({ [issuer.controller]: unlistedDoc })
const unlisted = await verifyDocument(signed, { controllerDocument: unlistedDoc, documentLoader: unlistedLoader })
check('kunci sah tapi TIDAK terdaftar di dokumen issuer -> tolak', unlisted.verified === false)

// --- 4. daftar status dari keadaan chain --------------------------------------
const slots = new Map([[uid, indices.revocation]])
const suspSlots = new Map([[uid, indices.suspension]])

const emptyList = encodeList({ slots, flagged: new Set() })
const revokedList = encodeList({ slots, flagged: new Set([uid]) })
check('bit 0 = indeks 0 (bitstring paling kiri), dan berubah jadi 1 saat dicabut',
  decodeBit(emptyList, indices.revocation) === 0 && decodeBit(revokedList, indices.revocation) === 1)
check('kredensial lain di list tidak ikut berubah',
  decodeBit(revokedList, indices.revocation + 1) === 0)
check('encodedList multibase base64url + gzip (awalan u, tanpa padding)',
  emptyList.startsWith('u') && !emptyList.includes('=') && emptyList.length > 10, emptyList.slice(0, 24))

// Delisting harus masuk ke list SUSPENSION, bukan Revocation — itu pembeda D30, dan sekarang
// ia terlihat verifier pihak ketiga, bukan hanya halaman kita.
const suspOnly = encodeList({ slots: suspSlots, flagged: new Set([uid]) })
check('agen di-delisting -> list suspension merah, list revocation tetap bersih',
  decodeBit(suspOnly, indices.suspension) === 1 && decodeBit(encodeList({ slots, flagged: new Set() }), indices.revocation) === 0)

const listDoc = statusListCredential({
  baseUrl: BASE, purpose: REVOCATION, encodedList: revokedList,
  issuerId: issuer.controller, issuedAt: new Date(NOW * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
})
const signedList = await signDocument(listDoc, { key: issuer.key, controllerDocument: issuerDoc, documentLoader: loader })
const listOk = await verifyDocument(signedList, { controllerDocument: issuerDoc, documentLoader: loader })
check('daftar status sendiri adalah VC yang bisa diverifikasi', listOk.verified === true)
check('daftar status memakai type BitstringStatusListCredential + statusPurpose',
  listDoc.type.includes('BitstringStatusListCredential') && listDoc.credentialSubject.statusPurpose === REVOCATION)

// Hash bitstring inilah yang kita rekam lewat BAS `timestamp()`, supaya "list yang disajikan
// bukan hasil suntingan" bisa dibuktikan orang lain tanpa mempercayai server kita.
check('hash bitstring deterministik (bahan untuk timestamp() BAS)',
  sha256Hex(revokedList) === sha256Hex(revokedList) && sha256Hex(revokedList) !== sha256Hex(emptyList))

// --- 5. daftar status yang DITURUNKAN DARI CHAIN -------------------------------
// Inilah isi keputusan D24.1=A: bukan cuma bentuk dokumen yang benar, tapi nilainya datang dari
// contract state, bukan dari database kami. Hash yang dipakai sama dengan yang dibaca
// `web/scripts/probe.ts`, jadi kedua berkas mengawasi keadaan yang sama.
const rpc = process.env.RPC_URL
const resolverAddress = process.env.RESOLVER_ADDRESS
const envHashes = [
  process.env.DEMO_HASH, process.env.DEMO_REVOKED_HASH,
  process.env.DEMO_CHAINED_HASH, process.env.DEMO_DELISTED_HASH,
].filter(Boolean).map((h) => h.toLowerCase())

// Hash yang diawasi = yang diisi lewat env DIKAMPUKAN dengan yang diketahui store. Kalau tidak,
// pemeriksaan invarian hanya jalan saat seorang kebetulan mengisi DEMO_HASH dengan hash yang
// pernah diterbitkan di sini — dan itu berarti cakupannya ditentukan keberuntungan, bukan oleh kita.
let watched = envHashes
if (rpc && resolverAddress) {
  const { watchedHashes } = await import('../src/store.js')
  watched = [...new Set([...envHashes, ...(await watchedHashes()).map((h) => h.toLowerCase())])]
}

if (!rpc || !resolverAddress || watched.length === 0) {
  skipped.push('bagian 5 — daftar status dari chain (butuh RPC_URL + RESOLVER_ADDRESS, dan minimal satu kredensial dikenal: lewat DEMO_HASH/… atau store)')
} else {
  const { readChainStatuses, revokedUids, suspendedUids } = await import('../src/chainStatus.js')
  const statuses = await readChainStatuses({ rpcUrl: rpc, resolverAddress, hashes: watched })
  check(`chain mengenali seluruh kredensial yang diawasi sebagai attestation kita (${statuses.size}/${watched.length})`,
    statuses.size === watched.length && statuses.size > 0)

  const chainAlloc = new IndexAllocator()
  const revSlots = new Map()
  const susSlots = new Map()
  for (const uid of statuses.keys()) {
    revSlots.set(uid, chainAlloc.slot(REVOCATION, uid))
    susSlots.set(uid, chainAlloc.slot(SUSPENSION, uid))
  }
  const revList = encodeList({ slots: revSlots, flagged: new Set(revokedUids(statuses)) })
  const susList = encodeList({ slots: susSlots, flagged: new Set(suspendedUids(statuses)) })
  const bit = (list, uid, purpose) => decodeBit(list, (purpose === REVOCATION ? revSlots : susSlots).get(uid))
  const uidOfHash = (h) => [...statuses.values()].find((s) => s.hash.toLowerCase() === h)?.uid

  const revokedUid = uidOfHash(process.env.DEMO_REVOKED_HASH?.toLowerCase())
  const delistedUid = uidOfHash(process.env.DEMO_DELISTED_HASH?.toLowerCase())
  const activeUid = uidOfHash(process.env.DEMO_HASH?.toLowerCase())
  const chainedUid = uidOfHash(process.env.DEMO_CHAINED_HASH?.toLowerCase())

  if (revokedUid) {
    check('yang dicabut di chain -> bit 1 di list REVOCATION', bit(revList, revokedUid, REVOCATION) === 1)
    check('yang dicabut di chain -> bit 0 di list SUSPENSION (bukan keduanya)',
      bit(susList, revokedUid, SUSPENSION) === 0)
  } else skipped.push('DEMO_REVOKED_HASH tidak ada di chain ini')

  if (delistedUid) {
    check('agen di-delisting -> bit 1 di list SUSPENSION', bit(susList, delistedUid, SUSPENSION) === 1)
    // Ini yang membuat dua list (bukan satu dengan statusSize>1) layak: pembeda D30 tetap ada
    // setelah keluar dari tangan kita. Digabung jadi satu bit, verifier tidak bisa lagi
    // membedakan "dicabut selamanya" dari "sedang dijeda".
    check('agen di-delisting -> TIDAK muncul sebagai revocation',
      bit(revList, delistedUid, REVOCATION) === 0)
  } else skipped.push('DEMO_DELISTED_HASH tidak ada di chain ini')

  for (const [label, u] of [['aktif', activeUid], ['rantainya tercabut', chainedUid]]) {
    if (!u) { skipped.push(`hash ${label} tidak ada di chain ini`); continue }
    check(`kredensial ${label} -> bersih di kedua list`,
      bit(revList, u, REVOCATION) === 0 && bit(susList, u, SUSPENSION) === 0)
  }
  // Semua pemeriksaan per-adegan dijaga oleh kehadiran env-nya masing-masing. Menganggap sebuah
  // hash selalu diawasi hanya karena tes lain mengisinya adalah cara mendapat "gagal" yang
  // sebenarnya berarti "belum diuji".
  if (chainedUid) {
    check('[2] valid meski prasyaratnya dicabut -> dirinya sendiri tidak disuspensi/dicabut',
      bit(revList, chainedUid, REVOCATION) === 0 && bit(susList, chainedUid, SUSPENSION) === 0)
  } else {
    skipped.push('DEMO_CHAINED_HASH tidak diisi — lewati pemeriksaan [2]')
  }

  // 5b. THE invariant. `statusListIndex` tertulis ke DALAM dokumen saat ia terbit; bitnya dibaca
  //     ulang dari daftar yang kita hidangkan. Kalau dua-duanya tidak menunjuk hal yang sama,
  //     seluruh mekanisme status list hanya menjadi hiasan yang lolos verifikasi tanda tangan —
  //     dan itu kegagalan yang TIDAK terlihat di `verify()`. Pemeriksaannya persis invarian yang
  //     membuat alokator harus pindah ke store (lihat src/store.js).
  //
  // ⚠️ Daftarnya dirender dari `servedHashes()`, BUKAN dari satu kredensial yang sedang diuji.
  //     Dengan input sekali-kredensial, bit yang diperiksa berasal dari bitstring yang tidak
  //     pernah disajikan siapa pun — pemeriksaan itu bisa hijau sementara daftar yang benar
  //     salah. Ini kelas bug yang sama dengan anchor satu-kredensial di scripts/issue.js.
  const { renderList, servedHashes } = await import('../src/lists.js')
  const served = await servedHashes()
  const { listCredentials } = await import('../src/store.js')
  const { createIssuerKey, issuerDocument } = await import('../src/issuer.js')
  const { makeDocumentLoader } = await import('../src/sign.js')
  const ephemeral = await createIssuerKey({ baseUrl: 'https://check.invalid', agentSlug: 'check' })
  const ephDoc = issuerDocument(ephemeral)
  const ephLoader = makeDocumentLoader({ [ephemeral.controller]: ephDoc })

  const issued = await listCredentials()
  if (issued.length === 0) {
    skipped.push('store belum punya kredensial terbitan (jalankan scripts/issue.js untuk mengisinya)')
  } else {
    check('store melaporkan kredensial yang pernah diterbitkan', issued.length > 0, `${issued.length} butir`)
    /**
     * Angka ini dicetak karena jumlah PEMERIKSAAN harness ini bergantung pada banyak ENTRI status,
     * bukan pada jumlah rekaman. 29 Sep: total pemeriksaan turun 94 → 84 dan tidak ada yang bisa
     * menjelaskan kenapa — padahal sebabnya adalah bentuk cacat yang hilang (5 dokumen masih
     * `credentialStatus` array dua entri → 22 entri; setelah B65-b dinormalkan jadi satu objek →
     * 17 entri; 22−17 = 5 entri × 2 pemeriksaan = tepat 10). Tanpa baris ini, "suite mengecil"
     * terbaca seperti regresi; dengan baris ini, angkanya bisa direkonstruksi dari keadaan korpus.
     */
    const entryCount = issued.reduce((n, r) => n + (Array.isArray(r.document?.credentialStatus) ? r.document.credentialStatus.length : (r.document?.credentialStatus ? 1 : 0)), 0)
    console.log(`  info  : ${issued.length} rekaman · ${entryCount} entri status × 2 = ${entryCount * 2} pemeriksaan daftar sajian`)
    for (const rec of issued) {
      const s = [...statuses.values()].find((x) => x.hash.toLowerCase() === rec.credentialHash.toLowerCase())
      if (!s) { skipped.push(`${rec.course} tidak termasuk hash yang diawasi`); continue }
      // Korpus lama terbit sebelum koreksi skema dan dokumennya tidak bisa diedit: di sana
      // `credentialStatus` masih array dua entri. Harness membaca KEDUA bentuk — kalau tidak,
      // yang merah adalah pemeriksaannya, bukan faktanya.
      const statusEntries = Array.isArray(rec.document.credentialStatus)
        ? rec.document.credentialStatus
        : [rec.document.credentialStatus].filter(Boolean)
      for (const entry of statusEntries) {
        const purpose = entry.statusPurpose
        const rendered = await renderList({
          purpose, baseUrl: BASE, rpcUrl: rpc, resolverAddress, hashes: served,
          key: ephemeral.key, controllerDocument: ephDoc, documentLoader: ephLoader,
        })
        const idx = Number(entry.statusListIndex)
        const expected = purpose === REVOCATION ? s.revoked : (s.issuerDelisted && !s.revoked)
        check(`[${rec.course}] ${purpose}: bit pada indeks milik dokumennya sendiri (${idx}) = ${expected ? 1 : 0}`,
          decodeBit(rendered.encodedList, idx) === (expected ? 1 : 0),
          `dapat ${decodeBit(rendered.encodedList, idx)}, chain bilang ${expected ? 1 : 0}`)
        // Yang dibandingkan adalah KLAIM dokumen itu sendiri (URL absolut yang ia tulis saat terbit),
        // bukan BASE_URL berkas check ini — kredensial yang diterbitkan server di host lain harus
        // tetap lolos di sini.
        const urlOk = /^https?:\/\/[^/]+\/credentials\/status\/[a-z]+$/.test(entry.statusListCredential ?? '')
          && entry.statusListCredential.endsWith(`/${purpose}`)
        check(`[${rec.course}] ${purpose}: dokumennya menunjuk URL daftar yang sah dan benar`,
          urlOk, entry.statusListCredential)
      }
    }

    // 5c. Determinisme sajian. Server membangun bitstring ULANG tiap permintaan, jadi dua hal
    //     wajib benar selamanya: render ulang atas masukan sama menghasilkan hash sama, dan hash
    //     itu tidak boleh berubah kalau urutan masukan diacak. Kalau salah satu gagal, nomor bit
    //     yang ditulis ke dalam dokumen kehilangan artinya — dan itu tidak akan pernah kelihatan
    //     di pemeriksaan tanda tangan.
    //
    //     Sengaja TIDAK membandingkan dengan hash yang di-anchor: anchor adalah saksi pada saat
    //     terbit, dan setiap pencabutan sesudah itu memang mengubah daftar yang disajikan —
    //     memeriksa sama-persis akan merah karena alasan yang salah. Yang menjamin anchor mengikat
    //     daftar sajian adalah `servedHashes()` di sisi penerbit (lihat scripts/issue.js).
    const renderServed = async (purpose, list) => (await renderList({
      purpose, baseUrl: BASE, rpcUrl: rpc, resolverAddress, hashes: list,
      key: ephemeral.key, controllerDocument: ephDoc, documentLoader: ephLoader,
    })).hash
    for (const purpose of [REVOCATION, SUSPENSION]) {
      const a = await renderServed(purpose, served)
      const b = await renderServed(purpose, served)
      const c = await renderServed(purpose, [...served].reverse())
      check(`${purpose}: render ulang atas masukan sama -> hash sama`, a === b, `${a} vs ${b}`)
      check(`${purpose}: urutan masukan diacak -> hash TETAP sama`, a === c, `${a} vs ${c}`)
    }
  }
}

console.log(`\n${failures === 0 ? 'CHECK HIJAU' : 'CHECK MERAH'} — ${ran} pemeriksaan, ${failures} gagal`)
if (skipped.length) {
  console.log(`\n--grup yang DILEWATI (${skipped.length})--`)
  for (const s of skipped) console.log(`  - ${s}`)
}
process.exitCode = failures === 0 ? 0 : 1
