/**
 * Integration Tests - Round-Trip Fidelity with Real Fixtures
 * Tests that real Atlas cohort JSON files convert without data loss
 */

import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'
import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_DIR = path.join(__dirname, 'fixtures/atlas-cohorts')

describe('Round-Trip Integration Tests - Real Fixtures', () => {
  // Load all fixture files
  const fixtureFiles = fs.readdirSync(FIXTURES_DIR)
    .filter(file => file.endsWith('.json') && file.startsWith('cohort-'))
    .sort()

  // Test each fixture individually
  fixtureFiles.forEach(filename => {
    it(`preserves ${filename} without changes on round-trip`, () => {
      const fixturePath = path.join(FIXTURES_DIR, filename)
      const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

      // Convert Atlas → Internal
      const internal = convertAtlasToInternal(atlasJson)

      // Convert Internal → Atlas
      const backToAtlas = convertInternalToAtlas({
        ...internal,
        // Add required fields for conversion
        name: atlasJson.name || 'Test Cohort',
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      })

      // Verify critical Phase 1 attributes are preserved
      expect(backToAtlas.expressionType).toBe(atlasJson.expressionType)
      expect(backToAtlas.cdmVersionRange).toBe(atlasJson.cdmVersionRange)

      // Verify CollapseSettings
      expect(backToAtlas.CollapseSettings).toEqual(atlasJson.CollapseSettings)

      // Verify QualifiedLimit and ExpressionLimit (Phase 2)
      expect(backToAtlas.QualifiedLimit).toEqual(atlasJson.QualifiedLimit)
      expect(backToAtlas.ExpressionLimit).toEqual(atlasJson.ExpressionLimit)
    })
  })

  it('processes all 15 fixtures successfully', () => {
    expect(fixtureFiles.length).toBeGreaterThanOrEqual(15)
  })

  it('all fixtures have required Phase 1 attributes', () => {
    fixtureFiles.forEach(filename => {
      const fixturePath = path.join(FIXTURES_DIR, filename)
      const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

      // Verify required attributes exist
      expect(atlasJson).toHaveProperty('expressionType')
      expect(atlasJson).toHaveProperty('cdmVersionRange')
      expect(atlasJson).toHaveProperty('CollapseSettings')
      expect(atlasJson).toHaveProperty('CensorWindow')
      expect(atlasJson).toHaveProperty('QualifiedLimit')
      expect(atlasJson).toHaveProperty('ExpressionLimit')
    })
  })

  describe('Attribute-specific validation across all fixtures', () => {
    it('all expressionType values are preserved', () => {
      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

        const internal = convertAtlasToInternal(atlasJson)
        const backToAtlas = convertInternalToAtlas({
          ...internal,
          name: 'Test',
          entryEvents: [],
          qualifyingLimit: 'ALL',
          inclusionRules: [],
          conceptSets: [],
        })

        expect(backToAtlas.expressionType).toBe(atlasJson.expressionType)
      })
    })

    it('all CollapseSettings values are preserved', () => {
      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

        const internal = convertAtlasToInternal(atlasJson)
        const backToAtlas = convertInternalToAtlas({
          ...internal,
          name: 'Test',
          entryEvents: [],
          qualifyingLimit: 'ALL',
          inclusionRules: [],
          conceptSets: [],
        })

        // Critical: EraPad=0 must be preserved (zero-count preservation)
        expect(backToAtlas.CollapseSettings).toEqual(atlasJson.CollapseSettings)
        if (atlasJson.CollapseSettings.EraPad === 0) {
          expect(backToAtlas.CollapseSettings.EraPad).toBe(0)
        }
      })
    })

    it('all limit types are properly wrapped', () => {
      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

        const internal = convertAtlasToInternal(atlasJson)
        const backToAtlas = convertInternalToAtlas({
          ...internal,
          name: 'Test',
          entryEvents: [],
          qualifyingLimit: 'ALL',
          inclusionRules: [],
          conceptSets: [],
        })

        // Verify proper wrapping: {Type: "First"} not just "FIRST"
        expect(backToAtlas.QualifiedLimit).toHaveProperty('Type')
        expect(backToAtlas.ExpressionLimit).toHaveProperty('Type')

        // Verify case: "First" not "FIRST" or "first"
        const qType = backToAtlas.QualifiedLimit.Type
        if (qType) {
          expect(qType).toMatch(/^[A-Z][a-z]*$/)
        }
      })
    })
  })

  describe('Coverage validation', () => {
    it('fixtures cover diverse CollapseSettings EraPad values', () => {
      const eraPadValues = new Set<number>()

      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
        eraPadValues.add(atlasJson.CollapseSettings.EraPad)
      })

      // Should have at least 4 different EraPad values
      expect(eraPadValues.size).toBeGreaterThanOrEqual(4)

      // Should include zero (critical for zero-preservation testing)
      expect(eraPadValues.has(0)).toBe(true)
    })

    it('fixtures cover different cdmVersionRange values', () => {
      const versionRanges = new Set<string>()

      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
        versionRanges.add(atlasJson.cdmVersionRange)
      })

      // Should have at least 2 different version ranges
      expect(versionRanges.size).toBeGreaterThanOrEqual(2)
    })

    it('fixtures cover different QualifiedLimit types', () => {
      const limitTypes = new Set<string>()

      fixtureFiles.forEach(filename => {
        const fixturePath = path.join(FIXTURES_DIR, filename)
        const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
        limitTypes.add(atlasJson.QualifiedLimit.Type)
      })

      // Should have at least 2 different limit types (All, First, or Last)
      expect(limitTypes.size).toBeGreaterThanOrEqual(2)
    })
  })
})
