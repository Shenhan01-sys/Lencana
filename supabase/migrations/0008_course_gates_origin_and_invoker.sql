-- 0008_course_gates_origin_and_invoker.sql — B78(c), dan satu regresi keamanan yang ditemukan saat
-- mengerjakannya.
--
-- Lencana-B78 status=SELESAI 2026-09-30 — view course_gates membawa kolom origin (baris tes terbedakan dari demo) dan kembali security_invoker. Buktikan ulang: npm run verify:db (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B78 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- (1) B78(c): view ini masih "ikut membaca baris tes" — tepatnya, pembacanya tidak bisa membedakan
--     baris tes dari baris demo, karena `origin` (migrasi 0007) tidak ikut keluar. Baris tes TIDAK
--     disaring di sini, dan itu disengaja: harness (`verify:db`, `verify:attempts`) membaca gerbang
--     peserta ujinya sendiri lewat view ini, jadi menyaringnya berarti mematikan uji gerbang. Yang
--     benar adalah membuat asalnya terbaca: `?origin=eq.demo` untuk angka yang dikutip ke orang.
--     Kolomnya DITAMBAH DI UJUNG — itu sebabnya ini bisa `create or replace` tanpa `drop`: Postgres
--     menolak (42P16) mengubah nama/urutan kolom yang ada, bukan menambah di belakang. Percobaan
--     30 Sep gagal karena menyisipkan kolom di tengah.
--
-- (2) Regresi: migrasi 0006 menjatuhkan view lalu membuatnya lagi TANPA `security_invoker = true`
--     yang dipasang 0002/0004. Sejak itu view dieksekusi dengan hak pemiliknya dan melewati RLS.
--     Terukur 30 Sep sebelum migrasi ini, dengan publishable key (yang ada di bundel halaman):
--       GET /rest/v1/enrollments?select=*   -> 200, []            (RLS bekerja)
--       GET /rest/v1/course_gates?select=*  -> 200, 20 baris      (alamat peserta + nilai terbaca)
--     dan `pg_class.reloptions` view-nya NULL. Tidak ada harness yang menjaga view itu — `verify:db`
--     hanya menanyai `enrollments` — jadi hijau di mana-mana. Penjaganya ditambahkan di run yang sama
--     (`db-probe.js`: publishable key wajib mendapat [] dari `course_gates` juga).
--
-- Bentuk hitungannya identik dengan 0006 (subquery per enrollment, tanpa fan-out).

create or replace view public.course_gates
with (security_invoker = true) as
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
    where a.enrollment_id = e.id and a.verdict <> 'incomplete')  as best_score,
  e.origin
from public.enrollments e
where e.status in ('active','completed');

comment on view public.course_gates is
  'Dua gerbang per enrollment (selesai, nilai terbaik) + origin. security_invoker: RLS tabel di bawahnya berlaku, jadi hanya service role yang membaca isinya. Baris origin=test adalah sisa harness — saring origin=demo sebelum mengutip angka.';
