/**
 * `npm run verify:attempts` — membuktikan angka di kertas bisa diturunkan dari baris usaha (B62).
 *
 * Dua lapis, dan pemisahnya sengaja sebuah bendera:
 *
 *   default        : HITUNG-SAJA. `evidenceFromAttempts` terhadap baris palsu + manifest asli,
 *                    penolakannya, dan bentuk dokumen hasilnya. Tidak menulis ke mana pun.
 *   `--live`       : MENULIS. Enrollment + progres + usaha peserta uji di Postgres, lalu SATU
 *                    `issue --from-attempts` sungguhan di chain 97 (1 attestation + re-anchor dua
 *                    daftar). Itu biaya nyata, jadi ia tidak jalan diam-diam.
 *
 * Kenapa bagian live perlu attestation sungguhan: klaim B62 bukan "fungsimya mengembalikan angka
 * yang benar", tapi "nomor yang tercetak di ijazah punya alamat balik ke barisnya". Alamat itu baru
 * terbukti kalau dokumen yang terbit benar-benar memuat `attempt_hash` dan URL `/results/...`
 * menghidangkan blok yang cocok dengan baris di Postgres.
 *
 * Kenapa penolakannya ikut diuji sampai dua kali: fungsi yang lulus karena masukan lengkap belum
 * terbukti menolak masukan tidak lengkap. Journey 28 Sep sudah menunjukkan satu penolakan palsu
 * (prasyarat), dan kali ini yang diuji adalah gerbang belajar + flag angka dari perintah.
 */
import { spawn, spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { createPublicClient, http, getAddress, parseAbi, keccak256, toBytes, encodeFunctionData } from 'viem'

import { loadFileEnvReport } from '../src/env.js'
import { freePort } from '../src/ports.js'
import { credentialHashOf } from '../src/credential.js'
import { manifestOf, rubricHashOf } from '../../web/src/manifest-keys.ts'
import { computeScore, formatScore } from '../../web/src/score.ts'
import { evidenceFromAttempts, lessonSlugs, formatEvidence } from '../src/fromAttempts.js'
import { resultDocument } from '../src/results.js'
import { attemptsFor, computeAttemptHash, courseGates, dbConfigured, dbMissingReason } from '../src/db.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const LIVE = process.argv.includes('--live')
const COURSE = 'web3-dasar-2026'

await loadFileEnvReport('verify:attempts')

let ran = 0
let fails = 0
function check (name, ok, detail = '') {
  ran += 1
  console.log(`  ${ok ? 'ok   ' : 'GAGAL'} ${name}${!ok ? ` -> ${String(detail).slice(0, 200)}` : ''}`)
  if (!ok) fails += 1
}
function head (t) { console.log(`\n— ${t}`) }
const nonce = () => Math.random().toString(16).slice(2).padEnd(18, '0').slice(0, 18)

/** Manifest palsu kecil supaya cabang-cabang sempit bisa dites tanpa menunggu kursus aslinya. */
function fakeManifest (overrides = {}) {
  return {
    course: {
      title: 'Kursus Uji', passMark: 70, validDays: 365,
      weights: { kuis: 40, esai: 30, praktik: 30 },
      modules: [
        { lessons: [{ slug: 'kuis-satu', kind: 'kuis' }, { slug: 'kuis-dua', kind: 'kuis' }] },
        { lessons: [{ slug: 'esai-satu', kind: 'esai' }] },
        { lessons: [{ slug: 'praktik-satu', kind: 'praktik' }] },
      ],
      ...overrides,
    },
  }
}
const comp = (item_id, score, weight, graded_by = 'mechanical') => ({ item_id, score, weight, graded_by })
const attempt = (o) => ({
  lesson_key: '-', kind: 'kuis', attempt_no: 1, score: 90, verdict: 'graded',
  rubric_hash: '0xrubric', attempt_hash: `0x${o?.kind ?? 'h'}-hash`, attempt_components: [], ...o,
})

/* ------------------------------------------------------------------ 1. pemetaan (offline) */
head('evidenceFromAttempts — tiga slot rubrik, satu jalan masuk')

const empty = evidenceFromAttempts(fakeManifest(), [])
check('tidak ada usaha -> ditolak, bukan angka 0', empty.ok === false && /no stored attempts/.test(empty.why), empty.why)

const noComp = evidenceFromAttempts(fakeManifest(), [attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_components: [] })])
check('kuis tanpa attempt_components DITOLAK (kolom score tidak boleh jadi masukan rubrik)',
  noComp.ok === false && /attempt_components/.test(noComp.why), noComp.why)

const full = evidenceFromAttempts(fakeManifest(), [
  attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_components: [comp('q1', 100, 50), comp('q2', 60, 50)] }),
  attempt({ kind: 'kuis', lesson_key: 'kuis-dua', attempt_components: [comp('q1', 80, 100)] }),
  attempt({ kind: 'esai', lesson_key: 'esai-satu', attempt_components: [comp('k1', 90, 10, 'model'), comp('k2', 70, 30, 'model')] }),
  // B121: praktik hanya terhitung kalau dinilai chain (komponen lahir dari POST /praktik)
  attempt({ kind: 'praktik', lesson_key: 'praktik-satu', attempt_components: [comp('eth-call:schemaUID', 100, 1, 'chain')] }),
])
check('kuis = rata-rata berbobot per lesson (100/50+60/50 -> 80; 80)',
  JSON.stringify(full.evidence.quizScores) === JSON.stringify([80, 80]), JSON.stringify(full.evidence.quizScores))
// (90*10 + 70*30) / 40 = 75
check('esai = rata-rata berbobot komponennya (75)', full.evidence.essayScore === 75, String(full.evidence.essayScore))
check('praktik = ada/tidaknya bukti yang dinilai', full.evidence.praktikCompleted === true)
check('setiap angka punya attempt_hash + item_id (bisa ditunjuk barisnya): 2+1 kuis, 2 esai, 1 praktik',
  full.provenance.length === 6 && full.provenance.every((p) => /^0x/.test(p.attemptHash ?? '') && p.itemId),
  `${full.provenance.length} -> ${JSON.stringify(full.provenance[0])}`)
check('provenan menyebut slot + metode rata-ratanya',
  full.provenance.every((p) => ['kuis', 'esai', 'praktik'].includes(p.slot) && p.rawMethod === 'weighted-mean'),
  JSON.stringify([...new Set(full.provenance.map((p) => `${p.slot}:${p.rawMethod}`))]))

const judgePreferred = evidenceFromAttempts(fakeManifest(), [
  attempt({ kind: 'esai', lesson_key: 'esai-satu', attempt_components: [comp('mech-wordcount', 20, 100, 'mechanical'), comp('k1', 100, 1, 'model')] }),
])
check('esai memakai komponen graded_by=model, bukan tanda mekanisnya',
  judgePreferred.evidence.essayScore === 100 && /graded_by model/.test(judgePreferred.notes.join(' ')),
  `${judgePreferred.evidence.essayScore} ${JSON.stringify(judgePreferred.notes)}`)

const ujian = evidenceFromAttempts(fakeManifest(), [
  attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_components: [comp('q1', 80, 1)] }),
  attempt({ kind: 'ujian', lesson_key: '-', attempt_components: [comp('x', 99, 1)] }),
])
check('usaha kind=ujian TIDAK masuk rubrik dan dilaporkan sebagai tak terslot (bukan dibuang diam-diam)',
  ujian.ok && ujian.unmapped.length === 1 && ujian.unmapped[0].kind === 'ujian' && ujian.unmapped[0].count === 1,
  JSON.stringify(ujian.unmapped))

const onlyUjian = evidenceFromAttempts(fakeManifest(), [attempt({ kind: 'ujian', lesson_key: '-', attempt_components: [comp('x', 99, 1)] })])
check('peserta yang cuma punya usaha tak terslot ditolak dengan sebab yang menyebut kind-nya',
  onlyUjian.ok === false && /ujian/.test(onlyUjian.why), onlyUjian.why)

