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
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [micEnabled, setMicEnabled] = useState(false)
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
        })
        room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video) setVideoTrack((cur) => (cur === t ? null : cur))
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

        await room.connect(data.url, data.token, { autoSubscribe: false })
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
    const next = !micEnabled
    setMicEnabled(next)
    const room = roomRef.current
    if (room) {
      try {
        await room.localParticipant.setMicrophoneEnabled(next)
      } catch (err) {
        console.log('[v0] toggle mic failed:', String(err))
      }
    }
  }, [micEnabled])

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
    messages,
    micEnabled,
    toggleMic,
    sendChat,
    sendImage,
  }
}

export { DataPacket_Kind }
