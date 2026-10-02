/**
 * `privy.ts` — login peserta lewat Privy: email + kode sekali-pakai, lalu dompet tertanam (B82, D57).
 *
 * Kenapa ini ada: sampai 1 Okt identitas peserta adalah kunci perangkat yang hangus bersama tab, atau
 * dompet ekstensi. Login Privy memberi peserta dompet tertanam yang SAMA di perangkat mana pun — jadi
 * rekaman belajarnya di penerbit (yang terikat ke alamat) ikut pindah bersamanya.
 *
 * Yang tidak berubah: tulisan ke penerbit tetap ditandatangani per permintaan (EIP-191 atas nonce
 * satu-kali). Modul ini hanya menyediakan penanda tangan yang tahan ganti perangkat; identitas dan
 * storage-nya tetap milik `learning.ts`.
 *
 * Modul ini dimuat LAMBAT (`import('./privy')` dari `learning.ts`), dan SDK-nya juga: peserta yang
 * tidak memakai login email tidak mengunduh SDK Privy sama sekali, dan `npm run probe` (yang meng-import
 * `learning.ts` dari Node) tidak pernah menyentuhnya. Tidak memakai React — SDK yang dipakai adalah
 * `@privy-io/js-sdk-core` (vanilla), sesuai keputusan halaman ini tanpa framework UI.
 *
 * App ID bukan rahasia (ia dikirim ke Privy dari setiap browser); app secret TIDAK PERNAH ada di sini.
 */

// Lencana-B82 status=TERBUKA 2026-10-01 — klien login Privy: OTP email, dompet tertanam dibuat bila belum ada, penanda tangan EIP-1193 untuk personal_sign, sesi dipulihkan saat halaman dibuka; yang belum: uji dua peramban oleh builder (alamat sama sesudah login ulang). Buktikan ulang: npm run verify:privy (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { stringToHex } from 'viem'
import type Privy from '@privy-io/js-sdk-core'

/** App ID publik. Bisa ditimpa `VITE_PRIVY_APP_ID` untuk app Privy lain; tidak ada rahasia di sini. */
export const PRIVY_APP_ID: string = import.meta.env.VITE_PRIVY_APP_ID || 'cmuphc2db00kr0cl391vk3txa'

type Sdk = typeof import('@privy-io/js-sdk-core')
type Eip1193 = { request: (a: { method: string, params?: unknown[] }) => Promise<unknown> }
type PrivyUser = { id: string, linked_accounts: Array<{ type: string, address?: string, email?: string }> }
export type PrivyIdentity = { address: string, userId: string, email: string | null }

let ready: Promise<{ privy: Privy, mod: Sdk }> | null = null
let iframe: HTMLIFrameElement | null = null
let onMessage: ((e: MessageEvent) => void) | null = null
let current: (PrivyIdentity & { provider: Eip1193 }) | null = null

/** SDK + iframe dompet tertanam, sekali per halaman. Pola dokumentasi Privy untuk SDK vanilla. */
async function client (): Promise<{ privy: Privy, mod: Sdk }> {
  if (ready) return ready
  ready = (async () => {
    const mod = await import('@privy-io/js-sdk-core')
    const privy = new mod.default({ appId: PRIVY_APP_ID, storage: new mod.LocalStorage() })
    const frame = document.createElement('iframe')
    frame.src = privy.embeddedWallet.getURL()
    frame.style.display = 'none'
    frame.setAttribute('aria-hidden', 'true')
    frame.title = 'Privy embedded wallet'
    document.body.appendChild(frame)
    iframe = frame
    // SDK meminta "poster" berbentuk { postMessage, reload } — bentuk WebView React Native. Di web,
    // postMessage diteruskan ke jendela iframe, dan reload = memuat ulang URL iframe yang sama.
    privy.setMessagePoster({
      postMessage: (message, targetOrigin, transfer) => frame.contentWindow?.postMessage(message, targetOrigin, transfer ? [transfer] : undefined),
      reload: () => { frame.src = privy.embeddedWallet.getURL() },
    })
    onMessage = (e: MessageEvent) => {
      if (e.source !== frame.contentWindow) return
      let data: unknown = e.data
      try { if (typeof data === 'string') data = JSON.parse(data) } catch { return }
      if (typeof (data as { event?: unknown })?.event !== 'string') return
      privy.embeddedWallet.onMessage(data as Parameters<typeof privy.embeddedWallet.onMessage>[0])
    }
    window.addEventListener('message', onMessage)
    await privy.initialize()
    return { privy, mod }
  })()
  try { return await ready } catch (e) { teardown(); throw e }
}

function teardown (): void {
  if (onMessage) window.removeEventListener('message', onMessage)
  iframe?.remove()
  iframe = null
  onMessage = null
  ready = null
  current = null
}

function emailOf (user: PrivyUser): string | null {
  const accounts = user.linked_accounts
  return accounts.find((a) => a.type === 'email')?.address ?? accounts.find((a) => a.type === 'google_oauth')?.email ?? null
}

/**
 * Dompet tertanam Ethereum milik user; dibuat kalau belum ada. Konfigurasi app Lencana: dompet TIDAK
 * dibuat otomatis saat login, dan modenya dompet server milik user (TEE) — jadi `create({})` tanpa
 * passcode adalah jalur resminya, bukan jalan pintas.
 */
