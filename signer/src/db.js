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

// Lencana-B78 status=SELESAI 2026-09-30 — setiap enrollment membawa origin (demo|test|unknown; default unknown) supaya baris harness bisa dibedakan dari baris demo, dan view course_gates ikut mengeluarkannya (migrasi 0008). Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B78 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B81 status=SELESAI 2026-09-29 — esai/praktik masuk sebagai rekaman + antrean penilaian penerbit; angka tidak diterima dari klien. Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B81 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B72 status=SELESAI 2026-09-29 — state belajar hidup di Postgres (server-side), bukan localStorage browser. Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B72 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { keccak256, encodeAbiParameters, getAddress } from 'viem'
import { verifyMessage } from 'viem/utils'
import { isLabel, DIFFICULTY_LABELS } from './pricing.js'

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
    + '&select=id,lesson_key,kind,attempt_no,score,verdict,rubric_hash,attempt_hash,judge_model,judge_temp,graded_by_agent,difficulty_label,created_at,'
    + 'attempt_components(item_id,score,weight,graded_by),'
    // B104: pengesahan manusia ikut terbaca bersama usahanya — `fromAttempts` menolak esai bernilai
    // model yang tidak membawanya, jadi kalau embed ini hilang, penerbitan berhenti, bukan lolos.
    + 'judgement_reviews(decision,reviewer,proposed,final_score,judge_model,reviewed_at)'
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
  // Penilaian ulang = usulan baru. Pengesahan yang menempel pada usulan lama tidak boleh ikut
  // mengesahkan angka yang belum pernah dilihat reviewernya (B104).
  await rest('judgement_reviews', { method: 'DELETE', query: `?attempt_id=eq.${attempt.id}` })
  await rest('attempt_components', { method: 'POST', body: components })
  await rest('attempts', {
    method: 'PATCH', query: `?id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ score, verdict, attempt_hash: attemptHash, judge_model: judgeModel ?? null, judge_temp: judgeTemp ?? null }],
  })
  await rest('submissions', {
    method: 'PATCH', query: `?attempt_id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ state: 'judged', judged_at: new Date().toISOString() }],
  })

  return {
    ok: true, attemptId: attempt.id, attemptHash, score, verdict, components: components.length, replacedHash: attempt.attempt_hash,
    // Angka model belum dihitung gerbang sampai ada pengesahan manusia; angka penerbit-manusia langsung.
    needsReview: Boolean(judgeModel),
  }
}

/* ------------------------------------------------------------------ pengesahan manusia (B104) */

// Lencana-B104 status=SELESAI 2026-09-30 — angka esai dari model baru dihitung kalau reviewer terdaftar (bukan penerbit) menandatangani approved/adjusted; pesan yang ditandatangani mengikat usaha, keputusan, dan angka akhirnya. Buktikan ulang: npm run verify:db. JANGAN dibalik/diulang tanpa membuka kembali baris B104 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/** Tanda tangan EIP-191 atas pesan ber-nonce, oleh `signer` — mekanisme yang sama dengan `judgeEssay`. */
async function authorizeSigner ({ signer, message, signature, scope }) {
  if (typeof signer !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(signer)) return { ok: false, kind: 'auth', why: 'invalid signer address' }
  if (typeof message !== 'string' || typeof signature !== 'string') return { ok: false, kind: 'auth', why: 'requires message + signature' }
  const nonce = /nonce=([0-9a-f]{12,})/.exec(message)?.[1]
  if (!nonce) return { ok: false, kind: 'auth', why: 'message carries no nonce' }
  let verified = false
  try {
    verified = await verifyMessage({ address: getAddress(signer), message, signature })
  } catch (e) {
    return { ok: false, kind: 'auth', why: `signature verification failed: ${String(e.message ?? e).slice(0, 80)}` }
  }
  if (!verified) return { ok: false, kind: 'auth', why: 'signature does not belong to the claimed signer address' }
  const consumed = await consumeNonce({ nonce, learner: signer, scope })
  if (!consumed.ok) return { ok: false, kind: 'auth', why: consumed.why }
  return { ok: true }
}

/**
 * Penerbit menunjuk reviewer untuk satu kursus. Pesan yang ditandatangani harus menyebut kursus dan
 * alamat reviewernya: tanda tangan atas nonce saja bisa ditempelkan ke penunjukan siapa pun.
 */
