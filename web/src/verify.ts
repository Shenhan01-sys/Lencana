/**
 * Data layer verifikasi. SENGAJA bebas-DOM dan bebas-framework.
 *
 * Alasannya praktis dan sudah terbukti perlu di proyek ini: berkas ini bisa dijalankan di
 * Node terhadap fork chain sungguhan (lihat `scripts/probe.ts`). Jadi klaim "halaman
 * verifikasinya membaca data yang benar" bisa DIUJI, bukan dipercaya dari tampilannya.
 *
 * Prinsip yang menjaga seluruh halaman: **tidak ada pembacaan yang boleh gagal diam-diam.**
 * Setiap panggilan dicatat (label + argumen + hasil atau error) dan daftar itu ditampilkan,
 * supaya kegagalan baca tidak bisa menyamar sebagai "semua normal".
 */
import { createPublicClient, http, toFunctionSelector, type Address, type Hex, type PublicClient } from 'viem'
import {
  basAbi,
  credentialResolverAbi,
  schemaRegistryAbi,
  soulboundCertAbi,
  EMPTY_UID,
  ERC5192_INTERFACE_ID,
} from './abi'

const ZERO_ADDR = '0x0000000000000000000000000000000000000000' as Address

export type Endpoint = {
  rpcUrl: string
  /** CredentialResolver kita. Belum ter-deploy → isi address nol dan halaman menjelaskan. */
  resolver: Address
  /** SoulboundCert kita. */
  cert: Address
  /** BAS core di chain ini (fork EAS 1.3.0) — bukan milik kita, address diverifikasi. */
  bas: Address
  chainId: number
  label: string
}

export type ReadLog = { label: string; target: Address; args: string; ok: boolean; result: string }

export type Interpretation = 'credentialHash' | 'attestationUid' | 'sbtTokenId' | 'issuerAddress' | 'unresolved'

export type Verdict = 'VALID' | 'REVOKED' | 'EXPIRED' | 'NOT_FOUND' | 'WRONG_CHAIN' | 'NOT_CONFIGURED' | 'UNREACHABLE'

export type ChainMeta = {
  chainId: number
  expectedChainId: number
  blockNumber: bigint
  blockTimestamp: number
  name: string
  explorer: string
  isTestnet: boolean
}

export type CredentialInfo = {
  hash: Hex | null
  uid: Hex | null
  exists: boolean
  revoked: boolean
  expired: boolean
  issuer: Address | null
  holder: Address | null
  attester: Address | null
  recipient: Address | null
  issuedAt: number
  expiresAt: number
  revocationTime: number
  attestationTime: number
  revocable: boolean
  ours: boolean
  schemaUid: Hex | null
  courseId: Hex | null
  refUid: Hex | null
  dataNote: string
}

export type ResolverInfo = {
  address: Address
  schemaUid: Hex | null
  schemaString: string | null
  schemaRevocable: boolean | null
  owner: Address | null
  issuerApproved: boolean | null
  bas: Address | null
  schemaRegistry: Address | null
  schemaRecord: { uid: Hex; resolver: Address; revocable: boolean; schema: string } | null
  hasCode: boolean
}

export type CertInfo = {
  address: Address | null
  name: string | null
  symbol: string | null
  tokenId: string | null
  owner: Address | null
  locked: boolean | null
  tokenUri: string | null
  supportsErc5192: boolean | null
  holderBalance: string | null
  wiredToThisResolver: boolean | null
  hasCode: boolean
}

export type ChainNode = { uid: Hex; status: 'ACTIVE' | 'REVOKED' | 'EXPIRED' | 'UNKNOWN'; depth: number }

export type Report = {
  input: { raw: string; interpretedAs: Interpretation; note: string }
  endpoint: Endpoint
  chain: ChainMeta | null
  verdict: Verdict
  reasons: string[]
  credential: CredentialInfo
  resolver: ResolverInfo
  cert: CertInfo
  anchors: { evidenceTimestamp: number | null; offchainRevokedByIssuer: number | null }
  chainHistory: ChainNode[]
  readLog: ReadLog[]
  reproduction: { cast: string[]; curl: string[]; selectors: { name: string; selector: string }[] }
  limits: string[]
  generatedAt: number
}

