/**
 * `admin-stations.ts` — stasiun, jalur, dan isi popup untuk pipeline di tab Ringkasan halaman Admin (B172, 6 Okt malam).
 * Satu pendaftaran berjalan dari kursus sampai uang; tiap stasiun memuat angka NYATA dari `AdminSummary` (data yang sama dengan dasbor Penerbit,
 * tanpa baris uji). Tidak ada angka karangan: bila sebuah bagian tidak ada datanya, ia tidak digambar.
 *
 * Rantai (zig-zag seperti acuan n8n): Kursus → Pendaftaran → Kelas & esai → Penilaian agen → Pengesahan → Hasil → (cabang) Penyelesaian,
 * dengan loop jingga Pengesahan → Kelas & esai untuk esai yang ditolak atau kurang bukti.
 */
import type { AdminSummary } from '../learning'
import { formatLdc } from '../pricing'
import type { Station, Hop, Loop, Detail } from './admin-pipeline'

type Lang = 'en' | 'id'

/** Ikon garis 24 px (gaya Lucide, satu path per ikon). */
const IC = {
  book: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
  userPlus: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8',
  bot: 'M12 8V4H8M4 8h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2zM2 14h2M20 14h2M15 13v2M9 13v2',
  shield: 'M12 3l8 3v6c0 4.5-3.2 8.3-8 9-4.8-.7-8-4.5-8-9V6l8-3zm-3 9l2 2 4-4',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12zM8.21 13.89L7 23l5-3 5 3-1.21-9.12',
  coins: 'M21 12V7H5a2 2 0 0 1 0-4h14v4M3 5v14a2 2 0 0 0 2 2h16v-5M18 12a2 2 0 0 0 0 4h4v-4z',
} as const

export const ORDER = ['course', 'enroll', 'essay', 'agent', 'review', 'result', 'settle'] as const
export type StationId = typeof ORDER[number]

type Copy = { en: string, id: string }
const COPY = {
  hint: { en: 'Click for details', id: 'Klik untuk detail' },
  close: { en: 'Close', id: 'Tutup' },
  prev: { en: 'Previous', id: 'Sebelumnya' },
  next: { en: 'Next', id: 'Berikutnya' },
  actors: { en: 'Who acts', id: 'Siapa yang bertindak' },
  source: { en: 'Where the numbers come from', id: 'Asal angkanya' },
  openApprove: { en: 'Open Approvals', id: 'Buka Persetujuan' },
} satisfies Record<string, Copy>

