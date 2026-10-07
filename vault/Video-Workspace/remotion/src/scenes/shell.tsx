import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from 'remotion'
import { LineId, SCENE, XF } from '../lib/time'

/** Clock of one scene: `frame` is local (0 = XF frames before the cut), `at(abs)` turns an absolute frame into local. */
export function useScene (id: LineId) {
  const frame = useCurrentFrame()
  const base = SCENE[id].start - XF
  return { frame, base, at: (abs: number) => abs - base, len: SCENE[id].dur + 2 * XF, cutIn: XF, cutOut: XF + SCENE[id].dur }
}

/** Default enter/exit: a short push (scale + fade) across the cut, so cuts read as one camera move. */
export const SceneShell: React.FC<{ id: LineId, enter?: 'push' | 'none', exit?: 'push' | 'none', children: React.ReactNode }> = ({ id, enter = 'push', exit = 'push', children }) => {
  const { frame, len } = useScene(id)
  const e = enter === 'none' ? 1 : interpolate(frame, [0, 2 * XF], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0, 0, 1) })
  const x = exit === 'none' ? 1 : interpolate(frame, [len - 2 * XF, len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.4, 0, 1, 1) })
  const scale = (enter === 'none' ? 1 : 1.08 - 0.08 * e) * (exit === 'none' ? 1 : 0.92 + 0.08 * x)
  return <AbsoluteFill style={{ opacity: Math.min(e, x), transform: `scale(${scale})` }}>{children}</AbsoluteFill>
}

type Move = 'left' | 'right' | 'up' | 'down' | 'zoom' | 'fade' | 'none'
const offset = (m: Move, p: number, sign: 1 | -1): { tx: number, ty: number, s: number } => {
  const q = 1 - p
  switch (m) {
    case 'left': return { tx: sign * -1400 * q, ty: 0, s: 1 }
    case 'right': return { tx: sign * 1400 * q, ty: 0, s: 1 }
    case 'up': return { tx: 0, ty: sign * -900 * q, s: 1 }
    case 'down': return { tx: 0, ty: sign * 900 * q, s: 1 }
    case 'zoom': return { tx: 0, ty: 0, s: 1 + sign * 0.25 * q }
    default: return { tx: 0, ty: 0, s: 1 }
  }
}
/**
 * One shot inside a scene, visible in [from, to) (local frames), with a whip/push in and out.
 * `enter: 'right'` = comes in from the right; `exit: 'left'` = leaves to the left (a camera pan).
 */
export const Shot: React.FC<{ from: number, to: number, enter?: Move, exit?: Move, len?: number, hard?: boolean, children: React.ReactNode }> = ({ from, to, enter = 'fade', exit = 'fade', len = 10, hard = false, children }) => {
  const frame = useCurrentFrame()
  if (frame < from - len || frame > to + len) return null
  // hard: a true cut at the window edges where an `enter/exit: 'none'` side would otherwise linger `len` frames
  // (draft 5: the coin shot showed over the certificate push-in for 10 frames before the match cut)
  if (hard && ((enter === 'none' && frame < from) || (exit === 'none' && frame >= to))) return null
  const pin = interpolate(frame, [from - len, from], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.2, 0.8, 0.2, 1) })
  const pout = interpolate(frame, [to, to + len], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.8, 0, 0.8, 0.2) })
  const a = offset(enter, pin, 1)
  const b = offset(exit, pout, -1)
  const blur = Math.max((enter === 'fade' || enter === 'none' ? 0 : 1 - pin), (exit === 'fade' || exit === 'none' ? 0 : 1 - pout)) * 10
  const op = (enter === 'none' ? 1 : enter === 'fade' ? pin : Math.min(1, pin * 2)) * (exit === 'none' ? 1 : exit === 'fade' ? pout : Math.min(1, pout * 2))
  // the camera never stops: a slow push through every shot
  const drift = 1 + 0.035 * interpolate(frame, [from - len, to + len], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <AbsoluteFill style={{ opacity: op, transform: `translate(${a.tx + b.tx}px, ${a.ty + b.ty}px) scale(${a.s * b.s * drift})`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined }}>
      {children}
    </AbsoluteFill>
  )
}

/** Region of a capture lifted off the page (same pixels, cut out by CSS), for the "pop-out" moves.
 *  Place it inside <BrowserFrame> children: x/y/w/h are the capture's own CSS px. */
export const Lift: React.FC<{ src: string, x: number, y: number, w: number, h: number, p: number, imgH?: number, radius?: number, lift?: number }> = ({ src, x, y, w, h, p, imgH = 1000, radius = 14, lift = 1 }) => (
  <div style={{
    position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: radius, overflow: 'hidden',
    transform: `translate(${-10 * p * lift}px, ${-18 * p * lift}px) scale(${1 + 0.07 * p * lift})`, transformOrigin: '50% 50%',
    boxShadow: `0 ${40 * p}px ${90 * p}px rgba(0,0,0,${0.75 * p}), 0 0 0 ${2 * p}px rgba(240,185,11,${0.8 * p}), 0 0 ${40 * p}px rgba(240,185,11,${0.35 * p})`,
  }}>
    <Img src={staticFile(src)} style={{ position: 'absolute', left: -x, top: -y, width: 1600, height: imgH }} />
  </div>
)

/** Shards of the fake certificate (S1 → S2): same seeds in both scenes so the motion is continuous. */
export const TILE = { cols: 10, rows: 7, w: 1000, h: 700, cx: 960, cy: 470 }
export function shard (i: number) {
  const col = i % TILE.cols, row = Math.floor(i / TILE.cols)
  const tw = TILE.w / TILE.cols, th = TILE.h / TILE.rows
  const x0 = TILE.cx - TILE.w / 2 + col * tw, y0 = TILE.cy - TILE.h / 2 + row * th
  const ang = random(`a${i}`) * Math.PI * 2
  const dist = 380 + random(`d${i}`) * 520
  return { col, row, tw, th, x0, y0, dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist * 0.75, rot: (random(`r${i}`) - 0.5) * 220, delay: random(`t${i}`) * 6 }
}
export const SHARDS = Array.from({ length: TILE.cols * TILE.rows }, (_, i) => shard(i))
