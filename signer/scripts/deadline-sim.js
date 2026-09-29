/**
 * `npm run sim:deadline` — simulator untuk ide B90 (durasi dipilih peserta + cashback).
 *
 * Kenapa ini dijalankan SEBELUM kontrak ditulis: ide ini punya satu klaim implisit yang belum
 * pernah diukur — "peserta yang memilih 5 hari akan benar-benar selesai dalam 5 hari". Kalau itu
 * tidak benar, skema ini bukan insentif, melainkan biaya penalti yang dibayar orang yang salah
 * menghitung dirinya sendiri. Dan builder sudah menyetujui urutan ini (29 Sep: "setuju nomor 2").
 *
 * Yang dilakukan: bagi distribusi waktu-untuk-selesai, lalu hitung untuk tiap durasi yang bisa
 * dipilih (5/7/9 hari): peluang hangus, harapan cashback untuk peserta, harapan penerimaan
 * penerbit, dan — yang paling menentukan — **durasi mana yang paling rasional dipilih**.
 * Kalau jawaban pertanyaan terakhir selalu "9 hari", skemanya tidak memotivasi siapa pun: ia cuma
 * menjual asuransi yang tidak dipakai, dan peserta yang paling butuh uang justru yang paling
 * mungkin memilih 5 hari lalu hangus.
 *
 * Angkanya BUKAN data kita. Rekaman waktu-selesai yang sah cuma ada di `progress_events` milik
 * peserta UJI (kunci dibuat harness, 19 lesson diisi dalam hitungan menit) — tidak ada satu pun
 * hari kalender nyata di dalamnya. Jadi yang diuji di sini adalah **apakah bentuk insentifnya tahan
 * terhadap asumsi**, bukan "berapa perilaku peserta kita". Distribusinya digilir sengaja (lognormal
 * dengan tiga media + dua ekor) supaya hasilnya tidak bergantung pada satu titik pilihan.
 */

const DAYS = [5, 7, 9]

/** schedule(d) = fraksi dana yang DIKEMBALIKAN ke peserta kalau selesai dalam tenggat d. */
const SCHEDULES = {
  'A: 5d→40% 7d→25% 9d→0%': { 5: 0.40, 7: 0.25, 9: 0 },
  'B: 5d→25% 7d→15% 9d→0%': { 5: 0.25, 7: 0.15, 9: 0 },
  'C: 5d→40% 7d→40% 9d→0% (floor hangus 60%)': { 5: 0.40, 7: 0.40, 9: 0 },
  'D: tanpa hangus — 5d→20% 7d→10% 9d→0%': { 5: 0.20, 7: 0.10, 9: 0 },
}

/**
 * Waktu selesai (hari) untuk tiga dunia: rata-rata cepat, rata-rata lambat, dan satu kelompok
 * yang optimis. Yang ketiga penting: ia adalah peserta yang memilih 5 hari.
 */
function quantileTable () {
  // Kisi deterministik (bukan RNG) supaya hasil bisa dihitung ulang orang lain baris per baris.
  const rows = []
  for (let i = 1; i <= 999; i++) rows.push(i / 1000)
  const make = (median, sigma) => rows.map((u) => {
    // kuantil lognormal: median * exp(sigma * z), z dari aproksimasi inverse-normal
    const t = Math.sqrt(2) * inverseHazard(Math.max(1e-9, Math.min(1 - 1e-9, u - 0.5)))
    return median * Math.exp(sigma * t)
  })
  return {
    'cepat (median 4d)': make(4, 0.45),
    'nyata-lms (median 9d)': make(9, 0.6),
    'molor (median 14d)': make(14, 0.7),
  }
}

// Aproksimasi Acklam untuk z dari probabilitas kumulatif dua sisi.
function inverseHazard (p) {
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00]
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01]
  const c = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141437859e+00, 2.938163982698783e+00]
  const d = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142948e+00, 3.754408661907416e+00]
  const pl = 0.02425
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1) }
  const q = p - 0.5; const r = q * q
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
}

function stats (samples, deadlineDays, refund, price) {
  let within = 0, back = 0
  for (const t of samples) {
    if (t <= deadlineDays) { within += 1; back += price * refund }
  }
  const n = samples.length
  return {
    pSelesai: within / n,
    pHangus: 1 - within / n,
    harapanKembali: back / n,
    harapanHangus: (price * within / n) * 0 + (price - (back / n)),
    pesertaNet: back / n - price * (within / n) * 0 - (price - back / n),
  }
}

const worlds = quantileTable()
const PRICE = 100 // satuan uang per enrollment, supaya persentase terbaca sebagai rupiah-ish

console.log('\nB90 · simulator durasi-mandiri + cashback')
console.log('  harga acuan 100 satuan · distribusi digilir (3 dunia) karena kita TIDAK punya data')
console.log('  perilaku nyata: peserta uji diisi harness, 19 lesson dalam hitungan menit — bukan hari kalender.\n')

