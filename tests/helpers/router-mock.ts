/**
 * Test Helper: Router Mock
 * Provides Vue Router mock utilities for component tests
 */

import { vi } from 'vitest'
import { createRouter, createMemoryHistory, type RouteRecordRaw } from 'vue-router'

/**
 * Default routes for testing
 */
const defaultRoutes: RouteRecordRaw[] = [
  { path: '/', name: 'home', component: { template: '<div>Home</div>' } },
  { path: '/cohorts', name: 'cohorts', component: { template: '<div>Cohorts</div>' } },
  { path: '/cohorts/:id', name: 'cohort-detail', component: { template: '<div>Cohort Detail</div>' } },
  { path: '/concepts', name: 'concepts', component: { template: '<div>Concepts</div>' } },
  { path: '/datasources', name: 'datasources', component: { template: '<div>Data Sources</div>' } },
  { path: '/config', name: 'config', component: { template: '<div>Config</div>' } },
]

/**
 * Create a test router instance
 * @param routes Custom routes (defaults to standard app routes)
 * @param initialRoute Initial route path
 */
export function createTestRouter(routes?: RouteRecordRaw[], initialRoute = '/') {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: routes || defaultRoutes,
  })

  router.push(initialRoute)

  return router
}

/**
 * Create mock router composables for vi.mock('vue-router')
 */
export function createRouterMocks(overrides?: {
  route?: Partial<{
    path: string
    name: string
    params: Record<string, string>
    query: Record<string, string>
    hash: string
    fullPath: string
    matched: unknown[]
    redirectedFrom: unknown
    meta: Record<string, unknown>
  }>
  router?: Partial<{
    push: ReturnType<typeof vi.fn>
    replace: ReturnType<typeof vi.fn>
    back: ReturnType<typeof vi.fn>
    forward: ReturnType<typeof vi.fn>
    go: ReturnType<typeof vi.fn>
    currentRoute: { value: unknown }
  }>
}) {
  const mockRoute = {
    path: '/',
    name: 'home',
    params: {},
    query: {},
    hash: '',
    fullPath: '/',
    matched: [],
    redirectedFrom: undefined,
    meta: {},
    ...overrides?.route,
  }

  const mockRouter = {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    currentRoute: { value: mockRoute },
    ...overrides?.router,
  }

  return {
    useRoute: () => mockRoute,
    useRouter: () => mockRouter,
  }
}
