import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  NavigationGuardNext,
  NavigationGuardWithThis,
  RouteLocationNormalized,
  RouteRecordRaw,
} from 'vue-router'

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))
vi.mock('@/plugins/navigation/PluginRoutes.ts', () => ({
  generatePluginRoutes: () => [],
}))
vi.mock('@/config/webapi', () => ({
  getSourceKey: () => 'SRC1',
}))

const conceptSetsStore = { loadVersionPreview: vi.fn(), clearPreviewVersion: vi.fn() }
const cohortStore = { loadVersionPreview: vi.fn(), clearPreviewVersion: vi.fn() }
const pathwayStore = { loadVersionPreview: vi.fn(), clearPreviewVersion: vi.fn() }
const irStore = { loadVersionPreview: vi.fn(), clearPreviewVersion: vi.fn() }
vi.mock('@/stores/cohort', () => ({ useCohortStore: () => cohortStore }))
vi.mock('@/stores/concept-sets', () => ({ useConceptSetsStore: () => conceptSetsStore }))
vi.mock('@/stores/pathway', () => ({ usePathwayStore: () => pathwayStore }))
vi.mock('@/stores/incidence-rate', () => ({ useIncidenceRateStore: () => irStore }))

vi.mock('@/views/LandingView.vue', () => ({ default: { name: 'LandingView' } }))
vi.mock('@/views/CohortsView.vue', () => ({ default: { name: 'CohortsView' } }))
vi.mock('@/views/CohortBuilderView.vue', () => ({ default: { name: 'CohortBuilderView' } }))
vi.mock('@/views/ProfileView.vue', () => ({ default: { name: 'ProfileView' } }))
vi.mock('@/views/ApiKeysView.vue', () => ({ default: { name: 'ApiKeysView' } }))
vi.mock('@/views/AnalysisHubView.vue', () => ({ default: { name: 'AnalysisHubView' } }))
vi.mock('@/views/FeatureAnalysesView.vue', () => ({ default: { name: 'FeatureAnalysesView' } }))
vi.mock('@/views/CharacterizationsView.vue', () => ({ default: { name: 'CharacterizationsView' } }))
vi.mock('@/views/PathwaysView.vue', () => ({ default: { name: 'PathwaysView' } }))
vi.mock('@/views/IncidenceRatesView.vue', () => ({ default: { name: 'IncidenceRatesView' } }))
vi.mock('@/views/FeatureAnalysisEditorView.vue', () => ({ default: { name: 'FeatureAnalysisEditorView' } }))
vi.mock('@/views/CharacterizationBuilderView.vue', () => ({ default: { name: 'CharacterizationBuilderView' } }))
vi.mock('@/views/ConceptSetEditorView.vue', () => ({ default: { name: 'ConceptSetEditorView' } }))
vi.mock('@/views/ConceptsView.vue', () => ({ default: { name: 'ConceptsView' } }))
vi.mock('@/views/ConceptDetailView.vue', () => ({ default: { name: 'ConceptDetailView' } }))
vi.mock('@/views/PathwayManagerView.vue', () => ({ default: { name: 'PathwayManagerView' } }))
vi.mock('@/views/PathwayResultsView.vue', () => ({ default: { name: 'PathwayResultsView' } }))
vi.mock('@/views/IncidenceRateManagerView.vue', () => ({ default: { name: 'IncidenceRateManagerView' } }))
vi.mock('@/views/DataSourcesView.vue', () => ({ default: { name: 'DataSourcesView' } }))
vi.mock('@/views/DocsView.vue', () => ({ default: { name: 'DocsView' } }))
vi.mock('@/views/config/RoleManagementView.vue', () => ({ default: { name: 'RoleManagementView' } }))
vi.mock('@/views/config/RoleDetailsView.vue', () => ({ default: { name: 'RoleDetailsView' } }))

import { logger } from '@/utils/logger'
import { routes } from '@/router/routes'

type Meta = Record<string, unknown>

interface ComponentRoute {
  path: string
  name: string
  view: string
  props?: true | 'function'
  meta: Meta
}

