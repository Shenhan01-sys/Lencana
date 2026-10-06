/**
 * `seats.ts` — kursi akun di sisi halaman (B128 baca, B129 pengajuan + pemilih kursi). Dipakai dasbor peserta dan dasbor
 * penerbit, jadi tinggal di modulnya sendiri.
 *
 * Kursi dibaca dari penerbit (`POST /me/roles`, bertanda tangan) dan berubah hanya kalau kunci penerbit memutuskan atau
 * NFT agen berpindah tangan — jadi dibaca sekali per muat halaman dan dipakai bersama; "Periksa ulang" membaca segar.
 */
// Lencana-B129 status=SELESAI 2026-10-02 — pemilih kursi Peserta/Penerbit untuk pemegang kursi Penerbit, dan kotak pengajuan anggota (ajukan → menunggu → disetujui/ditolak kunci penerbit) di Akun, onboarding, dan dasbor penerbit. Buktikan ulang: cd signer && npm run verify:publisher, lalu uji peramban T53. JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import './seats.css'
import { h } from '../lib/ui'
import { learnerAddress, readMyRoles, requestPublisherMembership, type MyRoles } from '../learning'

type Lang = 'en' | 'id'

export type SeatsRead = { ok: boolean, why?: string, roles?: MyRoles }
let memo: { addr: string, value: SeatsRead } | null = null
let inflight: Promise<SeatsRead> | null = null

export function seats (fresh = false): Promise<SeatsRead> {
  const addr = learnerAddress()
  if (!fresh && addr && memo?.addr === addr) return Promise.resolve(memo.value)
  inflight ??= readMyRoles().then((v) => { if (addr && v.ok) memo = { addr, value: v }; return v }).finally(() => { inflight = null })
  return inflight
}

const COPY = {
  learner: { en: 'Learner', id: 'Peserta' },
  publisher: { en: 'Publisher', id: 'Penerbit' },
  owner: { en: 'Agent Owner', id: 'Agent Owner' },
  seatAria: { en: 'Seat', id: 'Kursi' },
  apply: { en: 'Apply for membership', id: 'Ajukan jadi anggota' },
  applyAgain: { en: 'Apply again', id: 'Ajukan lagi' },
  notePh: { en: 'Optional note for the publisher (who you are, why) — max 280 characters', id: 'Catatan untuk penerbit (opsional: siapa kamu, untuk apa) — maks. 280 karakter' },
  sending: { en: 'Signing and sending…', id: 'Menandatangani dan mengirim…' },
  pending: { en: 'Waiting for the publisher', id: 'Menunggu keputusan penerbit' },
  pendingSub: { en: 'Submitted', id: 'Diajukan' },
  rejected: { en: 'Not approved', id: 'Tidak disetujui' },
  rejectedSub: { en: 'Decided', id: 'Diputuskan' },
  how: {
    en: 'Your account signs the request; only the publisher key can approve it — approval grants the membership and its rights in one signed message. A request alone gives no rights.',
    id: 'Akunmu menandatangani pengajuan; hanya kunci penerbit yang bisa menyetujuinya — persetujuan memberi keanggotaan dan wewenangnya dalam satu pesan bertanda tangan. Pengajuan saja tidak memberi wewenang apa pun.',
  },
  howShort: { en: 'The publisher key decides; a request alone gives no rights.', id: 'Kunci penerbit yang memutuskan; pengajuan saja tidak memberi wewenang.' },
  demoHow: {
    en: 'Demo: the publisher key lives on the platform machine — the team approves with npm run grant:member.',
    id: 'Demo: kunci penerbit ada di mesin platform — tim menyetujui dengan npm run grant:member.',
  },
  noIssuer: { en: 'This server has no publisher configured.', id: 'Server ini tidak punya penerbit yang dikonfigurasi.' },
  devTag: { en: 'dev account', id: 'akun dev' },
  devTitle: {
    en: 'Developer account: holds every seat its facts give it. Real accounts hold one role.',
    id: 'Akun pengembang: memegang semua kursi menurut faktanya. Akun nyata memegang satu peran.',
  },
  choosesRole: {
    en: 'Applying chooses the Publisher role for this account. One account holds one role — this cannot be changed, and the account will not take courses.',
    id: 'Mengajukan = memilih peran Penerbit untuk akun ini. Satu akun memegang satu peran — tidak bisa diganti, dan akun ini tidak mengikuti kursus.',
  },
} satisfies Record<string, Record<Lang, string>>

