/**
 * `share.ts` — bukti on-chain dan kit LinkedIn untuk lembar sertifikat (B168), bagian murninya: tanpa DOM, tanpa jaringan.
 *
 * Dipakai di dua tempat dengan fungsi yang SAMA, supaya yang dilihat peserta di app dan yang dilihat perayap LinkedIn tidak bisa berbeda:
 *  - app (`pages/certificate-view.ts`): URL "Tambahkan ke profil", draf teks post, tautan penjelajah, perintah `cast call`;
 *  - fungsi Vercel (`api/share.ts`, `api/card.ts`): tag Open Graph dan gambar kartu 1200 × 630 per sertifikat.
 *
 * Aturan klaim diwarisi dari lembar: tidak ada "ijazah", "resmi", "diakui", "terverifikasi", atau "anti-pemalsuan"; penerbit demo dan
 * jaringan uji disebut apa adanya (`cert.demo`); NFT hanya disebut bila artefaknya MEMANG ada di chain untuk kredensial itu.
 */
// Lencana-B168 status=SELESAI 2026-10-06 — bukti on-chain dan kit LinkedIn (URL tambah-ke-profil, draf post, tag OG, kartu per sertifikat) dari satu sumber murni untuk app dan fungsi Vercel. Buktikan ulang: cd web && npm run probe (grup B168). JANGAN dibalik/diulang tanpa membuka kembali baris B168 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { facets, hashBytes, idDateShort, mid, type Address, type CertificateData } from './certificate'
import { LOGO } from './certificate-logo'

// ------------------------------------------------------------------ tautan

const trimSlash = (s: string) => s.replace(/\/+$/, '')
/** Halaman bagikan per sertifikat (fungsi Vercel): tag OG untuk perayap, lalu mengalihkan manusia ke verifier. */
export const shareUrl = (appHost: string, hash: string): string => `${trimSlash(appHost)}/s/${hash}`
/** Gambar kartu 1200 × 630 per sertifikat (`og:image`). */
export const cardUrl = (appHost: string, hash: string): string => `${shareUrl(appHost, hash)}/card.png`

export const explorerBase = (testnet: boolean): string => (testnet ? 'https://testnet.bscscan.com' : 'https://bscscan.com')
export const explorerAddressUrl = (addr: string, testnet = true): string => `${explorerBase(testnet)}/address/${addr}`
/** Halaman token di penjelajah: bentuk yang sama dengan yang dipakai untuk NFT agen (`?a=<tokenId>`). */
export const explorerTokenUrl = (contract: string, tokenId: string, testnet = true): string => `${explorerBase(testnet)}/token/${contract}?a=${tokenId}`

/** Perintah yang bisa disalin untuk memeriksa artefak tanpa halaman apa pun (Foundry `cast`). */
export function castCommands (p: { contract: Address, tokenId: string, hash: string }, rpcUrl: string): string[] {
  return [
    `cast call ${p.contract} "ownerOf(uint256)(address)" ${p.tokenId} --rpc-url ${rpcUrl}`,
    `cast call ${p.contract} "locked(uint256)(bool)" ${p.tokenId} --rpc-url ${rpcUrl}`,
    `cast call ${p.contract} "supportsInterface(bytes4)(bool)" 0xb45a3c0e --rpc-url ${rpcUrl}`,
    `cast call ${p.contract} "tokenOfCredential(bytes32)(uint256)" ${p.hash} --rpc-url ${rpcUrl}`,
  ]
}

// ------------------------------------------------------------------ Open Graph

export type OgMeta = { title: string, description: string, url: string, image: string, imageAlt: string }

/** Judul dan deskripsi pratinjau tautan: hanya fakta dari dokumen + batas klaim; status keberlakuan TIDAK ditulis (perayap menyimpannya lama). */
export function ogMeta (cert: CertificateData, appHost: string): OgMeta {
  const testnet = /jaringan uji/.test(cert.demo)
  const parts: string[] = []
  if (cert.score !== null) parts.push(`Nilai ${cert.score}/100.`)
  parts.push(`Kredensial Open Badges 3.0 yang tertanda tangan penerbit dan tercatat di BNB Smart Chain${testnet ? ' testnet' : ''}. Periksa statusnya di verifier Lencana.`)
  if (cert.demo) parts.push(`${cert.demo}.`)
  return {
    title: `Sertifikat: ${cert.title}`.slice(0, 150),
    description: parts.join(' ').slice(0, 300),
    url: shareUrl(appHost, cert.hash),
    image: cardUrl(appHost, cert.hash),
    imageAlt: `Sertifikat Lencana: ${cert.title}`.slice(0, 200),
  }
}