const T = {
  course: { title: { en: 'COURSES', id: 'KURSUS' },
    what: { en: 'The publisher writes and publishes courses; publisher members work with the rights a Lencana admin approved. Everything starts here: a course exists before anyone can enroll.', id: 'Penerbit menyusun dan menerbitkan kursus; anggota penerbit bekerja dengan wewenang yang disetujui admin Lencana. Semua bermula di sini: kursus harus ada sebelum ada yang mendaftar.' },
    actors: { en: ['Publisher', 'Publisher members', 'Lencana admin (approves members)'], id: ['Penerbit', 'Anggota penerbit', 'Admin Lencana (menyetujui anggota)'] },
    source: { en: 'Course manifests and the publisher membership tables.', id: 'Manifest kursus dan tabel keanggotaan penerbit.' } },
  enroll: { title: { en: 'ENROLLMENT', id: 'PENDAFTARAN' },
    what: { en: 'A learner enrolls in a class. Paid courses require an x402 payment in the test token before the class opens; free courses open at once.', id: 'Peserta mendaftar ke sebuah kelas. Kursus berbayar menuntut pembayaran x402 dengan token uji sebelum kelas terbuka; kursus gratis langsung terbuka.' },
    actors: { en: ['Learner (embedded wallet)', 'Platform (enforces the paywall)'], id: ['Peserta (dompet tertanam)', 'Platform (menegakkan paywall)'] },
    source: { en: 'Enrollments and paid orders in the database — same numbers as the Publisher dashboard, test rows excluded.', id: 'Tabel pendaftaran dan order lunas di database — angka yang sama dengan dasbor Penerbit, tanpa baris uji.' } },
  essay: { title: { en: 'CLASS & ESSAYS', id: 'KELAS & ESAI' },
    what: { en: 'Learners finish lessons; quizzes are graded by the server and essays are submitted. An essay that does not give enough to grade is sent back to the learner.', id: 'Peserta menyelesaikan pelajaran; kuis dinilai server dan esai diserahkan. Esai yang belum cukup untuk dinilai dikembalikan kepada peserta.' },
    actors: { en: ['Learner'], id: ['Peserta'] },
    source: { en: 'Submitted essays and their status (no essay text is shown here).', id: 'Esai yang diserahkan dan statusnya (teks esai tidak ditampilkan di sini).' } },
  agent: { title: { en: 'AGENT GRADING', id: 'PENILAIAN AGEN' },
    what: { en: 'An ERC-8004 agent hired by the publisher proposes rubric scores for each essay; its owner signs the proposal. Every activity is billed to the publisher.', id: 'Agen ERC-8004 yang disewa penerbit mengusulkan nilai rubrik untuk tiap esai; pemilik agen menandatangani usulannya. Tiap aktivitas ditagih ke penerbit.' },
    actors: { en: ['Agent', 'Agent owner (signs)', 'Publisher (hires)'], id: ['Agen', 'Pemilik agen (menandatangani)', 'Penerbit (menyewa)'] },
    source: { en: 'Agent hires and review roles in the database; ownership is read from the ERC-8004 registry on chain 97.', id: 'Sewa agen dan peran pengesah di database; kepemilikan dibaca dari registry ERC-8004 di chain 97.' } },
  review: { title: { en: 'REVIEW', id: 'PENGESAHAN' },
    what: { en: 'A reviewer — a person or another agent — checks each proposal: approve, adjust the score, or reject. Only then does the score count. Rejected essays go back to the learner.', id: 'Pengesah — orang atau agen lain — memeriksa tiap usulan: setujui, sesuaikan nilainya, atau tolak. Barulah nilainya dihitung. Esai yang ditolak kembali ke peserta.' },
    actors: { en: ['Reviewer (person or agent)', 'Agent owner (if the reviewer is an agent)'], id: ['Pengesah (orang atau agen)', 'Pemilik agen (bila pengesahnya agen)'] },
    source: { en: 'Review decisions and the review roles appointed per course.', id: 'Keputusan pengesahan dan peran pengesah yang ditunjuk per kursus.' } },
  result: { title: { en: 'RESULT', id: 'HASIL' },
    what: { en: 'The final score decides whether the learner passes the gate. The publisher then issues the credential — the admin never issues or revokes credentials.', id: 'Nilai akhir menentukan peserta lulus gerbang atau tidak. Penerbit lalu menerbitkan kredensial — admin tidak pernah menerbitkan atau mencabut kredensial.' },
    actors: { en: ['Publisher (issues the credential)'], id: ['Penerbit (menerbitkan kredensial)'] },
    source: { en: 'Final essay outcomes (approved, adjusted, graded directly) from the review tables.', id: 'Hasil akhir esai (disahkan, disesuaikan, dinilai langsung) dari tabel pengesahan.' } },
  settle: { title: { en: 'SETTLEMENT', id: 'PENYELESAIAN' },
    what: { en: 'Money from paid orders is split: the Lencana share is read from the split contract on chain, the rest goes to the publisher. Agent fees are counted per activity and billed to the publisher.', id: 'Uang dari order lunas dibagi: bagian Lencana dibaca dari kontrak pembagian di chain, sisanya untuk penerbit. Tagihan agen dihitung per aktivitas dan ditagih ke penerbit.' },
    actors: { en: ['Platform (split contract)', 'Publisher (pays agent fees)', 'Agent owners (receive fees)'], id: ['Platform (kontrak pembagian)', 'Penerbit (membayar tagihan agen)', 'Pemilik agen (menerima tagihan)'] },
    source: { en: 'Paid orders, the SettlementSplit contract (chain 97) and agent activity charges.', id: 'Order lunas, kontrak SettlementSplit (chain 97), dan tagihan aktivitas agen.' } },
} satisfies Record<StationId, { title: Copy, what: Copy, actors: { en: string[], id: string[] }, source: Copy }>

const L = (c: Copy, lang: Lang) => c[lang]

export type StationModel = { stations: Station[], hops: Hop[], loop: Loop | null, detailOf: (id: string) => Detail | null, labels: { close: string, prev: string, next: string }, hint: string }

