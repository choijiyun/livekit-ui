'use client'

import { useEffect, useRef } from 'react'
import type { Track } from 'livekit-client'
import { VideoOff, Radio } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VideoSurfaceProps {
  track: Track | null
  /** When true, shows a "no signal / demo" placeholder instead of a black box. */
  placeholder?: 'connecting' | 'mock' | 'idle' | null
  label?: string
  className?: string
}

export function VideoSurface({ track, placeholder, label, className }: VideoSurfaceProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !track) return
    track.attach(el)
    return () => {
      track.detach(el)
    }
  }, [track])

  return (
    <div className={cn('relative h-full w-full overflow-hidden bg-black', className)}>
      {track ? (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted
          className="h-full w-full object-cover"
        />
      ) : (
        <PlaceholderContent state={placeholder ?? 'idle'} label={label} />
      )}
    </div>
  )
}

function PlaceholderContent({
  state,
  label,
}: {
  state: 'connecting' | 'mock' | 'idle'
  label?: string
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.02)_10px,rgba(255,255,255,0.02)_20px)] text-muted-foreground">
      {state === 'connecting' ? (
        <>
          <Radio className="size-6 animate-pulse text-primary" />
          <span className="text-sm font-medium">연결 중… Connecting</span>
        </>
      ) : state === 'mock' ? (
        <>
          <div className="flex items-center gap-1.5">
            <span className="size-2 animate-pulse rounded-full bg-primary" />
            <span className="text-sm font-semibold tracking-wide text-foreground">
              DEMO SIGNAL
            </span>
          </div>
          {label ? <span className="text-xs">{label}</span> : null}
          <span className="text-[0.7rem] text-muted-foreground/70">
            실서버 연결 시 실시간 영상 표시
          </span>
        </>
      ) : (
        <>
          <VideoOff className="size-6" />
          <span className="text-sm">신호 없음 No signal</span>
        </>
      )}
    </div>
  )
}
