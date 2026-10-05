/**
 * `pages/certificate-extras.ts` — bukti on-chain artefak NFT dan kit "Bagikan ke LinkedIn" untuk penampil lembar (B168).
 *
 * Dua potong DOM yang dipasang `certificate-view.ts` di bawah lembar (tidak ikut tercetak): `buildProofSection` (kontrak, token, pemilik, terkunci,
 * tautan penjelajah, perintah `cast`) dan `buildShareDialog` (tambahkan ke profil, bagikan sebagai post, draf teks, tautan pratinjau). Logika murninya
 * ada di `../share` (diuji `npm run probe`); berkas ini hanya DOM dan diuji di peramban (vault T91).
 *
 * Aturan klaim: NFT hanya disebut bila artefaknya ADA di chain; yang gagal dibaca dinyatakan gagal, bukan "belum dicetak" atau "bukan milikmu";
 * tidak ada klaim ijazah/resmi/terverifikasi; penerbit demo dan jaringan uji disebut apa adanya.
 */
// Lencana-B168 status=SELESAI 2026-10-06 — panel bukti on-chain artefak NFT (kontrak, token, pemilik = akun, locked, tautan penjelajah, cast) dan dialog Bagikan ke LinkedIn (tambah ke profil, post, draf teks, tautan pratinjau per sertifikat). Buktikan ulang: uji peramban T91. JANGAN dibalik/diulang tanpa membuka kembali baris B168 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { h } from '../lib/ui'
import { APP_HOST } from '../config'
import { loadNftProof, type NftProof, type NftProofLayer } from '../credentials'
import { mid, type CertificateData } from '../certificate'
import { castCommands, cardUrl, explorerAddressUrl, explorerTokenUrl, linkedinAddUrl, linkedinPost, linkedinShareUrl, shareUrl } from '../share'
import type { CertLayer } from '../verify'
import { verifyLink } from '../lesson-views'

type Lang = 'en' | 'id'

