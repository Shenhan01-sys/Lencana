-- 0016_account_roles.sql — B131 (D66): satu akun nyata = satu peran; pemilih kursi hanya untuk akun dummy builder.
--
-- Lencana-B131 status=TERBUKA 2026-10-03 — peran akun dipilih sekali (Peserta / Penerbit / Agent Owner), ditandatangani akun itu, tidak bisa diganti; baris dev=true (ditulis CLI platform) menandai akun dummy builder yang boleh memegang semua kursi menurut fakta. Buktikan ulang: npm run verify:account (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B131 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Pilihan builder 3 Okt: "Pilih sekali saat onboarding". Peran efektif sebuah akun dibaca server (`signer/src/server.js`
-- `accountOf`), urutannya:
--   1. baris di sini dengan dev = true      → akun pengembang: semua kursi yang dipegang menurut fakta + pemilih kursi;
--   2. alamat = kunci penerbit              → Penerbit (kunci itu adalah penerbitnya sendiri);
--   3. baris di sini (role)                 → pilihan bertanda tangan akun itu;
--   4. tanpa baris, sudah punya enrollment  → Peserta ("akun lama yang sudah belajar = Peserta");
--   5. tanpa baris, keanggotaan penerbit    → Penerbit; kepemilikan agen (ownerOf) → Agent Owner;
--   6. selain itu                           → belum berperan: boleh memilih (belajar tanpa memilih = Peserta).
-- Fakta (keanggotaan, ownerOf) tetap syarat kursinya: memilih Penerbit tidak memberi kursi sebelum kunci penerbit
-- menyetujui, dan memilih Agent Owner tidak memberi agen.
--
-- `message` + `signature` = pesan `lencana-role role=<peran> … nonce=…` yang ditandatangani akun itu. Kosong hanya untuk
-- baris dev yang ditulis platform (`npm run account:dev`), yang tidak pernah bisa ditulis lewat rute HTTP.
--
-- RLS: aktif, tanpa policy — yang menulis hanya signer (secret key) dan CLI platform.

create table if not exists public.account_roles (
  address     text primary key check (address ~ '^0x[0-9a-fA-F]{40}$'),
  role        text check (role is null or role in ('learner', 'publisher', 'owner')),
  dev         boolean not null default false,
  message     text,
  signature   text check (signature is null or signature ~ '^0x[0-9a-fA-F]+$'),
  chosen_at   timestamptz not null default now(),
  dev_note    text check (dev_note is null or length(dev_note) <= 120),
  origin      text not null default 'unknown' check (origin in ('demo', 'test', 'unknown')),
  -- Akun biasa wajib punya peran dan tanda tangannya; akun dev boleh tanpa keduanya.
  constraint account_roles_chosen check (dev or (role is not null and message is not null and signature is not null))
);

alter table public.account_roles enable row level security;
