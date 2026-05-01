import { describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized, RouteRecordRaw } from 'vue-router'

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

  it('analysis hub redirect resolves to a tab name', () => {
    const analysis = flatten(routes).find((r) => r.path === '/analysis')
    expect(analysis).toBeDefined()
    expect(typeof analysis!.redirect).toBe('function')

    const fakeRoute = {
      params: {},
      path: '/analysis',
      query: {},
      hash: '',
      name: undefined,
      fullPath: '/analysis',
      matched: [],
      meta: {},
      redirectedFrom: undefined,
    } as unknown as RouteLocationNormalized

    // Default (nothing in localStorage) should redirect to characterizations.
    try {
      localStorage.removeItem('atlas3.analysis.lastTab')
    } catch {
      // localStorage may be unavailable in some envs.
    }
    const fn = analysis!.redirect as (to: RouteLocationNormalized) => { name: string }
    expect(fn(fakeRoute)).toEqual({ name: 'characterizations' })

    // A remembered tab name should win.
    try {
      localStorage.setItem('atlas3.analysis.lastTab', 'pathways')
      expect(fn(fakeRoute)).toEqual({ name: 'pathways' })
    } finally {
      try {
        localStorage.removeItem('atlas3.analysis.lastTab')
      } catch {
        // ignore
      }
    }

    // An unrecognized stored value falls back to the default.
    try {
      localStorage.setItem('atlas3.analysis.lastTab', 'nope')
      expect(fn(fakeRoute)).toEqual({ name: 'characterizations' })
    } finally {
      try {
        localStorage.removeItem('atlas3.analysis.lastTab')
      } catch {
        // ignore
      }
    }
  })
})
