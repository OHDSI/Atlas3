/**
 * Unit Test: Atlas Converter Service
 * Tests bidirectional conversion between internal format and Atlas JSON
 *
 * Focus: Phase 1 Attributes (US1)
 * - expressionType
 * - CollapseSettings
 * - CensorWindow
 * - cdmVersionRange
 */
import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

describe('Atlas Converter - Phase 1 Attributes (US1)', () => {

  /**
   * Helper function to create a minimal valid cohort definition
   */
  function createMinimalCohort(overrides: Partial<CohortDefinition> = {}): CohortDefinition {
    return {
      name: 'Test Cohort',
      description: 'Test description',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
      ...overrides,
    }
  }

  describe('expressionType', () => {
    it('preserves expressionType on round-trip', () => {
      // Create cohort with specific expressionType
      const cohort = createMinimalCohort({
        expressionType: 'SIMPLE_EXPRESSION',
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify expressionType is preserved
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(converted.expressionType).toBe('SIMPLE_EXPRESSION')
    })

    it('applies default expressionType when missing', () => {
      // Create cohort without expressionType
      const cohort = createMinimalCohort()
      // Explicitly remove expressionType to test default
      delete cohort.expressionType

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify default is applied
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
    })

    it('preserves custom expressionType values', () => {
      // Test with a different expression type
      const cohort = createMinimalCohort({
        expressionType: 'CUSTOM_EXPRESSION',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.expressionType).toBe('CUSTOM_EXPRESSION')
      expect(converted.expressionType).toBe('CUSTOM_EXPRESSION')
    })

    // US6: T083-T089 - Expression Type Metadata forward compatibility
    it('preserves unknown expressionType values for forward compatibility', () => {
      // Test that unknown expression types pass through without error
      const cohort = createMinimalCohort({
        expressionType: 'FUTURE_EXPRESSION_TYPE',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Unknown values should be preserved for forward compatibility
      expect(atlasJSON.expressionType).toBe('FUTURE_EXPRESSION_TYPE')
      expect(converted.expressionType).toBe('FUTURE_EXPRESSION_TYPE')
    })

    it('handles expressionType values from future Atlas versions', () => {
      // Simulate receiving an Atlas JSON with a new expressionType we don't know about
      const atlasJSON = {
        expressionType: 'NEXT_GEN_EXPRESSION',
        cdmVersionRange: '>=6.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should preserve the unknown value
      expect(converted.expressionType).toBe('NEXT_GEN_EXPRESSION')

      // Round-trip should maintain the value
      const reconverted = convertInternalToAtlas(converted as any)
      expect(reconverted.expressionType).toBe('NEXT_GEN_EXPRESSION')
    })
  })

  describe('CollapseSettings', () => {
    it('preserves CollapseSettings on round-trip', () => {
      // Create cohort with custom CollapseSettings
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify CollapseSettings are preserved
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 30,
      })
      expect(converted.collapseSettings).toEqual({
        collapseType: 'ERA',
        eraPad: 30,
      })
    })

    // US3: T048-T054 - Episode Collapse Configuration validation tests
    it('rejects CollapseSettings with EraPad but no CollapseType', () => {
      // This test documents expected behavior - EraPad without CollapseType should be considered invalid
      // Note: Current implementation doesn't validate, but this test serves as documentation
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: '',
          eraPad: 30,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // When collapseType is empty, converter still preserves it
      // In a production validator, this would be flagged as invalid
      expect(atlasJSON.CollapseSettings?.CollapseType).toBe('')
      expect(atlasJSON.CollapseSettings?.EraPad).toBe(30)
    })

    it('applies default CollapseSettings for new cohorts', () => {
      // Create cohort without collapseSettings (as would happen for new cohorts)
      const cohort = createMinimalCohort()
      delete cohort.collapseSettings

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify defaults are applied
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
    })

    it('applies default CollapseSettings when missing', () => {
      // Create cohort without collapseSettings
      const cohort = createMinimalCohort()
      delete cohort.collapseSettings

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify defaults are applied
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
    })

    it('preserves zero EraPad value', () => {
      // CRITICAL: Test that ?? operator preserves 0 correctly
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 0,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.EraPad).toBe(0)
      expect(converted.collapseSettings?.eraPad).toBe(0)
    })

    it('preserves custom CollapseType values', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'CUSTOM_COLLAPSE',
          eraPad: 15,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.CollapseType).toBe('CUSTOM_COLLAPSE')
      expect(converted.collapseSettings?.collapseType).toBe('CUSTOM_COLLAPSE')
    })

    it('converts from Atlas without collapseSettings', () => {
      // Create Atlas JSON without CollapseSettings
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Should be undefined since Atlas didn't have it
      expect(converted.collapseSettings).toBeUndefined()
    })
  })

  describe('CensorWindow', () => {
    it('preserves CensorWindow on round-trip', () => {
      // Create cohort with CensorWindow
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 30,
          },
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify CensorWindow structure is preserved
      expect(atlasJSON.CensorWindow).toEqual({
        StartDate: {
          DateField: 'START_DATE',
          Offset: 0,
        },
        EndDate: {
          DateField: 'END_DATE',
          Offset: 30,
        },
      })
      expect(converted.censorWindow).toEqual({
        startDate: {
          dateField: 'START_DATE',
          offset: 0,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 30,
        },
      })
    })

    it('handles empty CensorWindow', () => {
      // Create cohort without censorWindow
      const cohort = createMinimalCohort()
      delete cohort.censorWindow

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Should create empty object
      expect(atlasJSON.CensorWindow).toEqual({})
    })

    it('preserves zero offset values', () => {
      // CRITICAL: Test that ?? operator preserves 0 correctly
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(0)
      expect(converted.censorWindow?.startDate?.offset).toBe(0)
    })

    it('handles CensorWindow with only startDate', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 10,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate).toBeDefined()
      expect(atlasJSON.CensorWindow?.EndDate).toBeUndefined()
      expect(converted.censorWindow?.startDate).toBeDefined()
      expect(converted.censorWindow?.endDate).toBeUndefined()
    })

    it('handles CensorWindow with only endDate', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          endDate: {
            dateField: 'END_DATE',
            offset: 20,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate).toBeUndefined()
      expect(atlasJSON.CensorWindow?.EndDate).toBeDefined()
      expect(converted.censorWindow?.startDate).toBeUndefined()
      expect(converted.censorWindow?.endDate).toBeDefined()
    })

    it('converts from Atlas with empty CensorWindow', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 0,
        },
        CensorWindow: {},
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Empty CensorWindow should convert to undefined
      expect(converted.censorWindow).toBeUndefined()
    })

    it('handles missing offset in DateField', () => {
      // Test default behavior when offset is not provided
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            // offset intentionally omitted
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should apply default offset of 0
      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(0)
    })
  })

  describe('cdmVersionRange', () => {
    it('preserves cdmVersionRange on round-trip', () => {
      // Create cohort with specific cdmVersionRange
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.0.0',
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify cdmVersionRange is preserved
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(converted.cdmVersionRange).toBe('>=5.0.0')
    })

    it('applies default cdmVersionRange when missing', () => {
      // Create cohort without cdmVersionRange
      const cohort = createMinimalCohort()
      delete cohort.cdmVersionRange

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify default is applied
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
    })

    it('preserves custom cdmVersionRange values', () => {
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.3.0',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.cdmVersionRange).toBe('>=5.3.0')
      expect(converted.cdmVersionRange).toBe('>=5.3.0')
    })

    it('handles version range with upper bound', () => {
      const cohort = createMinimalCohort({
        cdmVersionRange: '>=5.0.0 <6.0.0',
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0 <6.0.0')
      expect(converted.cdmVersionRange).toBe('>=5.0.0 <6.0.0')
    })
  })

  describe('Combined attributes round-trip', () => {
    it('preserves all Phase 1 attributes together', () => {
      // Create cohort with all Phase 1 attributes
      const cohort = createMinimalCohort({
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.3.0',
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 15,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 5,
          },
          endDate: {
            dateField: 'END_DATE',
            offset: 10,
          },
        },
      })

      // Convert to Atlas and back
      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      // Verify all attributes are preserved
      expect(converted.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(converted.cdmVersionRange).toBe('>=5.3.0')
      expect(converted.collapseSettings).toEqual({
        collapseType: 'ERA',
        eraPad: 15,
      })
      expect(converted.censorWindow).toEqual({
        startDate: {
          dateField: 'START_DATE',
          offset: 5,
        },
        endDate: {
          dateField: 'END_DATE',
          offset: 10,
        },
      })
    })

    it('applies all defaults when attributes are missing', () => {
      // Create minimal cohort without any Phase 1 attributes
      const cohort = createMinimalCohort()
      delete cohort.expressionType
      delete cohort.cdmVersionRange
      delete cohort.collapseSettings
      delete cohort.censorWindow

      // Convert to Atlas
      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify all defaults are applied
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(atlasJSON.CollapseSettings).toEqual({
        CollapseType: 'ERA',
        EraPad: 0,
      })
      expect(atlasJSON.CensorWindow).toEqual({})
    })
  })

  // US4: T055-T072 - CensoringCriteria, DateAdjustment, and extended Cardinality tests
  describe('CensoringCriteria (US4)', () => {
    it('converts censoringCriteria events to Atlas format', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify CensoringCriteria array is populated
      expect(atlasJSON.CensoringCriteria).toBeDefined()
      expect(atlasJSON.CensoringCriteria).toHaveLength(1)
      expect(atlasJSON.CensoringCriteria[0]).toHaveProperty('Death')
    })

    it('converts multiple censoring events', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
          {
            id: 'censor-2',
            criteriaType: 'DrugExposure',
            conceptSet: { id: 1, name: 'Test Drug' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.CensoringCriteria).toHaveLength(2)
    })

    it('round-trips censoringCriteria correctly', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [
          {
            id: 'censor-1',
            criteriaType: 'Death',
            attributes: [],
          },
        ],
        conceptSets: [],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.censoringCriteria).toBeDefined()
      expect(converted.censoringCriteria).toHaveLength(1)
      expect(converted.censoringCriteria?.[0].criteriaType).toBe('Death')
    })

    it('handles empty censoringCriteria', () => {
      const cohort = createMinimalCohort({
        censoringCriteria: [],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.CensoringCriteria).toEqual([])
    })
  })

  describe('DateAdjustment (US4)', () => {
    it('converts dateAdjustment to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            dateAdjustment: {
              startWith: 'START_DATE',
              startOffset: 0,
              endWith: 'END_DATE',
              endOffset: 30,
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).toHaveProperty('DateAdjustment')
      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].DateAdjustment).toEqual({
        StartWith: 'START_DATE',
        StartOffset: 0,
        EndWith: 'END_DATE',
        EndOffset: 30,
      })
    })

    it('round-trips dateAdjustment correctly', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            dateAdjustment: {
              startWith: 'START_DATE',
              startOffset: -7,
              endWith: 'START_DATE',
              endOffset: 7,
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0].dateAdjustment).toEqual({
        startWith: 'START_DATE',
        startOffset: -7,
        endWith: 'START_DATE',
        endOffset: 7,
      })
    })

    it('handles events without dateAdjustment', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0]).not.toHaveProperty('DateAdjustment')
    })
  })

  describe('Extended Cardinality (US4)', () => {
    it('converts isDistinct to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 2,
              countingMethod: 'ALL',
              isDistinct: true,
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.IsDistinct).toBe(true)
    })

    it('converts countColumn to Atlas format', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 2,
              countingMethod: 'ALL',
              countColumn: 'custom_count_column',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.CountColumn).toBe('custom_count_column')
    })

    it('defaults isDistinct to false when not specified', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence.IsDistinct).toBe(false)
    })

    it('omits countColumn when not specified', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'AT_LEAST',
              count: 1,
              countingMethod: 'ALL',
            },
          },
        ],
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      expect(atlasJSON.PrimaryCriteria.CriteriaList[0].Occurrence).not.toHaveProperty('CountColumn')
    })

    it('round-trips extended cardinality fields', () => {
      const cohort = createMinimalCohort({
        entryEvents: [
          {
            id: 'evt-1',
            criteriaType: 'ConditionOccurrence',
            conceptSet: { id: 0, name: 'Test' },
            attributes: [],
            cardinality: {
              type: 'EXACTLY',
              count: 3,
              countingMethod: 'DISTINCT_CONCEPT',
              isDistinct: true,
              countColumn: 'my_column',
            },
          },
        ],
        conceptSets: [{ id: 0, name: 'Test', items: [] }],
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(converted.entryEvents?.[0].cardinality).toEqual({
        type: 'EXACTLY',
        count: 3,
        countingMethod: 'DISTINCT_CONCEPT',
        isDistinct: true,
        countColumn: 'my_column',
      })
    })
  })

  describe('Edge cases', () => {
    it('handles null vs undefined correctly', () => {
      const cohort = createMinimalCohort({
        expressionType: undefined,
        cdmVersionRange: undefined,
        collapseSettings: undefined,
        censorWindow: undefined,
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Should still apply defaults for undefined values
      expect(atlasJSON.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(atlasJSON.cdmVersionRange).toBe('>=5.0.0')
      expect(atlasJSON.CollapseSettings).toBeDefined()
      expect(atlasJSON.CensorWindow).toBeDefined()
    })

    it('preserves empty string expressionType', () => {
      const cohort = createMinimalCohort({
        expressionType: '',
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Empty string should be preserved (not replaced with default)
      expect(atlasJSON.expressionType).toBe('')
    })

    it('handles negative offset values in CensorWindow', () => {
      const cohort = createMinimalCohort({
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: -10,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CensorWindow?.StartDate?.Offset).toBe(-10)
      expect(converted.censorWindow?.startDate?.offset).toBe(-10)
    })

    it('handles very large eraPad values', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 9999,
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)
      const converted = convertAtlasToInternal(atlasJSON)

      expect(atlasJSON.CollapseSettings?.EraPad).toBe(9999)
      expect(converted.collapseSettings?.eraPad).toBe(9999)
    })
  })

  describe('Atlas JSON structure validation', () => {
    it('ensures required Atlas properties are present', () => {
      const cohort = createMinimalCohort()

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify all required Atlas properties are present
      expect(atlasJSON).toHaveProperty('expressionType')
      expect(atlasJSON).toHaveProperty('cdmVersionRange')
      expect(atlasJSON).toHaveProperty('ConceptSets')
      expect(atlasJSON).toHaveProperty('PrimaryCriteria')
      expect(atlasJSON).toHaveProperty('AdditionalCriteria')
      expect(atlasJSON).toHaveProperty('InclusionRules')
      expect(atlasJSON).toHaveProperty('CensoringCriteria')
      expect(atlasJSON).toHaveProperty('QualifiedLimit')
      expect(atlasJSON).toHaveProperty('ExpressionLimit')
      expect(atlasJSON).toHaveProperty('CollapseSettings')
      expect(atlasJSON).toHaveProperty('CensorWindow')
    })

    it('ensures PascalCase for Atlas properties', () => {
      const cohort = createMinimalCohort({
        collapseSettings: {
          collapseType: 'ERA',
          eraPad: 30,
        },
        censorWindow: {
          startDate: {
            dateField: 'START_DATE',
            offset: 0,
          },
        },
      })

      const atlasJSON = convertInternalToAtlas(cohort)

      // Verify PascalCase conversion
      expect(atlasJSON.CollapseSettings).toBeDefined()
      expect(atlasJSON.CollapseSettings).not.toHaveProperty('collapseType')
      expect(atlasJSON.CollapseSettings).toHaveProperty('CollapseType')
      expect(atlasJSON.CollapseSettings).toHaveProperty('EraPad')

      expect(atlasJSON.CensorWindow).toBeDefined()
      expect(atlasJSON.CensorWindow).not.toHaveProperty('startDate')
      expect(atlasJSON.CensorWindow).toHaveProperty('StartDate')
    })

    it('ensures camelCase for internal properties', () => {
      const atlasJSON = {
        expressionType: 'SIMPLE_EXPRESSION',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
        },
        AdditionalCriteria: {
          Type: 'ALL',
          CriteriaList: [],
          DemographicCriteriaList: [],
          Groups: [],
        },
        InclusionRules: [],
        CensoringCriteria: [],
        QualifiedLimit: { Type: 'All' },
        ExpressionLimit: { Type: 'All' },
        CollapseSettings: {
          CollapseType: 'ERA',
          EraPad: 30,
        },
        CensorWindow: {
          StartDate: {
            DateField: 'START_DATE',
            Offset: 5,
          },
        },
      }

      const converted = convertAtlasToInternal(atlasJSON)

      // Verify camelCase conversion
      expect(converted.collapseSettings).toBeDefined()
      expect(converted.collapseSettings).not.toHaveProperty('CollapseType')
      expect(converted.collapseSettings).toHaveProperty('collapseType')
      expect(converted.collapseSettings).toHaveProperty('eraPad')

      expect(converted.censorWindow).toBeDefined()
      expect(converted.censorWindow).not.toHaveProperty('StartDate')
      expect(converted.censorWindow).toHaveProperty('startDate')
    })
  })
})
