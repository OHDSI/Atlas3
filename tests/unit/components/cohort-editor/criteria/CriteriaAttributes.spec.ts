import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

import CriteriaAttributes from '@/components/cohort-editor/criteria/CriteriaAttributes.vue'
import type { CriteriaAttributeSpec } from '@/components/cohort-editor/criteria/criteria-editor.types'

const vuetify = createVuetify({ components, directives })

describe('CriteriaAttributes', () => {
  it('renders only rows whose spec reports active', () => {
    const attributes: CriteriaAttributeSpec[] = [
      {
        key: 'Age',
        label: 'Age',
        kind: 'numericRange',
        componentProps: () => ({
          modelValue: null,
        }),
        init: () => undefined,
        clear: () => undefined,
        isActive: () => false,
      },
      {
        key: 'Race',
        label: 'Race',
        kind: 'conceptArray',
        componentProps: () => ({
          modelValue: [],
        }),
        init: () => undefined,
        clear: () => undefined,
        isActive: () => true,
      },
    ]

    const wrapper = mount(CriteriaAttributes, {
      props: {
        attributes,
        conceptSets: [],
      },
      global: {
        plugins: [vuetify],
        stubs: {
          NumericRange: true,
          ConceptArray: true,
          DateRange: true,
          ConceptSetSelection: true,
          DateAdjustment: true,
          TextFilter: true,
          Period: true,
          CriteriaGroup: true,
          AtlasButton: true,
          AtlasIcon: true,
          AtlasTooltip: true,
        },
      },
    })

    expect(wrapper.text()).toContain('Race')
    expect(wrapper.text()).not.toContain('Age')
  })
})