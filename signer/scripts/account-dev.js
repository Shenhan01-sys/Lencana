/**
 * `npm run account:dev -- --list | <alamat> [--note "…"] [--off] [--apply]` — tandai atau lepas akun dev (B131, D66).
 *
 * Keputusan builder 2 Okt malam: "toggle switching role dikasih ke akun dummy saya aja … di real life tiap user hanya boleh
 * pegang 1 role". Akun dev memegang setiap kursi yang diberikan faktanya (kunci penerbit / keanggotaan / ownerOf) dan
 * melihat pemilih kursi; akun lain memegang satu peran yang ia pilih sekali. Tanda ini hanya ditulis lewat CLI ini
 * (secret key database di mesin platform) — tidak ada rute HTTP yang bisa menjadikan sebuah akun dev.
 *
 * Tanpa `--apply` hanya rencana. `--off` melepas tanda dev; pilihan peran yang sudah ditandatangani akun itu tetap ada.
 */
// Lencana-B131 status=TERBUKA 2026-10-03 — akun dev (dummy builder) ditandai lewat CLI platform saja; akun lain satu peran. Buktikan ulang: npm run verify:account. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress, isAddress } from 'viem'
import { loadFileEnvReport } from '../src/env.js'
import { setDevAccount, accountRoleRow, devAccounts, dbConfigured, dbMissingReason } from '../src/db.js'
import { accountOf } from '../src/account.js'

await loadFileEnvReport('account:dev')
const args = process.argv.slice(2)
const arg = (n) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }
if (!dbConfigured()) { console.error(`database belum dikonfigurasi: ${dbMissingReason()}`); process.exit(2) }
const issuer = process.env.ISSUER_ADDRESS || null

if (args.includes('--list')) {
  const rows = await devAccounts()
  console.log(`akun dev: ${rows.length}`)
  for (const r of rows) console.log(`  ${r.address}  peran dipilih: ${r.role ?? '—'}  asal ${r.origin}${r.dev_note ? `  catatan: ${r.dev_note}` : ''}`)
  process.exit(0)
}

const note = arg('note') ?? null
const who = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--note')
if (!who || !isAddress(who)) { console.error('pakai: npm run account:dev -- --list | <alamat 0x…> [--note "…"] [--off] [--apply]'); process.exit(2) }
if (note && note.length > 120) { console.error('--note paling banyak 120 karakter'); process.exit(2) }
const addr = getAddress(who.toLowerCase())
const off = args.includes('--off')

const before = await accountOf(addr, { issuer })
console.log(`akun ${addr}: peran sekarang ${before.dev ? 'DEV (semua kursi menurut fakta)' : (before.role ?? 'belum berperan')}${before.via && !before.dev ? ` lewat ${before.via}` : ''}`)
if (!args.includes('--apply')) {
  console.log(`rencana: ${off ? 'lepas tanda dev' : 'tandai sebagai akun dev'}${note ? ` (catatan: ${note})` : ''} — tanpa --apply tidak ada yang ditulis`)
  process.exit(0)
}
await setDevAccount({ address: addr, dev: !off, note })
const row = await accountRoleRow(addr)
const after = await accountOf(addr, { issuer })
console.log(`ditulis: baris ${row ? `dev=${row.dev} peran=${row.role ?? '—'}` : 'tidak ada'} · peran efektif sekarang (kueri ulang): ${after.dev ? 'DEV' : (after.role ?? 'belum berperan')}`)
