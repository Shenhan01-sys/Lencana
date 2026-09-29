-- 0005_essay_submissions.sql
-- Penyerahan esai (B81). Sampai sekarang angka esai datang dari `POST /attempts`, yaitu dari klien —
-- satu-satunya tempat di klaim bar 7 ("setiap angka punya alamat asal") yang masih setengah.
--
-- Kenapa tabel terpisah, bukan kolom `text` di `attempts`:
--   * `attempts` adalah catatan PENILAIAN (skor, verdict, hash). Teks karangan adalah BUKTI mentah
--     yang masa simpannya harus bisa diputuskan berbeda — dan yang tidak boleh ikut tersaji di
--     dokumen publik. `results.js` sudah menulis `essayTextIncluded: false`; kalau teks ditumpuk di
--     tabel yang sama, godaan ikut-ikutan tersaji jadi satu kolom lebih dekat.
--   * satu usaha = satu penyerahan, jadi FK-nya `unique`: tidak ada usaha ber-skor yang menunjuk dua
--     karangan.
--
-- `state` bukan boolean karena ada tiga keadaan yang artinya berbeda:
--   awaiting_judge : sudah diserahkan, tanda mekanis lewat, kriteria penilaian belum dinilai
--   insufficient   : terlalu sedikit untuk dinilai (`grade.js` menolak menilai, finalScore tetap null)
--   judged         : penerbit sudah mengirim penilaian, `attempts.score` terisi
-- `insufficient` sengaja BUKAN `fail`: "belum bisa dinilai" dan "dinilai lalu jatuh" dua pernyataan
-- yang berbeda, dan bar 5/6 kita menegakkan bedanya (ungraded ≠ 0).
--
-- RLS: disamakan dengan tabel lain — aktif, tanpa policy. Secret key signer tetap menembusnya
-- (BYPASSRLS), jadi yang menahan tulis di sini adalah tanda tangan di `src/db.js`, bukan policy.

create table if not exists public.submissions (
  id             bigint generated always as identity primary key,
  attempt_id     bigint not null unique references public.attempts(id) on delete cascade,
  learner        text not null check (learner ~ '^0x[0-9a-fA-F]{40}$'),
  course_id      text not null,
  lesson_key     text not null,
  body           text not null,
  words          integer not null check (words >= 0),
  -- hasil gerbang mekanis (7 tanda `grade.js`), disimpan supaya reviewer bisa melihat apa yang
  -- sudah terbukti SEBELUM model atau manusia ikut menilai
  mechanical     jsonb not null default '[]'::jsonb,
  state          text not null default 'awaiting_judge'
                 check (state in ('awaiting_judge','insufficient','judged')),
  awaiting_since timestamptz not null default now(),
  judged_at      timestamptz
);

-- Antrean dibaca berurutan supaya yang lebih dulu menyerahkan lebih dulu dinilai.
create index if not exists submissions_queue_idx on public.submissions (awaiting_since)
  where state = 'awaiting_judge';
create index if not exists submissions_learner_idx on public.submissions (lower(learner), course_id);

alter table public.submissions enable row level security;
