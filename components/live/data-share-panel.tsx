'use client'

import {
  Share2,
  ImageIcon,
  Type,
  Video,
  Check,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { COLOR_HEX, type ShareHistoryItem } from '@/lib/share'

interface DataSharePanelProps {
  history: ShareHistoryItem[]
  onOpenImage: () => void
  onOpenText: () => void
  onOpenRtsp: () => void
}

export function DataSharePanel({
  history,
  onOpenImage,
  onOpenText,
  onOpenRtsp,
}: DataSharePanelProps) {
  return (
    <div className="flex w-80 shrink-0 flex-col border-l border-border bg-card">
      <div className="flex h-10 items-center gap-2 border-b border-border px-3">
        <Share2 className="size-4 text-primary" />
        <span className="text-sm font-semibold">Data Share · Smart Glass</span>
      </div>

      {/* Send actions */}
      <div className="grid grid-cols-1 gap-2 border-b border-border p-3">
        <Button size="lg" className="justify-start" onClick={onOpenImage}>
          <ImageIcon className="size-4" />
          이미지 전송
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="justify-start"
          onClick={onOpenText}
        >
          <Type className="size-4" />
          Text 전송
        </Button>
        <Button
          size="lg"
          variant="secondary"
          className="justify-start"
          onClick={onOpenRtsp}
        >
          <Video className="size-4" />
          RTSP 전송
        </Button>
      </div>

      {/* History */}
      <div className="flex h-9 items-center justify-between px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>전송 이력</span>
        <span>{history.length}</span>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 pb-3">
        {history.length === 0 ? (
          <p className="mt-4 text-center text-sm text-muted-foreground">
            전송한 이미지 / 텍스트 / RTSP 이력이 여기에 표시됩니다. Viewer를 닫으면
            초기화됩니다.
          </p>
        ) : (
          history.map((item) => <HistoryRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  )
}

function HistoryRow({ item }: { item: ShareHistoryItem }) {
  const time = new Date(item.at).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  return (
    <div className="flex gap-2 rounded-lg border border-border bg-background/50 p-2">
      <div className="flex flex-1 flex-col gap-1 overflow-hidden">
        <div className="flex items-center gap-1.5">
          <TypeBadge type={item.type} />
          <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
            {time}
          </span>
        </div>

        {item.type === 'image' && item.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.image || '/placeholder.svg'}
            alt="전송된 이미지"
            className="max-h-24 w-full rounded object-contain"
          />
        )}

        {item.type === 'text' && (
          <span
            className="line-clamp-3 whitespace-pre-wrap break-words rounded bg-black/40 px-2 py-1 text-sm font-semibold"
            style={{ color: item.color ? COLOR_HEX[item.color] : undefined }}
          >
            {item.text}
          </span>
        )}

        {item.type === 'rtsp' && (
          <span className="break-all font-mono text-xs text-muted-foreground">
            {item.url}
          </span>
        )}

        <StatusLine ok={item.ok} mock={item.mock} />
      </div>
    </div>
  )
}

function TypeBadge({ type }: { type: ShareHistoryItem['type'] }) {
  const map = {
    image: { icon: ImageIcon, label: 'IMAGE' },
    text: { icon: Type, label: 'TEXT' },
    rtsp: { icon: Video, label: 'RTSP' },
  } as const
  const { icon: Icon, label } = map[type]
  return (
    <span className="inline-flex items-center gap-1 rounded bg-secondary px-1.5 py-0.5 text-[11px] font-semibold text-secondary-foreground">
      <Icon className="size-3" />
      {label}
    </span>
  )
}

function StatusLine({ ok, mock }: { ok: boolean; mock: boolean }) {
  if (mock) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary">
        <Check className="size-3" />
        DEMO 전송 (backend 미설정)
      </span>
    )
  }
  if (ok) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400">
        <Check className="size-3" />
        전송 완료
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-destructive">
      <AlertTriangle className="size-3" />
      전송 실패
    </span>
  )
}
