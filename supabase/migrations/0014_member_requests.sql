-- 0014_member_requests.sql — B129 (D64): pengajuan anggota penerbit, langkah C2 RF7.
--
-- Lencana-B129 status=SELESAI 2026-10-02 — pengajuan anggota penerbit: akun mengajukan dengan tanda tangannya sendiri, pengajuan tercatat dengan statusnya, dan hanya kunci penerbit yang menyetujui (lewat hibah keanggotaan) atau menolaknya; pengajuan tidak pernah memberi wewenang apa pun. Buktikan ulang: npm run verify:publisher (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B129 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Sampai B128 akun baru tidak punya jalan apa pun menuju kursi Penerbit: keanggotaan hanya lahir dari CLI pemegang kunci
-- penerbit, dan pemegang kunci tidak tahu siapa yang ingin bergabung. Builder memilih (2 Okt, D64): "ajukan → disetujui".
--
--   member_requests  satu baris per pengajuan. Lahir dari pesan `lencana-member-request issuer=… nonce=…` yang
--                    ditandatangani AKUN PENGAJU; status `pending` sampai kunci penerbit memutuskan:
--                    `approved` (hibah keanggotaan dari `grantMember` menutup pengajuan yang sama) atau
--                    `rejected` (pesan tolak bertanda tangan penerbit). Pesan + tanda tangan kedua pihak disimpan.
--                    Paling banyak satu pengajuan `pending` per (penerbit, pengaju).
--
-- Pengajuan TIDAK memberi wewenang. Satu-satunya sumber kursi tetap `publisher_members` (0013).
-- RLS: aktif, tanpa policy — yang menulis hanya server sesudah verifikasi tanda tangan.

create table if not exists public.member_requests (
  id                bigint generated always as identity primary key,
  issuer            text not null check (issuer ~ '^0x[0-9a-fA-F]{40}$'),
  applicant         text not null check (applicant ~ '^0x[0-9a-fA-F]{40}$'),
  note              text check (note is null or char_length(note) <= 280),
  message           text not null,
  signature         text not null,
  status            text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at        timestamptz not null default now(),
  decided_at        timestamptz,
  decided_message   text,
  decided_signature text,
  origin            text not null default 'unknown' check (origin in ('demo','test','unknown')),
  check (lower(issuer) <> lower(applicant))
);

create unique index if not exists member_requests_one_pending on public.member_requests (issuer, applicant) where status = 'pending';
create index if not exists member_requests_applicant_idx on public.member_requests (applicant, created_at desc);

alter table public.member_requests enable row level security;
