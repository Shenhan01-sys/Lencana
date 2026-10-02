/**
 * `erc8004.ts` — potongan IdentityRegistry ERC-8004 yang dipakai halaman (B130): pemilik agen menandatangani transaksinya
 * sendiri dari dasbor Agent Owner. Sumber yang sama dengan sisi server (`signer/src/erc8004.js`); salah satu huruf di
 * domain EIP-712 = tanda tangan yang bentuknya sah tetapi ditolak kontrak.
 */
import { encodeAbiParameters, encodeFunctionData, getAddress, type Hex } from 'viem'

/** IdentityRegistry yang disediakan BNB di chain 97 (alamat vanity `0x8004A8…`). */
export const IDENTITY_REGISTRY_97 = '0x8004A818BFB912233c491871b3d84c89A494BD9e' as const
export const TARIFF_KEY = 'lencana.baseTariff'

const ownerAbi = [
  {
    type: 'function', name: 'setAgentWallet', stateMutability: 'nonpayable', outputs: [],
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'newWallet', type: 'address' }, { name: 'deadline', type: 'uint256' }, { name: 'signature', type: 'bytes' }],
  },
  {
    type: 'function', name: 'setMetadata', stateMutability: 'nonpayable', outputs: [],
    inputs: [{ name: 'agentId', type: 'uint256' }, { name: 'metadataKey', type: 'string' }, { name: 'metadataValue', type: 'bytes' }],
  },
] as const

/** Tipe EIP-712 `AgentWalletSet`, sama dengan `IdentityRegistryUpgradeable.sol` (tenggat paling lama 5 menit). */
export function agentWalletTypedData (p: { chainId: number, agentId: string, newWallet: string, owner: string, deadline: bigint }) {
  return {
    domain: { name: 'ERC8004IdentityRegistry', version: '1', chainId: p.chainId, verifyingContract: IDENTITY_REGISTRY_97 as Hex },
    types: {
      AgentWalletSet: [
        { name: 'agentId', type: 'uint256' }, { name: 'newWallet', type: 'address' },
        { name: 'owner', type: 'address' }, { name: 'deadline', type: 'uint256' },
      ],
    },
    primaryType: 'AgentWalletSet',
    message: { agentId: BigInt(p.agentId), newWallet: getAddress(p.newWallet), owner: getAddress(p.owner), deadline: p.deadline },
  }
}

export function setAgentWalletData (agentId: string, newWallet: string, deadline: bigint, signature: Hex): Hex {
  return encodeFunctionData({ abi: ownerAbi, functionName: 'setAgentWallet', args: [BigInt(agentId), getAddress(newWallet), deadline, signature] })
}

/** Tarif dasar = abi.encode(token, jumlah satuan terkecil) di metadata `lencana.baseTariff` (B119). */
export function setTariffData (agentId: string, token: string, amount: bigint): Hex {
  const value = encodeAbiParameters([{ type: 'address' }, { type: 'uint256' }], [getAddress(token), amount])
  return encodeFunctionData({ abi: ownerAbi, functionName: 'setMetadata', args: [BigInt(agentId), TARIFF_KEY, value] })
}
