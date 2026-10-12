import { describe, it, expect } from 'vitest'
import {
  computeAttritionSteps,
  computeIntersectCount,
  leafMatchesSelection,
} from '@/utils/inclusion-attrition'
import type { InclusionRuleReport, InclusionTreemapNode } from '@/models/report.types'

function makeReport(overrides: Partial<InclusionRuleReport>): InclusionRuleReport {
  return {
    summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: null },
    inclusionRuleStats: [],
    treemap: null,
    ...overrides,
  }
}

describe('computeAttritionSteps', () => {
  it('returns empty array when no inclusion rules', () => {
    const report = makeReport({
      summary: { baseCount: 100, finalCount: 100, lostCount: 0, percentMatched: '100' },
      inclusionRuleStats: [],
      treemap: { name: 'Everyone', children: [] } as InclusionTreemapNode,
    })
    expect(computeAttritionSteps(report)).toEqual([])
  })

  it('computes sequential attrition from treemap data', () => {
    // Real shape from WebAPI cohort 7 (Sinusitis + Osteoarthritis + Otitis media)
    const report = makeReport({
      summary: { baseCount: 2689, finalCount: 511, lostCount: 2178, percentMatched: '19.0' },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Has Osteoarthritis',
          countSatisfying: 736,
          percentSatisfying: '27.37',
          percentExcluded: '72.63',
        },
        {
          id: 1,
          name: 'Has Otitis media',
          countSatisfying: 1948,
          percentSatisfying: '72.45',
          percentExcluded: '27.55',
        },
      ],
      treemap: {
        name: 'Everyone',
        children: [
          {
            name: 'Group 2',
            children: [
              { name: '11', size: 511 },
              {
                name: 'Group 1',
                children: [
                  { name: '01', size: 1437 },
                  { name: '10', size: 225 },
                  { name: 'Group 0', children: [{ name: '00', size: 516 }] },
                ],
              },
            ],
          },
        ],
      },
    })

    const steps = computeAttritionSteps(report)

    expect(steps).toHaveLength(3)

    expect(steps[0]!.label).toBe('Initial population')
    expect(steps[0]!.remaining).toBe(2689)
    expect(steps[0]!.excluded).toBe(0)
    expect(steps[0]!.percentOfInitial).toBe(100)

    // After Osteoarthritis (rule 0): leaves where char 0 = '1' → "10" (225) + "11" (511) = 736
    expect(steps[1]!.label).toBe('Has Osteoarthritis')
    expect(steps[1]!.remaining).toBe(736)
    expect(steps[1]!.excluded).toBe(2689 - 736)

    // After both rules: leaves where chars 0 and 1 both = '1' → "11" (511) = 511
    expect(steps[2]!.label).toBe('Has Otitis media')
    expect(steps[2]!.remaining).toBe(511)
    expect(steps[2]!.excluded).toBe(736 - 511)
    expect(steps[2]!.percentOfInitial).toBeCloseTo((511 / 2689) * 100, 1)
  })

  it('falls back to per-rule countSatisfying when treemap is null', () => {
    const report = makeReport({
      summary: { baseCount: 1000, finalCount: 200, lostCount: 800, percentMatched: '20' },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Rule A',
          countSatisfying: 500,
          percentSatisfying: '50',
          percentExcluded: '50',
        },
        {
          id: 1,
          name: 'Rule B',
          countSatisfying: 300,
          percentSatisfying: '30',
          percentExcluded: '70',
        },
      ],
      treemap: null,
    })

    const steps = computeAttritionSteps(report)
    expect(steps).toHaveLength(3)
    expect(steps[0]!.remaining).toBe(1000)
    expect(steps[1]!.remaining).toBe(500)
    expect(steps[2]!.remaining).toBe(300)
  })

  it('falls back when treemap has no binary leaves', () => {
    const report = makeReport({
      summary: { baseCount: 100, finalCount: 50, lostCount: 50, percentMatched: '50' },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Rule A',
          countSatisfying: 50,
          percentSatisfying: '50',
          percentExcluded: '50',
        },
      ],
      treemap: { name: 'Everyone', children: [{ name: 'Group X' }] },
    })

    const steps = computeAttritionSteps(report)
    expect(steps[1]!.remaining).toBe(50)
  })

  it('handles single inclusion rule', () => {
    const report = makeReport({
      summary: { baseCount: 100, finalCount: 60, lostCount: 40, percentMatched: '60' },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Only Rule',
          countSatisfying: 60,
          percentSatisfying: '60',
          percentExcluded: '40',
        },
      ],
      treemap: {
        name: 'Everyone',
        children: [
          {
            name: 'Group 0',
            children: [
              { name: '1', size: 60 },
              { name: '0', size: 40 },
            ],
          },
        ],
      },
    })

    const steps = computeAttritionSteps(report)
    expect(steps).toHaveLength(2)
    expect(steps[0]!.remaining).toBe(100)
    expect(steps[1]!.remaining).toBe(60)
    expect(steps[1]!.excluded).toBe(40)
  })

  it('clamps excluded to zero if remaining exceeds previous step', () => {
    // Pathological: baseCount (800) is smaller than the treemap-sum for char 0 = '1' (900).
    // Real WebAPI data shouldn't show this, but the clamp protects against it.
    const report = makeReport({
      summary: { baseCount: 800, finalCount: 900, lostCount: 0, percentMatched: '112' },
      inclusionRuleStats: [
        { id: 0, name: 'A', countSatisfying: 900, percentSatisfying: '90', percentExcluded: '10' },
      ],
      treemap: {
        name: 'Everyone',
        children: [
          { name: '1', size: 900 },
          { name: '0', size: 100 },
        ],
      },
    })
    const steps = computeAttritionSteps(report)
    expect(steps[1]!.remaining).toBe(900)
    expect(steps[1]!.excluded).toBe(0)
  })

  it('treats baseCount of 0 without dividing by zero', () => {
    const report = makeReport({
      summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: '0' },
      inclusionRuleStats: [
        { id: 0, name: 'A', countSatisfying: 0, percentSatisfying: '0', percentExcluded: '0' },
      ],
      treemap: null,
    })
    const steps = computeAttritionSteps(report)
    expect(steps[1]!.percentOfInitial).toBe(0)
  })
})

