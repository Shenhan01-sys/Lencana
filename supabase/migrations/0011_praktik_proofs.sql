-- 0011_praktik_proofs.sql — B121: slot praktik dinilai dari chain, bukan dari laporan peserta.
--
-- Lencana-B121 status=SELESAI 2026-10-01 — bagian core: bukti praktik yang dibaca ulang server dari chain 97 disimpan di sini, satu kunci bukti hanya bisa dipakai satu kali; yang belum: halaman belajar memanggil POST /praktik (fase FE). Buktikan ulang: npm run verify:praktik (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B121 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Sampai 1 Okt satu-satunya jalan masuk usaha praktik adalah POST /attempts, yang menerima ANGKA
-- kiriman peserta. Sejak B121 usaha praktik hanya lahir dari POST /praktik: peserta mengirim apa
-- yang ia baca/kerjakan di chain (hash transaksi, nomor blok, gas, saldo, hasil eth_call), server
-- membaca ulang chain 97 dan menyimpan usaha HANYA kalau semuanya cocok.
--
--   praktik_proofs  satu baris per bukti yang diterima. `proof_key` unik (mis. `tx:97:<hash>`,
--                   `balance:97:<dompet>`) supaya satu transaksi atau satu dompet tidak bisa dipakai
--                   dua peserta. Bukti eth_call tidak punya kunci (jawabannya sama untuk semua
--                   orang) — batas itu ditulis di T38, bukan disembunyikan.
--
-- Urutan tulis di db.js: kunci bukti DIKLAIM dulu (attempt_id masih null), baru usaha disimpan,
-- lalu kunci itu diikat ke usahanya. Kalau penyimpanan usaha gagal, klaimnya dilepas. Dengan begitu
-- tidak pernah ada usaha praktik "lulus" yang buktinya ternyata sudah dipakai orang lain.
--
-- RLS: sama dengan tabel lain — aktif, tanpa policy; yang menahan tulis adalah tanda tangan di db.js.

create table if not exists public.praktik_proofs (
  id           bigint generated always as identity primary key,
  attempt_id   bigint references public.attempts(id) on delete cascade,
  course_id    text not null,
  lesson_key   text not null,
  learner      text not null check (learner ~ '^0x[0-9a-fA-F]{40}$'),
  proof_type   text not null check (proof_type in ('balance', 'tx-receipt', 'eth-call', 'allowance')),
  proof_key    text unique,
  wallet       text check (wallet is null or wallet ~ '^0x[0-9a-fA-F]{40}$'),
  chain_id     integer not null,
  block_number bigint,
  tx_hash      text check (tx_hash is null or tx_hash ~ '^0x[0-9a-f]{64}$'),
  -- nilai yang DIBACA SERVER dari chain (bukan salinan kiriman peserta), supaya penilaian bisa
  -- diperiksa ulang orang lain dari baris ini saja
  observed     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);

create index if not exists praktik_proofs_attempt_idx on public.praktik_proofs (attempt_id);

alter table public.praktik_proofs enable row level security;

-- Komponen praktik dinilai CHAIN — pihak ketiga yang bukan mesin kita, bukan model, bukan manusia.
-- Nilai baru di constraint 0001 (mechanical|model|human); `fromAttempts` hanya mengisi slot praktik
-- dari komponen ber-graded_by ini, jadi baris praktik laporan peserta dari jalur lama tidak terhitung.
-- (Ditambahkan sesudah run pertama `verify:praktik` ditolak constraint lama: 23514 — T38.)
alter table public.attempt_components drop constraint if exists attempt_components_graded_by_check;
alter table public.attempt_components add constraint attempt_components_graded_by_check
  check (graded_by in ('mechanical', 'model', 'human', 'chain'));
