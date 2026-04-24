import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import DrilldownDetails from '@/components/reports/DrilldownDetails.vue'
import type { DrilldownReport } from '@/models/report.types'

const vuetify = createVuetify({ components, directives })

function fullData(): DrilldownReport {
  return {
    conceptId: 1,
    conceptName: 'Test',
    conceptPath: 'Root||Test',
    ageAtFirstOccurrence: [{ category: 'M', min: 0, p10: 5, p25: 15, median: 35, p75: 55, p90: 70, max: 90 }],
    lengthOfEra: [{ category: 'M', min: 1, p10: 30, p25: 100, median: 365, p75: 730, p90: 1095, max: 3650 }],
    byType: [{ name: 'T1', value: 100 }],
    byUnit: [{ name: 'mg/dL', value: 50 }],
    byValueAsConcept: [{ name: 'Positive', value: 25 }],
    byOperator: [{ name: '>', value: 10 }],
    byQualifier: [{ name: 'qual', value: 5 }],
    byFrequency: { categories: ['1'], values: [100] }
  }
}

describe('DrilldownDetails', () => {
  it('renders all breakdown sections for measurement domain', () => {
    const wrapper = mount(DrilldownDetails, {
      global: { plugins: [vuetify] },
      props: { data: fullData(), conceptName: 'Test', conceptPath: 'Root||Test', domain: 'measurement' }
    })

    expect(wrapper.find('[data-testid=drilldown-byType]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=drilldown-byUnit]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=drilldown-byValueAsConcept]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=drilldown-byOperator]').exists()).toBe(true)
    expect(wrapper.find('[data-testid=drilldown-byFrequency]').exists()).toBe(true)
  })

  it('omits measurement-only breakdowns for observation domain', () => {
    const wrapper = mount(DrilldownDetails, {
      global: { plugins: [vuetify] },
      props: { data: fullData(), conceptName: 'T', conceptPath: 'R||T', domain: 'observation' }
    })

    expect(wrapper.find('[data-testid=drilldown-byUnit]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=drilldown-byOperator]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=drilldown-byQualifier]').exists()).toBe(true)
  })

  it('omits byFrequency for visit domain', () => {
    const wrapper = mount(DrilldownDetails, {
      global: { plugins: [vuetify] },
      props: { data: fullData(), conceptName: 'T', conceptPath: 'R||T', domain: 'visit' }
    })

    expect(wrapper.find('[data-testid=drilldown-byFrequency]').exists()).toBe(false)
    expect(wrapper.find('[data-testid=drilldown-byType]').exists()).toBe(false)
  })
})
