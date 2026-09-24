# LiveKit UI

The app serves HTTPS directly using the certificate in
`../../IdeaProjects/Recipe/certs/rise-cert/server-cert`. Start it with:

```bash
npm run dev
```

Open `https://172.30.1.77:3000`. For a production build, run `npm run build`
followed by `npm start`. Set `PORT` to use another port. Set `HTTPS_CERT_DIR`
if the certificate directory is elsewhere; it must contain `server.crt` and
`server.key`, with `rise-root-ca.crt` in its parent directory.

Install `../../IdeaProjects/Recipe/certs/rise-cert/rise-root-ca.crt` as a
trusted root CA on each device that opens the app. A trusted HTTPS connection
is required for browser microphone access.

Create `.env` from `.env.example` and configure login accounts and a session
signing secret. Multiple accounts are defined as a JSON object:

```dotenv
LOGIN_CREDENTIALS='{"operator":"strong-password","viewer":"another-password"}'
AUTH_SESSION_SECRET='a-long-random-secret'
```

The authenticated account ID is injected server-side into every backend
request, including LiveKit token creation. `NEXT_PUBLIC_LOGIN_USER` is not used.

The server forwards `/api/backend/*` to `NEXT_PUBLIC_BACKEND_SERVER` and
LiveKit WebSocket signaling to `LIVEKIT_SIGNAL_SERVER`. If the latter is unset,
it uses port 7880 on the backend host. When the token supplies a `ws://` URL,
the browser connects through this app's `wss://` endpoint. The backend may use
HTTP or HTTPS and LiveKit may use plain WebSocket internally.
