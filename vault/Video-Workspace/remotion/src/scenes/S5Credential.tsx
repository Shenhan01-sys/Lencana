import React from 'react'
import { Video } from '@remotion/media'
import { noise2D } from '@remotion/noise'
import { AbsoluteFill, Easing, Img, interpolate, Sequence, spring, staticFile, useVideoConfig } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Cursor } from '../components/Cursor'
import { Chip, Icon, type IconName, Tag, usePop, useRamp } from '../components/Bits'
import { Bokeh, FrameStage, FullBleed, Headline, Layer, Stage } from '../components/Stage'
import { PointSphere } from '../components/Sphere'
import { Coin } from '../components/Coin'
import CM from '../data/cert-motion.json'
import { cue, rel } from '../lib/time'
import { box, type Box } from '../lib/focus'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const HASH = '0xb9fb06e50c96c7dc4164c7b5d381ae1ca686143edad0b99f3b8882ef96430c31'
const FR = { x: 640, y: 96, w: 1160 }

/** One line of the NFT spec sheet (only facts the README / B169 state: ERC-5192, no transfer/approval/burn, mint refuses a dead credential). */
const Spec: React.FC<{ at: number, dim: number, icon: IconName, color: string, children: React.ReactNode, y: number }> = ({ at, dim, icon, color, children, y }) => {
  const p = usePop(at, 14)
  return (
    <div style={{ position: 'absolute', left: 1040, top: y, width: 780, display: 'flex', alignItems: 'center', gap: 20, padding: '18px 26px', borderRadius: 18, background: 'rgba(24,26,32,0.88)', border: `2px solid ${color}`, boxShadow: `0 0 ${36 * (1 - dim)}px ${color}55`, opacity: p * (1 - dim * 0.45), transform: `translateX(${(1 - p) * 80}px)`, fontFamily: SANS, fontWeight: 700, fontSize: 34, color: C.text }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: `${color}22`, display: 'grid', placeItems: 'center' }}><Icon name={icon} size={34} color={color} /></div>
      {children}
    </div>
  )
}

/** S5 — "Pass, and your credential is signed by the publisher and anchored on BNB Chain. Then mint its soulbound badge — no one
 *  can sell, transfer or burn it, and it's only minted for a valid credential. Add it to LinkedIn straight from the app." */
