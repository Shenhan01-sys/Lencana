import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { Mark, Wordmark } from '../components/Logo'
import { Chip, Svg, usePop, useRamp } from '../components/Bits'
import { drawObject, ORDER, STATION_LABEL, SUMMARY } from '../lib/objects'
import qr from '../data/qr.json'
import { cue } from '../lib/time'
import { SceneShell, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S8 — "Lencana. Learn, test, and prove it. Live now on BNB Chain testnet." The belt's objects line up under the name. */
export const S8Close: React.FC = () => {
  const { frame, at, cutIn, len } = useScene('s8')
  const tName = at(cue('s8', 'Lencana.')), tLearn = at(cue('s8', 'Learn,')), tTest = at(cue('s8', 'test,')), tProve = at(cue('s8', 'prove'))
  const tLive = at(cue('s8', 'Live'))
  const mark = usePop(tName - 8, 13)
  const name = useRamp(tName - 2, tName + 16)
  const w1 = usePop(tLearn, 14), w2 = usePop(tTest, 14), w3 = usePop(tProve - 2, 12)
  const live = usePop(tLive, 14)
  const fadeOut = interpolate(frame, [len - 14, len], [1, 0], clamp)
  const drift = interpolate(frame, [cutIn, len], [0, -40])
  const up = interpolate(frame, [tLive - 6, tLive + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })

  return (
    <SceneShell id="s8" exit="none">
      <Backdrop glowAt={[50, 38]} />
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {/* lockup */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 150 - up * 40, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36 }}>
          <div style={{ opacity: mark, transform: `scale(${0.5 + 0.5 * mark})` }}><Mark size={170} reveal={interpolate(frame, [tName - 8, tName + 10], [0, 1], clamp)} /></div>
          <Wordmark size={150} p={name} />
        </div>
        {/* tagline */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 380 - up * 60, display: 'flex', justifyContent: 'center', gap: 26, fontFamily: SANS, fontWeight: 800, fontSize: 92, letterSpacing: '-0.03em' }}>
          {([['Learn,', w1, C.text], ['test,', w2, C.text], ['and prove it.', w3, C.gold]] as const).map(([t, p, col]) => (
            <span key={t} style={{ color: col, opacity: p, transform: `translateY(${(1 - p) * 50}px) scale(${0.9 + 0.1 * p})`, display: 'inline-block' }}>{t}</span>
          ))}
        </div>
        {/* live: url + qr */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 520, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, opacity: live, transform: `translateY(${(1 - live) * 40}px)` }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 50, color: C.text }}>lencana-psi.vercel.app</div>
            <div style={{ position: 'relative', height: 60, width: 640 }}>
              <Chip at={tLive + 6} icon="bolt" color={C.gold} solid size={26} style={{ left: 0, top: 0 }}>Live now on BNB Chain testnet</Chip>
            </div>
          </div>
          <div style={{ width: 176, height: 176, borderRadius: 18, overflow: 'hidden', boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 40px ${C.gold}33` }} dangerouslySetInnerHTML={{ __html: qr.svg.replace('<svg', '<svg width="176" height="176"') }} />
        </div>
        {/* the belt's objects, same drawings and numbers as the Admin page */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 742, display: 'flex', justifyContent: 'center', gap: 34, transform: `translateX(${drift}px)` }}>
          {ORDER.map((id, i) => {
            const p = interpolate(frame, [cutIn + i * 3, cutIn + 16 + i * 3], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
            const from = i < 3 ? -900 : 900
            return (
              <div key={id} style={{ width: 132, textAlign: 'center', opacity: p, transform: `translateX(${(1 - p) * from}px)` }}>
                <Svg markup={drawObject(id)} vb="0 0 180 190" w={132} h={139} />
                <div style={{ fontFamily: MONO, fontSize: 15, color: C.mute, marginTop: 2 }}>{STATION_LABEL[id].big(SUMMARY)} · {STATION_LABEL[id].title.toLowerCase()}</div>
              </div>
            )
          })}
        </div>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 742 + 166, height: 6, background: `repeating-linear-gradient(90deg, ${C.line2} 0 14px, transparent 14px 28px)`, backgroundPosition: `${-frame * 2}px 0`, opacity: 0.8 }} />
      </AbsoluteFill>
    </SceneShell>
  )
}