export async function addReviewer ({ courseId, reviewer, issuer, message, signature, agent = null }) {
  if (typeof reviewer !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(reviewer)) return { ok: false, why: 'reviewer must be a 20-byte address' }
  if (reviewer.toLowerCase() === String(issuer).toLowerCase()) {
    return { ok: false, why: 'the publisher cannot appoint itself as reviewer — the review must come from a different key' }
  }
  // B120: reviewer agen ERC-8004 — faktanya dibaca dari registry oleh pemanggil (`src/agents.js`);
  // pesan penerbit wajib menyebut agentId-nya juga.
  const wants = [`course=${courseId}`, `reviewer=${reviewer.toLowerCase()}`, ...(agent ? [`agent=${agent.agentId}`] : [])]
  if (typeof message !== 'string' || !wants.every((w) => message.toLowerCase().includes(w.toLowerCase()))) {
    return { ok: false, why: `signed message must state ${wants.join(' and ')}` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'review-role' })
  if (!auth.ok) return auth
  await rest('review_roles', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      course_id: courseId, reviewer: getAddress(reviewer), added_by: getAddress(issuer), message, signature,
      agent_id: agent ? String(agent.agentId) : null, agent_owner: agent ? getAddress(agent.owner) : null,
    }],
  })
  return { ok: true, courseId, reviewer: getAddress(reviewer), addedBy: getAddress(issuer), agentId: agent ? String(agent.agentId) : null }
}

/**
 * Pengesahan manusia atas satu usulan model.
 *
 * @param decision `approved` (angka model dipakai) | `adjusted` (angka reviewer menggantikannya) |
 *                 `rejected` (tidak ada angka yang sah; gerbang tetap tertutup)
 * @param scores   wajib untuk `adjusted`: `[{label, score}]` menutup SELURUH rubrik penerbit
 */
