---
tags: [testing, "T27"]
status: active
updated: 2026-09-29
command: npm run probe:cold
measured: 2026-09-29
result: PROBE COLD HIJAU — **23 / 0**
---

# T27 - signer cold-store-probe.js (clone baru = store kosong)

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** B42 (ditutup di sini), B106, B107 · **AC:** —

## Kenapa ada

Semua harness signer lain selalu bertemu `.store/state.json` **hangat**: 19 kertas kita. Keadaan yang
dialami orang pertama kali justru sebaliknya — `git clone`, store kosong. B42 menamai celah ini sejak
lama tanpa perkakasnya; `LANCENA_STORE` (`store.js:23`) sudah bisa memindahkan direktori store, jadi
yang kurang hanya orang yang benar-benar menyalakan server dalam keadaan itu.

## Yang ditemukannya pada run pertama

**`/healthz` = HTTP 500 di store dingin.** `buildList` (`server.js:111`) melempar "RESOLVER_ADDRESS /
RPC_URL not set" juga ketika konfigurasi lengkap dan yang kosong hanya `hashes` — padahal `renderList`
atas daftar kosong menghasilkan bitstring kosong yang **tetap bertanda tangan sah**. Bug-nya dua
lapisan: clone baru disambut 500, dan pesannya menyalahkan lingkungan pembaca atas kode kami.

Tiga cacat di probe-nya sendiri, semuanya ketahuan karena **dijalankan**, bukan dibaca: (1) aku spawn
`node src/server.js` padahal `serve` jalan lewat tsx → "server tidak naik" palsu; (2) `finish()`
menghapus direktori temp lalu `readdirSync` di dalamnya → crash kedua menutupi sebab pertama;
(3) kunci `state.credentials` adalah URL dokumen, bukan hash, sehingga objek uji pertama diam-diam
jatuh ke hash **fiktif** dan "404 di store dingin" tidak akan berarti apa-apa.

## Yang dijaga

| bagian | yang dibuktikan |
|---|---|
| `/healthz` 200 + `ok:true` | `git clone` tidak disambut 500 |
| `agent`/`agentSlugs`, `startedAt`, `codeStamp` | identitas + penjaga B86 tersedia di proses dingin |
| `watched` dari `STATUS_HASHES` | angka daftar tidak ikut berubah karena kehangatan store |
| `/issuers/<agen>` 200 + `publicKeyMultibase` | dokumen penerbit TIDAK bergantung pada store |
| kedua `/credentials/status/*` 200 + `proofValue` | daftar kosong tetap kredensial sah, bukan 503 |
| `/credentials/<hash>` → 404 dengan `error` bernama, bertipe JSON | inti B42: bukan 500, bukan 200 berbadan kosong |
| **jangkar tepi**: hash yang sama 200 di `EDGE_BASE_URL` | membuat 404 itu berarti — tanpa ini, hijau cuma kebetulan |
| `state.json` hangat: ukuran **dan** mtime tak berubah | probe tidak bisa merusak 19 kertas kita |
| server masih hidup di akhir | tidak ada satu rute pun yang menjatuhkan proses |

## Jalankan

```
cd app/signer
npm run probe:cold     # port bebas dari 8817; store dingin di os.tmpdir(); tidak menulis ke repo
```

Terkait: [[09-Testing/T26 - signer sample-check.js]] (hash mana yang nyata),
[[09-Testing/T18 - signer verify-edge.js]], [[07-Backlog/03 - Findings and Tasks 2026-09-26]] B42/B106/B107.
