// Runtime configuration sourced from environment variables.
// These are configurable per deployment. The backend URL is displayed in the
// UI; API requests use the same-origin proxy.

export const config = {
  // Backend server base URL (e.g. https://liveon.example.com/api)
  backendServer:
    process.env.NEXT_PUBLIC_BACKEND_SERVER?.replace(/\/$/, '') ?? '',
  backendApi: '/api/backend',
}

export function hasBackend(): boolean {
  return config.backendServer.length > 0
}
