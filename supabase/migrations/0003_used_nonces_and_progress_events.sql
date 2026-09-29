-- Lencana — nonce di database + jejak progres (migrasi 0003)
--
-- Diterapkan 28 Sep lewat MCP `apply_migration`, dicatat di git supaya bisa dibangun ulang.
--
-- Kenapa nonce pindah ke tabel: versi pertama `src/db.js` menyimpan nonce di `Set` dalam memori dan
-- menyebut dirinya jujur karena menulis "ini tidak bertahan restart". Itu jujur, tapi bukan berarti
-- aman. Signer kita di-restart — deploy, crash, dan `npm run publish` yang dijalankan manusia — dan
-- setiap restart adalah jendela di mana tanda tangan lama yang masih sah bisa dipakai ulang,
-- termasuk untuk menumpang usaha ke alamat orang lain. Satu proses juga berarti satu mesin: dua
-- instance tidak saling melihat nonce. Sekarang penolakannya milik database.
--
-- Kenapa `progress_events` ada: menyimpan hanya status akhir tidak bisa menjawab pertanyaan peserta
-- atau penerbit — kapan ini selesai, dan sebelumnya apa. Ini juga yang membuat klaim "progres
-- server-side" bisa dibedah, bukan dipercaya.
--
-- RLS aktif tanpa policy, sama seperti tabel lain: akses sah hanya lewat service role, dan service
-- role melewati RLS — jadi yang menahan siapa-yang-menulis ada di `src/db.js` (tanda tangan nonce).

create table if not exists public.used_nonces (
  nonce    text primary key check (length(nonce) >= 12),
  learner  text not null,
  scope    text not null,
  used_at  timestamptz not null default now()
);
alter table public.used_nonces enable row level security;

create table if not exists public.progress_events (
  id            bigint generated always as identity primary key,
  enrollment_id bigint not null references public.enrollments(id) on delete cascade,
  lesson_id     text,
  from_status   text check (from_status in ('locked','unlocked','started','completed')),
  to_status     text not null check (to_status in ('locked','unlocked','started','completed')),
  created_at    timestamptz not null default now()
);
create index if not exists progress_events_enrollment_idx on public.progress_events (enrollment_id, id);
alter table public.progress_events enable row level security;
