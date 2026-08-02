'use client'

import { useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { LivePanel } from '@/components/live/live-panel'
import { QrScreen } from '@/components/qr/qr-screen'
import type { LiveSession } from '@/lib/types'

export type MenuKey = 'live' | 'qr'

export function AppShell() {
  const [collapsed, setCollapsed] = useState(false)
  const [menu, setMenu] = useState<MenuKey>('live')
  const [session, setSession] = useState<LiveSession | null>(null)
  const [sessionMock, setSessionMock] = useState(false)

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed((c) => !c)}
        menu={menu}
        onMenuChange={setMenu}
        onStartLive={(s, mock) => {
          setSession(s)
          setSessionMock(mock)
          setMenu('live')
        }}
      />
      <main className="relative flex min-w-0 flex-1 flex-col">
        {menu === 'live' ? (
          <LivePanel session={session} mock={sessionMock} />
        ) : (
          <QrScreen />
        )}
      </main>
    </div>
  )
}
