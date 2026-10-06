-- 0013_publisher_members.sql — B128 (D63): anggota penerbit, langkah C1 RF7.
--
-- Lencana-B128 status=SELESAI 2026-10-02 — keanggotaan penerbit: kunci penerbit memberi satu akun hak memantau dashboard penerbit dan, bila dinyatakan, menyewa agen dan menunjuk agen pengesah atas namanya; terbit/cabut tidak pernah didelegasikan lewat tabel ini. Buktikan ulang: npm run verify:roles (di signer/). JANGAN dibalik/diulang tanpa membuka kembali baris B128 di app/vault/07-Backlog/03 - Findings and Tasks 2026-09-26.md.
--
-- Sampai B128 penerbit = satu alamat (`ISSUER_ADDRESS`) dan setiap aksinya berjalan lewat CLI di mesin yang memegang
-- kuncinya. Builder memilih (2 Okt, opsi 2): akun login bisa menjadi ANGGOTA penerbit yang memantau dan — kalau kunci
-- penerbit menyatakannya — menyewa agen penilai dan menunjuk agen pengesah dari dashboard.
--
--   publisher_members  satu baris per (penerbit, anggota). Baris lahir hanya dari pesan yang ditandatangani kunci
--                      penerbit dan menyebut alamat anggota serta wewenangnya (`lencana-member grant member=… hire=…
--                      appoint=… nonce=…`); pesan + tanda tangannya disimpan supaya hibah bisa diperiksa ulang.
--                      Dicabut = `revoked_at` terisi oleh pesan cabut yang juga bertanda tangan penerbit.
--
-- Yang SENGAJA tidak ada: wewenang menerbitkan atau mencabut kredensial. Itu tetap kunci penerbit (attester di
-- CredentialResolver) — keanggotaan di database tidak boleh menjadi jalan memutar ke otoritas di chain.
--
-- RLS: sama dengan tabel lain — aktif, tanpa policy; yang menulis hanya server sesudah verifikasi tanda tangan.

create table if not exists public.publisher_members (
  issuer            text not null check (issuer ~ '^0x[0-9a-fA-F]{40}$'),
  member            text not null check (member ~ '^0x[0-9a-fA-F]{40}$'),
  can_hire          boolean not null default false,
  can_appoint       boolean not null default false,
  message           text not null,
  signature         text not null,
  granted_at        timestamptz not null default now(),
  revoked_at        timestamptz,
  revoke_message    text,
  revoke_signature  text,
  origin            text not null default 'unknown' check (origin in ('demo','test','unknown')),
  primary key (issuer, member),
  check (lower(issuer) <> lower(member))
);

create index if not exists publisher_members_member_idx on public.publisher_members (member);

alter table public.publisher_members enable row level security;
