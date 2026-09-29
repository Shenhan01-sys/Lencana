/**
 * `src/db.js` — jembatan signer ↔ Postgres (Supabase) untuk state belajar.
 *
 * Kenapa modul ini ada, dan kenapa dia BUKAN sekadar fetch wrapper: sampai 28 Sep "store" kita
 * adalah satu berkas JSON (`store.js`) tanpa transaksi dan tanpa constraint, jadi setiap klaim
 * "peserta mengerjakan kursus ini di dalam sistem" bergantung pada file satu mesin. Postgres
 * memperbaiki itu, tapi memindahkan kredensial ke server juga memindahkan tanggung jawab:
 *
 *   1. **Secret key melewati RLS.** Supabase: "Policies never apply to a secret key, because
 *      `service_role` has the `BYPASSRLS` attribute." Artinya RLS yang sudah kita pasang TIDAK
 *      melindungi apa pun terhadap signer. Yang menahan akses adalah pemeriksaan di mari:
 *      setiap write harus membawa **tanda tangan peserta atas nonce satu-kali**, dan nonce itu
 *      kami konsumsi sekali pakai. Tanpa ini, siapa pun yang bisa mencapai endpoint bisa
 *      menaruh nilai atas nama alamat mana pun.
 *   2. **attempt_hash dihitung di sini, dari baris yang tersimpan** — bukan diterima dari klien.
 *      Kalau klien boleh mengirim hash, angka di sertifikat bisa berasal dari luar sistem, dan itu
 *      justru kegagalan yang kita jual sebagai pembeda LMS.
 *   3. **Kunci jawaban tidak pernah lewat jalur ini.** Yang masuk adalah nilai per item, bukan
 *      kebenaran jawaban; yang menilai ada di server (`grade.js`), dengan kunci yang tidak pernah
 *      dikirim ke browser.
 *
 * Kredensial dibaca dari lingkungan proses / `app/.env` (server-side). Jangan pernah menaruh
 * `SUPABASE_SECRET_KEY` di bawah nama `VITE_*` atau mengarahkan `envDir` Vite ke akar `app/`:
 * satu perubahan itu mengirim secret server-side ke browser setiap pengunjung.
 */

// [B78] SELESAI 2026-09-29 — setiap enrollment membawa origin (demo|test|unknown; default unknown) supaya baris harness bisa dibedakan dari baris demo. Buktikan ulang: npm run verify:attempts. JANGAN dibalik/diulang tanpa membuka kembali baris B78 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// [B81] SELESAI 2026-09-29 — esai/praktik masuk sebagai rekaman + antrean penilaian penerbit; angka tidak diterima dari klien. Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B81 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// [B72] SELESAI 2026-09-29 — state belajar hidup di Postgres (server-side), bukan localStorage browser. Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B72 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { keccak256, encodeAbiParameters, getAddress } from 'viem'
import { verifyMessage } from 'viem/utils'

const URL_ = () => (process.env.SUPABASE_URL || '').replace(/\/$/, '')
const KEY = () => process.env.SUPABASE_SECRET_KEY || ''

export function dbConfigured () {
  return Boolean(URL_() && KEY())
}
export function dbMissingReason () {
  if (!URL_()) return 'SUPABASE_URL belum diisi'
  if (!KEY()) return 'SUPABASE_SECRET_KEY belum diisi'
  return null
}

