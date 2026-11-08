'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Image as ImageIcon,
  Film,
  Play,
  RefreshCw,
  Loader2,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchFiles, fileUrl } from '@/lib/api'
import type { MediaKind, StoredFile } from '@/lib/types'

const titles: Record<MediaKind, string> = { image: 'Image', video: 'Video' }
const empties: Record<MediaKind, string> = {
  image: '저장된 캡처 이미지가 없습니다.',
  video: '저장된 녹화 영상이 없습니다.',
}

// MediaScreen lists the captures (images) or egress recordings (videos) the
// manager keeps in its S3 bucket and opens one in a viewer.
export function MediaScreen({ kind }: { kind: MediaKind }) {
  const [files, setFiles] = useState<StoredFile[]>([])
  const [mock, setMock] = useState(false)
  const [loading, setLoading] = useState(true)
  const [glid, setGlid] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    fetchFiles(kind)
      .then(({ data, mock }) => {
        setFiles(data)
        setMock(mock)
      })
      .finally(() => setLoading(false))
  }, [kind])

  useEffect(() => {
    setSelected(null)
    setGlid('')
    load()
  }, [load])

  const glids = useMemo(() => Array.from(new Set(files.map((f) => f.glid))).sort(), [files])
  const shown = useMemo(() => (glid ? files.filter((f) => f.glid === glid) : files), [files, glid])
  const Icon = kind === 'image' ? ImageIcon : Film

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Icon className="size-5 text-primary" />
        <h1 className="text-lg font-bold">{titles[kind]}</h1>
        <span className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {shown.length} files
        </span>
        {mock && (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-semibold text-primary">
            DEMO
          </span>
        )}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={glid}
            onChange={(e) => setGlid(e.target.value)}
            aria-label="글래스 선택"
            className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
          >
            <option value="">모든 글래스</option>
            {glids.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            새로고침
          </Button>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {loading && files.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Loader2 className="size-8 animate-spin" />
          </div>
        ) : shown.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
            <Icon className="size-14 opacity-40" />
            <p className="text-sm">{empties[kind]}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {shown.map((file, index) => (
              <MediaTile
                key={file.key}
                kind={kind}
                file={file}
                mock={mock}
                onClick={() => setSelected(index)}
              />
            ))}
          </div>
        )}
      </div>

      {selected !== null && shown[selected] && (
        <MediaViewer
          kind={kind}
          file={shown[selected]}
          mock={mock}
          index={selected}
          count={shown.length}
          onMove={(next) => setSelected(next)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}

function MediaTile({
  kind,
  file,
  mock,
  onClick,
}: {
  kind: MediaKind
  file: StoredFile
  mock: boolean
  onClick: () => void
}) {
  const url = fileUrl(file, mock)
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-lg border border-border bg-card text-left transition-colors hover:border-primary"
    >
      <div className="relative aspect-video w-full bg-black">
        {kind === 'image' && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${file.glid} 캡처`}
            loading="lazy"
            className="size-full object-contain"
          />
        ) : kind === 'video' && url ? (
          <video src={url} preload="metadata" muted playsInline className="size-full object-contain" />
        ) : (
          <div className="flex size-full items-center justify-center text-muted-foreground">
            <Film className="size-10 opacity-40" />
          </div>
        )}
        {kind === 'video' && (
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-black/60 text-white transition-colors group-hover:bg-primary">
              <Play className="size-5 fill-current" />
            </span>
          </span>
        )}
        <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs font-medium text-white">
          {file.glid}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5">
        <span className="truncate text-sm font-semibold">{formatTime(file)}</span>
        <span className="shrink-0 text-xs text-muted-foreground">{formatSize(file.size)}</span>
      </div>
    </button>
  )
}

function MediaViewer({
  kind,
  file,
  mock,
  index,
  count,
  onMove,
  onClose,
}: {
  kind: MediaKind
  file: StoredFile
  mock: boolean
  index: number
  count: number
  onMove: (index: number) => void
  onClose: () => void
}) {
  const url = fileUrl(file, mock)
  const downloadUrl = fileUrl(file, mock, true)
  const hasPrev = index > 0
  const hasNext = index < count - 1

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft' && hasPrev) onMove(index - 1)
      else if (e.key === 'ArrowRight' && hasNext) onMove(index + 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, hasPrev, hasNext, onMove, onClose])

  const Icon = kind === 'image' ? ImageIcon : Film

  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-background/98 backdrop-blur-sm">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-4">
        <Icon className="size-5 text-primary" />
        <div className="flex min-w-0 flex-col leading-tight">
          <span className="truncate text-sm font-bold">
            {file.glid} · {formatTime(file)}
          </span>
          <span className="truncate font-mono text-xs text-muted-foreground">{file.key}</span>
        </div>
        <span className="ml-2 shrink-0 text-xs text-muted-foreground">
          {index + 1} / {count}
        </span>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="outline" size="sm" disabled={!hasPrev} onClick={() => onMove(index - 1)} aria-label="이전">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => onMove(index + 1)} aria-label="다음">
            <ChevronRight className="size-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!downloadUrl}
            render={downloadUrl ? <a href={downloadUrl} download /> : undefined}
          >
            <Download className="size-4" />
            다운로드
          </Button>
          <Button variant="outline" size="sm" onClick={onClose}>
            <X className="size-4" />
            닫기
          </Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black p-4">
        {kind === 'image' && url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={`${file.glid} 캡처`} className="max-h-full max-w-full object-contain" />
        ) : kind === 'video' && url ? (
          <video key={url} src={url} controls autoPlay playsInline className="max-h-full max-w-full" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <AlertCircle className="size-8" />
            <p className="text-sm">데모 모드에서는 재생할 파일이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(file: StoredFile): string {
  const at = new Date(file.recorded_at ?? file.last_modified)
  if (Number.isNaN(at.getTime())) return file.key
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())} ${pad(at.getHours())}:${pad(at.getMinutes())}:${pad(at.getSeconds())}`
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`
  return `${bytes} B`
}
