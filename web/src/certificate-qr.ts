/**
 * `certificate-qr.ts` — QR untuk lembar sertifikat (B165), dipisah dari `certificate.ts` (B168) supaya fungsi server yang hanya
 * butuh pemetaan dokumen dan kartu tidak ikut membawa pustaka QR.
 */
import qrcode from 'qrcode-generator'

/**
 * QR dari teks (pustaka `qrcode-generator`, koreksi galat M): jalur SVG berisi barisan modul gelap per baris, supaya satu
 * `<path>` cukup. Zona tenang digambar oleh pelat putih di lembar, bukan oleh jalur ini.
 */
export function qrPath (text: string): { modules: number, path: string } {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  let path = ''
  for (let r = 0; r < n; r++) {
    let c = 0
    while (c < n) {
      if (!qr.isDark(r, c)) { c++; continue }
      let e = c
      while (e < n && qr.isDark(r, e)) e++
      path += `M${c} ${r}h${e - c}v1h-${e - c}z`
      c = e
    }
  }
  return { modules: n, path }
}