const auth = (titleKey: string | undefined, agentLabel: string): Meta =>
  titleKey
    ? { requiresAuth: true, titleKey, agentVisible: true, agentLabel }
    : { requiresAuth: true, agentVisible: true, agentLabel }

const componentRoutes: ComponentRoute[] = [
  { path: '/', name: 'home', view: 'LandingView', meta: { requiresAuth: false, titleKey: 'route.home.title', agentVisible: true, agentLabel: 'Home' } },
  { path: '/cohorts', name: 'cohorts', view: 'CohortsView', meta: auth('route.cohorts.title', 'Cohorts') },
  { path: '/cohorts/new', name: 'cohort-new', view: 'CohortBuilderView', meta: auth('route.cohortBuilder.title', 'New cohort') },
  { path: '/cohorts/:id', name: 'cohort-edit', view: 'CohortBuilderView', props: true, meta: auth('route.cohortBuilder.title', 'Cohort editor') },
  { path: '/profiles', name: 'profiles', view: 'ProfileView', meta: auth('route.profiles.title', 'Profiles') },
  { path: '/profiles/:sourceKey', name: 'profiles-source', view: 'ProfileView', props: true, meta: auth('route.profiles.title', 'Profiles (source)') },
  { path: '/profiles/:sourceKey/:personId(\\d+)', name: 'profile-view', view: 'ProfileView', props: true, meta: auth('route.profiles.title', 'Patient profile') },
  { path: '/profiles/:sourceKey/:personId(\\d+)/:cohortId(\\d+)', name: 'profile-view-cohort', view: 'ProfileView', props: true, meta: auth('route.profiles.title', 'Patient profile (cohort)') },
  { path: '/profile/api-keys', name: 'api-keys', view: 'ApiKeysView', meta: auth('route.apiKeys.title', 'API keys') },
  { path: '/feature-analyses/new', name: 'feature-analysis-new', view: 'FeatureAnalysisEditorView', meta: auth('route.featureAnalyses.title', 'New feature analysis') },
  { path: '/feature-analyses/:id', name: 'feature-analysis-edit', view: 'FeatureAnalysisEditorView', props: true, meta: auth('route.featureAnalyses.title', 'Feature analysis editor') },
  { path: '/characterizations/new', name: 'characterization-new', view: 'CharacterizationBuilderView', meta: auth('route.characterizations.title', 'New characterization') },
  { path: '/characterizations/:id', name: 'characterization-edit', view: 'CharacterizationBuilderView', props: true, meta: auth('route.characterizations.title', 'Characterization editor') },
  { path: '/characterization/:id/version/:version', name: 'characterization-version-preview', view: 'CharacterizationBuilderView', props: true, meta: auth(undefined, 'Characterization version preview') },
  { path: '/cohortdefinition/:id/version/:version', name: 'cohort-version-preview', view: 'CohortBuilderView', props: true, meta: auth(undefined, 'Cohort version preview') },
  { path: '/conceptset/:id/version/:version', name: 'conceptset-version-preview', view: 'ConceptSetEditorView', props: true, meta: auth(undefined, 'Concept set version preview') },
  { path: '/conceptset/new', name: 'conceptset-new', view: 'ConceptSetEditorView', meta: auth('route.conceptSets.title', 'New concept set') },
  { path: '/conceptset/:id(\\d+)', name: 'conceptset-edit', view: 'ConceptSetEditorView', props: true, meta: auth('route.conceptSets.title', 'Concept set editor') },
  { path: '/concepts', name: 'concepts', view: 'ConceptsView', meta: auth('route.conceptSets.title', 'Concept sets') },
  { path: '/concept/:sourceKey/:conceptId(\\d+)', name: 'concept-detail', view: 'ConceptDetailView', props: 'function', meta: auth(undefined, 'Concept detail') },
  { path: '/pathways/new', name: 'pathway-new', view: 'PathwayManagerView', meta: auth('route.pathways.title', 'New pathway') },
  { path: '/pathways/:id(\\d+)', name: 'pathway-edit', view: 'PathwayManagerView', props: true, meta: auth('route.pathways.title', 'Pathway editor') },
  { path: '/pathway-analysis/:id(\\d+)/version/:version', name: 'pathway-version-preview', view: 'PathwayManagerView', props: true, meta: auth(undefined, 'Pathway version preview') },
  { path: '/pathways/:id(\\d+)/results/:executionId(\\d+)', name: 'pathway-results', view: 'PathwayResultsView', props: true, meta: auth(undefined, 'Pathway results') },
  { path: '/incidence-rates/new', name: 'incidence-rate-new', view: 'IncidenceRateManagerView', meta: auth('route.incidenceRates.title', 'New incidence rate') },
  { path: '/incidence-rates/:id(\\d+)', name: 'incidence-rate-edit', view: 'IncidenceRateManagerView', props: true, meta: auth('route.incidenceRates.title', 'Incidence rate editor') },
  { path: '/incidence-rates/:id(\\d+)/version/:version', name: 'incidence-rate-version-preview', view: 'IncidenceRateManagerView', props: true, meta: auth(undefined, 'Incidence rate version preview') },
  { path: '/datasources/:sourceKey?/:reportType?', name: 'datasources', view: 'DataSourcesView', props: true, meta: auth('route.dataSources.title', 'Data sources') },
  { path: '/docs', name: 'docs', view: 'DocsView', meta: { requiresAuth: false, agentVisible: true, agentLabel: 'Documentation' } },
  { path: '/config/roles', name: 'role-management', view: 'RoleManagementView', meta: { requiresAuth: true, titleKey: 'route.roleManagement.title', agentVisible: false } },
  { path: '/config/roles/:id', name: 'role-details', view: 'RoleDetailsView', props: true, meta: { requiresAuth: true, titleKey: 'route.roleManagement.title', agentVisible: false } },
  { path: '/oauth/callback', name: 'oauth-callback', view: 'LandingView', meta: { isOAuthCallback: true, agentVisible: false } },
  { path: '/saml/callback', name: 'saml-callback', view: 'LandingView', meta: { isSAMLCallback: true, agentVisible: false } },
  { path: '/openid/callback', name: 'openid-callback', view: 'LandingView', meta: { isOpenIDCallback: true, agentVisible: false } },
  { path: '/:pathMatch(.*)*', name: 'not-found', view: 'LandingView', meta: { agentVisible: false } },
]