const bestWins = evidenceFromAttempts(fakeManifest(), [
  attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_no: 1, score: 40, attempt_components: [comp('q1', 40, 1)] }),
  attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_no: 2, score: 90, attempt_components: [comp('q1', 90, 1)] }),
])
check('usaha terbaik yang dipakai, dan itu tercatat di provenan (attempt_no 2)',
  bestWins.provenance.length === 1 && bestWins.provenance[0].attemptNo === 2 && bestWins.evidence.quizScores[0] === 90,
  JSON.stringify(bestWins.provenance))

const ungraded = evidenceFromAttempts(fakeManifest(), [attempt({ kind: 'kuis', lesson_key: 'kuis-satu', verdict: 'incomplete', attempt_components: [comp('q1', 90, 1)] })])
check('usaha verdict=incomplete tidak dihitung (belum dinilai != nol)',
  ungraded.ok === false || ungraded.evidence.quizScores.length === 0, JSON.stringify(ungraded.evidence))

// B121 — praktik laporan peserta (bentuk baris yang dulu ditulis POST /attempts: komponen mekanis,
// verdict pass, angka 100 kiriman klien) tidak lagi mengisi slot praktik; dan itu tercatat, bukan diam.
const selfReported = evidenceFromAttempts(fakeManifest(), [
  attempt({ kind: 'kuis', lesson_key: 'kuis-satu', attempt_components: [comp('q1', 80, 1)] }),
  attempt({ kind: 'praktik', lesson_key: 'praktik-satu', score: 100, verdict: 'pass', attempt_components: [comp('build', 100, 1)] }),
])
check('praktik laporan peserta (komponen mekanis dari /attempts lama) TIDAK mengisi slot praktik, dan catatannya menyebut B121',
  selfReported.ok && selfReported.evidence.praktikCompleted === false && /B121/.test(selfReported.notes.join(' ')),
  JSON.stringify({ praktik: selfReported.evidence.praktikCompleted, notes: selfReported.notes }))

head('satu jalan masuk: bukti palsu -> computeScore, hasil harus sama dengan jalur CLI')
const ev = full.evidence
const viaAttempts = computeScore(fakeManifest(), ev)
const viaCli = computeScore(fakeManifest(), { quizScores: [80, 80], praktikCompleted: true, essayScore: 75 })
check('total dari rekaman == total dari angka yang sama di jalur CLI',
  viaAttempts.total === viaCli.total && viaAttempts.verdict === viaCli.verdict,
  `${formatScore(viaAttempts)} vs ${formatScore(viaCli)}`)
check('dan total itu LULUS terhadap ambang 70 manifest uji', viaAttempts.verdict === 'LULUS', formatScore(viaAttempts))

// Alamat reviewer untuk fixture: diturunkan, tidak diketik (B49). Lapis hitung-saja tidak memeriksa
// tanda tangan — itu tugas `verify:db` lewat HTTP — yang diuji di sini hanya aturan penurunan bukti.
const REVIEWER = privateKeyToAccount(keccak256(toBytes('lencana-b104-fixture-reviewer'))).address

head('manifest penerbit yang asli (web3-dasar-2026)')
const real = manifestOf(COURSE)
const slugs = lessonSlugs(real)
check(`lesson kuis/esai terbaca dari manifest asli (${slugs.kuis.length} kuis, ${slugs.esai.length} esai)`,
  slugs.kuis.length > 0 && slugs.esai.length > 0, JSON.stringify(slugs))
const lessonsTotal = real.course.modules.reduce((n, m) => n + m.lessons.length, 0)
const realRows = [
  ...slugs.kuis.map((slug, i) => attempt({
    kind: 'kuis', lesson_key: slug, score: 100,
    attempt_hash: `0xkuis${i}`, attempt_components: (real.course.modules.flatMap((m) => m.lessons).find((l) => l.slug === slug).quiz?.questions ?? [1, 2, 3]).map((_, j) => comp(`q${j + 1}`, 100, 1)),
  })),
  ...slugs.esai.map((slug, i) => attempt({
    kind: 'esai', lesson_key: slug, score: 92, attempt_hash: `0xesai${i}`,
    attempt_components: [comp('k1', 92, 25, 'model'), comp('k2', 92, 25, 'model')], judge_model: 'groq:test', judge_temp: 0,
    // B104: angka model hanya ikut kalau disahkan manusia — tanpa baris ini peserta "lengkap" ini ditolak.
    judgement_reviews: [{ decision: 'approved', reviewer: REVIEWER, proposed: 92, final_score: 92, judge_model: 'groq:test' }],
  })),
  attempt({ kind: 'praktik', lesson_key: slugs.praktik[0] ?? '-', score: 100, verdict: 'pass', attempt_hash: '0xpraktik', attempt_components: [comp('balance-wei', 100, 1, 'chain')] }),
]
const realEv = evidenceFromAttempts(real, realRows)
check('peserta lengkap pada manifest asli -> bukti lengkap, verdict LULUS',
  realEv.ok === true && computeScore(real, realEv.evidence).verdict === 'LULUS',
  realEv.ok ? formatScore(computeScore(real, realEv.evidence)) : realEv.why)
check('jumlah kuis yang dipetakan == jumlah lesson kuis manifest (tidak ada yang hilang diam-diam)',
  realEv.evidence.quizScores.length === slugs.kuis.length, `${realEv.evidence.quizScores.length} vs ${slugs.kuis.length}`)
check('baris satu kuis saja belum cukup: computeScore masih menuntut semuanya',
  computeScore(real, { ...realEv.evidence, quizScores: realEv.evidence.quizScores.slice(0, 1) }).verdict === 'BELUM_LENGKAP',
  formatScore(computeScore(real, { ...realEv.evidence, quizScores: [90] })))

head('esai yang dinilai penerbit: komponen disimpan sebagai PERSEN, bukan angka mentah 0..max (B81)')
/**
 * Jebakan yang diuji blok ini: rubrik esai penerbit berbentuk `{label, max}` dengan
 * max 25/25/25/15/10 = 100. Kalau `judgeEssay` menyimpan angka MENTAH ke `attempt_components.score`
 * (weight = max), rata-rata berbobot di mari menghasilkan 22 untuk karangan yang nilainya PENUH —
 * kertas tercetak sah dengan angka yang salah, dan tidak ada satu pun baris merah. Jadi bentuk
 * komponennya diuji dari dua sisi: 100% -> 100, 50% -> 50, dan `incomplete` tidak memberi angka.
 */
const essayRubric = real.course.modules.flatMap((mod) => mod.lessons).find((l) => l.essay?.rubric?.length).essay.rubric
check(`rubrik esai asli: ${essayRubric.length} kriteria, max ${essayRubric.map((r) => r.max).join('+')} = ${essayRubric.reduce((n, r) => n + r.max, 0)}`,
  essayRubric.reduce((n, r) => n + r.max, 0) === 100, JSON.stringify(essayRubric.map((r) => r.max)))

/**
 * Meniru PERSIS apa yang ditulis `judgeEssay()`: angka mentah 0..max dipangkas bulat dan dijepit ke
 * max, lalu yang disimpan adalah persennya dengan `weight = max`. Yang dibandingkan dua hal:
 *   - `total` yang akan masuk ke kolom `attempts.score`
 *   - `essayScore` yang diturunkan ulang `evidenceFromAttempts` dari komponennya
 * Kalau penulis dan pembaca tidak sepakat soal arti satu kolom, selisihnya muncul di sini — bukan di
 * kertas yang sudah terbit. Versi pertama pemeriksaan ini saya salah skala (menyimpan 2500), dan ia
   merah: bentuk ujinya yang keliru, bukan produknya — persis alasan pemeriksaan ini dituliskan.
 */
