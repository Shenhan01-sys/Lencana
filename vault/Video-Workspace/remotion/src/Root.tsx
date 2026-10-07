import React from 'react'
import { Composition } from 'remotion'
import { Pitch } from './Pitch'
import { FPS, TOTAL } from './lib/time'
import tl from './data/timeline.json'

// `music` can be swapped at render time to audition another score on the same cut:
//   npx remotion render LencanaPitch out/audio-x.wav --codec=wav --props='{"music":"music/alt-hype.mp3"}'
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="LencanaPitch" component={Pitch} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} defaultProps={{ music: tl.music }} />
    </>
  )
}
