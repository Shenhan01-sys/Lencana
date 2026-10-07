# Lencana — pitch video (B173, Remotion; 90 s planned, ~103 s since draft 5)

Motion graphics + real Lencana pages in 3D browser frames, English voiceover, captions and labels.
Plan, decisions and claim map: `../B173 - Rencana Video Pitch 90 detik.md` (vault). Workflow borrowed from the
Motion-as-Code kit: voiceover first → word timings → scenes find their words by content → render → sound.

## Pipeline (each step is a script; `public/` is regenerated and not in git)

| step | command | writes |
|---|---|---|
| voiceover (ElevenLabs `eleven_v4`, key read from `app/.env`) | `node scripts/vo.mjs [--only s3]` | `public/vo/*.mp3`, `src/data/vo.json` (word timings) |
| hear-check without ears (speech-to-text back) | `node scripts/vo-check.mjs` | report |
| score (ElevenLabs Music, sections = scene cuts) | `node scripts/music.mjs` | `public/music/score-a.mp3` |
| beat grid | `node scripts/beats.mjs` | `src/data/beats.json` |
| v3: lengthen the score by whole bars at a bar line (VO grew), then re-run the beat grid on it | `node scripts/splice-music.mjs public/music/score-a.mp3 public/music/score-b.mp3 50.15 2` then `node scripts/beats.mjs public/music/score-b.mp3` | `public/music/score-b.mp3` (`timeline.json` `music` picks the file), `src/data/beats.json` |
| captures of the real site (puppeteer, Chrome 154, 2×) | `CAPTURE_KEYS=<fixture key files> node scripts/capture.mjs [--only …]` | `public/captures/*` |
| Admin summary numbers | `ADMIN_KEYS=<file> node scripts/admin-summary.mjs <signer>` | `src/data/admin-summary.json` |
| QR of the live app | `node scripts/qr.mjs` | `src/data/qr.json` |
| alternative scores on the v3 cut (sections start on the slam words) | `node scripts/music-alt.mjs --style hype\|nusantara [--dry]` | `public/music/alt-<style>.mp3` + `.plan.json` |
| draft 5: the problem grew by 5 bars — repeat each score's own bar 2 five times (exact +10.02 s, ramp 0.6→1) | `node scripts/extend-intro.mjs public/music/score-b.mp3 public/music/score-b-long.mp3 2.049 5` (alt scores: bar start 2.044) | `public/music/*-long.mp3` |
| the certificate's own entrance motion, frame-exact at 2× (animations paused + seeked per frame, score count-up written with the page's formula) | `node scripts/capture.mjs --only certMotion` | `public/captures/cert-motion.mp4`, `cert-motion/f*.png`, `.json` (copy `clip` into `src/data/cert-motion.json`) |
| audit every highlight ring on its real capture (boxes live in `src/data/focus.json`, scenes read them via `box()`) | `node scripts/focus-audit.mjs [name,…]` | `out/focus-audit/<name>.png`, `sheet-N.png` |
| audition a score without re-rendering pictures | `npx remotion render LencanaPitch out/audio-x.wav --codec=wav --props='{"music":"music/alt-hype.mp3"}'`, then `ffmpeg -i out/draft.mp4 -i out/audio-x.wav -map 0:v -map 1:a -c:v copy -c:a pcm_s16le out/x-raw.mov` and master it | `out/` |
| stills for review | `node scripts/stills.mjs s=4.5,11.3` | `out/stills/` |
| render | `npx remotion render LencanaPitch out/draft.mp4 --crf=18 --gl=angle` | `out/` |
| draft 6: squash a score's beat-locked high-band crackle (split > 5 kHz, fast compressor, low-pass 12 kHz; lossless) | `node scripts/soften-music.mjs public/music/alt-hype-long.mp3 public/music/alt-hype-long-soft.wav` | `public/music/*-soft.wav` |
| master (−14 LUFS, ≤ −1.5 dBTP); **refuses an input that already clips** (peak ≥ −0.5 dBFS) | `node scripts/master.mjs out/draft.mp4 out/lencana-pitch.mp4` | `out/` |
| gate (AC-B173 #1 #3 #4 #7 #8) | `node scripts/qa.mjs out/lencana-pitch.mp4` | report |

Draft 6 (7 Oct): the builder picked the hype score; `music` = `alt-hype-long-soft.wav`; the whole mix is scaled by
`MIX = 0.6` in `src/audio/Soundtrack.tsx` (draft 5 clipped at 6 impact slams). `out/lencana-pitch-draft-6.mp4`, QA green.
Draft 5 (7 Oct): the problem section is 14.3 s of illustration (S1), the certificate plays its own motion under a hero
camera (S5), all highlight rings audited, ~103 s. Shot cuts inside scenes are written relative to their scene start
(`rel()` in `src/lib/time.ts`), so moving a scene moves its shots. Default score: `music/score-b-long.mp3` (A);
B/C long versions are auditioned the same way as in draft 4.
Draft 4 (7 Oct): real 3D soulbound coin; three score versions on the same picture — `out/lencana-pitch-draft-4.mp4`
(A, `score-b`), `…-draft-4-hype.mp4` (B), `…-draft-4-nusantara.mp4` (C), all QA green (T97 §0a). The builder picks
one; then set `music` in `src/data/timeline.json` to it so a plain render uses it.
Draft 3 (v3, 7 Oct): `out/lencana-pitch-draft-3.mp4` — 93.1 s, QA green (T97 §0). Full-screen colour blocks and the gold
wipe are bounded by gate #8: keep a wipe's covered area moving at an even rate (`CircleWipe` in `src/components/Stage.tsx`)
and at most two hard colour cuts per second.

Sound effects: `public/sfx/rm/` from remotion.media (no attribution needed, licence per sound) and
`public/sfx/kit/` from the Motion-as-Code kit (builder's go-ahead 7 Oct; heard only, never redistributed).

Remotion licence: free for individuals and organisations of up to 3 people (`LICENSE.md` of Remotion).