export const escapeHtml = (s: string): string => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

/** Halaman bagikan: tag OG untuk perayap (yang tidak menjalankan JavaScript) dan pengalihan untuk manusia. Semua nilai di-escape. */
export function shareHtml (meta: OgMeta, redirectUrl: string): string {
  const t = escapeHtml(meta.title), d = escapeHtml(meta.description), u = escapeHtml(meta.url), i = escapeHtml(meta.image), a = escapeHtml(meta.imageAlt), r = escapeHtml(redirectUrl)
  return `<!doctype html>
<html lang="id"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<link rel="canonical" href="${u}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lencana">
<meta property="og:locale" content="id_ID">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${u}">
<meta property="og:image" content="${i}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${a}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${i}">
<meta name="robots" content="noindex">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0e11;color:#eaecef;font:16px/1.5 system-ui,sans-serif}a{color:#f0b90b}</style>
<script>location.replace(${JSON.stringify(redirectUrl).replace(/</g, '\\u003c')})</script>
</head><body><p>Membuka verifier Lencana… <a href="${r}">Buka sekarang</a></p></body></html>
`
}

// ------------------------------------------------------------------ LinkedIn

/** Bulan dan tahun menurut WIB (sama dengan lembar). */
const wibYM = (iso: string) => { const d = new Date(new Date(iso).getTime() + 7 * 3600e3); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1 } }
const enc = encodeURIComponent
const isDemoPublisher = (cert: CertificateData) => !!cert.publisherNote && /demo|fiktif/i.test(cert.publisherNote)

/**
 * URL "Tambahkan ke profil" LinkedIn (bagian Lisensi & Sertifikasi): nama, penerbit, bulan/tahun terbit dan berlaku, tautan, dan ID.
 * `organizationName` dipakai (bukan `organizationId`; keduanya tidak boleh bersamaan). Penerbit demo diberi label "(demo)" supaya
 * entri profil tidak membaca seperti lisensi nyata.
 */
export function linkedinAddUrl (cert: CertificateData, link: string): string {
  const iss = wibYM(cert.issuedAt), exp = wibYM(cert.validUntil)
  const name = (isDemoPublisher(cert) ? `${cert.title} (demo)` : cert.title).slice(0, 100)
  const org = (cert.publisher ? `${cert.publisher}${cert.publisherNote ? ` (${cert.publisherNote})` : ''}` : 'Lencana').slice(0, 100)
  const q: [string, string][] = [
    ['startTask', 'CERTIFICATION_NAME'], ['name', name], ['organizationName', org],
    ['issueYear', String(iss.y)], ['issueMonth', String(iss.m)], ['expirationYear', String(exp.y)], ['expirationMonth', String(exp.m)],
    ['certUrl', link], ['certId', cert.hash],
  ]
  return `https://www.linkedin.com/profile/add?${q.map(([k, v]) => `${k}=${enc(v)}`).join('&')}`
}

