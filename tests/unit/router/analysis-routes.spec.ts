import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'

// Mocks for modules pulled in transitively via @/router/routes.
vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes', () => ({
  generatePluginRoutes: () => [],
}))

import { routes } from '@/router/routes'

const stub = defineComponent({ render: () => h('div') })

function stubRoutes(rs: RouteRecordRaw[]): RouteRecordRaw[] {
  return rs.map((r) => {
    const next: RouteRecordRaw = { ...r }
    if ('component' in next && next.component) {
      next.component = stub
    }
    if (next.children) {
      next.children = stubRoutes(next.children)
    }
    return next
  })
}

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: stubRoutes(routes),
  })
}

describe('analysis routes', () => {
  it('resolves /analysis/characterizations to the characterizations route', async () => {
    const r = makeRouter()
    await r.push('/analysis/characterizations')
    expect(r.currentRoute.value.name).toBe('characterizations')
  })

  it('resolves /analysis/feature-analyses to the feature-analyses route', async () => {
    const r = makeRouter()
    await r.push('/analysis/feature-analyses')
    expect(r.currentRoute.value.name).toBe('feature-analyses')
  })

  it('resolves /analysis/pathways to the pathways route', async () => {
    const r = makeRouter()
    await r.push('/analysis/pathways')
    expect(r.currentRoute.value.name).toBe('pathways')
  })

  it('resolves /analysis/incidence-rates to the incidence-rates route', async () => {
    const r = makeRouter()
    await r.push('/analysis/incidence-rates')
    expect(r.currentRoute.value.name).toBe('incidence-rates')
  })

  it('redirects /characterizations to /analysis/characterizations', async () => {
    const r = makeRouter()
    await r.push('/characterizations')
    expect(r.currentRoute.value.path).toBe('/analysis/characterizations')
  })

  it('redirects /pathways to /analysis/pathways', async () => {
    const r = makeRouter()
    await r.push('/pathways')
    expect(r.currentRoute.value.path).toBe('/analysis/pathways')
  })

  it('redirects /feature-analyses to /analysis/feature-analyses', async () => {
    const r = makeRouter()
    await r.push('/feature-analyses')
    expect(r.currentRoute.value.path).toBe('/analysis/feature-analyses')
  })

  it('redirects /incidence-rates to /analysis/incidence-rates', async () => {
    const r = makeRouter()
    await r.push('/incidence-rates')
    expect(r.currentRoute.value.path).toBe('/analysis/incidence-rates')
  })

  it('keeps /characterizations/:id as a top-level detail route', async () => {
    const r = makeRouter()
    await r.push('/characterizations/42')
    expect(r.currentRoute.value.name).toBe('characterization-edit')
  })

  it('keeps /pathways/:id/results/:executionId as a top-level results route', async () => {
    const r = makeRouter()
    await r.push('/pathways/7/results/9')
    expect(r.currentRoute.value.name).toBe('pathway-results')
  })
})
