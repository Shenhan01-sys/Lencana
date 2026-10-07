import React from 'react'
import { Audio } from '@remotion/media'
import { Sequence, staticFile, useVideoConfig } from 'remotion'
import { cue, f, LINES, rel, SCENE, TOTAL, voDur, voFile, voStart } from '../lib/time'
import tl from '../data/timeline.json'

/**
 * Voiceover clips, the score ducked under the voice, and a cue sheet of sound effects tied to the same words
 * the pictures animate on (Motion-as-Code idea). SFX: rm/* = remotion.media library (no attribution needed,
 * licence per sound), kit/* = Motion-as-Code kit (approved by the builder 7 Oct; heard only, not redistributed).
 */
const PRESENCE: Float32Array = (() => {
  const a = new Float32Array(TOTAL + 1)
  for (const id of LINES) {
    const s = f(voStart(id)), e = f(voStart(id) + voDur(id))
    for (let i = Math.max(0, s - 8); i <= Math.min(TOTAL, e + 10); i++) {
      const v = i < s ? (i - (s - 8)) / 8 : i > e ? 1 - (i - e) / 10 : 1
      a[i] = Math.max(a[i], v)
    }
  }
  return a
})()
const duck = (fr: number) => {
  const v = PRESENCE[Math.max(0, Math.min(TOTAL, Math.round(fr)))] ?? 0
  const fadeIn = Math.min(1, fr / 10)
  // 7 Oct QA: VO −18.2 LUFS vs music ×0.20 −27.2 LUFS (9 dB) → ×0.15 under the voice (≈11.5 dB) for non-native listeners
  return fadeIn * (0.52 - 0.37 * v)
}

type Cue = { at: number, src: string, vol: number }
const k = (name: string) => `sfx/kit/${name}.mp3`
const rm = (name: string) => `sfx/rm/${name}.wav`

