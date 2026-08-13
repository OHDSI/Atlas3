/**
 * Performance Tests: Large Cohort (T115-T116)
 *
 * Stress-tests schema validation with a large cohort (50 concept sets, 100
 * criteria, 20 rules) to verify performance remains acceptable even for
 * complex cohort definitions. Measures CohortExpressionSchema.parse and
 * normalizeRawCohortDefinition, the boundary that replaced Atlas<->internal
 * conversion now that the editor's document is the circe/WebAPI payload
 * directly.
 */

import { describe, it, expect } from 'vitest'
import { CohortExpressionSchema } from '@/components/cohort-editor/circe.types'
import { normalizeRawCohortDefinition } from '@/services/cohort-definition.service'

// Large-cohort schema validation is still low-single-digit milliseconds in
// practice (observed under vitest: ~4-6ms average across repeated runs,
// ~8.5ms on the first, cold call). 75ms is roughly an order of magnitude
// above that cold-call worst case: tight enough to catch a real regression,
// loose enough to tolerate CI jitter.
const PERFORMANCE_TARGET_MS = 75

/**
 * Generate a large cohort for stress testing.
 * Edge case: 50 concept sets, 100 criteria, 20 rules.
 */
function generateLargeCohort(): Record<string, unknown> {
  const conceptSets = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    name: `Concept Set ${i}`,
    expression: {
      items: [
        {
          concept: {
            CONCEPT_ID: 201826 + i,
            CONCEPT_NAME: `Test Concept ${i}`,
            STANDARD_CONCEPT: 'S',
            DOMAIN_ID: 'Condition',
            VOCABULARY_ID: 'SNOMED',
          },
          isExcluded: false,
          includeDescendants: true,
          includeMapped: false,
        },
      ],
    },
  }))

  const primaryCriteria = Array.from({ length: 20 }, (_, i) => ({
    ConditionOccurrence: {
      CodesetId: i % 50,
      ConditionTypeExclude: false,
      Age: i % 2 === 0 ? { Op: 'gte', Value: 18 } : undefined,
      Gender: i % 3 === 0 ? [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }] : undefined,
    },
  }))

  const inclusionRules = Array.from({ length: 20 }, (_, i) => ({
    name: `Inclusion Rule ${i}`,
    description: `Rule description ${i}`,
    expression: {
      Type: 'ALL',
      CriteriaList: Array.from({ length: 4 }, (_, j) => ({
        Criteria: {
          ConditionOccurrence: {
            CodesetId: (i * 4 + j) % 50,
            ConditionTypeExclude: false,
          },
        },
        StartWindow: {
          Start: { Days: 0, Coeff: -1 },
          End: { Days: 0, Coeff: 1 },
          UseEventEnd: false,
        },
        Occurrence: {
          Type: 2,
          Count: 1,
          IsDistinct: false,
        },
      })),
    },
  }))

  return {
    expressionType: 'SIMPLE_EXPRESSION',
    cdmVersionRange: '>=5.0.0',
    ConceptSets: conceptSets,
    PrimaryCriteria: {
      CriteriaList: primaryCriteria,
      ObservationWindow: {
        PriorDays: 0,
        PostDays: 0,
      },
      PrimaryCriteriaLimit: {
        Type: 'First',
      },
    },
    QualifiedLimit: {
      Type: 'All',
    },
    ExpressionLimit: {
      Type: 'All',
    },
    CollapseSettings: {
      CollapseType: 'ERA',
      EraPad: 0,
    },
    CensorWindow: {},
    InclusionRules: inclusionRules,
    CensoringCriteria: [],
  }
}

function toRaw(atlasJson: unknown): { id: number; name: string; expression: string } {
  return { id: 1, name: 'Large Test Cohort', expression: JSON.stringify(atlasJson) }
}

