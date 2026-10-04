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
// Koreksi 1 Okt (B121), dibiarkan di sebelah marker supaya terbaca: untuk PRAKTIK kalimat marker B81 di
// atas tidak benar sampai 1 Okt — `POST /attempts` masih menerima angka praktik (dan kuis/esai) kiriman
// peserta. B121 menutupnya: `recordAttempt` menolak ketiga slot rubrik, praktik lewat `POST /praktik`.

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
  return { ok: true, enrollment: await insertEnrollment(learner, courseId, total), created: true }
}

/** Baris enrollment baru. Pemanggil yang memutuskan bolehkah (tanda tangan, dan untuk kursus berbayar: lunas). */
async function insertEnrollment (learner, courseId, total) {
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
  return rows?.[0] ?? null
}

/**
 * Enrollment kursus BERBAYAR (B125). Dipanggil sesudah tanda tangan peserta diverifikasi DAN settlement x402 sukses —
 * baris order mencatat jumlah, aset, dan tx settlement; uangnya sendiri ada di chain, bukan klaim tabel ini.
 */
export async function enrollPaid ({ learner, courseId, lessonsTotal = 0, asset, amount, txHash }) {
  const existing = await findEnrollment(learner, courseId)
  const enrollment = existing ?? await insertEnrollment(learner, courseId, Number(lessonsTotal) || 0)
  if (!enrollment) return { ok: false, why: 'enrollment row was not returned' }
  const orders = await rest('orders', {
    method: 'POST',
    prefer: 'return=representation',
    body: [{ enrollment_id: enrollment.id, asset: getAddress(asset), amount: String(amount), state: 'paid', tx_hash: txHash }],
  })
  return { ok: true, enrollment, order: orders?.[0] ?? null, created: !existing }
}

/** Kapan alamat ini terakhir menerima koin uji dalam `hours` jam terakhir (nonce faucet yang terpakai), atau null. */
export async function recentFaucetGrant (learner, hours) {
  const since = new Date(Date.now() - hours * 3_600_000).toISOString()
  const q = `?learner=eq.${encodeURIComponent(getAddress(learner))}&scope=eq.faucet&used_at=gte.${encodeURIComponent(since)}`
    + '&select=used_at&order=used_at.desc&limit=1'
  const rows = await rest('used_nonces', { query: q })
  return rows?.[0]?.used_at ?? null
}

