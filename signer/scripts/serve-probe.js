/**
 * `npm run probe:serve` — membuktikan server benar-benar menyajikan dokumen yang bisa diverifikasi
 * ORANG LAIN, bukan hanya fungsi yang jalan di dalam proses yang sama.
 *
 * Bedanya penting. `check.js` memuat dokumen issuer dari memori; verifier nyata (vc.1ed.tech,
 * wallet, alat pihak ketiga) membaca URL. Jadi di sini semuanya lewat HTTP, termasuk kunci yang
 * dipakai untuk memverifikasi — kalau dokumen issuer tidak tersaji, tes ini gagal meski
 * kripto-grafinya sempurna.
 *
 * Perlu: server jalan (`npm run serve`) dengan RPC_URL + RESOLVER_ADDRESS + STATUS_HASHES terisi.
 */
import { makeDocumentLoader, verifyDocument } from '../src/sign.js'
import { gunzipSync } from 'node:zlib'
import { LIST_BITS, REVOCATION, SUSPENSION, decodeBit } from '../src/statusList.js'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
const SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const EXPECT_REVOKED = (process.env.EXPECT_REVOKED ?? '').split(',').filter(Boolean)
const EXPECT_SUSPENDED = (process.env.EXPECT_SUSPENDED ?? '').split(',').filter(Boolean)
const EXPECT_CLEAN = (process.env.EXPECT_CLEAN ?? '').split(',').filter(Boolean)

let ran = 0
let failures = 0
// Sama seperti check.js: grup yang tidak diuji harus DILAPORKAN, bukan hilang dari jumlah.
// Angka hijau yang mengecil tanpa sebab tertulis adalah cara paling mudah menyesatkan tanpa
// berbohong — dan kami menagih hal yang sama di catatan riset orang lain.
const skipped = []
function check (name, cond, detail = '') {
  ran += 1
  if (cond) console.log(`  ok    ${name}`)
  else { failures += 1; console.log(`  GAGAL ${name}${detail ? ` -> ${detail}` : ''}`) }
}

