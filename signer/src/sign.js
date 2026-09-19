/**
 * Tanda tangan Data Integrity (`eddsa-rdfc-2022`) + pemuat dokumen JSON-LD.
 *
 * Kenapa pembungkusnya setipis ini: kami tidak ingin menjadi implementasi kanonialisasi RDFC.
 * Yang kami jaga cuma dua hal — suite-nya benar-benar `DataIntegrityProof` +
 * `eddsa-rdfc-2022` (bukan `Ed25519Signature2020`, yang TIDAK ada di daftar sertifikasi OB3.0),
 * dan `AssertionProofPurpose` benar-benar membaca dokumen issuer kami. Yang terakhir itu penting
 * secara makna: kalau kunci yang menandatangani tidak tercantum di `assertionMethod` dokumen
 * issuer, verifikasi harus GAGAL. Itu padanan di lapis dokumen dari whitelist penerbit di
 * lapis chain — dua-duanya harus menolak, karena verifier standar hanya melihat yang pertama.
 */
import * as jsigsModule from 'jsonld-signatures'
import jsonld from 'jsonld'
import { DataIntegrityProof } from '@digitalbazaar/data-integrity'
import { cryptosuite as eddsaRdfc2022 } from '@digitalbazaar/eddsa-rdfc-2022-cryptosuite'

// paket ini CommonJS; di bawah ESM Node kadang menaruh segalanya di `default`.
const jsigs = jsigsModule.default ?? jsigsModule

const CRYPTOSUITE_NAME = 'eddsa-rdfc-2022'

// `DataIntegrityProof` tidak menerima "key" biasa: ia dibangun dengan `signer` (objek
// `{sign({data})}`), dan saat verifikasi ia membangun verifier DARI KUNCI YANG DIPUBLIKASI di
// bukti itu (`createVerifier({verificationMethod})`). Itu lebih jujur daripada menyerahkan kunci
// ke pemanggil `verify()` — verifikasi tidak bisa dibohongi oleh kunci yang salah kita sodorkan.
const signSuite = (key) => new DataIntegrityProof({ cryptosuite: eddsaRdfc2022, signer: key.signer() })
const verifySuite = () => new DataIntegrityProof({ cryptosuite: eddsaRdfc2022 })

// `AssertionProofPurpose` menuntut `controller` berupa DOKUMEN, bukan URL string ( konstruktornya
// melempar TypeError kalau diberi string ). Memberikan dokumennya secara eksplisit juga membuat
// parameter `controllerDocument` di bawah jujur: pemanggil yang menentukan kunci mana yang
// dianggap sah, jadi uji "kunci tidak terdaftar" tidak butuh jaringan sama sekali.
const assertionPurpose = (controllerDocument) =>
  new jsigs.purposes.AssertionProofPurpose({ controller: controllerDocument })

/**
 * Pemuat dokumen JSON-LD.
 *
 * Bentuknya FUNGSI (bukan objek `{ documentLoader }`) — jsonld-signatures memanggilnya sebagai
 * `documentLoader(url)` dan memberi pesan yang menyesatkan kalau kita serahkan pembungkus.
 * `put` ditempel ke fungsinya supaya pemanggil tetap bisa mendaftarkan URL baru setelah dibuat.
 *
 * URL kami sendiri (dokumen issuer, daftar status) dilayani dari memori — bukan dari jaringan —
 * supaya verifikasi bisa offline dan deterministik. Konteks milik W3C/1EdTech lewat pemuat
 * bawaan jsonld; kalau nanti perlu benar-benar offline, tempat men-vendor-nya di sini.
 */
export function makeDocumentLoader (documents = {}) {
  const urls = new Map(Object.entries(documents))
  const documentLoader = async (url) => {
    // `proof.verificationMethod` adalah URL BER-FRAGMEN
    // (https://.../issuers/agent#z6Mk...). Yang bisa kita sajikan adalah dokumen
    // issuer-nya, jadi fragmen dipecah dulu dan kunci yang diminta diambil dari daftar
    // `assertionMethod`. Tanpa ini verifikasi gagal dengan "fetch failed" pada domain
    // contoh — pesan yang terlihat seperti masalah jaringan, padahal bukan.
    const hash = url.indexOf('#')
    const base = hash === -1 ? url : url.slice(0, hash)
    if (urls.has(base)) {
      const doc = urls.get(base)
      if (hash === -1) return { contextUrl: null, document: structuredClone(doc), url }
      const listed = [
        ...(doc.assertionMethod ?? []),
        ...(doc.capabilityDelegation ?? []),
      ]
      const vm = listed.find((entry) => typeof entry === 'object' && entry.id === url)
      if (!vm) {
        // Sengaja dikembalikan TANPA dokumen: verifikasi akan gagal, dan itu benar —
        // kunci itu memang tidak lagi kami akui.
        return undefined
      }
      return { contextUrl: null, document: structuredClone(vm), url }
    }
    return jsonld.documentLoader(url)
  }
  documentLoader.put = (url, doc) => { urls.set(url, doc) }
  documentLoader.has = (url) => urls.has(url)
  return documentLoader
}

export async function signDocument (document, { key, controllerDocument, documentLoader }) {
  const signed = await jsigs.sign(structuredClone(document), {
    suite: signSuite(key),
    key,
    purpose: assertionPurpose(controllerDocument),
    verificationMethod: key.id,
    documentLoader,
  })
  const proof = Array.isArray(signed.proof) ? signed.proof[0] : signed.proof
  // Guard terhadap salah-ejaan yang paling mungkin terjadi dan paling sepi: cryptosuite lain
  // tetap "berhasil" secara teknis tapi ditolak validator.
  if (proof?.type !== 'DataIntegrityProof' || proof?.cryptosuite !== CRYPTOSUITE_NAME) {
    throw new Error(`suite menghasilkan proof.type=${proof?.type} cryptosuite=${proof?.cryptosuite}`)
  }
  return signed
}

/**
 * Verifikasi TANPA diberi kunci: kunci dibaca dari `proof.verificationMethod` lewat dokumen
 * issuer, jadi pemanggil tidak bisa "membantu" hasilnya dengan menyodorkan kunci yang benar.
 */
export async function verifyDocument (document, { controllerDocument, documentLoader }) {
  const result = await jsigs.verify(document, {
    suite: verifySuite(),
    purpose: assertionPurpose(controllerDocument),
    documentLoader,
  })
  return { verified: result.verified === true, raw: result }
}

export { CRYPTOSUITE_NAME }
