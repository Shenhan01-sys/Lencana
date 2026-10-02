/**
 * `pricing.ts` — harga kursus (B125, RF7 langkah B). Satu sumber untuk halaman DAN server: `signer/src/server.js`
 * mengimpor berkas ini lewat tsx, jadi angka yang ditampilkan dan angka yang ditagih tidak bisa berbeda.
 *
 * Harga ditetapkan penerbit. Untuk penerbit demo (fiktif) builder memutuskan 2 Okt: Web3 Dasar 10, Web3 Lanjut 25.
 * Disimpan di luar manifest: `manifestHashOf` mengikat isi kursus ke kertas yang sudah terbit, dan harga bukan isi kursus.
 *
 * Tokennya LDC-demo ("Lencana Demo Coin"): ERC-20 milik proyek ini di BSC testnet (chain 97), 6 desimal, `mint` terbuka,
 * dengan `permit` (EIP-2612) sehingga peserta membayar hanya dengan tanda tangan. Koin uji pengganti stablecoin — nilainya
 * nol; di mainnet harga yang sama dibayar dengan stablecoin sungguhan.
 */
import { WEB3_DASAR_ID } from './courses/web3-dasar'
import { WEB3_LANJUT_ID } from './courses/web3-lanjut'
import { UJI_BAYAR_ID } from './courses/uji-bayar'
import { LITERASI_KEUANGAN_ID } from './courses/literasi-keuangan'
import { KEAMANAN_AKUN_ID } from './courses/keamanan-akun'
import { MENULIS_LAPORAN_ID } from './courses/menulis-laporan'
import { MEMBACA_BSCSCAN_ID } from './courses/membaca-bscscan'
import { TOKEN_IZIN_ID } from './courses/token-izin'

export const PAY_TOKEN_SYMBOL = 'LDC-demo'
export const PAY_TOKEN_DECIMALS = 6
/** Dibaca 2 Okt dari chain 97: `symbol()` = "LDC-demo". Harness paywall memastikan alamat ini = `DEMO_TOKEN_ADDRESS` server. */
export const PAY_TOKEN_ADDRESS = '0x0B2fA5050912F4CdB5f7C47A5FAd6A8F9398CBaf'

/** Harga dalam satuan terkecil LDC-demo (6 desimal). */
export const COURSE_PRICES: Record<string, bigint> = {
  [WEB3_DASAR_ID]: 10_000_000n,
  [WEB3_LANJUT_ID]: 25_000_000n,
  // B126: kelas uji untuk menguji bayar dengan akun sungguhan — angka kecil yang dipilih untuk uji, bukan keputusan harga produk.
  [UJI_BAYAR_ID]: 5_000_000n,
  // B127: lima kelas singkat yang bisa didaftari builder dari halaman Kursus. Angka kecil yang dipilih untuk uji (bukan
  // keputusan harga produk): jumlahnya 40, jadi satu kali koin uji (50) cukup untuk kelimanya + kelas uji.
  [LITERASI_KEUANGAN_ID]: 4_000_000n,
  [MEMBACA_BSCSCAN_ID]: 6_000_000n,
  [TOKEN_IZIN_ID]: 8_000_000n,
  [KEAMANAN_AKUN_ID]: 10_000_000n,
  [MENULIS_LAPORAN_ID]: 12_000_000n,
}

export function priceOf (courseId: string): bigint | null {
  return COURSE_PRICES[courseId] ?? null
}

/** 10_000_000n → "10", 2_500_000n → "2.5". */
export function formatLdc (units: bigint): string {
  const scale = 10n ** BigInt(PAY_TOKEN_DECIMALS)
  const whole = units / scale
  const frac = units % scale
  return frac === 0n ? whole.toString() : `${whole}.${frac.toString().padStart(PAY_TOKEN_DECIMALS, '0').replace(/0+$/, '')}`
}

/** Koin uji: berapa yang dikirim per permintaan, dan jedanya per alamat. */
export const FAUCET_AMOUNT = 50_000_000n
export const FAUCET_COOLDOWN_HOURS = 24
