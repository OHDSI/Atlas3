// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
// @ts-expect-error plain .mjs module without type declarations
import { createAtlasServer, parseWebApiUrl } from '../../../bin/serve.mjs'

interface UpstreamRequest {
  method?: string
  url?: string
  headers: http.IncomingHttpHeaders
  body: string
}

function listen(server: http.Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`)
    })
  })
}

function close(server: http.Server): Promise<void> {
  return new Promise((resolve) => {
    server.close(() => resolve())
    server.closeAllConnections()
  })
}

interface Response {
  status: number
  headers: http.IncomingHttpHeaders
  text: string
}

// tests/setup.ts replaces global fetch with a mock, so requests go through node:http.
function request(
  url: string,
  options: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const req = http.request(url, { method: options.method ?? 'GET', headers: options.headers }, (res) => {
      let text = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => (text += chunk))
      res.on('end', () => resolve({ status: res.statusCode ?? 0, headers: res.headers, text }))
    })
    req.on('error', reject)
    req.end(options.body)
  })
}

describe('atlas3 server', () => {
  let dist: string
  let upstream: http.Server
  let upstreamUrl: string
  let received: UpstreamRequest[]
  const servers: http.Server[] = []

  async function start(webapi = upstreamUrl): Promise<string> {
    const server = createAtlasServer({ dist, webapi }) as http.Server
    servers.push(server)
    return listen(server)
  }

  beforeEach(async () => {
    dist = mkdtempSync(path.join(tmpdir(), 'atlas3-dist-'))
    mkdirSync(path.join(dist, 'assets'))
    writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>ATLAS</title>')
    writeFileSync(path.join(dist, 'assets', 'app.js'), 'console.log(1)')
    writeFileSync(path.join(path.dirname(dist), 'secret.txt'), 'secret')

    received = []
    upstream = http.createServer((req, res) => {
      let body = ''
      req.on('data', (chunk) => (body += chunk))
      req.on('end', () => {
        received.push({ method: req.method, url: req.url, headers: req.headers, body })
        res.writeHead(200, { 'Content-Type': 'application/json', 'X-Upstream': 'yes' })
        res.end('{"version":"3.0.0"}')
      })
    })
    upstreamUrl = await listen(upstream)
  })

  afterEach(async () => {
    await Promise.all(servers.splice(0).map(close))
    await close(upstream)
    rmSync(dist, { recursive: true, force: true })
    rmSync(path.join(path.dirname(dist), 'secret.txt'), { force: true })
  })

  it('redirects the root and /atlas to /atlas/', async () => {
    const base = await start()
    for (const pathname of ['/', '/atlas']) {
      const res = await request(`${base}${pathname}`)
      expect(res.status).toBe(301)
      expect(res.headers.location).toBe('/atlas/')
    }
  })

  it('serves files from dist with their content type', async () => {
    const base = await start()
    const res = await request(`${base}/atlas/assets/app.js`)
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toBe('text/javascript; charset=utf-8')
    expect(res.text).toBe('console.log(1)')
  })

  it('falls back to index.html for unknown paths', async () => {
    const base = await start()
    for (const pathname of ['/atlas/', '/atlas/cohorts/12', '/atlas/config-local.json']) {
      const res = await request(`${base}${pathname}`)
      expect(res.status).toBe(200)
      expect(res.text).toBe('<!doctype html><title>ATLAS</title>')
    }
  })

  it('does not serve files outside dist', async () => {
    const base = await start()
    const res = await request(`${base}/atlas/%2e%2e/secret.txt`)
    expect(res.text).not.toBe('secret')
  })

  it('proxies /WebAPI with method, query, body and upstream headers', async () => {
    const base = await start()
    const res = await request(`${base}/WebAPI/user/login/db?x=1`, {
      method: 'POST',
      headers: { Origin: base, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'login=admin&password=admin',
    })
    expect(res.status).toBe(200)
    expect(res.headers['x-upstream']).toBe('yes')
    expect(received).toHaveLength(1)
    expect(received[0]).toMatchObject({
      method: 'POST',
      url: '/WebAPI/user/login/db?x=1',
      body: 'login=admin&password=admin',
    })
    expect(received[0].headers.host).toBe(new URL(upstreamUrl).host)
    expect(received[0].headers.origin).toBe(upstreamUrl)
  })

  it('accepts a --webapi URL that already ends in /WebAPI', async () => {
    const base = await start(`${upstreamUrl}/WebAPI/`)
    await request(`${base}/WebAPI/info`)
    expect(received[0].url).toBe('/WebAPI/info')
  })

  it('keeps a path prefix in front of /WebAPI', async () => {
    const base = await start(`${upstreamUrl}/ohdsi/WebAPI`)
    await request(`${base}/WebAPI/info`)
    expect(received[0].url).toBe('/ohdsi/WebAPI/info')
  })

  it('returns 502 when WebAPI is not reachable', async () => {
    const down = http.createServer()
    const downUrl = await listen(down)
    await close(down)
    const base = await start(downUrl)
    const res = await request(`${base}/WebAPI/info`)
    expect(res.status).toBe(502)
    expect(res.text).toContain('is not reachable')
  })

  it('rejects a non-http WebAPI URL', () => {
    expect(() => parseWebApiUrl('ftp://example.org')).toThrow('--webapi must be an http(s) URL')
  })
})