/** Komposer LinkedIn dengan tautan terisi; pratinjaunya diambil perayap dari tag OG halaman bagikan. */
export const linkedinShareUrl = (link: string): string => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(link)}`

/**
 * Draf teks post (Indonesia atau Inggris). Jujur tentang apa yang ada: NFT hanya disebut bila artefaknya ada (`nft`), penerbit demo dan
 * jaringan uji disebut, dan tidak ada klaim ijazah/resmi/terverifikasi. Pengguna menyuntingnya sebelum mengirim.
 */
export function linkedinPost (cert: CertificateData, opts: { lang: 'id' | 'en', nft: boolean, link: string }): string {
  const score = cert.score !== null ? cert.score : null
  const demo = isDemoPublisher(cert)
  if (opts.lang === 'en') {
    return [
      `I just finished "${cert.title}" on Lencana${score !== null ? ` with a score of ${score}/100` : ''} — a learning-credential platform I'm trying out.`,
      `The certificate is more than a PDF: it is an Open Badges 3.0 document signed by the issuer and recorded as an attestation on BNB Smart Chain${/jaringan uji/.test(cert.demo) ? ' testnet' : ''}${opts.nft ? ', with a soulbound NFT artifact (ERC-5192) tied to my wallet that cannot be transferred' : ''}. Anyone can check its status themselves through the link below.`,
      ...(cert.demo ? [`Honest note: ${demo ? 'the issuer is a demo (fictional) institution, ' : ''}${/jaringan uji/.test(cert.demo) ? 'the network is a test network, ' : ''}and this is not a diploma.`] : []),
      opts.link,
      '#BNBChain #OpenBadges #Web3 #Lencana',
    ].join('\n\n')
  }
  return [
    `Saya baru menyelesaikan kelas "${cert.title}" di Lencana${score !== null ? ` dengan nilai ${score}/100` : ''} — platform kredensial belajar yang sedang saya coba.`,
    `Sertifikatnya bukan sekadar PDF: ia dokumen Open Badges 3.0 yang ditandatangani penerbit dan tercatat sebagai attestation di BNB Smart Chain${/jaringan uji/.test(cert.demo) ? ' testnet' : ''}${opts.nft ? ', dengan artefak NFT soulbound (ERC-5192) yang terikat ke dompet saya dan tidak bisa dipindahkan' : ''}. Siapa pun bisa memeriksa statusnya sendiri lewat tautan di bawah.`,
    ...(cert.demo ? [`Catatan jujur: ${demo ? 'penerbitnya institusi demo (fiktif), ' : ''}${/jaringan uji/.test(cert.demo) ? 'jaringannya jaringan uji, ' : ''}dan ini bukan ijazah.`] : []),
    opts.link,
    '#BNBChain #OpenBadges #Web3 #Lencana',
  ].join('\n\n')
}

// ------------------------------------------------------------------ kartu 1200 × 630

const xe = escapeHtml
/** Memecah teks menjadi paling banyak `maxLines` baris ≤ `maxChars` karakter (kata utuh); sisa dipotong dengan "…". */
export function wrapLines (text: string, maxChars: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  if (lines.length <= maxLines) return lines.map((l) => (l.length > maxChars ? l.slice(0, maxChars - 1) + '…' : l))
  const head = lines.slice(0, maxLines)
  const last = head[maxLines - 1]!
  head[maxLines - 1] = (last.length > maxChars - 1 ? last.slice(0, maxChars - 1) : last).replace(/[\s,.;:]+$/, '') + '…'
  return head
}

const arcPoint = (cx: number, cy: number, r: number, f: number): [number, number] => {
  const a = (f * 360 - 90) * Math.PI / 180
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}

/**
 * Gambar kartu per sertifikat (SVG 1200 × 630) untuk `og:image`: kristal dari byte hash, medali dengan cincin nilai, judul, kelas, penerbit,
 * tanggal, dan batas klaim. Hanya fakta dokumen — status keberlakuan tidak digambar (perayap menyimpan gambar lama). Fonta: Outfit
 * (dimuat server; lihat `api/card.ts`). Semua teks di-escape.
 */
