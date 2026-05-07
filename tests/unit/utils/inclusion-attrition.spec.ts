import { describe, it, expect } from 'vitest'
import { computeAttritionSteps } from '@/utils/inclusion-attrition'
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

    expect(steps[0]!.label).toBe('Initial Population')
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
