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

/**
 * Tempat dokumen kredensial kita BENAR-BENAR disajikan: Worker + KV yang diisi
 * `npm run publish:edge`, dan satu-satunya host yang terbukti menjawab hari ini
 * (`npm run verify:edge` → 19 dari 19 kertas terbaca publik).
 * Sejak B165 didefinisikan DI SINI (halaman `#/app` tidak boleh mengimpor `main.ts` — kode DOM dan lingkar impor);
 * `main.ts` mengekspor ulang namanya yang sama.
 */
export const CREDENTIAL_HOST = 'https://lencana-edge.hansgunawan775.workers.dev'

/**
 * Tempat halaman ini benar-benar dibuka orang (Vercel) — diukur 29 Sep: HTTP 200.
 * Bukan "lencana.io": domain itu tidak pernah kita pegang dan dns.resolve-nya ENOTFOUND (A dan AAAA).
 * Tujuan QR di lembar sertifikat (B165): lembar yang dicetak dari mana pun menunjuk verifier yang sama.
 */
export const APP_HOST = 'https://lencana-psi.vercel.app'

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
      certs: [], // fork lokal: hanya instance hasil SeedDemo, bukan lapis publik (B164)
      label: 'Anvil fork (97)',
    },
    note: 'Fork chain 97 lokal dengan kontrak ter-deploy dari SeedDemo.',
  },
  {
    id: 'bsc97',
    label: 'BSC Testnet (97) — target submission',
    endpoint: {
      ...defaultEndpoint(),
      resolver: '0x7CA624caFDe5cA3A27b33d26be56F73a90792065',
      cert: '0xC6FD12B06e4dB9B85C8C807826998f98DA51c4cd',
    },
    note: 'Kontrak CredentialResolver & SoulboundCert aktif di BSC testnet (chain 97).',
  },
  {
    id: 'bsc56',
    label: 'BSC Mainnet (56) — kontrol silang',
    endpoint: { ...mainnetEndpoint(), certs: [] },
    note: 'Dipakai untuk membuktikan primitifnya sama di dua chain. Bukan target demo.',
  },
]

export function loadEndpoint(): Endpoint {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaultEndpoint()
    const parsed = JSON.parse(raw) as Partial<Endpoint>
    const base = defaultEndpoint()
    // B164: lapis artefak tambahan hanya berlaku untuk deployment publik bawaan. Konfigurasi tersimpan yang menunjuk resolver atau chain lain tidak
    // boleh mewarisinya, kecuali ia menyimpan daftar `certs`-nya sendiri.
    const sameDeployment = (parsed.resolver ?? base.resolver).toLowerCase() === base.resolver.toLowerCase() && (parsed.chainId ?? base.chainId) === base.chainId
    return { ...base, ...parsed, certs: parsed.certs ?? (sameDeployment ? base.certs : []) }
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