function essayPair (mult) {
  const raws = essayRubric.map((r) => Math.max(0, Math.min(Number(r.max), Math.round((Number(r.max) * mult) / 100))))
  const total = raws.reduce((n, v) => n + v, 0)
  const components = essayRubric.map((r, i) => ({
    item_id: `crit:${r.label}`,
    score: Math.round((raws[i] / Number(r.max)) * 10000) / 100,
    weight: Number(r.max), graded_by: 'model',
  }))
  return { total, components }
}
const pairFull = essayPair(100)
const essayFull = evidenceFromAttempts(real, [attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: pairFull.total, verdict: 'pass', attempt_hash: '0xessayfull',
  attempt_components: pairFull.components, judge_model: 'groq:llama-3.3-70b-versatile', judge_temp: 0,
  judgement_reviews: [{ decision: 'approved', reviewer: REVIEWER, proposed: pairFull.total, final_score: pairFull.total, judge_model: 'groq:llama-3.3-70b-versatile' }],
})])
check('esai dinilai penuh -> 100/100, dan hasil turunan sama dengan angka yang disimpan (BUKAN 22)',
  pairFull.total === 100 && essayFull.evidence.essayScore === 100,
  `tersimpan ${pairFull.total} · diturunkan ${essayFull.evidence.essayScore}`)
const pairHalf = essayPair(50)
const essayHalf = evidenceFromAttempts(real, [attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: pairHalf.total, verdict: 'fail', attempt_hash: '0xessayhalf',
  attempt_components: pairHalf.components,
})])
check('esai setengah rubrik -> penulis dan pembaca sepakat dalam batas pembulatan (<= 2 poin)',
  Math.abs(essayHalf.evidence.essayScore - pairHalf.total) <= 2 && essayHalf.evidence.essayScore > 40 && essayHalf.evidence.essayScore < 60,
  `tersimpan ${pairHalf.total} · diturunkan ${essayHalf.evidence.essayScore}`)
const pairLow = essayPair(20)
const essayLow = evidenceFromAttempts(real, [attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: pairLow.total, verdict: 'fail', attempt_hash: '0xessailow',
  attempt_components: pairLow.components,
})])
check('esai jelek (20%) tidak dibuat terlihat sedang baik oleh normalisasi',
  Math.abs(essayLow.evidence.essayScore - pairLow.total) <= 2, `tersimpan ${pairLow.total} · diturunkan ${essayLow.evidence.essayScore}`)
const essayQueued = evidenceFromAttempts(real, [attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: null, verdict: 'incomplete', attempt_hash: '0xessayraw',
  attempt_components: [{ item_id: 'mech:panjang tulisan', score: 100, weight: 0, graded_by: 'mechanical' }],
})])
check('esai yang masih di antrean tidak ikut memberi angka (incomplete disaring, mekanis saja tidak cukup)',
  essayQueued.evidence.essayScore === null && computeScore(real, essayQueued.evidence).verdict === 'BELUM_LENGKAP',
  JSON.stringify({ esai: essayQueued.evidence.essayScore, verdict: computeScore(real, essayQueued.evidence).verdict }))
check('penilai tercatat di provenan: model siapa, suhu berapa, dari hash usaha mana',
  essayFull.judges.length === 1 && essayFull.judges[0].model === 'groq:llama-3.3-70b-versatile'
  && essayFull.judges[0].attemptHash === '0xessayfull', JSON.stringify(essayFull.judges))

head('AI menilai -> manusia mengesahkan -> penerbit menerbitkan (B104)')
/**
 * Rantai yang dipilih builder. Yang dijaga: `graded_by='model'` yang ditandatangani penerbit TIDAK
 * cukup untuk menerbitkan; dan kalau reviewer menyesuaikan, angka yang sampai ke kertas adalah angka
 * reviewer. Komponen `adjusted` ditulis persis seperti `reviewEssay()` menulisnya (graded_by human).
 */
const modelOnly = (extra = {}) => attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: pairFull.total, verdict: 'pass', attempt_hash: '0xessaymodel',
  attempt_components: pairFull.components, judge_model: 'groq:llama-3.3-70b-versatile', judge_temp: 0, ...extra,
})
const noReview = evidenceFromAttempts(real, [modelOnly()])
check('usulan model TANPA pengesahan -> jangan terbit: penurunan bukti ditolak dan menyebut sebabnya',
  noReview.ok === false && /has no human review/.test(noReview.why ?? '') && noReview.evidence.essayScore === null, JSON.stringify(noReview.why ?? noReview.evidence))
const rejectedReview = evidenceFromAttempts(real, [modelOnly({ judgement_reviews: [{ decision: 'rejected', reviewer: REVIEWER, proposed: pairFull.total, final_score: null }] })])
check('pengesahan "rejected" juga tidak menerbitkan (ditolak reviewer != dinilai nol)',
  rejectedReview.ok === false && /"rejected"/.test(rejectedReview.why ?? ''), JSON.stringify(rejectedReview.why ?? rejectedReview.evidence))
const notSkipped = evidenceFromAttempts(real, [
  attempt({ kind: 'esai', lesson_key: slugs.esai[0], attempt_no: 1, score: pairHalf.total, verdict: 'fail', attempt_hash: '0xessayold', attempt_components: pairHalf.components.map((c) => ({ ...c, graded_by: 'human' })) }),
  modelOnly({ attempt_no: 2 }),
])
check('usaha terbaik yang belum disahkan TIDAK diam-diam diganti usaha lama yang lebih jelek',
  notSkipped.ok === false && /has no human review/.test(notSkipped.why ?? ''), JSON.stringify(notSkipped.why ?? notSkipped.evidence))
const adjustedPair = essayPair(60)
const adjustedEv = evidenceFromAttempts(real, [modelOnly({
  score: adjustedPair.total, attempt_hash: '0xessayadjusted',
  attempt_components: adjustedPair.components.map((c) => ({ ...c, graded_by: 'human' })),
  judgement_reviews: [{ decision: 'adjusted', reviewer: REVIEWER, proposed: pairFull.total, final_score: adjustedPair.total, judge_model: 'groq:llama-3.3-70b-versatile' }],
})])
check(`adjusted -> angka yang diturunkan adalah angka reviewer (${adjustedPair.total}), bukan angka model (${pairFull.total})`,
  adjustedEv.ok === true && Math.abs(adjustedEv.evidence.essayScore - adjustedPair.total) <= 2 && adjustedEv.evidence.essayScore !== pairFull.total
  && adjustedEv.provenance.every((p) => p.gradedBy === 'human'), JSON.stringify(adjustedEv.evidence ?? adjustedEv.why))
check('pengesahan tercatat di provenan: reviewer, keputusan, usulan model, angka akhir',
  adjustedEv.reviews?.length === 1 && adjustedEv.reviews[0].reviewer === REVIEWER && adjustedEv.reviews[0].decision === 'adjusted'
  && adjustedEv.reviews[0].proposed === pairFull.total && adjustedEv.reviews[0].finalScore === adjustedPair.total, JSON.stringify(adjustedEv.reviews))
const humanOnly = evidenceFromAttempts(real, [attempt({
  kind: 'esai', lesson_key: slugs.esai[0], score: pairFull.total, verdict: 'pass', attempt_hash: '0xessayhuman',
  attempt_components: pairFull.components.map((c) => ({ ...c, graded_by: 'human' })),
})])
check('esai yang dinilai penerbit tanpa model tidak butuh pengesahan kedua (tidak ada usulan model untuk disahkan)',
  humanOnly.ok === true && humanOnly.evidence.essayScore === pairFull.total && humanOnly.reviews.length === 0, JSON.stringify(humanOnly.evidence ?? humanOnly.why))
