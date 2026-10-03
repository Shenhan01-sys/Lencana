/**
 * `owner.ts` — dasbor Agent Owner `#/app/owner` (B130, RF7 langkah C3, D65). Untuk akun yang `ownerOf`-nya memegang
 * agen ERC-8004 yang dikenal platform (dibaca dari registry, B128). Akun lain melihat syaratnya, bukan dasbor kosong.
 *
 * Benda yang ditampilkan, dan dari mana (satu permintaan bertanda tangan `lencana-owner`, `POST /owner/overview`):
 *   kartu identitas   agentId, berkas registrasi (menunjuk balik?), NFT di BscScan, jejak cetak platform
 *   slot dompet       `agentWallet` dari registry — kosong sesudah NFT dipindah (EIP-8004), diisi pemilik sendiri
 *   tangga tarif      tarif dasar dari metadata registry × tujuh label tingkat berat (+5%/anak tangga, B119)
 *   pekerjaan + uang  sewa/penunjukan, aktivitas, tagihan (dibayar ke dompet agen saat tagihan dibuat)
 * Aksi pemilik ditandatangani dan DIBAYAR GASNYA oleh dompet akun ini sendiri: verifikasi dompet agen
 * (`setAgentWallet`) dan ubah tarif (`setMetadata`). Gas testnet bisa diminta dari platform bila menipis.
 */
// Lencana-B130 status=TERBUKA 2026-10-02 — dasbor Agent Owner #/app/owner: kartu identitas, slot dompet agen (verifikasi oleh pemilik: EIP-712 + setAgentWallet dari dompet akunnya), tangga tarif + ubah tarif (setMetadata), sewa/aktivitas/tagihan, gas testnet. Buktikan ulang: cd signer && npm run verify:owner, lalu uji peramban T55. JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './dashboard.css'
import './dash-viz.css'
import './publisher.css'
import './owner.css'
import { formatEther } from 'viem'
import { h } from '../lib/ui'
import { findCourse } from '../courses/index'
import {
  readOwnerOverview, requestOwnerGas, verifyAgentWallet, setAgentTariff, learnerAddress,
  type OwnerOverview, type OwnerAgent,
} from '../learning'
import { formatLdc, PAY_TOKEN_SYMBOL, PAY_TOKEN_DECIMALS } from '../pricing'
import { coin } from '../lib/coin'
import { odometer } from '../lib/odometer'
import { skeleton, steps } from '../lib/loading'
import { mountSeatSwitch, navIcon, guardSeat } from './seats'
import { agentWorkshop, firstAgentWorkshop } from './agent-workshop'
import { agentBrain } from './agent-brain'

type Lang = 'en' | 'id'

