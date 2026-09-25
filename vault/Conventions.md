---
tags: [reference]
---

# Conventions

Writing and maintenance rules for **this** vault. Adapted from `ObsidianGuides` (`Conventions.md`,
`02-Setup/Folder-Structure.md`, `05-Workflows/Granular-Layering.md`) to fit a code repository whose
readers are judges, a frontend maintainer, and AI agents.

## The two rules that outrank the rest

1. **A number is only allowed here if a command printed it.** Every "passed", count, address, gas
   figure or date must be reproducible by a command run **from inside this repository** (`app/`).
   Where a page and a fresh run disagree, **the run wins** — fix the page, do not quote the page.
   Anything that can only be proven from outside `app/` (a private research folder, another
   workspace, a person's machine) is not a claim of this product and does not go in here.
2. **No claim in here may overstate what was measured.** `10-Contributors/Claims-Cheat-Sheet.md`
   lists the sentences we forbid ourselves and the honest replacement for each. When you write UI
   copy, a README line, or a slide, check it against that sheet.

## Source layer vs guidance layer

- **Source = the code, and it is not edited from here**: `../contracts/`, `../web/`, `../signer/`,
  `../script/`, `../test/`, `../foundry.toml`. Quote it with a repo-relative path and a line number:
  `web/src/lms.ts:179`. Never an absolute path, never `file:///C:/…` — those break for every other
  reader on earth (a real bug we already have in `../FRONTEND_ITERATION.md`).
- **Guidance layer = everything in this folder**: hubs, part-notes, concept notes, per-item
  documents. Freely editable.
- The five numbered context files that used to sit loose in this folder are now folded into the
  module folders — see the map below.

| was | now |
|---|---|
| `01-briefing.md` | [[00-Overview/01 - Briefing]] |
| `02-architecture.md` | [[01-Architecture/01 - Architecture]] + parts `A1…` |
| `03-evidence-and-limits.md` | [[08-Results/00 - Hub Evidence and Limits]] + [[10-Contributors/Claims-Cheat-Sheet]] |
| `04-technical-reference.md` | [[06-Spec-Research/01 - Spec Research]] + parts `R1…` |
| `05-status-and-tasks.md` | [[07-Backlog/01 - Backlog]] + [[Notes/Status-2026-09-25]] |

## Structure

```
00-Overview/        what the product is, personas, demo scenes, roadmap, corrections
01-Architecture/    the layers and who owns each           (parts A1…)
02-Contracts/       one note per deployed contract         (parts C1…)
03-Frontend/        verifier page + learning surface       (parts FE1…)
04-Signer-Service/  credential document, lists, agent, payment (parts S1…)
05-Course-Content/  course data, manifests, grading authority (parts K1…)
06-Spec-Research/   facts read from the raw specifications  (parts R1…)
07-Backlog/         work left, risks, deferred decisions    + Acceptance-Criteria/
08-Results/         one executive summary per finished item + the evidence/limits hub
09-Testing/         one note per harness command, with its real output
10-Contributors/    who owns what, open items for the frontend maintainer + Open-Items/
Concepts/           atomic concept notes (#concept)
Module-Guides/      one guide per NN- folder (auto-stubbed by sync-vault.ps1, must be filled)
Notes/              dated session notes, status snapshots
Templates/          the note skeletons used above
scripts/            sync-vault.ps1, check-links.ps1, new-note.ps1
```

## Naming

- **Module folder**: `NN-Name` (two digits + `-`) — `sync-vault.ps1` indexes on `^\d{2}-`.
- **Hub / MOC**: `NN - Title.md` with spaces around the `-`.
- **Part note**: `<Prefix><k> - Title.md`, `k` sequential and unique **per group** (never reset per
  file). Prefixes: `A` architecture · `C` contracts · `FE` frontend · `S` signer service ·
  `K` course content · `R` spec research · `T` testing · `AC-` acceptance criteria · `OI-` open item.
- **Forbidden characters in file names**: `: \ / | ? * " < >`. No emoji in file names (links and git
  break); emoji in headings are fine.
- **Stable IDs are currency.** Decisions (`D34`…), backlog items (`P1`…), open items (`OI-1`…),
  criteria (`P3a#2`) are reused verbatim in the backlog, AC, testing and summary notes. Creating a
  new ID without adding a row to the document map is a defect.

## Per-item documents (the pattern that stops context confusion)

Anything that grows **one entry per item** (an acceptance-criteria set, a test record, an
executive summary, an open item for a contributor) **must** be:

- a folder (or sub-folder) + a **hub** file holding a **document map** — one row per item, columns =
  backlog ↔ plan ↔ AC ↔ testing ↔ summary — and
- **one file per item**, never one file holding many items.

Every per-item file opens with a **map line** pointing at its siblings, e.g.:

```
**Backlog:** [[07-Backlog/01 - Backlog]] entry P3 · **AC:** [[AC-P3 - Paid verification over x402]] · **Testing:** [[T6 - x402]] · **Summary:** [[P3 - Executive Summary]]
```

Model examples in this vault: `07-Backlog/Acceptance-Criteria/`, `09-Testing/`, `10-Contributors/Open-Items/`.

## Format of a note

- Frontmatter with `tags` (category + quoted identity, e.g. `tags: [contract, "C3"]`).
- Part notes carry: `**Part of:**`, `**Source:**`, `**Summary:**`, `**Key points:**`, `**Detail:**`.
- Links to other notes use `[[wikilink]]`; links to code, config or build output use inline code
  paths; links to external URLs use normal markdown.
- Tables over prose when the content is a list of things with attributes (commands, addresses,
  verdicts, criteria).
- A note ends with `**Related:**` links.
- **Language: English.** This folder ships inside the product repository and is read by judges and by
  contributors who are not Indonesian. The *product UI* is Indonesian-first with an EN switch — that
  exception belongs to `web/`, not to these notes. Keep technical terms in English either way.

## Maintenance

- After adding or renaming notes: `scripts\sync-vault.ps1` then `scripts\check-links.ps1` →
  target **`Broken: 0`**.
- Never edit `_Auto-Index.md` by hand; it is regenerated.
- Fill Module-Guide stubs — a `TODO` left in a generated guide is a hole in the map.
- Temporary scratch goes in `Notes/`, prefixed with its date (`Status-2026-09-25.md`,
  `Session-2026-09-26-Public-URL.md`).
- When a document is superseded, do not silently delete it: either move the content and delete the
  file in the same commit, or keep it with an `⚠️ ARCHIVED — see <new note>` banner at the top.
- Corrections stay visible. Where a previous claim was wrong, write what was wrong and what proved
  it (see [[00-Overview/04 - Corrections]]) — never quietly rewrite history.

## Obsidian

- Open **this folder** (`vault/`) as a vault: `File → Open folder as vault`.
- Dataview queries in [[Dashboard]] need the Dataview plugin; it is bundled locally but
  **not committed** (`.obsidian/` is in `../.gitignore`), so a fresh clone recreates it by copying
  `ObsidianGuides/_assets/.obsidian-template/` → `vault/.obsidian/`.
- Edit `.obsidian/*` only while Obsidian is closed; never hand-edit `workspace.json`.

See: [[Glossary]] · [[Quick-Reference]] · [[START-HERE]] · [[AGENTS]]