async function getJson (path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`)
  return res.json()
}

const issuerDoc = await getJson(`/issuers/${SLUG}`)
check('dokumen issuer tersaji lewat HTTP', Array.isArray(issuerDoc.assertionMethod) && issuerDoc.assertionMethod.length === 1)
const vmId = issuerDoc.assertionMethod[0].id
check('verification method-nya punya publicKeyMultibase', typeof issuerDoc.assertionMethod[0].publicKeyMultibase === 'string')

// Loader dibangun DARI HASIL HTTP. Pemanggil tidak menyodorkan kunci apa pun ke verify().
const loader = makeDocumentLoader({
  [issuerDoc.id]: issuerDoc,
  [`${BASE}/issuers/${SLUG}`]: issuerDoc,
  [vmId]: issuerDoc.assertionMethod[0],
})

const lists = {}
for (const purpose of [REVOCATION, SUSPENSION]) {
  const list = await getJson(`/credentials/status/${purpose}`)
  lists[purpose] = list
  check(`list ${purpose}: adalah BitstringStatusListCredential`,
    list.type?.includes('BitstringStatusListCredential'))
  check(`list ${purpose}: credentialSubject.statusPurpose cocok`,
    list.credentialSubject?.statusPurpose === purpose)
  check(`list ${purpose}: encodedList multibase base64url (u…)`,
    typeof list.credentialSubject?.encodedList === 'string' && list.credentialSubject.encodedList.startsWith('u'))

  // Panjang yang DISAJIKAN, bukan konstanta di source: inilah yang dibaca langkah 9 algoritme
  // validasi BSL, dan persis di sinilah `vc.1ed.tech` menolak kita pada 27 Sep.
  try {
    const inflated = gunzipSync(Buffer.from(String(list.credentialSubject.encodedList).slice(1), 'base64url'))
    check(`list ${purpose}: bitstring ${inflated.length} byte ≥ 16.384 (minimum BSL)`,
      inflated.length >= LIST_BITS / 8, `dapat ${inflated.length} byte`)
  } catch (e) {
    check(`list ${purpose}: encodedList bisa di-inflate`, false, e.message)
  }

  const verified = await verifyDocument(list, { controllerDocument: issuerDoc, documentLoader: loader })
  check(`list ${purpose}: tanda tangannya SAH terhadap dokumen issuer yang disajikan`, verified.verified,
    JSON.stringify(verified.raw?.results?.[0]?.error?.message ?? verified.raw?.error?.message ?? ''))
}

// Yang disajikan harus cocok dengan keadaan chain — bukan dengan perkiraan kita.
const health = await getJson('/healthz')
check('/healthz melaporkan kedua list', typeof health?.revocation?.flagged === 'number'
  && typeof health?.suspension?.flagged === 'number')
console.log(`\n  chain: ${health.watched} kredensial diawasi · ${health.revocation.flagged} revoked · `
  + `${health.suspension.flagged} suspended · hash ${String(health.revocation.bitstringHash).slice(0, 16)}…`)

// Yang disajikan harus cocok dengan keadaan chain — dan bit mana milik siapa TIDAK boleh
// ditebak dari urutan alokasi kami. Server yang melaporkan petanya, jadi kalau suatu hari
// alokasi berubah, pemeriksaan ini ikut benar tanpa perlu ikut berubah.
const slotOf = (purpose) => new Map(Object.entries(health[purpose].slots).map(([uid, i]) => [uid, Number(i)]))
const slots = { [REVOCATION]: slotOf(REVOCATION), [SUSPENSION]: slotOf(SUSPENSION) }

function bitAt (purpose, uid) {
  const index = slots[purpose].get(uid)
  if (index === undefined) return undefined
  return decodeBit(lists[purpose].credentialSubject.encodedList, index)
}

const EXPECT = [
  ...EXPECT_REVOKED.map((uid) => ({ uid, purpose: REVOCATION, other: SUSPENSION })),
  ...EXPECT_SUSPENDED.map((uid) => ({ uid, purpose: SUSPENSION, other: REVOCATION })),
  ...EXPECT_CLEAN.map((uid) => ({ uid, purpose: null, other: null })),
]

if (EXPECT.length === 0) {
  skipped.push('semua pemeriksaan bit (EXPECT_REVOKED / EXPECT_SUSPENDED / EXPECT_CLEAN kosong)')
} else {
  if (!EXPECT_REVOKED.length) skipped.push('EXPECT_REVOKED kosong — jalur "dicabut" tidak diuji lewat HTTP')
  if (!EXPECT_SUSPENDED.length) skipped.push('EXPECT_SUSPENDED kosong — jalur "agen di-delisting" tidak diuji lewat HTTP')
  check('server memetakan slot untuk setiap kredensial yang diawasi',
    EXPECT.every((e) => slots[REVOCATION].has(e.uid) && slots[SUSPENSION].has(e.uid)),
    `${slots[REVOCATION].size} slot dilaporkan`)

  for (const { uid, purpose, other } of EXPECT) {
    const tag = `${uid.slice(0, 10)}…`
    if (!purpose) {
      check(`uid ${tag} bersih di kedua list`,
        bitAt(REVOCATION, uid) === 0 && bitAt(SUSPENSION, uid) === 0)
      continue
    }
    check(`uid ${tag} -> bit 1 di list ${purpose}`, bitAt(purpose, uid) === 1)
    check(`uid ${tag} -> bit 0 di list ${other} (pembeda D30 bertahan)`, bitAt(other, uid) === 0)
  }
  check('jumlah bit yang dilaporkan server sama dengan yang diharapkan',
    health.revocation.flagged === EXPECT_REVOKED.length && health.suspension.flagged === EXPECT_SUSPENDED.length,
    `server: ${health.revocation.flagged}/${health.suspension.flagged}, diharapkan: ${EXPECT_REVOKED.length}/${EXPECT_SUSPENDED.length}`)
}

// `id` di dalam dokumen menunjuk ke rute ini. Kalau yang dipulangkan bukan sebuah Verifiable
// Credential, verifier standar berhenti di sini — dan dulu memang begitu: yang keluar adalah
// rekaman store kita, dan tidak satu pun pemeriksaan di bawah ini melihatnya karena rute dokumen
// memang tidak pernah diuji. Jadi blok ini bukan hiasan: ia menjaga bentuk jawaban.
//
// `DOC_HASH` = kredensial yang DITERBITKAN OLEH `AGENT_SLUG` yang disajikan server ini. Kunci
// penerbit lain tidak akan bisa membuktikannya, jadi isi itu kalau menjalankan ini dengan slug
// baru; tanpa itu ia jatuh ke `DEMO_HASH` (kredensial demo, diterbitkan `agent-demo`).
const docHash = process.env.DOC_HASH || process.env.DEMO_HASH
if (!docHash) {
  skipped.push('rute dokumen /credentials/<hash> (DOC_HASH dan DEMO_HASH kosong — bentuk dokumen tidak diuji lewat HTTP)')
} else {
  let doc = null
  try { doc = await getJson(`/credentials/${docHash}`) } catch (e) { console.log(`  (rute dokumen: ${e.message})`) }
  check('rute dokumen memulangkan Verifiable Credential, bukan rekaman store',
    Array.isArray(doc?.['@context']) && Array.isArray(doc?.type) && !!doc?.proof && !!doc?.credentialSubject,
    `key teratas: ${Object.keys(doc ?? {}).slice(0, 8).join(', ') || 'tidak ada respons'}`)
  check('rute dokumen: @context = VC 2.0 lalu OB 3.0.3, berurutan',
    doc?.['@context']?.[0] === 'https://www.w3.org/ns/credentials/v2'
    && doc?.['@context']?.[1] === 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json')
  check('rute dokumen: type memuat VerifiableCredential + OpenBadgeCredential',
    (doc?.type ?? []).includes('VerifiableCredential') && (doc?.type ?? []).includes('OpenBadgeCredential'))
  check('rute dokumen: id adalah URL rute ini juga',
    String(doc?.id ?? '').toLowerCase().endsWith(`/credentials/${String(docHash).toLowerCase()}`), doc?.id ?? '')
  check('rute dokumen: credentialStatus SATU objek purpose revocation',
    !Array.isArray(doc?.credentialStatus)
    && doc?.credentialStatus?.type === 'BitstringStatusListEntry'
    && doc?.credentialStatus?.statusPurpose === 'revocation',
    Array.isArray(doc?.credentialStatus) ? 'masih array — skema OB 3.0 menolaknya'
      : JSON.stringify(doc?.credentialStatus?.statusPurpose))
  check('rute dokumen: verificationMethod berada di bawah dokumen issuer yang tersaji',
    typeof doc?.proof?.verificationMethod === 'string'
    && doc.proof.verificationMethod.startsWith(vmId.split('#')[0]), doc?.proof?.verificationMethod ?? '')

  // Tanda tangan diperiksa terhadap kunci yang DATANG DARI HTTP, sama seperti verifier nyata.
  let docOk = null
  try {
    docOk = await verifyDocument(doc, { controllerDocument: issuerDoc, documentLoader: loader })
  } catch (e) {
    docOk = { verified: false, error: e.message }
  }
  check('rute dokumen: tanda tangannya SAH terhadap kunci yang disajikan HTTP',
    docOk?.verified === true, docOk?.error ?? JSON.stringify(docOk?.results ?? '').slice(0, 120))

  // Rekaman internal tetap bisa diambil — hanya tidak lagi menyamar sebagai dokumen.
  let rec = null
  try { rec = await getJson(`/credentials/${docHash}?format=record`) } catch (e) { console.log(`  (?format=record: ${e.message})`) }
  check('?format=record memulangkan rekaman (asal-usul angka: bukti, rubrik, penilai)',
    String(rec?.credentialHash ?? '').toLowerCase() === String(docHash).toLowerCase() && !!rec?.document)

  // Setiap kredensial menunjuk `criteria.id` dan `resultDescription` ke rute /criteria. Kalau rute
  // itu tidak menjawab, dokumen kita berbohong secara halus: ia menunjuk aturan yang tidak ada.
  const critUrl = doc?.credentialSubject?.achievement?.criteria?.id
  if (!critUrl) {
    skipped.push('dokumen tanpa criteria.id — rute /criteria tidak ikut diuji')
  } else {
    let crit = null
    try { crit = await getJson(new URL(critUrl).pathname) } catch (e) { console.log(`  (rute kriteria: ${e.message})`) }
    check('rute kriteria: URL yang dirujuk dokumen membalas 200', typeof crit?.id === 'string', critUrl)
    // Diperbandingkan lewat PATH, bukan URL penuh: dokumen lama menyimpan host tempat ia terbit
    // (tunnel yang hari ini sudah mati), sedangkan kita mengambil rute ini dari BASE yang aktif.
    // Membandingkan keduanya akan melaporkan merah yang benar soal host tapi salah soal bentuk —
    // dan itu membuat orang berhenti membaca baris yang penting.
    const critPath = new URL(critUrl).pathname
    check('rute kriteria: ada #scale, karena resultDescription menunjuk ke sana',
      crit?.scale?.id === `${BASE}${critPath}#scale`, crit?.scale?.id ?? '(tanpa scale)')
    console.log(`  info  host di dokumen (${new URL(critUrl).host}) vs host yang menyajikan (${new URL(BASE).host})`
      + (new URL(critUrl).host === new URL(BASE).host ? ' — sama' : ' — BEDA: dokumen ini terbit di host yang lain (B51)'))
    check('rute kriteria: memuat bobot dan pass mark penerbit',
      !!crit?.policy?.weights && Number.isFinite(Number(crit?.policy?.passMark)))
    check('rute kriteria: TIDAK memuat kunci jawaban kuis',
      !JSON.stringify(crit ?? {}).includes('"answer"'), 'field `answer` ditemukan di dokumen kriteria')
    const inCred = String(doc?.credentialSubject?.achievement?.criteria?.narrative ?? '')
      .match(/\[rubrik ([0-9a-f]{12})\]/)
    check('rute kriteria: rubricRef sama dengan yang tercetak di kredensial',
      !!inCred && crit?.rubricRef === inCred[1], `${crit?.rubricRef} vs ${inCred?.[1]}`)
  }

  // `result[0].id` menunjuk rute /results. Kasus yang sama persis dengan /criteria kemarin: ijazah
  // mencetak URL yang tidak menjawab. Di sinilah B44 dijawab untuk publik.
  const courseId = String(doc?.credentialSubject?.achievement?.id ?? '').split('/').pop()
  if (!courseId) {
    skipped.push('dokumen tanpa achievement.id — rute /results tidak ikut diuji')
  } else {
    const rUrl = `/results/${courseId}/${docHash}`
    let rd = null
    try { rd = await getJson(rUrl) } catch (e) { console.log(`  (rute hasil: ${e.message})`) }
    const rdJson = JSON.stringify(rd ?? {})
    check('rute hasil: URL yang dirujuk result[0].id membalas 200', typeof rd?.id === 'string', rUrl)
    check('rute hasil: nilai yang dilaporkan sama dengan yang tercetak di kertas',
      String(rd?.result) === String(doc?.credentialSubject?.result?.[0]?.value),
      `${rd?.result} vs ${doc?.credentialSubject?.result?.[0]?.value}`)
    check('rute hasil: menjawab "siapa menilai, dengan aturan apa" (B44)',
      typeof rd?.method === 'string' && rd.method.includes('rubrik') && !!rd?.rubric?.scale, rd?.method ?? '')
    check('rute hasil: TIDAK memuat kunci jawaban maupun teks esai peserta',
      !rdJson.includes('"answer"') && rd?.evidence?.essayTextIncluded === false
      && rd?.evidence?.quizAnswerKeysIncluded === false)
    check('rute hasil: courseId yang tidak cocok ditolak, bukan dilayani',
      (await fetch(`${BASE}/results/kursus-tidak-ada/${docHash}`)).status === 404)
  }
}

console.log(`\n${failures === 0 ? 'PROBE SERVE HIJAU' : 'PROBE SERVE MERAH'} — ${ran} pemeriksaan, ${failures} gagal`)
if (skipped.length) {
  console.log(`\n--grup yang DILEWATI (${skipped.length})— angka di atas bukan cakupan penuh--`)
  for (const s of skipped) console.log(`  - ${s}`)
}
process.exitCode = failures === 0 ? 0 : 1
