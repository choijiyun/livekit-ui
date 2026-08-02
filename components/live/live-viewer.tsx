'use client'

import { Radio, Server, Maximize2 } from 'lucide-react'
import { VideoSurface } from '@/components/video-surface'
import { useViewerRoom } from '@/hooks/use-viewer-room'
import { config } from '@/lib/config'
import type { LiveSession, RoomInfo } from '@/lib/types'

interface LiveViewerProps {
  session: LiveSession
  mock: boolean
  onSelectRoom: (room: RoomInfo) => void
}

export function LiveViewer({ session, mock, onSelectRoom }: LiveViewerProps) {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Radio className="size-5 text-primary" />
        <h1 className="text-lg font-bold">Live Viewer</h1>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {session.rooms.length} rooms
        </span>
        <div className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
          <Server className="size-3.5" />
          <span className="font-mono">
            {session.livekitIp ?? session.livekitUrl}
            {session.livekitPort ? `:${session.livekitPort}` : ''}
          </span>
          {mock && (
            <span className="rounded bg-primary/15 px-1.5 py-0.5 font-semibold text-primary">
              DEMO
            </span>
          )}
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {session.rooms.map((room) => (
            <ViewerTile
              key={room.roomName}
              room={room}
              onClick={() => onSelectRoom(room)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function ViewerTile({ room, onClick }: { room: RoomInfo; onClick: () => void }) {
  const { status, track } = useViewerRoom(room.roomName, true)

  const placeholder =
    status === 'connecting' ? 'connecting' : status === 'mock' ? 'mock' : 'idle'

  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary"
    >
      <div className="relative aspect-video w-full">
        <VideoSurface
          track={track}
          placeholder={track ? null : placeholder}
          label={room.participants[0]}
        />
        <div className="absolute inset-0 flex items-center justify-center bg-primary/0 opacity-0 transition-opacity group-hover:bg-primary/10 group-hover:opacity-100">
          <span className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground">
            <Maximize2 className="size-4" />
            GL 화면 열기
          </span>
        </div>
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
          <span
            className={`size-1.5 rounded-full ${
              status === 'connected' ? 'bg-emerald-400' : 'bg-primary'
            } animate-pulse`}
          />
          LIVE
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-semibold">{room.roomName}</span>
          <span className="truncate text-xs text-muted-foreground">
            {room.participants.join(', ') || 'no participant'}
          </span>
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">{config.loginUser}</span>
      </div>
    </button>
  )
}
