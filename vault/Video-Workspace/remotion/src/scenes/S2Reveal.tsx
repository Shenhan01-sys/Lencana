import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame } from '../components/BrowserFrame'
import { Mark, Wordmark } from '../components/Logo'
import { usePop, useRamp } from '../components/Bits'
import { cue } from '../lib/time'
import { SceneShell, SHARDS, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S2 — "Meet Lencana — learning credentials anyone can check for themselves, without taking our word for it." */
export const S2Reveal: React.FC = () => {
  const { frame, at, cutIn } = useScene('s2')
  const tMeet = at(cue('s2', 'Meet'))
  const tName = at(cue('s2', 'Lencana'))
  const tLearn = at(cue('s2', 'learning'))
  const tAnyone = at(cue('s2', 'anyone'))
  const tCheck = at(cue('s2', 'check'))
  const tWithout = at(cue('s2', 'without'))

  // shards fly back in and become the mark
  const conv = interpolate(frame, [cutIn, cutIn + 16], [0, 1], { ...clamp, easing: Easing.in(Easing.cubic) })
  const markIn = usePop(cutIn + 13, 12)
  const ring = interpolate(frame, [cutIn + 13, cutIn + 40], [0, 1], clamp)
  const lockUp = interpolate(frame, [tLearn - 4, tLearn + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const leave = interpolate(frame, [tWithout, tWithout + 22], [0, 1], { ...clamp, easing: Easing.bezier(0.6, 0, 0.2, 1) })
  const nameP = useRamp(tName - 2, tName + 16)
  const lineA = usePop(tLearn, 16)
  const lineB = usePop(tAnyone, 16)
  const under = useRamp(tCheck, tCheck + 12)
  const site = useRamp(tWithout + 4, tWithout + 40, Easing.bezier(0.16, 1, 0.3, 1))
  const push = interpolate(frame, [tWithout + 40, tWithout + 90], [0, 1], clamp)

  const markSize = 200 - 60 * lockUp
  const lockX = 960, lockY = interpolate(lockUp, [0, 1], [430, 250]) - leave * 420
  if (frame < cutIn) return null // the S1 shards own the frames before the cut
  return (
    <SceneShell id="s2" enter="none">
      <Backdrop glowAt={[50, 40]} />
      {conv < 1 ? SHARDS.map((s, i) => {
        const tx = (s.x0 + s.dx) * (1 - conv) + (960 - s.tw / 2) * conv
        const ty = (s.y0 + s.dy) * (1 - conv) + (430 - s.th / 2) * conv
        return <div key={i} style={{ position: 'absolute', left: 0, top: 0, width: s.tw - 2, height: s.th - 2, background: conv > 0.6 ? C.gold : '#f3eee2', border: '1px solid #c5b08a', transform: `translate(${tx}px, ${ty}px) rotate(${s.rot * (1 - conv)}deg) scale(${0.65 - 0.5 * conv})`, opacity: 1 - conv * 0.6 }} />
      }) : null}
      <div style={{ position: 'absolute', left: lockX - 300, top: lockY - 300, width: 600, height: 600, borderRadius: 600, border: `3px solid ${C.gold}`, opacity: (1 - ring) * 0.8 * (ring > 0 ? 1 : 0), transform: `scale(${0.3 + ring * 1.2})` }} />
      <AbsoluteFill style={{ opacity: 1 - leave }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: lockY - markSize / 2, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34 * (0.5 + nameP * 0.5) }}>
          <div style={{ transform: `scale(${0.4 + 0.6 * markIn})`, opacity: markIn }}><Mark size={markSize} reveal={interpolate(frame, [cutIn + 12, tMeet + 6], [0.2, 1], clamp)} /></div>
          <div style={{ width: (580 - 170 * lockUp) * nameP, overflow: 'visible' }}><Wordmark size={164 - 48 * lockUp} p={nameP} /></div>
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 420 - leave * 420, textAlign: 'center', fontFamily: SANS, fontWeight: 800, letterSpacing: '-0.03em' }}>
          <div style={{ fontSize: 92, color: C.text, opacity: lineA, transform: `translateY(${(1 - lineA) * 40}px)` }}>Learning credentials</div>
          <div style={{ fontSize: 92, color: C.text, opacity: lineB, transform: `translateY(${(1 - lineB) * 40}px)`, marginTop: 6 }}>
            anyone can{' '}
            <span style={{ position: 'relative', color: C.gold }}>
              check
              <span style={{ position: 'absolute', left: 0, right: 0, bottom: 4, height: 8, borderRadius: 8, background: C.gold, transform: `scaleX(${under})`, transformOrigin: '0 50%' }} />
            </span>{' '}for themselves.
          </div>
        </div>
      </AbsoluteFill>
      {site > 0 ? (
        <BrowserFrame src="captures/landing.png" url="/#/" width={1280} x={320} y={interpolate(site, [0, 1], [900, 70]) - push * 20}
          rotX={interpolate(site, [0, 1], [32, 7])} rotY={interpolate(site, [0, 1], [-14, -5]) + push * 4} scale={0.96 + push * 0.06} opacity={Math.min(1, site * 1.6)} />
      ) : null}
    </SceneShell>
  )
}
