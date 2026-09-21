import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes.ts', () => ({
  generatePluginRoutes: () => [],
}))
vi.mock('@/config/app-config.loader', () => ({
  getAppConfig: () => ({ api: { url: '/WebAPI' } }),
}))

const cohortStore = {
  loadVersionPreview: vi.fn(),
  clearPreviewVersion: vi.fn(),
}
const pathwayStore = {
  loadVersionPreview: vi.fn(),
  clearPreviewVersion: vi.fn(),
}
const irStore = {
  loadVersionPreview: vi.fn(),
  clearPreviewVersion: vi.fn(),
}

vi.mock('@/stores/cohort', () => ({
  useCohortStore: () => cohortStore,
}))
vi.mock('@/stores/pathway', () => ({
  usePathwayStore: () => pathwayStore,
}))
vi.mock('@/stores/incidence-rate', () => ({
  useIncidenceRateStore: () => irStore,
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

describe('Atlas 2.x compatibility routes', () => {
  beforeEach(() => {
    localStorage.clear()
    cohortStore.loadVersionPreview.mockReset().mockResolvedValue(undefined)
    cohortStore.clearPreviewVersion.mockReset().mockResolvedValue(undefined)
    pathwayStore.loadVersionPreview.mockReset().mockResolvedValue(undefined)
    pathwayStore.clearPreviewVersion.mockReset().mockResolvedValue(undefined)
    irStore.loadVersionPreview.mockReset().mockResolvedValue(undefined)
    irStore.clearPreviewVersion.mockReset().mockResolvedValue(undefined)
  })

  it('redirects the Atlas 2 cohort list to the Atlas 3 cohort list', async () => {
    const router = makeRouter()
    await router.push('/cohortdefinitions')
    expect(router.currentRoute.value.name).toBe('cohorts')
    expect(router.currentRoute.value.path).toBe('/cohorts')
  })

  it('redirects Atlas 2 cohort details to the Atlas 3 cohort editor', async () => {
    const router = makeRouter()
    await router.push('/cohortdefinition/85')
    expect(router.currentRoute.value.name).toBe('cohort-edit')
    expect(router.currentRoute.value.path).toBe('/cohorts/85')
  })

  it('keeps Atlas 2 cohort version preview URLs guarded', async () => {
    const router = makeRouter()
    await router.push('/cohortdefinition/85/version/3')
    expect(router.currentRoute.value.name).toBe('cohort-version-preview')
    expect(cohortStore.loadVersionPreview).toHaveBeenCalledWith(3, 85)
  })

  it('redirects Atlas 2 characterization list and detail URLs', async () => {
    const router = makeRouter()
    await router.push('/cc/characterizations')
    expect(router.currentRoute.value.path).toBe('/analysis/characterizations')

    await router.push('/cc/characterizations/6')
    expect(router.currentRoute.value.name).toBe('characterization-edit')
    expect(router.currentRoute.value.path).toBe('/characterizations/6')
  })

  it('redirects Atlas 2 characterization result URLs through the Atlas 3 result route', async () => {
    const router = makeRouter()
    await router.push('/cc/characterizations/6/results/12')
    expect(router.currentRoute.value.name).toBe('characterization-edit')
    expect(router.currentRoute.value.path).toBe('/characterizations/6')
    expect(router.currentRoute.value.query.run).toBe('12')
  })

  it('redirects Atlas 2 feature-analysis list and detail URLs', async () => {
    const router = makeRouter()
    await router.push('/cc/feature-analyses')
    expect(router.currentRoute.value.path).toBe('/analysis/feature-analyses')

    await router.push('/cc/feature-analyses/107')
    expect(router.currentRoute.value.name).toBe('feature-analysis-edit')
    expect(router.currentRoute.value.path).toBe('/feature-analyses/107')
  })

  it('redirects Atlas 2 incidence-rate URLs to Atlas 3 incidence-rate routes', async () => {
    const router = makeRouter()
    await router.push('/iranalysis')
    expect(router.currentRoute.value.path).toBe('/analysis/incidence-rates')

    await router.push('/iranalysis/9')
    expect(router.currentRoute.value.name).toBe('incidence-rate-edit')
    expect(router.currentRoute.value.path).toBe('/incidence-rates/9')
  })

  it('redirects Atlas 2 pathway version URLs to the Atlas 3 guarded preview route', async () => {
    const router = makeRouter()
    await router.push('/pathways/5/version/2')
    expect(router.currentRoute.value.name).toBe('pathway-version-preview')
    expect(pathwayStore.loadVersionPreview).toHaveBeenCalledWith(5, 2)
  })

  it('redirects Atlas 2 search URLs to the Atlas 3 concept search tab', async () => {
    const router = makeRouter()
    await router.push('/search/diabetes')
    expect(router.currentRoute.value.name).toBe('concepts')
    expect(router.currentRoute.value.path).toBe('/concepts')
    expect(router.currentRoute.value.query).toEqual({ tab: 'search', query: 'diabetes' })
  })

  it('redirects Atlas 2 concept detail URLs to the Atlas 3 source-qualified concept detail route', async () => {
    localStorage.setItem('selectedVocabulary', 'eunomia')
    const router = makeRouter()
    await router.push('/concept/201826')
    expect(router.currentRoute.value.name).toBe('concept-detail')
    expect(router.currentRoute.value.path).toBe('/concept/eunomia/201826')
    expect(router.currentRoute.value.params).toMatchObject({ sourceKey: 'eunomia', conceptId: '201826' })
  })

  it('keeps Atlas 3 source-qualified concept detail URLs canonical', async () => {
    const router = makeRouter()
    await router.push('/concept/eunomia/8560')
    expect(router.currentRoute.value.name).toBe('concept-detail')
    expect(router.currentRoute.value.path).toBe('/concept/eunomia/8560')
    expect(router.currentRoute.value.params).toMatchObject({ sourceKey: 'eunomia', conceptId: '8560' })
  })

  it('does not match non-numeric Atlas 2 concept detail URLs', () => {
    const router = makeRouter()
    const resolved = router.resolve('/concept/not-a-number')
    expect(resolved.name).toBe('not-found')
  })
})