const LIMITS = [
  'Yang dibuktikan di sini: sebuah ALAMAT menandatangani dan statusnya di chain. Yang TIDAK dibuktikan: bahwa orang yang berdiri di depan layar adalah pemilik alamat itu.',
  'Soulbound tidak mencegah screenshot, penyalinan gambar, atau penyimpanan PDF.',
  'Kredensial yang dicabut TETAP SELAMANYA terbaca sebagai "dicabut". Itu disengaja: riwayat tidak boleh bisa dibersihkan.',
  'Kedaluwarsa bukan pencabutan. Keduanya punya baris sendiri dan tidak boleh digabung.',
  'Kebenaran HASIL PENILAIAN tidak bisa dibuktikan on-chain. Yang terbukti hanyalah bahwa penerbit berizin menyatakan peserta ini lulus.',
  'Pengakuan hukum atau institusional atas kredensial ini TIDAK diklaim.',
  'Halaman ini membaca chain langsung, tanpa backend kami di jalur verifikasi. Status kebenaran selalu gratis; yang berbayar hanyalah kenyamanan (verifikasi massal).',
]

/** Default: BSC testnet. BAS core & registry diverifikasi keberadaannya (lihat Concepts/BNB-Attestation-Service). */
export function defaultEndpoint(): Endpoint {
  return {
    rpcUrl: 'https://bsc-testnet.publicnode.com',
    resolver: ZERO_ADDR,
    cert: ZERO_ADDR,
    bas: '0x6c2270298b1e6046898a322acB3Cbad6F99f7CBD',
    chainId: 97,
    label: 'BNB Smart Chain Testnet',
  }
}

export function mainnetEndpoint(): Endpoint {
  return {
    rpcUrl: 'https://bsc-dataseed1.bnbchain.org/',
    resolver: ZERO_ADDR,
    cert: ZERO_ADDR,
    bas: '0x247Fe62d887bc9410c3848DF2f322e52DA9a51bC',
    chainId: 56,
    label: 'BNB Smart Chain Mainnet',
  }
}

const CHAIN_NAMES: Record<number, { name: string; explorer: string; testnet: boolean }> = {
  56: { name: 'BNB Smart Chain Mainnet', explorer: 'https://bscscan.com', testnet: false },
  97: { name: 'BNB Smart Chain Testnet', explorer: 'https://testnet.bscscan.com', testnet: true },
  31337: { name: 'Anvil lokal (fork)', explorer: '', testnet: true },
}

function chainName(id: number) {
  return CHAIN_NAMES[id] ?? { name: `chainId ${id}`, explorer: '', testnet: true }
}

export function makeClient(ep: Endpoint): PublicClient {
  return createPublicClient({ transport: http(ep.rpcUrl, { timeout: 25_000, retryCount: 1 }) })
}

function isBytes32(s: string) {
  return /^0x[0-9a-fA-F]{64}$/.test(s)
}
function isAddressShape(s: string) {
  return /^0x[0-9a-fA-F]{40}$/.test(s)
}
function isDecimal(s: string) {
  return /^[0-9]{1,78}$/.test(s)
}

export function hexToDecimalString(hex: Hex): string {
  return BigInt(hex === '0x' ? '0' : hex).toString()
}
export function decimalStringToHex(dec: string): Hex {
  return (`0x${BigInt(dec).toString(16).padStart(64, '0')}`) as Hex
}

/**
 * `attestation.data` kita = abi.encode(credentialHash, courseId) → 64 byte.
 * Dipotong manual supaya halaman tetap bisa menampilkan isinya walau panjangnya tak terduga,
 * dan panjang aneh itu dilaporkan, tidak ditelan.
 */
export function decodeData(data: Hex): { credentialHash: Hex | null; courseId: Hex | null; note: string } {
  const bytes = Math.max(0, (data.length - 2) / 2)
  if (bytes < 64) return { credentialHash: null, courseId: null, note: `data hanya ${bytes} B — kurang dari 64 B yang diharapkan` }
  return {
    credentialHash: `0x${data.slice(2, 66)}` as Hex,
    courseId: `0x${data.slice(66, 130)}` as Hex,
    note: bytes === 64 ? '64 B, sesuai layout (credentialHash, courseId)' : `${bytes} B — hanya 2 word pertama yang dibaca`,
  }
}

