import React from 'react'
import { Video } from '@remotion/media'
import { Easing, interpolate, staticFile, useVideoConfig } from 'remotion'
import { C } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Tag, useRamp } from '../components/Bits'
import belt from '../data/belt.json'
import { cue, f } from '../lib/time'
import { SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S7 — "Behind it, one transparent pipeline — from enrollment to payout, every payment settled on-chain."
 *  The real Admin belt (B172, FE11) with its own motion recorded from the page, then the real Revenue view. */
export const S7Pipeline: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s7')
  const { fps } = useVideoConfig()
  const a = (sec: number) => at(f(sec))
  const tPipeline = at(cue('s7', 'pipeline')), tEnroll = at(cue('s7', 'enrollment')), tPayout = at(cue('s7', 'payout,'))
  const tEvery = at(cue('s7', 'every')), tSettled = at(cue('s7', 'settled'))
  const B = { belt: [cutIn, a(76.45)], money: [a(76.45), cutOut] }

  const pan = interpolate(frame, [B.belt[0], B.belt[1]], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const W = 1880
  const x = interpolate(pan, [0, 1], [180, -520])
  const enrollRing = interpolate(frame, [tEnroll - 4, tEnroll + 4, tPayout - 4, tPayout], [0, 1, 1, 0.3], clamp)
  const payRing = useRamp(tPayout - 2, tPayout + 6)
  const moneyRing = useRamp(tEvery - 4, tEvery + 6)
  const txRing = useRamp(tSettled - 4, tSettled + 6)

  return (
    <SceneShell id="s7">
      <Backdrop glowAt={[50, 45]} />
      <Shot from={B.belt[0]} to={B.belt[1]} enter="zoom" exit="up">
        <BrowserFrame src="captures/admin.png" url="/#/app/admin" width={W} x={x} y={-40} rotX={8} rotY={-6} viewH={1000 * (W / 1600) * 0.86}>
          <div style={{ position: 'absolute', left: belt.crop.x, top: belt.crop.y, width: belt.crop.width, height: belt.crop.height, overflow: 'hidden' }}>
            <Video src={staticFile('captures/admin-belt.mp4')} premountFor={fps} muted style={{ width: belt.crop.width, height: belt.crop.height }} />
          </div>
          <Focus x={483} y={508} w={162} h={330} p={enrollRing} />
          <Focus x={1293} y={508} w={162} h={330} color={C.green} p={payRing} />
        </BrowserFrame>
        <Chip at={tPipeline - 2} icon="chain" color={C.gold} style={{ left: 110, top: 900 - 70 }}>One transparent pipeline</Chip>
        <Tag at={tPipeline + 6} style={{ left: 1440, top: 846 }} color={C.mute}>live testnet data · read 7 Oct 2026</Tag>
      </Shot>
      <Shot from={B.money[0]} to={B.money[1]} enter="down" exit="zoom">
        <BrowserFrame src="captures/pub-revenue.png" url="/#/app/pub" width={1240} x={340} y={40} rotY={4}>
          <Focus x={296} y={233} w={1184} h={306} p={moneyRing} />
          <Focus x={296} y={730} w={1184} h={248} color={C.green} p={txRing} />
        </BrowserFrame>
        <Chip at={tSettled - 2} icon="check" color={C.green} style={{ left: 1250, top: 690 }}>Settled on-chain</Chip>
        <Tag at={tSettled + 6} style={{ left: 1254, top: 780 }} color={C.gold}>platform fee 10% · read from the contract</Tag>
      </Shot>
    </SceneShell>
  )
}
