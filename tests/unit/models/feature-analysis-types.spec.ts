/**
 * Unit Tests: feature-analysis.types
 * Zod schema validation for FeatureAnalysis and friends.
 */

import { describe, it, expect } from 'vitest'

import {
  FeatureAnalysisTypeSchema,
  FeatureAnalysisAggregateSchema,
  FeatureAnalysisSchema,
  FeatureAnalysisListItemSchema,
} from '@/models/feature-analysis.types'

describe('FeatureAnalysisTypeSchema', () => {
  it('accepts the three known types', () => {
    expect(FeatureAnalysisTypeSchema.safeParse('PRESET').success).toBe(true)
    expect(FeatureAnalysisTypeSchema.safeParse('CRITERIA_SET').success).toBe(true)
    expect(FeatureAnalysisTypeSchema.safeParse('CUSTOM_FE').success).toBe(true)
  })

  it('rejects unknown types', () => {
    expect(FeatureAnalysisTypeSchema.safeParse('OTHER').success).toBe(false)
  })
})

describe('FeatureAnalysisAggregateSchema', () => {
  it('parses a realistic aggregate from /feature-analysis/aggregates', () => {
    const result = FeatureAnalysisAggregateSchema.safeParse({
      id: 1,
      name: 'Events count',
      domain: 'CONDITION',
      function: 'COUNT',
      expression: '*',
      additionalColumns: null,
      isDefault: true,
      missingMeansZero: true,
    })
    expect(result.success).toBe(true)
  })

  // WebAPI's FeAnalysisAggregateDTO has no @JsonInclude(NON_NULL), so unset
  // object fields serialize as explicit `null`, not omitted - confirmed
  // against a live WebAPI response (e.g. "Events count": domain/function both null).
  it('accepts explicit nulls for domain, function and expression', () => {
    const result = FeatureAnalysisAggregateSchema.safeParse({
      id: 1,
      name: 'Events count',
      domain: null,
      function: null,
      expression: null,
      joinTable: null,
      joinType: null,
      joinCondition: null,
      additionalColumns: [],
      isDefault: true,
      missingMeansZero: false,
    })
    expect(result.success).toBe(true)
  })

  it('keeps unknown fields via passthrough', () => {
    const result = FeatureAnalysisAggregateSchema.safeParse({
      id: 1,
      name: 'Mean',
      futureField: 'kept',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      // passthrough keeps extra fields so future API additions don't break us
      expect((result.data as Record<string, unknown>).futureField).toBe('kept')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('rejects when required field is missing', () => {
    expect(FeatureAnalysisAggregateSchema.safeParse({ name: 'Mean' }).success).toBe(false)
  })
})

describe('FeatureAnalysisSchema', () => {
  it('parses a PRESET feature analysis (design is a preset-name string)', () => {
    const fa = {
      id: 12,
      name: 'Demographics: Age',
      description: 'Standard age covariate',
      type: 'PRESET',
      domain: 'DEMOGRAPHICS',
      design: 'DemographicsAge',
      createdBy: { login: 'admin', name: 'Admin User' },
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
      tags: [{ id: 1, name: 'core' }],
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('parses a CRITERIA_SET/PREVALENCE feature analysis (design is an array of CriteriaGroup rows)', () => {
    const fa = {
      name: 'My condition group',
      type: 'CRITERIA_SET',
      statType: 'PREVALENCE',
      domain: 'CONDITION',
      design: [
        {
          name: 'Diabetes present',
          criteriaType: 'CriteriaGroup',
          expression: { Type: 'ALL', CriteriaList: [], DemographicCriteriaList: [], Groups: [] },
        },
      ],
      conceptSets: [{ id: 1, name: 'Diabetes', expression: { items: [] } }],
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('parses a CRITERIA_SET/DISTRIBUTION feature analysis (design rows are Windowed or Demographic)', () => {
    const fa = {
      name: 'Age at index',
      type: 'CRITERIA_SET',
      statType: 'DISTRIBUTION',
      design: [
        {
          name: 'Age',
          criteriaType: 'DemographicCriteria',
          expression: {},
        },
        {
          name: 'Prior drug exposure',
          criteriaType: 'WindowedCriteria',
          aggregate: { id: 2, name: 'Count' },
          expression: { Criteria: { DrugExposure: {} } },
        },
      ],
      conceptSets: [],
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('parses a CUSTOM_FE feature analysis (design is SQL string)', () => {
    const fa = {
      name: 'Custom drug-era covariate',
      type: 'CUSTOM_FE',
      design: 'SELECT 1 FROM @cdm.drug_era',
    }
    const result = FeatureAnalysisSchema.safeParse(fa)
    expect(result.success).toBe(true)
  })

  it('preserves unknown fields via passthrough WebAPI fields', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      type: 'PRESET',
      design: 'SomePresetName',
      hasWriteAccess: true, // unknown extra field from WebAPI
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('hasWriteAccess')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('accepts createdBy as a plain login string', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      type: 'PRESET',
      design: 'SomePresetName',
      createdBy: 'admin',
    })
    expect(result.success).toBe(true)
  })

  it('rejects when name is missing', () => {
    const result = FeatureAnalysisSchema.safeParse({
      type: 'PRESET',
      design: 'SomePresetName',
    })
    expect(result.success).toBe(false)
  })

  it('rejects when type is missing', () => {
    const result = FeatureAnalysisSchema.safeParse({
      name: 'X',
      design: 'SomePresetName',
    })
    expect(result.success).toBe(false)
  })
})

describe('FeatureAnalysisListItemSchema', () => {
  it('parses a list-shape feature analysis', () => {
    const item = {
      id: 7,
      name: 'Demographics: Gender',
      description: 'Gender as covariate',
      type: 'PRESET',
      domain: 'DEMOGRAPHICS',
      createdBy: 'admin',
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
    }
    const result = FeatureAnalysisListItemSchema.safeParse(item)
    expect(result.success).toBe(true)
  })

  it('preserves unknown fields via passthrough fields', () => {
    const result = FeatureAnalysisListItemSchema.safeParse({
      id: 1,
      name: 'X',
      type: 'PRESET',
      hasWriteAccess: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toHaveProperty('hasWriteAccess')
    } else {
      expect.fail('expected safeParse to succeed')
    }
  })

  it('rejects when id is missing', () => {
    const result = FeatureAnalysisListItemSchema.safeParse({
      name: 'X',
      type: 'PRESET',
    })
    expect(result.success).toBe(false)
  })
})
