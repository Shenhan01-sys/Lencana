-- 0006_course_gates_no_fanout.sql
-- Bug nyata yang ditemukan pemeriksaan B81 pada 29 Sep, diukur bukan diduga:
--   view lama:   lessons_completed = 114, graded_attempts = 114  (peserta punya 19 lesson + 6 usaha)
--   barisnya:    19 lesson completed, 6 usaha dinilai            → 19 × 6 = 114
-- Penyebabnya: view me-LEFT JOIN `lesson_progress` DAN `attempts` pada enrollment yang sama, jadi
-- setiap pasangan (progress, attempt) jadi satu baris hasil. `count(a.id)` dan `count(*) filter`
-- lalu menghitung Cartesian product, bukan barisnya.
--
-- Kenapa ini lolos begitu lama: dua kolom yang MEMUTUSKAN (`all_lessons_done` lewat bool_and,
-- `best_score` lewat max) tidak berubah oleh duplikasi baris — jadi gerbang penerbitan tetap benar
-- dan `issue --from-attempts` tetap menolak/menerima dengan tepat. Yang salah adalah angka yang
-- DITAMPILKAN: `progressSummary` membaca view ini, jadi halaman bisa bilang "114/19 lesson selesai".
-- Angka yang salah di tempat yang dibaca orang adalah kegagalan yang sama besarnya dengan gerbang
-- yang salah, hanya lebih mudah ketahuan oleh juri.
--
-- Bentuk baru: tiap hitungan berdiri sendiri lewat subquery per enrollment. Tidak ada join silang,
-- jadi tidak ada fan-out yang bisa dihitung. `all_lessons_done` tetap punya makna yang sama:
-- NULL kalau penyebutnya belum diketahui (lessons_total 0/NULL) — "belum tahu" bukan "selesai",
-- dan bukan "gagal" (lihat catatan migrasi 0004).

-- `create or replace view` tidak boleh mengubah nama/urutan kolom view (Postgres 42P16 — sudah
-- pernah menggigit kita di migrasi 0002), jadi view-nya dijatuhkan dulu. Kolom disusun dengan nama
-- dan urutan yang sama seperti sebelumnya supaya pembaca lama (db.js:courseGates, progressSummary)
-- tidak perlu ikut berubah.
drop view if exists public.course_gates;

create view public.course_gates as
select
  e.id                                              as enrollment_id,
  e.learner,
  e.course_id,
  e.lessons_total,
  (select count(*)
     from public.lesson_progress lp
    where lp.enrollment_id = e.id and lp.status = 'completed')  as lessons_completed,
  case
    when coalesce(e.lessons_total, 0) = 0 then null
    else (select count(*) from public.lesson_progress lp
           where lp.enrollment_id = e.id and lp.status = 'completed') >= e.lessons_total
  end                                               as all_lessons_done,
  (select count(*)
     from public.attempts a
    where a.enrollment_id = e.id and a.verdict <> 'incomplete')  as graded_attempts,
  (select max(a.score)
     from public.attempts a
    where a.enrollment_id = e.id and a.verdict <> 'incomplete')  as best_score
from public.enrollments e
where e.status in ('active','completed');