async function rest (table, { method = 'GET', query = '', body, prefer } = {}) {
  const headers = {
    apikey: KEY(),
    authorization: `Bearer ${KEY()}`,
    'content-type': 'application/json',
    accept: 'application/json',
  }
  if (prefer) headers.prefer = prefer
  const r = await fetch(`${URL_()}/rest/v1/${table}${query}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  })
  const text = await r.text()
  if (!r.ok) {
    // Tanpa mencetak isi: pesan PostgREST kadang memuat bagian dari query, dan query bisa memuat
    // data peserta. Yang kita butuh untuk debugging adalah kode + path-nya.
    throw new Error(`database rejected ${method} ${table}: HTTP ${r.status} ${text.slice(0, 180)}`)
  }
  return text ? JSON.parse(text) : null
}

/* ------------------------------------------------------------------ nonce: satu kali pakai */
/**
 * Nonce disimpan di Postgres (`public.used_nonces`, PK = nonce), bukan di Set dalam proses.
 *
 * Kenapa diubah (28 Sep, migrasi 0003): versi pertama menaruh nonce di memori dan menyebut dirinya
 * jujur karena bilang "ini tidak bertahan restart". Itu jujur tapi bukan berarti aman: signer kita
 * akan di-restart (deploy, crash, dan `publish` yang dijalankan manusia), dan setiap restart adalah
 * jendela di mana tanda tangan lama yang masih sah bisa dipakai ulang — termasuk ulang usaha untuk
 * alamat orang lain. Satu proses juga berarti satu mesin: dua instance tidak saling melihat nonce.
 * Sekarang penolakannya milik database, jadi siapa pun yang menulis lewat mesin mana pun tunduk pada
 * guard yang sama.
 */
async function consumeNonce ({ nonce, learner, scope }) {
  try {
    await rest('used_nonces', {
      method: 'POST',
      body: [{ nonce, learner: getAddress(learner), scope }],
    })
    return { ok: true }
  } catch (e) {
    const msg = String(e.message ?? e)
    // PostgREST membalas 409 untuk unique violation. Yang kita butuhkan hanya: "sudah ada".
    if (/duplicate|already exists|409/i.test(msg)) return { ok: false, why: 'nonce already used (replay)' }
    return { ok: false, why: `could not consume nonce: ${msg.slice(0, 90)}` }
  }
}

/**
 * Verifikasi bahwa pemanggil benar-benar memegang kunci dari `learner`.
 * Urutan penting: cek bentuk -> cek nonce (konsumsikan SEKALI) -> baru verifikasi tanda tangan.
 * Kalau urutan dibalik, pesan yang tanda tangannya salah akan ikut membakar nonce milik orang lain.
 * @returns {Promise<{ok:true} | {ok:false, why:string}>}
 */
export async function authorizeLearner ({ learner, message, signature, scope = 'default' }) {
  if (typeof learner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(learner)) {
    return { ok: false, why: 'invalid learner address' }
  }
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return { ok: false, why: 'invalid signature' }
  }
  if (typeof message !== 'string' || message.length < 16) {
    return { ok: false, why: 'pesan tanda tangan terlalu pendek' }
  }
  const nonce = /nonce=([0-9a-f]{12,})/.exec(message)?.[1]
  if (!nonce) return { ok: false, why: 'message carries no nonce' }
  let verified = false
  try {
    verified = await verifyMessage({ address: getAddress(learner), message, signature })
  } catch (e) {
    return { ok: false, why: `verification failed: ${String(e.message ?? e).slice(0, 90)}` }
  }
  if (!verified) return { ok: false, why: 'signature does not belong to this learner' }
  const consumed = await consumeNonce({ nonce, learner, scope })
  if (!consumed.ok) return { ok: false, why: consumed.why }
  return { ok: true }
}

/* ------------------------------------------------------------------ enrollment (bar 3) */
export async function findEnrollment (learner, courseId) {
  const q = `?learner=eq.${encodeURIComponent(getAddress(learner))}&course_id=eq.${encodeURIComponent(courseId)}&select=*`
  const rows = await rest('enrollments', { query: q })
  return rows?.[0] ?? null
}

/** Idempoten: enroll dua kali menghasilkan satu baris, bukan dua. (L8 §C.6 — guard yang hilang.) */
export async function enroll ({ learner, courseId, lessonsTotal = 0, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature, scope: 'enroll' })
  if (!auth.ok) return { ok: false, why: auth.why }
  const total = Number(lessonsTotal)
  if (!Number.isInteger(total) || total < 0) return { ok: false, why: `lessons_total invalid: ${lessonsTotal}` }
  const existing = await findEnrollment(learner, courseId)
  if (existing) return { ok: true, enrollment: existing, created: false }
  const rows = await rest('enrollments', {
    method: 'POST',
    query: '?on_conflict=learner,course_id',
    prefer: 'resolution=merge-duplicates,return=representation',
    // lessons_total ikut ditulis saat baris dibuat: tanpa penyebut itu, "selesai" tidak bisa
    // dihitung dan view akan mengembalikan NULL selamanya.
    body: [{ learner: getAddress(learner), course_id: courseId, status: 'active', lessons_total: total,
      // 'unknown' adalah default yang jujur: proses yang tidak memperkenalkan dirinya tidak boleh
      // menyamar jadi demo. Harness yang menyalakan servernya sendiri mengirim LANCENA_ORIGIN=test.
      origin: process.env.LANCENA_ORIGIN || 'unknown' }],
  })
  return { ok: true, enrollment: rows?.[0] ?? null, created: true }
}

/* ------------------------------------------------------------------ hash usaha (bar 7) */
/**
 * Deterministik dan tidak bergantung urutan kunci objek: `keccak256(abi.encodePacked(...))`, sama
 * polanya dengan `credentialHash`. Yang dihash adalah **rekaman**, jadi siapa pun yang punya baris
 * yang sama bisa menghitung ulang hash yang sama — itu gunanya dia masuk ke dokumen kredensial.
 */
export function computeAttemptHash ({ learner, courseId, lessonKey, kind, attemptNo, score, rubricHash }) {
  return keccak256(encodeAbiParameters(
    [{ type: 'string' }, { type: 'string' }, { type: 'string' }, { type: 'string' }, { type: 'string' }, { type: 'string' }, { type: 'string' }],
    ['lencana-attempt-v1', getAddress(learner), courseId, lessonKey ?? '-', kind, String(attemptNo), `${score}|${rubricHash ?? '-'}`],
  ))
}

/**
 * Mencatat satu penyerahan yang DATANYA dari pemanggil (`POST /attempts`). Tetap lewat otorisasi
 * tanda tangan, dan komponennya ikut ditulis supaya gradebook bisa menampilkan rinciannya.
 *
 * Batas yang harus disebut: jalur ini memercayai ANGKA yang dikirim. Untuk kuis itu tidak lagi
 * boleh — angkanya dihitung server (`POST /grade`, `src/quiz.js`), karena kalau browser yang
 * mengirim skor, peserta menilai dirinya sendiri dan `attempt_hash` cuma membekukan angka itu.
 */
export async function recordAttempt ({ learner, courseId, lessonKey = '-', kind, attemptNo = 1, score, verdict,
  rubricHash, judgeModel, judgeTemp, deductions, components, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature })
  if (!auth.ok) return { ok: false, why: auth.why }
  return storeAttempt({ learner, courseId, lessonKey, kind, attemptNo, score, verdict,
    rubricHash, judgeModel, judgeTemp, deductions, components })
}

/** Nomor usaha berikutnya untuk (lesson, kind) — server yang menghitung, bukan klien. */
export async function nextAttemptNo (learner, courseId, lessonKey = '-', kind = 'kuis') {
  const e = await findEnrollment(learner, courseId)
  if (!e) return 1
  const q = `?enrollment_id=eq.${e.id}&lesson_key=eq.${encodeURIComponent(lessonKey)}&kind=eq.${kind}&select=attempt_no`
  const rows = await rest('attempts', { query: q })
  const nums = (rows ?? []).map((r) => Number(r.attempt_no)).filter((n) => Number.isFinite(n))
  return nums.length ? Math.max(...nums) + 1 : 1
}

/** Penulisan usaha SETELAH pemanggilnya sudah membuktikan dirinya (atau setelah server yang menilai). */
export async function storeAttempt ({ learner, courseId, lessonKey = '-', kind, attemptNo = 1, score, verdict,
  rubricHash, judgeModel, judgeTemp, deductions, components }) {
  if (!['kuis', 'esai', 'praktik', 'ujian'].includes(kind)) return { ok: false, why: `unknown attempt kind: ${kind}` }
  if (score === null || score === undefined || Number.isNaN(Number(score))) return { ok: false, why: 'score must be a number' }
  const s = Number(score)
  if (s < 0 || s > 100) return { ok: false, why: `score outside 0..100: ${s}` }
  const enrollment = await findEnrollment(learner, courseId)
  if (!enrollment) return { ok: false, why: 'learner not enrolled in this course — no row to attach the attempt to' }

  const attemptHash = computeAttemptHash({ learner, courseId, lessonKey, kind, attemptNo, score: s, rubricHash })
  const rows = await rest('attempts', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{
      enrollment_id: enrollment.id, lesson_key: lessonKey, kind, attempt_no: attemptNo,
      score: s, verdict: verdict ?? (s >= 0 ? 'graded' : 'incomplete'),
      rubric_hash: rubricHash ?? null, attempt_hash: attemptHash,
      judge_model: judgeModel ?? null, judge_temp: judgeTemp ?? null,
      deductions: deductions ?? [],
    }],
  })
  const attempt = rows?.[0] ?? null
  if (attempt && Array.isArray(components) && components.length) {
    await rest('attempt_components', {
      method: 'POST',
      body: components.map((c) => ({
        attempt_id: attempt.id, item_id: String(c.itemId), score: c.score ?? null,
        weight: c.weight ?? 0, graded_by: c.gradedBy ?? 'mechanical',
      })),
    })
  }
  return { ok: true, attempt, attemptHash }
}

/** Dua gerbang dibaca terpisah, bukan digabung (bar 6). */
export async function courseGates (learner, courseId) {
  const q = `?learner=eq.${encodeURIComponent(getAddress(learner))}&course_id=eq.${encodeURIComponent(courseId)}&select=*`
  const rows = await rest('course_gates', { query: q })
  return rows?.[0] ?? null
}

export async function latestAttemptHashFor (learner, courseId, kind = 'ujian') {
  const e = await findEnrollment(learner, courseId)
  if (!e) return null
  const q = `?enrollment_id=eq.${e.id}&kind=eq.${kind}&order=attempt_no.desc,created_at.desc&limit=1&select=attempt_hash,score,verdict`
  const rows = await rest('attempts', { query: q })
  return rows?.[0] ?? null
}

/**
 * SEMUA usaha peserta di satu kursus, lengkap dengan komponennya, dalam satu permintaan.
 *
 * Dipakai `issue --from-attempts` (B62): yang dibutuhkan penerbit bukan "skor terbaik", melainkan
 * baris yang bisa ditunjuk saat ada yang bertanya "87 ini dari mana". `attempt_components(...)` di
 * sini adalah embed PostgREST melalui FK `attempt_components.attempt_id` (migrasi 0001), jadi satu
 * round-trip, bukan N+1 query — dan yang dibaca adalah kolom aslinya, bukan turunan yang kita
 * simpan di tempat lain.
 */
export async function attemptsFor (learner, courseId) {
  const e = await findEnrollment(learner, courseId)
  if (!e) return []
  const q = `?enrollment_id=eq.${e.id}`
    + '&order=kind.asc,lesson_key.asc,attempt_no.asc'
    + '&select=id,lesson_key,kind,attempt_no,score,verdict,rubric_hash,attempt_hash,judge_model,judge_temp,created_at,'
    + 'attempt_components(item_id,score,weight,graded_by)'
  return (await rest('attempts', { query: q })) ?? []
}

/** Nonce disimpan di DB, dan itu harus bisa dibuktikan — bukan dipercaya dari komentar. */
export async function usedNonceExists (nonce) {
  const rows = await rest('used_nonces', { query: `?nonce=eq.${encodeURIComponent(nonce)}&select=nonce` })
  return (rows?.length ?? 0) > 0
}

/* ------------------------------------------------------------------ progres per lesson (bar 4) */
const PROGRESS_STATES = ['locked', 'unlocked', 'started', 'completed']
// state machine yang ditegakkan, bukan kolom yang dipercaya. Canvas/edX/Moodle punya ini duluan;
// kita baru punya tabelnya. Tanpa aturan, "progres" tinggal angka yang bisa di-set apa saja.
const ALLOWED_MOVE = {
  locked: ['unlocked'],
  unlocked: ['started', 'completed'],
  started: ['completed'],
  completed: [],
}

/**
 * Mencatat satu perpindahan status lesson atas nama peserta.
 * Menulis dua tempat: baris state (`lesson_progress`) dan jejaknya (`progress_events`) — karena
 * "server-side progress" yang hanya menyimpan state akhir tidak bisa menjawab pertanyaan peserta
 * atau penerbit: kapan ini selesai, dan sebelumnya apa.
 */
export async function setLessonProgress ({ learner, courseId, lessonId, to, position = 0, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature, scope: 'progress' })
  if (!auth.ok) return { ok: false, why: auth.why }
  if (typeof lessonId !== 'string' || !lessonId.length) return { ok: false, why: 'lesson required' }
  if (!PROGRESS_STATES.includes(to)) return { ok: false, why: `unknown status: ${to}` }

  const enrollment = await findEnrollment(learner, courseId)
  if (!enrollment) return { ok: false, why: 'learner not enrolled in this course — progress cannot hang on a row that does not exist' }

  const rows = await rest('lesson_progress', {
    query: `?enrollment_id=eq.${enrollment.id}&lesson_id=eq.${encodeURIComponent(lessonId)}&select=status`,
  })
  const current = rows?.[0]?.status ?? 'locked'
  if (current === to) return { ok: true, enrollmentId: enrollment.id, from: current, to, noop: true }
  if (!ALLOWED_MOVE[current].includes(to)) {
    return { ok: false, why: `status transition ${current} -> ${to} not allowed (state machine: ${PROGRESS_STATES.join(' -> ')})` }
  }

  const upserted = await rest('lesson_progress', {
    method: 'POST',
    query: '?on_conflict=enrollment_id,lesson_id',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: [{
      enrollment_id: enrollment.id, lesson_id: lessonId, status: to, position,
      completed_at: to === 'completed' ? new Date().toISOString() : null,
    }],
  })
  await rest('progress_events', {
    method: 'POST',
    body: [{ enrollment_id: enrollment.id, lesson_id: lessonId, from_status: current, to_status: to }],
  })

  // enrollment ikut selesai HANYA kalau baris ini benar-benar completed; melihat "selesai" dan
  // "lulus" tetap dua hal berbeda (bar 6) dan view course_gates yang menghitung sisanya.
  if (to === 'completed' && upserted?.[0]) {
    await rest('enrollments', {
      method: 'PATCH',
      query: `?id=eq.${enrollment.id}`,
      prefer: 'return=minimal',
      body: [{ status: 'completed' }],
    })
  }
  return { ok: true, enrollmentId: enrollment.id, from: current, to, progressId: upserted?.[0]?.id ?? null }
}

/** Berapa lesson kursus ini, dan berapa yang sudah completed — untuk gerbang, bukan untuk dihias. */
export async function progressSummary (learner, courseId) {
  const gates = await courseGates(learner, courseId)
  if (!gates) return null
  const q = `?enrollment_id=eq.${gates.enrollment_id}&select=lesson_id,status&order=position.asc`
  const rows = await rest('lesson_progress', { query: q })
  const done = (rows ?? []).filter((r) => r.status === 'completed').map((r) => r.lesson_id)
  return {
    enrollmentId: gates.enrollment_id,
    // sengaja ikut dikembalikan: "selesai" tanpa penyebutnya tidak bisa dinilai oleh pembaca,
    // dan menyembunyikan 19 di balik satu kata boolean adalah cara view lain berbohong dengannya
    lessonsTotal: gates.lessons_total ?? 0,
    lessonsCompleted: gates.lessons_completed ?? 0,
    lessons: (rows ?? []).map((r) => ({ lessonId: r.lesson_id, status: r.status })),
    completed: done,
    gradedAttempts: gates.graded_attempts,
    bestScore: gates.best_score,
    // `bool_and` atas nol baris adalah NULL; dibaca sebagai "belum selesai", bukan "gagal"
    allLessonsDone: gates.all_lessons_done === true,
  }
}

/* ------------------------------------------------------------------ penyerahan esai (bar 5, 7, 8 — B81)
 *
 * Kenapa fungsi ini ada: sampai 29 Sep, angka esai masuk lewat `POST /attempts`, yaitu angka yang
 * dilaporkan klien. Itu satu-satunya jalan masuk angka yang masih di luar kendali penerbit — dan
 * `attempt_hash` justru membekukannya supaya terlihat sah. Sekarang urutannya:
 *
 *   peserta menyerahkan TEKS (`submitEssay`) → usaha tersimpan TANPA skor, `verdict='incomplete'`,
 *   gerbang mekanis `grade.js` dihitung server → penerbit mengirim PENILAIAN yang ditandatangani
 *   EOA-nya sendiri (`judgeEssay`) → skor + komponen per kriteria masuk → hash dihitung ulang.
 *
 * Yang menahan tulis tetap tanda tangan, bukan RLS: secret key punya `BYPASSRLS`. Bedanya, pihak yang
 * boleh menulis angka bukan lagi peserta — `judgeEssay` menuntut tanda tangan dari alamat yang juga
 * (diperiksa di pemanggil) tercatat sebagai penerbit di chain (`isIssuer`).
 */

/** Alamat + kursus dari baris enrollment: `attempts` menyimpan id-nya, bukan alamatnya. */
async function enrollmentOf (enrollmentId) {
  const rows = await rest('enrollments', { query: `?id=eq.${Number(enrollmentId)}&select=learner,course_id` })
  return rows?.[0] ?? null
}

/** Satu penyerahan esai. Tidak ada angka dari klien: yang masuk teks, angkanya milik penerbit nanti. */
export async function submitEssay ({ learner, courseId, lessonKey, text, words, mechanical, state, rubricHash, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature, scope: 'essay' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  if (typeof lessonKey !== 'string' || !lessonKey.length) return { ok: false, why: 'lesson required' }
  if (typeof text !== 'string' || !text.trim()) return { ok: false, why: 'empty essay text — nothing to grade' }
  if (!['awaiting_judge', 'insufficient'].includes(state)) {
    return { ok: false, why: `unknown submission state: ${state}` }
  }

  const enrollment = await findEnrollment(learner, courseId)
  if (!enrollment) return { ok: false, why: 'learner not enrolled in this course — no row to attach the submission to' }

  const attemptNo = await nextAttemptNo(learner, courseId, lessonKey, 'esai')
  // Hash dihitung dari baris sebagaimana adanya: TANPA skor. Sesudah dinilai, `judgeEssay`
  // menghitungnya ulang — itu benar, karena hash ini sidik jari rekaman, bukan identitas permanen.
  const attemptHash = computeAttemptHash({
    learner, courseId, lessonKey, kind: 'esai', attemptNo, score: null, rubricHash,
  })
  const rows = await rest('attempts', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{
      enrollment_id: enrollment.id, lesson_key: lessonKey, kind: 'esai', attempt_no: attemptNo,
      score: null, verdict: 'incomplete', rubric_hash: rubricHash ?? null, attempt_hash: attemptHash,
    }],
  })
  const attempt = rows?.[0] ?? null
  if (!attempt) return { ok: false, why: 'failed to write the attempts row for the essay' }

  // Tanda mekanis disimpan sebagai komponen supaya bisa dihitung ulang: 100 bila terpenuhi, 0 bila
  // tidak, `weight` 0 karena dia BUKAN bagian bobot rubrik — dia syarat sebelum boleh menilai.
  if (Array.isArray(mechanical) && mechanical.length) {
    await rest('attempt_components', {
      method: 'POST',
      body: mechanical.map((m) => ({
        attempt_id: attempt.id, item_id: `mech:${m.label}`, score: m.ok ? 100 : 0,
        weight: 0, graded_by: 'mechanical',
      })),
    })
  }

  await rest('submissions', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{
      attempt_id: attempt.id, learner: getAddress(learner), course_id: courseId, lesson_key: lessonKey,
      body: text, words: Number(words) || 0, mechanical: mechanical ?? [], state,
    }],
  })

  return { ok: true, attemptId: attempt.id, attemptHash, attemptNo, state, words: Number(words) || 0 }
}

/** Antrean penilaian penerbit: yang menunggu, paling lama lebih dulu. */
export async function queuePendingEssays (courseId, limit = 20) {
  const q = `?state=eq.awaiting_judge${courseId ? `&course_id=eq.${encodeURIComponent(courseId)}` : ''}`
    + `&order=awaiting_since.asc&limit=${Number(limit) || 20}`
    + '&select=id,attempt_id,learner,course_id,lesson_key,body,words,mechanical,awaiting_since,'
    + 'attempts(lesson_key,attempt_no,rubric_hash,attempt_hash,kind,verdict,score)'
  return (await rest('submissions', { query: q })) ?? []
}

/**
 * Penilaian oleh PEMERBIT atas nama kunci EOA-nya sendiri.
 *
 * @param scores  `[{ label, score }]` — harus menutup SELURUH kriteria rubrik penerbit
 * @param essay   `Lesson.essay` dari manifest penerbit; sumber `max` per kriteria, BUKAN dari klien
 */
export async function judgeEssay ({ attemptId, issuer, message, signature, scores, essay, passMark, judgeModel, judgeTemp }) {
  if (!essay?.rubric?.length) return { ok: false, why: 'essay rubric from the publisher is unreadable — nothing to grade' }
  if (typeof message !== 'string' || typeof signature !== 'string') return { ok: false, why: 'requires message + signature from the publisher' }
  const nonce = /nonce=([0-9a-f]{12,})/.exec(message)?.[1]
  if (!nonce) return { ok: false, why: 'judgement message carries no nonce' }
  let verified = false
  try {
    verified = await verifyMessage({ address: getAddress(issuer), message, signature })
  } catch (e) {
    return { ok: false, kind: 'auth', why: `signature verification failed: ${String(e.message ?? e).slice(0, 80)}` }
  }
  if (!verified) return { ok: false, kind: 'auth', why: 'signature does not belong to the claimed signer address' }
  const consumed = await consumeNonce({ nonce, learner: issuer, scope: 'essay-judge' })
  if (!consumed.ok) return { ok: false, kind: 'auth', why: consumed.why }

  const rows = await rest('attempts', { query: `?id=eq.${Number(attemptId)}&select=*` })
  const attempt = rows?.[0]
  if (!attempt) return { ok: false, why: `attempt ${attemptId} does not exist` }
  if (attempt.kind !== 'esai') return { ok: false, why: `attempt ${attemptId} is not an essay (${attempt.kind}) — no text to grade` }
  const holder = await enrollmentOf(attempt.enrollment_id)
  if (!holder) return { ok: false, why: `enrollment row ${attempt.enrollment_id} missing — this attempt is orphaned` }

  const known = new Map(essay.rubric.map((r) => [String(r.label), r]))
  const given = new Map((scores ?? []).map((s) => [String(s.label), s]))
  const asing = [...given.keys()].filter((k) => !known.has(k))
  if (asing.length) return { ok: false, why: `foreign criteria rejected: ${asing.join(', ')} are not part of the publisher's rubric` }

  /**
   * KOLOM `score` DI `attempt_components` PUNYA SATU ARTI: persen 0..100.
   *
   * Ini jebakan yang saya temukan sambil menulis fungsi ini. Kuis sudah memakai arti itu (setiap soal
   * dinilai 0/100, `weight` 1). Rubrik esai penerbit memakai `{label, max}` dengan max 25/25/25/
   * 15/10 — kalau angka mentah 0..max yang disimpan, `fromAttempts` (rata-rata berbobot) akan
   * menghitung karangan yang nilainya penuh jadi **22 dari 100**, dan kertasnya tercetak sah. Angka
   * yang salah tanpa satu pun baris merah adalah kegagalan terburuk yang bisa kita produksi.
   *
   * Jadi yang disimpan adalah persen (`v / max * 100`), `weight` = max penerbit. Dengan begitu
   * penjumlahan berbobot di sisi pembaca kembali persis sama dengan total yang kami simpan:
   * Σ(persen_i × max_i) / Σ max_i = Σ v_i · 100 / 100 = Σ v_i.
   */
  const components = []
  let total = 0
  for (const r of essay.rubric) {
    const v0 = given.get(String(r.label))
    if (!v0 || !Number.isFinite(Number(v0.score))) {
      return { ok: false, why: `criterion "${r.label}" not graded — a partial rubric must not produce a final score` }
    }
    const max = Number(r.max)
    if (!Number.isFinite(max) || max <= 0) {
      return { ok: false, why: `criterion "${r.label}" has no valid max in the publisher manifest — cannot normalise to a percentage` }
    }
    const v = Math.max(0, Math.min(max, Math.round(Number(v0.score))))
    components.push({
      attempt_id: attempt.id, item_id: `crit:${r.label}`,
      score: Math.round((v / max) * 10000) / 100,
      weight: max, graded_by: judgeModel ? 'model' : 'human',
    })
    total += v
  }

  const score = Math.round(total * 100) / 100
  const verdict = Number.isFinite(Number(passMark)) ? (score >= Number(passMark) ? 'pass' : 'fail') : 'graded'
  const attemptHash = computeAttemptHash({
    learner: holder.learner, courseId: holder.course_id, lessonKey: attempt.lesson_key, kind: 'esai',
    attemptNo: attempt.attempt_no, score, rubricHash: attempt.rubric_hash,
  })

  // Regrade harus idempoten: komponen model/manusia lama dibuang lebih dulu. Kalau tidak, dua
  // penilaian bertumpuk dan angka yang dibaca `fromAttempts` adalah hasil penjumlahan dua sesi.
  await rest('attempt_components', { method: 'DELETE', query: `?attempt_id=eq.${attempt.id}&graded_by=in.(model,human)` })
  await rest('attempt_components', { method: 'POST', body: components })
  await rest('attempts', {
    method: 'PATCH', query: `?id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ score, verdict, attempt_hash: attemptHash, judge_model: judgeModel ?? null, judge_temp: judgeTemp ?? null }],
  })
  await rest('submissions', {
    method: 'PATCH', query: `?attempt_id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ state: 'judged', judged_at: new Date().toISOString() }],
  })

  return { ok: true, attemptId: attempt.id, attemptHash, score, verdict, components: components.length, replacedHash: attempt.attempt_hash }
}
