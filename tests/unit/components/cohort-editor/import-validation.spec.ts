/**
 * Cohort expression import validation (#328).
 *
 * The reported symptom is a cohort JSON whose inclusion rule uses `title`
 * where circe expects `name`: it imported without complaint, silently dropping
 * the title, and the user only found out by opening the editor.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import {
  describeImportProblems,
  validateCohortExpression,
} from '@/components/cohort-editor/import-validation'

const femaleGender = [
  {
    CONCEPT_CODE: 'F',
    CONCEPT_ID: 8532,
    CONCEPT_NAME: 'FEMALE',
    DOMAIN_ID: 'Gender',
    INVALID_REASON_CAPTION: 'Unknown',
    STANDARD_CONCEPT_CAPTION: 'Unknown',
    VOCABULARY_ID: 'Gender',
  },
]

const femaleExpression = {
  Type: 'ALL',
  CriteriaList: [],
  DemographicCriteriaList: [{ Gender: femaleGender }],
  Groups: [],
}

/** The valid cohort from the issue: any procedure, female-gender inclusion rule. */
function validCohort() {
  return {
    ConceptSets: [],
    PrimaryCriteria: {
      CriteriaList: [{ ProcedureOccurrence: {} }],
      ObservationWindow: { PriorDays: 0, PostDays: 0 },
      PrimaryCriteriaLimit: { Type: 'First' },
    },
    QualifiedLimit: { Type: 'First' },
    ExpressionLimit: { Type: 'First' },
    InclusionRules: [{ name: 'Female', expression: femaleExpression }],
    CensoringCriteria: [],
    CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
    CensorWindow: {},
    cdmVersionRange: '>=5.0.0',
  }
}

describe('validateCohortExpression', () => {
  it('accepts the well-formed cohort from the issue', () => {
    const result = validateCohortExpression(validCohort())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.expression.InclusionRules?.[0]?.name).toBe('Female')
  })

  it('rejects an inclusion rule that uses "title" instead of "name"', () => {
    const cohort = validCohort()
    cohort.InclusionRules = [
      { title: 'Female', expression: femaleExpression },
    ] as unknown as typeof cohort.InclusionRules

    const result = validateCohortExpression(cohort)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems).toHaveLength(1)
    expect(result.problems[0].path).toBe('InclusionRules[0].title')
    expect(result.problems[0].message).toBe('unrecognized field')
  })

  it('points at the field the misspelling was probably meant to be', () => {
    const cohort = validCohort()
    cohort.InclusionRules = [
      { nmae: 'Female', expression: femaleExpression },
    ] as unknown as typeof cohort.InclusionRules

    const result = validateCohortExpression(cohort)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0].suggestion).toBe('name')
    expect(describeImportProblems(result.problems)[0]).toBe(
      'InclusionRules[0].nmae: unrecognized field (did you mean "name"?)'
    )
  })

  it('reports an unrecognized field nested deep inside a criterion', () => {
    const cohort = validCohort()
    cohort.PrimaryCriteria.CriteriaList = [
      { ProcedureOccurrence: { CodesetId: 0, Occurrrence: {} } },
    ] as unknown as typeof cohort.PrimaryCriteria.CriteriaList

    const result = validateCohortExpression(cohort)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0].path).toBe('PrimaryCriteria.CriteriaList[0].ProcedureOccurrence.Occurrrence')
  })

  it('reports an unrecognized criterion type by its wrapper key', () => {
    const cohort = validCohort()
    cohort.PrimaryCriteria.CriteriaList = [
      { ProcedureOccurrance: {} },
    ] as unknown as typeof cohort.PrimaryCriteria.CriteriaList

    const result = validateCohortExpression(cohort)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0].path).toBe('PrimaryCriteria.CriteriaList[0].ProcedureOccurrance')
    expect(result.problems[0].suggestion).toBe('ProcedureOccurrence')
  })

  it('still reports a field whose value has the wrong type', () => {
    const cohort = validCohort()
    cohort.InclusionRules = [
      { name: 42, expression: femaleExpression },
    ] as unknown as typeof cohort.InclusionRules

    const result = validateCohortExpression(cohort)

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.problems[0].path).toBe('InclusionRules[0].name')
  })

  it('rejects a non-object payload', () => {
    expect(validateCohortExpression('not an expression').ok).toBe(false)
    expect(validateCohortExpression([]).ok).toBe(false)
    expect(validateCohortExpression(null).ok).toBe(false)
  })
})

/**
 * Guards the strictness itself. Refusing unrecognized fields is only safe if
 * genuine Atlas exports never carry any, so this asserts that over every real
 * cohort the repository has: the 38 atlas-demo exports and the 1104 cohorts in
 * the OHDSI phenotype library fixture. A failure here means the schema has
 * fallen behind circe, and would show up as users being unable to import
 * perfectly good cohorts.
 */
describe('validateCohortExpression against real cohort exports', () => {
  it('accepts every atlas-demo cohort export', () => {
    const dir = 'tests/e2e/fixtures/atlas-demo'
    const rejected: string[] = []

    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const json = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'))
      if (!json?.PrimaryCriteria) continue
      const result = validateCohortExpression(json)
      if (!result.ok) rejected.push(`${file}: ${describeImportProblems(result.problems).join('; ')}`)
    }

    expect(rejected).toEqual([])
  })

  it('accepts every cohort in the phenotype library', () => {
    const library = JSON.parse(
      readFileSync('tests/e2e/phenotype-library/fixtures/phenotypes.json', 'utf8')
    ) as { cohortId: number; json: string }[]
    const rejected: string[] = []

    for (const phenotype of library) {
      const json = typeof phenotype.json === 'string' ? JSON.parse(phenotype.json) : phenotype.json
      if (!json?.PrimaryCriteria) continue
      const result = validateCohortExpression(json)
      if (!result.ok) {
        rejected.push(`${phenotype.cohortId}: ${describeImportProblems(result.problems).join('; ')}`)
      }
    }

    expect(rejected).toEqual([])
  })
})
