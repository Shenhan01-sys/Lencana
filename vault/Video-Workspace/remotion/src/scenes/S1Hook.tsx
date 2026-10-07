import React from 'react'
import { AbsoluteFill, Easing, interpolate } from 'remotion'
import { C, MONO, SANS } from '../theme'
import { Backdrop } from '../components/Backdrop'
import { Cursor } from '../components/Cursor'
import { Icon, type IconName, usePop, useRamp } from '../components/Bits'
import { FullBleed, Headline } from '../components/Stage'
import { cue, SCENE } from '../lib/time'
import { SceneShell, SHARDS, Shot, TILE, useScene } from './shell'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
const ease = Easing.bezier(0.65, 0, 0.35, 1)

/**
 * S1 — the problem, illustrated (draft 5, builder: "+10 s so people immediately get what the problem is, motion-full,
 * the references as the guide"). VO: "A certificate is just a file. Anyone can edit it — new name, higher score. The
 * fake looks real. Checking means asking the issuer… and waiting. So most people just trust it."
 * Shots: the file (ref5 slam) → the edit (ref3 floating tool window, ref1 glossy cursor, ref2 kinetic chips) → which
 * one is edited? (shell game) → asking the issuer along a glowing line (ref4) while a clock spins → a wall of people
 * who just trust it (ref3 avatar wall) → "JUST TRUST IT?" slam → the certificate breaks into the S2 reveal.
 * Nothing here is a claim about Lencana; the generic certificate, names and grades are illustrative.
 */

// ---------- the generic PDF certificate ----------
const Paper: React.FC<{ name: string, grade: string, selName?: number, selGrade?: number, stamp?: number }> = ({ name, grade, selName = 0, selGrade = 0, stamp = 0 }) => (
  <div style={{ width: TILE.w, height: TILE.h, background: '#f3eee2', borderRadius: 6, padding: 26, boxSizing: 'border-box', boxShadow: '0 50px 120px rgba(0,0,0,0.6)', position: 'relative' }}>
    <div style={{ height: '100%', border: '3px double #a88a4a', borderRadius: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, fontFamily: 'Georgia, "Times New Roman", serif', color: '#3b3324', position: 'relative' }}>
      <div style={{ fontSize: 22, letterSpacing: '0.32em', color: '#8a6f37' }}>CERTIFICATE OF COMPLETION</div>
      <div style={{ fontSize: 22, fontStyle: 'italic', color: '#6b604b', marginTop: 10 }}>This certifies that</div>
      <div style={{ fontSize: 66, fontStyle: 'italic', color: '#2b2418', padding: '0 12px', background: selName > 0 ? `rgba(66,133,244,${0.35 * selName})` : 'transparent', minWidth: 300, textAlign: 'center' }}>{name}</div>
      <div style={{ width: 520, height: 2, background: '#c5b08a' }} />
      <div style={{ fontSize: 22, fontStyle: 'italic', color: '#6b604b' }}>has completed the course</div>
      <div style={{ fontSize: 34, color: '#2b2418' }}>Advanced Web Development</div>
      <div style={{ fontSize: 26, color: '#4a4030', marginTop: 8 }}>
        Final grade:{' '}
        <span style={{ display: 'inline-block', minWidth: 64, padding: '0 8px', fontWeight: 700, background: selGrade > 0 ? `rgba(66,133,244,${0.35 * selGrade})` : 'transparent', color: '#2b2418' }}>{grade}</span>
      </div>
      <div style={{ position: 'absolute', left: 70, bottom: 54, width: 220, borderTop: '2px solid #8a7a5a', paddingTop: 6, fontSize: 16, color: '#6b604b', textAlign: 'center' }}>Program Director</div>
      <div style={{ position: 'absolute', right: 80, bottom: 40, width: 110, height: 110, borderRadius: 110, background: '#a3302a', boxShadow: 'inset 0 0 0 8px #8c241f', display: 'grid', placeItems: 'center', color: '#f3d9a8', fontSize: 14, letterSpacing: '0.2em' }}>SEAL</div>
    </div>
    {stamp > 0 ? (
      <div style={{ position: 'absolute', left: 250, top: 250, padding: '10px 34px', border: `9px solid ${C.red}`, borderRadius: 16, color: C.red, fontFamily: SANS, fontWeight: 900, fontSize: 84, letterSpacing: '0.06em', transform: `rotate(-14deg) scale(${2.2 - 1.2 * stamp})`, opacity: Math.min(1, stamp * 1.4), background: 'rgba(243,238,226,0.75)' }}>UNVERIFIED</div>
    ) : null}
  </div>
)
const typedText = (full: string, from: string, p: number) => (p <= 0 ? from : full.slice(0, Math.max(1, Math.round(full.length * p))))

