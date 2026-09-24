import { config, hasBackend } from './config'

// ---------------------------------------------------------------------------
// Smart-glass data share API.
//
// Each helper POSTs through the same-origin backend proxy. When no backend
// is configured we resolve as a "mock" success so the UI stays usable in the
// preview/demo environment.
// ---------------------------------------------------------------------------

export type ShareColor =
  | 'yellow'
  | 'white'
  | 'black'
  | 'red'
  | 'blue'
  | 'orange'
  | 'purple'
  | 'neon'

export const SHARE_COLORS: ShareColor[] = [
  'yellow',
  'white',
  'black',
  'red',
  'blue',
  'orange',
  'purple',
  'neon',
]

// CSS values used for the on-screen preview / history swatches.
export const COLOR_HEX: Record<ShareColor, string> = {
  yellow: '#ffd500',
  white: '#ffffff',
  black: '#111111',
  red: '#ff3b30',
  blue: '#0a84ff',
  orange: '#ff9f0a',
  purple: '#bf5af2',
  neon: '#39ff14',
}

export interface ShareResult {
  ok: boolean
  mock: boolean
  error?: string
}

export interface ShareHistoryItem {
  id: string
  type: 'image' | 'text' | 'rtsp' | 'camera'
  at: number
  ok: boolean
  mock: boolean
  // previews (type-specific)
  image?: string // data URL for thumbnail
  text?: string
  color?: ShareColor
  size?: number
  url?: string
}

async function postShare(path: string, body: unknown): Promise<ShareResult> {
  if (!hasBackend()) {
    console.log('[v0] share (demo, no backend):', path, body)
    return { ok: true, mock: true }
  }
  try {
    const res = await fetch(`${config.backendApi}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return { ok: true, mock: false }
  } catch (err) {
    console.log('[v0] share request failed:', path, String(err))
    return { ok: false, mock: false, error: String(err) }
  }
}

// Strip the `data:image/...;base64,` prefix so we send raw base64.
export function toBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl
}

export function shareImage(
  roomName: string,
  base64: string,
): Promise<ShareResult> {
  return postShare('/share/image', { room_name: roomName, image: base64 })
}

export function shareText(
  roomName: string,
  payload: {
    size: number
    color: ShareColor
    text: string
  },
): Promise<ShareResult> {
  // Normalize CRLF to LF; JSON serialization encodes newlines as \n.
  const text = payload.text.replace(/\r\n/g, '\n')
  return postShare('/share/text', {
    room_name: roomName,
    size: payload.size,
    color: payload.color,
    text,
  })
}

export function shareRtsp(
  roomName: string,
  url: string,
): Promise<ShareResult> {
  return postShare('/share/rtsp', { room_name: roomName, url })
}

// Request the smart glass to share its live camera feed into the room.
export function shareCamera(roomName: string): Promise<ShareResult> {
  return postShare('/share/camera', { room_name: roomName })
}
