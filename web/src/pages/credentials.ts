/**
 * `pages/credentials.ts` — "Kredensial saya" di dasbor peserta (B165): kartu per kredensial (judul kursus, nilai, tanggal,
 * status di chain, artefak NFT, tindakan) menggantikan tabel hash polos, dan rute `#/app/credentials/<hash>` membuka lembar
 * sertifikat (`certificate-view.ts`).
 *
 * Datanya dibaca dari chain (daftar, status, artefak) dan dokumen publik di host tepi lewat `../credentials` — tanpa
 * tanda tangan dompet, jadi halaman ini tidak memunculkan permintaan tanda tangan. "Kosong" tidak pernah menutupi "gagal
 * baca", dan dokumen yang tidak tersaji dibedakan dari dokumen yang gagal diambil.
 */
// Lencana-B165 status=SELESAI 2026-10-05 — Kredensial saya berupa kartu (judul, nilai, tanggal, status, artefak, tindakan) dan membuka lembar sertifikat di #/app/credentials/<hash>. Buktikan ulang: uji peramban T88. JANGAN dibalik/diulang tanpa membuka kembali baris B165 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './credentials.css'
import { h } from '../lib/ui'
import { skeleton } from '../lib/loading'
import { APP_HOST } from '../config'
import { listMyCredentials, type CredentialRow, type ListResult } from '../credentials'
import { idDate, mid, type StatusVerdict } from '../certificate'
import { verifyLink } from '../lesson-views'
import { navIcon } from './seats'
import { certificateHashOf, closeCertificate, openCertificate } from './certificate-view'

type Lang = 'en' | 'id'

