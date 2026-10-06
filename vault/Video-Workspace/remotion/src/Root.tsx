import React from 'react'
import { Composition } from 'remotion'
import { Pitch } from './Pitch'
import { FPS, TOTAL } from './lib/time'

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition id="LencanaPitch" component={Pitch} durationInFrames={TOTAL} fps={FPS} width={1920} height={1080} />
    </>
  )
}
