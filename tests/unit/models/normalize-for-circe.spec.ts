/**
 * normalizeForCirce fills the fields circe-be requires but the sparse editor
 * document leaves unset. Two things matter and are asserted separately:
 *
 * 1. It writes what circe-be needs — a group Type, an occurrence Count, a range
 *    operator alongside a bound.
 * 2. It writes nothing else. The whole point of normalising at the save
 *    boundary rather than on load is that the document stays as the user left
 *    it, so a definition that is already complete must round-trip unchanged.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  normalizeForCirce,
  normalizeCriteriaGroupForCirce,
  DEFAULT_RANGE_OP,
} from '@/components/cohort-editor/normalize'
import { CohortExpressionSchema, type CohortExpression } from '@/models/circe-types'

interface PhenotypeFixture {
  cohortId: string
  name: string
  json: string
}

const FIXTURES = JSON.parse(
  readFileSync(resolve(__dirname, '../../e2e/phenotype-library/fixtures/phenotypes.json'), 'utf-8'),
) as PhenotypeFixture[]

describe('normalizeForCirce — fields circe-be requires', () => {
  it('gives a group with no Type the ALL that Atlas 2.15 initialises', () => {
    const result = normalizeForCirce({
      InclusionRules: [{ name: 'Rule 1', expression: { CriteriaList: [] } }],
    })

    expect(result.InclusionRules?.[0]?.expression?.Type).toBe('ALL')
  })

  it('gives an AT_LEAST group the Count that generation would otherwise read as null', () => {
    const result = normalizeForCirce({
      InclusionRules: [{ name: 'Rule 1', expression: { Type: 'AT_LEAST' } }],
    })

    expect(result.InclusionRules?.[0]?.expression?.Count).toBe(0)
  })

  it('leaves an ALL group without a Count, which it has no use for', () => {
    const result = normalizeForCirce({
      InclusionRules: [{ name: 'Rule 1', expression: { Type: 'ALL' } }],
    })

    expect(result.InclusionRules?.[0]?.expression?.Count).toBeUndefined()
  })

  it('reaches groups nested inside other groups', () => {
    const result = normalizeForCirce({
      AdditionalCriteria: { Type: 'ANY', Groups: [{ CriteriaList: [] }] },
    })

    expect(result.AdditionalCriteria?.Groups?.[0]?.Type).toBe('ALL')
  })

  it('gives a range that carries a bound the operator the editor displays for it', () => {
    const result = normalizeForCirce({
      PrimaryCriteria: {
        CriteriaList: [{ Measurement: { ValueAsNumber: { Value: 30 } } }],
      },
    })

    const measurement = result.PrimaryCriteria?.CriteriaList?.[0]?.Measurement
    expect(measurement?.ValueAsNumber?.Op).toBe(DEFAULT_RANGE_OP)
  })

  it('leaves a range with no bound alone rather than inventing a filter', () => {
    const result = normalizeForCirce({
      PrimaryCriteria: {
        CriteriaList: [{ Measurement: { ValueAsNumber: {} } }],
      },
    })

    const measurement = result.PrimaryCriteria?.CriteriaList?.[0]?.Measurement
    expect(measurement?.ValueAsNumber?.Op).toBeUndefined()
  })

  it('does not overwrite an operator the user chose', () => {
    const result = normalizeForCirce({
      PrimaryCriteria: {
        CriteriaList: [{ Measurement: { ValueAsNumber: { Value: 30, Op: 'lt' } } }],
      },
    })

    const measurement = result.PrimaryCriteria?.CriteriaList?.[0]?.Measurement
    expect(measurement?.ValueAsNumber?.Op).toBe('lt')
  })
})

describe('normalizeForCirce — leaves everything else alone', () => {
  it('does not mutate the expression it was given', () => {
    const original: CohortExpression = {
      InclusionRules: [{ name: 'Rule 1', expression: { CriteriaList: [] } }],
    }
    const before = JSON.stringify(original)

    normalizeForCirce(original)

    expect(JSON.stringify(original)).toBe(before)
  })

  it('still produces a document the circe schema accepts', () => {
    const result = normalizeForCirce({
      InclusionRules: [{ name: 'Rule 1', expression: { Type: 'AT_MOST' } }],
    })

    expect(CohortExpressionSchema.safeParse(result).success).toBe(true)
  })

  // The library definitions come from Atlas 2.x and already carry every field
  // circe-be requires. Normalising one must therefore be a no-op — if it is
  // not, the normalizer is adding fields to real cohorts rather than repairing
  // ones the editor left incomplete.
  it('changes nothing in a definition that is already complete', () => {
    const changed: string[] = []

    for (const fixture of FIXTURES) {
      const expression = CohortExpressionSchema.parse(JSON.parse(fixture.json))
      const normalized = normalizeForCirce(expression)

      if (JSON.stringify(normalized) !== JSON.stringify(expression)) {
        changed.push(fixture.name)
      }
    }

    expect(changed).toEqual([])
  })
})

describe('normalizeCriteriaGroupForCirce', () => {
  // circe-be's CriteriaGroup.count is a boxed Integer and the query builder
  // concatenates it straight into "HAVING COUNT(index_id) >= ", so a missing
  // Count reaches SQL as the literal null and then throws on unboxing.
  it('fills the count an AT_LEAST group needs', () => {
    expect(normalizeCriteriaGroupForCirce({ Type: 'AT_LEAST' }).Count).toBe(0)
  })

  it('fills the count an AT_MOST group needs', () => {
    expect(normalizeCriteriaGroupForCirce({ Type: 'AT_MOST' }).Count).toBe(0)
  })

  it('fills a missing match type', () => {
    expect(normalizeCriteriaGroupForCirce({}).Type).toBe('ALL')
  })

  it('reaches nested groups and nested correlated criteria', () => {
    const result = normalizeCriteriaGroupForCirce({
      Type: 'ALL',
      Groups: [{ Type: 'AT_LEAST' }],
      CriteriaList: [
        { Criteria: { ConditionOccurrence: { CorrelatedCriteria: {} } } },
      ],
    })

    expect(result.Groups![0]!.Count).toBe(0)
    const nested = (result.CriteriaList![0]!.Criteria as {
      ConditionOccurrence: { CorrelatedCriteria: { Type?: string } }
    }).ConditionOccurrence.CorrelatedCriteria
    expect(nested.Type).toBe('ALL')
  })

  it('leaves the input untouched', () => {
    const original = { Type: 'AT_LEAST' as const }
    normalizeCriteriaGroupForCirce(original)
    expect(original).toEqual({ Type: 'AT_LEAST' })
  })

  it('leaves an ALL group alone', () => {
    expect(normalizeCriteriaGroupForCirce({ Type: 'ALL', CriteriaList: [] }))
      .toEqual({ Type: 'ALL', CriteriaList: [] })
  })
})
