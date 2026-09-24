import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { resolve } from 'node:path'
import { rootCertificates } from 'node:tls'
import next from 'next'

const port = Number(process.env.PORT ?? 3000)
const hostname = process.env.HTTPS_BIND_HOST ?? '0.0.0.0'
const dev = process.env.NODE_ENV !== 'production'
const certDirectory = resolve(
  process.cwd(),
  process.env.HTTPS_CERT_DIR ?? '../../IdeaProjects/Recipe/certs/rise-cert/server-cert',
)
const ca = [readFileSync(resolve(certDirectory, '..', 'rise-root-ca.crt')), ...rootCertificates]

const app = next({ dev, hostname, port })
await app.prepare()

const handle = app.getRequestHandler()
const handleUpgrade = app.getUpgradeHandler()
const backend = process.env.NEXT_PUBLIC_BACKEND_SERVER
  ? new URL(process.env.NEXT_PUBLIC_BACKEND_SERVER)
  : null
const livekit = process.env.LIVEKIT_SIGNAL_SERVER
  ? new URL(process.env.LIVEKIT_SIGNAL_SERVER)
  : backend
    ? new URL(`ws://${backend.hostname}:7880`)
    : null

function transportFor(url) {
  return url.protocol === 'https:' ? httpsRequest : httpRequest
}

function proxyBackend(req, res) {
  if (!backend) {
    res.writeHead(503).end('Backend is not configured')
    return
  }

  const incoming = new URL(req.url ?? '/', 'https://localhost')
  const upstream = new URL(backend)
  upstream.pathname = `${backend.pathname.replace(/\/$/, '')}${incoming.pathname.slice('/api/backend'.length) || '/'}`
  upstream.search = incoming.search

  const headers = { ...req.headers }
  delete headers.host
  delete headers.origin
  headers['x-forwarded-proto'] = 'https'

  const proxy = transportFor(upstream)(upstream, { method: req.method, headers, ca }, (response) => {
    res.writeHead(response.statusCode ?? 502, response.headers)
    response.pipe(res)
  })
  proxy.on('error', (error) => {
    console.error('Backend proxy failed:', error.code ?? error.message)
    if (res.headersSent) res.destroy()
    else res.writeHead(502).end('Backend is unavailable')
  })
  req.pipe(proxy)
}

function writeUpgradeResponse(socket, response) {
  const headers = []
  for (let i = 0; i < response.rawHeaders.length; i += 2) {
    headers.push(`${response.rawHeaders[i]}: ${response.rawHeaders[i + 1]}`)
  }
  socket.write(
    `HTTP/${response.httpVersion} ${response.statusCode} ${response.statusMessage}\r\n${headers.join('\r\n')}\r\n\r\n`,
  )
}

function proxyLiveKit(req, socket, head) {
  if (!livekit) {
    socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\n\r\n')
    return
  }

  const upstream = new URL(req.url ?? '/', livekit)
  upstream.protocol = upstream.protocol === 'wss:' ? 'https:' : 'http:'
  const proxy = transportFor(upstream)(upstream, {
    method: 'GET',
    headers: { ...req.headers, host: upstream.host },
    ca,
  })

  proxy.on('upgrade', (response, upstreamSocket, upstreamHead) => {
    writeUpgradeResponse(socket, response)
    if (head.length) upstreamSocket.write(head)
    if (upstreamHead.length) socket.write(upstreamHead)
    socket.pipe(upstreamSocket).pipe(socket)
    socket.on('error', () => upstreamSocket.destroy())
    upstreamSocket.on('error', () => socket.destroy())
  })
  proxy.on('response', (response) => {
    writeUpgradeResponse(socket, response)
    response.pipe(socket)
  })
  proxy.on('error', () => socket.destroy())
  proxy.end()
}

const server = createServer(
  {
    key: readFileSync(resolve(certDirectory, 'server.key')),
    cert: readFileSync(resolve(certDirectory, 'server.crt')),
  },
  (req, res) => {
    const path = new URL(req.url ?? '/', 'https://localhost').pathname
    if (path === '/api/backend' || path.startsWith('/api/backend/')) {
      proxyBackend(req, res)
    } else {
      void handle(req, res)
    }
  },
)

server.on('upgrade', (req, socket, head) => {
  const path = new URL(req.url ?? '/', 'https://localhost').pathname
  if (path === '/rtc' || path.startsWith('/rtc/')) {
    proxyLiveKit(req, socket, head)
  } else {
    void handleUpgrade(req, socket, head)
  }
})

server.listen(port, hostname, () => {
  console.log(`HTTPS server ready at https://${hostname}:${port}`)
})
