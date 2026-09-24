export function liveKitUrl(tokenUrl: string): string {
  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    new URL(tokenUrl).protocol === 'ws:'
  ) {
    return `wss://${window.location.host}`
  }
  return tokenUrl
}
