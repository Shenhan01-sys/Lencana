-- Lencana — perbaikan advisori keamanan pada view `course_gates`
--
-- Diterapkan 28 Sep lewat MCP `apply_migration`, dan inilah yang memicunya. Setelah migrasi 0001
-- jalan, linter Supabase melaporkan satu **ERROR** (bukan peringatan cosmetic):
--
--   security_definer_view — "View public.course_gates is defined with the SECURITY DEFINER property"
--   https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view
--
-- Kenapa ini nyata dan bukan formalitas: view `SECURITY DEFINER` dieksekusi dengan hak PEMBUATnya,
-- jadi ia MELEWATI RLS tabel di bawahnya. View kita menggabungkan data enrollment dan hasil
-- penilaian peserta — persis tipe baris yang kita kunci dengan "RLS aktif tanpa policy". View itu
-- berada di schema `public`, yang berarti PostgREST mengeksposnya sebagai `/rest/v1/course_gates`.
-- Jadi kombinasi "RLS rapat + satu view definer" masih bisa membuka agregat state belajar ke key
-- publik, dan pemeriksaan `select *` di /rest/v1 adalah satu baris curl.
--
-- `security_invoker = true` membuat view dieksekusi dengan hak PEMINTA, jadi RLS yang sudah kita
-- pasang berlaku lagi di baliknya.
--
-- Dibuktikan sesudah apply, bukan diasumsikan:
--   GET /rest/v1/course_gates  dengan publishable key  -> 200, body [] (bukan data)
--   POST /rest/v1/enrollments  dengan publishable key  -> 42501 "violates row-level security policy"
--   get_advisors(security)                            -> ERROR hilang; tersisa 5x INFO
--                                                        rls_enabled_no_policy (sengaja: akses sah
--                                                        hanya lewat service role)
--
-- View-nya identik dengan 0001 selain opsi di baris pertama; memang begitu bentuk perbaikan ini.

create or replace view public.course_gates
with (security_invoker = true) as
select
  e.id            as enrollment_id,
  e.learner,
  e.course_id,
  bool_and(lp.status = 'completed') as all_lessons_done,
  count(a.id) filter (where a.verdict <> 'incomplete') as graded_attempts,
  max(a.score) filter (where a.verdict <> 'incomplete') as best_score
from public.enrollments e
left join public.lesson_progress lp on lp.enrollment_id = e.id
left join public.attempts a on a.enrollment_id = e.id
where e.status in ('active','completed')
group by e.id, e.learner, e.course_id;
