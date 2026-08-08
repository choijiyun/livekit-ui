'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X, Upload, Monitor, Send, ImageIcon, Trash2, Crop } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageShareDialogProps {
  open: boolean
  onClose: () => void
  onSend: (dataUrl: string) => void | Promise<void>
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export function ImageShareDialog({ open, onClose, onSend }: ImageShareDialogProps) {
  const [image, setImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [capturing, setCapturing] = useState(false)
  const [sending, setSending] = useState(false)

  // Region selection (in displayed pixels, relative to the <img>)
  const [sel, setSel] = useState<Rect | null>(null)
  const [drawing, setDrawing] = useState(false)
  const startRef = useRef<{ x: number; y: number } | null>(null)
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!open) {
      setImage(null)
      setDragging(false)
      setSel(null)
      setSending(false)
    }
  }, [open])

  const setNewImage = useCallback((src: string) => {
    setImage(src)
    setSel(null)
  }, [])

  const readFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith('image/')) return
      const reader = new FileReader()
      reader.onload = () => setNewImage(reader.result as string)
      reader.readAsDataURL(file)
    },
    [setNewImage],
  )

  // Paste support while dialog is open
  useEffect(() => {
    if (!open) return
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) readFile(file)
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [open, readFile])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) readFile(file)
  }

  const captureScreen = async () => {
    setCapturing(true)
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true })
      const track = stream.getVideoTracks()[0]
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      await new Promise((r) => setTimeout(r, 250))
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      setNewImage(canvas.toDataURL('image/png'))
      track.stop()
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.log('[v0] screen capture failed:', String(err))
    } finally {
      setCapturing(false)
    }
  }

  // --- Region drawing on the image ----------------------------------------
  const relPos = (e: React.MouseEvent) => {
    const el = imgRef.current
    if (!el) return null
    const r = el.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - r.left, r.width)),
      y: Math.max(0, Math.min(e.clientY - r.top, r.height)),
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    const p = relPos(e)
    if (!p) return
    startRef.current = p
    setDrawing(true)
    setSel({ x: p.x, y: p.y, w: 0, h: 0 })
  }

  const onMouseMove = (e: React.MouseEvent) => {
    if (!drawing || !startRef.current) return
    const p = relPos(e)
    if (!p) return
    const s = startRef.current
    setSel({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    })
  }

  const onMouseUp = () => {
    setDrawing(false)
    // discard tiny accidental drags
    setSel((cur) => (cur && cur.w > 6 && cur.h > 6 ? cur : null))
  }

  const cropToBase64 = (): string | null => {
    const el = imgRef.current
    if (!el || !sel) return null
    const scaleX = el.naturalWidth / el.clientWidth
    const scaleY = el.naturalHeight / el.clientHeight
    const sx = sel.x * scaleX
    const sy = sel.y * scaleY
    const sw = sel.w * scaleX
    const sh = sel.h * scaleY
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(sw))
    canvas.height = Math.max(1, Math.round(sh))
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(el, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/png')
  }

  const send = async () => {
    if (!image) return
    const payload = sel ? cropToBase64() ?? image : image
    setSending(true)
    try {
      await onSend(payload)
    } finally {
      setSending(false)
    }
  }

  if (!open) return null

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-background/97 backdrop-blur-sm">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <ImageIcon className="size-5 text-primary" />
        <h2 className="text-lg font-bold">이미지 전송 · Image Share</h2>
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

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) readFile(file)
              }}
            />
            <span className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-secondary px-3 text-sm font-medium text-secondary-foreground hover:bg-secondary/80">
              <Upload className="size-4" />
              파일 선택
            </span>
          </label>
          <Button variant="secondary" size="lg" onClick={captureScreen} disabled={capturing}>
            <Monitor className="size-4" />
            {capturing ? '캡처 중…' : '화면 캡처'}
          </Button>
          {sel && (
            <Button variant="outline" size="lg" onClick={() => setSel(null)}>
              <Crop className="size-4" />
              선택 해제
            </Button>
          )}
          {image && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() => setNewImage('')}
              aria-label="이미지 지우기"
            >
              <Trash2 className="size-4" />
              지우기
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {image
              ? '이미지 위를 드래그하면 전송할 사각 영역을 지정할 수 있습니다.'
              : '드래그&드롭 또는 붙여넣기(Ctrl+V)도 지원합니다.'}
          </span>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
            dragging ? 'border-primary bg-primary/10' : 'border-border bg-card'
          }`}
        >
          {image ? (
            <div
              className="relative inline-block max-h-full max-w-full cursor-crosshair select-none"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => drawing && onMouseUp()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={image || '/placeholder.svg'}
                alt="공유할 이미지 미리보기"
                draggable={false}
                className="max-h-[70vh] max-w-full object-contain"
              />
              {sel && (
                <div
                  className="pointer-events-none absolute border-2 border-primary bg-primary/20"
                  style={{ left: sel.x, top: sel.y, width: sel.w, height: sel.h }}
                />
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Upload className="size-12 opacity-40" />
              <p className="text-base font-medium">
                이미지를 여기로 드래그하거나 붙여넣으세요.
              </p>
              <p className="text-sm">Drag & drop, paste, or capture your screen.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          {sel && (
            <span className="mr-auto text-xs font-medium text-primary">
              선택 영역: {Math.round(sel.w)} × {Math.round(sel.h)} px
            </span>
          )}
          <Button size="lg" onClick={send} disabled={!image || sending}>
            <Send className="size-4" />
            {sending ? '전송 중…' : sel ? '선택 영역 전송' : '전체 전송'}
          </Button>
        </div>
      </div>
    </div>
  )
}
