/**
 * `calibration.ts` — uji kalibrasi otak agen (B135, D69): sebelum agen menilai esai sungguhan, model pilihan pemilik harus
 * lulus kontrol yang sama dengan `npm run judge` (`signer/scripts/judge-check.js`):
 *   kontrol negatif   jawaban fasih-tapi-kosong < nilai lulus kursus   ("penilai yang tidak bisa memberi nilai jelek tidak sedang menilai")
 *   kontrol positif   jawaban substantif ≥ nilai lulus kursus           (penilai yang tidak bisa meluluskan jawaban benar juga tidak)
 *   pembeda           substantif > kosong
 * Rubrik dan nilai lulus dibaca dari kursus `web3-dasar-2026`, lesson `esai-batas-bukti` — sama dengan `judge-check`.
 *
 * Teks fixture DISALIN dari `signer/fixtures/` (bundel halaman tidak membaca folder signer); `npm run verify:brain`
 * memastikan salinannya sama persis dengan berkasnya.
 */
// Lencana-B135 status=SELESAI 2026-10-03 — uji kalibrasi otak agen: kontrol negatif + positif dengan fixture dan rubrik yang sama dengan judge-check, teks fixture dijaga sama persis dengan signer/fixtures. Buktikan ulang: cd signer && npm run verify:brain. JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
import type { Essay } from './content'
import { findCourse, findLesson } from './courses/index'

export const CALIBRATION_COURSE = 'web3-dasar-2026'
export const CALIBRATION_LESSON = 'esai-batas-bukti'

/** = `signer/fixtures/essai-230-kata.md` */
export const CALIBRATION_SUBSTANTIVE = `# Jawaban peserta (contoh: melewati gerbang mekanis, belum dinilai)

Kandidat A hanya menyerahkan tampilan. Yang bisa saya periksa darinya nol: tidak ada alamat
kontrak, tidak ada hash, tidak ada dokumen. Kata "valid" di layarnya adalah klaim milik mereka
sendiri, dan saya tidak punya cara untuk menguji klaim itu tanpa menghubungi penerbitnya.

Kandidat B memberi saya hash dan satu address. Dari situ saya bisa memanggil \`statusOf(bytes32)\`
pada resolver lewat RPC publik (https://bsc-testnet.publicnode.com) dan membaca sendiri bahwa
rekamannya ada, siapa penerbitnya, apakah ia dicabut, dan sampai kapan berlaku. Pada deployment
yang kami pakai di kelas, address resolver-nya \`0x7CA624caFDe5cA3A27b33d26be56F73a90792065\`.
Perbedaan pentingnya bukan "B lebih keren karena on-chain", tapi bahwa pertanyaan saya terhadap B
bisa dijawab oleh alat, sementara pertanyaan terhadap A hanya bisa dijawab oleh A.

Tetap ada yang tidak dapat saya simpulkan dari B. Nilai, rubrik, dan apa sebenarnya yang diuji
tidak ikut terlihat dari status on-chain — itu semuanya ada di dokumen yang harus dia lampirkan,
dan dokumen itu sendiri harus saya verifikasi tanda tangannya, bukan saya percaya karena
hash-nya ada di chain. Jadi bukti B lebih kuat untuk "rekaman ini dibuat pihak ini pada waktu ini",
bukan untuk "kemampuannya memang selevel itu".

Pertanyaan saya ke A: apakah lembaga penerbit punya daftar penerbit yang bisa saya periksa sendiri?
Ke B: mana dokumen kredensialnya, dan apakah penerbitnya masih tercantum sebagai penerbit yang
diizinkan hari ini, bukan hanya saat ia diterbitkan.
`

