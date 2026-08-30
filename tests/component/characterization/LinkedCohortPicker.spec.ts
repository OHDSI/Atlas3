/**
 * LinkedCohortPicker component tests
 *
 * Smoke-level: clicking remove emits an updated list, opening the dialog
 * reveals only un-linked cohorts, and confirming a selection appends them.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import LinkedCohortPicker from '@/components/characterization/LinkedCohortPicker.vue'
import type { LinkedCohort } from '@/models/characterization.types'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

const availableCohorts: CohortDefinitionSummary[] = [
  { id: 1, name: 'Diabetes' },
  { id: 2, name: 'Hypertension' },
  { id: 3, name: 'Asthma' },
]

function mountPicker(
  initial: LinkedCohort[] = [],
  cohorts: CohortDefinitionSummary[] = availableCohorts
) {
  return mount(LinkedCohortPicker, {
    props: {
      modelValue: initial,
      availableCohorts: cohorts,
    },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('LinkedCohortPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  it('renders empty state when nothing is linked', () => {
    const wrapper = mountPicker([])
    expect(wrapper.find('[data-testid="linked-cohort-picker-empty"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('renders linked cohorts as list rows', () => {
    const wrapper = mountPicker([{ id: 1, name: 'Diabetes' }])
    expect(wrapper.find('[data-testid="linked-cohort-picker-row-1"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('Diabetes')
    wrapper.unmount()
  })

  it('emits update:modelValue without the removed cohort', async () => {
    const wrapper = mountPicker([
      { id: 1, name: 'Diabetes' },
      { id: 2, name: 'Hypertension' },
    ])

    await wrapper.get('[data-testid="linked-cohort-picker-remove-1"]').trigger('click')
    await flushPromises()

    const emitted = wrapper.emitted('update:modelValue')
    expect(emitted).toBeTruthy()
    const next = emitted![0]![0] as LinkedCohort[]
    expect(next).toHaveLength(1)
    expect(next[0]!.id).toBe(2)
    wrapper.unmount()
  })

  it('opens the dialog when Add cohort is clicked', async () => {
    const wrapper = mountPicker([])

    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()

    // Dialog renders into a Vuetify overlay container at the document root.
    const dialog = document.querySelector('[data-testid="linked-cohort-picker-table"]')
    expect(dialog).not.toBeNull()
    wrapper.unmount()
  })

  // Discussion #123: the picker dialog had no way to filter a long cohort
  // list, unlike the Pathways/Incidence-Rate cohort pickers.
  describe('search (discussion #123)', () => {
    it('renders a search field in the picker dialog', async () => {
      const wrapper = mountPicker([])

      await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
      await flushPromises()

      const search = document.querySelector('[data-testid="linked-cohort-picker-search"]')
      expect(search).not.toBeNull()
      wrapper.unmount()
    })

    it('filters the selectable cohorts as the user types', async () => {
      const wrapper = mountPicker([])

      await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
      await flushPromises()

      wrapper.vm.search = 'asthma'
      await flushPromises()

      const rows = document.querySelectorAll('[data-testid="linked-cohort-picker-table"] tbody tr')
      const rowText = Array.from(rows).map(r => r.textContent)
      expect(rowText.some(text => text?.includes('Asthma'))).toBe(true)
      expect(rowText.some(text => text?.includes('Diabetes'))).toBe(false)
      wrapper.unmount()
    })

    it('resets the search text each time the dialog is reopened', async () => {
      const wrapper = mountPicker([])

      await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
      await flushPromises()
      wrapper.vm.search = 'asthma'
      // The dialog's Cancel button teleports to document.body, outside the
      // wrapper's own root — click it via the raw DOM node.
      const cancelBtn = document.querySelector<HTMLElement>(
        '[data-testid="linked-cohort-picker-cancel"]'
      )
      cancelBtn?.click()
      await flushPromises()

      await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
      await flushPromises()

      expect(wrapper.vm.search).toBe('')
      wrapper.unmount()
    })
  })
})

/**
 * Issue #215: the cohort selector showed names only. In a deployment with 20k+
 * definitions the id is how you tell two similarly-named cohorts apart, and it
 * is what people search by.
 */
