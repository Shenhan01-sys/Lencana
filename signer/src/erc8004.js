/**
 * `src/erc8004.js` — identitas agen di registry ERC-8004 yang disediakan BNB (B118, keputusan D53).
 *
 * Kenapa modul ini ada: narasi Lencana menjanjikan "penerbit adalah agen yang bisa diperiksa orang
 * lain", tapi sampai 1 Okt agen kita hanya sebuah EOA + kunci dokumen di mesin platform, tanpa jangkar
 * di luar resolver kita sendiri. ERC-8004 memberi jangkar itu: NFT identitas milik *Agent Owner*,
 * dengan `agentWallet` yang menunjuk EOA attester dan berkas registrasi yang menunjuk layanan agen.
 *
 * Registry-nya BUKAN milik kita dan tidak kita deploy — keputusan builder: "pakai SC dari BNB aja".
 * Alamatnya dibaca dari chain 1 Okt: `name()` = `AgentIdentity`, `eip712Domain()` =
 * `ERC8004IdentityRegistry` v1. Satu jebakan yang terukur, bukan dugaan: versi yang dideploy di 97
 * TIDAK punya `getAgentWallet(uint256)` (ada di kode sumber terbaru repo erc-8004), jadi dompet agen
 * dibaca lewat `getMetadata(agentId, "agentWallet")` — 20 byte `abi.encodePacked(address)`.
 *
 * Batas yang ikut: ERC-8004 masih Draft, registrinya proxy yang bisa di-upgrade pemiliknya. Yang kita
 * klaim hanya "identitas ini ada dan dompetnya = attester kertas kita", bukan reputasi.
 */

// Lencana-B118 status=SELESAI 2026-10-01 —identitas agen ERC-8004: registry BNB, agentWallet = attester, berkas registrasi data: URI. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { parseAbi, getAddress, isAddress, size } from 'viem'

/** Registry yang dideploy tim 8004 / BNB. Alamat vanity `0x8004A8…` untuk testnet, `0x8004A1…` mainnet. */
export const ERC8004 = Object.freeze({
  97: Object.freeze({
    identity: '0x8004A818BFB912233c491871b3d84c89A494BD9e',
    reputation: '0x8004B663056A597Dffe9eCcC1965A193B7388713',
  }),
  56: Object.freeze({
    identity: '0x8004A169FB4a3325136EB29fA0ceB6D2e539a432',
    reputation: '0x8004BAa17C55a88189AE136b182e5fdA19dE9b63',
  }),
})

export const REGISTRATION_TYPE = 'https://eips.ethereum.org/EIPS/eip-8004#registration-v1'

export const identityAbi = parseAbi([
  'function register() returns (uint256 agentId)',
  'function setAgentURI(uint256 agentId, string newURI)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature)',
  'function getMetadata(uint256 agentId, string metadataKey) view returns (bytes)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function tokenURI(uint256 tokenId) view returns (string)',
  'function balanceOf(address owner) view returns (uint256)',
  'function eip712Domain() view returns (bytes1, string, string, uint256, address, bytes32, uint256[])',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
])

/** `eip155:<chainId>:<registry>` — bentuk `agentRegistry` di berkas registrasi (spesifikasi ERC-8004). */
export const agentRegistryId = (chainId, registry) => `eip155:${chainId}:${getAddress(registry)}`

