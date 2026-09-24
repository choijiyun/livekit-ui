// Runtime configuration sourced from environment variables.
// These are configurable per deployment. The backend URL is also displayed in
// the UI and used in the QR payload; API requests use the same-origin proxy.

export const config = {
  // Backend server base URL (e.g. https://liveon.example.com/api)
  backendServer:
    process.env.NEXT_PUBLIC_BACKEND_SERVER?.replace(/\/$/, '') ?? '',
  backendApi: '/api/backend',
  // The currently logged-in user identity sent to the backend / LiveKit.
  loginUser: process.env.NEXT_PUBLIC_LOGIN_USER ?? 'operator',
}

export function hasBackend(): boolean {
  return config.backendServer.length > 0
}
