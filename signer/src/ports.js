/**
 * `src/ports.js` — mencari port yang benar-benar kosong untuk server yang dinyalakan harness.
 *
 * Kenapa bukan `fetch('/healthz')` lagi (temuan 1 Okt, saat mengerjakan B121): enam harness menganggap
 * port KOSONG kalau `/healthz` tidak menjawab dalam 600–700 ms. Tapi `/healthz` membaca chain untuk
 * setiap hash yang diawasi, jadi server yang hidup-tapi-lambat terbaca kosong. Yang terjadi sungguhan:
 * server yatim dari 30 Sep (kode sebelum B121) memegang 8795, harness menyalakan server baru yang gagal
 * bind tanpa suara, lalu seluruh lapis HTTP berbicara dengan proses lama — `/praktik` dijawab 404 dan
 * tujuh pemeriksaan merah yang menyalahkan kode yang benar. Kelasnya sama dengan B86.
 *
 * Sekarang yang ditanya adalah sistem operasinya: bisakah port ini di-bind? Kalau tidak, ia dipegang
 * proses lain — selambat apa pun proses itu menjawab HTTP.
 */
import { createServer } from 'node:net'

function canBind (port, host) {
  return new Promise((resolve) => {
    const srv = createServer()
    srv.once('error', () => resolve(false))
    srv.once('listening', () => srv.close(() => resolve(true)))
    srv.listen(port, host)
  })
}

/** Port pertama dari `from` yang bisa di-bind di 127.0.0.1; melapor port yang dilewati. */
export async function freePort (from, span = 14, host = '127.0.0.1') {
  for (let p = from; p < from + span; p++) {
    if (await canBind(p, host)) return p
    console.log(`      port ${p} dipegang proses lain — coba berikutnya`)
  }
  throw new Error(`no free port in ${from}..${from + span - 1} — stop orphan servers first (see src/ports.js)`)
}
