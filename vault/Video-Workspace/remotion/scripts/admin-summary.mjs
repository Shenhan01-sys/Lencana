// B173 — read the REAL platform summary (the numbers the Admin belt draws) from a signer that lists the
// fixture as admin, and keep only `summary` (no addresses, no trail, no health) in src/data/admin-summary.json.
//   ADMIN_KEYS=<file with "A_admin 0x<key> ..."> node scripts/admin-summary.mjs [http://127.0.0.1:8787]
import fs from 'node:fs'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const { privateKeyToAccount } = createRequire(path.resolve(ROOT, '../../../signer/package.json'))('viem/accounts')
const url = process.argv[2] || 'http://127.0.0.1:8787'
const line = fs.readFileSync(process.env.ADMIN_KEYS, 'utf8').split(/\r?\n/).find((l) => l.startsWith('A_admin '))
const acct = privateKeyToAccount(line.match(/0x[0-9a-fA-F]{64}/)[0])
const message = `lencana-admin overview nonce=${randomBytes(10).toString('hex')}`
const signature = await acct.signMessage({ message })
const r = await fetch(url + '/admin/overview', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ admin: acct.address, message, signature }) })
const j = await r.json()
if (!r.ok || !j.summary) { console.log('status', r.status, JSON.stringify(j).slice(0, 300)); process.exit(1) }
const out = { readAt: new Date().toISOString(), source: 'POST /admin/overview (summary only), production database, rows origin=test excluded', summary: j.summary }
fs.writeFileSync(path.join(ROOT, 'src/data/admin-summary.json'), JSON.stringify(out, null, 1) + '\n')
const s = j.summary
console.log(`courses ${s.courses?.total}/${s.courses?.listed} · learners ${JSON.stringify(s.learners)} · essays ${JSON.stringify(s.essays?.pipeline)} · agents ${JSON.stringify(s.agents)} · money ${JSON.stringify(s.money)}`)
