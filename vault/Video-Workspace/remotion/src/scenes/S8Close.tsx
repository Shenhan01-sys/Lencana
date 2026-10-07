import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { Mark, Wordmark } from '../components/Logo'
import { Chip, Svg, usePop, useRamp } from '../components/Bits'
import { FullBleed } from '../components/Stage'
import { drawObject, ORDER, STATION_LABEL, SUMMARY } from '../lib/objects'
import qr from '../data/qr.json'
import { cue } from '../lib/time'
import { SceneShell, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S8 — "Lencana. Learn, test, and prove it. Live now on BNB Chain testnet."
 *  v3 (ref5 ending): the name, three full-bleed slams on the three verbs, then the end card. */
export const S8Close: React.FC = () => {
  const { frame, at, len } = useScene('s8')
  const tName = at(cue('s8', 'Lencana.')), tLearn = at(cue('s8', 'Learn,')), tTest = at(cue('s8', 'test,')), tProve = at(cue('s8', 'prove'))
  const tLive = at(cue('s8', 'Live'))
  const endAt = tLive - 4
  const mark = usePop(tName - 8, 13)
  const name = useRamp(tName - 2, tName + 16)
  const card = usePop(endAt, 15)
  const live = usePop(tLive + 2, 14)
  const fadeOut = interpolate(frame, [len - 16, len], [1, 0], clamp)
  const push = interpolate(frame, [endAt, len], [1, 1.05], clamp)
  const ring = interpolate(frame, [tName - 8, tName + 22], [0, 1], clamp)
  const ending = frame >= endAt

  return (
    <SceneShell id="s8" exit="none">
      <Backdrop glowAt={[50, 36]} />
      <AbsoluteFill style={{ opacity: fadeOut, transform: `scale(${push})` }}>
        {/* the name */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: ending ? 120 : 360, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 36, transform: ending ? `scale(${0.85 + 0.15 * card})` : undefined }}>
          <div style={{ opacity: mark, transform: `scale(${0.5 + 0.5 * mark})` }}><Mark size={ending ? 150 : 190} reveal={interpolate(frame, [tName - 8, tName + 10], [0, 1], clamp)} /></div>
          <Wordmark size={ending ? 132 : 170} p={name} />
        </div>
        {ring > 0 && ring < 1 && !ending ? Array.from({ length: 20 }).map((_, k) => {
          const ang = (k / 20) * Math.PI * 2 - ring * 2
          const rr = 120 + 420 * ring
          return <div key={k} style={{ position: 'absolute', left: 960 + Math.cos(ang) * rr - 5, top: 455 + Math.sin(ang) * rr * 0.6 - 5, width: 10, height: 10, borderRadius: 10, background: C.gold, opacity: 1 - ring }} />
        }) : null}
        {ending ? (
          <>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 330, textAlign: 'center', fontFamily: SANS, fontWeight: 800, fontSize: 76, letterSpacing: '-0.03em', color: C.text, opacity: card, transform: `translateY(${(1 - card) * 30}px)` }}>
              Learn, test, <span style={{ color: C.gold }}>and prove it.</span>
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 470, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 40, opacity: live, transform: `translateY(${(1 - live) * 40}px)` }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 16 }}>
                <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 52, color: C.text }}>lencana-psi.vercel.app</div>
                <div style={{ position: 'relative', height: 60, width: 640 }}>
                  <Chip at={tLive + 6} icon="bolt" color={C.gold} solid size={26} style={{ left: 0, top: 0 }}>Live now on BNB Chain testnet</Chip>
                </div>
              </div>
              <div style={{ width: 186, height: 186, borderRadius: 18, overflow: 'hidden', boxShadow: `0 20px 50px rgba(0,0,0,0.6), 0 0 50px ${C.gold}44` }} dangerouslySetInnerHTML={{ __html: qr.svg.replace('<svg', '<svg width="186" height="186"') }} />
            </div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 712, display: 'flex', justifyContent: 'center', gap: 34, WebkitBoxReflect: 'below 4px linear-gradient(transparent 55%, rgba(255,255,255,0.18))' }}>
              {ORDER.map((id, i) => {
                const p = interpolate(frame, [endAt + i * 3, endAt + 16 + i * 3], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
                return (
                  <div key={id} style={{ width: 132, textAlign: 'center', opacity: p, transform: `translateY(${(1 - p) * 60}px)` }}>
                    <Svg markup={drawObject(id)} vb="0 0 180 190" w={132} h={139} />
                    <div style={{ fontFamily: MONO, fontSize: 15, color: C.mute, marginTop: 2 }}>{STATION_LABEL[id].big(SUMMARY)} · {STATION_LABEL[id].title.toLowerCase()}</div>
                  </div>
                )
              })}
            </div>
          </>
        ) : null}
      </AbsoluteFill>
      <FullBleed from={tLearn - 1} to={tTest - 2} bg={C.gold} color="#0b0e11" text="LEARN" dot="#0b0e11" size={300} />
      <FullBleed from={tTest - 2} to={tProve - 3} bg="#f3eee2" color="#0b0e11" text="TEST" dot={C.gold} size={300} />
      <FullBleed from={tProve - 3} to={endAt} bg={C.green} color="#0b0e11" text="PROVE IT" dot="#0b0e11" size={280} echo />
    </SceneShell>
  )
}
