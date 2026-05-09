import { describe, it, expect } from 'vitest'
import { InclusionStatsResultSchema } from '@/models/trexsql.types'

describe('InclusionStatsResultSchema', () => {
  it('parses a well-formed payload', () => {
    const payload = {
      entryEventCount: 15200,
      totalPatientCount: 1178420,
      finalCount: 5180,
      ruleCounts: [
        { ruleIndex: 0, ruleName: 'Adult patients', cumulativeCount: 12341 },
        { ruleIndex: 1, ruleName: 'No prior cancer', cumulativeCount: 8902 },
      ],
      executionTimeMs: 312,
    }
    const result = InclusionStatsResultSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })

  it('rejects payloads missing ruleCounts', () => {
    const payload = {
      entryEventCount: 15200,
      totalPatientCount: 1178420,
      finalCount: 5180,
      executionTimeMs: 312,
    }
    const result = InclusionStatsResultSchema.safeParse(payload)
    expect(result.success).toBe(false)
  })

  it('accepts an empty ruleCounts array (cohort with no inclusion rules)', () => {
    const payload = {
      entryEventCount: 15200,
      totalPatientCount: 1178420,
      finalCount: 15200,
      ruleCounts: [],
      executionTimeMs: 42,
    }
    const result = InclusionStatsResultSchema.safeParse(payload)
    expect(result.success).toBe(true)
  })
})