const COPY = {
  proofTitle: { en: 'On-chain proof', id: 'Bukti on-chain' },
  proofLead: {
    en: 'The credential is a signed document plus an attestation. The soulbound NFT is an optional artifact the platform mints to your wallet — it is not the credential itself.',
    id: 'Kredensialnya adalah dokumen bertanda tangan plus attestation. NFT soulbound adalah artefak opsional yang dicetak platform ke dompetmu — ia bukan kredensialnya sendiri.',
  },
  proofReading: { en: 'Reading the proof from the chain…', id: 'Membaca bukti dari chain…' },
  proofNone: {
    en: 'No NFT artifact has been minted for this credential yet. The credential is valid without it — the artifact is optional.',
    id: 'Artefak NFT belum dicetak untuk kredensial ini. Kredensialnya tetap sah tanpa itu — artefak bersifat opsional.',
  },
  proofFailedLayer: { en: 'Reading this contract layer failed — that is not "not minted":', id: 'Pembacaan lapis kontrak ini gagal — itu bukan "belum dicetak":' },
  proofFailedAll: { en: 'The proof could not be read from the chain:', id: 'Bukti tidak terbaca dari chain:' },
  nftTitle: { en: 'Soulbound NFT artifact', id: 'Artefak NFT soulbound' },
  contract: { en: 'Contract', id: 'Kontrak' },
  tokenId: { en: 'Token ID', id: 'Token ID' },
  owner: { en: 'Owner (ownerOf)', id: 'Pemilik (ownerOf)' },
  ownerYes: { en: 'same as your account’s wallet address', id: 'sama dengan alamat dompet akunmu' },
  ownerNo: { en: 'NOT your account’s wallet address', id: 'BUKAN alamat dompet akunmu' },
  ownerFail: { en: 'could not be read', id: 'tidak terbaca' },
  locked: { en: 'Locked (locked())', id: 'Terkunci (locked())' },
  lockedYes: { en: 'yes — it cannot be transferred', id: 'ya — tidak bisa dipindahkan' },
  lockedNo: { en: 'NO — this token is not locked', id: 'TIDAK — token ini tidak terkunci' },
  erc: { en: 'ERC-5192 (soulbound)', id: 'ERC-5192 (soulbound)' },
  yes: { en: 'yes', id: 'ya' },
  no: { en: 'no', id: 'tidak' },
  bound: { en: 'Bound to this account', id: 'Terikat ke akun ini' },
  notBound: { en: 'Not bound to this account', id: 'Tidak terikat ke akun ini' },
  unreadable: { en: 'Unreadable', id: 'Tidak terbaca' },
  explorer: { en: 'Open the token in the explorer ↗', id: 'Buka token di penjelajah ↗' },
  explorerContract: { en: 'contract in the explorer ↗', id: 'kontrak di penjelajah ↗' },
  castTitle: { en: 'Check it yourself (Foundry cast commands)', id: 'Periksa sendiri (perintah Foundry cast)' },
  copy: { en: 'Copy', id: 'Salin' },
  copied: { en: 'Copied', id: 'Tersalin' },
  boundNote: {
    en: 'The token is bound to your account’s wallet address (login → embedded wallet), not to your email — an email never appears on the chain.',
    id: 'Token terikat ke alamat dompet akunmu (login → dompet tertanam), bukan ke emailmu — email tidak pernah ada di chain.',
  },
  shareBtn: { en: 'Share on LinkedIn', id: 'Bagikan ke LinkedIn' },
  shareTitle: { en: 'Share on LinkedIn', id: 'Bagikan ke LinkedIn' },
  shareDemo: {
    en: 'This certificate comes from a demo (fictional) issuer on a test network. The profile entry is labelled "(demo)" and the post says so — please keep it that way.',
    id: 'Sertifikat ini dari penerbit demo (fiktif) di jaringan uji. Entri profil diberi label "(demo)" dan teks post menyebutnya — mohon dibiarkan begitu.',
  },
  shareAdd: { en: 'Add to LinkedIn profile', id: 'Tambahkan ke profil LinkedIn' },
  shareAddHint: { en: 'Opens LinkedIn’s "Licenses & certifications" form, already filled in.', id: 'Membuka formulir "Lisensi & sertifikasi" LinkedIn yang sudah terisi.' },
  shareOffsite: { en: 'Share as a post', id: 'Bagikan sebagai post' },
  shareOffsiteHint: { en: 'Opens the LinkedIn composer with the preview link.', id: 'Membuka komposer LinkedIn dengan tautan pratinjau.' },
  shareText: { en: 'Post text (edit it before sending)', id: 'Teks post (sunting sebelum dikirim)' },
  langId: { en: 'Indonesian', id: 'Indonesia' },
  langEn: { en: 'English', id: 'Inggris' },
  shareCopyText: { en: 'Copy text', id: 'Salin teks' },
  shareLink: { en: 'Preview link (per certificate)', id: 'Tautan pratinjau (per sertifikat)' },
  shareCopyLink: { en: 'Copy link', id: 'Salin tautan' },
  sharePreview: { en: 'Preview image', id: 'Gambar pratinjau' },
  shareNote: {
    en: 'LinkedIn keeps link previews for a while. If the preview looks old, refresh it with LinkedIn’s Post Inspector.',
    id: 'LinkedIn menyimpan pratinjau tautan beberapa waktu. Kalau pratinjaunya tampak lama, segarkan lewat Post Inspector LinkedIn.',
  },
  inspector: { en: 'Post Inspector ↗', id: 'Post Inspector ↗' },
  close: { en: 'Close', id: 'Tutup' },
} satisfies Record<string, Record<Lang, string>>

async function copyText (text: string): Promise<boolean> {
  try { await navigator.clipboard.writeText(text); return true } catch {
    try {
      const ta = document.createElement('textarea'); ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok
    } catch { return false }
  }
}

const copyButton = (lang: Lang, getText: () => string, cls = 'cert-btn cert-btn-sm'): HTMLButtonElement => {
  const label = COPY.copy[lang]
  const b = h('button', { type: 'button', class: cls }, label) as HTMLButtonElement
  b.addEventListener('click', () => { void copyText(getText()).then((ok) => { b.textContent = ok ? COPY.copied[lang] : label; window.setTimeout(() => { b.textContent = label }, 1500) }) })
  return b
}

const chip = (cls: 'ok' | 'bad' | 'muted', text: string) => h('span', { class: `cert-chip is-${cls}` }, text)

