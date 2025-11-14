/**
 * Performance Tests: Large Cohort (T115-T116)
 *
 * Tests edge case with large cohorts (50 concept sets, 100 criteria, 20 rules)
 * Verifies performance remains acceptable even with complex cohort definitions
 */

import { describe, it, expect } from 'vitest'
import { convertInternalToAtlas, convertAtlasToInternal } from '@/services/atlas-converter'

const PERFORMANCE_TARGET_MS = 5000 // 5 seconds for large cohorts (more lenient)

/**
 * Generate a large cohort for stress testing
 * Edge case: 50 concept sets, 100 criteria, 20 rules
 */
function generateLargeCohort(): any {
  // Generate 50 concept sets
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

  // Generate 100 criteria (distributed across entry events and inclusion rules)
  const primaryCriteria = Array.from({ length: 20 }, (_, i) => ({
    ConditionOccurrence: {
      CodesetId: i % 50, // Rotate through concept sets
      ConditionTypeExclude: false,
      Age: i % 2 === 0 ? { Op: 'gte', Value: 18 } : undefined,
      Gender: i % 3 === 0 ? [{ CONCEPT_ID: 8507, CONCEPT_NAME: 'MALE' }] : undefined,
    },
  }))

  // Generate 20 inclusion rules with 4 criteria each = 80 more criteria
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

describe('Performance Tests - Large Cohort (Edge Case)', () => {
  it('T115: handles edge case with 50 concept sets, 100 criteria, 20 rules', () => {
    // Generate large cohort
    const largeCohort = generateLargeCohort()

    console.log(`\n[Performance] Large cohort structure:`)
    console.log(`  - Concept Sets: ${largeCohort.ConceptSets.length}`)
    console.log(`  - Primary Criteria: ${largeCohort.PrimaryCriteria.CriteriaList.length}`)
    console.log(`  - Inclusion Rules: ${largeCohort.InclusionRules.length}`)
    console.log(`  - Total Criteria: ~${largeCohort.PrimaryCriteria.CriteriaList.length + largeCohort.InclusionRules.length * 4}`)

    // Measure conversion: Atlas → Internal
    const startToInternal = performance.now()
    const internal = convertAtlasToInternal(largeCohort)
    const toInternalTime = performance.now() - startToInternal

    // Measure conversion: Internal → Atlas
    const startToAtlas = performance.now()
    const backToAtlas = convertInternalToAtlas({
      ...internal,
      name: 'Large Test Cohort',
      entryEvents: internal.entryEvents || [],
      qualifyingLimit: internal.qualifyingLimit || 'ALL',
      inclusionRules: internal.inclusionRules || [],
      conceptSets: internal.conceptSets || [],
    })
    const toAtlasTime = performance.now() - startToAtlas

    const totalTime = toInternalTime + toAtlasTime

    console.log(`\n[Performance] Large cohort conversion times:`)
    console.log(`  - Atlas → Internal: ${toInternalTime.toFixed(2)}ms`)
    console.log(`  - Internal → Atlas: ${toAtlasTime.toFixed(2)}ms`)
    console.log(`  - Total round-trip: ${totalTime.toFixed(2)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    // Verify conversions succeeded
    expect(internal).toBeDefined()
    expect(backToAtlas).toBeDefined()

    // Verify structure is preserved
    expect(backToAtlas.ConceptSets).toHaveLength(50)
    expect(backToAtlas.PrimaryCriteria.CriteriaList).toHaveLength(20)
    expect(backToAtlas.InclusionRules).toHaveLength(20)

    // Performance assertion
    expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('T116: verifies performance remains acceptable for large cohorts', () => {
    // Test multiple large cohorts to ensure consistent performance
    const numTests = 5
    const results: number[] = []

    for (let i = 0; i < numTests; i++) {
      const largeCohort = generateLargeCohort()

      const startTime = performance.now()

      // Full round-trip conversion
      const internal = convertAtlasToInternal(largeCohort)
      const backToAtlas = convertInternalToAtlas({
        ...internal,
        name: `Large Cohort ${i}`,
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      })

      const totalTime = performance.now() - startTime
      results.push(totalTime)

      // Each run should meet performance target
      expect(totalTime).toBeLessThan(PERFORMANCE_TARGET_MS)
    }

    // Calculate statistics
    const avgTime = results.reduce((a, b) => a + b, 0) / results.length
    const maxTime = Math.max(...results)
    const minTime = Math.min(...results)
    const stdDev = Math.sqrt(
      results.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / results.length
    )

    console.log(`\n[Performance] Large cohort statistics (${numTests} runs):`)
    console.log(`  - Average time: ${avgTime.toFixed(2)}ms`)
    console.log(`  - Min time: ${minTime.toFixed(2)}ms`)
    console.log(`  - Max time: ${maxTime.toFixed(2)}ms`)
    console.log(`  - Std deviation: ${stdDev.toFixed(2)}ms`)
    console.log(`  - Target: ${PERFORMANCE_TARGET_MS}ms`)

    // Verify average performance
    expect(avgTime).toBeLessThan(PERFORMANCE_TARGET_MS)

    // Verify consistency (std dev should be reasonable)
    // Allow up to 30% variation (performance tests can be variable)
    expect(stdDev).toBeLessThan(avgTime * 0.3)
  })

  it('measures memory usage for large cohorts', () => {
    // Measure memory impact of large cohort processing
    const largeCohort = generateLargeCohort()

    // Get initial memory if available
    const initialMemory = (performance as any).memory?.usedJSHeapSize

    // Convert multiple times to simulate repeated operations
    const iterations = 10
    const startTime = performance.now()

    for (let i = 0; i < iterations; i++) {
      const internal = convertAtlasToInternal(largeCohort)
      convertInternalToAtlas({
        ...internal,
        name: `Test ${i}`,
        entryEvents: internal.entryEvents || [],
        qualifyingLimit: internal.qualifyingLimit || 'ALL',
        inclusionRules: internal.inclusionRules || [],
        conceptSets: internal.conceptSets || [],
      })
    }

    const totalTime = performance.now() - startTime
    const avgTimePerIteration = totalTime / iterations

    const finalMemory = (performance as any).memory?.usedJSHeapSize
    const memoryIncrease = finalMemory && initialMemory ? finalMemory - initialMemory : null

    console.log(`\n[Performance] Memory and repeated operations:`)
    console.log(`  - Iterations: ${iterations}`)
    console.log(`  - Total time: ${totalTime.toFixed(2)}ms`)
    console.log(`  - Avg per iteration: ${avgTimePerIteration.toFixed(2)}ms`)
    if (memoryIncrease !== null) {
      console.log(`  - Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`)
    }

    // Each iteration should be reasonably fast
    expect(avgTimePerIteration).toBeLessThan(PERFORMANCE_TARGET_MS)
  })

  it('compares performance: simple vs large cohort', () => {
    // Generate simple and large cohorts
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

    // Measure simple cohort
    const simpleStart = performance.now()
    const simpleInternal = convertAtlasToInternal(simpleCohort)
    convertInternalToAtlas({
      ...simpleInternal,
      name: 'Simple',
      entryEvents: [],
      qualifyingLimit: 'ALL',
      inclusionRules: [],
      conceptSets: [],
    })
    const simpleTime = performance.now() - simpleStart

    // Measure large cohort
    const largeStart = performance.now()
    const largeInternal = convertAtlasToInternal(largeCohort)
    convertInternalToAtlas({
      ...largeInternal,
      name: 'Large',
      entryEvents: largeInternal.entryEvents || [],
      qualifyingLimit: 'ALL',
      inclusionRules: largeInternal.inclusionRules || [],
      conceptSets: largeInternal.conceptSets || [],
    })
    const largeTime = performance.now() - largeStart

    const performanceRatio = largeTime / simpleTime

    console.log(`\n[Performance] Comparison:`)
    console.log(`  - Simple cohort: ${simpleTime.toFixed(2)}ms`)
    console.log(`  - Large cohort: ${largeTime.toFixed(2)}ms`)
    console.log(`  - Performance ratio: ${performanceRatio.toFixed(2)}x`)

    // Both should meet targets
    expect(simpleTime).toBeLessThan(2000)
    expect(largeTime).toBeLessThan(PERFORMANCE_TARGET_MS)

    // Performance should scale reasonably (not exponentially)
    // With 50x more data, expect <100x slower performance
    expect(performanceRatio).toBeLessThan(100)
  })
})
