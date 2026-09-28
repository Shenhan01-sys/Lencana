-- Lencana — lapisan penyimpanan untuk state belajar (bar e-course: elemen 3, 4, 7 dari L7)
--
-- Kenapa berkas ini ada, dan kenapa skemanya ditulis di git dan bukan dieksekusi lewat chat:
-- aturan pertama vault kami adalah "klaim harus bisa diulang dari clone". Skema database adalah
-- klaim struktural. Kalau ia hanya hidup di server jauh, tidak ada seorang pun bisa membangun
-- ulang produk ini, dan tidak ada yang bisa meninjau keputusannya.
--
-- Keputusan yang ditahan migrasi ini (28 Sep):
--  1. IDENTITAS PESERTA = ALAMAT EVM. Tidak ada tabel users, tidak ada email/password. Lencana
--     "inklusif" dalam arti konkret: ikut kursus tidak butuh daftar, dan peserta yang sama di
--     perangkat berbeda adalah alamat yang sama. Ini juga yang membuat baris ini bisa disamakan ke
--     `credentialSubject.id` pada dokumen kredensial tanpa perantara.
--  2. POSTGRES BUKAN SUMBER KEBENARAN PUBLIK. Yang dipercaya orang asing tetap chain: attestation
--     EAS, dua Bitstring Status List, anchor `timestamp()` di BAS. Postgres memegang state belajar:
--     siapa mengambil apa, sejauh mana, dan apa usahanya.
--  3. `attempt_hash` adalah jembatan antara keduanya, dan ia ikut tercetak ke dokumen seperti
--     `rubricHash`: setiap angka di sertifikat harus punya alamat aslinya.
--  4. DUA GERANG, BUKAN SATU (L7 elemen 6 / L8 §C.4): `completed` (semua bagian dinilai) dan
--     `passed` (melewati ambang penerbit) adalah hal terpisah. `readyForCredential` kita yang lama
--     hanya mengukur yang pertama; itu cacat yang kita catat, bukan preferensi.
--  5. NILAI TIDAK DITOLAK DI BROWSER (L8 §C.3): kunci jawaban tidak punya kolom di mari, dan
--     komponen nilai disimpan per item supaya gradebook (elemen 7) bisa ditampilkan tanpa menghitung
--     ulang.
--
-- RLS: AKTIF, TANPA READ POLICY PUBLIK. Akses sah hanya lewat service role, dan service role itu
-- melewati RLS (BYPASSRLS) - jadi penahan akses yang sebenarnya adalah otorisasi di dalam signer.
-- Kredensialnya tinggal di app/.env (server-side, gitignored, tidak terbaca bundel Vite). Yang
-- dilarang: argv, pesan commit, log yang mencetak nilai, dan nama berawalan VITE_.

-- ---------------------------------------------------------------- enrollment (bar 3)
create table if not exists public.enrollments (
  id          bigint generated always as identity primary key,
  learner     text not null check (learner ~ '^0x[0-9a-fA-F]{40}$'),
  course_id   text not null,
  status      text not null default 'active'
              check (status in ('active','withdrawn','completed')),
  enrolled_at timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- satu peserta satu baris per kursus; tanpa ini "rekaman enrollment" bercabang dan progres serta
  -- usaha bisa menggantung ke baris yang berbeda
  unique (learner, course_id)
);
create index if not exists enrollments_learner_idx on public.enrollments (lower(learner));

-- ---------------------------------------------------------------- progres per lesson (bar 4)
create table if not exists public.lesson_progress (
  id           bigint generated always as identity primary key,
  enrollment_id bigint not null references public.enrollments(id) on delete cascade,
  lesson_id    text not null,
  -- mesin status eksplisit, bukan boolean - keenam platform yang kita audit punya ini dan kita tidak.
  -- urutannya: locked -> unlocked -> started -> completed
  status       text not null default 'locked'
               check (status in ('locked','unlocked','started','completed')),
  position     integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique (enrollment_id, lesson_id)
);
create index if not exists progress_enrollment_idx on public.lesson_progress (enrollment_id, position);

-- ---------------------------------------------------------------- usaha & penilaian (bar 5, 7, 8)
-- Satu baris = satu penyerahan utuh. `lesson_key` (bukan `lesson_id` yang boleh null) ada di mari
-- karena Postgres MENOLAK ekspresi di dalam UNIQUE constraint: versi pertama berkas ini menulis
-- `unique (enrollment_id, coalesce(lesson_id,'-'), kind, attempt_no)` dan itu syntax error. Kursus
-- tingkat akhir diwakili '-' secara eksplisit, jadi keunikannya nyata, bukan hasil trik parser.
create table if not exists public.attempts (
  id            bigint generated always as identity primary key,
  enrollment_id bigint not null references public.enrollments(id) on delete restrict,
  lesson_key    text not null default '-',
  kind          text not null check (kind in ('kuis','esai','praktik','ujian')),
  attempt_no    integer not null default 1 check (attempt_no > 0),
  score         numeric(6,3) check (score is null or (score between 0 and 100)),
  -- 'incomplete' = ada bagian yang belum dinilai; ini jawaban kita untuk "ungraded bukan nol"
  verdict       text not null default 'incomplete'
                check (verdict in ('incomplete','graded','pass','fail')),
  rubric_hash   text,
  attempt_hash  text not null unique check (attempt_hash ~ '^0x[0-9a-fA-F]{64}$'),
  judge_model   text,
  judge_temp    numeric(3,2),
  deductions    jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  unique (enrollment_id, lesson_key, kind, attempt_no)
);
create index if not exists attempts_enrollment_idx on public.attempts (enrollment_id);

