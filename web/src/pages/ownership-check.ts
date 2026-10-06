// Lencana-B170 status=SELESAI 2026-10-06 — bagian "Periksa bukti kepemilikan" di halaman verifikasi publik: tempel blok (atau buka tautan ?own=), tanda tangan dipulihkan dan dibandingkan dengan ownerOf dari chain, tanpa akun. Buktikan ulang: lihat vault T93 (uji peramban) dan `npx tsx scripts/probe.ts` (logikanya)
/**
 * `pages/ownership-check.ts` — pemeriksa bukti kepemilikan artefak NFT (B170) di halaman verifikasi publik (`#/verify`).
 *
 * Tambahan murni: satu `<section id="ownership-check">` kosong di `index.html` (di bawah verifier) diisi fungsi ini; bila elemen itu hilang karena
 * perancangan ulang halaman, fungsi ini diam saja dan verifier tidak terganggu (kontrak seperti `lms-mount`, FE4). Logika pemeriksaannya ada di
 * `../ownership` (diuji `probe`); berkas ini hanya DOM. Halaman membaca chain langsung lewat RPC publik — tanpa backend Lencana di jalur pemeriksaan.
 */
import './ownership.css'
import { h } from '../lib/ui'
import { chainReader, checkOwnership, ownershipCast, ownershipFromSearch, parseBlock, parseStatement, type OwnershipResult, type OwnershipVerdict } from '../ownership'
import { mid } from '../certificate'

type Lang = 'en' | 'id'

const COPY = {
  title: { en: 'Check proof of ownership', id: 'Periksa bukti kepemilikan' },
  lead: {
    en: 'Someone shared a proof block saying they own a Lencana NFT artifact? Paste it here. The page recovers who signed it and compares that wallet with the token’s owner read straight from the chain — no account, no Lencana server in the check.',
    id: 'Ada yang membagikan blok bukti bahwa ia memegang artefak NFT Lencana? Tempel di sini. Halaman memulihkan siapa yang menandatangani lalu membandingkan dompet itu dengan pemilik token yang dibaca langsung dari chain — tanpa akun, tanpa server Lencana di jalur pemeriksaan.',
  },
  label: { en: 'Proof block (statement + signature)', id: 'Blok bukti (pernyataan + tanda tangan)' },
  placeholder: { en: 'Lencana — pernyataan kepemilikan artefak NFT\n…\n\ntanda tangan: 0x…', id: 'Lencana — pernyataan kepemilikan artefak NFT\n…\n\ntanda tangan: 0x…' },
  check: { en: 'Check proof', id: 'Periksa bukti' },
  checking: { en: 'Reading the chain…', id: 'Membaca chain…' },
  clear: { en: 'Clear', id: 'Kosongkan' },
  wallet: { en: 'Signer’s wallet (claimed)', id: 'Dompet penandatangan (dinyatakan)' },
  signer: { en: 'Recovered from the signature', id: 'Dipulihkan dari tanda tangan' },
  contract: { en: 'Contract', id: 'Kontrak' },
  token: { en: 'Token ID', id: 'Token ID' },
  credential: { en: 'Credential', id: 'Kredensial' },
  chain: { en: 'Chain', id: 'Rantai' },
  signed: { en: 'Signed', id: 'Ditandatangani' },
  owner: { en: 'Owner on the chain now', id: 'Pemilik di chain sekarang' },
  locked: { en: 'Locked (soulbound)', id: 'Terkunci (soulbound)' },
  yes: { en: 'yes', id: 'ya' },
  no: { en: 'no', id: 'tidak' },
  unknown: { en: 'not read', id: 'tidak terbaca' },
  openCredential: { en: 'check this credential ↗', id: 'periksa kredensial ini ↗' },
  future: { en: 'The statement’s time is ahead of this device’s clock — treat with suspicion.', id: 'Waktu pernyataan mendahului jam perangkat ini — curigai.' },
  cast: { en: 'Repeat this check without this page (Foundry cast, bash)', id: 'Ulangi pemeriksaan ini tanpa halaman ini (Foundry cast, bash)' },
  limits: {
    en: 'What this does not prove: who the person is in real life, or that the wallet will stay the owner later — the owner is read at the moment you check. Smart-contract wallets (EIP-1271) are not supported.',
    id: 'Yang tidak dibuktikan: siapa orangnya di dunia nyata, atau bahwa dompet itu tetap pemilik di kemudian hari — pemilik dibaca saat kamu memeriksa. Dompet kontrak pintar (EIP-1271) tidak didukung.',
  },
  ago: { en: 'ago', id: 'lalu' },
} as const