/** Lepaskan nonce yang sudah terpakai (dipakai faucet kalau pencetakan gagal: peserta tidak boleh terkunci 24 jam tanpa koin). */
export async function forgetNonce (nonce) {
  await rest('used_nonces', { method: 'DELETE', query: `?nonce=eq.${encodeURIComponent(nonce)}` })
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
 *
 * Koreksi 1 Okt (B121): kalimat di atas benar untuk ANGKA yang dihitung `/grade`, tapi fungsi ini
 * sampai hari itu tetap menerima `kind` kuis/esai/praktik dengan skor kiriman peserta, dan
 * `fromAttempts` memakainya kalau komponennya ada. Sejak B121 ketiga slot rubrik ditolak di sini —
 * masing-masing punya jalur yang dinilai pihak lain (`/grade`, `/essay`, `/praktik`); yang tersisa
 * untuk jalur ini hanya `ujian`, yang tidak punya slot di rubrik (`unmapped` di `fromAttempts`).
 */
export const SELF_REPORT_REFUSED = { kuis: 'POST /grade', esai: 'POST /essay', praktik: 'POST /praktik' }
export async function recordAttempt ({ learner, courseId, lessonKey = '-', kind, attemptNo = 1, score, verdict,
  rubricHash, judgeModel, judgeTemp, deductions, components, message, signature }) {
  if (SELF_REPORT_REFUSED[kind]) {
    return { ok: false, kind: 'refused', why: `/attempts does not accept ${kind} scores from the learner — ${kind} is graded through ${SELF_REPORT_REFUSED[kind]}` }
  }
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

/* ------------------------------------------------------------------ bukti praktik (B121) */

// Lencana-B121 status=TERBUKA 2026-10-01 — core: kunci bukti praktik diklaim sebelum usaha disimpan, diikat sesudahnya, dilepas kalau penyimpanan gagal; yang belum: halaman belajar memanggil POST /praktik (fase FE). Buktikan ulang: npm run verify:praktik. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/**
 * Mengklaim satu bukti praktik SEBELUM usahanya disimpan (migrasi 0011). `proof_key` unik, jadi
 * transaksi atau dompet yang sudah dipakai peserta lain ditolak database, bukan oleh pengecekan
 * "select dulu" yang bisa didahului permintaan lain. Bukti tanpa kunci (eth-call) selalu lolos.
 * @returns {Promise<{ok:true,id:number} | {ok:false,kind:'used'|'error',why:string}>}
 */
export async function claimPraktikProof ({ courseId, lessonKey, learner, proof }) {
  try {
    const rows = await rest('praktik_proofs', {
      method: 'POST', prefer: 'return=representation',
      body: [{
        course_id: courseId, lesson_key: lessonKey, learner: getAddress(learner), proof_type: proof.type,
        proof_key: proof.key ?? null, wallet: proof.wallet ? getAddress(proof.wallet) : null, chain_id: proof.chainId,
        block_number: proof.blockNumber ?? null, tx_hash: proof.txHash ?? null, observed: proof.observed ?? {},
      }],
    })
    return { ok: true, id: rows?.[0]?.id }
  } catch (e) {
    const msg = String(e.message ?? e)
    if (/duplicate|already exists|409|23505/i.test(msg)) return { ok: false, kind: 'used', why: `this proof (${proof.key}) was already used for a practice attempt` }
    return { ok: false, kind: 'error', why: `could not record the proof: ${msg.slice(0, 90)}` }
  }
}

export async function attachPraktikProof (proofId, attemptId) {
  await rest('praktik_proofs', { method: 'PATCH', query: `?id=eq.${Number(proofId)}`, prefer: 'return=minimal', body: { attempt_id: Number(attemptId) } })
}

export async function releasePraktikProof (proofId) {
  await rest('praktik_proofs', { method: 'DELETE', query: `?id=eq.${Number(proofId)}&attempt_id=is.null`, prefer: 'return=minimal' })
}

export async function praktikProofsFor (attemptId) {
  return (await rest('praktik_proofs', { query: `?attempt_id=eq.${Number(attemptId)}&select=*` })) ?? []
}

/**
 * Khusus harness: lepaskan kunci bukti yang dipegang peserta ber-`origin=test` dari run sebelumnya,
 * supaya bukti tetap (dompet/transaksi yang sama) bisa diuji ulang. Kunci yang dipegang peserta
 * demo/unknown TIDAK disentuh — fungsi ini melaporkannya, dan harness yang memutuskan merah.
 * Usahanya sendiri dibiarkan; `npm run cleanup` yang membersihkannya bersama baris uji lain.
 */
export async function freeTestProofKey (key) {
  const rows = (await rest('praktik_proofs', { query: `?proof_key=eq.${encodeURIComponent(key)}&select=id,learner,course_id` })) ?? []
  let freed = 0
  const heldBy = []
  for (const r of rows) {
    const e = await findEnrollment(r.learner, r.course_id)
    if (e?.origin === 'test') {
      await rest('praktik_proofs', { method: 'DELETE', query: `?id=eq.${Number(r.id)}`, prefer: 'return=minimal' })
      freed++
    } else heldBy.push({ learner: r.learner, origin: e?.origin ?? null })
  }
  return { freed, heldBy }
}

/* ------------------------------------------------------------------ akun login peserta (B82, D57) */

// Lencana-B82 status=TERBUKA 2026-10-01 — alamat peserta diikat ke akun Privy hanya oleh pemanggil yang sudah memverifikasi token login dan kepemilikan dompet tertanam (src/privy.js); yang belum: uji dua peramban oleh builder. Buktikan ulang: npm run verify:privy. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/**
 * Mengikat satu alamat peserta ke akun login (migrasi 0012). Pemanggil WAJIB sudah membuktikan dua hal
 * (`src/privy.js`): token login sah untuk app kita, dan alamat ini dompet tertanam milik user token itu.
 * Satu alamat hanya bisa terikat ke satu akun — mencoba mengikatnya ke akun lain ditolak, bukan ditimpa.
 *
 * Dua langkah, masing-masing atomik di Postgres, supaya dua permintaan serentak tidak bisa saling
 * menimpa (versi pertama 1 Okt membaca dulu lalu upsert merge — di antara keduanya ada celah):
 *   1. INSERT … ON CONFLICT DO NOTHING RETURNING — baris lahir hanya kalau alamat itu belum terikat;
 *   2. kalau sudah ada, UPDATE last_seen_at dengan filter account_id yang SAMA — akun lain tidak cocok
 *      filter, tidak ada baris yang tersentuh, dan itu jawaban "conflict".
 */
export async function bindLearnerAccount ({ learner, accountId }) {
  const addr = getAddress(learner)
  const inserted = await rest('learner_accounts', {
    method: 'POST', query: '?on_conflict=learner', prefer: 'resolution=ignore-duplicates,return=representation',
    body: [{ learner: addr, provider: 'privy', account_id: accountId, wallet_type: 'privy-embedded' }],
  })
  if (inserted?.length) return { ok: true, learner: addr, created: true }
  const touched = await rest('learner_accounts', {
    method: 'PATCH', query: `?learner=eq.${addr}&account_id=eq.${encodeURIComponent(accountId)}`, prefer: 'return=representation',
    body: { last_seen_at: new Date().toISOString() },
  })
  if (touched?.length) return { ok: true, learner: addr, created: false }
  return { ok: false, kind: 'conflict', why: `learner ${addr} is already bound to a different account` }
}

export async function learnerAccount (learner) {
  const rows = await rest('learner_accounts', { query: `?learner=eq.${getAddress(learner)}&select=provider,wallet_type,linked_at,last_seen_at` })
  return rows?.[0] ?? null
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
    // B145: `reviewer_agent_id` ikut, supaya dokumen hasil bisa membedakan pengesah agen (B120) dari pengesah manusia.
    + 'judgement_reviews(decision,reviewer,proposed,final_score,judge_model,reviewed_at,reviewer_agent_id)'
  return (await rest('attempts', { query: q })) ?? []
}

/**
 * Rekaman milik SATU peserta untuk dashboard-nya (B124): semua enrollment, ringkasan per kursus, dan usaha yang
 * dinilai. Hanya dipanggil sesudah `authorizeLearner` — nilai adalah data pribadi. Proyeksinya sengaja sempit:
 * tanpa teks esai, tanpa komponen per soal, tanpa kolom yang tidak dibutuhkan halaman.
 */
export async function learnerRecords (learner) {
  const addr = getAddress(learner)
  const q = `?learner=eq.${encodeURIComponent(addr)}&select=id,course_id,status,enrolled_at&order=enrolled_at.asc`
  const enrollments = (await rest('enrollments', { query: q })) ?? []
  // B127: tiap kursus dibaca serentak (dan tiga bacaan per kursus juga serentak). Berurutan, empat kursus butuh >9 detik
  // (terukur 2 Okt di halaman Kursus); urutan hasil tetap urutan enrollment.
  const courses = await Promise.all(enrollments.map(async (e) => {
    const [summary, rawAttempts, rawOrders] = await Promise.all([
      progressSummary(addr, e.course_id),
      attemptsFor(addr, e.course_id),
      rest('orders', { query: `?enrollment_id=eq.${e.id}&select=asset,amount,state,tx_hash,created_at&order=created_at.asc` }),
    ])
    const attempts = rawAttempts.map((a) => {
      // Lencana-B146 status=SELESAI 2026-10-04 — `judgement_reviews` disematkan PostgREST sebagai OBJEK (attempt_id unik), bukan array; dulu dibaca `[0]` sehingga rapor peserta menampilkan setiap esai bernilai model sebagai "menunggu pengesahan" walau sudah disahkan dan kertasnya terbit. Buktikan ulang: npm run verify:agents (pemeriksaan rapor B146). JANGAN dibalik/diulang tanpa membuka kembali baris B146 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
      const jr = a.judgement_reviews
      const r = (Array.isArray(jr) ? jr[0] : jr) ?? null
      return {
        lesson: a.lesson_key, kind: a.kind, attemptNo: a.attempt_no, score: a.score, verdict: a.verdict,
        gradedByAgent: a.graded_by_agent ?? null, judgeModel: a.judge_model ?? null, at: a.created_at,
        review: r ? { decision: r.decision, finalScore: r.final_score ?? null, at: r.reviewed_at ?? null } : null,
        // B126: praktik dihitung rubrik hanya kalau dinilai chain (B121, `fromAttempts.js`) — dashboard memakai tanda ini
        // supaya perkiraan nilainya mengikuti aturan yang sama, bukan menghitung laporan peserta.
        chainChecked: (a.attempt_components ?? []).some((c) => c?.graded_by === 'chain'),
      }
    })
    const orders = (rawOrders ?? [])
      .map((o) => ({ asset: o.asset, amount: String(o.amount), state: o.state, tx: o.tx_hash ?? null, at: o.created_at }))
    return { courseId: e.course_id, status: e.status, enrolledAt: e.enrolled_at, summary, attempts, orders }
  }))
  return { learner: addr, courses }
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
export async function addReviewer ({ courseId, reviewer, issuer, signer = issuer, message, signature, agent = null }) {
  if (typeof reviewer !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(reviewer)) return { ok: false, why: 'reviewer must be a 20-byte address' }
  if (reviewer.toLowerCase() === String(issuer).toLowerCase()) {
    return { ok: false, why: 'the publisher cannot appoint itself as reviewer — the review must come from a different key' }
  }
  // B129: anggota penerbit (`appoint=1`) boleh menunjuk — tetapi tidak menunjuk dirinya sendiri.
  if (reviewer.toLowerCase() === String(signer).toLowerCase()) {
    return { ok: false, why: 'a member cannot appoint itself as reviewer — the review must come from a different key' }
  }
  // B120: reviewer agen ERC-8004 — faktanya dibaca dari registry oleh pemanggil (`src/agents.js`);
  // pesan penerbit wajib menyebut agentId-nya juga.
  const wants = [`course=${courseId}`, `reviewer=${reviewer.toLowerCase()}`, ...(agent ? [`agent=${agent.agentId}`] : [])]
  if (typeof message !== 'string' || !wants.every((w) => message.toLowerCase().includes(w.toLowerCase()))) {
    return { ok: false, why: `signed message must state ${wants.join(' and ')}` }
  }
  const auth = await authorizeSigner({ signer, message, signature, scope: 'review-role' })
  if (!auth.ok) return auth
  await rest('review_roles', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      course_id: courseId, reviewer: getAddress(reviewer), added_by: getAddress(signer), message, signature,
      agent_id: agent ? String(agent.agentId) : null, agent_owner: agent ? getAddress(agent.owner) : null,
    }],
  })
  return { ok: true, courseId, reviewer: getAddress(reviewer), addedBy: getAddress(signer), agentId: agent ? String(agent.agentId) : null }
}

/* ------------------------------------------------------------------ anggota penerbit (B128, D63) */
// Lencana-B128 status=TERBUKA 2026-10-02 — hibah dan cabut keanggotaan penerbit hanya dari pesan bertanda tangan kunci penerbit yang menyebut alamat anggota dan wewenangnya; peran dibaca lewat POST /me/roles. Buktikan ulang: npm run verify:roles. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/**
 * Penerbit memberi keanggotaan ke satu akun (opsi 2 builder, 2 Okt): anggota memantau dashboard penerbit dan — kalau
 * pesannya menyatakan — boleh menyewa agen penilai (`hire=1`) dan menunjuk agen pengesah (`appoint=1`) atas nama
 * penerbit. Menerbitkan dan mencabut kredensial TIDAK pernah didelegasikan lewat sini.
 * Pesan wajib menyebut anggota dan kedua wewenangnya: tanda tangan atas nonce saja bisa ditempelkan ke siapa pun.
 */
