/**
 * `npm run check` — bukti bahwa backend ini melakukan apa yang klaimnya katakan.
 *
 * Pola yang sama dengan `web/scripts/probe.ts`: berkas yang sama dengan produksi, dijalankan di
 * Node, angka pemeriksaan dicetak dari yang benar-benar dijalankan. Alasannya juga sama —
 * `verify()` yang selalu mengembalikan sesuatu bisa "hijau" tanpa memeriksa apa pun.
 *
 * Yang membuat berkas ini bukan sekadar uji unit: ia memuat angka yang DIUKUR dari chain.
 * Check pertama mengikat turunan `credentialHash` di TypeScript ke hash yang benar-benar ada di
 * BSC testnet hasil `SeedDemo`. Kalau nanti ada yang mengubah `_vcHash()` di Solidity tanpa
 * mengubah sini (atau sebaliknya), berkas ini yang berteriak — bukan demonya.
 */
import { buildOpenBadgeCredential, credentialHashOf, sha256Hex } from '../src/credential.js'
import { IndexAllocator, REVOCATION, SUSPENSION, encodeList, decodeBit, statusListCredential } from '../src/statusList.js'
import { createIssuerKey, issuerDocument } from '../src/issuer.js'
import { makeDocumentLoader, signDocument, verifyDocument, CRYPTOSUITE_NAME } from '../src/sign.js'

