import React from 'react'
import { interpolate, useCurrentFrame } from 'remotion'
import { C, MONO } from '../theme'

/**
 * A rotating point cloud (ref5's wire spheres) standing for the chain: Fibonacci points, rotated and projected each
 * frame — pure maths of the frame number, so it renders deterministically. `lit` (0→1) lights points from the top.
 */
const N = 260
const PTS = Array.from({ length: N }, (_, i) => {
  const y = 1 - (i / (N - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const th = Math.PI * (3 - Math.sqrt(5)) * i
  return [Math.cos(th) * r, y, Math.sin(th) * r] as const
})

export const PointSphere: React.FC<{ cx: number, cy: number, r: number, speed?: number, lit?: number, label?: string, opacity?: number }> = ({ cx, cy, r, speed = 0.9, lit = 0, label, opacity = 1 }) => {
  const frame = useCurrentFrame()
  const a = (frame * speed * Math.PI) / 180
  const tilt = (22 * Math.PI) / 180
  const pts = PTS.map(([x, y, z], i) => {
    const x1 = x * Math.cos(a) + z * Math.sin(a), z1 = -x * Math.sin(a) + z * Math.cos(a)
    const y2 = y * Math.cos(tilt) - z1 * Math.sin(tilt), z2 = y * Math.sin(tilt) + z1 * Math.cos(tilt)
    const lightOn = (1 - y) / 2 < lit
    return { i, x: cx + x1 * r, y: cy + y2 * r, z: z2, on: lightOn }
  }).sort((p, q) => p.z - q.z)
  return (
    <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity, overflow: 'visible' }}>
      <ellipse cx={cx} cy={cy} rx={r * 1.32} ry={r * 0.34} fill="none" stroke={C.gold} strokeOpacity={0.35} strokeWidth={2} transform={`rotate(-12 ${cx} ${cy})`} />
      {pts.map((p) => {
        const depth = (p.z + 1) / 2
        const s = 1.6 + depth * 3.2
        return <circle key={p.i} cx={p.x} cy={p.y} r={s} fill={p.on ? C.gold : '#9aa3ae'} opacity={(p.on ? 0.55 : 0.18) + depth * 0.45} />
      })}
      {label ? <text x={cx} y={cy + r + 56} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={24} fill={C.gold} opacity={interpolate(lit, [0, 0.3], [0, 1], { extrapolateRight: 'clamp' })}>{label}</text> : null}
    </svg>
  )
}
