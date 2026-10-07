import React from 'react'
import { C, MONO, SANS } from '../theme'
import { Mark } from './Logo'
import { Icon } from './Bits'

/**
 * The soulbound artefact as a physical medal (the NFT spotlight). A coin flip is faked the classic way: the face is
 * squashed by |cos θ|, the thickness shows as an edge band, and the back face takes over when cos θ < 0.
 * Front: Lencana mark in a gold medal. Back: SOULBOUND · ERC-5192 with a lock — the facts B169/B170/README state.
 */
export const Coin: React.FC<{ size: number, angle: number, x: number, y: number, glow?: number }> = ({ size, angle, x, y, glow = 1 }) => {
  const c = Math.cos((angle * Math.PI) / 180)
  const front = c >= 0
  const w = Math.max(0.035, Math.abs(c))
  const edge = (1 - w) * size * 0.09
  const shine = ((angle % 360) + 360) % 360 / 360
  return (
    <div style={{ position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size }}>
      <div style={{ position: 'absolute', inset: -size * 0.25, borderRadius: '50%', background: `radial-gradient(circle, ${C.gold}${Math.round(40 * glow).toString(16).padStart(2, '0')}, transparent 65%)` }} />
      {/* edge (thickness) */}
      <div style={{ position: 'absolute', left: size / 2 - (size * w) / 2 - edge * Math.sign(c || 1), top: 0, width: size * w + edge, height: size, borderRadius: '50%', background: C.goldDeep }} />
      <div style={{ position: 'absolute', left: size / 2 - (size * w) / 2, top: 0, width: size * w, height: size, borderRadius: '50%', overflow: 'hidden', background: `radial-gradient(circle at 35% 30%, #ffe27a, ${C.gold} 45%, #c08f00 100%)`, boxShadow: `inset 0 0 0 ${size * 0.035}px #b98a00, inset 0 0 0 ${size * 0.06}px #ffd54a` }}>
        {/* the face artwork is laid out at full width, then squashed with the face (not clipped by it) */}
        <div style={{ position: 'absolute', top: 0, left: (size * w - size) / 2, width: size, height: size, transform: `scaleX(${w})`, transformOrigin: '50% 50%', display: 'grid', placeItems: 'center' }}>
          {front ? (
            <div style={{ width: size * 0.62, height: size * 0.62, borderRadius: '50%', background: '#1a1408', display: 'grid', placeItems: 'center', boxShadow: `0 0 0 ${size * 0.02}px #7a5a00` }}>
              <Mark size={size * 0.36} />
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#1a1408' }}>
              <Icon name="lock" size={size * 0.2} color="#1a1408" />
              <div style={{ fontFamily: SANS, fontWeight: 900, fontSize: size * 0.1, letterSpacing: '0.04em', marginTop: size * 0.02 }}>SOULBOUND</div>
              <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: size * 0.062 }}>ERC-5192</div>
            </div>
          )}
        </div>
        {/* specular sweep */}
        <div style={{ position: 'absolute', top: -size * 0.2, bottom: -size * 0.2, width: size * 0.22, left: `${-30 + shine * 160}%`, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)', transform: 'rotate(18deg)' }} />
      </div>
    </div>
  )
}
