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