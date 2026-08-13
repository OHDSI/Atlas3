import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import AtlasChip from '@/components/ui/AtlasChip.vue'
import CohortExpressionEditor from '@/components/cohort-editor/CohortExpressionEditor.vue'
import CensoringCriteriaEditor from '@/components/cohort-editor/end-strategy/CensoringCriteriaEditor.vue'
import CriteriaGroup from '@/components/cohort-editor/criteria/CriteriaGroup.vue'
import ConditionEra from '@/components/cohort-editor/criteria/ConditionEra.vue'
import ConditionOccurrence from '@/components/cohort-editor/criteria/ConditionOccurrence.vue'
import Death from '@/components/cohort-editor/criteria/Death.vue'
import DeviceExposure from '@/components/cohort-editor/criteria/DeviceExposure.vue'
import DoseEra from '@/components/cohort-editor/criteria/DoseEra.vue'
import DrugEra from '@/components/cohort-editor/criteria/DrugEra.vue'
import DrugExposure from '@/components/cohort-editor/criteria/DrugExposure.vue'
import Measurement from '@/components/cohort-editor/criteria/Measurement.vue'
import Observation from '@/components/cohort-editor/criteria/Observation.vue'
import ObservationPeriod from '@/components/cohort-editor/criteria/ObservationPeriod.vue'
import PayerPlanPeriod from '@/components/cohort-editor/criteria/PayerPlanPeriod.vue'
import ProcedureOccurrence from '@/components/cohort-editor/criteria/ProcedureOccurrence.vue'
import Specimen from '@/components/cohort-editor/criteria/Specimen.vue'
import VisitDetail from '@/components/cohort-editor/criteria/VisitDetail.vue'
import VisitOccurrence from '@/components/cohort-editor/criteria/VisitOccurrence.vue'

const vuetify = createVuetify({ components, directives })

const VARIANTS = ['primary', 'secondary', 'tonal', 'danger', 'ghost', 'link']
const SIZES = ['xs', 'sm', 'md', 'lg']
const CHIP_SIZES = ['xs', 'sm', 'md']

function expectAtlasVocabulary(wrapper: VueWrapper) {
  for (const button of wrapper.findAllComponents(AtlasButton)) {
    const { variant, size } = button.props()
    if (variant !== undefined) expect(VARIANTS).toContain(variant)
    if (size !== undefined) expect(SIZES).toContain(size)
  }

  for (const chip of wrapper.findAllComponents(AtlasChip)) {
    const { size } = chip.props()
    if (size !== undefined) expect(CHIP_SIZES).toContain(size)
  }
}

const EDITORS = [
  ['ConditionEra', ConditionEra],
  ['ConditionOccurrence', ConditionOccurrence],
  ['Death', Death],
  ['DeviceExposure', DeviceExposure],
  ['DoseEra', DoseEra],
  ['DrugEra', DrugEra],
  ['DrugExposure', DrugExposure],
  ['Measurement', Measurement],
  ['Observation', Observation],
  ['ObservationPeriod', ObservationPeriod],
  ['PayerPlanPeriod', PayerPlanPeriod],
  ['ProcedureOccurrence', ProcedureOccurrence],
  ['Specimen', Specimen],
  ['VisitDetail', VisitDetail],
  ['VisitOccurrence', VisitOccurrence],
] as const

describe.each(EDITORS)('%s', (name, Component) => {
  function mountEditor() {
    return mount(Component, {
      global: { plugins: [vuetify, createPinia()] },
      props: { criteria: { [name]: {} }, conceptSets: [] },
    })
  }

  it('mounts without throwing', () => {
    expect(() => mountEditor()).not.toThrow()
  })

  it('passes only Atlas wrapper vocabulary to every AtlasButton it renders', () => {
    const wrapper = mountEditor()
    expect(wrapper.findAllComponents(AtlasButton).length).toBeGreaterThan(0)
    expectAtlasVocabulary(wrapper)
  })
})

const CONTAINERS = [
  [
    'CohortExpressionEditor',
    () => mount(CohortExpressionEditor, {
      global: { plugins: [vuetify, createPinia()] },
      props: { expression: {}, conceptSets: [] },
    }),
  ],
  [
    'CriteriaGroup',
    () => mount(CriteriaGroup, {
      global: { plugins: [vuetify, createPinia()] },
      props: { group: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] }, conceptSets: [] },
    }),
  ],
  [
    'CensoringCriteriaEditor',
    () => mount(CensoringCriteriaEditor, {
      global: { plugins: [vuetify, createPinia()] },
      props: { modelValue: [], conceptSets: [] },
    }),
  ],
] as const

describe.each(CONTAINERS)('%s', (_name, mountContainer) => {
  it('mounts without throwing', () => {
    expect(() => mountContainer()).not.toThrow()
  })

  it('passes only Atlas wrapper vocabulary to every AtlasButton and AtlasChip it renders', () => {
    const wrapper = mountContainer()
    expect(wrapper.findAllComponents(AtlasButton).length).toBeGreaterThan(0)
    expectAtlasVocabulary(wrapper)
  })
})
