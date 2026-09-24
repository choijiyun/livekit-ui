'use client'

import { useState, type FormEvent } from 'react'
import { AlertCircle, Loader2, LockKeyhole, LogIn, Radio, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function LoginScreen({ onLogin }: { onLogin: (user: string) => void }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // Read from the form itself so browser/password-manager autofill works even
    // when it does not dispatch React-compatible input/change events.
    const form = new FormData(event.currentTarget)
    const submittedId = String(form.get('id') ?? '').trim()
    const submittedPassword = String(form.get('password') ?? '')
    if (!submittedId || !submittedPassword) {
      setError('아이디와 비밀번호를 모두 입력하세요.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: submittedId, password: submittedPassword }),
      })
      const result = (await response.json()) as { user?: string; error?: string }
      if (!response.ok || !result.user) {
        setError(result.error ?? '로그인할 수 없습니다.')
        return
      }
      onLogin(result.user)
    } catch {
      setError('서버에 연결할 수 없습니다. 잠시 후 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background p-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,color-mix(in_oklab,var(--primary)_18%,transparent),transparent_48%)]" />
      <div className="relative w-full max-w-sm">
        <div className="mb-7 flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <Radio className="size-7" />
          </span>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              RISE-LiveOn<span className="text-primary">(GL)</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Live monitoring & collaboration</p>
          </div>
        </div>

        <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="mb-5">
            <h2 className="text-lg font-bold">로그인</h2>
            <p className="mt-1 text-sm text-muted-foreground">등록된 계정으로 접속하세요.</p>
          </div>

          <label className="mb-4 block text-sm font-medium">
            아이디
            <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <User className="size-4 shrink-0 text-muted-foreground" />
              <input
                name="id"
                autoFocus
                autoComplete="username"
                value={id}
                onChange={(event) => setId(event.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder="아이디 입력"
              />
            </span>
          </label>

          <label className="block text-sm font-medium">
            비밀번호
            <span className="mt-1.5 flex items-center gap-2 rounded-lg border border-input bg-background px-3 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
              <LockKeyhole className="size-4 shrink-0 text-muted-foreground" />
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                placeholder="비밀번호 입력"
              />
            </span>
          </label>

          {error && (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </p>
          )}

          <Button type="submit" className="mt-5 w-full" size="lg" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
            {loading ? '로그인 중…' : '로그인'}
          </Button>
        </form>
      </div>
    </main>
  )
}
