'use client'

import { useEffect, useState } from 'react'
import { Sidebar } from '@/components/sidebar'
import { LoginScreen } from '@/components/login-screen'
import { LivePanel } from '@/components/live/live-panel'
import { QrScreen } from '@/components/qr/qr-screen'
import type { LiveSession } from '@/lib/types'

export type MenuKey = 'live' | 'qr'

export function AppShell() {
  const [user, setUser] = useState<string | null>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [menu, setMenu] = useState<MenuKey>('live')
  const [session, setSession] = useState<LiveSession | null>(null)
  const [sessionMock, setSessionMock] = useState(false)

  useEffect(() => {
    fetch('/api/auth/session', { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) return
        const data = (await response.json()) as { user: string }
        setUser(data.user)
      })
      .finally(() => setCheckingSession(false))
  }, [])

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)
    setSession(null)
    setUser(null)
  }

  if (checkingSession) {
    return <div className="h-dvh bg-background" aria-label="로그인 상태 확인 중" />
  }

  if (!user) return <LoginScreen onLogin={setUser} />

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-background">
      <Sidebar
        user={user}
        onLogout={logout}
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
          <LivePanel session={session} mock={sessionMock} user={user} />
        ) : (
          <QrScreen />
        )}
      </main>
    </div>
  )
}
