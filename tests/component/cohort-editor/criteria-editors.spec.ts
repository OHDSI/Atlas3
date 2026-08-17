import { describe, it, expect } from 'vitest'
import { mount, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import AtlasButton from '@/components/ui/AtlasButton.vue'
import AtlasChip from '@/components/ui/AtlasChip.vue'
import CohortExpressionEditor from '@/components/cohort-editor/CohortExpressionEditor.vue'
import EndStrategyPanel from '@/components/cohort-editor/end-strategy/EndStrategyPanel.vue'
import EndStrategySelector from '@/components/cohort-editor/end-strategy/EndStrategySelector.vue'
import CustomEraEndStrategy from '@/components/cohort-editor/end-strategy/CustomEraEndStrategy.vue'
import DateOffsetEndStrategy from '@/components/cohort-editor/end-strategy/DateOffsetEndStrategy.vue'
import ObservationEndStrategy from '@/components/cohort-editor/end-strategy/ObservationEndStrategy.vue'
import CensoringCriteriaEditor from '@/components/cohort-editor/end-strategy/CensoringCriteriaEditor.vue'
import InclusionRulesPanel from '@/components/cohort-editor/inclusion-rules/InclusionRulesPanel.vue'
import CensorWindowEditor from '@/components/cohort-editor/CensorWindowEditor.vue'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import ConditionEra from '@/components/circe/criteria/ConditionEra.vue'
import ConditionOccurrence from '@/components/circe/criteria/ConditionOccurrence.vue'
import Death from '@/components/circe/criteria/Death.vue'
import DeviceExposure from '@/components/circe/criteria/DeviceExposure.vue'
import DoseEra from '@/components/circe/criteria/DoseEra.vue'
import DrugEra from '@/components/circe/criteria/DrugEra.vue'
import DrugExposure from '@/components/circe/criteria/DrugExposure.vue'
import Measurement from '@/components/circe/criteria/Measurement.vue'
import Observation from '@/components/circe/criteria/Observation.vue'
import ObservationPeriod from '@/components/circe/criteria/ObservationPeriod.vue'
import PayerPlanPeriod from '@/components/circe/criteria/PayerPlanPeriod.vue'
import ProcedureOccurrence from '@/components/circe/criteria/ProcedureOccurrence.vue'
import Specimen from '@/components/circe/criteria/Specimen.vue'
import VisitDetail from '@/components/circe/criteria/VisitDetail.vue'
import VisitOccurrence from '@/components/circe/criteria/VisitOccurrence.vue'

const vuetify = createVuetify({ components, directives })

const EagerMenu = {
  name: 'AtlasMenu',
  props: { modelValue: { type: Boolean, default: false } },
  template: '<div class="menu-stub"><slot name="activator" :props="{}" /><slot /></div>',
}

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

describe('CohortExpressionEditor', () => {
  function mountExpressionEditor(expression: Record<string, unknown> = {}) {
    return mount(CohortExpressionEditor, {
      global: { plugins: [vuetify, createPinia()], stubs: { AtlasMenu: EagerMenu } },
      props: { expression, conceptSets: [] },
    })
  }

  it('renders the normalized labels and observation summary', () => {
    const wrapper = mountExpressionEditor()

    expect(wrapper.text()).toContain('Cohort Entry Events')
    expect(wrapper.text()).toContain('Cohort Entry On')
    expect(wrapper.text()).toContain('Cohort Eras')
    expect(wrapper.text()).toContain('Empty')
    expect(wrapper.get('[data-testid="entry-any-label"]').attributes('title')).toContain('ANY (or)')
    expect(wrapper.text()).toContain('0d / 0d')
  })

  it('adds and removes criteria while updating the observation window and additional criteria', async () => {
    const wrapper = mountExpressionEditor()
    const buttons = wrapper.findAllComponents(AtlasButton)
    const addCriteriaButton = buttons.find(button => button.text().includes('Add Criteria to Group'))
    const restrictEventsButton = buttons.find(button => button.text().includes('Restrict Initial Events'))

    await addCriteriaButton?.trigger('click')
    await wrapper.findComponent({ name: 'AtlasListItem' }).vm.$emit('click')
    expect(wrapper.findComponent({ name: 'CriteriaRenderer' }).exists()).toBe(true)

    const fields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    await fields[0]?.vm.$emit('update:modelValue', '4')
    await fields[1]?.vm.$emit('update:modelValue', '6')
    expect(wrapper.text()).toContain('4d / 6d')

    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('remove')
    expect(wrapper.findComponent({ name: 'CriteriaRenderer' }).exists()).toBe(false)

    await restrictEventsButton?.trigger('click')
    expect(wrapper.findComponent(CriteriaGroup).exists()).toBe(true)
    await wrapper.findComponent(CriteriaGroup).vm.$emit('remove')
    expect(wrapper.findComponent(CriteriaGroup).exists()).toBe(false)
  })

  it('renders populated state and switches the primary and qualified limit toggles', async () => {
    const wrapper = mountExpressionEditor({
      PrimaryCriteria: {
        CriteriaList: [{ Observation: {} }],
        ObservationWindow: { PriorDays: 2, PostDays: 4 },
        PrimaryCriteriaLimit: { Type: 'First' },
      },
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'Last' },
      AdditionalCriteria: {
        Type: 'ALL',
        CriteriaList: [],
        Groups: [],
      },
      InclusionRules: [
        {
          name: 'Rule A',
          expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
        },
      ],
    })

    expect(wrapper.text()).toContain('1 event')
    expect(wrapper.text()).toContain('1 rule')
    expect(wrapper.find('[data-step="2"] .section-state-chip').classes()).toContain('section-state-chip--primary')

    const topStepToggles = wrapper.get('[data-step="1"]').findAllComponents({ name: 'VBtnToggle' })
    await topStepToggles[0]!.vm.$emit('update:modelValue', 'All')
    await topStepToggles[1]!.vm.$emit('update:modelValue', 'Last')

    expect((wrapper.vm as any).expression.PrimaryCriteria.PrimaryCriteriaLimit.Type).toBe('All')
    expect((wrapper.vm as any).expression.QualifiedLimit.Type).toBe('Last')

    await wrapper.findComponent(InclusionRulesPanel).vm.$emit('select-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(InclusionRulesPanel).vm.$emit('edit-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(InclusionRulesPanel).vm.$emit('clear-concept-set')

    expect(wrapper.emitted('select-concept-set')?.at(-1)?.[0]).toEqual({ id: 2, type: 'ConceptSet' })
    expect(wrapper.emitted('edit-concept-set')?.at(-1)?.[0]).toEqual({ id: 2, type: 'ConceptSet' })
    expect(wrapper.emitted('clear-concept-set')?.at(-1)).toEqual([])
  })

  it('forwards child editor updates and concept-set relays into the expression', async () => {
    const wrapper = mountExpressionEditor({
      PrimaryCriteria: {
        CriteriaList: [{ Observation: {} }],
        ObservationWindow: { PriorDays: 1, PostDays: 2 },
        PrimaryCriteriaLimit: { Type: 'First' },
      },
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'Last' },
      AdditionalCriteria: {
        Type: 'ALL',
        CriteriaList: [],
        Groups: [],
      },
      InclusionRules: [
        {
          name: 'Rule A',
          expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
        },
      ],
      EndStrategy: {
        DateOffset: { DateField: 'StartDate', Offset: 0 },
      },
      CensorWindow: null,
      CollapseSettings: null,
    })

    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('select-concept-set', { id: 1, type: 'ConceptSet' })
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('edit-concept-set', { id: 1, type: 'ConceptSet' })
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('clear-concept-set')

    await wrapper.findComponent(CriteriaGroup).vm.$emit('select-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(CriteriaGroup).vm.$emit('edit-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(CriteriaGroup).vm.$emit('clear-concept-set')

    await wrapper.findComponent(InclusionRulesPanel).vm.$emit('update:modelValue', [
      {
        name: 'Rule B',
        expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
      },
    ])

    await wrapper.findComponent(EndStrategyPanel).vm.$emit('select-concept-set', { id: 3, type: 'ConceptSet' })
    await wrapper.findComponent(EndStrategyPanel).vm.$emit('edit-concept-set', { id: 3, type: 'ConceptSet' })
    await wrapper.findComponent(EndStrategyPanel).vm.$emit('clear-concept-set')

    await wrapper.findComponent(CensorWindowEditor).vm.$emit('update:censorWindow', {
      StartDate: '2020-01-01',
      EndDate: '2020-01-02',
    })
    await wrapper.findComponent(CensorWindowEditor).vm.$emit('update:collapseSettings', {
      CollapseType: 'ERA',
      EraPad: 12,
    })

    expect(wrapper.emitted('select-concept-set')?.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.emitted('edit-concept-set')?.length).toBeGreaterThanOrEqual(3)
    expect(wrapper.emitted('clear-concept-set')?.length).toBeGreaterThanOrEqual(3)
    expect((wrapper.vm as any).expression.InclusionRules).toHaveLength(1)
    expect((wrapper.vm as any).expression.CensorWindow).toEqual({
      StartDate: '2020-01-01',
      EndDate: '2020-01-02',
    })
    expect((wrapper.vm as any).expression.CollapseSettings).toEqual({
      CollapseType: 'ERA',
      EraPad: 12,
    })
  })
})

describe('End strategy components', () => {
  it('switches end strategies and forwards concept-set actions', async () => {
    const wrapper = mount(EndStrategySelector, {
      global: { plugins: [vuetify] },
      props: {
        endStrategy: null,
        conceptSets: [],
      },
    })

    expect(wrapper.findComponent(ObservationEndStrategy).exists()).toBe(true)

    await wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', 'dateOffset')
    expect(wrapper.emitted('update:endStrategy')?.at(-1)?.[0]).toEqual({
      DateOffset: { DateField: 'StartDate', Offset: 0 },
    })

    await wrapper.setProps({
      endStrategy: { DateOffset: { DateField: 'EndDate', Offset: 14 } },
    })
    expect(wrapper.findComponent(DateOffsetEndStrategy).exists()).toBe(true)

    await wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', 'customEra')
    expect(wrapper.emitted('update:endStrategy')?.at(-1)?.[0]).toEqual({
      CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 },
    })

    await wrapper.setProps({
      endStrategy: { CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 } },
    })
    expect(wrapper.findComponent(CustomEraEndStrategy).exists()).toBe(true)
  })

  it('edits the custom-era fields and clears the selected concept set', async () => {
    const strategy = {
      GapDays: 7,
      Offset: 3,
      DaysSupplyOverride: 0,
      DrugCodesetId: 11,
    }

    const wrapper = mount(CustomEraEndStrategy, {
      global: { plugins: [vuetify] },
      props: {
        strategy,
        conceptSets: [{ id: 11, name: 'Drug Set' }],
      },
    })

    expect(wrapper.text()).toContain('Drug Set')
    const fields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(fields).toHaveLength(3)

    await fields[0]!.vm.$emit('update:modelValue', '12')
    await fields[1]!.vm.$emit('update:modelValue', '4')
    await fields[2]!.vm.$emit('update:modelValue', '5')
    await wrapper.findComponent(AtlasChip).vm.$emit('click:close')

    expect(strategy.GapDays).toBe(12)
    expect(strategy.Offset).toBe(4)
    expect(strategy.DaysSupplyOverride).toBe(5)
    expect(strategy.DrugCodesetId).toBeUndefined()
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
  })

  it('edits the fixed-duration offset fields', async () => {
    const strategy = { DateField: 'StartDate' as const, Offset: 1 }

    const wrapper = mount(DateOffsetEndStrategy, {
      global: { plugins: [vuetify] },
      props: { strategy },
    })

    await wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', 'EndDate')
    await wrapper.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', '9')

    expect(strategy.DateField).toBe('EndDate')
    expect(strategy.Offset).toBe(9)
  })

  it('renders the observation end strategy as informational only', () => {
    const wrapper = mount(ObservationEndStrategy, {
      global: { plugins: [vuetify] },
    })

    expect(wrapper.text()).toContain('continuous observation period ends')
  })

  it('forwards end-strategy panel concept-set events', async () => {
    const expression = {
      EndStrategy: { CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 } },
      CensoringCriteria: [],
    }

    const wrapper = mount(EndStrategyPanel, {
      global: { plugins: [vuetify] },
      props: { expression: expression as never, conceptSets: [] },
    })

    await wrapper.findComponent(CustomEraEndStrategy).vm.$emit('select-concept-set', undefined)
    await wrapper.findComponent(CustomEraEndStrategy).vm.$emit('edit-concept-set', undefined)
    await wrapper.findComponent(CustomEraEndStrategy).vm.$emit('clear-concept-set')

    expect(wrapper.emitted('select-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('edit-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
  })

  it('writes end-strategy and censoring-criteria updates back through the panel', async () => {
    const expression = {
      EndStrategy: undefined,
      CensoringCriteria: [],
    }

    const wrapper = mount(EndStrategyPanel, {
      global: { plugins: [vuetify] },
      props: { expression: expression as never, conceptSets: [] },
    })

    await wrapper.findComponent(EndStrategySelector).vm.$emit('update:endStrategy', {
      DateOffset: { DateField: 'EndDate', Offset: 14 },
    })
    await wrapper.findComponent(CensoringCriteriaEditor).vm.$emit('update:modelValue', [
      { Observation: {} },
    ])

    expect(expression.EndStrategy).toEqual({ DateOffset: { DateField: 'EndDate', Offset: 14 } })
    expect(expression.CensoringCriteria).toEqual([{ Observation: {} }])
  })

  it('applies end-strategy panel updates back to the expression object', async () => {
    const expression = {
      EndStrategy: undefined,
      CensoringCriteria: [],
    }

    const wrapper = mount(EndStrategyPanel, {
      global: { plugins: [vuetify] },
      props: { expression: expression as never, conceptSets: [] },
    })

    await wrapper.findComponent({ name: 'EndStrategySelector' }).vm.$emit('update:end-strategy', {
      DateOffset: { DateField: 'EndDate', Offset: 14 },
    })
    await wrapper.findComponent({ name: 'CensoringCriteriaEditor' }).vm.$emit('update:modelValue', [
      { Observation: {} },
    ])

    expect(expression.EndStrategy).toEqual({ DateOffset: { DateField: 'EndDate', Offset: 14 } })
    expect(expression.CensoringCriteria).toEqual([{ Observation: {} }])
  })

  it('forwards exact child event names back through the panel', async () => {
    const expression = {
      EndStrategy: undefined,
      CensoringCriteria: [],
    }

    const wrapper = mount(EndStrategyPanel, {
      global: { plugins: [vuetify] },
      props: { expression: expression as never, conceptSets: [] },
    })

    await wrapper.findComponent(EndStrategySelector).vm.$emit('select-concept-set', { id: 1, type: 'ConceptSet' })
    await wrapper.findComponent(EndStrategySelector).vm.$emit('edit-concept-set', { id: 1, type: 'ConceptSet' })
    await wrapper.findComponent(EndStrategySelector).vm.$emit('clear-concept-set')
    await wrapper.findComponent(EndStrategySelector).vm.$emit('update:end-strategy', {
      CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 },
    })

    await wrapper.findComponent(CensoringCriteriaEditor).vm.$emit('select-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(CensoringCriteriaEditor).vm.$emit('edit-concept-set', { id: 2, type: 'ConceptSet' })
    await wrapper.findComponent(CensoringCriteriaEditor).vm.$emit('clear-concept-set')
    await wrapper.findComponent(CensoringCriteriaEditor).vm.$emit('update:model-value', [{ Observation: {} }])

    expect(wrapper.emitted('select-concept-set')).toEqual([
      [{ id: 1, type: 'ConceptSet' }],
      [{ id: 2, type: 'ConceptSet' }],
    ])
    expect(wrapper.emitted('edit-concept-set')).toEqual([
      [{ id: 1, type: 'ConceptSet' }],
      [{ id: 2, type: 'ConceptSet' }],
    ])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[], []])
    expect(expression.EndStrategy).toEqual({
      CustomEra: { GapDays: 30, Offset: 0, DaysSupplyOverride: 0 },
    })
    expect(expression.CensoringCriteria).toEqual([{ Observation: {} }])
  })
})

