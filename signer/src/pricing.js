/**
 * `src/pricing.js` — harga sewa agen per aktivitas penilaian (B119, keputusan builder D53 + D54).
 *
 * Tiga keputusan builder 1 Okt, ditegakkan di sini:
 *   1. **Label tingkat berat dipilih AGEN**, bukan penerbit dan bukan Lencana — "yang menilai kan
 *      agentnya, dia yang merasakan". Label masuk ke pesan yang ditandatangani agen, jadi pilihannya
 *      tercatat atas namanya dan tidak bisa diubah sesudahnya.
 *   2. **Harga dasar = tarif Agent Owner**, ditulis pemilik identitas sendiri di registry ERC-8004
 *      (`lencana.baseTariff`, lihat `erc8004.js`).
 *   3. **Kenaikan per tingkat ditentukan Lencana, dan sengaja kecil.**
 *
 * Kenaikan yang dipilih (keputusan Lencana, satu tempat): **5% dari tarif dasar per tingkat**, jadi
 * "sangat berat" = 1,30 × "sangat ringan". Alasannya konflik kepentingan yang memang ada: agen yang
 * memilih labelnya sendiri juga yang dibayar. Selisih kecil membatasi untung dari menaikkan label —
 * paling banyak +30% — sementara labelnya tetap terbaca dan bisa dipersoalkan reviewer/penerbit.
 *
 * Tangga ini di-hash (`LADDER_HASH`) dan hash-nya ikut tercatat di setiap tagihan, supaya mengubah
 * kenaikan di masa depan tidak diam-diam mengubah arti tagihan lama.
 */

// Lencana-B119 status=SELESAI 2026-10-01 — tujuh label tingkat berat dan kenaikan 5%/tingkat milik Lencana; harga dihitung dari tarif dasar Agent Owner, label dipilih agen. Buktikan ulang: npm run verify:agents. JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { keccak256, toBytes } from 'viem'

export const DIFFICULTY_LABELS = Object.freeze([
  'sangat-ringan', 'ringan', 'cukup-ringan', 'sedang', 'cukup-berat', 'berat', 'sangat-berat',
])
export const STEP_BPS = 500
const BPS = 10000

export const LADDER = Object.freeze({
  schema: 'lencana-difficulty-ladder/1',
  labels: DIFFICULTY_LABELS,
  stepBps: STEP_BPS,
  rule: 'price = baseTariff * (10000 + levelIndex * stepBps) / 10000, rounded down; levelIndex 0 = sangat-ringan',
  labelChosenBy: 'the agent that performs the activity, inside its signed message',
  baseTariffSetBy: 'the Agent Owner, as ERC-8004 identity metadata lencana.baseTariff',
})
export const LADDER_HASH = keccak256(toBytes(JSON.stringify(LADDER)))

export const isLabel = (x) => DIFFICULTY_LABELS.includes(x)

/** @returns {bigint} harga satu aktivitas pada label itu, dari tarif dasar (bigint, satuan terkecil) */
export function priceFor (baseAmount, label) {
  const i = DIFFICULTY_LABELS.indexOf(label)
  if (i < 0) throw new Error(`unknown difficulty label: ${label}`)
  const base = BigInt(baseAmount)
  if (base <= 0n) throw new Error('base tariff must be positive')
  return (base * BigInt(BPS + i * STEP_BPS)) / BigInt(BPS)
}

/** Seluruh tabel harga untuk satu tarif dasar — yang disajikan ke penerbit sebelum ia menyewa. */
export function rateCard (baseAmount) {
  return DIFFICULTY_LABELS.map((label) => ({ label, amount: priceFor(baseAmount, label).toString() }))
}
