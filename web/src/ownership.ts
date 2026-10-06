// Lencana-B170 status=SELESAI 2026-10-06 — bukti kepemilikan artefak NFT: pemilik dompet menandatangani pernyataan baku, siapa pun memeriksanya (pemulihan penandatangan + ownerOf dari chain) tanpa akun. Buktikan ulang: cd web && npx tsx scripts/probe.ts
/**
 * `ownership.ts` — bukti kepemilikan artefak NFT (B170). Murni (tanpa DOM) supaya `scripts/probe.ts` dapat mengadilinya dari Node.
 *
 * Apa yang dibuktikan, dan apa yang tidak:
 *  - `ownerOf(token)` di chain sudah membuktikan DOMPET mana yang memegang artefak. Yang belum terbukti ke orang lain adalah bahwa PEMEGANG AKUN INI
 *    mengendalikan dompet itu. Pernyataan bertanda tangan menutup celah itu: hanya pemegang kunci dompet yang bisa membuat tanda tangan yang
 *    pemulihannya (`ecrecover`) menghasilkan alamat itu.
 *  - Pemeriksa tidak mempercayai Lencana: ia memulihkan penandatangan dari tanda tangan, lalu membaca `ownerOf`, `credentialOf`, dan `locked`
 *    langsung dari chain lewat RPC publik. Perintah `cast` yang setara ikut dicetak supaya pemeriksaan bisa diulang tanpa halaman ini.
 *  - Yang TIDAK dibuktikan: identitas orang di dunia nyata (dompet tertanam terikat ke login, bukan ke KTP), dan bahwa pernyataan ini masih
 *    mencerminkan keadaan nanti (waktu pernyataan dicatat; `ownerOf` dibaca SEKARANG saat diperiksa). Dompet kontrak pintar (EIP-1271) tidak didukung.
 *  - Kontrak yang bukan lapis artefak Lencana yang dikenal tidak pernah dinyatakan sah: kontrak karangan bisa menjawab `ownerOf` sesuka hatinya.
 */
import { getAddress, isAddress, recoverMessageAddress, type Address, type Hex } from 'viem'
import { soulboundCertAbi } from './abi'
import { loadEndpoint } from './config'
import { APP_HOST } from './hosts'
import { makeClient } from './verify'

export const STATEMENT_HEADER = 'Lencana — pernyataan kepemilikan artefak NFT'
const INTRO = 'Saya memegang kunci dompet ini dan menyatakan artefak NFT soulbound di bawah ini milik dompet saya.'
const SIG_LABEL = 'tanda tangan'

export type OwnershipFields = { wallet: Address, contract: Address, tokenId: string, credential: Hex, chainId: number, issuedAt: string }

/** `2026-10-06T10:20:30Z` — detik penuh, UTC, tanpa milidetik (bentuk baku supaya pernyataan hanya punya satu tulisan). */
export const stampOf = (ms: number): string => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** Teks yang ditandatangani. Satu-satunya bentuk yang diterima pemeriksa (lihat `parseStatement`). */
export function ownershipStatement (f: OwnershipFields): string {
  return [
    STATEMENT_HEADER,
    INTRO,
    '',
    `dompet: ${getAddress(f.wallet)}`,
    `kontrak: ${getAddress(f.contract)}`,
    `token: ${f.tokenId}`,
    `kredensial: ${f.credential.toLowerCase()}`,
    `rantai: ${f.chainId}`,
    `waktu: ${f.issuedAt}`,
  ].join('\n')
}

const norm = (t: string) => t.replace(/\r\n?/g, '\n')

export type Parsed<T> = ({ ok: true } & T) | { ok: false, why: string }

/** Membaca pernyataan baku. Hasilnya harus membentuk ulang teks yang SAMA persis — yang tampil di layar adalah yang ditandatangani. */
export function parseStatement (raw: string): Parsed<{ fields: OwnershipFields, statement: string }> {
  const statement = norm(raw).replace(/\s+$/, '')
  const lines = statement.split('\n')
  if (lines[0] !== STATEMENT_HEADER) return { ok: false, why: 'bukan pernyataan kepemilikan Lencana (baris pertama tidak cocok)' }
  const val = (key: string, i: number): string | null => { const l = lines[i] ?? ''; return l.startsWith(`${key}: `) ? l.slice(key.length + 2) : null }
  const wallet = val('dompet', 3), contract = val('kontrak', 4), tokenId = val('token', 5), credential = val('kredensial', 6), chain = val('rantai', 7), issuedAt = val('waktu', 8)
  if (wallet === null || contract === null || tokenId === null || credential === null || chain === null || issuedAt === null) return { ok: false, why: 'baris dompet / kontrak / token / kredensial / rantai / waktu tidak lengkap atau urutannya berbeda' }
  if (!isAddress(wallet, { strict: false })) return { ok: false, why: 'alamat dompet tidak sah' }
  if (!isAddress(contract, { strict: false })) return { ok: false, why: 'alamat kontrak tidak sah' }
  if (!/^[0-9]{1,78}$/.test(tokenId)) return { ok: false, why: 'token ID harus bilangan bulat desimal' }
  if (!/^0x[0-9a-fA-F]{64}$/.test(credential)) return { ok: false, why: 'hash kredensial harus 0x + 64 heksadesimal' }
  if (!/^[0-9]{1,10}$/.test(chain) || Number(chain) <= 0) return { ok: false, why: 'ID rantai tidak sah' }
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(issuedAt) || Number.isNaN(Date.parse(issuedAt))) return { ok: false, why: 'waktu harus berbentuk 2026-10-06T10:20:30Z' }
  const fields: OwnershipFields = { wallet: getAddress(wallet), contract: getAddress(contract), tokenId, credential: credential.toLowerCase() as Hex, chainId: Number(chain), issuedAt }
  if (ownershipStatement(fields) !== statement) return { ok: false, why: 'bentuknya tidak baku (huruf alamat, spasi, atau baris tambahan berbeda dari yang ditandatangani)' }
  return { ok: true, fields, statement }
}

