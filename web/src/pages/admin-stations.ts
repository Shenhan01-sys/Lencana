/**
 * `admin-stations.ts` — station, label, dan isi popup untuk sabuk proses bisnis di tab Ringkasan halaman Admin (B172, 6 Okt malam).
 * Satu pendaftaran berjalan dari kursus sampai uang; tiap station memuat angka NYATA dari `AdminSummary` (data yang sama dengan dasbor Penerbit, tanpa baris uji).
 * Tidak ada angka karangan. Bendanya digambar di `admin-objects.ts`; popup-nya di `admin-detail.ts`.
 *
 * Urutan: Kursus → Pendaftaran → Kelas & esai → Penilaian agen → Pengesahan → Hasil → Penyelesaian.
 */
import type { AdminSummary } from '../learning'
import { formatLdc } from '../pricing'
import type { Detail } from './admin-detail'

type Lang = 'en' | 'id'

export const ORDER = ['course', 'enroll', 'essay', 'agent', 'review', 'result', 'settle'] as const
export type StationId = typeof ORDER[number]
export type Station = { id: StationId, title: string, big: string, sub: string, hot?: string }

type Copy = { en: string, id: string }
const COPY = {
  hint: { en: 'Click for details', id: 'Klik untuk detail' },
  more: { en: 'details', id: 'detail' },
  close: { en: 'Close', id: 'Tutup' },
  prev: { en: 'Previous', id: 'Sebelumnya' },
  next: { en: 'Next', id: 'Berikutnya' },
  actors: { en: 'Who acts', id: 'Siapa yang bertindak' },
  source: { en: 'Where the numbers come from', id: 'Asal angkanya' },
  openApprove: { en: 'Open Approvals', id: 'Buka Persetujuan' },
} satisfies Record<string, Copy>

