'use client'

import { useState } from 'react'
import { X, Mic, MicOff, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoSurface } from '@/components/video-surface'
import { ImageShareDialog } from '@/components/live/image-share-dialog'
import { TextShareDialog } from '@/components/live/text-share-dialog'
import { RtspShareDialog } from '@/components/live/rtsp-share-dialog'
import { DataSharePanel } from '@/components/live/data-share-panel'
import { useGlRoom } from '@/hooks/use-gl-room'
import {
  shareImage,
  shareText,
  shareRtsp,
  toBase64,
  type ShareColor,
  type ShareHistoryItem,
} from '@/lib/share'
import type { RoomInfo } from '@/lib/types'

interface LiveGlProps {
  room: RoomInfo
  mock: boolean
  onClose: () => void
}

let historyCounter = 0
function makeId() {
  historyCounter += 1
  return `share-${Date.now()}-${historyCounter}`
}

export function LiveGl({ room, mock, onClose }: LiveGlProps) {
  const { status, videoTrack, micEnabled, toggleMic } = useGlRoom(room.roomName)

  const [imageOpen, setImageOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [rtspOpen, setRtspOpen] = useState(false)
  // History lives only while this Viewer/GL session is open; unmount clears it.
  const [history, setHistory] = useState<ShareHistoryItem[]>([])

  const addHistory = (item: ShareHistoryItem) =>
    setHistory((h) => [item, ...h])

  const placeholder =
    status === 'connecting' ? 'connecting' : status === 'mock' ? 'mock' : 'idle'

  const handleSendImage = async (dataUrl: string) => {
    const res = await shareImage(toBase64(dataUrl))
    addHistory({
      id: makeId(),
      type: 'image',
      at: Date.now(),
      ok: res.ok,
      mock: res.mock,
      image: dataUrl,
    })
    setImageOpen(false)
  }

  const handleSendText = async (payload: {
    size: number
    color: ShareColor
    text: string
  }) => {
    const res = await shareText(payload)
    addHistory({
      id: makeId(),
      type: 'text',
      at: Date.now(),
      ok: res.ok,
      mock: res.mock,
      text: payload.text,
      color: payload.color,
      size: payload.size,
    })
    setTextOpen(false)
  }

  const handleSendRtsp = async (url: string) => {
    const res = await shareRtsp(url)
    addHistory({
      id: makeId(),
      type: 'rtsp',
      at: Date.now(),
      ok: res.ok,
      mock: res.mock,
      url,
    })
    setRtspOpen(false)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <span className="flex items-center gap-1.5 rounded bg-destructive/15 px-2 py-0.5 text-xs font-semibold text-destructive">
          <Radio className="size-3.5" />
          LIVE GL
        </span>
        <h1 className="truncate text-lg font-bold">{room.roomName}</h1>
        <span className="truncate text-sm text-muted-foreground">
          {room.participants.join(', ')}
        </span>
        {mock && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
            DEMO
          </span>
        )}
        <Button variant="outline" className="ml-auto" onClick={onClose}>
          <X className="size-4" />
          닫기 (Viewer로)
        </Button>
      </header>

      <div className="relative flex min-h-0 flex-1">
        {/* Video area */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-black">
          <VideoSurface
            track={videoTrack}
            placeholder={videoTrack ? null : placeholder}
            label={room.participants[0]}
          />
          {/* Audio control bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            <Button
              variant={micEnabled ? 'default' : 'secondary'}
              size="lg"
              onClick={toggleMic}
            >
              {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {micEnabled ? '마이크 ON' : '마이크 OFF'}
            </Button>
          </div>
        </div>

        {/* Data share panel */}
        <DataSharePanel
          history={history}
          onOpenImage={() => setImageOpen(true)}
          onOpenText={() => setTextOpen(true)}
          onOpenRtsp={() => setRtspOpen(true)}
        />

        {/* Share popups overlay the whole right main area */}
        <ImageShareDialog
          open={imageOpen}
          onClose={() => setImageOpen(false)}
          onSend={handleSendImage}
        />
        <TextShareDialog
          open={textOpen}
          onClose={() => setTextOpen(false)}
          onSend={handleSendText}
        />
        <RtspShareDialog
          open={rtspOpen}
          onClose={() => setRtspOpen(false)}
          onSend={handleSendRtsp}
        />
      </div>
    </div>
  )
}
