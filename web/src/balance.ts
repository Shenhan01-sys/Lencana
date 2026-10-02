/**
 * `balance.ts` — saldo LDC-demo akun yang masuk (B126): satu pembaca untuk chip navbar, panel bayar, dan halaman
 * Dompet. Angkanya selalu dibaca dari chain (`balanceOf` di BSC testnet), tidak pernah dari penerbit atau dihitung
 * halaman. Bacaan disimpan 20 detik per alamat supaya pindah halaman tidak mengulang RPC; sesudah koin uji masuk
 * atau pembayaran lunas, `balanceChanged` memaksa bacaan baru dan semua tampilan ikut bergulir.
 */
// Lencana-B126 status=TERBUKA 2026-10-02 — saldo koin uji dibaca dari chain untuk chip navbar, panel bayar, dan Dompet di dashboard; berubah (bergulir) sesudah koin uji masuk atau pembayaran lunas. Buktikan ulang: uji peramban T48. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { learnerAddress, tokenBalance } from './learning'
import { PAY_TOKEN_ADDRESS, formatLdc } from './pricing'
import { coin } from './lib/coin'
import { odometer, setOdometer } from './lib/odometer'

type Listener = (v: bigint | null) => void

const TTL_MS = 20_000
let cache: { addr: string, value: bigint | null, at: number } | null = null
let inflight: Promise<bigint | null> | null = null
const listeners = new Set<Listener>()

function notify (v: bigint | null): void {
  for (const fn of listeners) {
    try { fn(v) } catch { /* satu tampilan yang rusak tidak boleh menghentikan yang lain */ }
  }
}

/** Saldo akun yang masuk; `force` melewati simpanan. null = belum masuk atau chain tidak terbaca. */
export async function readBalance (force = false): Promise<bigint | null> {
  const addr = learnerAddress()
  if (!addr) return null
  if (!force && cache && cache.addr === addr && Date.now() - cache.at < TTL_MS) { notify(cache.value); return cache.value }
  inflight ??= tokenBalance(PAY_TOKEN_ADDRESS)
    .then((value) => {
      if (value !== null) cache = { addr, value, at: Date.now() }
      notify(value)
      return value
    })
    .finally(() => { inflight = null })
  return inflight
}

/** Daftarkan tampilan; dipanggil setiap kali saldo dibaca ulang. Kembalian = berhenti mendengar. */
export function onBalance (fn: Listener): () => void {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

/** Saldo berubah karena kejadian sungguhan (koin uji masuk, pembayaran lunas). `known` = angka yang dijawab penerbit. */
export function balanceChanged (known?: bigint): void {
  const addr = learnerAddress()
  if (known !== undefined && addr) {
    cache = { addr, value: known, at: Date.now() }
    notify(known)
    return
  }
  void readBalance(true)
}

/** Chip saldo di navbar (`#nav-balance`): tampil hanya untuk akun yang masuk. */
let navAmount: HTMLElement | null = null
let navBound = false
export function syncNavBalance (signedIn: boolean): void {
  const chip = document.getElementById('nav-balance')
  if (!chip) return
  if (!signedIn) {
    chip.classList.add('hidden')
    cache = null
    return
  }
  chip.classList.remove('hidden')
  if (!navBound) {
    navBound = true
    const slot = chip.querySelector('.nav-balance-coin')
    slot?.replaceChildren(coin(18))
    navAmount = odometer('0')
    chip.querySelector('.nav-balance-amt')?.replaceChildren(navAmount)
    onBalance((v) => {
      if (!navAmount) return
      if (v === null) { navAmount.textContent = '—'; delete navAmount.dataset.v; return }
      setOdometer(navAmount, formatLdc(v))
      chip.setAttribute('title', `${formatLdc(v)} LDC-demo · BNB Smart Chain Testnet (97)`)
    })
  }
  void readBalance()
}
