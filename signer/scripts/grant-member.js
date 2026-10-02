// Lencana-B128 status=TERBUKA 2026-10-02 — CLI keanggotaan penerbit: kunci penerbit (ISSUER_PRIVATE_KEY) menandatangani pesan hibah/cabut yang menyebut anggota dan wewenangnya, lalu baris ditulis lewat verifikasi yang sama dengan POST /publisher/members. Buktikan ulang: npm run verify:roles. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B129 status=TERBUKA 2026-10-02 — CLI yang sama memutuskan pengajuan: --list menampilkan pengajuan yang menunggu, hibah menyetujuinya, --reject menolaknya dengan pesan bertanda tangan kunci penerbit. Buktikan ulang: npm run verify:publisher. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run grant:member -- --list`                         — pengajuan anggota yang menunggu keputusan (B129).
 * `npm run grant:member -- <alamat> [--hire] [--appoint]`   — jadikan satu akun anggota penerbit (D63, opsi 2 builder);
 *                                                             kalau akun itu mengajukan, pengajuannya tertutup `approved`.
 * `npm run grant:member -- <alamat> --reject`               — tolak pengajuan akun itu (B129).
 * `npm run grant:member -- <alamat> --revoke`               — cabut keanggotaannya (baris tetap ada sebagai jejak).
 *
 * Dijalankan di mesin yang memegang kunci penerbit, seperti `npm run revoke` dan `npm run issue`: kunci tidak pernah
 * dikirim ke mana pun; yang tersimpan hanya pesan + tanda tangan, supaya keputusan bisa diperiksa ulang siapa saja.
 * Asal baris mengikuti LANCENA_ORIGIN (`demo` untuk akun builder, `test` untuk harness).
 * Wewenang yang bisa diberikan: memantau (selalu), menyewa agen penilai (--hire), menunjuk agen pengesah (--appoint).
 * Menerbitkan dan mencabut kredensial tidak termasuk — itu tetap kunci penerbit.
 */
import { randomBytes } from 'node:crypto'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { grantMember, revokeMember, membershipsOf, pendingRequests, rejectRequest, dbConfigured, dbMissingReason } from '../src/db.js'
import { accountOf, roleRefusal } from '../src/account.js'

await loadFileEnvReport('grant:member')
const env = process.env
const args = process.argv.slice(2)
if (!dbConfigured()) { console.error(`database belum dikonfigurasi: ${dbMissingReason()}`); process.exit(2) }
if (!env.ISSUER_PRIVATE_KEY || !env.ISSUER_ADDRESS) { console.error('ISSUER_PRIVATE_KEY + ISSUER_ADDRESS diperlukan — hanya kunci penerbit yang memutuskan keanggotaan'); process.exit(2) }
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
if (publisher.address.toLowerCase() !== env.ISSUER_ADDRESS.toLowerCase()) {
  console.error('ISSUER_PRIVATE_KEY bukan kunci ISSUER_ADDRESS — server akan menolak keputusan dari kunci lain')
  process.exit(1)
}

if (args.includes('--list')) {
  const rows = await pendingRequests(publisher.address)
  console.log(`pengajuan menunggu untuk penerbit ${publisher.address}: ${rows.length}`)
  for (const r of rows) {
    console.log(`  ${r.applicant}  diajukan ${new Date(r.created_at).toISOString()}  asal ${r.origin}${r.note ? `  catatan: ${String(r.note).replace(/\s+/g, ' ').slice(0, 120)}` : ''}`)
  }
  if (rows.length) console.log('\nsetujui: npm run grant:member -- <alamat> [--hire] [--appoint]   ·   tolak: npm run grant:member -- <alamat> --reject')
  process.exit(0)
}

const who = args.find((a) => !a.startsWith('--'))
if (!who || !isAddress(who)) {
  console.error('pakai: npm run grant:member -- --list | <alamat 0x…> [--hire] [--appoint] | <alamat> --reject | <alamat> --revoke')
  process.exit(2)
}

const nonce = randomBytes(10).toString('hex')
const revoke = args.includes('--revoke')
const reject = args.includes('--reject')
// B131 (D66): satu akun nyata satu peran — keanggotaan hanya untuk akun berperan Penerbit, yang belum berperan, atau akun dev.
if (!revoke && !reject) {
  const acct = await accountOf(who, { issuer: publisher.address })
  const refused = roleRefusal(acct, 'publisher')
  if (refused) { console.error(`DITOLAK: ${refused} (peran ${acct.role} lewat ${acct.via})`); process.exit(1) }
}
const hire = args.includes('--hire')
const appoint = args.includes('--appoint')
const message = revoke
  ? `lencana-member revoke member=${who.toLowerCase()} nonce=${nonce}`
  : reject
    ? `lencana-member reject member=${who.toLowerCase()} nonce=${nonce}`
    : `lencana-member grant member=${who.toLowerCase()} hire=${hire ? 1 : 0} appoint=${appoint ? 1 : 0} nonce=${nonce}`
const signature = await publisher.signMessage({ message })
const out = revoke
  ? await revokeMember({ issuer: publisher.address, member: who, message, signature })
  : reject
    ? await rejectRequest({ issuer: publisher.address, applicant: who, message, signature })
    : await grantMember({ issuer: publisher.address, member: who, canHire: hire, canAppoint: appoint, message, signature })
if (!out.ok) {
  console.error(`DITOLAK: ${out.why}`)
  process.exit(1)
}
console.log(revoke
  ? `dicabut: ${out.member} bukan lagi anggota penerbit ${out.issuer} (sejak ${out.revokedAt})`
  : reject
    ? `ditolak: pengajuan ${who} (#${out.request?.id}) — tidak ada kursi yang berubah`
    : `diberikan: ${out.member} anggota penerbit ${out.issuer} · sewa agen ${out.canHire ? 'ya' : 'tidak'} · tunjuk agen pengesah ${out.canAppoint ? 'ya' : 'tidak'} · asal ${env.LANCENA_ORIGIN || 'unknown'}${out.approvedRequest ? ` · pengajuan #${out.approvedRequest} disetujui` : ''}`)
console.log(`pesan bertanda tangan: ${message}`)
const active = await membershipsOf(who)
console.log(`keanggotaan aktif alamat ini sekarang (kueri ulang): ${active.length}`)
