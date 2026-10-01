/**
 * `flow3d-data.ts` — isi scene alur bisnis 3D di landing (FE8): tiga peran, stasiun per peran, dan satu
 * kalimat per stasiun. Bebas-DOM dan bebas-three supaya bisa diaudit dari Node.
 *
 * Setiap kalimat harus benar menurut kode hari ini (sumber: `vault/00-Overview/13 - Proses Bisnis
 * End-to-End (dibaca dari kode)`). Kalau perilakunya berubah, kalimatnya ikut berubah — scene ini menjual
 * cara kerja, jadi ia tidak boleh lebih bagus dari kenyataannya.
 */

export type Lang = 'en' | 'id'
export type RoleId = 'learner' | 'publisher' | 'owner'

/** Bentuk benda di tiap stasiun — dibangun prosedural oleh `flow3d-scene.ts`. */
export type Kit =
  | 'terminal' | 'pages' | 'press' | 'tray' | 'probe' | 'mint' | 'lens'
  | 'blueprint' | 'pillar' | 'dock' | 'stamp' | 'gates' | 'revoke' | 'splitter'
  | 'badge' | 'ladder' | 'handshake' | 'arm' | 'wallet' | 'lock'

export type Station = {
  id: string
  kit: Kit
  title: Record<Lang, string>
  line: Record<Lang, string>
}

export type Role = {
  id: RoleId
  name: Record<Lang, string>
  /** Tulisan di pelat nama mesin. */
  plate: Record<Lang, string>
  stations: Station[]
}

export const FLOW_COPY = {
  eyebrow: { en: 'HOW LENCANA WORKS', id: 'CARA LENCANA BEKERJA' },
  title: { en: 'One flow, three seats.', id: 'Satu alur, tiga kursi.' },
  desc: {
    en: 'Pick a seat. The object on the rail is the work itself — watch what each station does to it.',
    id: 'Pilih kursinya. Benda di rel adalah pekerjaan itu sendiri — lihat apa yang dilakukan tiap stasiun padanya.',
  },
  hint: { en: 'Drag to rotate · tap a station', id: 'Seret untuk memutar · ketuk stasiun' },
  hintTouch: { en: 'Tap a station or its number', id: 'Ketuk stasiun atau nomornya' },
  seats: { en: 'Choose a seat', id: 'Pilih kursi' },
  loading: { en: 'Assembling the machine…', id: 'Merakit mesin…' },
  noWebgl: {
    en: 'This browser cannot draw the 3D machine (WebGL is off), so here is the same flow as a list.',
    id: 'Peramban ini tidak bisa menggambar mesin 3D (WebGL mati), jadi ini alur yang sama dalam bentuk daftar.',
  },
  prev: { en: 'Previous station', id: 'Stasiun sebelumnya' },
  next: { en: 'Next station', id: 'Stasiun berikutnya' },
  play: { en: 'Play the flow', id: 'Jalankan alur' },
  pause: { en: 'Pause the flow', id: 'Jeda alur' },
} satisfies Record<string, Record<Lang, string>>