// ---------- the "Edit PDF" tool window (generic, no product) ----------
const TOOLS: Array<[IconName | 'T', string]> = [['T', 'Edit text'], ['pen', 'Draw & sign'], ['id', 'Replace image'], ['check', 'Save as PDF']]
const Toolbar: React.FC<{ p: number, active: number, saved: number }> = ({ p, active, saved }) => (
  <div style={{ position: 'absolute', left: 1330, top: 210, width: 430, padding: 28, borderRadius: 26, background: 'rgba(30,35,41,0.78)', border: `1.5px solid ${C.line2}`, boxShadow: `0 50px 120px rgba(0,0,0,0.6), 0 0 0 1px ${C.amber}22`, opacity: Math.min(1, p * 1.5), transform: `perspective(1600px) translateX(${(1 - p) * 420}px) rotateY(${-34 * (1 - p) - 9}deg) rotateX(4deg)` }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.text }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: `${C.amber}22`, display: 'grid', placeItems: 'center' }}><Icon name="pen" size={28} color={C.amber} /></div>
      Edit PDF
    </div>
    {TOOLS.map(([ic, label], i) => {
      const on = i === active
      return (
        <div key={label} style={{ marginTop: 14, padding: '15px 18px', borderRadius: 15, background: on ? `${C.amber}22` : C.card2, border: `1.5px solid ${on ? C.amber : C.line}`, fontFamily: SANS, fontWeight: on ? 700 : 500, fontSize: 25, color: on ? C.amber : C.sub, display: 'flex', alignItems: 'center', gap: 14 }}>
          {ic === 'T' ? <span style={{ fontFamily: MONO, fontWeight: 800, width: 26, textAlign: 'center' }}>T</span> : <Icon name={ic} size={26} color={on ? C.amber : C.sub} />}
          {label}
        </div>
      )
    })}
    <div style={{ marginTop: 18, fontFamily: MONO, fontSize: 20, color: C.green, opacity: saved }}>✓ saved · certificate_final.pdf</div>
  </div>
)

