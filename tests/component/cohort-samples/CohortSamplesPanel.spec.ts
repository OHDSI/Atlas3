import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { ApiError } from '@/services/api-error'
import { success, failure } from '@/types/api'

vi.mock('@/services/cohort-sample.service', () => ({
  listCohortSamples: vi.fn(),
  createCohortSample: vi.fn(),
  getCohortSample: vi.fn(),
  refreshCohortSample: vi.fn(),
  deleteCohortSample: vi.fn(),
}))

import CohortSamplesPanel from '@/components/cohort-samples/CohortSamplesPanel.vue'
import {
  listCohortSamples,
  createCohortSample,
  getCohortSample,
  refreshCohortSample,
  deleteCohortSample,
} from '@/services/cohort-sample.service'

const vuetify = createVuetify({ components, directives })
const globalMountOpts = {
  plugins: [vuetify, createPinia()],
  stubs: { RouterLink: { template: '<a><slot /></a>' } },
}

const sample = {
  id: 1,
  name: 'demo',
  size: 100,
  createdDate: '2026-04-26T10:00:00Z',
  createdBy: { name: 'ohdsi' },
}

describe('CohortSamplesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
  })

  it('renders the empty state when no samples are returned', async () => {
    vi.mocked(listCohortSamples).mockResolvedValueOnce(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [] })
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-list-empty]').exists()).toBe(true)
  })

  it('shows the list when samples come back, and loads the detail when one is selected', async () => {
    vi.mocked(listCohortSamples).mockResolvedValueOnce(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(getCohortSample).mockResolvedValueOnce(
      success({
        ...sample,
        elements: [{ sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50 }],
      })
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-list]').exists()).toBe(true)

    await wrapper.find('[data-testid=cohort-samples-list-row]').trigger('click')
    await flushPromises()

    expect(getCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', 1, { withElements: true })
    expect(wrapper.find('[data-testid=cohort-sample-detail-table]').exists()).toBe(true)
  })

  it('refresh triggers refresh + list reload', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(refreshCohortSample).mockResolvedValueOnce(success(sample))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    await wrapper.find('[data-testid=cohort-samples-list-refresh]').trigger('click')
    await flushPromises()

    expect(refreshCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', 1)
    expect(listCohortSamples).toHaveBeenCalledTimes(2) // initial + after refresh
  })

  it('delete clears the selection and reloads the list', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(getCohortSample).mockResolvedValueOnce(success({ ...sample, elements: [] }))
    vi.mocked(deleteCohortSample).mockResolvedValueOnce(success(undefined))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    await wrapper.find('[data-testid=cohort-samples-list-row]').trigger('click')
    await flushPromises()

    await wrapper.find('[data-testid=cohort-samples-list-delete]').trigger('click')
    await flushPromises()

    expect(deleteCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', 1)
    expect(listCohortSamples).toHaveBeenCalledTimes(2)
  })

  it('createCohortSample failure surfaces an error and keeps the list intact', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [] })
    )
    vi.mocked(createCohortSample).mockResolvedValueOnce(
      failure(new ApiError('size must be smaller', 400, null))
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    // Drive the panel's onCreate handler directly via the dialog @submit slot
    await (wrapper.findComponent({ name: 'CohortSampleCreateDialog' })).vm.$emit('submit', { name: 'x', size: 1 })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain('size must be smaller')
  })

  it('createCohortSample success closes the dialog, reloads list and selects the new sample', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(createCohortSample).mockResolvedValueOnce(success(sample))
    vi.mocked(getCohortSample).mockResolvedValueOnce(
      success({
        ...sample,
        elements: [{ sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50 }],
      })
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    await wrapper.findComponent({ name: 'CohortSampleCreateDialog' }).vm.$emit('submit', { name: 'demo', size: 100 })
    await flushPromises()

    expect(createCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', { name: 'demo', size: 100 })
    expect(getCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', 1, { withElements: true })
    expect(listCohortSamples).toHaveBeenCalledTimes(2) // initial + post-create reload
  })

  it('falls back to the generic error message when the list fetch fails without a message', async () => {
    vi.mocked(listCohortSamples).mockResolvedValueOnce(failure(new ApiError('', 0, null)))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain('Failed to load samples')
  })

  it('shows the error banner rather than an empty list when the list fetch fails', async () => {
    // A failed fetch must not read as "no samples" — that's precisely the
    // null-meant-two-things bug this migration fixes.
    vi.mocked(listCohortSamples).mockResolvedValueOnce(
      failure(new ApiError('no read access', 403, null))
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain('no read access')
    expect(wrapper.find('[data-testid=cohort-samples-list-empty]').exists()).toBe(false)
  })

  it('falls back to the generic error message when create fails without a message', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [] })
    )
    vi.mocked(createCohortSample).mockResolvedValueOnce(failure(new ApiError('', 0, null)))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()
    await wrapper.findComponent({ name: 'CohortSampleCreateDialog' }).vm.$emit('submit', { name: 'x', size: 1 })
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain('Failed to create sample')
  })

  it('shows the error banner and clears the selection when the detail fetch fails', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(getCohortSample).mockResolvedValueOnce(
      failure(new ApiError('sample detail is gone', 404, null))
    )

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    await wrapper.find('[data-testid=cohort-samples-list-row]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain(
      'sample detail is gone'
    )
    expect(wrapper.vm.selectedSample).toBeNull()
    expect(wrapper.find('[data-testid=cohort-sample-detail-table]').exists()).toBe(false)
  })

  it('falls back to the generic error message when the detail fetch fails without a message', async () => {
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample] })
    )
    vi.mocked(getCohortSample).mockResolvedValueOnce(failure(new ApiError('', 0, null)))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    await wrapper.find('[data-testid=cohort-samples-list-row]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-testid=cohort-samples-error]').text()).toContain(
      'Failed to load sample detail'
    )
    expect(wrapper.vm.selectedSample).toBeNull()
  })

  it('refresh on a non-selected sample does not reload the detail view', async () => {
    const other = { ...sample, id: 99, name: 'other' }
    vi.mocked(listCohortSamples).mockResolvedValue(
      success({ cohortDefinitionId: 1, sourceId: 1, samples: [sample, other] })
    )
    vi.mocked(getCohortSample).mockResolvedValueOnce(success({ ...sample, elements: [] }))
    vi.mocked(refreshCohortSample).mockResolvedValueOnce(success(other))

    const wrapper = mount(CohortSamplesPanel, {
      global: globalMountOpts,
      props: { cohortId: 1, sourceKey: 'EUNOMIA' },
    })
    await flushPromises()

    // Select sample id=1
    await wrapper.findAll('[data-testid=cohort-samples-list-row]')[0]!.trigger('click')
    await flushPromises()
    expect(getCohortSample).toHaveBeenCalledTimes(1)

    // Refresh sample id=99 — should not re-fetch detail since it's not selected
    await wrapper.findAll('[data-testid=cohort-samples-list-refresh]')[1]!.trigger('click')
    await flushPromises()

    expect(refreshCohortSample).toHaveBeenCalledWith(1, 'EUNOMIA', 99)
    expect(getCohortSample).toHaveBeenCalledTimes(1) // still just the original select
  })
})
