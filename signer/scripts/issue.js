/**
 * SATU perintah: nilai → kredensial on-chain → dokumen OB3.0 bertanda tangan → daftar status
 * → hash daftar dikunci ke chain.
 *
 *   npm run issue -- --course web3-dasar-2026 --learner 0x… \
 *        --quiz 80,80,90,70 --essay-score 90
 *
 *   npm run issue -- --from-attempts --course web3-dasar-2026 --learner 0x…
 *
 * `--from-attempts` (B62): angkanya TIDAK datang dari perintah ini, melainkan dari rekaman usaha di
 * Postgres (`attempts` + `attempt_components`); dua gerbang kursus (`all_lessons_done` dan
 * `best_score >= passMark`) dibaca lebih dulu dan yang tidak lolos tidak dapat kertas. Bentuk
 * `--quiz/--essay-score` tetap ada untuk menguji aritmetika dan menerbitkan kertas contoh.
 *
 * Tidak ada `--score`: yang masuk adalah BUKTI, dan angkanya dihitung terhadap manifest penerbit.
 * Bukti yang belum lengkap membuat perintah ini BERHENTI sebelum gas bergerak — bukan memakai
 * angka bawaan supaya demo jalan.
 *
 * Kenapa satu perintah: tiap tahapnya sudah terbukti sendiri-sendiri di `check.js`, tapi demo video
 * tidak bisa dijalankan lewat empat perintah manual di depan juri. Rantaian ini juga yang menguji
 * hal paling sering patah di proyek seperti ini: **hash yang dihitung backend harus sama dengan hash
 * yang dihitung contract** — dua implementasi di dua bahasa yang tidak saling memanggil.
 *
 * Idempoten: attestation yang sudah ada tidak diterbitkan ulang; anchor yang sudah ada tidak
 * diulang. Nomor bit ditetapkan di sini, sekali, lalu disimpan — server hanya membacanya.
 *
 * Butuh .env di akar app/: RPC_URL, RESOLVER_ADDRESS, BAS_ADDRESS, ISSUER_PRIVATE_KEY (EOA agen =
 * attester), DEPLOYER_PRIVATE_KEY (kunci platform = yang anchor), AGENT_SLUG, BASE_URL;
 * `--from-attempts` menuntut SUPABASE_URL + SUPABASE_SECRET_KEY juga.
 */

// Lencana-B55 status=SELESAI 2026-09-29 — Kertas Web3 Lanjut pertama kita (0x44d4946e…) menyebut prasyarat di criteria-nya tanpa tautan on-chain. Peserta itu memang memegang Web3 Dasarnya di chain (holderOf sam Buktikan ulang: lihat baris B55 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B55 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B44 status=SELESAI 2026-09-29 — the artefact answers "which rubric" but not "who ran it", so "an agent graded this" is checkable only against our own logs Buktikan ulang: lihat baris B44 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B44 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { createPublicClient, createWalletClient, http, keccak256, stringToBytes, encodeAbiParameters, getAddress, parseAbi } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { credentialHashOf, buildOpenBadgeCredential } from '../src/credential.js'
import { REVOCATION, SUSPENSION, renderList, servedHashes } from '../src/lists.js'
import { loadAllocator, rememberCredential } from '../src/store.js'
import { loadKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader, signDocument, verifyDocument } from '../src/sign.js'
import { readAnchor, anchorListHash } from '../src/anchor.js'
import { EMPTY_UID } from '../../web/src/abi.ts'
import { manifestOf } from '../../web/src/manifest-keys.ts'
import { computeScore, formatScore } from '../../web/src/score.ts'
import { DEFAULT_JUDGE_MODEL, JUDGE_TEMPERATURE } from '../src/judge.js'
import { loadFileEnv } from '../src/env.js'
import { dbConfigured, dbMissingReason, courseGates, attemptsFor } from '../src/db.js'
import { evidenceFromAttempts, formatEvidence } from '../src/fromAttempts.js'

