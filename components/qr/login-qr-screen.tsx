'use client'

import { useCallback, useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Download, Maximize2, X, RefreshCw, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchRegisterToken } from '@/lib/api'

export function LoginQrScreen({ user }: { user: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maximized, setMaximized] = useState(false)

  const generate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setDataUrl(null)
    try {
      const secret = await fetchRegisterToken()
      // Field names match POST /register ({token, userid, mac}); the device adds its mac.
      const content = JSON.stringify({ token: secret, userid: user })
      const url = await QRCode.toDataURL(content, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b0e13', light: '#ffffff' },
      })
      setDataUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    void generate()
  }, [generate])

  const download = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'rise-liveon-login-qr.png'
    a.click()
  }

  return (
    <div className="relative flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <QrCode className="size-5 text-primary" />
        <h1 className="text-lg font-bold">Login(QR)</h1>
      </header>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-4">
        <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-card p-6">
          {loading ? (
            <div className="flex size-[280px] items-center justify-center text-muted-foreground">
              <Loader2 className="size-8 animate-spin" />
            </div>
          ) : dataUrl ? (
            <div className="rounded-lg bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={dataUrl} alt="로그인 QR 코드" className="size-[280px]" width={280} height={280} />
            </div>
          ) : (
            <div className="flex size-[280px] flex-col items-center justify-center gap-2 text-center text-destructive">
              <AlertCircle className="size-8" />
              <p className="text-sm">QR 코드 생성 실패{error ? `: ${error}` : ''}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            사용자 <span className="font-semibold text-foreground">{user}</span>
          </p>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={generate} disabled={loading}>
              <RefreshCw className="size-4" />
              다시 생성
            </Button>
            <Button variant="outline" onClick={download} disabled={!dataUrl}>
              <Download className="size-4" />
              PNG 다운로드
            </Button>
            <Button variant="outline" onClick={() => setMaximized(true)} disabled={!dataUrl}>
              <Maximize2 className="size-4" />
              화면 확대
            </Button>
          </div>
        </div>
      </div>

      {maximized && dataUrl && (
        <div className="absolute inset-0 z-20 flex flex-col bg-background/98 backdrop-blur-sm">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <div className="flex items-center gap-2">
              <QrCode className="size-5 text-primary" />
              <h2 className="text-lg font-bold">Login(QR) · 전체 화면</h2>
            </div>
            <Button variant="outline" size="sm" onClick={() => setMaximized(false)}>
              <X className="size-4" />
              닫기
            </Button>
          </header>
          <div className="flex min-h-0 flex-1 items-center justify-center p-6">
            <div className="rounded-2xl bg-white p-6 shadow-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={dataUrl}
                alt="확대된 로그인 QR 코드"
                className="aspect-square h-auto w-full max-w-[min(80vh,80vw)]"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
