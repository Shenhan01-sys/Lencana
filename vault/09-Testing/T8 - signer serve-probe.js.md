---
tags: [testing, "T8"]
command: node scripts/serve-probe.js
measured: 2026-09-28
result: 48 checks / 0 failed
---

# T8 - signer serve-probe.js

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P1

## Command

```powershell
cd app/signer
npm run serve                 # probe ini MEMBACA server yang sedang jalan, tidak memulai satu
node scripts/serve-probe.js
```

**Sejak B156 (5 Okt):** di baterai (`npm run sync:numbers`, termasuk `-- --only=serveProbe`) signer **tidak** perlu
dinyalakan dulu — baterai menyalakan signer sementara di port bebas (`LANCENA_ORIGIN=test`, kode + `.store` di mesin ini),
menjalankan probe terhadapnya lewat `BASE_URL`, lalu mematikannya (`signer/scripts/sync-numbers.js`, `withOwnSigner`).
Diukur 5 Okt dengan :8787 mati: **50 / 0** dalam 24,5 detik. Probe yang dijalankan sendiri (`npm run probe:serve`) tetap
membaca server yang sedang jalan seperti di bawah. Signer cloud (B154) bukan sasaran probe ini: `.store`-nya kosong, jadi
pemeriksaan dokumen dan bit status akan merah karena datanya memang tidak ada di sana.

⚠️ Halaman ini pernah menulis bahwa probe "starts the server in-process" — tidak. Ia memanggil
`BASE_URL` lewat HTTP dan **mati dengan `HTTP 404`/`ECONNREFUSED` kalau servernya tidak ada**; ia
membutuhkan server yang sedang berjalan. Diketemukan 28 Sep ketika probe merah karena server yang
tersisa dari sesi sebelumnya dijalankan dengan slug lain → **B48**, dan itu jawaban yang benar dari
probe, bukan bug probe.

## Run 28 Sep — 48 / 0 (sebelumnya 20 / 0 pada 25 Sep)

```
  env   : 21 dari berkas ../../.env
  ok    /healthz menyebut identitas yang ia sajikan
  ok    dokumen issuer tersaji lewat HTTP
  ok    /issuers/agent-b41: id dokumen = URL rute ini, kunci menunjuk kembali ke id
  ok    /issuers/agent-demo: id dokumen = URL rute ini, kunci menunjuk kembali ke id
  ok    /issuers/agent-edge: id dokumen = URL rute ini, kunci menunjuk kembali ke id
  ok    /issuers/<slug asing> 404 dengan daftar yang dikenal, bukan dokumen agen lain
  ok    rute dokumen: verificationMethod menunjuk dokumen issuer yang tersaji
  ok    rute dokumen: kunci di verificationMethod ada di assertionMethod issuer-nya
  ok    rute dokumen: tanda tangannya SAH terhadap kunci yang disajikan HTTP
  info  host di dokumen (genres-wines-insulation-useful.trycloudflare.com) vs host yang
        menyajikan (127.0.0.1:8787) — BEDA: dokumen ini terbit di host yang lain (B51)

PROBE SERVE HIJAU — 48 pemeriksaan, 0 gagal
```

Tiga hal baru yang sekarang dijaga, dan dua di antaranya adalah bug sungguhan:

| yang dijaga | kenapa ia ada di sini |
|---|---|
| setiap agen di `.keys/` disajikan di URL-nya sendiri (**B48**) | `verificationMethod` dicetak saat terbit; server yang cuma melayani satu slug membuat ijazah agen lain tidak bisa diverifikasi di instance itu — 404 atas dokumen yang kuncinya jelas ada di disk |
| dokumen kunci diambil dari **URL yang ditunjuk kredensial**, bukan dari slug yang kebetulan di-start | meniru verifier nyata, dan menghapus pengerasan `agent-demo` yang membuat probe merah tanpa sebab produk |
| `publicKeyMultibase` wajib ada di dokumen issuer yang tersaji | `listAgents()` pertama kali tidak mengembalikannya: bentuk dokumen tetap sah, tapi **tanda tangan siapa pun tidak akan pernah cocok**. Probe menemukannya dalam run pertama kode baru ini, bukan saya |

Angka 20 → 48 bukan karena kita menguji hal yang sama lebih keras: sebagian besar tambahan itu
adalah rute dokumen/kriteria/hasil yang memang belum ada tests-nya pada 25 Sep.

## Yang membuatnya lebih mudah dijalankan salah dulunya

Probe dan `check.js` kini memuat `../.env` sendiri (`src/env.js`), nilai lingkungan proses tetap
menang. Alasannya bukan kenyamanan: tanpa env, keduanya **tidak gagal** — mereka melewati grup yang
butuh chain dan tetap mencetak hijau dengan angka yang lebih kecil. Sekarang satu baris `env : 21`
ikut tercetak di kepala log, supaya hijau bisa ditelusuri dari mana angkanya.

The point of the last check: the **hash that gets anchored is the hash the server actually serves**.
That linkage was a bug before `servedHashes()` existed (the anchor recorded a one-credential list
nobody read) → [[00-Overview/04 - Corrections]].

## What this does NOT prove

- Nothing about reachability. Ia menguji **bentuk dan kunci**, bukan apakah internet bisa membuka URL
  di dalam dokumen — itu ranah [[09-Testing/T16 - npm run publish edge]] dan
  [[09-Testing/T15 - 1EdTech validator]], yang membacanya lewat host publik. Baris `info` di atas
  justru muncul ketika host dalam dokumen berbeda dari host yang menyajikan: probe tidak
  menutupinya, dan tidak pula memanggilnya salah.
- No authentication, rate limit or concurrency behaviour: ini probe kebenaran, bukan uji beban.
- Kalau server berjalan dengan slug yang salah, sebagian besar masih hijau — karena dokumen dibaca
  lewat HTTP, identitas datang dari yang tersaji. Yang menangkap slug bukan probe ini, tapi baris
  `/healthz menyebut identitas yang ia sajikan`.

**Related:** [[S7 - Server routes and lifecycle]] · [[T9 - npm run anchor]]
