import { describe, it, expect } from 'vitest'

import {
  CRITERIA_TYPE_BY_KEY,
  CRITERIA_TYPES,
  EDITABLE_CRITERIA_TYPES,
  criteriaTypeForDomain,
} from '@/components/circe/criteria/criteria-registry'

describe('criteria-registry', () => {
  it('maps OMOP domains to the expected criteria wrappers', () => {
    expect(criteriaTypeForDomain(undefined)).toBeUndefined()
    expect(criteriaTypeForDomain('Condition')).toBe('ConditionOccurrence')
    expect(criteriaTypeForDomain('Drug')).toBe('DrugExposure')
    expect(criteriaTypeForDomain('Measurement')).toBe('Measurement')
    expect(criteriaTypeForDomain('Observation')).toBe('Observation')
    expect(criteriaTypeForDomain('Procedure')).toBe('ProcedureOccurrence')
    expect(criteriaTypeForDomain('Specimen')).toBe('Specimen')
    expect(criteriaTypeForDomain('Visit')).toBe('VisitOccurrence')
    expect(criteriaTypeForDomain('Device')).toBe('DeviceExposure')
    expect(criteriaTypeForDomain('unknown-domain')).toBeUndefined()
  })

  it('exposes editable and non-editable registry entries consistently', () => {
    expect(CRITERIA_TYPES).toHaveLength(Object.keys(CRITERIA_TYPE_BY_KEY).length)
    expect(EDITABLE_CRITERIA_TYPES.map(type => type.key)).not.toContain('LocationRegion')
    expect(CRITERIA_TYPE_BY_KEY.LocationRegion.hasEditor).toBe(false)
    expect(CRITERIA_TYPE_BY_KEY.ConditionOccurrence.label).toBe('Condition Occurrence')
  })
})