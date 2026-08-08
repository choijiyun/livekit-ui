'use client'

import { useEffect, useState } from 'react'
import { X, Send, Video } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface RtspShareDialogProps {
  open: boolean
  onClose: () => void
  onSend: (url: string) => void | Promise<void>
}

export function RtspShareDialog({ open, onClose, onSend }: RtspShareDialogProps) {
  const [url, setUrl] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setUrl('')
      setSending(false)
    }
  }, [open])

  const submit = async () => {
    if (!url.trim()) return
    setSending(true)
    try {
      await onSend(url.trim())
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-4">
          <Video className="size-4 text-primary" />
          <h2 className="text-base font-bold">RTSP 전송</h2>
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto"
            onClick={onClose}
            aria-label="닫기"
          >
            <X className="size-4" />
          </Button>
        </header>

        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">RTSP URL</label>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (
                  e.key === 'Enter' &&
                  !e.nativeEvent.isComposing &&
                  e.keyCode !== 229
                ) {
                  e.preventDefault()
                  submit()
                }
              }}
              placeholder="rtsp://192.168.0.10:554/stream1"
              className="h-9 rounded-md border border-input bg-background px-3 font-mono text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <span className="text-xs text-muted-foreground">
              스마트글래스에 연결할 RTSP 스트림 주소를 입력하세요.
            </span>
          </div>

          <div className="flex justify-end">
            <Button size="lg" onClick={submit} disabled={!url.trim() || sending}>
              <Send className="size-4" />
              {sending ? '전송 중…' : '전송'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