export const S5Credential: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s5')
  const { fps } = useVideoConfig()
  const a = (sec: number) => at(rel('s5', sec)) // seconds after the scene's cut
  const tPass = at(cue('s5', 'Pass,')), tSigned = at(cue('s5', 'signed')), tAnchored = at(cue('s5', 'anchored')), tChain = at(cue('s5', 'Chain.'))
  const tThen = at(cue('s5', 'Then')), tSoul = at(cue('s5', 'soulbound')), tBadge = at(cue('s5', 'badge'))
  const tSell = at(cue('s5', 'sell,')), tTransfer = at(cue('s5', 'transfer')), tBurn = at(cue('s5', 'burn')), tOnly = at(cue('s5', 'only'))
  const tLinked = at(cue('s5', 'LinkedIn')), tApp = at(cue('s5', 'app.'))
  const B = { sheet: [cutIn, a(5.86)], nft: [a(5.86), a(13.86)], share: [a(13.86), cutOut] }
  const tShot = (s: number[]) => interpolate(frame, [s[0], s[1]], [0, 1], clamp)

  // ---- the certificate hero camera (seconds into the sheet shot; P = the sheet point held at screen (ax, ay)) ----
  const motionAt = B.sheet[0] + 6 // the sheet's own motion starts as the wipe opens
  const u = (frame - B.sheet[0]) / fps
  const end = (B.sheet[1] - B.sheet[0]) / fps
  const KEYS = [
    { u: 0, px: CM.medal.x, py: CM.medal.y, s: 2.35, rx: 16, ry: -32, ax: 960, ay: 520 }, // macro on the medal, low angle
    { u: 1.35, px: CM.medal.x - 8, py: CM.medal.y + 10, s: 2.1, rx: 12, ry: -24, ax: 960, ay: 520 }, // slow creep while it assembles
    { u: 2.55, px: 622, py: 440, s: 0.9, rx: 5, ry: -5, ax: 1190, ay: 548 }, // pull back + orbit to the 3/4 hero view
    { u: end - 0.62, px: 622, py: 440, s: 0.95, rx: 3, ry: 7, ax: 1190, ay: 548 }, // drift while signed + anchored
    { u: end, px: CM.medal.x, py: CM.medal.y, s: 1.9, rx: 4, ry: 0, ax: 960, ay: 520 }, // push into the medal → coin (match cut)
  ]
  const k = (key: 'px' | 'py' | 's' | 'rx' | 'ry' | 'ax' | 'ay') => interpolate(u, KEYS.map((x) => x.u), KEYS.map((x) => x[key]), { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const cam = { px: k('px'), py: k('py'), s: k('s'), rx: k('rx') + noise2D('cam-rx', u * 0.5, 0) * 0.6, ry: k('ry') + noise2D('cam-ry', u * 0.5, 1) * 0.8, ax: k('ax'), ay: k('ay') }
  const dof = interpolate(u, [0, 1.35, 2.4], [9, 8, 0], clamp) // depth of field: far parts blurred in the macro
  const focusR = interpolate(u, [0, 1.35, 2.4], [170, 210, 900], clamp)
  const heroOut = interpolate(frame, [B.sheet[1] - 16, B.sheet[1] - 6], [1, 0], clamp)
  const inSheet = (b: Box): Box => ({ ...b, x: b.x - CM.clip.x, y: b.y - CM.clip.y }) // page px → sheet px

  const signRing = interpolate(frame, [tSigned - 4, tSigned + 6, tAnchored - 2, tAnchored + 4], [0, 1, 1, 0], clamp)
  const qrRing = useRamp(tAnchored - 2, tAnchored + 8)
  const stream = interpolate(frame, [tAnchored, tChain + 8], [0, 1], clamp)
  const lit = interpolate(frame, [tAnchored + 6, tChain + 10], [0, 1], clamp)
  // the medal: minted out of the certificate, then turning slowly; a transfer attempt bounces back
  const mint = interpolate(frame, [tThen - 2, tSoul - 2], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) })
  const spinFast = (frame - tThen) * 14
  const angle = frame < tBadge ? spinFast : 200 + (frame - tBadge) * 2.6
  const pull = interpolate(frame, [tTransfer - 3, tTransfer + 6], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const back = spring({ frame: frame - (tTransfer + 7), fps, config: { damping: 7, stiffness: 220 } })
  const dx = frame < tTransfer + 7 ? pull * 150 : 150 * (1 - back)
  const refusedRing = interpolate(frame, [tTransfer + 6, tTransfer + 10, tTransfer + 26], [0, 1, 0], clamp)
  // match cut: the coin starts where the certificate's medal filled the frame (centre, big) and settles to its place
  const coinSize = frame < tBadge ? 640 - 200 * mint : 440
  const coinX = frame < tBadge ? 960 - 340 * mint : 620
  const coinY = frame < tBadge ? 520 - 50 * mint : 470
  const specDim = (k: number) => (frame > [tBadge, tSell, tTransfer, tBurn, tOnly][k + 1] ? 1 : 0)
  const shareRing = useRamp(tLinked - 6, tLinked + 2)
  const kicker = usePop(tBadge, 16)

  return (
    <SceneShell id="s5">
      <Backdrop glowAt={[46, 46]} />
      <Shot from={B.sheet[0]} to={B.sheet[1]} enter="none" exit="none" hard>
        {/* draft 5 — the REAL certificate sheet playing its own entrance motion (recorded frame-exact, cert-motion.json),
            filmed like a product hero: low-angle macro on the medal while it assembles, a pull-back orbit to a 3/4 view,
            a slow drift while it is signed and anchored, then a push back into the medal that match-cuts to the coin. */}
        <Img src={staticFile('captures/credentials.png')} style={{ position: 'absolute', left: 160, top: 90, width: 1600, opacity: 0.12, filter: 'blur(14px)', transform: `scale(${1.1 + 0.05 * tShot(B.sheet)})` }} />
        <AbsoluteFill style={{ perspective: 1500, perspectiveOrigin: `${cam.ax}px ${cam.ay}px` }}>
          <div style={{ position: 'absolute', left: cam.ax - cam.px, top: cam.ay - cam.py, width: CM.clip.width, height: CM.clip.height, transformOrigin: `${cam.px}px ${cam.py}px`, transform: `rotateX(${cam.rx}deg) rotateY(${cam.ry}deg) scale(${cam.s})`, borderRadius: 20, boxShadow: `0 90px 180px rgba(0,0,0,0.8), 0 0 0 1px ${C.gold}40, 0 0 120px ${C.gold}22`, WebkitBoxReflect: 'below 18px linear-gradient(transparent 72%, rgba(255,255,255,0.10))' }}>
            <Img src={staticFile('captures/cert-motion/f0000.png')} style={{ position: 'absolute', inset: 0, width: CM.clip.width, height: CM.clip.height, borderRadius: 20 }} />
            <Sequence from={motionAt} layout="none">
              <Video src={staticFile(CM.video)} muted style={{ position: 'absolute', inset: 0, width: CM.clip.width, height: CM.clip.height, borderRadius: 20 }} />
            </Sequence>
            {dof > 0.3 ? (
              <Sequence from={motionAt} layout="none">
                <Video src={staticFile(CM.video)} muted style={{ position: 'absolute', inset: 0, width: CM.clip.width, height: CM.clip.height, borderRadius: 20, filter: `blur(${dof}px)`, WebkitMaskImage: `radial-gradient(circle at ${cam.px}px ${cam.py}px, transparent ${focusR}px, black ${focusR + 280}px)`, maskImage: `radial-gradient(circle at ${cam.px}px ${cam.py}px, transparent ${focusR}px, black ${focusR + 280}px)` }} />
              </Sequence>
            ) : null}
            <Focus {...inSheet(box('certSigned'))} p={signRing} />
            <Focus {...inSheet(box('certQr'))} color={C.green} p={qrRing} />
          </div>
        </AbsoluteFill>
        <Bokeh seed={11} count={8} />
        <Headline at={tSigned - 4} out={B.sheet[1] - 16} text={'Signed.\n*Anchored*.'} size={92} />
        <Chip at={tPass} out={B.sheet[1] - 16} icon="check" color={C.green} solid style={{ left: 104, top: 150 }} size={28}>Passed · 87 / 100</Chip>
        <div style={{ opacity: heroOut }}><Tag at={tSigned + 8} style={{ left: 106, top: 520 }}>demo publisher (fictional) · testnet</Tag></div>
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, opacity: stream > 0 ? 1 : 0 }}>
          {Array.from({ length: 12 }).map((_, i) => {
            const p = Math.min(1, Math.max(0, stream * 1.7 - i * 0.06))
            // from below the QR plate in the hero view, along the bottom (not across the sheet's text) into the chain sphere
            const x = 1460 - p * 1090 + (i % 3) * 30, y = 930 - 150 * p + Math.sin(p * Math.PI) * 30 + (i % 2) * 16
            return <text key={i} x={x} y={y} fill={C.gold} opacity={p > 0 && p < 1 ? 0.95 : 0} fontFamily={MONO} fontWeight={700} fontSize={22}>{HASH.slice(2 + i * 4, 6 + i * 4)}</text>
          })}
        </svg>
        <PointSphere cx={330} cy={760} r={130} speed={1.2} lit={lit} label="BNB Chain · testnet" opacity={Math.min(1, stream * 3) * heroOut} />
      </Shot>
      <Shot from={B.nft[0]} to={B.nft[1]} enter="none" exit="up" hard>
        <Stage rx={3} ry={interpolate(frame, [B.nft[0], B.nft[1]], [-5, 4], clamp)}>
          <Layer z={-500} blur={6} opacity={0.32}>
            <BrowserFrame persp={false} src="captures/cert-proof.png" url={`/#/app/credentials/${HASH.slice(0, 10)}…`} width={1300} x={300} y={80} />
          </Layer>
        </Stage>
        <div style={{ position: 'absolute', left: 1042, top: 120, fontFamily: MONO, fontWeight: 700, fontSize: 24, letterSpacing: '0.16em', color: C.gold, opacity: kicker }}>NOT JUST ANY NFT</div>
        <Spec at={tBadge} dim={specDim(0)} icon="lock" color={C.gold} y={180}>Soulbound · ERC-5192</Spec>
        <Spec at={tSell} dim={specDim(1)} icon="x" color={C.red} y={300}>No one can sell it</Spec>
        <Spec at={tTransfer} dim={specDim(2)} icon="x" color={C.red} y={420}>…or transfer it</Spec>
        <Spec at={tBurn} dim={specDim(3)} icon="x" color={C.red} y={540}>…or burn it</Spec>
        <Spec at={tOnly} dim={0} icon="check" color={C.green} y={660}>Minted only for a valid credential</Spec>
        <div style={{ position: 'absolute', left: 620 + dx - 260, top: 470 - 260, width: 520, height: 520, borderRadius: '50%', border: `6px solid ${C.red}`, opacity: refusedRing, transform: `scale(${1 + refusedRing * 0.1})`, boxShadow: `0 0 50px ${C.red}` }} />
        <Coin size={coinSize} angle={angle} x={coinX + dx} y={coinY} glow={1} />
        <Cursor pts={[{ at: tTransfer - 12, x: 760, y: 820 }, { at: tTransfer - 3, x: 640, y: 480, click: true }, { at: tTransfer + 6, x: 790, y: 480 }, { at: tTransfer + 18, x: 820, y: 560 }]} hideAfter={tBurn} size={44} />
        <FullBleed from={tSoul} to={tBadge - 1} bg={C.gold} color="#0b0e11" text="SOULBOUND" dot="#0b0e11" size={250} echo />
      </Shot>
      <Shot from={B.share[0]} to={B.share[1]} enter="up" exit="zoom">
        <FrameStage t={tShot(B.share)} seed={12}>
          <BrowserFrame persp={false} reflect src="captures/cert-share.png" url={`/#/app/credentials/${HASH.slice(0, 10)}…`} width={FR.w} x={FR.x} y={FR.y}>
            <Focus {...box('shareAdd')} p={shareRing} />
            <Cursor pts={[{ at: B.share[0] + 2, x: 900, y: 520 }, { at: tLinked - 2, x: 648, y: 168, click: true }, { at: tApp + 8, x: 700, y: 230 }]} size={40} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={B.share[0] + 4} text={'Add it to\n*LinkedIn*.'} />
      </Shot>
      <AbsoluteFill />
    </SceneShell>
  )
}
