-- 0019_course_manage.sql — B140 (D72): kelola kursus terbit.
--
-- Sunting = versi baru: draf baru menunjuk versi yang digantikannya (`supersedes`, `version`). Aturan nilai tetap → id kursus
-- sama, dan versi lama menjadi `superseded` saat versi baru terbit; aturan nilai berubah → id baru, dan versi lama diarsipkan,
-- supaya kredensial lama tetap menunjuk aturan lamanya.
-- Arsip = `archived_at` pada baris `published`: kursus tetap dimuat (peserta lama tetap masuk kelas, issue + criteria tetap
-- jalan), katalog menyembunyikannya, dan enroll baru ditolak.
-- Setiap keputusan tercatat di `course_actions`: siapa yang meminta (anggota `can_publish` atau penyusun, dengan pesan + tanda
-- tangannya) dan pesan + tanda tangan kunci penerbit atas keputusan itu. Draf yang dihapus tetap meninggalkan jejaknya di sini.

alter table public.publisher_members add column if not exists can_publish boolean not null default false;

alter table public.course_drafts add column if not exists supersedes bigint references public.course_drafts(id);
alter table public.course_drafts add column if not exists version integer not null default 1 check (version >= 1);
alter table public.course_drafts add column if not exists archived_at timestamptz;

alter table public.course_drafts drop constraint if exists course_drafts_status_check;
alter table public.course_drafts add constraint course_drafts_status_check
  check (status in ('draft', 'submitted', 'published', 'rejected', 'superseded'));

-- Dulu satu baris "hidup" per id kursus (status <> rejected). Versi baru berbagi id dengan versi terbitnya, jadi kini dua
-- aturan terpisah: satu baris terbit per id, dan satu draf terbuka per id.
drop index if exists public.course_drafts_live_course;
create unique index if not exists course_drafts_one_live on public.course_drafts (course_id) where status = 'published';
create unique index if not exists course_drafts_one_open on public.course_drafts (course_id) where status in ('draft', 'submitted');
create index if not exists course_drafts_supersedes on public.course_drafts (supersedes) where supersedes is not null;

create table if not exists public.course_actions (
  id                 bigint generated always as identity primary key,
  issuer             text not null check (issuer ~ '^0x[0-9a-fA-F]{40}$'),
  course_id          text not null,
  draft_id           bigint references public.course_drafts(id) on delete set null,
  action             text not null check (action in ('fork', 'delete', 'publish', 'reject', 'archive', 'unarchive')),
  requested_by       text check (requested_by is null or requested_by ~ '^0x[0-9a-fA-F]{40}$'),
  request_message    text,
  request_signature  text,
  issuer_message     text,
  issuer_signature   text,
  note               text check (note is null or length(note) <= 280),
  created_at         timestamptz not null default now(),
  origin             text not null default 'unknown' check (origin in ('demo', 'test', 'unknown'))
);
create index if not exists course_actions_course on public.course_actions (course_id, created_at desc);
alter table public.course_actions enable row level security;
