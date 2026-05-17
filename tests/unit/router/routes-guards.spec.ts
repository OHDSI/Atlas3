/**
 * Tests for the per-route beforeEnter guards in `src/router/routes.ts`.
 *
 * These guards lazy-load the matching Pinia store and call its
 * `loadVersionPreview` / `clearPreviewVersion` action, depending on the
 * `:version` parameter. They are the largest single uncovered region in
 * the route table.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes.ts', () => ({
  generatePluginRoutes: () => [],
}))

const cohortStore = {
  loadVersionPreview: vi.fn(),
  clearPreviewVersion: vi.fn(),
}
const conceptSetsStore = {
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
vi.mock('@/stores/concept-sets', () => ({
  useConceptSetsStore: () => conceptSetsStore,
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

describe('version-preview beforeEnter guards', () => {
  beforeEach(() => {
    cohortStore.loadVersionPreview.mockReset()
    cohortStore.clearPreviewVersion.mockReset()
    conceptSetsStore.loadVersionPreview.mockReset()
    conceptSetsStore.clearPreviewVersion.mockReset()
    pathwayStore.loadVersionPreview.mockReset()
    pathwayStore.clearPreviewVersion.mockReset()
    irStore.loadVersionPreview.mockReset()
    irStore.clearPreviewVersion.mockReset()
  })

  describe('cohort-version-preview', () => {
    it('loads a version preview for a numeric :version', async () => {
      cohortStore.loadVersionPreview.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/cohortdefinition/42/version/7')
      expect(cohortStore.loadVersionPreview).toHaveBeenCalledWith(7)
    })

    it('clears the preview when :version is "current"', async () => {
      cohortStore.clearPreviewVersion.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/cohortdefinition/42/version/current')
      expect(cohortStore.clearPreviewVersion).toHaveBeenCalled()
      expect(cohortStore.loadVersionPreview).not.toHaveBeenCalled()
    })

    it('continues navigation when loadVersionPreview rejects', async () => {
      cohortStore.loadVersionPreview.mockRejectedValue(new Error('load failed'))
      const r = makeRouter()
      await r.push('/cohortdefinition/42/version/7')
      expect(r.currentRoute.value.name).toBe('cohort-version-preview')
    })

    it('ignores a non-numeric :version (no store call)', async () => {
      const r = makeRouter()
      await r.push('/cohortdefinition/42/version/abc')
      expect(cohortStore.loadVersionPreview).not.toHaveBeenCalled()
      expect(cohortStore.clearPreviewVersion).not.toHaveBeenCalled()
    })
  })

  describe('conceptset-version-preview', () => {
    it('loads a version preview for a numeric :version', async () => {
      conceptSetsStore.loadVersionPreview.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/conceptset/9/version/3')
      expect(conceptSetsStore.loadVersionPreview).toHaveBeenCalledWith(3)
    })

    it('clears the preview when :version is "current"', async () => {
      conceptSetsStore.clearPreviewVersion.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/conceptset/9/version/current')
      expect(conceptSetsStore.clearPreviewVersion).toHaveBeenCalled()
    })

    it('continues navigation when loadVersionPreview rejects', async () => {
      conceptSetsStore.loadVersionPreview.mockRejectedValue(new Error('load failed'))
      const r = makeRouter()
      await r.push('/conceptset/9/version/3')
      expect(r.currentRoute.value.name).toBe('conceptset-version-preview')
    })
  })

  describe('pathway-version-preview', () => {
    it('loads a version preview when :id and :version are numeric', async () => {
      pathwayStore.loadVersionPreview.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/pathway-analysis/5/version/2')
      expect(pathwayStore.loadVersionPreview).toHaveBeenCalledWith(5, 2)
    })

    it('clears the preview when :version is "current"', async () => {
      const r = makeRouter()
      await r.push('/pathway-analysis/5/version/current')
      expect(pathwayStore.clearPreviewVersion).toHaveBeenCalled()
      expect(pathwayStore.loadVersionPreview).not.toHaveBeenCalled()
    })

    it('continues navigation when loadVersionPreview rejects', async () => {
      pathwayStore.loadVersionPreview.mockRejectedValue(new Error('boom'))
      const r = makeRouter()
      await r.push('/pathway-analysis/5/version/2')
      expect(r.currentRoute.value.name).toBe('pathway-version-preview')
    })
  })

  describe('incidence-rate-version-preview', () => {
    it('loads a version preview when :id and :version are numeric', async () => {
      irStore.loadVersionPreview.mockResolvedValue(undefined)
      const r = makeRouter()
      await r.push('/incidence-rates/8/version/4')
      expect(irStore.loadVersionPreview).toHaveBeenCalledWith(8, 4)
    })

    it('clears the preview when :version is "current"', async () => {
      const r = makeRouter()
      await r.push('/incidence-rates/8/version/current')
      expect(irStore.clearPreviewVersion).toHaveBeenCalled()
      expect(irStore.loadVersionPreview).not.toHaveBeenCalled()
    })

    it('continues navigation when loadVersionPreview rejects', async () => {
      irStore.loadVersionPreview.mockRejectedValue(new Error('boom'))
      const r = makeRouter()
      await r.push('/incidence-rates/8/version/4')
      expect(r.currentRoute.value.name).toBe('incidence-rate-version-preview')
    })

    it('ignores a non-numeric :version (no store call)', async () => {
      const r = makeRouter()
      await r.push('/incidence-rates/8/version/abc')
      expect(irStore.loadVersionPreview).not.toHaveBeenCalled()
      expect(irStore.clearPreviewVersion).not.toHaveBeenCalled()
    })
  })
})
