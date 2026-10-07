# Lencana — 90-second pitch video (B173, Remotion)

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
| stills for review | `node scripts/stills.mjs s=4.5,11.3` | `out/stills/` |
| render | `npx remotion render LencanaPitch out/draft.mp4 --crf=18 --gl=angle` | `out/` |
| master (−14 LUFS, ≤ −1.5 dBTP) | `node scripts/master.mjs out/draft.mp4 out/lencana-pitch.mp4` | `out/` |
| gate (AC-B173 #1 #3 #4 #7 #8) | `node scripts/qa.mjs out/lencana-pitch.mp4` | report |

Draft 3 (v3, 7 Oct): `out/lencana-pitch-draft-3.mp4` — 93.1 s, QA green (T97 §0). Full-screen colour blocks and the gold
wipe are bounded by gate #8: keep a wipe's covered area moving at an even rate (`CircleWipe` in `src/components/Stage.tsx`)
and at most two hard colour cuts per second.

Sound effects: `public/sfx/rm/` from remotion.media (no attribution needed, licence per sound) and
`public/sfx/kit/` from the Motion-as-Code kit (builder's go-ahead 7 Oct; heard only, never redistributed).

Remotion licence: free for individuals and organisations of up to 3 people (`LICENSE.md` of Remotion).
