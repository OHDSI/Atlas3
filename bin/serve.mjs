import http from 'node:http'
import https from 'node:https'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8',
}

const BASE = '/atlas'

export function parseWebApiUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`--webapi must be an http(s) URL, got ${value}`)
  }
  // Accept both http://host:8080 and http://host:8080/WebAPI; requests already carry /WebAPI.
  const prefix = url.pathname.replace(/\/+$/, '').replace(/\/WebAPI$/i, '')
  return { url, prefix }
}

async function sendFile(res, file, method) {
  const info = await stat(file).catch(() => null)
  if (!info?.isFile()) return false
  const ext = path.extname(file).toLowerCase()
  res.writeHead(200, {
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': info.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
  })
  if (method === 'HEAD') res.end()
  else createReadStream(file).pipe(res)
  return true
}

async function serveStatic(req, res, dist, pathname) {
  let relative
  try {
    relative = decodeURIComponent(pathname.slice(BASE.length))
  } catch {
    res.writeHead(400).end()
    return
  }
  const file = path.resolve(dist, '.' + path.posix.normalize('/' + relative))
  if (file !== dist && !file.startsWith(dist + path.sep)) {
    res.writeHead(403).end()
    return
  }
  if (await sendFile(res, file, req.method)) return
  if (await sendFile(res, path.join(dist, 'index.html'), req.method)) return
  res.writeHead(404).end()
}

function proxy(req, res, webapi) {
  const { url, prefix } = webapi
  const headers = { ...req.headers, host: url.host }
  // The browser sees one origin; rewriting Origin keeps WebAPI's CORS allow-list out of the way.
  if (headers.origin) headers.origin = url.origin
  delete headers.referer
  const client = url.protocol === 'https:' ? https : http
  const upstream = client.request(
    {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      method: req.method,
      path: prefix + req.url,
      headers,
    },
    (upstreamRes) => {
      res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers)
      upstreamRes.pipe(res)
    },
  )
  upstream.on('error', (error) => {
    if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`WebAPI at ${url.origin}${prefix} is not reachable: ${error.message}`)
  })
  req.pipe(upstream)
}

export function createAtlasServer({ dist, webapi }) {
  const root = path.resolve(dist)
  const target = parseWebApiUrl(webapi)
  return http.createServer((req, res) => {
    const pathname = (req.url ?? '/').split('?')[0]
    if (pathname === '/WebAPI' || pathname.startsWith('/WebAPI/')) {
      proxy(req, res, target)
    } else if (pathname === '/' || pathname === BASE) {
      res.writeHead(301, { Location: `${BASE}/` }).end()
    } else if (pathname.startsWith(`${BASE}/`)) {
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { Allow: 'GET, HEAD' }).end()
        return
      }
      serveStatic(req, res, root, pathname).catch(() => {
        if (!res.headersSent) res.writeHead(500)
        res.end()
      })
    } else {
      res.writeHead(404).end()
    }
  })
}