export async function reviewEssay ({ attemptId, reviewer, decision, scores, essay, passMark, message, signature }) {
  if (!['approved', 'adjusted', 'rejected'].includes(decision)) return { ok: false, why: 'decision must be approved, adjusted or rejected' }
  if (!essay?.rubric?.length) return { ok: false, why: 'essay rubric from the publisher is unreadable — nothing to review against' }

  const rows = await rest('attempts', { query: `?id=eq.${Number(attemptId)}&select=*` })
  const attempt = rows?.[0]
  if (!attempt) return { ok: false, why: `attempt ${attemptId} does not exist` }
  if (attempt.kind !== 'esai') return { ok: false, why: `attempt ${attemptId} is not an essay (${attempt.kind})` }
  if (String(attempt.verdict ?? 'incomplete') === 'incomplete' || attempt.score === null) {
    return { ok: false, why: 'this essay has no proposed score yet — there is nothing to review' }
  }
  if (!attempt.judge_model) {
    return { ok: false, why: 'this essay was graded by the publisher without a model — there is no model proposal to review' }
  }
  const holder = await enrollmentOf(attempt.enrollment_id)
  if (!holder) return { ok: false, why: `enrollment row ${attempt.enrollment_id} missing — this attempt is orphaned` }

  // Angka akhir dihitung SEBELUM tanda tangan diperiksa, karena pesan yang ditandatangani harus
  // menyebutnya: reviewer menandatangani keputusan atas usaha ini dengan angka ini, bukan nonce kosong.
  let components = null
  let finalScore = decision === 'approved' ? Number(attempt.score) : null
  if (decision === 'adjusted') {
    const known = new Map(essay.rubric.map((r) => [String(r.label), r]))
    const given = new Map((scores ?? []).map((s) => [String(s.label), s]))
    const asing = [...given.keys()].filter((k) => !known.has(k))
    if (asing.length) return { ok: false, why: `foreign criteria rejected: ${asing.join(', ')} are not part of the publisher's rubric` }
    components = []
    let total = 0
    for (const r of essay.rubric) {
      const v0 = given.get(String(r.label))
      if (!v0 || !Number.isFinite(Number(v0.score))) {
        return { ok: false, why: `criterion "${r.label}" not graded — an adjustment must cover the whole rubric` }
      }
      const max = Number(r.max)
      const v = Math.max(0, Math.min(max, Math.round(Number(v0.score))))
      // Bentuk kolom yang sama dengan `judgeEssay`: persen 0..100, weight = max penerbit.
      components.push({ attempt_id: attempt.id, item_id: `crit:${r.label}`, score: Math.round((v / max) * 10000) / 100, weight: max, graded_by: 'human' })
      total += v
    }
    finalScore = Math.round(total * 100) / 100
  }
  if (typeof reviewer !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(reviewer)) return { ok: false, kind: 'auth', why: 'invalid reviewer address' }
  // Lencana-B120 status=SELESAI 2026-10-01 — reviewer boleh agen ERC-8004 (D53/D54): ia wajib agen lain dengan Agent Owner lain dari agen pengusul, wajib menyebut label tingkat berat, dan agentId-nya tercatat di pengesahan. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B120 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  // Penunjukan dibaca lebih dulu (baca-saja): ia menentukan apakah reviewer ini agen ERC-8004 (B120),
  // dan agen wajib menyebut label tingkat berat di pesan yang ia tandatangani.
  const role = await rest('review_roles', {
    query: `?course_id=eq.${encodeURIComponent(holder.course_id)}&reviewer=eq.${getAddress(reviewer)}&select=added_by,agent_id,agent_owner`,
  })
  if (!role?.length) return { ok: false, kind: 'role', why: `${getAddress(reviewer)} is not a reviewer for ${holder.course_id}` }
  if (getAddress(reviewer) === getAddress(holder.learner)) return { ok: false, kind: 'role', why: 'a learner cannot review their own essay' }
  const reviewerAgent = role[0].agent_id ? { agentId: String(role[0].agent_id), owner: role[0].agent_owner } : null
  let label = null
  if (reviewerAgent) {
    // B120: penilai kedua tidak boleh agen yang sama, dan tidak boleh milik Agent Owner yang sama,
    // dengan agen yang mengusulkan angka — kalau boleh, lapis pengesahan runtuh jadi satu pihak dua kali.
    if (attempt.graded_by_agent && String(attempt.graded_by_agent) === reviewerAgent.agentId) {
      return { ok: false, kind: 'role', why: `reviewer agent ${reviewerAgent.agentId} is the agent that proposed this score` }
    }
    if (attempt.graded_by_agent) {
      const grader = await rest('agent_hires', {
        query: `?course_id=eq.${encodeURIComponent(holder.course_id)}&agent_id=eq.${encodeURIComponent(attempt.graded_by_agent)}&select=agent_owner`,
      })
      if (grader?.[0]?.agent_owner && String(grader[0].agent_owner).toLowerCase() === String(reviewerAgent.owner).toLowerCase()) {
        return { ok: false, kind: 'role', why: 'reviewer agent and proposing agent belong to the same Agent Owner' }
      }
    }
    label = /(?:^|\s)label=([a-z-]+)(?:\s|$)/.exec(String(message ?? ''))?.[1] ?? null
    if (!isLabel(label)) return { ok: false, kind: 'auth', why: `an agent reviewer must state label=<${DIFFICULTY_LABELS.join('|')}> in its signed message` }
  }

  const wants = [`attempt=${attempt.id}`, `decision=${decision}`, ...(finalScore === null ? [] : [`final=${finalScore}`]), ...(label ? [`label=${label}`] : [])]
  if (typeof message !== 'string' || !wants.every((w) => new RegExp(`(^|\\s)${w.replace(/[.]/g, '\\.')}(\\s|$)`).test(message))) {
    return { ok: false, kind: 'auth', why: `signed message must state ${wants.join(', ')}` }
  }

  const auth = await authorizeSigner({ signer: reviewer, message, signature, scope: 'essay-review' })
  if (!auth.ok) return auth

  const existing = await rest('judgement_reviews', { query: `?attempt_id=eq.${attempt.id}&select=decision,reviewer` })
  if (existing?.length) {
    return { ok: false, kind: 'conflict', why: `this proposal already has a review (${existing[0].decision}); a new one needs a new proposal from the publisher` }
  }

  const proposed = Number(attempt.score)
  let attemptHash = attempt.attempt_hash
  let verdict = attempt.verdict
  if (decision === 'adjusted') {
    verdict = Number.isFinite(Number(passMark)) ? (finalScore >= Number(passMark) ? 'pass' : 'fail') : 'graded'
    attemptHash = computeAttemptHash({
      learner: holder.learner, courseId: holder.course_id, lessonKey: attempt.lesson_key, kind: 'esai',
      attemptNo: attempt.attempt_no, score: finalScore, rubricHash: attempt.rubric_hash,
    })
    await rest('attempt_components', { method: 'DELETE', query: `?attempt_id=eq.${attempt.id}&graded_by=in.(model,human)` })
    await rest('attempt_components', { method: 'POST', body: components })
    // `judge_model` TIDAK dihapus: usulannya memang datang dari model, dan itu harus tetap terbaca.
    await rest('attempts', {
      method: 'PATCH', query: `?id=eq.${attempt.id}`, prefer: 'return=minimal',
      body: [{ score: finalScore, verdict, attempt_hash: attemptHash }],
    })
  }
  await rest('judgement_reviews', {
    method: 'POST', prefer: 'return=minimal',
    body: [{
      attempt_id: attempt.id, judge_model: attempt.judge_model, proposed, decision, final_score: finalScore,
      reviewer: getAddress(reviewer), message, signature,
      reviewer_agent_id: reviewerAgent?.agentId ?? null, difficulty_label: label,
    }],
  })
  return {
    ok: true, attemptId: attempt.id, decision, proposed, finalScore, verdict: decision === 'rejected' ? null : verdict,
    attemptHash, replacedHash: decision === 'adjusted' ? attempt.attempt_hash : null, reviewer: getAddress(reviewer), judgeModel: attempt.judge_model,
    reviewerAgent, label, gradedByAgent: attempt.graded_by_agent ?? null,
  }
}