export async function grantMember ({ issuer, member, canHire, canAppoint, canAuthor = false, canPublish = false, message, signature }) {
  if (typeof member !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(member)) return { ok: false, kind: 'input', why: 'member must be a 20-byte address' }
  if (member.toLowerCase() === String(issuer).toLowerCase()) {
    return { ok: false, kind: 'input', why: 'the publisher address is the publisher itself — membership is for other accounts' }
  }
  const wants = `member=${member.toLowerCase()} hire=${canHire ? 1 : 0} appoint=${canAppoint ? 1 : 0}`
  // B133: wewenang ketiga `author=1` (menyusun kursus). Pesan hibah tanpa `author=` tetap sah dan berarti author=0, supaya
  // bentuk pesan B128 tidak berubah; `author=1` hanya lolos kalau kiriman juga menyatakannya, dan sebaliknya.
  const authorPart = canAuthor ? ' author=1' : '(?: author=0)?'
  // B140 (D72): wewenang keempat `publish=1` (memutuskan draf + mengarsipkan kursus dari dasbor; server menandatangani dengan kunci
  // penerbit). Aturan yang sama dengan `author=`: tanpa `publish=` berarti publish=0, dan `publish=1` harus dinyatakan kedua sisi.
  const publishPart = canPublish ? ' publish=1' : '(?: publish=0)?'
  // Bentuk pesan tepat, bukan "mengandung": `hire=1` tidak boleh lolos dari `hire=10` atau dari teks lain di pesan.
  if (typeof message !== 'string' || !new RegExp(`^lencana-member grant ${wants}${authorPart}${publishPart} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "lencana-member grant ${wants}${canAuthor ? ' author=1' : ''}${canPublish ? ' publish=1' : ''} nonce=<hex>"` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'member' })
  if (!auth.ok) return auth
  await rest('publisher_members', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      issuer: getAddress(issuer), member: getAddress(member), can_hire: Boolean(canHire), can_appoint: Boolean(canAppoint), can_author: Boolean(canAuthor),
      can_publish: Boolean(canPublish),
      message, signature, granted_at: new Date().toISOString(), revoked_at: null, revoke_message: null, revoke_signature: null,
      origin: process.env.LANCENA_ORIGIN || 'unknown',
    }],
  })
  // B129: hibah yang sama menutup pengajuan akun itu (kalau ada) — keputusan penerbit tercatat di kedua tabel.
  const closed = await rest('member_requests', {
    method: 'PATCH', prefer: 'return=representation',
    query: `?issuer=eq.${getAddress(issuer)}&applicant=eq.${getAddress(member)}&status=eq.pending`,
    body: { status: 'approved', decided_at: new Date().toISOString(), decided_message: message, decided_signature: signature },
  })
  return {
    ok: true, issuer: getAddress(issuer), member: getAddress(member), canHire: Boolean(canHire), canAppoint: Boolean(canAppoint), canAuthor: Boolean(canAuthor),
    canPublish: Boolean(canPublish), approvedRequest: closed?.[0]?.id ?? null,
  }
}

/** Cabut keanggotaan: pesan `lencana-member revoke member=… nonce=…` bertanda tangan penerbit. Baris tetap ada sebagai jejak. */
export async function revokeMember ({ issuer, member, message, signature }) {
  if (typeof member !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(member)) return { ok: false, kind: 'input', why: 'member must be a 20-byte address' }
  if (typeof message !== 'string' || !new RegExp(`^lencana-member revoke member=${member.toLowerCase()} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "lencana-member revoke member=${member.toLowerCase()} nonce=<hex>"` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'member' })
  if (!auth.ok) return auth
  const rows = await rest('publisher_members', {
    method: 'PATCH', prefer: 'return=representation',
    query: `?issuer=eq.${getAddress(issuer)}&member=eq.${getAddress(member)}&revoked_at=is.null`,
    body: { revoked_at: new Date().toISOString(), revoke_message: message, revoke_signature: signature },
  })
  if (!rows?.length) return { ok: false, kind: 'input', why: 'no active membership for this member' }
  return { ok: true, issuer: getAddress(issuer), member: getAddress(member), revokedAt: rows[0].revoked_at }
}

/** Keanggotaan aktif satu alamat (bisa lebih dari satu penerbit). */
export async function membershipsOf (address) {
  const rows = await rest('publisher_members', {
    query: `?member=eq.${getAddress(String(address).toLowerCase())}&revoked_at=is.null&select=issuer,member,can_hire,can_appoint,can_author,can_publish,granted_at&order=granted_at.asc`,
  })
  return rows ?? []
}

/* ------------------------------------------------------------------ pengajuan anggota (B129, D64) */
// Lencana-B129 status=TERBUKA 2026-10-02 — pengajuan anggota penerbit: ditandatangani akun pengaju, satu yang menunggu per (penerbit, pengaju), disetujui hanya oleh hibah kunci penerbit dan ditolak hanya oleh pesan tolak kunci penerbit; pengajuan sendiri tidak memberi wewenang. Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

const projectRequest = (r) => (r
  ? { id: Number(r.id), status: r.status, note: r.note ?? null, createdAt: r.created_at, decidedAt: r.decided_at ?? null }
  : null)