/** = `signer/fixtures/essai-fasih-tapi-kosong.md` */
export const CALIBRATION_HOLLOW = `# Jawaban peserta (kontrol negatif: fasih, panjang, tapi tidak menyatakan apa pun)

Saya percaya bahwa kredensial digital itu penting untuk masa depan pendidikan di Indonesia. Di era
disrupsi digital seperti sekarang, setiap individu perlu memiliki bukti kompetensi yang dapat
dipertanggungjawabkan kepada seluruh pemangku kepentingan. Hal ini menjadi semakin relevan ketika
 kita berbicara tentang generasi emas dan bonus demografi yang akan menentukan daya saing bangsa
pada tahun dua ribu empat lima nanti.

Menurut hemat saya, kandidat yang baik adalah kandidat yang mampu menunjukkan bukti belajar secara
jelas, transparan, dan akuntabel. Keduanya memiliki kelebihan dan kekurangan masing-masing. Di satu
sisi kita melihat adanya potensi yang sangat besar, di sisi lain kita juga harus menyadari bahwa
tidak ada sesuatu yang sempurna di dunia ini. Oleh karena itu, pendekatan yang paling bijaksana
adalah mengambil jalan tengah dan menyeimbangkan kedua aspek tersebut secara proporsional dan
berkeadilan sehingga tercapai suatu kondisi yang saling menguntungkan bagi semua pihak.

Kita juga perlu memahami bahwa teknologi blockchain itu ibarat pedang bermata dua. Di satu tangan ia
membawa harapan baru bagi transparansi, tetapi di tangan lain ia menyimpan risiko yang tidak boleh
kita pandang remeh. Karena itu literasi digital harus diperkuat sejak dini, dimulai dari bangku
sekolah hingga ke jenjang perguruan tinggi, dengan dukungan pemerintah, swasta, akademisi, dan
komunitas dalam suatu sinergi pentahelix yang terintegrasi dan berkelanjutan.

Pada akhirnya, yang paling penting adalah semangat belajar sepanjang hayat. Ketika seseorang memiliki
semangat untuk terus belajar, maka tidak ada hambatan yang tidak dapat diatasi. Saya yakin dengan
kolaborasi semua pihak, ekosistem sertifikasi digital kita akan semakin matang, semakin dipercaya,
dan semakin berdaya saing di tingkat global. Hal ini tentunya sejalan dengan visi besar bangsa kita
untuk mewujudkan sumber daya manusia yang unggul, berbudaya, dan berkarakter serta mampu bersaing
dalam percaturan internasional yang semakin kompleks dan dinamis dari waktu ke waktu.

Demikian analisis singkat yang dapat saya sampaikan. Semoga apa yang saya uraikan di atas dapat
memberikan gambaran yang komprehensif dan bermanfaat bagi pembaca yang budiman. Atas perhatiannya
saya mengucapkan terima kasih yang sebesar-besarnya.
`

/** Rubrik + nilai lulus kalibrasi, dibaca dari katalog (bukan disalin) — sama dengan `judge-check`. */
export function calibrationSetup (): { essay: Essay, passMark: number } {
  const course = findCourse(CALIBRATION_COURSE)
  const found = course ? findLesson(course, CALIBRATION_LESSON) : undefined
  if (!course || !found?.lesson.essay) throw new Error(`lesson kalibrasi ${CALIBRATION_COURSE}/${CALIBRATION_LESSON} tidak ada di katalog`)
  return { essay: found.lesson.essay, passMark: course.passMark }
}

export type CalibrationResult = { substantive: number, hollow: number, passMark: number, pass: boolean, reasons: string[] }

/** Hasil dua penilaian → lulus/gagal + alasannya. Fungsi murni: server memakai aturan yang sama untuk memeriksa catatan. */
export function judgeCalibration (substantive: number, hollow: number, passMark: number): CalibrationResult {
  const reasons: string[] = []
  if (!(hollow < passMark)) reasons.push(`kontrol negatif gagal: jawaban kosong dapat ${hollow} (harus < ${passMark})`)
  if (!(substantive >= passMark)) reasons.push(`kontrol positif gagal: jawaban substantif dapat ${substantive} (harus ≥ ${passMark})`)
  if (!(substantive > hollow)) reasons.push(`tidak membedakan: substantif ${substantive} tidak di atas kosong ${hollow}`)
  return { substantive, hollow, passMark, pass: reasons.length === 0, reasons }
}

/** Jalankan kalibrasi dengan fungsi penilai apa pun `(essay, text) → total`. */
export async function runCalibration (grade: (essay: Essay, text: string) => Promise<number>): Promise<CalibrationResult> {
  const { essay, passMark } = calibrationSetup()
  const substantive = await grade(essay, CALIBRATION_SUBSTANTIVE)
  const hollow = await grade(essay, CALIBRATION_HOLLOW)
  return judgeCalibration(substantive, hollow, passMark)
}
