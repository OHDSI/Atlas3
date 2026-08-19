#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Route object recogniser. Routes are written as a JS object literal with a
// `name:` string and optional `meta:` object. Both top-level routes (absolute
// paths like '/cohorts/:id') and named children of unnamed parent routes
// (relative paths like 'feature-analyses') are extracted — the agent navigates
// by route NAME so both kinds must appear in the manifest.
//
// `[^{]*?` between `{` and `path:` allows leading comments (e.g.
// `{ // NOTE: ... \n path: '...' }`) without crossing into a nested object.
// NOTE: `path:` must appear before `name:` in each route object.
// NOTE: only single-quoted string values are matched (routes.ts convention).
const ROUTE_REGEX = /\{[^{]*?path:\s*'([^']+)'[^{]*?name:\s*'([^']+)'[\s\S]*?meta:\s*\{([^}]*)\}/g

function parseMeta(metaBlock) {
  const m = {}
  const visibleMatch = metaBlock.match(/agentVisible:\s*(true|false)/)
  m.agentVisible = visibleMatch ? visibleMatch[1] === 'true' : false
  const labelMatch = metaBlock.match(/agentLabel:\s*['"]([^'"]+)['"]/)
  if (labelMatch) m.label = labelMatch[1]
  return m
}

function extractParams(path) {
  // Strip Vue Router param regex constraints: /:id(\\d+) → id.
  const out = []
  for (const m of path.matchAll(/:([a-zA-Z][a-zA-Z0-9_]*)(?:\([^)]*\))?/g)) {
    out.push(m[1])
  }
  return out
}

export function extractRoutes(source) {
  const out = []
  for (const m of source.matchAll(ROUTE_REGEX)) {
    const [, path, name, metaBlock] = m
    const meta = parseMeta(metaBlock)
    out.push({
      name,
      path,
      params: extractParams(path),
      agentVisible: meta.agentVisible,
      ...(meta.label ? { label: meta.label } : {}),
    })
  }
  return out
}

async function main() {
  const src = await readFile(join(__dirname, '../src/router/routes.ts'), 'utf8')
  const routes = extractRoutes(src)
  const outPath = join(__dirname, '../src/router/routes.manifest.json')
  await writeFile(outPath, JSON.stringify(routes, null, 2) + '\n', 'utf8')
  console.log(`Wrote ${routes.length} routes to ${outPath} (${routes.filter(r => r.agentVisible).length} agent-visible)`)
  // Count actual route entries (path: ... immediately followed by name: ...),
  // not bare name: references which also appear inside redirect: { name: 'X' }.
  const namedRouteCount = (src.match(/\{\s*[^{}]*?path:\s*'[^']+'\s*,\s*name:\s*'/g) || []).length
  if (namedRouteCount !== routes.length) {
    console.warn(`emit-route-manifest: extracted ${routes.length} routes but routes.ts contains ${namedRouteCount} path+name entries — ${namedRouteCount - routes.length} were silently dropped (missing meta? non-standard shape?). Investigate before relying on the manifest.`)
  }
}

const entryPoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null

if (entryPoint && import.meta.url === entryPoint) {
  main().catch(err => { console.error(err); process.exit(1) })
}
