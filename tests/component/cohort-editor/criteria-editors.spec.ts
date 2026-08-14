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

// Only values the editor actually sets are constrained: an unset prop means the
// wrapper supplies its own default, which is part of the vocabulary by
// construction. Collecting the off-vocabulary values and asserting the list is
// empty keeps the assertion unconditional and names every offender at once.
function offVocabulary(props: Array<Record<string, unknown>>, key: string, allowed: readonly string[]) {
  return props
    .map(p => p[key])
    .filter((value): value is string => value !== undefined)
    .filter(value => !allowed.includes(value))
}

function expectAtlasVocabulary(wrapper: VueWrapper) {
  const buttons = wrapper.findAllComponents(AtlasButton).map(b => b.props() as Record<string, unknown>)
  const chips = wrapper.findAllComponents(AtlasChip).map(c => c.props() as Record<string, unknown>)

  expect(offVocabulary(buttons, 'variant', VARIANTS)).toEqual([])
  expect(offVocabulary(buttons, 'size', SIZES)).toEqual([])
  expect(offVocabulary(chips, 'size', CHIP_SIZES)).toEqual([])
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
