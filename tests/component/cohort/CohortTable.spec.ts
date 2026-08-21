import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { createPinia, setActivePinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import CohortTable from '@/components/cohort/CohortTable.vue'
import type { CohortDefinitionSummary } from '@/models/webapi.types'
import { useAuthStore } from '@/stores/auth'
import { emptyEntityAccess } from '@/models/auth.types'

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
  canCopy: boolean
  copyingId: number | null
}> = {}) {
  // Per-test pinia + a permitted user so the row action buttons aren't
  // disabled by the new permission gating.
  const pinia = createPinia()
  setActivePinia(pinia)
  const authStore = useAuthStore()
  authStore.setUser({
    login: 'tester',
    displayName: 'tester',
    permissionIdx: { write: ['write:cohort-definition'] },
    entityAccess: emptyEntityAccess(),
  })
  return mount(CohortTable, {
    global: { plugins: [vuetify, pinia, makeRouter()] },
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
    // Refresh: empty-state copy and CTA changed to sentence case.
    const wrapper = makeWrapper({ cohorts: [] })
    expect(wrapper.text()).toMatch(/No cohorts/i)

    await wrapper.findComponent({ name: 'VBtn' }).trigger('click')
    expect(wrapper.emitted('create-cohort')).toBeTruthy()
  })

  it('emits action events from the row buttons without bubbling row click', async () => {
    // Refresh: removed the row-level Generate button. Action column
    // now contains Copy, Info and Delete.
    const wrapper = makeWrapper({ cohorts: [sampleCohorts[0]!], canCopy: true })

    await wrapper.find('[data-testid=cohort-table-info]').trigger('click')
    await wrapper.find('[data-testid=cohort-table-copy]').trigger('click')
    await wrapper.find('[data-testid=cohort-table-delete]').trigger('click')

    expect(wrapper.emitted('show-info')).toHaveLength(1)
    expect(wrapper.emitted('copy')).toHaveLength(1)
    expect(wrapper.emitted('copy')![0]).toEqual([sampleCohorts[0]])
    expect(wrapper.emitted('delete')).toHaveLength(1)
    expect(wrapper.emitted('generate')).toBeFalsy()
  })

  it('disables the copy button when the user cannot create cohorts', () => {
    const wrapper = makeWrapper({ cohorts: [sampleCohorts[0]!], canCopy: false })
    const copyBtn = wrapper.get('[data-testid=cohort-table-copy]')
    expect(copyBtn.attributes('disabled')).not.toBeUndefined()
  })

  it('disables the copy button for the row currently being copied', () => {
    const wrapper = makeWrapper({ cohorts: [sampleCohorts[0]!], canCopy: true, copyingId: 1 })
    const copyBtn = wrapper.get('[data-testid=cohort-table-copy]')
    expect(copyBtn.attributes('disabled')).not.toBeUndefined()
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

  /** Regression: OHDSI/Atlas3#263 — the headers were inert text. */
  describe('column sorting (Atlas3#263)', () => {
    const rows: CohortDefinitionSummary[] = [
      {
        id: 3,
        name: 'Zoledronic acid',
        createdBy: { name: 'carol' },
        createdDate: '2026-03-01T00:00:00Z',
        modifiedDate: '2026-03-02T00:00:00Z',
      },
      {
        id: 1,
        name: 'Aspirin',
        createdBy: { name: 'alice' },
        createdDate: '2026-01-01T00:00:00Z',
        modifiedDate: '2026-05-01T00:00:00Z',
      },
      {
        id: 2,
        name: 'metformin',
        createdBy: { name: 'bob' },
        createdDate: '2026-02-01T00:00:00Z',
        modifiedDate: '2026-04-01T00:00:00Z',
      },
    ] as never

    function names(wrapper: ReturnType<typeof makeWrapper>) {
      return wrapper
        .findAll('[data-testid=cohort-table-row]')
        .map(r => r.findAll('td')[1]!.text().split('\n')[0]!.trim())
    }

    it('opens on most recently modified, like the concept set list', () => {
      expect(names(makeWrapper({ cohorts: rows }))).toEqual([
        'Aspirin',
        'metformin',
        'Zoledronic acid',
      ])
    })

    it('sorts by id, and reverses on a second click', async () => {
      const wrapper = makeWrapper({ cohorts: rows })

      await wrapper.find('[data-testid=cohort-table-sort-id]').trigger('click')
      expect(names(wrapper)).toEqual(['Zoledronic acid', 'metformin', 'Aspirin'])

      await wrapper.find('[data-testid=cohort-table-sort-id]').trigger('click')
      expect(names(wrapper)).toEqual(['Aspirin', 'metformin', 'Zoledronic acid'])
    })

    it('sorts by name case-insensitively, ascending first', async () => {
      const wrapper = makeWrapper({ cohorts: rows })

      await wrapper.find('[data-testid=cohort-table-sort-name]').trigger('click')
      expect(names(wrapper)).toEqual(['Aspirin', 'metformin', 'Zoledronic acid'])
    })

    it('sorts by author and by created date', async () => {
      const wrapper = makeWrapper({ cohorts: rows })

      await wrapper.find('[data-testid=cohort-table-sort-author]').trigger('click')
      expect(names(wrapper)).toEqual(['Aspirin', 'metformin', 'Zoledronic acid'])

      await wrapper.find('[data-testid=cohort-table-sort-created]').trigger('click')
      expect(names(wrapper)).toEqual(['Zoledronic acid', 'metformin', 'Aspirin'])
    })

    it('reports the active sort to assistive technology', async () => {
      const wrapper = makeWrapper({ cohorts: rows })

      await wrapper.find('[data-testid=cohort-table-sort-name]').trigger('click')

      const headers = wrapper.findAll('th')
      expect(headers[1]!.attributes('aria-sort')).toBe('ascending')
      expect(headers[0]!.attributes('aria-sort')).toBe('none')
    })

    it('does not reorder the array it was given', () => {
      const given = [...rows]
      makeWrapper({ cohorts: given })
      expect(given.map(c => c.id)).toEqual([3, 1, 2])
    })
  })
})