function layerCard (lang: Lang, cert: CertificateData, l: NftProofLayer, proof: NftProof): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const ownerTxt = l.owner === null ? h('span', { class: 'cert-bad' }, T('ownerFail'))
    : h('span', null, h('a', { href: explorerAddressUrl(l.owner, proof.testnet), target: '_blank', rel: 'noopener noreferrer' }, mid(l.owner, 10, 8)), ' — ',
      h('b', { class: l.ownerIsAccount ? 'cert-ok' : 'cert-bad' }, l.ownerIsAccount ? `✓ ${T('ownerYes')}` : `✗ ${T('ownerNo')}`))
  const lockedTxt = l.locked === null ? h('span', { class: 'cert-bad' }, T('ownerFail'))
    : h('b', { class: l.locked ? 'cert-ok' : 'cert-bad' }, l.locked ? `✓ ${T('lockedYes')}` : `✗ ${T('lockedNo')}`)
  const ercTxt = l.erc5192 === null ? h('span', { class: 'cert-bad' }, T('ownerFail'))
    : h('b', { class: l.erc5192 ? 'cert-ok' : 'cert-bad' }, l.erc5192 ? `✓ ${T('yes')}` : `✗ ${T('no')}`)
  const verdict = !l.readOk ? chip('muted', T('unreadable')) : l.ownerIsAccount && l.locked && l.erc5192 ? chip('ok', `✓ ${T('bound')}`) : chip('bad', `✗ ${T('notBound')}`)
  const cmds = castCommands({ contract: l.address, tokenId: l.tokenId, hash: cert.hash }, proof.rpcUrl)
  return h('article', { class: 'cert-proof-card' },
    h('div', { class: 'cert-proof-head' }, h('h3', null, T('nftTitle')), verdict),
    h('dl', { class: 'cert-proof-dl' },
      h('div', null, h('dt', null, T('contract')), h('dd', null, h('code', null, l.address), ' ', h('a', { href: explorerAddressUrl(l.address, proof.testnet), target: '_blank', rel: 'noopener noreferrer' }, T('explorerContract')))),
      h('div', null, h('dt', null, T('tokenId')), h('dd', null, h('code', { class: 'cert-wrap' }, l.tokenId), ' ', copyButton(lang, () => l.tokenId))),
      h('div', null, h('dt', null, T('owner')), h('dd', null, ownerTxt)),
      h('div', null, h('dt', null, T('locked')), h('dd', null, lockedTxt)),
      h('div', null, h('dt', null, T('erc')), h('dd', null, ercTxt))),
    h('p', { class: 'cert-proof-links' },
      h('a', { class: 'cert-btn cert-btn-sm', href: explorerTokenUrl(l.address, l.tokenId, proof.testnet), target: '_blank', rel: 'noopener noreferrer' }, T('explorer')),
      ' ', h('a', { class: 'cert-btn cert-btn-sm', href: verifyLink(cert.hash) }, lang === 'en' ? 'Check in the verifier' : 'Periksa di verifier')),
    h('details', { class: 'cert-proof-cast' }, h('summary', null, T('castTitle')),
      h('pre', null, h('code', null, cmds.join('\n'))), copyButton(lang, () => cmds.join('\n'))))
}

/** Panel bukti on-chain di bawah lembar. Mengisi diri sendiri sesudah `loadNftProof` selesai; bukti dibaca dari chain, bukan dari catatan. */
export function buildProofSection (lang: Lang, cert: CertificateData, layers: CertLayer[], account: string): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const body = h('div', { class: 'cert-proof-body', 'aria-live': 'polite' }, h('p', { class: 'cert-muted' }, T('proofReading')))
  const section = h('section', { class: 'cert-proof', 'aria-label': T('proofTitle'), 'data-proof': '' },
    h('h2', null, T('proofTitle')), h('p', { class: 'cert-muted' }, T('proofLead')), body)
  void loadNftProof(layers, account).then((proof) => {
    if (!section.isConnected) return
    const nodes: HTMLElement[] = []
    if (!proof.held.length && !proof.failed.length) nodes.push(h('p', { class: 'cert-proof-none' }, T('proofNone')))
    for (const l of proof.held) nodes.push(layerCard(lang, cert, l, proof))
    for (const a of proof.failed) nodes.push(h('p', { class: 'cert-bad' }, `${T('proofFailedLayer')} `, h('code', null, a)))
    nodes.push(h('p', { class: 'cert-muted' }, T('boundNote')))
    body.replaceChildren(...nodes)
  }).catch((e: unknown) => {
    if (section.isConnected) body.replaceChildren(h('p', { class: 'cert-bad', role: 'alert' }, `${T('proofFailedAll')} ${e instanceof Error ? e.message : String(e)}`))
  })
  return section
}