for (const [name, s] of Object.entries(SCHEDULES)) {
  console.log(`— ${name}`)
  const utility = {}
  for (const w of DAYS) {
    utility[w] = {}
    for (const [world, samples] of Object.entries(worlds)) {
      const st = stats(samples, w, s[w], PRICE)
      utility[w][world] = st
      const label = `${w}d/${world.split(' ')[0]}`.padEnd(22)
      console.log(`    ${label} selesai-dalam-tenggat ${(st.pSelesai * 100).toFixed(0).padStart(3)}% · hangus ${(st.pHangus * 100).toFixed(0).padStart(3)}% · kembali ${(st.harapanKembali).toFixed(1)} dari ${PRICE} · penerbit terima ${(st.harapanHangus).toFixed(1)}`)
    }
    // Nilai bagi peserta = uang yang diharapkan kembali dikurangi kerugian hangus yang diharapkan.
    // Untuk harga yang sama, "paling menguntungkan" = harapan kembali terbesar.
    const mean = DAYS.length ? Object.values(utility[w]).reduce((a, v) => a + v.harapanKembali, 0) / Object.values(utility[w]).length : 0
    utility[w].mean = mean
  }
  const best = DAYS.reduce((a, b) => (utility[a].mean >= utility[b].mean ? a : b))
  const worst = DAYS.reduce((a, b) => (utility[a].mean <= utility[b].mean ? a : b))
  const spreadPilih9 = utility[9].mean === Math.max(...DAYS.map((d) => utility[d].mean))
  console.log(`    pilihan rasional (harapan kembali terbesar): ${best} hari`
    + ` · 9 hari ${spreadPilih9 ? 'JUSTRU paling menguntungkan → tidak ada yang mau bertaruh' : 'bukan pilihan terbaik'}`
    + ` · penerbit paling banyak menerima di dunia '${Object.keys(worlds)[0]}' = ${utility[worst][Object.keys(worlds)[0]].harapanHangus.toFixed(1)}`)
  console.log('')
}

/**
 * RUN 2 — perbaikan atas temuan run 1.
 *
 * Run 1 membuktikan ladder "refunds lebih besar untuk tenggat lebih ketat" bukan penalti, tapi
 * diskon yang jarang batal: harapan kembali 5d/7d selalu di atas 9d (yang 0,0), jadi tidak ada
 * peserta rasional yang memilih 9 hari dan penerbit membayar 26-40% ke hampir semua orang.
 *
 * Bentuk yang diperbaiki: **premi tenggat**. Harga dasar sama untuk semua durasi; memilih tenggat
 * ketat membayar premi DI MUKA, dan premi itu **dikembalikan** kalau peserta selesai tepat waktu.
 * Yang hangus hanyalah premi — bukan seluruh biaya kursus. Konsekuensi yang kita mau:
 * peserta yang yakin membayar premi demi pengembalian; peserta yang ragu tidak taruh apa-apa.
 * Tidak ada tier yang didominasi, dan tidak ada orang yang kehilangan 100 satuan karena telat.
 */
const PREMIUM = { 5: 25, 7: 12, 9: 0 }
const BASE = PRICE

console.log('— RUN 2 · premi tenggat (harga dasar 100; premi 5d=25, 7d=12, 9d=0; premi kembali kalau tepat waktu)')
const cost = {}
for (const w of DAYS) {
  cost[w] = {}
  for (const [world, samples] of Object.entries(worlds)) {
    let paid = 0
    for (const t of samples) paid += (t <= w ? BASE : BASE + PREMIUM[w])
    const expected = paid / samples.length
    cost[w][world] = expected
    console.log(`    ${`${w}d/${world.split(' ')[0]}`.padEnd(22)} bayar harapan ${expected.toFixed(2)} dari ${BASE} (premi ${PREMIUM[w]})`)
  }
  const mean = Object.values(cost[w]).reduce((a, v) => a + v, 0) / Object.keys(cost[w]).length
  console.log(`    ${`${w}d`.padEnd(22)} rata-rata tiga dunia: ${mean.toFixed(2)}`)
}
// Yang menentukan: apakah ada durasi yang ALWAYS lebih murah (berarti tier lain tidak dipakai),
// dan apakah urutan harapan biaya mengikuti tingkat keyakinan peserta (yang ragu → 9d paling murah).
for (const world of Object.keys(worlds)) {
  const order = [...DAYS].sort((a, b) => cost[a][world] - cost[b][world])
  console.log(`    ${world.padEnd(24)} paling murah: ${order[0]}d → paling mahal: ${order[order.length - 1]}d`)
}
console.log('    penerbit menerima premi hanya dari yang meleset — tidak membayar diskon ke yang selesai.')
console.log('')

/**
 * Yang boleh disimpulkan dari tabel di atas, dan yang tidak.
 * Boleh: bentuk insentifnya — berapa pun ladder-nya, kalau hangus adalah satu-satunya hasil buruk
 * dan peluangnya tinggi di dunia nyata, peserta yang rasional akan memilih durasi tanpa taruhan.
 * Tidak boleh: menyebut persentasenya "perilaku peserta Lencana", karena distribusinya asumsi,
 * bukan data kita. Itu akan jadi angka tanpa garansi, dan aturan repo ini melarangnya.
 */
console.log('Catatan yang menempel pada angka di atas:')
console.log('  · Distribusinya asumsi (3 dunia), bukan rekaman peserta — lihat komentar berkas ini.')
console.log('  · Yang diuji: apakah ladder cashback mengubah pilihan rasional, bukan memprediksi siapa pun.')
console.log('  · Kontrak yang akan ditulis sesudah ini harus memakai angka yang sama sekali berbeda: bukan')
console.log('    peluang, tapi bukti (siapa yang menandatangani tenggat, dan kapan ia distempel di chain).')