// `src/db.js` membaca `process.env` — memang di situ tempat kredensial server-side — sementara skrip
// ini dulu membaca ../../.env ke objek lokal saja. Tanpa baris ini `--from-attempts` akan bilang
// "SUPABASE_URL belum diisi" di mesin yang jelas punya .env: kelas bug yang sama yang ditutup D45
// untuk `check.js` dan `serve-probe.js`. Nilai dari lingkungan proses tetap menang (lihat env.js).
await loadFileEnv()

/** .env dibaca manual: menambah dotenv hanya untuk 8 baris adalah dependensi yang tidak perlu. */
async function readEnv () {
  const text = await readFile(new URL('../../.env', import.meta.url), 'utf8')
  const out = {}
  for (const line of text.split(/\r?\n/)) {
    const m = /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`)
  return i === -1 || i + 1 >= process.argv.length ? fallback : process.argv[i + 1]
}

const course = arg('course')
const learner = arg('learner')
if (!course || !learner) {
  console.error('pakai: npm run issue -- --course <id> --learner <0x…> --quiz 80,80,90,90 --essay-score 90 [--no-praktik]')
  process.exit(2)
}

/**
 * `--score` DIHAPUS. Yang masuk ke skrip ini sekarang adalah BUKTI, dan angkanya dihitung
 * terhadap manifest penerbit (`web/src/score.ts`). Menerima nilai bulat dari perintah adalah satu
 * -satunya cara platform mengarang kelulusan atas nama institusi — dan itulah yang kita kritik
 * dari kompetitor, jadi tidak masuk akal kita lakukan sendiri.
 *
 * `--from-attempts` melangkah satu tahap lebih jauh (B62-b): bukti yang SUDAH ada di Postgres yang
 * dipakai, dan flag angka dari perintah DITOLAK. Bukan demi kerapian CLI — kalau keduanya boleh
 * masuk bersamaan, satu angka punya dua jalan masuk dan yang di kertas tidak bisa dibedakan lagi.
 */
const FROM_ATTEMPTS = process.argv.includes('--from-attempts')
const CLI_EVIDENCE_FLAGS = ['quiz', 'essay-score', 'essay', 'lesson', 'no-praktik']
if (FROM_ATTEMPTS) {
  const clash = CLI_EVIDENCE_FLAGS.filter((f) => arg(f) !== undefined || process.argv.includes(`--${f}`))
  if (clash.length) {
    console.error(`--from-attempts tidak bisa dipakai bersama ${clash.map((f) => `--${f}`).join(' ')}`)
    console.error('satu angka tidak boleh punya dua jalan masuk: biarkan nilainya datang dari rekaman usaha saja')
    process.exit(2)
  }
}

let quizScores = String(arg('quiz', '')).split(',').map((s) => s.trim()).filter(Boolean).map(Number)
const essayRaw = arg('essay-score')
let essayScore = essayRaw === undefined ? null : Number(essayRaw)
let essayGrading = null
let praktikCompleted = !process.argv.includes('--no-praktik')
let fromDB = null

if (quizScores.some((n) => !Number.isFinite(n))) {
  console.error('--quiz harus daftar angka 0..100 dipisah koma, tanpa nilai kosong')
  process.exit(2)
}

const env = { ...await readEnv(), ...process.env }
const { RPC_URL, RESOLVER_ADDRESS: RESOLVER, BAS_ADDRESS: BAS } = env
const BASE_URL = env.BASE_URL ?? 'http://127.0.0.1:8787'
const AGENT_SLUG = env.AGENT_SLUG ?? 'agent-demo'
for (const [k, v] of Object.entries({ RPC_URL, RESOLVER, BAS })) {
  if (!v) { console.error(`${k} belum diisi`); process.exit(2) }
}

// Kebijakan penilaian datang dari manifest penerbit, bukan dari argumen bebas. Kalau id kursus
// tidak ada di registri manifest, kita berhenti SEBELUM gas bergerak: menerbitkan kredensial
// tanpa kebijakan yang bisa ditunjuk berarti dokumen itu tidak bisa dijelaskan orang lain.
const manifest = manifestOf(course)
if (!manifest) {
  console.error(`kursus "${course}" bukan manifest penerbit yang dikenal.`)
  console.error(`yang tersedia: ${['web3-dasar-2026', 'web3-lanjut-2026'].join(', ')} (lihat web/src/manifest.ts)`)
  process.exit(2)
}
const issuerName = manifest.issuer.name

// Kadaluarsa = kebijakan penerbit. `--days` tetap ada sebagai uji (mis. menguji kedaluwarsa di
// fork), tapi memakainya diam-diam akan membuat dokumen tidak cocok dengan `criteria`-nya.
const DAYS = arg('days') ? Number(arg('days')) : manifest.course.validDays
if (arg('days')) console.log(`⚠️ masa berlaku ditimpa manual (${DAYS} hari); kebijakan penerbit ${manifest.course.validDays}`)

/**
 * `--essay <berkas>` membuat nilai esai berasal dari PENILAIAN, bukan dari angka yang diketik
 * manusia. `--judge` memanggil model (lihat `npm run judge` untuk kontrol negatifnya); tanpa itu
 * gerbang berhenti di AWAITING_JUDGE dan skrip menolak menerbitkan.
 *
 * Kenapa tidak cukup `--essay-score 90`: itu persis lubang yang baru kita tutup — angka kelulusan
 * yang datang dari tangan. Flag itu tetap ada untuk menguji aritmetika `computeScore`, tapi tidak
 * untuk dokumen yang kita klaim sebagai hasil penilaian.
 */
if (arg('essay')) {
  const { gradeAgainstRubric, formatVerdict } = await import('../src/grade.js')
  const { groqJudge } = await import('../src/judge.js')
  const lessons = manifest.course.modules.flatMap((m) => m.lessons)
  const wanted = arg('lesson')
  const lesson = (wanted ? lessons.find((l) => l.slug === wanted) : lessons.find((l) => l.essay)) ?? null
  if (!lesson?.essay) {
    console.error(`tidak ada lesson ber-esai untuk "${wanted ?? course}" — periksa --lesson`)
    process.exit(2)
  }
  const text = await readFile(resolve(arg('essay')), 'utf8')
  const judge = process.argv.includes('--judge')
    ? groqJudge({ model: process.env.JUDGE_MODEL })
    : undefined
  essayGrading = await gradeAgainstRubric({ text, essay: lesson.essay, judge })
  essayGrading.lessonSlug = lesson.slug
  essayGrading.judgeModel = judge ? (process.env.JUDGE_MODEL ?? DEFAULT_JUDGE_MODEL) : null
  console.log(`esai (${lesson.slug}) : ${formatVerdict(essayGrading)}`)
  if (essayGrading.finalScore === null) {
    console.error(`\nberhenti: esai belum menghasilkan nilai (${essayGrading.verdict}).`)
    console.error('Tambahkan --judge untuk menilai dengan model. Jangan isi --essay-score untuk melewatinya.')
    process.exit(3)
  }
  if (essayRaw !== undefined && Number(essayRaw) !== essayGrading.finalScore) {
    console.error(`--essay-score (${essayRaw}) bertentangan dengan hasil penilaian (${essayGrading.finalScore}) — berhenti.`)
    process.exit(2)
  }
  essayScore = essayGrading.finalScore
}

/**
 * `--from-attempts` (B62): bukti dan dua gerbang datang dari rekaman di Postgres.
 *
 * Urutannya disengaja. Gerbang dibaca SEBELUM aritmetika, dan aritmetikanya tetap `computeScore`
 * yang sama terhadap KOMPONEN yang tersimpan — bukan terhadap kolom `score`. Kolom itu tempat kita
 * menampilkan hasil; kalau dia yang memberi makan rubrik, angka di kertas cuma mencerminkan diri ia
 * sendiri. `NULL` pada `all_lessons_done` berarti "penyebutnya belum diketahui" (migrasi 0004) dan
 * diperlakukan sebagai belum selesai — bukan lolos, bukan gagal, dan bedanya harus terbaca di log.
 */
if (FROM_ATTEMPTS) {
  if (!dbConfigured()) {
    console.error(`--from-attempts berhenti: ${dbMissingReason()}`)
    process.exit(2)
  }
  const gates = await courseGates(learner, course)
  if (!gates) {
    console.error(`tidak ada enrollment ${learner} di ${course} — gerbang tidak bisa dibaca dari baris yang tidak ada`)
    console.error('peserta harus POST /enroll lebih dulu (tanda tangan atas nonce satu-kali)')
    process.exit(2)
  }
  console.log(`gerbang 1   : lesson selesai ${gates.lessons_completed}/${gates.lessons_total} -> all_lessons_done=${gates.all_lessons_done}`)
  console.log(`gerbang 2   : ${gates.graded_attempts} usaha dinilai, best_score=${gates.best_score}, ambang penerbit ${manifest.course.passMark}`)
  if (gates.all_lessons_done !== true) {
    console.error('tidak menerbitkan: gerbang "selesai" belum lewat — lihat catatan migrasi 0004 soal NULL')
    process.exit(3)
  }
  if (gates.best_score === null || Number(gates.best_score) < manifest.course.passMark) {
    console.error(`tidak menerbitkan: best_score=${gates.best_score} di bawah ambang penerbit ${manifest.course.passMark}`)
    process.exit(3)
  }
  const rows = await attemptsFor(learner, course)
  const ev = evidenceFromAttempts(manifest, rows)
  if (!ev.ok) {
    console.error(`tidak menerbitkan: ${ev.why}`)
    process.exit(3)
  }
  quizScores = ev.evidence.quizScores
  essayScore = ev.evidence.essayScore
  praktikCompleted = ev.evidence.praktikCompleted
  fromDB = { gates, stored: rows.length, provenance: ev.provenance, used: ev.used, unmapped: ev.unmapped, judges: ev.judges, reviews: ev.reviews ?? [], notes: ev.notes }
  console.log(`dari rekaman: ${formatEvidence(ev)}`)
  for (const n of ev.notes) console.log(`            · ${n}`)
}

const grade = computeScore(manifest, { quizScores, praktikCompleted, essayScore })
console.log(`penerbit    : ${issuerName}`)
console.log(`penilaian   : ${formatScore(grade)}`)
if (grade.verdict === 'BELUM_LENGKAP') {
  console.error('\nberhenti: bukti belum lengkap. Tidak ada angka yang dikarang supaya skrip bisa jalan.')
  process.exit(3)
}

/**
 * `best_score` di atas ambang TIDAK cukup untuk menerbitkan (bar 6: dua gerbang, dan gerbang kedua
 * tetap milik rubrik). `course_gates.best_score` adalah maksimum skor usaha yang dinilai — satu kuis
 * 92 bisa melewatinya. Yang menentukan kertas adalah verdict `computeScore` terhadap SEMUA komponen
 * yang tersimpan, dan kalau itu tidak LULUS, tidak ada attestation yang keluar.
 */
if (FROM_ATTEMPTS && grade.verdict !== 'LULUS') {
  console.error(`berhenti: rubrik penerbit bilang ${grade.verdict} atas angka yang tersimpan — ${formatScore(grade)}`)
  console.error('gerbang best_score dilewati tapi kelulusan tidak: itu peserta yang belum selesai kursusnya, bukan yang lulus')
  process.exit(3)
}

const agentEoa = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
const platformPk = env.DEPLOYER_PRIVATE_KEY
const client = createPublicClient({ transport: http(RPC_URL) })
const chain = {
  id: await client.getChainId(),
  name: `chain-${await client.getChainId()}`,
  nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
  rpcUrls: { default: { http: [RPC_URL] }, public: { http: [RPC_URL] } },
}
// Penulisan lewat wallet client (public client viem 2.x tidak punya writeContract); yang memegang
// kunci di lapis ini adalah AGEN, dan itu memang poin D30: attester = dia, bukan kami.
const wallet = createWalletClient({ account: agentEoa, chain, transport: http(RPC_URL) })

const ResolverAbi = parseAbi([
  'function schemaUID() view returns (bytes32)',
  'function attestationOf(bytes32) view returns (bytes32)',
  // Dibaca balik untuk pascakondisi: apakah chain mencatat tautan prasyarat, bukan apakah kita
  // berniat mengirimnya. Tanpa entri ini `readContract` gagal, dan kegagalan itu bukan teori.
  'function prerequisiteOf(bytes32) view returns (bytes32)',
  'function isIssuer(address) view returns (bool)',
])
// Bentuknya dibaca dari IEAS.sol, bukan dikarang: AttestationRequest = { schema, data } dan
// TIDAK punya `value` di level atas (yang punya value hanya AttestationRequestData).
const BasAbi = parseAbi([
  'function attest((bytes32 schema, (address recipient, uint64 expirationTime, bool revocable, bytes32 refUID, bytes data, uint256 value) data) request) returns (bytes32)',
])

const courseId = keccak256(stringToBytes(course))
const credentialHash = credentialHashOf(learner, course)
const schemaUID = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'schemaUID' })

console.log(`kursus      : ${course} -> courseId ${courseId}`)
console.log(`peserta     : ${getAddress(learner)}`)
console.log(`agen (EOA)  : ${agentEoa.address}`)
console.log(`hash        : ${credentialHash}`)

if (!(await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'isIssuer', args: [agentEoa.address] }))) {
  throw new Error(`${agentEoa.address} bukan penerbit yang diizinkan — addIssuer lebih dulu`)
}

// Payload harus bytes32×3 persis seperti yang dibaca `onAttest()` kita. encodeAbiParameters,
// bukan konkatenasi string manual — konkatenasi adalah cara salah yang kebetulan terlihat benar.
const attestationData = encodeAbiParameters(
  [{ type: 'bytes32' }, { type: 'bytes32' }, { type: 'bytes32' }],
  [credentialHash, courseId, EMPTY_UID],
)

/**
 * Prasyarat dirantai DI CHAIN, bukan dikarang di kertas.
 *
 * Kenapa ini ada: `_validatePrerequisite` (`CredentialResolver.sol:348`) hanya bisa menegakkan apa
 * yang dikirimkan kepadanya. Selama `refUID` selalu nol, kursus yang mendefinisikan prasyarat akan
 * terbit sebagai kertas yang criteria-nya sendiri menyebut sesuatu yang tidak bisa ditunjukkan
 * siapa pun — persis lubang yang kita catat untuk LMS orang lain.
 *
 * Dan catatan jujur tentang versinya: guard pertama kubaca dari `manifest.prereqCourseId`, padahal
 * kebijakan penerbit hidup di `manifest.course` (`web/src/manifest.ts:155-169`: `MANIFESTS` adalah
 * `{ schema, issuer, publishedAt, course }`). `?? null` membuat field yang salah tingkat itu JATUH
 * DIAM — attestation `0x44d4946e…` keluar tanpa tautan dan log tidak protes. Jadi yang diuji di
 * bawah bukan niat kita, melainkan **efeknya yang terbaca di chain**: `prerequisiteOf(uid)` dibaca
 * kembali, karena hanya itu yang bisa diperiksa orang lain.
 */
const prereqCourse = manifest.course?.prereqCourseId ?? manifest.prereqCourseId ?? null
let prereqUid = EMPTY_UID
if (prereqCourse) {
  const prereqHash = credentialHashOf(learner, prereqCourse)
  prereqUid = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'attestationOf', args: [prereqHash] })
  if (prereqUid === EMPTY_UID) {
    console.error(`prasyarat "${prereqCourse}" belum tercatat di chain untuk peserta ini (hash ${prereqHash})`)
    console.error('tidak menerbitkan: kertas yang menyebut prasyarat tanpa tautan on-chain adalah klaim tanpa bukti')
    console.error('urutan yang benar: terbitkan kredensial prasyaratnya lebih dulu, lalu jalankan ini lagi')
    process.exit(2)
  }
  console.log(`prasyarat   : ${prereqCourse} → uid ${prereqUid}`)
}

const expiresAt = BigInt(Math.floor(Date.now() / 1000) + DAYS * 86400)
let uid = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'attestationOf', args: [credentialHash] })
if (uid === EMPTY_UID) {
  const tx = await wallet.writeContract({
    address: BAS,
    abi: BasAbi,
    functionName: 'attest',
    args: [{
      schema: schemaUID,
      data: {
        recipient: getAddress(learner),
        expirationTime: expiresAt,
        revocable: true,
        refUID: prereqUid,
        data: attestationData,
        value: 0n,
      },
    }],
  })
  const receipt = await client.waitForTransactionReceipt({ hash: tx })
  if (receipt.status !== 'success') throw new Error(`attest() revert di ${tx}`)
  uid = await client.readContract({ address: RESOLVER, abi: ResolverAbi, functionName: 'attestationOf', args: [credentialHash] })
  console.log(`attestation : ${uid} (gas ${receipt.gasUsed})`)
} else {
  console.log(`sudah ada   : ${uid} — tidak menerbitkan ulang`)
}

/**
 * Pascakondisi, dibaca dari chain. `refUID` yang kita kirim tidak menjamin apa-apa sampai
 * `prerequisiteOf(uid)` menunjukkan tautannya — dan karena BAS tidak menerima ulang attestation
 * untuk hash yang sama, tautan yang hilang hari ini hilang permanen untuk hash itu. Satu-satunya
 * cara menangkap kegagalan diam-diam seperti itu adalah MEMBACA HASILNYA, bukan memercayai maksud
 * kode kita (pelajaran yang persis sama dengan B53, di level yang berbeda).
 */
if (uid !== EMPTY_UID) {
  const linked = await client.readContract({
    address: RESOLVER, abi: ResolverAbi, functionName: 'prerequisiteOf', args: [uid],
  })
  if (prereqCourse && linked === EMPTY_UID) {
    console.error(`prasyarat dideklarasikan (${prereqCourse}) tapi prerequisiteOf(${uid.slice(0, 10)}…) = nol`)
    console.error('kertas tidak diterbitkan: itu klaim yang tidak bisa ditunjukkan orang lain')
    process.exit(1)
  }
  console.log(`tautan      : prerequisiteOf = ${linked === EMPTY_UID ? 'kosong (kursus ini tidak mendeklarasikan prasyarat)' : linked}`)
}

// 2. Nomor bit ditetapkan di sini SEKALI dan disimpan; server hanya membaca.
const { alloc, commit } = await loadAllocator()
const revocationIndex = alloc.slot(REVOCATION, uid)
const suspensionIndex = alloc.slot(SUSPENSION, uid)
await commit()

// 3. Dokumen: SATU angka kadaluarsa untuk kedua lapis.
const agent = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument(agent)
const loader = makeDocumentLoader({ [agent.controller]: issuerDoc })

/**
 * Jejak usaha yang ikut melahirkan angka (B62). Yang ditulis di dokumen adalah `attempt_hash` —
 * bukan angkanya — karena hash itulah alamat balik ke baris `attempts` + `attempt_components`, dan
 * baris itu yang bisa dihitung ulang orang lain. Bentuk `credentialHash` TIDAK berubah
 * (`keccak256("vc:", learner, courseId)`), jadi kertas yang sudah terbit hari ini tidak berubah
 * diam-diam; yang bertambah hanya satu rujukan di `assessment.method` + blok `attempts` di dokumen
 * hasil (`/results/...`).
 */
const attemptHashes = [...new Set((fromDB?.used ?? []).map((u) => u.attemptHash).filter(Boolean))]
const judgeList = (fromDB?.judges ?? []).map((j) => j.model).filter((m, i, a) => a.indexOf(m) === i)
const methodFromDB = fromDB
  ? `dihitung dari ${fromDB.used.length} rekaman usaha di Postgres terhadap rubrik ${grade.rubricRef}`
    + ` (attempt_hash ${attemptHashes[0] ?? '—'}${attemptHashes.length > 1 ? ` +${attemptHashes.length - 1} lagi` : ''})`
    + (judgeList.length ? `; penilaian model: ${judgeList.join(', ')}` : '')
  : null

const { unsigned, indices } = buildOpenBadgeCredential({
  baseUrl: BASE_URL,
  issuer: agent,
  // Nama, deskripsi, dan kriteria diambil dari MANIFEST penerbit. Teks kriteria membawa 12 hex
  // terdepan rubricHash, supaya pertanyaan "87 ini dari rubrik yang mana" dijawab oleh dokumen
  // itu sendiri, bukan oleh ingatan kita.
  course: {
    slug: course,
    name: manifest.course.title,
    description: manifest.course.blurb,
    criteria: `${manifest.course.criteria} [rubrik ${grade.rubricRef}]`,
  },
  learner: { address: learner },
  // `score` tidak lagi diterima dari perintah: ini hasil hitung terhadap bukti + kebijakan penerbit.
  assessment: {
    score: String(grade.total),
    // Metode penilaian ikut ke dokumen: angka 96 tanpa "siapa yang menghitung dan dengan rubrik
    // versi apa" hanyalah angka. Nama model + versi rubrik masuk ke sini supaya pertanyaan
    // "87 ini dari mana" dijawab dokumen itu sendiri, bukan oleh log kita.
    method: arg('method', methodFromDB ?? (essayGrading?.judgeModel
      ? `dihitung dari bukti terhadap rubrik ${grade.rubricRef}; esai dinilai ${essayGrading.judgeModel} (temperature ${JUDGE_TEMPERATURE})`
      : `dihitung dari bukti terhadap rubrik ${grade.rubricRef}`)),
    // Versi pendek untuk `criteria.narrative`: yang terbaca orang di ijazah. Dipasang 28 Sep —
    // sebelum ini kalimat di atas dihitung lalu dibuang, karena `Result` OB 3.0 tidak punya
    // field untuk metode (B44).
    judgeNote: essayGrading?.judgeModel
      ? `· esai "${essayGrading.lessonSlug}" dinilai ${essayGrading.judgeModel} (temperature ${JUDGE_TEMPERATURE})`
      : null,
    comment: [
      ...grade.components.map((cp) => `${cp.name} ${cp.raw}×${cp.weight}%`),
      ...(essayGrading?.perCriterion ?? []).map((c) => `esai: ${c.label} ${c.score}/${c.max}`),
      ...(fromDB ? [`rekaman ${fromDB.used.length} usaha / ${fromDB.provenance.length} komponen, attempt_hash ${attemptHashes[0] ?? '—'}${attemptHashes.length > 1 ? ` +${attemptHashes.length - 1} lagi` : ''}`] : []),
    ].join(' · '),
  },
  uid,
  issuedAtUnix: Number(expiresAt) - DAYS * 86400,
  expiresAtUnix: Number(expiresAt),
  // `indices` dari proses ini sendiri, bukan hasil alokasi baru: kalau keduanya berbeda, dokumen
  // menunjuk bit yang salah.
  allocator: { slot: (purpose) => (purpose === REVOCATION ? revocationIndex : suspensionIndex) },
})
if (indices.revocation !== revocationIndex || indices.suspension !== suspensionIndex) {
  throw new Error('alokasi indeks dokumen dan store tidak sama — berhenti sebelum menerbitkan salah')
}

const signedDoc = await signDocument(unsigned, { key: agent.key, controllerDocument: issuerDoc, documentLoader: loader })
const verified = await verifyDocument(signedDoc, { controllerDocument: issuerDoc, documentLoader: loader })
if (!verified.verified) throw new Error('dokumen hasil terbitan sendiri tidak lolos verifikasi — berhenti')
await rememberCredential({
  id: signedDoc.id, credentialHash, uid, learner: getAddress(learner), course,
  // Yang disimpan bukan cuma angkanya: `score` tanpa `evidence`/`rubricHash` adalah klaim yang
  // tidak bisa ditelusuri, padahal seluruh titik keputusan ini adalah membuat angka bisa ditanya.
  score: grade.total, verdict: grade.verdict, rubricHash: grade.rubricHash, rubricRef: grade.rubricRef,
  issuer: issuerName,
  evidence: { quizScores, praktikCompleted, essayScore },
  // B62: kalau angkanya datang dari rekaman usaha, rekamannya ikut disimpan — bukan untuk
  // mempercantik dokumen hasil, tapi supaya `attempt_hash` yang tercetak di kertas bisa dicocokkan
  // orang ke baris yang sama di Postgres tanpa minta sesuatu dari kita.
  attempts: fromDB
    ? {
        source: 'postgres:attempts',
        gates: {
          lessonsTotal: fromDB.gates.lessons_total, lessonsCompleted: fromDB.gates.lessons_completed,
          allLessonsDone: fromDB.gates.all_lessons_done, gradedAttempts: fromDB.gates.graded_attempts,
          bestScore: fromDB.gates.best_score, passMark: manifest.course.passMark,
        },
        storedRows: fromDB.stored, attemptHashes,
        used: fromDB.used, components: fromDB.provenance, unmapped: fromDB.unmapped,
        // B104: siapa manusia yang mengesahkan angka model, dan dari berapa ke berapa.
        judges: fromDB.judges, reviews: fromDB.reviews, notes: fromDB.notes,
      }
    : { source: 'cli-flags' },
  // Angka di dokumen bisa ditelusuri dari repo: lesson mana, verdict apa, model mana, dan
  // berapa per kriteria — bukan hanya nilai akhir.
  essayGrading: essayGrading
    ? {
        lesson: essayGrading.lessonSlug,
        verdict: essayGrading.verdict,
        score: essayGrading.finalScore,
        judgeModel: essayGrading.judgeModel,
        // Disimpan, bukan ditebak di tempat lain: dokumen hasil memetiknya untuk mengatakan
        // "dinilai <model> pada temperature <x>" tanpa mengarang angkanya.
        temperature: JUDGE_TEMPERATURE,
        perCriterion: essayGrading.perCriterion,
        mechanical: essayGrading.mechanical,
      }
    : null,
  signedAt: new Date().toISOString(), document: signedDoc,
})
console.log(`dokumen     : ${signedDoc.id}`)
console.log(`slot        : revocation ${revocationIndex} · suspension ${suspensionIndex}`)

// 4. Kunci hash tiap daftar status ke chain, lalu BACA ULANG — jangan percaya nilai return.
//
// ⚠️ Yang di-anchor adalah hash daftar atas SEMUA kredensial yang dipantau (`servedHashes()`),
// bukan daftar berisi kredensial yang baru terbit ini saja. Server menghidangkan yang pertama,
// jadi hanya hash itulah yang bisa membuktikan "daftar yang kalian baca bukan hasil suntingan".
// Versi sebelumnya memakai `[credentialHash]` dan menghasilkan anchor yang sah bentuknya tapi
// tidak mengikat apa pun — dua daftar beda input, jadi hash-nya tidak akan pernah sama.
const anchorHashes = await servedHashes()
for (const purpose of [REVOCATION, SUSPENSION]) {
  const list = await renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER,
    hashes: anchorHashes, key: agent.key, controllerDocument: issuerDoc, documentLoader: loader,
  })
  const before = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: list.hash })
  if (before > 0n) {
    console.log(`anchor ${purpose}: sudah ada sejak ${before} — tidak diulang (${list.watched} kredensial, ${list.flagged} bit)`)
    continue
  }
  const a = await anchorListHash({ rpcUrl: RPC_URL, basAddress: BAS, privateKey: platformPk, encodedList: list.encodedList })
  const seen = await readAnchor({ rpcUrl: RPC_URL, basAddress: BAS, data: a.data })
  if (seen === 0n) throw new Error(`anchor ${purpose} tertulis tapi tidak terbaca kembali`)
  if (a.data !== list.hash) throw new Error(`hash yang tertambang ${a.data} bukan hash yang dirender ${list.hash}`)
  console.log(`anchor ${purpose}: ${a.data} -> jam ${seen} (gas ${a.gasUsed}, ${list.watched} kredensial, ${list.flagged} bit)`)
}
console.log(`\nsajikan: npm run serve  →  ${BASE_URL}/credentials/${credentialHash}`)
