import React from 'react'
import { Img, staticFile } from 'remotion'
import { C, MONO } from '../theme'

/**
 * A browser window holding a REAL capture of a Lencana page (public/captures/*.png, 1600 CSS px wide, taken at 2×).
 * Children are positioned in the capture's own CSS pixels (same numbers as the capture's .json boxes), so an
 * overlay sits exactly on the element it talks about. `scroll` pans the page inside the window like a real scroll.
 */
export const CAP_W = 1600

export type FrameProps = {
  src: string
  url: string
  width: number
  viewH?: number
  imgH?: number
  scroll?: number
  x: number
  y: number
  rotX?: number
  rotY?: number
  rotZ?: number
  z?: number
  scale?: number
  opacity?: number
  children?: React.ReactNode
  rim?: string
  /** glossy floor reflection under the window (v3) */
  reflect?: boolean
  /** false inside <Stage>, which already supplies the perspective */
  persp?: boolean
}

export const BAR = 46

export const BrowserFrame: React.FC<FrameProps> = ({ src, url, width, viewH, imgH = 1000, scroll = 0, x, y, rotX = 0, rotY = 0, rotZ = 0, z = 0, scale = 1, opacity = 1, children, rim = C.gold, reflect = false, persp = true }) => {
  const k = width / CAP_W
  const vh = viewH ?? Math.round(1000 * k)
  return (
    <div style={{
      position: 'absolute', left: x, top: y, width, height: vh + BAR, opacity,
      transform: `${persp ? 'perspective(2600px) ' : ''}translateZ(${z}px) rotateX(${rotX}deg) rotateY(${rotY}deg) rotateZ(${rotZ}deg) scale(${scale})`,
      transformOrigin: '50% 50%', willChange: 'transform',
      WebkitBoxReflect: reflect ? 'below 14px linear-gradient(transparent 66%, rgba(255,255,255,0.13))' : undefined,
    }}>
      <div style={{
        position: 'absolute', inset: 0, borderRadius: 18, overflow: 'hidden', background: C.bg2,
        border: `1px solid ${C.line}`,
        boxShadow: `0 60px 140px rgba(0,0,0,0.7), 0 18px 40px rgba(0,0,0,0.55), 0 -1px 0 ${rim}55, 0 0 0 1px rgba(240,185,11,0.06)`,
      }}>
        <div style={{ height: BAR, display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', background: '#12151a', borderBottom: `1px solid ${C.line}` }}>
          {['#f6465d', '#ff9f1a', '#0ecb81'].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: 12, background: c, opacity: 0.85 }} />)}
          <div style={{ marginLeft: 18, flex: 1, maxWidth: Math.min(760, width * 0.62), height: 28, borderRadius: 14, background: C.card2, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', color: C.sub, fontFamily: MONO, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <svg width="12" height="14" viewBox="0 0 12 14"><rect x="1" y="6" width="10" height="7.5" rx="1.6" fill={C.green} /><path d="M3.2 6 V4.2 a2.8 2.8 0 0 1 5.6 0 V6" fill="none" stroke={C.green} strokeWidth="1.6" /></svg>
            <span><span style={{ color: C.text }}>lencana-psi.vercel.app</span>{url}</span>
          </div>
        </div>
        <div style={{ position: 'relative', width, height: vh, overflow: 'hidden', background: C.bg }}>
          <div style={{ position: 'absolute', left: 0, top: 0, width: CAP_W, height: imgH, transform: `translateY(${-scroll * k}px) scale(${k})`, transformOrigin: '0 0' }}>
            <Img src={staticFile(src)} style={{ position: 'absolute', left: 0, top: 0, width: CAP_W, height: imgH }} />
            {children}
          </div>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 30, right: 30, top: 0, height: 1, background: `linear-gradient(90deg, transparent, ${rim}aa, transparent)`, opacity: 0.8 }} />
    </div>
  )
}

/** Highlight ring around a region of the capture (capture CSS px). */
export const Focus: React.FC<{ x: number, y: number, w: number, h: number, p: number, color?: string, r?: number }> = ({ x, y, w, h, p, color = C.gold, r = 12 }) => (
  <div style={{
    position: 'absolute', left: x - 8, top: y - 8, width: w + 16, height: h + 16, borderRadius: r,
    border: `3px solid ${color}`, opacity: p,
    // v3: neon — a tight core, a wide halo, and a faint inner fill (ref1's glowing prompt box)
    boxShadow: `0 0 ${10 * p}px ${color}, 0 0 ${46 * p}px ${color}99, 0 0 ${90 * p}px ${color}44, inset 0 0 ${22 * p}px ${color}40`,
    transform: `scale(${1.06 - 0.06 * p})`,
  }} />
)
