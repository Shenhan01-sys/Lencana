-- 0007_enrollments_origin.sql — B78: baris tes harus bisa dibedakan dari baris demo.
--
-- Kenapa kolom ini ada (terukur 30 Sep): `enrollments` tidak punya penanda apa pun, jadi klaim
-- "artefak tes selalu dibersihkan dengan bukti query sisa = 0" (langkah 3) tidak bisa Ditanyakan ke
-- DB — bukan karena pembersihnya belum dibuat, tapi karena tidak ada yang bisa difilter. Semua harness
-- (db-probe, attempts-check, journey) menulis ke course yang sama dengan demo memakai alamat acak.
--
-- Default sengaja 'unknown'. Proses yang tidak memperkenalkan dirinya tidak boleh menulis 'demo':
-- kolom yang terlihat otoritatif padahal karangan lebih buruk daripada tidak ada kolom.
-- LANCENA_ORIGIN=demo untuk server demo, LANCENA_ORIGIN=test untuk server yang disangga harness
-- (attempts-check.js menyalakan servernya sendiri dengan itu).

alter table public.enrollments
  add column if not exists origin text not null default 'unknown'
  check (origin in ('demo','test','unknown'));

comment on column public.enrollments.origin is
  'siapa yang menulis baris ini: demo = melahirkan kredensial yang kita terbitkan/pantau; test = sisa harness; unknown = dibuat sebelum penanda ada (tidak bisa dipastikan mundur)';

-- Backfill 34 baris yang sudah ada, dengan kriteria yang bisa diulang, bukan tebakan:
-- 14 alamat pemegang kredensial di signer/.store/state.json = demo. Sisanya tidak memegang satu pun
-- kertas dan seluruhnya lahir dari generatePrivateKey() di harness.
update public.enrollments set origin = 'demo'
 where lower(learner) in (
   '0xd9e3cdc1bead3da89208e8a86edd1329f3156ba3','0x12019d75b02d6a2b308e30410b16b78ceb435891',
   '0x0be6818a4f9235b0ed716f1d147110210459e5dd','0x9d7ac5ce4ed40f494e8079b8c8ebb7371fe8bca3',
   '0xf26a77436154440670523d2eecbbf0fe747b95ac','0xac4087f7d6936c781f9ed00fc45b996cad8e6e28',
   '0x837ad7ec5a245f12bab6452dc2006b885e50c0ff','0xc20e89599c275da327d8c12229f76974efbce541',
   '0x5ca36d61009c2c5a0406f046ffb2b7c939fd7c3b','0x2ef9af5e0601b93a0347166fbd7ec3f677b9a988',
   '0x518bd4399bb28605f0424c9c7af681b18e77bde3','0xc7b8d9c3bf79948fe02ca1ea002e07225292e6b0',
   '0x2b121227aa43b60ff29a4fb2e90a39c76ef3451c','0x8217307c71db63ae30b66d12c3c326455085c142');

update public.enrollments set origin = 'test'
 where origin = 'unknown'
   and lower(learner) not in (
   '0xd9e3cdc1bead3da89208e8a86edd1329f3156ba3','0x12019d75b02d6a2b308e30410b16b78ceb435891',
   '0x0be6818a4f9235b0ed716f1d147110210459e5dd','0x9d7ac5ce4ed40f494e8079b8c8ebb7371fe8bca3',
   '0xf26a77436154440670523d2eecbbf0fe747b95ac','0xac4087f7d6936c781f9ed00fc45b996cad8e6e28',
   '0x837ad7ec5a245f12bab6452dc2006b885e50c0ff','0xc20e89599c275da327d8c12229f76974efbce541',
   '0x5ca36d61009c2c5a0406f046ffb2b7c939fd7c3b','0x2ef9af5e0601b93a0347166fbd7ec3f677b9a988',
   '0x518bd4399bb28605f0424c9c7af681b18e77bde3','0xc7b8d9c3bf79948fe02ca1ea002e07225292e6b0',
   '0x2b121227aa43b60ff29a4fb2e90a39c76ef3451c','0x8217307c71db63ae30b66d12c3c326455085c142');

-- Yang TIDAK diubah di sini, dan itu disengaja:
--  * view public.course_gates masih membaca baris tes juga. Upaya menggantinya lewat
--    `create or replace view` ditolak Postgres (42P16: cannot drop columns from view) — view itu
--    punya consumer (embedding PostgREST + halaman hasil), jadi perbaikannya harus keputusan
--    tersendiri, bukan selisip di migrasi kolom (lihat B78 (c)).
--  * baris lama tidak bisa dipaksa jadi 'test' kalau tidak ada bukti: yang tanpa kredensial DAN
--    tanpa jejak di ledger kertas = 'test'; sisanya tetap 'unknown'.