const EditChip: React.FC<{ p: number, x: number, y: number, children: React.ReactNode }> = ({ p, x, y, children }) => (
  <div style={{ position: 'absolute', left: x, top: y, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 22px', borderRadius: 16, background: C.amber, color: '#0b0e11', fontFamily: SANS, fontWeight: 900, fontSize: 30, letterSpacing: '0.04em', opacity: p, transform: `translateY(${(1 - p) * 26}px) scale(${0.7 + 0.3 * p}) rotate(${-4 * (1 - p)}deg)`, boxShadow: `0 16px 40px rgba(0,0,0,0.5), 0 0 30px ${C.amber}66` }}>
    <Icon name="pen" size={26} color="#0b0e11" />{children}
  </div>
)

// ---------- people ----------
const Person: React.FC<{ size: number, tint?: string }> = ({ size, tint = C.steel }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="49" fill={C.card2} stroke={C.line2} strokeWidth="2" />
    <circle cx="50" cy="40" r="17" fill={tint} />
    <path d="M18 88 C 22 64, 78 64, 82 88 Z" fill={tint} />
  </svg>
)
const Building: React.FC<{ size: number }> = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M10 36 L50 12 L90 36 Z" fill={C.gold} />
    {[20, 38, 56, 74].map((x) => <rect key={x} x={x} y={42} width={8} height={36} rx={2} fill={C.sub} />)}
    <rect x={10} y={80} width={80} height={8} rx={2} fill={C.gold} />
  </svg>
)

// ---------- the ask line (ref4: glowing circuit line, a label travels along it) ----------
const LINE: Array<[number, number]> = [[575, 470], [760, 470], [800, 430], [800, 390], [840, 350], [1080, 350], [1120, 390], [1120, 430], [1160, 470], [1345, 470]]
const along = (p: number) => {
  const seg = LINE.slice(1).map((b, i) => Math.hypot(b[0] - LINE[i][0], b[1] - LINE[i][1]))
  let d = p * seg.reduce((s, v) => s + v, 0)
  for (let i = 0; i < seg.length; i++) {
    if (d <= seg[i]) { const k = d / seg[i]; return [LINE[i][0] + (LINE[i + 1][0] - LINE[i][0]) * k, LINE[i][1] + (LINE[i + 1][1] - LINE[i][1]) * k] }
    d -= seg[i]
  }
  return LINE[LINE.length - 1]
}
const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']

export const S1Hook: React.FC = () => {
  const { frame, at, cutIn, cutOut } = useScene('s1')
  const w = (word: string, nth = 0) => at(cue('s1', word, nth))
  const tFile = w('file.'), tAny = w('Anyone'), tEdit = w('edit'), tNew = w('new'), tName = w('name,'), tHigher = w('higher'), tScore = w('score.')
  const tFake = w('fake'), tLooks = w('looks'), tReal = w('real.')
  const tChecking = w('Checking'), tAsking = w('asking'), tIssuer = w('issuer…'), tAnd = w('and'), tWaiting = w('waiting.')
  const tSo = w('So'), tMost = w('most'), tTrust = w('trust'), tIt = w('it.', 1)
  const tBreak = cutOut - 9 // shards fly in the last ~0.3 s; S2 gathers them into the mark
  // the shell game starts right after the edit is saved, so its labels are readable before "fake" starts the shuffle
  const S = { edit: [cutIn, tScore + 12], game: [tScore + 12, tChecking - 4], ask: [tChecking - 4, tSo - 4], trust: [tSo - 4, cutOut] }

  // shot 1 — the file, then the edit
  const enter = interpolate(frame, [0, 26], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const slide = interpolate(frame, [tAny - 6, tAny + 12], [0, 1], { ...clamp, easing: ease })
  const paperX = 960 - 250 * slide, paperS = 0.82 + 0.04 * slide
  const rotY = interpolate(frame, [0, tFile, tAny + 12], [-22, -10, -3], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const tool = useRamp(tAny - 2, tAny + 16, Easing.bezier(0.16, 1, 0.3, 1))
  const selName = interpolate(frame, [tEdit + 2, tEdit + 6], [0, 1], clamp) * (frame < tNew + 14 ? 1 : 0)
  const nameP = interpolate(frame, [tNew, tNew + 14], [0, 1], clamp)
  const selGrade = interpolate(frame, [tHigher, tHigher + 4], [0, 1], clamp) * (frame < tScore + 4 ? 1 : 0)
  const grade = frame >= tScore + 4 ? 'A+' : frame >= tScore ? 'A' : 'C'
  const chipName = usePop(tName, 12), chipScore = usePop(tScore + 2, 12)
  const saved = useRamp(tScore + 8, tScore + 16)
  const fileTag = usePop(tAny - 2, 13)
  // paper-local → screen (the paper is nearly flat here: rotY ≈ −3°)
  const P = (lx: number, ly: number) => [paperX + (lx - 500) * paperS, 470 + (ly - 350) * paperS] as const
  const [nameX, nameY] = P(500, 300), [gradeX, gradeY] = P(578, 498)

  // shot 2 — which one is edited? (shell game)
  const g0 = S.game[0]
  const dealt = interpolate(frame, [g0, g0 + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const labels = interpolate(frame, [g0 + 4, g0 + 10, tFake + 4, tFake + 8], [0, 1, 1, 0], clamp)
  const sw1 = interpolate(frame, [tFake + 6, tFake + 14], [0, 1], { ...clamp, easing: ease })
  const sw2 = interpolate(frame, [tFake + 14, tFake + 22], [0, 1], { ...clamp, easing: ease })
  const qs = usePop(tReal + 2, 12)
  const lens = interpolate(frame, [tReal + 4, S.game[1] - 2], [0, 1], { ...clamp, easing: Easing.inOut(Easing.sin) })
  const SLOT = [530, 960, 1390]
  // card k starts in slot k; swap 1 exchanges slots 0↔1, swap 2 exchanges 1↔2 (the edited card ends on the right)
  const cardPos = (k: number) => {
    let slot = k, x = SLOT[k], y = 0, top = false
    if (sw1 > 0) {
      if (k === 0) { x = SLOT[0] + (SLOT[1] - SLOT[0]) * sw1; y = -110 * Math.sin(Math.PI * sw1); top = sw1 < 1 }
      if (k === 1) { x = SLOT[1] + (SLOT[0] - SLOT[1]) * sw1; y = 70 * Math.sin(Math.PI * sw1) }
      slot = k === 0 ? (sw1 >= 1 ? 1 : 0) : k === 1 ? (sw1 >= 1 ? 0 : 1) : slot
    }
    if (sw2 > 0 && sw1 >= 1) {
      const inSlot1 = k === 0, inSlot2 = k === 2
      if (inSlot1) { x = SLOT[1] + (SLOT[2] - SLOT[1]) * sw2; y = 70 * Math.sin(Math.PI * sw2) }
      if (inSlot2) { x = SLOT[2] + (SLOT[1] - SLOT[2]) * sw2; y = -110 * Math.sin(Math.PI * sw2); top = sw2 < 1 }
      if (sw2 >= 1) slot = inSlot1 ? 2 : inSlot2 ? 1 : slot
    }
    return { x, y, top, slot }
  }
  const CARDS = [{ name: 'Dana Lee', grade: 'B', tag: 'GENUINE', col: C.green }, { name: 'Sam Rivera', grade: 'A+', tag: 'EDITED', col: C.red }, { name: 'Alex Kim', grade: 'A', tag: 'GENUINE', col: C.green }]

  // shot 3 — asking the issuer, waiting
  const a0 = S.ask[0]
  const drawn = interpolate(frame, [a0 + 2, a0 + 20], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const cards = usePop(a0 + 2, 14)
  const ask = usePop(tAsking - 2, 12)
  const travel = interpolate(frame, [tAsking + 2, tIssuer + 8], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const arrived = frame >= tIssuer + 8
  const typing = frame >= tIssuer + 12
  const clock = usePop(tAnd - 2, 14)
  const spin = Math.max(0, frame - (tAnd - 2)) * 36
  const day = DAYS[Math.min(DAYS.length - 1, Math.max(0, Math.floor((frame - tWaiting) / 4)))]
  const pan = interpolate(frame, [a0, S.ask[1]], [70, -70], clamp)

  // shot 4 — most people just trust it
  const t0 = S.trust[0]
  const wall = interpolate(frame, [t0, t0 + 18], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
  const dolly = interpolate(frame, [t0, tTrust], [1, 1.07], clamp)
  const slamEnd = tIt + 10
  const stamp = interpolate(frame, [slamEnd + 2, slamEnd + 9], [0, 1], { ...clamp, easing: Easing.in(Easing.quad) })
  const broken = frame >= tBreak
  const AV = Array.from({ length: 21 }, (_, i) => ({ col: i % 7, row: Math.floor(i / 7), i })).filter((a) => !(a.row === 1 && a.col >= 2 && a.col <= 4))
  const NO_TICK = new Set([4, 11, 16])

  return (
    <SceneShell id="s1" enter="none" exit="none">
      <Backdrop glowAt={[50, 44]} />

      {/* 1 — the file, then the edit */}
      <Shot from={S.edit[0]} to={S.edit[1]} enter="none" exit="zoom">
        <AbsoluteFill style={{ perspective: 2200 }}>
          <div style={{ position: 'absolute', left: paperX - TILE.w / 2, top: 470 - TILE.h / 2, width: TILE.w, height: TILE.h, opacity: enter, transform: `rotateY(${rotY}deg) rotateX(5deg) scale(${paperS})` }}>
            <Paper name={typedText('Sam Rivera', 'Alex Morgan', nameP)} grade={grade} selName={selName} selGrade={selGrade} />
          </div>
        </AbsoluteFill>
        <div style={{ position: 'absolute', left: paperX - 420, top: 70, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderRadius: 12, background: C.card2, border: `1px solid ${C.line2}`, color: C.text, fontFamily: MONO, fontSize: 24, opacity: fileTag, transform: `translateY(${(1 - fileTag) * 20}px)` }}>
          <svg width="22" height="28" viewBox="0 0 22 28"><path d="M2 2h12l6 6v18H2z" fill={C.sub} /><path d="M14 2v6h6" fill={C.steel} /><rect x="5" y="16" width="12" height="7" rx="1" fill="#c0392b" /></svg>
          certificate_final.pdf
          {saved > 0 ? <span style={{ color: C.amber, fontFamily: SANS, fontWeight: 700, fontSize: 20, display: 'flex', alignItems: 'center', gap: 6, opacity: saved }}><Icon name="pen" size={20} color={C.amber} /> edited</span> : null}
        </div>
        <Toolbar p={tool} active={frame >= tEdit - 2 ? 0 : -1} saved={saved} />
        {/* stickers on the empty paper right of the edited text (not over the header, not over the seal) */}
        <EditChip p={chipName} x={nameX + 150} y={nameY - 36}>NEW NAME</EditChip>
        <EditChip p={chipScore} x={gradeX + 60} y={gradeY - 50}>HIGHER SCORE</EditChip>
        <Cursor pts={[{ at: tAny - 4, x: 1560, y: 900 }, { at: tEdit - 2, x: nameX + 40, y: nameY + 10, click: true }, { at: tHigher - 6, x: nameX + 60, y: nameY + 30 }, { at: tHigher - 1, x: gradeX + 6, y: gradeY + 6, click: true }, { at: S.edit[1], x: gradeX + 120, y: gradeY + 90 }]} size={52} hideAfter={S.edit[1] + 2} />
        <FullBleed from={tFile} to={tAny - 5} bg="#f3eee2" color="#0b0e11" text="JUST A FILE" dot={C.red} size={230} sub="certificate_final.pdf · editable by anyone" />
      </Shot>

      {/* 2 — which one is edited? */}
      <Shot from={S.game[0]} to={S.game[1]} enter="zoom" exit="left">
        <AbsoluteFill style={{ perspective: 2400 }}>
          {[0, 1, 2].map((k) => cardPos(k)).map((c, k) => ({ c, k })).sort((a, b) => Number(a.c.top) - Number(b.c.top)).map(({ c, k }) => (
            <div key={k} style={{ position: 'absolute', left: c.x - TILE.w / 2, top: 540 - TILE.h / 2 + c.y + (1 - dealt) * 300 * (k - 1), width: TILE.w, height: TILE.h, opacity: dealt, transform: `rotateX(8deg) rotateY(${(k - 1) * -4}deg) scale(${0.38 * (c.top ? 1.06 : 1)})` }}>
              <Paper name={CARDS[k].name} grade={CARDS[k].grade} />
            </div>
          ))}
        </AbsoluteFill>
        {[0, 1, 2].map((k) => {
          const c = cardPos(k)
          return (
            <div key={k} style={{ position: 'absolute', left: c.x - 110, top: 360 + c.y * 0.3, width: 220, textAlign: 'center', fontFamily: SANS, fontWeight: 900, fontSize: 30, letterSpacing: '0.12em', color: CARDS[k].col, opacity: labels }}>{CARDS[k].tag}</div>
          )
        })}
        {SLOT.map((x, i) => (
          <div key={i} style={{ position: 'absolute', left: x - 50, top: 300, width: 100, height: 100, borderRadius: 100, display: 'grid', placeItems: 'center', background: C.card, border: `3px solid ${C.gold}`, color: C.gold, fontFamily: SANS, fontWeight: 900, fontSize: 64, opacity: qs, transform: `translateY(${(1 - qs) * 30}px) scale(${0.5 + 0.5 * qs})`, boxShadow: `0 0 40px ${C.gold}55` }}>?</div>
        ))}
        {lens > 0 && lens < 1 ? (
          <div style={{ position: 'absolute', left: 330 + 1260 * lens - 130, top: 540 - 130, width: 260, height: 260, borderRadius: 260, border: `8px solid ${C.gold}`, background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.28), rgba(255,255,255,0.04) 60%)', boxShadow: `0 0 50px ${C.gold}66, inset 0 0 30px rgba(255,255,255,0.15)` }}>
            <div style={{ position: 'absolute', left: 210, top: 210, width: 120, height: 26, borderRadius: 14, background: C.gold, transform: 'rotate(45deg)', transformOrigin: '0 50%' }} />
          </div>
        ) : null}
        <Headline at={tLooks} text={'Which one is *edited*?'} x={360} y={110} width={1200} size={72} align="center" />
      </Shot>

      {/* 3 — asking the issuer… and waiting */}
      <Shot from={S.ask[0]} to={S.ask[1]} enter="right" exit="up">
        <AbsoluteFill style={{ transform: `translateX(${pan}px)` }}>
          <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <polyline points={LINE.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.gold} strokeOpacity={0.18} strokeWidth={14} strokeLinejoin="round" />
            <polyline points={LINE.map((p) => p.join(',')).join(' ')} fill="none" stroke={C.gold} strokeWidth={4} strokeLinejoin="round" strokeDasharray={1400} strokeDashoffset={1400 * (1 - drawn)} style={{ filter: `drop-shadow(0 0 10px ${C.gold})` }} />
          </svg>
          {/* hiring team */}
          <div style={{ position: 'absolute', left: 170, top: 330, width: 400, padding: 26, borderRadius: 26, background: C.card, border: `2px solid ${C.line2}`, opacity: cards, transform: `translateY(${(1 - cards) * 40}px)`, boxShadow: '0 40px 90px rgba(0,0,0,0.55)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Person size={84} tint={C.sub} />
              <div><div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.text }}>Hiring team</div><div style={{ fontFamily: SANS, fontSize: 22, color: C.mute }}>got certificate_final.pdf</div></div>
            </div>
            <div style={{ marginTop: 18, padding: '14px 18px', borderRadius: 16, background: C.card2, border: `1.5px solid ${C.gold}`, fontFamily: SANS, fontWeight: 700, fontSize: 26, color: C.text, opacity: ask, transform: `scale(${0.8 + 0.2 * ask})`, transformOrigin: '0 0' }}>“Is this certificate real?”</div>
          </div>
          {/* issuer */}
          <div style={{ position: 'absolute', left: 1350, top: 330, width: 400, padding: 26, borderRadius: 26, background: C.card, border: `2px solid ${arrived ? C.gold : C.line2}`, opacity: cards, transform: `translateY(${(1 - cards) * 40}px)`, boxShadow: `0 40px 90px rgba(0,0,0,0.55)${arrived ? `, 0 0 40px ${C.gold}44` : ''}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <Building size={84} />
              <div><div style={{ fontFamily: SANS, fontWeight: 800, fontSize: 32, color: C.text }}>The issuer</div><div style={{ fontFamily: SANS, fontSize: 22, color: C.mute }}>school · course provider</div></div>
            </div>
            <div style={{ marginTop: 18, height: 56, padding: '0 18px', borderRadius: 16, background: C.card2, display: 'flex', alignItems: 'center', gap: 10, opacity: typing ? 1 : 0 }}>
              {[0, 1, 2].map((d) => <div key={d} style={{ width: 14, height: 14, borderRadius: 14, background: C.sub, transform: `translateY(${-8 * Math.max(0, Math.sin((frame - d * 4) / 4))}px)` }} />)}
              <span style={{ marginLeft: 10, fontFamily: SANS, fontSize: 22, color: C.mute }}>no reply yet</span>
            </div>
          </div>
          {/* the question travelling the line */}
          {travel > 0 && travel < 1 ? (() => {
            const [x, y] = along(travel)
            return (
              <div style={{ position: 'absolute', left: x - 34, top: y - 34, width: 68, height: 68, borderRadius: 20, background: C.gold, display: 'grid', placeItems: 'center', boxShadow: `0 0 40px ${C.gold}, 0 12px 30px rgba(0,0,0,0.5)` }}>
                <Icon name="mail" size={38} color="#0b0e11" />
              </div>
            )
          })() : null}
          {/* waiting: a clock that won't stop, the week flipping by */}
          <div style={{ position: 'absolute', left: 960 - 130, top: 560, width: 260, textAlign: 'center', opacity: clock, transform: `scale(${0.6 + 0.4 * clock})` }}>
            <svg width={190} height={190} viewBox="0 0 100 100" style={{ filter: `drop-shadow(0 0 22px ${C.amber}66)` }}>
              <circle cx="50" cy="50" r="45" fill={C.card} stroke={C.amber} strokeWidth="5" />
              {Array.from({ length: 12 }).map((_, i) => <line key={i} x1="50" y1="10" x2="50" y2="16" stroke={C.sub} strokeWidth="3" transform={`rotate(${i * 30} 50 50)`} />)}
              <line x1="50" y1="50" x2="50" y2="18" stroke={C.text} strokeWidth="4" strokeLinecap="round" transform={`rotate(${spin} 50 50)`} />
              <line x1="50" y1="50" x2="50" y2="30" stroke={C.amber} strokeWidth="6" strokeLinecap="round" transform={`rotate(${spin / 12} 50 50)`} />
              <circle cx="50" cy="50" r="5" fill={C.amber} />
            </svg>
            <div style={{ marginTop: 10, fontFamily: MONO, fontWeight: 800, fontSize: 40, letterSpacing: '0.2em', color: C.amber, opacity: frame >= tWaiting ? 1 : 0 }}>{day}</div>
          </div>
        </AbsoluteFill>
      </Shot>

      {/* 4 — most people just trust it */}
      <Shot from={S.trust[0]} to={S.trust[1]} enter="zoom" exit="none">
        {!broken ? (
          <AbsoluteFill style={{ transform: `scale(${dolly})` }}>
            {AV.map((a) => {
              const x = 240 + a.col * 240, y = 250 + a.row * 260
              const pop = interpolate(frame, [t0 + a.col * 1.5 + a.row * 2, t0 + 12 + a.col * 1.5 + a.row * 2], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) })
              const tick = NO_TICK.has(a.i) ? 0 : interpolate(frame, [tMost + a.col * 2 + a.row, tMost + 8 + a.col * 2 + a.row], [0, 1], { ...clamp, easing: Easing.out(Easing.back(2)) })
              const sz = 150 - Math.abs(a.row - 1) * 18
              return (
                <div key={a.i} style={{ position: 'absolute', left: x - sz / 2, top: y - sz / 2, opacity: pop * wall, transform: `translateY(${(1 - pop) * 60}px) scale(${0.6 + 0.4 * pop})` }}>
                  <Person size={sz} tint={a.i % 3 === 0 ? C.sub : a.i % 3 === 1 ? C.mute : C.steel} />
                  <div style={{ position: 'absolute', right: -4, bottom: -4, width: 52, height: 52, borderRadius: 52, background: C.green, display: 'grid', placeItems: 'center', transform: `scale(${tick})`, boxShadow: `0 0 20px ${C.green}88` }}><Icon name="check" size={32} color="#0b0e11" /></div>
                </div>
              )
            })}
            <div style={{ position: 'absolute', left: 960 - TILE.w / 2, top: 510 - TILE.h / 2, width: TILE.w, height: TILE.h, transform: `scale(${0.44 * wall})`, opacity: wall }}>
              <Paper name="Sam Rivera" grade="A+" />
            </div>
            <div style={{ position: 'absolute', left: 960 - 160, top: 680, width: 320, textAlign: 'center', fontFamily: MONO, fontSize: 24, color: C.green, opacity: interpolate(frame, [tMost + 10, tMost + 18], [0, 1], clamp) }}>✓ looks fine</div>
          </AbsoluteFill>
        ) : null}
        {frame >= slamEnd && !broken ? (
          <AbsoluteFill style={{ perspective: 2200 }}>
            <div style={{ position: 'absolute', left: TILE.cx - TILE.w / 2, top: TILE.cy - TILE.h / 2, transform: 'rotateX(4deg) scale(0.92)' }}>
              <Paper name="Sam Rivera" grade="A+" stamp={stamp} />
            </div>
          </AbsoluteFill>
        ) : null}
        {broken ? (
          <AbsoluteFill>
            {SHARDS.map((s, i) => {
              const p = interpolate(frame - tBreak - s.delay * 0.3, [0, 12], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
              return <div key={i} style={{ position: 'absolute', left: s.x0, top: s.y0, width: s.tw - 2, height: s.th - 2, background: (s.col + s.row) % 3 === 0 ? '#e9e2d1' : '#f3eee2', border: '1px solid #c5b08a', transform: `translate(${s.dx * p}px, ${s.dy * p}px) rotate(${s.rot * p}deg) scale(${1 - 0.35 * p})`, opacity: 1 - 0.15 * p }} />
            })}
          </AbsoluteFill>
        ) : null}
        <FullBleed from={tTrust} to={slamEnd} bg={C.red} color="#ffffff" text="JUST TRUST IT?" size={190} echo />
      </Shot>
    </SceneShell>
  )
}

export const S1_END = SCENE.s1.end
