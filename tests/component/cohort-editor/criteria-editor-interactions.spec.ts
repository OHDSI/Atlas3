import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import EndStrategySelector from '@/components/cohort-editor/end-strategy/EndStrategySelector.vue'
import InclusionRuleDetail from '@/components/cohort-editor/inclusion-rules/InclusionRuleDetail.vue'
import InclusionRuleRail from '@/components/cohort-editor/inclusion-rules/InclusionRuleRail.vue'
import InclusionRulesPanel from '@/components/cohort-editor/inclusion-rules/InclusionRulesPanel.vue'
import CensoringCriteriaEditor from '@/components/cohort-editor/end-strategy/CensoringCriteriaEditor.vue'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
import { InlineAtlasMenuStub } from '../../helpers/component-wrapper'
import type { Criteria, InclusionRule } from '@/models/circe-types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18nKeyOnly } = await import('../../helpers/i18n-mock')
  return mockUseI18nKeyOnly
})

const vuetify = createVuetify({ components, directives })

function makeInclusionRule(name = 'Rule', criteriaCount = 1): InclusionRule {
  return {
    name,
    description: `${name} description`,
    expression: {
      Type: 'ALL',
      CriteriaList: Array.from({ length: criteriaCount }, () => ({})),
      DemographicCriteriaList: [],
      Groups: [],
    },
  }
}

function makeDataTransfer() {
  return {
    effectAllowed: '',
    dropEffect: '',
    setData: vi.fn(),
    getData: vi.fn(),
  } as any
}

