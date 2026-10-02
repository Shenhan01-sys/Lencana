-- 0017_course_drafts.sql — B133 (D67): Penerbit menyusun kursus baru dari halaman.
--
-- Lencana-B133 status=TERBUKA 2026-10-03 — anggota penerbit berhak "susun" (hibah author=1) menyusun draf kursus di halaman, kunci penerbit menerbitkan dengan pesan bertanda tangan; kursus terbit digabung ke katalog server dan halaman. Buktikan ulang: npm run verify:authoring (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B133 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Pilihan builder 3 Okt: "Anggota menyusun, kunci penerbit menerbitkan". Alur satu draf:
--   draft      disimpan penyusun (pesan `lencana-draft save … hash=<keccak isi>` bertanda tangan akunnya)
--   submitted  diajukan penyusun; isinya terkunci (tidak bisa disimpan lagi)
--   published  diterbitkan kunci penerbit (`lencana-course publish draft=… course=… rubric=…`); rubric_hash + manifest_hash
--              dihitung server dari isi + kunci saat itu, dan sejak itu kursusnya ada di katalog
--   rejected   ditolak kunci penerbit; penyusun boleh menyunting lagi (kembali ke draft)
--
-- `content` = bentuk `Course` publik (soal kuis TANPA kunci); `answer_keys` = kunci kuis, hanya dibaca server — tidak pernah
-- dikirim rute publik mana pun (B80). Id kursus tidak boleh sama dengan kursus berkas atau draf lain yang belum ditolak.
--
-- RLS: aktif, tanpa policy — yang menulis hanya signer (secret key) dan CLI platform.

alter table public.publisher_members add column if not exists can_author boolean not null default false;

create table if not exists public.course_drafts (
  id                 bigint generated always as identity primary key,
  issuer             text not null check (issuer ~ '^0x[0-9a-fA-F]{40}$'),
  author             text not null check (author ~ '^0x[0-9a-fA-F]{40}$'),
  course_id          text not null check (course_id ~ '^[a-z0-9][a-z0-9-]{2,47}$'),
  content            jsonb not null,
  answer_keys        jsonb not null default '{}'::jsonb,
  price_units        text check (price_units is null or price_units ~ '^[0-9]{1,24}$'),
  content_hash       text not null check (content_hash ~ '^0x[0-9a-f]{64}$'),
  status             text not null default 'draft' check (status in ('draft', 'submitted', 'published', 'rejected')),
  problems           jsonb not null default '[]'::jsonb,
  save_message       text not null,
  save_signature     text not null,
  submitted_at       timestamptz,
  rubric_hash        text check (rubric_hash is null or rubric_hash ~ '^0x[0-9a-f]{64}$'),
  manifest_hash      text check (manifest_hash is null or manifest_hash ~ '^0x[0-9a-f]{64}$'),
  published_at       timestamptz,
  decided_message    text,
  decided_signature  text,
  decided_at         timestamptz,
  decided_note       text check (decided_note is null or length(decided_note) <= 280),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  origin             text not null default 'unknown' check (origin in ('demo', 'test', 'unknown'))
);

-- Satu id kursus untuk satu draf yang masih hidup (draf ditolak boleh dipakai ulang id-nya).
create unique index if not exists course_drafts_live_course on public.course_drafts (course_id) where status <> 'rejected';
create index if not exists course_drafts_status on public.course_drafts (status);

alter table public.course_drafts enable row level security;
