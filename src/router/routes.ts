/**
 * Vue Router route table.
 *
 * Extracted into its own module so tests can import the routes without
 * pulling in the createRouter side effect from `./index`.
 */
import type { RouteRecordRaw } from 'vue-router'
import { generatePluginRoutes } from '@/plugins/navigation/PluginRoutes.ts'
import { logger } from '@/utils/logger'

const ANALYSIS_TAB_NAMES = [
  'feature-analyses',
  'characterizations',
  'pathways',
  'incidence-rates',
] as const
const ANALYSIS_LAST_TAB_KEY = 'atlas3.analysis.lastTab'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/LandingView.vue'),
    meta: { requiresAuth: false, titleKey: 'route.home.title', agentVisible: true, agentLabel: 'Home' },
  },
  {
    path: '/cohorts',
    name: 'cohorts',
    component: () => import('@/views/CohortsView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.cohorts.title', agentVisible: true, agentLabel: 'Cohorts' },
  },
  {
    path: '/cohorts/new',
    name: 'cohort-new',
    component: () => import('@/views/CohortBuilderView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.cohortBuilder.title', agentVisible: true, agentLabel: 'New cohort' },
  },
  {
    path: '/cohorts/:id',
    name: 'cohort-edit',
    component: () => import('@/views/CohortBuilderView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.cohortBuilder.title', agentVisible: true, agentLabel: 'Cohort editor' },
  },
  {
    path: '/profiles',
    name: 'profiles',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.profiles.title', agentVisible: true, agentLabel: 'Profiles' },
  },
  {
    path: '/profiles/:sourceKey',
    name: 'profiles-source',
    component: () => import('@/views/ProfileView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.profiles.title', agentVisible: true, agentLabel: 'Profiles (source)' },
  },
  {
    path: '/profiles/:sourceKey/:personId(\\d+)',
    name: 'profile-view',
    component: () => import('@/views/ProfileView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.profiles.title', agentVisible: true, agentLabel: 'Patient profile' },
  },
  {
    path: '/profiles/:sourceKey/:personId(\\d+)/:cohortId(\\d+)',
    name: 'profile-view-cohort',
    component: () => import('@/views/ProfileView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.profiles.title', agentVisible: true, agentLabel: 'Patient profile (cohort)' },
  },
  // Analysis hub: shared parent for the four list views, each rendered inside
  // a tab strip. Default redirect respects the user's last-visited tab via
  // localStorage when available.
  {
    path: '/analysis',
    component: () => import('@/views/AnalysisHubView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.analysis.title' },
    redirect: () => {
      const allowed = new Set<string>(ANALYSIS_TAB_NAMES)
      let last: string | null = null
      try {
        if (typeof localStorage !== 'undefined') {
          last = localStorage.getItem(ANALYSIS_LAST_TAB_KEY)
        }
      } catch {
        // localStorage may be unavailable (private mode, SSR); fall through.
      }
      const target = last && allowed.has(last) ? last : 'feature-analyses'
      return { name: target }
    },
    children: [
      {
        path: 'feature-analyses',
        name: 'feature-analyses',
        component: () => import('@/views/FeatureAnalysesView.vue'),
        meta: { requiresAuth: true, titleKey: 'route.featureAnalyses.title', agentVisible: true, agentLabel: 'Feature analyses' },
      },
      {
        path: 'characterizations',
        name: 'characterizations',
        component: () => import('@/views/CharacterizationsView.vue'),
        meta: { requiresAuth: true, titleKey: 'route.characterizations.title', agentVisible: true, agentLabel: 'Characterizations' },
      },
      {
        path: 'pathways',
        name: 'pathways',
        component: () => import('@/views/PathwaysView.vue'),
        meta: { requiresAuth: true, titleKey: 'route.pathways.title', agentVisible: true, agentLabel: 'Pathways' },
      },
      {
        path: 'incidence-rates',
        name: 'incidence-rates',
        component: () => import('@/views/IncidenceRatesView.vue'),
        meta: { requiresAuth: true, titleKey: 'route.incidenceRates.title', agentVisible: true, agentLabel: 'Incidence rates' },
      },
      {
        path: 'x/:pluginId/:itemId',
        name: 'analysis-plugin',
        component: () => import('@/views/AnalysisHubView.vue'),
        meta: { requiresAuth: true, titleKey: 'route.analysis.title', agentVisible: false },
      },
    ],
  },
  // Route aliases: keep legacy list URLs mapped to Analysis Hub child routes.
  { path: '/characterizations', redirect: { name: 'characterizations' } },
  { path: '/feature-analyses', redirect: { name: 'feature-analyses' } },
  { path: '/pathways', redirect: { name: 'pathways' } },
  { path: '/incidence-rates', redirect: { name: 'incidence-rates' } },
  // Detail / builder / results / version-preview routes remain top-level.
  {
    path: '/feature-analyses/new',
    name: 'feature-analysis-new',
    component: () => import('@/views/FeatureAnalysisEditorView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.featureAnalyses.title', agentVisible: true, agentLabel: 'New feature analysis' },
  },
  {
    path: '/feature-analyses/:id',
    name: 'feature-analysis-edit',
    component: () => import('@/views/FeatureAnalysisEditorView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.featureAnalyses.title', agentVisible: true, agentLabel: 'Feature analysis editor' },
  },
  {
    path: '/characterizations/new',
    name: 'characterization-new',
    component: () => import('@/views/CharacterizationBuilderView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.characterizations.title', agentVisible: true, agentLabel: 'New characterization' },
  },
  {
    path: '/characterizations/:id',
    name: 'characterization-edit',
    component: () => import('@/views/CharacterizationBuilderView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.characterizations.title', agentVisible: true, agentLabel: 'Characterization editor' },
  },
  {
    path: '/characterizations/:id/results/:executionId',
    name: 'characterization-results',
    redirect: (to) => ({
      path: `/characterizations/${to.params.id as string}`,
      query: { ...to.query, run: String(to.params.executionId) },
    }),
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Characterization results' },
  },
  {
    // NOTE: beforeEnter version-preview hook is intentionally deferred to
    // Phase 3B when the store gains loadVersionPreview / clearPreviewVersion.
    path: '/characterization/:id/version/:version',
    name: 'characterization-version-preview',
    component: () => import('@/views/CharacterizationBuilderView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Characterization version preview' },
  },
  // Version preview routes (T036, T037)
  {
    path: '/cohortdefinition/:id/version/:version',
    name: 'cohort-version-preview',
    component: () => import('@/views/CohortBuilderView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Cohort version preview' },
    beforeEnter: async (to, _from, next) => {
      const { useCohortStore } = await import('@/stores/cohort')
      const cohortStore = useCohortStore()
      const versionParam = to.params.version as string

      if (versionParam === 'current') {
        // Clear preview mode (T037)
        await cohortStore.clearPreviewVersion()
      } else {
        // Load version for preview (T037)
        const versionNumber = parseInt(versionParam)
        if (!isNaN(versionNumber)) {
          try {
            await cohortStore.loadVersionPreview(versionNumber)
          } catch (error) {
            logger.error('Router', 'Failed to load version preview', error)
            // Continue navigation anyway - let the view handle the error
          }
        }
      }
      next()
    },
  },
  {
    path: '/conceptset/:id/version/:version',
    name: 'conceptset-version-preview',
    component: () => import('@/views/ConceptsView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Concept set version preview' },
    beforeEnter: async (to, _from, next) => {
      const { useConceptSetsStore } = await import('@/stores/concept-sets')
      const conceptSetsStore = useConceptSetsStore()
      const versionParam = to.params.version as string

      if (versionParam === 'current') {
        // Clear preview mode (T037)
        await conceptSetsStore.clearPreviewVersion()
      } else {
        // Load version for preview (T037)
        const versionNumber = parseInt(versionParam)
        if (!isNaN(versionNumber)) {
          try {
            await conceptSetsStore.loadVersionPreview(versionNumber)
          } catch (error) {
            logger.error('Router', 'Failed to load version preview', error)
            // Continue navigation anyway - let the view handle the error
          }
        }
      }
      next()
    },
  },
  {
    path: '/concepts',
    name: 'concepts',
    component: () => import('@/views/ConceptsView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.conceptSets.title', agentVisible: true, agentLabel: 'Concept sets' },
  },
  {
    path: '/concept/:sourceKey/:conceptId(\\d+)',
    name: 'concept-detail',
    component: () => import('@/views/ConceptDetailView.vue'),
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Concept detail' },
    props: (route) => ({
      sourceKey: route.params.sourceKey as string,
      conceptId: parseInt(route.params.conceptId as string, 10),
    }),
  },
  {
    path: '/pathways/new',
    name: 'pathway-new',
    component: () => import('@/views/PathwayManagerView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.pathways.title', agentVisible: true, agentLabel: 'New pathway' },
  },
  {
    path: '/pathways/:id(\\d+)',
    name: 'pathway-edit',
    component: () => import('@/views/PathwayManagerView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.pathways.title', agentVisible: true, agentLabel: 'Pathway editor' },
  },
  {
    path: '/pathway-analysis/:id(\\d+)/version/:version',
    name: 'pathway-version-preview',
    component: () => import('@/views/PathwayManagerView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Pathway version preview' },
    beforeEnter: async (to, _from, next) => {
      const { usePathwayStore } = await import('@/stores/pathway')
      const pathwayStore = usePathwayStore()
      const versionParam = to.params.version as string
      const idParam = Number(to.params.id)
      if (versionParam === 'current') {
        pathwayStore.clearPreviewVersion()
      } else if (Number.isFinite(idParam)) {
        const versionNumber = parseInt(versionParam)
        if (!isNaN(versionNumber)) {
          try {
            await pathwayStore.loadVersionPreview(idParam, versionNumber)
          } catch (error) {
            logger.error('Router', 'Failed to load pathway version preview', error)
          }
        }
      }
      next()
    },
  },
  {
    path: '/pathways/:id(\\d+)/results/:executionId(\\d+)',
    name: 'pathway-results',
    component: () => import('@/views/PathwayResultsView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Pathway results' },
  },
  {
    path: '/incidence-rates/new',
    name: 'incidence-rate-new',
    component: () => import('@/views/IncidenceRateManagerView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.incidenceRates.title', agentVisible: true, agentLabel: 'New incidence rate' },
  },
  {
    path: '/incidence-rates/:id(\\d+)',
    name: 'incidence-rate-edit',
    component: () => import('@/views/IncidenceRateManagerView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.incidenceRates.title', agentVisible: true, agentLabel: 'Incidence rate editor' },
  },
  {
    path: '/incidence-rates/:id(\\d+)/version/:version',
    name: 'incidence-rate-version-preview',
    component: () => import('@/views/IncidenceRateManagerView.vue'),
    props: true,
    meta: { requiresAuth: true, agentVisible: true, agentLabel: 'Incidence rate version preview' },
    beforeEnter: async (to, _from, next) => {
      const { useIncidenceRateStore } = await import('@/stores/incidence-rate')
      const irStore = useIncidenceRateStore()
      const versionParam = to.params.version as string
      const idParam = Number(to.params.id)
      if (versionParam === 'current') {
        irStore.clearPreviewVersion()
      } else if (Number.isFinite(idParam)) {
        const v = parseInt(versionParam)
        if (!isNaN(v)) {
          try {
            await irStore.loadVersionPreview(idParam, v)
          } catch (error) {
            logger.error('Router', 'Failed to load IR version preview', error)
          }
        }
      }
      next()
    },
  },
  {
    path: '/datasources/:sourceKey?/:reportType?',
    name: 'datasources',
    component: () => import('@/views/DataSourcesView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.dataSources.title', agentVisible: true, agentLabel: 'Data sources' },
  },
  {
    path: '/docs',
    name: 'docs',
    // Lazy-imported so neither the viewer chunk nor the bundled
    // PDF (~2 MB) is fetched until a user navigates here.
    component: () => import('@/views/DocsView.vue'),
    meta: { requiresAuth: false, agentVisible: true, agentLabel: 'Documentation' },
  },
  // Role and Permissions Management routes
  {
    path: '/config/roles',
    name: 'role-management',
    component: () => import('@/views/config/RoleManagementView.vue'),
    meta: { requiresAuth: true, titleKey: 'route.roleManagement.title', agentVisible: false },
  },
  {
    path: '/config/roles/:id',
    name: 'role-details',
    component: () => import('@/views/config/RoleDetailsView.vue'),
    props: true,
    meta: { requiresAuth: true, titleKey: 'route.roleManagement.title', agentVisible: false },
  },
  {
    path: '/oauth/callback',
    name: 'oauth-callback',
    component: () => import('@/views/LandingView.vue'),
    meta: { isOAuthCallback: true, agentVisible: false },
  },
  {
    path: '/saml/callback',
    name: 'saml-callback',
    component: () => import('@/views/LandingView.vue'),
    meta: { isSAMLCallback: true, agentVisible: false },
  },
  {
    path: '/openid/callback',
    name: 'openid-callback',
    component: () => import('@/views/LandingView.vue'),
    meta: { isOpenIDCallback: true, agentVisible: false },
  },
  {
    path: '/:client/:token/:redirectUrl?',
    name: 'oauth-token',
    component: () => import('@/views/LandingView.vue'),
    meta: { isOAuthCallback: true, agentVisible: false },
  },
  ...generatePluginRoutes(),
]
