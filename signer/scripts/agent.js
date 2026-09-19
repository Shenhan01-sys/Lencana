/**
 * Menyediakan kunci dokumen untuk agen demo, lalu mencetak URL yang harus dibuka verifier.
 *
 *   node scripts/agent.js                 # membuat .keys/agent-demo.json kalau belum ada
 *   node scripts/agent.js --slug agen-2   # agen lain
 *
 * Kenapa perlu skrip (bukan dibuat otomatis oleh server): kunci yang diterbitkan diam-diam oleh
 * proses yang sedang berjalan adalah kunci yang tidak ada yang tahu harus dicadangkan ke mana.
 * Di sini pembuatannya eksplisit dan outputnya adalah alamat yang bisa ditempel.
 */
import { createIssuerKey, issuerDocument, saveKey, loadKey } from '../src/issuer.js'

const argv = process.argv.slice(2)
const slugAt = argv.indexOf('--slug')
const slug = slugAt === -1 ? 'agent-demo' : argv[slugAt + 1]
const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:8787'

let agent
try {
  agent = await loadKey(slug)
  console.log(`sudah ada: ${slug} (tidak ditimpa)`)
} catch {
  agent = await createIssuerKey({ baseUrl, agentSlug: slug })
  const path = await saveKey(agent)
  console.log(`dibuat: ${path}`)
}

const doc = issuerDocument(agent)
console.log(`verificationMethod : ${doc.assertionMethod[0].id}`)
console.log(`issuer document    : ${agent.controller}`)
console.log(`testnet-only key — produksi tempatnya di KMS/HSM, bukan di .keys/`)
