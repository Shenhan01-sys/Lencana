-- 0015_platform_agents.sql — B130 (D65): agen ERC-8004 yang dicetak platform untuk akun Agent Owner, langkah C3 RF7.
--
-- Lencana-B130 status=TERBUKA 2026-10-02 — platform mencetak identitas agen di IdentityRegistry BNB, menulis berkas registrasi dan tarif, memindahkan NFT-nya ke akun Agent Owner, dan mengisi gas akun itu; tabel ini mencatat jejak transaksinya supaya platform tahu agen mana yang ia cetak. Kepemilikan tetap dibaca dari ownerOf di chain, bukan dari tabel ini. Buktikan ulang: npm run verify:owner (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B130 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Kenapa tabel ini perlu: registry ERC-8004 tidak bisa ditanya "agen milik siapa saja", jadi kursi Agent Owner (B128)
-- hanya terbaca untuk agen yang DIKENAL platform (manifest + sewa + penunjukan). Agen yang baru dicetak untuk sebuah akun
-- belum disewa siapa pun — tanpa baris di sini ia tidak akan pernah terlihat sebagai milik akun itu.
--
-- Yang SENGAJA tidak disimpan: siapa pemilik sekarang. `owner_to` adalah penerima pemindahan pertama (jejak), bukan
-- kebenaran — NFT bisa berpindah lagi, dan pemilik sekarang selalu dibaca dari `ownerOf`.
--
-- RLS: aktif, tanpa policy — yang menulis hanya CLI platform (`npm run agent:mint`) lewat secret key.

create table if not exists public.platform_agents (
  agent_id      text primary key check (agent_id ~ '^[0-9]+$'),
  registry      text not null,
  role          text not null default 'grader-account',
  minted_by     text not null check (minted_by ~ '^0x[0-9a-fA-F]{40}$'),
  register_tx   text not null check (register_tx ~ '^0x[0-9a-fA-F]{64}$'),
  owner_to      text check (owner_to is null or owner_to ~ '^0x[0-9a-fA-F]{40}$'),
  transfer_tx   text check (transfer_tx is null or transfer_tx ~ '^0x[0-9a-fA-F]{64}$'),
  gas_tx        text check (gas_tx is null or gas_tx ~ '^0x[0-9a-fA-F]{64}$'),
  created_at    timestamptz not null default now(),
  origin        text not null default 'unknown' check (origin in ('demo','test','unknown'))
);

alter table public.platform_agents enable row level security;
