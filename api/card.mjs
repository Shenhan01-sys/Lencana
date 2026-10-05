// Gambar kartu per sertifikat (B168): `/s/<hash>/card.png` → PNG 1200 × 630 untuk `og:image`. SVG disusun `socialCardSvg` (kode yang sama dengan app),
// lalu dirasterisasi `@resvg/resvg-js` dengan Outfit (OFL; `api/_fonts`). Dirutekan oleh `vercel.json` (`/s/:hash/card.png` → `/api/card?hash=:hash`).
// Bila perenderan gagal, pengunjung dialihkan ke gambar merek statis supaya pratinjau tidak kosong.
import { fileURLToPath } from 'node:url'
import resvgPkg from '@resvg/resvg-js'
import { socialCardSvg } from './_lib/lencana-share.mjs'
import { APP_HOST, loadShareCertificate } from './_lib/load.mjs'

const { Resvg } = resvgPkg
const FONT_FILES = ['Bold', 'SemiBold', 'Regular'].map((w) => fileURLToPath(new URL(`./_fonts/Outfit-${w}.ttf`, import.meta.url)))

export default async function handler (req, res) {
  const url = new URL(req.url ?? '/', 'http://localhost')
  const out = await loadShareCertificate(url.searchParams.get('hash'))
  if (!out.ok) {
    res.statusCode = out.status
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.setHeader('cache-control', 'public, max-age=60')
    res.end(out.status === 400 ? 'Bukan ID kredensial yang sah.' : 'Sertifikat tidak ditemukan.')
    return
  }
  let png
  try {
    const r = new Resvg(socialCardSvg(out.cert), { fitTo: { mode: 'width', value: 1200 }, font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Outfit' } })
    png = r.render().asPng()
  } catch (e) {
    console.error('render kartu gagal:', e instanceof Error ? e.message : String(e))
    res.statusCode = 302
    res.setHeader('location', `${APP_HOST}/hero.jpg`)
    res.setHeader('cache-control', 'public, max-age=60')
    res.end()
    return
  }
  res.statusCode = 200
  res.setHeader('content-type', 'image/png')
  res.setHeader('cache-control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  res.end(req.method === 'HEAD' ? undefined : png)
}