/* ------------------------------------------------------------------ agen sewaan (B119, D54) */

// Lencana-B119 status=SELESAI 2026-10-01 — sewa agen penilai per kursus, penilaian bertanda tangan dompet agen dengan label tingkat berat yang ia pilih, dan tagihan per aktivitas. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/**
 * Penerbit menyewa agen penilai untuk satu kursus. Fakta tentang agen (dompet, pemilik) DIBACA dari
 * registry ERC-8004 oleh pemanggil (`src/agents.js`) dan diserahkan ke sini; fungsi ini hanya menuntut
 * tanda tangan penerbit atas pesan yang menyebut kursus dan `agentId`-nya.
 */
export async function hireAgent ({ courseId, agent, publisher, message, signature }) {
  const wants = [`course=${courseId}`, `agent=${agent.agentId}`]
  if (typeof message !== 'string' || !wants.every((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(message))) {
    return { ok: false, kind: 'auth', why: `signed message must state ${wants.join(' and ')}` }
  }
  const auth = await authorizeSigner({ signer: publisher, message, signature, scope: 'agent-hire' })
  if (!auth.ok) return auth
  await rest('agent_hires', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      course_id: courseId, agent_id: String(agent.agentId), registry: agent.registry, agent_wallet: getAddress(agent.wallet),
      agent_owner: getAddress(agent.owner), hired_by: getAddress(publisher), message, signature,
    }],
  })
  return { ok: true, courseId, agentId: String(agent.agentId), wallet: getAddress(agent.wallet), owner: getAddress(agent.owner) }
}

export async function agentHiresFor (courseId) {
  return (await rest('agent_hires', { query: `?course_id=eq.${encodeURIComponent(courseId)}&select=*` })) ?? []
}

export async function agentHire (courseId, agentId) {
  const rows = await rest('agent_hires', { query: `?course_id=eq.${encodeURIComponent(courseId)}&agent_id=eq.${encodeURIComponent(String(agentId))}&select=*` })
  return rows?.[0] ?? null
}

/** Reviewer agen (B120) yang ditunjuk untuk satu kursus — dipakai `hire` untuk menolak arah sebaliknya. */
export async function reviewerAgentsFor (courseId) {
  return (await rest('review_roles', { query: `?course_id=eq.${encodeURIComponent(courseId)}&agent_id=not.is.null&select=reviewer,agent_id,agent_owner` })) ?? []
}

/** Angka per kriteria → komponen persen (bentuk yang sama dengan `judgeEssay`). */
function rubricComponents ({ essay, scores, attemptId, gradedBy }) {
  const known = new Map(essay.rubric.map((r) => [String(r.label), r]))
  const given = new Map((scores ?? []).map((s) => [String(s.label), s]))
  const asing = [...given.keys()].filter((k) => !known.has(k))
  if (asing.length) return { ok: false, why: `foreign criteria rejected: ${asing.join(', ')} are not part of the publisher's rubric` }
  const components = []
  let total = 0
  for (const r of essay.rubric) {
    const v0 = given.get(String(r.label))
    if (!v0 || !Number.isFinite(Number(v0.score))) return { ok: false, why: `criterion "${r.label}" not graded — a partial rubric must not produce a final score` }
    const max = Number(r.max)
    const v = Math.max(0, Math.min(max, Math.round(Number(v0.score))))
    components.push({ attempt_id: attemptId, item_id: `crit:${r.label}`, score: Math.round((v / max) * 10000) / 100, weight: max, graded_by: gradedBy })
    total += v
  }
  return { ok: true, components, total: Math.round(total * 100) / 100 }
}

/**
 * Penilaian oleh AGEN sewaan (bukan penerbit). Yang menandatangani adalah dompet agen di registry;
 * pesannya wajib mengikat usaha, angka akhir, dan label tingkat berat pilihan agen. Angkanya usulan
 * model (`graded_by='model'`), jadi gerbang B104 menahannya sampai ada pengesahan.
 */