describe('LinkedCohortPicker cohort id (#215)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  const openDialog = async (wrapper: ReturnType<typeof mountPicker>) => {
    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()
  }

  const tableText = () =>
    Array.from(
      document.querySelectorAll('[data-testid="linked-cohort-picker-table"] tbody tr')
    ).map(row => row.textContent ?? '')

  it('offers no select-all checkbox, only per-row selection (#215)', async () => {
    const wrapper = mountPicker([])
    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()

    const table = document.querySelector('[data-testid="linked-cohort-picker-table"]')!
    expect(table.querySelectorAll('thead input[type="checkbox"]')).toHaveLength(0)
    expect(table.querySelectorAll('tbody input[type="checkbox"]')).toHaveLength(3)
    wrapper.unmount()
  })

  it('still adds several cohorts in one go (#215)', async () => {
    const wrapper = mountPicker([])
    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()

    const rowBox = (i: number) =>
      document.querySelectorAll<HTMLInputElement>(
        '[data-testid="linked-cohort-picker-table"] tbody input[type="checkbox"]'
      )[i]!
    rowBox(0).click()
    await flushPromises()
    rowBox(2).click()
    await flushPromises()

    ;(document.querySelector('[data-testid="linked-cohort-picker-confirm"]') as HTMLElement).click()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toEqual([
      { id: 1, name: 'Diabetes' },
      { id: 3, name: 'Asthma' },
    ])
    wrapper.unmount()
  })

  it('shows an ID column in the selector, ahead of the name', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    const headers = Array.from(
      document.querySelectorAll('[data-testid="linked-cohort-picker-table"] thead th')
    ).map(th => th.textContent?.trim() ?? '')

    // Case-insensitive: the label comes from the shared columns.id key, which
    // renders "Id", and asserting the exact casing here would pin a translation
    // rather than the column being present. show-select puts a checkbox column
    // first, so the id is the first data column.
    const labels = headers.filter(Boolean).map(h => h.toLowerCase())
    expect(labels.slice(0, 2).join('|')).toContain('id')
    expect(labels.some(h => h.includes('name'))).toBe(true)
    wrapper.unmount()
  })

  it('shows each selectable cohort with its id', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    expect(tableText().some(text => text.includes('1') && text.includes('Diabetes'))).toBe(true)
    wrapper.unmount()
  })

  // The point of the issue: finding a cohort by the identifier people quote.
  it('finds a cohort by typing its id', async () => {
    const wrapper = mountPicker([])
    await openDialog(wrapper)

    wrapper.vm.search = '3'
    await flushPromises()

    expect(tableText().some(text => text.includes('Asthma'))).toBe(true)
    expect(tableText().some(text => text.includes('Diabetes'))).toBe(false)
    wrapper.unmount()
  })

  it('keeps the id visible on a linked cohort, not just while choosing it', () => {
    const wrapper = mountPicker([{ id: 2, name: 'Hypertension' }])

    expect(wrapper.get('[data-testid="linked-cohort-picker-id-2"]').text()).toContain('2')
    wrapper.unmount()
  })
})

/**
 * Showing the id made the table filter over it too, on a substring, so "3" also
 * listed 13 and 130 and any digit typed while searching by name dragged in rows
 * whose name explained nothing. Ids now match exactly or by prefix, and only
 * when the whole query is digits.
 */
describe('LinkedCohortPicker search by id and by name', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
  })

  // Digit-carrying names, so a name query and an id query really do compete.
  const digitCohorts: CohortDefinitionSummary[] = [
    { id: 3, name: 'Asthma' },
    { id: 13, name: 'COPD' },
    { id: 130, name: 'Heart failure' },
    { id: 7, name: 'Type 2 diabetes' },
    { id: 42, name: 'Chronic kidney disease' },
  ]

  const openAndSearch = async (term: string) => {
    const wrapper = mountPicker([], digitCohorts)
    await wrapper.get('[data-testid="linked-cohort-picker-add"]').trigger('click')
    await flushPromises()
    wrapper.vm.search = term
    await flushPromises()
    return wrapper
  }

  const visibleNames = () =>
    Array.from(
      document.querySelectorAll('[data-testid="linked-cohort-picker-table"] tbody tr')
    ).map(row => row.textContent ?? '')

  it('finds a cohort by its exact id', async () => {
    const wrapper = await openAndSearch('42')

    const names = visibleNames()
    expect(names.some(text => text.includes('Chronic kidney disease'))).toBe(true)
    expect(names).toHaveLength(1)
    wrapper.unmount()
  })

  it('does not return 13 and 130 when the query is 3', async () => {
    const wrapper = await openAndSearch('3')

    const names = visibleNames()
    expect(names.some(text => text.includes('Asthma'))).toBe(true)
    expect(names.some(text => text.includes('COPD'))).toBe(false)
    expect(names.some(text => text.includes('Heart failure'))).toBe(false)
    wrapper.unmount()
  })

  it('still matches ids by prefix, so 13 reaches 13 and 130', async () => {
    const wrapper = await openAndSearch('13')

    const names = visibleNames()
    expect(names.some(text => text.includes('COPD'))).toBe(true)
    expect(names.some(text => text.includes('Heart failure'))).toBe(true)
    expect(names.some(text => text.includes('Asthma'))).toBe(false)
    wrapper.unmount()
  })

  it('does not pull in id-only matches for a digit typed in a name query', async () => {
    const wrapper = await openAndSearch('2')

    const names = visibleNames()
    // The 2 in "Type 2 diabetes" is on screen; cohort 42 has no visible 2.
    expect(names.some(text => text.includes('Type 2 diabetes'))).toBe(true)
    expect(names.some(text => text.includes('Chronic kidney disease'))).toBe(false)
    wrapper.unmount()
  })

  it('ignores ids entirely once the query carries more than digits', async () => {
    const wrapper = await openAndSearch('type 2')

    const names = visibleNames()
    expect(names.some(text => text.includes('Type 2 diabetes'))).toBe(true)
    expect(names).toHaveLength(1)
    wrapper.unmount()
  })

  it('lists everything again when the search is cleared', async () => {
    const wrapper = await openAndSearch('3')
    wrapper.vm.search = ''
    await flushPromises()

    expect(visibleNames()).toHaveLength(digitCohorts.length)
    wrapper.unmount()
  })
})
