import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import DistributionTable from '@/components/characterization-results/DistributionTable.vue'
import { DEFAULT_STRATA_KEY } from '@/utils/characterization-result-mapper'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })
const cohorts = [{ id: 1, name: 'Target' }, { id: 2, name: 'Comparator' }]
const row = {
  analysisId: 1, analysisName: 'Measurement', covariateId: 1, covariateName: 'Weight', conceptId: 3025315,
  cohorts,
  strataNames: { [DEFAULT_STRATA_KEY]: 'All strata' },
  avg: { [DEFAULT_STRATA_KEY]: { '1': 70, '2': 75 } },
  stdDev: { [DEFAULT_STRATA_KEY]: { '1': 8, '2': 9 } },
  min: { [DEFAULT_STRATA_KEY]: { '1': 45, '2': 50 } },
  p10: {}, p25: { [DEFAULT_STRATA_KEY]: { '1': 65, '2': 70 } },
  median: { [DEFAULT_STRATA_KEY]: { '1': 70, '2': 75 } },
  p75: { [DEFAULT_STRATA_KEY]: { '1': 75, '2': 80 } },
  p90: {}, max: { [DEFAULT_STRATA_KEY]: { '1': 90, '2': 95 } },
}

describe('DistributionTable', () => {
  it('groups distribution statistics beneath every selected cohort without a picker', () => {
    const wrapper = mount(DistributionTable, {
      props: { analysisId: 1, analysisName: 'Measurement', rows: [row], cohorts },
      global: { plugins: [vuetify] },
    })

    expect(wrapper.find('[data-testid="char-results-distribution-cohort-1"]').exists()).toBe(false)
    const headerRows = wrapper.findAll('thead tr')
    expect(headerRows[0]?.findAll('th').map(header => header.text())).toEqual([
      'Covariate', 'Concept Id', 'Target', 'Comparator',
    ])
    expect(headerRows[1]?.findAll('th').map(header => header.text())).toEqual([
      'Avg (SD)', 'Min', 'P25', 'Median', 'P75', 'Max',
      'Avg (SD)', 'Min', 'P25', 'Median', 'P75', 'Max',
    ])
    expect(wrapper.text()).toContain('70.00 (8.00)')
    expect(wrapper.text()).not.toContain('Std Diff')
  })

  it('sorts rows by the clicked statistic for that cohort', async () => {
    const light = { ...row, covariateId: 2, covariateName: 'Light', median: { [DEFAULT_STRATA_KEY]: { '1': 50, '2': 99 } } }
    const heavy = { ...row, covariateId: 3, covariateName: 'Heavy', median: { [DEFAULT_STRATA_KEY]: { '1': 90, '2': 10 } } }
    const wrapper = mount(DistributionTable, {
      props: { analysisId: 1, analysisName: 'Measurement', rows: [light, heavy], cohorts },
      global: { plugins: [vuetify] },
    })
    const names = () => wrapper.findAll('tbody tr').map(tr => tr.find('td').text())
    const medianHeaders = wrapper.findAll('thead tr')[1]!.findAll('th').filter(th => th.text() === 'Median')

    await medianHeaders[0]!.find('button').trigger('click')
    expect(names()).toEqual(['Heavy', 'Light'])

    await medianHeaders[1]!.find('button').trigger('click')
    expect(names()).toEqual(['Light', 'Heavy'])
    expect(medianHeaders[0]!.attributes('aria-sort')).toBe('none')
  })
})