const COPY = {
  title: { en: 'My credentials', id: 'Kredensial saya' },
  intro: {
    en: 'A credential is a signed document with proof recorded on chain. From here you can open it as a certificate to print or save as PDF, or check it in the verifier.',
    id: 'Kredensial adalah dokumen bertanda tangan dengan bukti tercatat di chain. Dari sini kamu bisa membukanya sebagai sertifikat untuk dicetak atau disimpan sebagai PDF, atau memeriksanya di verifier.',
  },
  privacy: {
    en: 'This page is only for you. The list is read from the chain over a public RPC (your address is sent to the RPC provider for this lookup) and each document from the public host. To share a credential, send its verifier link.',
    id: 'Halaman ini hanya untukmu. Daftar dibaca dari chain lewat RPC publik (alamatmu dikirim ke penyedia RPC untuk pencarian ini) dan tiap dokumen dari host publik. Untuk membagikan kredensial, kirim tautan verifier-nya.',
  },
  loading: { en: 'Reading your credentials from the chain…', id: 'Membaca kredensialmu dari chain…' },
  failedTitle: { en: 'Your credentials could not be read', id: 'Kredensialmu tidak terbaca' },
  failedBody: { en: 'This is a failed read, not an empty list — nothing was concluded about what you own.', id: 'Ini pembacaan yang gagal, bukan daftar kosong — tidak ada kesimpulan tentang apa yang kamu punya.' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  emptyTitle: { en: 'No credentials yet', id: 'Belum ada kredensial' },
  emptyBody: { en: 'Finish a course and pass it — the credential appears here once it is issued. The list was read from the chain just now; it is empty, not unreadable.', id: 'Selesaikan sebuah kelas dan lulus — kredensialnya muncul di sini begitu terbit. Daftar baru saja dibaca dari chain; hasilnya kosong, bukan gagal baca.' },
  toCourses: { en: 'Browse courses', id: 'Lihat kursus' },
  credential: { en: 'Credential', id: 'Kredensial' },
  score: { en: 'Final score', id: 'Nilai akhir' },
  issued: { en: 'Issued', id: 'Diterbitkan' },
  validUntil: { en: 'Valid until', id: 'Berlaku sampai' },
  signedBy: { en: 'Signed by the issuing agent', id: 'Ditandatangani agen penerbit' },
  certBtn: { en: 'View certificate', id: 'Lihat sertifikat' },
  verifyBtn: { en: 'Check in verifier', id: 'Periksa di verifier' },
  copyLink: { en: 'Copy verifier link', id: 'Salin tautan verifier' },
  copied: { en: 'Copied', id: 'Tersalin' },
  idLabel: { en: 'Credential ID', id: 'ID kredensial' },
  docMissing: { en: 'The credential document is not served at the public host yet, so the certificate cannot be made. The credential itself can still be checked in the verifier.', id: 'Dokumen kredensial ini belum tersaji di host publik, jadi sertifikatnya belum bisa dibuat. Kredensialnya sendiri tetap bisa diperiksa di verifier.' },
  docFailed: { en: 'The credential document could not be fetched', id: 'Dokumen kredensial gagal diambil' },
  nftHeld: { en: 'Soulbound NFT', id: 'NFT soulbound' },
  nftLayers: { en: 'layer(s)', id: 'lapis' },
  nftNone: { en: 'Soulbound NFT not minted yet (optional)', id: 'NFT soulbound belum dicetak (opsional)' },
  nftFailed: { en: 'Soulbound NFT could not be read', id: 'NFT soulbound gagal dibaca' },
  shown: { en: 'shown', id: 'ditampilkan' },
  of: { en: 'of', id: 'dari' },
  nftNote: { en: 'The soulbound NFT is optional and is minted by the platform; it is an artifact, not the credential itself.', id: 'NFT soulbound bersifat opsional dan dicetak platform; ia artefak, bukan kredensialnya sendiri.' },
} satisfies Record<string, Record<Lang, string>>

const STATUS: Record<StatusVerdict, { cls: string, en: string, id: string }> = {
  'BERLAKU': { cls: 's-ok', en: 'VALID', id: 'BERLAKU' },
  'DICABUT': { cls: 's-bad', en: 'REVOKED', id: 'DICABUT' },
  'KEDALUWARSA': { cls: 's-warn', en: 'EXPIRED', id: 'KEDALUWARSA' },
  'PENERBIT DITARIK': { cls: 's-delisted', en: 'ISSUER DELISTED', id: 'PENERBIT DITARIK' },
  'TIDAK DIKENAL': { cls: '', en: 'NOT RECOGNISED', id: 'TIDAK DIKENAL' },
  'BELUM TERBACA': { cls: '', en: 'STATUS NOT READ', id: 'STATUS BELUM TERBACA' },
}

const fmtDate = (lang: Lang, iso: string) => lang === 'en'
  ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' })
  : idDate(iso)

function card (lang: Lang, row: CredentialRow, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const doc = row.doc
  const title = doc.state === 'ok' ? doc.cred.title : `${T('credential')} ${mid(row.hash, 10, 8)}`
  const st = STATUS[row.status.verdict]
  const off = row.status.verdict !== 'BERLAKU' && row.status.verdict !== 'BELUM TERBACA'
  const held = row.layers.filter((l) => l.tokenId !== null)
  const nft = held.length
    ? h('p', { class: 'cred-nft is-held', title: held.map((l) => l.address).join(' · ') }, `🔒 ${T('nftHeld')} · ${held.length} ${T('nftLayers')}`)
    : row.layers.some((l) => !l.readOk) ? h('p', { class: 'cred-nft is-failed' }, T('nftFailed')) : h('p', { class: 'cred-nft' }, T('nftNone'))
  const copyBtn = h('button', { type: 'button', class: 'app-btn small' }, T('copyLink')) as HTMLButtonElement
  copyBtn.addEventListener('click', () => {
    const url = `${APP_HOST}/?q=${row.hash}#/verify`
    void navigator.clipboard?.writeText(url).then(() => { copyBtn.textContent = T('copied'); window.setTimeout(() => { copyBtn.textContent = T('copyLink') }, 1500) })
  })
  const facts = doc.state === 'ok'
    ? h('dl', { class: 'cred-facts' },
      h('div', null, h('dt', null, T('issued')), h('dd', null, fmtDate(lang, doc.cred.validFrom))),
      h('div', null, h('dt', null, T('validUntil')), h('dd', null, fmtDate(lang, doc.cred.validUntil))),
      doc.cred.issuerAgent ? h('div', { class: 'wide' }, h('dt', null, T('signedBy')), h('dd', null, doc.cred.issuerAgent)) : null)
    : null
  return h('article', { class: `cred-card${off ? ' is-off' : ''}` },
    h('div', { class: 'cred-top' },
      h('span', { class: 'cred-badge', 'aria-hidden': 'true' }, navIcon('M12 15a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm-3.5 3.5L7 22l5-2 5 2-1.5-3.5')),
      h('div', { class: 'cred-titlebox' },
        h('h3', { class: 'cred-title' }, title),
        h('span', { class: `cred-chip ${st.cls}` }, st[lang]))),
    doc.state === 'ok' && doc.cred.score !== null
      ? h('div', { class: 'cred-score', 'aria-label': `${T('score')} ${doc.cred.score} / 100` }, h('b', null, String(doc.cred.score)), '/100', h('span', { style: { marginLeft: '8px' } }, T('score')))
      : null,
    facts,
    doc.state === 'missing' ? h('p', { class: 'cred-note' }, T('docMissing')) : null,
    doc.state === 'failed' ? h('p', { class: 'cred-note is-bad', role: 'alert' }, `${T('docFailed')}: ${doc.why}`) : null,
    nft,
    h('div', { class: 'cred-id' }, `${T('idLabel')}:`, h('code', { title: row.hash }, mid(row.hash, 10, 8))),
    h('div', { class: 'cred-actions' },
      doc.state === 'ok' ? h('a', { class: 'app-btn primary small', href: `#/app/credentials/${row.hash}` }, T('certBtn')) : null,
      doc.state === 'failed' ? h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('retry')) : null,
      h('a', { class: 'app-btn small', href: verifyLink(row.hash) }, T('verifyBtn')),
      copyBtn))
}

