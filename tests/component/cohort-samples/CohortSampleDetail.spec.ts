import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import CohortSampleDetail from '@/components/cohort-samples/CohortSampleDetail.vue'

const vuetify = createVuetify({ components, directives })
const globalMountOpts = {
  plugins: [vuetify, createPinia()],
  stubs: { RouterLink: { template: '<a><slot /></a>' } },
}

setActivePinia(createPinia())

describe('CohortSampleDetail', () => {
  it('renders one row per element with gender labels', () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: {
        sample: {
          id: 1,
          name: 'demo',
          size: 3,
          elements: [
            { sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50 },
            { sampleId: 1, rank: 2, personId: '1002', genderConceptId: 8532, age: 30 },
            { sampleId: 1, rank: 3, personId: '1003', genderConceptId: 0, age: 25 },
          ],
        },
      },
    })

    expect(wrapper.findAll('[data-testid=cohort-sample-detail-row]')).toHaveLength(3)
    const text = wrapper.text()
    expect(text).toContain('Male')
    expect(text).toContain('Female')
    expect(text).toContain('Other')
    expect(text).toContain('1001')
  })

  it('renders the empty state when there are no elements', () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: { sample: { id: 1, name: 'demo', size: 0, elements: [] } },
    })
    expect(wrapper.find('[data-testid=cohort-sample-detail-empty]').exists()).toBe(true)
  })

  it('shows the loading skeleton when loading is true', () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: { sample: { id: 1, name: 'demo', size: 0 }, loading: true },
    })
    expect(wrapper.find('[data-testid=cohort-sample-detail-table]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('renders the records column when at least one element has a recordCount', () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: {
        sample: {
          id: 1,
          name: 'demo',
          size: 2,
          elements: [
            { sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50, recordCount: 12 },
            { sampleId: 1, rank: 2, personId: '1002', genderConceptId: 8532, age: 30 },
          ],
        },
      },
    })
    expect(wrapper.text()).toContain('Records')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('—') // null recordCount in row 2
  })

  it('emits open-profile with the personId when the profile button is clicked', async () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: {
        sourceKey: 'EUNOMIA',
        sample: {
          id: 1,
          name: 'demo',
          cohortDefinitionId: 42,
          size: 1,
          elements: [
            { sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50 },
          ],
        },
      },
    })
    const link = wrapper.find('[data-test=cohort-sample-profile-link]')
    expect(link.exists()).toBe(true)
    await link.trigger('click')
    expect(wrapper.emitted('open-profile')).toEqual([['1001']])
  })

  it('renders the personId as plain text when no sourceKey is available', () => {
    const wrapper = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: {
        sample: {
          id: 1,
          name: 'demo',
          size: 1,
          elements: [
            { sampleId: 1, rank: 1, personId: '1001', genderConceptId: 8507, age: 50 },
          ],
        },
      },
    })
    expect(wrapper.find('[data-test=cohort-sample-profile-link]').exists()).toBe(false)
    expect(wrapper.text()).toContain('1001')
  })

  it('formats createdDate when present and falls back to em-dash otherwise', () => {
    const wrapperWithDate = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: { sample: { id: 1, name: 'demo', size: 0, createdDate: '2026-04-26T10:00:00Z', elements: [] } },
    })
    expect(wrapperWithDate.text()).toMatch(/2026|Apr/)

    const wrapperNoDate = mount(CohortSampleDetail, {
      global: globalMountOpts,
      props: { sample: { id: 1, name: 'demo', size: 0, elements: [] } },
    })
    expect(wrapperNoDate.text()).toContain('—')
  })
})
