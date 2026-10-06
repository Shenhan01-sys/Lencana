/**
 * `src/fromAttempts.js` — menurunkan BUKTI untuk `computeScore` dari baris usaha yang tersimpan.
 *
 * Kenapa modul ini ada dan bukan sekadar `essayScore = attempt.score` di dalam `issue.js`:
 * kolom `score` di `attempts` adalah HASIL, sedangkan `computeScore` meminta MASUKAN per slot
 * rubrik (kuis / esai / praktik). Mengisi satu dari angka yang lain = satu angka punya dua jalan
 * masuk, dan itulah "platform mengarang kelulusan" dalam bentuk yang tersamar — lebih buruk dari
 * flag CLI, karena kertasnya tetap terlihat sah (B62-b).
 *
 * Aturan yang ditegakkan di mari:
 *   1. SATU jalan masuk. Setiap angka yang keluar dari fungsi ini bisa ditunjuk barisnya:
 *      `provenance` menyimpan `attempt_hash` + `item_id` + `weight` + `graded_by` untuk setiap
 *      komponen yang ikut menghitung.
 *   2. Tidak ada komponen = tidak ada angka. Usaha yang tidak punya satu pun baris
 *      `attempt_components` ber-skor ditolak, bukan diambil dari kolom `score`. Kolom itu punya
 *      kita untuk menampilkan hasil, bukan untuk memberi makan rubrik.
 *   3. Yang tidak punya slot di rubrik tidak dibuang diam-diam. `kind='ujian'` (dan kind lain di
 *      luar tiga slot penerbit) dikembalikan sebagai `unmapped` supaya `issue.js` bisa
 *      MEMBACANYA, bukan mengira ia sudah dihitung.
 *   4. Fungsi ini murni: tanpa DB, tanpa chain, tanpa network. Semua cabang di bawah bisa dites
 *      `npm run check` offline — termasuk cabang penolakannya.
 */

// Lencana-B62 status=SELESAI 2026-09-29 — angka kertas diturunkan dari rekaman attempts/attempt_components; flag angka dari CLI DITOLAK. Buktikan ulang: npm run verify:attempts. JANGAN dibalik/diulang tanpa membuka kembali baris B62 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

const SLOTS = ['kuis', 'esai', 'praktik']

// Lencana-B104 status=SELESAI 2026-09-30 — esai bernilai model tanpa pengesahan manusia (approved/adjusted) menghentikan penurunan bukti: issue --from-attempts berhenti sebelum gas. Buktikan ulang: npm run verify:attempts. JANGAN dibalik/diulang tanpa membuka kembali baris B104 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
const ENDORSING = ['approved', 'adjusted']

/** PostgREST menyajikan relasi satu-ke-satu sebagai objek dan satu-ke-banyak sebagai array; terima keduanya. */
function reviewOf (attempt) {
  const r = attempt?.judgement_reviews
  if (!r) return null
  return Array.isArray(r) ? (r[0] ?? null) : r
}

/** Lesson mana saja yang merupakan slot kuis/esai penerbit — dibaca dari manifest, bukan ditebak. */
export function lessonSlugs (manifest) {
  const lessons = (manifest?.course?.modules ?? []).flatMap((m) => m.lessons ?? [])
  const quiz = lessons.filter((l) => l.kind === 'kuis' || l.quiz).map((l) => l.slug)
  const essay = lessons.filter((l) => l.kind === 'esai' || l.essay).map((l) => l.slug)
  const praktik = lessons.filter((l) => l.kind === 'praktik' || l.praktik).map((l) => l.slug)
  return { kuis: quiz, esai: essay, praktik }
}

/**
 * Angka sebuah usaha, diturunkan dari komponennya.
 * Rata-rata berbobot kalau bobotnya ada; rata-rata polos kalau tidak (dicatat, karena itu beda
 * pernyataan: yang pertama mengikuti rubrik, yang kedua hanya tahu cara menghitung).
 */
