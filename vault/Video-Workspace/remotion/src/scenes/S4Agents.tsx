import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BrowserFrame, Focus } from '../components/BrowserFrame'
import { Chip, Svg, Tag, usePop, useRamp } from '../components/Bits'
import { TOKEN } from '../lib/objects'
import { cue, f } from '../lib/time'
import { Lift, SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const

/** S4 — "Essays go to AI grading agents, each with its own on-chain identity. An agent only proposes a score — it counts
 *  once a second reviewer, appointed by the publisher, approves it. Agent owners bring their own AI model and get hired per job." */
export const S4Agents: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s4')
  const a = (sec: number) => at(f(sec))
  const tEssays = at(cue('s4', 'Essays')), tAgents = at(cue('s4', 'agents,')), tIdentity = at(cue('s4', 'on-chain'))
  const tProposes = at(cue('s4', 'proposes')), tScore = at(cue('s4', 'score'))
  const tSecond = at(cue('s4', 'second')), tAppointed = at(cue('s4', 'appointed')), tApproves = at(cue('s4', 'approves'))
  const tOwners = at(cue('s4', 'owners')), tModel = at(cue('s4', 'model')), tHired = at(cue('s4', 'hired'))
  const B = { agent: [cutIn, a(32.6)], review: [a(32.6), a(39.95)], brain: [a(39.95), cutOut] }

  // essay sheet flies into the robot
  const fly = interpolate(frame, [tEssays - 2, tAgents + 4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const robotLift = useRamp(tIdentity - 6, tIdentity + 8)
  const idCard = usePop(tIdentity, 13)
  // review: proposal ring, then the stamp slams on the beat of "approves"
  const pRing = interpolate(frame, [tProposes - 4, tProposes + 4], [0, 1], clamp)
  const proposedBox = interpolate(frame, [tProposes - 6, tProposes + 2, tApproves - 6, tApproves], [0, 1, 1, 0], clamp)
  const finalBox = useRamp(tApproves, tApproves + 8)
  const okRing = useRamp(tApproves, tApproves + 6)
  const stamp = interpolate(frame, [tApproves - 8, tApproves], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
  const stampHold = interpolate(frame, [tApproves, tApproves + 4, B.review[1]], [1, 1, 1], clamp)
  const shake = frame >= tApproves && frame < tApproves + 6 ? Math.sin((frame - tApproves) * 2.2) * (6 - (frame - tApproves)) * 1.6 : 0
  const proposal = usePop(tScore - 2, 13)
  // brain: provider logos ring, key stays local, hired per job
  const provRing = useRamp(tOwners, tOwners + 10)
  const keyRing = useRamp(tModel - 4, tModel + 8)

  return (
    <SceneShell id="s4">
      <Backdrop glowAt={[50, 40]} />
      <Shot from={B.agent[0]} to={B.agent[1]} enter="zoom" exit="left">
        <BrowserFrame src="captures/owner2534-look.png" url="/#/app/owner" width={1240} x={340} y={40} rotY={-4} rotX={3}>
          <Lift src="captures/owner2534-look.png" x={308} y={396} w={694} h={328} p={robotLift} radius={16} />
        </BrowserFrame>
        {/* the essay travels from the class to the agent */}
        <div style={{ position: 'absolute', left: interpolate(fly, [0, 1], [80, 700]), top: interpolate(fly, [0, 1], [260, 470]) - Math.sin(fly * Math.PI) * 120, opacity: fly > 0 && fly < 1 ? 1 : 0, transform: `rotate(${(1 - fly) * -18}deg) scale(${1.4 - 0.9 * fly})` }}>
          <Svg markup={TOKEN.sheet} vb="0 0 28 28" w={150} h={150} />
        </div>
        <div style={{ position: 'absolute', left: 1180, top: 190, width: 560, padding: '26px 30px', borderRadius: 22, background: C.card, border: `2px solid ${C.gold}`, opacity: idCard, transform: `translateY(${(1 - idCard) * 40}px) rotate(${(1 - idCard) * 4}deg)`, boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 50px ${C.gold}33` }}>
          <div style={{ fontFamily: MONO, fontSize: 19, letterSpacing: '0.14em', color: C.gold }}>ON-CHAIN IDENTITY · ERC-8004</div>
          <div style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: C.text, lineHeight: 1.05, marginTop: 8 }}>#2534</div>
          <div style={{ fontFamily: SANS, fontSize: 26, color: C.sub, marginTop: 6 }}>Lencana essay grading agent</div>
          <div style={{ fontFamily: SANS, fontSize: 22, color: C.mute, marginTop: 6 }}>identity registry on BNB Chain testnet</div>
        </div>
      </Shot>
      <Shot from={B.review[0]} to={B.review[1]} enter="right" exit="up">
        <BrowserFrame src="captures/pub-essays.png" url="/#/app/pub" width={1240} x={340} y={40} rotY={3} rotX={2}>
          <Focus x={612} y={290} w={252} h={135} color={C.amber} p={proposedBox} />
          <Focus x={900} y={290} w={252} h={135} color={C.green} p={finalBox} />
          <Focus x={826} y={634} w={212} h={42} color={C.amber} p={pRing} />
          <Focus x={1052} y={634} w={96} h={42} color={C.green} p={okRing} />
          <Focus x={1190} y={634} w={150} h={42} color={C.green} p={okRing} />
        </BrowserFrame>
        <div style={{ position: 'absolute', left: 120, top: 650, display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 18, background: C.card, border: `2px solid ${C.amber}`, opacity: proposal * (1 - finalBox * 0.5), transform: `scale(${0.8 + 0.2 * proposal})`, transformOrigin: '0 50%' }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 64, color: C.amber }}>98</span>
          <span style={{ fontFamily: SANS, fontSize: 26, color: C.sub, lineHeight: 1.2 }}>proposed by<br />grading agent</span>
        </div>
        <Chip at={tSecond} icon="shield" color={C.green} style={{ left: 120, top: 500 }}>Second reviewer</Chip>
        <Tag at={tAppointed + 2} style={{ left: 124, top: 590 }} color={C.green}>appointed by the publisher · not the proposer</Tag>
        {stamp > 0 ? (
          <div style={{ position: 'absolute', left: 1260, top: 560, transform: `translate(${shake}px, ${(1 - stamp) * -260}px) rotate(-12deg) scale(${2.2 - 1.2 * stamp})`, opacity: Math.min(1, stamp * 1.5) * stampHold }}>
            <div style={{ padding: '14px 34px', border: `8px solid ${C.green}`, borderRadius: 18, color: C.green, fontFamily: SANS, fontWeight: 900, fontSize: 84, letterSpacing: '0.04em', background: 'rgba(11,14,17,0.82)', boxShadow: `0 0 50px ${C.green}55` }}>APPROVED</div>
          </div>
        ) : null}
      </Shot>
      <Shot from={B.brain[0]} to={B.brain[1]} enter="up" exit="zoom">
        <BrowserFrame src="captures/owner2534-brain.png" url="/#/app/owner" width={1240} x={340} y={40} rotY={-3}>
          <Focus x={364} y={597} w={700} h={80} p={provRing} />
          <Focus x={360} y={826} w={1050} h={30} color={C.green} p={keyRing} />
        </BrowserFrame>
        <Chip at={tModel - 6} icon="spark" color={C.gold} style={{ left: 1180, top: 210 }}>Bring your own AI model</Chip>
        <Chip at={tModel + 4} icon="lock" color={C.green} style={{ left: 1180, top: 300 }} size={22}>API key stays in your browser</Chip>
        <Chip at={tHired - 4} icon="coin" color={C.gold} style={{ left: 1180, top: 380 }}>Hired per job · a fee per grading</Chip>
      </Shot>
      <AbsoluteFill />
    </SceneShell>
  )
}