/** Tipe EIP-712 `setAgentWallet`, seperti di `IdentityRegistryUpgradeable.sol` (MAX_DEADLINE_DELAY 5 menit). */
export function agentWalletTypedData ({ chainId, registry, agentId, newWallet, owner, deadline }) {
  return {
    domain: { name: 'ERC8004IdentityRegistry', version: '1', chainId, verifyingContract: getAddress(registry) },
    types: {
      AgentWalletSet: [
        { name: 'agentId', type: 'uint256' },
        { name: 'newWallet', type: 'address' },
        { name: 'owner', type: 'address' },
        { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'AgentWalletSet',
    message: { agentId: BigInt(agentId), newWallet: getAddress(newWallet), owner: getAddress(owner), deadline: BigInt(deadline) },
  }
}

/**
 * Berkas registrasi agen. Semua kalimat di sini keluar dari proses kita, jadi berbahasa Inggris (D28),
 * dan tidak ada layanan yang diiklankan kalau ia tidak bisa dibuka publik: `POST /relay` misalnya hanya
 * hidup di signer lokal, jadi TIDAK dicantumkan.
 */
export function registrationFile ({ chainId, registry, agentId, agentSlug, edgeBaseUrl, resolver }) {
  const edge = String(edgeBaseUrl).replace(/\/+$/, '')
  return {
    type: REGISTRATION_TYPE,
    name: `Lencana issuer agent (${agentSlug})`,
    description: 'Grading and issuing agent for Lencana course credentials on BNB Smart Chain testnet. '
      + 'It grades essays against the publisher rubric and attests credentials through the Lencana CredentialResolver on BAS. '
      + 'Testnet demo: the Agent Owner role is held by the Lencana team.',
    services: [
      { name: 'issuer-document', endpoint: `${edge}/issuers/${agentSlug}`, version: 'Open Badges 3.0 Profile' },
      { name: 'credential-resolver', endpoint: `eip155:${chainId}:${getAddress(resolver)}` },
    ],
    x402Support: false,
    active: true,
    registrations: [{ agentId: Number(agentId), agentRegistry: agentRegistryId(chainId, registry) }],
    supportedTrust: [],
  }
}

/** `data:` URI penuh di chain — spesifikasi mengizinkannya ("fully on-chain metadata"). */
export const toDataUri = (json) => `data:application/json;base64,${Buffer.from(JSON.stringify(json), 'utf8').toString('base64')}`

/** Kebalikan `toDataUri`; juga menerima JSON polos. `null` kalau bentuknya bukan itu. */
export function parseAgentUri (uri) {
  const s = String(uri ?? '')
  try {
    const m = /^data:application\/json;base64,(.+)$/.exec(s)
    if (m) return JSON.parse(Buffer.from(m[1], 'base64').toString('utf8'))
    if (s.startsWith('{')) return JSON.parse(s)
  } catch { /* bukan JSON */ }
  return null
}

/** `getMetadata(agentId,"agentWallet")` → alamat, atau null kalau kosong/bukan 20 byte. */
export function walletFromMetadata (bytes) {
  if (!bytes || bytes === '0x' || size(bytes) !== 20) return null
  return getAddress(bytes)
}

/** Semua yang perlu diketahui tentang satu identitas, dibaca dari chain. */
export async function readAgent (client, { chainId, agentId }) {
  const registry = ERC8004[chainId]?.identity
  if (!registry) return { ok: false, why: `no ERC-8004 identity registry known for chain ${chainId}` }
  const id = BigInt(agentId)
  let owner
  try {
    owner = await client.readContract({ address: registry, abi: identityAbi, functionName: 'ownerOf', args: [id] })
  } catch {
    return { ok: false, why: `agent ${agentId} does not exist in ${registry}` }
  }
  const [walletBytes, uri] = await Promise.all([
    client.readContract({ address: registry, abi: identityAbi, functionName: 'getMetadata', args: [id, 'agentWallet'] }),
    client.readContract({ address: registry, abi: identityAbi, functionName: 'tokenURI', args: [id] }).catch(() => ''),
  ])
  const registration = parseAgentUri(uri)
  const wantRegistry = agentRegistryId(chainId, registry)
  const pointsBack = Boolean(registration?.registrations?.some((r) => Number(r.agentId) === Number(id) && r.agentRegistry === wantRegistry))
  return {
    ok: true, registry, agentId: id.toString(), owner: getAddress(owner), wallet: walletFromMetadata(walletBytes),
    uri, registration, registrationType: registration?.type ?? null, pointsBack,
  }
}

export const isAddr = (a) => typeof a === 'string' && isAddress(a)