const COPY = {
  title: { en: 'My agents', id: 'Agen saya' },
  kicker: { en: 'AGENT OWNER · ERC-8004 · BNB TESTNET', id: 'AGENT OWNER · ERC-8004 · BNB TESTNET' },
  sub: { en: 'Read from the ERC-8004 registry (ownerOf, agent wallet, tariff) and the publisher’s records.', id: 'Dibaca dari registry ERC-8004 (ownerOf, dompet agen, tarif) dan rekaman penerbit.' },
  nav: { en: 'Agent Owner dashboard', id: 'Dasbor Agent Owner' },
  agents: { en: 'My agents', id: 'Agen saya' },
  stepSign: { en: 'Signing the request', id: 'Menandatangani permintaan' },
  stepRead: { en: 'Reading the registry and the publisher’s records', id: 'Membaca registry dan rekaman penerbit' },
  loading: { en: 'Reading your agents…', id: 'Membaca agenmu…' },
  failed: { en: 'Your agents could not be read:', id: 'Agenmu tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  reload: { en: 'Reload', id: 'Muat ulang' },
  noSeatTitle: { en: 'You do not hold the Agent Owner seat yet', id: 'Kamu belum memegang kursi Agent Owner' },
  noSeatBody: {
    en: 'This seat belongs to the account whose wallet owns an ERC-8004 agent identity (ownerOf in the registry). In this demo the platform mints an agent for an account and transfers it there; the owner then verifies the agent wallet on this page.',
    id: 'Kursi ini milik akun yang dompetnya memiliki identitas agen ERC-8004 (ownerOf di registry). Di demo ini platform mencetak agen untuk sebuah akun lalu memindahkannya ke sana; pemiliknya kemudian memverifikasi dompet agen di halaman ini.',
  },
  backLearner: { en: 'Back to the learner dashboard', id: 'Kembali ke dasbor peserta' },
  noAgentYet: {
    en: 'You chose Agent Owner. The seat opens when this account’s wallet owns an ERC-8004 agent identity — in this demo the platform mints one and transfers it to you; you then verify its wallet here.',
    id: 'Kamu memilih Agent Owner. Kursinya terbuka saat dompet akun ini memiliki identitas agen ERC-8004 — di demo ini platform mencetaknya lalu memindahkannya ke akunmu; sesudah itu kamu memverifikasi dompetnya di sini.',
  },
  gas: { en: 'Gas for your transactions', id: 'Gas untuk transaksimu' },
  gasLow: { en: 'running low', id: 'menipis' },
  askGas: { en: 'Request test gas', id: 'Minta gas uji' },
  gasSent: { en: 'Sent — balance refreshed.', id: 'Terkirim — saldo diperbarui.' },
  identity: { en: 'Identity', id: 'Identitas' },
  owner: { en: 'owner', id: 'pemilik' },
  you: { en: 'you', id: 'kamu' },
  pointsBack: { en: 'registration file points back to this agent', id: 'berkas registrasi menunjuk balik ke agen ini' },
  noPointsBack: { en: 'registration file does NOT point back', id: 'berkas registrasi TIDAK menunjuk balik' },
  mintedBy: { en: 'Minted by the platform', id: 'Dicetak platform' },
  selfRegistered: { en: 'Self-registered by', id: 'Didaftarkan sendiri oleh' },
  registerTx: { en: 'register', id: 'register' },
  transferTx: { en: 'transfer to you', id: 'pindah ke akunmu' },
  walletTitle: { en: 'Agent wallet', id: 'Dompet agen' },
  walletUnset: { en: 'Not verified', id: 'Belum diverifikasi' },
  walletUnsetBody: {
    en: 'ERC-8004 clears the agent wallet whenever the identity changes hands, and only the owner may set it again. Until then nobody can hire this agent.',
    id: 'ERC-8004 mengosongkan dompet agen setiap kali identitasnya berpindah tangan, dan hanya pemilik yang boleh mengisinya lagi. Sampai itu, agen ini tidak bisa disewa siapa pun.',
  },
  walletOwner: { en: 'Your account’s wallet', id: 'Dompet akunmu' },
  walletOwnerBody: { en: 'The agent signs with this wallet and its fees are paid here.', id: 'Agen menandatangani dengan dompet ini dan bayarannya masuk ke sini.' },
  walletOther: { en: 'Another wallet', id: 'Dompet lain' },
  walletOtherBody: { en: 'The agent operates with a wallet that is not your account’s; its fees are paid there.', id: 'Agen bekerja dengan dompet yang bukan dompet akunmu; bayarannya masuk ke sana.' },
  verify: { en: 'Verify the agent wallet', id: 'Verifikasi dompet agen' },
  useMine: { en: 'Use my account’s wallet', id: 'Pakai dompet akunku' },
  vStep1: { en: 'Sign: prove you control the wallet (EIP-712)', id: 'Tanda tangan: buktikan dompet ini milikmu (EIP-712)' },
  vStep2: { en: 'Send setAgentWallet from your wallet (gas)', id: 'Kirim setAgentWallet dari dompetmu (gas)' },
  vStep3: { en: 'Wait for the chain', id: 'Menunggu chain' },
  working: { en: 'Signing and sending…', id: 'Menandatangani dan mengirim…' },
  verified: { en: 'Verified on chain.', id: 'Terverifikasi di chain.' },
  hireable: { en: 'Can be hired', id: 'Bisa disewa' },
  notHireable: { en: 'Cannot be hired yet', id: 'Belum bisa disewa' },
  ladder: { en: 'Tariff ladder', id: 'Tangga tarif' },
  ladderNote: { en: 'Base tariff written by you in the registry; each difficulty step adds 5% (Lencana’s ladder). The agent picks the label per activity.', id: 'Tarif dasar ditulis olehmu di registry; tiap anak tangga tingkat berat menambah 5% (tangga Lencana). Agen memilih labelnya per aktivitas.' },
  noTariff: { en: 'No base tariff published yet.', id: 'Belum ada tarif dasar.' },
  newTariff: { en: 'New base tariff', id: 'Tarif dasar baru' },
  setTariff: { en: 'Sign and set', id: 'Tandatangani & tetapkan' },
  tariffSet: { en: 'Tariff written to the registry.', id: 'Tarif tertulis di registry.' },
  work: { en: 'Where it works', id: 'Tempatnya bekerja' },
  hiredAs: { en: 'grading agent', id: 'agen penilai' },
  appointedAs: { en: 'reviewer agent', id: 'agen pengesah' },
  byKey: { en: 'by the publisher key', id: 'oleh kunci penerbit' },
  byMember: { en: 'by member', id: 'oleh anggota' },
  stale: { en: 'wallet changed since — the publisher must hire again', id: 'dompet berubah sejak itu — penerbit harus menyewa ulang' },
  noWork: { en: 'Not hired or appointed anywhere yet.', id: 'Belum disewa atau ditunjuk di mana pun.' },
  activity: { en: 'Activity', id: 'Aktivitas' },
  graded: { en: 'gradings', id: 'penilaian' },
  reviews: { en: 'reviews', id: 'pengesahan' },
  labels: { en: 'Difficulty labels it chose', id: 'Label tingkat berat yang dipilihnya' },
  money: { en: 'Fees', id: 'Bayaran' },
  due: { en: 'due', id: 'jatuh tempo' },
  paid: { en: 'paid', id: 'lunas' },
  paidTo: { en: 'paid to', id: 'dibayar ke' },
  noCharges: { en: 'No charges yet.', id: 'Belum ada tagihan.' },
} satisfies Record<string, Record<Lang, string>>

const SCAN = 'https://testnet.bscscan.com'
const short = (a: string | null | undefined) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : '—')
const ldc = (units: string) => `${formatLdc(BigInt(units))} ${PAY_TOKEN_SYMBOL}`
const fmt = (lang: Lang, iso: string) => new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' })
const enter = (i: number) => ({ '--i': String(i) }) as Partial<CSSStyleDeclaration>
const txLink = (hash: string | null, label: string) => (hash ? h('a', { href: `${SCAN}/tx/${hash}`, target: '_blank', rel: 'noopener noreferrer' }, `${label} ${hash.slice(0, 8)}… ↗`) : null)

