/**
 * Integration Tests - Gap Fixes Verification
 *
 * Tests for all 7 gaps identified in the Atlas 2.x vs Atlas3 comparison.
 * Each test constructs Atlas JSON using the exact format Atlas 2.x produces
 * and verifies the converter handles it correctly with full round-trip.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

const DEMO_DIR = join(__dirname, '..', 'e2e', 'fixtures', 'atlas-demo')

function roundTrip(atlas: Record<string, unknown>) {
  const internal = convertAtlasToInternal(atlas as never)
  const back = convertInternalToAtlas({
    ...internal,
    name: 'test',
    entryEvents: internal.entryEvents || [],
    qualifyingLimit: internal.qualifyingLimit || 'ALL',
    inclusionRules: internal.inclusionRules || [],
    conceptSets: internal.conceptSets || [],
  } as CohortDefinition)
  return { internal, back }
}

function makeBaseCohort(overrides: Record<string, unknown> = {}) {
  return {
    cdmVersionRange: '>=5.0.0',
    PrimaryCriteria: {
      CriteriaList: [{ ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } }],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'All' },
    },
    ConceptSets: [{
      id: 0, name: 'Test',
      expression: { items: [{ concept: { CONCEPT_ID: 1, CONCEPT_NAME: 'Test', DOMAIN_ID: 'Condition', VOCABULARY_ID: 'SNOMED', STANDARD_CONCEPT: 'S' }, isExcluded: false, includeDescendants: false, includeMapped: false }] },
    }],
    QualifiedLimit: { Type: 'All' },
    ExpressionLimit: { Type: 'All' },
    InclusionRules: [],
    CensoringCriteria: [],
    CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
    CensorWindow: {},
    ...overrides,
  }
}

// ─── Gap 1: EndStrategy ──────────────────────────────────────────────────────

describe('Gap 1: EndStrategy', () => {
  describe('DateOffset strategy', () => {
    it('extracts DateOffset EndStrategy from Atlas JSON', () => {
      const atlas = makeBaseCohort({
        EndStrategy: {
          DateOffset: { DateField: 'StartDate', Offset: 30 },
        },
      })
      const { internal } = roundTrip(atlas)
      expect(internal.exitCriteria).toBeDefined()
      expect(internal.exitCriteria?.strategy).toBe('FIXED_DURATION')
      expect(internal.exitCriteria?.dateField).toBe('START_DATE')
      expect(internal.exitCriteria?.offset).toBe(30)
    })

    it('round-trips DateOffset EndStrategy', () => {
      const atlas = makeBaseCohort({
        EndStrategy: {
          DateOffset: { DateField: 'EndDate', Offset: 0 },
        },
      })
      const { back } = roundTrip(atlas)
      expect(back.EndStrategy).toBeDefined()
      expect(back.EndStrategy?.DateOffset).toEqual({
        DateField: 'EndDate',
        Offset: 0,
      })
    })

    it('preserves DateOffset with Offset=0', () => {
      const atlas = makeBaseCohort({
        EndStrategy: {
          DateOffset: { DateField: 'StartDate', Offset: 0 },
        },
      })
      const { internal } = roundTrip(atlas)
      expect(internal.exitCriteria?.offset).toBe(0)
    })
  })

  describe('CustomEra strategy', () => {
    it('extracts CustomEra EndStrategy from Atlas JSON', () => {
      const atlas = makeBaseCohort({
        EndStrategy: {
          CustomEra: { DrugCodesetId: 0, GapDays: 30, Offset: 0 },
        },
      })
      const { internal } = roundTrip(atlas)
      expect(internal.exitCriteria).toBeDefined()
      expect(internal.exitCriteria?.strategy).toBe('CONTINUOUS_DRUG')
      expect(internal.exitCriteria?.conceptSet?.id).toBe(0)
      expect(internal.exitCriteria?.persistenceWindow).toBe(30)
      expect(internal.exitCriteria?.offset).toBe(0)
    })

    it('round-trips CustomEra EndStrategy', () => {
      const atlas = makeBaseCohort({
        EndStrategy: {
          CustomEra: { DrugCodesetId: 0, GapDays: 14, Offset: 7 },
        },
      })
      const { back } = roundTrip(atlas)
      expect(back.EndStrategy).toBeDefined()
      expect(back.EndStrategy?.CustomEra?.DrugCodesetId).toBe(0)
      expect(back.EndStrategy?.CustomEra?.GapDays).toBe(14)
      expect(back.EndStrategy?.CustomEra?.Offset).toBe(7)
    })
  })

  describe('with real fixtures', () => {
    const fixturesWithEndStrategy = [
      'cohort-condition-visittype-inclusionrules.json',
      'cohort-drug-complex-age-date-censor.json',
      'cohort-multi-condition-measurement-observation.json',
      'cohort-drug-censoring-endstrategy.json',
    ]

    fixturesWithEndStrategy.forEach(file => {
      it(`preserves EndStrategy in ${file}`, () => {
        const atlas = JSON.parse(readFileSync(join(DEMO_DIR, file), 'utf-8'))
        if (!atlas.EndStrategy) return

        const { internal, back } = roundTrip(atlas)
        expect(internal.exitCriteria).toBeDefined()
        expect(back.EndStrategy).toBeDefined()

        if (atlas.EndStrategy.DateOffset) {
          expect(back.EndStrategy?.DateOffset?.DateField).toBe(atlas.EndStrategy.DateOffset.DateField)
          expect(back.EndStrategy?.DateOffset?.Offset).toBe(atlas.EndStrategy.DateOffset.Offset)
        }
        if (atlas.EndStrategy.CustomEra) {
          expect(back.EndStrategy?.CustomEra?.DrugCodesetId).toBe(atlas.EndStrategy.CustomEra.DrugCodesetId)
          expect(back.EndStrategy?.CustomEra?.GapDays).toBe(atlas.EndStrategy.CustomEra.GapDays)
        }
      })
    })
  })

  it('omits EndStrategy when not present', () => {
    const atlas = makeBaseCohort()
    const { internal, back } = roundTrip(atlas)
    expect(internal.exitCriteria).toBeUndefined()
    expect(back.EndStrategy).toBeUndefined()
  })
})

// ─── Gap 2: PayerPlanPeriod Concept Fields ───────────────────────────────────

describe('Gap 2: PayerPlanPeriod Concept Fields', () => {
  function makePayerPlanCohort(fields: Record<string, unknown>) {
    return makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{ PayerPlanPeriod: { First: true, ...fields } }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
  }

  const conceptFields = [
    'PayerConcept', 'PlanConcept', 'SponsorConcept', 'StopReasonConcept',
    'PayerSourceConcept', 'PlanSourceConcept', 'SponsorSourceConcept', 'StopReasonSourceConcept',
  ]

  conceptFields.forEach(field => {
    const attrKey = field.charAt(0).toLowerCase() + field.slice(1)

    it(`extracts ${field} from PayerPlanPeriod`, () => {
      const atlas = makePayerPlanCohort({ [field]: 0 })
      const { internal } = roundTrip(atlas)
      const attr = internal.entryEvents?.[0]?.attributes?.find(
        (a: Record<string, unknown>) => a.attributeKey === attrKey
      )
      expect(attr).toBeDefined()
    })
  })
})

// ─── Gap 3: PeriodType/PeriodTypeCS for ObservationPeriod ────────────────────

describe('Gap 3: ObservationPeriod PeriodType', () => {
  it('extracts PeriodType concept array', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          ObservationPeriod: {
            PeriodType: [{ CONCEPT_ID: 44814724, CONCEPT_NAME: 'Period covering healthcare encounters' }],
            PeriodTypeExclude: false,
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
      ConceptSets: [],
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'periodType'
    )
    expect(attr).toBeDefined()
    expect((attr as Record<string, unknown>)?.type).toBe('concept')
  })

  it('extracts PeriodTypeCS concept set attribute', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          ObservationPeriod: {
            PeriodTypeCS: { CodesetId: 0, IsExclusion: false },
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'periodTypeCs'
    )
    expect(attr).toBeDefined()
    expect((attr as Record<string, unknown>)?.type).toBe('conceptSet')
  })
})

// ─── Gap 4: VisitDetailTypeCS ────────────────────────────────────────────────

describe('Gap 4: VisitDetailTypeCS', () => {
  it('extracts VisitDetailTypeCS from VisitDetail', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          VisitDetail: {
            VisitDetailTypeCS: { CodesetId: 0, IsExclusion: false },
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'visitDetailTypeCs'
    )
    expect(attr).toBeDefined()
    expect((attr as Record<string, unknown>)?.type).toBe('conceptSet')
  })
})

// ─── Gap 5: PlaceOfServiceLocation ──────────────────────────────────────────

describe('Gap 5: PlaceOfServiceLocation', () => {
  it('extracts PlaceOfServiceLocation (LocationRegion CodesetId)', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          VisitOccurrence: {
            CodesetId: 0,
            VisitTypeExclude: false,
            PlaceOfServiceLocation: 0,
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'placeOfServiceLocation'
    )
    expect(attr).toBeDefined()
  })
})

// ─── Gap 6: EndWindow on Correlated Criteria ────────────────────────────────

describe('Gap 6: EndWindow on Correlated Criteria', () => {
  it('extracts EndWindow from inclusion rule criteria', () => {
    const atlas = makeBaseCohort({
      InclusionRules: [{
        name: 'Test with EndWindow',
        expression: {
          Type: 'ALL',
          CriteriaList: [{
            Criteria: { ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } },
            StartWindow: {
              Start: { Days: 30, Coeff: -1 },
              End: { Days: 0, Coeff: 1 },
              UseIndexEnd: false,
              UseEventEnd: false,
            },
            EndWindow: {
              Start: { Days: 0, Coeff: -1 },
              End: { Days: 30, Coeff: 1 },
              UseIndexEnd: false,
              UseEventEnd: false,
            },
            Occurrence: { Type: 2, Count: 1, IsDistinct: false },
          }],
          DemographicCriteriaList: [],
          Groups: [],
        },
      }],
    })
    const { internal } = roundTrip(atlas)
    const rule = internal.inclusionRules?.[0]
    const event = rule?.criteriaGroups?.[0]?.events?.[0]
    expect(event?.temporalWindow).toBeDefined()
    expect(event?.endTemporalWindow).toBeDefined()
    expect(event?.endTemporalWindow?.endWindow?.days).toBe(30)
  })

  it('round-trips EndWindow through converter', () => {
    const atlas = makeBaseCohort({
      InclusionRules: [{
        name: 'EndWindow round-trip',
        expression: {
          Type: 'ALL',
          CriteriaList: [{
            Criteria: { ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } },
            StartWindow: {
              Start: { Days: 365, Coeff: -1 },
              End: { Days: 0, Coeff: 1 },
            },
            EndWindow: {
              Start: { Days: 0, Coeff: -1 },
              End: { Days: 90, Coeff: 1 },
            },
            Occurrence: { Type: 2, Count: 1, IsDistinct: false },
          }],
          DemographicCriteriaList: [],
          Groups: [],
        },
      }],
    })
    const { back } = roundTrip(atlas)
    const rtRule = (back as Record<string, unknown>).InclusionRules as Record<string, unknown>[]
    const rtCriteria = (rtRule?.[0] as Record<string, unknown>)?.expression as Record<string, unknown>
    const rtCriteriaList = rtCriteria?.CriteriaList as Record<string, unknown>[]
    const rtFirst = rtCriteriaList?.[0]

    expect(rtFirst?.EndWindow).toBeDefined()
    const ew = rtFirst?.EndWindow as Record<string, unknown>
    expect((ew?.End as Record<string, unknown>)?.Days).toBe(90)
  })

  it('omits EndWindow when not present', () => {
    const atlas = makeBaseCohort({
      InclusionRules: [{
        name: 'No EndWindow',
        expression: {
          Type: 'ALL',
          CriteriaList: [{
            Criteria: { ConditionOccurrence: { CodesetId: 0, ConditionTypeExclude: false } },
            StartWindow: {
              Start: { Days: 30, Coeff: -1 },
              End: { Days: 0, Coeff: 1 },
            },
            Occurrence: { Type: 2, Count: 1, IsDistinct: false },
          }],
          DemographicCriteriaList: [],
          Groups: [],
        },
      }],
    })
    const { internal } = roundTrip(atlas)
    const event = internal.inclusionRules?.[0]?.criteriaGroups?.[0]?.events?.[0]
    expect(event?.endTemporalWindow).toBeUndefined()
  })
})

// ─── Gap 7: LocationRegion StartDate/EndDate ────────────────────────────────

describe('Gap 7: LocationRegion Date Fields', () => {
  it('extracts StartDate from LocationRegion', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          LocationRegion: {
            CodesetId: 0,
            StartDate: { Value: '2020-01-01', Op: 'gte' },
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'startDate'
    )
    expect(attr).toBeDefined()
    expect((attr as Record<string, unknown>)?.type).toBe('dateRange')
    expect((attr as Record<string, unknown>)?.value).toBe('2020-01-01')
  })

  it('extracts EndDate from LocationRegion', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          LocationRegion: {
            CodesetId: 0,
            EndDate: { Value: '2023-12-31', Op: 'lte' },
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { internal } = roundTrip(atlas)
    const attr = internal.entryEvents?.[0]?.attributes?.find(
      (a: Record<string, unknown>) => a.attributeKey === 'endDate'
    )
    expect(attr).toBeDefined()
    expect((attr as Record<string, unknown>)?.value).toBe('2023-12-31')
  })

  it('round-trips LocationRegion with StartDate and EndDate', () => {
    const atlas = makeBaseCohort({
      PrimaryCriteria: {
        CriteriaList: [{
          LocationRegion: {
            CodesetId: 0,
            StartDate: { Value: '2020-01-01', Op: 'gte' },
            EndDate: { Value: '2023-12-31', Op: 'lte' },
          },
        }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
    })
    const { back } = roundTrip(atlas)
    const lr = (back.PrimaryCriteria?.CriteriaList?.[0] as Record<string, unknown>)
      ?.LocationRegion as Record<string, unknown>
    expect(lr?.StartDate).toBeDefined()
    expect(lr?.EndDate).toBeDefined()
  })
})

// ─── Real Fixture Validation ─────────────────────────────────────────────────

describe('All 31 fixtures still convert without errors after gap fixes', () => {
  const files = readdirSync(DEMO_DIR)
    .filter((f: string) => f.startsWith('cohort-') && f.endsWith('.json') && !f.includes('definitions'))
    .sort()

  files.forEach((file: string) => {
    it(file, () => {
      const atlas = JSON.parse(readFileSync(join(DEMO_DIR, file), 'utf-8'))
      expect(() => roundTrip(atlas)).not.toThrow()
    })
  })
})
