import React from 'react'
import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { noise2D } from '@remotion/noise'
import { C } from '../theme'

/** Dark stage shared by every scene: drifting dot grid, a soft key light and a few slow gold motes. */
export const Backdrop: React.FC<{ glow?: string, glowAt?: [number, number], drift?: number }> = ({ glow = C.gold, glowAt = [50, 42], drift = 0 }) => {
  const frame = useCurrentFrame()
  const gx = (frame * 0.35 + drift) % 36
  const gy = (frame * 0.12) % 36
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg, overflow: 'hidden' }}>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 55% at ${glowAt[0]}% ${glowAt[1]}%, ${glow}22, transparent 70%)` }} />
      <AbsoluteFill style={{
        backgroundImage: 'radial-gradient(rgba(234,236,239,0.075) 1.3px, transparent 1.6px)',
        backgroundSize: '36px 36px',
        backgroundPosition: `${-gx}px ${-gy}px`,
        maskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 85%)',
        WebkitMaskImage: 'radial-gradient(ellipse 75% 70% at 50% 50%, black 30%, transparent 85%)',
      }} />
      {Array.from({ length: 14 }).map((_, i) => {
        const x = 50 + noise2D('mx' + i, frame / 260, i) * 52
        const y = 50 + noise2D('my' + i, i, frame / 300) * 46
        const o = interpolate(noise2D('mo' + i, frame / 90, i * 3), [-1, 1], [0.05, 0.45])
        const s = 2 + (i % 3)
        return <div key={i} style={{ position: 'absolute', left: `${x}%`, top: `${y}%`, width: s, height: s, borderRadius: s, background: C.gold, opacity: o, boxShadow: `0 0 ${s * 4}px ${C.gold}` }} />
      })}
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse 80% 75% at 50% 48%, transparent 55%, rgba(0,0,0,0.65) 100%)' }} />
    </AbsoluteFill>
  )
}
