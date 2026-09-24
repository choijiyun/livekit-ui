'use client'

import { useState } from 'react'
import { Radio } from 'lucide-react'
import { LiveViewer } from '@/components/live/live-viewer'
import { LiveGl } from '@/components/live/live-gl'
import type { LiveSession, RoomInfo } from '@/lib/types'

interface LivePanelProps {
  session: LiveSession | null
  mock: boolean
  user: string
}

export function LivePanel({ session, mock, user }: LivePanelProps) {
  const [glRoom, setGlRoom] = useState<RoomInfo | null>(null)

  if (!session) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
        <Radio className="size-14 opacity-40" />
        <p className="text-lg font-medium">
          좌측 메뉴에서 Process와 SDWT를 선택한 뒤 Live를 시작하세요.
        </p>
        <p className="text-sm">Select a Process and SDWT, then start Live.</p>
      </div>
    )
  }

  if (glRoom) {
    return (
      <LiveGl
        room={glRoom}
        mock={mock}
        user={user}
        onClose={() => setGlRoom(null)}
      />
    )
  }

  return (
    <LiveViewer
      session={session}
      mock={mock}
      user={user}
      onSelectRoom={(room) => setGlRoom(room)}
    />
  )
}
