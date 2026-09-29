-- Lencana — "selesai" butuh penyebut (migrasi 0004)
--
-- Ini memperbaiki kebohongan di view saya sendiri, dan yang menangkapnya adalah
-- `npm run verify:db`, bukan review: `all_lessons_done` dihitung dengan `bool_and(lp.status =
-- 'completed')` atas LEFT JOIN ke `lesson_progress`. Karena view hanya melihat baris yang SUDAH
-- ditulis, peserta yang baru menyelesaikan SATU dari 19 lesson dilaporkan `true` — "selesai".
-- Baris kedua peserta itu yang bikin nampak: di DB tidak ada angka "kursus ini berapa lesson".
--
-- Jadi: `enrollments.lessons_total` ditulis saat enrollment dari KATALOG PENERBIT (server yang
-- menghitung, bukan klien — kalau klien boleh mengirim angka ini, dia lulus dengan menulis 1), dan
-- view mengembalikan NULL ketika penyebutnya belum diketahui. "Belum tahu" tidak boleh terbaca
-- sebagai "selesai" maupun sebagai "belum selesai"; keduanya beda, dan yang terakhir bisa salah
-- ketika katalognya sendiri berubah.
--
-- Catatan teknik, karena percobaan pertama migration ini gagal tepat di sini: Postgres menolak
-- `create or replace view` yang mengubah nama/urutan kolom (`42P16: cannot change name of view
-- column "all_lessons_done" to "lessons_total"`). View-nya harus dijatuhkan lebih dulu.

alter table public.enrollments add column if not exists lessons_total integer not null default 0 check (lessons_total >= 0);

drop view if exists public.course_gates;
create view public.course_gates
with (security_invoker = true) as
select
  e.id            as enrollment_id,
  e.learner,
  e.course_id,
  e.lessons_total,
  count(lp.id) filter (where lp.status = 'completed') as lessons_completed,
  count(a.id) filter (where a.verdict <> 'incomplete') as graded_attempts,
  max(a.score) filter (where a.verdict <> 'incomplete') as best_score,
  case when e.lessons_total > 0
    then count(lp.id) filter (where lp.status = 'completed') >= e.lessons_total
  end as all_lessons_done
from public.enrollments e
left join public.lesson_progress lp on lp.enrollment_id = e.id
left join public.attempts a on a.enrollment_id = e.id
where e.status in ('active','completed')
group by e.id, e.learner, e.course_id, e.lessons_total;