const analysisChildren: ComponentRoute[] = [
  { path: '', name: 'analysis-home', view: 'AnalysisHubView', meta: { requiresAuth: true, titleKey: 'route.analysis.title', agentVisible: false } },
  { path: 'feature-analyses', name: 'feature-analyses', view: 'FeatureAnalysesView', meta: auth('route.featureAnalyses.title', 'Feature analyses') },
  { path: 'characterizations', name: 'characterizations', view: 'CharacterizationsView', meta: auth('route.characterizations.title', 'Characterizations') },
  { path: 'pathways', name: 'pathways', view: 'PathwaysView', meta: auth('route.pathways.title', 'Pathways') },
  { path: 'incidence-rates', name: 'incidence-rates', view: 'IncidenceRatesView', meta: auth('route.incidenceRates.title', 'Incidence rates') },
  { path: 'x/:pluginId/:itemId', name: 'analysis-plugin', view: 'AnalysisHubView', meta: { requiresAuth: true, titleKey: 'route.analysis.title', agentVisible: false } },
]

const staticRedirects: Array<[string, unknown]> = [
  ['/characterizations', { name: 'characterizations' }],
  ['/feature-analyses', { name: 'feature-analyses' }],
  ['/pathways', { name: 'pathways' }],
  ['/incidence-rates', { name: 'incidence-rates' }],
  ['/cohortdefinitions', { name: 'cohorts' }],
  ['/cc/characterizations', { name: 'characterizations' }],
  ['/cc/feature-analyses', { name: 'feature-analyses' }],
  ['/iranalysis', { name: 'incidence-rates' }],
  ['/conceptset/0', { name: 'conceptset-new' }],
  ['/conceptsets', { name: 'concepts', query: { tab: 'sets' } }],
]

