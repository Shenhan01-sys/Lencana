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
// Lencana-B169 status=SELESAI 2026-10-06 — kotak "Cetak artefak NFT" di panel bukti: hanya bila tidak ada artefak dan tidak ada gagal baca; satu tanda tangan, platform mencetak, panel membaca ulang. Buktikan ulang: uji peramban T93 dan cd signer && npm run verify:mint. JANGAN dibalik/diulang tanpa membuka kembali baris B169 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
// Lencana-B170 status=SELESAI 2026-10-06 — kotak "Bukti kepemilikan" per kartu artefak milik akun: pernyataan baku ditandatangani dompet akun, blok + tautan ?own= + cast; pemeriksanya di pages/ownership-check.ts. Buktikan ulang: uji peramban T93 dan probe grup B170. JANGAN dibalik/diulang tanpa membuka kembali baris B170 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { h } from '../lib/ui'
import { APP_HOST } from '../config'
import { loadLayers, loadNftProof, type NftProof, type NftProofLayer } from '../credentials'
import { requestArtifactMint, signOwnershipStatement } from '../learning'
import { ownershipBlock, ownershipCast, ownershipLink, ownershipStatement, stampOf } from '../ownership'
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
  mintTitle: { en: 'Mint the NFT artifact', id: 'Cetak artefak NFT' },
  mintLead: {
    en: 'The platform mints a soulbound artifact for this credential to your account’s wallet and pays the test-network gas. You only sign a short message. The credential stays valid with or without it.',
    id: 'Platform mencetak artefak soulbound untuk kredensial ini ke dompet akunmu dan membayar gas jaringan uji. Kamu hanya menandatangani pesan singkat. Kredensialnya tetap sah dengan atau tanpa artefak.',
  },
  mintBtn: { en: 'Mint NFT artifact', id: 'Cetak artefak NFT' },
  mintWorking: { en: 'Waiting for your signature, then minting on the test network (up to a minute)…', id: 'Menunggu tanda tanganmu, lalu mencetak di jaringan uji (bisa sampai semenit)…' },
  mintDone: { en: 'Minted. Reading the proof from the chain…', id: 'Tercetak. Membaca bukti dari chain…' },
  mintAlready: { en: 'An artifact already exists for this credential. Reading the proof from the chain…', id: 'Artefak untuk kredensial ini sudah ada. Membaca bukti dari chain…' },
  mintFail: { en: 'Could not mint:', id: 'Gagal mencetak:' },
  ownTitle: { en: 'Proof of ownership', id: 'Bukti kepemilikan' },
  ownLead: {
    en: 'Sign a statement with your account’s wallet. Anyone can check it without an account: the signature must match the token’s owner on the chain. It costs nothing and sends no transaction.',
    id: 'Tandatangani pernyataan dengan dompet akunmu. Siapa pun bisa memeriksanya tanpa akun: tanda tangan harus cocok dengan pemilik token di chain. Tidak ada biaya dan tidak ada transaksi.',
  },
  ownBtn: { en: 'Create proof of ownership', id: 'Buat bukti kepemilikan' },
  ownWorking: { en: 'Waiting for your signature…', id: 'Menunggu tanda tanganmu…' },
  ownDone: { en: 'Ready to share. Send the link, or paste the block on the verifier page.', id: 'Siap dibagikan. Kirim tautannya, atau tempel blok ini di halaman verifikasi.' },
  ownFail: { en: 'Could not create the proof:', id: 'Gagal membuat bukti:' },
  ownBlock: { en: 'Proof block (statement + signature)', id: 'Blok bukti (pernyataan + tanda tangan)' },
  ownCheck: { en: 'Open the check page ↗', id: 'Buka halaman pemeriksaan ↗' },
  ownCopyBlock: { en: 'Copy block', id: 'Salin blok' },
  ownCopyLink: { en: 'Copy check link', id: 'Salin tautan pemeriksaan' },
  ownCast: { en: 'Check it with cast (bash)', id: 'Periksa dengan cast (bash)' },
  ownNote: {
    en: 'This proves the signer controls the wallet that owns the token. It does not prove who the person is, and it is a snapshot: the owner is read from the chain at the moment someone checks.',
    id: 'Ini membuktikan penandatangan memegang kunci dompet yang memiliki token. Ini tidak membuktikan siapa orangnya, dan ia berupa potret: pemilik dibaca dari chain saat seseorang memeriksa.',
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

const copyButton = (lang: Lang, getText: () => string, cls = 'cert-btn cert-btn-sm', label: string = COPY.copy[lang]): HTMLButtonElement => {
  const b = h('button', { type: 'button', class: cls }, label) as HTMLButtonElement
  b.addEventListener('click', () => { void copyText(getText()).then((ok) => { b.textContent = ok ? COPY.copied[lang] : label; window.setTimeout(() => { b.textContent = label }, 1500) }) })
  return b
}

const chip = (cls: 'ok' | 'bad' | 'muted', text: string) => h('span', { class: `cert-chip is-${cls}` }, text)

/**
 * Kotak "Bukti kepemilikan" (B170): pemegang akun menandatangani pernyataan baku dengan dompetnya (tanpa transaksi, tanpa biaya) dan mendapat blok serta tautan
 * pemeriksaan. Hanya untuk lapis yang pemiliknya memang dompet akun ini; yang tidak, tidak ditawari apa pun yang bisa disalahpahami.
 */
function ownershipBox (lang: Lang, cert: CertificateData, l: NftProofLayer, proof: NftProof): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const status = h('p', { class: 'cert-muted', role: 'status', 'aria-live': 'polite' })
  const out = h('div', { class: 'cert-own-out', hidden: true })
  const btn = h('button', { type: 'button', class: 'cert-btn cert-btn-sm', 'data-own': '' }, T('ownBtn')) as HTMLButtonElement
  btn.addEventListener('click', () => {
    void (async () => {
      btn.disabled = true
      status.className = 'cert-muted'
      status.textContent = T('ownWorking')
      const statement = ownershipStatement({ wallet: l.owner as `0x${string}`, contract: l.address, tokenId: l.tokenId, credential: cert.hash as `0x${string}`, chainId: proof.chainId, issuedAt: stampOf(Date.now()) })
      const s = await signOwnershipStatement(statement).catch((e: unknown) => ({ signature: undefined, why: e instanceof Error ? e.message : String(e) }))
      if (!s.signature) {
        status.className = 'cert-bad'
        status.setAttribute('role', 'alert')
        status.textContent = `${T('ownFail')} ${s.why ?? ''}`
        btn.disabled = false
        return
      }
      const block = ownershipBlock(statement, s.signature)
      const link = ownershipLink(block)
      const cmds = ownershipCast({ wallet: l.owner as `0x${string}`, contract: l.address, tokenId: l.tokenId, credential: cert.hash as `0x${string}`, chainId: proof.chainId, issuedAt: '' }, statement, s.signature, proof.rpcUrl)
      const area = h('textarea', { class: 'cert-dlg-name cert-own-area', rows: '11', readonly: true, spellcheck: 'false', 'aria-label': T('ownBlock') }) as HTMLTextAreaElement
      area.value = block
      out.replaceChildren(
        h('p', { class: 'cert-dlg-n' }, T('ownBlock')), area,
        h('p', { class: 'cert-proof-links' }, copyButton(lang, () => block, 'cert-btn cert-btn-sm', T('ownCopyBlock')), ' ', copyButton(lang, () => link, 'cert-btn cert-btn-sm', T('ownCopyLink')), ' ',
          h('a', { class: 'cert-btn cert-btn-sm', 'data-own-check': '', href: link, target: '_blank', rel: 'noopener noreferrer' }, T('ownCheck'))),
        h('details', { class: 'cert-proof-cast' }, h('summary', null, T('ownCast')), h('pre', null, h('code', null, cmds.join('\n')))))
      out.hidden = false
      status.className = 'cert-ok'
      status.textContent = T('ownDone')
      btn.disabled = false
    })()
  })
  return h('details', { class: 'cert-own' }, h('summary', null, T('ownTitle')),
    h('p', { class: 'cert-muted' }, T('ownLead')), h('p', null, btn), status, out, h('p', { class: 'cert-muted cert-own-note' }, T('ownNote')))
}

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
      h('pre', null, h('code', null, cmds.join('\n'))), copyButton(lang, () => cmds.join('\n'))),
    l.ownerIsAccount && l.readOk && l.owner ? ownershipBox(lang, cert, l, proof) : null)
}

