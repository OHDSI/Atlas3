/**
 * Regression tests for OHDSI/Atlas3 issue #262 — "Cannot save an empty cohort
 * definition".
 *
 * `canSave` used to require `entryEvents.length > 0`, so a cohort that had been
 * given a name but no criteria yet could not be saved at all. The dirty
 * indicator (`hasUnsavedChanges`) only requires a name, so the editor showed
 * the unsaved-changes dot while the Save button stayed disabled — unsaved work
 * with no way to save it.
 *
 * The save gate is now: name + permission. Design completeness is *not* part of
 * it (WebAPI validation reports it as warnings, and generation is gated on the
 * cohort having been saved at all, never on `canSave`). These tests pin that
 * contract from both sides: a named-but-empty cohort is savable, a nameless one
 * is not.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createRouter, createMemoryHistory } from 'vue-router'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

vi.mock('@/services/cohort-definition.service', () => ({
  getCohortDefinition: vi.fn().mockResolvedValue({ success: false, error: { status: 404 } }),
  saveCohortDefinition: vi
    .fn()
    .mockResolvedValue({ success: true, data: { id: 99, name: 'Draft cohort' } }),
  assignTagToCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
  unassignTagFromCohort: vi.fn().mockResolvedValue({ success: true, data: undefined }),
}))

vi.mock('@/services/source.service', () => ({
  fetchCDMSources: vi.fn().mockResolvedValue({ success: true, data: [] }),
}))

vi.mock('@/services/concept-set.service', () => ({
  getConceptSetById: vi.fn().mockResolvedValue(null),
  getAllConceptSets: vi.fn().mockResolvedValue([]),
}))

vi.mock('@/services/cohort-definition-versions.service', () => ({
  getVersions: vi.fn().mockResolvedValue([]),
  getVersion: vi.fn().mockResolvedValue(null),
  updateVersion: vi.fn().mockResolvedValue(null),
  copyVersion: vi.fn().mockResolvedValue(null),
}))

// Permissions are the *other* half of the save gate. Grant everything so the
// tests below isolate the design-completeness half.
vi.mock('@/composables/usePermissions', () => ({
  usePermissions: () => ({
    hasPermission: () => true,
    hasAnyPermission: () => true,
    hasAllPermissions: () => true,
    cacheHitRate: { value: 1 },
    clearCache: () => {},
  }),
}))

vi.mock('@/composables/useEntityAccess', async () => {
  const { computed } = await import('vue')
  return {
    useEntityAccess: () => ({
      canRead: computed(() => true),
      canWrite: computed(() => true),
      canDelete: computed(() => true),
    }),
    useSourceAccess: () => ({
      canRead: computed(() => true),
      canWrite: computed(() => true),
    }),
    useSourceAccessFor: () => ({
      canRead: () => true,
      canWrite: () => true,
    }),
  }
})

import CohortBuilder from '@/components/cohort/CohortBuilder.vue'
import type { CohortExpression } from '@/models/circe-types'

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const childStubs = {
  ConceptSetSelectionDialog: true,
  ConceptSearchDialog: true,
  ConceptSetEditor: true,
  InclusionCriteriaPanel: true,
  ExitCriteriaPanel: true,
  CensorWindowEditor: true,
  GroupCriteriaUI: true,
  CohortGenerationSection: true,
  VersionsTabContent: true,
  CohortBreadcrumb: true,
  CohortToolbarActions: true,
  CohortToolbarStatus: true,
  ConceptSetsListDialog: true,
  ValidationMessagesDialog: true,
  CohortJsonDialog: true,
  TagSelectionDialog: true,
  'router-link': true,
} as const

describe('CohortBuilder save gate (issue #262)', () => {
  let router: ReturnType<typeof createRouter>

  beforeEach(() => {
    setActivePinia(createPinia())
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/cohorts', component: { template: '<div>Cohorts</div>' } },
        { path: '/cohorts/:id?', component: { template: '<div>Cohort</div>' } },
        {
          path: '/cohortdefinition/:id/version/:version',
          component: { template: '<div>Version</div>' },
        },
      ],
    })
    vi.clearAllMocks()
  })

  const createWrapper = () =>
    mount(CohortBuilder, {
      global: { plugins: [vuetify, router], stubs: childStubs },
    })

  type Vm = {
    canSave: boolean
    hasUnsavedChanges: boolean
    cohortName: string
    handleSave: () => Promise<{ id?: number; name?: string }>
  }

  /**
   * The entry criteria the save gate used to require, read from the expression
   * the gate itself looks at rather than from a child component.
   */
  const entryCriteria = (wrapper: ReturnType<typeof createWrapper>) =>
    ((wrapper.vm as unknown as { $: { setupState: { expression: CohortExpression } } }).$.setupState
      .expression.PrimaryCriteria?.CriteriaList ?? []) as unknown[]

  it('allows saving a named cohort that has no entry events yet', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as unknown as Vm

    vm.cohortName = 'Draft cohort'
    await wrapper.vm.$nextTick()

    // Precondition: the design really is empty — this is the #262 scenario,
    // not a cohort that quietly picked up an entry event from a fixture.
    expect(entryCriteria(wrapper)).toHaveLength(0)
    expect(vm.canSave).toBe(true)
  })

  it('lets the empty draft reach the save service instead of returning early', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as unknown as Vm

    vm.cohortName = 'Draft cohort'
    await wrapper.vm.$nextTick()

    const { saveCohortDefinition } = await import('@/services/cohort-definition.service')
    const result = await vm.handleSave()

    expect(saveCohortDefinition).toHaveBeenCalled()
    expect(result).toEqual({ id: 99, name: 'Draft cohort' })
  })

  it('still refuses to save a cohort with no name', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as unknown as Vm

    expect(vm.canSave).toBe(false)

    // Whitespace is not a name either.
    vm.cohortName = '   '
    await wrapper.vm.$nextTick()
    expect(vm.canSave).toBe(false)

    const { saveCohortDefinition } = await import('@/services/cohort-definition.service')
    await expect(vm.handleSave()).resolves.toEqual({})
    expect(saveCohortDefinition).not.toHaveBeenCalled()
  })

  it('no longer shows unsaved changes while Save is disabled', async () => {
    const wrapper = createWrapper()
    await wrapper.vm.$nextTick()
    const vm = wrapper.vm as unknown as Vm

    vm.cohortName = 'Draft cohort'
    await wrapper.vm.$nextTick()

    // The contradiction reported in #262: the dirty dot was on (name entered)
    // while canSave was false. The two must now agree for a named draft.
    expect(vm.hasUnsavedChanges).toBe(true)
    expect(vm.canSave).toBe(true)
  })
})
