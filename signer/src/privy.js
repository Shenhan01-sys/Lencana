/**
 * `src/privy.js` — login peserta lewat Privy, sisi server (B82, keputusan builder D57, 1 Okt).
 *
 * Yang TIDAK berubah dan sengaja: setiap tulisan atas nama peserta tetap butuh tanda tangan EIP-191
 * atas nonce satu-kali (`db.js:authorizeLearner`). Login Privy memberi peserta dompet tertanam yang
 * sama di perangkat mana pun — dompet itulah yang menandatangani. Server tidak menukar tanda tangan
 * dengan token sesi.
 *
 * Yang ditambahkan modul ini hanya satu langkah: `POST /auth/privy` membuktikan bahwa alamat peserta
 * adalah dompet tertanam milik akun yang login, lalu mencatat ikatannya (`learner_accounts`). Dua
 * pemeriksaan, keduanya memakai app secret dan tidak pernah memercayai kiriman klien:
 *   1. access token diverifikasi (tanda tangan Privy, app ID kita, belum kedaluwarsa);
 *   2. user token itu dibaca ulang dari API Privy, dan alamatnya harus ada di akun tertautnya sebagai
 *      dompet Ethereum yang dibuat Privy (`wallet_client_type: 'privy'`).
 *
 * App secret hanya dibaca dari lingkungan server (`PRIVY_APP_SECRET`, `app/.env`) — tidak pernah
 * dicetak, tidak pernah dikirim ke klien, dan tidak boleh ditaruh di bawah nama `VITE_*`.
 */

// Lencana-B82 status=SELESAI 2026-10-01 — verifikasi login Privy di server: token diverifikasi dengan app secret, kepemilikan dompet tertanam dibaca ulang dari API Privy, baru alamat diikat; yang belum: uji dua peramban oleh builder (alamat sama sesudah login ulang). Buktikan ulang: npm run verify:privy. JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { getAddress, isAddress } from 'viem'
import { PrivyClient } from '@privy-io/node'

import { bindLearnerAccount } from './db.js'

const fail = (status, why) => ({ ok: false, status, why })

export function privyConfigured () {
  return Boolean(process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET)
}

let client = null
function privy () {
  if (!client) client = new PrivyClient({ appId: process.env.PRIVY_APP_ID, appSecret: process.env.PRIVY_APP_SECRET })
  return client
}

/**
 * Dompet Ethereum tertanam (dibuat Privy) di akun tertaut user. Bentuknya menurut tipe SDK 0.35.0
 * (`LinkedAccountEthereumEmbeddedWallet`): `connector_type 'embedded'` + `wallet_client 'privy'`.
 * Dompet eksternal yang ditautkan lewat Privy berbentuk `wallet_client 'unknown'` dan TIDAK dihitung —
 * halaman ini punya jalur sendiri untuk dompet ekstensi, dan tabel ikatan hanya menerima 'privy-embedded'.
 */
export function embeddedEthereumWallets (user) {
  return (user?.linked_accounts ?? []).filter((a) => a?.type === 'wallet' && a?.chain_type === 'ethereum'
    && a?.connector_type === 'embedded' && a?.wallet_client === 'privy' && isAddress(String(a?.address ?? '')))
}

/**
 * `POST /auth/privy` — { learner, accessToken } → ikatan alamat ↔ akun Privy.
 * 400 bentuk kiriman salah · 401 token tidak sah · 403 alamat bukan dompet tertanam user itu ·
 * 409 alamat sudah terikat ke akun lain · 200 terikat.
 */
export async function linkPrivyLearner ({ learner, accessToken }) {
  if (!isAddress(String(learner ?? ''))) return fail(400, 'requires learner (a 20-byte address)')
  if (typeof accessToken !== 'string' || accessToken.split('.').length !== 3) return fail(400, 'requires accessToken (a Privy access token)')
  let claims
  try {
    claims = await privy().utils().auth().verifyAccessToken(accessToken)
  } catch (e) {
    return fail(401, `access token rejected: ${String(e?.message ?? e).slice(0, 120)}`)
  }
  if (claims?.app_id !== process.env.PRIVY_APP_ID) return fail(401, 'access token was issued for a different Privy app')
  let user
  try {
    user = await privy().users()._get(claims.user_id)
  } catch (e) {
    return fail(502, `could not read the Privy user: ${String(e?.message ?? e).slice(0, 120)}`)
  }
  const wallets = embeddedEthereumWallets(user)
  const addr = getAddress(learner)
  if (!wallets.some((w) => getAddress(w.address) === addr)) {
    return fail(403, `learner ${addr} is not an embedded wallet of the logged-in Privy user`)
  }
  const bound = await bindLearnerAccount({ learner: addr, accountId: claims.user_id })
  if (!bound.ok) return fail(bound.kind === 'conflict' ? 409 : 422, bound.why)
  return { ok: true, status: 200, learner: addr, linked: true, created: bound.created }
}
