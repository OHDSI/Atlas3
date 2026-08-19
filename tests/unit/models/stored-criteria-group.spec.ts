/**
 * Characterization strata and IR stratify rules are read back from definitions
 * written by older Atlas versions, and both are parsed with parseOrThrow. A
 * shape the schema rejects therefore does not fail one stratum — it fails the
 * whole design, and the editor cannot open it at all.
 *
 * These cases are the two shapes that actually occur in stored data.
 */
import { describe, it, expect, vi } from 'vitest'
import { StratumSchema } from '@/models/characterization.types'
import { StratifyRuleSchema } from '@/models/incidence-rate.types'
import { StoredCriteriaGroupSchema } from '@/models/stored-criteria-group'

vi.mock('@/utils/logger', () => ({
  logger: { warn: vi.fn(), error: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

describe('StoredCriteriaGroupSchema', () => {
  it('parses a group nested as an object, the modern shape', () => {
    const result = StoredCriteriaGroupSchema.parse({ Type: 'ALL', CriteriaList: [] })

    expect(result).toEqual({ Type: 'ALL', CriteriaList: [] })
  })

  // The 2.x save path stripped nulls from cohort expressions but not from IR
  // definitions, so explicit nulls survive in stored strata.
  it('reads an explicit null as "not set" rather than rejecting it', () => {
    expect(StoredCriteriaGroupSchema.parse(null)).toBeUndefined()
  })

  it('reads an absent group as "not set"', () => {
    expect(StoredCriteriaGroupSchema.parse(undefined)).toBeUndefined()
  })

  // The older Atlas format serialised the group rather than nesting it;
  // utils/characterization-validators.ts has always handled this case.
  it('parses a group that was stored as a JSON string', () => {
    const result = StoredCriteriaGroupSchema.parse(JSON.stringify({ Type: 'ANY', CriteriaList: [] }))

    expect(result).toEqual({ Type: 'ANY', CriteriaList: [] })
  })

  it('reads an empty string as "not set"', () => {
    expect(StoredCriteriaGroupSchema.parse('   ')).toBeUndefined()
  })

  it('drops a string that is not parseable JSON instead of failing the design', () => {
    expect(StoredCriteriaGroupSchema.parse('{ not json')).toBeUndefined()
  })
})

describe('the schemas that embed it', () => {
  it('loads a characterization stratum whose criteria are null', () => {
    const result = StratumSchema.parse({ id: 1, name: 'Adults', criteria: null })

    expect(result).toMatchObject({ id: '1', name: 'Adults', criteria: undefined })
  })

  it('loads a characterization stratum whose criteria are a JSON string', () => {
    const result = StratumSchema.parse({
      id: 's1',
      name: 'Adults',
      criteria: JSON.stringify({ Type: 'ALL', CriteriaList: [] }),
    })

    expect(result.criteria).toEqual({ Type: 'ALL', CriteriaList: [] })
  })

  // The shape Chris found on a real legacy IR stratum: every demographic field
  // present and explicitly null.
  it('loads an IR stratify rule carrying a legacy all-nulls demographic criterion', () => {
    const result = StratifyRuleSchema.parse({
      name: 'Under 18',
      description: null,
      expression: {
        Type: 'ALL',
        Count: null,
        CriteriaList: [],
        DemographicCriteriaList: [
          {
            Age: { Value: 18, Op: 'lt', Extent: null },
            Gender: null,
            GenderCS: null,
            Race: null,
            OccurrenceStartDate: null,
          },
        ],
        Groups: [],
      },
    })

    expect(result.expression?.DemographicCriteriaList?.[0]?.Age).toEqual({
      Value: 18,
      Op: 'lt',
      Extent: null,
    })
  })

  it('loads an IR stratify rule whose expression is null', () => {
    const result = StratifyRuleSchema.parse({ name: 'Rule', expression: null })

    expect(result.expression).toBeUndefined()
  })
})
