import { describe, it, expect } from 'vitest'
import { computePathStats, type PathStatsInput } from '@/utils/pathway-path-stats'
import type { Pathway, PathwayResults } from '@/models/pathway.types'

const design: Pathway = {
  name: 'Test',
  targetCohorts: [{ id: 1, name: 'T' }],
  eventCohorts: [
    { id: 100, name: 'SABA' },
    { id: 101, name: 'ICS' },
    { id: 102, name: 'LABA' },
  ],
  combinationWindow: 30,
  minCellCount: 5,
  maxDepth: 5,
  allowRepeats: false,
  tags: [],
}

// Bits: SABA=1, ICS=2, LABA=4. Path "1-2-4" = SABA → ICS → LABA.
const results: PathwayResults = {
  pathwayGroups: [
    {
      targetCohortId: 1,
      targetCohortCount: 12901,
      totalPathwaysCount: 5824,
      pathways: [
        { path: '1-2-4', personCount: 414 },
        { path: '1-2', personCount: 880 },
        { path: '1', personCount: 1210 },
        { path: '2-4', personCount: 200 },
      ],
    },
  ],
  eventCodes: [
    { code: 1, name: 'SABA', isCombo: false },
    { code: 2, name: 'ICS', isCombo: false },
    { code: 4, name: 'LABA', isCombo: false },
  ],
}

describe('computePathStats', () => {
  it('returns null summary when no path is selected', () => {
    const input: PathStatsInput = { design, results, targetCohortId: 1, selectedPath: null }
    expect(computePathStats(input)).toBeNull()
  })

  it('returns summary, steps, and stats for a selected path', () => {
    const input: PathStatsInput = {
      design,
      results,
      targetCohortId: 1,
      selectedPath: { path: '1-2-4' },
    }
    const out = computePathStats(input)!
    expect(out.summary.persons).toBe(414)
    expect(out.summary.pctOfCohort).toBeCloseTo(3.21, 1)
    expect(out.summary.pctOfPathways).toBeCloseTo(7.11, 1)
    expect(out.steps).toHaveLength(3)
    expect(out.steps[0]).toMatchObject({ name: 'SABA', entered: 2504 })
    expect(out.steps[1]).toMatchObject({ name: 'ICS', entered: 1294, retentionPct: expect.closeTo(51.7, 0) })
    expect(out.steps[2]).toMatchObject({ name: 'LABA', entered: 414, retentionPct: expect.closeTo(32.0, 0) })
    expect(out).not.toHaveProperty('stats')
  })

  it('counts everyone who reached an inner step, like the sunburst slice', () => {
    const r2: PathwayResults = {
      ...results,
      pathwayGroups: [
        {
          ...results.pathwayGroups[0]!,
          pathways: [
            { path: '1-2', personCount: 178 },
            { path: '1-2-4', personCount: 16 },
            { path: '1-2-4-1', personCount: 1 },
            { path: '1', personCount: 1000 },
          ],
        },
      ],
    }
    const out = computePathStats({ design, results: r2, targetCohortId: 1, selectedPath: { path: '1-2' } })!
    expect(out.summary.persons).toBe(195)
    expect(out.steps.map(s => s.entered)).toEqual([1195, 195])
  })

  it('counts only people whose pathway stops there for an end slice', () => {
    const out = computePathStats({ design, results, targetCohortId: 1, selectedPath: { path: '1-2-end' } })!
    expect(out.summary.persons).toBe(880)
    expect(out.summary.chips.map(c => c.name)).toEqual(['SABA', 'ICS'])
    expect(out.steps.map(s => s.entered)).toEqual([2504, 1294])
  })

  it('does not count paths that only share a code prefix', () => {
    const r2: PathwayResults = {
      ...results,
      pathwayGroups: [
        {
          ...results.pathwayGroups[0]!,
          pathways: [
            { path: '1', personCount: 10 },
            { path: '12', personCount: 99 },
          ],
        },
      ],
    }
    const out = computePathStats({ design, results: r2, targetCohortId: 1, selectedPath: { path: '1' } })!
    expect(out.summary.persons).toBe(10)
  })

  it('returns null summary when targetCohortId has no group', () => {
    const out = computePathStats({ design, results, targetCohortId: 999, selectedPath: { path: '1' } })
    expect(out).toBeNull()
  })

  it('returns null summary when targetCohortCount is zero', () => {
    const r2: PathwayResults = {
      ...results,
      pathwayGroups: [{ ...results.pathwayGroups[0]!, targetCohortCount: 0, totalPathwaysCount: 0 }],
    }
    const out = computePathStats({ design, results: r2, targetCohortId: 1, selectedPath: { path: '1' } })!
    expect(out.summary.pctOfCohort).toBe(0)
    expect(out.summary.pctOfPathways).toBe(0)
  })
})
