/**
 * Manifest kursus — dan kenapa ia bukan sekadar objek `Course`.
 *
 * Yang salah posisi sebelumnya: rubrik, bobot, dan ambang lulus hidup di `web/src/courses/*.ts`,
 * yaitu repo PLATFORM, sementara seluruh dokumen kita menulis "penerbitlah yang menyatakan
 * kelulusan". Selama angkanya berasal dari berkas kami, kami bukan rel — kami institusi yang
 * menyamar jadi rel, dan itu persis hal yang kita jadikan alasan untuk menyingkirkan kompetitor.
 *
 * `CourseManifest` memisahkan keduanya secara bentuk, bukan secara kalimat:
 *   - `issuer`   : siapa yang mempublikasikan (nama + URL dokumen penerbit + EOA-nya)
 *   - `course`   : isinya, termasuk kebijakannya (kriteria, bobot, ambang)
 *   - `rubricHash`: komitmen terhadap KEBIJAKAN PENILAIAN saja
 *
 * Yang ketiga itu yang masuk ke dokumen kredensial. Gunanya konkret dan bisa diuji:
 * setelah sebuah ijazah terbit, platform tidak bisa diam-diam mengubah rubrik dan tetap
 * menghasilkan verifikasi yang sama — kredensial menunjuk hash rubrik tertentu, dan rubrik baru
 * menghasilkan hash baru. Ini argumen yang sama persis dengan bitstring yang kita `timestamp()`:
 * bukan "percaya pada server kami", tapi "server kami ketahuan kalau berubah".
 *
 * Batas yang tidak boleh dibesar-besarkan: ini komitmen atas serialisasi canonical kami
 * (kunci diurutkan, field dibuang/ditambah kelihatan), BUKAN canonical JSON standar (JCS/RDFDS).
 * Dua pihak yang ingin saling menguji harus memakai fungsi ini, dan itu wajar karena keduanya
 * memang membaca dokumen kita.
 */

// Lencana-B55 status=SELESAI 2026-09-29 — Kertas Web3 Lanjut pertama kita (0x44d4946e…) menyebut prasyarat di criteria-nya tanpa tautan on-chain. Peserta itu memang memegang Web3 Dasarnya di chain (holderOf sam Buktikan ulang: lihat baris B55 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md. JANGAN dibalik/diulang tanpa membuka kembali baris B55 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import { keccak256, toBytes, type Address, type Hex } from 'viem'
import type { Course } from './content'

export const MANIFEST_SCHEMA = 'lencana.course-manifest/v1'

export type Issuer = {
  /** slug stabil; masuk ke URL dokumen penerbit */
  slug: string
  name: string
  /** URL dokumen issuer (tempat kunci Multikey-nya terdaftar) */
  controllerUrl: string
  /** alamat yang tercatat sebagai `attester` di chain — pengikat manifest ke on-chain whitelist */
  eoa?: Address
  /**
   * Agen PENILAI yang disewa penerbit ini, sebagai identitas ERC-8004 (B118, D53; D54). Ini KLAIM
   * penerbit; chain yang membuktikannya: identitas ada, berkas registrasinya menunjuk balik, dan —
   * sejak D54 (penerbit tetap attester) — dompet agen BUKAN attester kertas (`web/src/verify.ts`
   * bagian 8b). Sewa yang sungguhan tercatat di tabel `agent_hires` (B119). Sengaja TIDAK ikut
   * `manifestHashOf`/`rubricHashOf`: mengganti agen tidak mengubah materi maupun aturan penilaian,
   * dan hash yang sudah tercetak di kertas lama tidak boleh bergeser karenanya.
   */
  agent?: { registry: string; agentId: string }
}

export type CourseManifest = {
  schema: typeof MANIFEST_SCHEMA
  issuer: Issuer
  /** ISO-8601, detik saja: menit/detik nol bukan masalah, tapi zona waktu TIDAK boleh hilang */
  publishedAt: string
  course: Course
}

/**
 * Serialisasi canonical. Sengaja ditulis eksplisit field per field, BUKAN `JSON.stringify` atas
 * objek mentah: urutan kunci pada objek JS ditentukan saat penulisan, jadi hash-nya bisa berubah
 * hanya karena seseorang menata ulang berkas, dan itu membuat komitmen lama terlihat rusak.
 */
