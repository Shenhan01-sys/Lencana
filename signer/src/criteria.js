/**
 * Dokumen kriteria: apa yang dijanjikan URL `achievement.criteria.id` dan
 * `result[0].resultDescription` di setiap kredensial.
 *
 * Kenapa ada: kredensial kita menunjuk `…/criteria/<slug>` dan `…/criteria/<slug>#scale`,
 * tetapi sampai hari ini tidak ada apa pun di balik URL itu — ia identifier yang sah menurut
 * spesifikasi, dan tetap saja pertanyaan "dinilai dengan aturan apa?" tidak terjawab oleh
 * dokumen mana pun yang bisa dibuka orang lain.
 *
 * Yang TIDAK ada di sini: kunci jawaban. `canonicalPolicy()` (web/src/manifest.ts) memang
 * menghitung jawaban ke dalam `rubricHash`, jadi kalau dokumen ini memuat field `answer`,
 * kita menerbitkan kunci kuis ke internet demi sebuah hash yang sudah terkomitmen. Yang
 * disajikan adalah aturan yang sejak awal dibuka untuk peserta: bobot, pass mark, masa
 * berlaku, soal esai, rubrik per kriteria, dan batas minimum kata.
 *
 * Deterministik: tidak ada `Date.now()` di sini. Dokumen ini ikut di-hash oleh orang lain di
 * masa depan, jadi isinya hanya boleh berasal dari manifest.
 */

/** Komponen penilaian + bobotnya, dibaca dari manifest penerbit. */
function scaleOf (course) {
  return {
    type: ['Scale'],
    description: 'Komposisi nilai akhir. Bobot dan pass mark milik penerbit, bukan platform.',
    passingScore: course.passMark,
    components: Object.entries(course.weights ?? {}).map(([name, weight]) => ({
      criterion: name,
      weight,
      maximumScore: 100,
    })),
  }
}

function quizzesOf (course) {
  return course.modules
    .flatMap((m) => m.lessons)
    .filter((l) => l.quiz)
    .map((l) => ({
      lesson: l.slug,
      title: l.title,
      passPct: l.quiz.passPct,
      questionCount: l.quiz.questions.length,
      // Semua kuis harus dikerjakan, tapi tidak menjadi gerbang: itu kebijakan penerbit yang
      // tercetak di `criteria.narrative` kredensial, dan harus terbaca di sini juga.
      mustAttempt: true,
    }))
}

function essaysOf (course) {
  return course.modules
    .flatMap((m) => m.lessons)
    .filter((l) => l.essay)
    .map((l) => ({
      lesson: l.slug,
      title: l.title,
      prompt: l.essay.prompt,
      minWords: l.essay.minWords,
      rubric: l.essay.rubric.map((r) => ({ label: r.label, maximumScore: r.max })),
      rubricTotal: l.essay.rubric.reduce((a, r) => a + r.max, 0),
      guidance: l.essay.guidance ?? [],
    }))
}

/**
 * @param {string} baseUrl URL publik tempat signer ini disajikan
 * @param {object} manifest CourseManifest dari web/src/manifest.ts
 * @param {string} rubricHash hash kebijakan (penilaian) — yang tercetak di kredensial
 * @param {string} manifestHash hash kebijakan + materi
 */
export function criteriaDocument ({ baseUrl, manifest, rubricHash, manifestHash }) {
  const id = `${baseUrl}/criteria/${manifest.course.id}`
  return {
    id,
    type: ['Criteria', 'AssessmentPolicy'],
    name: manifest.course.title,
    description: manifest.course.blurb,
    narrative: manifest.course.criteria,
    issuer: {
      id: manifest.issuer.controllerUrl,
      slug: manifest.issuer.slug,
      name: manifest.issuer.name,
      // Alamat yang tercatat sebagai `attester` di chain — pengikat dokumen ini ke whitelist.
      eoa: manifest.issuer.eoa ?? null,
    },
    courseId: manifest.course.id,
    // Kata kunci hash: yang 12 hex terdepan adalah yang tercetak di dalam kredensial, jadi
    // orang bisa mencocokkan tanpa menghitung ulang.
    rubricHash,
    rubricRef: String(rubricHash).slice(2, 14),
    manifestHash,
    publishedAt: manifest.publishedAt,
    schema: manifest.schema,
    policy: {
      passMark: manifest.course.passMark,
      validDays: manifest.course.validDays,
      weights: manifest.course.weights,
      allQuizzesRequired: manifest.course.requireAllQuizzes ?? true,
      prerequisite: manifest.course.prereqCourseId ?? null,
    },
    scale: { id: `${id}#scale`, ...scaleOf(manifest.course) },
    quizzes: quizzesOf(manifest.course),
    essays: essaysOf(manifest.course),
    // Dari lesson kind yang sama yang dihitung `web/scripts/inventory.ts`.
    lessonCount: manifest.course.modules.reduce((a, m) => a + m.lessons.length, 0),
    moduleCount: manifest.course.modules.length,
  }
}