const T = {
  course: { title: { en: 'Courses', id: 'Kursus' },
    what: { en: 'The publisher writes and publishes courses; publisher members work with the rights a Lencana admin approved. Everything starts here: a course exists before anyone can enroll. One book on the shelf = one course (gold = listed in the catalog, grey = not yet).', id: 'Penerbit menyusun dan menerbitkan kursus; anggota penerbit bekerja dengan wewenang yang disetujui admin Lencana. Semua bermula di sini: kursus harus ada sebelum ada yang mendaftar. Satu buku di rak = satu kursus (emas = terdaftar di katalog, abu = belum).' },
    actors: { en: ['Publisher', 'Publisher members', 'Lencana admin (approves members)'], id: ['Penerbit', 'Anggota penerbit', 'Admin Lencana (menyetujui anggota)'] },
    source: { en: 'Course manifests and the publisher membership tables.', id: 'Manifest kursus dan tabel keanggotaan penerbit.' } },
  enroll: { title: { en: 'Enrollment', id: 'Pendaftaran' },
    what: { en: 'A learner enrolls in a class. Paid courses require an x402 payment in the test token before the class opens; free courses open at once. Grey stack = free tickets, green stack = paid tickets (one ticket = one enrollment).', id: 'Peserta mendaftar ke sebuah kelas. Kursus berbayar menuntut pembayaran x402 dengan token uji sebelum kelas terbuka; kursus gratis langsung terbuka. Tumpukan abu = tiket gratis, tumpukan hijau = tiket berbayar (satu tiket = satu pendaftaran).' },
    actors: { en: ['Learner (embedded wallet)', 'Platform (enforces the paywall)'], id: ['Peserta (dompet tertanam)', 'Platform (menegakkan paywall)'] },
    source: { en: 'Enrollments and paid orders in the database — same numbers as the Publisher dashboard, test rows excluded.', id: 'Tabel pendaftaran dan order lunas di database — angka yang sama dengan dasbor Penerbit, tanpa baris uji.' } },
  essay: { title: { en: 'Class & essays', id: 'Kelas & esai' },
    what: { en: 'Learners finish lessons; quizzes are graded by the server and essays are submitted. An essay that does not give enough to grade is sent back to the learner. One sheet in the pile = one essay.', id: 'Peserta menyelesaikan pelajaran; kuis dinilai server dan esai diserahkan. Esai yang belum cukup untuk dinilai dikembalikan kepada peserta. Satu kertas di tumpukan = satu esai.' },
    actors: { en: ['Learner'], id: ['Peserta'] },
    source: { en: 'Submitted essays and their status (no essay text is shown here).', id: 'Esai yang diserahkan dan statusnya (teks esai tidak ditampilkan di sini).' } },
  agent: { title: { en: 'Agent grading', id: 'Penilaian agen' },
    what: { en: 'An ERC-8004 agent hired by the publisher proposes rubric scores for each essay; its owner signs the proposal. Every activity is billed to the publisher. The small robots are the agents the platform knows (gold = currently hired); the bars on the board show the share of each essay status.', id: 'Agen ERC-8004 yang disewa penerbit mengusulkan nilai rubrik untuk tiap esai; pemilik agen menandatangani usulannya. Tiap aktivitas ditagih ke penerbit. Robot kecil = agen yang dikenal platform (emas = sedang disewa); batang di papan = proporsi status esai.' },
    actors: { en: ['Agent', 'Agent owner (signs)', 'Publisher (hires)'], id: ['Agen', 'Pemilik agen (menandatangani)', 'Penerbit (menyewa)'] },
    source: { en: 'Agent hires and review roles in the database; ownership is read from the ERC-8004 registry on chain 97.', id: 'Sewa agen dan peran pengesah di database; kepemilikan dibaca dari registry ERC-8004 di chain 97.' } },
  review: { title: { en: 'Review', id: 'Pengesahan' },
    what: { en: 'A reviewer — a person or another agent — checks each proposal: approve, adjust the score, or reject. Only then does the score count. Rejected essays go back to the learner. One sheet = one proposal: green approved, orange adjusted, red rejected, dashed not yet decided.', id: 'Pengesah — orang atau agen lain — memeriksa tiap usulan: setujui, sesuaikan nilainya, atau tolak. Barulah nilainya dihitung. Esai yang ditolak kembali ke peserta. Satu kertas = satu usulan: hijau disahkan, jingga disesuaikan, merah ditolak, garis putus belum diputuskan.' },
    actors: { en: ['Reviewer (person or agent)', 'Agent owner (if the reviewer is an agent)'], id: ['Pengesah (orang atau agen)', 'Pemilik agen (bila pengesahnya agen)'] },
    source: { en: 'Review decisions and the review roles appointed per course.', id: 'Keputusan pengesahan dan peran pengesah yang ditunjuk per kursus.' } },
  result: { title: { en: 'Result', id: 'Hasil' },
    what: { en: 'The final score decides whether the learner passes the gate. The publisher then issues the credential — the admin never issues or revokes credentials. One green pin = one accepted essay.', id: 'Nilai akhir menentukan peserta lulus gerbang atau tidak. Penerbit lalu menerbitkan kredensial — admin tidak pernah menerbitkan atau mencabut kredensial. Satu peniti hijau = satu esai diterima.' },
    actors: { en: ['Publisher (issues the credential)'], id: ['Penerbit (menerbitkan kredensial)'] },
    source: { en: 'Final essay outcomes (approved, adjusted, graded directly) from the review tables.', id: 'Hasil akhir esai (disahkan, disesuaikan, dinilai langsung) dari tabel pengesahan.' } },
  settle: { title: { en: 'Settlement', id: 'Penyelesaian' },
    what: { en: 'Money from paid orders is split: the Lencana share is read from the split contract on chain, the rest goes to the publisher. Agent fees are counted per activity and billed to the publisher. The fill of each jar is its share (left gold = Lencana, right green = publisher net); the orange block is the agent fees due.', id: 'Uang dari order lunas dibagi: bagian Lencana dibaca dari kontrak pembagian di chain, sisanya untuk penerbit. Tagihan agen dihitung per aktivitas dan ditagih ke penerbit. Tinggi isi toples = bagiannya (kiri emas = Lencana, kanan hijau = bersih penerbit); blok jingga = tagihan agen jatuh tempo.' },
    actors: { en: ['Platform (split contract)', 'Publisher (pays agent fees)', 'Agent owners (receive fees)'], id: ['Platform (kontrak pembagian)', 'Penerbit (membayar tagihan agen)', 'Pemilik agen (menerima tagihan)'] },
    source: { en: 'Paid orders, the SettlementSplit contract (chain 97) and agent activity charges.', id: 'Order lunas, kontrak SettlementSplit (chain 97), dan tagihan aktivitas agen.' } },
} satisfies Record<StationId, { title: Copy, what: Copy, actors: { en: string[], id: string[] }, source: Copy }>

