export interface ProcessInfo {
  id: string
  name: string
  description?: string
}

export interface SdwtInfo {
  id: string
  name: string
  description?: string
}

export interface RoomInfo {
  roomName: string
  // participant identities expected to publish video in this room
  participants: string[]
}

export interface LiveSession {
  // LiveKit server connection details
  livekitUrl: string // ws(s):// url, may be derived from ip:port
  livekitIp?: string
  livekitPort?: number
  rooms: RoomInfo[]
}

export type TokenMode = 'view' | 'full'

export interface LiveKitToken {
  token: string
  url: string
}

// A capture stored by the manager: images/<glid>/yyyy/MM/dd/HHmmss.png or
// videos/<glid>/yyyy/MM/dd/HHmmss.mp4 in its S3 bucket.
export type MediaKind = 'image' | 'video'

export interface StoredFile {
  key: string
  glid: string
  size: number
  last_modified: string
  // Capture time read from the key; missing when the key is not in that layout.
  recorded_at?: string
}

export interface WifiConfig {
  ssid: string
  password: string
}

export interface NatsConfig {
  address: string
  user: string
  password: string
}

export interface QrPayload {
  wifi: WifiConfig
  liveMgr: string
  recordingTimeLimit: string
  nats: NatsConfig
}
