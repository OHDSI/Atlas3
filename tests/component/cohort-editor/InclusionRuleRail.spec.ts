import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'

import InclusionRuleRail from '@/components/cohort-editor/inclusion-rules/InclusionRuleRail.vue'
import type { InclusionRule } from '@/models/circe-types'

vi.mock('@/composables/useI18n', async () => {
  const { mockUseI18n } = await import('../../helpers/i18n-mock')
  return mockUseI18n
})

// The rail embeds CachePreviewSelector, which calls initialize() on mount and
// would otherwise reach the network from jsdom.
vi.mock('@/composables/useTrexSQLCache', () => ({
  useTrexSQLCache: () => ({
    isTrexSQLEnabled: ref(false),
    selectedSourceKey: ref(null),
    dataSources: ref([]),
    isLoadingDataSources: ref(false),
    selectDataSource: vi.fn(),
    initialize: vi.fn().mockResolvedValue(undefined),
  }),
}))

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

type LivePreviewProps = {
  cacheState?: 'ready' | 'stale' | 'building' | 'unavailable'
  entryEventCount?: number | null
  totalDatasetCount?: number | null
  ruleCounts?: { ruleIndex: number; ruleName: string; cumulativeCount: number }[] | null
  finalCount?: number | null
  isComputing?: boolean
}

function mountRail(
  rules: InclusionRule[],
  selectedIndex: number | null = 0,
  live: LivePreviewProps = {}
) {
  return mount(InclusionRuleRail, {
    global: { plugins: [vuetify] },
    props: { rules, selectedIndex, ...live },
  })
}

// A cache-ready rail carrying real cumulative counts, which is what the
// funnel rendering and the rule tones are driven by.
function liveCounts(counts: number[], entry: number, final = counts[counts.length - 1] ?? 0) {
  return {
    cacheState: 'ready' as const,
    entryEventCount: entry,
    totalDatasetCount: entry * 2,
    finalCount: final,
    ruleCounts: counts.map((cumulativeCount, ruleIndex) => ({
      ruleIndex,
      ruleName: `Rule ${ruleIndex}`,
      cumulativeCount,
    })),
  }
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

  it('labels the rules and summarises their contents', () => {
    const wrapper = mountRail([
      makeRule('Rule A', 4, 1),
      makeRule('Rule B', 3),
      makeRule('Rule C', 1),
    ])

    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(wrapper.text()).toContain('Inclusion rules (3)')
    expect(rules[0]!.text()).toContain('1 group · 4 criteria')
    expect(rules[2]!.text()).toContain('1 criterion')
  })

  it('assigns tones from the patients each rule removes, not from its clause count', () => {
    // 1000 entry events -> 950 (95% kept) -> 500 (53%) -> 50 (10%).
    const wrapper = mountRail(
      [makeRule('Rule A', 1), makeRule('Rule B', 1), makeRule('Rule C', 1)],
      0,
      liveCounts([950, 500, 50], 1000)
    )

    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(rules[0]!.classes()).toContain('inclusion-rail__rule--tone-success')
    expect(rules[1]!.classes()).toContain('inclusion-rail__rule--tone-warning')
    expect(rules[2]!.classes()).toContain('inclusion-rail__rule--tone-danger')
  })

  it('carries no tone when live counts are unavailable', () => {
    // Identical rules to the test above. Without counts the rail cannot know
    // how many patients each rule removes, so it must not guess from the
    // number of criteria someone happened to type.
    const wrapper = mountRail([makeRule('Rule A', 4, 1), makeRule('Rule B', 3), makeRule('Rule C', 1)])

    for (const rule of wrapper.findAll('[data-testid="inclusion-rail-rule"]')) {
      expect(rule.classes().some(c => c.startsWith('inclusion-rail__rule--tone-'))).toBe(false)
    }
  })

  it('renders the attrition funnel: entry events, per-rule counts and the qualifying cohort', () => {
    const wrapper = mountRail(
      [makeRule('Rule A', 1), makeRule('Rule B', 1)],
      0,
      liveCounts([900, 750], 1000, 750)
    )

    const entry = wrapper.find('[data-testid="inclusion-rail-entry"]')
    expect(entry.exists()).toBe(true)
    expect(entry.text()).toContain('1,000')
    expect(entry.text()).toContain('2,000')

    const rules = wrapper.findAll('[data-testid="inclusion-rail-rule"]')
    expect(rules[0]!.text()).toContain('900')
    expect(rules[0]!.text()).toContain('90%')
    expect(rules[1]!.text()).toContain('750')
    expect(rules[1]!.text()).toContain('75%')

    const final = wrapper.find('[data-testid="inclusion-rail-final"]')
    expect(final.exists()).toBe(true)
    expect(final.text()).toContain('750')
    expect(final.text()).toContain('75%')
  })

  it('hides the funnel while the cache is unavailable', () => {
    const wrapper = mountRail([makeRule('Rule A', 1)], 0, {
      ...liveCounts([900], 1000),
      cacheState: 'unavailable',
    })

    expect(wrapper.find('[data-testid="inclusion-rail-entry"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="inclusion-rail-final"]').exists()).toBe(false)
  })

  it('keeps showing the last counts, dimmed, while a new expression is in flight', () => {
    const wrapper = mountRail([makeRule('Rule A', 1)], 0, {
      ...liveCounts([900], 1000),
      isComputing: true,
    })

    const rule = wrapper.findAll('[data-testid="inclusion-rail-rule"]')[0]!
    expect(rule.classes()).toContain('inclusion-rail__rule--computing')
    // Dimmed, not blanked: the rail must not flip between numbers and spinners.
    expect(rule.text()).toContain('900')
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