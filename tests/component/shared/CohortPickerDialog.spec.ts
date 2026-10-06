import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import CohortPickerDialog from '@/components/shared/CohortPickerDialog.vue'

vi.mock('@/services/cohort-definition.service', () => ({
  getCohorts: vi.fn(),
}))

const vuetify = createVuetify({ components, directives })
const cohortService = await import('@/services/cohort-definition.service')
const availableCohorts = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  name: `Cohort ${index + 1}`,
}))

function mountPicker() {
  return mount(CohortPickerDialog, {
    props: { modelValue: true },
    global: { plugins: [vuetify] },
    attachTo: document.body,
  })
}

describe('CohortPickerDialog', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    document.body.innerHTML = ''
    vi.mocked(cohortService.getCohorts).mockResolvedValue({ success: true, data: availableCohorts })
  })

  it('shows cohort IDs in a ten-row paginated table with fixed actions', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    const table = document.querySelector('[data-testid="cohort-picker-dialog-table"]')!
    const headers = Array.from(table.querySelectorAll('thead th')).map(header => header.textContent)
    expect(headers.join('|')).toMatch(/id.*name/i)
    expect(table.querySelectorAll('tbody tr')).toHaveLength(10)
    expect(document.querySelector('[data-testid="cohort-picker-dialog-cancel"]')).not.toBeNull()
    expect(document.querySelector('[data-testid="cohort-picker-dialog-confirm"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('renders the next cohort page without moving dialog actions', async () => {
    const wrapper = mountPicker()
    await flushPromises()

    ;(wrapper.vm as unknown as { page: number }).page = 2
    await flushPromises()

    const table = document.querySelector('[data-testid="cohort-picker-dialog-table"]')!
    expect(table.textContent).toContain('Cohort 11')
    expect(table.textContent).toContain('Cohort 12')
    expect(document.querySelector('[data-testid="cohort-picker-dialog-confirm"]')).not.toBeNull()
    wrapper.unmount()
  })

  it('emits all checked cohorts and excludes already-selected IDs', async () => {
    const wrapper = mount(CohortPickerDialog, {
      props: { modelValue: true, excludedIds: [1] },
      global: { plugins: [vuetify] },
      attachTo: document.body,
    })
    await flushPromises()

    const boxes = document.querySelectorAll<HTMLInputElement>(
      '[data-testid="cohort-picker-dialog-table"] tbody input[type="checkbox"]'
    )
    boxes[0]!.click()
    await flushPromises()
    ;(document.querySelector('[data-testid="cohort-picker-dialog-confirm"]') as HTMLElement).click()
    await flushPromises()

    expect(wrapper.emitted('select')?.[0]?.[0]).toEqual([{ id: 2, name: 'Cohort 2' }])
    wrapper.unmount()
  })
})