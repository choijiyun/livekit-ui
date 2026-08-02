'use client'

import { useEffect, useRef, useState } from 'react'
import {
  X,
  Mic,
  MicOff,
  Send,
  ImageIcon,
  MessageSquare,
  Radio,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { VideoSurface } from '@/components/video-surface'
import { ImageShareDialog } from '@/components/live/image-share-dialog'
import { useGlRoom, type ChatMessage } from '@/hooks/use-gl-room'
import { config } from '@/lib/config'
import type { RoomInfo } from '@/lib/types'

interface LiveGlProps {
  room: RoomInfo
  mock: boolean
  onClose: () => void
}

export function LiveGl({ room, mock, onClose }: LiveGlProps) {
  const { status, videoTrack, messages, micEnabled, toggleMic, sendChat, sendImage } =
    useGlRoom(room.roomName)
  const [imageOpen, setImageOpen] = useState(false)

  const placeholder =
    status === 'connecting' ? 'connecting' : status === 'mock' ? 'mock' : 'idle'

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

      <div className="flex min-h-0 flex-1">
        {/* Video area */}
        <div className="relative flex min-w-0 flex-1 flex-col bg-black">
          <VideoSurface
            track={videoTrack}
            placeholder={videoTrack ? null : placeholder}
            label={room.participants[0]}
          />
          {/* Audio / control bar */}
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
            <Button
              variant={micEnabled ? 'default' : 'secondary'}
              size="lg"
              onClick={toggleMic}
            >
              {micEnabled ? <Mic className="size-4" /> : <MicOff className="size-4" />}
              {micEnabled ? '마이크 ON' : '마이크 OFF'}
            </Button>
            <Button variant="secondary" size="lg" onClick={() => setImageOpen(true)}>
              <ImageIcon className="size-4" />
              이미지 공유
            </Button>
          </div>
        </div>

        {/* Chat panel */}
        <ChatPanel messages={messages} onSend={sendChat} />
      </div>

      <ImageShareDialog
        open={imageOpen}
        onClose={() => setImageOpen(false)}
        onSend={sendImage}
      />
    </div>
  )
}

function ChatPanel({
  messages,
  onSend,
}: {
  messages: ChatMessage[]
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  const submit = () => {
    onSend(text)
    setText('')
  }

  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-10 items-center gap-2 border-b border-border px-3">
        <MessageSquare className="size-4 text-primary" />
        <span className="text-sm font-semibold">Chat · Data Share</span>
      </div>

      <div ref={scrollRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            메시지 및 공유 이미지가 여기에 표시됩니다.
          </p>
        ) : (
          messages.map((m) => <ChatBubble key={m.id} message={m} />)
        )}
      </div>

      <div className="flex items-end gap-1.5 border-t border-border p-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === 'Enter' &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              e.keyCode !== 229
            ) {
              e.preventDefault()
              submit()
            }
          }}
          rows={2}
          placeholder="메시지 입력…"
          className="min-h-9 flex-1 resize-none rounded-md border border-input bg-background px-2.5 py-1.5 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
        />
        <Button size="icon-lg" onClick={submit} disabled={!text.trim()} aria-label="전송">
          <Send className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <div className={`flex flex-col ${message.self ? 'items-end' : 'items-start'}`}>
      <span className="px-1 text-xs text-muted-foreground">
        {message.self ? config.loginUser : message.sender}
      </span>
      <div
        className={`max-w-[85%] rounded-lg px-2.5 py-1.5 text-sm ${
          message.self
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground'
        }`}
      >
        {message.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={message.image || '/placeholder.svg'}
            alt="공유된 이미지"
            className="max-h-48 rounded"
          />
        ) : (
          <span className="whitespace-pre-wrap break-words">{message.text}</span>
        )}
      </div>
    </div>
  )
}
