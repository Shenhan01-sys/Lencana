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

Everything above is live on the **public BSC testnet (chain 97)** and each line has a command inside
this repository that re-runs it.

## ⏳ Position

| | |
|---|---|
| Today | **25 September 2026** |
| Submission deadline | **30 September 2026, 23:59 WIB** — **5 days left** |
| Repository | `github.com/Shenhan01-sys/Lencana` (public) |
| Chain | BSC **testnet 97**. Nothing on mainnet, by choice: testnet satisfies the rules |
| On-chain layer | 4 contracts deployed · **97 Foundry tests pass / 0 fail** against a fork of 97 (re-run 25 Sep) → [`09-Testing/`](09-Testing/) |
| Honest limits | [`10-Contributors/Claims-Cheat-Sheet.md`](10-Contributors/Claims-Cheat-Sheet.md) — **read this before writing any claim**, including UI copy |

## 🚀 Start here, depending on who you are

**Judging / reviewing** →
1. [`08-Results/01 - Evidence and Limits.md`](08-Results/01%20-%20Evidence%20and%20Limits.md) — what is proven, what is not
2. [`09-Testing/00 - Hub Testing.md`](09-Testing/00%20-%20Hub%20Testing.md) — every number with the command that printed it
3. [`00-Overview/05 - Demo Scenes.md`](00-Overview/05%20-%20Demo%20Scenes.md) — the four-scene walkthrough

**Continuing the work (human or agent)** →
1. [`07-Backlog/01 - Backlog.md`](07-Backlog/01%20-%20Backlog.md) — what is left and what blocks it
2. [`07-Backlog/02 - Plan to the Deadline.md`](07-Backlog/02%20-%20Plan%20to%20the%20Deadline.md) — day by day, 25→30 Sep
3. [`Quick-Reference.md`](Quick-Reference.md) — commands, addresses, env names, one place
4. [`AGENTS.md`](AGENTS.md) — the rules that keep this folder trustworthy if you are an agent

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
