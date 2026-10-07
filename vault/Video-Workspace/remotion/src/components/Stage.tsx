import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { C, SANS } from '../theme'

/**
 * v3 immersion kit (ref1 level): a 3D camera rig with depth layers. Layers far from the focus plane are blurred
 * (depth of field), so a slow camera move gives real parallax between the page, ghost pages behind and bokeh in front.
 */
export const Stage: React.FC<{ perspective?: number, rx?: number, ry?: number, tx?: number, ty?: number, tz?: number, children: React.ReactNode }> = ({ perspective = 1700, rx = 0, ry = 0, tx = 0, ty = 0, tz = 0, children }) => (
  <AbsoluteFill style={{ perspective, perspectiveOrigin: '50% 46%' }}>
    <AbsoluteFill style={{ transformStyle: 'preserve-3d', transform: `translate3d(${tx}px, ${ty}px, ${tz}px) rotateX(${rx}deg) rotateY(${ry}deg)` }}>{children}</AbsoluteFill>
  </AbsoluteFill>
)

export const Layer: React.FC<{ z?: number, blur?: number, opacity?: number, children: React.ReactNode, style?: React.CSSProperties }> = ({ z = 0, blur = 0, opacity = 1, children, style }) => (
  <AbsoluteFill style={{ transform: `translateZ(${z}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined, opacity, ...style }}>{children}</AbsoluteFill>
)

/**
 * Standard v3 shot: the camera drifts across the shot (t = 0→1), a ghost page sits far behind out of focus,
 * gold bokeh floats in front; the real page (children) is on the focus plane.
 */
export const FrameStage: React.FC<{ t: number, ghost?: string, ghostX?: number, seed?: number, children: React.ReactNode }> = ({ t, ghost, ghostX = -260, seed = 3, children }) => (
  <Stage rx={4 - 3 * t} ry={-6 + 9 * t} tz={50 * t}>
    {ghost ? (
      <Layer z={-650} blur={8} opacity={0.32}>
        <div style={{ position: 'absolute', left: ghostX, top: 60, width: 1300, height: 860, borderRadius: 22, overflow: 'hidden', transform: 'rotateY(16deg)' }}>
          <Img src={staticFile(ghost)} style={{ width: 1300, height: 812 }} />
        </div>
      </Layer>
    ) : null}
    <Layer z={0}>{children}</Layer>
    <Layer z={300}><Bokeh seed={seed} count={5} /></Layer>
  </Stage>
)

/** Out-of-focus gold lights in front of the stage (foreground depth). Deterministic positions. */
export const Bokeh: React.FC<{ seed?: number, count?: number }> = ({ seed = 1, count = 7 }) => {
  const frame = useCurrentFrame()
  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {Array.from({ length: count }).map((_, i) => {
        const r = ((i * 7919 + seed * 104729) % 1000) / 1000
        const q = ((i * 6007 + seed * 7727) % 1000) / 1000
        const x = r * 1920 + Math.sin((frame + i * 40) / 70) * 30
        const y = q * 1080 + Math.cos((frame + i * 25) / 90) * 20
        const s = 40 + (i % 4) * 26
        return <div key={i} style={{ position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, borderRadius: s, background: `radial-gradient(circle, ${C.gold}55, ${C.gold}00 70%)`, filter: 'blur(6px)', opacity: 0.55 }} />
      })}
    </AbsoluteFill>
  )
}

/**
 * Big statement copy beside the product (ref2): words rise out of a mask one after another; *word* is gold with a bar
 * under it. `\n` breaks lines. Only words the voiceover says — no new claims.
 */
export const Headline: React.FC<{ at: number, out?: number, text: string, x?: number, y?: number, size?: number, width?: number, align?: 'left' | 'center' }> = ({ at, out, text, x = 110, y = 240, size = 84, width = 720, align = 'left' }) => {
  const frame = useCurrentFrame()
  if (frame < at - 2) return null
  const o = out === undefined ? 1 : interpolate(frame, [out, out + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const lift = out === undefined ? 0 : interpolate(frame, [out, out + 8], [0, -30], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  let k = 0
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, opacity: o, transform: `translateY(${lift}px)`, fontFamily: SANS, fontWeight: 800, fontSize: size, lineHeight: 1.04, letterSpacing: '-0.035em', color: C.text, textAlign: align }}>
      {text.split('\n').map((line, li) => (
        <div key={li} style={{ overflow: 'hidden', paddingBottom: size * 0.12 }}>
          {line.split(' ').map((w, wi) => {
            const hi = w.startsWith('*')
            const clean = w.replace(/\*/g, '')
            const p = interpolate(frame, [at + k * 2, at + k * 2 + 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1) })
            k++
            return (
              <span key={wi} style={{ display: 'inline-block', marginRight: size * 0.24, transform: `translateY(${(1 - p) * 110}%)`, color: hi ? C.gold : C.text, position: 'relative' }}>
                {clean}
                {hi ? <span style={{ position: 'absolute', left: 0, right: 0, bottom: -size * 0.02, height: size * 0.08, borderRadius: size, background: C.gold, transform: `scaleX(${interpolate(frame, [at + k * 2 + 6, at + k * 2 + 16], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })})`, transformOrigin: '0 50%' }} /> : null}
              </span>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/**
 * Full-bleed colour block with giant type (ref5 level): hard cut in, hard cut out, the word lands with a short squash.
 * `echo` repeats the word as outlined rows behind it. Keep at most two of these per second (photosensitivity, AC #8).
 */
export const FullBleed: React.FC<{ from: number, to: number, bg: string, color: string, text: string, size?: number, sub?: string, echo?: boolean, dot?: string }> = ({ from, to, bg, color, text, size = 260, sub, echo = false, dot }) => {
  const frame = useCurrentFrame()
  if (frame < from || frame >= to) return null
  const d = frame - from
  const sx = interpolate(d, [0, 4, 9], [1.35, 0.94, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const sy = interpolate(d, [0, 4, 9], [0.7, 1.06, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const drift = interpolate(d, [0, to - from], [0, -18])
  return (
    <AbsoluteFill style={{ background: bg, overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
      {echo ? (
        <AbsoluteFill style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', opacity: 0.22, transform: `translateX(${drift * 3}px)` }}>
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} style={{ fontFamily: SANS, fontWeight: 900, fontSize: size * 0.62, lineHeight: 0.9, letterSpacing: '-0.04em', whiteSpace: 'nowrap', color: 'transparent', WebkitTextStroke: `3px ${color}`, transform: `translateX(${(i % 2 ? -1 : 1) * 120}px)` }}>{`${text} ${text} ${text}`}</div>
          ))}
        </AbsoluteFill>
      ) : null}
      <div style={{ textAlign: 'center', transform: `translateX(${drift}px)` }}>
        <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: size, lineHeight: 0.92, letterSpacing: '-0.045em', color, transform: `scale(${sx}, ${sy})`, whiteSpace: 'nowrap' }}>
          {text}{dot ? <span style={{ color: dot }}>.</span> : null}
        </div>
        {sub ? <div style={{ fontFamily: SANS, fontWeight: 600, fontSize: size * 0.16, color, opacity: 0.85, marginTop: size * 0.08 }}>{sub}</div> : null}
      </div>
    </AbsoluteFill>
  )
}

/** Share of the 1920×1080 frame inside the circle (cx, cy, r), sampled on a 40 px grid. */
const covered = (cx: number, cy: number, r: number) => {
  let n = 0
  for (let gx = 0; gx < 48; gx++) for (let gy = 0; gy < 27; gy++) if (((gx + 0.5) * 40 - cx) ** 2 + ((gy + 0.5) * 40 - cy) ** 2 <= r * r) n++
  return n / (48 * 27)
}
const farCorner = (cx: number, cy: number) => Math.max(...[[0, 0], [1920, 0], [0, 1080], [1920, 1080]].map(([x, y]) => Math.hypot(x - cx, y - cy)))
/** Radius whose on-screen area is share `c` of the frame (bisection on `covered`). */
const radiusFor = (cx: number, cy: number, c: number) => {
  if (c <= 0) return 0
  if (c >= 1) return farCorner(cx, cy) + 2
  let lo = 0, hi = farCorner(cx, cy) + 2
  for (let i = 0; i < 18; i++) { const mid = (lo + hi) / 2; if (covered(cx, cy, mid) < c) lo = mid; else hi = mid }
  return hi
}

/**
 * Brand wipe between shots (ref2): a gold disc grows over the cut and shrinks off the other side. Centre in px.
 * Photosensitivity (AC-B173 #8): the covered AREA moves at an even rate, so the frame's mean brightness changes by
 * about 1/12 of the dark→gold swing per frame. Draft 3 eased the radius over 16 frames instead, and the last frames
 * flooded the screen in 3–4 big steps — `qa.mjs` counted 7 luma jumps ≥ 20 in one second at 44.1 s and 75.2 s.
 */
export const CircleWipe: React.FC<{ at: number, len?: number, from?: [number, number], to?: [number, number], color?: string }> = ({ at, len = 24, from = [1700, 900], to = [220, 180], color = C.gold }) => {
  const frame = useCurrentFrame()
  const d = frame - (at - len / 2)
  if (d < 0 || d > len) return null
  const half = len / 2
  const grow = d <= half
  const share = grow ? d / half : 1 - (d - half) / half
  const [cx, cy] = grow ? from : to
  const r = radiusFor(cx, cy, share)
  return <div style={{ position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: r * 2, background: color, pointerEvents: 'none' }} />
}
