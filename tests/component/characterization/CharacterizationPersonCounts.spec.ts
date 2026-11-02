import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CharacterizationPersonCounts from '@/components/characterization/CharacterizationPersonCounts.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })
const cohorts = [{ id: 1, name: 'Target' }, { id: 2, name: 'Comparator' }]

function mountCounts(props: Record<string, unknown>) {
  return mount(CharacterizationPersonCounts, { props, global: { plugins: [vuetify] } })
}

describe('CharacterizationPersonCounts', () => {
  it('lists the overall and per-stratum N for each cohort', () => {
    const wrapper = mountCounts({
      cohorts,
      strataCounts: { '1': { '0': 1200, '7': 26, '3': 400 }, '2': { '0': 126 } },
      strataNames: { '7': 'Age 65+', '3': 'Female' },
    })

    expect(wrapper.text()).toContain('Persons analyzed')
    expect(wrapper.findAll('thead th').map(th => th.text())).toEqual(['Cohort', 'Overall', 'Female', 'Age 65+'])
    const cells = (id: number) => wrapper.find(`[data-testid="char-person-counts-row-${id}"]`)
      .findAll('td').map(td => td.text())
    expect(cells(1)).toEqual(['Target', '1,200', '400', '26'])
    expect(cells(2)).toEqual(['Comparator', '126', '—', '—'])
  })

  it('falls back to the stratum id and keeps cohorts missing from the design', () => {
    const wrapper = mountCounts({ cohorts: [], strataCounts: { '9': { '0': 5, '4': 2 } } })

    expect(wrapper.findAll('thead th').map(th => th.text())).toEqual(['Cohort', 'Overall', '4'])
    expect(wrapper.find('[data-testid="char-person-counts-row-9"]').findAll('td').map(td => td.text()))
      .toEqual(['9', '5', '2'])
  })

  it('renders nothing when no counts were reported', () => {
    const wrapper = mountCounts({ cohorts, strataCounts: {} })
    expect(wrapper.find('[data-testid="char-person-counts"]').exists()).toBe(false)
  })
})
