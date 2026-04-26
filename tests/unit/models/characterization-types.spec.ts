/**
 * Unit Tests: characterization.types
 * Zod schema validation for CharacterizationDefinition, executions, and stats.
 */

import { describe, it, expect } from 'vitest'

import {
  LinkedCohortSchema,
  LinkedFeatureAnalysisSchema,
  StratumSchema,
  CharacterizationParameterSchema,
  CharacterizationDefinitionSchema,
  CharacterizationListItemSchema,
  GenerationStatusSchema,
  CharacterizationExecutionSchema,
  PrevalenceStatSchema,
  DistributionStatSchema,
  ComparativeDistributionStatSchema,
  TemporalDataPointSchema,
} from '@/models/characterization.types'

describe('LinkedCohortSchema', () => {
  it('parses a minimal linked cohort', () => {
    expect(LinkedCohortSchema.safeParse({ id: 1, name: 'A' }).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = LinkedCohortSchema.safeParse({ id: 1, name: 'A', expressionType: 'X' })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('expressionType')
    }
  })

  it('rejects when id is missing', () => {
    expect(LinkedCohortSchema.safeParse({ name: 'A' }).success).toBe(false)
  })
})

describe('LinkedFeatureAnalysisSchema', () => {
  it('parses a fully-populated linked feature analysis', () => {
    const result = LinkedFeatureAnalysisSchema.safeParse({
      id: 5,
      name: 'Demographics',
      description: 'Standard demographics',
      supportsAnnual: true,
      supportsTemporal: false,
      includeAnnual: true,
      includeTemporal: false,
      statType: 'PREVALENCE',
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = LinkedFeatureAnalysisSchema.safeParse({ id: 1, futureField: true })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when id is missing', () => {
    expect(LinkedFeatureAnalysisSchema.safeParse({ name: 'X' }).success).toBe(false)
  })
})

describe('StratumSchema', () => {
  it('parses a stratum with opaque criteria', () => {
    const result = StratumSchema.safeParse({
      id: 'abc-123',
      name: 'Female',
      criteria: { logicType: 'ALL', events: [] },
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = StratumSchema.safeParse({
      id: 'a',
      name: 'b',
      criteria: {},
      futureField: 1,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when name is missing', () => {
    expect(StratumSchema.safeParse({ id: 'a', criteria: {} }).success).toBe(false)
  })
})

describe('CharacterizationParameterSchema', () => {
  it('parses a parameter with arbitrary value', () => {
    expect(
      CharacterizationParameterSchema.safeParse({ name: 'threshold', value: 0.05 }).success
    ).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = CharacterizationParameterSchema.safeParse({
      name: 't',
      value: 1,
      futureField: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when name is missing', () => {
    expect(CharacterizationParameterSchema.safeParse({ value: 1 }).success).toBe(false)
  })
})

describe('CharacterizationDefinitionSchema', () => {
  it('parses a realistic WebAPI-shaped definition', () => {
    const cc = {
      id: 42,
      name: 'Diabetes characterization',
      description: 'Compare T1D vs T2D',
      cohorts: [
        { id: 1, name: 'T1D' },
        { id: 2, name: 'T2D' },
      ],
      featureAnalyses: [
        { id: 10, name: 'Demographics', includeAnnual: false, includeTemporal: false },
      ],
      stratas: [{ id: 's1', name: 'Female', criteria: { logicType: 'ALL', events: [] } }],
      strataConceptSets: [{ id: 5, name: 'Female concepts' }],
      stratifiedBy: 'gender',
      strataOnly: false,
      parameters: [{ name: 'threshold', value: 0.05 }],
      tags: [{ id: 1, name: 'demo' }],
      createdBy: { login: 'admin' },
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
    }
    const result = CharacterizationDefinitionSchema.safeParse(cc)
    expect(result.success).toBe(true)
  })

  it('strips unknown fields from WebAPI', () => {
    const result = CharacterizationDefinitionSchema.safeParse({
      name: 'X',
      cohorts: [],
      featureAnalyses: [],
      stratas: [],
      hasWriteAccess: true,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('hasWriteAccess')
    }
  })

  it('rejects when cohorts is missing', () => {
    const result = CharacterizationDefinitionSchema.safeParse({
      name: 'X',
      featureAnalyses: [],
      stratas: [],
    })
    expect(result.success).toBe(false)
  })
})

describe('CharacterizationListItemSchema', () => {
  it('parses a list-shape characterization', () => {
    const item = {
      id: 1,
      name: 'X',
      description: 'desc',
      tags: [{ name: 'demo' }],
      cohorts: [{ id: 1, name: 'T1D' }],
      featureAnalyses: [{ id: 10 }],
      createdBy: 'admin',
      createdDate: 1_700_000_000_000,
      modifiedDate: 1_700_000_500_000,
    }
    expect(CharacterizationListItemSchema.safeParse(item).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = CharacterizationListItemSchema.safeParse({
      id: 1,
      name: 'X',
      hasWriteAccess: false,
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('hasWriteAccess')
    }
  })

  it('rejects when name is missing', () => {
    expect(CharacterizationListItemSchema.safeParse({ id: 1 }).success).toBe(false)
  })
})

describe('GenerationStatusSchema', () => {
  it('accepts known statuses', () => {
    for (const s of [
      'PENDING',
      'STARTING',
      'STARTED',
      'RUNNING',
      'COMPLETED',
      'FAILED',
      'CANCELED',
      'STOPPING',
    ]) {
      expect(GenerationStatusSchema.safeParse(s).success).toBe(true)
    }
  })

  it('rejects unknown status', () => {
    expect(GenerationStatusSchema.safeParse('UNKNOWN').success).toBe(false)
  })
})

describe('CharacterizationExecutionSchema', () => {
  it('parses a realistic execution', () => {
    const exec = {
      id: 99,
      ccGenerationId: 100,
      hashCode: 'abc123',
      status: 'COMPLETED',
      startTime: 1_700_000_000_000,
      endTime: 1_700_000_001_000,
      duration: 1000,
      executionStatus: 'COMPLETED',
      sourceKey: 'CDM_V5',
      designHash: 'def456',
      cdmDatabaseSchema: 'cdm',
    }
    expect(CharacterizationExecutionSchema.safeParse(exec).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = CharacterizationExecutionSchema.safeParse({
      id: 1,
      status: 'PENDING',
      sourceKey: 'X',
      executionId: 'extra',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('executionId')
    }
  })

  it('rejects when sourceKey is missing', () => {
    expect(
      CharacterizationExecutionSchema.safeParse({ id: 1, status: 'PENDING' }).success
    ).toBe(false)
  })
})

describe('PrevalenceStatSchema', () => {
  it('parses a prevalence stat with nested count/pct maps', () => {
    const stat = {
      analysisId: 1,
      analysisName: 'Demographics',
      covariateId: 1001,
      covariateName: 'Female',
      conceptId: 8532,
      conceptName: 'FEMALE',
      domainId: 'Demographics',
      faType: 'PRESET',
      cohorts: [{ id: 1, name: 'T1D' }],
      count: { '0': { '1': 100 } },
      pct: { '0': { '1': 0.5 } },
      stdDiff: 0.12,
    }
    expect(PrevalenceStatSchema.safeParse(stat).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = PrevalenceStatSchema.safeParse({
      analysisId: 1,
      analysisName: 'X',
      covariateId: 1,
      covariateName: 'X',
      conceptId: 0,
      cohorts: [],
      count: {},
      pct: {},
      futureField: 'extra',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when count map is missing', () => {
    const result = PrevalenceStatSchema.safeParse({
      analysisId: 1,
      analysisName: 'X',
      covariateId: 1,
      covariateName: 'X',
      conceptId: 0,
      cohorts: [],
      pct: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('DistributionStatSchema', () => {
  it('parses a distribution stat with all nine percentile maps', () => {
    const stat = {
      analysisId: 2,
      analysisName: 'Age',
      covariateId: 1002,
      covariateName: 'Age at index',
      conceptId: 0,
      cohorts: [{ id: 1, name: 'T1D' }],
      avg: { '0': { '1': 45 } },
      stdDev: { '0': { '1': 12 } },
      min: { '0': { '1': 18 } },
      p10: { '0': { '1': 25 } },
      p25: { '0': { '1': 35 } },
      median: { '0': { '1': 45 } },
      p75: { '0': { '1': 55 } },
      p90: { '0': { '1': 65 } },
      max: { '0': { '1': 90 } },
    }
    expect(DistributionStatSchema.safeParse(stat).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const base = {
      analysisId: 2,
      analysisName: 'Age',
      covariateId: 1002,
      covariateName: 'Age',
      conceptId: 0,
      cohorts: [],
      avg: {},
      stdDev: {},
      min: {},
      p10: {},
      p25: {},
      median: {},
      p75: {},
      p90: {},
      max: {},
      futureField: true,
    }
    const result = DistributionStatSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when median map is missing', () => {
    const result = DistributionStatSchema.safeParse({
      analysisId: 2,
      analysisName: 'Age',
      covariateId: 1002,
      covariateName: 'Age',
      conceptId: 0,
      cohorts: [],
      avg: {},
      stdDev: {},
      min: {},
      p10: {},
      p25: {},
      p75: {},
      p90: {},
      max: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('ComparativeDistributionStatSchema', () => {
  it('parses a comparative distribution stat (extends distribution with stdDiff)', () => {
    const stat = {
      analysisId: 2,
      analysisName: 'Age',
      covariateId: 1002,
      covariateName: 'Age',
      conceptId: 0,
      cohorts: [],
      avg: {},
      stdDev: {},
      min: {},
      p10: {},
      p25: {},
      median: {},
      p75: {},
      p90: {},
      max: {},
      stdDiff: 0.42,
    }
    expect(ComparativeDistributionStatSchema.safeParse(stat).success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = ComparativeDistributionStatSchema.safeParse({
      analysisId: 1,
      analysisName: 'X',
      covariateId: 1,
      covariateName: 'X',
      conceptId: 0,
      cohorts: [],
      avg: {},
      stdDev: {},
      min: {},
      p10: {},
      p25: {},
      median: {},
      p75: {},
      p90: {},
      max: {},
      stdDiff: 0,
      futureField: 'x',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when stdDiff is missing', () => {
    const result = ComparativeDistributionStatSchema.safeParse({
      analysisId: 1,
      analysisName: 'X',
      covariateId: 1,
      covariateName: 'X',
      conceptId: 0,
      cohorts: [],
      avg: {},
      stdDev: {},
      min: {},
      p10: {},
      p25: {},
      median: {},
      p75: {},
      p90: {},
      max: {},
    })
    expect(result.success).toBe(false)
  })
})

describe('TemporalDataPointSchema', () => {
  it('parses a temporal data point', () => {
    const result = TemporalDataPointSchema.safeParse({
      timeId: 0,
      year: 2020,
      count: 100,
      pct: 0.5,
    })
    expect(result.success).toBe(true)
  })

  it('strips unknown fields', () => {
    const result = TemporalDataPointSchema.safeParse({
      timeId: 0,
      count: 1,
      pct: 0.1,
      futureField: 'x',
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).not.toHaveProperty('futureField')
    }
  })

  it('rejects when count is missing', () => {
    expect(TemporalDataPointSchema.safeParse({ timeId: 0, pct: 0.1 }).success).toBe(false)
  })
})
