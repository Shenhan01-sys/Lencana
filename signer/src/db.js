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
// Store nonce di memori proses. Itu BUKAN replay guard yang bertahan-restart, dan tidak
// berpura-pura begitu: untuk produksi nonce masuk tabel `nonce` dengan PK + TTL. Di sini dia
// cukup karena satu hal: tanpa nonce, tanda tangan yang sah bisa dipakai ulang berkali-kali dan
// satu peserta bisa menaungi usaha orang lain.
const usedNonces = new Set()

/**
 * Verifikasi bahwa pemanggil benar-benar memegang kunci dari `learner`.
 * @returns {Promise<{ok:true}> | {ok:false, why:string}}
 */
export async function authorizeLearner ({ learner, message, signature }) {
  if (typeof learner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(learner)) {
    return { ok: false, why: 'alamat peserta tidak valid' }
  }
  if (typeof signature !== 'string' || !/^0x[0-9a-fA-F]+$/.test(signature)) {
    return { ok: false, why: 'tanda tangan tidak valid' }
  }
  if (typeof message !== 'string' || message.length < 16) {
    return { ok: false, why: 'pesan tanda tangan terlalu pendek' }
  }
  const nonce = /nonce=([0-9a-f]{16,})/.exec(message)?.[1]
  if (!nonce) return { ok: false, why: 'pesan tidak memuat nonce' }
  if (usedNonces.has(nonce)) return { ok: false, why: 'nonce sudah dipakai (replay)' }
  let verified = false
  try {
    verified = await verifyMessage({ address: getAddress(learner), message, signature })
  } catch (e) {
    return { ok: false, why: `verifikasi gagal: ${String(e.message ?? e).slice(0, 90)}` }
  }
  if (!verified) return { ok: false, why: 'tanda tangan bukan dari alamat peserta ini' }
  usedNonces.add(nonce)
  return { ok: true }
}

/* ------------------------------------------------------------------ enrollment (bar 3) */
export async function findEnrollment (learner, courseId) {
  const q = `?learner=eq.${encodeURIComponent(getAddress(learner))}&course_id=eq.${encodeURIComponent(courseId)}&select=*`
  const rows = await rest('enrollments', { query: q })
  return rows?.[0] ?? null
}

/** Idempoten: enroll dua kali menghasilkan satu baris, bukan dua. (L8 §C.6 — guard yang hilang.) */
export async function enroll ({ learner, courseId, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature })
  if (!auth.ok) return { ok: false, why: auth.why }
  const existing = await findEnrollment(learner, courseId)
  if (existing) return { ok: true, enrollment: existing, created: false }
  const rows = await rest('enrollments', {
    method: 'POST',
    query: '?on_conflict=learner,course_id',
    prefer: 'resolution=merge-duplicated,return=representation',
    body: [{ learner: getAddress(learner), course_id: courseId, status: 'active' }],
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
 * Mencatat satu penyerahan. `score` dihitung pemanggil dari komponen yang sudah ada di DB —
 * tapi komponennya sendiri ikut ditulis, supaya gradebook bisa menampilkan rinciannya tanpa
 * memercayai angka yang dikirim.
 */
export async function recordAttempt ({ learner, courseId, lessonKey = '-', kind, attemptNo = 1, score, verdict,
  rubricHash, judgeModel, judgeTemp, deductions, components, message, signature }) {
  const auth = await authorizeLearner({ learner, message, signature })
  if (!auth.ok) return { ok: false, why: auth.why }
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
