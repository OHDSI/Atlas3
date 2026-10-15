import { describe, expect, it, vi } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes', () => ({
  generatePluginRoutes: () => [],
}))

import { routes } from '@/router/routes'

function flatten(rs: readonly RouteRecordRaw[]): RouteRecordRaw[] {
  const out: RouteRecordRaw[] = []
  for (const r of rs) {
    out.push(r)
    if (r.children) out.push(...flatten(r.children))
  }
  return out
}

describe('route table loaders', () => {
  it('every route component lazy-loader is callable', () => {
    for (const r of flatten(routes)) {
      if (typeof r.component === 'function') {
        const result = (r.component as () => unknown)()
        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          (result as Promise<unknown>).then(
            () => {},
            () => {},
          )
        }
      }
    }
  })

  it('a bare /analysis lands on the hub instead of a static redirect', () => {
    const analysis = flatten(routes).find((r) => r.path === '/analysis')
    expect(analysis).toBeDefined()
    // The hub picks the tab, because plugin tabs are unknown when a redirect runs.
    expect(analysis!.redirect).toBeUndefined()
    const home = analysis!.children?.find((c) => c.path === '')
    expect(home?.name).toBe('analysis-home')
  })
})