export const CUES: Cue[] = [
  // S1 — the problem (draft 5): file, edit, which one is edited, asking + waiting, everyone just trusts it
  { at: cue('s1', 'file.'), src: k('impact_slam_1'), vol: 0.5 },
  { at: cue('s1', 'Anyone') - 6, src: k('whoosh_fast_2'), vol: 0.35 },
  { at: cue('s1', 'edit') - 2, src: rm('mouse-click'), vol: 0.5 },
  { at: cue('s1', 'new'), src: k('typewriter_1'), vol: 0.42 },
  { at: cue('s1', 'new') + 7, src: k('typewriter_2'), vol: 0.38 },
  { at: cue('s1', 'name,'), src: k('ui_blip_1'), vol: 0.32 },
  { at: cue('s1', 'higher') - 1, src: rm('mouse-click'), vol: 0.45 },
  { at: cue('s1', 'score.'), src: k('key_click_1'), vol: 0.35 },
  { at: cue('s1', 'score.') + 4, src: k('key_click_2'), vol: 0.35 },
  { at: cue('s1', 'score.') + 2, src: k('ui_blip_2'), vol: 0.32 },
  { at: cue('s1', 'score.') + 8, src: k('enter_key_1'), vol: 0.3 },
  { at: cue('s1', 'score.') + 10, src: k('whoosh_soft_1'), vol: 0.35 },
  { at: cue('s1', 'fake') + 6, src: k('whoosh_fast_1'), vol: 0.3 },
  { at: cue('s1', 'fake') + 14, src: k('whoosh_fast_2'), vol: 0.3 },
  ...[0, 2, 4].map((i) => ({ at: cue('s1', 'real.') + 2 + i, src: k('ui_tick_1'), vol: 0.26 })),
  { at: cue('s1', 'real.') + 4, src: k('scan_sweep_1'), vol: 0.3 },
  { at: cue('s1', 'Checking') - 6, src: rm('whip'), vol: 0.4 },
  { at: cue('s1', 'asking'), src: k('ui_blip_2'), vol: 0.34 },
  { at: cue('s1', 'asking') + 2, src: k('spark_zip_1'), vol: 0.28 },
  { at: cue('s1', 'issuer…') + 8, src: k('ui_tick_1'), vol: 0.3 },
  { at: cue('s1', 'and') - 2, src: k('projector_run_1'), vol: 0.22 },
  ...[0, 4, 8, 12, 16].map((i) => ({ at: cue('s1', 'waiting.') + i, src: k('pen_tick_1'), vol: 0.22 })),
  { at: cue('s1', 'So') - 6, src: k('whoosh_soft_1'), vol: 0.38 },
  { at: cue('s1', 'most'), src: k('confirm_chime_1'), vol: 0.28 },
  { at: cue('s1', 'trust'), src: k('impact_slam_1'), vol: 0.55 },
  { at: cue('s1', 'it.', 1) + 12, src: k('stamp_1'), vol: 0.6 },
  { at: SCENE.s1.end - 9, src: k('falling_pieces_1'), vol: 0.5 },
  // S2 — the mark and the name
  { at: SCENE.s2.start - 2, src: k('reverse_suck_1'), vol: 0.45 },
  { at: SCENE.s2.start + 13, src: k('impact_slam_1'), vol: 0.55 },
  { at: cue('s2', 'check'), src: k('spark_zip_1'), vol: 0.3 },
  { at: cue('s2', 'without') + 4, src: k('whoosh_soft_1'), vol: 0.45 },
  // S3 — email, course, pay by signing, class, quiz graded by the server
  { at: SCENE.s3.start - 6, src: rm('whip'), vol: 0.4 },
  { at: cue('s3', 'email') + 6, src: k('whoosh_soft_1'), vol: 0.32 },
  { at: cue('s3', 'email') - 14, src: rm('mouse-click'), vol: 0.45 },
  { at: cue('s3', 'email') - 9, src: k('key_click_1'), vol: 0.3 },
  { at: cue('s3', 'email') - 2, src: k('key_click_2'), vol: 0.3 },
  { at: cue('s3', 'wallet') - 6, src: rm('mouse-click'), vol: 0.45 },
  { at: cue('s3', 'wallet') + 2, src: k('ui_blip_1'), vol: 0.35 },
  { at: rel('s3', 4.03) - 6, src: k('whoosh_fast_1'), vol: 0.45 },
  { at: cue('s3', 'Pick') + 2, src: rm('mouse-click'), vol: 0.45 },
  { at: cue('s3', 'Pick') + 4, src: k('ui_tick_1'), vol: 0.3 },
  { at: rel('s3', 6.04) - 6, src: k('whoosh_soft_1'), vol: 0.4 },
  { at: cue('s3', 'pay') - 2, src: rm('mouse-click'), vol: 0.45 },
  { at: cue('s3', 'signing'), src: k('pen_line_1'), vol: 0.4 },
  { at: cue('s3', 'gas'), src: k('confirm_chime_1'), vol: 0.3 },
  { at: rel('s3', 8.56) - 6, src: rm('whoosh'), vol: 0.4 },
  ...[0, 1, 2, 3].map((i) => ({ at: cue('s3', 'learn') + i * 6, src: k('pen_tick_1'), vol: 0.28 })),
  { at: rel('s3', 10.57) - 6, src: k('whoosh_fast_2'), vol: 0.4 },
  { at: cue('s3', 'graded') - 6, src: rm('switch'), vol: 0.35 },
  { at: cue('s3', 'server,') - 10, src: k('scan_sweep_1'), vol: 0.32 },
  { at: cue('s3', 'scores'), src: k('confirm_chime_1'), vol: 0.38 },
  { at: cue('s3', 'never'), src: k('zap_slash_1'), vol: 0.3 },
  // S4 — agents: identity, proposal, the stamp, the brain
  { at: SCENE.s4.start - 6, src: k('whoosh_soft_1'), vol: 0.38 },
  { at: cue('s4', 'Essays'), src: k('paper_slide_1'), vol: 0.45 },
  { at: cue('s4', 'on-chain'), src: k('spark_ignite_1'), vol: 0.32 },
  { at: rel('s4', 5.5) - 6, src: k('whoosh_fast_1'), vol: 0.42 },
  { at: cue('s4', 'score') - 2, src: k('ui_blip_2'), vol: 0.35 },
  { at: cue('s4', 'second'), src: k('ui_tick_1'), vol: 0.3 },
  { at: cue('s4', 'approves'), src: k('stamp_1'), vol: 0.75 },
  { at: cue('s4', 'approves') + 1, src: k('impact_small_1'), vol: 0.4 },
  { at: rel('s4', 12.85) - 6, src: rm('whoosh'), vol: 0.4 },
  { at: cue('s4', 'owners'), src: k('spark_zip_1'), vol: 0.28 },
  { at: cue('s4', 'model') + 4, src: k('ui_blip_1'), vol: 0.32 },
  { at: cue('s4', 'hired') - 4, src: k('confirm_chime_1'), vol: 0.28 },
  // S5 — certificate, anchor into the chain, the soulbound medal, LinkedIn
  { at: SCENE.s5.start - 6, src: rm('whip'), vol: 0.4 },
  // the certificate's own motion (starts 6 frames after the cut): crystal facets, the score rolling up, the pulse
  { at: SCENE.s5.start + 15, src: k('spark_sizzle_1'), vol: 0.22 },
  ...[0, 3, 7, 12, 18, 26].map((d) => ({ at: SCENE.s5.start + 6 + f(0.65) + d, src: k('ui_tick_1'), vol: 0.18 })),
  { at: SCENE.s5.start + 6 + f(1.95), src: k('spark_ignite_1'), vol: 0.3 },
  { at: rel('s5', 5.86) - 16, src: k('reverse_suck_1'), vol: 0.32 },
  { at: cue('s5', 'Pass,'), src: k('confirm_chime_1'), vol: 0.4 },
  { at: cue('s5', 'signed'), src: k('pen_line_1'), vol: 0.35 },
  { at: cue('s5', 'anchored'), src: k('scan_sweep_1'), vol: 0.34 },
  { at: cue('s5', 'Chain.') - 4, src: k('impact_small_2'), vol: 0.42 },
  { at: cue('s5', 'Then') - 2, src: k('riser_1'), vol: 0.3 },
  { at: cue('s5', 'mint'), src: k('spark_ignite_1'), vol: 0.4 },
  { at: cue('s5', 'soulbound'), src: k('impact_slam_1'), vol: 0.58 },
  { at: cue('s5', 'badge') - 1, src: k('confirm_chime_1'), vol: 0.32 },
  { at: cue('s5', 'sell,'), src: k('zap_slash_1'), vol: 0.26 },
  { at: cue('s5', 'transfer') - 3, src: k('snip_1'), vol: 0.3 },
  { at: cue('s5', 'transfer') + 7, src: rm('switch'), vol: 0.4 },
  { at: cue('s5', 'burn'), src: k('zap_slash_1'), vol: 0.26 },
  { at: cue('s5', 'only'), src: k('confirm_chime_1'), vol: 0.38 },
  { at: rel('s5', 13.86) - 6, src: rm('whoosh'), vol: 0.4 },
  { at: cue('s5', 'LinkedIn') - 2, src: rm('mouse-click'), vol: 0.45 },
  // S6 — one link, no wallet, no login, valid / revoked, the validator
  { at: SCENE.s6.start - 6, src: k('whoosh_soft_1'), vol: 0.38 },
  { at: SCENE.s6.start + 4, src: k('typewriter_1'), vol: 0.28 },
  { at: cue('s6', 'link'), src: k('ui_blip_2'), vol: 0.35 },
  { at: cue('s6', 'no') - 2, src: k('impact_slam_1'), vol: 0.58 },
  { at: cue('s6', 'no', 1) - 3, src: k('impact_slam_1'), vol: 0.58 },
  { at: rel('s6', 5.182) - 6, src: k('whoosh_fast_1'), vol: 0.42 },
  { at: rel('s6', 5.182) + 4, src: k('confirm_chime_1'), vol: 0.35 },
  { at: cue('s6', 'revoked,') - 6, src: rm('whip'), vol: 0.4 },
  { at: cue('s6', 'revoked,') + 6, src: k('zap_slash_1'), vol: 0.3 },
  { at: rel('s6', 7.952) - 6, src: k('whoosh_soft_1'), vol: 0.4 },
  ...[0, 1, 2, 3].map((i) => ({ at: cue('s6', 'Badges') - 10 + i * 5, src: k('ui_tick_1'), vol: 0.28 })),
  { at: cue('s6', 'zero'), src: k('confirm_chime_1'), vol: 0.45 },
  // S7 — the belt and the money
  { at: SCENE.s7.start - 6, src: rm('whip'), vol: 0.4 },
  { at: SCENE.s7.start + 6, src: k('projector_run_1'), vol: 0.22 },
  { at: cue('s7', 'pipeline') - 10, src: k('whoosh_soft_1'), vol: 0.3 },
  { at: cue('s7', 'enrollment'), src: k('ui_tick_1'), vol: 0.3 },
  { at: cue('s7', 'payout,'), src: k('confirm_chime_1'), vol: 0.3 },
  { at: rel('s7', 5.302) - 6, src: k('whoosh_fast_2'), vol: 0.4 },
  { at: cue('s7', 'settled'), src: k('impact_small_2'), vol: 0.38 },
  // S8 — the name, three slams, live
  { at: cue('s8', 'Lencana.') - 24, src: k('reverse_suck_1'), vol: 0.4 },
  { at: cue('s8', 'Lencana.') - 6, src: k('impact_slam_1'), vol: 0.5 },
  { at: cue('s8', 'Learn,') - 1, src: k('impact_slam_1'), vol: 0.5 },
  { at: cue('s8', 'test,') - 2, src: k('impact_slam_1'), vol: 0.5 },
  { at: cue('s8', 'prove') - 3, src: k('impact_slam_1'), vol: 0.55 },
  { at: cue('s8', 'Live') - 4, src: k('whoosh_soft_1'), vol: 0.35 },
  { at: cue('s8', 'Live'), src: k('spark_ignite_1'), vol: 0.32 },
]

export const Soundtrack: React.FC<{ music?: string }> = ({ music = tl.music }) => {
  const { fps } = useVideoConfig()
  return (
    <>
      <Audio name="Score" src={staticFile(music)} volume={duck} />
      {LINES.map((id) => (
        <Sequence key={id} name={`VO ${id}`} from={f(voStart(id))} durationInFrames={f(voDur(id)) + 6} layout="none">
          <Audio src={staticFile(voFile(id))} volume={1} />
        </Sequence>
      ))}
      {CUES.map((c, i) => (
        <Sequence key={i} name={`SFX ${c.src}`} from={Math.max(0, c.at)} durationInFrames={fps * 3} layout="none">
          <Audio src={staticFile(c.src)} volume={c.vol} />
        </Sequence>
      ))}
    </>
  )
}
