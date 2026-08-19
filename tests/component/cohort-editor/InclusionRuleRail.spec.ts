import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mount } from '@vue/test-utils'

import InclusionRuleRail from '@/components/cohort-editor/inclusion-rules/InclusionRuleRail.vue'
import type { InclusionRule } from '@/models/circe-types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

const vuetify = createVuetify({ components, directives })

function makeRule(name: string, criteriaCount: number, groupCount = 0): InclusionRule {
  return {
    name,
    description: undefined,
    expression: {
      Type: 'ALL',
      CriteriaList: Array.from({ length: criteriaCount }, () => ({})),
      DemographicCriteriaList: [],
      Groups: Array.from({ length: groupCount }, () => ({ Type: 'ALL', CriteriaList: [] })),
    },
  }
}

function mountRail(rules: InclusionRule[], selectedIndex: number | null = 0) {
  return mount(InclusionRuleRail, {
    global: { plugins: [vuetify] },
    props: { rules, selectedIndex },
  })
}

function mockBounds(element: Element) {
  return vi.spyOn(element as HTMLElement, 'getBoundingClientRect').mockReturnValue({
    top: 0,
    left: 0,
    right: 120,
    bottom: 120,
    width: 120,
    height: 120,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect)
}

describe('InclusionRuleRail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('labels the rules and assigns tones based on retention between rows', () => {
    const wrapper = mountRail([
      makeRule('Rule A', 4, 1),
      makeRule('Rule B', 3),
      makeRule('Rule C', 1),
    ])

    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(wrapper.text()).toContain('Inclusion rules (3)')
    expect(rules[0]!.classes()).toContain('inclusion-rail__rule--tone-success')
    expect(rules[1]!.classes()).toContain('inclusion-rail__rule--tone-warning')
    expect(rules[2]!.classes()).toContain('inclusion-rail__rule--tone-danger')
    expect(rules[0]!.text()).toContain('1 group · 4 criteria')
    expect(rules[2]!.text()).toContain('1 criterion')
  })

  it('reorders a rule to the next slot when dropped after a later target', async () => {
    const wrapper = mountRail([makeRule('Rule A', 1), makeRule('Rule B', 1)])
    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    const targetBounds = mockBounds(rules[1]!.element)
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
    } as unknown as DataTransfer

    await rules[0]!.trigger('dragstart', { dataTransfer })
    await rules[1]!.trigger('dragover', { clientY: 90, dataTransfer })
    await rules[1]!.trigger('drop')

    expect(wrapper.emitted('reorder')?.[0]?.[0]).toEqual({ fromIndex: 0, toIndex: 1 })
    targetBounds.mockRestore()
  })

  it('reorders a rule before an earlier target when dropped above its midpoint', async () => {
    const wrapper = mountRail([makeRule('Rule A', 1), makeRule('Rule B', 1)])
    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    const targetBounds = mockBounds(rules[0]!.element)
    const dataTransfer = {
      effectAllowed: 'move',
      dropEffect: 'move',
      setData: vi.fn(),
    } as unknown as DataTransfer

    await rules[1]!.trigger('dragstart', { dataTransfer })
    await rules[0]!.trigger('dragover', { clientY: 10, dataTransfer })
    await rules[0]!.trigger('drop')

    expect(wrapper.emitted('reorder')?.[0]?.[0]).toEqual({ fromIndex: 1, toIndex: 0 })
    targetBounds.mockRestore()
  })
})