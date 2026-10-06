/**
 * `src/account.js` — peran efektif satu akun (B131, D66): satu akun nyata = satu peran; akun dev (dummy builder) boleh
 * memegang semua kursi menurut fakta. Dipakai server (rute) dan CLI platform (`grant:member`, `agent:mint`) supaya
 * aturannya satu, bukan disalin.
 *
 * Urutan (sama dengan kepala `supabase/migrations/0016_account_roles.sql`):
 *   1. `account_roles.dev`                → akun pengembang (role null, via 'dev');
 *   2. alamat = kunci penerbit            → Penerbit, via 'issuer';
 *   3. `account_roles.role`               → pilihan bertanda tangan akun itu, via 'chosen';
 *   4. sudah punya enrollment             → Peserta, via 'records' (akun lama yang sudah belajar);
 *   5. keanggotaan aktif penerbit         → Penerbit, via 'membership';
 *   6. `ownsAgent(alamat)` (opsional)     → Agent Owner, via 'agents' — butuh bacaan chain, jadi hanya dipakai bila diminta;
 *   7. selain itu                         → role null: belum berperan, boleh memilih.
 * Rekaman (4) mendahului fakta (5, 6): akun yang sudah belajar tetap Peserta walau seseorang memindahkan NFT agen ke dompetnya.
 */
// Lencana-B131 status=SELESAI 2026-10-03 — peran efektif akun dari pilihan bertanda tangan, rekaman, dan fakta; aksi peran lain ditolak kecuali akun dev. Buktikan ulang: npm run verify:account. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress } from 'viem'
import { accountRoleRow, hasEnrollment, membershipsOf } from './db.js'

/**
 * @param {string} address
 * @param {{ issuer?: string|null, ownsAgent?: ((addr: string) => Promise<boolean>)|null }} [opts]
 * @returns {Promise<{ address: string, role: 'learner'|'publisher'|'owner'|null, via: string|null, dev: boolean, canChoose: boolean, chosenAt: string|null }>}
 */
export async function accountOf (address, { issuer = null, ownsAgent = null } = {}) {
  const addr = getAddress(String(address).toLowerCase())
  const out = (role, via, extra = {}) => ({ address: addr, role, via, dev: false, canChoose: false, chosenAt: null, ...extra })
  const row = await accountRoleRow(addr)
  if (row?.dev) return out(null, 'dev', { dev: true })
  if (issuer && addr.toLowerCase() === String(issuer).toLowerCase()) return out('publisher', 'issuer')
  if (row?.role) return out(row.role, 'chosen', { chosenAt: row.chosen_at })
  if (await hasEnrollment(addr)) return out('learner', 'records')
  if (issuer && (await membershipsOf(addr)).some((m) => String(m.issuer).toLowerCase() === String(issuer).toLowerCase())) {
    return out('publisher', 'membership')
  }
  if (ownsAgent && await ownsAgent(addr)) return out('owner', 'agents')
  return out(null, null, { canChoose: true })
}

const ROLE_NAME = { learner: 'learner', publisher: 'publisher', owner: 'Agent Owner' }

/**
 * Alasan menolak aksi peran `want` untuk akun ini, atau null kalau boleh. Akun dev dan akun yang belum berperan tidak
 * ditolak di sini — untuk yang belum berperan, fakta kursinya (keanggotaan, ownerOf) tetap diperiksa rutenya sendiri.
 */
export function roleRefusal (account, want) {
  if (account.dev || !account.role || account.role === want) return null
  return `this account holds the ${ROLE_NAME[account.role]} role — one account holds one role, so ${ROLE_NAME[want]} actions are refused`
}
