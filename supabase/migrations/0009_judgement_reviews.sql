-- 0009_judgement_reviews.sql — B104: pengesahan manusia atas angka model (turunan B87 jalur 1).
--
-- Lencana-B104 status=SELESAI 2026-09-30 — esai yang dinilai model baru dihitung gerbang kalau ada pengesahan manusia (approved/adjusted) oleh reviewer terdaftar. Buktikan ulang: npm run verify:db (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B104 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Rantai yang dipilih builder (29 Sep): AI agen menilai -> MANUSIA mengesahkan -> penerbit
-- menerbitkan. Sampai migrasi ini, `graded_by='model'` yang ditandatangani penerbit sudah cukup
-- untuk menerbitkan — yaitu angka model tanpa satu pun manusia yang menanggungnya.
--
-- Dua tabel:
--   review_roles       siapa yang boleh mengesahkan untuk kursus mana, dan penerbit mana yang
--                      menunjuknya (tanda tangan penunjukan ikut disimpan, bukan cuma alamatnya).
--   judgement_reviews  satu pengesahan per usaha esai: angka yang diusulkan model, keputusan
--                      reviewer, angka akhir, dan tanda tangan reviewer atas keputusan itu.
--
-- `unique (attempt_id)` disengaja: satu usulan model = satu pengesahan. Reviewer tidak bisa
-- mengubah keputusannya diam-diam; kalau penerbit menilai ulang (usulan baru), `judgeEssay`
-- menghapus pengesahan lama dan usulan baru itu menunggu pengesahan baru.
--
-- `rejected` tidak menyentuh angka di `attempts`: ia menutup gerbang dengan TIDAK ADANYA pengesahan
-- yang menyetujui, bukan dengan menulis nol. "Ditolak reviewer" dan "dinilai nol" dua pernyataan
-- berbeda (bar 5/6: ungraded != 0).
--
-- RLS: sama dengan tabel lain — aktif, tanpa policy. Yang menahan tulis adalah tanda tangan di
-- `signer/src/db.js`, karena secret key signer menembus RLS.

create table if not exists public.review_roles (
  course_id  text not null,
  reviewer   text not null check (reviewer ~ '^0x[0-9a-fA-F]{40}$'),
  added_by   text not null check (added_by ~ '^0x[0-9a-fA-F]{40}$'),
  message    text not null,
  signature  text not null,
  added_at   timestamptz not null default now(),
  primary key (course_id, reviewer),
  -- Yang mengesahkan bukan yang menunjuk: kalau penerbit boleh menunjuk dirinya sendiri, lapis
  -- tengah ini hanya tanda tangan penerbit yang dihitung dua kali.
  check (lower(reviewer) <> lower(added_by))
);

create table if not exists public.judgement_reviews (
  id          bigint generated always as identity primary key,
  attempt_id  bigint not null unique references public.attempts(id) on delete cascade,
  judge_model text not null,
  proposed    numeric not null,
  decision    text not null check (decision in ('approved','adjusted','rejected')),
  final_score numeric,
  reviewer    text not null check (reviewer ~ '^0x[0-9a-fA-F]{40}$'),
  message     text not null,
  signature   text not null,
  reviewed_at timestamptz not null default now(),
  -- Ditolak = tidak ada angka akhir; disetujui/disesuaikan = wajib ada.
  check ((decision = 'rejected') = (final_score is null))
);

alter table public.review_roles enable row level security;
alter table public.judgement_reviews enable row level security;

-- Gerbang: usaha esai yang angkanya dari model TIDAK dihitung sampai ada pengesahan yang
-- menyetujui. Delapan kolom + `origin` tetap nama, tipe, dan urutannya (0008), jadi
-- `create or replace` cukup; yang berubah hanya baris `attempts` mana yang ikut dihitung.
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
    where a.enrollment_id = e.id and a.verdict <> 'incomplete'
      and not (a.kind = 'esai' and a.judge_model is not null
               and not exists (select 1 from public.judgement_reviews r
                                where r.attempt_id = a.id and r.decision in ('approved','adjusted'))))
                                                    as graded_attempts,
  (select max(a.score)
     from public.attempts a
    where a.enrollment_id = e.id and a.verdict <> 'incomplete'
      and not (a.kind = 'esai' and a.judge_model is not null
               and not exists (select 1 from public.judgement_reviews r
                                where r.attempt_id = a.id and r.decision in ('approved','adjusted'))))
                                                    as best_score,
  e.origin
from public.enrollments e
where e.status in ('active','completed');
