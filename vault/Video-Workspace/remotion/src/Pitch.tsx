import React from 'react'
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion'
import { C } from './theme'
import { LineId, SCENE, XF } from './lib/time'
import { Captions } from './components/Captions'
import { CircleWipe } from './components/Stage'
import { Soundtrack } from './audio/Soundtrack'
import { S1Hook } from './scenes/S1Hook'
import { S2Reveal } from './scenes/S2Reveal'
import { S3Learn } from './scenes/S3Learn'
import { S4Agents } from './scenes/S4Agents'
import { S5Credential } from './scenes/S5Credential'
import { S6Verify } from './scenes/S6Verify'
import { S7Pipeline } from './scenes/S7Pipeline'
import { S8Close } from './scenes/S8Close'

const SCENES: Array<[LineId, React.FC]> = [
  ['s1', S1Hook], ['s2', S2Reveal], ['s3', S3Learn], ['s4', S4Agents],
  ['s5', S5Credential], ['s6', S6Verify], ['s7', S7Pipeline], ['s8', S8Close],
]

/** B173 — Lencana 90-second pitch. One timeline: scenes by the VO, captions from the script, sound from the cue sheet. */
export const Pitch: React.FC<{ music: string }> = ({ music }) => {
  const { fps } = useVideoConfig()
  return (
    <AbsoluteFill style={{ backgroundColor: C.bg }}>
      {SCENES.map(([id, Scene]) => (
        <Sequence key={id} name={`Scene ${id}`} from={SCENE[id].start - XF} durationInFrames={SCENE[id].dur + 2 * XF} premountFor={fps}>
          <Scene />
        </Sequence>
      ))}
      {/* brand wipes on the three act changes (ref2): product → agents → credential → back office */}
      <CircleWipe at={SCENE.s3.start} />
      <CircleWipe at={SCENE.s5.start} from={[220, 900]} to={[1700, 180]} />
      <CircleWipe at={SCENE.s7.start} />
      <Captions />
      <Soundtrack music={music} />
    </AbsoluteFill>
  )
}
