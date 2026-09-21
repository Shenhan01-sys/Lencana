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
    id: 'anvil',
    label: 'Anvil lokal (fork 97) — pengembangan',
    endpoint: {
      ...defaultEndpoint(),
      rpcUrl: 'http://127.0.0.1:8545',
      chainId: 97,
      resolver: '0xe01a16e50fd9d8c0ff4230874f8d8c086e811627',
      cert: '0x021356a0e3b9ab440a571d4af62b215841a7c891',
      label: 'Anvil fork (97)',
    },
    note: 'Fork chain 97 lokal dengan kontrak ter-deploy dari SeedDemo.',
  },
  {
    id: 'bsc97',
    label: 'BSC Testnet (97) — target submission',
    endpoint: {
      ...defaultEndpoint(),
      resolver: '0xe01a16e50fd9d8c0ff4230874f8d8c086e811627',
      cert: '0x021356a0e3b9ab440a571d4af62b215841a7c891',
    },
    note: 'Address BAS diverifikasi 16 Sep 2026 lewat eth_getCode + eth_call getSchemaRegistry().',
  },
  {
    id: 'bsc56',
    label: 'BSC Mainnet (56) — kontrol silang',
    endpoint: mainnetEndpoint(),
    note: 'Dipakai untuk membuktikan primitifnya sama di dua chain. Bukan target demo.',
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