export type StationModel = {
  stations: Station[]
  detailOf: (id: string) => Detail | null
  labels: { close: string, prev: string, next: string }
  hint: string
  more: string
}

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
  const w = (en: string, idn: string) => (lang === 'id' ? idn : en)
  const t = (k: StationId) => T[k].title[lang]

  const stations: Station[] = [
    { id: 'course', title: t('course'), big: String(s.courses.total), sub: w(`${s.courses.listed} listed in the catalog`, `${s.courses.listed} terdaftar di katalog`),
      hot: s.members.pending > 0 ? w(`${s.members.pending} member request(s) waiting`, `${s.members.pending} izin anggota menunggu`) : undefined },
    { id: 'enroll', title: t('enroll'), big: String(s.learners.enrollments), sub: w(`${s.learners.unique} learners · ${s.learners.paid} paid · ${s.learners.free} free`, `${s.learners.unique} peserta · ${s.learners.paid} berbayar · ${s.learners.free} gratis`) },
    { id: 'essay', title: t('essay'), big: String(totalEssays), sub: w(`${n('awaitingJudge')} waiting for a grader`, `${n('awaitingJudge')} menunggu penilai`),
      hot: n('insufficient') > 0 ? w(`${n('insufficient')} not enough to grade`, `${n('insufficient')} kurang bukti`) : undefined },
    { id: 'agent', title: t('agent'), big: String(s.agents.hires), sub: w(`${s.agents.known} agents known · ${proposals} proposals`, `${s.agents.known} agen dikenal · ${proposals} usulan`) },
    { id: 'review', title: t('review'), big: String(decided), sub: w(`${s.agents.reviewers} reviewers · ${n('awaitingReview')} waiting`, `${s.agents.reviewers} pengesah · ${n('awaitingReview')} menunggu`),
      hot: n('awaitingReview') > 0 ? w(`${n('awaitingReview')} waiting for a stamp`, `${n('awaitingReview')} menunggu stempel`) : undefined },
    { id: 'result', title: t('result'), big: String(accepted), sub: w(`essays accepted · ${n('rejected')} rejected`, `esai diterima · ${n('rejected')} ditolak`) },
    { id: 'settle', title: t('settle'), big: num(s.money.gross), sub: s.money.platform === null ? sym : `${sym} · Lencana ${num(s.money.platform)}` },
  ]

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
      { label: w('Active hires', 'Sewa aktif'), value: String(s.agents.hires), tone: 'gold' },
      { label: w('Proposals made', 'Usulan diajukan'), value: String(proposals) },
      { label: w('Graded directly by the publisher', 'Dinilai langsung penerbit'), value: String(n('graded')) },
    ],
    review: [
      { label: w('Reviewers appointed', 'Pengesah ditunjuk'), value: String(s.agents.reviewers) },
      { label: w('Waiting for review', 'Menunggu pengesahan'), value: String(n('awaitingReview')), tone: n('awaitingReview') > 0 ? 'amber' : undefined },
      { label: w('Approved', 'Disahkan'), value: String(n('approved')), tone: 'green' },
      { label: w('Adjusted', 'Disesuaikan'), value: String(n('adjusted')), tone: 'amber' },
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
      { label: `${w('Lencana share', 'Bagian Lencana')}${s.money.platformBps === null ? '' : ` (${s.money.platformBps / 100}%)`}`, value: money(s.money.platform), tone: 'gold' },
      { label: w('Publisher net', 'Bersih penerbit'), value: money(s.money.net), tone: 'green' },
      { label: w('Agent fees due', 'Tagihan agen jatuh tempo'), value: `${s.money.chargesDue.count} · ${money(s.money.chargesDue.amount)}`, tone: s.money.chargesDue.count > 0 ? 'amber' : undefined },
      { label: w('Agent fees paid', 'Tagihan agen terbayar'), value: `${s.money.chargesPaid.count} · ${money(s.money.chargesPaid.amount)}` },
    ],
  }

  const detailOf = (sid: string): Detail | null => {
    if (!(ORDER as readonly string[]).includes(sid)) return null
    const k = sid as StationId
    return {
      id: k, title: t(k).toUpperCase(), what: T[k].what[lang], rows: rows[k],
      actors: T[k].actors[lang], actorsLabel: COPY.actors[lang], sourceLabel: COPY.source[lang], source: T[k].source[lang],
      action: k === 'course' ? { label: COPY.openApprove[lang], run: goApprove } : undefined,
    }
  }
  return { stations, detailOf, labels: { close: COPY.close[lang], prev: COPY.prev[lang], next: COPY.next[lang] }, hint: COPY.hint[lang], more: COPY.more[lang] }
}