/** Pengajuan terakhir satu akun ke satu penerbit (apa pun statusnya), atau null. */
export async function latestRequest (issuer, applicant) {
  const rows = await rest('member_requests', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}&applicant=eq.${getAddress(String(applicant).toLowerCase())}&order=created_at.desc&limit=1&select=*`,
  })
  return projectRequest(rows?.[0])
}

/**
 * Akun mengajukan diri menjadi anggota penerbit (pilihan builder 2 Okt, D64: "ajukan → disetujui"). Pesan ditandatangani
 * pengaju dan menyebut penerbitnya; catatan opsional ≤ 280 karakter. Pengajuan tidak memberi wewenang apa pun — kursi
 * hanya lahir dari hibah kunci penerbit (`grantMember`), yang sekaligus menutup pengajuan ini sebagai `approved`.
 */
export async function requestMembership ({ issuer, applicant, note, message, signature }) {
  if (typeof applicant !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(applicant)) return { ok: false, kind: 'input', why: 'applicant must be a 20-byte address' }
  if (applicant.toLowerCase() === String(issuer).toLowerCase()) return { ok: false, kind: 'input', why: 'the publisher key is the publisher itself — it does not apply for membership' }
  if (note != null && (typeof note !== 'string' || note.length > 280)) return { ok: false, kind: 'input', why: 'note must be text of at most 280 characters' }
  const want = `lencana-member-request issuer=${String(issuer).toLowerCase()}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeLearner({ learner: applicant, message, signature, scope: 'member-request' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  if ((await membershipsOf(applicant)).some((m) => String(m.issuer).toLowerCase() === String(issuer).toLowerCase())) {
    return { ok: false, kind: 'conflict', why: 'this account is already a member of the publisher' }
  }
  try {
    const rows = await rest('member_requests', {
      method: 'POST', prefer: 'return=representation',
      body: [{
        issuer: getAddress(issuer), applicant: getAddress(applicant), note: note?.trim() || null, message, signature,
        origin: process.env.LANCENA_ORIGIN || 'unknown',
      }],
    })
    return { ok: true, request: projectRequest(rows?.[0]) }
  } catch (e) {
    // Indeks unik parsial: paling banyak satu pengajuan `pending` per (penerbit, pengaju).
    if (/23505|duplicate key/.test(String(e.message))) {
      return { ok: false, kind: 'conflict', why: 'there is already a pending request for this publisher', request: await latestRequest(issuer, applicant) }
    }
    throw e
  }
}

/** Pengajuan yang menunggu keputusan penerbit, terlama dulu (untuk `npm run grant:member -- --list`). */
export async function pendingRequests (issuer) {
  const rows = await rest('member_requests', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}&status=eq.pending&order=created_at.asc&select=id,applicant,note,created_at,origin`,
  })
  return rows ?? []
}

/** Penerbit menolak pengajuan: pesan `lencana-member reject member=… nonce=…` bertanda tangan kunci penerbit. */
export async function rejectRequest ({ issuer, applicant, message, signature }) {
  if (typeof applicant !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(applicant)) return { ok: false, kind: 'input', why: 'applicant must be a 20-byte address' }
  if (typeof message !== 'string' || !new RegExp(`^lencana-member reject member=${applicant.toLowerCase()} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "lencana-member reject member=${applicant.toLowerCase()} nonce=<hex>"` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'member' })
  if (!auth.ok) return auth
  const rows = await rest('member_requests', {
    method: 'PATCH', prefer: 'return=representation',
    query: `?issuer=eq.${getAddress(issuer)}&applicant=eq.${getAddress(applicant)}&status=eq.pending`,
    body: { status: 'rejected', decided_at: new Date().toISOString(), decided_message: message, decided_signature: signature },
  })
  if (!rows?.length) return { ok: false, kind: 'input', why: 'no pending request from this account' }
  return { ok: true, request: projectRequest(rows[0]) }
}

/* ------------------------------------------------------------------ peran akun (B131, D66) */
// Lencana-B131 status=TERBUKA 2026-10-03 — satu akun nyata = satu peran: pilihan bertanda tangan akun (`lencana-role role=…`), sekali, tidak bisa diganti; memilih Penerbit sekaligus mengajukan keanggotaan; akun dev (dummy builder) hanya ditulis CLI platform. Buktikan ulang: npm run verify:account. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

export const ACCOUNT_ROLES = Object.freeze(['learner', 'publisher', 'owner'])

/** Baris `account_roles` satu alamat (pilihan atau tanda dev), atau null. */
export async function accountRoleRow (address) {
  const rows = await rest('account_roles', {
    query: `?address=eq.${getAddress(String(address).toLowerCase())}&select=address,role,dev,chosen_at,dev_note,origin`,
  })
  return rows?.[0] ?? null
}

/** Sudah pernah mendaftar kursus? ("akun lama yang sudah belajar = Peserta", pilihan builder 3 Okt.) */
export async function hasEnrollment (address) {
  const rows = await rest('enrollments', { query: `?learner=eq.${getAddress(String(address).toLowerCase())}&select=id&limit=1` })
  return Boolean(rows?.length)
}

/** Bentuk pesan pilihan peran. Penerbit menyebut penerbitnya: memilih Penerbit = mengajukan keanggotaan ke penerbit itu. */
export const roleMessagePrefix = (role, issuer = null) => (role === 'publisher'
  ? `lencana-role role=publisher issuer=${String(issuer).toLowerCase()}`
  : `lencana-role role=${role}`)

/**
 * Tulis pilihan peran (pesan + tanda tangan akun yang SUDAH diverifikasi pemanggil). null bila akun sudah punya baris —
 * kunci primer yang menegakkan "sekali", bukan pemeriksaan sebelumnya. Dipakai `chooseRole` dan pengajuan anggota pertama
 * (`POST /me/member-request` dari akun tanpa peran = memilih Penerbit; kontrak rute B129 tetap).
 */
export async function recordRole ({ address, role, message, signature }) {
  try {
    return (await rest('account_roles', {
      method: 'POST', prefer: 'return=representation',
      body: [{ address: getAddress(String(address).toLowerCase()), role, dev: false, message, signature, origin: process.env.LANCENA_ORIGIN || 'unknown' }],
    }))?.[0] ?? null
  } catch (e) {
    if (/23505|duplicate key/.test(String(e.message))) return null
    throw e
  }
}

/**
 * Akun memilih perannya, sekali (pilihan builder 3 Okt, D66). Pesan ditandatangani akun itu; baris yang sudah ada (pilihan
 * lain, atau tanda dev) membuat pilihan kedua ditolak oleh kunci primer, bukan oleh pemeriksaan yang bisa dilangkahi.
 * Pemanggil (server) yang memastikan akun belum berperan menurut rekaman/fakta sebelum memanggil ini.
 * Memilih Penerbit menulis pengajuan anggota dengan tanda tangan yang sama — kursinya tetap lahir hanya dari hibah kunci penerbit.
 */
export async function chooseRole ({ address, role, issuer = null, note = null, message, signature }) {
  if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) return { ok: false, kind: 'input', why: 'address must be a 20-byte address' }
  if (!ACCOUNT_ROLES.includes(role)) return { ok: false, kind: 'input', why: `role must be one of ${ACCOUNT_ROLES.join(', ')}` }
  if (role === 'publisher' && !issuer) return { ok: false, kind: 'input', why: 'this server has no publisher to apply to' }
  if (note != null && (typeof note !== 'string' || note.length > 280)) return { ok: false, kind: 'input', why: 'note must be text of at most 280 characters' }
  const want = roleMessagePrefix(role, issuer)
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeLearner({ learner: address, message, signature, scope: 'role' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  const origin = process.env.LANCENA_ORIGIN || 'unknown'
  const row = await recordRole({ address, role, message, signature })
  if (!row) return { ok: false, kind: 'conflict', why: 'this account already has a role — one account holds one role' }
  let request = null
  if (role === 'publisher') {
    try {
      const rows = await rest('member_requests', {
        method: 'POST', prefer: 'return=representation',
        body: [{ issuer: getAddress(issuer), applicant: getAddress(address), note: note?.trim() || null, message, signature, origin }],
      })
      request = projectRequest(rows?.[0])
    } catch (e) {
      if (!/23505|duplicate key/.test(String(e.message))) throw e
      request = await latestRequest(issuer, address)
    }
  }
  return { ok: true, role, chosenAt: row?.chosen_at ?? null, request }
}

/**
 * Tandai/lepas akun dev (dummy builder): boleh memegang semua kursi menurut fakta + pemilih kursi. Hanya CLI platform
 * (`npm run account:dev`) — tidak ada rute HTTP yang memanggil ini. Melepas tanda dev dari baris tanpa pilihan menghapus barisnya.
 */
export async function setDevAccount ({ address, dev = true, note = null }) {
  const addr = getAddress(String(address).toLowerCase())
  const row = await accountRoleRow(addr)
  if (dev) {
    await rest('account_roles', {
      method: 'POST', query: '?on_conflict=address', prefer: 'resolution=merge-duplicates,return=minimal',
      body: [{ address: addr, dev: true, dev_note: note ?? null, ...(row ? {} : { origin: process.env.LANCENA_ORIGIN || 'unknown' }) }],
    })
  } else if (row?.role) {
    await rest('account_roles', { method: 'PATCH', query: `?address=eq.${addr}`, body: { dev: false, dev_note: null } })
  } else if (row) {
    await rest('account_roles', { method: 'DELETE', query: `?address=eq.${addr}` })
  }
  return accountRoleRow(addr)
}

/** Semua akun dev (untuk `npm run account:dev -- --list`). */
export async function devAccounts () {
  return (await rest('account_roles', { query: '?dev=is.true&select=address,role,dev_note,chosen_at,origin&order=chosen_at.asc' })) ?? []
}

/* ------------------------------------------------------------------ draf kursus (B133, D67) */
// Lencana-B133 status=TERBUKA 2026-10-03 — draf kursus: disimpan dan diajukan penyusun (anggota berhak susun) dengan tanda tangannya atas hash isi, diterbitkan atau ditolak hanya oleh kunci penerbit; kunci kuis draf tidak pernah keluar lewat rute publik. Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

const DRAFT_COLS = 'id,issuer,author,course_id,content,price_units,content_hash,status,problems,submitted_at,rubric_hash,manifest_hash,published_at,decided_note,decided_at,created_at,updated_at,origin,supersedes,version,archived_at'

/** Bentuk draf untuk halaman. Kunci kuis hanya disertakan bila diminta (penyusunnya sendiri). */
export const projectDraft = (r, { withKeys = false } = {}) => (r
  ? {
      id: Number(r.id), issuer: r.issuer, author: r.author, courseId: r.course_id, status: r.status, course: r.content,
      ...(withKeys ? { keys: r.answer_keys ?? {} } : {}),
      price: r.price_units ?? null, contentHash: r.content_hash, problems: r.problems ?? [], submittedAt: r.submitted_at ?? null,
      rubricHash: r.rubric_hash ?? null, manifestHash: r.manifest_hash ?? null, publishedAt: r.published_at ?? null,
      decidedNote: r.decided_note ?? null, decidedAt: r.decided_at ?? null, createdAt: r.created_at, updatedAt: r.updated_at, origin: r.origin,
      // B140 (D72): rantai versi dan arsip.
      supersedes: r.supersedes == null ? null : Number(r.supersedes), version: Number(r.version ?? 1), archivedAt: r.archived_at ?? null,
    }
  : null)

/** Satu draf lengkap (termasuk kunci) — hanya untuk server. */
export async function draftById (id) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) return null
  const rows = await rest('course_drafts', { query: `?id=eq.${Number(id)}&select=${DRAFT_COLS},answer_keys` })
  return rows?.[0] ?? null
}

/** Id kursus yang dipakai draf yang masih hidup (bukan ditolak), selain draf `exceptId`. */
export async function liveDraftCourseIds (exceptId = null) {
  const rows = (await rest('course_drafts', { query: '?status=neq.rejected&select=id,course_id' })) ?? []
  return new Set(rows.filter((r) => Number(r.id) !== Number(exceptId)).map((r) => r.course_id))
}

/** Baris terbit satu kursus database untuk satu penerbit (termasuk yang diarsipkan), atau null. */
export async function publishedRowOf (issuer, courseId) {
  const rows = await rest('course_drafts', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}&course_id=eq.${encodeURIComponent(String(courseId))}&status=eq.published&select=${DRAFT_COLS},answer_keys`,
  })
  return rows?.[0] ?? null
}

/**
 * B140 (D72): jejak setiap keputusan kelola kursus — siapa yang meminta (pesan + tanda tangannya) dan pesan + tanda tangan kunci
 * penerbit atas keputusan itu. Draf yang dihapus tetap meninggalkan barisnya di sini (`draft_id` jadi null).
 */
