---
tags: [module, 05]
---

# 05 - Course Content

**Purpose:** Courses as reviewed data: content an auditor can check, the issuer's own rubric, and the size of the learning surface printed from the data instead of typed into a document.

## Files in this module
- [[05-Course-Content/01 - Course Content]]
- [[05-Course-Content/K1 - The content model]]
- [[05-Course-Content/K2 - The issuer manifest and rubricHash]]
- [[05-Course-Content/K4 - Scoring without the platform deciding]]

## Key facts
- `cd web && npx tsx scripts/inventory.ts` prints the counts; `auditCourse` refuses what would break a claim ([[05-Course-Content/K1 - The content model]]).
- `rubricHash` is policy only, so material edits do not silently re-grade a cohort ([[05-Course-Content/K2 - The issuer manifest and rubricHash]]).
- Nothing in the course tree computes a grade for us: [[05-Course-Content/K4 - Scoring without the platform deciding]].