function fmt(v: unknown): string {
  if (v === null || v === undefined) return String(v)
  if (typeof v === 'bigint') return v.toString()
  if (typeof v === 'object') {
    try {
      return JSON.stringify(v, (_k, val) => (typeof val === 'bigint' ? val.toString() : val)) ?? String(v)
    } catch {
      return String(v)
    }
  }
  return String(v)
}

const emptyCredential = (): CredentialInfo => ({
  hash: null,
  uid: null,
  exists: false,
  revoked: false,
  expired: false,
  issuer: null,
  holder: null,
  attester: null,
  recipient: null,
  issuedAt: 0,
  expiresAt: 0,
  revocationTime: 0,
  attestationTime: 0,
  revocable: false,
  ours: false,
  schemaUid: null,
  courseId: null,
  refUid: null,
  dataNote: '',
})

/**
 * Membaca segalanya tentang satu masukan dan mengembalikan laporan lengkap.
 * Tidak melempar exception untuk kegagalan pembacaan chain: semuanya jadi baris di
 * `readLog`. Halaman yang mati separuh lebih buruk daripada halaman yang melaporkan apa
 * yang gagal.
 */
export async function verify(rawInput: string, ep: Endpoint): Promise<Report> {
  const client = makeClient(ep)
  const log: ReadLog[] = []
  const reasons: string[] = []
  const input = (rawInput ?? '').trim()

  const report: Report = {
    input: { raw: input, interpretedAs: 'unresolved', note: '' },
    endpoint: ep,
    chain: null,
    verdict: 'NOT_CONFIGURED',
    reasons,
    credential: emptyCredential(),
    resolver: {
      address: ep.resolver,
      schemaUid: null,
      schemaString: null,
      schemaRevocable: null,
      owner: null,
      issuerApproved: null,
      bas: ep.bas,
      schemaRegistry: null,
      schemaRecord: null,
      hasCode: false,
    },
    cert: {
      address: ep.cert,
      name: null,
      symbol: null,
      tokenId: null,
      owner: null,
      locked: null,
      tokenUri: null,
      supportsErc5192: null,
      holderBalance: null,
      wiredToThisResolver: null,
      hasCode: false,
    },
    anchors: { evidenceTimestamp: null, offchainRevokedByIssuer: null },
    chainHistory: [],
    readLog: log,
    reproduction: { cast: [], curl: [], selectors: [] },
    limits: LIMITS,
    generatedAt: Date.now(),
  }

  /**
   * Pembacaan chain seragam: selalu mencatat, tidak pernah melempar.
   *
   * `fn` sengaja menerima `Promise<unknown>` dan hasil-cast terjadi di SATU tempat ini.
   * Viem mengembalikan `unknown` untuk ABI human-readable di dalam posisi callback bertipe
   * generic, dan menuliskan 33 cast di 33 pemanggilan justru menyembunyikan tempat yang
   * benar-benar perlu diperiksa. Yang menjaga kebenarannya: `scripts/probe.ts` menjalankan
   * berkas ini terhadap fork sungguhan dan membandingkan angkanya dengan hasil forge test.
   */
  async function read<T>(label: string, target: Address, args: string, fn: () => Promise<unknown>): Promise<T | null> {
    if (!target || target === ZERO_ADDR) {
      log.push({ label, target, args, ok: false, result: 'target address belum dikonfigurasi — panggilan dilewati' })
      return null
    }
    try {
      const v = await fn()
      log.push({ label, target, args, ok: true, result: fmt(v) })
      return v as T
    } catch (e) {
      log.push({ label, target, args, ok: false, result: (e as Error).message.slice(0, 240) })
      return null
    }
  }

  // -------------------------------------------- 0. konfigurasi & chain
  if (!input) {
    report.input.note = 'Masukan kosong.'
    return report
  }
  if (!ep.rpcUrl) {
    report.verdict = 'NOT_CONFIGURED'
    report.input.note = 'URL RPC kosong.'
    return report
  }
  if (ep.resolver === ZERO_ADDR) {
    report.verdict = 'NOT_CONFIGURED'
    report.input.note =
      'Address CredentialResolver belum diisi. Lapis on-chain sudah lulus 47 test di fork chain 97 dan 56, ' +
      'tapi kontraknya belum disiarkan. Isi address di panel konfigurasi setelah deploy.'
    return report
  }

  const rpcChainId = await read<number>('eth_chainId', ep.resolver, '', () => client.getChainId())
  const nowBlock = await read<bigint>('eth_blockNumber', ep.resolver, '', () => client.getBlockNumber())
  const latest = await read<{ timestamp: bigint }>('eth_getBlockByNumber(latest)', ep.resolver, '', async () => {
    const b = await client.getBlock()
    return { timestamp: b.timestamp }
  })
  const resolverCode = await read<Hex | undefined>('eth_getCode(resolver)', ep.resolver, '', () =>
    client.getBytecode({ address: ep.resolver }),
  )
  const basCode = await read<Hex | undefined>('eth_getCode(BAS)', ep.bas, '', () => client.getBytecode({ address: ep.bas }))
  const certCode = ep.cert !== ZERO_ADDR ? await read<Hex | undefined>('eth_getCode(cert)', ep.cert, '', () => client.getBytecode({ address: ep.cert })) : undefined

  const got = rpcChainId ?? 0
  const meta = chainName(got || ep.chainId)
  report.chain = {
    chainId: got,
    expectedChainId: ep.chainId,
    blockNumber: nowBlock ?? 0n,
    blockTimestamp: latest ? Number(latest.timestamp) : Math.floor(Date.now() / 1000),
    name: meta.name,
    explorer: meta.explorer,
    isTestnet: meta.testnet,
  }
  report.resolver.hasCode = Boolean(resolverCode && resolverCode !== '0x')
  report.cert.hasCode = Boolean(certCode && certCode !== '0x')

  // RPC tidak menjawab sama sekali. Bedakan ini dari "kredensial tidak ada": kalau dua hal
  // ini disatukan, node mati akan terbaca sebagai sertifikat palsu — dan itu jenis kesalahan
  // yang paling mahal di produk verifikasi.
  if (rpcChainId === null) {
    report.verdict = 'UNREACHABLE'
    reasons.push(
      `RPC ${ep.rpcUrl} tidak menjawab (chainId tidak terbaca). Konfigurasi sudah diisi — yang tidak bisa dihubungi adalah node-nya. Ganti RPC atau nyalakan ulang simpulnya; jangan simpulkan apa pun tentang kredensialnya.`,
    )
    return report
  }

  if (got && got !== ep.chainId) {
    report.verdict = 'WRONG_CHAIN'
    reasons.push(
      `RPC menjawab chainId ${got} tetapi konfigurasi mengharapkan ${ep.chainId}. Kami sengaja TIDAK menampilkan hasil: pembacaan dari chain lain bukan bukti apa pun.`,
    )
    return report
  }
  if (!report.resolver.hasCode) {
    report.verdict = 'NOT_FOUND'
    reasons.push(
      `RPC hidup (chainId ${got}) tapi tidak ada bytecode di address resolver yang dikonfigurasi. Artinya address salah, atau kontraknya belum di-deploy di chain ini.`,
    )
    return report
  }
  if (!basCode || basCode === '0x') {
    reasons.push('BAS core yang dikonfigurasi tidak punya kode di chain ini — periksa address-nya, jangan percaya catatan kami buta-buta.')
  }

  // -------------------------------------------- 1. metadata resolver
  report.resolver.schemaUid = await read<Hex>('CredentialResolver.schemaUID()', ep.resolver, '', () =>
    client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'schemaUID' }),
  )
  report.resolver.schemaString = await read<string>('CredentialResolver.CREDENTIAL_SCHEMA()', ep.resolver, '', () =>
    client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'CREDENTIAL_SCHEMA' }),
  )
  report.resolver.schemaRevocable = await read<boolean>('CredentialResolver.SCHEMA_REVOCABLE()', ep.resolver, '', () =>
    client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'SCHEMA_REVOCABLE' }),
  )
  report.resolver.owner = await read<Address>('CredentialResolver.owner()', ep.resolver, '', () =>
    client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'owner' }),
  )
  report.resolver.schemaRegistry = await read<Address>('IEAS.getSchemaRegistry()', ep.bas, '', () =>
    client.readContract({ address: ep.bas, abi: basAbi, functionName: 'getSchemaRegistry' }),
  )

  // -------------------------------------------- 2. tafsirkan masukan
  let credentialHash: Hex | null = null
  let uid: Hex | null = null
  let tokenId: string | null = null

  if (isAddressShape(input)) {
    report.input.interpretedAs = 'issuerAddress'
    report.input.note = 'Input adalah address 20 byte → ditafsirkan sebagai pengecekan penerbit/koleksi, bukan kredensial tunggal.'
    report.resolver.issuerApproved = await read<boolean>('CredentialResolver.isIssuer(input)', ep.resolver, input, () =>
      client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'isIssuer', args: [input as Address] }),
    )
    report.cert.holderBalance = await read<string>('SoulboundCert.balanceOf(input)', ep.cert, input, () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'balanceOf', args: [input as Address] }),
    )
    finish(report, ep)
    return report
  }

  if (isBytes32(input)) {
    const mapped = await read<Hex>('CredentialResolver.attestationOf(input)', ep.resolver, input, () =>
      client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'attestationOf', args: [input as Hex] }),
    )
    if (mapped && mapped !== EMPTY_UID) {
      credentialHash = input as Hex
      uid = mapped
      report.input.interpretedAs = 'credentialHash'
      report.input.note = 'Dikenali sebagai credentialHash: resolver memetakannya ke sebuah UID attestation.'
    } else {
      const ours = await read<boolean>('CredentialResolver.issuedHere(input)', ep.resolver, input, () =>
        client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'issuedHere', args: [input as Hex] }),
      )
      if (ours) {
        uid = input as Hex
        report.input.interpretedAs = 'attestationUid'
        report.input.note = 'Dikenali sebagai UID attestation milik resolver ini. credentialHash diambil dari field `data` attestation-nya.'
      } else {
        report.input.note =
          'bytes32, tapi tidak dikenali sebagai credentialHash maupun sebagai attestation yang diterbitkan lewat resolver ini. ' +
          'Artinya: tidak pernah terbit di sistem kami, atau benda lain sama sekali.'
      }
    }
  } else if (isDecimal(input)) {
    tokenId = input
    report.input.interpretedAs = 'sbtTokenId'
    const fromCert = await read<Hex>('SoulboundCert.credentialOf(tokenId)', ep.cert, input, () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'credentialOf', args: [BigInt(input)] }),
    )
    if (fromCert && fromCert !== EMPTY_UID) {
      credentialHash = fromCert
      report.input.note = 'Input adalah tokenId artefak; hash kredensialnya terbaca dari kontrak SBT.'
    } else {
      report.input.note = 'tokenId ini tidak punya kredensial tercatat di kontrak artefak.'
    }
  } else {
    report.input.note = 'Input bukan 0x…64hex (hash/UID), bukan 0x…40hex (address), dan bukan angka decimal (tokenId).'
    finish(report, ep)
    return report
  }

  // -------------------------------------------- 3. status dari resolver kita
  if (credentialHash) {
    const st = await read<readonly [boolean, boolean, boolean, Address, bigint, bigint]>(
      'CredentialResolver.statusOf(hash)',
      ep.resolver,
      credentialHash,
      () =>
        client.readContract({
          address: ep.resolver,
          abi: credentialResolverAbi,
          functionName: 'statusOf',
          args: [credentialHash as Hex],
        }),
    )
    if (st) {
      report.credential.hash = credentialHash
      report.credential.exists = st[0]
      report.credential.revoked = st[1]
      report.credential.expired = st[2]
      report.credential.issuer = st[3]
      report.credential.issuedAt = Number(st[4])
      report.credential.expiresAt = Number(st[5])
    }
    report.credential.holder = await read<Address>('CredentialResolver.holderOf(hash)', ep.resolver, credentialHash, () =>
      client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'holderOf', args: [credentialHash as Hex] }),
    )
    if (!uid) {
      uid = await read<Hex>('CredentialResolver.attestationOf(hash)', ep.resolver, credentialHash, () =>
        client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'attestationOf', args: [credentialHash as Hex] }),
      )
    }
    report.credential.uid = uid
  }

  // -------------------------------------------- 4. attestation mentah di BAS
  if (uid && ep.bas !== ZERO_ADDR) {
    const att = await read<{
      uid: Hex
      schema: Hex
      time: bigint
      expirationTime: bigint
      revocationTime: bigint
      refUID: Hex
      recipient: Address
      attester: Address
      revocable: boolean
      data: Hex
    }>('IEAS.getAttestation(uid)', ep.bas, uid, () =>
      client.readContract({ address: ep.bas, abi: basAbi, functionName: 'getAttestation', args: [uid as Hex] }),
    )
    if (att) {
      const dec = decodeData(att.data)
      const nowT = report.chain.blockTimestamp
      Object.assign(report.credential, {
        uid: att.uid,
        schemaUid: att.schema,
        attestationTime: Number(att.time),
        issuedAt: report.credential.issuedAt || Number(att.time),
        expiresAt: report.credential.expiresAt || Number(att.expirationTime),
        revocationTime: Number(att.revocationTime),
        revoked: report.credential.revoked || Number(att.revocationTime) !== 0,
        revocable: att.revocable,
        attester: att.attester,
        recipient: att.recipient,
        holder: report.credential.holder ?? att.recipient,
        refUid: att.refUID,
        courseId: dec.courseId,
        dataNote: dec.note,
        expired: report.credential.expired || (Number(att.expirationTime) !== 0 && Number(att.expirationTime) < nowT),
      } satisfies Partial<CredentialInfo>)
      if (!credentialHash && dec.credentialHash) {
        credentialHash = dec.credentialHash
        report.credential.hash = dec.credentialHash
      }
      if (!report.credential.issuer) report.credential.issuer = att.attester
    }

    report.credential.ours = Boolean(
      await read<boolean>('CredentialResolver.issuedHere(uid)', ep.resolver, uid, () =>
        client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'issuedHere', args: [uid as Hex] }),
      ),
    )

    if (report.resolver.schemaRegistry && report.credential.schemaUid) {
      report.resolver.schemaRecord = await read('ISchemaRegistry.getSchema(schemaUid)', report.resolver.schemaRegistry, report.credential.schemaUid, () =>
        client.readContract({
          address: report.resolver.schemaRegistry as Address,
          abi: schemaRegistryAbi,
          functionName: 'getSchema',
          args: [report.credential.schemaUid as Hex],
        }),
      )
    }
  }

  // -------------------------------------------- 5. rantai prasyarat (rekursif)
  if (uid) {
    let cursor: Hex | null = uid
    for (let depth = 0; depth < 12; depth += 1) {
      const prereq: Hex | null = cursor
        ? await read<Hex>('CredentialResolver.prerequisiteOf(uid)', ep.resolver, cursor, () =>
            client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'prerequisiteOf', args: [cursor as Hex] }),
          )
        : null
      if (!prereq || prereq === EMPTY_UID) break

      let state: ChainNode['status'] = 'UNKNOWN'
      const pre = await read<{ revocationTime: bigint; expirationTime: bigint }>('IEAS.getAttestation(prereq)', ep.bas, prereq, () =>
        client.readContract({ address: ep.bas, abi: basAbi, functionName: 'getAttestation', args: [prereq as Hex] }),
      )
      if (pre) {
        const rt = Number(pre.revocationTime)
        const et = Number(pre.expirationTime)
        state = rt !== 0 ? 'REVOKED' : et !== 0 && et < report.chain.blockTimestamp ? 'EXPIRED' : 'ACTIVE'
      }
      report.chainHistory.push({ uid: prereq, status: state, depth: depth + 1 })
      cursor = prereq
    }
  }

  // -------------------------------------------- 6. artefak soulbound
  if (ep.cert !== ZERO_ADDR) {
    report.cert.address = ep.cert
    if (!tokenId && credentialHash) {
      const t = await read<bigint>('SoulboundCert.tokenOfCredential(hash)', ep.cert, credentialHash, () =>
        client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'tokenOfCredential', args: [credentialHash as Hex] }),
      )
      if (t && t > 0n) tokenId = t.toString()
    }
    report.cert.tokenId = tokenId
    report.cert.name = await read<string>('SoulboundCert.name()', ep.cert, '', () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'name' }),
    )
    report.cert.symbol = await read<string>('SoulboundCert.symbol()', ep.cert, '', () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'symbol' }),
    )
    report.cert.supportsErc5192 = await read<boolean>('SoulboundCert.supportsInterface(0xb45a3c0e)', ep.cert, ERC5192_INTERFACE_ID, () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'supportsInterface', args: [ERC5192_INTERFACE_ID] }),
    )
    const wired = await read<Address>('SoulboundCert.registry()', ep.cert, ep.resolver, () =>
      client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'registry' }),
    )
    report.cert.wiredToThisResolver = wired ? wired.toLowerCase() === ep.resolver.toLowerCase() : null

    if (tokenId) {
      const tid = BigInt(tokenId)
      report.cert.owner = await read<Address>('SoulboundCert.ownerOf(tokenId)', ep.cert, tokenId, () =>
        client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'ownerOf', args: [tid] }),
      )
      report.cert.locked = await read<boolean>('SoulboundCert.locked(tokenId)', ep.cert, tokenId, () =>
        client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'locked', args: [tid] }),
      )
      report.cert.tokenUri = await read<string>('SoulboundCert.tokenURI(tokenId)', ep.cert, tokenId, () =>
        client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'tokenURI', args: [tid] }),
      )
      if (report.cert.owner) {
        report.cert.holderBalance = await read<string>('SoulboundCert.balanceOf(owner)', ep.cert, report.cert.owner, () =>
          client.readContract({ address: ep.cert, abi: soulboundCertAbi, functionName: 'balanceOf', args: [report.cert.owner as Address] }),
        )
      }
    }
  }

  // -------------------------------------------- 7. anchor tambahan BAS
  if (ep.bas !== ZERO_ADDR && credentialHash) {
    const ts = await read<bigint>('IEAS.getTimestamp(hash)', ep.bas, credentialHash, () =>
      client.readContract({ address: ep.bas, abi: basAbi, functionName: 'getTimestamp', args: [credentialHash as Hex] }),
    )
    report.anchors.evidenceTimestamp = ts === null ? null : Number(ts)
    if (report.credential.issuer) {
      const off = await read<bigint>('IEAS.getRevokeOffchain(issuer, hash)', ep.bas, `${report.credential.issuer},${credentialHash}`, () =>
        client.readContract({
          address: ep.bas,
          abi: basAbi,
          functionName: 'getRevokeOffchain',
          args: [report.credential.issuer as Address, credentialHash as Hex],
        }),
      )
      report.anchors.offchainRevokedByIssuer = off === null ? null : Number(off)
    }
  }

  // -------------------------------------------- 8. izin penerbit akhir
  if (report.credential.issuer) {
    report.resolver.issuerApproved = await read<boolean>('CredentialResolver.isIssuer(issuer)', ep.resolver, report.credential.issuer, () =>
      client.readContract({ address: ep.resolver, abi: credentialResolverAbi, functionName: 'isIssuer', args: [report.credential.issuer as Address] }),
    )
  }

  // -------------------------------------------- 9. keputusan
  const c = report.credential
  const now = report.chain.blockTimestamp
  if (!c.hash || (!c.exists && !c.uid)) {
    report.verdict = 'NOT_FOUND'
    reasons.push('Kredensial ini tidak tercatat di resolver yang dikonfigurasi. "Tidak ada" berarti tidak pernah diterbitkan lewat sistem kami.')
  } else if (!c.ours) {
    report.verdict = 'NOT_FOUND'
    reasons.push(
      'Objeknya ada di chain, tapi BUKAN diterbitkan lewat resolver kami. Attestation pihak lain tidak otomatis menjadi kredensial kami — dan itulah salah satu yang kita tutup.',
    )
  } else if (c.revoked) {
    report.verdict = 'REVOKED'
    reasons.push(
      `Dicabut oleh penerbit yang sama${c.revocationTime ? ` pada ${new Date(c.revocationTime * 1000).toISOString()}` : ''}. Pencabutan satu arah: tidak ada fungsi untuk membatalkannya, dan jejaknya tetap terbaca selamanya.`,
    )
  } else if (c.expiresAt !== 0 && c.expiresAt < now) {
    report.verdict = 'EXPIRED'
    reasons.push(
      `Kedaluwarsa ${new Date(c.expiresAt * 1000).toISOString()} (${Math.max(0, Math.round((now - c.expiresAt) / 86400))} hari lalu) — berubah sendiri, tanpa ada yang menyentuh apa pun.`,
    )
  } else {
    report.verdict = 'VALID'
    reasons.push('Diterbitkan oleh penerbit yang terdaftar di resolver, belum dicabut, dan belum kedaluwarsa.')
    if (c.expiresAt !== 0) reasons.push(`Berlaku sampai ${new Date(c.expiresAt * 1000).toISOString()}.`)
    else reasons.push('Tanpa tanggal kedaluwarsa. Rancangan kita mewajibkan expiry, jadi kredensial seperti ini layak dipertanyakan.')
  }

  if (report.resolver.schemaUid && c.schemaUid && c.schemaUid.toLowerCase() !== report.resolver.schemaUid.toLowerCase()) {
    reasons.push('AWAS: UID schema attestation ini berbeda dari UID schema resolver. Jangan terima kredensial dari schema lain.')
  }
  const badLink = report.chainHistory.find((n) => n.status !== 'ACTIVE')
  if (badLink) {
    reasons.push(`Mata rantai prasyarat #${badLink.depth} berstatus ${badLink.status}. Buka panel rantai untuk melihatnya.`)
  }
  if (report.resolver.issuerApproved === false && c.issuer) {
    reasons.push(
      'Penerbit ini SUDAK TIDAK berizin menerbitkan lagi — tapi kredensial yang terbit sebelumnya tetap sah sampai dicabut satu per satu. Dipisahkan sengaja: mencabut izin satu penerbit nakal tidak boleh memusnahkan hak peserta yang benar.',
    )
  }
  if (report.cert.tokenId && !report.cert.hasCode) {
    reasons.push('Kontrak artefak belum dikonfigurasi/ter-deploy — panel artefak tidak bisa diisi.')
  }

  finish(report, ep)
  return report
}