export function canonicalPolicy(m: CourseManifest): string {
  const c = m.course
  const quizzes = c.modules
    .flatMap((mod) => mod.lessons)
    .filter((l) => l.quiz)
    .map((l) => ({
      slug: l.slug,
      passPct: l.quiz!.passPct,
      // Soal dinilai dari isinya, bukan dari jumlahnya: mengganti kunci jawaban tanpa mengubah
      // jumlah soal harus tetap menggeser hash.
      questions: [...l.quiz!.questions]
        .sort((a, b) => (a.id < b.id ? -1 : 1))
        .map((q) => ({
          id: q.id,
          answer: q.answer,
          options: q.options.length,
          prompt: q.prompt,
        })),
    }))
    .sort((a, b) => (a.slug < b.slug ? -1 : 1))

  const essays = c.modules
    .flatMap((mod) => mod.lessons)
    .filter((l) => l.essay)
    .map((l) => ({
      slug: l.slug,
      minWords: l.essay!.minWords,
      prompt: l.essay!.prompt,
      rubric: [...l.essay!.rubric]
        .sort((a, b) => (a.label < b.label ? -1 : 1))
        .map((r) => ({ label: r.label, max: r.max })),
      guidance: [...l.essay!.guidance].sort(),
    }))
    .sort((a, b) => (a.slug < b.slug ? -1 : 1))

  return JSON.stringify({
    schema: MANIFEST_SCHEMA,
    courseId: c.id,
    criteria: c.criteria,
    weights: { kuis: c.weights.kuis, esai: c.weights.esai, praktik: c.weights.praktik },
    passMark: c.passMark,
    validDays: c.validDays,
    prereqCourseId: c.prereqCourseId ?? null,
    quizzes,
    essays,
  })
}

/** Hash KEBIJAKAN PENILAIAN. Yang boleh disebut kredensial sebagai "rubrik versi ini". */
export function rubricHashOf (m: CourseManifest): Hex {
  return keccak256(toBytes(canonicalPolicy(m)))
}

/**
 * Hash seluruh isi manifest (termasuk teks lesson). Dipakai untuk hal yang berbeda: membuktikan
 * "materi yang kamu baca hari ini sama dengan yang dipakai menilai". Sengaja DIPISAH dari
 * `rubricHashOf` — memperbaik materi typo tidak seharusnya membatalkan ijazah, dan sebaliknya
 * mengganti satu kunci jawaban tidak boleh terlihat seperti tidak mengubah apa pun.
 */
export function manifestHashOf (m: CourseManifest): Hex {
  const body = JSON.stringify({
    policy: canonicalPolicy(m),
    issuer: { slug: m.issuer.slug, name: m.issuer.name, controllerUrl: m.issuer.controllerUrl, eoa: m.issuer.eoa ?? null },
    publishedAt: m.publishedAt,
    modules: m.course.modules.map((mod) => ({
      id: mod.id,
      lessons: mod.lessons.map((l) => ({ slug: l.slug, title: l.title, kind: l.kind, summary: l.summary, blocks: l.blocks })),
    })),
  })
  return keccak256(toBytes(body))
}

/** 12 hex terdepan — format yang dipakai di UI dan di `criteria`, bukan hash penuh yang tak terbaca. */
export function shortHash (h: Hex): string {
  return h.slice(2, 14)
}

export function manifestOf (courseId: string): CourseManifest | undefined {
  return MANIFESTS.find((m) => m.course.id === courseId)
}

// ---------------------------------------------------------------- registri demo

import { web3Dasar } from './courses/web3-dasar'
import { web3Lanjut } from './courses/web3-lanjut'

/**
 * Institusi contoh. Namanya fiktif dan ditulis demikian di dalam judul course-nya sendiri —
 * menerbitkan ijazah atas nama kampus sungguhan untuk demo adalah cara tercepat kehilangan poin
 * integritas, dan spesifikasi tidak melarangnya, jadi penahan satu-satunya adalah kita.
 */
const YAYASAN: Issuer = {
  slug: 'yayasan-nusantara',
  name: 'Yayasan Literasi Digital Nusantara (institusi demo, fiktif)',
  controllerUrl: 'http://127.0.0.1:8787/issuers/agent-demo',
  // Lencana-B118 status=SELESAI 2026-10-01 —agen ERC-8004 #2534 di IdentityRegistry BNB chain 97, didaftarkan 1 Okt oleh Agent Owner 0x067c…0c4f; sejak D54 agentWallet = dompet operasional agen 0xFd26…0094, BUKAN attester. Buktikan ulang: npm run verify:agent (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B118 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
  agent: { registry: 'eip155:97:0x8004A818BFB912233c491871b3d84c89A494BD9e', agentId: '2534' },
}

/**
 * Dua kursus, satu penerbit. `web3-lanjut-2026` bergantung pada `web3-dasar-2026` lewat
 * `prereqCourseId` di datanya — dan di chain rantai itu ditegakkan lewat `refUID` +
 * `PrerequisiteRevoked`, jadi kebijakan penerbit dan keadaan chain menunjuk hal yang sama.
 */
export const MANIFESTS: CourseManifest[] = [
  {
    schema: MANIFEST_SCHEMA,
    issuer: YAYASAN,
    publishedAt: '2026-09-22T00:00:00Z',
    course: web3Dasar,
  },
  {
    schema: MANIFEST_SCHEMA,
    issuer: YAYASAN,
    publishedAt: '2026-09-22T00:00:00Z',
    course: web3Lanjut,
  },
]
