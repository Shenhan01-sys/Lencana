import React from 'react'
import { AbsoluteFill, Easing, interpolate, spring, useVideoConfig } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Cursor } from '../components/Cursor'
import { Chip, Icon, Svg, Tag, usePop, useRamp } from '../components/Bits'
import { drawObject } from '../lib/objects'
import { cue, f } from '../lib/time'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const HASH = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31'

/** S5 — "Pass, and your credential is signed by the publisher and anchored on BNB Chain. Mint a soulbound badge that
 *  can't be sold or transferred, and add it to LinkedIn straight from the app." (credential B153, demo publisher) */
export const S5Credential: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s5')
  const { fps } = useVideoConfig()
  const a = (sec: number) => at(f(sec))
  const tPass = at(cue('s5', 'Pass,')), tSigned = at(cue('s5', 'signed')), tAnchored = at(cue('s5', 'anchored')), tChain = at(cue('s5', 'Chain.'))
  const tMint = at(cue('s5', 'Mint')), tBadge = at(cue('s5', 'badge')), tSold = at(cue('s5', 'sold')), tTransferred = at(cue('s5', 'transferred,'))
  const tLinked = at(cue('s5', 'LinkedIn')), tApp = at(cue('s5', 'app.'))
  const B = { sheet: [cutIn, a(50.1)], nft: [a(50.1), a(53.75)], share: [a(53.75), cutOut] }

  const orbit = interpolate(frame, [B.sheet[0], B.sheet[1]], [-16, 9], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const signRing = interpolate(frame, [tSigned - 4, tSigned + 6, tAnchored - 2, tAnchored + 4], [0, 1, 1, 0], clamp)
  const qrRing = useRamp(tAnchored - 2, tAnchored + 8)
  // bytes of the credential hash stream down into a block on the chain
  const stream = interpolate(frame, [tAnchored, tChain + 6], [0, 1], clamp)
  const block = usePop(tChain - 6, 12)
  // NFT: badge drops into the wallet, a drag tries to pull it out and it snaps back
  const drop = spring({ frame: frame - tBadge + 8, fps, config: { damping: 11, stiffness: 120 } })
  const pull = interpolate(frame, [tSold - 6, tSold + 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const snap = spring({ frame: frame - (tSold + 7), fps, config: { damping: 7, stiffness: 220 } })
  const dragX = frame < tSold + 7 ? pull * 260 : 260 * (1 - snap)
  const lockedRing = useRamp(tBadge, tBadge + 8)
  const refused = usePop(tTransferred, 12)
  const shareRing = useRamp(tLinked - 6, tLinked + 2)

  return (
    <SceneShell id="s5">
      <Backdrop glowAt={[50, 42]} />
      <Shot from={B.sheet[0]} to={B.sheet[1]} enter="zoom" exit="left">
        <BrowserFrame src="captures/cert.png" url={`/#/app/credentials/${HASH.slice(0, 10)}…`} width={1180} x={370} y={36} rotY={orbit} rotX={4}>
          <Focus x={250} y={786} w={700} h={64} p={signRing} />
          <Focus x={1072} y={648} w={216} h={240} color={C.green} p={qrRing} />
        </BrowserFrame>
        <Chip at={tPass} icon="check" color={C.green} solid style={{ left: 110, top: 150 }} size={30}>Passed · 87 / 100</Chip>
        <Chip at={tSigned} icon="pen" color={C.gold} style={{ left: 110, top: 250 }}>Signed by the publisher</Chip>
        <Tag at={tSigned + 8} style={{ left: 114, top: 336 }}>Demo publisher (fictional) · testnet</Tag>
        {/* hash → block */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: stream > 0 ? 1 : 0 }}>
          {Array.from({ length: 10 }).map((_, i) => {
            const p = Math.min(1, Math.max(0, stream * 1.6 - i * 0.07))
            const x = 1420 + (i % 2) * 40, y = 640 + p * 250
            return <text key={i} x={x} y={y} fill={C.gold} opacity={p > 0 && p < 1 ? 0.95 : 0} fontFamily={MONO} fontWeight={700} fontSize={22}>{HASH.slice(2 + i * 4, 6 + i * 4)}</text>
          })}
        </svg>
        <div style={{ position: 'absolute', left: 1380, top: 860, display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px', borderRadius: 14, background: C.gold, color: '#0b0e11', fontFamily: SANS, fontWeight: 800, fontSize: 28, opacity: block, transform: `translateY(${(1 - block) * 30}px) scale(${0.85 + 0.15 * block})`, boxShadow: `0 0 50px ${C.gold}66` }}>
          <Icon name="chain" size={34} color="#0b0e11" /> Anchored on BNB Chain
        </div>
      </Shot>
      <Shot from={B.nft[0]} to={B.nft[1]} enter="right" exit="up">
        <BrowserFrame src="captures/cert-proof.png" url={`/#/app/credentials/${HASH.slice(0, 10)}…`} width={1180} x={620} y={40} rotY={-6}>
          <Focus x={488} y={338} w={240} h={26} color={C.green} p={lockedRing} />
          <Focus x={488} y={370} w={140} h={26} color={C.green} p={lockedRing} />
          <Focus x={1112} y={206} w={216} h={28} color={C.green} p={lockedRing} />
        </BrowserFrame>
        {/* the wallet slot and the soulbound badge */}
        <div style={{ position: 'absolute', left: 90, top: 250, width: 420, height: 420, borderRadius: 30, background: C.card, border: `2px solid ${C.line2}`, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
          <div style={{ position: 'absolute', left: 26, top: 22, display: 'flex', alignItems: 'center', gap: 10, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.sub }}><Icon name="wallet" size={30} color={C.sub} />Your wallet</div>
          <div style={{ position: 'absolute', left: 70, top: 90, width: 280, height: 280, borderRadius: 24, border: `3px dashed ${C.line2}` }} />
          <div style={{ position: 'absolute', left: 60 + dragX, top: 70 + (1 - Math.min(1, drop)) * -420, transform: `rotate(${dragX * 0.04}deg)` }}>
            <Svg markup={drawObject('result')} vb="20 20 140 140" w={300} h={300} />
          </div>
          <div style={{ position: 'absolute', right: 26, top: 22, display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(14,203,129,0.12)', border: `2px solid ${C.green}`, color: C.green, fontFamily: SANS, fontWeight: 800, fontSize: 20, opacity: lockedRing }}><Icon name="lock" size={20} color={C.green} />Soulbound</div>
        </div>
        <Cursor pts={[{ at: tSold - 12, x: 300, y: 780 }, { at: tSold - 6, x: 250, y: 470, click: true }, { at: tSold + 6, x: 510, y: 470 }, { at: tTransferred + 10, x: 520, y: 520 }]} hideAfter={B.nft[1]} size={40} />
        <div style={{ position: 'absolute', left: 92, top: 700, display: 'flex', alignItems: 'center', gap: 12, padding: '14px 22px', borderRadius: 16, background: 'rgba(246,70,93,0.10)', border: `2px solid ${C.red}`, color: C.text, fontFamily: SANS, fontWeight: 700, fontSize: 26, opacity: refused, transform: `translateY(${(1 - refused) * 20}px)` }}>
          <Icon name="x" size={30} color={C.red} />Can't be sold or transferred
        </div>
        <Tag at={tMint + 4} style={{ left: 94, top: 200 }} color={C.gold}>ERC-5192 · minted on request · BNB testnet</Tag>
      </Shot>
      <Shot from={B.share[0]} to={B.share[1]} enter="up" exit="zoom">
        <BrowserFrame src="captures/cert-share.png" url={`/#/app/credentials/${HASH.slice(0, 10)}…`} width={1240} x={340} y={40} rotY={4}>
          <Focus x={502} y={150} w={292} h={36} p={shareRing} />
          <Cursor pts={[{ at: B.share[0] + 2, x: 900, y: 520 }, { at: tLinked - 2, x: 648, y: 168, click: true }, { at: tApp + 8, x: 700, y: 230 }]} size={40} />
        </BrowserFrame>
        <Chip at={tLinked + 6} icon="link" color={C.gold} style={{ left: 1220, top: 180 }}>Add to LinkedIn</Chip>
      </Shot>
      <AbsoluteFill />
    </SceneShell>
  )
}
