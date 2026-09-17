/**
 * Persistensi konfigurasi endpoint.
 *
 * Kenapa ini perlu dan bukan hardcode: kontrak kami BELUM ter-deploy saat berkas ini ditulis.
 * Halaman yang keras-coding address akan jadi dead page sampai deploy, dan tidak bisa diuji
 * lebih dulu. Jadi address + RPC disimpan di localStorage, dengan preset chain terverifikasi.
 */
import type { Endpoint } from './verify'
import { defaultEndpoint, mainnetEndpoint } from './verify'

const KEY = 'bnb-credential-endpoint-v1'

export type Preset = { id: string; label: string; endpoint: Endpoint; note: string }

export const PRESETS: Preset[] = [
  {
    id: 'bsc97',
    label: 'BSC Testnet (97) — target submission',
    endpoint: defaultEndpoint(),
    note: 'Address BAS diverifikasi 16 Sep 2026 lewat eth_getCode + eth_call getSchemaRegistry().',
  },
  {
    id: 'bsc56',
    label: 'BSC Mainnet (56) — kontrol silang',
    endpoint: mainnetEndpoint(),
    note: 'Dipakai untuk membuktikan primitifnya sama di dua chain. Bukan target demo.',
  },
  {
    id: 'anvil',
    label: 'Anvil lokal (fork 97) — pengembangan',
    endpoint: { ...defaultEndpoint(), rpcUrl: 'http://127.0.0.1:8545', chainId: 31337, label: 'Anvil fork' },
    note: 'Untuk menguji halaman sebelum deploy: fork chain 97 lokal, deploy kontrak ke situ.',
  },
]

export function loadEndpoint(): Endpoint {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultEndpoint()
    const parsed = JSON.parse(raw) as Partial<Endpoint>
    return { ...defaultEndpoint(), ...parsed }
  } catch {
    return defaultEndpoint()
  }
}

export function saveEndpoint(ep: Endpoint): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(ep))
  } catch {
    /* storage penuh / mode privat: abaikan, halaman tetap jalan */
  }
}

export function isConfigured(ep: Endpoint): boolean {
  return ep.resolver !== '0x0000000000000000000000000000000000000000'
}

export function explorerLink(ep: Endpoint, kind: 'address' | 'tx', value: string): string {
  if (!ep.chainId || !value) return ''
  const base = ep.chainId === 56 ? 'https://bscscan.com' : ep.chainId === 97 ? 'https://testnet.bscscan.com' : ''
  return base ? `${base}/${kind}/${value}` : ''
}
