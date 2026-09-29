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
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
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

/**
 * Identitas agen yang tersimpan di `.keys/`, tanpa kunci rahasia.
 *
 * Kenapa ini ada (B48): setiap kredensial mencetak `verificationMethod` miliknya sendiri, jadi
 * server yang hanya melayani SATU slug membuat ijazah terbitan slug lain tidak bisa diverifikasi
 * siapa pun di instance itu — gejalanya 404 atas dokumen yang kuncinya jelas-jelas ada di disk,
 * dan dari luar itu kelihatan seperti kredensialnya rusak.
 */
export async function listAgents () {
  let files = []
  try {
    files = await readdir(KEY_DIR)
  } catch {
    return []
  }
  const out = []
  for (const file of files.filter((f) => f.endsWith('.json'))) {
    try {
      const raw = JSON.parse(await readFile(join(KEY_DIR, file), 'utf8'))
      if (!raw.agentSlug || !raw.controller || !raw.publicKeyMultibase || !raw.id) continue
      out.push({
        agentSlug: raw.agentSlug, controller: raw.controller, name: raw.name, id: raw.id,
        // Field ini yang membuat dokumen issuer bisa dipakai verifier. `serve-probe` menangkapnya
        // waktu pertama kali dijalankan: tanpa kunci publik, dokumen yang tersaji itu sah
        // berbentuk tapi tanda tangan siapa pun tidak akan pernah cocok melaluinya.
        publicKeyMultibase: raw.publicKeyMultibase,
      })
    } catch {
      // Berkas rusak bukan alasan mematikan seluruh server: ia tidak disajikan, titik.
    }
  }
  return out.sort((a, b) => a.agentSlug.localeCompare(b.agentSlug))
}

/**
 * Agen yang SAMA di URL yang baru (B65-b/B83).
 *
 * Kenapa perlu dan kenapa satu tempat: `controller` agen mengandung BASE_URL
 * (`http://127.0.0.1:8787/issuers/agent-demo`), jadi kertas yang penerbitnya lahir di host sementara
 * tidak bisa dibuat terbaca publik tanpa memindahkan URL identitasnya. Pemindahan itu sah di dunia
 * DID — identitas yang dipakai verifier adalah **kunci** di `assertionMethod`, dan itu tidak
 * berubah sepribinya — tapi hanya sah kalau semua pihak memakai konstruksi yang sama. Kalau
 * `publish.js` dan `rehost.js` masing-masing merakit string URL, yang satu akan menulis
 * `/issuers/agent-demo#z6Mk…` dan yang satu `/issuers/agent-demo#z6Mk…` dengan selisih slash, dan
 * kegagalannya muncul sebagai "tanda tangan tidak cocok" di tempat orang lain, bukan di tempat
 * kesalahannya.
 *
 * Fungsi ini TIDAK menulis apa pun ke `.keys/`. Berkas kunci tetap menyimpan controller aslinya;
 * turunan ini dipakai saat menyajikan/menandatangani, supaya perintah `agent` (identitas permanen)
 * dan tempat tayang (host tepi) tetap dua hal yang berbeda.
 */
export function agentAt (agent, baseUrl) {
  const base = String(baseUrl ?? '').replace(/\/+$/, '')
  if (!base) throw new Error('agentAt: baseUrl kosong')
  if (!agent?.agentSlug) throw new Error('agentAt: agen tanpa agentSlug')
  const pub = String(agent.publicKeyMultibase ?? '').split('#').pop()
  if (!pub) throw new Error(`agentAt: agen ${agent.agentSlug} tidak punya publicKeyMultibase`)
  const controller = `${base}/issuers/${agent.agentSlug}`
  return { ...agent, controller, publicKeyMultibase: pub, id: `${controller}#${pub}` }
}

/**
 * SATU tempat tinggal identitas untuk semua penyaji (B65-b).
 *
 * Kenapa ini harus satu fungsi: setelah kertas terbitan `agent-demo`/`agent-b41` dipindah ke host
 * tepi, kredensialnya mencetak `issuer.id = https://lencana-edge…/issuers/agent-demo`. Sementara itu
 * server lokal kita — yang juga menyajikan `/issuers/<slug>` — masih merakit dokumennya dari controller
 * di berkas kunci, yaitu `http://127.0.0.1:8787/…`. Hasilnya dua penyaji untuk satu agen dengan
 * `assertionMethod[].id` yang berbeda, dan verifier yang lewat server kita sendiri akan bilang
 * "verification method tidak terdaftar" pada tanda tangan yang sah. `serve-probe` menangkapnya di
 * 29 Sep; penyebabnya bukan rehost-nya, tapi fakta bahwa "identitas" tidak pernah punya satu sumber.
 *
 * Aturan turunannya: `EDGE_BASE_URL` adalah tempat tinggal identitas kalau diisi; tanpa itu kita
 * jatuh ke `BASE_URL` (mesin pengembangan / journey pakai host sementara secara sadar). Berkas
 * `.keys/*.json` TIDAK diubah: ia tetap catatan tempat agen itu LAHIR, dan `listAgents()` membacanya
 * apa adanya — yang menormalkan ke tempat tayang adalah fungsi ini.
 */
export function identityBase (env = process.env) {
  const raw = (env.EDGE_BASE_URL && env.EDGE_BASE_URL.trim()) || (env.BASE_URL ?? '').trim()
  return raw.replace(/\/+$/, '')
}

/** Agen + tempat tayang kanonik — dipakai setiap rute yang menyajikan dokumen penerbit. */
export function agentIdentity (agent, env = process.env) {
  const base = identityBase(env)
  return base ? agentAt(agent, base) : agent
}

/** Dokumen issuer dari field PUBLIK saja — menyajikan identitas tidak membutuhkan kunci rahasia. */
export function issuerDocumentFor (agent) {
  const derived = agent.id === `${agent.controller}#${agent.publicKeyMultibase}` ? agent : agentAt(agent, agent.controller)
  return issuerDocument({
    controller: derived.controller,
    name: derived.name,
    key: { id: derived.id, publicKeyMultibase: derived.publicKeyMultibase },
  })
}
