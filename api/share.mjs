// Halaman bagikan per sertifikat (B168): `/s/<hash>` → HTML dengan tag Open Graph untuk perayap (LinkedIn membaca HTML mentah, tanpa JavaScript)
// dan pengalihan untuk manusia ke verifier. Dirutekan oleh `vercel.json` (`/s/:hash` → `/api/share?hash=:hash`).
import { ogMeta, shareHtml } from './_lib/lencana-share.mjs'
import { APP_HOST, loadShareCertificate } from './_lib/load.mjs'

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
  res.statusCode = 200
  res.setHeader('content-type', 'text/html; charset=utf-8')
  res.setHeader('cache-control', 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400')
  res.end(req.method === 'HEAD' ? '' : shareHtml(ogMeta(out.cert, APP_HOST), `${APP_HOST}/?q=${out.cert.hash}#/verify`))
}
