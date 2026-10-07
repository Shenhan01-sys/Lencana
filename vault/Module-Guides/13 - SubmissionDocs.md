---
tags: [module, 13]
---

# 13 - SubmissionDocs

**Purpose:** The builder's own paste-ready texts for the hackathon form (plain `.txt`, one per form field), plus agent-reviewed revisions next to them — the claims they may make live in [[00-Overview/08 - Submission Copy]].

## Files in this module
- `vault/13-SubmissionDocs/TagLine-OneSentence.txt` — tagline (same as 08 - Submission Copy)
- `vault/13-SubmissionDocs/Problem.txt` → reviewed: `Problem-revisi.txt`
- `vault/13-SubmissionDocs/Solution.txt` → reviewed: `Solution-revisi.txt`
- `vault/13-SubmissionDocs/Project-Detail-Maks2000chars.txt` → reviewed: `Project-Detail-revisi.txt` (field limit 5,600) and `Project-Detail-ringkas-2000.txt` (if the field is really 2,000)

## Key facts
- Written by the builder on 7 Oct; the originals are never overwritten by an agent — corrections go into `*-revisi.txt` files, and the findings table is in [[00-Overview/08 - Submission Copy]] ("Tinjauan 7 Okt").
- Field limits measured from the form: Problem and Solution 2,000 characters, Project Detail 5,600 (corrected 27 Sep). Count with `[...text].length`, not bytes.
- Every sentence is held to [[10-Contributors/Claims-Cheat-Sheet]]: no "cannot be altered/changed" (the tagline's word is "quietly"), current contract addresses only (`web/src/config.ts`), the essay score is a proposal until a second, publisher-appointed reviewer approves it.
- Filling and sending the form is a human action (B64, AGENTS rule 16): agents review on request only.
