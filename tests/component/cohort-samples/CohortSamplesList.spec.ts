import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CohortSamplesList from '@/components/cohort-samples/CohortSamplesList.vue'
import type { CohortSample } from '@/models/cohort-sample.types'

const vuetify = createVuetify({ components, directives })

const samples: CohortSample[] = [
  {
    id: 1,
    name: 'demo all',
    size: 100,
    createdDate: '2026-04-26T10:00:00Z',
    createdBy: { name: 'ohdsi' },
  },
  {
    id: 2,
    name: 'demo male 40-65',
    size: 50,
    createdDate: '2026-04-25T08:00:00Z',
    createdBy: { name: 'ohdsi' },
    age: { mode: 'between', min: 40, max: 65 },
    gender: { conceptIds: [8507], otherNonBinary: false },
  },
]

describe('CohortSamplesList', () => {
  it('renders the empty state when no samples are passed', () => {
    const wrapper = mount(CohortSamplesList, {
      global: { plugins: [vuetify] },
      props: { samples: [] },
    })
    expect(wrapper.find('[data-testid=cohort-samples-list-empty]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=cohort-samples-list]').exists()).toBe(false)
  })

  it('renders one row per sample with formatted criteria', () => {
    const wrapper = mount(CohortSamplesList, {
      global: { plugins: [vuetify] },
      props: { samples },
    })
    const rows = wrapper.findAll('[data-testid=cohort-samples-list-row]')
    expect(rows).toHaveLength(2)
    const text = wrapper.text()
    expect(text).toContain('demo all')
    expect(text).toContain('All persons') // no criteria
    expect(text).toContain('age 40–65')
    expect(text).toContain('Male')
  })

  it('emits select / refresh / delete with the right payload', async () => {
    const wrapper = mount(CohortSamplesList, {
      global: { plugins: [vuetify] },
      props: { samples },
    })

    await wrapper.find('[data-testid=cohort-samples-list-row]').trigger('click')
    expect(wrapper.emitted('select')?.[0]).toEqual([samples[0]])

    await wrapper.find('[data-testid=cohort-samples-list-refresh]').trigger('click')
    expect(wrapper.emitted('refresh')?.[0]).toEqual([samples[0]])

    await wrapper.find('[data-testid=cohort-samples-list-delete]').trigger('click')
    expect(wrapper.emitted('delete')?.[0]).toEqual([samples[0]])
  })

  it('summarises every age comparator and the non-binary gender label', () => {
    const all: CohortSample[] = [
      { id: 1, name: 'lt', size: 1, age: { mode: 'lessThan', value: 18 } },
      { id: 2, name: 'lte', size: 1, age: { mode: 'lessThanOrEqual', value: 65 } },
      { id: 3, name: 'gt', size: 1, age: { mode: 'greaterThan', value: 65 } },
      { id: 4, name: 'gte', size: 1, age: { mode: 'greaterThanOrEqual', value: 18 } },
      { id: 5, name: 'eq', size: 1, age: { mode: 'equalTo', value: 50 } },
      { id: 6, name: 'nbet', size: 1, age: { mode: 'notBetween', min: 18, max: 65 } },
      { id: 7, name: 'nb', size: 1, gender: { conceptIds: [], otherNonBinary: true } },
      { id: 8, name: 'female', size: 1, createdDate: 1737000000000, gender: { conceptIds: [8532], otherNonBinary: false } },
    ]
    const wrapper = mount(CohortSamplesList, {
      global: { plugins: [vuetify] },
      props: { samples: all },
    })
    const text = wrapper.text()
    expect(text).toContain('age < 18')
    expect(text).toContain('age ≤ 65')
    expect(text).toContain('age > 65')
    expect(text).toContain('age ≥ 18')
    expect(text).toContain('age = 50')
    expect(text).toContain('age ∉ 18–65')
    expect(text).toContain('Other / non-binary')
    expect(text).toContain('Female')
  })

  it('renders an em-dash for missing createdBy / createdDate', () => {
    const wrapper = mount(CohortSamplesList, {
      global: { plugins: [vuetify] },
      props: {
        samples: [{ id: 1, name: 's', size: 1 }],
      },
    })
    expect(wrapper.text()).toContain('—')
  })
})
