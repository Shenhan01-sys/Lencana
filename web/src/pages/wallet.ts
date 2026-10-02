/**
 * `wallet.ts` — bagian "Dompet" di dashboard peserta (B126): saldo koin uji, koin uji, dan ke mana koinnya pergi.
 *
 * Bendanya koin: saldo tampil sebagai koin LDC-demo dengan angka yang bergulir saat berubah — naik saat koin uji
 * masuk (koinnya jatuh ke tempatnya), turun sesudah membayar. Saldo dibaca dari chain; pembayaran dari rekaman
 * penerbit (`orders`). Batang "ke mana koinmu pergi" menyusun keduanya: tiap kelas yang dibayar + saldo yang tersisa.
 */
// Lencana-B126 status=TERBUKA 2026-10-02 — Dompet: saldo dari chain (koin + angka bergulir), tombol koin uji dengan jeda 24 jam yang terbaca, batang ke mana koin pergi (order lunas + saldo), riwayat pembayaran. Buktikan ulang: uji peramban T48. JANGAN dibalik/diulang tanpa membuka kembali baris B126 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { h } from '../lib/ui'
import { coin } from '../lib/coin'
import { odometer, setOdometer } from '../lib/odometer'
import { stackBar, type StackPart } from '../lib/charts'
import { findCourse } from '../courses/index'
import { claimTestCoins, learnerAddress, type MyCourseRecord } from '../learning'
import { FAUCET_AMOUNT, FAUCET_COOLDOWN_HOURS, PAY_TOKEN_ADDRESS, PAY_TOKEN_SYMBOL, formatLdc } from '../pricing'
import { balanceChanged, onBalance } from '../balance'

type Lang = 'en' | 'id'

const COPY = {
  balance: { en: 'Balance', id: 'Saldo' },
  coinNote: {
    en: 'LDC-demo test coins on BNB testnet (chain 97), read straight from the chain. On mainnet prices are paid in a stablecoin.',
    id: 'Koin uji LDC-demo di BNB testnet (chain 97), dibaca langsung dari chain. Di mainnet harga dibayar dengan stablecoin.',
  },
  unread: { en: 'The balance could not be read from the chain right now.', id: 'Saldo belum terbaca dari chain saat ini.' },
  faucet: { en: 'Get test coins', id: 'Ambil koin uji' },
  faucetNote: { en: 'once per address every', id: 'sekali per alamat setiap' },
  hours: { en: 'hours — the publisher mints them and pays the gas', id: 'jam — penerbit yang mencetak dan membayar gasnya' },
  sending: { en: 'Sending test coins to your wallet…', id: 'Mengirim koin uji ke dompetmu…' },
  arrived: { en: 'Test coins arrived.', id: 'Koin uji masuk.' },
  again: { en: 'Already sent recently — you can get more after', id: 'Sudah diambil baru-baru ini — bisa lagi sesudah' },
  failed: { en: 'Did not go through:', id: 'Belum berhasil:' },
  explorer: { en: 'View on BscScan', id: 'Lihat di BscScan' },
  flow: { en: 'Where your coins went', id: 'Ke mana koinmu pergi' },
  left: { en: 'balance left', id: 'saldo tersisa' },
  emptyFlow: { en: 'No coins in this wallet yet — get test coins to start.', id: 'Belum ada koin di dompet ini — ambil koin uji untuk mulai.' },
  flowNote: {
    en: 'Spent = paid orders recorded by the publisher; balance = the chain. Together they are the coins that reached this wallet, unless you moved some yourself.',
    id: 'Terpakai = pesanan lunas yang dicatat penerbit; saldo = angka chain. Jumlah keduanya = koin yang pernah masuk ke dompet ini, kecuali kamu memindahkannya sendiri.',
  },
  history: { en: 'Payment history', id: 'Riwayat pembayaran' },
  course: { en: 'Course', id: 'Kursus' },
  amount: { en: 'Amount', id: 'Jumlah' },
  state: { en: 'Status', id: 'Status' },
  when: { en: 'When', id: 'Waktu' },
  tx: { en: 'Transaction', id: 'Transaksi' },
  paid: { en: 'paid', id: 'lunas' },
  none: { en: 'No payments yet. Courses enrolled before prices applied stay open without one.', id: 'Belum ada pembayaran. Kursus yang kamu ikuti sebelum harga berlaku tetap terbuka tanpa pembayaran.' },
  payNote: {
    en: 'Each payment is a transaction on BNB testnet you can open yourself; the amount is split on chain between the publisher and the platform.',
    id: 'Setiap pembayaran adalah transaksi di BNB testnet yang bisa kamu buka sendiri; jumlahnya dibagi di chain antara penerbit dan platform.',
  },
} satisfies Record<string, Record<Lang, string>>

const SPENT_CLASSES = ['spent-a', 'spent-b', 'spent-c', 'spent-d']