async function logCourseAction ({ issuer, courseId, draftId = null, action, requestedBy = null, requestMessage = null, requestSignature = null, issuerMessage = null, issuerSignature = null, note = null }) {
  await rest('course_actions', {
    method: 'POST', prefer: 'return=minimal',
    body: [{
      issuer: getAddress(String(issuer).toLowerCase()), course_id: courseId, draft_id: draftId == null ? null : Number(draftId), action,
      requested_by: requestedBy ? getAddress(String(requestedBy).toLowerCase()) : null, request_message: requestMessage, request_signature: requestSignature,
      issuer_message: issuerMessage, issuer_signature: issuerSignature, note, origin: process.env.LANCENA_ORIGIN || 'unknown',
    }],
  })
}

/** Jejak kelola kursus satu penerbit, terbaru dulu (tanpa tanda tangan). Baris harness disaring kecuali diminta. */
export async function courseActionsOf (issuer, { includeTest = false, limit = 100 } = {}) {
  return (await rest('course_actions', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}${includeTest ? '' : '&origin=neq.test'}&select=id,course_id,draft_id,action,requested_by,note,created_at&order=created_at.desc&limit=${Number(limit) || 100}`,
  })) ?? []
}

/**
 * Sunting = versi baru (B140, D72): salin isi + kunci + harga versi terbit jadi draf versi n+1, milik penyusun yang meminta.
 * Pesan `lencana-draft fork course=<id> nonce=…` ditandatangani penyusun (kuncinya tidak dikirim ke halaman, jadi pesan ini
 * tidak bisa menyebut hash isi; suntingan pertamanya yang menandatangani hash, seperti draf baru). Satu draf terbuka per id.
 */
export async function forkDraft ({ issuer, author, base, payload, contentHash, problems, message, signature }) {
  const want = `lencana-draft fork course=${base.course_id}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeLearner({ learner: author, message, signature, scope: 'draft' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  try {
    const rows = await rest('course_drafts', {
      method: 'POST', prefer: 'return=representation',
      body: [{
        issuer: getAddress(String(issuer).toLowerCase()), author: getAddress(String(author).toLowerCase()), course_id: payload.course.id,
        content: payload.course, answer_keys: payload.keys, price_units: payload.price, content_hash: contentHash, problems, status: 'draft',
        save_message: message, save_signature: signature, supersedes: Number(base.id), version: Number(base.version ?? 1) + 1,
        origin: process.env.LANCENA_ORIGIN || 'unknown',
      }],
    })
    const draft = rows?.[0]
    await logCourseAction({ issuer, courseId: base.course_id, draftId: draft?.id, action: 'fork', requestedBy: author, requestMessage: message, requestSignature: signature })
    return { ok: true, draft }
  } catch (e) {
    if (/23505|duplicate key/.test(String(e.message))) return { ok: false, kind: 'conflict', why: 'this course already has an open draft (a new version or a draft in review) — finish or delete that one first' }
    throw e
  }
}

/** Hapus draf yang BELUM PERNAH diajukan: `lencana-draft delete draft=<id> nonce=…`, ditandatangani penyusunnya sendiri. */
export async function deleteDraft ({ draftId, author, message, signature }) {
  const row = await draftById(draftId)
  if (!row) return { ok: false, kind: 'missing', why: 'no such draft' }
  const want = `lencana-draft delete draft=${Number(draftId)}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeLearner({ learner: author, message, signature, scope: 'draft' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  if (String(row.author).toLowerCase() !== String(author).toLowerCase()) return { ok: false, kind: 'forbidden', why: 'only the author of a draft can delete it' }
  if (row.status !== 'draft' || row.submitted_at || row.decided_at) {
    return { ok: false, kind: 'conflict', why: `only a draft that was never submitted can be deleted (this one is ${row.status}${row.decided_at ? ', with a decision on record' : ''}) — published courses are archived, not deleted` }
  }
  await logCourseAction({ issuer: row.issuer, courseId: row.course_id, draftId: row.id, action: 'delete', requestedBy: author, requestMessage: message, requestSignature: signature })
  const gone = await rest('course_drafts', { method: 'DELETE', prefer: 'return=representation', query: `?id=eq.${Number(draftId)}&status=eq.draft` })
  return gone?.length ? { ok: true, deleted: Number(draftId), courseId: row.course_id } : { ok: false, kind: 'conflict', why: 'the draft changed before it could be deleted' }
}

/**
 * Arsipkan / pulihkan kursus database yang terbit (B140, D72): `lencana-course archive course=<id> on=<1|0> nonce=…` ditandatangani
 * kunci penerbit. Kursus tetap dimuat (peserta lama tetap masuk kelas, kertasnya tetap terbit), hanya hilang dari katalog dan
 * menolak peserta baru.
 */
export async function archiveCourse ({ issuer, courseId, archived, message, signature, requestedBy = null, requestMessage = null, requestSignature = null }) {
  const want = `lencana-course archive course=${courseId} on=${archived ? 1 : 0}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'course' })
  if (!auth.ok) return auth
  const now = new Date().toISOString()
  const rows = await rest('course_drafts', {
    method: 'PATCH', prefer: 'return=representation',
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}&course_id=eq.${encodeURIComponent(courseId)}&status=eq.published`,
    body: { archived_at: archived ? now : null, updated_at: now },
  })
  if (!rows?.length) return { ok: false, kind: 'missing', why: `no published database course "${courseId}" for this publisher` }
  await logCourseAction({ issuer, courseId, draftId: rows[0].id, action: archived ? 'archive' : 'unarchive', requestedBy, requestMessage, requestSignature, issuerMessage: message, issuerSignature: signature })
  return { ok: true, courseId, draftId: Number(rows[0].id), archivedAt: rows[0].archived_at ?? null }
}

/** Draf satu penerbit, terbaru dulu (tanpa kunci). Baris harness disaring kecuali diminta. */
export async function draftsOf (issuer, { includeTest = false } = {}) {
  return (await rest('course_drafts', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}${includeTest ? '' : '&origin=neq.test'}&select=${DRAFT_COLS},answer_keys&order=updated_at.desc&limit=200`,
  })) ?? []
}

/**
 * Simpan draf (baru atau suntingan). Pesan: `lencana-draft save draft=<new|id> course=<id> hash=<keccak isi> nonce=…`,
 * ditandatangani penyusun. Pemanggil (server) sudah menormalkan isi, menghitung hash-nya, dan memastikan penyusun berhak
 * susun; di sini: bentuk pesan, tanda tangan + nonce, kepemilikan draf, dan status yang masih bisa disunting.
 */
export async function saveDraft ({ draftId = null, issuer, author, payload, contentHash, problems, message, signature }) {
  const ref = draftId ? String(Number(draftId)) : 'new'
  const want = `lencana-draft save draft=${ref} course=${payload.course.id} hash=${contentHash}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeLearner({ learner: author, message, signature, scope: 'draft' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  const body = {
    course_id: payload.course.id, content: payload.course, answer_keys: payload.keys, price_units: payload.price,
    content_hash: contentHash, problems, status: 'draft', save_message: message, save_signature: signature, updated_at: new Date().toISOString(),
  }
  try {
    if (draftId) {
      const row = await draftById(draftId)
      if (!row || String(row.issuer).toLowerCase() !== String(issuer).toLowerCase()) return { ok: false, kind: 'missing', why: 'no such draft for this publisher' }
      if (String(row.author).toLowerCase() !== String(author).toLowerCase()) return { ok: false, kind: 'forbidden', why: 'only the author of a draft can edit it' }
      if (row.status !== 'draft' && row.status !== 'rejected') return { ok: false, kind: 'conflict', why: `a ${row.status} draft cannot be edited` }
      const rows = await rest('course_drafts', { method: 'PATCH', prefer: 'return=representation', query: `?id=eq.${Number(draftId)}`, body: { ...body, submitted_at: null, decided_note: null } })
      return { ok: true, draft: rows?.[0] }
    }
    const rows = await rest('course_drafts', {
      method: 'POST', prefer: 'return=representation',
      body: [{ ...body, issuer: getAddress(String(issuer).toLowerCase()), author: getAddress(String(author).toLowerCase()), origin: process.env.LANCENA_ORIGIN || 'unknown' }],
    })
    return { ok: true, draft: rows?.[0] }
  } catch (e) {
    if (/23505|duplicate key/.test(String(e.message))) return { ok: false, kind: 'conflict', why: 'this course id is already used by another live draft' }
    throw e
  }
}

/** Ajukan draf: `lencana-draft submit draft=<id> hash=<hash tersimpan> nonce=…`; hanya bila audit tersimpannya bersih. */
export async function submitDraft ({ draftId, author, message, signature }) {
  const row = await draftById(draftId)
  if (!row) return { ok: false, kind: 'missing', why: 'no such draft' }
  const want = `lencana-draft submit draft=${Number(draftId)} hash=${row.content_hash}`
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>" — the hash binds the submission to the saved content` }
  }
  const auth = await authorizeLearner({ learner: author, message, signature, scope: 'draft' })
  if (!auth.ok) return { ok: false, kind: 'auth', why: auth.why }
  if (String(row.author).toLowerCase() !== String(author).toLowerCase()) return { ok: false, kind: 'forbidden', why: 'only the author of a draft can submit it' }
  if (row.status !== 'draft') return { ok: false, kind: 'conflict', why: `a ${row.status} draft cannot be submitted` }
  if ((row.problems ?? []).length) return { ok: false, kind: 'unprocessable', why: `the draft still has ${row.problems.length} problem(s) — fix them before submitting` }
  const rows = await rest('course_drafts', {
    method: 'PATCH', prefer: 'return=representation', query: `?id=eq.${Number(draftId)}&status=eq.draft`,
    body: { status: 'submitted', submitted_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  })
  return rows?.length ? { ok: true, draft: rows[0] } : { ok: false, kind: 'conflict', why: 'the draft changed before it could be submitted' }
}