let memo: { addr: string, data: OwnerOverview } | null = null

export function renderOwnerApp (lang: Lang): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const main = h('main', { class: 'dash-main ow-main' })
  const sideSlot = h('div', { class: 'seat-slot side' })
  const topSlot = h('div', { class: 'seat-slot top' })
  const shell = h('div', { class: 'app-shell ow-shell' },
    h('nav', { class: 'app-side', 'aria-label': T('nav') },
      sideSlot,
      h('a', { href: '#/app/owner', class: 'active', 'aria-current': 'page' },
        navIcon('M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 5h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm3 5h4v4h-4z'),
        h('span', { class: 'nav-full' }, T('agents')), h('span', { class: 'nav-short', 'aria-hidden': 'true' }, T('agents')))),
    main)
  main.appendChild(topSlot)
  mountSeatSwitch(lang, 'owner', [sideSlot, topSlot])
  const head = h('header', { class: 'app-head' }, h('span', { class: 'app-kicker' }, T('kicker')), h('h1', null, T('title')), h('p', { class: 'app-muted' }, T('sub')))
  const body = h('div', { class: 'app-body' })
  main.append(head, body)

  const load = (fresh: boolean) => {
    const addr = learnerAddress() ?? ''
    if (!fresh && memo?.addr === addr) { body.replaceChildren(renderAgents(lang, memo.data, () => load(true))); return }
    const progress = steps([T('stepSign'), T('stepRead')])
    body.replaceChildren(h('div', { class: 'app-loading' }, progress, skeleton('cards', T('loading'))))
    // B131: akun nyata berperan lain dikirim ke dasbor perannya sendiri; kursi dibaca dulu, lalu dasbor — berurutan.
    guardSeat('owner', (s) => void readOwnerOverview((i) => progress.set(i)).then((r) => {
      if (!body.isConnected) return
      if (r.status === 403) {
        const chosen = s.ok && s.roles?.account.role === 'owner' && !s.roles.account.dev
        // B132: akun yang memilih Agent Owner (atau akun dev) tanpa agen merakit dan mendaftarkan agen pertamanya sendiri.
        if (chosen || (s.ok && s.roles?.account.dev)) {
          body.replaceChildren(firstAgentWorkshop(lang, () => load(true)))
          return
        }
        body.replaceChildren(h('section', { class: 'app-card pb-noseat' },
          h('h2', null, T('noSeatTitle')), h('p', { class: 'app-muted' }, T('noSeatBody')),
          h('a', { class: 'app-btn small', href: '#/app' }, T('backLearner'))))
        return
      }
      if (!r.ok || !r.data) {
        body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: () => load(true) }, T('retry'))))
        return
      }
      memo = { addr, data: r.data }
      body.replaceChildren(renderAgents(lang, r.data, () => load(true)))
    }))
  }
  load(false)
  return shell
}