function rawFromComponents (components) {
  const scored = (components ?? []).filter((c) => c && c.score !== null && c.score !== undefined && Number.isFinite(Number(c.score)))
  if (!scored.length) return null
  const weighted = scored.filter((c) => Number(c.weight) > 0)
  const sumW = weighted.reduce((a, c) => a + Number(c.weight), 0)
  if (weighted.length && sumW > 0) {
    return {
      value: weighted.reduce((a, c) => a + Number(c.score) * Number(c.weight), 0) / sumW,
      method: 'weighted-mean', items: weighted,
    }
  }
  return {
    value: scored.reduce((a, c) => a + Number(c.score), 0) / scored.length,
    method: 'simple-mean', items: scored,
  }
}

/** Usaha yang sudah dinilai, untuk satu lesson+kind; yang terbaik, seri dimenangkan usaha terbaru. */
function bestGraded (attempts, kind, lessonKey) {
  const pool = attempts.filter((a) => a.kind === kind
    && String(a.verdict ?? 'incomplete') !== 'incomplete'
    && (lessonKey === undefined || String(a.lesson_key ?? '-') === String(lessonKey)))
  if (!pool.length) return null
  return pool.reduce((best, a) => {
    const bs = Number(best.score ?? -1); const as = Number(a.score ?? -1)
    if (as !== bs) return as > bs ? a : best
    return Number(a.attempt_no ?? 0) >= Number(best.attempt_no ?? 0) ? a : best
  })
}

/**
 * @param {object} manifest manifest penerbit (bentuk `web/src/manifest.ts`)
 * @param {Array}  attempts baris `attempts` dengan `attempt_components` ter-embed (lihat `db.js:attemptsFor`)
 * @returns {{ok:boolean, why?:string, evidence:{quizScores:number[],praktikCompleted:boolean,essayScore:number|null},
 *            provenance:Array, unmapped:Array, judges:Array, notes:string[]}}
 */