/**
 * Kotak "Cetak artefak NFT" (B169): hanya tampil bila tidak ada lapis yang memegang artefak dan tidak ada lapis yang gagal dibaca. Satu tanda tangan lalu server
 * mencetak; kontrak yang memutuskan boleh/tidaknya. Sesudahnya `layers` diganti di tempat (dibagi dengan dialog bagikan) dan panel dibaca ulang dari chain.
 */
function mintBox (lang: Lang, cert: CertificateData, onChanged: () => Promise<void>): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const status = h('p', { class: 'cert-muted', role: 'status', 'aria-live': 'polite' })
  const btn = h('button', { type: 'button', class: 'cert-btn cert-btn-pri', 'data-mint': '' }, T('mintBtn')) as HTMLButtonElement
  btn.addEventListener('click', () => {
    void (async () => {
      btn.disabled = true
      status.className = 'cert-muted'
      status.textContent = T('mintWorking')
      const r = await requestArtifactMint(cert.hash).catch((e: unknown) => ({ ok: false as const, why: e instanceof Error ? e.message : String(e), kind: undefined, tokenId: undefined }))
      if (r.ok || r.kind === 'already') {
        status.textContent = T(r.ok ? 'mintDone' : 'mintAlready')
        await onChanged()
        return
      }
      status.className = 'cert-bad'
      status.setAttribute('role', 'alert')
      status.textContent = `${T('mintFail')} ${r.why}`
      btn.disabled = false
    })()
  })
  return h('div', { class: 'cert-mint' }, h('h3', null, T('mintTitle')), h('p', { class: 'cert-muted' }, T('mintLead')), h('p', null, btn), status)
}