// Same shape as WebAPI cohort 7: rule 0 = Osteoarthritis, rule 1 = Otitis media
const twoRuleReport = makeReport({
  summary: { baseCount: 2689, finalCount: 511, lostCount: 2178, percentMatched: '19.0' },
  inclusionRuleStats: [
    {
      id: 0,
      name: 'A',
      countSatisfying: 736,
      percentSatisfying: '27.37',
      percentExcluded: '72.63',
    },
    {
      id: 1,
      name: 'B',
      countSatisfying: 1948,
      percentSatisfying: '72.45',
      percentExcluded: '27.55',
    },
  ],
  treemap: {
    name: 'Everyone',
    children: [
      {
        name: 'Group 2',
        children: [
          { name: '11', size: 511 },
          {
            name: 'Group 1',
            children: [
              { name: '01', size: 1437 },
              { name: '10', size: 225 },
              { name: 'Group 0', children: [{ name: '00', size: 516 }] },
            ],
          },
        ],
      },
    ],
  },
})

describe('computeAttritionSteps initial label', () => {
  it('uses the given label for the initial step', () => {
    expect(computeAttritionSteps(twoRuleReport, 'Adults with sinusitis')[0]!.label).toBe(
      'Adults with sinusitis'
    )
  })

  it('defaults to "Initial population"', () => {
    expect(computeAttritionSteps(twoRuleReport)[0]!.label).toBe('Initial population')
  })
})

const sel = (
  rules: number[],
  mode: 'all' | 'any',
  outcome: 'passed' | 'failed' = 'passed'
) => ({ rules, mode, outcome })

describe('leafMatchesSelection', () => {
  it('requires every selected rule to pass in "all" / passed mode', () => {
    expect(leafMatchesSelection('101', sel([0, 2], 'all'))).toBe(true)
    expect(leafMatchesSelection('101', sel([0, 1], 'all'))).toBe(false)
  })

  it('requires at least one selected rule to pass in "any" / passed mode', () => {
    expect(leafMatchesSelection('001', sel([0, 2], 'any'))).toBe(true)
    expect(leafMatchesSelection('010', sel([0, 2], 'any'))).toBe(false)
  })

  it('looks for failures in "failed" mode', () => {
    expect(leafMatchesSelection('010', sel([0, 2], 'all', 'failed'))).toBe(true)
    expect(leafMatchesSelection('011', sel([0, 2], 'all', 'failed'))).toBe(false)
    expect(leafMatchesSelection('011', sel([0, 2], 'any', 'failed'))).toBe(true)
    expect(leafMatchesSelection('111', sel([0, 2], 'any', 'failed'))).toBe(false)
  })

  it('matches no one for an empty selection, like Atlas 2', () => {
    expect(leafMatchesSelection('00', sel([], 'all'))).toBe(false)
    expect(leafMatchesSelection('11', sel([], 'any'))).toBe(false)
    expect(leafMatchesSelection('00', sel([], 'all', 'failed'))).toBe(false)
  })
})

