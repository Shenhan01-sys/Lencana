/**
 * Pembangun dokumen OpenBadgeCredential 3.0.
 *
 * Semua syarat di bawah berasal dari spesifikasi yang DIBACA dari berkas mentah (lihat
 * Vault/Concepts/Open-Badges-3.0.md), bukan dari ingatan — dan tiap butir yang mudah salah
 * sengaja diberi catatan di tempatnya:
 *
 *   - `@context` : urutannya mengikat, dua URI pertama wajib; konteks OB TIDAK memuat
 *     `credentialStatus`/`proof`/`validUntil` — semuanya datang dari konteks W3C.
 *   - `validFrom` wajib, `issuanceDate` SALAH (itu properti VC 1.1).
 *   - `validUntil` adalah padanan kadaluarsa di VC 2.0; `expirationDate` bukan properti VC 2.0.
 *   - `achievement.criteria` WAJIB ada, walau isi di dalamnya boleh kosong.
 *   - `credentialSubject.id` XOR `.identifier` — salah satu wajib.
 *   - `proof.proofPurpose` wajib `assertionMethod`.
 *   - `verificationMethod` boleh URL HTTP biasa (§8.5 "only requires HTTP URL support"),
 *     jadi kita tidak membangun resolver DID.
 *
 * SATU SUMBER UNTUK DUA LAPIS: kadaluarsa dokumen (`validUntil`) dan kadaluarsa attestation
 * (`expirationTime` di BAS) adalah field berbeda di lapis berbeda dan TIDAK otomatis sinkron.
 * Keduanya di sini ditulis dari satu angka yang sama, supaya "kredensial membusuk" tidak
 * pernah berbunyi berbeda di halaman verifikasi dan di validator pihak ketiga.
 */
import { createHash } from 'node:crypto'
import { keccak256, encodePacked, getAddress } from 'viem'
import {
  IndexAllocator, REVOCATION, SUSPENSION, statusEntry,
} from './statusList.js'
import { CREDENTIAL_CONTEXT } from './context.js'

/** Padanan persis `_vcHash()` di CredentialResolver.sol. */
export function credentialHashOf (holderAddress, courseId) {
  const courseIdBytes = typeof courseId === 'string' && courseId.startsWith('0x')
    ? courseId
    : keccak256(new TextEncoder().encode(courseId))
  return keccak256(encodePacked(
    ['string', 'address', 'bytes32'],
    ['vc:', getAddress(holderAddress), courseIdBytes],
  ))
}