/** Dialog "Bagikan ke LinkedIn": tombol tambah-ke-profil dan bagikan-sebagai-post, draf teks (Indonesia/Inggris), dan tautan pratinjau per sertifikat. */
export function buildShareDialog (lang: Lang, cert: CertificateData, layers: CertLayer[]): { dlg: HTMLDialogElement, open: (opener: HTMLElement | null) => void } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const link = shareUrl(APP_HOST, cert.hash)
  const nft = layers.some((l) => l.tokenId !== null)
  const demo = !!cert.publisherNote && /demo|fiktif/i.test(cert.publisherNote)
  const draft = (l: Lang) => linkedinPost(cert, { lang: l, nft, link })
  const area = h('textarea', { class: 'cert-dlg-name cert-share-area', rows: '11', 'aria-label': T('shareText'), spellcheck: 'false' }) as HTMLTextAreaElement
  area.value = draft(lang)
  const radio = (l: Lang, label: string) => {
    const r = h('input', { type: 'radio', name: 'cert-share-lang', value: l }) as HTMLInputElement
    r.checked = l === lang
    r.addEventListener('change', () => { if (r.checked) area.value = draft(l) })
    return h('label', { class: 'cert-opt cert-opt-inline' }, r, h('span', null, label))
  }
  const linkInput = h('input', { class: 'cert-dlg-name', type: 'text', readonly: true, value: link, 'aria-label': T('shareLink') }) as HTMLInputElement
  linkInput.addEventListener('focus', () => linkInput.select())
  const img = h('img', { class: 'cert-share-img', alt: T('sharePreview'), src: cardUrl(APP_HOST, cert.hash), width: '600', height: '315', loading: 'lazy' }) as HTMLImageElement
  const prev = h('div', { class: 'cert-share-prev' }, h('p', { class: 'cert-dlg-n' }, T('sharePreview')), img)
  img.addEventListener('error', () => { img.hidden = true; prev.hidden = true }) // gambar belum tersaji (mis. server dev): jangan tampilkan label tanpa gambar
  const closeBtn = h('button', { type: 'button', class: 'cert-btn', 'data-dlg': 'tutup' }, T('close'))
  const dlg = h('dialog', { class: 'cert-dlg cert-share', 'aria-labelledby': 'cert-share-t' },
    h('div', { class: 'cert-dlg-f' },
      h('h2', { class: 'cert-dlg-t', id: 'cert-share-t' }, T('shareTitle')),
      demo ? h('p', { class: 'cert-dlg-n cert-share-demo' }, T('shareDemo')) : null,
      h('div', { class: 'cert-share-actions' },
        h('div', null, h('a', { class: 'cert-btn cert-btn-pri', 'data-share': 'add', href: linkedinAddUrl(cert, link), target: '_blank', rel: 'noopener noreferrer' }, T('shareAdd')), h('p', { class: 'cert-dlg-n' }, T('shareAddHint'))),
        h('div', null, h('a', { class: 'cert-btn', 'data-share': 'post', href: linkedinShareUrl(link), target: '_blank', rel: 'noopener noreferrer' }, T('shareOffsite')), h('p', { class: 'cert-dlg-n' }, T('shareOffsiteHint')))),
      h('fieldset', null, h('legend', null, T('shareText')),
        h('div', { class: 'cert-share-langs' }, radio('id', T('langId')), radio('en', T('langEn'))),
        area, h('div', { class: 'cert-share-row' }, copyButton(lang, () => area.value, 'cert-btn'))),
      h('fieldset', null, h('legend', null, T('shareLink')), h('div', { class: 'cert-share-row' }, linkInput, copyButton(lang, () => link, 'cert-btn'))),
      prev,
      h('p', { class: 'cert-dlg-n' }, `${T('shareNote')} `, h('a', { href: 'https://www.linkedin.com/post-inspector/', target: '_blank', rel: 'noopener noreferrer' }, T('inspector'))),
      h('div', { class: 'cert-dlg-act' }, closeBtn))) as HTMLDialogElement
  let opener: HTMLElement | null = null
  closeBtn.addEventListener('click', () => dlg.close())
  dlg.addEventListener('close', () => { const o = opener; opener = null; if (o && o.isConnected) o.focus() })
  return { dlg, open: (o) => { opener = o; if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '') } }
}