/** Blok yang dibagikan: pernyataan + satu baris tanda tangan. */
export const ownershipBlock = (statement: string, signature: string): string => `${statement}\n\n${SIG_LABEL}: ${signature}`

/** Memisahkan blok menjadi pernyataan dan tanda tangan (65 byte, EIP-191). */
export function parseBlock (raw: string): Parsed<{ statement: string, signature: Hex }> {
  const text = norm(raw).replace(/\s+$/, '')
  const m = /\n\n?tanda tangan: (0x[0-9a-fA-F]{130})$/.exec(text)
  if (!m) return { ok: false, why: 'baris "tanda tangan: 0x…" (65 byte) tidak ditemukan di akhir blok' }
  return { ok: true, statement: text.slice(0, m.index), signature: m[1] as Hex }
}

/** Tautan yang membuka halaman verifikasi dengan blok sudah terisi dan langsung diperiksa (`?own=`). */
export const ownershipLink = (block: string, appHost: string = APP_HOST): string => `${appHost}/?own=${encodeURIComponent(block)}#/verify`

/** Blok dari `?own=` pada `location.search` (atau `null`). Hanya dibaca; pemeriksaannya tetap `checkOwnership`. */
export function ownershipFromSearch (search: string): string | null {
  const v = new URLSearchParams(search).get('own')
  return v && v.length <= 4000 ? v : null
}

/** Kutip pesan bertanda baris-baru untuk bash (`$'…'`), supaya perintah `cast` menandatangani/memeriksa teks yang sama persis. */
const bashQuote = (s: string) => `$'${s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n')}'`

/** Perintah Foundry `cast` yang mengulang pemeriksaan tanpa halaman ini (bash). */
export function ownershipCast (f: OwnershipFields, statement: string, signature: string, rpcUrl: string): string[] {
  return [
    `cast wallet verify --address ${f.wallet} ${bashQuote(statement)} ${signature}`,
    `cast call ${f.contract} 'ownerOf(uint256)(address)' ${f.tokenId} --rpc-url ${rpcUrl}`,
    `cast call ${f.contract} 'credentialOf(uint256)(bytes32)' ${f.tokenId} --rpc-url ${rpcUrl}`,
  ]
}

export type OwnershipRead = { owner: Address, credential: Hex, locked: boolean | null }
export class OwnershipReadError extends Error {
  constructor (public reverted: boolean, message: string) { super(message) }
}
export type OwnershipReader = {
  chainId: number
  rpcUrl: string
  known: (contract: Address) => boolean
  /** Melempar `OwnershipReadError`: `reverted` = chain menjawab "tidak ada" (bukan jaringan mati). */
  read: (contract: Address, tokenId: bigint) => Promise<OwnershipRead>
}

const revertedIn = (e: unknown): boolean => {
  for (let x = e as { name?: string, cause?: unknown } | undefined; x; x = x.cause as typeof x) {
    if (x.name === 'ContractFunctionRevertedError' || x.name === 'ContractFunctionZeroDataError') return true
  }
  return false
}

