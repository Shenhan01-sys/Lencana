-- 0012_learner_accounts.sql — B82: login peserta lewat Privy (keputusan builder D57, 1 Okt).
--
-- Lencana-B82 status=SELESAI 2026-10-01 — pengikat alamat peserta ke akun login (Privy): server menulis baris ini hanya sesudah token login diverifikasi dengan app secret DAN alamatnya terbukti dompet tertanam milik user itu; yang belum: uji dua peramban oleh builder (alamat sama sesudah login ulang). Buktikan ulang: npm run verify:privy (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B82 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Sampai 1 Okt identitas peserta adalah kunci penanda tangan saja: kunci perangkat (hangus bersama tab)
-- atau dompet ekstensi. Login Privy memberi peserta dompet tertanam yang SAMA di perangkat mana pun,
-- dan otorisasi tulis tetap tanda tangan EIP-191 atas nonce satu-kali (db.js) — tidak berubah.
-- Tabel ini hanya mencatat bahwa satu alamat peserta terikat ke satu akun login yang terverifikasi.
--
--   learner_accounts  satu baris per alamat peserta. `account_id` = DID Privy (`did:privy:…`). Email
--                     peserta SENGAJA tidak disimpan: yang dibutuhkan sistem adalah "alamat ini milik
--                     akun yang login", bukan data pribadi.
--
-- RLS: sama dengan tabel lain — aktif, tanpa policy; yang menulis hanya server sesudah verifikasi.

create table if not exists public.learner_accounts (
  learner       text primary key check (learner ~ '^0x[0-9a-fA-F]{40}$'),
  provider      text not null check (provider in ('privy')),
  account_id    text not null check (account_id ~ '^did:privy:[A-Za-z0-9]+$'),
  wallet_type   text not null check (wallet_type in ('privy-embedded')),
  linked_at     timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create index if not exists learner_accounts_account_idx on public.learner_accounts (provider, account_id);

alter table public.learner_accounts enable row level security;
