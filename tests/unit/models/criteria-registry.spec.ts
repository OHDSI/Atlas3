/**
 * The registry replaced five hand-maintained lists of criteria types. Two of
 * those lists fell through to ConditionOccurrence for anything unrecognised, so
 * drift did not fail — it silently produced a condition criterion. These cases
 * pin the properties that made the drift invisible.
 */
import { describe, it, expect } from 'vitest'
import {
  CRITERIA_TYPES,
  CRITERIA_TYPE_BY_KEY,
  EDITABLE_CRITERIA_TYPES,
  criteriaTypeForDomain,
} from '@/components/circe/criteria/criteria-registry'
import { CriteriaSchemaMap, CriteriaSchema } from '@/models/circe-types'

describe('the registry covers the schema', () => {
  it('describes every criteria type the schema defines', () => {
    const schemaKeys = Object.keys(CriteriaSchemaMap).sort()
    const registryKeys = CRITERIA_TYPES.map(type => type.key).sort()

    expect(registryKeys).toEqual(schemaKeys)
  })

  // LocationRegion is the type that was missing from all five lists. It has no
  // editor, so it must not be offered in the add menus — but it is in the
  // schema and must keep round-tripping.
  it('includes LocationRegion, which no editor exists for', () => {
    expect(CRITERIA_TYPE_BY_KEY.LocationRegion.hasEditor).toBe(false)
    expect(EDITABLE_CRITERIA_TYPES.map(type => type.key)).not.toContain('LocationRegion')
  })

  it('offers every other type for editing', () => {
    expect(EDITABLE_CRITERIA_TYPES).toHaveLength(CRITERIA_TYPES.length - 1)
  })
})

describe('the criterion each type creates', () => {
  it('produces a criterion the schema accepts, for every type', () => {
    for (const type of CRITERIA_TYPES) {
      const criteria = type.create()

      expect(CriteriaSchema.safeParse(criteria).success, `${type.key} produced an invalid criterion`).toBe(true)
    }
  })

  it('keys the criterion on its own wrapper rather than a shared default', () => {
    for (const type of CRITERIA_TYPES) {
      expect(Object.keys(type.create())).toEqual([type.key])
    }
  })

  // Carried over from the previous factory switch, where it was the one
  // non-empty default.
  it('starts a condition occurrence with First unset rather than absent', () => {
    expect(CRITERIA_TYPE_BY_KEY.ConditionOccurrence.create()).toEqual({
      ConditionOccurrence: { First: false },
    })
  })

  it('hands out a fresh object each time so two criteria never share one', () => {
    const first = CRITERIA_TYPE_BY_KEY.ConditionOccurrence.create()
    const second = CRITERIA_TYPE_BY_KEY.ConditionOccurrence.create()

    expect(first).not.toBe(second)
    expect(first.ConditionOccurrence).not.toBe(second.ConditionOccurrence)
  })
})

describe('domain mapping', () => {
  it.each([
    ['Condition', 'ConditionOccurrence'],
    ['Drug', 'DrugExposure'],
    ['Procedure', 'ProcedureOccurrence'],
    ['Measurement', 'Measurement'],
    ['Observation', 'Observation'],
    ['Visit', 'VisitOccurrence'],
    ['Device', 'DeviceExposure'],
    ['Specimen', 'Specimen'],
  ])('maps the %s domain to %s', (domain, expected) => {
    expect(criteriaTypeForDomain(domain)).toBe(expected)
  })

  // The old switch returned ConditionOccurrence for anything it did not know,
  // so an unmapped domain built a cohort describing conditions instead of
  // whatever was asked for. The registry says "I don't know" and leaves the
  // decision to the caller.
  it('does not guess at an unmapped domain', () => {
    expect(criteriaTypeForDomain('Note')).toBeUndefined()
    expect(criteriaTypeForDomain(undefined)).toBeUndefined()
  })

  it('never maps two types to the same domain', () => {
    const domains = CRITERIA_TYPES.flatMap(type => type.domains)

    expect(new Set(domains).size).toBe(domains.length)
  })
})