/** Pembaca nyata: titik akhir yang sama dengan verifier (RPC publik chain 97 secara bawaan), tanpa backend Lencana. */
export function chainReader (): OwnershipReader {
  const ep = loadEndpoint()
  const client = makeClient(ep)
  const known = new Set([ep.cert, ...(ep.certs ?? [])].filter(Boolean).map((a) => String(a).toLowerCase()))
  return {
    chainId: ep.chainId, rpcUrl: ep.rpcUrl, known: (c) => known.has(c.toLowerCase()),
    async read (contract, tokenId) {
      try {
        const [owner, credential, locked] = await Promise.all([
          client.readContract({ address: contract, abi: soulboundCertAbi, functionName: 'ownerOf', args: [tokenId] }) as Promise<Address>,
          client.readContract({ address: contract, abi: soulboundCertAbi, functionName: 'credentialOf', args: [tokenId] }) as Promise<Hex>,
          (client.readContract({ address: contract, abi: soulboundCertAbi, functionName: 'locked', args: [tokenId] }) as Promise<boolean>).catch(() => null),
        ])
        return { owner, credential, locked }
      } catch (e) {
        throw new OwnershipReadError(revertedIn(e), e instanceof Error ? e.message.split('\n')[0]! : String(e))
      }
    },
  }
}

export type OwnershipVerdict = 'VALID' | 'MALFORMED' | 'BAD_SIGNATURE' | 'SIGNER_MISMATCH' | 'OTHER_CHAIN' | 'UNKNOWN_CONTRACT' | 'NO_TOKEN' | 'HASH_MISMATCH' | 'NOT_OWNER' | 'UNREADABLE'
export type OwnershipResult = {
  verdict: OwnershipVerdict
  why: string
  fields?: OwnershipFields
  signer?: Address
  owner?: Address
  locked?: boolean | null
  ageSeconds?: number
  /** Waktu pernyataan lebih dari 10 menit di depan jam pemeriksa: tidak mengubah putusan, tapi layak dicurigai. */
  future?: boolean
}

/**
 * Memeriksa blok pernyataan + tanda tangan. Urutan putusan sengaja dari yang paling murah dan paling pasti ke yang butuh jaringan:
 * bentuk → tanda tangan → kecocokan penandatangan → rantai → kontrak dikenal → bacaan chain → kredensial → pemilik.
 * `VALID` hanya bila penandatangan = dompet yang dinyatakan = `ownerOf` di chain DAN token itu memang milik kredensial yang disebut.
 */
export async function checkOwnership (rawBlock: string, reader: OwnershipReader, nowMs: number = Date.now()): Promise<OwnershipResult> {
  const block = parseBlock(rawBlock)
  if (!block.ok) return { verdict: 'MALFORMED', why: block.why }
  const parsed = parseStatement(block.statement)
  if (!parsed.ok) return { verdict: 'MALFORMED', why: parsed.why }
  const { fields } = parsed
  const ageSeconds = Math.round((nowMs - Date.parse(fields.issuedAt)) / 1000)
  const meta = { fields, ageSeconds, future: ageSeconds < -600 }

  let signer: Address
  try {
    signer = await recoverMessageAddress({ message: parsed.statement, signature: block.signature })
  } catch (e) {
    return { verdict: 'BAD_SIGNATURE', why: `tanda tangan tidak bisa dipulihkan: ${e instanceof Error ? e.message.split('\n')[0] : String(e)}`, ...meta }
  }
  if (signer.toLowerCase() !== fields.wallet.toLowerCase()) return { verdict: 'SIGNER_MISMATCH', why: 'tanda tangan dibuat oleh dompet lain, bukan dompet yang dinyatakan di pernyataan (atau teksnya diubah sesudah ditandatangani)', signer, ...meta }
  if (fields.chainId !== reader.chainId) return { verdict: 'OTHER_CHAIN', why: `pernyataan ini untuk rantai ${fields.chainId}, sedangkan pemeriksa ini membaca rantai ${reader.chainId}`, signer, ...meta }
  if (!reader.known(fields.contract)) return { verdict: 'UNKNOWN_CONTRACT', why: 'kontrak ini bukan salah satu lapis artefak Lencana yang dikenal — jawaban kontrak karangan tidak bisa dipercaya', signer, ...meta }

  let read: OwnershipRead
  try {
    read = await reader.read(fields.contract, BigInt(fields.tokenId))
  } catch (e) {
    const err = e as OwnershipReadError
    return err.reverted
      ? { verdict: 'NO_TOKEN', why: 'tidak ada artefak dengan token ID itu di kontrak tersebut', signer, ...meta }
      : { verdict: 'UNREADABLE', why: `chain tidak terbaca: ${err.message}`, signer, ...meta }
  }
  if (read.credential.toLowerCase() !== fields.credential) return { verdict: 'HASH_MISMATCH', why: 'token itu ada, tetapi terikat ke kredensial lain daripada yang disebut pernyataan', signer, owner: read.owner, locked: read.locked, ...meta }
  if (read.owner.toLowerCase() !== signer.toLowerCase()) return { verdict: 'NOT_OWNER', why: 'pemilik token di chain saat ini bukan dompet yang menandatangani', signer, owner: read.owner, locked: read.locked, ...meta }
  return { verdict: 'VALID', why: 'penandatangan memegang kunci dompet yang kini tercatat sebagai pemilik artefak ini di chain', signer, owner: read.owner, locked: read.locked, ...meta }
}
