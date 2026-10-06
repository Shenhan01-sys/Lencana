/**
 * Server kecil yang menghidangkan dokumen issuer + daftar status.
 *
 * Kenapa masih perlu: `statusListCredential` dan `verificationMethod` di dalam kredensial adalah
 * URL. Verifier standar akan MEMBUKA url itu. Selama layanannya mati, kredensial kita gagal
 * diverifikasi — bukan karena salah, tapi karena tidak ada yang menjawab.
 *
 * Dua sifat yang sengaja dipilih:
 *  1. Bitstring dibangun ULANG tiap permintaan dari chain. Tidak ada cache, jadi daftar yang
 *     disajikan tidak pernah lebih tua dari keadaan chain — dan tidak bisa "tertinggal" setelah
 *     sebuah delisting dipulihkan.
 *  2. Tidak ada state kredensial di sini. Yang tersimpan cuma hasil `put` awal (dokumen issuer);
 *     itu pun dibangun dari kunci, bukan dari input pengguna.
 *
 * Batas yang harus disebut keras-keras: server ini dipercaya untuk MENAYANGKAN daftar status.
 * Yang tidak bisa ia lakukan adalah mengubah isinya tanpa ketahuan — itu gunanya hash bitstring
 * direkam lewat BAS `timestamp()` (bagian itu masih tugas, lihat README).
 *
 *   node src/server.js            # default 127.0.0.1:8787
 *   PORT=9000 BASE_URL=https://api.example node src/server.js
 */

// Lencana-B106 status=SELESAI 2026-09-29 — buildList memisahkan dua sebab: konfigurasi hilang vs belum ada kertas (store dingin). Buktikan ulang: npm run probe:cold. JANGAN dibalik/diulang tanpa membuka kembali baris B106 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B86 status=SELESAI 2026-09-29 — server melaporkan startedAt + codeStamp sejak proses naik. Buktikan ulang: npm run probe:serve. JANGAN dibalik/diulang tanpa membuka kembali baris B86 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B48 status=SELESAI 2026-09-29 — empat kredensial demo yang sudah terbit tidak bisa diverifikasi orang asing di instance itu: verificationMethod mereka menunjuk dokumen yang tidak kita sajikan. Untuk v Buktikan ulang: lihat baris B48 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B48 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B67 status=SELESAI 2026-09-29 — penolakan tepi memakai x-lencana-stale bernama; alarmnya di monitor-edge, bukan di sini. Buktikan ulang: npm run monitor:edge. JANGAN dibalik/diulang tanpa membuka kembali baris B67 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

// Lencana-B96 status=SELESAI 2026-09-29 — pesan yang sampai ke klien berbahasa Inggris; komentar & log operator boleh Indonesia (D27/D28). Buktikan ulang: npm run audit. JANGAN dibalik/diulang tanpa membuka kembali baris B96 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { createServer } from 'node:http'
import { readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { agentIdentity, issuerDocumentFor, issuerDocument, listAgents, loadKey } from './issuer.js'
import { loadFileEnvReport } from './env.js'
import { REVOCATION, SUSPENSION, renderList, servedHashes } from './lists.js'
import { sha256Hex } from './credential.js'
import { makeDocumentLoader } from './sign.js'
import { vendoredContexts } from './context-store.js'
import { getCredentialByHash } from './store.js'
import { criteriaDocument } from './criteria.js'
import { resultDocument } from './results.js'
import {
  dbConfigured, dbMissingReason,
  enroll as dbEnroll, recordAttempt as dbRecordAttempt, storeAttempt as dbStoreAttempt,
  nextAttemptNo as dbNextAttemptNo,
  setLessonProgress as dbSetProgress, progressSummary as dbProgressSummary, authorizeLearner as dbAuthorize,
  learnerRecords as dbLearnerRecords,
  enrollPaid as dbEnrollPaid, recentFaucetGrant as dbRecentFaucet, forgetNonce as dbForgetNonce,
} from './db.js'
// Lencana-B125 status=SELESAI 2026-10-02 — bayar dulu baru masuk kelas: harga dari web/src/pricing.ts, POST /enroll kursus berbayar menjawab 402 + syarat x402, settlement + SettlementSplit sebelum enrollment, orders = paid; POST /faucet koin uji sekali per alamat per jendela; ENROLL_PAYWALL=off hanya untuk server harness. Buktikan ulang: npm run verify:paywall (dan --live). JANGAN dibalik/diulang tanpa membuka kembali baris B125 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { priceOf, FAUCET_AMOUNT, FAUCET_COOLDOWN_HOURS, PAY_TOKEN_SYMBOL, PAY_TOKEN_DECIMALS } from '../../web/src/pricing.ts'
import { mintTestCoins } from './faucet.js'
import { mintArtifact, ARTIFACT_LAYER_97, CREDENTIAL_HOST_DEFAULT } from './mint-artifact.js'
import { essayLesson, gradeQuiz } from './quiz.js'
// Lencana-B121 status=SELESAI 2026-10-01 — core: POST /praktik membaca ulang chain 97 sebelum usaha praktik tersimpan, dan POST /attempts menolak skor kuis/esai/praktik kiriman peserta; yang belum: halaman belajar memanggil POST /praktik (fase FE). Buktikan ulang: npm run verify:praktik. JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { praktikLesson, checkPraktik } from './praktik.js'
// Lencana-B82 status=SELESAI 2026-10-01 — rute POST /auth/privy: ikatan alamat peserta ke akun login Privy sesudah token dan kepemilikan dompet tertanam diverifikasi dengan app secret; yang belum: uji dua peramban oleh builder. Buktikan ulang: npm run verify:privy. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { privyConfigured, linkPrivyLearner } from './privy.js'
import {
  findEnrollment as dbFindEnrollment, claimPraktikProof as dbClaimPraktikProof,
  attachPraktikProof as dbAttachPraktikProof, releasePraktikProof as dbReleasePraktikProof,
} from './db.js'
import { gradeAgainstRubric } from './grade.js'
import { submitEssay as dbSubmitEssay, judgeEssay as dbJudgeEssay, addReviewer as dbAddReviewer, reviewEssay as dbReviewEssay } from './db.js'
import { manifestOf, manifestHashOf, rubricHashOf, MANIFESTS } from '../../web/src/manifest-keys.ts'
import { paymentRequirements, decodePaymentHeader, settlePayment, encodePaymentHeader } from './x402.js'
import { verify as verifyCredential, defaultEndpoint } from '../../web/src/verify.ts'
// Lencana-B97 status=SELESAI 2026-09-30 — rute POST /relay dan GET /relay/<id>: pintu bagi agen pihak ketiga untuk menyerahkan delegasi bertanda tangan; siaran hanya kalau RELAY_BROADCAST=1. Buktikan ulang: npm run verify:relay. JANGAN dibalik/diulang tanpa membuka kembali baris B97 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import {
  submitRelay, getRelayJob, relaySummary, drainRelayQueue,
  RELAY_MAX_BATCH, RELAY_MAX_DEADLINE_SECONDS,
} from './relay.js'
// Lencana-B90 status=SELESAI 2026-09-30 — rute GET /deposit/policy/<course>, GET /deposit/<course>/<learner>, POST /deposit/finalize; siaran hanya kalau DEPOSIT_BROADCAST=1. Buktikan ulang: npm run verify:deposit. JANGAN dibalik/diulang tanpa membuka kembali baris B90 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { deadlinePolicyOf, readDeposit, finalizeDeposit } from './deposit.js'
// Lencana-B119 status=SELESAI 2026-10-01 — rute agen sewaan: GET /agents/<id>/rates, POST /agents/hire, penilaian agen di POST /essay/judgement (agentId), GET /agent-charges/<id>, POST /agent-charges/<id>/pay (x402 ke dompet agen). Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B120 status=SELESAI 2026-10-01 — reviewer agen: POST /essay/reviewers dengan agentId, dan pengesahannya ditagih di POST /essay/review. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B120 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import {
  rates as agentRates, hire as agentHireRoute, agentJudge, appointReviewerAgent, chargeReview,
  payCharge as payAgentCharge, getCharge as getAgentCharge,
} from './agents.js'
// Lencana-B128 status=SELESAI 2026-10-02 — peran akun: POST /me/roles (peserta; penerbit lewat alamat penerbit atau keanggotaan bertanda tangan penerbit; Agent Owner lewat ownerOf di registry ERC-8004) dan POST /publisher/members (hibah/cabut bertanda tangan kunci penerbit). Buktikan ulang: npm run verify:roles. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress, isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { randomBytes } from 'node:crypto'
import { agentsOwnedBy } from './agents.js'
import {
  grantMember as dbGrantMember, revokeMember as dbRevokeMember, membershipsOf as dbMembershipsOf, knownAgentIds as dbKnownAgentIds,
  requestMembership as dbRequestMembership, latestRequest as dbLatestRequest, pendingRequests as dbPendingRequests, rejectRequest as dbRejectRequest,
  publisherRecords as dbPublisherRecords, membersOf as dbMembersOf,
  adminGrantMember as dbAdminGrant, adminRevokeMember as dbAdminRevoke, adminRejectRequest as dbAdminReject,
} from './db.js'
// Lencana-B129 status=SELESAI 2026-10-02 — kursi Penerbit end-to-end: POST /me/member-request (pengajuan bertanda tangan akun), POST /publisher/overview (dasbor untuk penerbit + anggota aktif), POST /publisher/agents/hire dan POST /publisher/reviewers (aksi anggota dengan tanda tangannya sendiri bila hibahnya menyatakan hire=1 / appoint=1). Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { overview as publisherOverview, readPlatformBps, cleanNote } from './publisher.js'
// Lencana-B130 status=SELESAI 2026-10-02 — kursi Agent Owner end-to-end: POST /owner/overview (dasbor untuk alamat yang ownerOf-nya memegang agen yang dikenal platform) dan POST /owner/gas (platform mengisi gas pemilik agen yang ia cetak, hanya bila saldonya menipis). Buktikan ulang: npm run verify:owner. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { ownerOverview, nativeBalance, sendGasDrip, GAS_LOW, GAS_DRIP } from './owner.js'
import { ownedAgentFacts } from './agents.js'
// B155: batas pemberian dari dompet deployer (per IP + kuota harian) — server ini publik sejak B154.
import { limitsFromEnv, clientIp } from './limits.js'
import { ownerRecords as dbOwnerRecords, platformAgents as dbPlatformAgents, platformAgentIds as dbPlatformAgentIds } from './db.js'
// Lencana-B131 status=SELESAI 2026-10-03 — satu akun nyata = satu peran (D66): POST /me/role (pilih sekali, bertanda tangan), /me/roles mengembalikan peran efektif, rute peserta/penerbit/Agent Owner menolak akun berperan lain kecuali akun dev. Buktikan ulang: npm run verify:account. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { accountOf, roleRefusal, isAdminAddress, adminAddresses } from './account.js'
import { chooseRole as dbChooseRole, recordRole as dbRecordRole } from './db.js'
// Lencana-B133 status=SELESAI 2026-10-03 — Penerbit menyusun kursus: POST /publisher/drafts (daftar), /publisher/drafts/save dan /publisher/drafts/submit (anggota berhak susun, tanda tangan atas hash isi); kursus yang diterbitkan kunci penerbit digabung ke katalog proses ini (GET /catalog/published tanpa kunci). Buktikan ulang: npm run verify:authoring. JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { refreshCatalog, publishedCatalog, courseArchived, dbCourseMeta } from './catalog.js'
// Lencana-B132 status=SELESAI 2026-10-03 — robot agen: templat registrasi publik, klaim agen yang didaftarkan pemiliknya sendiri (struk dibaca dari chain), gas untuk akun Agent Owner yang belum punya agen. Buktikan ulang: npm run verify:studio. JANGAN dibalik/diulang tanpa membuka kembali baris B132 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { registrationFile, ERC8004 } from './erc8004.js'
import { verifySelfRegistration } from './owner.js'
// Lencana-B135 status=SELESAI 2026-10-03 — otak agen semi-otomatis: POST /owner/agents/brain (pemilik mencatat provider + model + kalibrasi, tanpa API key) dan POST /owner/agents/queue (dompet agen membaca esai dari kursus yang menyewanya); dasbor pemilik memuat otaknya. Buktikan ulang: npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { parseBrainMessage, BRAIN_HINT, QUEUE_RE, QUEUE_HINT, recordBrain, agentQueue } from './brain.js'
import { REVIEW_QUEUE_RE, REVIEW_QUEUE_HINT, reviewQueue } from './review.js'
import { agentBrains as dbAgentBrains } from './db.js'
// Lencana-B138 status=SELESAI 2026-10-03 — bursa agen: GET /agents/market (agen yang dikenal platform dengan fakta registry, otak, angka gabungan; cache 60 detik), dibatalkan oleh sewa, penunjukan, otak, dan klaim agen. Buktikan ulang: npm run verify:market. JANGAN dibalik/diulang tanpa membuka kembali baris B138 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { agentMarket, invalidateMarket } from './market.js'
import { recordPlatformAgent as dbRecordPlatformAgent } from './db.js'
import { prepareDraft, publishPlan } from './drafts.js'
import {
  saveDraft as dbSaveDraft, submitDraft as dbSubmitDraft, draftsOf as dbDraftsOf, projectDraft,
  draftById as dbDraftById, publishedRowOf as dbPublishedRowOf, forkDraft as dbForkDraft, deleteDraft as dbDeleteDraft,
  decideDraft as dbDecideDraft, archiveCourse as dbArchiveCourse, courseActionsOf as dbCourseActionsOf,
} from './db.js'

// Env dibaca dari `../.env` sebelum konstanta di bawah diambil, supaya `npm run serve` di clone
// orang lain melayani hal yang sama seperti yang kita uji — tanpa itu RPC/RESOLVER kosong dan
// server tetap hidup sambil menyajikan keadaan yang lebih sedikit daripada yang dikira pembaca.
// Nilai dari lingkungan proses MENANG: itulah cara operator mengevaluasi konfigurasi lain.
await loadFileEnvReport('server')

const PORT = Number(process.env.PORT ?? 8787)
const HOST = process.env.HOST ?? '127.0.0.1'
const BASE_URL = process.env.BASE_URL ?? `http://${HOST}:${PORT}`
const AGENT_SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const RESOLVER = process.env.RESOLVER_ADDRESS
const RPC_URL = process.env.RPC_URL
const BAS = process.env.BAS_ADDRESS
// Siaran dari antrean relayer mati secara bawaan: server yang dinyalakan harness, atau orang dari
// `git clone`, tidak boleh mengeluarkan gas hanya karena ada yang mengirim POST /relay.
const RELAY_BROADCAST = process.env.RELAY_BROADCAST === '1' && Boolean(process.env.DEPLOYER_PRIVATE_KEY)

