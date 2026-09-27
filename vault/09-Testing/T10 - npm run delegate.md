---
tags: [testing, "T10"]
command: npm run delegate
measured: 2026-09-23
result: batch 1.024.813 gas / single 370.131
---

# T10 - `npm run delegate` (agen menandatangani, platform menyiarkan)

**Perintah:** `cd signer && npm run delegate`. **Belum dijalankan ulang sejak 23 Sep** — dicatat
dengan tanggal aslinya, tidak diberi tanggal hari ini hanya supaya tabelnya terlihat segar.

Terukur terhadap chain 97 publik (23 Sep), dengan **semua nilai dibaca balik dari chain**, bukan dari
return value proses ini:

| jalur | transaksi | gas | attester | saldo agen |
|---|---|---|---|---|
| batch 3 kredensial lesson-level | **1** (`0xe31a917e…`) | 1.024.813 | = agen | tidak berubah sampai wei |
| satu kredensial tunggal (`0xbe44e128…`) | 1 | 370.131 | = agen | tidak berubah sampai wei |

`lessonOf(uid)` sama dengan id lesson yang diturunkan dari materi kursus, dan nonce attester naik tepat
satu per permintaan — itu yang membuktikan batch bukan hasil replay tanda tangan yang sama.

## Yang TIDAK boleh dibaca lebih dari ini

Test ini membuktikan **primitive dan eksekusi delegasi**. Yang masih script, bukan service: tidak ada
queue, tidak ada kunci idempoten, dan tidak ada percobaan ulang kalau broadcast gagal — lihat
[[11-Refactoring/RF6 - Core System, Backend and Contracts]].

**Lihat juga:** [[04-Signer-Service/S4 - Delegated issuance]]
**Related:** [[09-Testing/00 - Hub Testing]] · [[08-Results/01 - Evidence and Limits]]
