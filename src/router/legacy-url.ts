/**
 * Hash-routing compatibility shim for deep links that carry a real (pre-hash)
 * query string.
 *
 * Under `createWebHashHistory`, vue-router only sees query parameters that live
 * *inside* the hash (`/atlas/#/route?foo=bar`). Externally-produced links and
 * OAuth callbacks frequently put parameters in the real query string instead
 * (`/atlas/?foo=bar` or `/atlas/?token=…#/oauth/callback`), where the router
 * never reads them.
 *
 * `foldSearchIntoHash` rewrites such a URL in place (no reload) so the real
 * query string is merged into the hash's query, where the router's deeplink and
 * OAuth guards can pick it up. It is a no-op when there is no real query string,
 * so normal hash URLs are left untouched. The document pathname is preserved, so
 * this is independent of the deployment base path.
 */
export function foldSearchIntoHash(win: Window = window): boolean {
  const { search, hash, pathname } = win.location
  if (!search || search === '?') {
    return false
  }

  // Split the existing hash into its route path and its own query string.
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash
  const queryIndex = rawHash.indexOf('?')
  const hashPath = queryIndex >= 0 ? rawHash.slice(0, queryIndex) : rawHash
  const hashQuery = queryIndex >= 0 ? rawHash.slice(queryIndex + 1) : ''

  // Merge the real query string into the hash query. Parameters already present
  // in the hash win, since the hash is the canonical SPA location.
  const merged = new URLSearchParams(hashQuery)
  for (const [key, value] of new URLSearchParams(search)) {
    if (!merged.has(key)) {
      merged.append(key, value)
    }
  }

  const path = hashPath || '/'
  const mergedQuery = merged.toString()
  const newHash = `#${path}${mergedQuery ? `?${mergedQuery}` : ''}`

  win.history.replaceState(win.history.state, '', `${pathname}${newHash}`)
  return true
}