function byPath(path: string, list: readonly RouteRecordRaw[] = routes): RouteRecordRaw {
  const found = list.find((r) => r.path === path)
  if (!found) throw new Error(`no route for ${path}`)
  return found
}

async function loadView(route: RouteRecordRaw): Promise<unknown> {
  const loader = route.component as unknown as () => Promise<{ default: unknown }>
  const mod = await loader()
  return mod.default
}

function location(params: Record<string, unknown>, query: Record<string, unknown> = {}, hash = ''): RouteLocationNormalized {
  return { params, query, hash } as unknown as RouteLocationNormalized
}

type RedirectFn = (to: RouteLocationNormalized) => unknown
function redirectOf(path: string): RedirectFn {
  return byPath(path).redirect as unknown as RedirectFn
}

type Guard = (to: RouteLocationNormalized, from: RouteLocationNormalized, next: NavigationGuardNext) => Promise<void>
function guardOf(path: string): Guard {
  return byPath(path).beforeEnter as NavigationGuardWithThis<undefined> as unknown as Guard
}

describe('route table', () => {
  it('declares top-level routes in matching order', () => {
    expect(routes.map((r) => r.path)).toEqual([
      '/', '/cohorts', '/cohorts/new', '/cohorts/:id', '/profiles', '/profiles/:sourceKey',
      '/profiles/:sourceKey/:personId(\\d+)', '/profiles/:sourceKey/:personId(\\d+)/:cohortId(\\d+)',
      '/profile/api-keys', '/analysis',
      '/characterizations', '/feature-analyses', '/pathways', '/incidence-rates',
      '/cohortdefinitions', '/cohortdefinition/:id/:section(.*)*', '/cc/characterizations',
      '/cc/characterizations/:id/version/:version', '/cc/characterizations/:id/results/:executionId',
      '/cc/characterizations/:id/executions/:sourceId', '/cc/characterizations/:id/:section?',
      '/cc/feature-analyses', '/cc/feature-analyses/:id/:section?', '/pathways/:id/version/:version',
      '/iranalysis', '/iranalysis/:id/version/:version', '/iranalysis/:id/:section(.*)*',
      '/concept/:id(\\d+)', '/search/:query?',
      '/feature-analyses/new', '/feature-analyses/:id', '/characterizations/new', '/characterizations/:id',
      '/characterizations/:id/results/:executionId', '/characterization/:id/version/:version',
      '/cohortdefinition/:id/version/:version', '/conceptset/:id/version/:version', '/conceptset/new',
      '/conceptset/0', '/conceptset/:id(\\d+)', '/conceptset/:id(\\d+)/:mode', '/conceptsets', '/concepts',
      '/concept/:sourceKey/:conceptId(\\d+)', '/pathways/new', '/pathways/:id(\\d+)',
      '/pathway-analysis/:id(\\d+)/version/:version', '/pathways/:id(\\d+)/results/:executionId(\\d+)',
      '/incidence-rates/new', '/incidence-rates/:id(\\d+)', '/incidence-rates/:id(\\d+)/version/:version',
      '/datasources/:sourceKey?/:reportType?', '/docs', '/config/roles', '/config/roles/:id',
      '/oauth/callback', '/saml/callback', '/openid/callback', '/:pathMatch(.*)*',
    ])
  })

  it.each(componentRoutes)('$path is $name with its view, props and meta', async (expected) => {
    const route = byPath(expected.path)
    expect(route.name).toBe(expected.name)
    expect(route.meta).toEqual(expected.meta)
    expect(typeof route.props === 'function' ? 'function' : route.props).toBe(expected.props)
    expect(await loadView(route)).toEqual({ name: expected.view })
  })

  it('mounts the analysis hub with its tab children', async () => {
    const hub = byPath('/analysis')
    expect(hub.name).toBeUndefined()
    expect(hub.meta).toEqual({ requiresAuth: true, titleKey: 'route.analysis.title' })
    expect(await loadView(hub)).toEqual({ name: 'AnalysisHubView' })
    expect(hub.children?.map((c) => c.path)).toEqual(analysisChildren.map((c) => c.path))
  })

  it.each(analysisChildren)('analysis child "$path" is $name', async (expected) => {
    const child = byPath(expected.path, byPath('/analysis').children ?? [])
    expect(child.name).toBe(expected.name)
    expect(child.meta).toEqual(expected.meta)
    expect(await loadView(child)).toEqual({ name: expected.view })
  })

  it.each(staticRedirects)('%s redirects statically', (path, target) => {
    expect(byPath(path).redirect).toEqual(target)
  })

  it('maps concept-detail params to typed props', () => {
    const props = byPath('/concept/:sourceKey/:conceptId(\\d+)').props as unknown as RedirectFn
    expect(props(location({ sourceKey: 'SYN', conceptId: '0042' }))).toEqual({ sourceKey: 'SYN', conceptId: 42 })
  })

  it('characterization-results redirects to the editor with a run query', () => {
    const route = byPath('/characterizations/:id/results/:executionId')
    expect(route.name).toBe('characterization-results')
    expect(route.meta).toEqual({ requiresAuth: true, agentVisible: true, agentLabel: 'Characterization results' })
    expect(redirectOf('/characterizations/:id/results/:executionId')(location({ id: '7', executionId: '99' }, { a: '1' }))).toEqual({
      path: '/characterizations/7',
      query: { a: '1', run: '99' },
    })
  })
})

