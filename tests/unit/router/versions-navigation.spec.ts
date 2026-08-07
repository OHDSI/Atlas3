/**
 * Guards the class of bug where VersionsTabContent builds a navigation
 * path from `assetType` by string interpolation and the segment silently
 * doesn't match any registered route (e.g. 'ir' -> '/ir/...' when the real
 * route is '/incidence-rates/...'). A wrong segment here is a dead link
 * that only fails when someone clicks it, so this resolves the same paths
 * VersionsTabContent.vue's handlePreview/handleCopy build and asserts they
 * land on the intended route rather than falling through to 'not-found'.
 */
import { describe, it, expect } from 'vitest'
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router'
import { defineComponent, h } from 'vue'
import { routes } from '@/router/routes'
import { ASSET_ROUTE_SEGMENT } from '@/components/versions/types'
import type { VersionsConfig } from '@/components/versions/types'

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

const expectedVersionPreviewRoute: Record<VersionsConfig['assetType'], string> = {
  cohortdefinition: 'cohort-version-preview',
  conceptset: 'conceptset-version-preview',
  'pathway-analysis': 'pathway-version-preview',
  ir: 'incidence-rate-version-preview',
}

describe('version-preview navigation targets resolve to real routes', () => {
  const router = makeRouter()

  for (const assetType of Object.keys(ASSET_ROUTE_SEGMENT) as VersionsConfig['assetType'][]) {
    it(`${assetType} -> /${ASSET_ROUTE_SEGMENT[assetType]}/:id/version/:version resolves`, () => {
      const path = `/${ASSET_ROUTE_SEGMENT[assetType]}/5/version/3`
      const resolved = router.resolve(path)

      expect(resolved.name).not.toBe('not-found')
      expect(resolved.name).toBe(expectedVersionPreviewRoute[assetType])
    })
  }

  it('the unfixed "ir" segment would have been a dead link', () => {
    const resolved = router.resolve('/ir/5/version/3')
    expect(resolved.name).toBe('not-found')
  })
})
