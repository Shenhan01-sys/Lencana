import React from 'react'
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { BAR, BrowserFrame, Focus } from '../components/BrowserFrame'
import { Cursor } from '../components/Cursor'
import { Chip, Icon, Tag, usePop, useRamp } from '../components/Bits'
import { FrameStage, Headline } from '../components/Stage'
import { cue, rel } from '../lib/time'
import { box } from '../lib/focus'
import { Lift, SceneShell, Shot, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
/** Product frame on the right, copy on the left (ref2 composition). */
const FR = { x: 640, y: 96, w: 1160 }
const K = FR.w / 1600

/** Typed text appears inside the real input: the filled capture is revealed left→right over the empty one. */
const Typing: React.FC<{ from: number, to: number }> = ({ from, to }) => {
  const frame = useCurrentFrame()
  const p = interpolate(frame, [from, to], [0, 1], clamp)
  return (
    <div style={{ position: 'absolute', left: 366, top: 496, width: 366 * p, height: 48, overflow: 'hidden' }}>
      <Img src={staticFile('captures/login-typed.png')} style={{ position: 'absolute', left: -366, top: -496, width: 1600, height: 1000 }} />
    </div>
  )
}

/** The quiz beat: answers go to the publisher's server, the score comes back from it; a score sent by the page is refused. */
const QuizToServer: React.FC<{ t0: number, tGraded: number, tServer: number, tScores: number, tNever: number }> = ({ t0, tGraded, tServer, tScores, tNever }) => {
  const frame = useCurrentFrame()
  const card = usePop(t0, 15)
  const srv = usePop(tServer - 14, 14)
  const travel = interpolate(frame, [tServer - 10, tServer + 8], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const back = interpolate(frame, [tScores - 10, tScores + 4], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const score = usePop(tScores, 12)
  const refuse = usePop(tNever, 13)
  const opts = ['Only the price of this class, until a deadline', 'My whole balance, any time', 'Anyone may move my tokens', 'The platform mints new coins']
  const picked = frame >= tGraded - 6
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', left: 150, top: 150, width: 720, padding: 34, borderRadius: 22, background: C.card, border: `1px solid ${C.line2}`, boxShadow: `0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px ${C.gold}22`, opacity: card, transform: `perspective(1600px) translateY(${(1 - card) * 60}px) rotateY(8deg)` }}>
        <div style={{ fontFamily: MONO, fontSize: 18, color: C.gold, letterSpacing: '0.12em' }}>QUIZ · 4 QUESTIONS</div>
        <div style={{ fontFamily: SANS, fontWeight: 700, fontSize: 34, color: C.text, margin: '12px 0 22px', lineHeight: 1.2 }}>What does a payment permit allow?</div>
        {opts.map((o, i) => (
          <div key={o} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 18px', marginTop: 10, borderRadius: 14, border: `2px solid ${picked && i === 0 ? C.gold : C.line}`, background: picked && i === 0 ? 'rgba(240,185,11,0.10)' : C.card2, boxShadow: picked && i === 0 ? `0 0 28px ${C.gold}55` : 'none', fontFamily: SANS, fontSize: 25, color: C.sub }}>
            <div style={{ width: 24, height: 24, borderRadius: 24, border: `3px solid ${picked && i === 0 ? C.gold : C.steel}`, background: picked && i === 0 ? C.gold : 'transparent' }} />{o}
          </div>
        ))}
      </div>
      <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
        <path d="M 880 420 C 1030 350, 1140 350, 1260 400" fill="none" stroke={C.line2} strokeWidth={4} strokeDasharray="10 10" opacity={srv} />
        <circle cx={880 + 380 * travel} cy={420 - Math.sin(travel * Math.PI) * 60} r={13} fill={C.gold} opacity={travel > 0 && travel < 1 ? 1 : 0} style={{ filter: `drop-shadow(0 0 12px ${C.gold})` }} />
        <circle cx={1260 - 380 * back} cy={470 + Math.sin(back * Math.PI) * 60} r={13} fill={C.green} opacity={back > 0 && back < 1 ? 1 : 0} style={{ filter: `drop-shadow(0 0 12px ${C.green})` }} />
      </svg>
      <div style={{ position: 'absolute', left: 1270, top: 300, width: 480, padding: '30px 30px 26px', borderRadius: 22, background: C.card, border: `2px solid ${C.gold}`, opacity: srv, transform: `scale(${0.8 + 0.2 * srv})`, boxShadow: `0 0 70px ${C.gold}40` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.text }}><Icon name="server" size={44} color={C.gold} />Publisher's server</div>
        <div style={{ fontFamily: SANS, fontSize: 23, color: C.mute, marginTop: 10 }}>holds the answer key and grades</div>
        <div style={{ marginTop: 22, display: 'flex', alignItems: 'baseline', gap: 14, opacity: score, transform: `scale(${0.7 + 0.3 * score})`, transformOrigin: '0 50%' }}>
          <span style={{ fontFamily: MONO, fontWeight: 800, fontSize: 96, color: C.green, lineHeight: 1, textShadow: `0 0 30px ${C.green}66` }}>100</span>
          <span style={{ fontFamily: SANS, fontSize: 26, color: C.sub }}>/ 100 · graded</span>
        </div>
      </div>
      <div style={{ position: 'absolute', left: 1270, top: 650, width: 480, display: 'flex', alignItems: 'center', gap: 14, padding: '16px 22px', borderRadius: 16, background: 'rgba(246,70,93,0.10)', border: `2px solid ${C.red}`, opacity: refuse, transform: `translateY(${(1 - refuse) * 24}px)` }}>
        <Icon name="x" size={34} color={C.red} />
        <span style={{ fontFamily: MONO, fontSize: 22, color: C.sub }}><s style={{ color: C.mute }}>score: 100</s>{'  '}sent by the page → refused</span>
      </div>
    </AbsoluteFill>
  )
}

/** S3 — sign in with email, pick a course, pay by signing (no gas), learn, quizzes graded by the publisher's server. */
export const S3Learn: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s3')
  const a = (sec: number) => at(rel('s3', sec)) // seconds after the scene's cut
  const tEmail = at(cue('s3', 'email')), tWallet = at(cue('s3', 'wallet')), tCreated = at(cue('s3', 'created'))
  const tPick = at(cue('s3', 'Pick')), tCourse = at(cue('s3', 'course,'))
  const tPay = at(cue('s3', 'pay')), tSigning = at(cue('s3', 'signing')), tGas = at(cue('s3', 'gas')), tFees = at(cue('s3', 'fees'))
  const tLearn = at(cue('s3', 'learn')), tPace = at(cue('s3', 'pace.'))
  const tQuiz = at(cue('s3', 'Quizzes')), tGraded = at(cue('s3', 'graded')), tServer = at(cue('s3', 'server,')), tScores = at(cue('s3', 'scores')), tNever = at(cue('s3', 'never'))
  const B = { login: [cutIn, a(4.03)], catalog: [a(4.03), a(6.04)], pay: [a(6.04), a(8.56)], klass: [a(8.56), a(10.57)], quiz: [a(10.57), cutOut] }
  const tShot = (s: number[]) => interpolate(frame, [s[0], s[1]], [0, 1], clamp)

  // ref1 opening: start inside the glowing email field, pull back to the whole sign-in modal as the wallet is created
  const zoom = interpolate(frame, [tEmail + 6, tWallet - 2], [0, 1], { ...clamp, easing: Easing.bezier(0.65, 0, 0.35, 1) })
  const px = FR.x + 549 * K, py = FR.y + BAR + 520 * K
  const zs = 2.6 - 1.6 * zoom
  const inputGlow = interpolate(frame, [B.login[0], B.login[0] + 8, tWallet - 4, tWallet + 4], [0, 1, 1, 0], clamp)
  const lift = useRamp(tPick, tPick + 12)
  const zoomPay = useRamp(B.pay[0], B.pay[0] + 26)
  const okLine = useRamp(tSigning + 4, tSigning + 14)
  const ctaRing = interpolate(frame, [tPay - 6, tPay, tSigning + 8, tSigning + 14], [0, 1, 1, 0], clamp)
  const ticks = [232, 278, 324, 370].map((_, i) => interpolate(frame, [tLearn + i * 6, tLearn + i * 6 + 6], [0, 1], clamp))

  return (
    <SceneShell id="s3">
      <Backdrop glowAt={[62, 40]} />
      <Shot from={B.login[0]} to={B.login[1]} enter="zoom" exit="left">
        <FrameStage t={tShot(B.login)} ghost="captures/catalog.png" seed={4}>
          <AbsoluteFill style={{ transformOrigin: `${px}px ${py}px`, transform: `translate(${(960 - px) * (1 - zoom)}px, ${(470 - py) * (1 - zoom)}px) scale(${zs})` }}>
            <BrowserFrame persp={false} reflect={zoom > 0.9} src="captures/login.png" url="/#/login" width={FR.w} x={FR.x} y={FR.y}>
              <Typing from={tEmail - 10} to={tEmail + 10} />
              <Focus {...box('loginEmail')} p={inputGlow} />
              <Cursor pts={[{ at: B.login[0] + 4, x: 820, y: 700 }, { at: tEmail - 14, x: 560, y: 522, click: true }, { at: tWallet - 6, x: 560, y: 580, click: true }, { at: B.login[1], x: 640, y: 640 }]} size={40} />
            </BrowserFrame>
          </AbsoluteFill>
        </FrameStage>
        <Headline at={tWallet - 6} text={'Sign in with\n*email*.'} />
        <Chip at={tWallet + 2} icon="wallet" color={C.green} style={{ left: 104, top: 520 }}>Wallet created for you</Chip>
        <Chip at={tCreated + 6} icon="mail" color={C.gold} style={{ left: 104, top: 606 }} size={22}>No seed phrase, just your email</Chip>
        <Tag at={tCreated + 10} style={{ left: 106, top: 684 }} color={C.mute}>embedded wallet by Privy · BNB testnet</Tag>
      </Shot>
      <Shot from={B.catalog[0]} to={B.catalog[1]} enter="right" exit="up">
        <FrameStage t={tShot(B.catalog)} ghost="captures/landing.png" seed={5}>
          <BrowserFrame persp={false} reflect src="captures/catalog.png" url="/#/courses" width={FR.w} x={FR.x} y={FR.y}>
            <Lift src="captures/catalog.png" x={935} y={327} w={540} h={613} p={lift} radius={10} />
            <Cursor pts={[{ at: B.catalog[0], x: 700, y: 760 }, { at: tPick + 2, x: 1190, y: 420, click: true }, { at: B.catalog[1], x: 1230, y: 480 }]} size={40} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={B.catalog[0] + 2} text={'Pick a\n*course*.'} />
        <Tag at={tCourse} style={{ left: 106, top: 520 }}>demo publisher (fictional)</Tag>
        <Tag at={tCourse + 6} style={{ left: 106, top: 568 }} color={C.mute}>courses in Bahasa Indonesia</Tag>
      </Shot>
      <Shot from={B.pay[0]} to={B.pay[1]} enter="down" exit="left">
        <FrameStage t={tShot(B.pay)} seed={6}>
          <BrowserFrame persp={false} src="captures/course-learner.png" url="/#/course/web3-dasar-2026" width={FR.w + 300 * zoomPay} x={FR.x - 60 * zoomPay} y={FR.y - 30 * zoomPay}>
            <Focus {...box('payCta')} p={ctaRing} />
            <Focus {...box('payNote')} color={C.green} p={okLine} />
            <Cursor pts={[{ at: B.pay[0] + 4, x: 1260, y: 640 }, { at: tPay - 2, x: 1150, y: 322, click: true }, { at: B.pay[1], x: 1180, y: 420 }]} size={34} />
          </BrowserFrame>
        </FrameStage>
        <Headline at={tPay - 4} text={'Pay by\n*signing*.'} />
        <Chip at={tGas} icon="bolt" color={C.green} style={{ left: 104, top: 520 }}>No gas fees</Chip>
        <Tag at={tFees + 4} style={{ left: 106, top: 604 }}>LDC-demo = test token on BNB testnet</Tag>
      </Shot>
      <Shot from={B.klass[0]} to={B.klass[1]} enter="up" exit="zoom">
        <FrameStage t={tShot(B.klass)} ghost="captures/course.png" seed={7}>
          <BrowserFrame persp={false} reflect src="captures/class.png" url="/#/class/uji-bayar-2026" width={FR.w} x={FR.x} y={FR.y}>
            {[232, 278, 324, 370].map((y, i) => (
              <div key={y} style={{ position: 'absolute', left: 22, top: y + 10, width: 24, height: 24, borderRadius: 24, background: C.green, transform: `scale(${ticks[i]})`, display: 'grid', placeItems: 'center', boxShadow: `0 0 14px ${C.green}` }}><Icon name="check" size={18} color="#0b0e11" /></div>
            ))}
          </BrowserFrame>
        </FrameStage>
        <Headline at={tLearn - 4} text={'Learn at your\n*own pace*.'} size={76} />
        <Chip at={tPace - 4} icon="check" color={C.green} style={{ left: 104, top: 520 }}>Progress saved, lesson by lesson</Chip>
      </Shot>
      <Shot from={B.quiz[0]} to={B.quiz[1]} enter="zoom" exit="none">
        <QuizToServer t0={tQuiz - 4} tGraded={tGraded} tServer={tServer} tScores={tScores} tNever={tNever} />
      </Shot>
    </SceneShell>
  )
}