export function socialCardSvg (cert: CertificateData): string {
  const W = 1200, H = 630, cx = 930, cy = 300
  const fa = facets(hashBytes(cert.hash))
  const strip = (s: string) => s.replace(/ style="--d:\d+ms"/g, '')
  const crystal = strip(fa.tr.join('')) // hanya gugus kanan-atas: serpihan depan jatuh di atas teks pada kartu yang lebih sempit
  const course = wrapLines(cert.title, 32, 2)
  const pub = cert.publisher ? wrapLines(`Penerbit: ${cert.publisher}${cert.publisherNote ? ` (${cert.publisherNote})` : ''}`, 74, 1)[0]! : ''
  const dates = `Diterbitkan ${idDateShort(cert.issuedAt)} · berlaku sampai ${idDateShort(cert.validUntil)}`
  const host = cert.verifyUrl.replace(/^https?:\/\//, '').split('/')[0] ?? ''
  const sc = cert.score !== null ? Math.max(0.001, Math.min(1, cert.score / 100)) : null
  let ring = `<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="#000" stroke-opacity=".45" stroke-width="14"/><circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="#fff" stroke-opacity=".14" stroke-width="10"/>`
  if (sc !== null) {
    if (sc >= 0.999) ring += `<circle cx="${cx}" cy="${cy}" r="150" fill="none" stroke="url(#gold)" stroke-width="10"/>`
    else { const [x1, y1] = arcPoint(cx, cy, 150, sc); ring += `<path d="M${cx} ${cy - 150}A150 150 0 ${sc > 0.5 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}" fill="none" stroke="url(#gold)" stroke-width="10" stroke-linecap="round"/>` }
  }
  const number = cert.score !== null
    ? `<text x="${cx}" y="${cy + 38}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="${cert.score >= 100 ? 88 : 112}" fill="#eaecef">${cert.score}</text><text x="${cx + (cert.score >= 100 ? 78 : 92)}" y="${cy + 6}" font-family="Outfit" font-size="${cert.score >= 100 ? 20 : 22}" fill="#b7bdc6">/100</text>`
    : `<text x="${cx}" y="${cy + 30}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="64" fill="#eaecef">—</text>`
  const pass = cert.passed ? `<rect x="${cx - 56}" y="${cy + 70}" width="112" height="32" rx="16" fill="url(#gold)"/><text x="${cx}" y="${cy + 92}" text-anchor="middle" font-family="Outfit" font-weight="700" font-size="16" letter-spacing="4" fill="#0b0e11">LULUS</text>` : ''
  const courseSvg = course.map((l, i) => `<text x="64" y="${392 + i * 40}" font-family="Outfit" font-weight="600" font-size="34" fill="#eaecef">${xe(l)}</text>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
<radialGradient id="glow" cx="85%" cy="0%" r="75%"><stop offset="0" stop-color="#f0b90b" stop-opacity=".16"/><stop offset="1" stop-color="#f0b90b" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6cf"/><stop offset=".45" stop-color="#fcd535"/><stop offset="1" stop-color="#f0b90b"/></linearGradient>
<radialGradient id="disc" cx="30%" cy="18%" r="120%"><stop offset="0" stop-color="#5a616d"/><stop offset=".42" stop-color="#262b33"/><stop offset="1" stop-color="#0e1115"/></radialGradient>
<clipPath id="clip"><rect width="${W}" height="${H}"/></clipPath>
</defs>
<rect width="${W}" height="${H}" fill="#0b0e11"/>
<rect width="${W}" height="${H}" fill="url(#glow)"/>
<g clip-path="url(#clip)"><g transform="translate(330 -70) scale(.84)">${crystal}</g></g>
<rect x="64" y="52" width="56" height="56" rx="16" fill="#fff"/>
<svg x="73" y="62" width="38" height="36" viewBox="0 0 ${LOGO.w} ${LOGO.h}"><path d="${LOGO.gold}" fill="#f0b90b"/><path d="${LOGO.black}" fill="#0b0e11"/></svg>
<text x="138" y="86" font-family="Outfit" font-weight="600" font-size="26" fill="#eaecef">Lencana</text>
<text x="138" y="108" font-family="Outfit" font-size="14" fill="#848e9c">format ${xe(cert.format)}</text>
<text x="60" y="214" font-family="Outfit" font-weight="700" font-size="80" fill="#eaecef" letter-spacing="-2">Sertifikat</text>
<text x="60" y="292" font-family="Outfit" font-weight="700" font-size="80" fill="#f0b90b" letter-spacing="-2">Kelulusan</text>
<text x="64" y="348" font-family="Outfit" font-size="18" fill="#848e9c">atas kelulusan di kelas</text>
${courseSvg}
${pub ? `<text x="64" y="${course.length > 1 ? 494 : 454}" font-family="Outfit" font-size="18" fill="#b7bdc6">${xe(pub)}</text>` : ''}
<text x="64" y="${course.length > 1 ? 522 : 482}" font-family="Outfit" font-size="17" fill="#848e9c">${xe(dates)}</text>
<circle cx="${cx}" cy="${cy}" r="132" fill="url(#disc)" stroke="#fff" stroke-opacity=".12" stroke-width="1.5"/>
${ring}${number}${pass}
<line x1="64" y1="552" x2="1136" y2="552" stroke="#fff" stroke-opacity=".12"/>
<text x="64" y="588" font-family="Outfit" font-size="17" fill="#b7bdc6">Periksa statusnya di ${xe(host)}</text>
<text x="1136" y="588" text-anchor="end" font-family="Outfit" font-size="16" fill="#848e9c">ID ${xe(mid(cert.hash, 10, 8))}</text>
${cert.demo ? `<text x="64" y="612" font-family="Outfit" font-size="14" fill="#848e9c">${xe(cert.demo)}</text>` : ''}
</svg>`
}