let ran = 0
let failures = 0
function check (name, cond, detail = '') {
  ran += 1
  if (cond) console.log(`  ok    ${name}`)
  else { failures += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}
// Bagian 5 hanya jalan kalau ada chain untuk dibaca. Tanpa daftar ini, angka hijau bisa berarti
// "belum diuji" — kesalahan yang persis sama kita keluhkan di catatan riset orang lain.
const skipped = []

const BASE = 'https://lencana.example'
const NOW = 1_800_000_000            // 2027, tetap di dalam rentang demo
const YEAR = 365 * 24 * 3600

// --- 1. ikatan ke chain -------------------------------------------------------
// Learner + course ketiga dari SeedDemo.s.sol, dan hash yang DIBACA dari chain 97 pada 19 Sep.
const SEED_LEARNER = '0x5cA36D61009c2C5A0406F046FFb2B7c939Fd7c3B'
const SEED_COURSE = 'web3-dasar-2026-b'
const SEED_HASH_ONCHAIN = '0x0b95c83b9bd94923ab299446e9c9fd72d03529d3d1b8472eef6d39effcb367fa'
check(
  'credentialHash TypeScript == hash yang terbaca di chain',
  credentialHashOf(SEED_LEARNER, SEED_COURSE) === SEED_HASH_ONCHAIN,
  credentialHashOf(SEED_LEARNER, SEED_COURSE),
)

// --- 2. bentuk dokumen --------------------------------------------------------
const allocator = new IndexAllocator()
const learner = { address: SEED_LEARNER }
const course = {
  slug: SEED_COURSE, name: 'Web3 Dasar (bagian B)', description: 'Kursus dasar web3 untuk peserta Indonesia',
  criteria: 'Nilai akhir >= 70 dari 100, tugas esai dinilai agen',
}
const issuer = await createIssuerKey({ baseUrl: BASE, agentSlug: 'agent-demo', name: 'Agen Penerbit Demo' })
const uid = '0x' + 'ab'.repeat(32)
const expiresAt = NOW + YEAR

const { unsigned, indices } = buildOpenBadgeCredential({
  baseUrl: BASE, issuer, course, learner, uid,
  assessment: { score: '87', method: 'esai + kuis', comment: 'Lulus dengan catatan' },
  issuedAtUnix: NOW, expiresAtUnix: expiresAt, allocator,
})

check('@context dua URI dan urutannya benar', unsigned['@context'][0] === 'https://www.w3.org/ns/credentials/v2'
  && unsigned['@context'][1] === 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json')
check('type memuat VerifiableCredential + OpenBadgeCredential',
  unsigned.type.includes('VerifiableCredential') && unsigned.type.includes('OpenBadgeCredential'))
check('validFrom ada, issuanceDate TIDAK (VC 1.1 bukan VC 2.0)',
  !!unsigned.validFrom && unsigned.issuanceDate === undefined)
check('validUntil ada, expirationDate TIDAK',
  !!unsigned.validUntil && unsigned.expirationDate === undefined)
check('achievement.criteria wajib dan terisi', !!unsigned.credentialSubject.achievement.criteria?.narrative)
check('subject: id XOR identifier, tepat salah satu',
  (unsigned.credentialSubject.id === undefined) !== (unsigned.credentialSubject.identifier === undefined))
check('result[] membawa nilai lewat `value` (bukan resultScore ala OB 2.0)',
  unsigned.credentialSubject.result?.[0]?.value === '87'
  && unsigned.credentialSubject.result[0].resultScore === undefined
  && unsigned.credentialSubject.result[0].achievementId === undefined)
check('kadaluarsa dokumen berasal dari SATU angka dengan attestation',
  Date.parse(unsigned.validUntil) / 1000 === expiresAt)
check('statusListIndex string basis 10 (bukan angka)',
  unsigned.credentialStatus.every((e) => typeof e.statusListIndex === 'string' && /^\d+$/.test(e.statusListIndex)),
  JSON.stringify(unsigned.credentialStatus.map((e) => typeof e.statusListIndex)))
check('dua entri status, dua purpose berbeda (revocation + suspension)',
  unsigned.credentialStatus.length === 2
  && new Set(unsigned.credentialStatus.map((e) => e.statusPurpose)).size === 2)
check('id entri status BUKAN URL list-nya sendiri',
  unsigned.credentialStatus.every((e) => e.id !== e.statusListCredential))

// --- 3. tanda tangan ----------------------------------------------------------
const issuerDoc = issuerDocument({ ...issuer })
const loader = makeDocumentLoader({ [issuer.controller]: issuerDoc })

const signed = await signDocument(unsigned, { key: issuer.key, controllerDocument: issuerDoc, documentLoader: loader })
const proof = Array.isArray(signed.proof) ? signed.proof[0] : signed.proof

check('proof.type = DataIntegrityProof', proof.type === 'DataIntegrityProof', proof.type)
check(`proof.cryptosuite = ${CRYPTOSUITE_NAME} (yang ada di daftar sertifikasi)`,
  proof.cryptosuite === CRYPTOSUITE_NAME, proof.cryptosuite)
check('proofPurpose = assertionMethod (wajib §B.1.24)', proof.proofPurpose === 'assertionMethod', proof.proofPurpose)
check('verificationMethod = URL HTTP, bukan DID', /^https?:\/\//.test(proof.verificationMethod), proof.verificationMethod)
check('proofValue multibase base58btc (awalan z)', typeof proof.proofValue === 'string' && proof.proofValue.startsWith('z'))

const ok = await verifyDocument(signed, { controllerDocument: issuerDoc, documentLoader: loader })
check('verifikasi round-trip LULUS', ok.verified, JSON.stringify(ok.raw?.results ?? ok.raw?.error ?? ''))

const tampered = structuredClone(signed)
tampered.credentialSubject.result[0].value = '100'
const tamperedResult = await verifyDocument(tampered, { controllerDocument: issuerDoc, documentLoader: loader })
check('nilai diubah -> tanda tangan MATI', tamperedResult.verified === false)

// Lebih tajam daripada "sodorkan kunci lain": kunci VERIFIKASI dibaca dari dokumen, jadi
// pemanggil tidak bisa membantu hasilnya. Yang diuji di sini adalah memalsukan *siapa* yang
// dinyatakan menandatangani — menunjuk kunci lain yang sah bentuknya, tanpa mengubah isinya.
const otherKey = await createIssuerKey({ baseUrl: BASE, agentSlug: 'agen-lain' })
const swapped = structuredClone(signed)
const swappedProof = Array.isArray(swapped.proof) ? swapped.proof[0] : swapped.proof
swappedProof.verificationMethod = otherKey.key.id
const swappedResult = await verifyDocument(swapped, { controllerDocument: issuerDoc, documentLoader: loader })
check('proof dialihkan ke kunci lain -> tolak', swappedResult.verified === false)

// Ini padanan dokumen dari whitelist chain: kunci yang tidak terdaftar di `assertionMethod`
// dokumen issuer harus ditolak, walaupun tanda tangannya sendiri sah.
const unlistedDoc = issuerDocument({ ...issuer })
unlistedDoc.assertionMethod = []
const unlistedLoader = makeDocumentLoader({ [issuer.controller]: unlistedDoc })
const unlisted = await verifyDocument(signed, { controllerDocument: unlistedDoc, documentLoader: unlistedLoader })
check('kunci sah tapi TIDAK terdaftar di dokumen issuer -> tolak', unlisted.verified === false)

// --- 4. daftar status dari keadaan chain --------------------------------------
const slots = new Map([[uid, indices.revocation]])
const suspSlots = new Map([[uid, indices.suspension]])

const emptyList = encodeList({ slots, flagged: new Set() })
const revokedList = encodeList({ slots, flagged: new Set([uid]) })
check('bit 0 = indeks 0 (bitstring paling kiri), dan berubah jadi 1 saat dicabut',
  decodeBit(emptyList, indices.revocation) === 0 && decodeBit(revokedList, indices.revocation) === 1)
check('kredensial lain di list tidak ikut berubah',
  decodeBit(revokedList, indices.revocation + 1) === 0)
check('encodedList multibase base64url + gzip (awalan u, tanpa padding)',
  emptyList.startsWith('u') && !emptyList.includes('=') && emptyList.length > 10, emptyList.slice(0, 24))

// Delisting harus masuk ke list SUSPENSION, bukan Revocation — itu pembeda D30, dan sekarang
// ia terlihat verifier pihak ketiga, bukan hanya halaman kita.
const suspOnly = encodeList({ slots: suspSlots, flagged: new Set([uid]) })
check('agen di-delisting -> list suspension merah, list revocation tetap bersih',
  decodeBit(suspOnly, indices.suspension) === 1 && decodeBit(encodeList({ slots, flagged: new Set() }), indices.revocation) === 0)

const listDoc = statusListCredential({
  baseUrl: BASE, purpose: REVOCATION, encodedList: revokedList,
  issuerId: issuer.controller, issuedAt: new Date(NOW * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
})
const signedList = await signDocument(listDoc, { key: issuer.key, controllerDocument: issuerDoc, documentLoader: loader })
const listOk = await verifyDocument(signedList, { controllerDocument: issuerDoc, documentLoader: loader })
check('daftar status sendiri adalah VC yang bisa diverifikasi', listOk.verified === true)
check('daftar status memakai type BitstringStatusListCredential + statusPurpose',
  listDoc.type.includes('BitstringStatusListCredential') && listDoc.credentialSubject.statusPurpose === REVOCATION)

// Hash bitstring inilah yang kita rekam lewat BAS `timestamp()`, supaya "list yang disajikan
// bukan hasil suntingan" bisa dibuktikan orang lain tanpa mempercayai server kita.
check('hash bitstring deterministik (bahan untuk timestamp() BAS)',
  sha256Hex(revokedList) === sha256Hex(revokedList) && sha256Hex(revokedList) !== sha256Hex(emptyList))

// --- 5. daftar status yang DITURUNKAN DARI CHAIN -------------------------------
// Inilah isi keputusan D24.1=A: bukan cuma bentuk dokumen yang benar, tapi nilainya datang dari
// contract state, bukan dari database kami. Hash yang dipakai sama dengan yang dibaca
// `web/scripts/probe.ts`, jadi kedua berkas mengawasi keadaan yang sama.
const rpc = process.env.RPC_URL
const resolverAddress = process.env.RESOLVER_ADDRESS
const envHashes = [
  process.env.DEMO_HASH, process.env.DEMO_REVOKED_HASH,
  process.env.DEMO_CHAINED_HASH, process.env.DEMO_DELISTED_HASH,
].filter(Boolean).map((h) => h.toLowerCase())

// Hash yang diawasi = yang diisi lewat env DIKAMPUKAN dengan yang diketahui store. Kalau tidak,
// pemeriksaan invarian hanya jalan saat seorang kebetulan mengisi DEMO_HASH dengan hash yang
// pernah diterbitkan di sini — dan itu berarti cakupannya ditentukan keberuntungan, bukan oleh kita.
let watched = envHashes
if (rpc && resolverAddress) {
  const { watchedHashes } = await import('../src/store.js')
  watched = [...new Set([...envHashes, ...(await watchedHashes()).map((h) => h.toLowerCase())])]
}

if (!rpc || !resolverAddress || watched.length === 0) {
  skipped.push('bagian 5 — daftar status dari chain (butuh RPC_URL + RESOLVER_ADDRESS, dan minimal satu kredensial dikenal: lewat DEMO_HASH/… atau store)')
} else {
  const { readChainStatuses, revokedUids, suspendedUids } = await import('../src/chainStatus.js')
  const statuses = await readChainStatuses({ rpcUrl: rpc, resolverAddress, hashes: watched })
  check(`chain mengenali seluruh kredensial yang diawasi sebagai attestation kita (${statuses.size}/${watched.length})`,
    statuses.size === watched.length && statuses.size > 0)

  const chainAlloc = new IndexAllocator()
  const revSlots = new Map()
  const susSlots = new Map()
  for (const uid of statuses.keys()) {
    revSlots.set(uid, chainAlloc.slot(REVOCATION, uid))
    susSlots.set(uid, chainAlloc.slot(SUSPENSION, uid))
  }
  const revList = encodeList({ slots: revSlots, flagged: new Set(revokedUids(statuses)) })
  const susList = encodeList({ slots: susSlots, flagged: new Set(suspendedUids(statuses)) })
  const bit = (list, uid, purpose) => decodeBit(list, (purpose === REVOCATION ? revSlots : susSlots).get(uid))
  const uidOfHash = (h) => [...statuses.values()].find((s) => s.hash.toLowerCase() === h)?.uid

  const revokedUid = uidOfHash(process.env.DEMO_REVOKED_HASH?.toLowerCase())
  const delistedUid = uidOfHash(process.env.DEMO_DELISTED_HASH?.toLowerCase())
  const activeUid = uidOfHash(process.env.DEMO_HASH?.toLowerCase())
  const chainedUid = uidOfHash(process.env.DEMO_CHAINED_HASH?.toLowerCase())

  if (revokedUid) {
    check('yang dicabut di chain -> bit 1 di list REVOCATION', bit(revList, revokedUid, REVOCATION) === 1)
    check('yang dicabut di chain -> bit 0 di list SUSPENSION (bukan keduanya)',
      bit(susList, revokedUid, SUSPENSION) === 0)
  } else skipped.push('DEMO_REVOKED_HASH tidak ada di chain ini')

  if (delistedUid) {
    check('agen di-delisting -> bit 1 di list SUSPENSION', bit(susList, delistedUid, SUSPENSION) === 1)
    // Ini yang membuat dua list (bukan satu dengan statusSize>1) layak: pembeda D30 tetap ada
    // setelah keluar dari tangan kita. Digabung jadi satu bit, verifier tidak bisa lagi
    // membedakan "dicabut selamanya" dari "sedang dijeda".
    check('agen di-delisting -> TIDAK muncul sebagai revocation',
      bit(revList, delistedUid, REVOCATION) === 0)
  } else skipped.push('DEMO_DELISTED_HASH tidak ada di chain ini')

  for (const [label, u] of [['aktif', activeUid], ['rantainya tercabut', chainedUid]]) {
    if (!u) { skipped.push(`hash ${label} tidak ada di chain ini`); continue }
    check(`kredensial ${label} -> bersih di kedua list`,
      bit(revList, u, REVOCATION) === 0 && bit(susList, u, SUSPENSION) === 0)
  }
  // Semua pemeriksaan per-adegan dijaga oleh kehadiran env-nya masing-masing. Menganggap sebuah
  // hash selalu diawasi hanya karena tes lain mengisinya adalah cara mendapat "gagal" yang
  // sebenarnya berarti "belum diuji".
  if (chainedUid) {
    check('[2] valid meski prasyaratnya dicabut -> dirinya sendiri tidak disuspensi/dicabut',
      bit(revList, chainedUid, REVOCATION) === 0 && bit(susList, chainedUid, SUSPENSION) === 0)
  } else {
    skipped.push('DEMO_CHAINED_HASH tidak diisi — lewati pemeriksaan [2]')
  }

  // 5b. THE invariant. `statusListIndex` tertulis ke DALAM dokumen saat ia terbit; bitnya dibaca
  //     ulang dari daftar yang kita hidangkan. Kalau dua-duanya tidak menunjuk hal yang sama,
  //     seluruh mekanisme status list hanya menjadi hiasan yang lolos verifikasi tanda tangan —
  //     dan itu kegagalan yang TIDAK terlihat di `verify()`. Pemeriksaannya persis invarian yang
  //     membuat alokator harus pindah ke store (lihat src/store.js).
  //
  // ⚠️ Daftarnya dirender dari `servedHashes()`, BUKAN dari satu kredensial yang sedang diuji.
  //     Dengan input sekali-kredensial, bit yang diperiksa berasal dari bitstring yang tidak
  //     pernah disajikan siapa pun — pemeriksaan itu bisa hijau sementara daftar yang benar
  //     salah. Ini kelas bug yang sama dengan anchor satu-kredensial di scripts/issue.js.
  const { renderList, servedHashes } = await import('../src/lists.js')
  const served = await servedHashes()
  const { listCredentials } = await import('../src/store.js')
  const { createIssuerKey, issuerDocument } = await import('../src/issuer.js')
  const { makeDocumentLoader } = await import('../src/sign.js')
  const ephemeral = await createIssuerKey({ baseUrl: 'https://check.invalid', agentSlug: 'check' })
  const ephDoc = issuerDocument(ephemeral)
  const ephLoader = makeDocumentLoader({ [ephemeral.controller]: ephDoc })

  const issued = await listCredentials()
  if (issued.length === 0) {
    skipped.push('store belum punya kredensial terbitan (jalankan scripts/issue.js untuk mengisinya)')
  } else {
    check('store melaporkan kredensial yang pernah diterbitkan', issued.length > 0, `${issued.length} butir`)
    for (const rec of issued) {
      const s = [...statuses.values()].find((x) => x.hash.toLowerCase() === rec.credentialHash.toLowerCase())
      if (!s) { skipped.push(`${rec.course} tidak termasuk hash yang diawasi`); continue }
      for (const entry of rec.document.credentialStatus) {
        const purpose = entry.statusPurpose
        const rendered = await renderList({
          purpose, baseUrl: BASE, rpcUrl: rpc, resolverAddress, hashes: served,
          key: ephemeral.key, controllerDocument: ephDoc, documentLoader: ephLoader,
        })
        const idx = Number(entry.statusListIndex)
        const expected = purpose === REVOCATION ? s.revoked : (s.issuerDelisted && !s.revoked)
        check(`[${rec.course}] ${purpose}: bit pada indeks milik dokumennya sendiri (${idx}) = ${expected ? 1 : 0}`,
          decodeBit(rendered.encodedList, idx) === (expected ? 1 : 0),
          `dapat ${decodeBit(rendered.encodedList, idx)}, chain bilang ${expected ? 1 : 0}`)
        // Yang dibandingkan adalah KLAIM dokumen itu sendiri (URL absolut yang ia tulis saat terbit),
        // bukan BASE_URL berkas check ini — kredensial yang diterbitkan server di host lain harus
        // tetap lolos di sini.
        const urlOk = /^https?:\/\/[^/]+\/credentials\/status\/[a-z]+$/.test(entry.statusListCredential ?? '')
          && entry.statusListCredential.endsWith(`/${purpose}`)
        check(`[${rec.course}] ${purpose}: dokumennya menunjuk URL daftar yang sah dan benar`,
          urlOk, entry.statusListCredential)
      }
    }

    // 5c. Determinisme sajian. Server membangun bitstring ULANG tiap permintaan, jadi dua hal
    //     wajib benar selamanya: render ulang atas masukan sama menghasilkan hash sama, dan hash
    //     itu tidak boleh berubah kalau urutan masukan diacak. Kalau salah satu gagal, nomor bit
    //     yang ditulis ke dalam dokumen kehilangan artinya — dan itu tidak akan pernah kelihatan
    //     di pemeriksaan tanda tangan.
    //
    //     Sengaja TIDAK membandingkan dengan hash yang di-anchor: anchor adalah saksi pada saat
    //     terbit, dan setiap pencabutan sesudah itu memang mengubah daftar yang disajikan —
    //     memeriksa sama-persis akan merah karena alasan yang salah. Yang menjamin anchor mengikat
    //     daftar sajian adalah `servedHashes()` di sisi penerbit (lihat scripts/issue.js).
    const renderServed = async (purpose, list) => (await renderList({
      purpose, baseUrl: BASE, rpcUrl: rpc, resolverAddress, hashes: list,
      key: ephemeral.key, controllerDocument: ephDoc, documentLoader: ephLoader,
    })).hash
    for (const purpose of [REVOCATION, SUSPENSION]) {
      const a = await renderServed(purpose, served)
      const b = await renderServed(purpose, served)
      const c = await renderServed(purpose, [...served].reverse())
      check(`${purpose}: render ulang atas masukan sama -> hash sama`, a === b, `${a} vs ${b}`)
      check(`${purpose}: urutan masukan diacak -> hash TETAP sama`, a === c, `${a} vs ${c}`)
    }
  }
}

console.log(`\n${failures === 0 ? 'CHECK HIJAU' : 'CHECK MERAH'} — ${ran} pemeriksaan, ${failures} gagal`)
if (skipped.length) {
  console.log(`\n--grup yang DILEWATI (${skipped.length})--`)
  for (const s of skipped) console.log(`  - ${s}`)
}
process.exitCode = failures === 0 ? 0 : 1
