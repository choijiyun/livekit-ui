'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  PanelLeftClose,
  PanelLeftOpen,
  Radio,
  QrCode,
  User,
  Loader2,
  Play,
  Layers,
  Users2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { config } from '@/lib/config'
import { fetchProcesses, fetchSdwts, fetchLiveSession } from '@/lib/api'
import type { ProcessInfo, SdwtInfo, LiveSession } from '@/lib/types'
import type { MenuKey } from '@/components/app-shell'

interface SidebarProps {
  collapsed: boolean
  onToggle: () => void
  menu: MenuKey
  onMenuChange: (m: MenuKey) => void
  onStartLive: (session: LiveSession, mock: boolean) => void
}

export function Sidebar({
  collapsed,
  onToggle,
  menu,
  onMenuChange,
  onStartLive,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
        collapsed ? 'w-14' : 'w-80',
      )}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-sidebar-border px-2">
        {!collapsed && (
          <div className="flex items-center gap-2 pl-1">
            <span className="flex size-6 items-center justify-center rounded bg-primary text-primary-foreground">
              <Radio className="size-4" />
            </span>
            <span className="text-base font-bold tracking-tight">
              RISE-LiveOn
              <span className="text-primary">(GL)</span>
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label={collapsed ? '메뉴 펼치기' : '메뉴 접기'}
          className="shrink-0"
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Menu nav */}
      <nav className="flex flex-col gap-0.5 p-1.5">
        <MenuButton
          active={menu === 'live'}
          collapsed={collapsed}
          icon={<Radio className="size-4" />}
          label="Live"
          onClick={() => onMenuChange('live')}
        />
        <MenuButton
          active={menu === 'qr'}
          collapsed={collapsed}
          icon={<QrCode className="size-4" />}
          label="QR Code"
          onClick={() => onMenuChange('qr')}
        />
      </nav>

      {/* Live selection panel */}
      {!collapsed && menu === 'live' && (
        <LiveSelector onStartLive={onStartLive} />
      )}

      {/* Footer: login user */}
      <div className="mt-auto border-t border-sidebar-border p-2">
        <div
          className={cn(
            'flex items-center gap-2 rounded-md bg-sidebar-accent/50 px-2 py-1.5',
            collapsed && 'justify-center',
          )}
        >
          <User className="size-4 shrink-0 text-primary" />
          {!collapsed && (
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-semibold">{config.loginUser}</span>
              <span className="truncate text-xs text-muted-foreground">
                {config.backendServer || 'backend 미설정 (demo)'}
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function MenuButton({
  active,
  collapsed,
  icon,
  label,
  onClick,
}: {
  active: boolean
  collapsed: boolean
  icon: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active
          ? 'bg-primary text-primary-foreground'
          : 'text-sidebar-foreground hover:bg-sidebar-accent',
      )}
    >
      {icon}
      {!collapsed && <span>{label}</span>}
    </button>
  )
}

function LiveSelector({
  onStartLive,
}: {
  onStartLive: (session: LiveSession, mock: boolean) => void
}) {
  const [processes, setProcesses] = useState<ProcessInfo[]>([])
  const [selectedProcess, setSelectedProcess] = useState<string | null>(null)
  const [sdwts, setSdwts] = useState<SdwtInfo[]>([])
  const [selectedSdwt, setSelectedSdwt] = useState<string | null>(null)

  const [loadingP, setLoadingP] = useState(false)
  const [loadingS, setLoadingS] = useState(false)
  const [starting, setStarting] = useState(false)

  // Load processes on mount
  useEffect(() => {
    let active = true
    setLoadingP(true)
    fetchProcesses()
      .then(({ data }) => {
        if (active) setProcesses(data)
      })
      .finally(() => active && setLoadingP(false))
    return () => {
      active = false
    }
  }, [])

  // Load SDWTs when a process is selected
  const selectProcess = useCallback((id: string) => {
    setSelectedProcess(id)
    setSelectedSdwt(null)
    setSdwts([])
    setLoadingS(true)
    fetchSdwts(id)
      .then(({ data }) => setSdwts(data))
      .finally(() => setLoadingS(false))
  }, [])

  const start = useCallback(() => {
    if (!selectedProcess || !selectedSdwt) return
    setStarting(true)
    fetchLiveSession(selectedProcess, selectedSdwt)
      .then(({ data, mock }) => onStartLive(data, mock))
      .finally(() => setStarting(false))
  }, [selectedProcess, selectedSdwt, onStartLive])

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto border-t border-sidebar-border">
      <SelectSection
        title="Process"
        icon={<Layers className="size-3.5" />}
        loading={loadingP}
        empty="프로세스 없음"
      >
        {processes.map((p) => (
          <SelectRow
            key={p.id}
            selected={selectedProcess === p.id}
            onClick={() => selectProcess(p.id)}
            primary={p.name}
            secondary={`${p.id}${p.description ? ' · ' + p.description : ''}`}
          />
        ))}
      </SelectSection>

      {selectedProcess && (
        <SelectSection
          title="SDWT"
          icon={<Users2 className="size-3.5" />}
          loading={loadingS}
          empty="SDWT 없음"
        >
          {sdwts.map((s) => (
            <SelectRow
              key={s.id}
              selected={selectedSdwt === s.id}
              onClick={() => setSelectedSdwt(s.id)}
              primary={s.name}
              secondary={`${s.id}${s.description ? ' · ' + s.description : ''}`}
            />
          ))}
        </SelectSection>
      )}

      <div className="sticky bottom-0 mt-auto bg-sidebar p-2">
        <Button
          className="w-full"
          disabled={!selectedProcess || !selectedSdwt || starting}
          onClick={start}
        >
          {starting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Play className="size-4" />
          )}
          Live 시작
        </Button>
      </div>
    </div>
  )
}

function SelectSection({
  title,
  icon,
  loading,
  empty,
  children,
}: {
  title: string
  icon: React.ReactNode
  loading: boolean
  empty: string
  children: React.ReactNode
}) {
  const items = Array.isArray(children) ? children : [children]
  const isEmpty = !loading && items.filter(Boolean).length === 0
  return (
    <div className="border-b border-sidebar-border">
      <div className="flex items-center gap-1.5 px-2.5 pt-2 pb-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {icon}
        {title}
        {loading && <Loader2 className="ml-auto size-3.5 animate-spin" />}
      </div>
      <div className="flex flex-col gap-0.5 px-1.5 pb-2">
        {isEmpty ? (
          <span className="px-1.5 py-1 text-sm text-muted-foreground">{empty}</span>
        ) : (
          children
        )}
      </div>
    </div>
  )
}

function SelectRow({
  selected,
  onClick,
  primary,
  secondary,
}: {
  selected: boolean
  onClick: () => void
  primary: string
  secondary?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col rounded-md border px-2.5 py-1.5 text-left transition-colors',
        selected
          ? 'border-primary bg-primary/15'
          : 'border-transparent hover:bg-sidebar-accent',
      )}
    >
      <span className="text-sm font-semibold">{primary}</span>
      {secondary && (
        <span className="text-xs text-muted-foreground">{secondary}</span>
      )}
    </button>
  )
}
