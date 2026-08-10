/**
 * Integration Tests - Atlas Demo Analysis Type Compatibility
 *
 * Tests that pathway, incidence rate, characterization, and feature analysis
 * data from atlas-demo.ohdsi.org validates correctly against Atlas3 Zod schemas.
 * This ensures format compatibility between Atlas3 and Atlas 2.x.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { PathwaySchema } from '@/models/pathway.types'
import {
  IncidenceRateExpressionSchema,
  IncidenceRateWireSchema,
  StudyWindowSchema,
  StratifyRuleSchema,
} from '@/models/incidence-rate.types'
import {
  CharacterizationDefinitionSchema,
  CharacterizationListItemSchema,
} from '@/models/characterization.types'
import {
  FeatureAnalysisSchema,
  FeatureAnalysisListItemSchema,
} from '@/models/feature-analysis.types'

const DEMO_DIR = join(__dirname, '..', 'e2e', 'fixtures', 'atlas-demo')

function loadJSON(filename: string): unknown {
  return JSON.parse(readFileSync(join(DEMO_DIR, filename), 'utf-8'))
}

// ─── Pathway Tests ───────────────────────────────────────────────────────────

describe('Pathway Format Compatibility', () => {
  const pathways = loadJSON('pathways.json') as Record<string, unknown>[]

  it(`validates all ${pathways.length} pathways against PathwaySchema`, () => {
    for (const pathway of pathways) {
      const result = PathwaySchema.passthrough().safeParse(pathway)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `PathwaySchema failed for "${pathway.name}":\n${issues.join('\n')}`
        )
      }
    }
  })

  pathways.forEach((pathway) => {
    const name = (pathway.name as string) || 'unnamed'

    it(`"${name}" has valid structural fields`, () => {
      expect(pathway).toHaveProperty('name')
      expect(pathway).toHaveProperty('targetCohorts')
      expect(pathway).toHaveProperty('eventCohorts')
      expect(Array.isArray(pathway.targetCohorts)).toBe(true)
      expect(Array.isArray(pathway.eventCohorts)).toBe(true)

      const targets = pathway.targetCohorts as Record<string, unknown>[]
      const events = pathway.eventCohorts as Record<string, unknown>[]
      for (const tc of targets) {
        expect(typeof tc.id).toBe('number')
        expect(typeof tc.name).toBe('string')
      }
      for (const ec of events) {
        expect(typeof ec.id).toBe('number')
        expect(typeof ec.name).toBe('string')
      }
    })
  })
})

describe('Pathway Edge Cases', () => {
  const pathways = loadJSON('pathways.json') as Record<string, unknown>[]

  it('pathway with combinationWindow=0 validates', () => {
    const pw = pathways.find(p => (p.combinationWindow as number) === 0)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with minCellCount=0 validates', () => {
    const pw = pathways.find(p => (p.minCellCount as number) === 0)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with multiple event cohorts validates', () => {
    const pw = pathways.find(p => (p.eventCohorts as unknown[])?.length > 1)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with many event cohorts (>3) validates', () => {
    const pw = pathways.find(p => (p.eventCohorts as unknown[])?.length > 3)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with allowRepeats=true validates', () => {
    const pw = pathways.find(p => p.allowRepeats === true)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with maxDepth != 5 validates', () => {
    const pw = pathways.find(p => (p.maxDepth as number) !== 5)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathway with large combinationWindow validates', () => {
    const pw = pathways.find(p => (p.combinationWindow as number) > 100)
    expect(pw).toBeDefined()
    const result = PathwaySchema.passthrough().safeParse(pw)
    expect(result.success).toBe(true)
  })

  it('pathways cover diverse combinationWindow values', () => {
    const values = new Set(pathways.map(p => p.combinationWindow as number))
    expect(values.size).toBeGreaterThanOrEqual(3)
  })

  it('pathways cover diverse event cohort counts', () => {
    const counts = new Set(pathways.map(p => (p.eventCohorts as unknown[])?.length))
    expect(counts.size).toBeGreaterThanOrEqual(2)
  })
})

// ─── Incidence Rate Tests ────────────────────────────────────────────────────

describe('Incidence Rate Format Compatibility', () => {
  const irs = loadJSON('incidence-rates.json') as Record<string, unknown>[]

  it(`validates all ${irs.length} IR expressions against schema`, () => {
    for (const ir of irs) {
      const expression = ir.expression as Record<string, unknown>
      const result = IncidenceRateExpressionSchema.safeParse(expression)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `IR "${ir.name}" expression validation failed:\n${issues.join('\n')}`
        )
      }
    }
  })

  it(`validates all ${irs.length} IRs as wire format`, () => {
    for (const ir of irs) {
      const wireForm = { ...ir, expression: JSON.stringify(ir.expression) }
      const result = IncidenceRateWireSchema.safeParse(wireForm)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `IR "${ir.name}" wire validation failed:\n${issues.join('\n')}`
        )
      }
    }
  })

  irs.forEach((ir) => {
    const name = (ir.name as string) || 'unnamed'

    it(`"${name}" has valid expression structure`, () => {
      const expr = ir.expression as Record<string, unknown>
      expect(expr).toHaveProperty('targetIds')
      expect(expr).toHaveProperty('outcomeIds')
      expect(expr).toHaveProperty('timeAtRisk')
      expect(Array.isArray(expr.targetIds)).toBe(true)
      expect(Array.isArray(expr.outcomeIds)).toBe(true)

      const tar = expr.timeAtRisk as Record<string, unknown>
      const start = tar.start as Record<string, unknown>
      const end = tar.end as Record<string, unknown>
      expect(['StartDate', 'EndDate']).toContain(start.DateField)
      expect(['StartDate', 'EndDate']).toContain(end.DateField)
      expect(typeof start.Offset).toBe('number')
      expect(typeof end.Offset).toBe('number')
    })
  })
})

describe('Incidence Rate Edge Cases', () => {
  const irs = loadJSON('incidence-rates.json') as Record<string, unknown>[]

  it('IR with studyWindow dates validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return expr.studyWindow && expr.studyWindow !== null
    })
    expect(ir).toBeDefined()
    const expr = ir!.expression as Record<string, unknown>
    const sw = expr.studyWindow as Record<string, unknown>
    expect(typeof sw.startDate).toBe('string')
    expect(typeof sw.endDate).toBe('string')
    const result = StudyWindowSchema.safeParse(sw)
    expect(result.success).toBe(true)
  })

  it('IR with null studyWindow validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return expr.studyWindow === null
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with empty outcomeIds validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.outcomeIds as number[])?.length === 0
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with strata containing null description validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.strata as Record<string, unknown>[])?.some(s => s.description === null)
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with multiple targets (>3) validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.targetIds as number[])?.length > 3
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with multiple outcomes (>3) validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.outcomeIds as number[])?.length > 3
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with many strata (>3) validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.strata as unknown[])?.length > 3
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with strata containing criteria validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.strata as Record<string, unknown>[])?.some(s => {
        const sExpr = s.expression as Record<string, unknown>
        return sExpr && (
          (sExpr.CriteriaList as unknown[])?.length > 0 ||
          (sExpr.DemographicCriteriaList as unknown[])?.length > 0
        )
      })
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
    const expr = ir!.expression as Record<string, unknown>
    const strata = expr.strata as Record<string, unknown>[]
    expect(strata.length).toBeGreaterThan(0)
    for (const s of strata) {
      const strataResult = StratifyRuleSchema.safeParse(s)
      expect(strataResult.success).toBe(true)
    }
  })

  it('IR with ConceptSets validates', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.ConceptSets as unknown[])?.length > 0
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    expect(result.success).toBe(true)
  })

  it('IR with inline targetCohorts preserves them via passthrough', () => {
    const ir = irs.find(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.targetCohorts as unknown[])?.length > 0
    })
    expect(ir).toBeDefined()
    const result = IncidenceRateExpressionSchema.safeParse(ir!.expression)
    if (!result.success) {
      expect.fail(`expected IR expression to parse but got: ${JSON.stringify(result.error.issues)}`)
    }
    expect((result.data as Record<string, unknown>).targetCohorts).toBeDefined()
  })

  it('IRs cover diverse target counts', () => {
    const counts = new Set(irs.map(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.targetIds as number[])?.length
    }))
    expect(counts.size).toBeGreaterThanOrEqual(3)
  })

  it('IRs cover diverse outcome counts', () => {
    const counts = new Set(irs.map(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.outcomeIds as number[])?.length
    }))
    expect(counts.size).toBeGreaterThanOrEqual(3)
  })

  it('IRs cover diverse strata counts', () => {
    const counts = new Set(irs.map(i => {
      const expr = i.expression as Record<string, unknown>
      return (expr.strata as unknown[])?.length ?? 0
    }))
    expect(counts.size).toBeGreaterThanOrEqual(3)
  })
})

// ─── Characterization Tests ──────────────────────────────────────────────────

describe('Characterization Format Compatibility', () => {
  const chars = loadJSON('characterizations.json') as Record<string, unknown>[]

  it(`validates all ${chars.length} characterizations as list items`, () => {
    for (const char of chars) {
      const result = CharacterizationListItemSchema.safeParse(char)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `CharacterizationListItemSchema failed for "${char.name}":\n${issues.join('\n')}`
        )
      }
    }
  })

  const charsWithContent = chars.filter(c =>
    (c.cohorts as unknown[])?.length > 0 ||
    (c.featureAnalyses as unknown[])?.length > 0
  )

  it('at least one characterization has cohorts or feature analyses', () => {
    expect(charsWithContent.length).toBeGreaterThan(0)
  })

  it(`validates ${charsWithContent.length} characterizations with content against full schema`, () => {
    for (const char of charsWithContent) {
      const result = CharacterizationDefinitionSchema.safeParse(char)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `CharacterizationDefinitionSchema failed for "${char.name}":\n${issues.join('\n')}`
        )
      }
    }
  })

  charsWithContent.forEach((char) => {
    const name = (char.name as string) || 'unnamed'

    it(`"${name}" has valid cohort references`, () => {
      const cohorts = (char.cohorts || []) as Record<string, unknown>[]
      for (const c of cohorts) {
        expect(typeof c.id).toBe('number')
        expect(typeof c.name).toBe('string')
      }
    })

    it(`"${name}" has valid feature analysis references`, () => {
      const fas = (char.featureAnalyses || []) as Record<string, unknown>[]
      const withStatType = fas.filter(fa => fa.statType)
      expect(withStatType.length).toBe(fas.length)
      for (const fa of fas) {
        expect(typeof fa.id).toBe('number')
        expect(['PREVALENCE', 'DISTRIBUTION']).toContain(fa.statType)
      }
    })

    it(`"${name}" has valid strata (if present)`, () => {
      const strata = (char.stratas || []) as Record<string, unknown>[]
      for (const s of strata) {
        expect(s).toHaveProperty('id')
        expect(s).toHaveProperty('name')
        expect(typeof s.name).toBe('string')
      }
    })
  })
})

describe('Characterization Edge Cases', () => {
  const chars = loadJSON('characterizations.json') as Record<string, unknown>[]

  it('characterization with strata validates', () => {
    const char = chars.find(c => ((c.stratas || []) as unknown[]).length > 0)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with parameters validates', () => {
    const char = chars.find(c => ((c.parameters || []) as unknown[]).length > 0)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with multiple cohorts validates', () => {
    const char = chars.find(c => ((c.cohorts || []) as unknown[]).length > 1)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with multiple strata validates', () => {
    const char = chars.find(c => ((c.stratas || []) as unknown[]).length > 1)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with tags validates', () => {
    const char = chars.find(c => ((c.tags || []) as unknown[]).length > 0)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with DISTRIBUTION feature validates', () => {
    const char = chars.find(c => {
      const fas = (c.featureAnalyses || []) as Record<string, unknown>[]
      return fas.some(fa => fa.statType === 'DISTRIBUTION')
    })
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with createdBy object validates', () => {
    const char = chars.find(c => c.createdBy && typeof c.createdBy === 'object')
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })

  it('characterization with stratifiedBy field validates', () => {
    const char = chars.find(c => c.stratifiedBy !== undefined)
    expect(char).toBeDefined()
    const result = CharacterizationDefinitionSchema.safeParse(char)
    expect(result.success).toBe(true)
  })
})

// ─── Feature Analysis Tests ──────────────────────────────────────────────────

describe('Feature Analysis Format Compatibility', () => {
  let featureAnalyses: Record<string, unknown>[]

  try {
    featureAnalyses = loadJSON('feature-analyses.json') as Record<string, unknown>[]
  } catch {
    featureAnalyses = []
  }

  it('fixture provides at least one feature analysis', () => {
    expect(featureAnalyses.length).toBeGreaterThan(0)
  })

  it(`validates all ${featureAnalyses.length} feature analyses against schema`, () => {
    for (const fa of featureAnalyses) {
      const result = FeatureAnalysisSchema.safeParse(fa)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `FeatureAnalysisSchema failed for "${fa.name}" (type=${fa.type}):\n${issues.join('\n')}`
        )
      }
    }
  })

  it('validates feature analyses as list items', () => {
    for (const fa of featureAnalyses) {
      const result = FeatureAnalysisListItemSchema.safeParse(fa)
      if (!result.success) {
        const issues = result.error.issues.map(
          iss => `${iss.path.join('.')}: ${iss.message}`
        )
        expect.fail(
          `FeatureAnalysisListItemSchema failed for "${fa.name}":\n${issues.join('\n')}`
        )
      }
    }
  })

  it('covers PRESET type', () => {
    const preset = featureAnalyses.find(fa => fa.type === 'PRESET')
    expect(preset).toBeDefined()
  })

  it('covers CUSTOM_FE type', () => {
    const custom = featureAnalyses.find(fa => fa.type === 'CUSTOM_FE')
    expect(custom).toBeDefined()
  })

  it('covers CRITERIA_SET type', () => {
    const criteria = featureAnalyses.find(fa => fa.type === 'CRITERIA_SET')
    expect(criteria).toBeDefined()
  })

  it('PRESET design is a string (preset name)', () => {
    const preset = featureAnalyses.find(fa => fa.type === 'PRESET')
    expect(preset).toBeDefined()
    expect(typeof preset!.design).toBe('string')
  })

  it('CUSTOM_FE design is a string (SQL)', () => {
    const custom = featureAnalyses.find(fa => fa.type === 'CUSTOM_FE')
    expect(custom).toBeDefined()
    expect(typeof custom!.design).toBe('string')
  })

  it('CRITERIA_SET design is an array', () => {
    const criteriaSet = featureAnalyses.find(fa => fa.type === 'CRITERIA_SET')
    expect(criteriaSet).toBeDefined()
    expect(Array.isArray(criteriaSet!.design)).toBe(true)
  })

  it('feature analyses have valid domain values', () => {
    const validDomains = ['CONDITION', 'DRUG', 'PROCEDURE', 'MEASUREMENT', 'OBSERVATION', 'DEVICE', 'VISIT']
    const withDomain = featureAnalyses.filter(fa => fa.domain)
    expect(withDomain.length).toBe(featureAnalyses.length)
    for (const fa of featureAnalyses) {
      expect(validDomains).toContain(fa.domain)
    }
  })

  it('feature analyses have valid statType values', () => {
    const withStatType = featureAnalyses.filter(fa => fa.statType)
    expect(withStatType.length).toBe(featureAnalyses.length)
    for (const fa of featureAnalyses) {
      expect(['PREVALENCE', 'DISTRIBUTION']).toContain(fa.statType)
    }
  })
})

// ─── Cross-Type Validation ───────────────────────────────────────────────────

describe('Cross-Type Format Consistency', () => {
  const pathways = loadJSON('pathways.json') as Record<string, unknown>[]
  const irs = loadJSON('incidence-rates.json') as Record<string, unknown>[]
  const chars = loadJSON('characterizations.json') as Record<string, unknown>[]

  it('all analysis types use numeric timestamps', () => {
    const items = [...pathways, ...irs, ...chars]
    for (const item of items) {
      expect(typeof item.createdDate).toBe('number')
    }
    // modifiedDate is genuinely optional: some fixtures have never been edited.
    const withModifiedDate = items.filter(item => item.modifiedDate !== undefined)
    expect(withModifiedDate.length).toBeGreaterThan(0)
    for (const item of withModifiedDate) {
      expect(typeof item.modifiedDate).toBe('number')
    }
  })

  it('all analysis types use numeric IDs', () => {
    const items = [...pathways, ...irs, ...chars]
    for (const item of items) {
      expect(item.id).toBeDefined()
      expect(typeof item.id).toBe('number')
    }
  })

  it('all analysis types have consistent tags format', () => {
    const items = [...pathways, ...irs, ...chars]
    for (const item of items) {
      expect(item.tags).toBeDefined()
      expect(Array.isArray(item.tags)).toBe(true)
    }
  })

  it('coverage: sufficient pathways', () => {
    expect(pathways.length).toBeGreaterThanOrEqual(9)
  })

  it('coverage: sufficient incidence rates', () => {
    expect(irs.length).toBeGreaterThanOrEqual(15)
  })

  it('coverage: sufficient characterizations', () => {
    expect(chars.length).toBeGreaterThanOrEqual(5)
  })
})
