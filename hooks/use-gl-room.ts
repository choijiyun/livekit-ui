'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  DataPacket_Kind,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client'
import { fetchToken } from '@/lib/api'
import { config } from '@/lib/config'
import { liveKitUrl } from '@/lib/livekit-url'

export type GlStatus = 'connecting' | 'connected' | 'mock' | 'error'

export interface ChatMessage {
  id: string
  sender: string
  text?: string
  image?: string // data URL
  self: boolean
  ts: number
}

interface DataFrame {
  type: 'chat' | 'image'
  sender: string
  text?: string
  image?: string
  ts: number
}

function isMockUrl(url: string) {
  return url.includes('mock-livekit')
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Full GL session: subscribes to video, enables two-way audio, and uses the
 * LiveKit data channel for chat + image sharing.
 */
export function useGlRoom(roomName: string | null) {
  const [status, setStatus] = useState<GlStatus>('connecting')
  const [videoTrack, setVideoTrack] = useState<RemoteTrack | null>(null)
  const [audioTracks, setAudioTracks] = useState<RemoteTrack[]>([])
  const [audioBlocked, setAudioBlocked] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [micEnabled, setMicEnabled] = useState(false)
  const [micBusy, setMicBusy] = useState(false)
  const [micError, setMicError] = useState<string | null>(null)
  const roomRef = useRef<Room | null>(null)

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => [...prev, m])
  }, [])

  useEffect(() => {
    if (!roomName) return
    let cancelled = false
    let room: Room | null = null

    async function run() {
      setStatus('connecting')
      setMessages([])
      setVideoTrack(null)
      setAudioTracks([])
      setAudioBlocked(false)
      setMicEnabled(false)
      setMicError(null)
      try {
        const { data } = await fetchToken(roomName!, 'full')
        if (cancelled) return

        if (isMockUrl(data.url)) {
          setStatus('mock')
          return
        }

        room = new Room({ adaptiveStream: true, dynacast: true })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video) setVideoTrack(t)
          if (t.kind === Track.Kind.Audio) {
            setAudioTracks((current) =>
              current.includes(t) ? current : [...current, t],
            )
          }
        })
        room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video) setVideoTrack((cur) => (cur === t ? null : cur))
          if (t.kind === Track.Kind.Audio) {
            setAudioTracks((current) => current.filter((track) => track !== t))
          }
        })
        room.on(RoomEvent.AudioPlaybackStatusChanged, (canPlay: boolean) => {
          setAudioBlocked(!canPlay)
        })
        room.on(
          RoomEvent.DataReceived,
          (payload: Uint8Array, participant?: RemoteParticipant) => {
            try {
              const frame = JSON.parse(decoder.decode(payload)) as DataFrame
              addMessage({
                id: `${frame.ts}-${Math.random().toString(36).slice(2)}`,
                sender: participant?.identity ?? frame.sender ?? 'remote',
                text: frame.text,
                image: frame.image,
                self: false,
                ts: frame.ts,
              })
            } catch {
              // ignore malformed frames
            }
          },
        )

        await room.connect(liveKitUrl(data.url), data.token, { autoSubscribe: false })
        if (cancelled) return
        setStatus('connected')

        const subscribeVideo = (pub: RemoteTrackPublication) => {
          if (pub.kind === Track.Kind.Video) pub.setSubscribed(true)
          if (pub.kind === Track.Kind.Audio) pub.setSubscribed(true)
        }
        room.remoteParticipants.forEach((p) =>
          p.trackPublications.forEach((pub) => subscribeVideo(pub)),
        )
        room.on(RoomEvent.TrackPublished, subscribeVideo)
      } catch (err) {
        if (cancelled) return
        console.log('[v0] GL room connect failed:', roomName, String(err))
        setStatus('mock')
      }
    }

    run()
    return () => {
      cancelled = true
      room?.disconnect()
      roomRef.current = null
    }
  }, [roomName, addMessage])

  const toggleMic = useCallback(async () => {
    const room = roomRef.current
    if (!room || status !== 'connected' || micBusy) return
    const next = !micEnabled
    setMicError(null)
    if (next && !window.isSecureContext) {
      setMicError('마이크를 사용하려면 HTTPS 또는 localhost로 접속하세요.')
      return
    }
    setMicBusy(true)
    try {
      await room.localParticipant.setMicrophoneEnabled(next)
      const enabled = room.localParticipant.isMicrophoneEnabled
      setMicEnabled(enabled)
      if (next && !enabled) setMicError('마이크를 켤 수 없습니다. 브라우저 권한을 확인하세요.')
    } catch (err) {
      setMicEnabled(room.localParticipant.isMicrophoneEnabled)
      const name = err instanceof Error ? err.name : ''
      setMicError(
        name === 'NotAllowedError'
          ? '마이크 권한이 거부됐습니다. 브라우저 권한을 확인하세요.'
          : name === 'NotFoundError'
            ? '사용 가능한 마이크를 찾을 수 없습니다.'
            : `마이크를 켤 수 없습니다: ${String(err)}`,
      )
    } finally {
      setMicBusy(false)
    }
  }, [micEnabled, micBusy, status])

  const startAudio = useCallback(async () => {
    const room = roomRef.current
    if (!room) return
    try {
      await room.startAudio()
      setAudioBlocked(!room.canPlaybackAudio)
    } catch (err) {
      console.log('[v0] start audio failed:', String(err))
      setAudioBlocked(true)
    }
  }, [])

  const publishFrame = useCallback(
    (frame: DataFrame) => {
      const room = roomRef.current
      if (room && status === 'connected') {
        try {
          const src = encoder.encode(JSON.stringify(frame))
          const payload = new Uint8Array(src.length)
          payload.set(src)
          room.localParticipant.publishData(payload, { reliable: true })
        } catch (err) {
          console.log('[v0] publishData failed:', String(err))
        }
      }
    },
    [status],
  )

  const sendChat = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      const ts = Date.now()
      publishFrame({ type: 'chat', sender: config.loginUser, text: trimmed, ts })
      addMessage({
        id: `${ts}-self`,
        sender: config.loginUser,
        text: trimmed,
        self: true,
        ts,
      })
    },
    [publishFrame, addMessage],
  )

  const sendImage = useCallback(
    (dataUrl: string) => {
      const ts = Date.now()
      publishFrame({ type: 'image', sender: config.loginUser, image: dataUrl, ts })
      addMessage({
        id: `${ts}-self-img`,
        sender: config.loginUser,
        image: dataUrl,
        self: true,
        ts,
      })
    },
    [publishFrame, addMessage],
  )

  return {
    status,
    videoTrack,
    audioTracks,
    audioBlocked,
    startAudio,
    messages,
    micEnabled,
    micBusy,
    micError,
    toggleMic,
    sendChat,
    sendImage,
  }
}

export { DataPacket_Kind }
