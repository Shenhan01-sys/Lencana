import React from 'react'
import { C, MONO, SANS } from '../theme'
import { Mark } from './Logo'
import { Icon } from './Bits'

/**
 * The soulbound artefact as a physical medal (the NFT spotlight) — a real CSS 3D solid, not a squashed picture.
 * Two faces sit at ±thickness/2 and the edge between them is a ring of reeded flat strips (facets), each lit from
 * its own normal, so the coin has a body when it turns (builder 7 Oct after draft 3: "front and back are 2D, between them
 * it's empty"). Front: Lencana mark. Back: SOULBOUND · ERC-5192 with a lock. Rim text: only what B169/B170/README
 * state (`contracts/SoulboundCert.sol`: no transfer, no approval → no sale, no burn).
 */
type V3 = [number, number, number]
const unit = (v: V3): V3 => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
// CSS axes: x right, y down, z toward the viewer. Key light from the upper left, in front of the coin.
const LIGHT = unit([-0.55, -0.6, 0.58])
const HALF = unit([LIGHT[0], LIGHT[1], LIGHT[2] + 1]) // Blinn half-vector, viewer on +z

/** A coin-local normal after `rotateX(tilt) rotateY(spin)` — the same order the CSS transform list applies. */
const turn = (n: V3, spin: number, tilt: number): V3 => {
  const a = (spin * Math.PI) / 180, t = (tilt * Math.PI) / 180
  const x = n[0] * Math.cos(a) + n[2] * Math.sin(a), y = n[1], z = -n[0] * Math.sin(a) + n[2] * Math.cos(a)
  return [x, y * Math.cos(t) - z * Math.sin(t), y * Math.sin(t) + z * Math.cos(t)]
}
const lit = (n: V3) => ({ diff: Math.max(0, dot(n, LIGHT)), spec: Math.pow(Math.max(0, dot(n, HALF)), 22) })
/** Gold metal under the key light: ambient + Lambert + a hot highlight. */
const metal = (n: V3) => {
  const { diff, spec } = lit(n)
  const b = 0.26 + 0.74 * diff
  const ch = (base: number, hi: number) => Math.round(Math.min(255, base * b + hi * spec))
  return `rgb(${ch(222, 255)}, ${ch(158, 238)}, ${ch(10, 170)})`
}

const FACETS = 72
// reeding: grooves run across the edge (parallel to the coin's axis), so they alternate along each facet's length
const REEDS = 'repeating-linear-gradient(to bottom, rgba(40,24,0,0.30) 0px, rgba(40,24,0,0.30) 1.6px, rgba(255,240,190,0.16) 1.6px, rgba(255,240,190,0.16) 3.6px)'

const RimText: React.FC<{ id: string, text: string, color: string }> = ({ id, text, color }) => (
  <svg viewBox="0 0 100 100" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
    <defs><path id={id} d="M 12.5 50 a 37.5 37.5 0 1 1 75 0 a 37.5 37.5 0 1 1 -75 0" /></defs>
    <text fontFamily={MONO} fontWeight={700} fontSize={4.6} fill={color}>
      <textPath href={`#${id}`} textLength={232} lengthAdjust="spacing">{text}</textPath>
    </text>
  </svg>
)

export const Coin: React.FC<{ size: number, angle: number, x: number, y: number, glow?: number, tilt?: number }> = ({ size, angle, x, y, glow = 1, tilt = -12 }) => {
  const R = size / 2
  const T = size * 0.085 // thickness
  const H = 2 * R * Math.tan(Math.PI / FACETS) + 1.4 // facet length, overlapped a little so no seam shows
  const nFront = turn([0, 0, 1], angle, tilt), nBack = turn([0, 0, -1], angle, tilt)
  const shine = (((angle % 360) + 360) % 360) / 360

  const face = (front: boolean) => {
    const { diff, spec } = lit(front ? nFront : nBack)
    return (
      <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', overflow: 'hidden', backfaceVisibility: 'hidden', transform: `${front ? '' : 'rotateY(180deg) '}translateZ(${T / 2}px)`, background: `radial-gradient(circle at 35% 30%, #ffe27a, ${C.gold} 45%, #c08f00 100%)`, boxShadow: `inset 0 0 0 ${size * 0.035}px #b98a00, inset 0 0 0 ${size * 0.06}px #ffd54a, inset 0 0 ${size * 0.05}px ${size * 0.06}px rgba(90,60,0,0.45)` }}>
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          {front ? (
            <div style={{ width: size * 0.6, height: size * 0.6, borderRadius: '50%', background: '#1a1408', display: 'grid', placeItems: 'center', boxShadow: `0 0 0 ${size * 0.018}px #7a5a00, inset 0 ${size * 0.01}px ${size * 0.03}px rgba(0,0,0,0.8)` }}>
              <Mark size={size * 0.34} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#1a1408' }}>
              <Icon name="lock" size={size * 0.17} color="#1a1408" />
              <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: size * 0.088, letterSpacing: '0.03em', marginTop: size * 0.012 }}>SOULBOUND</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: size * 0.056 }}>ERC-5192</div>
            </div>
          )}
        </div>
        <RimText id={front ? 'coin-rim-front' : 'coin-rim-back'} color={front ? '#5c4200' : '#4a3500'}
          text={front ? 'LENCANA · SOULBOUND BADGE · BNB CHAIN TESTNET · ' : 'NON-TRANSFERABLE · CANNOT BE SOLD · CANNOT BE BURNED · '} />
        {/* light on this face: darker as it turns away from the key light, a glint sweep as it turns */}
        <div style={{ position: 'absolute', inset: 0, background: `rgba(24,14,0,${((1 - (0.3 + 0.7 * diff)) * 0.8).toFixed(3)})` }} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at 34% 28%, rgba(255,250,225,${(0.7 * spec).toFixed(3)}), transparent 58%)` }} />
        <div style={{ position: 'absolute', top: -size * 0.2, bottom: -size * 0.2, width: size * 0.2, left: `${-30 + shine * 160}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent)', transform: 'rotate(18deg)' }} />
      </div>
    )
  }

  return (
    <div style={{ position: 'absolute', left: x - R, top: y - R, width: size, height: size }}>
      <div style={{ position: 'absolute', inset: -size * 0.25, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}${Math.round(40 * glow).toString(16).padStart(2, '0')}, transparent 65%)` }} />
      {/* contact shadow: the medal floats above something */}
      <div style={{ position: 'absolute', left: size * 0.14, top: size * 1.04, width: size * 0.72, height: size * 0.09, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(0,0,0,0.55), transparent 70%)' }} />
      <div style={{ position: 'absolute', inset: 0, transformStyle: 'preserve-3d', transform: `perspective(${size * 3.2}px) rotateX(${tilt}deg) rotateY(${angle}deg)` }}>
        {Array.from({ length: FACETS }).map((_, i) => {
          const th = (i / FACETS) * 360
          const n = turn([Math.cos((th * Math.PI) / 180), Math.sin((th * Math.PI) / 180), 0], angle, tilt)
          return <div key={i} style={{ position: 'absolute', left: R - T / 2, top: R - H / 2, width: T, height: H, background: `${REEDS}, ${metal(n)}`, backfaceVisibility: 'hidden', transform: `rotateZ(${th}deg) translateX(${R - 0.8}px) rotateY(90deg)` }} />
        })}
        {face(true)}
        {face(false)}
      </div>
    </div>
  )
}