describe('function redirects', () => {
  const q = { keep: 'yes' }

  it.each([
    ['/cohortdefinition/:id/:section(.*)*', 'cohort-edit'],
    ['/cc/characterizations/:id/:section?', 'characterization-edit'],
    ['/cc/feature-analyses/:id/:section?', 'feature-analysis-edit'],
    ['/iranalysis/:id/:section(.*)*', 'incidence-rate-edit'],
    ['/conceptset/:id(\\d+)/:mode', 'conceptset-edit'],
  ])('%s redirects to %s keeping query and hash', (path, name) => {
    expect(redirectOf(path)(location({ id: '12' }, q, '#h'))).toEqual({ name, params: { id: '12' }, query: q, hash: '#h' })
  })

  it.each([
    ['/cc/characterizations/:id/version/:version', 'characterization-version-preview'],
    ['/pathways/:id/version/:version', 'pathway-version-preview'],
    ['/iranalysis/:id/version/:version', 'incidence-rate-version-preview'],
  ])('%s redirects to %s with id and version', (path, name) => {
    expect(redirectOf(path)(location({ id: '3', version: '2' }, q, '#v'))).toEqual({
      name,
      params: { id: '3', version: '2' },
      query: q,
      hash: '#v',
    })
  })

  it('maps legacy characterization results to the results route', () => {
    expect(redirectOf('/cc/characterizations/:id/results/:executionId')(location({ id: '3', executionId: '8' }, q, '#r'))).toEqual({
      name: 'characterization-results',
      params: { id: '3', executionId: '8' },
      query: q,
      hash: '#r',
    })
  })

  it('maps legacy characterization executions to the editor with a sourceId query', () => {
    expect(redirectOf('/cc/characterizations/:id/executions/:sourceId')(location({ id: '3', sourceId: '5' }, q, '#e'))).toEqual({
      name: 'characterization-edit',
      params: { id: '3' },
      query: { keep: 'yes', sourceId: '5' },
      hash: '#e',
    })
  })

  it('maps a legacy concept URL to concept-detail on the current source', () => {
    expect(redirectOf('/concept/:id(\\d+)')(location({ id: '201826' }, q, '#c'))).toEqual({
      name: 'concept-detail',
      params: { sourceKey: 'SRC1', conceptId: '201826' },
      query: q,
      hash: '#c',
    })
  })

  it('maps /search with a term to the concepts search tab', () => {
    expect(redirectOf('/search/:query?')(location({ query: 'aspirin' }, q, '#s'))).toEqual({
      path: '/concepts',
      query: { keep: 'yes', tab: 'search', query: 'aspirin' },
      hash: '#s',
    })
  })

  it('maps /search without a term to the concepts search tab without a query', () => {
    expect(redirectOf('/search/:query?')(location({}, q))).toEqual({
      path: '/concepts',
      query: { keep: 'yes', tab: 'search' },
      hash: '',
    })
  })

  it('takes the first value of a repeated param', () => {
    const redirect = redirectOf('/cohortdefinition/:id/:section(.*)*')
    expect(redirect(location({ id: ['5', '6'] }))).toMatchObject({ params: { id: '5' } })
  })

  it('drops non-string param values', () => {
    const redirect = redirectOf('/cohortdefinition/:id/:section(.*)*')
    expect(redirect(location({ id: [7] }))).toMatchObject({ params: { id: '' } })
    expect(redirect(location({ id: 7 }))).toMatchObject({ params: { id: '' } })
    expect(redirect(location({ id: [] }))).toMatchObject({ params: { id: '' } })
  })
})