function renderAgents (lang: Lang, o: OwnerOverview, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const wrap = h('div', { class: 'app-stack ow' })
  // Gas: dompet akun ini membayar transaksi pemilik sendiri; platform bisa mengisi saat menipis (testnet).
  const gasStatus = h('span', { class: 'seat-apply-status', role: 'status' })
  const gasBtn = o.gas.low ? h('button', { type: 'button', class: 'app-btn small' }, T('askGas')) as HTMLButtonElement : null
  gasBtn?.addEventListener('click', () => {
    gasBtn.disabled = true
    gasStatus.textContent = '…'
    void requestOwnerGas().then((r) => {
      if (!r.ok) { gasBtn.disabled = false; gasStatus.className = 'seat-apply-status bad'; gasStatus.textContent = r.why ?? ''; return }
      gasStatus.className = 'seat-apply-status ok'
      gasStatus.textContent = T('gasSent')
      setTimeout(reload, 900)
    })
  })
  wrap.appendChild(h('div', { class: 'ow-gas lc-enter', style: enter(0) },
    h('span', { class: 'ow-gas-dot', 'aria-hidden': 'true' }),
    h('span', null, `${T('gas')}: `, h('b', null, `${Number(formatEther(BigInt(o.gas.balance))).toFixed(5)} tBNB`), o.gas.low ? h('em', null, ` · ${T('gasLow')}`) : null),
    gasBtn, gasStatus,
    h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('reload'))))
  // B132: setiap agen pertama-tama tampil sebagai robot di bengkelnya (data di bentuknya); rincian lama di bawahnya.
  // B135: otaknya (provider + model + kalibrasi + antrean esai) tepat di bawah robotnya.
  o.agents.forEach((a, i) => {
    wrap.appendChild(agentWorkshop(lang, o, a, reload))
    wrap.appendChild(agentBrain(lang, o, a, reload))
    wrap.appendChild(agentBlock(lang, o, a, i + 1, reload))
  })
  return wrap
}