/**
 * Kunci penerbit memutuskan draf yang diajukan. Terbit: `lencana-course publish draft=<id> course=<id> rubric=<rubricHash>
 * nonce=…` — hash kebijakan dihitung pemanggil dari isi + kunci yang tersimpan, jadi tanda tangan mengikat aturan
 * penilaiannya. Tolak: `lencana-course reject draft=<id> nonce=…` (catatan opsional ≤ 280).
 */
export async function decideDraft ({ draftId, issuer, decision, rubricHash = null, manifestHash = null, publishedAt = null, note = null, message, signature, requestedBy = null, requestMessage = null, requestSignature = null }) {
  const row = await draftById(draftId)
  if (!row) return { ok: false, kind: 'missing', why: 'no such draft' }
  if (String(row.issuer).toLowerCase() !== String(issuer).toLowerCase()) return { ok: false, kind: 'forbidden', why: 'this draft belongs to another publisher' }
  if (row.status !== 'submitted') return { ok: false, kind: 'conflict', why: `only a submitted draft can be decided (this one is ${row.status})` }
  if (note != null && (typeof note !== 'string' || note.length > 280)) return { ok: false, kind: 'input', why: 'note must be text of at most 280 characters' }
  // B140 (D72): versi baru menyebut versi yang digantikannya di pesan yang ditandatangani kunci penerbit — keputusan ini juga
  // mengubah baris versi lama (digantikan di tempat, atau diarsipkan bila id-nya baru).
  const base = row.supersedes && decision === 'publish' ? await draftById(row.supersedes) : null
  if (decision === 'publish' && row.supersedes && (!base || base.status !== 'published')) {
    return { ok: false, kind: 'conflict', why: 'the version this draft replaces is no longer the published one — fork the current version instead (a stale version can still be rejected)' }
  }
  const want = decision === 'publish'
    ? `lencana-course publish draft=${Number(draftId)} course=${row.course_id} rubric=${rubricHash}${base ? ` supersedes=${Number(base.id)}` : ''}`
    : `lencana-course reject draft=${Number(draftId)}`
  if (decision !== 'publish' && decision !== 'reject') return { ok: false, kind: 'input', why: 'decision must be publish or reject' }
  if (typeof message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(message)) {
    return { ok: false, kind: 'input', why: `signed message must be "${want} nonce=<hex>"` }
  }
  const auth = await authorizeSigner({ signer: issuer, message, signature, scope: 'course' })
  if (!auth.ok) return auth
  const now = new Date().toISOString()
  const decide = () => rest('course_drafts', {
    method: 'PATCH', prefer: 'return=representation', query: `?id=eq.${Number(draftId)}&status=eq.submitted`,
    body: decision === 'publish'
      // `publishedAt` = waktu yang ikut dihitung ke `manifestHash` oleh pemanggil — keduanya harus sama persis.
      ? { status: 'published', rubric_hash: rubricHash, manifest_hash: manifestHash, published_at: publishedAt ?? now, decided_message: message, decided_signature: signature, decided_at: now, decided_note: note, updated_at: now }
      : { status: 'rejected', decided_message: message, decided_signature: signature, decided_at: now, decided_note: note, updated_at: now },
  })
  let rows
  let replaced = null
  if (decision === 'publish' && base && base.course_id === row.course_id) {
    // Aturan nilai sama → id sama: versi lama mundur dulu (satu baris terbit per id), lalu versi baru terbit. Gagal → kembalikan.
    const stepped = await rest('course_drafts', { method: 'PATCH', prefer: 'return=representation', query: `?id=eq.${Number(base.id)}&status=eq.published`, body: { status: 'superseded', updated_at: now } })
    if (!stepped?.length) return { ok: false, kind: 'conflict', why: 'the published version changed before it could be replaced' }
    try { rows = await decide() } catch (e) { rows = null; console.error(`decideDraft #${draftId}: ${String(e.message).slice(0, 160)}`) }
    if (!rows?.length) {
      await rest('course_drafts', { method: 'PATCH', prefer: 'return=minimal', query: `?id=eq.${Number(base.id)}&status=eq.superseded`, body: { status: 'published', updated_at: new Date().toISOString() } })
      return { ok: false, kind: 'conflict', why: 'the draft changed before it could be decided — the published version was restored' }
    }
    replaced = { draftId: Number(base.id), courseId: base.course_id, how: 'superseded' }
  } else {
    rows = await decide()
    if (rows?.length && decision === 'publish' && base) {
      // Aturan nilai berubah → id baru: versi lama tetap terbit (peserta lamanya tetap masuk kelas) tapi diarsipkan.
      await rest('course_drafts', { method: 'PATCH', prefer: 'return=minimal', query: `?id=eq.${Number(base.id)}&status=eq.published`, body: { archived_at: now, updated_at: now } })
      replaced = { draftId: Number(base.id), courseId: base.course_id, how: 'archived' }
    }
  }
  if (!rows?.length) return { ok: false, kind: 'conflict', why: 'the draft changed before it could be decided' }
  // `note` = catatan manusia saja. Versi yang digantikan sudah terbaca dari datanya (draft_id → supersedes → course_id lama).
  await logCourseAction({
    issuer, courseId: row.course_id, draftId: row.id, action: decision, requestedBy, requestMessage, requestSignature, issuerMessage: message, issuerSignature: signature, note,
  })
  return { ok: true, draft: rows[0], replaced }
}

/** Draf yang sudah terbit, lengkap dengan kunci — untuk menggabungkannya ke katalog server. */
export async function publishedDrafts ({ includeTest = false } = {}) {
  return (await rest('course_drafts', {
    query: `?status=eq.published${includeTest ? '' : '&origin=neq.test'}&select=${DRAFT_COLS},answer_keys&order=published_at.asc`,
  })) ?? []
}

/**
 * Bahan dasbor penerbit (B129): baris mentah untuk kursus-kursus penerbit itu. Yang SENGAJA tidak dibaca: teks esai,
 * kunci jawaban, pesan + tanda tangan. Baris harness (`origin=test`) disaring kecuali diminta — angka demo tidak boleh
 * tercampur sisa uji tanpa terlihat.
 */
