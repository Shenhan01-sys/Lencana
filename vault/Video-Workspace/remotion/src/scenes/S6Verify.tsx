import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Icon, Slam, Tag, usePop, useRamp } from '../components/Bits'
import { cue, f } from '../lib/time'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S6 — "Anyone can verify it from a single link — no wallet, no login. If it's ever revoked, everyone sees it.
 *  And it passes the 1EdTech Open Badges 3.0 validator with zero errors." (validator re-run 7 Oct: VALID, 14 checks, 0/0) */
export const S6Verify: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s6')
  const a = (sec: number) => at(f(sec))
  const tLink = at(cue('s6', 'link')), tNo1 = at(cue('s6', 'no')), tNo2 = at(cue('s6', 'no', 1))
  const tIf = at(cue('s6', 'If')), tRevoked = at(cue('s6', 'revoked,')), tEveryone = at(cue('s6', 'everyone'))
  const tPasses = at(cue('s6', 'passes')), tBadges = at(cue('s6', 'Badges')), tZero = at(cue('s6', 'zero'))
  const B = { link: [cutIn, a(59.62)], slam: [a(59.62), a(61.85)], status: [a(61.85), a(64.62)], validator: [a(64.62), cutOut] }

  const typed = interpolate(frame, [B.link[0] + 4, tLink - 2], [0, 1], clamp)
  const linkUrl = '?q=0xb9fb06e5…30c31#/verify'
  const page = useRamp(tLink, tLink + 14)
  const flip = interpolate(frame, [tRevoked - 6, tRevoked + 6], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const validRing = useRamp(B.status[0], B.status[0] + 8)
  const card = usePop(B.validator[0] + 2, 15)
  const zero = usePop(tZero, 10)
  const rows = [['outcome', 'VALID', C.green], ['checks', '14', C.text], ['errors', '0', C.green], ['warnings', '0', C.green]] as const

  return (
    <SceneShell id="s6">
      <Backdrop glowAt={[50, 40]} />
      <Shot from={B.link[0]} to={B.link[1]} enter="zoom" exit="zoom">
        <BrowserFrame src={page > 0.5 ? 'captures/verify-valid-top.png' : 'captures/landing.png'} url={page > 0.5 ? linkUrl : linkUrl.slice(0, Math.round(linkUrl.length * typed))} width={1240} x={340} y={40} rotY={-3}>
          <div style={{ position: 'absolute', inset: 0, background: C.bg, opacity: interpolate(page, [0, 0.5, 1], [0, 1, 0]) }} />
        </BrowserFrame>
        <Chip at={B.link[0] + 4} icon="link" color={C.gold} style={{ left: 120, top: 160 }}>One link from the certificate</Chip>
      </Shot>
      <Shot from={B.slam[0]} to={B.slam[1]} enter="fade" exit="zoom">
        <AbsoluteFill style={{ background: 'rgba(11,14,17,0.55)' }} />
        <Slam at={tNo1 - 2} size={190} style={{ left: 0, right: 0, top: 250, textAlign: 'center' }}>NO WALLET.</Slam>
        <Slam at={tNo2 - 2} size={190} color={C.gold} style={{ left: 0, right: 0, top: 470, textAlign: 'center' }}>NO LOGIN.</Slam>
      </Shot>
      <Shot from={B.status[0]} to={B.status[1]} enter="up" exit="left">
        <AbsoluteFill style={{ perspective: 2400 }}>
          <div style={{ position: 'absolute', inset: 0, transform: `rotateY(${flip * 180}deg)`, transformStyle: 'preserve-3d' }}>
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden' }}>
              <BrowserFrame src="captures/verify-valid.png" url={linkUrl} width={1240} x={340} y={40}>
                <Focus x={250} y={84} w={1120} h={44} color={C.green} p={validRing} />
                <Focus x={300} y={196} w={300} h={50} color={C.green} p={validRing} />
              </BrowserFrame>
            </div>
            <div style={{ position: 'absolute', inset: 0, backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}>
              <BrowserFrame src="captures/verify-revoked.png" url="?q=0xdbd7c72f…5e42#/verify" width={1240} x={340} y={40} rim={C.red}>
                <Focus x={250} y={84} w={1120} h={44} color={C.red} p={flip} />
                <Focus x={300} y={196} w={520} h={50} color={C.red} p={flip} />
              </BrowserFrame>
            </div>
          </div>
        </AbsoluteFill>
        <Chip at={B.status[0] + 4} icon="check" color={C.green} solid style={{ left: 110, top: 760 }} size={28}>Valid · checked on BNB Chain</Chip>
        <Tag at={tIf} style={{ left: 1290, top: 770 }} color={C.mute}>another credential, revoked by its issuer</Tag>
        <Chip at={tEveryone} icon="x" color={C.red} style={{ left: 1260, top: 690 }}>Revoked — permanent, public</Chip>
      </Shot>
      <Shot from={B.validator[0]} to={B.validator[1]} enter="right" exit="zoom">
        <div style={{ position: 'absolute', left: 360, top: 250, width: 1200, padding: '46px 56px', borderRadius: 30, background: C.card, border: `2px solid ${C.green}`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px ${C.green}22`, opacity: card, transform: `translateY(${(1 - card) * 60}px) scale(${0.92 + 0.08 * card})` }}>
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
              return (
                <div key={k} style={{ padding: '22px 24px', borderRadius: 20, background: C.card2, border: `1px solid ${C.line2}`, opacity: p, transform: `translateY(${(1 - p) * 30}px) scale(${big ? 1 + 0.06 * zero * (1 - Math.min(1, (frame - tZero) / 20)) : 1})` }}>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: C.mute, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{k}</div>
                  <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 70, color: col, marginTop: 6 }}>{v}</div>
                </div>
              )
            })}
          </div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: C.mute, marginTop: 30 }}>Credential B153 · run on 7 Oct 2026 · a member validator, not a certification</div>
        </div>
        <Tag at={tPasses} style={{ left: 364, top: 196 }} color={C.green}>Open Badges 3.0 · W3C Verifiable Credentials 2.0</Tag>
      </Shot>
    </SceneShell>
  )
}
