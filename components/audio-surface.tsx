'use client'

import { useEffect, useRef } from 'react'
import type { RemoteTrack } from 'livekit-client'

export function AudioSurface({ track }: { track: RemoteTrack }) {
  const ref = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    track.attach(element)
    return () => {
      track.detach(element)
    }
  }, [track])

  return <audio ref={ref} autoPlay />
}
