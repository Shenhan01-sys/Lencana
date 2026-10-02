// Lencana-B128 status=TERBUKA 2026-10-02 — CLI keanggotaan penerbit: kunci penerbit (ISSUER_PRIVATE_KEY) menandatangani pesan hibah/cabut yang menyebut anggota dan wewenangnya, lalu baris ditulis lewat verifikasi yang sama dengan POST /publisher/members. Buktikan ulang: npm run verify:roles. JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
/**
 * `npm run grant:member -- <alamat> [--hire] [--appoint]` — jadikan satu akun anggota penerbit (D63, opsi 2 builder).
 * `npm run grant:member -- <alamat> --revoke`             — cabut keanggotaannya (baris tetap ada sebagai jejak).
 *
 * Dijalankan di mesin yang memegang kunci penerbit, seperti `npm run revoke` dan `npm run issue`: kunci tidak pernah
 * dikirim ke mana pun; yang tersimpan hanya pesan + tanda tangan, supaya hibah bisa diperiksa ulang siapa saja.
 * Asal baris mengikuti LANCENA_ORIGIN (`demo` untuk akun builder, `test` untuk harness).
 * Wewenang yang bisa diberikan: memantau (selalu), menyewa agen penilai (--hire), menunjuk agen pengesah (--appoint).
 * Menerbitkan dan mencabut kredensial tidak termasuk — itu tetap kunci penerbit.
 */
import { randomBytes } from 'node:crypto'
import { isAddress } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'

import { loadFileEnvReport } from '../src/env.js'
import { grantMember, revokeMember, membershipsOf, dbConfigured, dbMissingReason } from '../src/db.js'

await loadFileEnvReport('grant:member')
const env = process.env
const args = process.argv.slice(2)
const who = args.find((a) => !a.startsWith('--'))
if (!who || !isAddress(who)) {
  console.error('pakai: npm run grant:member -- <alamat 0x…> [--hire] [--appoint] | --revoke')
  process.exit(2)
}
if (!dbConfigured()) { console.error(`database belum dikonfigurasi: ${dbMissingReason()}`); process.exit(2) }
if (!env.ISSUER_PRIVATE_KEY || !env.ISSUER_ADDRESS) { console.error('ISSUER_PRIVATE_KEY + ISSUER_ADDRESS diperlukan — hanya kunci penerbit yang memberi keanggotaan'); process.exit(2) }
const publisher = privateKeyToAccount(env.ISSUER_PRIVATE_KEY)
if (publisher.address.toLowerCase() !== env.ISSUER_ADDRESS.toLowerCase()) {
  console.error('ISSUER_PRIVATE_KEY bukan kunci ISSUER_ADDRESS — server akan menolak hibah dari kunci lain')
  process.exit(1)
}

const nonce = randomBytes(10).toString('hex')
const revoke = args.includes('--revoke')
const hire = args.includes('--hire')
const appoint = args.includes('--appoint')
const message = revoke
  ? `lencana-member revoke member=${who.toLowerCase()} nonce=${nonce}`
  : `lencana-member grant member=${who.toLowerCase()} hire=${hire ? 1 : 0} appoint=${appoint ? 1 : 0} nonce=${nonce}`
const signature = await publisher.signMessage({ message })
const out = revoke
  ? await revokeMember({ issuer: publisher.address, member: who, message, signature })
  : await grantMember({ issuer: publisher.address, member: who, canHire: hire, canAppoint: appoint, message, signature })
if (!out.ok) {
  console.error(`DITOLAK: ${out.why}`)
  process.exit(1)
}
console.log(revoke
  ? `dicabut: ${out.member} bukan lagi anggota penerbit ${out.issuer} (sejak ${out.revokedAt})`
  : `diberikan: ${out.member} anggota penerbit ${out.issuer} · sewa agen ${out.canHire ? 'ya' : 'tidak'} · tunjuk agen pengesah ${out.canAppoint ? 'ya' : 'tidak'} · asal ${env.LANCENA_ORIGIN || 'unknown'}`)
console.log(`pesan bertanda tangan: ${message}`)
const active = await membershipsOf(who)
console.log(`keanggotaan aktif alamat ini sekarang (kueri ulang): ${active.length}`)