function renderResult (lang: Lang, r: ListResult, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  if (!r.ok) {
    return h('div', { class: 'app-card app-error', role: 'alert' },
      h('h2', null, T('failedTitle')),
      h('p', { class: 'app-muted' }, `${r.why}`),
      h('p', { class: 'app-muted' }, T('failedBody')),
      h('div', null, h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('retry'))))
  }
  if (!r.rows.length) {
    return h('div', { class: 'cred-empty' },
      h('h2', null, T('emptyTitle')),
      h('p', null, T('emptyBody')),
      h('a', { class: 'app-btn primary', href: '#/app/courses' }, T('toCourses')))
  }
  return h('div', { class: 'cred-list' },
    h('div', { class: 'cred-grid' }, ...r.rows.map((row) => card(lang, row, reload))),
    h('p', { class: 'cred-foot' }, `${r.rows.length} ${T('of')} ${r.total} ${T('shown')}. ${T('nftNote')}`))
}

/**
 * Isi bagian "Kredensial saya". Rute `#/app/credentials/<hash>` juga membuka penampil lembar; rute lain menutupnya.
 * Dipanggil `renderApp` setiap kali bagian ini digambar.
 */
export function renderCredentials (lang: Lang, addr: string | null, routeHash: string): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  closeCertificate()
  const list = h('div', { class: 'cred-list', 'aria-live': 'polite' })
  const load = () => {
    if (!addr) return
    list.replaceChildren(skeleton('cards', T('loading')))
    void listMyCredentials(addr)
      .then((r) => { if (list.isConnected) list.replaceChildren(renderResult(lang, r, load)) })
      .catch((e: unknown) => { if (list.isConnected) list.replaceChildren(renderResult(lang, { ok: false, why: e instanceof Error ? e.message : String(e) }, load)) })
  }
  load()
  const hash = certificateHashOf(routeHash)
  if (hash && addr) openCertificate(hash, addr, lang)
  return h('div', { class: 'app-stack' },
    h('header', { class: 'app-head' }, h('h1', null, T('title')), h('p', { class: 'app-muted' }, T('intro'))),
    h('p', { class: 'app-note' }, T('privacy')),
    list)
}