// Harga satu verifikasi, dalam satuan terkecil token (6 desimal): 0,001 = "satu permen".
const PRICE = BigInt(process.env.X402_PRICE ?? '1000')
const CHAIN_ID = Number(process.env.CHAIN_ID ?? 97)
const PAY_TOKEN = process.env.DEMO_TOKEN_ADDRESS
const PAY_SPLIT = process.env.SPLIT_ADDRESS
// Yang dibayar adalah PENERBIT. Platform mengambil bagiannya lewat kontrak pembagian,
// bukan dengan menulis alamatnya sendiri sebagai penerima.
const PAY_PAYEE = process.env.ISSUER_ADDRESS
// B125: kursus berbayar hanya bisa diikuti sesudah lunas. "off" hanya untuk server yang dinyalakan harness — harness itu
// menguji penilaian, bukan pembayaran; /healthz melaporkan keadaannya supaya server sungguhan bisa diperiksa dari luar.
const PAYWALL = process.env.ENROLL_PAYWALL !== 'off'
const TIMEOUT_SECONDS = Number(process.env.X402_TIMEOUT ?? 600)
// B155: kuota faucet + gas (memori proses; satu instance) dan dompet yang membayarnya, supaya saldonya terlihat di /healthz.
const LIMITS = limitsFromEnv()
// B169: instance artefak yang dicetak lewat POST /me/mint. Di chain 97 bawaannya lapis D42/D43; di chain lain harus diisi eksplisit (tidak ada tebakan).
const ARTIFACT_LAYER = process.env.ARTIFACT_LAYER_ADDRESS ?? (CHAIN_ID === 97 ? ARTIFACT_LAYER_97 : null)
const CREDENTIAL_HOST = process.env.CREDENTIAL_HOST ?? CREDENTIAL_HOST_DEFAULT
// Admin Lencana (6 Okt malam): alamat yang boleh memutuskan keanggotaan penerbit selain kunci penerbit (`POST /admin/*`). Kosong = tidak ada admin; daftar hanya dari lingkungan server.
// D77: daftar dan aturan "akun admin hanya admin" ada di `account.js` (satu sumber untuk rute dan peran).
const isAdmin = isAdminAddress
const DEPLOYER_ADDRESS = process.env.DEPLOYER_PRIVATE_KEY ? privateKeyToAccount(process.env.DEPLOYER_PRIVATE_KEY).address : null

// Setoran tenggat (B90). Premi yang hangus mengalir ke PENERBIT, sama seperti bayaran verifikasi.
// Siaran mati secara bawaan dengan alasan yang sama dengan relayer: sebuah POST tidak boleh
// mengeluarkan gas dari server harness atau clone orang lain.
const DEPOSIT = process.env.DEPOSIT_ADDRESS
const DEPOSIT_READY = Boolean(DEPOSIT && RPC_URL && RESOLVER && BAS && PAY_TOKEN && PAY_PAYEE)
const DEPOSIT_BROADCAST = process.env.DEPOSIT_BROADCAST === '1' && Boolean(process.env.DEPLOYER_PRIVATE_KEY)
// Agen sewaan (B119/B120). Penerbit = ISSUER_ADDRESS (D54: penerbit tetap attester); pembayaran sewa
// diselesaikan fasilitator yang sama dengan /verify, ke kontrak pembagian yang sama, dengan payee =
// dompet agen yang tercatat di registry ERC-8004.
const AGENTS_READY = Boolean(dbConfigured() && RPC_URL && PAY_TOKEN && PAY_SPLIT && PAY_PAYEE)
const AGENTS_CFG = {
  rpcUrl: RPC_URL, chainId: CHAIN_ID, publisher: PAY_PAYEE, token: PAY_TOKEN, split: PAY_SPLIT,
  facilitatorPk: process.env.DEPLOYER_PRIVATE_KEY,
}
const DEPOSIT_CFG = {
  rpcUrl: RPC_URL, chainId: CHAIN_ID, depositAddress: DEPOSIT, tokenAddress: PAY_TOKEN, payee: PAY_PAYEE,
  resolverAddress: RESOLVER, basAddress: BAS,
}

const { key, controller, name } = await loadKey(AGENT_SLUG)
const issuerDoc = issuerDocument({ controller, name, key })
const loaderDocs = { [controller]: issuerDoc }
const documentLoader = makeDocumentLoader(loaderDocs)

/**
 * Kapan proses ini mulai. Dipakai `serve-probe` untuk menolak menguji server yang lebih tua
 * daripada kode di disk — yang terjadi 29 Sep: signer yatim dari run sehari sebelumnya masih
 * memegang port 8787, probe berbicara dengannya, dan dua pemeriksaan merah karena PERBAIKANKU
 * belum ada di proses itu. Angka merah dari proses lama lebih menyesatkan daripada tidak ada
 * angka sama sekali, karena ia terbaca sebagai "kodenya salah".
 */
const STARTED_AT = new Date().toISOString()

/**
 * Cap kode yang DIPUAT proses ini, bukan yang ada di disk saat ditanya. Dibaca sekali di awal
 * karena justru di situlah informasinya: kalau cap dihitung ulang saat `/healthz` dipanggil,
 * server yatim akan melaporkan cap terbaru dan guard-nya mati — persis kegagalan yang mau ditangkap.
 */
const CODE_STAMP = (() => {
  const here = dirname(fileURLToPath(import.meta.url))
  let newest = 0
  let files = 0
  try {
    for (const f of readdirSync(here)) {
      if (!f.endsWith('.js')) continue
      const m = statSync(join(here, f)).mtimeMs
      files += 1
      if (m > newest) newest = m
    }
  } catch { /* jangan mematikan /healthz karena stat gagal */ }
  return { newestSrcMtime: newest || null, srcFiles: files }
})()

/**
 * Daftar untuk satu purpose. Isi logikanya ada di `lists.js` — dipakai juga oleh sisi penerbit,
 * supaya hash yang kita anchor berasal dari aturan yang sama persis dengan daftar yang kita hidangkan.
 *
 * ⚠️ Alokator hanya DIBACA (`peek` di dalam renderList). Yang boleh mengalokasikan nomor bit adalah
 * sisi penerbit, di momen kredensialnya terbit. Kalau server ikut mengalokasikan, nomornya
 * mengikuti urutan iterasi saat itu dan `statusListIndex` di kredensial lama bisa menunjuk bit
 * milik orang lain — kegagalan sunyi, dokumen tetap sah, cuma salah alamat.
 */
async function buildList (purpose) {
  const hashes = await servedHashes()
  // Dua sebab yang BERBEDA, dan dulu keduanya dibuang lewat satu kalimat. "Belum ada kertas"
  // (store dingin — keadaan setiap orang yang datang dari `git clone`) bukan kegagalan konfigurasi:
  // `renderList` atas hashes kosong menghasilkan bitstring kosong yang tetap bertanda tangan sah.
  // Menolaknya dengan 500 + pesan "RESOLVER_ADDRESS / RPC_URL not set" membuat clone baru membuka
  // /healthz dengan tangan kosong, dan yang dibaca orang adalah bug kami. Terdeteksi 29 Sep oleh
  // `npm run probe:cold` (B106, turunan B42).
  if (!RESOLVER || !RPC_URL) {
    throw new Error('RESOLVER_ADDRESS / RPC_URL not set — there is no chain to read the bit states from')
  }
  return renderList({
    purpose, baseUrl: BASE_URL, rpcUrl: RPC_URL, resolverAddress: RESOLVER, hashes,
    key, controllerDocument: issuerDoc, documentLoader,
  })
}

/**
 * `report` dari `verify.ts` membawa `bigint` (issuedAt, expiresAt, jumlah token), dan
 * `JSON.stringify` melempar untuk itu. Versi pertama berkas ini MATI di tengah permintaan
 * berbayar — settlement-nya sudah terjadi, responsnya tidak pernah ada: kegagalan terburuk
 * yang bisa dibuat sistem pembayaran, karena uangnya pindah dan klien tidak diberi bukti.
 *
 * Replacer ini membuat angka besar keluar sebagai string desimal, dan `try/catch` di bawah
 * menjamin kegagalan serialisasi tidak pernah meruntuhkan proses: klien mendapat 500 yang
 * menjelaskan, bukan koneksi yang diputus.
 */
function jsonBody (body) {
  try {
    return JSON.stringify(body, (_k, v) => (typeof v === 'bigint' ? v.toString() : v), 2)
  } catch (err) {
    return JSON.stringify({ error: `respons gagal diserialisasi: ${err.message}`, path: '/(internal)' })
  }
}

function send (res, status, body, type = 'application/json', extraHeaders = {}) {
  res.writeHead(status, {
    'content-type': `${type}; charset=utf-8`,
    // Verifier pihak ketiga membacanya dari browser: tanpa ini responsnya tidak bisa dipakai
    // di uji interoperabilitas yang memang mau kita lakukan.
    'access-control-allow-origin': '*',
    'cache-control': 'no-store',
    ...extraHeaders,
  })
  res.end(typeof body === 'string' ? body : jsonBody(body))
}

function readJsonBody (req) {
  return new Promise((resolve, reject) => {
    let raw = ''
    req.on('data', (c) => {
      raw += c
      // Batas kecil dan eksplisit: tanpa ini satu permintaan besar cukup untuk menghabiskan memori.
      if (raw.length > 64_000) reject(new Error('body terlalu besar'))
    })
    req.on('end', () => {
      if (!raw.trim()) return resolve({})
      try {
        resolve(JSON.parse(raw))
      } catch {
        reject(new Error('body bukan JSON'))
      }
    })
    req.on('error', reject)
  })
}

/** Isi `accepts[]` — dibuat satu kali per permintaan supaya `resource` ikut alamat yang diminta. */
function accepts () {
  return [paymentRequirements({
    tokenAddress: PAY_TOKEN, payTo: PAY_SPLIT, amount: PRICE,
    chainId: CHAIN_ID, resource: `${BASE_URL}/verify`, maxTimeoutSeconds: TIMEOUT_SECONDS,
  })]
}

/**
 * Peran satu alamat (B128), dari fakta yang bisa diperiksa ulang — bukan dari pilihan di halaman:
 *   peserta     setiap akun;
 *   penerbit    alamat = `ISSUER_ADDRESS`, atau keanggotaan aktif yang ditandatangani kunci penerbit (`publisher_members`);
 *   Agent Owner `ownerOf(agentId)` di registry ERC-8004 = alamat ini, untuk agen yang dikenal platform.
 */
async function rolesOf (address) {
  const addr = getAddress(String(address).toLowerCase())
  // D77: akun admin hanya admin — tidak membaca keanggotaan atau ownerOf (kursi itu tidak diakui walau faktanya masih ada).
  const adminAcct = isAdmin(addr) ? await accountCheap(addr) : null
  if (adminAcct?.role === 'admin') {
    return { address: addr, roles: { learner: false, publisher: null, agentOwner: null }, account: adminAcct, publisherRequest: null, publisherIssuer: null, admin: true }
  }
  // Keanggotaan (database) dan kepemilikan agen (chain) tidak saling bergantung — dibaca bersamaan.
  const ownedAgents = (async () => {
    if (!AGENTS_READY) return []
    const ids = [...MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean), ...await dbKnownAgentIds()]
    return agentsOwnedBy(AGENTS_CFG, addr, ids)
  })()
  // Ditunggu di bawah; penangan kosong ini hanya mencegah penolakan dini (sebelum `await`) terbaca "unhandled" dan mematikan proses.
  ownedAgents.catch(() => {})
  const publisher = await publisherSeat(addr)
  // B129: status pengajuan anggota terakhir (menunggu / ditolak / disetujui) supaya halaman tahu tombol apa yang pantas.
  const request = publisher || !PAY_PAYEE ? null : await dbLatestRequest(PAY_PAYEE, addr)
  const agents = await ownedAgents
  // B129: penerbit yang bisa dilamar — halaman menandatangani `lencana-member-request issuer=<alamat ini>`.
  const publisherIssuer = PAY_PAYEE ? { address: getAddress(PAY_PAYEE), slug: MANIFESTS[0]?.issuer.slug ?? null, name: MANIFESTS[0]?.issuer.name ?? null } : null
  // B131 (D66): `roles` tetap fakta mentah (B128); `account` = peran efektif — satu peran untuk akun nyata, semua kursi
  // menurut fakta hanya untuk akun dev. Halaman menampilkan kursi dari `account`, bukan dari `roles`.
  const account = await accountOf(addr, { issuer: PAY_PAYEE ?? null, ownsAgent: async () => agents.length > 0 })
  return { address: addr, roles: { learner: true, publisher, agentOwner: agents.length ? { agents } : null }, account, publisherRequest: request, publisherIssuer, admin: isAdmin(addr) }
}

/** Peran efektif tanpa bacaan chain — untuk penjaga rute yang dipanggil sering (B131). */
const accountCheap = (address) => accountOf(address, { issuer: PAY_PAYEE ?? null })

/** Peran efektif lengkap (dengan ownerOf atas agen yang dikenal) — untuk keputusan yang jarang: memilih peran, hibah anggota. */
async function accountFull (address) {
  const ownsAgent = AGENTS_READY
    ? async (a) => (await agentsOwnedBy(AGENTS_CFG, a, [...MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean), ...await dbKnownAgentIds()])).length > 0
    : null
  return accountOf(address, { issuer: PAY_PAYEE ?? null, ownsAgent })
}

// B131: rute yang hanya untuk peran Peserta. Akun Penerbit / Agent Owner (bukan dev) ditolak sebelum tanda tangannya dipakai.
const LEARNER_ROUTES = new Set(['/enroll', '/progress', '/grade', '/essay', '/praktik', '/faucet', '/me/mint'])

/** Kursi Penerbit satu alamat: pemegang kunci penerbit (`issuer`) atau anggota aktif (`member`), atau null. */
async function publisherSeat (address) {
  if (!PAY_PAYEE) return null
  const addr = getAddress(String(address).toLowerCase())
  // D77: akun admin tidak memegang kursi Penerbit lewat keanggotaan (kunci penerbit sendiri tetap penerbit).
  if (isAdmin(addr) && addr.toLowerCase() !== PAY_PAYEE.toLowerCase()) return null
  const issuer = MANIFESTS[0]?.issuer
  if (addr.toLowerCase() === PAY_PAYEE.toLowerCase()) {
    return { issuer: getAddress(PAY_PAYEE), slug: issuer?.slug ?? null, name: issuer?.name ?? null, via: 'issuer', canHire: true, canAppoint: true, canAuthor: true, canPublish: true, since: null }
  }
  const membership = (await dbMembershipsOf(addr)).find((m) => String(m.issuer).toLowerCase() === PAY_PAYEE.toLowerCase()) ?? null
  return membership
    ? {
        issuer: getAddress(membership.issuer), slug: issuer?.slug ?? null, name: issuer?.name ?? null, via: 'member',
        canHire: membership.can_hire === true, canAppoint: membership.can_appoint === true, canAuthor: membership.can_author === true,
        canPublish: membership.can_publish === true, since: membership.granted_at,
      }
    : null
}

/** 402 untuk enrollment kursus berbayar: syarat x402 yang sama dengan /verify, dengan jumlah = harga kursus. */
function notPaidEnroll (res, courseId, price, why) {
  return send(res, 402, {
    x402Version: 1,
    error: why,
    course: courseId,
    price: { amount: String(price), symbol: PAY_TOKEN_SYMBOL, decimals: PAY_TOKEN_DECIMALS },
    accepts: [paymentRequirements({
      tokenAddress: PAY_TOKEN, payTo: PAY_SPLIT, amount: price, chainId: CHAIN_ID,
      resource: `${BASE_URL}/enroll/${encodeURIComponent(courseId)}`, maxTimeoutSeconds: TIMEOUT_SECONDS,
      description: `Pendaftaran kursus ${courseId}: satu pembayaran membuka kelas untuk akun ini.`,
    })],
  }, 'application/json', { 'www-authenticate': 'X-PAYMENT realm="x402", error="insufficient_payment"' })
}

/**
 * Enrollment kursus berbayar (B125). Urutannya sengaja: pemeriksaan murah dulu, lalu TANDA TANGAN PESERTA (nonce
 * sekali-pakai) — baru gas keluar. Permintaan yang bukan dari pemilik alamat tidak boleh membuat kami menyiarkan apa pun.
 * Settlement dan pembagian memakai jalur yang sama dengan /verify (`settlePayment`), lalu baris enrollment + order.
 */
