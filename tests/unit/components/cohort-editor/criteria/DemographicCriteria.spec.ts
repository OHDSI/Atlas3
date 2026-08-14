import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import DemographicCriteria from '@/components/circe/criteria/DemographicCriteria.vue'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

describe('DemographicCriteria', () => {
  it('renders only non-null demographic attributes', () => {
    const criteria = {
      Age: { Value: 18, Op: 'lt', Extent: null },
      Gender: null,
      GenderCS: null,
      Race: null,
      RaceCS: null,
      Ethnicity: null,
      EthnicityCS: null,
      OccurrenceStartDate: null,
      OccurrenceEndDate: null,
    }

    const wrapper = mount(DemographicCriteria, {
      props: {
        criteria,
        conceptSets: [],
      },
      global: {
        plugins: [vuetify],
        stubs: {
          AtlasButton: true,
          AtlasDivider: true,
          AtlasList: true,
          AtlasListItem: true,
          AtlasMenu: true,
          AtlasSpacer: true,
          AtlasIcon: true,
          AtlasTooltip: true,
          NumericRange: true,
          ConceptArray: true,
          DateRange: true,
          ConceptSetSelection: true,
          DateAdjustment: true,
          TextFilter: true,
          Period: true,
          CriteriaGroup: true,
        },
      },
    })

    expect(wrapper.findAll('.attribute-title').length).toBe(1)
    expect(wrapper.text()).toContain('Age')
    expect(wrapper.text()).not.toContain('Gender Concept Set')
    expect(wrapper.text()).not.toContain('Occurrence End Date')
  })
})