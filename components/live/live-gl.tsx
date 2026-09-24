'use client'

import { useState } from 'react'
import { X, Mic, MicOff, Radio, Camera, AlertTriangle, Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoSurface } from '@/components/video-surface'
import { AudioSurface } from '@/components/audio-surface'
import { ImageShareDialog } from '@/components/live/image-share-dialog'
import { TextShareDialog } from '@/components/live/text-share-dialog'
import { RtspShareDialog } from '@/components/live/rtsp-share-dialog'
import { DataSharePanel } from '@/components/live/data-share-panel'
import { useGlRoom } from '@/hooks/use-gl-room'
import {
  shareImage,
  shareText,
  shareRtsp,
  shareCamera,
  toBase64,
  type ShareColor,
  type ShareHistoryItem,
} from '@/lib/share'
import type { RoomInfo } from '@/lib/types'

interface LiveGlProps {
  room: RoomInfo
  mock: boolean
  user: string
  onClose: () => void
}

let historyCounter = 0
function makeId() {
  historyCounter += 1
  return `share-${Date.now()}-${historyCounter}`
}

export function LiveGl({ room, mock, user, onClose }: LiveGlProps) {
  const {
    status,
    videoTrack,
    audioTracks,
    audioBlocked,
    startAudio,
    micEnabled,
    micBusy,
    micError,
    toggleMic,
  } = useGlRoom(room.roomName, user)

  const [imageOpen, setImageOpen] = useState(false)
  const [textOpen, setTextOpen] = useState(false)
  const [rtspOpen, setRtspOpen] = useState(false)
  const [cameraConfirmOpen, setCameraConfirmOpen] = useState(false)
  const [cameraSending, setCameraSending] = useState(false)
  // History lives only while this Viewer/GL session is open; unmount clears it.
  const [history, setHistory] = useState<ShareHistoryItem[]>([])

  const addHistory = (item: ShareHistoryItem) =>
    setHistory((h) => [item, ...h])

  const placeholder =
    status === 'connecting' ? 'connecting' : status === 'mock' ? 'mock' : 'idle'

  const handleSendImage = async (dataUrl: string) => {
    const res = await shareImage(user, room.roomName, toBase64(dataUrl))
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
    const res = await shareText(user, room.roomName, payload)
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
    const res = await shareRtsp(user, room.roomName, url)
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

  const handleSendCamera = async () => {
    setCameraSending(true)
    const res = await shareCamera(user, room.roomName)
    addHistory({
      id: makeId(),
      type: 'camera',
      at: Date.now(),
      ok: res.ok,
      mock: res.mock,
    })
    setCameraSending(false)
    setCameraConfirmOpen(false)
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
          {audioTracks.map((track) => (
            <AudioSurface key={track.sid} track={track} />
          ))}
          {/* Audio control bar */}
          <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            {micError && (
              <span role="alert" className="rounded bg-black/80 px-2 py-1 text-xs text-white">
                {micError}
              </span>
            )}
            <div className="flex items-center gap-2">
              {audioBlocked && audioTracks.length > 0 && (
                <Button variant="secondary" size="lg" onClick={startAudio}>
                  <Volume2 className="size-4" />
                  소리 켜기
                </Button>
              )}
              <Button
                variant={micEnabled ? 'default' : 'secondary'}
                size="lg"
                onClick={toggleMic}
                disabled={status !== 'connected' || micBusy}
              >
                {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                {micBusy ? '마이크 설정 중…' : micEnabled ? '마이크 ON' : '마이크 OFF'}
              </Button>
            </div>
          </div>
        </div>

        {/* Data share panel */}
        <DataSharePanel
          history={history}
          onOpenImage={() => setImageOpen(true)}
          onOpenText={() => setTextOpen(true)}
          onOpenRtsp={() => setRtspOpen(true)}
          onRequestCamera={() => setCameraConfirmOpen(true)}
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

        {cameraConfirmOpen && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/70 p-6 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-xl">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Camera className="size-5" />
                </span>
                <h2 className="text-lg font-bold">영상공유 요청</h2>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{room.roomName}</span>
                {' '}Smart Glass에 카메라 영상 공유를 요청하시겠습니까?
              </p>
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background/50 p-2.5 text-xs text-muted-foreground">
                <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
                요청 즉시 현장 작업자의 스마트 글래스에서 카메라 영상 송출이 시작됩니다.
              </div>
              <div className="mt-5 flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setCameraConfirmOpen(false)}
                  disabled={cameraSending}
                >
                  취소
                </Button>
                <Button onClick={handleSendCamera} disabled={cameraSending}>
                  <Camera className="size-4" />
                  {cameraSending ? '요청 중…' : '요청 전송'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
