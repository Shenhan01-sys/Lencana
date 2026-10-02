---
tags: [hub, index]
---

# 📘 Index — Lencana vault

Structural entry point: every layer, one line each. For orientation and the countdown, read
[[START-HERE]] instead.

## 🚪 Entry points

- [[START-HERE]] — position, who reads what, countdown
- [[README]] — the two habits that keep this folder trustworthy
- [[00-Overview/01 - Briefing]] — the product in plain language
- [[00-Overview/13 - Proses Bisnis End-to-End (dibaca dari kode)]] — siapa melakukan apa, dari daftar sampai verifikasi, dengan diagram; diturunkan dari kode, bukan dari halaman proses bisnis lama
- [[08-Results/01 - Evidence and Limits]] — proven vs not proven
- [[10-Contributors/Claims-Cheat-Sheet]] — sentences we forbid ourselves
- [[07-Backlog/01 - Backlog]] — what is left
- [[07-Backlog/03 - Findings and Tasks 2026-09-26|status dan tugas terbaru]] — the current snapshot

## 🗂️ Layers

| # | Module | One line |
|---|---|---|
| 00 | [[00-Overview/01 - Briefing]] | product, personas, demo scenes, decisions, corrections |
| 01 | [[01-Architecture/01 - Architecture]] | the layers, who owns each, why BAS, the EAS gap we close |
| 02 | [[02-Contracts/01 - Contracts]] | ~~4 contracts~~ 5 deployed contracts *(Koreksi 3 Okt: yang kelima, `CourseDeposit`, dideploy 30 Sep malam — B90, [[09-Testing/T34 - signer deposit-check.js]])*, function by function, with their revert names |
| 03 | [[03-Frontend/01 - Frontend]] | verifier page + learning surface; what the router mounts on |
| 04 | [[04-Signer-Service/01 - Signer Service]] | the document, the two status lists, delegation, grading, payment |
| 05 | [[05-Course-Content/01 - Course Content]] | course data, issuer manifest, who is allowed to decide a grade |
| 06 | [[06-Spec-Research/01 - Spec Research]] | OB 3.0 / VC 2.0 / EAS / x402 facts read from source + toolchain traps |
| 07 | [[07-Backlog/01 - Backlog]] | work left, blockers, risks + per-item acceptance criteria |
| 08 | [[08-Results/00 - Hub Results]] | one executive summary per finished item, and the evidence/limits essay |
| 09 | [[09-Testing/00 - Hub Testing]] | the home of every measured number |
| 10 | [[10-Contributors/00 - Hub Contributors]] | ownership map, frontend contract, open items |
| 11 | [[11-Refactoring/00 - Hub Refactoring]] | consumer-readiness audit and the target shape, front end and core |
| 12 | [[12-LMS-References/00 - Hub LMS References]] | six LMS read at pinned commits; what an e-course must have, and where we stand |

## ⚡ Reference

[[Quick-Reference]] · [[Glossary]] · [[Conventions]] · [[Dashboard]] · [[_Auto-Index]] · [[AGENTS]]

## 🗺️ Every page (auto)

```dataview
LIST FROM "" WHERE file.name != "Index" AND file.name != "_Auto-Index" SORT file.folder ASC, file.name ASC
```