const VERDICT: Record<OwnershipVerdict, { tone: 'ok' | 'bad' | 'warn', title: { en: string, id: string } }> = {
  VALID: { tone: 'ok', title: { en: 'Proven: the signer holds the key of this artifact’s owner', id: 'Terbukti: penandatangan memegang kunci pemilik artefak ini' } },
  NOT_OWNER: { tone: 'bad', title: { en: 'Not proven: this wallet does not own the token', id: 'Tidak terbukti: dompet ini bukan pemilik token' } },
  SIGNER_MISMATCH: { tone: 'bad', title: { en: 'Not proven: the signature is from another wallet', id: 'Tidak terbukti: tanda tangan dari dompet lain' } },
  BAD_SIGNATURE: { tone: 'bad', title: { en: 'Not proven: the signature is not valid', id: 'Tidak terbukti: tanda tangan tidak sah' } },
  HASH_MISMATCH: { tone: 'bad', title: { en: 'Not proven: the token belongs to a different credential', id: 'Tidak terbukti: token itu milik kredensial lain' } },
  UNKNOWN_CONTRACT: { tone: 'bad', title: { en: 'Not proven: not a known Lencana artifact contract', id: 'Tidak terbukti: bukan kontrak artefak Lencana yang dikenal' } },
  NO_TOKEN: { tone: 'bad', title: { en: 'Not proven: that token does not exist', id: 'Tidak terbukti: token itu tidak ada' } },
  OTHER_CHAIN: { tone: 'warn', title: { en: 'Cannot check here: the statement is for another chain', id: 'Tidak bisa diperiksa di sini: pernyataan untuk rantai lain' } },
  MALFORMED: { tone: 'warn', title: { en: 'Cannot read this as a proof block', id: 'Ini tidak terbaca sebagai blok bukti' } },
  UNREADABLE: { tone: 'warn', title: { en: 'Could not read the chain — no verdict', id: 'Chain tidak terbaca — belum ada putusan' } },
}

let text = ''
let result: OwnershipResult | null = null
let busy = false
let readUrl = ''
let firstMount = true
let renderedLang: Lang | null = null // bahasa dari gambar yang sedang tampil; `mountOwnershipCheck` tidak menggambar ulang bila sama (fokus dan ketikan tidak boleh hilang)

const explorer = (kind: 'address', a: string, chainId: number) => (chainId === 97 ? `https://testnet.bscscan.com/${kind}/${a}` : chainId === 56 ? `https://bscscan.com/${kind}/${a}` : null)

function ageText (sec: number, lang: Lang): string {
  const a = Math.abs(sec)
  const n = a < 90 ? [Math.max(1, Math.round(a)), lang === 'en' ? 's' : 'dtk'] : a < 5400 ? [Math.round(a / 60), lang === 'en' ? 'min' : 'mnt'] : a < 129_600 ? [Math.round(a / 3600), lang === 'en' ? 'h' : 'jam'] : [Math.round(a / 86_400), lang === 'en' ? 'd' : 'hari']
  return `${n[0]} ${n[1]} ${COPY.ago[lang]}`
}

