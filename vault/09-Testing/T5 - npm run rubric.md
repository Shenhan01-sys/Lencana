---
tags: [testing, "T5"]
command: npx tsx scripts/rubric-check.ts
measured: 2026-09-25
result: 17 checks / 0 failed
---

# T5 - npm run rubric

**Hub:** [[09-Testing/00 - Hub Testing]] · **Backlog:** [[07-Backlog/01 - Backlog]] P4

## Command

```powershell
cd app/web
npx tsx scripts/rubric-check.ts        # also: npm run rubric
```

## Result — 2026-09-25 (verbatim, all 17)

```
  ok   kuis/essai dihitung dari lesson, dan bukan nol -> 4/1
  ok   tanpa bukti = BELUM_LENGKAP, total null -> BELUM_LENGKAP (kuis=—×40% esai=—×40% praktik=—×20%) · rubrik 2a45d0d00bc4
  ok   ia menyebut semua yang kurang -> kuis: 0/4 dikerjakan | esai: belum ada yang menilai (seam judge kosong) | praktik: belum dikerjakan
  ok   total 88 dan LULUS -> LULUS 88/70 (kuis=80×40% esai=90×40% praktik=100×20%) · rubrik 2a45d0d00bc4
  ok   total 36 dan TIDAK_LULUS -> TIDAK_LULUS 36/70 (kuis=20×40% esai=20×40% praktik=100×20%) · rubrik 2a45d0d00bc4
  ok   69.6 dibulatkan ke 70 -> LULUS pada ambang 70 -> LULUS 70/70 (…)
  ok   68.8 menjadi 69 -> TIDAK_LULUS -> TIDAK_LULUS 69/70 (…)
  ok   4 kuis, baru 2 dikerjakan -> BELUM_LENGKAP, bukan nilai sebagian -> BELUM_LENGKAP (…)
  ok   esai kosong memblokir walau yang lain 100 -> BELUM_LENGKAP (kuis=100×40% esai=—×40% praktik=100×20%) (…)
  ok   bobot != 100 -> BELUM_LENGKAP dengan sebab yang menyebut manifest -> BELUM_LENGKAP (… kuis=100×40% esai=100×30% …) · rubrik 386bd6c33ff0
  ok   canonical policy stabil
  ok   rubricHash 32 byte -> 0x2a45d0d00bc46f3d
  ok   rubrik dijumlah-ubah (total sama, komposisi beda) = hash BERUBAH -> 0x17bb1eaefc995a9b vs 0x2a45d0d00bc46f3d
  ok   perbaiki typo materi TIDAK mengubah rubricHash
  ok   tapi mengubah manifestHash — materi ikut berkomitmen, terpisah dari kebijakan
  ok   susunan kunci berbeda = hash SAMA
  ok   kunci jawaban diubah = rubricHash BERUBAH
HIJAU — 17 pemeriksaan, 0 gagal
```

## What the two boundary cases are for

`69.6 → 70 → LULUS` and `68.8 → 69 → TIDAK_LULUS` exist because a pass mark that is only printed is
decoration: before this harness the threshold was display text with no code comparing anything to it
([[00-Overview/03 - Decisions]] D37).

## What this does NOT prove

- It does not prove the policy is *fair* — the demo issuer's rubric was written by us because no real
  institution signed one before the deadline. That limit is on the forbidden-claims sheet
  ([[10-Contributors/Claims-Cheat-Sheet]]).
- It does not score an essay: essay scores are **inputs** here. Model scoring is
  [[T11 - npm run judge]].
- `rubricHash` is the *policy* hash. It is not a hash of the learner's work, and not a certification.

**Related:** [[K2 - The issuer manifest and rubricHash]] · [[K4 - Scoring without the platform deciding]] · [[Concepts/rubricHash and manifestHash]]
