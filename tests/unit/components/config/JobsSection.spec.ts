import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { computed, ref, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import JobsSection from '@/components/config/JobsSection.vue'
import { AtlasDataTable, AtlasFacetFilterBar, AtlasSwitch } from '@/components/ui'
import { useAuthStore } from '@/stores/auth'
import type { Job } from '@/models/jobs.types'

const vuetify = createVuetify({ components, directives })

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    executionId: 1,
    type: 'generateCohort',
    name: 'Job',
    status: 'COMPLETED',
    author: 'alice',
    startTime: null,
    endTime: null,
    duration: null,
    entityId: null,
    sourceKey: null,
    exitMessage: null,
    ...overrides,
  }
}

const jobs = ref<Job[]>([])

vi.mock('@/composables/useJobs', () => ({
  useJobs: () => ({
    filteredJobs: computed(() => jobs.value),
    isLoading: computed(() => false),
    error: computed(() => null),
    pollingEnabled: computed(() => false),
    statusFilter: computed(() => 'all'),
    lastFetched: computed(() => null),
    runningJobsCount: computed(() => 0),
    totalJobsCount: computed(() => jobs.value.length),
    hasJobs: computed(() => jobs.value.length > 0),
    getStatusDisplay: () => ({ label: 'Completed', color: 'green', icon: 'mdi-check-circle' }),
    getTypeLabel: () => 'Cohort Generation',
    getTypeIcon: () => 'mdi-account-group',
    formatJobDuration: () => '-',
    formatDate: () => '-',
    navigateToJobEntity: vi.fn(),
    canNavigateToEntity: () => false,
    refresh: vi.fn().mockResolvedValue(undefined),
    setFilter: vi.fn(),
    togglePolling: vi.fn(),
    stopPolling: vi.fn(),
  }),
}))

function tableIds(wrapper: VueWrapper): number[] {
  const items = wrapper.findComponent(AtlasDataTable).props('items') as Job[]
  return items.map(j => j.id)
}

describe('JobsSection filtering', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    setActivePinia(createPinia())
    jobs.value = [
      makeJob({ id: 1, executionId: 11, name: 'Diabetes cohort', author: 'alice' }),
      makeJob({ id: 2, executionId: 12, name: 'Asthma cohort', author: 'bob' }),
      makeJob({ id: 3, executionId: 13, name: 'Heart failure', author: 'alice' }),
    ]
  })

  afterEach(() => {
    wrapper?.unmount()
  })

  function mountSection() {
    wrapper = mount(JobsSection, { global: { plugins: [vuetify] } })
    return wrapper
  }

  it('narrows the table by free text', async () => {
    mountSection()
    expect(tableIds(wrapper)).toEqual([1, 2, 3])

    wrapper.findComponent(AtlasFacetFilterBar).vm.$emit('update:resultFilter', 'failure')
    await nextTick()
    expect(tableIds(wrapper)).toEqual([3])
  })

  it('filters by author facet', async () => {
    mountSection()
    wrapper
      .findComponent(AtlasFacetFilterBar)
      .vm.$emit('update:facet', { key: 'author', values: ['bob'] })
    await nextTick()
    expect(tableIds(wrapper)).toEqual([2])
  })

  it('shows only the signed-in user\'s jobs when "My jobs" is on', async () => {
    useAuthStore().user = { login: 'alice' } as never
    mountSection()

    const toggle = wrapper.findComponent(AtlasSwitch)
    expect(toggle.exists()).toBe(true)

    toggle.vm.$emit('update:modelValue', true)
    await nextTick()
    expect(tableIds(wrapper)).toEqual([1, 3])
    expect(wrapper.findComponent(AtlasSwitch).props('modelValue')).toBe(true)

    wrapper.findComponent(AtlasSwitch).vm.$emit('update:modelValue', false)
    await nextTick()
    expect(tableIds(wrapper)).toEqual([1, 2, 3])
  })

  it('hides the "My jobs" toggle when nobody is signed in', () => {
    mountSection()
    expect(wrapper.findComponent(AtlasSwitch).exists()).toBe(false)
  })
})
