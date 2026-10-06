import React from 'react'
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { C, MONO, SANS } from '../theme'

/** 0→1 spring that starts at `at` (scene frames). */
export function usePop (at: number, damping = 14, durationInFrames?: number) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: frame - at, fps, config: { damping, stiffness: 140, mass: 0.8 }, durationInFrames })
}
/** Clamped linear 0→1 between two frames with an ease. */
export function useRamp (a: number, b: number, ease = Easing.bezier(0.16, 1, 0.3, 1)) {
  const frame = useCurrentFrame()
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: ease })
}

export type IconName = 'check' | 'lock' | 'wallet' | 'mail' | 'link' | 'shield' | 'chain' | 'bolt' | 'coin' | 'x' | 'pen' | 'server' | 'id' | 'spark'
export const Icon: React.FC<{ name: IconName, size?: number, color?: string }> = ({ name, size = 24, color = C.text }) => {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  switch (name) {
    case 'check': return <svg {...s}><path d="M4.5 12.5l5 5L19.5 7" /></svg>
    case 'x': return <svg {...s}><path d="M6 6l12 12M18 6L6 18" /></svg>
    case 'lock': return <svg {...s}><rect x="4.5" y="10.5" width="15" height="10" rx="2.5" /><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" /></svg>
    case 'wallet': return <svg {...s}><rect x="3" y="6" width="18" height="13" rx="3" /><path d="M16 12.5h2.5M3 9h15" /></svg>
    case 'mail': return <svg {...s}><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>
    case 'link': return <svg {...s}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
    case 'shield': return <svg {...s}><path d="M12 3l8 3v6c0 4.5-3.4 7.7-8 9-4.6-1.3-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></svg>
    case 'chain': return <svg {...s}><rect x="2.5" y="8.5" width="9" height="7" rx="3.5" /><rect x="12.5" y="8.5" width="9" height="7" rx="3.5" /></svg>
    case 'bolt': return <svg {...s}><path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" /></svg>
    case 'coin': return <svg {...s}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.5 9.5h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4" /></svg>
    case 'pen': return <svg {...s}><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></svg>
    case 'server': return <svg {...s}><rect x="4" y="4" width="16" height="7" rx="2" /><rect x="4" y="13" width="16" height="7" rx="2" /><path d="M8 7.5h.01M8 16.5h.01" /></svg>
    case 'id': return <svg {...s}><rect x="3" y="5" width="18" height="14" rx="2.5" /><circle cx="9" cy="11" r="2.4" /><path d="M5.8 16.2c.8-1.6 2-2.4 3.2-2.4s2.4.8 3.2 2.4M14.5 10h4M14.5 13.5h3" /></svg>
    case 'spark': return <svg {...s}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" /></svg>
  }
}

/** Pill label that pops in at `at` (scene frames) and optionally leaves at `out`. */
export const Chip: React.FC<{ at: number, out?: number, icon?: IconName, color?: string, children: React.ReactNode, style?: React.CSSProperties, size?: number, solid?: boolean }> = ({ at, out, icon, color = C.gold, children, style, size = 26, solid = false }) => {
  const frame = useCurrentFrame()
  const p = usePop(at, 13)
  const o = out === undefined ? 1 : interpolate(frame, [out, out + 8], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (frame < at - 1) return null
  return (
    <div style={{
      position: 'absolute', display: 'flex', alignItems: 'center', gap: 12, padding: `${size * 0.42}px ${size * 0.8}px`, borderRadius: 999,
      background: solid ? color : 'rgba(18,21,26,0.92)', border: `2px solid ${color}`, color: solid ? '#0b0e11' : C.text,
      fontFamily: SANS, fontWeight: 700, fontSize: size, whiteSpace: 'nowrap',
      boxShadow: `0 14px 34px rgba(0,0,0,0.5), 0 0 26px ${color}33`,
      opacity: Math.min(p * 1.4, 1) * o, transform: `translateY(${(1 - p) * 26}px) scale(${0.86 + 0.14 * p})`, ...style,
    }}>
      {icon ? <Icon name={icon} size={size * 1.05} color={solid ? '#0b0e11' : color} /> : null}
      <span>{children}</span>
    </div>
  )
}

/** Small mono tag for honest context ("Testnet demo", "Demo publisher (fictional)"). */
export const Tag: React.FC<{ at: number, children: React.ReactNode, style?: React.CSSProperties, color?: string }> = ({ at, children, style, color = C.amber }) => {
  const p = usePop(at, 18)
  return (
    <div style={{ position: 'absolute', padding: '6px 14px', borderRadius: 8, background: 'rgba(11,14,17,0.9)', border: `1.5px solid ${color}88`, color, fontFamily: MONO, fontWeight: 700, fontSize: 19, letterSpacing: '0.02em', opacity: p, transform: `translateY(${(1 - p) * 10}px)`, whiteSpace: 'nowrap', ...style }}>
      {children}
    </div>
  )
}

/** Big word that slams in on a beat (kinetic type). */
export const Slam: React.FC<{ at: number, out?: number, children: React.ReactNode, size?: number, color?: string, style?: React.CSSProperties }> = ({ at, out, children, size = 150, color = C.text, style }) => {
  const frame = useCurrentFrame()
  const p = usePop(at, 11)
  if (frame < at) return null
  const o = out === undefined ? 1 : interpolate(frame, [out, out + 6], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  return (
    <div style={{
      position: 'absolute', fontFamily: SANS, fontWeight: 900, fontSize: size, letterSpacing: '-0.035em', lineHeight: 0.95, color,
      transform: `scale(${1.5 - 0.5 * p})`, opacity: Math.min(1, p * 2) * o, whiteSpace: 'nowrap', textShadow: '0 20px 60px rgba(0,0,0,0.6)', ...style,
    }}>{children}</div>
  )
}

/** Rendered SVG markup (objects from lib/objects.ts) at a given size. */
export const Svg: React.FC<{ markup: string, vb: string, w: number, h: number, style?: React.CSSProperties }> = ({ markup, vb, w, h, style }) => (
  <svg width={w} height={h} viewBox={vb} style={{ overflow: 'visible', ...style }} dangerouslySetInnerHTML={{ __html: markup }} />
)
