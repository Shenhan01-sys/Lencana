/**
 * Dokumen hasil: jawaban atas `result[0].id` yang dicetak setiap kredensial.
 *
 * Kenapa ada: `credential.js` menulis `result[0].id = <baseUrl>/results/<courseId>/<hash>` dan
 * sampai 28 Sep tidak ada apa pun di balik URL itu — persis kasus `/criteria` kemarin. Itu bukan
 * hiasan: `"value": "92"` di dalam ijazah adalah HASIL, dan hasil tanpa "dihitung dari apa, oleh
 * siapa" hanyalah angka. Di sinilah B44 dijawab.
 *
 * Ditulis terhadap bentuk rekaman store yang SEBENARNYA (diperiksa dari `.store/state.json`, bukan
 * dari ingatan): `course` adalah string slug, `evidence` = { quizScores, praktikCompleted, essayScore },
 * `essayGrading` = { judgeModel, lesson, mechanical, perCriterion, score, verdict }.
 *
 * Yang TIDAK ada di sini, dan itu keputusan: kunci jawaban dan teks esai. `canonicalPolicy()` memang
 * menghitung `answer` ke dalam `rubricHash`, tapi menerbitkannya ke URL publik = membagikan ujian
 * demi keacakan hash. Teks esai peserta juga data pribadi — yang kita tampilkan adalah apa yang
 * membuat angkanya bisa dipertanggungjawabkan, bukan isinya.
 */
import { getAddress } from 'viem'

/**
 * Bentuk `essayGrading.mechanical` yang SEBENARNYA (dibaca dari `.store/state.json`): array lima tanda,
 * masing-masing `{ label, ok, detail? }` — bukan satu angka. Itu justru yang paling perlu ditampilkan:
 * "60/100" tanpa menyebut tanda mana yang gagal membuat angka mekanis terlihat seperti angka model.
 */
function mechanicalOf (raw) {
  if (Array.isArray(raw)) {
    const passed = raw.filter((s) => s?.ok).length
    return {
      passed, total: raw.length,
      signs: raw.map((s) => ({ label: s.label ?? null, passed: s.ok === true, detail: s.detail ?? null })),
    }
  }
  return typeof raw === 'number' ? { passed: null, total: null, score: raw, signs: [] } : null
}

/** @param {object} record baris store dari `rememberCredential()` */
export function resultDocument ({ baseUrl, record }) {
  const doc = record.document ?? {}
  const eg = record.essayGrading ?? null
  const evidence = record.evidence ?? {}
  const mechanical = mechanicalOf(eg?.mechanical)

  return {
    id: `${baseUrl}/results/${record.course}/${record.credentialHash}`,
    type: ['LencanaResultStatement'],
    // Rujukan yang bisa dicocokkan silang oleh pembaca: kertasnya, dan attestation-nya di chain.
    credential: record.document?.id ?? `${baseUrl}/credentials/${record.credentialHash}`,
    credentialHash: record.credentialHash,
    attestationUid: record.uid ?? null,
    network: 'eip155:97',
    learner: getAddress(record.learner),
    course: record.course,
    issuer: record.issuer ?? null,

    result: record.score ?? null,
    verdict: record.verdict ?? null,
    issuedAt: doc.validFrom ?? null,
    expiresAt: doc.validUntil ?? null,
    signedAt: record.signedAt ?? null,

    // — B44: kalimat ini yang dulu mentok di `issue.js` dan tidak pernah sampai ke kertas —
    method: eg
      ? `dihitung dari bukti terhadap rubrik ${record.rubricRef}; esai "${eg.lesson}" dinilai ${eg.judgeModel}`
        + (typeof eg.temperature === 'number' ? ` (temperature ${eg.temperature})` : '')
        + (mechanical?.total
          ? `; penilai mekanis lulus ${mechanical.passed} dari ${mechanical.total} tanda sebelum model menilai`
          : '')
      : `dihitung dari bukti terhadap rubrik ${record.rubricRef}`,
    grader: eg
      ? { type: 'mechanical-signs-plus-model-judge', model: eg.judgeModel, temperature: eg.temperature ?? null }
      : { type: 'mechanical-signs-only' },
    // Tanda mekanisnya sendiri: ini yang membedakan "angka dari aturan" dengan "angka dari model".
    mechanical: mechanical ?? null,

    rubric: {
      ref: record.rubricRef ?? null,
      hash: record.rubricHash ?? null,
      criteria: (eg?.perCriterion ?? []).map((c) => ({
        label: c.label, score: c.score, maximumScore: c.max, method: c.method ?? null,
      })),
      // Skala dan bobot tinggal di dokumen kriteria — URL yang sama dengan `resultDescription`.
      scale: `${baseUrl}/criteria/${record.course}#scale`,
    },

    evidence: {
      quizScores: evidence.quizScores ?? {},
      praktikCompleted: evidence.praktikCompleted ?? null,
      // Skor esai ya, teksnya tidak.
      essayScore: evidence.essayScore ?? (eg ? eg.score : null),
      essayTextIncluded: false,
      quizAnswerKeysIncluded: false,
    },
  }
}
