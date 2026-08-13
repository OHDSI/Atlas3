import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import { CohortExpressionSchema } from '@/components/cohort-editor/circe.types'

interface PhenotypeFixture {
  cohortId: string
  name: string
  json: string
}

const FIXTURES = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../e2e/phenotype-library/fixtures/phenotypes.json'),
    'utf-8',
  ),
) as PhenotypeFixture[]

function sortedStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(sortedStringify).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v as object).sort().map(
      k => JSON.stringify(k) + ':' + sortedStringify((v as Record<string, unknown>)[k]),
    ).join(',') + '}'
  }
  return JSON.stringify(v)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Array indices are collapsed to `[]` so that the same field losing data in 900
 * cohorts groups into one reportable line instead of 900 near-identical paths.
 */
function collectDiffs(original: unknown, parsed: unknown, path: string, out: Set<string>): void {
  if (sortedStringify(original) === sortedStringify(parsed)) return

  if (Array.isArray(original) && Array.isArray(parsed)) {
    if (original.length !== parsed.length) {
      out.add(`${path}.length`)
      return
    }
    original.forEach((item, i) => collectDiffs(item, parsed[i], `${path}[]`, out))
    return
  }

  if (isPlainObject(original) && isPlainObject(parsed)) {
    for (const key of new Set([...Object.keys(original), ...Object.keys(parsed)])) {
      collectDiffs(original[key], parsed[key], path ? `${path}.${key}` : key, out)
    }
    return
  }

  out.add(path || '(root)')
}

/**
 * Field-level diff between the stored cohort and what the schema gives back.
 * Deliberately compares the raw parse output — no defaults are spread in, because
 * that is exactly what would mask the data-loss bugs this harness exists to catch.
 */
function roundTripDiff(original: Record<string, unknown>): string[] {
  const parsed = CohortExpressionSchema.parse(original) as Record<string, unknown>
  const diffs = new Set<string>()
  collectDiffs(original, parsed, '', diffs)
  return [...diffs].sort()
}

function normalisePath(segments: readonly PropertyKey[]): string {
  return segments
    .map(s => (typeof s === 'number' ? '[]' : String(s)))
    .join('.')
    .replace(/\.\[\]/g, '[]')
}

function fixtureExpression(cohortId: string): Record<string, unknown> {
  const fixture = FIXTURES.find(f => f.cohortId === cohortId)
  if (!fixture) throw new Error(`Fixture ${cohortId} not found`)
  return JSON.parse(fixture.json) as Record<string, unknown>
}

interface Failure {
  id: string
  name: string
  kind: 'parse' | 'diff'
  details: string[]
}

function groupSummary(failures: Failure[], kind: Failure['kind'], limit: number): string {
  const groups = new Map<string, { count: number; example: string }>()
  for (const failure of failures.filter(f => f.kind === kind)) {
    for (const detail of failure.details) {
      const group = groups.get(detail)
      if (group) group.count += 1
      else groups.set(detail, { count: 1, example: failure.id })
    }
  }
  return [...groups.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit)
    .map(([detail, g]) => `    ${String(g.count).padStart(5)}x  ${detail}  (e.g. cohort ${g.example})`)
    .join('\n')
}

describe('CohortExpressionSchema fidelity over the phenotype library', () => {
  it('loads the phenotype library', () => {
    expect(FIXTURES.length).toBeGreaterThan(1000)
  })

  it('stores each cohort expression at the top level of the fixture json', () => {
    for (const fixture of FIXTURES) {
      const parsed = JSON.parse(fixture.json) as Record<string, unknown>
      expect(parsed, `fixture ${fixture.cohortId} is not a top-level cohort expression`)
        .toHaveProperty('PrimaryCriteria')
      expect(parsed, `fixture ${fixture.cohortId} nests the expression under 'expression'`)
        .not.toHaveProperty('expression')
    }
  })

  it('reports fields the schema drops, at the top level and nested', () => {
    const base = fixtureExpression('1299')
    expect(roundTripDiff(base)).toEqual([])

    expect(roundTripDiff({ ...base, UnmodelledAtlasField: 42 })).toContain('UnmodelledAtlasField')

    const nested = {
      ...base,
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 3, UnmodelledNestedField: 'x' } }],
      },
    }
    expect(roundTripDiff(nested))
      .toContain('PrimaryCriteria.CriteriaList[].ConditionOccurrence.UnmodelledNestedField')
  })

  it('round-trips every phenotype-library cohort through CohortExpressionSchema', () => {
    const failures: Failure[] = []

    for (const fixture of FIXTURES) {
      const expression = JSON.parse(fixture.json) as Record<string, unknown>
      try {
        const diffs = roundTripDiff(expression)
        if (diffs.length) {
          failures.push({ id: fixture.cohortId, name: fixture.name, kind: 'diff', details: diffs })
        }
      } catch (error) {
        const details = error instanceof z.ZodError
          ? [...new Set(error.issues.map(i => `${i.code} @ ${normalisePath(i.path)}`))]
          : [String(error).slice(0, 200)]
        failures.push({ id: fixture.cohortId, name: fixture.name, kind: 'parse', details })
      }
    }

    const parseCount = failures.filter(f => f.kind === 'parse').length
    const diffCount = failures.filter(f => f.kind === 'diff').length
    const message = [
      `${failures.length}/${FIXTURES.length} fixtures failed`
        + ` (${parseCount} parse errors, ${diffCount} round-trip diffs)`,
      `  parse errors, grouped by issue:`,
      groupSummary(failures, 'parse', 30) || '    (none)',
      `  round-trip diffs, grouped by field path:`,
      groupSummary(failures, 'diff', 60) || '    (none)',
    ].join('\n')

    expect(failures, message).toHaveLength(0)
  })
})
