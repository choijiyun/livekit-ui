import { config, hasBackend } from './config'
import type {
  LiveKitToken,
  LiveSession,
  ProcessInfo,
  RoomInfo,
  SdwtInfo,
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
    const res = await fetch(`${config.backendServer}${path}`, {
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

export function fetchProcesses(): Promise<ApiResult<ProcessInfo[]>> {
  return post<ProcessInfo[]>('/processes', { user: config.loginUser }, mockProcesses)
}

// --- SDWT ------------------------------------------------------------------

export function fetchSdwts(processId: string): Promise<ApiResult<SdwtInfo[]>> {
  return post<SdwtInfo[]>('/sdwts', { user: config.loginUser, processId }, () =>
    mockSdwts(processId),
  )
}

// --- Live session (LiveKit endpoint + rooms) -------------------------------

export function fetchLiveSession(
  processId: string,
  sdwtId: string,
): Promise<ApiResult<LiveSession>> {
  return post<LiveSession>(
    '/live',
    { user: config.loginUser, processId, sdwtId },
    () => mockLiveSession(processId, sdwtId),
  )
}

// --- LiveKit token ---------------------------------------------------------

export function fetchToken(
  roomName: string,
  mode: TokenMode,
): Promise<ApiResult<LiveKitToken>> {
  return post<LiveKitToken>(
    '/token',
    { user: config.loginUser, roomName, mode },
    () => mockToken(roomName, mode),
  )
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

function mockToken(roomName: string, mode: TokenMode): LiveKitToken {
  return {
    token: `mock.${mode}.${roomName}.${Date.now()}`,
    url: 'wss://mock-livekit.local:7880',
  }
}
