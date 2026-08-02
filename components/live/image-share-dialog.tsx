'use client'

import { useCallback, useEffect, useState } from 'react'
import { X, Upload, Monitor, Send, ImageIcon, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ImageShareDialogProps {
  open: boolean
  onClose: () => void
  onSend: (dataUrl: string) => void
}

export function ImageShareDialog({ open, onClose, onSend }: ImageShareDialogProps) {
  const [image, setImage] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [capturing, setCapturing] = useState(false)

  useEffect(() => {
    if (!open) {
      setImage(null)
      setDragging(false)
    }
  }, [open])

  const readFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setImage(reader.result as string)
    reader.readAsDataURL(file)
  }, [])

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
      // small delay so the first frame is ready
      await new Promise((r) => setTimeout(r, 250))
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx?.drawImage(video, 0, 0)
      setImage(canvas.toDataURL('image/png'))
      track.stop()
      stream.getTracks().forEach((t) => t.stop())
    } catch (err) {
      console.log('[v0] screen capture failed:', String(err))
    } finally {
      setCapturing(false)
    }
  }

  const send = () => {
    if (!image) return
    onSend(image)
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur-sm">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <ImageIcon className="size-5 text-primary" />
        <h2 className="text-lg font-bold">이미지 공유 · Image Share</h2>
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
          {image && (
            <Button variant="destructive" size="lg" onClick={() => setImage(null)}>
              <Trash2 className="size-4" />
              지우기
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            드래그&드롭 또는 붙여넣기(Ctrl+V)도 지원합니다.
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
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image || '/placeholder.svg'}
              alt="공유할 이미지 미리보기"
              className="max-h-full max-w-full object-contain"
            />
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

        <div className="flex justify-end">
          <Button size="lg" onClick={send} disabled={!image}>
            <Send className="size-4" />
            전송
          </Button>
        </div>
      </div>
    </div>
  )
}
