// Lencana-B129 status=SELESAI 2026-10-06 — halaman Admin Lencana (`#/app/admin`): persetujuan keanggotaan penerbit oleh admin sementara (alamat di ADMIN_ADDRESSES di server): daftar pengajuan menunggu dengan Setujui (pilih wewenang) dan Tolak, daftar anggota dengan Cabut; semuanya pesan `lencana-admin …` bertanda tangan akun admin. Buktikan ulang: cd signer && npm run verify:publisher (grup G) dan uji peramban T95.
/**
 * `admin.ts` — halaman Admin Lencana `#/app/admin` (keputusan builder 6 Okt malam: "yang acc publisher itu admin Lencana, pakai akun saya sebagai
 * admin sementara"). Sebelumnya hanya kunci penerbit (kunci tim di server) yang bisa menyetujui pengajuan anggota penerbit, tanpa tombol di halaman.
 *
 * Siapa admin: alamat di `ADMIN_ADDRESSES` di server (bukan email — email tidak disimpan). Akun lain mendapat "bukan admin" (403 dari server,
 * sebelum tanda tangannya dipakai). Admin tidak menerbitkan atau mencabut kredensial; ia hanya memutuskan keanggotaan.
 */
import './owner-solid.css'
import './admin.css'
import { h } from '../lib/ui'
import { adminDecide, learnerAddress, readAdminOverview, type AdminOverview, type MemberPerms } from '../learning'
import { skeleton } from '../lib/loading'
import { navIcon } from './seats'

type Lang = 'en' | 'id'

const COPY = {
  nav: { en: 'Lencana admin', id: 'Admin Lencana' },
  kicker: { en: 'LENCANA ADMIN · TEMPORARY', id: 'ADMIN LENCANA · SEMENTARA' },
  title: { en: 'Publisher approvals', id: 'Persetujuan penerbit' },
  sub: { en: 'Decide membership requests for the publisher. A request gives no rights by itself; approving gives only the rights you tick. Issuing and revoking credentials stays with the publisher key.', id: 'Putuskan pengajuan anggota penerbit. Mengajukan saja tidak memberi wewenang; menyetujui hanya memberi wewenang yang kamu centang. Menerbitkan dan mencabut kredensial tetap pada kunci penerbit.' },
  account: { en: 'Account', id: 'Akun' },
  loading: { en: 'Reading requests…', id: 'Membaca pengajuan…' },
  failed: { en: 'The admin data could not be read:', id: 'Data admin tidak terbaca:' },
  retry: { en: 'Try again', id: 'Coba lagi' },
  reload: { en: 'Reload', id: 'Muat ulang' },
  notAdminTitle: { en: 'This account is not a Lencana admin', id: 'Akun ini bukan admin Lencana' },
  notAdminBody: { en: 'Admins are set on the server by wallet address. Ask the team to add this account’s address if it should decide publisher requests.', id: 'Admin ditetapkan di server berdasarkan alamat dompet. Minta tim menambahkan alamat akun ini bila ia perlu memutuskan pengajuan penerbit.' },
  yourAddress: { en: 'This account’s address', id: 'Alamat akun ini' },
  back: { en: 'Back to dashboard', id: 'Kembali ke dasbor' },
  publisher: { en: 'Publisher', id: 'Penerbit' },
  reqTitle: { en: 'Requests waiting', id: 'Pengajuan menunggu' },
  reqNone: { en: 'No requests waiting.', id: 'Tidak ada pengajuan yang menunggu.' },
  from: { en: 'requested', id: 'diajukan' },
  approve: { en: 'Approve', id: 'Setujui' },
  reject: { en: 'Reject', id: 'Tolak' },
  revoke: { en: 'Revoke', id: 'Cabut' },
  membersTitle: { en: 'Publisher members', id: 'Anggota penerbit' },
  membersNone: { en: 'No active members.', id: 'Belum ada anggota aktif.' },
  since: { en: 'since', id: 'sejak' },
  canHire: { en: 'hire grading agents', id: 'sewa agen penilai' },
  canAppoint: { en: 'appoint review agents', id: 'tunjuk agen pengesah' },
  canAuthor: { en: 'author courses', id: 'susun kursus' },
  canPublish: { en: 'decide drafts and archive courses', id: 'memutuskan draf dan mengarsipkan kursus' },
  approveTitle: { en: 'Approve membership', id: 'Setujui keanggotaan' },
  approveBody: { en: 'Choose what this member may do. You sign the decision with your account; issuing and revoking credentials is never delegated.', id: 'Pilih apa yang boleh dilakukan anggota ini. Kamu menandatangani keputusannya dengan akunmu; menerbitkan dan mencabut kredensial tidak pernah didelegasikan.' },
  signApprove: { en: 'Sign and approve', id: 'Tandatangani & setujui' },
  cancel: { en: 'Cancel', id: 'Batal' },
  signing: { en: 'Waiting for your signature…', id: 'Menunggu tanda tanganmu…' },
  doneGrant: { en: 'Approved — the account is now a member.', id: 'Disetujui — akun itu kini anggota.' },
  doneReject: { en: 'Rejected — the account may apply again.', id: 'Ditolak — akun itu boleh mengajukan lagi.' },
  doneRevoke: { en: 'Revoked — the account is no longer a member.', id: 'Dicabut — akun itu bukan anggota lagi.' },
  note: { en: 'You are acting as a temporary admin. The admin address list lives on the server (ADMIN_ADDRESSES), not in this page.', id: 'Kamu bertindak sebagai admin sementara. Daftar alamat admin ada di server (ADMIN_ADDRESSES), bukan di halaman ini.' },
} satisfies Record<string, Record<Lang, string>>

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