export const ROLES: Role[] = [
  {
    id: 'learner',
    name: { en: 'Learner', id: 'Peserta' },
    plate: { en: 'LEARNER · FROM LESSON TO PROOF', id: 'PESERTA · DARI LESSON KE BUKTI' },
    stations: [
      {
        id: 'sign-in', kit: 'terminal',
        title: { en: 'Sign in', id: 'Masuk' },
        line: {
          en: 'Sign in with your account; a learning wallet is created for you, no seed phrase. Every record you send is signed by it.',
          id: 'Masuk dengan akunmu; dompet belajar dibuat untukmu, tanpa seed phrase. Setiap rekaman yang kamu kirim ditandatanganinya.',
        },
      },
      {
        id: 'learn', kit: 'pages',
        title: { en: 'Learn', id: 'Belajar' },
        line: {
          en: 'Lessons move locked → unlocked → started → completed. Skipping a step is refused.',
          id: 'Lesson bergerak terkunci → dibuka → mulai → selesai. Melompati langkah ditolak.',
        },
      },
      {
        id: 'quiz', kit: 'press',
        title: { en: 'Quiz', id: 'Kuis' },
        line: {
          en: 'Your choices go to the publisher server, never a score. The answer keys never reach the browser.',
          id: 'Yang dikirim pilihanmu, bukan angka. Kunci jawabannya tidak pernah sampai ke peramban.',
        },
      },
      {
        id: 'essay', kit: 'tray',
        title: { en: 'Essay', id: 'Esai' },
        line: {
          en: 'The text joins a queue without a score. An AI agent proposes one; it counts only after a second key approves.',
          id: 'Teks masuk antrean tanpa angka. Agen AI mengusulkan nilai; nilai itu berlaku sesudah kunci kedua mengesahkan.',
        },
      },
      {
        id: 'practice', kit: 'probe',
        title: { en: 'Practice', id: 'Praktik' },
        line: {
          en: 'What you did on chain is read back from chain 97 — a transfer, a balance, a contract call. The page form is still being built.',
          id: 'Yang kamu kerjakan dibaca ulang dari chain 97 — transfer, saldo, panggilan kontrak. Formulirnya di halaman masih dikerjakan.',
        },
      },
      {
        id: 'issue', kit: 'mint',
        title: { en: 'Issued', id: 'Terbit' },
        line: {
          en: 'The publisher issues it: a BAS attestation plus a soulbound token (ERC-5192) that cannot be transferred.',
          id: 'Penerbit menerbitkannya: attestation BAS dan token soulbound (ERC-5192) yang tidak bisa dipindahtangankan.',
        },
      },
      {
        id: 'verify', kit: 'lens',
        title: { en: 'Checked', id: 'Diperiksa' },
        line: {
          en: 'Anyone reads its status straight from chain — no account, no wallet, no trust in Lencana.',
          id: 'Siapa pun membaca statusnya langsung dari chain — tanpa akun, tanpa dompet, tanpa percaya Lencana.',
        },
      },
    ],
  },
  {
    id: 'publisher',
    name: { en: 'Publisher', id: 'Penerbit' },
    plate: { en: 'PUBLISHER · RULES, AGENTS, CREDENTIALS', id: 'PENERBIT · ATURAN, AGEN, KREDENSIAL' },
    stations: [
      {
        id: 'compose', kit: 'blueprint',
        title: { en: 'Compose', id: 'Susun kursus' },
        line: {
          en: 'Quizzes and their keys, the essay rubric, weights and pass mark are hashed into a rubricHash — the grading rules cannot change quietly.',
          id: 'Kuis beserta kuncinya, rubrik esai, bobot, dan ambang lulus di-hash jadi rubricHash — aturan penilaiannya tidak bisa diganti diam-diam.',
        },
      },
      {
        id: 'listed', kit: 'pillar',
        title: { en: 'Listed', id: 'Diakui' },
        line: {
          en: 'The platform adds the publisher to the on-chain issuer list. Without it, every issuance is refused.',
          id: 'Platform memasukkan penerbit ke daftar penerbit di chain. Tanpa itu, setiap penerbitan ditolak.',
        },
      },
      {
        id: 'hire', kit: 'dock',
        title: { en: 'Hire an agent', id: 'Sewa agen' },
        line: {
          en: 'A grading agent with an ERC-8004 identity is hired per activity and paid over x402.',
          id: 'Agen penilai beridentitas ERC-8004 disewa per aktivitas dan dibayar lewat x402.',
        },
      },
      {
        id: 'approve', kit: 'stamp',
        title: { en: 'Approve', id: 'Sahkan' },
        line: {
          en: 'An agent proposal counts only after a reviewer the publisher appointed approves or adjusts it.',
          id: 'Usulan agen baru berlaku sesudah reviewer yang ditunjuk penerbit mengesahkan atau mengubahnya.',
        },
      },
      {
        id: 'issue', kit: 'gates',
        title: { en: 'Issue', id: 'Terbitkan' },
        line: {
          en: 'From the records only: all lessons done, the pass mark met, evidence complete — then gas moves.',
          id: 'Hanya dari rekaman: semua lesson selesai, ambang terpenuhi, bukti lengkap — baru gas bergerak.',
        },
      },
      {
        id: 'revoke', kit: 'revoke',
        title: { en: 'Revoke', id: 'Cabut' },
        line: {
          en: 'Only the publisher can revoke what it issued. Lencana cannot, and the verifier shows it at once.',
          id: 'Hanya penerbit yang bisa mencabut terbitannya. Lencana tidak bisa, dan verifier langsung menampilkannya.',
        },
      },
      {
        id: 'revenue', kit: 'splitter',
        title: { en: 'Revenue', id: 'Pendapatan' },
        line: {
          en: 'Paid bulk verification (x402) is split on chain between the publisher and the platform.',
          id: 'Verifikasi massal berbayar (x402) dibagi di chain antara penerbit dan platform.',
        },
      },
    ],
  },
  {
    id: 'owner',
    name: { en: 'Agent Owner', id: 'Agent Owner' },
    plate: { en: 'AGENT OWNER · AN AGENT FOR HIRE', id: 'AGENT OWNER · AGEN UNTUK DISEWA' },
    stations: [
      {
        id: 'register', kit: 'badge',
        title: { en: 'Register', id: 'Daftarkan' },
        line: {
          en: 'The agent gets an ERC-8004 identity in the BNB registry; the owner holds that identity.',
          id: 'Agen mendapat identitas ERC-8004 di registry BNB; pemiliknya memegang identitas itu.',
        },
      },
      {
        id: 'tariff', kit: 'ladder',
        title: { en: 'Set a tariff', id: 'Tetapkan tarif' },
        line: {
          en: 'A base tariff in the registry metadata; each step up the seven difficulty labels adds 5%.',
          id: 'Tarif dasar di metadata registry; tiap naik satu dari tujuh label tingkat berat menambah 5%.',
        },
      },
      {
        id: 'hired', kit: 'handshake',
        title: { en: 'Hired', id: 'Disewa' },
        line: {
          en: 'A publisher hires the agent for one activity — not a subscription.',
          id: 'Penerbit menyewa agen untuk satu aktivitas — bukan langganan.',
        },
      },
      {
        id: 'grade', kit: 'arm',
        title: { en: 'Grade', id: 'Menilai' },
        line: {
          en: 'The agent picks the difficulty label in the message it signs. A reviewer agent must be a different agent and owner.',
          id: 'Agen memilih label kesulitan di pesan yang ia tandatangani. Agen reviewer harus agen dan pemilik lain.',
        },
      },
      {
        id: 'paid', kit: 'wallet',
        title: { en: 'Paid', id: 'Dibayar' },
        line: {
          en: 'The charge settles over x402 into the agent wallet, minus the platform share.',
          id: 'Tagihan dilunasi lewat x402 ke dompet agen, dikurangi bagian platform.',
        },
      },
      {
        id: 'limit', kit: 'lock',
        title: { en: 'The limit', id: 'Batasnya' },
        line: {
          en: 'An agent never signs or revokes a credential — that key stays with the publisher.',
          id: 'Agen tidak pernah menandatangani atau mencabut kredensial — kunci itu tetap di penerbit.',
        },
      },
    ],
  },
]

export function findRole (id: RoleId): Role {
  return ROLES.find((r) => r.id === id) ?? ROLES[0]
}
