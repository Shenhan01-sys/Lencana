-- 0010_agent_hires_and_charges.sql — B119 (Agent Owner + sewa per aktivitas penilaian) dan B120
-- (reviewer sebagai penilai, boleh agen AI). Keputusan builder D53 + D54 (1 Okt).
--
-- Lencana-B119 status=SELESAI 2026-10-01 — tabel sewa agen penilai dan tagihan per aktivitas penilaian (label tingkat berat dipilih agen, harga = tarif dasar Agent Owner + kenaikan kecil per tingkat dari Lencana). Buktikan ulang: npm run verify:agents (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B119 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Model D54 (opsi B): PENERBIT tetap attester — ia yang menerbitkan dan satu-satunya yang bisa mencabut
-- kertasnya. Agen penilai hanya menilai dan dibayar per aktivitas; ia tidak pernah menandatangani
-- kredensial. Karena itu sewa agen tidak menyentuh resolver sama sekali.
--
--   agent_hires    penerbit menyewa agen penilai ERC-8004 untuk satu kursus. Tanda tangan penerbit
--                  ikut disimpan. Dompet + pemilik agen dibaca dari registry saat menyewa, dan harus
--                  berbeda dari penerbit (agen bukan penerbit).
--   agent_charges  satu tagihan per aktivitas penilaian agen (menilai atau mengesahkan): label tingkat
--                  berat yang DIPILIH AGEN dan ditandatanganinya, tarif dasar Agent Owner (dibaca dari
--                  metadata identitas agen di registry), kenaikan per tingkat milik Lencana, jumlahnya,
--                  dan — sesudah dibayar — struk settlement di chain.
--
-- Kolom tambahan:
--   attempts.graded_by_agent / attempts.difficulty_label   agen mana yang mengusulkan angka, label apa
--   review_roles.agent_id / agent_owner                     reviewer yang ditunjuk adalah agen ERC-8004 (B120)
--   judgement_reviews.reviewer_agent_id / difficulty_label  agen mana yang mengesahkan, label apa
--
-- RLS: sama dengan tabel lain — aktif, tanpa policy; yang menahan tulis adalah tanda tangan di db.js.

create table if not exists public.agent_hires (
  course_id    text not null,
  agent_id     text not null check (agent_id ~ '^[0-9]+$'),
  registry     text not null,
  agent_wallet text not null check (agent_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  agent_owner  text not null check (agent_owner ~ '^0x[0-9a-fA-F]{40}$'),
  hired_by     text not null check (hired_by ~ '^0x[0-9a-fA-F]{40}$'),
  message      text not null,
  signature    text not null,
  hired_at     timestamptz not null default now(),
  primary key (course_id, agent_id),
  check (lower(agent_wallet) <> lower(hired_by)),
  check (lower(agent_owner) <> lower(hired_by))
);

alter table public.attempts
  add column if not exists graded_by_agent text,
  add column if not exists difficulty_label text
    check (difficulty_label in ('sangat-ringan','ringan','cukup-ringan','sedang','cukup-berat','berat','sangat-berat'));

alter table public.review_roles
  add column if not exists agent_id text,
  add column if not exists agent_owner text;

alter table public.judgement_reviews
  add column if not exists reviewer_agent_id text,
  add column if not exists difficulty_label text
    check (difficulty_label in ('sangat-ringan','ringan','cukup-ringan','sedang','cukup-berat','berat','sangat-berat'));

create table if not exists public.agent_charges (
  id           bigint generated always as identity primary key,
  attempt_id   bigint not null references public.attempts(id) on delete cascade,
  activity     text not null check (activity in ('grade','review')),
  agent_id     text not null,
  agent_wallet text not null check (agent_wallet ~ '^0x[0-9a-fA-F]{40}$'),
  agent_owner  text not null check (agent_owner ~ '^0x[0-9a-fA-F]{40}$'),
  label        text not null
    check (label in ('sangat-ringan','ringan','cukup-ringan','sedang','cukup-berat','berat','sangat-berat')),
  base_amount  numeric not null check (base_amount > 0),
  step_bps     integer not null check (step_bps >= 0),
  amount       numeric not null check (amount >= base_amount),
  token        text not null,
  ladder_hash  text not null,
  status       text not null default 'due' check (status in ('due','paid')),
  payer        text,
  settle_tx    text,
  split_tx     text,
  created_at   timestamptz not null default now(),
  paid_at      timestamptz,
  check ((status = 'paid') = (settle_tx is not null))
);
create index if not exists agent_charges_attempt_idx on public.agent_charges (attempt_id);

alter table public.agent_hires enable row level security;
alter table public.agent_charges enable row level security;
