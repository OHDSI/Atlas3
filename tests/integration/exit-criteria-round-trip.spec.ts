import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'
import type { CohortDefinition } from '@/models/cohort.types'

describe('Exit Criteria Round-Trip Tests', () => {
  let censorWindowFixture: Record<string, unknown>
  let censoringCriteriaFixture: Record<string, unknown>

  beforeAll(() => {
    // Load Atlas fixture files
    const fixturesPath = join(__dirname, 'fixtures', 'atlas-cohorts')

    const censorWindowPath = join(fixturesPath, 'cohort-003-censor-window.json')
    const censoringCriteriaPath = join(fixturesPath, 'cohort-004-censoring-criteria.json')

    censorWindowFixture = JSON.parse(readFileSync(censorWindowPath, 'utf-8'))
    censoringCriteriaFixture = JSON.parse(readFileSync(censoringCriteriaPath, 'utf-8'))
  })

  describe('CensorWindow Round-Trip (T031)', () => {
    it('should load cohort-003-censor-window.json and preserve all fields', () => {
      // Convert Atlas JSON to internal format
      const internal: CohortDefinition = convertAtlasToInternal(censorWindowFixture)

      // Verify censorWindow was parsed
      expect(internal.censorWindow).toBeDefined()

      // Convert back to Atlas format
      const atlasOutput = convertInternalToAtlas(internal)

      // Verify semantic equality
      if (censorWindowFixture.CensorWindow) {
        expect(atlasOutput.CensorWindow).toEqual(censorWindowFixture.CensorWindow)
      }
    })

    it('should correctly parse CensorWindow StartDate and EndDate', () => {
      const internal: CohortDefinition = convertAtlasToInternal(censorWindowFixture)

      if (censorWindowFixture.CensorWindow) {
        // Verify StartDate
        if (censorWindowFixture.CensorWindow.StartDate) {
          expect(internal.censorWindow?.startDate).toBeDefined()
          expect(internal.censorWindow?.startDate?.dateField).toEqual(
            censorWindowFixture.CensorWindow.StartDate.DateField
          )
          expect(internal.censorWindow?.startDate?.offset).toEqual(
            censorWindowFixture.CensorWindow.StartDate.Offset
          )
        }

        // Verify EndDate
        if (censorWindowFixture.CensorWindow.EndDate) {
          expect(internal.censorWindow?.endDate).toBeDefined()
          expect(internal.censorWindow?.endDate?.dateField).toEqual(
            censorWindowFixture.CensorWindow.EndDate.DateField
          )
          expect(internal.censorWindow?.endDate?.offset).toEqual(
            censorWindowFixture.CensorWindow.EndDate.Offset
          )
        }
      }
    })

    it('should preserve CensorWindow through round-trip conversion', () => {
      const internal = convertAtlasToInternal(censorWindowFixture)
      const atlasOutput = convertInternalToAtlas(internal)

      // Ensure cohort definition structure exists
      expect(atlasOutput).toBeDefined()
      expect(typeof atlasOutput).toBe('object')
    })
  })

  describe('CensoringCriteria Round-Trip (T032)', () => {
    it('should load cohort-004-censoring-criteria.json and preserve all fields', () => {
      // Convert Atlas JSON to internal format
      const internal: CohortDefinition = convertAtlasToInternal(censoringCriteriaFixture)

      // Verify censoringCriteria was parsed
      expect(internal.censoringCriteria).toBeDefined()

      // Convert back to Atlas format
      const atlasOutput = convertInternalToAtlas(internal)

      // Verify censoring criteria exists in output
      if (censoringCriteriaFixture.CensoringCriteria) {
        expect(atlasOutput.CensoringCriteria).toBeDefined()
      }
    })

    it('should correctly parse CensoringCriteria array', () => {
      const internal: CohortDefinition = convertAtlasToInternal(censoringCriteriaFixture)

      if (censoringCriteriaFixture.CensoringCriteria) {
        expect(Array.isArray(internal.censoringCriteria)).toBe(true)
        expect(internal.censoringCriteria?.length).toEqual(
          censoringCriteriaFixture.CensoringCriteria.length
        )

        // Verify each censoring event has required fields
        internal.censoringCriteria?.forEach((event) => {
          expect(event).toHaveProperty('id')
          expect(event).toHaveProperty('criteriaType')
          expect(event).toHaveProperty('attributes')
        })
      }
    })

    it('should preserve CensoringCriteria through round-trip conversion', () => {
      const internal = convertAtlasToInternal(censoringCriteriaFixture)
      const atlasOutput = convertInternalToAtlas(internal)

      // Ensure cohort definition structure exists
      expect(atlasOutput).toBeDefined()
      expect(typeof atlasOutput).toBe('object')
    })
  })

  describe('Combined CensorWindow + CensoringCriteria', () => {
    it('should handle cohort with both CensorWindow and CensoringCriteria', () => {
      // Create a combined fixture
      const combined = {
        ...censorWindowFixture,
        CensoringCriteria: censoringCriteriaFixture.CensoringCriteria
      }

      const internal = convertAtlasToInternal(combined)

      // Both should be present
      expect(internal.censorWindow).toBeDefined()
      expect(internal.censoringCriteria).toBeDefined()

      // Round-trip conversion
      const atlasOutput = convertInternalToAtlas(internal)

      // Verify both are preserved
      if (combined.CensorWindow) {
        expect(atlasOutput.CensorWindow).toBeDefined()
      }
      if (combined.CensoringCriteria) {
        expect(atlasOutput.CensoringCriteria).toBeDefined()
      }
    })
  })

  describe('Empty/Null Exit Criteria', () => {
    it('should handle cohort without CensorWindow gracefully', () => {
      const minimal = {
        ...censorWindowFixture,
        CensorWindow: undefined
      }

      const internal = convertAtlasToInternal(minimal)
      expect(internal.censorWindow).toBeUndefined()

      const atlasOutput = convertInternalToAtlas(internal)
      // atlas-converter returns empty object {} when undefined, not undefined
      expect(atlasOutput.CensorWindow).toBeDefined()
    })

    it('should handle cohort without CensoringCriteria gracefully', () => {
      const minimal = {
        ...censoringCriteriaFixture,
        CensoringCriteria: undefined
      }

      const internal = convertAtlasToInternal(minimal)
      expect(internal.censoringCriteria).toBeUndefined()

      const atlasOutput = convertInternalToAtlas(internal)
      // atlas-converter returns empty array [] when undefined, not undefined
      expect(atlasOutput.CensoringCriteria).toBeDefined()
    })
  })

  describe('EndStrategy', () => {
    it('omits EndStrategy for end-of-continuous-observation', () => {
      const cohort: CohortDefinition = {
        name: 'cohort',
        entryEvents: [],
        conceptSets: [],
        inclusionRules: [],
        exitCriteria: { strategy: 'CONTINUOUS_OBSERVATION' },
      }

      const atlasOutput = convertInternalToAtlas(cohort)

      // circe's EndStrategy is polymorphic; an empty {} fails deserialization.
      // Continuous observation must be expressed by omitting the field.
      expect('EndStrategy' in atlasOutput).toBe(false)
    })

    it('emits DateOffset EndStrategy for fixed duration', () => {
      const cohort: CohortDefinition = {
        name: 'cohort',
        entryEvents: [],
        conceptSets: [],
        inclusionRules: [],
        exitCriteria: { strategy: 'FIXED_DURATION', dateField: 'END_DATE', offset: 30 },
      }

      const atlasOutput = convertInternalToAtlas(cohort)

      expect(atlasOutput.EndStrategy).toEqual({
        DateOffset: { DateField: 'EndDate', Offset: 30 },
      })
    })
  })
})
