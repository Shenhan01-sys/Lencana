// Smoke test: apakah rantai DataIntegrityProof + eddsa-rdfc-2022 benar-benar menandatangani
// dan memverifikasi dokumen berbentuk seperti VC, DAN bagaimana bentuk modulnya saat diimpor
// sebagai ESM. Dijalankan lebih dulu daripada menulis src/ — kalau asumsi import salah,
// lebih murah tahu sekarang.
//
//   node scripts/smoke.mjs
import * as jsigs from 'jsonld-signatures'
import { DataIntegrityProof } from '@digitalbazaar/data-integrity'
import { cryptosuite as eddsaRdfc2022 } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite'
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey'

const pick = (m) => (m && m.default && !m.sign ? m.default : m)
const jsigsNs = pick(jsigs)

console.log('jsigs keys      :', Object.keys(jsigsNs).join(', '))
console.log('cryptosuite name:', eddsaRdfc2022.name, '| algorithm:', eddsaRdfc2022.requiredAlgorithm)

const controller = 'https://lencana.example/issuers/agent-demo'
const raw = await Ed25519Multikey.generate()
const key = await Ed25519Multikey.from({
  ...raw,
  id: `${controller}#${raw.publicKeyMultibase}`,
  controller,
})
console.log('verificationMethod:', key.id)

const doc = {
  '@context': ['https://www.w3.org/ns/credentials/v2', 'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json'],
  id: 'https://lencana.example/credentials/demo-1',
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  issuer: { id: controller, type: 'Profile', name: 'Demo Issuer' },
  validFrom: '2026-09-19T00:00:00Z',
  credentialSubject: {
    id: 'did:key:zDemoHolder',
    type: 'AchievementSubject',
    achievement: {
      id: 'https://lencana.example/achievements/web3-dasar',
      type: ['Achievement'],
      name: 'Web3 Dasar',
      description: 'Lulus kursus dasar',
      criteria: { id: 'https://lencana.example/rubrics/web3-dasar', type: 'Criteria', narrative: 'Nilai >= 70' },
    },
  },
}

const suite = () => new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 })
const purpose = () => new jsigsNs.purposes.AssertionProofPurpose({ controller })

const signed = await jsigsNs.sign(doc, {
  suite: suite(),
  key,
  purpose: purpose(),
  verificationMethod: key.id,
})
const proof = Array.isArray(signed.proof) ? signed.proof[0] : signed.proof
console.log('proof.type      :', proof.type)
console.log('proof.cryptosuite:', proof.cryptosuite)
console.log('proof.purpose   :', proof.proofPurpose)
console.log('proofValue len  :', String(proof.proofValue).length, '| starts z (multibase base58btc):', proof.proofValue.startsWith('z'))

const verifyOpts = () => ({ suite: suite(), key, purpose: purpose(), verificationMethod: key.id })

const result = await jsigsNs.verify(signed, verifyOpts())
console.log('verify ok       :', result.verified)
if (!result.verified) console.log('errors          :', JSON.stringify(result.results ?? result.error, null, 2))

// Tanda tangan harus mati kalau satu bit isi berubah — ini yang membuat "dapat diverifikasi"
// bukan sekadar kata-kata.
const tampered = JSON.parse(JSON.stringify(signed))
tampered.credentialSubject.achievement.name = 'Web3 Dasar (diubah)'
const tamperedResult = await jsigsNs.verify(tampered, verifyOpts())
console.log('tampered verified:', tamperedResult.verified, '(harus false)')
