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

export interface WifiConfig {
  userid: string
  password: string
}

export interface QrPayload {
  wifi: WifiConfig
  liveMgr: string
}