async function enrollPaidRoute (req, res, body, lessonsTotal, price) {
  if (!PAY_TOKEN || !PAY_SPLIT || !PAY_PAYEE) {
    return send(res, 500, { error: 'DEMO_TOKEN_ADDRESS / SPLIT_ADDRESS / ISSUER_ADDRESS not set — paid enrollment cannot be served' })
  }
  const header = req.headers['x-payment']
  if (!header) return notPaidEnroll(res, body.course, price, 'this course is paid: the class opens after payment')
  const payment = decodePaymentHeader(header)
  if (!payment) return notPaidEnroll(res, body.course, price, 'X-PAYMENT is not valid base64(JSON)')
  const p = payment.payload ?? {}
  const why = checkPayment(p, price)
  if (why) return notPaidEnroll(res, body.course, price, why)
  if (String(p.payer ?? '').toLowerCase() !== String(body.learner ?? '').toLowerCase()) {
    return notPaidEnroll(res, body.course, price, 'the payer must be the learner who enrolls')
  }
  const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'enroll' })
  if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
  let settled
  try {
    settled = await settlePayment({
      rpcUrl: RPC_URL, facilitatorPk: process.env.DEPLOYER_PRIVATE_KEY,
      payment, split: PAY_SPLIT, payee: PAY_PAYEE,
      splitRefSalt: `enroll:${body.course}:${String(p.payer).toLowerCase()}:${p.nonce}`,
    })
  } catch (err) {
    return notPaidEnroll(res, body.course, price, `settlement failed: ${String(err.message ?? err).split('\n')[0]}`)
  }
  const out = await dbEnrollPaid({
    learner: body.learner, courseId: body.course, lessonsTotal, asset: p.token, amount: String(p.amount), txHash: settled.settleTx,
  })
  if (!out.ok) {
    return send(res, 500, jsonBody({ error: `paid (${settled.settleTx}) but the enrollment could not be written: ${out.why} — keep this transaction hash` }))
  }
  return send(res, 200, jsonBody({
    enrolled: true, created: out.created, enrollmentId: out.enrollment?.id, course: body.course,
    paid: { amount: String(p.amount), token: p.token, settleTx: settled.settleTx, splitTx: settled.splitTx },
  }), 'application/json', {
    'x-payment-response': encodePaymentHeader({
      x402Version: 1, success: true, network: `eip155:${CHAIN_ID}`, transaction: settled.settleTx, payer: p.payer,
      settlement: { settleTx: settled.settleTx, splitTx: settled.splitTx, splitRef: settled.splitRef },
    }),
  })
}

function notPaid (res, why) {
  return send(res, 402, { x402Version: 1, error: why, accepts: accepts() }, 'application/json', {
    'www-authenticate': 'X-PAYMENT realm="x402", error="insufficient_payment"',
  })
}

/**
 * `/verify` berbayar. `402 Payment Required` -> klien menandatangani pembayaran -> kami menyiarkan
 * settlement sebagai fasilitator -> laporan verifikasi + `X-PAYMENT-RESPONSE`.
 *
 * ⚠️ Penjaga yang TIDAK boleh dilonggarkan: settlement yang tidak menunjuk split kita, tidak memakai
 * token yang kami terima, atau jumlahnya di bawah harga — **ditolak sebelum ada gas keluar**.
 * Tanpa pemeriksaan ini, server kami bisa disuruh membayar gas untuk memindahkan uang orang lain ke
 * alamat siapa pun: kita yang bayar, orang lain yang untung.
 */
async function handleVerify (req, res) {
  if (!PAY_TOKEN || !PAY_SPLIT || !PAY_PAYEE) {
    return send(res, 500, { error: 'DEMO_TOKEN_ADDRESS / SPLIT_ADDRESS / ISSUER_ADDRESS not set — the paid path cannot be served without them' })
  }

  const header = req.headers['x-payment']
  if (!header) return notPaid(res, 'X-PAYMENT header is required')

  const payment = decodePaymentHeader(header)
  if (!payment) return notPaid(res, 'X-PAYMENT bukan base64(JSON) yang sah')

  const p = payment.payload ?? {}
  const why = checkPayment(p)
  if (why) return notPaid(res, why)

  let body
  try {
    body = await readJsonBody(req)
  } catch (err) {
    return send(res, 400, { error: err.message })
  }
  const hashes = pickHashes(body)
  if (hashes.error) return send(res, 400, { error: hashes.error })
  const list = hashes.list

  let settled
  try {
    settled = await settlePayment({
      rpcUrl: RPC_URL, facilitatorPk: process.env.DEPLOYER_PRIVATE_KEY,
      payment, split: PAY_SPLIT, payee: PAY_PAYEE,
      splitRefSalt: `${list[0]}:${list.length}:${p.nonce}:${Date.now()}`,
    })
  } catch (err) {
    // Pembayaran yang gagal tidak membuat kami menahan datanya: 402 lagi, dengan sebab yang jelas.
    return notPaid(res, `settlement gagal: ${err.message.split('\n')[0]}`)
  }

  const ep = defaultEndpoint()
  const endpoint = { ...ep, rpcUrl: RPC_URL ?? ep.rpcUrl, resolver: RESOLVER ?? ep.resolver }
  const reports = []
  // Empat pembaca paralel, bukan semua sekaligus: satu verifikasi memanggil RPC belasan kali, jadi
  // 25 hash paralel penuh = ~300 eth_call serentak ke RPC publik yang kita UJI sendiri gugur kalau
  // di-burst. Yang lebih cepat di sini justru menghasilkan laporan separuh kosong.
  for (let i = 0; i < list.length; i += 4) {
    const slice = list.slice(i, i + 4)
    const part = await Promise.all(slice.map(async (h) => {
      const r = await verifyCredential(h, endpoint)
      return { credentialHash: h, verdict: r.verdict, reasons: r.reasons, credential: r.credential, anchors: r.anchors, limits: r.limits }
    }))
    reports.push(...part)
  }

  const responseHeader = encodePaymentHeader({
    x402Version: 1,
    success: true,
    network: `eip155:${CHAIN_ID}`,
    transaction: settled.settleTx,
    payer: p.payer,
    // Kami menambahkan ini di luar spesifikasi: bukti bahwa pendapatan TERBAGI, bukan cuma sampai.
    settlement: { settleTx: settled.settleTx, splitTx: settled.splitTx, splitRef: settled.splitRef },
    served: reports.length,
  })

  return send(res, 200, {
    paid: { amount: String(p.amount), token: p.token, settleTx: settled.settleTx, splitTx: settled.splitTx },
    // Selisih yang dibaca dari chain — bukan asumsi bahwa pembagian pasti terjadi.
    sharesOnChain: {
      payee: String(settled.issuerShare), facilitator: String(settled.platformShare), leftInSplit: String(settled.leftInSplit),
    },
    batch: { requested: list.length, served: reports.length, perSettlementGas: PER_VERIFICATION_GAS },
    reports,
    // `report` tetap diisi saat satu hash: klien lama (dan harness kita) tidak boleh diam-diam
    // berubah makna hanya karena rute ini jadi bisa batch.
    report: reports.length === 1 ? reports[0] : undefined,
  }, 'application/json', { 'x-payment-response': responseHeader })
}

/**
 * Satu pembayaran harus melayani BANYAK verifikasi, dan itu bukan kenyamanan -- itu satu-satunya
 * alasan rute ini boleh menagih. Satu settlement on-chain = 190.659 gas (terukur dari receipt);
 * pada tarif 1000 satuan terkecil, gas per item harus turun lewat batch supaya 10% platform
 * tidak kalah oleh harga BNB.
 */
const BATCH_MAX = 25
const PER_VERIFICATION_GAS = 190659

function pickHashes (body) {
  const raw = Array.isArray(body.credentialHashes) ? body.credentialHashes
    : (body.credentialHash ?? body.i) !== undefined ? [body.credentialHash ?? body.i] : []
  const seen = new Set()
  for (const item of raw) {
    const h = String(item ?? '').trim()
    if (!/^0x[0-9a-fA-F]{64}$/.test(h)) {
      return { error: `each item must be a 32-byte hash (0x…64 hex); got "${String(item).slice(0, 20)}"` }
    }
    seen.add(h.toLowerCase())
  }
  const list = [...seen]
  if (!list.length) return { error: 'requires a JSON body {credentialHash: "0x…"} or {credentialHashes: ["0x…"]}' }
  if (list.length > BATCH_MAX) return { error: `batch maximum ${BATCH_MAX} credentials per payment` }
  return { list }
}

