#!/usr/bin/env node
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { createAtlasServer } from './serve.mjs'

const usage = `Usage: atlas3 [--webapi <url>] [--port <port>] [--host <host>]

Serves the ATLAS frontend at http://<host>:<port>/atlas/ and proxies /WebAPI to the WebAPI.

  --webapi  WebAPI address (default http://localhost:8080)
  --port    Port to listen on (default 4180)
  --host    Interface to bind (default 127.0.0.1; use 0.0.0.0 for all)

For production, serve dist/ with the bundled Caddyfile instead.`

let values
try {
  values = parseArgs({
    options: {
      webapi: { type: 'string', default: process.env.WEBAPI_URL ?? 'http://localhost:8080' },
      port: { type: 'string', default: process.env.PORT ?? '4180' },
      host: { type: 'string', default: '127.0.0.1' },
      help: { type: 'boolean', short: 'h' },
    },
  }).values
} catch (error) {
  console.error(`${error.message}\n\n${usage}`)
  process.exit(1)
}

if (values.help) {
  console.log(usage)
  process.exit(0)
}

let server
try {
  server = createAtlasServer({
    dist: fileURLToPath(new URL('../dist', import.meta.url)),
    webapi: values.webapi,
  })
} catch (error) {
  console.error(error.message)
  process.exit(1)
}

server.on('error', (error) => {
  console.error(`Cannot listen on ${values.host}:${values.port}: ${error.message}`)
  process.exit(1)
})

server.listen(Number(values.port), values.host, () => {
  const shownHost = values.host === '0.0.0.0' || values.host === '::' ? 'localhost' : values.host
  console.log(`ATLAS: http://${shownHost}:${values.port}/atlas/`)
  console.log(`WebAPI: ${values.webapi}`)
})
