import { config, hasBackend } from './config'
import type {
  LiveKitToken,
  LiveSession,
  MediaKind,
  ProcessInfo,
  RoomInfo,
  SdwtInfo,
  StoredFile,
  TokenMode,
} from './types'

// ---------------------------------------------------------------------------
// Backend API layer.
//
// Every call attempts a real HTTP POST to the configured backend server.
// If the backend is not configured or the request fails, we transparently
// fall back to mock data so the UI stays fully functional in preview / demo.
// ---------------------------------------------------------------------------

export interface ApiResult<T> {
  data: T
  mock: boolean
}

async function post<T>(path: string, body: unknown, mockFactory: () => T): Promise<ApiResult<T>> {
  if (!hasBackend()) {
    return { data: mockFactory(), mock: true }
  }
  try {
    const res = await fetch(`${config.backendApi}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      // avoid hanging forever in demo environments
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = (await res.json()) as T
    return { data, mock: false }
  } catch (err) {
    console.log('[v0] backend request failed, using mock fallback:', path, String(err))
    return { data: mockFactory(), mock: true }
  }
}

// --- Processes -------------------------------------------------------------

export function fetchProcesses(user: string): Promise<ApiResult<ProcessInfo[]>> {
  return post<ProcessInfo[]>('/processes', { user }, mockProcesses)
}

// --- SDWT ------------------------------------------------------------------

export function fetchSdwts(user: string, processId: string): Promise<ApiResult<SdwtInfo[]>> {
  return post<SdwtInfo[]>('/sdwts', { user, processId }, () =>
    mockSdwts(processId),
  )
}

// --- Live session (LiveKit endpoint + rooms) -------------------------------

export function fetchLiveSession(
  user: string,
  processId: string,
  sdwtId: string,
): Promise<ApiResult<LiveSession>> {
  return post<LiveSession>(
    '/live',
    { user, processId, sdwtId },
    () => mockLiveSession(processId, sdwtId),
  )
}

// --- LiveKit token ---------------------------------------------------------

export function fetchToken(
  user: string,
  roomName: string,
  mode: TokenMode,
): Promise<ApiResult<LiveKitToken>> {
  return post<LiveKitToken>(
    '/token',
    { user, roomName, mode },
    () => mockToken(roomName, mode),
  )
}

// --- Stored captures (images) and recordings (videos) ----------------------

export function fetchFiles(kind: MediaKind, glid?: string): Promise<ApiResult<StoredFile[]>> {
  return post<{ files: StoredFile[] }>(
    '/files',
    { kind: kind === 'image' ? 'images' : 'videos', ...(glid ? { glid } : {}) },
    () => ({ files: mockFiles(kind) }),
  ).then(({ data, mock }) => ({ data: data.files ?? [], mock }))
}

// fileUrl is where the browser loads a stored file from: the manager's
// GET /files/<key> through the same-origin proxy. A demo listing has no
// file behind it, so images show a placeholder and videos nothing.
export function fileUrl(file: StoredFile, mock: boolean, download = false): string | null {
  if (mock) return file.key.startsWith('images/') ? '/placeholder.jpg' : null
  const path = file.key.split('/').map(encodeURIComponent).join('/')
  return `${config.backendApi}/files/${path}${download ? '?download=1' : ''}`
}

// --- Login(QR) register token ----------------------------------------------

// POST /register/token returns the secret a device sends back to /register.
// No mock fallback: a fake secret would produce a QR that can never register.
export async function fetchRegisterToken(): Promise<string> {
  if (!hasBackend()) throw new Error('backend 미설정')
  const res = await fetch(`${config.backendApi}/register/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    cache: 'no-store',
    signal: AbortSignal.timeout(6000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const { token } = (await res.json()) as { token?: string }
  if (!token) throw new Error('응답에 token이 없습니다')
  return token
}

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

function mockProcesses(): ProcessInfo[] {
  return [
    { id: 'P-100', name: 'Assembly Line A', description: '조립 1라인' },
    { id: 'P-200', name: 'Welding Line B', description: '용접 2라인' },
    { id: 'P-300', name: 'Paint Shop C', description: '도장 3라인' },
    { id: 'P-400', name: 'Final Inspection', description: '최종 검사' },
  ]
}

function mockSdwts(processId: string): SdwtInfo[] {
  const base: Record<string, SdwtInfo[]> = {
    'P-100': [
      { id: 'S-11', name: 'SDWT Alpha', description: '조립 A조' },
      { id: 'S-12', name: 'SDWT Bravo', description: '조립 B조' },
    ],
    'P-200': [
      { id: 'S-21', name: 'SDWT Charlie', description: '용접 A조' },
      { id: 'S-22', name: 'SDWT Delta', description: '용접 B조' },
      { id: 'S-23', name: 'SDWT Echo', description: '용접 C조' },
    ],
    'P-300': [{ id: 'S-31', name: 'SDWT Foxtrot', description: '도장 A조' }],
    'P-400': [
      { id: 'S-41', name: 'SDWT Golf', description: '검사 A조' },
      { id: 'S-42', name: 'SDWT Hotel', description: '검사 B조' },
    ],
  }
  return base[processId] ?? [{ id: 'S-00', name: 'SDWT Default', description: '기본 조' }]
}

function mockLiveSession(processId: string, sdwtId: string): LiveSession {
  const roomCount = 4
  const rooms: RoomInfo[] = Array.from({ length: roomCount }).map((_, i) => ({
    roomName: `${sdwtId}-ROOM-${i + 1}`,
    participants: [`worker-${sdwtId}-${i + 1}`],
  }))
  return {
    livekitUrl: 'wss://mock-livekit.local:7880',
    livekitIp: '10.0.0.50',
    livekitPort: 7880,
    rooms,
  }
}

function mockFiles(kind: MediaKind): StoredFile[] {
  const prefix = kind === 'image' ? 'images' : 'videos'
  const ext = kind === 'image' ? 'png' : 'mp4'
  const now = Date.now()
  return [
    ['smart01', 0, 1_240_000],
    ['smart02', 25, 980_000],
    ['smart01', 70, 1_510_000],
    ['smart03', 190, 2_020_000],
    ['smart02', 400, 1_100_000],
  ].map(([glid, minutesAgo, size]) => {
    const at = new Date(now - Number(minutesAgo) * 60_000)
    const pad = (n: number) => String(n).padStart(2, '0')
    const date = `${at.getFullYear()}/${pad(at.getMonth() + 1)}/${pad(at.getDate())}`
    const time = `${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}`
    return {
      key: `${prefix}/${glid}/${date}/${time}.${ext}`,
      glid: String(glid),
      size: kind === 'image' ? Number(size) : Number(size) * 40,
      last_modified: at.toISOString(),
      recorded_at: at.toISOString(),
    }
  })
}

function mockToken(roomName: string, mode: TokenMode): LiveKitToken {
  return {
    token: `mock.${mode}.${roomName}.${Date.now()}`,
    url: 'wss://mock-livekit.local:7880',
  }
}