export function renderAdminApp (lang: Lang, routeHash = '#/app/admin'): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const onAccount = /^#\/?app\/admin\/account/.test(routeHash)
  const main = h('main', { class: 'dash-main adm-main' })
  const link = (href: string, label: string, active: boolean, path: string) => h('a', { href, class: active ? 'active' : '', ...(active ? { 'aria-current': 'page' } : {}) },
    navIcon(path), h('span', { class: 'nav-full' }, label), h('span', { class: 'nav-short', 'aria-hidden': 'true' }, label))
  const shell = h('div', { class: 'app-shell ow-shell adm-shell' },
    h('nav', { class: 'app-side', 'aria-label': T('nav') },
      link('#/app/admin', T('nav'), !onAccount, 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4'),
      link('#/app/admin/account', T('account'), onAccount, 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0')),
    main)
  if (onAccount) {
    void import('./dashboard').then((m) => { main.appendChild(m.renderAccount(lang, learnerAddress())) })
    return shell
  }
  const head = h('header', { class: 'app-head' }, h('span', { class: 'app-kicker' }, T('kicker')), h('h1', null, T('title')), h('p', { class: 'app-muted' }, T('sub')))
  const body = h('div', { class: 'app-body' })
  main.append(head, body)

  const load = () => {
    body.replaceChildren(h('div', { class: 'app-loading' }, skeleton('cards', T('loading'))))
    void readAdminOverview().then((r) => {
      if (!body.isConnected) return
      if (r.status === 403) {
        body.replaceChildren(h('section', { class: 'app-card adm-card adm-denied' },
          h('h2', null, T('notAdminTitle')), h('p', { class: 'app-muted' }, T('notAdminBody')),
          h('p', null, `${T('yourAddress')}: `, h('code', null, learnerAddress() ?? '—')),
          h('a', { class: 'app-btn small', href: '#/app' }, T('back'))))
        return
      }
      if (!r.ok || !r.data) {
        body.replaceChildren(h('div', { class: 'app-card app-error' }, h('p', null, `${T('failed')} ${r.why ?? ''}`), h('button', { type: 'button', class: 'app-btn', onClick: load }, T('retry'))))
        return
      }
      body.replaceChildren(renderOverview(lang, r.data, load))
    })
  }
  load()
  return shell
}

function renderOverview (lang: Lang, o: AdminOverview, reload: () => void): HTMLElement {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', { dateStyle: 'medium' }) : '—')
  const wrap = h('div', { class: 'app-stack adm' })

  wrap.appendChild(h('div', { class: 'adm-bar' },
    h('span', null, `${T('publisher')}: `, h('b', null, o.publisherName ?? short(o.issuer)), ' ', h('code', { title: o.issuer }, short(o.issuer))),
    h('button', { type: 'button', class: 'app-btn small', onClick: reload }, T('reload'))))

  // ---- pengajuan menunggu
  const reqs = h('section', { class: 'app-card adm-card' },
    h('h2', null, `${T('reqTitle')} `, h('span', { class: `adm-count${o.requests.length ? ' hot' : ''}` }, String(o.requests.length))))
  if (!o.requests.length) reqs.appendChild(h('p', { class: 'app-muted' }, T('reqNone')))
  else {
    reqs.appendChild(h('ul', { class: 'adm-list' }, ...o.requests.map((r) => {
      const status = h('span', { class: 'seat-apply-status', role: 'status' })
      const approve = h('button', { type: 'button', class: 'app-btn small primary', 'data-approve': '' }, T('approve')) as HTMLButtonElement
      const reject = h('button', { type: 'button', class: 'app-btn small', 'data-reject': '' }, T('reject')) as HTMLButtonElement
      approve.addEventListener('click', () => openApprove(lang, r.address, (msg) => { status.className = 'seat-apply-status ok'; status.textContent = msg; setTimeout(reload, 900) }))
      reject.addEventListener('click', () => {
        approve.disabled = true; reject.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('signing')
        void adminDecide('reject', r.address).then((out) => {
          if (!out.ok) { approve.disabled = false; reject.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = out.why ?? ''; return }
          status.className = 'seat-apply-status ok'; status.textContent = T('doneReject')
          setTimeout(reload, 900)
        })
      })
      return h('li', { class: 'adm-row' },
        h('div', { class: 'adm-who' }, h('code', { title: r.address }, r.address), h('small', null, `${T('from')} ${when(r.at)}`)),
        r.note ? h('p', { class: 'adm-note' }, r.note) : null,
        h('div', { class: 'adm-act' }, approve, reject, status))
    })))
  }
  wrap.appendChild(reqs)

  // ---- anggota
  const members = h('section', { class: 'app-card adm-card' }, h('h2', null, `${T('membersTitle')} `, h('span', { class: 'adm-count' }, String(o.members.length))))
  if (!o.members.length) members.appendChild(h('p', { class: 'app-muted' }, T('membersNone')))
  else {
    members.appendChild(h('ul', { class: 'adm-list' }, ...o.members.map((m) => {
      const status = h('span', { class: 'seat-apply-status', role: 'status' })
      const revoke = h('button', { type: 'button', class: 'app-btn small', 'data-revoke': '' }, T('revoke')) as HTMLButtonElement
      revoke.addEventListener('click', () => {
        revoke.disabled = true
        status.className = 'seat-apply-status'; status.textContent = T('signing')
        void adminDecide('revoke', m.member).then((out) => {
          if (!out.ok) { revoke.disabled = false; status.className = 'seat-apply-status bad'; status.textContent = out.why ?? ''; return }
          status.className = 'seat-apply-status ok'; status.textContent = T('doneRevoke')
          setTimeout(reload, 900)
        })
      })
      const chip = (on: boolean, label: string) => h('span', { class: `adm-perm ${on ? 'on' : 'off'}` }, label)
      return h('li', { class: 'adm-row' },
        h('div', { class: 'adm-who' }, h('code', { title: m.member }, m.member), h('small', null, `${T('since')} ${when(m.since)}`)),
        h('div', { class: 'adm-perms' }, chip(m.canHire, T('canHire')), chip(m.canAppoint, T('canAppoint')), chip(m.canAuthor, T('canAuthor')), chip(m.canPublish, T('canPublish'))),
        h('div', { class: 'adm-act' }, revoke, status))
    })))
  }
  wrap.appendChild(members)
  wrap.appendChild(h('p', { class: 'app-muted adm-foot' }, T('note')))
  return wrap
}

/** Dialog "Setujui keanggotaan": memilih wewenang lalu menandatangani keputusan dengan akun admin. */
function openApprove (lang: Lang, applicant: string, done: (msg: string) => void): void {
  const T = (k: keyof typeof COPY) => COPY[k][lang]
  const box = (key: keyof MemberPerms, label: string, on: boolean) => {
    const c = h('input', { type: 'checkbox', checked: on, 'data-perm': key }) as HTMLInputElement
    return { c, el: h('label', { class: 'adm-permbox' }, c, h('span', null, label)) }
  }
  const hire = box('hire', T('canHire'), true)
  const appoint = box('appoint', T('canAppoint'), true)
  const author = box('author', T('canAuthor'), false)
  const publish = box('publish', T('canPublish'), false)
  const status = h('p', { class: 'adm-dlg-status', role: 'status' })
  const go = h('button', { type: 'button', class: 'adm-btn pri', 'data-sign': '' }, T('signApprove')) as HTMLButtonElement
  const cancel = h('button', { type: 'button', class: 'adm-btn' }, T('cancel')) as HTMLButtonElement
  const dlg = h('dialog', { class: 'adm-dlg', 'aria-labelledby': 'adm-dlg-t' },
    h('div', { class: 'adm-dlg-f' },
      h('h2', { id: 'adm-dlg-t' }, T('approveTitle')),
      h('p', { class: 'adm-dlg-who' }, h('code', null, applicant)),
      h('p', { class: 'adm-dlg-n' }, T('approveBody')),
      h('div', { class: 'adm-perms-box' }, hire.el, appoint.el, author.el, publish.el),
      status,
      h('div', { class: 'adm-dlg-act' }, cancel, go))) as HTMLDialogElement
  const close = () => { dlg.close(); dlg.remove() }
  cancel.addEventListener('click', close)
  dlg.addEventListener('close', () => dlg.remove())
  go.addEventListener('click', () => {
    go.disabled = true; cancel.disabled = true
    status.className = 'adm-dlg-status'; status.textContent = T('signing')
    void adminDecide('grant', applicant, { hire: hire.c.checked, appoint: appoint.c.checked, author: author.c.checked, publish: publish.c.checked }).then((out) => {
      if (!out.ok) { go.disabled = false; cancel.disabled = false; status.className = 'adm-dlg-status bad'; status.textContent = out.why ?? ''; return }
      close()
      done(T('doneGrant'))
    })
  })
  document.body.appendChild(dlg)
  if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '')
}