export function buildStations (lang: Lang, s: AdminSummary, goApprove: () => void): StationModel {
  const sym = s.money.token.symbol
  const num = (v: string | null) => (v === null ? '—' : formatLdc(BigInt(v)))
  const money = (v: string | null) => (v === null ? '—' : `${formatLdc(BigInt(v))} ${sym}`)
  const p = s.essays.pipeline
  const n = (k: string) => p[k] ?? 0
  const totalEssays = Object.values(p).reduce((a, b) => a + b, 0)
  const proposals = n('awaitingReview') + n('approved') + n('adjusted') + n('rejected')
  const decided = n('approved') + n('adjusted') + n('rejected')
  const accepted = n('approved') + n('adjusted') + n('graded')
  const retries = n('rejected') + n('insufficient')
  const id = lang === 'id'
  const w = (en: string, idn: string) => (id ? idn : en)

  const stations: Station[] = [
    { id: 'course', title: L(T.course.title, lang), sub: w(`${s.courses.total} courses · ${s.courses.listed} listed`, `${s.courses.total} kursus · ${s.courses.listed} terdaftar`), icon: IC.book, tone: 'gold', cx: 80, cy: 245, kind: 'trigger',
      chip: w(`${s.members.active} members · ${s.members.pending} waiting`, `${s.members.active} anggota · ${s.members.pending} menunggu`) },
    { id: 'enroll', title: L(T.enroll.title, lang), sub: w(`${s.learners.enrollments} enrollments · ${s.learners.unique} learners`, `${s.learners.enrollments} daftar · ${s.learners.unique} peserta`), icon: IC.userPlus, tone: 'steel', cx: 228, cy: 118,
      chip: w(`${s.learners.paid} paid · ${s.learners.free} free`, `${s.learners.paid} berbayar · ${s.learners.free} gratis`) },
    { id: 'essay', title: L(T.essay.title, lang), sub: w(`${totalEssays} essays submitted`, `${totalEssays} esai diserahkan`), icon: IC.file, tone: 'steel', cx: 376, cy: 330,
      chip: w(`${n('awaitingJudge')} waiting for a grader`, `${n('awaitingJudge')} menunggu penilai`) },
    { id: 'agent', title: L(T.agent.title, lang), sub: w(`${s.agents.hires} hires · ${s.agents.known} agents`, `${s.agents.hires} sewa · ${s.agents.known} agen`), icon: IC.bot, tone: 'gold', cx: 524, cy: 118,
      chip: w(`${proposals} proposals`, `${proposals} usulan`) },
    { id: 'review', title: L(T.review.title, lang), sub: w(`${s.agents.reviewers} reviewers`, `${s.agents.reviewers} pengesah`), icon: IC.shield, tone: 'steel', cx: 672, cy: 330,
      bar: { value: decided, max: decided + n('awaitingReview'), label: w(`${decided}/${decided + n('awaitingReview')} decided`, `${decided}/${decided + n('awaitingReview')} diputuskan`) } },
    { id: 'result', title: L(T.result.title, lang), sub: w(`${accepted} essays accepted`, `${accepted} esai diterima`), icon: IC.award, tone: 'green', cx: 820, cy: 118,
      chip: w(`${n('rejected')} rejected`, `${n('rejected')} ditolak`) },
    { id: 'settle', title: L(T.settle.title, lang), sub: money(s.money.gross), icon: IC.coins, tone: 'gold', cx: 944, cy: 300, kind: 'terminal',
      chip: s.money.platform === null ? undefined : w(`Lencana ${num(s.money.platform)}`, `Lencana ${num(s.money.platform)}`) },
  ]

  const hops: Hop[] = [
    { from: 'course', to: 'enroll', label: `{ ${s.courses.total} ${w('courses', 'kursus')} }`, tone: 'gold' },
    { from: 'enroll', to: 'essay', label: `[ ${s.learners.enrollments} ${w('enrolled', 'daftar')} ]`, tone: 'steel' },
    { from: 'essay', to: 'agent', label: `{ ${totalEssays} ${w('essays', 'esai')} }`, tone: 'steel' },
    { from: 'agent', to: 'review', label: `[ ${proposals} ${w('proposals', 'usulan')} ]`, tone: 'gold' },
    { from: 'review', to: 'result', label: `{ ${accepted} ${w('final', 'final')} }`, tone: 'green' },
    { from: 'result', to: 'settle', label: `${num(s.money.gross)} ${sym.split('-')[0]}`, tone: 'gold' },
  ]
  const loop: Loop = { from: 'review', to: 'essay', pill: w(`retry × ${retries}`, `ulang × ${retries}`), label: w(`${n('rejected')} rejected · ${n('insufficient')} not enough to grade → the learner tries again`, `${n('rejected')} ditolak · ${n('insufficient')} kurang bukti → peserta mengulang`) }

  const rows: Record<StationId, Detail['rows']> = {
    course: [
      { label: w('Courses (total)', 'Kursus (total)'), value: String(s.courses.total) },
      { label: w('Listed in the catalog', 'Terdaftar di katalog'), value: String(s.courses.listed) },
      { label: w('Active publisher members', 'Anggota penerbit aktif'), value: String(s.members.active), tone: 'green' },
      { label: w('Requests waiting for a decision', 'Pengajuan menunggu keputusan'), value: String(s.members.pending), tone: s.members.pending > 0 ? 'amber' : undefined },
    ],
    enroll: [
      { label: w('Enrollments', 'Pendaftaran'), value: String(s.learners.enrollments) },
      { label: w('Unique learners', 'Peserta unik'), value: String(s.learners.unique) },
      { label: w('Paid', 'Berbayar'), value: String(s.learners.paid), tone: 'green' },
      { label: w('Free', 'Gratis'), value: String(s.learners.free) },
      { label: w('Gross from paid orders', 'Kotor dari order lunas'), value: money(s.money.gross), tone: 'amber' },
    ],
    essay: [
      { label: w('Essays submitted', 'Esai diserahkan'), value: String(totalEssays) },
      { label: w('Waiting for a grader', 'Menunggu penilai'), value: String(n('awaitingJudge')) },
      { label: w('Not enough to grade', 'Kurang bukti'), value: String(n('insufficient')), tone: n('insufficient') > 0 ? 'amber' : undefined },
    ],
    agent: [
      { label: w('Known agents', 'Agen dikenal'), value: String(s.agents.known) },
      { label: w('Active hires', 'Sewa aktif'), value: String(s.agents.hires) },
      { label: w('Proposals made', 'Usulan diajukan'), value: String(proposals) },
      { label: w('Graded directly by the publisher', 'Dinilai langsung penerbit'), value: String(n('graded')) },
    ],
    review: [
      { label: w('Reviewers appointed', 'Pengesah ditunjuk'), value: String(s.agents.reviewers) },
      { label: w('Waiting for review', 'Menunggu pengesahan'), value: String(n('awaitingReview')), tone: n('awaitingReview') > 0 ? 'amber' : undefined },
      { label: w('Approved', 'Disahkan'), value: String(n('approved')), tone: 'green' },
      { label: w('Adjusted', 'Disesuaikan'), value: String(n('adjusted')) },
      { label: w('Rejected', 'Ditolak'), value: String(n('rejected')), tone: n('rejected') > 0 ? 'rose' : undefined },
    ],
    result: [
      { label: w('Essays accepted', 'Esai diterima'), value: String(accepted), tone: 'green' },
      { label: w('· approved', '· disahkan'), value: String(n('approved')) },
      { label: w('· adjusted', '· disesuaikan'), value: String(n('adjusted')) },
      { label: w('· graded directly', '· dinilai langsung'), value: String(n('graded')) },
      { label: w('Rejected', 'Ditolak'), value: String(n('rejected')) },
      { label: w('Not enough to grade', 'Kurang bukti'), value: String(n('insufficient')) },
    ],
    settle: [
      { label: w('Gross', 'Kotor'), value: money(s.money.gross) },
      { label: `${w('Lencana share', 'Bagian Lencana')}${s.money.platformBps === null ? '' : ` (${s.money.platformBps / 100}%)`}`, value: money(s.money.platform), tone: 'amber' },
      { label: w('Publisher net', 'Bersih penerbit'), value: money(s.money.net), tone: 'green' },
      { label: w('Agent fees due', 'Tagihan agen jatuh tempo'), value: `${s.money.chargesDue.count} · ${money(s.money.chargesDue.amount)}`, tone: s.money.chargesDue.count > 0 ? 'amber' : undefined },
      { label: w('Agent fees paid', 'Tagihan agen terbayar'), value: `${s.money.chargesPaid.count} · ${money(s.money.chargesPaid.amount)}` },
    ],
  }
  const tone: Record<StationId, Detail['tone']> = { course: 'gold', enroll: 'steel', essay: 'steel', agent: 'gold', review: 'steel', result: 'green', settle: 'gold' }
  const icon: Record<StationId, string> = { course: IC.book, enroll: IC.userPlus, essay: IC.file, agent: IC.bot, review: IC.shield, result: IC.award, settle: IC.coins }

  const detailOf = (sid: string): Detail | null => {
    if (!(ORDER as readonly string[]).includes(sid)) return null
    const k = sid as StationId
    const extra = k === 'review' && retries > 0 ? ` ${w(`${retries} essays went back to the learner (rejected or not enough to grade).`, `${retries} esai kembali ke peserta (ditolak atau kurang bukti).`)}` : ''
    return {
      id: k, title: L(T[k].title, lang), tone: tone[k], icon: icon[k], what: `${L(T[k].what, lang)}${extra}`, rows: rows[k],
      actors: T[k].actors[lang], actorsLabel: L(COPY.actors, lang), sourceLabel: L(COPY.source, lang), source: L(T[k].source, lang),
      action: k === 'course' ? { label: L(COPY.openApprove, lang), run: goApprove } : undefined,
    }
  }
  return { stations, hops, loop, detailOf, labels: { close: L(COPY.close, lang), prev: L(COPY.prev, lang), next: L(COPY.next, lang) }, hint: L(COPY.hint, lang) }
}
