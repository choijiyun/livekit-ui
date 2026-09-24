'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Room,
  RoomEvent,
  Track,
  type RemoteTrack,
  type RemoteTrackPublication,
  type RemoteParticipant,
} from 'livekit-client'
import { fetchToken } from '@/lib/api'
import { liveKitUrl } from '@/lib/livekit-url'

export type ViewerStatus = 'idle' | 'connecting' | 'connected' | 'mock' | 'error'

function isMockUrl(url: string) {
  return url.includes('mock-livekit')
}

/**
 * Connects to a single room and subscribes to VIDEO tracks only.
 * Used by the live viewer grid (view-only tiles).
 */
export function useViewerRoom(roomName: string | null, enabled: boolean, user: string) {
  const [status, setStatus] = useState<ViewerStatus>('idle')
  const [track, setTrack] = useState<RemoteTrack | null>(null)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    if (!enabled || !roomName) {
      setStatus('idle')
      return
    }

    let cancelled = false
    let room: Room | null = null

    async function run() {
      setStatus('connecting')
      setTrack(null)
      try {
        const { data } = await fetchToken(user, roomName!, 'view')
        if (cancelled) return

        if (isMockUrl(data.url)) {
          // No real LiveKit server available in demo/preview.
          setStatus('mock')
          return
        }

        room = new Room({ adaptiveStream: true })
        roomRef.current = room

        room.on(RoomEvent.TrackSubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video) setTrack(t)
        })
        room.on(RoomEvent.TrackUnsubscribed, (t: RemoteTrack) => {
          if (t.kind === Track.Kind.Video) setTrack((cur) => (cur === t ? null : cur))
        })

        // Subscribe to video only: connect without autosubscribe, then
        // selectively subscribe to video publications.
        await room.connect(liveKitUrl(data.url), data.token, { autoSubscribe: false })
        if (cancelled) return
        setStatus('connected')

        const subscribeVideo = (
          pub: RemoteTrackPublication,
          _p: RemoteParticipant,
        ) => {
          if (pub.kind === Track.Kind.Video) pub.setSubscribed(true)
        }
        room.remoteParticipants.forEach((p) =>
          p.trackPublications.forEach((pub) => subscribeVideo(pub, p)),
        )
        room.on(RoomEvent.TrackPublished, subscribeVideo)
      } catch (err) {
        if (cancelled) return
        console.log('[v0] viewer room connect failed:', roomName, String(err))
        setStatus('mock')
      }
    }

    run()

    return () => {
      cancelled = true
      room?.disconnect()
      roomRef.current = null
    }
  }, [roomName, enabled, user])

  return { status, track }
}