describe('Performance Tests - Large Cohort (Edge Case)', () => {
  it('T115: handles edge case with 50 concept sets, 100 criteria, 20 rules', () => {
    const largeCohort = generateLargeCohort()
    const conceptSets = largeCohort.ConceptSets as unknown[]
    const primaryCriteria = largeCohort.PrimaryCriteria as { CriteriaList: unknown[] }
    const inclusionRules = largeCohort.InclusionRules as unknown[]

    console.log(`\n[Performance] Large cohort structure:`)
    console.log(`  - Concept Sets: ${conceptSets.length}`)
    console.log(`  - Primary Criteria: ${primaryCriteria.CriteriaList.length}`)
    console.log(`  - Inclusion Rules: ${inclusionRules.length}`)
    console.log(`  - Total Criteria: ~${primaryCriteria.CriteriaList.length + inclusionRules.length * 4}`)

    const startParse = performance.now()
    const parsed = CohortExpressionSchema.parse(largeCohort)
    const parseTime = performance.now() - startParse

    const startNormalize = performance.now()
    const normalized = normalizeRawCohortDefinition(toRaw(largeCohort))
    const normalizeTime = performance.now() - startNormalize

    console.log(`\n[Performance] Large cohort validation times:`)
    console.log(`  - CohortExpressionSchema.parse: ${parseTime.toFixed(3)}ms`)
    console.log(`  - normalizeRawCohortDefinition: ${normalizeTime.toFixed(3)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    expect(parsed).toBeDefined()
    expect(normalized).toBeDefined()

    // Verify structure is preserved through validation
    expect(parsed.ConceptSets).toHaveLength(50)
    expect(parsed.PrimaryCriteria?.CriteriaList).toHaveLength(20)
    expect(parsed.InclusionRules).toHaveLength(20)

    expect(parseTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    expect(normalizeTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('T116: verifies validation performance remains acceptable for large cohorts', () => {
    const numTests = 5
    const results: number[] = []

    // Warm up outside the measured set. The first normalize pays JIT and Zod
    // schema cold-start cost several times the steady-state figure, which as
    // one outlier among five samples skews every statistic below.
    for (let i = 0; i < 3; i++) {
      normalizeRawCohortDefinition(toRaw(generateLargeCohort()))
    }

    for (let i = 0; i < numTests; i++) {
      const largeCohort = generateLargeCohort()

      const startTime = performance.now()
      normalizeRawCohortDefinition(toRaw(largeCohort))
      const totalTime = performance.now() - startTime

      results.push(totalTime)
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    }

    const avgTime = results.reduce((a, b) => a + b, 0) / results.length
    const maxTime = Math.max(...results)
    const minTime = Math.min(...results)
    const stdDev = Math.sqrt(results.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / results.length)

    console.log(`\n[Performance] Large cohort statistics (${numTests} runs):`)
    console.log(`  - Average time: ${avgTime.toFixed(3)}ms`)
    console.log(`  - Min time: ${minTime.toFixed(3)}ms`)
    console.log(`  - Max time: ${maxTime.toFixed(3)}ms`)
    console.log(`  - Std deviation: ${stdDev.toFixed(3)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS)

    // Assert on the fastest sample rather than on the spread. A stdDev bound
    // detects no regression at all -- a uniform slowdown scales stdDev and
    // avgTime together, leaving the ratio flat -- while over five samples the
    // ratio is set by wherever a GC pause happens to land (measured 0.16-1.05
    // on this box, against a hard maximum of 2.0 for five samples). The
    // minimum, by contrast, is the sample least polluted by pauses, so it
    // tracks real cost: measured 2.7-3.7ms idle and 6.2-12.8ms with the suite
    // running in parallel.
    expect(minTime).toBeLessThan(PERFORMANCE_TARGET_MS / 2)
  })

  it('measures repeated validation of large cohorts', () => {
    const largeCohort = generateLargeCohort()
    const rawExpression = toRaw(largeCohort)

    const iterations = 10
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      normalizeRawCohortDefinition(rawExpression)
    }

    const totalTime = performance.now() - startTime
    const avgTimePerIteration = totalTime / iterations

    console.log(`\n[Performance] Repeated validation:`)
    console.log(`  - Iterations: ${iterations}`)
    console.log(`  - Total time: ${totalTime.toFixed(3)}ms`)
    console.log(`  - Avg per iteration: ${avgTimePerIteration.toFixed(3)}ms`)

    expect(avgTimePerIteration).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('compares performance: typical vs large cohort', () => {
    const simpleCohort = {
      expressionType: 'SIMPLE_EXPRESSION',
      cdmVersionRange: '>=5.0.0',
      ConceptSets: [
        {
          id: 0,
          name: 'Simple Concept Set',
          expression: { items: [] },
        },
      ],
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 0 } }],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'First' },
      },
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'All' },
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensorWindow: {},
      InclusionRules: [],
      CensoringCriteria: [],
    }

    const largeCohort = generateLargeCohort()
    const simpleRaw = toRaw(simpleCohort)
    const largeRaw = toRaw(largeCohort)

    // A single call is too small (sub-millisecond) for performance.now()'s
    // clock resolution to measure reliably, so the simple cohort is timed in
    // batches. Batches are kept short and repeated, and the *minimum*
    // per-iteration time wins: preemption and GC can only add time, so across
    // enough short windows at least one lands clean and the minimum estimates
    // intrinsic cost without the drift a mean picks up when the suite runs in
    // parallel.
    const simpleIterations = 100
    const largeIterations = 1
    const repetitions = 25

    for (let i = 0; i < 3; i++) {
      normalizeRawCohortDefinition(simpleRaw)
      normalizeRawCohortDefinition(largeRaw)
    }

    let simpleTime = Infinity
    let largeTime = Infinity
    for (let rep = 0; rep < repetitions; rep++) {
      const simpleRunStart = performance.now()
      for (let i = 0; i < simpleIterations; i++) normalizeRawCohortDefinition(simpleRaw)
      simpleTime = Math.min(simpleTime, (performance.now() - simpleRunStart) / simpleIterations)

      const largeRunStart = performance.now()
      for (let i = 0; i < largeIterations; i++) normalizeRawCohortDefinition(largeRaw)
      largeTime = Math.min(largeTime, (performance.now() - largeRunStart) / largeIterations)
    }

    const performanceRatio = largeTime / simpleTime

    console.log(`\n[Performance] Comparison:`)
    console.log(`  - Typical cohort: ${simpleTime.toFixed(3)}ms`)
    console.log(`  - Large cohort: ${largeTime.toFixed(3)}ms`)
    console.log(`  - Performance ratio: ${performanceRatio.toFixed(2)}x`)

    expect(simpleTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    expect(largeTime).toBeLessThan(PERFORMANCE_TARGET_MS)

    // The large fixture isn't just 50x the concept sets: each of its 100
    // criteria carries its own nested union-matched sub-schema (Occurrence,
    // StartWindow, etc.), so the schema has proportionally more to validate
    // per item too. Measured 228-248x idle and 215-399x with ten copies of
    // this file running at once; the bound sits 1.75x above that worst
    // parallel reading, which still leaves it an order of magnitude below the
    // thousands a quadratic blowup would produce.
    expect(performanceRatio).toBeLessThan(700)
  })
})
