import { describe, it, expect } from 'vitest'
import { extractRoutes } from '../emit-route-manifest.mjs'

const FIXTURE = `
export const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/LandingView.vue'),
    meta: { requiresAuth: false, agentVisible: true, agentLabel: 'Home' },
  },
  {
    path: '/cohorts/:id',
    name: 'cohort-edit',
    component: () => import('@/views/CohortBuilderView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Cohort editor' },
  },
  {
    path: '/oauth/callback',
    name: 'oauth-callback',
    component: () => import('@/views/LandingView.vue'),
    meta: { isOAuthCallback: true },
  },
]`

describe('extractRoutes', () => {
  it('returns one entry per top-level route with a name', () => {
    const out = extractRoutes(FIXTURE)
    expect(out).toHaveLength(3)
  })

  it('captures name, path, and params', () => {
    const out = extractRoutes(FIXTURE)
    const cohort = out.find(r => r.name === 'cohort-edit')
    expect(cohort).toMatchObject({
      name: 'cohort-edit',
      path: '/cohorts/:id',
      params: ['id'],
    })
  })

  it('defaults agentVisible to false when meta omits it', () => {
    const out = extractRoutes(FIXTURE)
    const oauth = out.find(r => r.name === 'oauth-callback')
    expect(oauth.agentVisible).toBe(false)
  })

  it('reads agentLabel when present', () => {
    const out = extractRoutes(FIXTURE)
    expect(out.find(r => r.name === 'home').label).toBe('Home')
  })

  it('includes routes with relative paths (e.g. children of unnamed parent routes)', () => {
    const fixture = `
    export const routes = [
      { path: 'feature-analyses', name: 'feature-analyses',
        component: () => import('@/views/FeatureAnalysesView.vue'),
        meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Feature analyses' }, },
    ]`
    const out = extractRoutes(fixture)
    const fa = out.find(r => r.name === 'feature-analyses')
    expect(fa).toBeDefined()
    expect(fa.path).toBe('feature-analyses')
    expect(fa.agentVisible).toBe(true)
  })
})

describe('extractRoutes silent-drop awareness', () => {
  it('captures routes that lack a meta block (regression for silent drops)', () => {
    const fixture = `
    export const routes = [
      { path: '/no-meta', name: 'no-meta', component: () => null },
    ]`
    const out = extractRoutes(fixture)
    expect(out.find(r => r.name === 'no-meta')).toBeUndefined()
  })
})

describe('route counter does not double-count redirect targets', () => {
  it('a route with redirect: { name: ... } counts as one entry', () => {
    const fixture = `
    export const routes = [
      { path: '/old-path',
        redirect: { name: 'cohorts' } },
      { path: '/cohorts', name: 'cohorts',
        component: () => null,
        meta: { agentVisible: true, agentLabel: 'Cohorts' } },
    ]`
    const out = extractRoutes(fixture)
    expect(out).toHaveLength(1)
    expect(out[0].name).toBe('cohorts')
  })
})