const iso = (unixSeconds) => new Date(unixSeconds * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z')

/**
 * @param input.expiresAtUnix SATU angka yang dipakai bersama oleh dokumen dan attestation BAS.
 */
export function buildOpenBadgeCredential (input) {
  const {
    baseUrl, issuer, course, learner, assessment,
    expiresAtUnix, issuedAtUnix, credentialId, uid,
    allocator = new IndexAllocator(),
  } = input

  if (!course?.slug || !course?.name) throw new Error('course.slug dan course.name wajib')
  if (!learner?.address) throw new Error('learner.address wajib (menentukan credentialHash)')
  if (!uid) throw new Error('uid attestation wajib — tanpa itu entri status tidak bisa ditunjuk')
  if (!issuer?.controller) throw new Error('issuer.controller wajib')
  if (expiresAtUnix <= issuedAtUnix) throw new Error('kadaluarsa dokumen harus sesudah terbit')

  const credentialHash = credentialHashOf(learner.address, course.slug)
  const achievementId = `${baseUrl}/achievements/${course.slug}`
  const revocationIndex = allocator.slot(REVOCATION, uid)
  const suspensionIndex = allocator.slot(SUSPENSION, uid)

  return {
    unsigned: {
      '@context': CREDENTIAL_CONTEXT,
      id: credentialId ?? `${baseUrl}/credentials/${credentialHash}`,
      type: ['VerifiableCredential', 'OpenBadgeCredential'],
      issuer: { id: issuer.controller, type: 'Profile', name: issuer.name },
      validFrom: iso(issuedAtUnix),
      // Padanan VC 2.0 dari "kredensial membusuk". `expirationDate` TIDAK dipakai.
      validUntil: iso(expiresAtUnix),
      name: course.name,
      description: course.description ?? course.name,
      credentialSubject: {
        // §9.1: `id` XOR `identifier`. `identifier` di OB3.0 bukan string — ia `IdentityObject`
        // (identityType + identityHash + hashed + salt), dan memakainya berarti kita ikut
        // menentukan skema hashing identitas. Yang kita perlukan di sini lebih sederhana:
        // alamat wallet peserta memang sudah diikat kriptografis, TAPI DI LAPIS CHAIN
        // (`holderOf()` + artefak soulbound), bukan lewat dokumen ini. Jadi `id` berupa URL
        // milik peserta, dan halaman verifikasi yang menunjuk alamat chain-nya.
        id: `${baseUrl}/learners/${getAddress(learner.address)}`,
        type: 'AchievementSubject',
        achievement: {
          id: achievementId,
          type: ['Achievement'],
          name: course.name,
          description: course.description ?? course.name,
          // WAJIB menurut skema, walau `narrative`-nya opsional.
          criteria: {
            id: `${baseUrl}/criteria/${course.slug}`,
            type: 'Criteria',
            // `judgeNote` adalah B44 yang jadi terbaca: sebelum ini "esai 99 dinilai model apa,
            // pada temperature berapa" hanya hidup di log kita, padahal angka itulah yang dicetak
            // di ijazah. Narasi ini ikut ter-canonicalise dan ikut terikat tanda tangan, jadi
            // klaimnya tidak bisa diedit setelah terbit.
            narrative: [course.criteria ?? `Lulus ${course.name}`, assessment?.judgeNote]
              .filter(Boolean).join(' '),
          },
        },
        // 🔴 `Result` OB 3.0 = { achievedLevel?, resultDescription?, status?, value } — itu isi
        // konteks 3.0.3 yang dibaca langsung (node -e di catatan pengembangan). Bentuk OB 2.0
        // (`achievementId`, `identity`, `resultScore`, `statement`) TIDAK ADA di konteks 3.0:
        // jsonld 9 mode-safe membuangnya lalu gagal sebagai "did not expand into an absolute
        // IRI". Nilai masuk ke `value` (skema: schema.org/value), dan `resultDescription`
        // menunjuk deskripsi skalanya di URL rubrik kita.
        result: [{
          id: `${baseUrl}/results/${course.slug}/${credentialHash}`,
          type: ['Result'],
          resultDescription: `${baseUrl}/criteria/${course.slug}#scale`,
          value: String(assessment?.score ?? ''),
          ...(assessment?.achievedLevel
            ? { achievedLevel: String(assessment.achievedLevel) }
            : {}),
        }],
      },
      // SATU objek, bukan dua. Ini koreksi dari hasil `vc.1ed.tech` 27 Sep
      // (`$.credentialStatus: array found, object expected`), dan kita membacanya langsung dari
      // sumbeinya: skema AchievementCredential OB 3.0 memberi branch array untuk `proof`,
      // `credentialSchema`, `termsOfUse` dan `evidence` — tapi TIDAK untuk `credentialStatus`,
      // yang `$defs`-nya `"type": "object"`; tabel datanya menulis [0..1]. VC Data Model 2.0
      // memang mengizinkan himpunan; OB 3.0 mempersempitnya, dan yang memeriksa dokumen kita
      // adalah OB 3.0.
      //
      // Jadi daftar suspension TETAP ada, tetap dibangun dari state chain dan tetap di-anchor —
      // yang berhenti adalah rujukan di dalam kertasnya. Konsekuensinya harus disebut jujur:
      // verifier pihak ketiga yang hanya membaca dokumen tidak akan melihat "agen ini sedang
      // di-delisting"; mereka melihatnya lewat `statusOf` kita (rantai) atau tidak sama sekali.
      // Klaim "dua status list" di halaman mana pun tidak boleh dibaca sebagai "dua entri di
      // dalam kredensial".
      credentialStatus: statusEntry({ baseUrl, purpose: REVOCATION, index: revocationIndex, uid }),
    },
    credentialHash,
    indices: { revocation: revocationIndex, suspension: suspensionIndex },
  }
}

/** SHA-256 dari bitstring yang disajikan — dipakai bersama BAS `timestamp()` (lihat D24.1). */
export function sha256Hex (text) {
  return createHash('sha256').update(text, 'utf8').digest('hex')
}
