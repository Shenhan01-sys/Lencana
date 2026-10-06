import React from 'react'
import { Easing, interpolate, useCurrentFrame } from 'remotion'
import { C } from '../theme'

export type CursorPt = { at: number, x: number, y: number, click?: boolean }

/** Pointer that travels along key points (scene frames, screen px) and clicks with a gold ring. */
export const Cursor: React.FC<{ pts: CursorPt[], size?: number, hideAfter?: number }> = ({ pts, size = 34, hideAfter }) => {
  const frame = useCurrentFrame()
  if (!pts.length) return null
  const first = pts[0].at
  const last = hideAfter ?? 1e7 // interpolate() refuses Infinity
  if (frame < first - 8 || frame > last + 8) return null
  let x = pts[0].x
  let y = pts[0].y
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    if (frame >= a.at && frame <= b.at) {
      const t = interpolate(frame, [a.at, b.at], [0, 1], { easing: Easing.bezier(0.45, 0, 0.2, 1), extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      x = a.x + (b.x - a.x) * t
      y = a.y + (b.y - a.y) * t
      // a small arc so the hand does not move like a robot
      y -= Math.sin(t * Math.PI) * Math.min(60, Math.hypot(b.x - a.x, b.y - a.y) * 0.08)
    } else if (frame > b.at && i === pts.length - 2) { x = b.x; y = b.y }
  }
  const clicks = pts.filter((p) => p.click)
  let press = 1
  const rings: React.ReactNode[] = []
  for (const c of clicks) {
    const d = frame - c.at
    if (d >= -3 && d <= 5) press = Math.min(press, interpolate(d, [-3, 0, 5], [1, 0.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }))
    if (d >= 0 && d <= 16) {
      const r = interpolate(d, [0, 16], [8, 54], { easing: Easing.out(Easing.cubic) })
      rings.push(<div key={c.at} style={{ position: 'absolute', left: c.x - r, top: c.y - r, width: r * 2, height: r * 2, borderRadius: r * 2, border: `3px solid ${C.gold}`, opacity: interpolate(d, [0, 16], [0.95, 0]) }} />)
    }
  }
  const op = interpolate(frame, [first - 8, first, last, last + 8], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <>
      {rings}
      <svg width={size} height={size * 1.25} viewBox="0 0 24 30" style={{ position: 'absolute', left: x - 3, top: y - 2, opacity: op, transform: `scale(${press})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,0.55))' }}>
        <path d="M2 1.5 L2 24 L8 18.5 L12 27.5 L16 25.8 L12 17 L20 17 Z" fill="#ffffff" stroke="#0b0e11" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </>
  )
}
