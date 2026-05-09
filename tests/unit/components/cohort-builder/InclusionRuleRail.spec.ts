import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import { setActivePinia, createPinia } from 'pinia'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import InclusionRuleRail from '@/components/cohort-builder/InclusionRuleRail.vue'
import type { InclusionRule } from '@/models/cohort.types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function rule(id: string, name: string, groups = 1, criteria = 1): InclusionRule {
  return {
    id,
    name,
    description: undefined,
    criteriaGroups: Array.from({ length: groups }, (_, gi) => ({
      id: `${id}-g${gi}`,
      logicType: 'ALL',
      events: Array.from({ length: criteria }, (_, ei) => ({
        id: `${id}-g${gi}-e${ei}`,
        criteriaType: 'ConditionOccurrence',
        conceptSet: { id: 1, name: 'Test' },
        attributes: [],
      })),
    })),
  }
}

const baseRules: InclusionRule[] = [
  rule('r1', 'Adult patients'),
  rule('r2', 'No prior cancer', 1, 2),
  rule('r3', 'Continuous enrollment'),
]

function mountRail(props: Record<string, unknown> = {}) {
  return mount(InclusionRuleRail, {
    props: {
      rules: baseRules,
      selectedIndex: 0,
      cacheState: 'unavailable',
      entryEventCount: null,
      totalDatasetCount: null,
      ruleCounts: null,
      finalCount: null,
      isComputing: false,
      ...props,
    },
    global: { plugins: [vuetify] },
  })
}

describe('InclusionRuleRail', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('renders one row per rule', () => {
    const wrapper = mountRail()
    expect(wrapper.findAll('[data-testid="inclusion-rail-rule"]')).toHaveLength(3)
  })

  it('marks the selected rule with active class', () => {
    const wrapper = mountRail({ selectedIndex: 1 })
    const rows = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(rows[1]!.classes()).toContain('inclusion-rail__rule--active')
    expect(rows[0]!.classes()).not.toContain('inclusion-rail__rule--active')
  })

  it('emits select with the row index on click', async () => {
    const wrapper = mountRail()
    await wrapper.findAll('[data-testid="inclusion-rail-rule"]')[2]!.trigger('click')
    expect(wrapper.emitted('select')).toEqual([[2]])
  })

  it('emits add-rule when the add button is clicked', async () => {
    const wrapper = mountRail()
    await wrapper.find('[data-testid="inclusion-rail-add"]').trigger('click')
    expect(wrapper.emitted('add-rule')).toBeTruthy()
  })

  it('hides funnel chrome when cacheState is unavailable', () => {
    const wrapper = mountRail()
    expect(wrapper.find('[data-testid="inclusion-rail-entry"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="inclusion-rail-final"]').exists()).toBe(false)
    expect(wrapper.find('.inclusion-rail__rule-fill').exists()).toBe(false)
  })

  it('renders entry-event row, fills, and final row when cache is ready', () => {
    const wrapper = mountRail({
      cacheState: 'ready',
      entryEventCount: 15200,
      totalDatasetCount: 1178420,
      ruleCounts: [
        { ruleIndex: 0, ruleName: 'Adult', cumulativeCount: 12341 },
        { ruleIndex: 1, ruleName: 'No prior cancer', cumulativeCount: 8902 },
        { ruleIndex: 2, ruleName: 'Continuous enrollment', cumulativeCount: 7140 },
      ],
      finalCount: 7140,
    })
    expect(wrapper.find('[data-testid="inclusion-rail-entry"]').text()).toContain('15,200')
    expect(wrapper.find('[data-testid="inclusion-rail-entry"]').text()).toContain('1,178,420')
    expect(wrapper.findAll('.inclusion-rail__rule-fill')).toHaveLength(3)
    expect(wrapper.find('[data-testid="inclusion-rail-final"]').text()).toContain('7,140')
  })

  it('shows pulsing class on most-recently-edited rule when isComputing is true', () => {
    const wrapper = mountRail({
      cacheState: 'ready',
      entryEventCount: 100,
      totalDatasetCount: 1000,
      ruleCounts: [{ ruleIndex: 0, ruleName: 'a', cumulativeCount: 50 }],
      finalCount: 50,
      isComputing: true,
      computingIndex: 0,
    })
    const row = wrapper.findAll('[data-testid="inclusion-rail-rule"]')[0]!
    expect(row.classes()).toContain('inclusion-rail__rule--computing')
  })

  it('shows stale styling when cacheState is stale', () => {
    const wrapper = mountRail({
      cacheState: 'stale',
      entryEventCount: 15000,
      totalDatasetCount: 1000000,
      ruleCounts: [{ ruleIndex: 0, ruleName: 'a', cumulativeCount: 12000 }],
      finalCount: 12000,
    })
    expect(wrapper.classes()).toContain('inclusion-rail--stale')
  })
})
