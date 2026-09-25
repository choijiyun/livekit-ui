'use client'

import { useEffect, useState } from 'react'
import { X, Send, Type } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SHARE_COLORS,
  COLOR_HEX,
  type ShareColor,
  type ShareLevel,
} from '@/lib/share'

interface TextShareDialogProps {
  open: boolean
  onClose: () => void
  onSend: (payload: {
    size: number
    color: ShareColor
    level: ShareLevel
    text: string
  }) => void | Promise<void>
}

export function TextShareDialog({ open, onClose, onSend }: TextShareDialogProps) {
  const [text, setText] = useState('')
  const [size, setSize] = useState(15)
  const [color, setColor] = useState<ShareColor>('yellow')
  const [level, setLevel] = useState<ShareLevel>('normal')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) {
      setText('')
      setSize(15)
      setColor('yellow')
      setLevel('normal')
      setSending(false)
    }
  }, [open])

  const submit = async () => {
    if (!text.trim()) return
    setSending(true)
    try {
      await onSend({ size, color, level, text })
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
          <Type className="size-4 text-primary" />
          <h2 className="text-base font-bold">Text 전송</h2>
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
            <label className="text-sm font-medium">텍스트 (한글/영어)</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="스마트글래스로 전송할 내용을 입력하세요…"
              className="resize-none rounded-md border border-input bg-background px-3 py-2 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            />
            <span className="text-xs text-muted-foreground">
              줄 바꿈은 자동으로 \n 으로 전송됩니다.
            </span>
          </div>

          <div className="flex items-end gap-3">
            <div className="flex w-28 flex-col gap-1.5">
              <label className="text-sm font-medium">Size</label>
              <input
                type="number"
                min={6}
                max={200}
                value={size}
                onChange={(e) => setSize(Math.round(Number(e.target.value) || 0))}
                className="h-9 rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
              />
            </div>
            <div className="flex flex-1 flex-col gap-1.5">
              <label className="text-sm font-medium">Color</label>
              <div className="flex flex-wrap gap-1.5">
                {SHARE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    title={c}
                    aria-label={c}
                    aria-pressed={color === c}
                    className={`size-7 rounded-full border-2 transition ${
                      color === c
                        ? 'border-primary ring-2 ring-primary/40'
                        : 'border-border'
                    }`}
                    style={{ backgroundColor: COLOR_HEX[c] }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="text-level" className="text-sm font-medium">
              Level
            </label>
            <select
              id="text-level"
              value={level}
              onChange={(e) => setLevel(e.target.value as ShareLevel)}
              className="h-9 rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
            >
              <option value="normal">일반 (normal)</option>
              <option value="common">공지 (common)</option>
              <option value="warning">주의 (warning)</option>
              <option value="high">중요 (high)</option>
            </select>
          </div>

          {/* Preview */}
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium">미리보기</span>
            <div className="flex max-h-40 min-h-16 items-center justify-center overflow-auto rounded-md border border-border bg-[repeating-conic-gradient(#3a3a3a_0_25%,#2b2b2b_0_50%)] bg-[length:20px_20px] p-3">
              <span
                className="whitespace-pre-wrap break-words text-center font-bold leading-tight"
                style={{ color: COLOR_HEX[color], fontSize: `${Math.min(size, 48)}px` }}
              >
                {text || 'Preview'}
              </span>
            </div>
          </div>

          <div className="flex justify-end">
            <Button size="lg" onClick={submit} disabled={!text.trim() || sending}>
              <Send className="size-4" />
              {sending ? '전송 중…' : '전송'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
