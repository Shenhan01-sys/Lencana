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
    throw new Error(`DB menolak ${method} ${table}: HTTP ${r.status} ${text.slice(0, 180)}`)
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
    if (/duplicate|already exists|409/i.test(msg)) return { ok: false, why: 'nonce sudah dipakai (replay)' }
    return { ok: false, why: `gagal memakai nonce: ${msg.slice(0, 90)}` }
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
    return { ok: false, why: 'alamat peserta tidak valid' }
  }
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return { ok: false, why: 'tanda tangan tidak valid' }
  }
  if (typeof message !== 'string' || message.length < 16) {
    return { ok: false, why: 'pesan tanda tangan terlalu pendek' }
  }
  const nonce = /nonce=([0-9a-f]{12,})/.exec(message)?.[1]
  if (!nonce) return { ok: false, why: 'pesan tidak memuat nonce' }
  let verified = false
  try {
    verified = await verifyMessage({ address: getAddress(learner), message, signature })
  } catch (e) {
    return { ok: false, why: `verifikasi gagal: ${String(e.message ?? e).slice(0, 90)}` }
  }
  if (!verified) return { ok: false, why: 'tanda tangan bukan dari alamat peserta ini' }
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
  if (!Number.isInteger(total) || total < 0) return { ok: false, why: `lessons_total tidak valid: ${lessonsTotal}` }
  const existing = await findEnrollment(learner, courseId)
  if (existing) return { ok: true, enrollment: existing, created: false }
  const rows = await rest('enrollments', {
    method: 'POST',
    query: '?on_conflict=learner,course_id',
    prefer: 'resolution=merge-duplicates,return=representation',
    // lessons_total ikut ditulis saat baris dibuat: tanpa penyebut itu, "selesai" tidak bisa
    // dihitung dan view akan mengembalikan NULL selamanya.
    body: [{ learner: getAddress(learner), course_id: courseId, status: 'active', lessons_total: total }],
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
  if (!['kuis', 'esai', 'praktik', 'ujian'].includes(kind)) return { ok: false, why: `jenis usaha tidak dikenal: ${kind}` }
  if (score === null || score === undefined || Number.isNaN(Number(score))) return { ok: false, why: 'score wajib angka' }
  const s = Number(score)
  if (s < 0 || s > 100) return { ok: false, why: `score di luar 0..100: ${s}` }
  const enrollment = await findEnrollment(learner, courseId)
  if (!enrollment) return { ok: false, why: 'peserta belum enroll di kursus ini — tidak ada baris untuk menempelkan usaha' }

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
  if (typeof lessonId !== 'string' || !lessonId.length) return { ok: false, why: 'lesson wajib diisi' }
  if (!PROGRESS_STATES.includes(to)) return { ok: false, why: `status tidak dikenal: ${to}` }

  const enrollment = await findEnrollment(learner, courseId)
  if (!enrollment) return { ok: false, why: 'peserta belum enroll di kursus ini — progres tidak bisa menggantung ke baris yang tidak ada' }

  const rows = await rest('lesson_progress', {
    query: `?enrollment_id=eq.${enrollment.id}&lesson_id=eq.${encodeURIComponent(lessonId)}&select=status`,
  })
  const current = rows?.[0]?.status ?? 'locked'
  if (current === to) return { ok: true, enrollmentId: enrollment.id, from: current, to, noop: true }
  if (!ALLOWED_MOVE[current].includes(to)) {
    return { ok: false, why: `pindah status ${current} -> ${to} tidak diizinkan (mesin: ${PROGRESS_STATES.join(' -> ')})` }
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