export function evidenceFromAttempts (manifest, attempts) {
  const rows = Array.isArray(attempts) ? attempts : []
  const slugs = lessonSlugs(manifest)
  const provenance = []
  const used = []
  const notes = []
  const judges = []
  const reviews = []

  const track = (slot, attempt, raw) => {
    for (const c of raw.items) {
      provenance.push({
        slot, lessonKey: String(attempt.lesson_key ?? '-'), kind: attempt.kind,
        attemptNo: Number(attempt.attempt_no ?? 0), rawMethod: raw.method,
        itemId: String(c.item_id), score: Number(c.score), weight: Number(c.weight ?? 0),
        gradedBy: c.graded_by ?? 'mechanical', attemptHash: attempt.attempt_hash ?? null,
      })
    }
    if (attempt.judge_model) {
      judges.push({
        lesson: String(attempt.lesson_key ?? '-'), kind: attempt.kind,
        model: attempt.judge_model, temperature: attempt.judge_temp ?? null,
        attemptHash: attempt.attempt_hash ?? null,
        // B119: agen sewaan yang mengusulkan angka dan label tingkat berat pilihannya (null = penerbit).
        ...(attempt.graded_by_agent ? { agentId: String(attempt.graded_by_agent), difficultyLabel: attempt.difficulty_label ?? null } : {}),
      })
    }
    // Baris usaha yang ikut melahirkan angka — termasuk yang tidak menyumbang komponen (praktik
    // tanpa rincian), karena "ada/tidaknya" memang bukti yang sah untuk slot itu.
    const key = `${attempt.kind}|${String(attempt.lesson_key ?? '-')}|${Number(attempt.attempt_no ?? 0)}`
    if (!used.some((u) => u.key === key)) {
      used.push({
        key, kind: attempt.kind, lessonKey: String(attempt.lesson_key ?? '-'), slot,
        attemptNo: Number(attempt.attempt_no ?? 0), score: attempt.score === null ? null : Number(attempt.score),
        verdict: attempt.verdict ?? null, rubricHash: attempt.rubric_hash ?? null,
        components: (attempt.attempt_components ?? []).length, attemptHash: attempt.attempt_hash ?? null,
      })
    }
  }

  if (!rows.length) {
    return {
      ok: false, why: 'no stored attempts for this learner+course — there is no number to derive',
      evidence: { quizScores: [], praktikCompleted: false, essayScore: null }, provenance, unmapped: [], judges, notes, used: [],
    }
  }

  // — kuis: SATU angka per lesson kuis, seperti yang diminta `computeScore` (yang menguji jumlahnya)
  const quizScores = []
  for (const slug of slugs.kuis) {
    const a = bestGraded(rows, 'kuis', slug)
    if (!a) continue
    const raw = rawFromComponents(a.attempt_components)
    if (!raw) {
      return {
        ok: false, why: `kuis "${slug}" (usaha no ${a.attempt_no}) tidak punya satu pun attempt_components ber-skor — `
          + 'angkanya tidak bisa diturunkan dari rekaman; catat usahnya lewat POST /attempts dengan components',
        evidence: { quizScores: [], praktikCompleted: false, essayScore: null }, provenance, unmapped: [], judges, notes, used: [],
      }
    }
    quizScores.push(raw.value)
    track('kuis', a, raw)
  }

  // — esai: rubrik penerbit cuma punya SATU slot esai, jadi beberapa lesson esai dirata-ratakan
  const essayVals = []
  for (const slug of slugs.esai) {
    const a = bestGraded(rows, 'esai', slug)
    if (!a) continue
    // B104 — angka model tidak menerbitkan apa pun sendirian. Fail-closed dan TIDAK melompat ke
    // usaha lain: kalau usaha terbaik peserta belum disahkan manusia, jawabannya "belum", bukan
    // "pakai yang lebih jelek saja" (itu mengubah nilai orang tanpa ada yang memutuskannya).
    const review = reviewOf(a)
    if (a.judge_model && !(review && ENDORSING.includes(review.decision))) {
      return {
        ok: false,
        why: `essay "${slug}" (attempt no ${a.attempt_no}) was graded by a model (${a.judge_model}) and `
          + (review ? `its human review is "${review.decision}"` : 'has no human review')
          + ' — a model score alone does not issue a credential; it needs an approved or adjusted review',
        evidence: { quizScores: [], praktikCompleted: false, essayScore: null }, provenance, unmapped: [], judges, notes, used: [],
      }
    }
    if (review) {
      reviews.push({
        lesson: String(a.lesson_key ?? '-'), decision: review.decision, reviewer: review.reviewer ?? null,
        judgeModel: review.judge_model ?? a.judge_model ?? null,
        proposed: review.proposed === null || review.proposed === undefined ? null : Number(review.proposed),
        finalScore: review.final_score === null || review.final_score === undefined ? null : Number(review.final_score),
        attemptHash: a.attempt_hash ?? null,
        // B145: hanya ada untuk pengesah agen ERC-8004 — pengesahan manusia tidak mendapat kunci baru (bentuk dokumen lama tetap).
        ...(review.reviewer_agent_id ? { reviewerAgentId: String(review.reviewer_agent_id) } : {}),
      })
    }
    const comps = a.attempt_components ?? []
    const judged = comps.filter((c) => c && (c.graded_by === 'model' || c.graded_by === 'human'))
    // Kalau ada komponen hasil judge, itulah angka esainya; komponen mekanis hanya penjelas.
    const use = judged.length ? judged : comps
    const raw = rawFromComponents(use)
    if (!raw) {
      return {
        ok: false, why: `esai "${slug}" (usaha no ${a.attempt_no}) dinilai tapi tidak punya komponen ber-skor — `
          + 'satu angka esai tanpa rincian per kriteria bukan hasil penilaian, itu hanya angka',
        evidence: { quizScores: [], praktikCompleted: false, essayScore: null }, provenance, unmapped: [], judges, notes, used: [],
      }
    }
    if (!judged.length) notes.push(`esai "${slug}": tidak ada komponen graded_by model/human, angka dari komponen mekanis`)
    else notes.push(`esai "${slug}": angka dari ${judged.length} komponen graded_by ${judged[0].graded_by}`)
    if (review) {
      notes.push(`esai "${slug}": usulan model ${review.judge_model ?? a.judge_model} = ${Number(review.proposed)}, disahkan ${review.reviewer_agent_id ? `agen pengesah #${review.reviewer_agent_id}` : 'manusia'} (${review.decision}) `
        + `oleh ${review.reviewer} -> ${Number(review.final_score)}`)
    }
    essayVals.push(raw.value)
    track('esai', a, raw)
  }

  // — praktik: rubrik hanya bertanya ada/tidaknya bukti yang dinilai.
  // Lencana-B121 status=SELESAI 2026-10-01 — praktik hanya dihitung kalau dinilai CHAIN (komponen graded_by='chain', lahir dari POST /praktik); usaha praktik laporan peserta dari jalur lama /attempts tidak lagi membuat slot terisi. Buktikan ulang: npm run verify:attempts. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  const praktikRows = rows.filter((a) => a.kind === 'praktik')
  const chainChecked = praktikRows.filter((a) => (a.attempt_components ?? []).some((c) => c?.graded_by === 'chain'))
  const selfReported = praktikRows.filter((a) => !chainChecked.includes(a) && String(a.verdict ?? 'incomplete') !== 'incomplete')
  if (selfReported.length) {
    notes.push(`praktik: ${selfReported.length} usaha tanpa komponen graded_by chain (laporan peserta lewat /attempts lama) — tidak dihitung sejak B121`)
  }
  const praktikAttempt = bestGraded(chainChecked, 'praktik')
  const praktikCompleted = Boolean(praktikAttempt)
  let praktikRaw = null
  if (praktikAttempt) {
    praktikRaw = rawFromComponents(praktikAttempt.attempt_components)
    if (praktikRaw) track('praktik', praktikAttempt, praktikRaw)
    notes.push(`praktik "${praktikAttempt.lesson_key ?? '-'}": dinilai chain (${(praktikAttempt.attempt_components ?? []).length} pemeriksaan cocok)`)
  }

  const unmappedKinds = {}
  for (const a of rows) {
    if (!SLOTS.includes(a.kind)) unmappedKinds[a.kind] = (unmappedKinds[a.kind] ?? 0) + 1
  }
  const unmapped = Object.entries(unmappedKinds).map(([kind, count]) => ({
    kind, count,
    lessonKeys: [...new Set(rows.filter((a) => a.kind === kind).map((a) => String(a.lesson_key ?? '-')))],
    hashes: rows.filter((a) => a.kind === kind).map((a) => a.attempt_hash ?? null),
  }))

  if (!quizScores.length && essayVals.length === 0 && !praktikCompleted) {
    return {
      ok: false, why: `no attempts in the three rubric slots (quiz/essay/practice); stored: `
        + Object.keys(unmappedKinds).join(', ') + ' — no number can be derived from that',
      evidence: { quizScores: [], praktikCompleted: false, essayScore: null }, provenance, unmapped, judges, notes, used: [],
    }
  }

  const mean = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length
  return {
    ok: true,
    evidence: {
      quizScores: quizScores.map((v) => Math.round(v * 100) / 100),
      praktikCompleted,
      essayScore: essayVals.length ? Math.round(mean(essayVals) * 100) / 100 : null,
    },
    provenance, unmapped, judges, reviews, notes, used: used.map(({ key, ...u }) => u),
  }
}

/** Satu baris yang bisa ditempel ke log/exec summary tanpa mengulang isi objeknya. */
export function formatEvidence (ev) {
  const parts = [`kuis=${ev.evidence.quizScores.length ? ev.evidence.quizScores.map((n) => Math.round(n)).join(',') : '—'}`
    , `esai=${ev.evidence.essayScore === null ? '—' : Math.round(ev.evidence.essayScore)}`
    , `praktik=${ev.evidence.praktikCompleted ? 'ada' : 'tidak'}`]
  return `${parts.join(' ')} · ${ev.provenance.length} komponen dari ${new Set(ev.provenance.map((p) => p.attemptHash)).size} usaha`
    + (ev.unmapped.length ? ` · tak terslot: ${ev.unmapped.map((u) => `${u.kind}×${u.count}`).join(', ')}` : '')
}
