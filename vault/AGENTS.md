# Lencana vault — instructions for AI agents working in this folder

This vault is the **documentation layer** for Lencana. The source of truth for behaviour is the code
next to it (`../contracts/`, `../web/`, `../signer/`, `../script/`, `../test/`) — read it, do not
edit it from here, and do not answer from memory when a file is one `Read` away.

## Mandatory for every change you make in this vault

1. **Never state a number you have not just produced.** Test counts, check counts, gas, addresses,
   page counts, dates. Run the command (or read the run log inside `app/`) and cite it in the note.
   If you cannot run it, write `_unmeasured_` next to the figure instead of deleting the row. This is
   the single rule that most protects the submission: judges re-run things.
2. **Per-item documents use hub + one file per item** (acceptance criteria, test records, executive
   summaries, open items for the frontend maintainer). A hub holds the **document map** — one row per
   item. Do not pile several items into one file: it is what makes context get lost mid-task.
3. **Every per-item file starts with a map line** to its siblings
   (`**Backlog:** … · **AC:** … · **Testing:** … · **Summary:** …`) and links both ways. Add the map
   row in the hub in the same edit.
4. **Reuse stable IDs.** Decisions `D#`, backlog `P#`, open items `OI-#`, criteria `P#<letter>#<n>`.
   New ID → update the map, or it is a defect.
5. **Cite code as `path/file.ext:line`** (inline code, repo-relative). Wikilinks are for `.md` only.
   Absolute local paths (`file:///C:/…`) are forbidden — they are broken for every other reader.
6. **Claims must be reproducible from inside `app/`.** If the only proof lives outside this
   repository, the claim does not belong here. Check anything you write about what the product
   "does" against [[10-Contributors/Claims-Cheat-Sheet]] — several phrasings are deliberately
   forbidden because they would overstate what was measured.
7. After editing: `powershell -ExecutionPolicy Bypass -File scripts\sync-vault.ps1` and then
   `scripts\check-links.ps1` → **`Broken: 0`**. Module-Guide stubs created by the script must be
   filled, not left as `TODO`.
8. Superseded files: move the content and delete the file in one commit, or keep it under an
   `⚠️ ARCHIVED — see <note>` banner. Corrections stay visible; do not tidy away a wrong claim that
   was already pushed.
9. Language: **English** in here (see [[Conventions]]); UI copy in `web/` is Indonesian-first.
10. Frontend files (`../web/index.html`, `../web/src/main.ts`, `render.ts`, `style.css`, `i18n.ts`)
    belong to the frontend maintainer. Read [[10-Contributors/00 - Hub Contributors]] before
    touching them; if you must, keep the mount points and run typecheck + build + probe afterwards.

Full rules: [[Conventions]] · Orientation: [[START-HERE]] · Document maps:
[[07-Backlog/Acceptance-Criteria/00 - Hub Acceptance Criteria]] · [[09-Testing/00 - Hub Testing]] ·
[[08-Results/00 - Hub Results]] · [[10-Contributors/Open-Items/00 - Hub Open Items]]