const reviewedDoc = resultDocument({ baseUrl: 'https://example', record: {
  course: COURSE, credentialHash: `0x${'ab'.repeat(32)}`, uid: `0x${'cd'.repeat(32)}`, learner: REVIEWER, score: 60, verdict: 'LULUS',
  rubricRef: 'x', rubricHash: '0x00', issuer: 'x', evidence: adjustedEv.evidence, essayGrading: null, document: {}, signedAt: '2026-09-30T00:00:00.000Z',
  attempts: { source: 'postgres:attempts', used: adjustedEv.used, components: adjustedEv.provenance, judges: adjustedEv.judges, reviews: adjustedEv.reviews, notes: adjustedEv.notes, attemptHashes: ['0xessayadjusted'] },
} })
check('dokumen hasil menyebut pengesahan manusianya (siapa, keputusan) — bukan hanya nama model',
  reviewedDoc.attempts.reviews?.[0]?.reviewer === REVIEWER && reviewedDoc.method.includes(`adjusted oleh ${REVIEWER}`), reviewedDoc.method)

head('dokumen hasil memuat alamat aslinya (B62)')
const record = {
  course: COURSE, credentialHash: `0x${'ab'.repeat(32)}`, uid: `0x${'cd'.repeat(32)}`,
  learner: getAddress('0x0000000000000000000000000000000000000020'), score: 92, verdict: 'LULUS',
  rubricRef: '2a45d00bc4', rubricHash: '0x2a45d00bc4ffff', issuer: 'Yayasan Nusantara',
  evidence: { quizScores: [100, 100], praktikCompleted: true, essayScore: 92 },
  essayGrading: null, document: {}, signedAt: '2026-09-28T00:00:00.000Z',
  attempts: {
    source: 'postgres:attempts', gates: { lessonsTotal: 19, lessonsCompleted: 19, allLessonsDone: true, gradedAttempts: 3, bestScore: 92, passMark: real.course.passMark },
    storedRows: realRows.length, attemptHashes: ['0xkuis0', '0xesai0', '0xpraktik'],
    used: realEv.used, components: realEv.provenance, unmapped: [], judges: realEv.judges, notes: realEv.notes,
  },
}
const rd = resultDocument({ baseUrl: 'https://example', record })
const rdJson = JSON.stringify(rd)
check('blok attempts menyebut attempt_hash yang sama dengan yang di kertas',
  rd.attempts.attemptHashes.includes('0xkuis0') && rd.method.includes('0xkuis0'), rd.method)
check('blok attempts menyebut kedua gerbang (selesai + ambang)',
  rd.attempts.gates.allLessonsDone === true && rd.attempts.gates.passMark === real.course.passMark, JSON.stringify(rd.attempts.gates))
check('setiap komponen punya item_id + graded_by (rincian, bukan cuma angka akhir)',
  rd.attempts.components.length > 0 && rd.attempts.components.every((c) => c.itemId && c.gradedBy))
check('sumber angka tertulis eksplisit (postgres, bukan tebakan pembaca)', rd.attempts.source === 'postgres:attempts')
check('tidak ada "[object Object]" yang bocor ke dokumen hasil', !rdJson.includes('[object Object]'))
check('paper jalur CLI lama tetap terbaca dan mengaku cli-flags',
  resultDocument({ baseUrl: 'https://example', record: { ...record, attempts: { source: 'cli-flags' } } }).attempts.source === 'cli-flags')
check('rekaman lama TANPA blok attempts sama sekali tidak menghasilkan JSON rusak',
  (() => { const r = { ...record }; delete r.attempts; const d = resultDocument({ baseUrl: 'https://example', record: r }); return d.attempts.source === 'cli-flags' && d.attempts.attemptHashes.length === 0 })())

/* ------------------------------------------------------------------ 2. lapis live */
if (!LIVE) {
  console.log(`\n${ran} pemeriksaan / ${fails} gagal — lapis HITUNG-SAJA saja.`)
  console.log('tambah --live untuk enrollment+progres+usaha di Postgres dan SATU issue --from-attempts di chain 97 (biaya gas nyata).')
  process.exitCode = fails === 0 ? 0 : 1
} else {
  await live()
}

