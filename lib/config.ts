// Runtime configuration sourced from environment variables.
// These are configurable per-deployment. NEXT_PUBLIC_ vars are needed
// because the fetch + LiveKit calls happen on the client.

export const config = {
  // Backend server base URL (e.g. https://liveon.example.com/api)
  backendServer:
    process.env.NEXT_PUBLIC_BACKEND_SERVER?.replace(/\/$/, '') ?? '',
  // The currently logged-in user identity sent to the backend / LiveKit.
  loginUser: process.env.NEXT_PUBLIC_LOGIN_USER ?? 'operator',
}

export function hasBackend(): boolean {
  return config.backendServer.length > 0
}
