import { readFileSync } from 'node:fs'
import { createServer } from 'node:https'
import { request as httpRequest } from 'node:http'
import { request as httpsRequest } from 'node:https'
import { createHmac, timingSafeEqual } from 'node:crypto'
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
const sessionCookie = 'rise_liveon_session'
const sessionLifetimeSeconds = 60 * 60 * 12

function credentials() {
  const raw = process.env.LOGIN_CREDENTIALS?.trim()
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.flatMap((item) =>
        item && typeof item.id === 'string' && typeof item.password === 'string'
          ? [[item.id, item.password]]
          : [],
      )
    }
    if (parsed && typeof parsed === 'object') {
      return Object.entries(parsed).filter((entry) => typeof entry[1] === 'string')
    }
  } catch {
    // Also accept: LOGIN_CREDENTIALS=user1:password1,user2:password2
  }
  return raw.split(',').flatMap((pair) => {
    const separator = pair.indexOf(':')
    return separator > 0
      ? [[pair.slice(0, separator).trim(), pair.slice(separator + 1)]]
      : []
  })
}

function safeEqual(left, right) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

function sign(value) {
  return createHmac('sha256', process.env.AUTH_SESSION_SECRET).update(value).digest('base64url')
}

function createSession(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + sessionLifetimeSeconds * 1000 })).toString('base64url')
  return `${payload}.${sign(payload)}`
}

function sessionUser(req) {
  if (!process.env.AUTH_SESSION_SECRET) return null
  const cookies = Object.fromEntries(
    (req.headers.cookie ?? '').split(';').flatMap((item) => {
      const separator = item.indexOf('=')
      return separator > 0
        ? [[item.slice(0, separator).trim(), decodeURIComponent(item.slice(separator + 1))]]
        : []
    }),
  )
  const [payload, signature] = (cookies[sessionCookie] ?? '').split('.')
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString())
    return typeof session.user === 'string' && session.exp > Date.now() ? session.user : null
  } catch {
    return null
  }
}

function json(res, status, body) {
  const data = JSON.stringify(body)
  res.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(data),
  })
  res.end(data)
}

async function readJson(req, limit = 64 * 1024) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error('request too large')
    chunks.push(chunk)
  }
  return JSON.parse(Buffer.concat(chunks).toString() || '{}')
}

async function handleAuth(req, res, path) {
  if (path === '/api/auth/session' && req.method === 'GET') {
    const user = sessionUser(req)
    return json(res, user ? 200 : 401, user ? { user } : { error: '로그인이 필요합니다.' })
  }
  if (path === '/api/auth/login' && req.method === 'POST') {
    if (!process.env.AUTH_SESSION_SECRET || credentials().length === 0) {
      return json(res, 503, { error: '서버에 로그인 계정이 설정되지 않았습니다.' })
    }
    try {
      const { id, password } = await readJson(req)
      const valid = typeof id === 'string' && typeof password === 'string' && credentials().some(
        ([savedId, savedPassword]) => safeEqual(id, savedId) && safeEqual(password, savedPassword),
      )
      if (!valid) return json(res, 401, { error: '아이디 또는 비밀번호가 올바르지 않습니다.' })
      res.setHeader('set-cookie', `${sessionCookie}=${encodeURIComponent(createSession(id))}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}`)
      return json(res, 200, { user: id })
    } catch {
      return json(res, 400, { error: '로그인 요청 형식이 올바르지 않습니다.' })
    }
  }
  if (path === '/api/auth/logout' && req.method === 'POST') {
    res.setHeader('set-cookie', `${sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`)
    return json(res, 200, { ok: true })
  }
  return json(res, 404, { error: 'Not found' })
}

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

async function proxyBackend(req, res) {
  if (!backend) {
    res.writeHead(503).end('Backend is not configured')
    return
  }

  const user = sessionUser(req)
  if (!user) {
    json(res, 401, { error: '로그인이 필요합니다.' })
    return
  }

  const incoming = new URL(req.url ?? '/', 'https://localhost')
  const upstream = new URL(backend)
  upstream.pathname = `${backend.pathname.replace(/\/$/, '')}${incoming.pathname.slice('/api/backend'.length) || '/'}`
  upstream.search = incoming.search

  let body
  try {
    body = { ...(await readJson(req, 12 * 1024 * 1024)), user }
  } catch {
    json(res, 400, { error: '요청 본문이 올바르지 않습니다.' })
    return
  }
  const encodedBody = Buffer.from(JSON.stringify(body))
  const headers = { ...req.headers, 'content-length': String(encodedBody.length) }
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
  proxy.end(encodedBody)
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
    if (path.startsWith('/api/auth/')) {
      void handleAuth(req, res, path)
    } else if (path === '/api/backend' || path.startsWith('/api/backend/')) {
      void proxyBackend(req, res)
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