describe('version-preview guards called directly', () => {
  const from = location({})

  beforeEach(() => {
    vi.mocked(logger.error).mockClear()
    for (const store of [cohortStore, conceptSetsStore, pathwayStore, irStore]) {
      store.loadVersionPreview.mockReset()
      store.clearPreviewVersion.mockReset()
    }
  })

  it('cohort guard falls back to the editor with replace on a failed load', async () => {
    cohortStore.loadVersionPreview.mockRejectedValue(new Error('boom'))
    const next = vi.fn()
    await guardOf('/cohortdefinition/:id/version/:version')(location({ id: '4', version: '2' }, { a: '1' }, '#x'), from, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith({ name: 'cohort-edit', params: { id: '4' }, query: { a: '1' }, hash: '#x', replace: true })
    expect(logger.error).toHaveBeenCalledTimes(1)
  })

  it('concept set guard falls back to the editor with replace on a failed load', async () => {
    conceptSetsStore.loadVersionPreview.mockRejectedValue(new Error('boom'))
    const next = vi.fn()
    await guardOf('/conceptset/:id/version/:version')(location({ id: '4', version: '2' }, { a: '1' }, '#x'), from, next)
    expect(next).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith({ name: 'conceptset-edit', params: { id: '4' }, query: { a: '1' }, hash: '#x', replace: true })
  })

  it('concept set guard skips loading for a non-numeric version', async () => {
    const next = vi.fn()
    await guardOf('/conceptset/:id/version/:version')(location({ id: '4', version: 'abc' }), from, next)
    expect(conceptSetsStore.loadVersionPreview).not.toHaveBeenCalled()
    expect(conceptSetsStore.clearPreviewVersion).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })

  it.each([
    ['/pathway-analysis/:id(\\d+)/version/:version', pathwayStore],
    ['/incidence-rates/:id(\\d+)/version/:version', irStore],
  ])('%s skips loading for a non-numeric id', async (path, store) => {
    const next = vi.fn()
    await guardOf(path)(location({ id: 'abc', version: '2' }), from, next)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })

  it.each([
    ['/pathway-analysis/:id(\\d+)/version/:version', pathwayStore],
    ['/incidence-rates/:id(\\d+)/version/:version', irStore],
  ])('%s skips loading for a non-numeric version', async (path, store) => {
    const next = vi.fn()
    await guardOf(path)(location({ id: '3', version: 'abc' }), from, next)
    expect(store.loadVersionPreview).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })

  it.each([
    ['/pathway-analysis/:id(\\d+)/version/:version', pathwayStore],
    ['/incidence-rates/:id(\\d+)/version/:version', irStore],
  ])('%s logs a failed load and still continues', async (path, store) => {
    store.loadVersionPreview.mockRejectedValue(new Error('boom'))
    const next = vi.fn()
    await guardOf(path)(location({ id: '3', version: '2' }), from, next)
    expect(store.loadVersionPreview).toHaveBeenCalledWith(3, 2)
    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(next).toHaveBeenCalledWith()
  })
})