function checkPayment (p, price = PRICE) {
  if (String(p.token ?? '').toLowerCase() !== PAY_TOKEN.toLowerCase()) return 'token pembayaran bukan yang kami terima'
  if (String(p.payTo ?? '').toLowerCase() !== PAY_SPLIT.toLowerCase()) return 'pembayaran tidak ditujukan ke kontrak pembagian kami'
  if (!Number.isInteger(Number(p.nonce))) return 'nonce pembayaran bukan bilangan bulat'
  let amount
  try {
    amount = BigInt(p.amount ?? -1)
  } catch {
    return 'jumlah pembayaran bukan bilangan bulat'
  }
  if (amount < price) return `jumlah di bawah harga (${price})`
  if (Number(p.deadline ?? 0) * 1000 < Date.now()) return 'pembayaran sudah kedaluwarsa'
  if (!p.eip2612 || !p.witnessSig) return 'payload pembayaran tidak membawa tanda tangan'
  return null
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, BASE_URL).pathname
  try {
    // Lencana-B122 status=SELESAI 2026-10-01 — preflight CORS: halaman belajar (origin lain: dev server, Vercel) mengirim POST JSON, dan peramban selalu bertanya OPTIONS dulu; sampai 1 Okt jawabannya 405 untuk setiap rute, jadi tidak satu pun tulisan halaman yang pernah sampai dari peramban sungguhan (ditemukan uji peramban FE7). Otorisasi tidak berubah: tulisan tetap butuh tanda tangan/token di badan, tanpa cookie. Buktikan ulang: npm run verify:privy (bagian C). JANGAN dibalik/diulang tanpa membuka kembali baris B122 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type, x-payment',
        // Chrome (Private Network Access): halaman publik yang memanggil signer di 127.0.0.1.
        'access-control-allow-private-network': 'true',
        'access-control-max-age': '600',
      })
      return res.end()
    }
    // B133: kursus yang diterbitkan dari halaman ikut katalog proses ini (murah bila masih segar; TTL di catalog.js).
    if (path !== '/healthz') await refreshCatalog().catch((e) => console.warn(`katalog database tidak termuat: ${String(e.message ?? e).slice(0, 120)}`))
    if (path === '/catalog/published' && req.method === 'GET') {
      // Publik: isi kursus + harga, TANPA kunci kuis (manifest publik). Halaman memakainya untuk katalog dan kelas.
      // B140: `archived` = tetap dimuat untuk peserta lama, disembunyikan dari katalog; `version` = nomor versi terbit.
      return send(res, 200, jsonBody({ courses: publishedCatalog().map((c) => ({ manifest: c.manifest, price: c.price, version: c.version, archived: c.archived })) }))
    }
    if (path === `/issuers/${AGENT_SLUG}` || path === '/issuers') return send(res, 200, issuerDoc)
    // B48: setiap kredensial mencetak `verificationMethod` miliknya sendiri. Selama server hanya
    // melayani slug yang kebetulan di-start, ijazah terbitan agen lain jadi 404 di instance ini —
    // dari luar kelihatan seperti kredensialnya rusak, padahal kuncinya ada di disk. Jadi setiap
    // agen di .keys/ disajikan di URL-nya masing-masing, dibangun dari field publik saja.
    if (path.startsWith('/issuers/')) {
      const slug = decodeURIComponent(path.slice('/issuers/'.length))
      const agents = await listAgents()
      const agent = agents.find((a) => a.agentSlug === slug)
      if (!agent) {
        return send(res, 404, { error: 'unknown agent', slug, known: agents.map((a) => a.agentSlug) })
      }
      // Identitas disajikan dari `agentIdentity`, bukan dari controller di berkas kunci: kredensial
      // yang sudah dipindah ke host tepi mencetak `issuer.id` di host itu, dan kalau server ini
      // masih merakit `assertionMethod[].id` dari controller lama, verifier yang lewat sini
      // menolak tanda tangan yang sah. (Ditangkap `serve-probe` 29 Sep — lihat `issuer.js:identityBase`.)
      return send(res, 200, issuerDocumentFor(agentIdentity(agent)))
    }
    // `achievement.criteria.id` dan `result[].resultDescription` di setiap kredensial menunjuk ke
    // sini. Sampai hari ini keduanya hanya identifier — sah menurut spesifikasi, tapi pertanyaan
    // "dinilai pakai aturan apa" tidak dijawab oleh dokumen mana pun yang bisa dibuka orang lain.
    // Yang keluar di sini adalah kebijakan penerbit, TANPA kunci jawaban (lihat src/criteria.js).
    if (path.startsWith('/criteria/')) {
      const slug = decodeURIComponent(path.slice('/criteria/'.length))
      const manifest = manifestOf(slug)
      if (!manifest) {
        return send(res, 404, { error: 'no publisher manifest with that id', slug, known: Object.keys(MANIFESTS) })
      }
      return send(res, 200, criteriaDocument({
        baseUrl: BASE_URL,
        manifest,
        rubricHash: rubricHashOf(manifest),
        manifestHash: manifestHashOf(manifest),
      }))
    }
    if (path === `/credentials/status/${REVOCATION}`) return send(res, 200, (await buildList(REVOCATION)).signed)
    if (path === `/credentials/status/${SUSPENSION}`) return send(res, 200, (await buildList(SUSPENSION)).signed)
    // --------------------------------------------------------------------------------------
    // State belajar (bar e-course 3 & 4). Sengaja DI ATAS rute lain dan sengaja pulang-pergi
    // ringan: ini permukaan yang akan dipanggil front-end nanti.
    //
    // Dua hal yang tidak boleh dilupakan di sini:
    //  - secret key DB melewati RLS, jadi pemeriksaan "siapa yang boleh menulis untuk alamat ini"
    //    ada di KITA (tanda tangan nonce atas nama peserta), bukan di database;
    //  - `attempt_hash` dihitung dari rekaman di DB (lihat db.js), tidak pernah diterima dari klien.
    if (path === '/enroll' || path === '/attempts' || path === '/progress' || path === '/grade' || path === '/praktik'
      || path === '/essay' || path === '/essay/judgement' || path === '/essay/reviewers' || path === '/essay/review'
      || path === '/auth/privy' || path === '/me/records' || path === '/faucet' || path === '/me/mint' || path === '/admin/overview' || path === '/admin/members' || path === '/me/roles' || path === '/publisher/members'
      || path === '/me/member-request' || path === '/publisher/overview' || path === '/publisher/agents/hire' || path === '/publisher/reviewers'
      || path === '/owner/overview' || path === '/owner/gas' || path === '/owner/agents/claim' || path === '/me/role'
      || path === '/publisher/drafts' || path === '/publisher/drafts/save' || path === '/publisher/drafts/submit'
      || path === '/publisher/drafts/fork' || path === '/publisher/drafts/delete' || path === '/publisher/drafts/decide' || path === '/publisher/courses/archive'
      || path === '/owner/agents/brain' || path === '/owner/agents/queue' || path === '/owner/agents/review-queue') {
      if (!dbConfigured()) {
        return send(res, 503, jsonBody({ error: 'learning layer not configured', missing: dbMissingReason() }))
      }
      // GET /progress = ringkasan milik satu peserta di satu kursus. Sengaja hanya membaca baris
      // yang sudah dia tulis sendiri, dan hanya menjawab lewat backend kita: publishable key tidak
      // bisa membaca tabel ini (RLS), jadi bocoran tidak datang dari jalur ini.
      if (path === '/progress' && req.method === 'GET') {
        const learner = new URL(req.url, BASE_URL).searchParams.get('learner')
        const course = new URL(req.url, BASE_URL).searchParams.get('course')
        if (!learner || !course) return send(res, 400, jsonBody({ error: 'requires ?learner=0x…&course=<courseId>' }))
        const sum = await dbProgressSummary(learner, course)
        return send(res, sum ? 200 : 404, jsonBody(sum ?? { error: 'no enrollment yet for this learner/course' }))
      }
      if (req.method !== 'POST') {
        return send(res, 405, jsonBody({ error: 'POST required', path }))
      }
      const body = await readJsonBody(req)
      if (!body || typeof body !== 'object') return send(res, 400, jsonBody({ error: 'body must be a JSON object' }))
      // B131 (D66): akun yang berperan Penerbit / Agent Owner tidak belajar, membayar kursus, atau meminta koin uji.
      // Akun tanpa peran boleh — belajar menjadikannya Peserta (rekaman mendahului fakta di `accountOf`).
      if (LEARNER_ROUTES.has(path) && isAddress(String(body.learner ?? ''))) {
        // Murah dulu (database); bacaan chain (ownerOf) hanya bila akun belum berperan menurut database — dalam praktik
        // hanya enroll / koin uji pertama, karena sesudah enroll rekaman sudah menjadikannya Peserta.
        let acct = await accountCheap(body.learner)
        if (!acct.dev && !acct.role) acct = await accountFull(body.learner)
        const refused = roleRefusal(acct, 'learner')
        if (refused) return send(res, 403, jsonBody({ error: refused }))
      }
      if (path === '/me/role') {
        // B131: pilih peran sekali. Ditolak sebelum tanda tangan dipakai bila akun sudah berperan menurut pilihan, rekaman,
        // atau fakta — pilihan kedua juga ditolak kunci primer `account_roles` di database.
        if (!isAddress(String(body.learner ?? ''))) return send(res, 400, jsonBody({ error: 'learner must be the address of the account that signs' }))
        const before = await accountFull(body.learner)
        if (before.dev) return send(res, 409, jsonBody({ error: 'developer accounts hold every seat their facts give them and do not choose a role', account: before }))
        if (before.role) {
          return send(res, 409, jsonBody({ error: `this account already holds the ${before.role} role (${before.via}) — one account holds one role`, account: before }))
        }
        const out = await dbChooseRole({
          address: getAddress(String(body.learner).toLowerCase()), role: body.role, issuer: PAY_PAYEE ?? null, note: body.note ?? null,
          message: body.message, signature: body.signature,
        })
        if (!out.ok) return send(res, ({ auth: 401, conflict: 409 })[out.kind] ?? 400, jsonBody({ error: out.why }))
        return send(res, 201, jsonBody({ role: out.role, chosenAt: out.chosenAt, request: out.request, account: await accountCheap(body.learner) }))
      }
      // Lencana-B124 status=SELESAI 2026-10-02 — rute POST /me/records: rekaman belajar milik peserta (enrollment, ringkasan, usaha dinilai) untuk dashboard; hanya pemilik alamat (tanda tangan + nonce, pesan khusus), tanpa teks esai. Buktikan ulang: npm run verify:records. JANGAN dibalik/diulang tanpa membuka kembali baris B124 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
      if (path === '/faucet') {
        // B125: koin uji LDC-demo (testnet) ke dompet peserta; platform membayar gas. Sekali per alamat per jendela waktu,
        // dicatat lewat nonce bertanda tangan — bukan memori proses yang hilang saat server dinyalakan ulang.
        if (typeof body.message !== 'string' || !/^lencana-faucet nonce=[0-9a-f]{12,}$/.test(body.message)) {
          return send(res, 400, jsonBody({ error: 'message must be "lencana-faucet nonce=<hex>"' }))
        }
        if (!PAY_TOKEN || !process.env.DEPLOYER_PRIVATE_KEY) return send(res, 503, jsonBody({ error: 'test-coin faucet is not configured on this server' }))
        if (typeof body.learner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(body.learner)) return send(res, 400, jsonBody({ error: 'invalid learner address' }))
        const last = await dbRecentFaucet(body.learner, FAUCET_COOLDOWN_HOURS)
        if (last) return send(res, 429, jsonBody({ error: `test coins were already sent to this address in the last ${FAUCET_COOLDOWN_HOURS} hours`, lastAt: last }))
        // B155: alamat baru gratis dibuat, jadi batas per alamat saja tidak melindungi saldo deployer. Dicek sebelum tanda
        // tangan dipakai (nonce tidak terbakar oleh permintaan yang toh ditolak); slot dilepas bila pemberiannya gagal.
        const slot = LIMITS.faucet.take(clientIp(req))
        if (!slot.ok) return send(res, 429, jsonBody({ error: `test-coin faucet ${slot.reason}`, retryAt: slot.retryAt }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'faucet' })
        if (!auth.ok) { slot.release(); return send(res, 401, jsonBody({ error: auth.why })) }
        try {
          const minted = await mintTestCoins({ rpcUrl: RPC_URL, minterPk: process.env.DEPLOYER_PRIVATE_KEY, token: PAY_TOKEN, to: body.learner, amount: FAUCET_AMOUNT })
          return send(res, 200, jsonBody({ sent: String(FAUCET_AMOUNT), symbol: PAY_TOKEN_SYMBOL, decimals: PAY_TOKEN_DECIMALS, tx: minted.tx, balance: String(minted.balance) }))
        } catch (err) {
          // Gagal mencetak = jangan kunci peserta 24 jam tanpa koin.
          slot.release()
          const nonce = /nonce=([0-9a-f]{12,})/.exec(body.message)?.[1]
          if (nonce) await dbForgetNonce(nonce).catch(() => {})
          return send(res, 502, jsonBody({ error: `mint failed: ${String(err.message ?? err).split('\n')[0].slice(0, 160)}` }))
        }
      }
      if (path === '/me/mint') {
        // B169: peserta meminta artefak NFT soulbound untuk SATU kredensial miliknya. Tanda tangan hanya membuktikan siapa yang
        // meminta; boleh/tidaknya diputuskan kontrak (`mint` menolak yang bukan pemegang, dicabut, sudah punya artefak, dst.) lewat
        // simulasi di `mintArtifact`. Platform membayar gasnya, jadi urutannya sama dengan /faucet: batas dulu, tanda tangan sesudahnya.
        if (typeof body.message !== 'string' || !/^lencana-mint nonce=[0-9a-f]{12,}$/.test(body.message)) {
          return send(res, 400, jsonBody({ error: 'message must be "lencana-mint nonce=<hex>"' }))
        }
        if (typeof body.learner !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(body.learner)) return send(res, 400, jsonBody({ error: 'invalid learner address' }))
        if (typeof body.hash !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(body.hash)) return send(res, 400, jsonBody({ error: 'hash must be 0x + 64 hex (the credential hash)' }))
        if (!ARTIFACT_LAYER || !RPC_URL || !process.env.DEPLOYER_PRIVATE_KEY) return send(res, 503, jsonBody({ error: 'artefact minting is not configured on this server' }))
        const slot = LIMITS.mint.take(clientIp(req))
        if (!slot.ok) return send(res, 429, jsonBody({ error: `artefact minting ${slot.reason}`, retryAt: slot.retryAt }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'mint' })
        if (!auth.ok) { slot.release(); return send(res, 401, jsonBody({ error: auth.why })) }
        const minted = await mintArtifact({
          rpcUrl: RPC_URL, minterPk: process.env.DEPLOYER_PRIVATE_KEY, cert: ARTIFACT_LAYER, learner: body.learner, hash: body.hash, host: CREDENTIAL_HOST,
        })
        if (!minted.ok) {
          // Ditolak/gagal = tidak ada gas terpakai dan tanda tangannya boleh dipakai lagi; slot dikembalikan.
          slot.release()
          const nonce = /nonce=([0-9a-f]{12,})/.exec(body.message)?.[1]
          if (nonce) await dbForgetNonce(nonce).catch(() => {})
          return send(res, minted.status, jsonBody({ error: minted.why, kind: minted.kind, ...(minted.tokenId ? { tokenId: minted.tokenId, cert: ARTIFACT_LAYER } : {}) }))
        }
        return send(res, 200, jsonBody({ minted: true, cert: minted.cert, tokenId: minted.tokenId, owner: minted.owner, locked: minted.locked, tx: minted.tx }))
      }
      if (path === '/me/records') {
        // Pesan harus menyebut keperluannya: tanda tangan untuk enroll/kuis tidak boleh dipakai ulang untuk membaca nilai.
        if (typeof body.message !== 'string' || !/^lencana-records nonce=[0-9a-f]{12,}$/.test(body.message)) {
          return send(res, 400, jsonBody({ error: 'message must be "lencana-records nonce=<hex>"' }))
        }
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'records' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        return send(res, 200, jsonBody(await dbLearnerRecords(body.learner)))
      }
      if (path === '/me/roles') {
        // B128: tanda tangan khusus peran — tanda tangan untuk rekaman/enroll tidak bisa dipakai ulang di sini.
        if (typeof body.message !== 'string' || !/^lencana-roles nonce=[0-9a-f]{12,}$/.test(body.message)) {
          return send(res, 400, jsonBody({ error: 'message must be "lencana-roles nonce=<hex>"' }))
        }
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'roles' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        return send(res, 200, jsonBody(await rolesOf(body.learner)))
      }
      if (path === '/publisher/members') {
        // B128: hanya kunci penerbit yang memberi atau mencabut keanggotaan; terbit/cabut kredensial tidak ikut didelegasikan.
        if (!PAY_PAYEE) return send(res, 503, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher to grant membership' }))
        if (String(body.issuer ?? '').toLowerCase() !== PAY_PAYEE.toLowerCase()) {
          return send(res, 401, jsonBody({ error: `memberships are granted by the configured publisher (${PAY_PAYEE})` }))
        }
        // B131: hibah hanya untuk akun yang berperan Penerbit atau belum berperan (atau akun dev) — satu akun satu peran.
        if (body.revoke !== true && body.reject !== true && isAddress(String(body.member ?? ''))) {
          const refused = roleRefusal(await accountFull(body.member), 'publisher')
          if (refused) return send(res, 409, jsonBody({ error: `membership not granted: ${refused}` }))
        }
        const out = body.revoke === true
          ? await dbRevokeMember({ issuer: body.issuer, member: body.member, message: body.message, signature: body.signature })
          : body.reject === true
            // B129: tolak pengajuan — juga hanya kunci penerbit; kursi siapa pun tidak berubah.
            ? await dbRejectRequest({ issuer: body.issuer, applicant: body.member, message: body.message, signature: body.signature })
            : await dbGrantMember({
              issuer: body.issuer, member: body.member, canHire: body.canHire === true, canAppoint: body.canAppoint === true, canAuthor: body.canAuthor === true,
              canPublish: body.canPublish === true, message: body.message, signature: body.signature,
            })
        if (!out.ok) return send(res, out.kind === 'auth' ? 401 : 400, jsonBody({ error: out.why }))
        const { ok, kind, ...granted } = out
        return send(res, 200, jsonBody(granted))
      }
      if (path === '/admin/overview' || path === '/admin/members') {
        // Admin Lencana (6 Okt malam, keputusan builder): keanggotaan penerbit diputuskan admin (alamat di ADMIN_ADDRESSES), bukan hanya kunci penerbit.
        // Urutan: penerbit ada → bentuk alamat → admin? (403, sebelum tanda tangan dipakai) → bentuk pesan → tanda tangan + nonce → tindakan.
        if (!PAY_PAYEE) return send(res, 503, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher to decide for' }))
        if (typeof body.admin !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(body.admin)) return send(res, 400, jsonBody({ error: 'invalid admin address' }))
        if (!isAdmin(body.admin)) return send(res, 403, jsonBody({ error: 'this account is not a Lencana admin' }))
        const isOverview = path === '/admin/overview'
        let want
        if (isOverview) want = 'lencana-admin overview'
        else {
          if (!isAddress(String(body.member ?? ''))) return send(res, 400, jsonBody({ error: 'member must be a 20-byte address' }))
          const member = String(body.member).toLowerCase()
          if (body.action === 'grant') want = `lencana-admin grant member=${member} hire=${body.hire === true ? 1 : 0} appoint=${body.appoint === true ? 1 : 0} author=${body.author === true ? 1 : 0} publish=${body.publish === true ? 1 : 0}`
          else if (body.action === 'reject' || body.action === 'revoke') want = `lencana-admin ${body.action} member=${member}`
          else return send(res, 400, jsonBody({ error: 'action must be "grant", "reject" or "revoke"' }))
        }
        if (typeof body.message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(body.message)) {
          return send(res, 400, jsonBody({ error: `message must be "${want} nonce=<hex>"` }))
        }
        const auth = await dbAuthorize({ learner: body.admin, message: body.message, signature: body.signature, scope: 'admin' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        if (isOverview) {
          const [requests, members] = await Promise.all([dbPendingRequests(PAY_PAYEE), dbMembersOf(PAY_PAYEE)])
          return send(res, 200, jsonBody({
            issuer: getAddress(PAY_PAYEE),
            publisherName: MANIFESTS[0]?.issuer.name ?? null,
            requests: requests.map((r) => ({ id: Number(r.id), address: r.applicant, note: cleanNote(r.note), at: r.created_at })),
            members: members.map((m) => ({ member: m.member, canHire: m.can_hire === true, canAppoint: m.can_appoint === true, canAuthor: m.can_author === true, canPublish: m.can_publish === true, since: m.granted_at })),
          }))
        }
        if (body.action === 'grant') {
          // Satu akun satu peran (B131): hibah hanya untuk akun yang berperan Penerbit atau belum berperan (atau akun dev).
          const refused = roleRefusal(await accountFull(body.member), 'publisher')
          if (refused) return send(res, 409, jsonBody({ error: `membership not granted: ${refused}` }))
        }
        const out = body.action === 'grant'
          ? await dbAdminGrant({ issuer: PAY_PAYEE, member: body.member, canHire: body.hire === true, canAppoint: body.appoint === true, canAuthor: body.author === true, canPublish: body.publish === true, message: body.message, signature: body.signature })
          : body.action === 'reject'
            ? await dbAdminReject({ issuer: PAY_PAYEE, applicant: body.member, message: body.message, signature: body.signature })
            : await dbAdminRevoke({ issuer: PAY_PAYEE, member: body.member, message: body.message, signature: body.signature })
        if (!out.ok) return send(res, 400, jsonBody({ error: out.why }))
        const { ok, kind, ...done } = out
        return send(res, 200, jsonBody(done))
      }
      if (path === '/me/member-request') {
        // B129: akun mengajukan diri dengan tanda tangannya sendiri; pengajuan tidak memberi wewenang apa pun.
        if (!PAY_PAYEE) return send(res, 503, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher to apply to' }))
        // B131: hanya akun berperan Penerbit, akun dev, atau akun yang belum berperan. Untuk yang terakhir, pengajuan yang
        // diterima ADALAH pilihan peran Penerbit — dicatat dengan pesan + tanda tangan pengajuan itu (kontrak rute B129 tetap).
        let chooses = false
        if (isAddress(String(body.learner ?? ''))) {
          const acct = await accountFull(body.learner)
          const refused = roleRefusal(acct, 'publisher')
          if (refused) return send(res, 403, jsonBody({ error: refused }))
          chooses = !acct.dev && !acct.role
        }
        const out = await dbRequestMembership({ issuer: PAY_PAYEE, applicant: body.learner, note: body.note ?? null, message: body.message, signature: body.signature })
        if (!out.ok) return send(res, ({ auth: 401, conflict: 409 })[out.kind] ?? 400, jsonBody({ error: out.why, ...(out.request ? { request: out.request } : {}) }))
        const role = chooses ? await dbRecordRole({ address: body.learner, role: 'publisher', message: body.message, signature: body.signature }) : null
        return send(res, 201, jsonBody({ request: out.request, ...(role ? { role: 'publisher', chosenAt: role.chosen_at } : {}) }))
      }
      if (path === '/publisher/overview') {
        // B129: dasbor penerbit — hanya untuk pemegang kursi Penerbit (kunci penerbit atau anggota aktif).
        if (typeof body.message !== 'string' || !/^lencana-publisher nonce=[0-9a-f]{12,}$/.test(body.message)) {
          return send(res, 400, jsonBody({ error: 'message must be "lencana-publisher nonce=<hex>"' }))
        }
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'publisher' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        const refusedRole = roleRefusal(await accountCheap(body.learner), 'publisher')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        const seat = await publisherSeat(body.learner)
        if (!seat) return send(res, 403, jsonBody({ error: 'this account holds no publisher seat — apply for membership first' }))
        const manifests = MANIFESTS.filter((m) => !m.issuer.eoa || String(m.issuer.eoa).toLowerCase() === PAY_PAYEE.toLowerCase())
        const includeTest = body.includeTest === true
        const [records, platformBps, members, requests] = await Promise.all([
          dbPublisherRecords({ courseIds: manifests.map((m) => m.course.id), includeTest }),
          readPlatformBps(RPC_URL, PAY_SPLIT),
          dbMembersOf(PAY_PAYEE),
          dbPendingRequests(PAY_PAYEE),
        ])
        return send(res, 200, jsonBody(publisherOverview({
          issuer: { address: getAddress(PAY_PAYEE), slug: MANIFESTS[0]?.issuer.slug ?? null, name: MANIFESTS[0]?.issuer.name ?? null },
          seat: { via: seat.via, canHire: seat.canHire, canAppoint: seat.canAppoint, canAuthor: seat.canAuthor === true, canPublish: seat.canPublish === true, since: seat.since },
          manifests, priceOf, records, platformBps, members, pending: requests.length, requests, includeTest, split: PAY_SPLIT ? getAddress(PAY_SPLIT) : null, courseMeta: dbCourseMeta,
          token: { address: PAY_TOKEN ? getAddress(PAY_TOKEN) : null, symbol: PAY_TOKEN_SYMBOL, decimals: PAY_TOKEN_DECIMALS },
        })))
      }
      if (path === '/publisher/drafts' || path === '/publisher/drafts/save' || path === '/publisher/drafts/submit'
        || path === '/publisher/drafts/fork' || path === '/publisher/drafts/delete' || path === '/publisher/drafts/decide' || path === '/publisher/courses/archive') {
        // B133 (D67): menyusun kursus — hanya kursi Penerbit dengan hak susun (kunci penerbit, atau anggota dengan author=1).
        // B140 (D72): menerbitkan/menolak draf dan mengarsipkan kursus juga dari dasbor, oleh anggota publish=1 — server
        // menandatangani keputusan itu dengan kunci penerbit dan mencatat pesan + tanda tangan anggota yang meminta. CLI
        // `npm run course:publish` tetap jalan untuk pemegang kunci penerbit.
        if (!PAY_PAYEE) return send(res, 503, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher to author for' }))
        if (!isAddress(String(body.learner ?? ''))) return send(res, 400, jsonBody({ error: 'learner must be the address of the account that signs' }))
        const refusedRole = roleRefusal(await accountCheap(body.learner), 'publisher')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        const seat = await publisherSeat(body.learner)
        if (!seat) return send(res, 403, jsonBody({ error: 'this account holds no publisher seat' }))
        const me = getAddress(String(body.learner).toLowerCase())
        if (path === '/publisher/drafts') {
          if (typeof body.message !== 'string' || !/^lencana-drafts nonce=[0-9a-f]{12,}$/.test(body.message)) {
            return send(res, 400, jsonBody({ error: 'message must be "lencana-drafts nonce=<hex>"' }))
          }
          const auth = await dbAuthorize({ learner: me, message: body.message, signature: body.signature, scope: 'drafts' })
          if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
          const rows = await dbDraftsOf(PAY_PAYEE, { includeTest: body.includeTest === true })
          // Kunci kuis hanya untuk penyusun drafnya sendiri; anggota lain melihat isi publiknya saja.
          return send(res, 200, jsonBody({
            canAuthor: seat.canAuthor === true, canPublish: seat.canPublish === true, institution: seat.name ?? null, me,
            drafts: rows.map((r) => projectDraft(r, { withKeys: String(r.author).toLowerCase() === me.toLowerCase() })),
            actions: (await dbCourseActionsOf(PAY_PAYEE, { includeTest: body.includeTest === true, limit: 50 })).map((a) => ({
              id: Number(a.id), courseId: a.course_id, draftId: a.draft_id == null ? null : Number(a.draft_id), action: a.action,
              requestedBy: a.requested_by ?? null, note: a.note ?? null, at: a.created_at,
            })),
          }))
        }
        if (path === '/publisher/drafts/decide' || path === '/publisher/courses/archive') {
          if (!seat.canPublish) return send(res, 403, jsonBody({ error: 'this membership does not include publish=1 (deciding drafts, archiving courses)' }))
          const issuerKey = process.env.ISSUER_PRIVATE_KEY
          const issuerAcct = issuerKey ? privateKeyToAccount(issuerKey) : null
          if (!issuerAcct || issuerAcct.address.toLowerCase() !== PAY_PAYEE.toLowerCase()) {
            return send(res, 503, jsonBody({ error: 'the publisher key is not on this server — decide with `npm run course:publish` on the machine that holds it' }))
          }
          const nonce = randomBytes(10).toString('hex')
          const status = (out) => ({ auth: 401, forbidden: 403, missing: 404, conflict: 409, unprocessable: 422 })[out.kind] ?? 400
          if (path === '/publisher/drafts/decide') {
            const draftId = Number(body.draftId)
            const decision = body.decision
            if (!Number.isInteger(draftId) || draftId <= 0 || (decision !== 'publish' && decision !== 'reject')) {
              return send(res, 400, jsonBody({ error: 'draftId must be a positive integer and decision publish or reject' }))
            }
            const reqWant = `lencana-course-request decide draft=${draftId} decision=${decision}`
            if (typeof body.message !== 'string' || !new RegExp(`^${reqWant} nonce=[0-9a-f]{12,}$`).test(body.message)) {
              return send(res, 400, jsonBody({ error: `message must be "${reqWant} nonce=<hex>"` }))
            }
            const auth = await dbAuthorize({ learner: me, message: body.message, signature: body.signature, scope: 'course-request' })
            if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
            const row = await dbDraftById(draftId)
            if (!row || String(row.issuer).toLowerCase() !== PAY_PAYEE.toLowerCase()) return send(res, 404, jsonBody({ error: 'no such draft for this publisher' }))
            // Empat mata: penyusun tidak memutuskan drafnya sendiri dari dasbor. Pemegang kunci penerbit tetap bisa (CLI, atau kursi issuer).
            if (seat.via !== 'issuer' && String(row.author).toLowerCase() === me.toLowerCase()) {
              return send(res, 403, jsonBody({ error: 'the author of a draft cannot decide it from the dashboard — another member with publish=1 (or the publisher key) decides' }))
            }
            if (row.status !== 'submitted') return send(res, 409, jsonBody({ error: `only a submitted draft can be decided (this one is ${row.status})` }))
            const base = row.supersedes ? await dbDraftById(row.supersedes) : null
            let plan = null
            let issuerMessage
            if (decision === 'publish') {
              plan = await publishPlan(row, { base })
              if (plan.problems.length) return send(res, 422, jsonBody({ error: 'the stored draft does not pass the audit any more — not published', problems: plan.problems.slice(0, 12) }))
              issuerMessage = `lencana-course publish draft=${draftId} course=${row.course_id} rubric=${plan.rubricHash}${base ? ` supersedes=${Number(base.id)}` : ''} nonce=${nonce}`
            } else {
              issuerMessage = `lencana-course reject draft=${draftId} nonce=${nonce}`
            }
            const out = await dbDecideDraft({
              draftId, issuer: issuerAcct.address, decision, rubricHash: plan?.rubricHash ?? null, manifestHash: plan?.manifestHash ?? null, publishedAt: plan?.publishedAt ?? null,
              note: typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null,
              message: issuerMessage, signature: await issuerAcct.signMessage({ message: issuerMessage }),
              requestedBy: me, requestMessage: body.message, requestSignature: body.signature,
            })
            if (!out.ok) return send(res, status(out), jsonBody({ error: out.why }))
            if (decision === 'publish') await refreshCatalog({ force: true }).catch(() => {})
            return send(res, 200, jsonBody({ draft: projectDraft(out.draft), replaced: out.replaced ?? null, issuerMessage }))
          }
          const courseId = String(body.courseId ?? '')
          const on = body.archived === true
          if (!/^[a-z0-9][a-z0-9-]{2,47}$/.test(courseId)) return send(res, 400, jsonBody({ error: 'courseId must be a course id' }))
          const reqWant = `lencana-course-request archive course=${courseId} on=${on ? 1 : 0}`
          if (typeof body.message !== 'string' || !new RegExp(`^${reqWant} nonce=[0-9a-f]{12,}$`).test(body.message)) {
            return send(res, 400, jsonBody({ error: `message must be "${reqWant} nonce=<hex>"` }))
          }
          const auth = await dbAuthorize({ learner: me, message: body.message, signature: body.signature, scope: 'course-request' })
          if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
          const issuerMessage = `lencana-course archive course=${courseId} on=${on ? 1 : 0} nonce=${nonce}`
          const out = await dbArchiveCourse({
            issuer: issuerAcct.address, courseId, archived: on, message: issuerMessage, signature: await issuerAcct.signMessage({ message: issuerMessage }),
            requestedBy: me, requestMessage: body.message, requestSignature: body.signature,
          })
          if (!out.ok) return send(res, status(out), jsonBody({ error: out.why }))
          await refreshCatalog({ force: true }).catch(() => {})
          return send(res, 200, jsonBody({ courseId: out.courseId, draftId: out.draftId, archivedAt: out.archivedAt, issuerMessage }))
        }
        if (!seat.canAuthor) return send(res, 403, jsonBody({ error: 'this membership does not include author=1 (authoring courses)' }))
        if (path === '/publisher/drafts/fork') {
          // Sunting = versi baru: isi + kunci + harga versi terbit disalin SERVER (kunci kuis tidak pernah dikirim ke halaman).
          const courseId = String(body.courseId ?? '')
          const base = /^[a-z0-9][a-z0-9-]{2,47}$/.test(courseId) ? await dbPublishedRowOf(PAY_PAYEE, courseId) : null
          if (!base) return send(res, 404, jsonBody({ error: `no published database course "${courseId}" — file courses are edited in code` }))
          const prep = await prepareDraft({ course: base.content, keys: base.answer_keys ?? {}, price: base.price_units ?? null }, { institution: seat.name ?? 'Penerbit', base })
          if (!prep.ok) return send(res, 400, jsonBody({ error: 'the published course no longer fits the editor schema', problems: prep.errors }))
          const out = await dbForkDraft({
            issuer: PAY_PAYEE, author: me, base, payload: prep.payload, contentHash: prep.contentHash, problems: prep.problems,
            message: body.message, signature: body.signature,
          })
          if (!out.ok) return send(res, ({ auth: 401, forbidden: 403, missing: 404, conflict: 409 })[out.kind] ?? 400, jsonBody({ error: out.why }))
          return send(res, 200, jsonBody({ draft: projectDraft(out.draft, { withKeys: true }) }))
        }
        if (path === '/publisher/drafts/delete') {
          const out = await dbDeleteDraft({ draftId: Number(body.draftId), author: me, message: body.message, signature: body.signature })
          if (!out.ok) return send(res, ({ auth: 401, forbidden: 403, missing: 404, conflict: 409 })[out.kind] ?? 400, jsonBody({ error: out.why }))
          return send(res, 200, jsonBody({ deleted: out.deleted, courseId: out.courseId }))
        }
        if (path === '/publisher/drafts/save') {
          const draftId = body.draftId == null ? null : Number(body.draftId)
          if (draftId !== null && (!Number.isInteger(draftId) || draftId <= 0)) return send(res, 400, jsonBody({ error: 'draftId must be a positive integer or null' }))
          // B140: suntingan versi baru diaudit terhadap versi terbit yang digantikannya (aturan nilai tetap → id sama; berubah → id baru).
          const existing = draftId ? await dbDraftById(draftId) : null
          const base = existing?.supersedes ? await dbDraftById(existing.supersedes) : null
          const prep = await prepareDraft(body.payload, { institution: seat.name ?? 'Penerbit', exceptDraftId: draftId, base })
          if (!prep.ok) return send(res, 400, jsonBody({ error: 'the draft does not fit the editor schema', problems: prep.errors }))
          const out = await dbSaveDraft({
            draftId, issuer: PAY_PAYEE, author: me, payload: prep.payload, contentHash: prep.contentHash, problems: prep.problems,
            message: body.message, signature: body.signature,
          })
          if (!out.ok) return send(res, ({ auth: 401, forbidden: 403, missing: 404, conflict: 409 })[out.kind] ?? 400, jsonBody({ error: out.why, contentHash: prep.contentHash }))
          return send(res, 200, jsonBody({ draft: projectDraft(out.draft, { withKeys: true }) }))
        }
        const out = await dbSubmitDraft({ draftId: Number(body.draftId), author: me, message: body.message, signature: body.signature })
        if (!out.ok) return send(res, ({ auth: 401, forbidden: 403, missing: 404, conflict: 409, unprocessable: 422 })[out.kind] ?? 400, jsonBody({ error: out.why }))
        return send(res, 200, jsonBody({ draft: projectDraft(out.draft, { withKeys: true }) }))
      }
      if (path === '/owner/overview' || path === '/owner/gas' || path === '/owner/agents/claim') {
        // B130: kursi Agent Owner — dibaca dari ownerOf di registry ERC-8004, bukan dari tabel.
        const isGas = path === '/owner/gas'
        const isClaim = path === '/owner/agents/claim'
        // Bentuk dulu, baru dipakai di pola pesan — kiriman tidak boleh menjadi bagian regex sebelum terbukti angka/hash.
        if (isClaim && (!/^\d{1,12}$/.test(String(body.agentId ?? '')) || !/^0x[0-9a-fA-F]{64}$/.test(String(body.registerTx ?? '')))) {
          return send(res, 400, jsonBody({ error: 'agentId must be a number and registerTx a transaction hash' }))
        }
        const want = isGas
          ? 'lencana-owner-gas'
          : isClaim ? `lencana-owner-claim agent=${String(body.agentId ?? '')} tx=${String(body.registerTx ?? '').toLowerCase()}` : 'lencana-owner'
        if (typeof body.message !== 'string' || !new RegExp(`^${want} nonce=[0-9a-f]{12,}$`).test(body.message)) {
          return send(res, 400, jsonBody({ error: `message must be "${want} nonce=<hex>"` }))
        }
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: isGas ? 'owner-gas' : isClaim ? 'owner-claim' : 'owner' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        if (!AGENTS_READY) return send(res, 503, jsonBody({ error: 'agent identities are not configured on this server', missing: dbMissingReason() }))
        const addr = getAddress(String(body.learner).toLowerCase())
        const refusedRole = roleRefusal(await accountCheap(addr), 'owner')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        if (isGas) {
          if (!process.env.DEPLOYER_PRIVATE_KEY) return send(res, 503, jsonBody({ error: 'gas drip is not configured on this server' }))
          // Hanya pemilik agen yang DICETAK platform (ownerOf sekarang = alamat ini), dan hanya bila saldonya menipis.
          // B132: juga akun yang memilih peran Agent Owner (atau akun dev) dan belum memiliki agen apa pun — gas untuk mendaftarkan
          // agennya sendiri (register + setAgentURI + tarif dari dompetnya).
          const mine = await ownedAgentFacts(AGENTS_CFG, addr, await dbPlatformAgentIds())
          if (!mine.length) {
            const acct = await accountFull(addr)
            const startsOwn = (acct.dev || (acct.role === 'owner' && acct.via === 'chosen'))
              && !(await ownedAgentFacts(AGENTS_CFG, addr, [...MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean), ...await dbKnownAgentIds()])).length
            if (!startsOwn) return send(res, 403, jsonBody({ error: 'gas is only sent to owners of agents the platform minted, or to an Agent Owner account registering its first agent' }))
          }
          const before = await nativeBalance(RPC_URL, addr)
          if (before >= GAS_LOW) return send(res, 409, jsonBody({ error: 'balance is still enough for an owner transaction', balance: String(before) }))
          // B155: peran Agent Owner dipilih dengan tanda tangan alamat itu sendiri — batas per IP + kuota harian menjaga saldo deployer.
          const slot = LIMITS.gas.take(clientIp(req))
          if (!slot.ok) return send(res, 429, jsonBody({ error: `gas drip ${slot.reason}`, retryAt: slot.retryAt }))
          try {
            const sent = await sendGasDrip({ rpcUrl: RPC_URL, pk: process.env.DEPLOYER_PRIVATE_KEY, to: addr, value: GAS_DRIP })
            return send(res, 200, jsonBody({ tx: sent.tx, sent: String(GAS_DRIP), balance: String(sent.balance) }))
          } catch (err) {
            slot.release()
            return send(res, 502, jsonBody({ error: `gas drip failed: ${String(err.message ?? err).split('\n')[0].slice(0, 160)}` }))
          }
        }
        if (isClaim) {
          // B132: agen yang didaftarkan pemiliknya sendiri (`register()` dari dompet akun ini) dikenal platform hanya sesudah
          // struknya dibaca dari chain. Pesan mengikat agentId + transaksi.
          const registry = ERC8004[AGENTS_CFG.chainId]?.identity
          const v = await verifySelfRegistration({ rpcUrl: RPC_URL, registry, agentId: body.agentId, txHash: body.registerTx, owner: addr })
          if (!v.ok) return send(res, v.status, jsonBody({ error: v.why }))
          if ((await dbPlatformAgents([v.agentId])).length) return send(res, 409, jsonBody({ error: 'this agent is already known to the platform' }))
          await dbRecordPlatformAgent({ agentId: v.agentId, registry, role: 'grader-self', mintedBy: addr, registerTx: v.registerTx })
          invalidateMarket()
          return send(res, 201, jsonBody({ agentId: v.agentId, registerTx: v.registerTx, block: v.block }))
        }
        const ids = [...MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean), ...await dbKnownAgentIds()]
        const owned = await ownedAgentFacts(AGENTS_CFG, addr, ids)
        if (!owned.length) return send(res, 403, jsonBody({ error: 'this account owns no ERC-8004 agent known to the platform' }))
        const agentIds = owned.map((o) => o.agent.agentId)
        const [records, minted, balance, brains] = await Promise.all([dbOwnerRecords(agentIds), dbPlatformAgents(agentIds), nativeBalance(RPC_URL, addr).catch(() => 0n), dbAgentBrains(agentIds)])
        return send(res, 200, jsonBody(ownerOverview({
          address: addr, owned, records, minted, balance, brains, gasLow: balance < GAS_LOW, chainId: CHAIN_ID, publisher: PAY_PAYEE ?? null,
          token: { address: PAY_TOKEN ? getAddress(PAY_TOKEN) : null, symbol: PAY_TOKEN_SYMBOL, decimals: PAY_TOKEN_DECIMALS },
        })))
      }
      if (path === '/owner/agents/brain' || path === '/owner/agents/queue') {
        // B135 (D69): otak agen semi-otomatis. Bentuk pesan diperiksa SEBELUM nonce dipakai; API key tidak pernah ada di
        // kiriman — yang datang hanya nama provider/model dan angka kalibrasi yang ditandatangani pemilik.
        const isBrain = path === '/owner/agents/brain'
        const parsed = isBrain ? parseBrainMessage(body.message) : null
        const queueOf = isBrain ? null : QUEUE_RE.exec(String(body.message ?? ''))
        if (isBrain ? !parsed : !queueOf) return send(res, 400, jsonBody({ error: isBrain ? BRAIN_HINT : QUEUE_HINT }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: isBrain ? 'owner-brain' : 'agent-queue' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        if (!AGENTS_READY) return send(res, 503, jsonBody({ error: 'agent identities are not configured on this server', missing: dbMissingReason() }))
        const addr = getAddress(String(body.learner).toLowerCase())
        const refusedRole = roleRefusal(await accountCheap(addr), 'owner')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        const out = isBrain
          ? await recordBrain(AGENTS_CFG, { owner: addr, parsed, message: body.message, signature: body.signature })
          : await agentQueue(AGENTS_CFG, { agentId: queueOf[1], signer: addr, essayOf: essayLesson })
        if (!out.ok) return send(res, out.status, jsonBody({ error: out.why, ...(out.reasons ? { reasons: out.reasons } : {}) }))
        if (isBrain) invalidateMarket()
        return send(res, out.status, jsonBody(isBrain ? out.brain : out.queue))
      }
      if (path === '/owner/agents/review-queue') {
        // B144: meja pengesahan — dompet agen pengesah membaca esai berusulan dari kursus tempat ia ditunjuk. Urutan pemeriksaan
        // sama dengan antrean penilai: bentuk pesan sebelum nonce, tanda tangan, kursi Agent Owner, lalu penanda tangan = agentWallet.
        const asked = REVIEW_QUEUE_RE.exec(String(body.message ?? ''))
        if (!asked) return send(res, 400, jsonBody({ error: REVIEW_QUEUE_HINT }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'agent-review-queue' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        if (!AGENTS_READY) return send(res, 503, jsonBody({ error: 'agent identities are not configured on this server', missing: dbMissingReason() }))
        const addr = getAddress(String(body.learner).toLowerCase())
        const refusedRole = roleRefusal(await accountCheap(addr), 'owner')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        const perCourse = Math.min(100, Math.max(1, Math.round(Number(body.limit) || 20)))
        const out = await reviewQueue(AGENTS_CFG, { agentId: asked[1], signer: addr, essayOf: essayLesson, perCourse, includeTest: body.includeTest === true })
        if (!out.ok) return send(res, out.status, jsonBody({ error: out.why }))
        return send(res, out.status, jsonBody(out.queue))
      }
      if (path === '/publisher/agents/hire' || path === '/publisher/reviewers') {
        // B129: aksi anggota dengan tanda tangannya sendiri. Kursi + wewenang diperiksa di sini; tanda tangan atas pesan yang
        // menyebut kursus + agen (+ dompet pengesah) diperiksa `hireAgent` / `addReviewer`, nonce sekali-pakai seperti jalur penerbit.
        if (!AGENTS_READY) return send(res, 503, jsonBody({ error: 'agent hiring is not configured on this server', missing: dbMissingReason() }))
        if (!isAddress(String(body.member ?? ''))) return send(res, 400, jsonBody({ error: 'member must be the address of the account that signs' }))
        const refusedRole = roleRefusal(await accountCheap(body.member), 'publisher')
        if (refusedRole) return send(res, 403, jsonBody({ error: refusedRole }))
        const seat = await publisherSeat(body.member)
        if (!seat) return send(res, 403, jsonBody({ error: 'this account holds no publisher seat' }))
        const isHire = path === '/publisher/agents/hire'
        if (isHire ? !seat.canHire : !seat.canAppoint) {
          return send(res, 403, jsonBody({ error: `this membership does not include ${isHire ? 'hire=1 (hiring grading agents)' : 'appoint=1 (appointing reviewer agents)'}` }))
        }
        const actor = getAddress(String(body.member).toLowerCase())
        if (isHire) {
          const h = await agentHireRoute(AGENTS_CFG, { course: body.course, agentId: body.agentId, message: body.message, signature: body.signature }, (c) => Boolean(manifestOf(c)), actor)
          const { ok, status, why, ...rest } = h
          if (ok) invalidateMarket()
          return send(res, ok ? 200 : status, jsonBody(ok ? rest : { error: why }))
        }
        if (!manifestOf(body.course)) return send(res, 400, jsonBody({ error: `course ${body.course} is not in the catalogue` }))
        const ag = await appointReviewerAgent(AGENTS_CFG, {
          course: body.course, agentId: body.agentId, reviewer: body.reviewer, issuer: PAY_PAYEE, message: body.message, signature: body.signature,
        }, actor)
        if (ag.ok) invalidateMarket()
        return ag.ok
          ? send(res, 200, jsonBody({ course: ag.courseId, reviewer: ag.reviewer, addedBy: ag.addedBy, agentId: ag.agentId, agentOwner: ag.agentOwner }))
          : send(res, ag.status, jsonBody({ error: ag.why }))
      }
      if (path === '/progress') {
        const out = await dbSetProgress({
          learner: body.learner, courseId: body.course, lessonId: body.lesson, to: body.status,
          position: body.position ?? 0, message: body.message, signature: body.signature,
        })
        if (out.ok) return send(res, 200, jsonBody({ lesson: out.enrollmentId, from: out.from, to: out.to, noop: out.noop === true }))
        // 401 khusus untuk "siapa kamu"; lompatan status yang ditolak adalah permintaan yang
        // sah dari orang yang benar - memberi keduanya kode yang sama membuat monitoring kita
        // membunyikan alarm otentikasi setiap kali peserta mengirim urutan yang salah.
        const authish = /tanda tangan|nonce|alamat/.test(out.why ?? '')
        return send(res, authish ? 401 : 422, jsonBody({ error: out.why, from: out.from, allowed: out.allowed }))
      }
      if (path === '/enroll') {
        // jumlah lesson dibaca dari katalog penerbit, bukan dipercaya dari pemanggil: kalau klien
        // boleh mengirim lessons_total, dia bisa membuat dirinya "selesai" dengan menulis 1
        const courseManifest = manifestOf(body.course)
        const lessonsTotal = courseManifest?.course?.modules?.reduce((n, m) => n + (m.lessons?.length ?? 0), 0) ?? 0
        if (!courseManifest) return send(res, 400, jsonBody({ error: `course ${body.course} is not in the catalogue`, known: Object.keys(MANIFESTS) }))
        // B140 (D72): kursus yang diarsipkan tidak menerima peserta BARU; yang sudah terdaftar tetap lewat (enroll idempoten).
        if (courseArchived(body.course) && !(await dbFindEnrollment(body.learner, body.course))) {
          return send(res, 409, jsonBody({ error: `course ${body.course} is archived — it takes no new learners`, archived: true }))
        }
        // B125: kursus berbayar — yang belum terdaftar membayar dulu. Yang sudah terdaftar (termasuk sebelum harga berlaku)
        // tetap lewat jalur biasa: enroll idempoten, tidak ada tagihan kedua.
        const price = PAYWALL ? priceOf(body.course) : null
        if (price !== null && !(await dbFindEnrollment(body.learner, body.course))) {
          return enrollPaidRoute(req, res, body, lessonsTotal, price)
        }
        const out = await dbEnroll({
          learner: body.learner, courseId: body.course, lessonsTotal,
          message: body.message, signature: body.signature,
        })
        return out.ok
          ? send(res, 200, jsonBody({ enrolled: true, created: out.created, enrollmentId: out.enrollment?.id, course: out.enrollment?.course_id }))
          : send(res, 401, jsonBody({ error: out.why }))
      }
      if (path === '/grade') {
        // KUIS DINILAI DI SINI. Klien mengirim PILIHAN, bukan angka; `body.score` sengaja tidak
        // dibaca sama sekali — dan kalau ada, kita tolak, supaya tidak ada yang mengira angka
        // kiriman browser pernah diterima lewat jalur ini (B72).
        if (body.score !== undefined) {
          return send(res, 400, jsonBody({ error: '/grade does not accept score: the server computes it from picks' }))
        }
        if (!body.lesson) return send(res, 400, jsonBody({ error: 'requires lesson (quiz slug)' }))
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'grade' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        const graded = gradeQuiz({ courseId: body.course, lessonSlug: body.lesson, picks: body.picks })
        if (!graded.ok) return send(res, 422, jsonBody({ error: graded.why }))
        const attemptNo = Number.isInteger(Number(body.attempt)) && Number(body.attempt) > 0
          ? Number(body.attempt)
          : await dbNextAttemptNo(body.learner, body.course, body.lesson, 'kuis')
        const stored = await dbStoreAttempt({
          learner: body.learner, courseId: body.course, lessonKey: body.lesson, kind: 'kuis',
          attemptNo, score: graded.score, verdict: graded.verdict, rubricHash: graded.rubricHash,
          components: graded.components, deductions: [],
        })
        if (!stored.ok) return send(res, 422, jsonBody({ error: stored.why }))
        // `attemptNo` + `rubricHash` ikut dijawab supaya klien bisa menghitung ulang
        // `attempt_hash` dari yang dikembalikan server saja — kalau tidak, "rekaman ini bisa
        // diaudit" hanya bisa dibuktikan oleh pihak yang sudah memegang secret key.
        return send(res, 201, jsonBody({
          attemptHash: stored.attemptHash, attemptId: stored.attempt?.id, attemptNo,
          lesson: body.lesson, kind: 'kuis', rubricHash: graded.rubricHash,
          score: graded.score, correct: graded.correct, total: graded.total,
          passPct: graded.passPct, verdict: graded.verdict, gradedBy: 'server',
          components: graded.components.length,
          // B80: umpan balik sesudah penyerahan — benar/salah + alasan per soal, tanpa indeks jawaban.
          // Halaman belajar menampilkan ini; kuncinya sendiri tidak pernah meninggalkan server.
          review: graded.review,
        }))
      }
      if (path === '/essay') {
        /**
         * Penyerahan esai (B81). Yang datang dari klien adalah TEKS; tidak ada angka, tidak ada
         * rubrik. `body.score`/`body.rubric`/`body.max` ditolak dengan nama, supaya tidak ada yang
         * mengira jalur ini pernah menerima nilai kiriman browser.
         *
         * Teks disimpan di `submissions`, dan TIDAK disajikan lewat rute mana pun yang bisa dibaca
         * publik — `results.js` menulis `essayTextIncluded: false` dan janji itu dijaga di sini:
         * antrean dibaca penerbit lewat CLI (`npm run grade:essay`) yang memegang secret key, bukan
         * lewat GET anonim. Sejak B135 (D69) ada satu pembaca lain, juga bertanda tangan: dompet agen yang
         * DISEWA kursus itu (`POST /owner/agents/queue`) — penyewaannya adalah izin penerbit agar agen menilai.
         * Sejak B144 satu lagi: dompet agen pengesah yang DITUNJUK kursus itu (`POST /owner/agents/review-queue`),
         * hanya untuk esai yang sudah berusulan — penunjukannya adalah izin penerbit agar agen mengesahkan nilai akhirnya.
         * Keduanya tanpa alamat peserta.
         */
        for (const banned of ['score', 'rubric', 'max', 'finalScore', 'verdict']) {
          if (body[banned] !== undefined) {
            return send(res, 400, jsonBody({ error: `/essay does not accept ${banned}: text only, the numbers belong to the publisher` }))
          }
        }
        if (!body.lesson) return send(res, 400, jsonBody({ error: 'requires lesson (essay slug)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const graded = await gradeAgainstRubric({ text: body.text, essay: found.lesson.essay })
        if (graded.verdict === 'NOT_AN_ESSAY_LESSON') return send(res, 400, jsonBody({ error: `lesson ${body.lesson} has no rubric` }))
        const state = graded.verdict === 'INSUFFICIENT_EVIDENCE' ? 'insufficient' : 'awaiting_judge'
        const out = await dbSubmitEssay({
          learner: body.learner, courseId: body.course, lessonKey: body.lesson, text: body.text,
          words: graded.words, mechanical: graded.mechanical, state,
          rubricHash: rubricHashOf(found.manifest), message: body.message, signature: body.signature,
        })
        if (!out.ok) {
          // "siapa kamu" (401) dan "permintaanmu tidak sah" (422) dipisah, seperti di /progress.
          // Yang berubah di sini: keputusannya lewat KODE (`out.kind`), bukan lewat membaca pesan
          // error dengan regex. Versi pertama saya menyandikan `penerbit` di kedua macam sebab, dan
          // hasilnya validasi "kriteria asing" dilaporkan sebagai kegagalan otentikasi — merah yang
          // menyalahkan pihak yang benar, persis kelas yang kita catat di B59/`serve-probe`.
          return send(res, out.kind === 'auth' ? 401 : 422, jsonBody({ error: out.why }))
        }
        return send(res, 201, jsonBody({
          attemptHash: out.attemptHash, attemptId: out.attemptId, attemptNo: out.attemptNo,
          state: out.state, words: out.words, score: null, verdict: 'incomplete',
          mechanicalPassed: (graded.mechanical ?? []).filter((m) => m.ok).length,
          mechanicalTotal: (graded.mechanical ?? []).length,
          note: graded.note ?? 'Menunggu penilaian penerbit — belum ada angka, dan itu bukan nol.',
        }))
      }

      if (path === '/essay/judgement' && body.agentId !== undefined) {
        // B119 (D54): penilaian oleh AGEN sewaan, ditandatangani dompet agen di registry ERC-8004 —
        // bukan oleh penerbit. Agen harus disewa untuk kursus ini; label tingkat berat ia pilih sendiri
        // di pesan yang ia tandatangani, dan aktivitasnya langsung jadi tagihan.
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (the rubric is read from the publisher manifest)' }))
        if (!Number.isInteger(Number(body.attemptId))) return send(res, 400, jsonBody({ error: 'requires attemptId' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const out = await agentJudge(AGENTS_CFG, body, found)
        if (!out.ok) return send(res, out.status, jsonBody({ error: out.why }))
        return send(res, 200, jsonBody({
          attemptId: out.attemptId, attemptHash: out.attemptHash, replacedHash: out.replacedHash, score: out.score, verdict: out.verdict,
          components: out.components, gradedBy: 'agent', agentId: out.agentId, label: out.label, needsReview: true, charge: out.charge,
        }))
      }
      if (path === '/essay/judgement') {
        /**
         * Penilaian oleh penerbit, atas nama EOA-nya sendiri (B81). Bukan peserta, dan bukan kami:
         * `dbJudgeEssay` menuntut tanda tangan EIP-191 atas nonce yang beralamat sama dengan
         * `ISSUER_ADDRESS` konfigurasi. Kenapa perbandingan alamat dan bukan `isIssuer()` di chain:
         * `isIssuer` sudah dituntut `issue.js` SEBELUM attestation bergerak, jadi penerbit yang tidak
         * terdaftar boleh menilai tapi tidak akan pernah bisa menerbitkan — dan rute ini tidak perlu
         * memegang klien chain untuk menolak angka yang salah.
         */
        if (!PAY_PAYEE) {
          return send(res, 500, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher address to require' }))
        }
        // Perbandingan sama seperti penjaga pembayaran di `checkPayment`: huruf kecil, tanpa checksum.
        if (String(body.issuer ?? '').toLowerCase() !== PAY_PAYEE.toLowerCase()) {
          return send(res, 401, jsonBody({ error: `judgements must be signed by the configured publisher (${PAY_PAYEE})` }))
        }
        if (!Number.isInteger(Number(body.attemptId))) return send(res, 400, jsonBody({ error: 'requires attemptId' }))
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (the rubric is read from the publisher manifest)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const out = await dbJudgeEssay({
          attemptId: body.attemptId, issuer: body.issuer, message: body.message, signature: body.signature,
          scores: body.scores, essay: found.lesson.essay, passMark: found.manifest.course.passMark,
          judgeModel: body.judgeModel ?? null, judgeTemp: body.judgeTemp ?? null,
        })
        if (!out.ok) {
          // Kode (`out.kind`) yang memutuskan; regex di bawah hanya jaring cadangan dan sengaja tidak
          // lagi memuat kata "penerbit" — kata itu muncul di pesan VALIDASI ("rubrik penerbit"), jadi
          // memakainya membuat kriteria asing dilaporkan sebagai kegagalan otentikasi (401).
          const authish = /tanda tangan|penandatangan/.test(out.why ?? '')
          return send(res, out.kind === 'auth' || authish ? 401 : 422, jsonBody({ error: out.why }))
        }
        return send(res, 200, jsonBody({
          attemptId: out.attemptId, attemptHash: out.attemptHash, replacedHash: out.replacedHash,
          score: out.score, verdict: out.verdict, components: out.components,
          gradedBy: body.judgeModel ? 'model' : 'human',
          // B104: angka model belum dihitung gerbang sampai reviewer mengesahkannya.
          needsReview: out.needsReview === true,
        }))
      }

      // Pengesahan manusia (B104). Dua rute, dua kunci berbeda: penerbit MENUNJUK reviewer,
      // reviewer MENGESAHKAN usulan model. Kode status lewat `out.kind`, bukan lewat membaca pesan.
      const reviewStatus = (out) => ({ auth: 401, role: 403, conflict: 409 })[out.kind] ?? 422
      if (path === '/essay/reviewers') {
        if (!PAY_PAYEE) return send(res, 500, jsonBody({ error: 'ISSUER_ADDRESS not set — there is no publisher address to require' }))
        if (String(body.issuer ?? '').toLowerCase() !== PAY_PAYEE.toLowerCase()) {
          return send(res, 401, jsonBody({ error: `reviewers are appointed by the configured publisher (${PAY_PAYEE})` }))
        }
        if (!manifestOf(body.course)) return send(res, 400, jsonBody({ error: `course ${body.course} is not in the catalogue`, known: Object.keys(MANIFESTS) }))
        if (body.agentId !== undefined) {
          // B120: reviewer agen ERC-8004 — dompet, pemilik, dan tarifnya dibaca dari registry.
          const ag = await appointReviewerAgent(AGENTS_CFG, body)
          if (ag.ok) invalidateMarket()
          return ag.ok
            ? send(res, 200, jsonBody({ course: ag.courseId, reviewer: ag.reviewer, addedBy: ag.addedBy, agentId: ag.agentId, agentOwner: ag.agentOwner }))
            : send(res, ag.status, jsonBody({ error: ag.why }))
        }
        const out = await dbAddReviewer({
          courseId: body.course, reviewer: body.reviewer, issuer: body.issuer, message: body.message, signature: body.signature,
        })
        return out.ok
          ? send(res, 200, jsonBody({ course: out.courseId, reviewer: out.reviewer, addedBy: out.addedBy }))
          : send(res, reviewStatus(out), jsonBody({ error: out.why }))
      }
      if (path === '/essay/review') {
        if (!Number.isInteger(Number(body.attemptId))) return send(res, 400, jsonBody({ error: 'requires attemptId' }))
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (the rubric is read from the publisher manifest)' }))
        const found = essayLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        const out = await dbReviewEssay({
          attemptId: body.attemptId, courseId: String(body.course), lessonKey: String(body.lesson),
          reviewer: body.reviewer, decision: body.decision, scores: body.scores,
          essay: found.lesson.essay, passMark: found.manifest.course.passMark, message: body.message, signature: body.signature,
        })
        if (!out.ok) return send(res, reviewStatus(out), jsonBody({ error: out.why }))
        // B120: pengesahan oleh reviewer agen juga satu aktivitas penilaian — ditagih seperti penilaian.
        const charge = await chargeReview(AGENTS_CFG, out)
        return send(res, 200, jsonBody({
          attemptId: out.attemptId, decision: out.decision, proposed: out.proposed, finalScore: out.finalScore,
          verdict: out.verdict, attemptHash: out.attemptHash, replacedHash: out.replacedHash,
          reviewer: out.reviewer, judgeModel: out.judgeModel,
          reviewerAgentId: out.reviewerAgent?.agentId ?? null, label: out.label ?? null, charge,
        }))
      }

      if (path === '/auth/privy') {
        // B82 (D57): ikatan alamat peserta ↔ akun login Privy. Tidak memberi sesi apa pun — tulisan atas
        // nama peserta tetap butuh tanda tangan dompetnya per permintaan (`authorizeLearner`).
        if (!privyConfigured()) return send(res, 503, jsonBody({ error: 'Privy login is not configured on this server (PRIVY_APP_ID / PRIVY_APP_SECRET)' }))
        const out = await linkPrivyLearner({ learner: body.learner, accessToken: body.accessToken })
        return out.ok
          ? send(res, 200, jsonBody({ learner: out.learner, linked: true, created: out.created, provider: 'privy' }))
          : send(res, out.status, jsonBody({ error: out.why }))
      }

      if (path === '/praktik') {
        /**
         * Praktik (B121). Peserta mengirim apa yang ia kerjakan/baca di chain, BUKAN angka; server
         * membaca ulang chain 97 (`src/praktik.js`) dan menyimpan usaha hanya kalau semua cocok.
         * Urutan: tanda tangan peserta → enrollment → baca chain → klaim kunci bukti → simpan usaha →
         * ikat bukti. Kunci yang sudah dipakai (transaksi/dompet yang sama) = 409, tanpa usaha baru.
         */
        for (const banned of ['score', 'verdict', 'components', 'rubricHash']) {
          if (body[banned] !== undefined) {
            return send(res, 400, jsonBody({ error: `/praktik does not accept ${banned}: send what you did on chain, the server checks it` }))
          }
        }
        if (!body.course || !body.lesson) return send(res, 400, jsonBody({ error: 'requires course + lesson (practice slug)' }))
        const found = praktikLesson(body.course, body.lesson)
        if (found.error) return send(res, 400, jsonBody({ error: found.error }))
        if (typeof body.message !== 'string' || !body.message.includes(`lesson=${body.lesson}`)) {
          return send(res, 401, jsonBody({ error: `signed message must state lesson=${body.lesson}` }))
        }
        const auth = await dbAuthorize({ learner: body.learner, message: body.message, signature: body.signature, scope: 'praktik' })
        if (!auth.ok) return send(res, 401, jsonBody({ error: auth.why }))
        if (!(await dbFindEnrollment(body.learner, body.course))) {
          return send(res, 422, jsonBody({ error: 'learner not enrolled in this course — no row to attach the practice attempt to' }))
        }
        const checked = await checkPraktik({
          rpcUrl: RPC_URL, courseId: body.course, lessonSlug: body.lesson, learner: body.learner,
          answers: body.answers, walletSignature: body.walletSignature,
        })
        if (!checked.ok) return send(res, checked.status, jsonBody({ error: checked.why, failed: checked.failed }))
        const claim = await dbClaimPraktikProof({ courseId: body.course, lessonKey: body.lesson, learner: body.learner, proof: checked.proof })
        if (!claim.ok) return send(res, claim.kind === 'used' ? 409 : 500, jsonBody({ error: claim.why }))
        let stored
        try {
          const attemptNo = await dbNextAttemptNo(body.learner, body.course, body.lesson, 'praktik')
          stored = await dbStoreAttempt({
            learner: body.learner, courseId: body.course, lessonKey: body.lesson, kind: 'praktik',
            attemptNo, score: 100, verdict: 'pass', rubricHash: rubricHashOf(found.manifest), deductions: [],
            components: checked.checks.map((c) => ({ itemId: c.id, score: 100, weight: 1, gradedBy: 'chain' })),
          })
        } catch (e) {
          // klaim yang belum terikat dilepas, supaya kegagalan DB tidak memakan bukti peserta
          await dbReleasePraktikProof(claim.id)
          throw e
        }
        if (!stored.ok) {
          await dbReleasePraktikProof(claim.id)
          return send(res, 422, jsonBody({ error: stored.why }))
        }
        const attemptNo = stored.attempt?.attempt_no
        await dbAttachPraktikProof(claim.id, stored.attempt?.id)
        return send(res, 201, jsonBody({
          attemptHash: stored.attemptHash, attemptId: stored.attempt?.id, attemptNo, lesson: body.lesson, kind: 'praktik',
          rubricHash: rubricHashOf(found.manifest), score: 100, verdict: 'pass', gradedBy: 'chain',
          proofType: checked.proof.type, proofKey: checked.proof.key, blockNumber: checked.proof.blockNumber,
          checks: checked.checks.map((c) => c.id),
        }))
      }

      const out = await dbRecordAttempt({
        learner: body.learner, courseId: body.course, lessonKey: body.lesson ?? '-', kind: body.kind,
        attemptNo: body.attempt ?? 1, score: body.score, verdict: body.verdict,
        rubricHash: body.rubricHash, judgeModel: body.judgeModel, judgeTemp: body.judgeTemp,
        deductions: body.deductions, components: body.components,
        message: body.message, signature: body.signature,
      })
      return out.ok
        ? send(res, 201, jsonBody({ attemptHash: out.attemptHash, attemptId: out.attempt?.id, score: out.attempt?.score, verdict: out.attempt?.verdict }))
        : send(res, out.kind === 'refused' ? 400 : 401, jsonBody({ error: out.why }))
    }
    // Agen sewaan (B119, D54): tabel harga, sewa oleh penerbit, dan tagihan per aktivitas penilaian.
    if (path.startsWith('/agents/') || path.startsWith('/agent-charges/')) {
      if (!AGENTS_READY) return send(res, 503, jsonBody({ error: 'agent hiring is not configured on this server', missing: dbMissingReason() }))
      // B138 (D70): bursa agen — baca saja, tanpa tanda tangan (fakta registry publik + angka gabungan, tanpa data peserta).
      if (path === '/agents/market') {
        if (req.method !== 'GET') return send(res, 405, jsonBody({ error: 'GET required', path }))
        const ids = [...MANIFESTS.map((m) => m.issuer.agent?.agentId).filter(Boolean), ...await dbKnownAgentIds()]
        return send(res, 200, jsonBody(await agentMarket(AGENTS_CFG, ids, {
          chainId: CHAIN_ID, token: { address: PAY_TOKEN ? getAddress(PAY_TOKEN) : null, symbol: PAY_TOKEN_SYMBOL, decimals: PAY_TOKEN_DECIMALS },
        })))
      }
      // B132: templat berkas registrasi agen (menunjuk balik ke agen ini, kalimat peran yang benar). Halaman menambahkan nama +
      // rupa robot lalu pemilik mengirim `setAgentURI` dari dompetnya sendiri — server tidak menulis apa pun ke chain di sini.
      const tplMatch = /^\/agents\/(\d+)\/registration-template$/.exec(path)
      if (tplMatch && req.method === 'GET') {
        const role = new URL(req.url, BASE_URL).searchParams.get('role') ?? 'grader-account'
        if (!['grader-account', 'grader-self'].includes(role)) return send(res, 400, jsonBody({ error: 'role must be grader-account or grader-self' }))
        const registry = ERC8004[AGENTS_CFG.chainId]?.identity
        if (!registry) return send(res, 503, jsonBody({ error: `no ERC-8004 registry known for chain ${AGENTS_CFG.chainId}` }))
        return send(res, 200, jsonBody(registrationFile({ chainId: AGENTS_CFG.chainId, registry, agentId: tplMatch[1], role })))
      }
      const ratesMatch = /^\/agents\/(\d+)\/rates$/.exec(path)
      if (ratesMatch && req.method === 'GET') {
        const r = await agentRates(AGENTS_CFG, ratesMatch[1])
        const { ok, status, why, ...rest } = r
        return send(res, ok ? 200 : status, jsonBody(ok ? rest : { error: why }))
      }
      if (path === '/agents/hire') {
        if (req.method !== 'POST') return send(res, 405, jsonBody({ error: 'POST required', path }))
        const body = await readJsonBody(req)
        const h = await agentHireRoute(AGENTS_CFG, body, (c) => Boolean(manifestOf(c)))
        const { ok, status, why, ...rest } = h
        if (ok) invalidateMarket()
        return send(res, ok ? 200 : status, jsonBody(ok ? rest : { error: why }))
      }
      const chargeMatch = /^\/agent-charges\/(\d+)(\/pay)?$/.exec(path)
      if (chargeMatch && !chargeMatch[2] && req.method === 'GET') {
        const c = await getAgentCharge(chargeMatch[1])
        return c ? send(res, 200, jsonBody(c)) : send(res, 404, jsonBody({ error: 'no such agent charge', path }))
      }
      if (chargeMatch && chargeMatch[2]) {
        if (req.method !== 'POST') return send(res, 405, jsonBody({ error: 'POST required', path }))
        const c = await getAgentCharge(chargeMatch[1])
        if (!c) return send(res, 404, jsonBody({ error: 'no such agent charge', path }))
        const terms = () => [paymentRequirements({
          tokenAddress: c.token, payTo: PAY_SPLIT, amount: BigInt(c.amount), chainId: CHAIN_ID,
          resource: `${BASE_URL}/agent-charges/${c.id}/pay`, maxTimeoutSeconds: TIMEOUT_SECONDS,
        })]
        const header = req.headers['x-payment']
        if (!header) return send(res, 402, jsonBody({ x402Version: 1, error: 'X-PAYMENT header is required', accepts: terms(), charge: c }), 'application/json', { 'www-authenticate': 'X-PAYMENT realm="x402", error="insufficient_payment"' })
        const payment = decodePaymentHeader(header)
        if (!payment) return send(res, 402, jsonBody({ x402Version: 1, error: 'X-PAYMENT is not valid base64(JSON)', accepts: terms() }))
        let paid
        try {
          paid = await payAgentCharge(AGENTS_CFG, chargeMatch[1], payment)
        } catch (err) {
          return send(res, 402, jsonBody({ x402Version: 1, error: `settlement failed: ${String(err.message).split('\n')[0]}`, accepts: terms() }))
        }
        if (!paid.ok) return send(res, paid.status, jsonBody({ error: paid.why, ...(paid.status === 402 ? { x402Version: 1, accepts: terms() } : {}) }))
        return send(res, 200, jsonBody({ charge: paid.charge, settleTx: paid.settled.settleTx, splitTx: paid.settled.splitTx }), 'application/json', {
          'x-payment-response': encodePaymentHeader({ x402Version: 1, success: true, network: `eip155:${CHAIN_ID}`, transaction: paid.settled.settleTx, payer: payment.payload?.payer }),
        })
      }
      return send(res, 404, jsonBody({ error: 'not found', path, hint: 'GET /agents/<agentId>/rates · POST /agents/hire · GET /agent-charges/<id> · POST /agent-charges/<id>/pay' }))
    }
    // Satu-satunya rute yang meminta bayaran. Verifikasi itu sendiri tetap gratis di halaman;
    // yang berbayar adalah jalur mesin-ke-mesin (agen yang memanggil kami untuk banyak kredensial).
    if (path === '/verify') return handleVerify(req, res)
    // Relayer penerbitan (B97). Agen menandatangani di tempatnya sendiri dan menyerahkan hasilnya
    // ke sini; semua penolakan terjadi di `submitRelay` sebelum satu wei pun bergerak.
    if (path === '/relay') {
      if (req.method !== 'POST') return send(res, 405, { error: 'POST required', path })
      let body
      try {
        body = await readJsonBody(req)
      } catch (err) {
        return send(res, 400, { error: err.message })
      }
      const out = await submitRelay({ body, rpcUrl: RPC_URL, resolverAddress: RESOLVER, basAddress: BAS })
      if (!out.ok) return send(res, out.status, { error: out.error })
      if (RELAY_BROADCAST && !out.duplicate) {
        drainRelayQueue({ rpcUrl: RPC_URL, resolverAddress: RESOLVER, basAddress: BAS, platformPrivateKey: process.env.DEPLOYER_PRIVATE_KEY })
      }
      return send(res, out.status, { ...out.job, duplicate: out.duplicate, broadcast: RELAY_BROADCAST ? 'enabled' : 'disabled' })
    }
    if (path.startsWith('/relay/')) {
      const job = await getRelayJob(decodeURIComponent(path.slice('/relay/'.length)))
      return job ? send(res, 200, job) : send(res, 404, { error: 'no relay job with that id', path })
    }
    // Setoran tenggat (B90). Tiga rute: aturan yang dilihat peserta SEBELUM memilih tenggat, keadaan
    // satu setoran dari chain, dan penyelesaian yang diadili sebelum gas (`deposit.js`).
    if (path === '/deposit/finalize' || path.startsWith('/deposit/')) {
      if (!DEPOSIT_READY) return send(res, 503, { error: 'deposit contract is not configured on this server', path })
      if (path === '/deposit/finalize') {
        if (req.method !== 'POST') return send(res, 405, { error: 'POST required', path })
        let body
        try {
          body = await readJsonBody(req)
        } catch (err) {
          return send(res, 400, { error: err.message })
        }
        const out = await finalizeDeposit({
          body, cfg: DEPOSIT_CFG, broadcast: DEPOSIT_BROADCAST, platformPrivateKey: process.env.DEPLOYER_PRIVATE_KEY,
        })
        const { ok, status, ...rest } = out
        return send(res, status, jsonBody(rest))
      }
      const parts = decodeURIComponent(path.slice('/deposit/'.length)).split('/')
      if (parts[0] === 'policy') {
        const built = deadlinePolicyOf(parts[1] ?? '', DEPOSIT_CFG)
        return built
          ? send(res, 200, { policyHash: built.policyHash, policy: built.policy })
          : send(res, 404, { error: 'no publisher manifest for that course', path })
      }
      const out = await readDeposit({ slug: parts[0] ?? '', learner: parts[1], cfg: DEPOSIT_CFG })
      const { ok, status, ...rest } = out
      return send(res, status, jsonBody(rest))
    }
    // `result[0].id` di dalam setiap kredensial menunjuk ke sini: angka hasil + bukti apa yang
    // menghasilkannya + perangkat mana yang menilai (B44). Tanpa rute ini, ijazah kita mencetak
    // URL yang tidak menjawab — sama seperti `/criteria` kemarin.
    if (path.startsWith('/results/')) {
      const [slug, hash] = decodeURIComponent(path.slice('/results/'.length)).split('/')
      const found = await getCredentialByHash(hash)
      if (!found || !found.document) {
        return send(res, 404, { error: 'no result for that hash through this backend', path })
      }
      if (slug && found.course !== slug) {
        return send(res, 404, { error: 'courseId does not match its credentialHash', expected: found.course, path })
      }
      return send(res, 200, resultDocument({ baseUrl: BASE_URL, record: found }))
    }

    // kredensial yang sudah diterbitkan: `/credentials/<credentialHash>` — URL yang sama dengan
    // `id` di dalam dokumen, jadi tautan yang dicetak di ijazah memang menunjuk ke sini.
    // Rekaman tersimpan menurut hash-nya; `id` dokumen adalah URL penuh, dan permintaan masuk
    // sebagai pathname — jadi keduanya tidak pernah string-cocok.
    if (path.startsWith('/credentials/0x')) {
      const found = await getCredentialByHash(path.slice('/credentials/'.length))
      if (!found) return send(res, 404, { error: 'not issued through this backend', path })
      // Yang dijanjikan `id` adalah sebuah Verifiable Credential, jadi itulah yang keluar — bukan
      // rekaman internal kita. Bentuknya dijaga `probe:serve`, karena verifier standar berhenti di
      // sini kalau yang tersaji bukan dokumen: dulu rute ini memulangkan rekaman store dan tidak
      // ada satu pun pemeriksaan yang melihatnya.
      if (!found.document) {
        return send(res, 409, {
          error: 'this credential is known from the chain but has no document from us',
          credentialHash: found.credentialHash, uid: found.uid,
        })
      }
      if (new URL(req.url, BASE_URL).searchParams.get('format') === 'record') return send(res, 200, found)
      return send(res, 200, found.document)
    }
    if (path === '/healthz') {
      const r = await buildList(REVOCATION)
      const s = await buildList(SUSPENSION)
      return send(res, 200, {
        ok: true, baseUrl: BASE_URL, resolver: RESOLVER, rpc: RPC_URL,
        // B125: kursus berbayar ditegakkan di server ini? ("off" hanya untuk server yang dinyalakan harness)
        paywall: PAYWALL ? 'on' : 'off',
        agent: AGENT_SLUG,
        // Semua identitas yang kami sajikan, supaya "kredensial ini menunjuk ke mana" bisa
        // dijawab dari satu permintaan, bukan dari tebakan slug.
        agentSlugs: (await listAgents()).map((a) => a.agentSlug),
        startedAt: STARTED_AT,
        // Kode mana yang sedang berjalan, direkam saat proses mulai: supaya penguji bisa bilang
        // "server ini lebih tua daripada src/ di disk" alih-alih melaporkan merah palsu.
        codeStamp: CODE_STAMP,
        watched: r.watched,
        // `unallocated` dilaporkan, bukan disembunyikan: kredensial yang ada di chain tapi belum
        // punya slot TIDAK ikut menentukan bit — dan itu harus kelihatan, bukan jadi daftar yang
        // tampak benar sambil diam-diam kurang.
        revocation: {
          flagged: r.flagged, bitstringHash: r.hash, unallocated: r.unallocated.length,
          slots: Object.fromEntries(r.slots),
        },
        suspension: {
          flagged: s.flagged, bitstringHash: s.hash, unallocated: s.unallocated.length,
          slots: Object.fromEntries(s.slots),
        },
        sha256OfEncodedList: {
          revocation: sha256Hex(r.encodedList), suspension: sha256Hex(s.encodedList),
        },
        // Dilaporkan supaya orang bisa MEMBUKA rute berbayar dan menemukan sendiri syaratnya,
        // bukan membaca angka harga dari dokumentasi kami.
        payment: {
          route: 'POST /verify', priceAtomic: String(PRICE), network: `eip155:${CHAIN_ID}`,
          token: PAY_TOKEN ?? '(belum diisi)', split: PAY_SPLIT ?? '(belum diisi)',
          payee: PAY_PAYEE ?? '(belum diisi)', configured: Boolean(PAY_TOKEN && PAY_SPLIT && PAY_PAYEE),
        },
        // Dilaporkan apa adanya: `broadcast: false` berarti permintaan diterima dan diantrekan,
        // tapi tidak ada yang disiarkan oleh proses ini.
        relay: {
          route: 'POST /relay', configured: Boolean(RPC_URL && RESOLVER && BAS), broadcast: RELAY_BROADCAST,
          maxBatch: RELAY_MAX_BATCH, maxDeadlineSeconds: RELAY_MAX_DEADLINE_SECONDS, jobs: await relaySummary(),
        },
        // Alamat kontraknya dilaporkan di sini supaya bisa dibuka di explorer, bukan dibaca dari
        // dokumentasi kami; `broadcast: false` = penyelesaian diadili tapi tidak disiarkan proses ini.
        deposit: {
          routes: 'GET /deposit/policy/<course> · GET /deposit/<course>/<learner> · POST /deposit/finalize',
          contract: DEPOSIT ?? '(belum diisi)', configured: DEPOSIT_READY, broadcast: DEPOSIT_BROADCAST,
        },
        // B155: dompet yang membayar faucet, gas pemilik agen, dan penyelesaian bayar — saldonya terlihat sebelum habis.
        // Pemakaian kuota hanya angka; IP pengunjung tidak pernah dilaporkan.
        deployer: DEPLOYER_ADDRESS
          ? { address: DEPLOYER_ADDRESS, balanceWei: await nativeBalance(RPC_URL, DEPLOYER_ADDRESS).then(String).catch(() => null) }
          : null,
        limits: { faucet: LIMITS.faucet.snapshot(), gas: LIMITS.gas.snapshot(), mint: LIMITS.mint.snapshot() },
        admins: adminAddresses().size, // hanya jumlah; alamat admin tidak dilaporkan
      })
    }
    return send(res, 404, {
      error: 'not found', path,
      hint: `/issuers/${AGENT_SLUG} | /criteria/<courseId> | /results/<courseId>/<credentialHash> | /credentials/<credentialHash> | /credentials/status/{revocation,suspension} | /verify (POST, berbayar) | /relay (POST) | /relay/<id> | /deposit/policy/<courseId> | /deposit/<courseId>/<learner> | /deposit/finalize (POST) | /healthz`,
    })
  } catch (err) {
    // Tidak menutupi sebabnya: kegagalan konfigurasi harus terbaca sebagai kegagalan konfigurasi.
    return send(res, 500, { error: err.message })
  }
})

// B148: salinan konteks JSON-LD diperiksa saat mulai (sha256 = manifest). Salinan yang berubah melempar di sini, jadi server
// menolak jalan alih-alih menandatangani daftar status dengan konteks lain.
console.log(`konteks JSON-LD: ${vendoredContexts().manifest.contexts.length} salinan dimuat dari signer/contexts (sha256 cocok)`)

// B133: muat kursus database sebelum permintaan pertama — supaya criteria/enroll kursus yang sudah terbit langsung dikenal.
await refreshCatalog({ force: true }).then((r) => { if (r.loaded || r.skipped) console.log(`katalog database: ${r.loaded} kursus dimuat, ${r.skipped} dilewati`) })
  .catch((e) => console.warn(`katalog database tidak termuat saat mulai: ${String(e.message ?? e).slice(0, 120)}`))

server.listen(PORT, HOST, () => {
  console.log(`signer: ${BASE_URL}/issuers/${AGENT_SLUG}`)
  console.log(`        ${BASE_URL}/credentials/status/${REVOCATION}`)
  console.log(`        ${BASE_URL}/credentials/status/${SUSPENSION}`)
  console.log(`        ${BASE_URL}/verify  (POST, x402 exact, harga ${PRICE} @ eip155:${CHAIN_ID})`)
  console.log(`resolver ${RESOLVER ?? '(belum diisi)'} via ${RPC_URL ?? '(belum diisi)'}`)
  if (!PAYWALL) console.warn('PERINGATAN: ENROLL_PAYWALL=off — kursus berbayar bisa diikuti tanpa bayar di server ini (hanya untuk server harness)')
})

export { server, buildList }
