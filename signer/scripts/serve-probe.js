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
import { REVOCATION, SUSPENSION, decodeBit } from '../src/statusList.js'

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:8787'
const SLUG = process.env.AGENT_SLUG ?? 'agent-demo'
const EXPECT_REVOKED = (process.env.EXPECT_REVOKED ?? '').split(',').filter(Boolean)
const EXPECT_SUSPENDED = (process.env.EXPECT_SUSPENDED ?? '').split(',').filter(Boolean)
const EXPECT_CLEAN = (process.env.EXPECT_CLEAN ?? '').split(',').filter(Boolean)

let ran = 0
let failures = 0
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
  console.log('\nLEWAT pemeriksaan bit: isi EXPECT_REVOKED / EXPECT_SUSPENDED / EXPECT_CLEAN dengan uid')
} else {
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

console.log(`\n${failures === 0 ? 'PROBE SERVE HIJAU' : 'PROBE SERVE MERAH'} — ${ran} pemeriksaan, ${failures} gagal`)
process.exitCode = failures === 0 ? 0 : 1