const T = (lang: Lang, k: keyof typeof COPY) => COPY[k][lang]

/** Ikon garis untuk menu samping (dipakai cangkang peserta dan penerbit). */
export function navIcon (d: string): HTMLElement {
  const el = h('span', { class: 'app-ic', 'aria-hidden': 'true' })
  el.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`
  return el
}

const when = (lang: Lang, iso: string | null) => (iso ? new Date(iso).toLocaleString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '')

export type SeatId = 'learner' | 'publisher' | 'owner'

// Lencana-B131 status=SELESAI 2026-10-03 — satu akun nyata satu peran (D66): pemilih kursi hanya untuk akun dev (dummy builder); akun lain diarahkan ke dasbor perannya, dan kotak pengajuan memperingatkan bahwa mengajukan = memilih peran Penerbit. Buktikan ulang: cd signer && npm run verify:account, lalu uji peramban T57. JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.

/**
 * Kursi yang dipegang akun, dari jawaban `/me/roles`. Sejak B131 (D66) hanya akun dev yang memegang lebih dari satu kursi;
 * akun nyata memegang kursi perannya saja, dan kursi itu tetap butuh faktanya (keanggotaan / ownerOf).
 */
export function heldSeats (roles: MyRoles | undefined | null): { publisher: boolean, owner: boolean } {
  const facts = { publisher: Boolean(roles?.publisher), owner: Boolean(roles?.agents.length) }
  if (!roles || roles.account.dev) return facts
  return { publisher: roles.account.role === 'publisher' && facts.publisher, owner: roles.account.role === 'owner' && facts.owner }
}

/** Dasbor untuk peran akun ini (B131): Penerbit → `#/app/pub`, Agent Owner → `#/app/owner`, Admin Lencana → `#/app/admin` (D77), selain itu dasbor peserta. */
export function homeOf (roles: MyRoles | undefined | null): string {
  const role = roles && !roles.account.dev ? roles.account.role : null
  return role === 'publisher' ? '#/app/pub' : role === 'owner' ? '#/app/owner' : role === 'admin' ? '#/app/admin' : '#/app'
}

/**
 * Penjaga cangkang (B131): akun nyata yang membuka dasbor peran lain dikirim ke dasbor perannya sendiri. Akun dev dan akun
 * yang belum berperan tidak dipindahkan (yang belum berperan boleh belajar — belajar menjadikannya Peserta). Kursi yang
 * tidak terbaca tidak memindahkan siapa pun: server tetap menolak aksi peran lain.
 */
export function guardSeat (active: SeatId, then: (r: SeatsRead) => void): void {
  void seats().then((r) => {
    const acct = r.ok ? r.roles?.account : null
    if (acct && !acct.dev && acct.role && acct.role !== active) {
      window.location.hash = homeOf(r.roles)
      return
    }
    then(r)
  })
}

/**
 * Pemilih kursi (B129, tiga arah sejak B130): Peserta selalu ada; Penerbit dan Agent Owner hanya bila kursinya dipegang
 * menurut fakta. Sejak B131 hanya untuk akun dev — akun nyata memegang satu peran, jadi tidak ada yang dipilih.
 */
export function seatSwitch (lang: Lang, active: SeatId, held: { publisher: boolean, owner: boolean }): HTMLElement | null {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const seatsList: { id: SeatId, href: string, label: string }[] = [
    { id: 'learner', href: '#/app', label: T('learner') },
    ...(held.publisher || active === 'publisher' ? [{ id: 'publisher' as const, href: '#/app/pub', label: T('publisher') }] : []),
    ...(held.owner || active === 'owner' ? [{ id: 'owner' as const, href: '#/app/owner', label: T('owner') }] : []),
  ]
  if (seatsList.length < 2) return null
  return h('div', { class: `seat-switch n${seatsList.length}`, role: 'group', 'aria-label': T('seatAria') },
    ...seatsList.map((s) => h('a', { href: s.href, class: s.id === active ? 'on' : '', 'aria-current': s.id === active ? 'page' : 'false' }, s.label)))
}

/** Isi dua slot pemilih kursi (menu samping + atas isi untuk ponsel) sesudah kursi terbaca. */
export function mountSeatSwitch (lang: Lang, active: SeatId, slots: HTMLElement[]): void {
  void seats().then((r) => {
    const held = heldSeats(r.ok ? r.roles : null)
    const dev = Boolean(r.ok && r.roles?.account.dev)
    for (const slot of slots) {
      if (!slot.isConnected) continue
      const el = dev ? seatSwitch(lang, active, held) : null
      slot.replaceChildren(...(el ? [el, h('span', { class: 'seat-dev', title: T(lang, 'devTitle') }, T(lang, 'devTag'))] : []))
    }
  })
}

/**
 * Kotak pengajuan anggota (B129): tombol + catatan opsional, atau status pengajuan yang menunggu / ditolak. Sesudah
 * terkirim, kursi dibaca ulang dan `onChange` dipanggil supaya pemanggil bisa menggambar ulang.
 */
export function applyBox (lang: Lang, roles: MyRoles, opts: { withNote?: boolean, onChange?: () => void } = {}): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const box = h('div', { class: 'seat-apply' })
  if (!roles.issuer) { box.appendChild(h('p', { class: 'app-muted' }, T('noIssuer'))); return box }
  const issuer = roles.issuer
  const req = roles.request
  const status = h('p', { class: 'seat-apply-status', role: 'status' })
  if (req?.status === 'pending') {
    box.appendChild(h('div', { class: 'seat-apply-state wait' },
      h('span', { class: 'seat-dot', 'aria-hidden': 'true' }),
      h('div', null, h('strong', null, T('pending')), h('small', null, `${T('pendingSub')} ${when(lang, req.createdAt)}${req.note ? ` · “${req.note}”` : ''}`))))
    box.appendChild(h('p', { class: 'app-muted seat-apply-how' }, T('demoHow')))
    return box
  }
  if (req?.status === 'rejected') {
    box.appendChild(h('div', { class: 'seat-apply-state bad' },
      h('span', { class: 'seat-dot', 'aria-hidden': 'true' }),
      h('div', null, h('strong', null, T('rejected')), h('small', null, `${T('rejectedSub')} ${when(lang, req.decidedAt)}`))))
  }
  const note = opts.withNote ? h('textarea', { class: 'seat-apply-note', maxlength: 280, rows: 2, placeholder: T('notePh'), 'aria-label': T('notePh') }) as HTMLTextAreaElement : null
  const btn = h('button', { type: 'button', class: 'app-btn primary small' }, req?.status === 'rejected' ? T('applyAgain') : T('apply')) as HTMLButtonElement
  btn.addEventListener('click', () => {
    btn.disabled = true
    status.className = 'seat-apply-status'
    status.textContent = T('sending')
    void requestPublisherMembership(issuer.address, note?.value).then(async (r) => {
      if (!r.ok && !r.request) {
        btn.disabled = false
        status.className = 'seat-apply-status bad'
        status.textContent = r.why ?? ''
        return
      }
      await seats(true)
      opts.onChange?.()
    })
  })
  if (note) box.appendChild(note)
  // B131: akun yang belum berperan memilih peran Penerbit dengan mengajukan — katakan sebelum ia menandatangani.
  if (!roles.account.dev && !roles.account.role) box.appendChild(h('p', { class: 'seat-apply-warn' }, T('choosesRole')))
  box.appendChild(h('div', { class: 'seat-apply-row' }, btn, status))
  box.appendChild(h('p', { class: 'app-muted seat-apply-how' }, opts.withNote ? T('how') : T('howShort')))
  return box
}