export async function agentJudgeEssay ({ attemptId, courseId, agent, scores, essay, passMark, judgeModel, judgeTemp, message, signature }) {
  if (!essay?.rubric?.length) return { ok: false, why: 'essay rubric from the publisher is unreadable — nothing to grade' }
  if (!judgeModel) return { ok: false, why: 'an agent judgement must name its model (judgeModel)' }
  const rows = await rest('attempts', { query: `?id=eq.${Number(attemptId)}&select=*` })
  const attempt = rows?.[0]
  if (!attempt) return { ok: false, why: `attempt ${attemptId} does not exist` }
  if (attempt.kind !== 'esai') return { ok: false, why: `attempt ${attemptId} is not an essay (${attempt.kind})` }
  const holder = await enrollmentOf(attempt.enrollment_id)
  if (!holder) return { ok: false, why: `enrollment row ${attempt.enrollment_id} missing — this attempt is orphaned` }
  if (holder.course_id !== courseId) return { ok: false, why: `attempt ${attemptId} belongs to ${holder.course_id}, not ${courseId}` }

  const scored = rubricComponents({ essay, scores, attemptId: attempt.id, gradedBy: 'model' })
  if (!scored.ok) return scored
  const label = /(?:^|\s)label=([a-z-]+)(?:\s|$)/.exec(String(message ?? ''))?.[1] ?? null
  if (!isLabel(label)) return { ok: false, kind: 'auth', why: `the agent must state label=<${DIFFICULTY_LABELS.join('|')}> in its signed message` }
  const wants = [`attempt=${attempt.id}`, `final=${scored.total}`, `label=${label}`]
  if (!wants.every((w) => new RegExp(`(^|\\s)${w.replace(/[.]/g, '\\.')}(\\s|$)`).test(message))) {
    return { ok: false, kind: 'auth', why: `signed message must state ${wants.join(', ')}` }
  }
  const auth = await authorizeSigner({ signer: agent.wallet, message, signature, scope: 'essay-agent-judge' })
  if (!auth.ok) return auth

  const score = scored.total
  const verdict = Number.isFinite(Number(passMark)) ? (score >= Number(passMark) ? 'pass' : 'fail') : 'graded'
  const attemptHash = computeAttemptHash({
    learner: holder.learner, courseId: holder.course_id, lessonKey: attempt.lesson_key, kind: 'esai',
    attemptNo: attempt.attempt_no, score, rubricHash: attempt.rubric_hash,
  })
  await rest('attempt_components', { method: 'DELETE', query: `?attempt_id=eq.${attempt.id}&graded_by=in.(model,human)` })
  await rest('judgement_reviews', { method: 'DELETE', query: `?attempt_id=eq.${attempt.id}` })
  await rest('attempt_components', { method: 'POST', body: scored.components })
  await rest('attempts', {
    method: 'PATCH', query: `?id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ score, verdict, attempt_hash: attemptHash, judge_model: judgeModel, judge_temp: judgeTemp ?? null, graded_by_agent: String(agent.agentId), difficulty_label: label }],
  })
  await rest('submissions', {
    method: 'PATCH', query: `?attempt_id=eq.${attempt.id}`, prefer: 'return=minimal',
    body: [{ state: 'judged', judged_at: new Date().toISOString() }],
  })
  return { ok: true, attemptId: attempt.id, attemptHash, replacedHash: attempt.attempt_hash, score, verdict, label, components: scored.components.length, needsReview: true }
}

/** Satu tagihan per aktivitas penilaian agen. Jumlahnya dihitung pemanggil dari tarif + label. */
export async function insertCharge (row) {
  const rows = await rest('agent_charges', { method: 'POST', prefer: 'return=representation', body: [row] })
  return rows?.[0] ?? null
}

export async function getCharge (id) {
  const rows = await rest('agent_charges', { query: `?id=eq.${Number(id)}&select=*` })
  return rows?.[0] ?? null
}

export async function chargesFor (attemptId) {
  return (await rest('agent_charges', { query: `?attempt_id=eq.${Number(attemptId)}&order=id.asc&select=*` })) ?? []
}

/** Hanya tagihan `due` yang bisa ditandai lunas — dua pembayaran untuk satu tagihan ditolak di sini. */
export async function markChargePaid ({ id, payer, settleTx, splitTx }) {
  const rows = await rest('agent_charges', {
    method: 'PATCH', query: `?id=eq.${Number(id)}&status=eq.due`, prefer: 'return=representation',
    body: [{ status: 'paid', payer: getAddress(payer), settle_tx: settleTx, split_tx: splitTx, paid_at: new Date().toISOString() }],
  })
  return rows?.[0] ?? null
}
