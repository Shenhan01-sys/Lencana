import React from 'react'
import { Video } from '@remotion/media'
import { Easing, interpolate, staticFile, useVideoConfig } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Svg, Tag, usePop, useRamp } from '../components/Bits'
import { FrameStage, Headline } from '../components/Stage'
import { PointSphere } from '../components/Sphere'
import { TOKEN } from '../lib/objects'
import belts from '../data/belt.json'
import { cue, f } from '../lib/time'
import { Lift, SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const FR = { x: 640, y: 96, w: 1160 }
const K = FR.w / 1600

/** S4 — "Essays go to AI grading agents, each with its own on-chain identity. An agent only proposes a score — it counts
 *  once a second reviewer, appointed by the publisher, approves it. Agent owners bring their own AI model and get hired per job."
 *  v3: the Essays page with the B174 belt (recorded in motion), headlines, stage depth. */
export const S4Agents: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s4')
  const { fps } = useVideoConfig()
  const a = (sec: number) => at(f(sec))
  const tEssays = at(cue('s4', 'Essays')), tAgents = at(cue('s4', 'agents,')), tIdentity = at(cue('s4', 'on-chain'))
  const tProposes = at(cue('s4', 'proposes')), tScore = at(cue('s4', 'score'))
  const tSecond = at(cue('s4', 'second')), tAppointed = at(cue('s4', 'appointed')), tApproves = at(cue('s4', 'approves'))
  const tOwners = at(cue('s4', 'owners')), tModel = at(cue('s4', 'model')), tHired = at(cue('s4', 'hired'))
  const B = { agent: [cutIn, a(32.6)], review: [a(32.6), a(39.95)], brain: [a(39.95), cutOut] }
  const tShot = (s: number[]) => interpolate(frame, [s[0], s[1]], [0, 1], clamp)

  const fly = interpolate(frame, [tEssays - 2, tAgents + 4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const robotLift = useRamp(tIdentity - 6, tIdentity + 8)
  const idCard = usePop(tIdentity, 13)
  const sphereLit = interpolate(frame, [tIdentity, tIdentity + 30], [0, 1], clamp)
  const proposeRing = interpolate(frame, [tProposes - 6, tProposes + 2, tApproves - 6, tApproves], [0, 1, 1, 0.25], clamp)
  const doneRing = useRamp(tApproves, tApproves + 8)
  const rowRing = useRamp(tApproves + 4, tApproves + 14)
  const proposalRing = interpolate(frame, [tScore - 4, tScore + 4], [0, 1], clamp)
  const stamp = interpolate(frame, [tApproves - 8, tApproves], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
  const shake = frame >= tApproves && frame < tApproves + 6 ? Math.sin((frame - tApproves) * 2.2) * (6 - (frame - tApproves)) * 1.6 : 0
  const proposal = usePop(tScore - 2, 13)
  const provRing = useRamp(tOwners, tOwners + 10)
  const keyRing = useRamp(tModel - 4, tModel + 8)
  const crop = belts.essays

  return (
    <SceneShell id="s4">
      <Backdrop glowAt={[60, 40]} />
      <Shot from={B.agent[0]} to={B.agent[1]} enter="zoom" exit="left">
        <FrameStage t={tShot(B.agent)} ghost="captures/pub-agents.png" seed={8}>
          <BrowserFrame persp={false} reflect src="captures/owner2534-look.png" url="/#/app/owner" width={FR.w} x={FR.x} y={FR.y}>
            <Lift src="captures/owner2534-look.png" x={308} y={396} w={694} h={328} p={robotLift} radius={16} />
          </BrowserFrame>
        </FrameStage>
        <div style={{ position: 'absolute', left: interpolate(fly, [0, 1], [60, FR.x + 470 * K - 75]), top: interpolate(fly, [0, 1], [280, FR.y + 46 + 520 * K - 75]) - Math.sin(fly * Math.PI) * 140, opacity: fly > 0 && fly < 1 ? 1 : 0, transform: `rotate(${(1 - fly) * -22}deg) scale(${1.5 - 1.0 * fly})`, filter: `drop-shadow(0 18px 30px rgba(0,0,0,0.6))` }}>
          <Svg markup={TOKEN.sheet} vb="0 0 28 28" w={150} h={150} />
        </div>
        <Headline at={tEssays} text={'AI grading\n*agents*.'} />
        <PointSphere cx={1560} cy={250} r={120} speed={1.4} lit={sphereLit} opacity={0.75 * idCard} />
        <div style={{ position: 'absolute', left: 104, top: 520, width: 520, padding: '24px 28px', borderRadius: 22, background: C.card, border: `2px solid ${C.gold}`, opacity: idCard, transform: `translateY(${(1 - idCard) * 40}px)`, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 50px ${C.gold}33` }}>
          <div style={{ fontFamily: MONO, fontSize: 18, letterSpacing: '0.14em', color: C.gold }}>ON-CHAIN IDENTITY · ERC-8004</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 88, color: C.text, lineHeight: 1.05, marginTop: 6 }}>#2534</div>
          <div style={{ fontFamily: SANS, fontSize: 24, color: C.sub, marginTop: 4 }}>Lencana essay grading agent · BNB testnet</div>
        </div>
      </Shot>
      <Shot from={B.review[0]} to={B.review[1]} enter="right" exit="up">
        <FrameStage t={tShot(B.review)} ghost="captures/owner2542.png" seed={9}>
          <BrowserFrame persp={false} reflect src="captures/pub-essays.png" url="/#/app/pub/essays" width={FR.w} x={FR.x} y={FR.y}>
            <div style={{ position: 'absolute', left: crop.crop.x, top: crop.crop.y, width: crop.crop.width, height: crop.crop.height, overflow: 'hidden' }}>
              <Video src={staticFile('captures/essays-belt.mp4')} premountFor={fps} muted style={{ width: crop.crop.width, height: crop.crop.height }} />
            </div>
            <Focus x={604} y={299} w={285} h={289} color={C.amber} p={proposeRing} r={18} />
            <Focus x={888} y={299} w={285} h={289} color={C.green} p={doneRing} r={18} />
            <Focus x={826} y={776} w={212} h={40} color={C.amber} p={proposalRing} />
            <Focus x={319} y={764} w={1138} h={63} color={C.green} p={rowRing} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={tProposes - 4} out={tApproves - 10} text={'An agent\n*proposes*.'} />
        <Headline at={tApproves - 6} text={'A reviewer\n*approves*.'} />
        <div style={{ position: 'absolute', left: 104, top: 520, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 26px', borderRadius: 18, background: C.card, border: `2px solid ${C.amber}`, opacity: proposal * (1 - doneRing * 0.6), transform: `scale(${0.8 + 0.2 * proposal})`, transformOrigin: '0 50%', boxShadow: `0 0 40px ${C.amber}33` }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 60, color: C.amber }}>98</span>
          <span style={{ fontFamily: SANS, fontSize: 24, color: C.sub, lineHeight: 1.2 }}>proposed by<br />grading agent</span>
        </div>
        <Chip at={tSecond} icon="shield" color={C.green} style={{ left: 104, top: 650 }}>Second reviewer</Chip>
        <Tag at={tAppointed + 2} style={{ left: 106, top: 734 }} color={C.green}>appointed by the publisher · not the proposer</Tag>
        {stamp > 0 ? (
          <div style={{ position: 'absolute', left: 1180, top: 300, transform: `translate(${shake}px, ${(1 - stamp) * -300}px) rotate(-12deg) scale(${2.4 - 1.4 * stamp})`, opacity: Math.min(1, stamp * 1.5) }}>
            <div style={{ padding: '14px 34px', border: `8px solid ${C.green}`, borderRadius: 18, color: C.green, fontFamily: SANS, fontWeight: 900, fontSize: 88, letterSpacing: '0.04em', background: 'rgba(11,14,17,0.85)', boxShadow: `0 0 70px ${C.green}77` }}>APPROVED</div>
          </div>
        ) : null}
      </Shot>
      <Shot from={B.brain[0]} to={B.brain[1]} enter="up" exit="zoom">
        <FrameStage t={tShot(B.brain)} ghost="captures/owner2534.png" seed={10}>
          <BrowserFrame persp={false} reflect src="captures/owner2534-brain.png" url="/#/app/owner" width={FR.w} x={FR.x} y={FR.y}>
            <Focus x={364} y={597} w={700} h={80} p={provRing} />
            <Focus x={360} y={826} w={1050} h={30} color={C.green} p={keyRing} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={tOwners - 4} text={'Bring your own\n*AI model*.'} size={72} />
        <Chip at={tModel + 4} icon="lock" color={C.green} style={{ left: 104, top: 520 }} size={22}>API key stays in your browser</Chip>
        <Chip at={tHired - 4} icon="coin" color={C.gold} style={{ left: 104, top: 600 }}>Hired per job · a fee per grading</Chip>
      </Shot>
    </SceneShell>
  )
}
