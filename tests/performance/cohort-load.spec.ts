/**
 * Performance Tests: Cohort Load (T113-T114)
 *
 * Measures load time for typical cohorts and verifies performance targets
 * Target: Load/save should complete within 2 seconds for typical cohorts
 */

import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'
import * as fs from 'fs'
import * as path from 'path'

const FIXTURES_DIR = path.join(__dirname, '../integration/fixtures/atlas-cohorts')
const PERFORMANCE_TARGET_MS = 2000 // 2 seconds

describe('Performance Tests - Typical Cohort Load', () => {
  it('T113: measures load time for typical cohort', () => {
    // Load a typical cohort fixture (<10 rules, <20 criteria)
    const fixturePath = path.join(FIXTURES_DIR, 'cohort-001-simple.json')
    const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

    // Measure conversion time: Atlas → Internal
    const startConvertToInternal = performance.now()
    const internal = convertAtlasToInternal(atlasJson)
    const convertToInternalTime = performance.now() - startConvertToInternal

    // Measure conversion time: Internal → Atlas
    const startConvertToAtlas = performance.now()
    const backToAtlas = convertInternalToAtlas({
      ...internal,
      name: 'Test Cohort',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    })
    const convertToAtlasTime = performance.now() - startConvertToAtlas

    const totalTime = convertToInternalTime + convertToAtlasTime

    console.log(`\n[Performance] Typical cohort conversion times:`)
    console.log(`  - Atlas → Internal: ${convertToInternalTime.toFixed(2)}ms`)
    console.log(`  - Internal → Atlas: ${convertToAtlasTime.toFixed(2)}ms`)
    console.log(`  - Total round-trip: ${totalTime.toFixed(2)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    // Verify internal structure is valid
    expect(internal).toBeDefined()
    expect(backToAtlas).toBeDefined()

    // Performance assertion: Total time should be well under target
    // Using a more lenient threshold for unit tests (should be <100ms typically)
    expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('T114: verifies load/save completes within 2 seconds', () => {
    // Test with multiple typical cohorts to ensure consistent performance
    const fixtureFiles = fs.readdirSync(FIXTURES_DIR)
      .filter(file => file.endsWith('.json') && file.startsWith('cohort-'))
      .slice(0, 5) // Test first 5 cohorts

    const results: Array<{ filename: string; time: number }> = []

    fixtureFiles.forEach(filename => {
      const fixturePath = path.join(FIXTURES_DIR, filename)
      const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

      const startTime = performance.now()

      // Simulate load: Atlas → Internal
      const internal = convertAtlasToInternal(atlasJson)

      // Simulate save: Internal → Atlas
      const backToAtlas = convertInternalToAtlas({
        ...internal,
        name: atlasJson.name || 'Test Cohort',
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      })

      const totalTime = performance.now() - startTime
      results.push({ filename, time: totalTime })

      // Each individual cohort should meet performance target
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    })

    // Calculate statistics
    const times = results.map(r => r.time)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)

    console.log(`\n[Performance] Multiple cohorts statistics:`)
    console.log(`  - Cohorts tested: ${results.length}`)
    console.log(`  - Average time: ${avgTime.toFixed(2)}ms`)
    console.log(`  - Min time: ${minTime.toFixed(2)}ms`)
    console.log(`  - Max time: ${maxTime.toFixed(2)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    // Verify average performance is good
    expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('measures performance breakdown by operation', () => {
    // Detailed performance breakdown for optimization insights
    const fixturePath = path.join(FIXTURES_DIR, 'cohort-001-simple.json')
    const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

    // Measure individual operations
    const metrics: Record<string, number> = {}

    // 1. JSON parse (already done, but simulate)
    const parseStart = performance.now()
    JSON.parse(JSON.stringify(atlasJson))
    metrics.jsonParse = performance.now() - parseStart

    // 2. Atlas → Internal conversion
    const toInternalStart = performance.now()
    const internal = convertAtlasToInternal(atlasJson)
    metrics.toInternal = performance.now() - toInternalStart

    // 3. Internal → Atlas conversion
    const toAtlasStart = performance.now()
    const backToAtlas = convertInternalToAtlas({
      ...internal,
      name: 'Test',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
    })
    metrics.toAtlas = performance.now() - toAtlasStart

    // 4. JSON stringify
    const stringifyStart = performance.now()
    JSON.stringify(backToAtlas)
    metrics.jsonStringify = performance.now() - stringifyStart

    console.log(`\n[Performance] Operation breakdown:`)
    Object.entries(metrics).forEach(([operation, time]) => {
      console.log(`  - ${operation}: ${time.toFixed(2)}ms`)
    })

    // Total should be reasonable
    const total = Object.values(metrics).reduce((a, b) => a + b, 0)
    console.log(`  - Total: ${total.toFixed(2)}ms`)

    expect(total).toBeLessThan(PERFORMANCE_TARGET_MS)
  })
})