function agentBlock (lang: Lang, o: OwnerOverview, a: OwnerAgent, i: number, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const registry = a.registry.split(':').pop() ?? ''

  // ---- kartu identitas: NFT ERC-8004 sebagai benda — nomor besar, nama, berkas registrasi, jejak cetak
  const card = h('article', { class: 'ow-id lc-enter', style: enter(i) },
    h('div', { class: 'ow-id-top' },
      h('span', { class: 'ow-id-chip' }, 'ERC-8004'),
      h('a', { class: 'ow-id-scan', href: `${SCAN}/token/${registry}?a=${encodeURIComponent(a.agentId)}`, target: '_blank', rel: 'noopener noreferrer' }, `NFT ${short(registry)} ↗`)),
    h('div', { class: 'ow-id-num' }, '#', odometer(a.agentId, { from: a.agentId.replace(/\d/g, '0') })),
    h('strong', { class: 'ow-id-name' }, a.name ?? '—'),
    a.description ? h('p', { class: 'ow-id-desc' }, a.description) : null,
    h('ul', { class: 'ow-id-facts' },
      h('li', null, `${T('owner')}: `, h('code', null, short(o.address)), ` (${T('you')})`),
      h('li', { class: a.pointsBack ? 'ok' : 'bad' }, a.pointsBack ? T('pointsBack') : T('noPointsBack')),
      // Lencana-B137 status=SELESAI 2026-10-03 — kartu identitas agen yang didaftarkan pemiliknya sendiri tidak lagi berlabel "Dicetak platform": label mengikuti peran templat registrasinya (grader-self). Buktikan ulang: uji peramban T65 (kartu #2548/#2549). JANGAN dibalik/diulang tanpa membuka kembali baris B137 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
      a.minted
        ? (a.registrationRole === 'grader-self'
            ? h('li', null, `${T('selfRegistered')} ${short(a.minted.by)} · `, txLink(a.minted.registerTx, T('registerTx')))
            : h('li', null, `${T('mintedBy')} · `, txLink(a.minted.registerTx, T('registerTx')), ' · ', txLink(a.minted.transferTx, T('transferTx'))))
        : null),
    h('span', { class: `ow-hire ${a.hireable ? 'ok' : 'wait'}` }, a.hireable ? T('hireable') : `${T('notHireable')} — ${a.problem ?? ''}`))

  // ---- slot dompet agen: kosong → pemilik "menyegel" dengan dompet akunnya (EIP-712 + setAgentWallet)
  const wState = a.walletState
  const progress = steps([T('vStep1'), T('vStep2'), T('vStep3')])
  progress.hidden = true // tahap baru tampil sesudah pemilik menekan tombol — sebelum itu belum ada yang terjadi
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  const act = wState === 'owner' ? null : h('button', { type: 'button', class: 'app-btn primary small' }, wState === 'unset' ? T('verify') : T('useMine')) as HTMLButtonElement
  act?.addEventListener('click', () => {
    act.disabled = true
    progress.hidden = false
    status.className = 'seat-apply-status'
    status.textContent = T('working')
    void verifyAgentWallet(a.agentId, (k) => progress.set(k)).then((r) => {
      act.disabled = false
      if (!r.ok) { status.className = 'seat-apply-status bad'; status.textContent = r.why ?? ''; return }
      progress.set(2)
      status.className = 'seat-apply-status ok'
      status.replaceChildren(T('verified'), ' ', r.tx ? h('a', { href: `${SCAN}/tx/${r.tx}`, target: '_blank', rel: 'noopener noreferrer' }, `${r.tx.slice(0, 10)}… ↗`) : '')
      setTimeout(reload, 1500)
    })
  })
  const wallet = h('section', { class: `app-card ow-wallet ${wState} lc-enter`, style: enter(i + 1) },
    h('h2', null, T('walletTitle')),
    h('div', { class: 'ow-slot' },
      h('span', { class: 'ow-slot-key', 'aria-hidden': 'true' }),
      h('div', null,
        h('strong', null, wState === 'unset' ? T('walletUnset') : wState === 'owner' ? T('walletOwner') : T('walletOther')),
        a.wallet ? h('code', null, a.wallet) : null)),
    h('p', { class: 'app-muted' }, wState === 'unset' ? T('walletUnsetBody') : wState === 'owner' ? T('walletOwnerBody') : T('walletOtherBody')),
    act ? progress : null,
    act ? h('div', { class: 'seat-apply-row' }, act, status) : null)

  // ---- tangga tarif: tujuh anak tangga, tinggi = harga; ubah tarif dasar = setMetadata dari dompet akun ini
  const ladder = h('section', { class: 'app-card ow-ladder lc-enter', style: enter(i + 2) }, h('h2', null, T('ladder')))
  if (!a.rateCard.length) ladder.appendChild(h('p', { class: 'app-muted' }, T('noTariff')))
  else {
    const max = a.rateCard.reduce((m, x) => (BigInt(x.amount) > m ? BigInt(x.amount) : m), 0n)
    const used = a.activity.labels
    ladder.appendChild(h('ol', { class: 'ow-steps' }, ...a.rateCard.map((x, k) => h('li', { style: { '--h': `${max > 0n ? 30 + Number((BigInt(x.amount) * 70n) / max) : 30}%`, '--k': String(k) } as Partial<CSSStyleDeclaration> },
      h('span', { class: 'ow-step-amt' }, formatLdc(BigInt(x.amount))),
      h('span', { class: 'ow-step-bar' }, used[x.label] ? h('i', { class: 'ow-step-used', title: `${used[x.label]}×` }, String(used[x.label])) : null),
      h('small', null, x.label.replace(/-/g, ' '))))))
    ladder.appendChild(h('p', { class: 'app-muted ov-small' }, `${PAY_TOKEN_SYMBOL} · ${T('ladderNote')}`))
  }
  // Formulir hanya bila server menyebut token platformnya — tanpa itu tidak ada tarif sah yang bisa ditulis.
  if (a.tariff?.inPlatformToken !== false && o.token.address) {
    const tokenAddress = o.token.address
    const input = h('input', { class: 'pb-input', inputmode: 'decimal', placeholder: a.tariff ? formatLdc(BigInt(a.tariff.amount)) : '0.002', 'aria-label': T('newTariff') }) as HTMLInputElement
    const tStatus = h('p', { class: 'seat-apply-status', role: 'status' })
    const tBtn = h('button', { type: 'button', class: 'app-btn small' }, T('setTariff')) as HTMLButtonElement
    tBtn.addEventListener('click', () => {
      const v = input.value.trim().replace(',', '.')
      if (!/^\d+(\.\d{1,6})?$/.test(v)) { tStatus.className = 'seat-apply-status bad'; tStatus.textContent = `0.000001–… ${PAY_TOKEN_SYMBOL}`; return }
      const [w, f = ''] = v.split('.')
      const units = BigInt(w) * 10n ** BigInt(PAY_TOKEN_DECIMALS) + BigInt((f + '000000').slice(0, PAY_TOKEN_DECIMALS))
      tBtn.disabled = true
      tStatus.className = 'seat-apply-status'
      tStatus.textContent = T('working')
      void setAgentTariff(a.agentId, tokenAddress, units).then((r) => {
        tBtn.disabled = false
        if (!r.ok) { tStatus.className = 'seat-apply-status bad'; tStatus.textContent = r.why ?? ''; return }
        tStatus.className = 'seat-apply-status ok'
        tStatus.textContent = T('tariffSet')
        setTimeout(reload, 1500)
      })
    })
    ladder.appendChild(h('div', { class: 'pb-form ow-tariff' }, h('label', null, h('span', null, `${T('newTariff')} (${PAY_TOKEN_SYMBOL})`), input), tBtn))
    ladder.appendChild(tStatus)
  }

  // ---- tempat bekerja + aktivitas + bayaran
  const courseTitle = (id: string) => findCourse(id)?.title ?? id
  const byWho = (by: string | null | undefined, byKey: boolean) => (byKey ? T('byKey') : !by ? '' : `${T('byMember')} ${short(by)}`)
  const work = h('section', { class: 'app-card lc-enter', style: enter(i + 3) }, h('h2', null, T('work')))
  if (!a.hires.length && !a.appointments.length) work.appendChild(h('p', { class: 'app-muted' }, T('noWork')))
  else {
    work.appendChild(h('ul', { class: 'pb-idcards' },
      ...a.hires.map((x) => h('li', { class: 'pb-idcard' }, h('div', { class: 'pb-idcard-top' }, h('span', null, courseTitle(x.courseId)), h('span', { class: 'app-tag' }, T('hiredAs'))),
        h('small', null, `${fmt(lang, x.at)} · ${byWho(x.hiredBy, x.byPublisherKey)}`), x.stale ? h('small', { class: 'ow-stale' }, T('stale')) : null)),
      ...a.appointments.map((x) => h('li', { class: 'pb-idcard' }, h('div', { class: 'pb-idcard-top' }, h('span', null, courseTitle(x.courseId)), h('span', { class: 'app-tag' }, T('appointedAs'))),
        h('small', null, `${fmt(lang, x.at)} · ${byWho(x.addedBy, x.byPublisherKey)}`), x.stale ? h('small', { class: 'ow-stale' }, T('stale')) : null))))
  }
  const totalLabels = Object.values(a.activity.labels).reduce((s, n) => s + n, 0)
  const activity = h('section', { class: 'app-card lc-enter', style: enter(i + 4) }, h('h2', null, T('activity')),
    h('div', { class: 'ow-counts' },
      h('div', null, h('b', null, odometer(String(a.activity.graded), { from: '0' })), h('span', null, T('graded'))),
      h('div', null, h('b', null, odometer(String(a.activity.reviews), { from: '0' })), h('span', null, T('reviews')))),
    totalLabels ? h('p', { class: 'app-muted ov-small' }, `${T('labels')}: ${Object.entries(a.activity.labels).filter(([, n]) => n).map(([l, n]) => `${l} ${n}`).join(' · ')}`) : null)
  const money = h('section', { class: 'app-card lc-enter', style: enter(i + 5) }, h('h2', null, T('money')),
    h('div', { class: 'ow-money' },
      h('div', { class: 'paid' }, coin(18), h('b', null, ldc(a.charges.paid.amount)), h('span', null, `${a.charges.paid.count} ${T('paid')}`)),
      h('div', { class: 'due' }, h('b', null, ldc(a.charges.due.amount)), h('span', null, `${a.charges.due.count} ${T('due')}`))))
  if (!a.charges.recent.length) money.appendChild(h('p', { class: 'app-muted' }, T('noCharges')))
  else {
    money.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table pb-table' },
      h('tbody', null, ...a.charges.recent.map((c) => h('tr', null,
        h('td', null, c.activity === 'review' ? T('reviews') : T('graded'), c.label ? h('small', { class: 'pb-label' }, c.label) : null),
        h('td', { class: 'num' }, ldc(c.amount)),
        h('td', null, h('span', { class: `gr-chip ${c.status === 'paid' ? 'ok' : 'wait'}` }, c.status === 'paid' ? T('paid') : T('due'))),
        h('td', null, h('small', null, `${T('paidTo')} `, h('code', null, short(c.paidTo)))),
        h('td', null, txLink(c.tx, 'tx') ?? '—')))))))
  }

  return h('div', { class: 'ow-agent' },
    h('div', { class: 'ow-hero' }, card, wallet),
    h('div', { class: 'ov-grid' }, ladder, work),
    h('div', { class: 'ov-grid' }, activity, money))
}