describe('computeIntersectCount', () => {
  it('all rules selected in "all" / passed mode equals the final count', () => {
    expect(computeIntersectCount(twoRuleReport, sel([0, 1], 'all'))).toBe(511)
  })

  it('counts persons passing a single rule regardless of the others', () => {
    expect(computeIntersectCount(twoRuleReport, sel([1], 'all'))).toBe(511 + 1437)
    expect(computeIntersectCount(twoRuleReport, sel([0], 'all'))).toBe(511 + 225)
  })

  it('counts persons passing any selected rule', () => {
    expect(computeIntersectCount(twoRuleReport, sel([0, 1], 'any'))).toBe(511 + 1437 + 225)
  })

  it('counts persons failing all / any selected rules', () => {
    expect(computeIntersectCount(twoRuleReport, sel([0, 1], 'all', 'failed'))).toBe(516)
    expect(computeIntersectCount(twoRuleReport, sel([0, 1], 'any', 'failed'))).toBe(1437 + 225 + 516)
  })

  it('returns 0 when nothing is selected', () => {
    expect(computeIntersectCount(twoRuleReport, sel([], 'all'))).toBe(0)
    expect(computeIntersectCount(twoRuleReport, sel([], 'any'))).toBe(0)
  })

  it('returns null without a treemap', () => {
    expect(computeIntersectCount({ ...twoRuleReport, treemap: null }, sel([0], 'all'))).toBeNull()
  })
})

describe('intersect parity with Atlas 2', () => {
  // Cohort 19 on atlas-preview (SYNPUF5PCT, by person): five rules, leaf name =
  // pass ('1') / fail ('0') per rule, rule 0 first.
  const leaves: Record<string, number> = {
    '11111': 105, '11110': 1032, '01111': 167, '10111': 755, '00111': 1197, '01110': 1396,
    '10110': 8713, '11100': 87, '10100': 793, '01100': 95, '00110': 11530, '00100': 944,
  }
  const report: InclusionRuleReport = {
    summary: { baseCount: 26814, finalCount: 105, lostCount: 0, percentMatched: '0.39%' },
    inclusionRuleStats: [0, 1, 2, 3, 4].map(id => ({
      id, name: `Rule ${id}`, countSatisfying: 0, percentSatisfying: '0', percentExcluded: '0',
    })),
    treemap: {
      name: 'Everyone',
      children: [{ name: 'Group', children: Object.entries(leaves).map(([name, size]) => ({ name, size })) }],
    },
  }

  // Atlas 2 FeasibilityIntersectReport.grayRectsInTreemap, ported unchanged:
  // a rect stays coloured (and counts towards the summary) when this returns true.
  function atlas2Included(rectId: string, checked: number[], allAny: 'ALL' | 'ANY', passFail: 'PASSED' | 'FAILED') {
    const checkRulesAll = (id: string, checkForFail?: boolean) => {
      if (checked.length === 0) return false
      for (let i = 0; i < checked.length; i++) {
        if (id[checked[i]!] !== (checkForFail ? '0' : '1')) return false
      }
      return true
    }
    const checkRulesAny = (id: string, checkForFail?: boolean) => {
      let checkPassed = false
      checked.forEach(r => {
        if (id[r] === (checkForFail ? '0' : '1')) checkPassed = true
      })
      return checkPassed
    }
    return (
      (allAny === 'ANY' && passFail === 'PASSED' && checkRulesAny(rectId)) ||
      (allAny === 'ALL' && passFail === 'PASSED' && checkRulesAll(rectId)) ||
      (allAny === 'ANY' && passFail === 'FAILED' && checkRulesAny(rectId, true)) ||
      (allAny === 'ALL' && passFail === 'FAILED' && checkRulesAll(rectId, true))
    )
  }

  const subsets = Array.from({ length: 32 }, (_, m) => [0, 1, 2, 3, 4].filter(r => m & (1 << r)))

  it.each(['all', 'any'] as const)('highlights the same leaves and count as Atlas 2 (%s)', mode => {
    for (const outcome of ['passed', 'failed'] as const) {
      for (const rules of subsets) {
        const selection = { rules, mode, outcome }
        const allAny = mode === 'all' ? 'ALL' : 'ANY'
        const passFail = outcome === 'passed' ? 'PASSED' : 'FAILED'
        for (const bits of Object.keys(leaves)) {
          expect(leafMatchesSelection(bits, selection), `${bits} ${mode} ${outcome} [${rules}]`).toBe(
            atlas2Included(bits, rules, allAny, passFail)
          )
        }
        const atlas2Sum = Object.entries(leaves)
          .filter(([bits]) => atlas2Included(bits, rules, allAny, passFail))
          .reduce((n, [, size]) => n + size, 0)
        expect(computeIntersectCount(report, selection)).toBe(atlas2Sum)
      }
    }
  })
})