async function attachWallet (user: PrivyUser): Promise<PrivyIdentity> {
  const { privy, mod } = await client()
  let u = user as Parameters<Sdk['getUserEmbeddedEthereumWallet']>[0]
  let wallet = mod.getUserEmbeddedEthereumWallet(u)
  if (!wallet) {
    const created = await privy.embeddedWallet.create({})
    u = created.user as typeof u
    wallet = mod.getUserEmbeddedEthereumWallet(u)
  }
  if (!wallet) throw new Error('Privy tidak mengembalikan dompet Ethereum tertanam untuk akun ini.')
  const entropy = mod.getEntropyDetailsFromUser(u)
  if (!entropy) throw new Error('Akun Privy ini tidak punya detail entropi untuk dompet tertanamnya.')
  const provider = await privy.embeddedWallet.getEthereumProvider({
    wallet, entropyId: entropy.entropyId, entropyIdVerifier: entropy.entropyIdVerifier,
  }) as unknown as Eip1193
  current = { address: wallet.address, userId: user.id, email: emailOf(user), provider }
  return { address: current.address, userId: current.userId, email: current.email }
}

/**
 * Metode masuk yang benar-benar aktif di app ini, dibaca dari konfigurasi app yang dimuat SDK. Halaman hanya
 * menampilkan tombol untuk metode yang aktif — tombol "Google" yang ternyata tidak bisa dipakai adalah klaim palsu.
 */
export async function privyLoginMethods (): Promise<{ google: boolean, email: boolean }> {
  const { privy } = await client()
  const cfg = privy.app.getConfig()
  return { google: Boolean(cfg?.google_oauth), email: cfg ? Boolean(cfg.email_auth) : true }
}

/** Login Google: peramban pindah ke Google, lalu kembali ke `redirectURI` membawa kode sekali-pakai. */
export async function privyGoogleStart (redirectURI: string): Promise<void> {
  const { privy } = await client()
  const { url } = await privy.auth.oauth.generateURL('google', redirectURI)
  window.location.assign(url)
}

/** Tukar kode yang dibawa pulang dari Google dengan sesi, lalu pasang dompet tertanamnya. */
export async function privyGoogleFinish (code: string, state: string): Promise<PrivyIdentity> {
  const { privy } = await client()
  const session = await privy.auth.oauth.loginWithCode(code, state, 'google')
  return attachWallet(session.user as PrivyUser)
}

export async function privySendCode (email: string): Promise<void> {
  const { privy } = await client()
  await privy.auth.email.sendCode(email.trim())
}

export async function privyLogin (email: string, code: string): Promise<PrivyIdentity> {
  const { privy } = await client()
  const session = await privy.auth.email.loginWithCode(email.trim(), code.trim())
  return attachWallet(session.user as PrivyUser)
}

/** Pulihkan sesi Privy yang tersimpan di peramban ini. null kalau tidak ada yang login. */
export async function privyRestore (): Promise<PrivyIdentity | null> {
  if (current) return { address: current.address, userId: current.userId, email: current.email }
  try {
    const { privy } = await client()
    const { user } = await privy.user.get()
    if (!user) return null
    return await attachWallet(user as PrivyUser)
  } catch {
    return null
  }
}

/**
 * Tanda tangan EIP-191 (`personal_sign`) — bentuk yang sama dengan jalur dompet ekstensi.
 * `expected` wajib cocok dengan dompet sesi yang aktif: kalau di tab lain sudah login akun berbeda,
 * kita menolak di sini alih-alih menandatangani atas nama alamat yang salah.
 */
export async function privySign (message: string, expected: string): Promise<string> {
  const id = await privyRestore()
  if (!id || !current) throw new Error('Sesi login email tidak ada lagi di peramban ini — masuk ulang.')
  if (id.address.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Sesi login email sekarang milik dompet lain (${id.address.slice(0, 10)}…) — ganti identitas lalu masuk ulang.`)
  }
  return await current.provider.request({ method: 'personal_sign', params: [stringToHex(message), current.address] }) as string
}

/**
 * Tanda tangan EIP-712 (`eth_signTypedData_v4`) dengan dompet tertanam — dipakai izin token saat membayar kursus (B125).
 * `typedDataJson` sudah lengkap dengan `EIP712Domain`; alamatnya wajib sama dengan sesi aktif, seperti `privySign`.
 */
export async function privySignTypedData (typedDataJson: string, expected: string): Promise<string> {
  const id = await privyRestore()
  if (!id || !current) throw new Error('Sesi login tidak ada lagi di peramban ini — masuk ulang.')
  if (id.address.toLowerCase() !== expected.toLowerCase()) {
    throw new Error(`Sesi login sekarang milik dompet lain (${id.address.slice(0, 10)}…) — keluar lalu masuk ulang.`)
  }
  return await current.provider.request({ method: 'eth_signTypedData_v4', params: [current.address, typedDataJson] }) as string
}

export async function privyAccessToken (): Promise<string | null> {
  const { privy } = await client()
  return privy.getAccessToken()
}

export async function privyLogout (): Promise<void> {
  const userId = current?.userId
  if (!ready) { current = null; return }
  try {
    const { privy } = await ready
    await privy.auth.logout(userId ? { userId } : undefined)
  } finally {
    teardown()
  }
}
