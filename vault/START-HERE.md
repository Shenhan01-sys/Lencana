---
tags: [hub, start-here]
---

# 🎖️ Lencana — project vault

The long-term memory of **Lencana**: a learning platform where the credential is a real industry
format, not a picture of one. A learner studies on a data-driven learning surface, the **issuer**
(a third party's agent) grades against **its own rubric**, the result is signed as an
**Open Badges 3.0 / W3C VC 2.0** document and anchored on **BAS** (BNB Attestation Service), the
artifact is a **soulbound token**, status is readable by anyone through two **Bitstring Status
Lists** whose hashes are timestamped on chain, and the machine-to-machine payment path
(**x402**) splits revenue **in a contract we wrote**.

Everything above is live on the **public BSC testnet (chain 97)**, and each line has a command inside
this repository that re-runs it — with one caveat worth stating up front: those commands need our
`.env`, an issuer key in `signer/.keys/` and credentials in `signer/.store/`, all three deliberately
gitignored. A fresh clone re-runs the offline suites and `npm run rubric` / `inventory` unaided; the
chain-facing numbers need an issuer key, a funded testnet wallet and `npm run issue` first.

## ⏳ Position

| | |
|---|---|
| Today | **28 September 2026** |
| Submission deadline | **30 September 2026, 23:59 WIB** — **2 days left** |
| Repository | `github.com/Shenhan01-sys/Lencana` (public) |
| Chain | BSC **testnet 97**. Nothing on mainnet, by choice: testnet satisfies the rules |
| On-chain layer | 4 contracts deployed · **104 Foundry tests pass / 0 fail** on forks of **both 97 and 56** (re-run 28 Sep) → [`09-Testing/`](09-Testing/) |
| Public host | Documents we sign are served from `https://lencana-edge.hansgunawan775.workers.dev` (Cloudflare Worker + KV, never signs anything) → [`04-Signer-Service/S10 - Edge surface.md`](04-Signer-Service/S10%20-%20Edge%20surface.md) |
| External verdict | `vc.1ed.tech` OB 3.0 validator: **`outcome: VALID`**, 14 checks, 0 errors / 0 warnings — **6 kredensial berbeda** diukur 28 Sep, termasuk satu yang terbit **dari rekaman belajar peserta** → [`09-Testing/T15 - 1EdTech validator.md`](09-Testing/T15%20-%201EdTech%20validator.md) |
| Learning surface | Enrollment, progres per lesson, dan nilai kuis yang **dihitung penerbit** (`POST /grade`) hidup di Postgres dan dipanggil halaman `#/learn` lewat HTTP (`web/src/learning.ts`); satu alur utuhnya terukur `npm run verify:attempts:live` **55/0** → [`09-Testing/T22 - signer attempts-check.js.md`](09-Testing/T22%20-%20signer%20attempts-check.js.md) |
| Publicly readable | **17 dari 17** kertas yang kita pegang bisa dibuka orang tanpa mesin ini — diukur `npm run verify:edge` 29 Sep (mulai hari ini: 10 dari 17). Yang dipindah bukan kertas baru: `npm run rehost` menulis ulang URL di dalam dokumen lalu menandatangani ulang dengan **kunci Multikey yang sama**, tanpa satu transaksi pun di chain — `credentialHash`, uid, nomor bit, dan hash daftar yang ter-anchor tidak berubah (B65-b, B83, [[09-Testing/T24 - signer rehost.js]]) |
| Honest limits | [`10-Contributors/Claims-Cheat-Sheet.md`](10-Contributors/Claims-Cheat-Sheet.md) — **read this before writing any claim**, including UI copy. Batas yang bertambah hari ini: nilai esai/praktik masih laporan klien (B81), kunci jawaban kuis memang ada di bundel browser (B80), dan jumlah pemeriksaan `check.js` berubah 94 → 84 tanpa sebab yang kutemukan (B85 — jangan kutip angka itu sebelum dijelas) |

## 🚀 Start here, depending on who you are

**Judging / reviewing** →
1. [`08-Results/01 - Evidence and Limits.md`](08-Results/01%20-%20Evidence%20and%20Limits.md) — what is proven, what is not
2. [`09-Testing/00 - Hub Testing.md`](09-Testing/00%20-%20Hub%20Testing.md) — every number with the command that printed it
3. [`00-Overview/12 - Business Process.md`](00-Overview/12%20-%20Business%20Process.md) — how the thing
   actually works, in five diagram forms, with the limits drawn into the same page
4. [`00-Overview/05 - Demo Scenes.md`](00-Overview/05%20-%20Demo%20Scenes.md) — the four-scene walkthrough

**Continuing the work (human or agent)** →
1. [`07-Backlog/01 - Backlog.md`](07-Backlog/01%20-%20Backlog.md) — what is left and what blocks it
2. [`00-Overview/02 - Roadmap to the Deadline.md`](00-Overview/02%20-%20Roadmap%20to%20the%20Deadline.md) — day by day to 30 Sep, including what only a human can do
3. [`Quick-Reference.md`](Quick-Reference.md) — commands, addresses, env names, one place
4. [`AGENTS.md`](AGENTS.md) — the rules that keep this folder trustworthy if you are an agent
4a. [`00-Overview/12 - Business Process.md`](00-Overview/12%20-%20Business%20Process.md) — proses bisnis
    end-to-end dalam lima bentuk diagram (BPMN · sequence · DFD · state machine + activity · daur hidup
    status & pembayaran), tiap panahnya bernama rute/tabel/fungsi, ditutup tabel "yang TIDAK bisa
    dilakukan sistem ini" dan naskah 90 detik untuk video.
4b. [`WORKFLOW.md`](WORKFLOW.md) — the 5-step loop every item must pass: execute (schema first) →
    sync AC + backlog → three-layer testing → per-item executive summary → **commit local, push only
    on the builder's approval**. Where it disagrees with `AGENTS.md`, the disagreement is written as
    B76–B79 in `07-Backlog/03 - Findings and Tasks 2026-09-26.md`, not left implicit.

**Before you choose work** → [`00-Overview/11 - Product Bar.md`](00-Overview/11%20-%20Product%20Bar.md):
the 12-element e-course frame comes first, our three verified differentiators second, and the storage
decision with it (Supabase for learning state; chain stays what the public trusts).

**Frontend (`web/`) maintainer** →
[`10-Contributors/00 - Hub Contributors.md`](10-Contributors/00%20-%20Hub%20Contributors.md) — what you own, the mount
points that must survive a redesign, the open items raised against the current build.

**Understanding the design** →
[`00-Overview/01 - Briefing.md`](00-Overview/01%20-%20Briefing.md) →
[`01-Architecture/01 - Architecture.md`](01-Architecture/01%20-%20Architecture.md) →
the layer folders `02-`…`06-`.

## 📂 Structure

```
vault/
├─ START-HERE.md · Index.md · README.md      ← orientation
├─ Dashboard.md · Quick-Reference.md · Glossary.md · Conventions.md · AGENTS.md
├─ 00-Overview/        briefing, roadmap, decisions, corrections, demo scenes
├─ 01-Architecture/    layers, ownership, the EAS gap            (parts A1…)
├─ 02-Contracts/       one note per contract                     (parts C1…)
├─ 03-Frontend/        verifier page, learning surface           (parts FE1…)
├─ 04-Signer-Service/  document, lists, delegation, grading, payment (parts S1…)
├─ 05-Course-Content/  course data, manifests, grading authority  (parts K1…)
├─ 06-Spec-Research/   facts read from the raw specification       (parts R1…)
├─ 07-Backlog/         work left + Acceptance-Criteria/
├─ 08-Results/         evidence & limits + one summary per item
├─ 09-Testing/         one record per harness command
├─ 10-Contributors/    ownership, claims, Open-Items/
├─ Concepts/ · Module-Guides/ · Notes/ · Templates/ · scripts/
└─ .obsidian/          local config (not committed; see Conventions)
```

## ⚙️ Working in this vault

```powershell
# from vault/
powershell -ExecutionPolicy Bypass -File scripts\sync-vault.ps1    # regenerate _Auto-Index + guide stubs
powershell -ExecutionPolicy Bypass -File scripts\check-links.ps1   # target: Broken: 0
powershell -ExecutionPolicy Bypass -File scripts\new-note.ps1 -Title "Credential Hash" -Kind concept
```

Open **this folder** in Obsidian (`File → Open folder as vault`) for the graph and the Dataview
tables below. Reading it on GitHub works too — but `[[wikilinks]]` only resolve inside Obsidian,
which is why every entry point above is a plain markdown link.

## 🗺️ Every note (auto)

```dataview
LIST FROM "" WHERE file.name != "START-HERE" AND file.name != "_Auto-Index" SORT file.folder ASC, file.name ASC
```

## 🧩 Concept notes (auto)

```dataview
LIST FROM #concept SORT file.name ASC
```

---
*Folder created 19 Sep as five essays; restructured into the layered vault on 25 Sep 2026.
If anything here contradicts a command you just ran, this folder is wrong — fix it.*
