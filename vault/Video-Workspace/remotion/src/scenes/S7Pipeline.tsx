import React from 'react'
import { Video } from '@remotion/media'
import { interpolate, staticFile, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Tag, useRamp } from '../components/Bits'
import { FrameStage, Headline } from '../components/Stage'
import belt from '../data/belt.json'
import { cue, rel } from '../lib/time'
import { box, type Box } from '../lib/focus'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const FR = { x: 640, y: 96, w: 1160 }

/** S7 — "Behind it, one transparent pipeline — from enrollment to payout, every payment settled on-chain."
 *  The real Admin belt (B172, FE11) in motion, lifted off its page (exploded view), then the real Revenue view. */
export const S7Pipeline: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s7')
  const { fps } = useVideoConfig()
  const a = (sec: number) => at(rel('s7', sec)) // seconds after the scene's cut
  const tBehind = at(cue('s7', 'Behind')), tPipeline = at(cue('s7', 'pipeline')), tEnroll = at(cue('s7', 'enrollment')), tPayout = at(cue('s7', 'payout,'))
  const tEvery = at(cue('s7', 'every')), tSettled = at(cue('s7', 'settled'))
  const B = { belt: [cutIn, a(5.302)], money: [a(5.302), cutOut] }
  const tShot = (s: number[]) => interpolate(frame, [s[0], s[1]], [0, 1], clamp)

  const lift = useRamp(tPipeline - 10, tPipeline + 12)
  const enrollRing = interpolate(frame, [tEnroll - 4, tEnroll + 4, tPayout - 4, tPayout], [0, 1, 1, 0.3], clamp)
  const payRing = useRamp(tPayout - 2, tPayout + 6)
  const moneyRing = useRamp(tEvery - 4, tEvery + 6)
  const txRing = useRamp(tSettled - 4, tSettled + 6)
  const c = belt.crop
  const inCrop = (b: Box): Box => ({ ...b, x: b.x - c.x, y: b.y - c.y }) // the belt video sits in its own crop box

  return (
    <SceneShell id="s7">
      <Backdrop glowAt={[58, 46]} />
      <Shot from={B.belt[0]} to={B.belt[1]} enter="zoom" exit="up">
        <FrameStage t={tShot(B.belt)} ghost="captures/pub-revenue.png" seed={14}>
          <BrowserFrame persp={false} reflect src="captures/admin.png" url="/#/app/admin" width={FR.w} x={FR.x} y={FR.y}>
            <div style={{ position: 'absolute', left: c.x, top: c.y, width: c.width, height: c.height, overflow: 'hidden', borderRadius: 16 * lift, transform: `translate(${-14 * lift}px, ${-40 * lift}px) scale(${1 + 0.08 * lift})`, boxShadow: `0 ${50 * lift}px ${100 * lift}px rgba(0,0,0,${0.7 * lift}), 0 0 0 ${3 * lift}px ${C.gold}, 0 0 ${60 * lift}px ${C.gold}55`, background: C.card }}>
              <Video src={staticFile('captures/admin-belt.mp4')} premountFor={fps} muted style={{ width: c.width, height: c.height }} />
              <Focus {...inCrop(box('adminEnroll'))} p={enrollRing} />
              <Focus {...inCrop(box('adminPayout'))} color={C.green} p={payRing} />
            </div>
          </BrowserFrame>
        </FrameStage>
        <Headline at={tBehind} text={'One\ntransparent\n*pipeline*.'} size={80} y={200} />
        <Tag at={tPipeline + 6} style={{ left: 106, top: 520 }} color={C.mute}>live testnet data · read 7 Oct 2026</Tag>
        <Chip at={tEnroll - 2} icon="chain" color={C.gold} style={{ left: 104, top: 590 }} size={24}>From enrollment to payout</Chip>
      </Shot>
      <Shot from={B.money[0]} to={B.money[1]} enter="down" exit="zoom">
        <FrameStage t={tShot(B.money)} seed={15}>
          <BrowserFrame persp={false} reflect src="captures/pub-revenue.png" url="/#/app/pub/revenue" width={FR.w} x={FR.x} y={FR.y}>
            <Focus {...box('revenueMoney')} p={moneyRing} />
            <Focus {...box('revenueTx')} color={C.green} p={txRing} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={tEvery - 4} text={'Every\npayment,\n*on-chain*.'} size={80} y={200} />
        <Chip at={tSettled - 2} icon="check" color={C.green} style={{ left: 104, top: 520 }}>Settled on-chain</Chip>
        <Tag at={tSettled + 6} style={{ left: 106, top: 604 }} color={C.gold}>platform fee 10% · read from the contract</Tag>
      </Shot>
    </SceneShell>
  )
}
