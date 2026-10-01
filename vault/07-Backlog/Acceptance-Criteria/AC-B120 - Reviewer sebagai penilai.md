---
tags: [acceptance-criteria, B120]
status: active
updated: 2026-10-01
---

# AC-B120 - Reviewer diperlakukan sebagai penilai (boleh agen AI)

**Hub:** [[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · **Backlog:** B120 di
[[07-Backlog/03 - Findings and Tasks 2026-09-26]] · **Testing:** [[09-Testing/T37 - signer agents-check.js (B120 reviewer agen)]] ·
**Summary:** [[08-Results/B120 - Executive Summary]] · **Keputusan:** D53, D54 di [[00-Overview/03 - Decisions]]

| # | kriteria | asal | status | bukti |
|---|---|---|---|---|
| AC-B120#1 | reviewer boleh **agen AI** dengan identitas ERC-8004 | D53 | **PASS** 1 Okt | agen reviewer #2542 terdaftar, ditunjuk penerbit, mengesahkan |
| AC-B120#2 | reviewer agen = **agen lain** dari agen pengusul | usulan B120, disetujui builder | **PASS** 1 Okt | agen penilai kursus itu sebagai reviewer → 422; dan sebaliknya, reviewer kursus itu disewa sebagai penilai → 422; keadaan tersimpan dibaca harness: tidak ada agen yang sekaligus keduanya *(sisi "sebaliknya" ditambahkan 1 Okt sore — sebelumnya baris residu run harness pertama membuat #2534 keduanya; T37)* |
| AC-B120#3 | reviewer agen = **Agent Owner lain** dari agen pengusul | usulan B120, disetujui builder | **PASS** 1 Okt | #2542 pemilik `0x99b1…0C72` ≠ pemilik #2534; diperiksa saat penunjukan dan saat pengesahan |
| AC-B120#4 | alamat reviewer = `agentWallet` identitasnya di registry | — | **PASS** 1 Okt | alamat lain → 422 |
| AC-B120#5 | `agentId` reviewer **tercatat di pengesahan** | usulan B120 | **PASS** 1 Okt | `judgement_reviews.reviewer_agent_id` = 2542; respons `reviewerAgentId` |
| AC-B120#6 | reviewer agen memilih **label tingkat berat** dan aktivitasnya **ditagih** seperti penilaian | D53 (reviewer = penilai) + D54 | **PASS** 1 Okt | tanpa label 401; tagihan 1725 (`sedang`), dibayar `--live` +1553 ke dompet reviewer |
| AC-B120#7 | B104 tetap benar: fail-closed, `adjusted` = angka pengesah, pengesah manusia tetap boleh | B104 | **PASS** 1 Okt | `verify:db` 70/0; angka turunan 92 dari baris nyata |
| AC-B120#8 | pengesahan dicerminkan ke ValidationRegistry ERC-8004 | usulan B120 butir (3) | **BLOCKED** — registry belum dideploy di chain 97 | B118 F3 |