export async function publisherRecords ({ courseIds, includeTest = false }) {
  const inList = (xs) => `(${xs.map((x) => encodeURIComponent(String(x))).join(',')})`
  const empty = { enrollments: [], orders: [], essays: [], submissions: [], reviews: [], hires: [], reviewers: [], charges: [] }
  if (!courseIds?.length) return empty
  const enrollments = (await rest('enrollments', {
    query: `?course_id=in.${inList(courseIds)}${includeTest ? '' : '&origin=neq.test'}&select=id,learner,course_id,status,enrolled_at,origin&order=enrolled_at.desc&limit=5000`,
  })) ?? []
  const ids = enrollments.map((e) => e.id)
  const [orders, essays, hires, reviewers] = await Promise.all([
    ids.length ? rest('orders', { query: `?enrollment_id=in.${inList(ids)}&select=id,enrollment_id,asset,amount,state,tx_hash,created_at&order=created_at.desc` }) : [],
    ids.length ? rest('attempts', { query: `?enrollment_id=in.${inList(ids)}&kind=eq.esai&select=id,enrollment_id,lesson_key,attempt_no,score,verdict,judge_model,graded_by_agent,difficulty_label,created_at&order=created_at.desc` }) : [],
    rest('agent_hires', { query: `?course_id=in.${inList(courseIds)}&select=course_id,agent_id,agent_wallet,agent_owner,hired_by,hired_at&order=hired_at.desc` }),
    rest('review_roles', { query: `?course_id=in.${inList(courseIds)}&select=course_id,reviewer,added_by,added_at,agent_id,agent_owner&order=added_at.desc` }),
  ])
  const attemptIds = (essays ?? []).map((a) => a.id)
  const [submissions, reviews, charges] = await Promise.all([
    attemptIds.length ? rest('submissions', { query: `?attempt_id=in.${inList(attemptIds)}&select=attempt_id,state,words,awaiting_since,judged_at` }) : [],
    attemptIds.length ? rest('judgement_reviews', { query: `?attempt_id=in.${inList(attemptIds)}&select=attempt_id,decision,proposed,final_score,reviewer,reviewer_agent_id,difficulty_label,reviewed_at` }) : [],
    attemptIds.length ? rest('agent_charges', { query: `?attempt_id=in.${inList(attemptIds)}&select=id,attempt_id,activity,agent_id,label,amount,token,status,settle_tx,created_at,paid_at&order=created_at.desc` }) : [],
  ])
  return {
    enrollments, orders: orders ?? [], essays: essays ?? [], submissions: submissions ?? [], reviews: reviews ?? [],
    hires: hires ?? [], reviewers: reviewers ?? [], charges: charges ?? [],
  }
}

/** Anggota aktif satu penerbit (untuk tim di dasbor). */
export async function membersOf (issuer) {
  const rows = await rest('publisher_members', {
    query: `?issuer=eq.${getAddress(String(issuer).toLowerCase())}&revoked_at=is.null&select=member,can_hire,can_appoint,can_author,can_publish,granted_at,origin&order=granted_at.asc`,
  })
  return rows ?? []
}

/** Agen yang dikenal platform dari rekaman: yang pernah disewa atau ditunjuk sebagai pengesah. Kepemilikan tetap dibaca dari chain. */
export async function knownAgentIds () {
  const [hires, reviewers, minted] = await Promise.all([
    rest('agent_hires', { query: '?select=agent_id' }),
    rest('review_roles', { query: '?agent_id=not.is.null&select=agent_id' }),
    // B130: agen yang dicetak platform untuk sebuah akun — belum disewa siapa pun, tapi kursi Agent Owner-nya harus terbaca.
    rest('platform_agents', { query: '?select=agent_id' }),
  ])
  return [...new Set([...(hires ?? []), ...(reviewers ?? []), ...(minted ?? [])].map((r) => String(r.agent_id)))]
}

/* ------------------------------------------------------------------ Agent Owner (B130, D65) */
// Lencana-B130 status=TERBUKA 2026-10-02 — jejak agen yang dicetak platform (platform_agents) dan bahan dasbor Agent Owner: sewa, penunjukan, aktivitas, dan tagihan per agen — kepemilikan selalu dari ownerOf di chain, bukan dari tabel. Buktikan ulang: npm run verify:owner. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/** Catat satu agen yang dicetak platform (`npm run agent:mint`); idempoten per agentId. */
export async function recordPlatformAgent ({ agentId, registry, role, mintedBy, registerTx, ownerTo = null, transferTx = null, gasTx = null }) {
  await rest('platform_agents', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      agent_id: String(agentId), registry, role, minted_by: getAddress(mintedBy), register_tx: registerTx,
      owner_to: ownerTo ? getAddress(ownerTo) : null, transfer_tx: transferTx, gas_tx: gasTx,
      origin: process.env.LANCENA_ORIGIN || 'unknown',
    }],
  })
}

/** Semua agentId yang pernah dicetak platform (untuk menyaring siapa yang boleh menerima tetes gas). */
export async function platformAgentIds () {
  return ((await rest('platform_agents', { query: '?select=agent_id' })) ?? []).map((r) => String(r.agent_id))
}

export async function platformAgents (agentIds) {
  if (!agentIds?.length) return []
  return (await rest('platform_agents', { query: `?agent_id=in.(${agentIds.map((x) => encodeURIComponent(String(x))).join(',')})&select=*` })) ?? []
}

/**
 * Bahan dasbor Agent Owner untuk agen-agen yang (menurut chain) dimiliki pembaca: di mana agen disewa/ditunjuk, berapa
 * aktivitasnya, dan tagihannya. Tanpa teks esai, tanpa pesan + tanda tangan.
 */
export async function ownerRecords (agentIds) {
  if (!agentIds?.length) return { hires: [], reviewers: [], charges: [], graded: [], reviews: [] }
  const ids = `(${agentIds.map((x) => encodeURIComponent(String(x))).join(',')})`
  const [hires, reviewers, charges, graded, reviews] = await Promise.all([
    rest('agent_hires', { query: `?agent_id=in.${ids}&select=course_id,agent_id,agent_wallet,hired_by,hired_at&order=hired_at.desc` }),
    rest('review_roles', { query: `?agent_id=in.${ids}&select=course_id,agent_id,reviewer,added_by,added_at&order=added_at.desc` }),
    rest('agent_charges', { query: `?agent_id=in.${ids}&select=id,attempt_id,activity,agent_id,agent_wallet,label,amount,token,status,settle_tx,created_at,paid_at&order=created_at.desc&limit=500` }),
    rest('attempts', { query: `?graded_by_agent=in.${ids}&select=graded_by_agent,difficulty_label,created_at&limit=2000` }),
    rest('judgement_reviews', { query: `?reviewer_agent_id=in.${ids}&select=reviewer_agent_id,decision,difficulty_label,reviewed_at&limit=2000` }),
  ])
  return { hires: hires ?? [], reviewers: reviewers ?? [], charges: charges ?? [], graded: graded ?? [], reviews: reviews ?? [] }
}

/* ------------------------------------------------------------------ otak agen (B135, D69) */
// Lencana-B135 status=TERBUKA 2026-10-03 — catatan otak agen (provider + model + kalibrasi, bertanda tangan pemilik, tanpa API key) dan sewa per agen untuk antrean esai dompet agen. Buktikan ulang: npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/** Otak yang tercatat untuk agen-agen ini — tanpa pesan + tanda tangan (yang itu hanya untuk audit di tabel). */
export async function agentBrains (agentIds) {
  if (!agentIds?.length) return []
  const ids = `(${agentIds.map((x) => encodeURIComponent(String(x))).join(',')})`
  return (await rest('agent_brains', { query: `?agent_id=in.${ids}&select=agent_id,owner,provider,model,calibration,passed,updated_at` })) ?? []
}

/** Catat atau ganti otak satu agen. Tanda tangan dan kepemilikan (ownerOf) diperiksa pemanggil. */
export async function saveAgentBrain ({ agentId, owner, provider, model, calibration, passed, message, signature }) {
  const rows = await rest('agent_brains', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=representation',
    body: [{
      agent_id: String(agentId), owner: getAddress(owner), provider, model, calibration, passed: Boolean(passed), message, signature,
      updated_at: new Date().toISOString(), origin: process.env.LANCENA_ORIGIN || 'unknown',
    }],
  })
  return rows?.[0] ?? null
}

/* ------------------------------------------------------------------ bursa agen (B138, D70) */
// Lencana-B138 status=TERBUKA 2026-10-03 — bahan bursa agen: tempat bekerja, jumlah aktivitas, keputusan pengesah atas usulan agen, peran templat registrasi, otak tercatat — tanpa teks esai, alamat peserta, alamat penyewa, atau tanda tangan. Buktikan ulang: npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/** Bahan bursa agen untuk agen-agen yang dikenal platform. Kepemilikan, dompet, dan tarif tetap dibaca dari chain. */
export async function marketRecords (agentIds) {
  if (!agentIds?.length) return { hires: [], reviewers: [], graded: [], reviews: [], verdicts: [], minted: [], brains: [] }
  const ids = `(${agentIds.map((x) => encodeURIComponent(String(x))).join(',')})`
  const [hires, reviewers, graded, reviews, verdicts, minted, brains] = await Promise.all([
    rest('agent_hires', { query: `?agent_id=in.${ids}&select=course_id,agent_id,agent_wallet,hired_at&order=hired_at.asc` }),
    rest('review_roles', { query: `?agent_id=in.${ids}&select=course_id,agent_id,reviewer,added_at&order=added_at.asc` }),
    rest('attempts', { query: `?graded_by_agent=in.${ids}&select=graded_by_agent,difficulty_label&limit=5000` }),
    rest('judgement_reviews', { query: `?reviewer_agent_id=in.${ids}&select=reviewer_agent_id,decision,difficulty_label&limit=5000` }),
    // Keputusan pengesah atas usulan agen-agen ini: approved / adjusted / rejected (B104) — sinyal mutu yang dihasilkan manusia.
    rest('judgement_reviews', { query: `?select=decision,attempts!inner(graded_by_agent)&attempts.graded_by_agent=in.${ids}&limit=5000` }),
    rest('platform_agents', { query: `?agent_id=in.${ids}&select=agent_id,role` }),
    agentBrains(agentIds),
  ])
  return {
    hires: hires ?? [], reviewers: reviewers ?? [], graded: graded ?? [], reviews: reviews ?? [], verdicts: verdicts ?? [],
    minted: minted ?? [], brains: brains ?? [],
  }
}