describe('InclusionRulesPanel', () => {
  it('adds, removes, reorders, and relabels inclusion rules', async () => {
    const expressionLimit = { Type: 'First' as const }
    const modelValue = [
      { name: 'Rule A', description: undefined, expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } },
      { name: 'Rule B', description: undefined, expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] } },
    ]

    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: { modelValue, conceptSets: [], expressionLimit },
    })

    await wrapper.findComponent({ name: 'InclusionRuleRail' }).vm.$emit('select', 1)
    await wrapper.findComponent({ name: 'InclusionRuleRail' }).vm.$emit('reorder', {
      fromIndex: 1,
      toIndex: 0,
    })
    await wrapper.findComponent({ name: 'InclusionRuleDetail' }).vm.$emit('remove')
    await wrapper.findAllComponents(AtlasButton)[0]!.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toHaveLength(3)
    expect(expressionLimit.Type).toBe('First')
  })

  it('shows the empty state and adds the first rule', async () => {
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: [] as never[],
        conceptSets: [],
        expressionLimit: { Type: 'First' as const },
      },
    })

    expect(wrapper.text()).toContain('No inclusion rules')
    await wrapper.get('[data-testid="inclusion-empty-add"]').trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toHaveLength(1)
  })
})

describe('CensorWindowEditor', () => {
  it('updates collapse settings and reveals trim options when requested', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        collapseSettings: { CollapseType: 'ERA', EraPad: 30 },
      },
    })

    await wrapper.findComponent({ name: 'AtlasTextField' }).vm.$emit('update:modelValue', '45')
    await wrapper.findComponent({ name: 'AtlasTextField' }).vm.$emit('blur')
    await wrapper.find('.trim-toggle').trigger('click')

    expect(wrapper.emitted('update:collapseSettings')?.at(-1)?.[0]).toEqual({
      CollapseType: 'ERA',
      EraPad: 45,
    })
    expect(wrapper.text()).toContain('Left censor cohort start dates to')
    expect(wrapper.text()).toContain('Right censor cohort end dates to')
  })

  it('reacts when censor and collapse props change after mount', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        censorWindow: null,
        collapseSettings: null,
      },
    })

    await wrapper.setProps({
      collapseSettings: { CollapseType: 'ERA', EraPad: 8 },
    })
    expect(wrapper.findComponent({ name: 'AtlasTextField' }).props('modelValue')).toBe(8)

    await wrapper.setProps({
      censorWindow: { StartDate: '2020-02-01', EndDate: '2020-02-02' },
    })

    expect(wrapper.findAllComponents({ name: 'AtlasTextField' })).toHaveLength(3)
    expect(wrapper.text()).toContain('Left censor cohort start dates to')
    expect(wrapper.text()).toContain('Right censor cohort end dates to')
    const fields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    expect(fields[1]!.props('modelValue')).toBe('2020-02-01')
    expect(fields[2]!.props('modelValue')).toBe('2020-02-02')
  })

  it('emits censor-window warnings and clears both dates', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        censorWindow: { StartDate: '2020-02-01', EndDate: '2020-01-01' },
        collapseSettings: { CollapseType: 'ERA', EraPad: 30 },
      },
    })

    expect(wrapper.text()).toContain('Start date must be on or before end date')
    const dateFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    await dateFields[1]!.vm.$emit('update:modelValue', '2020-01-02')
    await dateFields[2]!.vm.$emit('update:modelValue', '2020-01-03')
    await dateFields[1]!.vm.$emit('click:clear')
    await dateFields[2]!.vm.$emit('click:clear')

    expect(wrapper.emitted('validation-error')?.at(-1)?.[0]).toEqual([])
    expect(wrapper.emitted('update:censorWindow')?.at(-1)?.[0]).toBeUndefined()
  })

  it('starts with trim options visible from the prop and clears one date at a time', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: {
        censorWindow: { StartDate: '2020-03-01', EndDate: '2020-03-10' },
        collapseSettings: { CollapseType: 'ERA', EraPad: 15 },
      },
    })

    expect(wrapper.text()).toContain('Left censor cohort start dates to')
    expect(wrapper.text()).toContain('Right censor cohort end dates to')

    const dateFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    await dateFields[1]!.vm.$emit('click:clear')
    expect(wrapper.emitted('update:censorWindow')?.at(-1)?.[0]).toEqual({
      StartDate: undefined,
      EndDate: '2020-03-10',
    })

    await dateFields[2]!.vm.$emit('click:clear')
    expect(wrapper.emitted('update:censorWindow')?.at(-1)?.[0]).toBeUndefined()
  })

  it('emits no warning when the censor dates are in order', async () => {
    const wrapper = mount(CensorWindowEditor, {
      global: { plugins: [vuetify] },
      props: { censorWindow: null, collapseSettings: null },
    })

    await wrapper.find('.trim-toggle').trigger('click')
    const dateFields = wrapper.findAllComponents({ name: 'AtlasTextField' })
    await dateFields[1]!.vm.$emit('update:modelValue', '2020-01-01')
    await dateFields[2]!.vm.$emit('update:modelValue', '2020-01-02')

    expect(wrapper.text()).not.toContain('Start date must be on or before end date')
    expect(wrapper.emitted('validation-error')?.at(-1)?.[0]).toEqual([])
    expect(wrapper.emitted('update:censorWindow')?.at(-1)?.[0]).toEqual({
      StartDate: '2020-01-01',
      EndDate: '2020-01-02',
    })
  })
})

describe('CensoringCriteriaEditor', () => {
  it('adds and removes censoring criteria and relays concept-set actions', async () => {
    const wrapper = mount(CensoringCriteriaEditor, {
      global: { plugins: [vuetify], stubs: { AtlasMenu: EagerMenu } },
      props: {
        modelValue: [],
        conceptSets: [],
      },
    })

    expect(wrapper.text()).toContain('No censoring events defined')

    await wrapper.findComponent({ name: 'AtlasListItem' }).vm.$emit('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toHaveLength(1)

    await wrapper.setProps({ modelValue: [{ Observation: {} } as never] })
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('select-concept-set', undefined)
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('edit-concept-set', undefined)
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('clear-concept-set')
    await wrapper.findComponent({ name: 'CriteriaRenderer' }).vm.$emit('remove')

    expect(wrapper.emitted('select-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('edit-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toHaveLength(0)
  })
})