export function renderWallet (lang: Lang, courses: MyCourseRecord[], balance: bigint | null): HTMLElement {
  const T = (k: keyof typeof COPY): string => COPY[k][lang]
  const addr = learnerAddress()
  const sym = PAY_TOKEN_SYMBOL
  const paid = courses.flatMap((c) => c.orders.filter((o) => o.state === 'paid').map((o) => ({ title: findCourse(c.courseId)?.title ?? c.courseId, o })))

  // ---- saldo: koin + angka bergulir
  const coinSlot = h('div', { class: 'wl-coin' }, coin(76, { title: sym }))
  const amount = odometer(balance === null ? '0' : formatLdc(balance), { from: '0', className: 'wl-odo' })
  const status = h('p', { class: 'wl-status', role: 'status', 'aria-live': 'polite' }, balance === null ? T('unread') : '')
  const faucetBtn = h('button', { type: 'button', class: 'app-btn primary' }, `${T('faucet')} · ${formatLdc(FAUCET_AMOUNT)}`) as HTMLButtonElement
  const say = (text: string, cls = ''): void => { status.textContent = text; status.className = `wl-status ${cls}` }
  faucetBtn.addEventListener('click', async () => {
    faucetBtn.disabled = true
    say(T('sending'))
    const r = await claimTestCoins()
    faucetBtn.disabled = false
    if (r.ok) {
      // Jedanya ditegakkan penerbit (24 jam per alamat); tombolnya ikut berhenti supaya tidak menawarkan 429.
      faucetBtn.disabled = true
      say(T('arrived'), 'ok')
      coinSlot.replaceChildren(coin(76, { title: sym, drop: true }))
      balanceChanged(r.balance)
      return
    }
    if (r.lastAt) {
      faucetBtn.disabled = true
      const next = new Date(new Date(r.lastAt).getTime() + FAUCET_COOLDOWN_HOURS * 3600_000)
      say(`${T('again')} ${next.toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' })}.`, 'wait')
      return
    }
    say(`${T('failed')} ${r.why ?? ''}`.trim(), 'bad')
  })
  // ---- ke mana koinnya pergi: tiap pesanan lunas + saldo yang tersisa; digambar ulang setiap saldo berubah
  const flow = h('section', { class: 'app-card wl-flow lc-enter', style: { '--i': '1' } as Partial<CSSStyleDeclaration> })
  const drawFlow = (bal: bigint | null): void => {
    flow.hidden = bal === null
    if (bal === null) return
    if (bal === 0n && !paid.length) {
      flow.replaceChildren(h('h2', null, T('flow')), h('p', { class: 'app-muted' }, T('emptyFlow')))
      return
    }
    const parts: StackPart[] = paid.map(({ title, o }, i) => ({
      label: title, value: Number(BigInt(o.amount)), cls: SPENT_CLASSES[i % SPENT_CLASSES.length], display: `${formatLdc(BigInt(o.amount))} ${sym}`,
    }))
    parts.push({ label: T('left'), value: Number(bal), cls: 'remain', display: `${formatLdc(bal)} ${sym}` })
    flow.replaceChildren(stackBar(parts, T('flow')), h('p', { class: 'app-muted' }, T('flowNote')))
  }
  drawFlow(balance)
  const unsubscribe = onBalance((v) => {
    if (!amount.isConnected) { unsubscribe(); return }
    if (v === null) return
    if (amount.dataset.v !== formatLdc(v)) drawFlow(v)
    setOdometer(amount, formatLdc(v))
  })

  const hero = h('section', { class: 'app-card wl-hero lc-enter' },
    coinSlot,
    h('div', { class: 'wl-amount' },
      h('span', { class: 'app-kicker' }, T('balance')),
      h('div', { class: 'wl-figure' }, amount, h('span', { class: 'wl-sym' }, sym)),
      h('p', { class: 'app-muted' }, T('coinNote'))),
    h('div', { class: 'wl-actions' },
      faucetBtn,
      addr ? h('a', { class: 'app-btn', href: `https://testnet.bscscan.com/token/${PAY_TOKEN_ADDRESS}?a=${addr}`, target: '_blank', rel: 'noopener noreferrer' }, T('explorer')) : null,
      h('small', { class: 'wl-note' }, `${T('faucetNote')} ${FAUCET_COOLDOWN_HOURS} ${T('hours')}`),
      status))

  const wrap = h('div', { class: 'app-stack wl' }, hero, flow)

  // ---- riwayat pembayaran
  const history = h('section', { class: 'app-card lc-enter', style: { '--i': '2' } as Partial<CSSStyleDeclaration> }, h('h2', null, T('history')))
  if (!paid.length && !courses.some((c) => c.orders.length)) {
    history.appendChild(h('p', { class: 'app-muted' }, T('none')))
  } else {
    const rows = courses.flatMap((c) => c.orders.map((o) => ({ title: findCourse(c.courseId)?.title ?? c.courseId, o })))
    history.appendChild(h('div', { class: 'gr-table-wrap' }, h('table', { class: 'app-table wl-table' },
      h('thead', null, h('tr', null, h('th', null, T('course')), h('th', { class: 'num' }, T('amount')), h('th', null, T('state')), h('th', null, T('when')), h('th', null, T('tx')))),
      h('tbody', null, ...rows.map(({ title, o }) => h('tr', null,
        h('td', { 'data-label': T('course') }, title),
        h('td', { class: 'num', 'data-label': T('amount') }, h('span', { class: 'wl-amt' }, coin(14), `${formatLdc(BigInt(o.amount))} ${sym}`)),
        h('td', { 'data-label': T('state') }, h('span', { class: `gr-chip ${o.state === 'paid' ? 'ok' : 'wait'}` }, o.state === 'paid' ? T('paid') : o.state)),
        h('td', { 'data-label': T('when') }, o.at ? new Date(o.at).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '—'),
        h('td', { 'data-label': T('tx') }, o.tx ? h('a', { href: `https://testnet.bscscan.com/tx/${o.tx}`, target: '_blank', rel: 'noopener noreferrer' }, `${o.tx.slice(0, 10)}…${o.tx.slice(-4)}`) : '—'),
      ))),
    )))
  }
  history.appendChild(h('p', { class: 'app-note' }, T('payNote')))
  wrap.appendChild(history)
  return wrap
}
