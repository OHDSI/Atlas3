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
    expect(out.steps[0]).toMatchObject({ name: 'SABA', entered: 1210 })
    expect(out.steps[1]).toMatchObject({ name: 'ICS', entered: 880, retentionPct: expect.closeTo(72.7, 0) })
    expect(out.steps[2]).toMatchObject({ name: 'LABA', entered: 414, retentionPct: expect.closeTo(47.0, 0) })
    // Time-based stats are not in the current payload — must surface as null.
    expect(out.stats.medianDurationDays).toBeNull()
    expect(out.stats.medianStepGapDays).toBeNull()
    expect(out.stats.daysToStep1).toBeNull()
    expect(out.stats.continuedPastLastStep).toBeNull()
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
