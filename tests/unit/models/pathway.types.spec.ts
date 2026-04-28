import { describe, it, expect } from 'vitest'
import {
  PathwaySchema,
  PathwayDesignSchema,
  PathwayResultsSchema,
  PathwayExecutionSchema,
  PATHWAY_DEFAULTS,
  COMBINATION_WINDOW_OPTIONS,
} from '@/models/pathway.types'

describe('pathway.types', () => {
  it('PathwayDesignSchema parses settings sub-shape', () => {
    const parsed = PathwayDesignSchema.parse({
      combinationWindow: 30,
      minCellCount: 5,
      maxDepth: 5,
      allowRepeats: false,
    })
    expect(parsed.maxDepth).toBe(5)
  })

  it('PathwaySchema parses a flat OHDSI WebAPI pathway DTO', () => {
    const parsed = PathwaySchema.parse({
      id: 43, name: 'Cohort PathwayV1', tags: [],
      targetCohorts: [{ id: 1, name: 'T', hasWriteAccess: false, pathwayCohortId: 9 }],
      eventCohorts: [{ id: 2, name: 'E' }],
      combinationWindow: 3, minCellCount: 2, maxDepth: 5, allowRepeats: false,
      hashCode: -1788770881,
    })
    expect(parsed.targetCohorts).toHaveLength(1)
    expect(parsed.hashCode).toBe(-1788770881)
  })

  it('PathwaySchema requires non-empty name', () => {
    const result = PathwaySchema.safeParse({
      name: '',
      targetCohorts: [], eventCohorts: [],
      combinationWindow: 30, minCellCount: 5, maxDepth: 5, allowRepeats: false,
    })
    expect(result.success).toBe(false)
  })

  it('PathwayExecutionSchema rejects unknown status', () => {
    const result = PathwayExecutionSchema.safeParse({
      id: 1, status: 'BANANA', sourceKey: 'cdm',
    })
    expect(result.success).toBe(false)
  })

  it('PathwayResultsSchema parses pathwayGroups + eventCodes', () => {
    const parsed = PathwayResultsSchema.parse({
      pathwayGroups: [{
        targetCohortId: 1, targetCohortCount: 100, totalPathwaysCount: 80,
        pathways: [{ path: '1-2', personCount: 10 }],
      }],
      eventCodes: [{ code: 1, name: 'A', isCombo: false }],
    })
    expect(parsed.pathwayGroups[0].pathways).toHaveLength(1)
  })

  it('PATHWAY_DEFAULTS exposes sane defaults', () => {
    expect(PATHWAY_DEFAULTS.combinationWindow).toBe(30)
    expect(COMBINATION_WINDOW_OPTIONS).toContain(30)
  })
})
