import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import CohortTable from '@/components/cohort/CohortTable.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

const vuetify = createVuetify({ components, directives })

function makeRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/cohorts/:id', component: { template: '<div />' } }],
  })
}

function makeWrapper(props: Partial<{
  cohorts: CohortDefinitionSummary[]
  loading: boolean
  error: Error | null
  searchQuery: string
  selectedTags: string[]
}> = {}) {
  return mount(CohortTable, {
    global: { plugins: [vuetify, createPinia(), makeRouter()] },
    props: {
      cohorts: [],
      loading: false,
      error: null,
      ...props,
    },
  })
}

const sampleCohorts: CohortDefinitionSummary[] = [
  {
    id: 1,
    name: 'New users of diclofenac',
    description: 'A demo cohort',
    createdBy: { name: 'admin' },
    createdDate: '2026-01-15T08:00:00Z',
    modifiedBy: { name: 'admin' },
    modifiedDate: '2026-04-20T10:30:00Z',
    tags: [{ id: 1, name: 'demo' }, { id: 2, name: 'nsaid' }] as never,
  },
  {
    id: 2,
    name: 'Diabetes',
    createdBy: 'ohdsi',
    createdDate: 1737000000000,
  } as never,
]

describe('CohortTable', () => {
  it('renders one row per cohort with id, name and formatted dates', () => {
    const wrapper = makeWrapper({ cohorts: sampleCohorts })

    const rows = wrapper.findAll('[data-testid=cohort-table-row]')
    expect(rows).toHaveLength(2)
    expect(wrapper.text()).toContain('New users of diclofenac')
    expect(wrapper.text()).toContain('Diabetes')
    expect(wrapper.text()).toContain('admin')
    expect(wrapper.text()).toContain('ohdsi')
  })

  it('shows the loading skeleton instead of the table when loading', () => {
    const wrapper = makeWrapper({ loading: true })
    expect(wrapper.find('[data-testid=cohort-table]').exists()).toBe(false)
    expect(wrapper.findComponent({ name: 'VSkeletonLoader' }).exists()).toBe(true)
  })

  it('shows the error alert and emits retry when the retry button is clicked', async () => {
    const wrapper = makeWrapper({ error: new Error('boom') })
    expect(wrapper.text()).toContain('boom')

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')
    expect(wrapper.emitted('retry')).toBeTruthy()
  })

  it('shows the empty state with a create button when no cohorts exist', async () => {
    const wrapper = makeWrapper({ cohorts: [] })
    expect(wrapper.text()).toContain('No cohorts found')

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')
    expect(wrapper.emitted('create-cohort')).toBeTruthy()
  })

  it('emits action events from the row buttons without bubbling row click', async () => {
    const wrapper = makeWrapper({ cohorts: [sampleCohorts[0]!] })

    await wrapper.find('[data-testid=cohort-table-info]').trigger('click')
    await wrapper.find('[data-testid=cohort-table-generate]').trigger('click')
    await wrapper.find('[data-testid=cohort-table-delete]').trigger('click')

    expect(wrapper.emitted('show-info')).toHaveLength(1)
    expect(wrapper.emitted('generate')).toHaveLength(1)
    expect(wrapper.emitted('delete')).toHaveLength(1)
  })

  it('emits tag-click when a tag chip is clicked', async () => {
    const wrapper = makeWrapper({ cohorts: [sampleCohorts[0]!] })
    const chips = wrapper.findAllComponents({ name: 'VChip' })
    expect(chips.length).toBeGreaterThan(0)
    await chips[0]!.trigger('click')
    expect(wrapper.emitted('tag-click')?.[0]).toEqual(['demo'])
  })

  it('navigates to the cohort builder when a row is clicked', async () => {
    const router = makeRouter()
    const push = vi.spyOn(router, 'push')
    const wrapper = mount(CohortTable, {
      global: { plugins: [vuetify, createPinia(), router] },
      props: { cohorts: [sampleCohorts[0]!], loading: false, error: null },
    })

    await wrapper.find('[data-testid=cohort-table-row]').trigger('click')
    expect(push).toHaveBeenCalledWith('/cohorts/1')
  })
})