create table if not exists public.attempt_components (
  id         bigint generated always as identity primary key,
  attempt_id bigint not null references public.attempts(id) on delete cascade,
  item_id    text not null,                       -- id soal/lesson, BUKAN jawabannya
  score      numeric(6,3) check (score is null or (score between 0 and 100)),
  weight     numeric(6,3) not null default 0,
  graded_by  text not null default 'mechanical'
             check (graded_by in ('mechanical','model','human')),
  unique (attempt_id, item_id)
);

-- ---------------------------------------------------------------- dua gerbang, dibaca sebagai view
-- View ini bukan hiasan: dia yang akan dibaca `issue --from-attempts`. `completed` dan `passed`
-- sengaja tidak digabung jadi satu kolom.
create or replace view public.course_gates as
select
  e.id                                       as enrollment_id,
  e.learner,
  e.course_id,
  bool_and(lp.status = 'completed')          as all_lessons_done,
  count(a.id) filter (where a.verdict <> 'incomplete') as graded_attempts,
  max(a.score) filter (where a.verdict <> 'incomplete') as best_score
from public.enrollments e
left join public.lesson_progress lp on lp.enrollment_id = e.id
left join public.attempts a         on a.enrollment_id = e.id
where e.status in ('active','completed')
group by e.id, e.learner, e.course_id;

-- ---------------------------------------------------------------- order: harga menempel ke enrollment (bar 10)
create table if not exists public.orders (
  id            bigint generated always as identity primary key,
  enrollment_id bigint not null references public.enrollments(id) on delete restrict,
  asset         text not null,                    -- alamat ERC-20; tBNB bukan aset order
  amount        numeric(38,0) not null check (amount > 0),
  state         text not null default 'open'
                check (state in ('open','paid','refunded','cancelled')),
  tx_hash       text,                             -- settlement ada di chain, bukan klaim DB
  created_at    timestamptz not null default now()
);
create index if not exists orders_state_idx on public.orders (state) where state = 'open';

-- ---------------------------------------------------------------- RLS
-- Aktif di semua tabel, tanpa policy apa pun: aman secara default. Konsekuensinya disebut, bukan
-- disembunyikan - setiap pembacaan dengan key non-service akan menghasilkan nol baris. Kalau nanti
-- peserta perlu melihat progresnya sendiri, itu policy baru + keputusan, bukan kelupaan.
alter table public.enrollments        enable row level security;
alter table public.lesson_progress    enable row level security;
alter table public.attempts           enable row level security;
alter table public.attempt_components enable row level security;
alter table public.orders             enable row level security;

-- ---------------------------------------------------------------- yang sengaja BELUM ada di mari
-- 1. Trigger `updated_at` - mekanis, dan lebih baik masuk bersama migrasi berikutnya daripada
--    diselipkan di sini setelah file ini dianggap final.
-- 2. FK `course_id` ke katalog: katalog masih hidup di kode (`web/src/manifest.ts`). Memindahkan
--    kebenaran katalog ke DB adalah keputusan sendiri, bukan detail skema.
-- 3. Antrian penilaian + lock (bar 8). `course_gates` sengaja tidak menyentuhnya.
-- 4. STATUS: berkas ini SUDAH diterapkan ke proyek `mdvnwepwseqsdtybtikw` pada 28 Sep, lewat MCP
--    `apply_migration` (jalur DDL yang sah — REST/PostgREST hanya data-plane: POST ke tabel yang
--    belum ada menjawab `PGRST205 Could not find the table`, jadi API key memberi akses baris,
--    bukan akses skema). Hasil setelah apply: 5 tabel, `rls_enabled: true`, 0 baris.
-- 5. Yang ditemukan linter setelah apply dan tidak boleh dibiarkan: `course_gates` dibuat
--    `SECURITY DEFINER` (ERROR, lint 0010) — view definer melewati RLS tabel di bawahnya sementara
--    view publik itu terekspos sebagai `/rest/v1/course_gates`. Diperbaiki di
--    `0002_course_gates_security_invoker.sql`. Perbaikan ini terbukti lewat permintaan nyata, bukan
--    asumsi: `GET /rest/v1/course_gates` dengan publishable key mengembalikan `[]`, dan
--    `POST /rest/v1/enrollments` menolak dengan `42501 violates row-level security policy`.
