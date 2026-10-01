/**
 * `src/erc8004.js` — identitas agen di registry ERC-8004 yang disediakan BNB (B118, keputusan D53).
 *
 * Kenapa modul ini ada: narasi Lencana menjanjikan "penerbit adalah agen yang bisa diperiksa orang
 * lain", tapi sampai 1 Okt agen kita hanya sebuah EOA + kunci dokumen di mesin platform, tanpa jangkar
 * di luar resolver kita sendiri. ERC-8004 memberi jangkar itu: NFT identitas milik *Agent Owner*,
 * dengan `agentWallet` dan berkas registrasi agen.
 *
 * KOREKSI 1 Okt (D54, opsi B): pagi itu `agentWallet` diikat ke EOA ATTESTER (penerbit). Sesudah
 * builder memilih "penerbit tetap attester, agen hanya penilai yang dibayar", dompet agen dipindah ke
 * kunci operasional agen sendiri — dompet itulah yang menandatangani penilaian dan menerima sewa
 * (spesifikasi ERC-8004: `agentWallet` = alamat tempat agen dibayar). Agen tidak lagi menandatangani
 * kredensial apa pun.
 *
 * Registry-nya BUKAN milik kita dan tidak kita deploy — keputusan builder: "pakai SC dari BNB aja".
 * Alamatnya dibaca dari chain 1 Okt: `name()` = `AgentIdentity`, `eip712Domain()` =
 * `ERC8004IdentityRegistry` v1. Satu jebakan yang terukur, bukan dugaan: versi yang dideploy di 97
 * TIDAK punya `getAgentWallet(uint256)` (ada di kode sumber terbaru repo erc-8004), jadi dompet agen
 * dibaca lewat `getMetadata(agentId, "agentWallet")` — 20 byte `abi.encodePacked(address)`.
 *
 * Batas yang ikut: ERC-8004 masih Draft, registrinya proxy yang bisa di-upgrade pemiliknya. Yang kita
 * klaim hanya "identitas ini ada, dimiliki Agent Owner, dan dompetnya = dompet yang menandatangani
 * penilaian", bukan reputasi.
 */

// Lencana-B118 status=SELESAI 2026-10-01 — identitas agen ERC-8004: registry BNB, pemilik = Agent Owner, berkas registrasi data: URI; sejak D54 agentWallet = dompet operasional agen, BUKAN attester. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B119 status=SELESAI 2026-10-01 — tarif dasar Agent Owner dibaca dari metadata identitas (lencana.baseTariff), tidak dikarang Lencana. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. Buktikan ulang: npm run verify:agent. JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { parseAbi, getAddress, isAddress, size, encodeAbiParameters, decodeAbiParameters } from 'viem'

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
  'function setMetadata(uint256 agentId, string metadataKey, bytes metadataValue)',
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
 * dan tidak ada layanan yang diiklankan kalau ia tidak bisa dibuka publik — agen penilai Lencana tidak
 * punya endpoint publik sendiri hari ini, jadi `services` kosong.
 *
 * Sejak D54 (opsi B, 1 Okt) agen TIDAK menandatangani kredensial: penerbit tetap attester. Versi
 * pertama berkas ini (B118, pagi 1 Okt) menulis "grading and issuing agent … attests credentials" —
 * benar untuk model saat itu, salah sesudah D54; URI-nya diganti di chain lewat `setAgentURI`.
 */
const ROLE_TEXT = Object.freeze({
  grader: {
    name: 'Lencana essay grading agent',
    description: 'Grades essays against the publisher rubric for Lencana courses on BNB Smart Chain testnet. '
      + 'For every grading activity it proposes a score and a difficulty label, and it is paid per activity. '
      + 'It never signs or revokes credentials: the publisher does. Testnet demo: the Agent Owner role is held by the Lencana team.',
  },
  reviewer: {
    name: 'Lencana essay review agent',
    description: 'Reviews model-proposed essay scores for Lencana courses on BNB Smart Chain testnet: approves, adjusts or rejects them, '
      + 'and is paid per review activity. It is a different agent, with a different owner, from the grading agent whose score it reviews. '
      + 'It never signs or revokes credentials. Testnet demo: the Agent Owner role is held by the Lencana team.',
  },
})

export function registrationFile ({ chainId, registry, agentId, role = 'grader' }) {
  const text = ROLE_TEXT[role]
  if (!text) throw new Error(`unknown agent role: ${role}`)
  return {
    type: REGISTRATION_TYPE,
    name: text.name,
    description: text.description,
    services: [],
    x402Support: false,
    active: true,
    registrations: [{ agentId: Number(agentId), agentRegistry: agentRegistryId(chainId, registry) }],
    supportedTrust: [],
  }
}

/**
 * Tarif dasar Agent Owner (B119, D54): ditulis pemilik identitas sendiri sebagai metadata di registry,
 * jadi siapa pun bisa membacanya dan Lencana tidak bisa mengarangnya. Nilai = abi.encode(token, jumlah
 * satuan terkecil per aktivitas penilaian).
 */
export const TARIFF_KEY = 'lencana.baseTariff'
export const encodeTariff = ({ token, amount }) => encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [getAddress(token), BigInt(amount)])
export function decodeTariff (bytes) {
  if (!bytes || bytes === '0x') return null
  try {
    const [token, amount] = decodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], bytes)
    return amount > 0n ? { token: getAddress(token), amount } : null
  } catch { return null }
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
  const [walletBytes, uri, tariffBytes] = await Promise.all([
    client.readContract({ address: registry, abi: identityAbi, functionName: 'getMetadata', args: [id, 'agentWallet'] }),
    client.readContract({ address: registry, abi: identityAbi, functionName: 'tokenURI', args: [id] }).catch(() => ''),
    client.readContract({ address: registry, abi: identityAbi, functionName: 'getMetadata', args: [id, TARIFF_KEY] }).catch(() => '0x'),
  ])
  const registration = parseAgentUri(uri)
  const wantRegistry = agentRegistryId(chainId, registry)
  const pointsBack = Boolean(registration?.registrations?.some((r) => Number(r.agentId) === Number(id) && r.agentRegistry === wantRegistry))
  return {
    ok: true, registry, agentId: id.toString(), owner: getAddress(owner), wallet: walletFromMetadata(walletBytes),
    uri, registration, registrationType: registration?.type ?? null, pointsBack, tariff: decodeTariff(tariffBytes),
  }
}

export const isAddr = (a) => typeof a === 'string' && isAddress(a)