async function live () {
  head('lapis LIVE: peserta uji, rekaman belajar, lalu satu kertas dari rekaman itu')
  if (!dbConfigured()) {
    console.error(`verify:attempts --live berhenti: ${dbMissingReason()}`)
    process.exit(2)
  }
  const env = process.env
  for (const k of ['RPC_URL', 'RESOLVER_ADDRESS', 'ISSUER_PRIVATE_KEY', 'DEPLOYER_PRIVATE_KEY']) {
    if (!env[k]) { console.error(`${k} belum diisi — lapis live tidak bisa berjalan`); process.exit(2) }
  }
  /**
   * D47/B51 ditegakkan di sini, bukan cuma ditulis di vault. Run pertama lapis ini menerbitkan di
   * bawah `http://127.0.0.1:8787` (BASE_URL bawaan `issue.js`): kertasnya sah di chain, uid-nya
   * terbaca, dan `id` di dalamnya menunjuk mesin saya — persis keadaan yang aturan itu larang, dan
   * kertas itu harus dicabut setelahnya (0x8276e8a7…, direvoke 28 Sep). Maka sekarang: tanpa host
   * publik yang permanen, tidak ada transaksi yang bergerak.
   */
  const EDGE = (env.EDGE_BASE_URL ?? '').replace(/\/$/, '')
  if (!EDGE || !/^https:\/\//.test(EDGE)) {
    console.error('EDGE_BASE_URL (https) belum diisi — tidak menerbitkan sesuatu yang tidak bisa dibaca siapa pun (D47/B51)')
    process.exit(2)
  }
  if (!env.CLOUDFLARE_API_TOKEN || !env.CLOUDFLARE_ACCOUNT_ID) {
    console.error('CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID belum diisi — publish:edge tidak bisa jalan, dan kertas tanpa tempat tinggal adalah kegagalan yang pernah kita catat')
    process.exit(2)
  }
  console.log(`  host kertas: ${EDGE} (agen ${env.AGENT_SLUG ?? 'agent-edge'})`)
  const client = createPublicClient({ transport: http(env.RPC_URL) })
  const RESOLVER = getAddress(env.RESOLVER_ADDRESS)
  const ATTEST_OF = parseAbi(['function attestationOf(bytes32) view returns (bytes32)'])
  const EMPTY = `0x${'00'.repeat(32)}`

  const learner = privateKeyToAccount(generatePrivateKey())
  console.log(`  peserta uji: ${learner.address}`)
  const sign = async (message) => ({ message, signature: await learner.signMessage({ message }) })
  const issueArgs = (extra) => runNpm('issue', ['--course', COURSE, '--from-attempts', '--learner', learner.address, ...extra], { BASE_URL: EDGE, AGENT_SLUG: 'agent-edge' })
  /**
   * Penolakan karena *pemanggilan saya* salah (baris usage) bukan bukti apa pun. Run pertama lapis
   * ini menghasilkan tujuh baris merah justru karena itu: `--learner` lupa dikirim, dan dua
   * pemeriksaan "ditolak" malah hijau karena alasan yang salah. Maka setiap pemeriksaan penolakan
   * di bawah wajib menegaskan ia bukan kegagalan usage.
   */
  const notUsage = (out) => !/pakai: npm run issue/.test(out)
  const lessons = real.course.modules.flatMap((m) => m.lessons)
  const total = lessons.length

  // — a. LEWAT HTTP, lewat server yang sama yang akan dipakai halaman belajar.
  // Sengaja bukan `db.js` dipanggil langsung: yang harus dibuktikan adalah alur peserta
  // (browser → POST → Postgres → issue → dokumen), dan memanggil fungsi dalam proses akan
  // melewatkan persis bagian yang paling sering patah — rute, status kode, dan bentuk kiriman.
  /**
   * Cari port yang BENAR-BENAR kosong, jangan pakai angka tetap.
   *
   * Run kedua lapis ini mati di tengah-tengah pada 29 Sep: port 8795 masih dipegang server yatim
   * dari run pertama yang baris `taskkill`-nya tidak sempat merapikan anak terakhir, jadi dua
   * proses berebut satu port dan `POST /progress` saya menjawab timeout. Selama harness memakai
   * port tetap, kegagalannya akan selalu terlihat seperti bug produk. (Pelajaran B86, dipakai.)
   *
   * Koreksi 1 Okt (B121): versi di sini menganggap port kosong kalau `/healthz` tidak menjawab dalam
   * 700 ms — padahal `/healthz` membaca chain. Server yatim 30 Sep di 8795 terbaca "kosong", server
   * baru gagal bind tanpa suara, dan lapis HTTP berbicara dengan kode lama (7 merah palsu). Sekarang
   * port diuji dengan bind (`src/ports.js`).
   */
  const PORT = Number(process.env.ATTEMPTS_PROBE_PORT ?? await freePort(8795))
  const BASE = `http://127.0.0.1:${PORT}`
  const child = spawn('npm', ['run', 'serve'], {
    cwd: resolve(HERE, '..'), env: { ...process.env, PORT: String(PORT), BASE_URL: BASE, LANCENA_ORIGIN: 'test' }, stdio: ['ignore', 'pipe', 'pipe'], shell: true,
  })
  let serverLog = ''
  child.stdout?.on('data', (d) => { serverLog += d.toString() })
  child.stderr?.on('data', (d) => { serverLog += d.toString() })
  async function waitUp (tries = 40) {
    for (let i = 0; i < tries; i++) {
      try {
        // /healthz membaca chain untuk tiap hash yang diawasi — jangan memberi 2 detik lalu
        // menyerah (pelajaran run 28 Sep: "server tidak naik" sebenarnya "aku tidak sabar").
        const r = await fetch(`${BASE}/healthz`, { signal: AbortSignal.timeout(30_000) })
        if (r.ok) return true
      } catch { /* belum naik */ }
      await new Promise((res) => setTimeout(res, 1500))
    }
    return false
  }
  const up = await waitUp()
  check(`server signer naik di ${BASE} (lapis HTTP)`, up, serverLog.split('\n').slice(-3).join(' | '))
  /**
   * POST dengan satu percobaan ulang.
   *
   * Alasan yang mengubah bentuk kode: run 29 Sep mati di tengah `post('/progress')` karena satu
   * `TimeoutError` — dan harness yang melempar tidak melaporkan apa pun, ia hanya berhenti. Sisa
   * pemeriksaan tidak jalan, ringkasan tidak tercetak, dan "exit 1" tidak bisa dibedakan dari
   * "produk gagal". Sekarang kegagalan jaringan jadi baris MERAH (`status: 0`) setelah satu kali
   * coba lagi: pemeriksaannya tetap jujur (ia menuntut 200/201), hanya saja laporan akhirnya utuh.
   */
  async function post (path, body) {
    for (let tries = 0; tries < 2; tries++) {
      try {
        const r = await fetch(BASE + path, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
          signal: AbortSignal.timeout(60_000),
        })
        let j = null
        try { j = await r.json() } catch { /* bukan JSON */ }
        return { status: r.status, body: j }
      } catch (e) {
        if (tries === 1) {
          console.log(`      (percobaan kedua tetap gagal: ${String(e?.message ?? e).slice(0, 70)})`)
          return { status: 0, body: { error: String(e?.message ?? e) } }
        }
        console.log(`      (percobaan pertama ${path} gagal: ${String(e?.message ?? e).slice(0, 60)} — mengulang sekali)`)
        await new Promise((res) => setTimeout(res, 3000))
      }
    }
    return { status: 0, body: { error: 'tidak teraih' } }
  }
  async function getJson (path) {
    const r = await fetch(BASE + path, { signal: AbortSignal.timeout(30_000) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }

  if (!up) {
    console.log('  · lapis HTTP tidak dijalankan karena servernya tidak naik')
    check('sisa pemeriksaan lapis HTTP dapat dijalankan', false, 'server tidak naik — bukan hijau, memang gagal')
    child.kill()
    console.log(`\n${ran} pemeriksaan / ${fails} gagal`)
    process.exit(1)
  }

  const firstEnroll = await post('/enroll', { learner: learner.address, course: COURSE, ...await sign(`lencana-enroll ${COURSE} nonce=${nonce()}`) })
  check('POST /enroll (kiriman klien, TANPA lessons_total) -> 200 dan baris dibuat',
    firstEnroll.status === 200 && firstEnroll.body?.created === true, `${firstEnroll.status} ${JSON.stringify(firstEnroll.body)}`)

  // — b. penolakan 1: gerbang belajar belum lewat, dan tidak ada gas yang bergerak
  const gatesBefore = await courseGates(learner.address, COURSE)
  check(`sebelum ada progres, all_lessons_done bukan true (${gatesBefore?.all_lessons_done})`, gatesBefore?.all_lessons_done !== true, JSON.stringify(gatesBefore))
  const early = await issueArgs([])
  check('issue --from-attempts DITOLAK sebelum gerbang selesai (exit != 0, dan bukan karena pemanggilannya salah)',
    early.status !== 0 && notUsage(early.out), `exit ${early.status} :: ${early.out.split('\n').slice(-3).join(' | ')}`)
  check('penolakannya menyebut gerbang, bukan hal lain',
    /gerbang|all_lessons_done|enrollment/i.test(early.out), early.out.split('\n').slice(-3).join(' | '))
  const hashBefore = await client.readContract({ address: RESOLVER, abi: ATTEST_OF, functionName: 'attestationOf', args: [credentialHashFor(learner.address)] })
  check('tidak ada attestation baru yang tercipta oleh penolakan ini', hashBefore === EMPTY, hashBefore)

  // — c. penolakan 2: satu angka tidak boleh punya dua jalan masuk
  const clash = await issueArgs(['--quiz', '90,90', '--essay-score', '90'])
  check('--from-attempts + --quiz DITOLAK sebelum apa pun dibaca (exit 2, sebab: dua jalan masuk)',
    clash.status === 2 && /dua jalan masuk/.test(clash.out) && notUsage(clash.out), `exit ${clash.status} :: ${clash.out.split('\n').slice(-3).join(' | ')}`)

  // — d. rekaman belajar lewat POST /progress: mesin state dilalui, bukan diloncati
  const jumpEarly = await post('/progress', {
    learner: learner.address, course: COURSE, lesson: lessons[0].slug, status: 'completed', position: 0,
    ...await sign(`lencana-progress ${lessons[0].slug} -> completed nonce=${nonce()}`),
  })
  check('POST /progress lompat locked -> completed ditolak 422 lewat HTTP',
    jumpEarly.status === 422 && /not allowed/.test(jumpEarly.body?.error ?? ''), `${jumpEarly.status} ${JSON.stringify(jumpEarly.body)}`)
  let walkFails = 0
  for (const l of lessons) {
    for (const to of ['unlocked', 'started', 'completed']) {
      const r = await post('/progress', {
        learner: learner.address, course: COURSE, lesson: l.slug, status: to, position: lessons.indexOf(l),
        ...await sign(`lencana-progress ${l.slug} -> ${to} nonce=${nonce()}`),
      })
      if (r.status !== 200) { walkFails += 1; console.log(`      GAGAL ${l.slug} -> ${to}: ${r.status} ${JSON.stringify(r.body).slice(0, 90)}`) }
    }
  }
  check(`19 lesson × 3 langkah lewat HTTP diterima semua (${lessons.length * 3} POST)`, walkFails === 0, `${walkFails} ditolak`)
  const gatesDone = await courseGates(learner.address, COURSE)
  check(`semua lesson selesai: ${gatesDone?.lessons_completed}/${gatesDone?.lessons_total}, all_lessons_done=${gatesDone?.all_lessons_done}`,
    gatesDone?.all_lessons_done === true, JSON.stringify(gatesDone))
  const sumHttp = await getJson(`/progress?learner=${learner.address}&course=${COURSE}`)
  check(`penyebut "selesai" dihitung server dari katalog (${sumHttp.body?.lessonsTotal} = ${total} lesson manifest)`,
    sumHttp.body?.lessonsTotal === total && sumHttp.body?.allLessonsDone === true, JSON.stringify(sumHttp.body).slice(0, 120))

  // — e. usaha per slot rubrik. KUIS lewat POST /grade (server yang menilai), esai + praktik lewat
  // POST /attempts — dan itu bukan kelalaian: satu-satunya tempat angka yang masih boleh datang
  // dari klien adalah tempat penerbit memang belum punya penilai otomatis (B81, antrean penilaian).
  // Rubrik yang sama dengan yang dipaku ke kertas: kalau ini beda, `attempt_hash` yang tersimpan
  // bukan alamat dari angka yang tercetak — dan itu justru klaim yang sedang kita jual.
  const rubricHash = rubricHashOf(real)
  for (const slug of slugs.kuis) {
    const q = lessons.find((l) => l.slug === slug).quiz
    // Peserta uji menjawab BENAR semua (kunci dibaca dari manifest di proses tes). Ini bukan
    // pernyataan bahwa kuis tidak bisa dicurangi — kunci memang ada di bundel browser; yang diuji
    // adalah bahwa ANGKA-nya dihitung server, bukan dilaporkan klien.
    const picks = (q?.questions ?? []).map((qq) => ({ itemId: qq.id, choice: qq.answer }))
    const r = await post('/grade', {
      learner: learner.address, course: COURSE, lesson: slug, picks,
      ...await sign(`lencana-grade ${COURSE} ${slug} nonce=${nonce()}`),
    })
    if (r.status !== 201 || r.body?.score !== 100) {
      check(`usaha kuis ${slug} dinilai server = 100`, false, `${r.status} ${JSON.stringify(r.body).slice(0, 120)}`)
    }
  }
  /**
   * Esai lewat jalur B81, bukan `/attempts`: peserta mengirim TEKS (skor tetap NULL, verdict
   * `incomplete`), lalu ANGKA-nya masuk dengan tanda tangan EOA penerbit. Ini bagian yang membuat
   * kalimat "tidak ada angka yang dilaporkan oleh yang dinilai" berlaku untuk dua dari tiga mata
   * penilaian, bukan satu.
   */
  const issuerAcct = env.ISSUER_PRIVATE_KEY ? privateKeyToAccount(env.ISSUER_PRIVATE_KEY) : null
  check('kunci penerbit tersedia untuk jalur penilaian (tanpa ini esai tidak bisa dinilai lewat HTTP)',
    issuerAcct !== null, 'ISSUER_PRIVATE_KEY kosong')
  const essayLesson = lessons.find((l) => l.essay?.rubric?.length)
  const essayRubric = essayLesson?.essay?.rubric ?? []
  // Reviewer run live diturunkan dari label (B49): alamatnya ikut tercetak di dokumen hasil kertas
  // yang terbit, jadi asal-usulnya harus bisa dihitung ulang. Penunjukannya TIDAK dibuang sesudah run.
  const liveReviewer = privateKeyToAccount(keccak256(toBytes('lencana-b104-live-reviewer')))
  const LIVE_JUDGE_MODEL = 'harness:proposal-80pct'
  let liveReview = null
  const filler = Array.from({ length: 430 }, (_, i) => `kata${i}`).join(' ')
  const essayText = `Karangan uji ini menyebut alamat 0x1234abcd5678ef90 dan fungsi attestationOf lewat https://docs.bnbchain.org/bnb-smart-chain/developer/rpc/ ; sisanya tidak bisa saya simpulkan dari data publik.` + ' ' + filler
  for (const slug of slugs.esai) {
    const gatesPre = await courseGates(learner.address, COURSE)
    const sub = await post('/essay', {
      learner: learner.address, course: COURSE, lesson: slug, text: essayText,
      ...await sign(`lencana-essay ${slug} nonce=${nonce()}`),
    })
    check(`POST /essay ${slug} -> 201 awaiting_judge, skor NULL, verdict incomplete`,
      sub.status === 201 && sub.body?.state === 'awaiting_judge' && sub.body?.score === null
      && sub.body?.verdict === 'incomplete' && Number(sub.body?.mechanicalPassed) >= 1,
      `${sub.status} ${JSON.stringify(sub.body).slice(0, 140)}`)
    const gatesQueued = await courseGates(learner.address, COURSE)
    check('esai di antrean belum menggerakkan gerbang apa pun (ungraded ≠ 0)',
      Number(gatesQueued?.graded_attempts) === Number(gatesPre?.graded_attempts)
      && String(gatesQueued?.best_score) === String(gatesPre?.best_score),
      JSON.stringify({ sebelum: gatesPre?.graded_attempts, sekarang: gatesQueued?.graded_attempts }))
    const rawRejected = await post('/essay', {
      learner: learner.address, course: COURSE, lesson: slug, text: essayText, score: 92,
      ...await sign(`lencana-essay ${slug} nonce=${nonce()}`),
    })
    check('/essay menolak skor kiriman klien di jalur live juga', rawRejected.status === 400,
      `${rawRejected.status} ${JSON.stringify(rawRejected.body).slice(0, 90)}`)
    if (issuerAcct && essayRubric.length) {
      const preHash = String(sub.body?.attemptHash ?? '')
      const msg = `lencana-essay-judge ${preHash} nonce=${nonce()}`
      /**
       * B104 — rantai tiga lapis, dijalankan UTUH sampai ke kertas: model mengusulkan (ditandatangani
       * penerbit) -> penerbitan DITOLAK -> penerbit menunjuk reviewer -> reviewer menyesuaikan angka ->
       * baru penerbitan jalan. Sampai 30 Sep jalur ini dinilai penerbit tanpa model, jadi run live
       * tidak pernah melewati pengesahan sama sekali.
       */
      const attemptId = Number(sub.body?.attemptId)
      const proposedScores = essayRubric.map((r) => ({ label: r.label, score: Math.round(Number(r.max) * 0.8) }))
      const proposedTotal = proposedScores.reduce((n, s) => n + s.score, 0)
      const jud = await post('/essay/judgement', {
        issuer: issuerAcct.address, course: COURSE, lesson: slug, attemptId,
        scores: proposedScores, judgeModel: LIVE_JUDGE_MODEL, judgeTemp: 0,
        message: msg, signature: await issuerAcct.signMessage({ message: msg }),
      })
      check(`usulan MODEL ditandatangani penerbit -> 200, skor ${jud.body?.score}, needsReview=${jud.body?.needsReview}`,
        jud.status === 200 && Number(jud.body?.score) === proposedTotal && jud.body?.needsReview === true
        && jud.body?.replacedHash === preHash && jud.body?.attemptHash !== preHash,
        `${jud.status} ${JSON.stringify(jud.body).slice(0, 150)}`)
      const gatesProposed = await courseGates(learner.address, COURSE)
      check('angka model tanpa pengesahan TIDAK menggerakkan gerbang',
        Number(gatesProposed?.graded_attempts) === Number(gatesQueued?.graded_attempts),
        JSON.stringify({ antre: gatesQueued?.graded_attempts, usulan: gatesProposed?.graded_attempts }))
      const blocked = await issueArgs([])
      check('issue --from-attempts DITOLAK karena esai bernilai model belum disahkan manusia (bukan karena pemanggilan salah)',
        blocked.status !== 0 && /has no human review/.test(blocked.out) && notUsage(blocked.out),
        `exit ${blocked.status} :: ${blocked.out.split('\n').slice(-3).join(' | ')}`)
      const stillNone = await client.readContract({ address: RESOLVER, abi: ATTEST_OF, functionName: 'attestationOf', args: [credentialHashFor(learner.address)] })
      check('dan penolakan itu terjadi SEBELUM gas: tidak ada attestation untuk peserta ini', stillNone === EMPTY, stillNone)

      const roleMsg = `lencana-review-role course=${COURSE} reviewer=${liveReviewer.address.toLowerCase()} nonce=${nonce()}`
      const role = await post('/essay/reviewers', {
        issuer: issuerAcct.address, course: COURSE, reviewer: liveReviewer.address,
        message: roleMsg, signature: await issuerAcct.signMessage({ message: roleMsg }),
      })
      check(`penerbit menunjuk reviewer ${liveReviewer.address.slice(0, 10)}… -> 200`, role.status === 200 && role.body?.reviewer === liveReviewer.address,
        `${role.status} ${JSON.stringify(role.body).slice(0, 120)}`)
      const finalScores = essayRubric.map((r) => ({ label: r.label, score: r.max }))
      const finalTotal = finalScores.reduce((n, s) => n + Number(s.score), 0)
      const revMsg = `lencana-essay-review attempt=${attemptId} decision=adjusted final=${finalTotal} nonce=${nonce()}`
      const rev = await post('/essay/review', {
        reviewer: liveReviewer.address, course: COURSE, lesson: slug, attemptId, decision: 'adjusted', scores: finalScores,
        message: revMsg, signature: await liveReviewer.signMessage({ message: revMsg }),
      })
      check(`reviewer mengesahkan dengan penyesuaian -> 200: usulan ${rev.body?.proposed} -> akhir ${rev.body?.finalScore}`,
        rev.status === 200 && Number(rev.body?.proposed) === proposedTotal && Number(rev.body?.finalScore) === finalTotal && rev.body?.verdict === 'pass',
        `${rev.status} ${JSON.stringify(rev.body).slice(0, 170)}`)
      liveReview = { proposed: proposedTotal, final: finalTotal }
      const gatesGraded = await courseGates(learner.address, COURSE)
      check('setelah disahkan manusia, usaha esai ikut terbaca gerbang',
        Number(gatesGraded?.graded_attempts) === Number(gatesQueued?.graded_attempts) + 1
        && Number(gatesGraded?.best_score) === 100,
        JSON.stringify({ graded: gatesGraded?.graded_attempts, best: gatesGraded?.best_score }))
    }
  }
  // B121: praktik tidak lagi lewat /attempts (yang menerima angka peserta) — peserta menjalankan
  // tiga `eth_call` lesson "praktik-eth-call" seperti `cast call`, mengirim keluarannya mentah, dan
  // server membaca ulang chain 97. Calldata dibangun di sini dengan ABI sendiri, bukan meminjam
  // fungsi pemeriksa server, supaya yang diuji memang dua pembacaan yang independen.
  const oldPath = await post('/attempts', {
    learner: learner.address, course: COURSE, lesson: slugs.praktik[0], kind: 'praktik', attempt: 1,
    score: 100, verdict: 'pass', rubricHash, components: [{ itemId: 'build', score: 100, weight: 1, gradedBy: 'mechanical' }],
    ...await sign(`lencana-attempt ${COURSE} ${slugs.praktik[0]} nonce=${nonce()}`),
  })
  check('jalur lama POST /attempts untuk praktik -> 400 (angka praktik kiriman peserta ditolak, B121)',
    oldPath.status === 400 && /POST \/praktik/.test(oldPath.body?.error ?? ''), `${oldPath.status} ${JSON.stringify(oldPath.body).slice(0, 120)}`)
  const praktikSlug = 'praktik-eth-call'
  const proofSpec = lessons.find((l) => l.slug === praktikSlug)?.proof
  const results = {}
  for (const r of proofSpec?.reads ?? []) {
    const { data } = await client.call({ to: r.to, data: encodeFunctionData({ abi: parseAbi([`function ${r.signature}`]), functionName: r.signature.slice(0, r.signature.indexOf('(')), args: r.args }) })
    results[r.id] = data
  }
  const pr = await post('/praktik', {
    learner: learner.address, course: COURSE, lesson: praktikSlug, answers: { results },
    ...await sign(`lencana-praktik-submit course=${COURSE} lesson=${praktikSlug} nonce=${nonce()}`),
  })
  check(`usaha praktik tercatat lewat HTTP, dinilai chain (POST /praktik ${praktikSlug} -> 201, ${pr.body?.checks?.length ?? 0} pemeriksaan cocok)`,
    pr.status === 201 && /^0x[0-9a-f]{64}$/.test(pr.body?.attemptHash ?? '') && pr.body?.gradedBy === 'chain' && pr.body?.verdict === 'pass',
    `${pr.status} ${JSON.stringify(pr.body).slice(0, 160)}`)

  // — f. hash yang dihitung ulang dari barisnya: yang masuk dokumen harus yang bisa direproduksi
  const rows = await attemptsFor(learner.address, COURSE)
  const first = rows.find((r) => r.kind === 'esai') ?? rows[0]
  const recomputed = computeAttemptHash({
    learner: learner.address, courseId: COURSE, lessonKey: first.lesson_key, kind: first.kind,
    attemptNo: first.attempt_no, score: Number(first.score), rubricHash: first.rubric_hash,
  })
  check('attempt_hash terbaca == hasil hitung ulang dari barisnya', recomputed === first.attempt_hash, `${recomputed} vs ${first.attempt_hash}`)
  const quizRows = rows.filter((r) => r.kind === 'kuis')
  check(`setiap kuis yang dinilai server tersimpan dengan komponen per soal (${quizRows.length} kuis)`,
    quizRows.length === slugs.kuis.length && quizRows.every((r) => (r.attempt_components?.length ?? 0) > 0),
    `${quizRows.length}/${slugs.kuis.length} · komponen ${quizRows.map((r) => r.attempt_components?.length).join(',')}`)
  check('tak ada usaha yang masuk rubrik tanpa rubricHash penerbit',
    rows.every((r) => (r.rubric_hash ?? '') === rubricHash), rows.map((r) => r.rubric_hash?.slice(0, 10)).join(','))

  // — g. satu kertas terbit dari rekaman
  const issued = await issueArgs([])
  check('issue --from-attempts selesai (exit 0)', issued.status === 0, issued.out.split('\n').slice(-6).join(' | '))
  const uidLine = /attestation\s*:\s*(0x[0-9a-f]{64})/.exec(issued.out)?.[1] ?? null
  const docLine = /dokumen\s*:\s*(\S+)/.exec(issued.out)?.[1] ?? null
  check('attestation tercetak (atau sudah ada dari run sebelumnya)', uidLine !== null || /sudah ada/.test(issued.out), issued.out.slice(-200))
  check('log menyebut kedua gerbang dan jumlah rekamannya',
    /gerbang 1/.test(issued.out) && /gerbang 2/.test(issued.out) && /dari rekaman:/.test(issued.out),
    issued.out.split('\n').filter((l) => /gerbang|rekaman/.test(l)).join(' | '))

  // — h. dokumen hasil yang dihidangkan HOST PUBLIK: angka menunjuk baris, dan kertasnya ada di
  // tempat yang bisa dibaca orang lain — bukan di mesin yang menjalankan tes ini.
  const credentialHash = credentialHashFor(learner.address)
  const pub = await runNpm('publish:edge', [], { EDGE_BASE_URL: EDGE, AGENT_SLUG: 'agent-edge' })
  /**
   * `publish:edge` keluar non-nol sampai 29 Sep karena SATU deviasi yang sudah dikenal dan tercatat:
   * `pengantar-defi-2026` ada di katalog sajian tapi tidak punya manifest penerbit, jadi rute
   * criteria-nya 404. Memakai `status === 0` saja berarti pemeriksaan ini merah untuk sebab yang
   * bukan milik alur ini — dan hijau untuk sebab yang salah kalau kelak kita kelonggarkan semuanya.
   * Jadi yang dibandingkan adalah DAFTAR kegagalannya, bukan hanya kode keluar.
   */
  const pubFails = (pub.out.match(/^\s*[-!]\s*(.+)$/gm) ?? []).map((s) => s.trim())
  const onlyKnown = pubFails.every((l) => /pengantar-defi-2026/.test(l))
  check('publish:edge: tidak ada rute yang gagal selain deviasi yang sudah tercatat (pengantar-defi tanpa manifest)',
    onlyKnown && (pub.status === 0 || pubFails.length > 0),
    `exit ${pub.status} · ${pubFails.slice(0, 3).join(' | ') || pub.out.split('\n').slice(-3).join(' ')}`)
  let served = null
  let servedCred = null
  for (let i = 0; i < 12 && !served; i++) {
    await new Promise((r) => setTimeout(r, 2000))
    try {
      const r = await fetch(`${EDGE}/results/${COURSE}/${credentialHash}`, { signal: AbortSignal.timeout(30_000) })
      if (r.ok) served = await r.json()
      const c = await fetch(`${EDGE}/credentials/${credentialHash}`, { signal: AbortSignal.timeout(30_000) })
      if (c.ok) servedCred = await c.json()
    } catch { /* tepi belum menyala di hash ini */ }
  }
  check(`${EDGE}/results/... menghidangkan dokumen (bukan 404)`, served !== null, `${EDGE}/results/${COURSE}/${credentialHash.slice(0, 12)}…`)
  check('kertasnya sendiri ikut terhidang dari host yang sama', servedCred !== null)
  if (servedCred) {
    check('id dokumen menunjuk host publik, bukan 127.0.0.1 (B51)', String(servedCred.id ?? '').startsWith(EDGE), String(servedCred.id))
    check('result[0].id menunjuk dokumen hasil yang barusan dibaca',
      String(servedCred.credentialSubject?.result?.[0]?.id ?? '').includes(`/results/${COURSE}/`),
      JSON.stringify(servedCred.credentialSubject?.result?.[0]?.id))
  }
  if (served) {
    const hashes = served.attempts?.attemptHashes ?? []
    check('dokumen hasil memuat attempt_hash peserta yang sebenarnya', hashes.length > 0 && rows.every((r) => hashes.includes(r.attempt_hash)), JSON.stringify(hashes))
    check('rekaman yang tercantum cocok jumlah barisnya di Postgres', served.attempts?.storedRows === rows.length, `${served.attempts?.storedRows} vs ${rows.length}`)
    check('gerbang yang tertulis di dokumen cocok dengan view course_gates',
      served.attempts?.gates?.lessonsTotal === gatesDone.lessons_total && served.attempts?.gates?.allLessonsDone === true,
      JSON.stringify(served.attempts?.gates))
    check('hasil di dokumen hasil == hasil di kertas', String(served.result) === String((/penilaian\s*:\s*.*?(\d+)\/\d+/.exec(issued.out)?.[1] ?? served.result)),
      `${served.result}`)
    check('tidak ada teks/kunci jawaban peserta di dokumen hasil',
      !JSON.stringify(served).includes('"answer"') && served.evidence?.essayTextIncluded === false)
    check('rubrik di dokumen hasil == rubrik yang ikut dihash di setiap attempt peserta',
      served.rubric?.hash === rubricHash, `${served.rubric?.hash} vs ${rubricHash}`)
    // B104, ujung rantainya: yang tercetak di dokumen hasil KERTAS YANG TERBIT adalah angka reviewer,
    // dan dokumen itu menyebut siapa yang mengesahkan — dibaca dari host publik, bukan dari proses ini.
    if (liveReview) {
      const rv = served.attempts?.reviews?.[0]
      check(`dokumen hasil di tepi: esai = angka reviewer (${liveReview.final}), bukan usulan model (${liveReview.proposed})`,
        Number(served.evidence?.essayScore) === liveReview.final && Number(served.evidence?.essayScore) !== liveReview.proposed,
        JSON.stringify(served.evidence))
      check('dokumen hasil di tepi menyebut pengesahnya: reviewer, keputusan adjusted, usulan, angka akhir',
        rv?.reviewer === liveReviewer.address && rv?.decision === 'adjusted' && rv?.proposed === liveReview.proposed && rv?.finalScore === liveReview.final
        && String(served.method ?? '').includes(`adjusted oleh ${liveReviewer.address}`), JSON.stringify(rv ?? served.method))
      check('komponen esai di dokumen hasil graded_by human, dan model pengusulnya tetap tercatat',
        (served.attempts?.components ?? []).filter((c) => c.slot === 'esai').every((c) => c.gradedBy === 'human')
        && (served.attempts?.components ?? []).some((c) => c.slot === 'esai')
        && JSON.stringify(served.grader ?? {}).includes(LIVE_JUDGE_MODEL), JSON.stringify(served.grader))
    }
  }
  check('angka yang sama keluar dari computeScore terhadap rekaman (tidak ada jalur kedua)',
    served ? String(served.result) === String(computeScore(real, evidenceFromAttempts(real, rows).evidence).total) : false,
    served ? `${served.result} vs ${computeScore(real, evidenceFromAttempts(real, rows).evidence).total}` : 'dokumen tidak terhidang')
  console.log(`\n${ran} pemeriksaan / ${fails} gagal${LIVE ? ' (lapis LIVE: 1 attestation + re-anchor di 97)' : ''}`)
  console.log(`  peserta uji  : ${learner.address}`)
  console.log(`  credential   : ${credentialHash}`)
  console.log(`  dokumen      : ${docLine ?? '—'}`)
  console.log(`  rekaman usaha: ${rows.length} baris, hash ${rows.map((r) => r.attempt_hash?.slice(0, 10)).join(', ')}`)
  console.log(`  ⚠ baris enrollment/progress/attempts/nonce + kertas ini TETAP ADA setelah run (B78).`)
  // Server signer ditumbangkan lewat taskkill berantai (Windows): `npm run serve`.spawn dari
  // cangkang shell, jadi `child.kill()` saja hanya membunuh cangkangnya dan node grandchild-nya
  // menahan pipe stdout tetap terbuka — run pertama mati karena timeout 10 menit, bukan karena
  // pemeriksaan yang gagal.
  try {
    // Sinkron (1 Okt): taskkill yang dijalankan asinkron lalu disusul process.exit seketika tidak sempat
    // selesai — itulah asal server yatim di 8795 (30 Sep) yang membuat run berikutnya bicara ke kode lama.
    if (process.platform === 'win32') spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    else child.kill('SIGKILL')
  } catch { /* biar OS yang membereskan */ }
  process.exit(fails === 0 ? 0 : 1)
}

/** Bentuk hash harus sama dengan yang dihitung contract — maka `credentialHashOf` dipakai, bukan dihitung ulang di sini. */
function credentialHashFor (address) {
  return credentialHashOf(address, COURSE)
}

async function runNpm (script, extraArgs = [], extraEnv = {}) {
  const { execFile } = await import('node:child_process')
  const { promisify } = await import('node:util')
  const run = promisify(execFile)
  try {
    const { stdout, stderr } = await run('npm', ['run', script, ...(extraArgs.length ? ['--', ...extraArgs] : []),], {
      cwd: resolve(HERE, '..'), maxBuffer: 16 * 1024 * 1024, shell: true, env: { ...process.env, ...extraEnv },
    })
    return { status: 0, out: `${stdout}\n${stderr}` }
  } catch (e) {
    return { status: e.code ?? 1, out: `${e.stdout ?? ''}\n${e.stderr ?? ''}${e.message ?? ''}` }
  }
}