/** Panel bukti on-chain di bawah lembar. Mengisi diri sendiri sesudah `loadNftProof` selesai; bukti dibaca dari chain, bukan dari catatan. `layers` dibagi dengan dialog bagikan dan diganti di tempat sesudah cetak (B169). */
export function buildProofSection (lang: Lang, cert: CertificateData, layers: CertLayer[], account: string): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const body = h('div', { class: 'cert-proof-body', 'aria-live': 'polite' }, h('p', { class: 'cert-muted' }, T('proofReading')))
  const section = h('section', { class: 'cert-proof', 'aria-label': T('proofTitle'), 'data-proof': '' },
    h('h2', null, T('proofTitle')), h('p', { class: 'cert-muted' }, T('proofLead')), body)
  const render = async (): Promise<void> => {
    try {
      const proof = await loadNftProof(layers, account)
      if (!section.isConnected) return
      const nodes: HTMLElement[] = []
      if (!proof.held.length && !proof.failed.length) {
        nodes.push(h('p', { class: 'cert-proof-none' }, T('proofNone')))
        nodes.push(mintBox(lang, cert, async () => {
          const fresh = await loadLayers(cert.hash)
          layers.splice(0, layers.length, ...fresh)
          await render()
        }))
      }
      for (const l of proof.held) nodes.push(layerCard(lang, cert, l, proof))
      for (const a of proof.failed) nodes.push(h('p', { class: 'cert-bad' }, `${T('proofFailedLayer')} `, h('code', null, a)))
      if (proof.held.length) nodes.push(h('p', { class: 'cert-muted' }, T('boundNote'))) // tanpa token tidak ada yang "terikat" untuk dijelaskan
      body.replaceChildren(...nodes)
    } catch (e: unknown) {
      if (section.isConnected) body.replaceChildren(h('p', { class: 'cert-bad', role: 'alert' }, `${T('proofFailedAll')} ${e instanceof Error ? e.message : String(e)}`))
    }
  }
  void render()
  return section
}

/** Dialog "Bagikan ke LinkedIn": tombol tambah-ke-profil dan bagikan-sebagai-post, draf teks (Indonesia/Inggris), dan tautan pratinjau per sertifikat. */
export function buildShareDialog (lang: Lang, cert: CertificateData, layers: CertLayer[]): { dlg: HTMLDialogElement, open: (opener: HTMLElement | null) => void } {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const link = shareUrl(APP_HOST, cert.hash)
  const hasNft = () => layers.some((l) => l.tokenId !== null) // B169: `layers` diganti di tempat sesudah artefak dicetak, jadi dibaca saat dipakai
  const demo = !!cert.publisherNote && /demo|fiktif/i.test(cert.publisherNote)
  const draft = (l: Lang) => linkedinPost(cert, { lang: l, nft: hasNft(), link })
  let curLang: Lang = lang
  let generated = ''
  const area = h('textarea', { class: 'cert-dlg-name cert-share-area', rows: '11', 'aria-label': T('shareText'), spellcheck: 'false' }) as HTMLTextAreaElement
  generated = draft(lang)
  area.value = generated
  const radio = (l: Lang, label: string) => {
    const r = h('input', { type: 'radio', name: 'cert-share-lang', value: l }) as HTMLInputElement
    r.checked = l === lang
    r.addEventListener('change', () => { if (r.checked) { curLang = l; generated = draft(l); area.value = generated } })
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
  return { dlg, open: (o) => { opener = o; if (area.value === generated) { generated = draft(curLang); area.value = generated } /* draf yang belum disunting ikut keadaan artefak terbaru */ if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '') } }
}