function resultView (lang: Lang, r: OwnershipResult): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const v = VERDICT[r.verdict]
  const rows: HTMLElement[] = []
  const row = (k: keyof typeof COPY, ...val: Array<HTMLElement | string>) => rows.push(h('div', null, h('dt', null, T(k)), h('dd', null, ...val)))
  const f = r.fields
  if (f) {
    row('wallet', h('code', null, f.wallet))
    if (r.signer && r.signer.toLowerCase() !== f.wallet.toLowerCase()) row('signer', h('code', { class: 'own-bad' }, r.signer))
    else if (r.signer) row('signer', h('code', null, r.signer), ' ', h('b', { class: 'own-ok' }, '✓'))
    const cu = explorer('address', f.contract, f.chainId)
    row('contract', cu ? h('a', { href: cu, target: '_blank', rel: 'noopener noreferrer' }, h('code', null, mid(f.contract, 10, 8))) : h('code', null, f.contract))
    row('token', h('code', { class: 'own-wrap' }, f.tokenId))
    row('credential', h('code', null, mid(f.credential, 10, 8)), ' ', h('a', { href: `${location.pathname}?q=${encodeURIComponent(f.credential)}#/verify` }, T('openCredential')))
    row('chain', String(f.chainId))
    row('signed', `${f.issuedAt} · ${ageText(r.ageSeconds ?? 0, lang)}`)
  }
  if (r.owner) row('owner', h('code', null, r.owner), ...(f && r.signer ? [' ', h('b', { class: r.owner.toLowerCase() === r.signer.toLowerCase() ? 'own-ok' : 'own-bad' }, r.owner.toLowerCase() === r.signer.toLowerCase() ? '✓' : '✗')] : []))
  if (r.locked !== undefined && r.owner) row('locked', r.locked === null ? T('unknown') : r.locked ? T('yes') : T('no'))
  const out = h('div', { class: `own-result is-${v.tone}`, role: 'status', 'data-verdict': r.verdict },
    h('h3', null, v.title[lang]),
    h('p', { class: 'own-why' }, r.why),
    r.future ? h('p', { class: 'own-bad' }, T('future')) : null,
    rows.length ? h('dl', { class: 'own-dl' }, ...rows) : null)
  const b = parseBlock(text)
  const p = b.ok ? parseStatement(b.statement) : null
  if (b.ok && p?.ok) {
    out.appendChild(h('details', { class: 'own-cast' }, h('summary', null, T('cast')), h('pre', null, h('code', null, ownershipCast(p.fields, b.statement, b.signature, readUrl).join('\n')))))
  }
  return out
}

async function run (host: HTMLElement, lang: Lang): Promise<void> {
  if (busy || !text.trim()) return
  busy = true
  result = null
  render(host, lang)
  try {
    const reader = chainReader()
    readUrl = reader.rpcUrl
    result = await checkOwnership(text, reader)
  } catch (e) {
    result = { verdict: 'UNREADABLE', why: e instanceof Error ? e.message : String(e) }
  } finally {
    busy = false
  }
  render(host, lang)
}

function render (host: HTMLElement, lang: Lang): void {
  renderedLang = lang
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const area = h('textarea', { class: 'own-area', rows: '11', spellcheck: 'false', 'aria-label': T('label'), placeholder: T('placeholder'), id: 'ownership-input' }) as HTMLTextAreaElement
  area.value = text
  area.addEventListener('input', () => { text = area.value })
  const go = h('button', { type: 'button', class: 'own-btn own-btn-pri', id: 'ownership-go' }, busy ? T('checking') : T('check')) as HTMLButtonElement
  go.disabled = busy
  go.addEventListener('click', () => { text = area.value; void run(host, lang) })
  const clear = h('button', { type: 'button', class: 'own-btn' }, T('clear'))
  clear.addEventListener('click', () => { text = ''; result = null; render(host, lang) })
  host.replaceChildren(h('div', { class: 'own-card' },
    h('h2', null, T('title')), h('p', { class: 'own-lead' }, T('lead')),
    h('label', { class: 'own-label', for: 'ownership-input' }, T('label')), area,
    h('div', { class: 'own-actions' }, go, clear),
    busy ? h('p', { class: 'own-muted', role: 'status' }, T('checking')) : null,
    result ? resultView(lang, result) : null,
    h('p', { class: 'own-muted own-limits' }, T('limits'))))
}

/** Dipanggil `main.ts` saat teks statis diterapkan (awal dan tiap ganti bahasa). Menggambar ulang dalam bahasa itu tanpa kehilangan isian dan hasil. */
export function mountOwnershipCheck (lang: Lang): void {
  const host = document.getElementById('ownership-check')
  if (!host) return
  if (!(host.firstChild && renderedLang === lang)) render(host, lang)
  if (!firstMount) return
  firstMount = false
  const pre = ownershipFromSearch(window.location.search)
  if (pre) {
    text = pre
    void run(host, lang).then(() => {
      if (/^#\/verify/i.test(window.location.hash)) window.setTimeout(() => host.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
    })
  }
}
