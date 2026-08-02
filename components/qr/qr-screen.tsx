'use client'

import { useState } from 'react'
import QRCode from 'qrcode'
import { QrCode, Wifi, Server, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { config } from '@/lib/config'

export function QrScreen() {
  const [ssid, setSsid] = useState('')
  const [password, setPassword] = useState('')
  const [liveMgr, setLiveMgr] = useState(config.backendServer)
  const [dataUrl, setDataUrl] = useState<string | null>(null)
  const [payload, setPayload] = useState<string | null>(null)

  const generate = async () => {
    const content = JSON.stringify({
      wifi: { ssid, password },
      liveMgr,
    })
    setPayload(content)
    try {
      const url = await QRCode.toDataURL(content, {
        width: 420,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b0e13', light: '#ffffff' },
      })
      setDataUrl(url)
    } catch (err) {
      console.log('[v0] QR generation failed:', String(err))
    }
  }

  const download = () => {
    if (!dataUrl) return
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = 'rise-liveon-qr.png'
    a.click()
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <QrCode className="size-5 text-primary" />
        <h1 className="text-lg font-bold">QR Code 생성 · Provisioning</h1>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-y-auto p-4 lg:grid-cols-2">
        {/* Form */}
        <div className="flex flex-col gap-4">
          <Fieldset icon={<Wifi className="size-4 text-primary" />} title="WiFi 설정">
            <Field
              label="SSID"
              value={ssid}
              onChange={setSsid}
              placeholder="wifi-ssid"
            />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="wifi-password"
              type="password"
            />
          </Fieldset>

          <Fieldset
            icon={<Server className="size-4 text-primary" />}
            title="Backend 설정"
          >
            <Field
              label="liveMgr (backend server)"
              value={liveMgr}
              onChange={setLiveMgr}
              placeholder="https://liveon.example.com"
            />
          </Fieldset>

          <Button size="lg" className="w-full" onClick={generate}>
            <QrCode className="size-4" />
            QR Code 생성
          </Button>
        </div>

        {/* Preview */}
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-border bg-card p-4">
          {dataUrl ? (
            <>
              <div className="rounded-lg bg-white p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={dataUrl || '/placeholder.svg'}
                  alt="생성된 QR 코드"
                  className="size-[280px]"
                  width={280}
                  height={280}
                />
              </div>
              <Button variant="outline" onClick={download}>
                <Download className="size-4" />
                PNG 다운로드
              </Button>
              <pre className="max-w-full overflow-x-auto rounded bg-muted px-3 py-2 text-xs text-muted-foreground">
                {payload}
              </pre>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <QrCode className="size-16 opacity-40" />
              <p className="text-sm">설정 입력 후 QR 코드를 생성하세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Fieldset({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <legend className="flex items-center gap-1.5 px-1 text-sm font-semibold">
        {icon}
        {title}
      </legend>
      {children}
    </fieldset>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 rounded-md border border-input bg-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40"
      />
    </label>
  )
}
