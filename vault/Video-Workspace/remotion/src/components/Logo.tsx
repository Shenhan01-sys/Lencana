import React from 'react'
import { C, SANS } from '../theme'

// Vector mark of Lencana: copied from web/src/certificate-logo.ts (traced from the builder's logo, two layers on 424 × 393).
// The app always puts the mark on a light tile (web/src/pages/landing.ts), so the video does the same.
const BLACK = 'M 155.722 59.372 C 117.823 78.576, 94.724 90.844, 92.612 92.891 C 86.944 98.386, 86.999 97.564, 87.009 175.616 L 87.019 247.500 89.994 242.313 C 91.630 239.460, 94.438 236.015, 96.234 234.658 C 99.248 232.382, 160.905 195.284, 202 171.022 C 211.625 165.340, 220.284 160.018, 221.243 159.197 C 222.867 157.805, 222.982 153.476, 222.930 96.042 C 222.870 30.106, 222.840 29.702, 217.977 29.291 C 216.416 29.159, 193.385 40.287, 155.722 59.372 M 323.500 239.680 C 314.700 243.828, 292.200 254.303, 273.500 262.958 C 254.800 271.613, 229.488 283.375, 217.251 289.097 L 195.002 299.500 195.001 329.633 L 195 359.766 200.750 363.235 C 203.912 365.143, 210.620 369.246, 215.655 372.352 C 220.690 375.458, 225.088 378, 225.428 378 C 225.957 378, 257.539 361.050, 299 338.514 C 305.325 335.076, 315.675 329.534, 322 326.198 C 333.898 319.922, 338.113 316.512, 339.936 311.685 C 341.161 308.444, 341.462 231.957, 340.250 232.069 C 339.837 232.107, 332.300 235.532, 323.500 239.680'
const GOLD = 'M 328 133.074 C 326.619 133.955, 286.397 153.469, 272.500 160.001 C 269.200 161.552, 258.175 166.743, 248 171.537 C 237.825 176.330, 226.350 181.713, 222.500 183.498 C 180.656 202.899, 159.399 212.802, 148.500 217.971 C 141.350 221.361, 126.163 228.433, 114.751 233.685 C 85.921 246.953, 86.644 245.930, 87.178 272.707 L 87.500 288.836 90.543 293.168 C 92.216 295.551, 94.916 298.326, 96.543 299.336 C 98.169 300.345, 112.325 309.075, 128 318.735 C 143.675 328.395, 163.601 340.732, 172.280 346.149 C 180.958 351.567, 188.496 356, 189.030 356 C 189.634 356, 190 345.214, 190 327.385 L 190 298.771 192.702 293.807 C 194.219 291.020, 196.690 288.177, 198.337 287.326 C 199.951 286.491, 207.848 281.725, 215.886 276.734 C 223.923 271.744, 232.975 266.228, 236 264.478 C 239.025 262.728, 246.675 258.143, 253 254.290 C 263.826 247.695, 296.489 228.883, 316.500 217.717 C 335.046 207.369, 339.061 204.837, 340.563 202.544 C 341.889 200.520, 342.064 195.727, 341.803 168.507 L 341.500 136.824 338.694 134.412 C 335.778 131.905, 330.808 131.283, 328 133.074'

/** The Lencana mark on its light tile. `reveal` 0→1 draws the three plates in order (upright, gold band, base). */
export const Mark: React.FC<{ size: number, reveal?: number, style?: React.CSSProperties }> = ({ size, reveal = 1, style }) => {
  const a = Math.min(1, Math.max(0, reveal * 3))
  const b = Math.min(1, Math.max(0, reveal * 3 - 1))
  const c = Math.min(1, Math.max(0, reveal * 3 - 2))
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.22, background: '#f7f5ef', boxShadow: `0 ${size * 0.12}px ${size * 0.4}px rgba(0,0,0,0.55), 0 0 ${size * 0.5}px ${C.gold}33`, display: 'grid', placeItems: 'center', ...style }}>
      <svg width={size * 0.8} height={size * 0.8} viewBox="60 20 300 370">
        <g style={{ opacity: a, transform: `translateY(${(1 - a) * -40}px)` }}><path d={BLACK.split(' M ')[0]} fill="#14161a" /></g>
        <g style={{ opacity: b, transform: `translateX(${(1 - b) * -50}px)` }}><path d={GOLD} fill={C.gold} /></g>
        <g style={{ opacity: c, transform: `translateY(${(1 - c) * 40}px)` }}><path d={'M ' + BLACK.split(' M ')[1]} fill="#14161a" /></g>
      </svg>
    </div>
  )
}

export const Wordmark: React.FC<{ size: number, p?: number, style?: React.CSSProperties }> = ({ size, p = 1, style }) => {
  const letters = 'Lencana'.split('')
  return (
    <div style={{ display: 'flex', fontFamily: SANS, fontWeight: 800, fontSize: size, letterSpacing: '-0.03em', color: C.text, ...style }}>
      {letters.map((l, i) => {
        const q = Math.min(1, Math.max(0, p * (letters.length + 2) - i))
        return <span key={i} style={{ display: 'inline-block', opacity: q, transform: `translateY(${(1 - q) * size * 0.35}px)` }}>{l}</span>
      })}
    </div>
  )
}
