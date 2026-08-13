/**
 * Performance Tests: Cohort Load (T113-T114)
 *
 * Measures how long it takes to bring a cohort's circe expression into the
 * editor for a typical cohort: parsing against CohortExpressionSchema, and
 * running normalizeRawCohortDefinition (the function the app actually calls
 * on load, which JSON.parses the WebAPI `expression` string and then
 * validates it against the schema).
 *
 * There is no Atlas <-> internal conversion any more: in the circe-native
 * model the editor's document is the WebAPI payload, so schema validation is
 * the whole cost of "loading" a cohort.
 */

import { describe, it, expect } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { CohortExpressionSchema } from '@/components/cohort-editor/circe.types'
import { normalizeRawCohortDefinition } from '@/services/cohort-definition.service'

const FIXTURES_DIR = path.join(__dirname, '../integration/fixtures/atlas-cohorts')

// Schema validation of a typical cohort is sub-millisecond once the schema
// module is warm (observed under vitest: ~0.1-0.2ms per call, ~0.9ms on the
// very first, cold call). 25ms is roughly an order of magnitude above that
// cold-call worst case: tight enough to catch a real regression (e.g. an
// accidentally quadratic schema refinement) without being so lenient it
// never fires.
const PERFORMANCE_TARGET_MS = 25

function toRaw(atlasJson: unknown): { id: number; name: string; expression: string } {
  return { id: 1, name: 'Test Cohort', expression: JSON.stringify(atlasJson) }
}

describe('Performance Tests - Typical Cohort Load', () => {
  it('T113: measures schema-validation time for typical cohort', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'cohort-001-simple.json')
    const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

    const startParse = performance.now()
    const parsed = CohortExpressionSchema.parse(atlasJson)
    const parseTime = performance.now() - startParse

    const startNormalize = performance.now()
    const normalized = normalizeRawCohortDefinition(toRaw(atlasJson))
    const normalizeTime = performance.now() - startNormalize

    console.log(`\n[Performance] Typical cohort load times:`)
    console.log(`  - CohortExpressionSchema.parse: ${parseTime.toFixed(3)}ms`)
    console.log(`  - normalizeRawCohortDefinition: ${normalizeTime.toFixed(3)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    expect(parsed).toBeDefined()
    expect(normalized).toBeDefined()

    expect(parseTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    expect(normalizeTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('T114: verifies load completes well within target for a batch of typical cohorts', () => {
    const fixtureFiles = fs
      .readdirSync(FIXTURES_DIR)
      .filter((file) => file.endsWith('.json') && file.startsWith('cohort-'))
      .slice(0, 5)

    const results: Array<{ filename: string; time: number }> = []

    fixtureFiles.forEach((filename) => {
      const fixturePath = path.join(FIXTURES_DIR, filename)
      const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))

      const startTime = performance.now()
      normalizeRawCohortDefinition(toRaw(atlasJson))
      const totalTime = performance.now() - startTime

      results.push({ filename, time: totalTime })
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    })

    const times = results.map((r) => r.time)
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length
    const maxTime = Math.max(...times)
    const minTime = Math.min(...times)

    console.log(`\n[Performance] Multiple cohorts statistics:`)
    console.log(`  - Cohorts tested: ${results.length}`)
    console.log(`  - Average time: ${avgTime.toFixed(3)}ms`)
    console.log(`  - Min time: ${minTime.toFixed(3)}ms`)
    console.log(`  - Max time: ${maxTime.toFixed(3)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('measures performance breakdown by operation', () => {
    const fixturePath = path.join(FIXTURES_DIR, 'cohort-001-simple.json')
    const atlasJson = JSON.parse(fs.readFileSync(fixturePath, 'utf-8'))
    const rawExpression = JSON.stringify(atlasJson)

    const metrics: Record<string, number> = {}

    const jsonParseStart = performance.now()
    const reParsed = JSON.parse(rawExpression)
    metrics.jsonParse = performance.now() - jsonParseStart

    const schemaParseStart = performance.now()
    const parsed = CohortExpressionSchema.parse(reParsed)
    metrics.schemaParse = performance.now() - schemaParseStart

    const jsonStringifyStart = performance.now()
    JSON.stringify(parsed)
    metrics.jsonStringify = performance.now() - jsonStringifyStart

    console.log(`\n[Performance] Operation breakdown:`)
    Object.entries(metrics).forEach(([operation, time]) => {
      console.log(`  - ${operation}: ${time.toFixed(3)}ms`)
    })

    const total = Object.values(metrics).reduce((a, b) => a + b, 0)
    console.log(`  - Total: ${total.toFixed(3)}ms`)

    expect(total).toBeLessThan(PERFORMANCE_TARGET_MS)
  })
})