describe('cohort-editor interactions', () => {
  it('renders the empty inclusion-rule detail state', async () => {
    const wrapper = mount(InclusionRuleDetail, {
      global: { plugins: [vuetify] },
      props: {
        rule: null,
        conceptSets: [],
      },
    })

    expect(wrapper.find('[data-testid="inclusion-detail-empty"]').exists()).toBe(true)
    expect(wrapper.text()).toContain('selectRule')
  })

  it('covers the inclusion-rule detail placeholder and helper guards', async () => {
    const rule = {
      name: '',
      description: '',
      expression: {
        Type: 'ALL',
        CriteriaList: [],
        DemographicCriteriaList: [],
        Groups: [],
      },
    } as InclusionRule

    const wrapper = mount(InclusionRuleDetail, {
      global: { plugins: [vuetify] },
      props: {
        rule,
        conceptSets: [],
      },
    })

    expect(wrapper.text()).toContain('i18n:inclusionRail.unnamedRule')
    expect(wrapper.text()).toContain('i18n:cohortDefinitions.noRuleDescription')
    expect(wrapper.find('.rule-detail__description').classes()).toContain(
      'rule-detail__description--placeholder'
    )

    await wrapper.setProps({ rule: null })
  })

  it('edits the inclusion rule header and removes the rule', async () => {
    const rule = makeInclusionRule('  Rule A  ')
    rule.description = '  Rule A description  '

    const wrapper = mount(InclusionRuleDetail, {
      global: { plugins: [vuetify], stubs: { AtlasMenu: InlineAtlasMenuStub } },
      props: {
        rule,
        conceptSets: [],
      },
    })

    const fields = wrapper.findAllComponents({ name: 'AtlasTextField' })

    await fields[0]!.vm.$emit('update:modelValue', '  Updated Rule  ')
    await fields[1]!.vm.$emit('update:modelValue', '   ')

    expect(rule.name).toBe('Updated Rule')
    expect(rule.description).toBeUndefined()

    await wrapper.get('button[title="i18n:common.delete"]').trigger('click')
    expect(wrapper.emitted('remove')).toEqual([[]])
  })

  it('changes end strategy and relays concept-set actions', async () => {
    const wrapper = mount(EndStrategySelector, {
      global: { plugins: [vuetify] },
      props: {
        endStrategy: null,
        conceptSets: [],
      },
    })

    await wrapper.findComponent({ name: 'VBtnToggle' }).vm.$emit('update:modelValue', 'dateOffset')
    expect(wrapper.emitted('update:endStrategy')?.[0]?.[0]).toEqual({
      DateOffset: { DateField: 'StartDate', Offset: 0 },
    })

    await wrapper.setProps({
      endStrategy: {
        CustomEra: {
          GapDays: 30,
          Offset: 0,
          DaysSupplyOverride: 0,
        },
      },
    })

    const customEra = wrapper.findComponent({ name: 'CustomEraEndStrategy' })
    await customEra.vm.$emit('select-concept-set', undefined)
    await customEra.vm.$emit('edit-concept-set', undefined)
    await customEra.vm.$emit('clear-concept-set')

    expect(wrapper.emitted('select-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('edit-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
  })

  it('adds and removes inclusion rule criteria and forwards concept-set events', async () => {
    const rule = {
      name: 'Rule A',
      description: 'Description',
    } as InclusionRule

    const wrapper = mount(InclusionRuleDetail, {
      global: { plugins: [vuetify] },
      props: {
        rule,
        conceptSets: [],
      },
    })

    const addButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('addCriteriaGroup'))
    expect(addButton).toBeTruthy()
    await addButton!.trigger('click')

    expect(rule.expression).toEqual({
      Type: 'ALL',
      CriteriaList: [],
      DemographicCriteriaList: [],
      Groups: [],
    })

    const criteriaGroup = wrapper.findComponent({ name: 'CriteriaGroup' })
    await criteriaGroup.vm.$emit('select-concept-set', undefined)
    await criteriaGroup.vm.$emit('edit-concept-set', undefined)
    await criteriaGroup.vm.$emit('clear-concept-set')
    await criteriaGroup.vm.$emit('remove')

    expect(rule.expression).toBeUndefined()
    expect(wrapper.emitted('select-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('edit-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
    expect(rule.expression).toBeUndefined()
  })

  it('supports reordering inclusion rules and relaying concept-set actions', async () => {
    const rules = [makeInclusionRule('Rule A', 1), makeInclusionRule('Rule B', 3)]
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: rules,
        conceptSets: [],
        expressionLimit: { Type: 'All' },
      },
    })

    const rail = wrapper.findComponent(InclusionRuleRail)
    await rail.vm.$emit('select', 1)
    await rail.vm.$emit('reorder', { fromIndex: 0, toIndex: 1 })

    const detail = wrapper.findComponent(InclusionRuleDetail)
    await detail.vm.$emit('select-concept-set', undefined)
    await detail.vm.$emit('edit-concept-set', undefined)
    await detail.vm.$emit('clear-concept-set')

    expect(wrapper.emitted('select-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('edit-concept-set')).toEqual([[undefined]])
    expect(wrapper.emitted('clear-concept-set')).toEqual([[]])
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      rules[1],
      rules[0],
    ])
  })

  it('adds a new inclusion rule from the empty state', async () => {
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: [],
        conceptSets: [],
        expressionLimit: { Type: 'All' },
      },
    })

    await wrapper.find('[data-testid="inclusion-empty-add"]').trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([
      {
        name: undefined,
        description: undefined,
        expression: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
      },
    ])
  })

  it('switches the included-events limit buttons', async () => {
    const expressionLimit = { Type: 'All' as const }
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: [makeInclusionRule('Rule A', 1)],
        conceptSets: [],
        expressionLimit,
      },
    })

    const buttons = wrapper.findAll('button')
    const earliest = buttons.find(button => button.text().includes('options.earliest'))
    const all = buttons.find(button => button.text().includes('options.all'))
    const latest = buttons.find(button => button.text().includes('options.latest'))

    await earliest!.trigger('click')
    await all!.trigger('click')
    await latest!.trigger('click')

    expect(wrapper.emitted('update:expressionLimitType')).toEqual([['First'], ['All'], ['Last']])
    expect(expressionLimit.Type).toBe('All')
  })

  it('removes the selected inclusion rule', async () => {
    const rules = [makeInclusionRule('Rule A', 1), makeInclusionRule('Rule B', 3)]
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: rules,
        conceptSets: [],
        expressionLimit: { Type: 'All' },
      },
    })

    const detail = wrapper.findComponent(InclusionRuleDetail)
    await detail.vm.$emit('remove')

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([rules[1]])
  })

  it('routes drag and click actions from the inclusion rail', async () => {
    const rules = [makeInclusionRule('Rule A', 1), makeInclusionRule('Rule B', 2)]
    const wrapper = mount(InclusionRuleRail, {
      global: { plugins: [vuetify] },
      props: {
        rules,
        selectedIndex: 0,
      },
    })

    const ruleButtons = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(ruleButtons).toHaveLength(2)

    await ruleButtons[0]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[0]])

    const secondRule = ruleButtons[1]!
    secondRule.element.getBoundingClientRect = () => ({
      top: 0,
      bottom: 100,
      left: 0,
      right: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    })

    const dataTransfer = makeDataTransfer()
    await ruleButtons[0]!.trigger('dragstart', { dataTransfer })
    await secondRule.trigger('dragover', { dataTransfer, clientY: 80 })
    await secondRule.trigger('dragleave')
    await secondRule.trigger('dragover', { dataTransfer, clientY: 80 })
    await secondRule.trigger('drop', { dataTransfer, clientY: 80 })
    await ruleButtons[0]!.trigger('dragend')

    expect(wrapper.emitted('reorder')).toEqual([[{ fromIndex: 0, toIndex: 1 }]])
  })

  it('covers the remaining inclusion-rail tone and drag guards', async () => {
    const rules = [makeInclusionRule('Rule A', 3), makeInclusionRule('Rule B', 1)]
    const wrapper = mount(InclusionRuleRail, {
      global: { plugins: [vuetify] },
      props: {
        rules,
        selectedIndex: null,
      },
    })

    const ruleButtons = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(ruleButtons).toHaveLength(2)
    expect(ruleButtons[1]!.classes()).toContain('inclusion-rail__rule--tone-danger')

    const warningWrapper = mount(InclusionRuleRail, {
      global: { plugins: [vuetify] },
      props: {
        rules: [makeInclusionRule('Rule C', 4), makeInclusionRule('Rule D', 2)],
        selectedIndex: null,
      },
    })
    expect(warningWrapper.findAll('[data-testid="inclusion-rail-rule"]')[1]!.classes()).toContain(
      'inclusion-rail__rule--tone-warning'
    )

    expect(wrapper.emitted('reorder')).toBeFalsy()
  })

  it('adds all censoring criteria variants and removes them again', async () => {
    const wrapper = mount(CensoringCriteriaEditor, {
      global: {
        plugins: [vuetify],
        stubs: { AtlasMenu: InlineAtlasMenuStub },
      },
      props: {
        modelValue: [],
        conceptSets: [],
      },
    })

    const expectedCriteria = new Map<string, Criteria>([
      ['ConditionOccurrence', { ConditionOccurrence: { First: false } }],
      ['ConditionEra', { ConditionEra: {} }],
      ['DrugExposure', { DrugExposure: {} }],
      ['DoseEra', { DoseEra: {} }],
      ['DeviceExposure', { DeviceExposure: {} }],
      ['DrugEra', { DrugEra: {} }],
      ['Measurement', { Measurement: {} }],
      ['Observation', { Observation: {} }],
      ['ObservationPeriod', { ObservationPeriod: {} }],
      ['PayerPlanPeriod', { PayerPlanPeriod: {} }],
      ['ProcedureOccurrence', { ProcedureOccurrence: {} }],
      ['Specimen', { Specimen: {} }],
      ['VisitDetail', { VisitDetail: {} }],
      ['VisitOccurrence', { VisitOccurrence: {} }],
      ['Death', { Death: {} }],
    ])

    const menuItems = wrapper.findAllComponents({ name: 'AtlasListItem' })
    expect(menuItems).toHaveLength(expectedCriteria.size)

    const criteriaTypes = Array.from(expectedCriteria.keys())
    let currentCriteria: Criteria[] = []
    for (const [index, item] of menuItems.entries()) {
      const type = criteriaTypes[index]!
      await item.vm.$emit('click')
      currentCriteria = [...currentCriteria, expectedCriteria.get(type)!]
      expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0]).toEqual(currentCriteria)
      await wrapper.setProps({
        modelValue: [...(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0] as Criteria[])],
      })
    }

    await wrapper.setProps({
      modelValue: [{ ConditionOccurrence: { First: false } } as Criteria],
    })

    const renderer = wrapper.findComponent(CriteriaRenderer)
    await renderer.vm.$emit('remove')
    expect(wrapper.emitted('update:modelValue')?.slice(-1)[0]?.[0]).toEqual([])
  })

  it('covers the inclusion-rules-panel empty, reset, and reorder guards', async () => {
    const rules = [makeInclusionRule('Rule A', 1), makeInclusionRule('Rule B', 2)]
    const expressionLimit = { Type: 'All' as const }
    const wrapper = mount(InclusionRulesPanel, {
      global: { plugins: [vuetify] },
      props: {
        modelValue: [],
        conceptSets: [],
        expressionLimit,
      },
    })

    expect(wrapper.find('[data-testid="inclusion-empty-add"]').exists()).toBe(true)
    await wrapper.setProps({ modelValue: rules })
    await wrapper.vm.$nextTick()

    await wrapper.setProps({ modelValue: [] })
    await wrapper.vm.$nextTick()
    expect(wrapper.findComponent(InclusionRuleDetail).exists()).toBe(false)
  })
})