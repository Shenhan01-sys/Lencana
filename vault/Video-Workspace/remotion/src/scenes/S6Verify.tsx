import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Icon, Tag, usePop, useRamp } from '../components/Bits'
import { FrameStage, FullBleed, Headline, Stage } from '../components/Stage'
import { cue, f } from '../lib/time'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const FR = { x: 640, y: 96, w: 1160 }

/** S6 — "Anyone can verify it from a single link — no wallet, no login. If it's ever revoked, everyone sees it.
 *  And it passes the 1EdTech Open Badges 3.0 validator with zero errors." (validator re-run 7 Oct: VALID, 14 checks, 0/0) */
export const S6Verify: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s6')
  const a = (sec: number) => at(f(sec))
  const tAnyone = at(cue('s6', 'Anyone')), tLink = at(cue('s6', 'link')), tNo1 = at(cue('s6', 'no')), tNo2 = at(cue('s6', 'no', 1))
  const tIf = at(cue('s6', 'If')), tRevoked = at(cue('s6', 'revoked,')), tEveryone = at(cue('s6', 'everyone'))
  const tPasses = at(cue('s6', 'passes')), tBadges = at(cue('s6', 'Badges')), tZero = at(cue('s6', 'zero'))
  const B = { link: [cutIn, a(63.62)], slam: [a(63.62), a(65.85)], status: [a(65.85), a(68.62)], validator: [a(68.62), cutOut] }
  const tShot = (s: number[]) => interpolate(frame, [s[0], s[1]], [0, 1], clamp)

  const typed = interpolate(frame, [B.link[0] + 4, tLink - 2], [0, 1], clamp)
  const linkUrl = '?q=0xb9fb06e5…30c31#/verify'
  const page = useRamp(tLink, tLink + 14)
  const flip = interpolate(frame, [tRevoked - 6, tRevoked + 6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const validRing = useRamp(B.status[0], B.status[0] + 8)
  const card = usePop(B.validator[0] + 2, 15)
  const zero = usePop(tZero, 10)
  const checks = Math.round(interpolate(frame, [tBadges - 10, tBadges + 14], [0, 14], clamp))
  const rows = [['outcome', 'VALID', C.green], ['checks', String(checks), C.text], ['errors', '0', C.green], ['warnings', '0', C.green]] as const
  const tilt = interpolate(frame, [B.validator[0], B.validator[1]], [10, -6], clamp)

  return (
    <SceneShell id="s6">
      <Backdrop glowAt={[58, 40]} />
      <Shot from={B.link[0]} to={B.link[1]} enter="zoom" exit="zoom">
        <FrameStage t={tShot(B.link)} ghost="captures/cert.png" seed={13}>
          <BrowserFrame persp={false} reflect src={page > 0.5 ? 'captures/verify-valid-top.png' : 'captures/landing.png'} url={page > 0.5 ? linkUrl : linkUrl.slice(0, Math.round(linkUrl.length * typed))} width={FR.w} x={FR.x} y={FR.y}>
            <div style={{ position: 'absolute', inset: 0, background: C.bg, opacity: interpolate(page, [0, 0.5, 1], [0, 1, 0]) }} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={tAnyone} text={'Verify from\n*one link*.'} />
        <Chip at={tLink - 6} icon="link" color={C.gold} style={{ left: 104, top: 520 }}>The link printed on the certificate</Chip>
      </Shot>
      <Shot from={B.slam[0]} to={B.slam[1]} enter="none" exit="none">
        <FullBleed from={tNo1 - 2} to={tNo2 - 3} bg={C.gold} color="#0b0e11" text="NO WALLET" dot="#0b0e11" size={250} echo />
        <FullBleed from={tNo2 - 3} to={B.slam[1]} bg="#0b0e11" color={C.gold} text="NO LOGIN" dot={C.text} size={250} echo />
      </Shot>
      <Shot from={B.status[0]} to={B.status[1]} enter="up" exit="left">
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${flip * 180}deg)`, transformStyle: 'preserve-3d' }}>
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
              <BrowserFrame src="captures/verify-valid.png" url={linkUrl} width={FR.w} x={FR.x} y={FR.y}>
                <Focus x={250} y={84} w={1120} h={44} color={C.green} p={validRing} />
                <Focus x={300} y={196} w={300} h={50} color={C.green} p={validRing} />
              </BrowserFrame>
            </div>
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <BrowserFrame src="captures/verify-revoked.png" url="?q=0xdbd7c72f…5e42#/verify" width={FR.w} x={FR.x} y={FR.y} rim={C.red}>
                <Focus x={250} y={84} w={1120} h={44} color={C.red} p={flip} />
                <Focus x={300} y={196} w={520} h={50} color={C.red} p={flip} />
              </BrowserFrame>
            </div>
          </div>
        </AbsoluteFill>
        <Headline at={B.status[0] + 2} out={tIf - 6} text={'Valid.\n*Checked*\non chain.'} size={80} y={200} />
        <Headline at={tIf - 2} text={'Revoked?\n*Everyone*\nsees it.'} size={80} y={200} />
        <Tag at={tIf + 2} style={{ left: 106, top: 540 }} color={C.mute}>another credential, revoked by its issuer</Tag>
        <Chip at={tEveryone} icon="x" color={C.red} style={{ left: 104, top: 600 }}>Permanent, public</Chip>
      </Shot>
      <Shot from={B.validator[0]} to={B.validator[1]} enter="right" exit="zoom">
        <Stage rx={6} ry={tilt}>
          <div style={{ position: 'absolute', left: 360, top: 250, width: 1200, padding: '46px 56px', borderRadius: 30, background: C.card, border: `2px solid ${C.green}`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 90px ${C.green}2a`, opacity: card, transform: `translateY(${(1 - card) * 60}px) scale(${0.92 + 0.08 * card})`, WebkitBoxReflect: 'below 18px linear-gradient(transparent 70%, rgba(255,255,255,0.10))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{ width: 82, height: 82, borderRadius: 20, background: 'rgba(14,203,129,0.12)', border: `2px solid ${C.green}`, display: 'grid', placeItems: 'center' }}><Icon name="shield" size={50} color={C.green} /></div>
              <div>
                <div style={{ fontFamily: MONO, fontSize: 22, letterSpacing: '0.14em', color: C.green }}>THIRD-PARTY CHECK · vc.1ed.tech</div>
                <div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 52, color: C.text, marginTop: 4 }}>1EdTech Open Badges 3.0 validator</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22, marginTop: 40 }}>
              {rows.map(([k, v, col], i) => {
                const p = interpolate(frame, [tBadges - 10 + i * 5, tBadges - 2 + i * 5], [0, 1], clamp)
                const big = k === 'errors' || k === 'warnings'
                const pulse = big ? 1 + 0.08 * zero * Math.max(0, 1 - (frame - tZero) / 18) : 1
                return (
                  <div key={k} style={{ padding: '22px 24px', borderRadius: 20, background: C.card2, border: `1px solid ${big && zero > 0 ? C.green : C.line2}`, opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${pulse})`, boxShadow: big ? `0 0 ${40 * zero}px ${C.green}44` : 'none' }}>
                    <div style={{ fontFamily: MONO, fontSize: 20, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                    <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 72, color: col, marginTop: 6 }}>{v}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 24, color: C.mute, marginTop: 30 }}>Credential B153 · run on 7 Oct 2026 · a member validator, not a certification</div>
          </div>
        </Stage>
        <Tag at={tPasses} style={{ left: 364, top: 196 }} color={C.green}>Open Badges 3.0 · W3C Verifiable Credentials 2.0</Tag>
      </Shot>
    </SceneShell>
  )
}
