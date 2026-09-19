/**
 * Kunci penandatangan dokumen + dokumen issuer.
 *
 * DUA KUNCI, dan itu bukan kebetulan (D30/D31):
 *   - EOA secp256k1 agen  -> yang tercatat sebagai `attester` di BAS, dan yang menandatangani
 *     delegasi penerbitan. Sudah dibuktikan 8 fork test.
 *   - Ed25519 agen        -> yang menandatangani dokumen OpenBadgeCredential (cryptosuite
 *     `eddsa-rdfc-2022`, satu-satunya yang ada di daftar sertifikasi OB3.0 untuk penerbit
 *     bertenaga EdDSA). Verifier standar TIDAK membaca chain, jadi kunci inilah yang mereka
 *     periksa.
 * Keduanya terhubung lewat URL dokumen issuer yang kita hidangkan sendiri — spesifikasi §8.5
 * hanya mewajibkan dukungan URL HTTP, jadi resolver DID tidak kita bangun.
 *
 * Kenapa JavaScript dan bukan TypeScript seperti `web/`: `web/` adalah halaman statis yang
 * typenya dijaga `tsc`. Di sini batas sistemnya adalah pustaka JSON-LD yang tidak punya tipe
 * resmi; memaksakan TS berarti menulis deklarasi tangan untuk setiap simbol yang kita pakai —
 * ceremony tanpa bukti tambahan. Yang menjaga kebenaran di paket ini adalah `npm run check`.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as Ed25519Multikey from '@digitalbazaar/ed25519-multikey'
import { VC_V2_CONTEXT, DATA_INTEGRITY_V2_CONTEXT, MULTIKEY_V1_CONTEXT } from './context.js'

const HERE = dirname(fileURLToPath(import.meta.url))
export const KEY_DIR = join(HERE, '..', '.keys')

/**
 * Multikey Ed25519 + dokumen issuer-nya.
 * @param {string} baseUrl URL publik tempat backend ini dihidangkan
 * @param {string} agentSlug identitas agen dalam URL
 */
export async function createIssuerKey ({ baseUrl, agentSlug, name = 'Lencana Demo Agent' }) {
  const controller = `${baseUrl}/issuers/${agentSlug}`
  const raw = await Ed25519Multikey.generate()
  const key = await Ed25519Multikey.from({
    ...raw,
    id: `${controller}#${raw.publicKeyMultibase}`,
    controller,
  })
  return { key, controller, name, agentSlug }
}

/**
 * Dokumen issuer (W3C VC Data Model 2.0 `did-url`/HTTP-URL verification method).
 *
 * `assertionMethod` di sini yang dibaca `AssertionProofPurpose` saat memverifikasi: kalau
 * kunci yang menandatangani tidak ada di daftarnya, verifikasi GAGAL — jadi daftar ini bukan
 * hiasan, dan itulah yang membuat "siapa yang boleh menerbitkan" tetap berlaku di lapis
 * dokumen, bukan cuma di whitelist chain.
 */
export function issuerDocument ({ controller, name, key }) {
  return {
    '@context': [VC_V2_CONTEXT, DATA_INTEGRITY_V2_CONTEXT, MULTIKEY_V1_CONTEXT],
    id: controller,
    type: ['Profile'],
    name,
    assertionMethod: [
      {
        id: key.id,
        type: 'Multikey',
        controller,
        publicKeyMultibase: key.publicKeyMultibase,
      },
    ],
  }
}

/** Simpan kunci privately-encoded sebagai teks biasa DI DISK. Untuk demo testnet. */
export async function saveKey ({ agentSlug, key, controller, name }) {
  await mkdir(KEY_DIR, { recursive: true })
  const path = join(KEY_DIR, `${agentSlug}.json`)
  await writeFile(path, JSON.stringify({
    agentSlug, controller, name,
    id: key.id,
    publicKeyMultibase: key.publicKeyMultibase,
    secretKeyMultibase: key.secretKeyMultibase,
    // Jujur di file ini sendiri: kunci testnet. Bukan tempat menyimpan kunci produksi.
    warning: 'testnet-only demo key; production belongs in a KMS/HSM, not this directory',
  }, null, 2), 'utf8')
  return path
}

export async function loadKey (agentSlug) {
  const raw = JSON.parse(await readFile(join(KEY_DIR, `${agentSlug}.json`), 'utf8'))
  const key = await Ed25519Multikey.from(raw)
  return { key, controller: raw.controller, name: raw.name, agentSlug: raw.agentSlug }
}