/** Perintah ulang-tanpa-halaman + selector mentah. Ini bagian produk, bukan hiasan. */
function finish(r: Report, ep: Endpoint) {
  const subject = r.credential.hash ?? r.credential.uid ?? (isBytes32(r.input.raw) ? r.input.raw : EMPTY_UID)
  r.reproduction.cast = [
    `cast call ${ep.resolver} "statusOf(bytes32)" ${subject} --rpc-url ${ep.rpcUrl}`,
    `cast call ${ep.resolver} "holderOf(bytes32)" ${subject} --rpc-url ${ep.rpcUrl}`,
    `cast call ${ep.resolver} "schemaUID()" --rpc-url ${ep.rpcUrl}`,
    r.credential.uid && ep.bas !== ZERO_ADDR ? `cast call ${ep.bas} "getAttestation(bytes32)" ${r.credential.uid} --rpc-url ${ep.rpcUrl}` : '',
    r.credential.issuer ? `cast call ${ep.resolver} "isIssuer(address)" ${r.credential.issuer} --rpc-url ${ep.rpcUrl}` : '',
  ].filter(Boolean)

  r.reproduction.curl = [
    `curl -s -X POST ${ep.rpcUrl} -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_chainId","params":[]}'`,
    `curl -s -X POST ${ep.rpcUrl} -H 'content-type:application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"${ep.resolver}","data":"${toFunctionSelector('statusOf(bytes32)')}${subject.slice(2)}"},"latest"]}'`,
  ]

  r.reproduction.selectors = [
    ['statusOf(bytes32)', 'getAttestation(bytes32)', 'holderOf(bytes32)', 'isIssuer(address)', 'schemaUID()', 'locked(uint256)', 'tokenOfCredential(bytes32)'] as string[],
  ]
    .flat()
    .map((sig) => ({ name: sig, selector: toFunctionSelector(sig) }))
}

/** Helper kecil untuk skrip Node: buat laporan tanpa DOM. */
export async function verifyFromNode(input: string, ep: Endpoint): Promise<Report> {
  return verify(input, ep)
}
