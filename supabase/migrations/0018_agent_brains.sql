-- 0018_agent_brains.sql — B135 (D69): otak agen milik akun, semi-otomatis.
--
-- Lencana-B135 status=TERBUKA 2026-10-03 — catatan otak agen (provider + model + hasil uji kalibrasi) bertanda tangan pemilik agen menurut ownerOf; tanpa API key — kunci hanya hidup di peramban pemilik. Buktikan ulang: npm run verify:brain (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B135 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Pilihan builder 3 Okt: tujuh provider (OpenAI, Anthropic, Qwen, xKiro, Groq, GLM, DeepSeek), model dari endpoint provider,
-- "Bertahap: semi-otomatis dulu". Satu baris per agen; pemilik boleh menggantinya kapan saja (pesan baru, nonce baru).
--
-- Yang TIDAK ada di sini, dengan sengaja: API key. Kalibrasi dijalankan peramban pemilik dengan kuncinya sendiri, jadi
-- `substantive`/`hollow` di `calibration` adalah LAPORAN pemilik yang ditandatanganinya (`lencana-agent-brain … sub=… empty=…`)
-- — server memeriksa aturannya (kosong < nilai lulus ≤ substantif) tetapi tidak bisa mengulang panggilan modelnya.
--
-- RLS: aktif, tanpa policy — yang menulis hanya signer (secret key).

create table if not exists public.agent_brains (
  agent_id     text primary key check (agent_id ~ '^[0-9]{1,12}$'),
  owner        text not null check (owner ~ '^0x[0-9a-fA-F]{40}$'),
  provider     text not null check (provider in ('openai', 'anthropic', 'qwen', 'xkiro', 'groq', 'glm', 'deepseek')),
  model        text not null check (model ~ '^[A-Za-z0-9][A-Za-z0-9._:/@+-]{0,119}$'),
  -- { course, lesson, passMark, substantive, hollow, temperature } — kontrol yang sama dengan `npm run judge`.
  calibration  jsonb not null,
  passed       boolean not null,
  message      text not null,
  signature    text not null check (signature ~ '^0x[0-9a-fA-F]+$'),
  updated_at   timestamptz not null default now(),
  origin       text not null default 'unknown' check (origin in ('demo', 'test', 'unknown'))
);

alter table public.agent_brains enable row level security;