/** Di kursus mana saja satu agen disewa sebagai penilai, dengan dompet saat disewa (antrean dompet agen). */
export async function hiresOfAgent (agentId) {
  return (await rest('agent_hires', { query: `?agent_id=eq.${encodeURIComponent(String(agentId))}&select=course_id,agent_wallet,hired_at&order=hired_at.asc` })) ?? []
}

/** B144: penunjukan satu agen sebagai pengesah, per kursus (baris `review_roles` ber-`agent_id`). */
export async function reviewRolesOfAgent (agentId) {
  return (await rest('review_roles', {
    query: `?agent_id=eq.${encodeURIComponent(String(agentId))}&select=course_id,reviewer,agent_owner,added_at&order=added_at.asc`,
  })) ?? []
}

/** B144: pemilik agen penilai yang disewa satu kursus — untuk menyaring usulan dari Agent Owner yang sama dengan pengesah. */
export async function graderOwnersOf (courseId) {
  return (await rest('agent_hires', { query: `?course_id=eq.${encodeURIComponent(courseId)}&select=agent_id,agent_owner` })) ?? []
}

/**
 * B144: esai satu kursus yang sudah punya usulan bernilai (model atau agen) dan BELUM disahkan, terlama dulu, lengkap dengan
 * teks dan komponen per kriteria. Pembacanya dompet pengesah yang ditunjuk penerbit — yang menandatangani nilai akhirnya.
 * Alamat peserta ikut dibaca hanya supaya pemanggil bisa menyaring tulisan operator pengesah sendiri; ia tidak dikirim.
 * Yang sudah disahkan disaring di sini (dua kueri, bukan anti-join bersarang) dan baru sesudah itu dipotong ke `limit`.
 * Baris harness (`origin=test`) disaring kecuali diminta, seperti dasbor penerbit: pengesah sungguhan tidak boleh disodori sisa uji.
 */
export async function queuePendingReviews (courseId, limit = 20, { includeTest = false } = {}) {
  const subs = ((await rest('submissions', {
    query: `?state=eq.judged&course_id=eq.${encodeURIComponent(courseId)}&order=judged_at.asc&limit=500`
      + '&select=attempt_id,learner,course_id,lesson_key,body,words,judged_at,'
      + 'attempts!inner(id,kind,attempt_no,score,verdict,judge_model,graded_by_agent,difficulty_label,enrollments!inner(origin))'
      + '&attempts.kind=eq.esai&attempts.judge_model=not.is.null&attempts.score=not.is.null&attempts.verdict=neq.incomplete',
  })) ?? []).filter((s) => includeTest || s.attempts?.enrollments?.origin !== 'test')
  if (!subs.length) return []
  const ids = `(${subs.map((s) => Number(s.attempt_id)).join(',')})`
  const [reviewed, comps] = await Promise.all([
    rest('judgement_reviews', { query: `?attempt_id=in.${ids}&select=attempt_id` }),
    rest('attempt_components', { query: `?attempt_id=in.${ids}&select=attempt_id,item_id,score,weight,graded_by` }),
  ])
  const done = new Set((reviewed ?? []).map((r) => Number(r.attempt_id)))
  const byAttempt = new Map()
  for (const c of comps ?? []) {
    const k = Number(c.attempt_id)
    if (!byAttempt.has(k)) byAttempt.set(k, [])
    byAttempt.get(k).push(c)
  }
  return subs.filter((s) => !done.has(Number(s.attempt_id))).slice(0, Number(limit) || 20)
    .map((s) => ({ ...s, components: byAttempt.get(Number(s.attempt_id)) ?? [] }))
}

/**
 * Pengesahan manusia atas satu usulan model.
 *
 * @param decision `approved` (angka model dipakai) | `adjusted` (angka reviewer menggantikannya) |
 *                 `rejected` (tidak ada angka yang sah; gerbang tetap tertutup)
 * @param scores   wajib untuk `adjusted`: `[{label, score}]` menutup SELURUH rubrik penerbit
 */
export async function reviewEssay ({ attemptId, courseId, lessonKey, reviewer, decision, scores, essay, passMark, message, signature }) {
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
  // Lencana-B144 status=TERBUKA 2026-10-05 — rubrik + nilai lulus pengesahan harus milik esai itu sendiri: kursus dan lesson di permintaan wajib sama dengan milik usahanya (dulu rubrik kursus lain bisa dipakai menyesuaikan esai kursus ini). Buktikan ulang: npm run verify:review. JANGAN dibalik/diulang tanpa membuka kembali baris B144 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  if (holder.course_id !== courseId || attempt.lesson_key !== lessonKey) {
    return { ok: false, why: `attempt ${attempt.id} belongs to ${holder.course_id} / ${attempt.lesson_key}, not ${courseId} / ${lessonKey} — the rubric must be the essay's own` }
  }

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
/**
 * @param signer  yang menandatangani sewa: kunci penerbit (bawaan), atau — sejak B129 — anggota penerbit yang hibahnya
 *                menyatakan `hire=1` (diperiksa pemanggil). `hired_by` mencatat siapa yang menandatangani.
 */
export async function hireAgent ({ courseId, agent, publisher, signer = publisher, message, signature }) {
  const wants = [`course=${courseId}`, `agent=${agent.agentId}`]
  if (typeof message !== 'string' || !wants.every((w) => new RegExp(`(^|\\s)${w}(\\s|$)`).test(message))) {
    return { ok: false, kind: 'auth', why: `signed message must state ${wants.join(' and ')}` }
  }
  const auth = await authorizeSigner({ signer, message, signature, scope: 'agent-hire' })
  if (!auth.ok) return auth
  await rest('agent_hires', {
    method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
    body: [{
      course_id: courseId, agent_id: String(agent.agentId), registry: agent.registry, agent_wallet: getAddress(agent.wallet),
      agent_owner: getAddress(agent.owner), hired_by: getAddress(signer), message, signature,
    }],
  })
  return { ok: true, courseId, agentId: String(agent.agentId), wallet: getAddress(agent.wallet), owner: getAddress(agent.owner), hiredBy: getAddress(signer) }
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
export async function agentJudgeEssay ({ attemptId, courseId, lessonKey, agent, scores, essay, passMark, judgeModel, judgeTemp, message, signature }) {
  if (!essay?.rubric?.length) return { ok: false, why: 'essay rubric from the publisher is unreadable — nothing to grade' }
  if (!judgeModel) return { ok: false, why: 'an agent judgement must name its model (judgeModel)' }
  const rows = await rest('attempts', { query: `?id=eq.${Number(attemptId)}&select=*` })
  const attempt = rows?.[0]
  if (!attempt) return { ok: false, why: `attempt ${attemptId} does not exist` }
  if (attempt.kind !== 'esai') return { ok: false, why: `attempt ${attemptId} is not an essay (${attempt.kind})` }
  const holder = await enrollmentOf(attempt.enrollment_id)
  if (!holder) return { ok: false, why: `enrollment row ${attempt.enrollment_id} missing — this attempt is orphaned` }
  if (holder.course_id !== courseId) return { ok: false, why: `attempt ${attemptId} belongs to ${holder.course_id}, not ${courseId}` }
  // B144: lesson juga — di kursus dengan dua lesson esai, rubrik lesson lain tidak boleh dipakai menilai usaha ini.
  if (attempt.lesson_key !== lessonKey) return { ok: false, why: `attempt ${attemptId} is lesson ${attempt.lesson_key}, not ${lessonKey} — the rubric must be the essay's own` }

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
