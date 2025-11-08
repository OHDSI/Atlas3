/**
 * Vue Router Configuration
 * Basic routing for cohort builder SPA
 */
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/LandingView.vue'),
    },
    {
      path: '/cohorts',
      name: 'cohorts',
      component: () => import('@/views/CohortsView.vue'),
    },
    {
      path: '/cohorts/new',
      name: 'cohort-new',
      component: () => import('@/views/CohortBuilderView.vue'),
    },
    {
      path: '/cohorts/:id',
      name: 'cohort-edit',
      component: () => import('@/views/CohortBuilderView.vue'),
      props: true,
    },
    {
      path: '/concepts',
      name: 'concepts',
      component: () => import('@/views/ConceptsView.vue'),
    },
    {
      path: '/datasources/:sourceKey?/:reportType?',
      name: 'datasources',
      component: () => import('@/views/DataSourcesView.vue'),
      props: true,
    },
  ],
})

export default router
