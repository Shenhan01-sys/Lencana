import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { Cursor } from '../components/Cursor'
import { Icon, usePop } from '../components/Bits'
import { cue, SCENE } from '../lib/time'
import { SceneShell, SHARDS, TILE, useScene } from './shell'

/** S1 — "A certificate is just a file. Anyone can edit it." A generic PDF certificate gets its grade retyped, then breaks. */
const Paper: React.FC<{ grade: string, sel: number }> = ({ grade, sel }) => (
  <div style={{ width: TILE.w, height: TILE.h, background: '#f3eee2', borderRadius: 6, padding: 26, boxSizing: 'border-box', boxShadow: '0 50px 120px rgba(0,0,0,0.6)' }}>
    <div style={{ height: '100%', border: '3px double #a88a4a', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: 'Georgia, "Times New Roman", serif', color: '#3b3324', position: 'relative' }}>
      <div style={{ fontSize: 22, letterSpacing: '0.32em', color: '#8a6f37' }}>CERTIFICATE OF COMPLETION</div>
      <div style={{ fontSize: 22, fontStyle: 'italic', color: '#6b604b', marginTop: 10 }}>This certifies that</div>
      <div style={{ fontSize: 66, fontStyle: 'italic', color: '#2b2418' }}>Alex Morgan</div>
      <div style={{ width: 520, height: 2, background: '#c5b08a' }} />
      <div style={{ fontSize: 22, fontStyle: 'italic', color: '#6b604b' }}>has completed the course</div>
      <div style={{ fontSize: 34, color: '#2b2418' }}>Advanced Web Development</div>
      <div style={{ fontSize: 26, color: '#4a4030', marginTop: 8 }}>
        Final grade:{' '}
        <span style={{ display: 'inline-block', minWidth: 64, padding: '0 8px', fontWeight: 700, background: sel > 0 ? `rgba(66,133,244,${0.35 * sel})` : 'transparent', color: '#2b2418' }}>{grade}</span>
      </div>
      <div style={{ position: 'absolute', left: 70, bottom: 54, width: 220, borderTop: '2px solid #8a7a5a', paddingTop: 6, fontSize: 16, color: '#6b604b', textAlign: 'center' }}>Program Director</div>
      <div style={{ position: 'absolute', right: 80, bottom: 40, width: 110, height: 110, borderRadius: 110, background: '#a3302a', boxShadow: 'inset 0 0 0 8px #8c241f', display: 'grid', placeItems: 'center', color: '#f3d9a8', fontSize: 14, letterSpacing: '0.2em' }}>SEAL</div>
    </div>
  </div>
)

export const S1Hook: React.FC = () => {
  const { frame, at, cutOut } = useScene('s1')
  const tFile = at(cue('s1', 'file.'))
  const tAny = at(cue('s1', 'Anyone'))
  const tEdit = at(cue('s1', 'edit'))
  const tBreak = cutOut - 9 // shards fly in the last ~0.3 s, the cut lands on the music accent
  const enter = interpolate(frame, [0, 26], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const rotY = interpolate(frame, [0, tFile, tEdit], [-22, -10, -4], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.cubic) })
  const zoom = interpolate(frame, [0, tBreak], [0.82, 0.92], { extrapolateRight: 'clamp' })
  const sel = interpolate(frame, [tEdit, tEdit + 4], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const typed = frame >= tEdit + 6 ? (frame >= tEdit + 9 ? 'A+' : 'A') : 'C'
  const tag = usePop(tFile, 13)
  const broken = frame >= tBreak
  const gradeX = 1006, gradeY = 598 // where the grade letter sits on screen (measured on the frame-117 still)

  return (
    <SceneShell id="s1" enter="none" exit="none">
      <Backdrop glowAt={[50, 44]} />
      {!broken ? (
        <AbsoluteFill style={{ perspective: 2200 }}>
          <div style={{ position: 'absolute', left: TILE.cx - TILE.w / 2, top: TILE.cy - TILE.h / 2, opacity: enter, transform: `rotateY(${rotY}deg) rotateX(6deg) scale(${zoom})` }}>
            <Paper grade={typed} sel={frame >= tEdit + 6 ? 0 : sel} />
          </div>
          <div style={{ position: 'absolute', left: TILE.cx - TILE.w / 2 + 40, top: TILE.cy - TILE.h / 2 - 34, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 12, background: C.card2, border: `1px solid ${C.line2}`, color: C.text, fontFamily: MONO, fontSize: 24, opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>
            <svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2h12l6 6v18H2z" fill={C.sub} /><path d="M14 2v6h6" fill={C.steel} /><rect x="5" y="16" width="12" height="7" rx="1" fill="#c0392b" /></svg>
            certificate_final.pdf
            {frame >= tEdit + 6 ? <span style={{ color: C.amber, fontFamily: SANS, fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 6 }}><Icon name="pen" size={20} color={C.amber} /> edited</span> : null}
          </div>
        </AbsoluteFill>
      ) : (
        <AbsoluteFill>
          {SHARDS.map((s, i) => {
            const p = interpolate(frame - tBreak - s.delay * 0.3, [0, 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
            return <div key={i} style={{ position: 'absolute', left: s.x0, top: s.y0, width: s.tw - 2, height: s.th - 2, background: (s.col + s.row) % 3 === 0 ? '#e9e2d1' : '#f3eee2', border: '1px solid #c5b08a', transform: `translate(${s.dx * p}px, ${s.dy * p}px) rotate(${s.rot * p}deg) scale(${1 - 0.35 * p})`, opacity: 1 - 0.15 * p }} />
          })}
        </AbsoluteFill>
      )}
      <Cursor pts={[{ at: tAny - 4, x: 1500, y: 980 }, { at: tEdit - 2, x: gradeX, y: gradeY, click: true }, { at: tBreak, x: gradeX + 40, y: gradeY + 30 }]} hideAfter={tBreak} />
    </SceneShell>
  )
}

export const S1_END = SCENE.s1.end
