---
tags: [hub, results]
status: active
updated: 2026-09-28
---

# 00 - Hub Results

This module is the boundary between what we measured and what we are allowed to say. Every number in it
carries the command that printed it and the date it printed.

| part | what it holds |
|---|---|
| [[08-Results/01 - Evidence and Limits]] | the ledger: claim -> evidence -> what it does NOT prove, and the banned sentences |
| [[08-Results/P2 - Executive Summary]] | the short reading for someone who will not open the repo |
| [[08-Results/B119 - Executive Summary]] | 1 Okt — penerbit menyewa agen penilai ERC-8004 per aktivitas; label dipilih agen, harga = tarif Agent Owner + 5%/tingkat, dibayar lewat x402 ke dompet agen (`verify:agents:live` 40/0) |
| [[08-Results/B120 - Executive Summary]] | 1 Okt — reviewer diperlakukan sebagai penilai: agen reviewer ERC-8004 #2542 dengan Agent Owner lain; pengesahannya ditagih; penilai ≠ reviewer dijaga dua arah (`verify:agents` bagian B120 12/12, live 15/15) |
| [[08-Results/B80 - Executive Summary]] | 1 Okt — kunci jawaban kuis keluar dari bundel browser: bundel 0/28 teks `why` (sebelumnya 28/28 di Vercel), `rubricHash` kertas yang terbit tidak bergeser, `/grade` membalas pembahasan per soal tanpa indeks jawaban (`verify:quizkeys` 30/0). Bukan "anti-curang": ulangan tak terbatas tetap membocorkan kunci pelan-pelan |
| [[08-Results/B121 - Executive Summary]] | 1 Okt — slot praktik dinilai dari chain lewat `POST /praktik` (saldo, transfer, `eth_call`, izin token), `/attempts` menolak skor slot rubrik dari peserta; satu kertas terbit dengan praktik `gradedBy chain` (`verify:praktik` 32/0, live 32/0). **Core saja** — halaman belajar belum memanggil rutenya, baris B121 tetap terbuka |

**Rule for adding a row.** Only from a run. If no command prints the number, the number does not belong
here: it becomes open work in [[07-Backlog/03 - Findings and Tasks 2026-09-26]] and the submission text
says nothing about it.

**Related:** [[00-Overview/08 - Submission Copy]] · [[09-Testing/00 - Hub Testing]] · [[10-Contributors/Claims-Cheat-Sheet]]
