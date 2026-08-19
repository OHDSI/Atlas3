import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import * as circe from '@/models/circe-types'
import { isObjectSchema, shapeOf, synthesise, unwrap } from '../../helpers/circe-schema-walk'

const exportedName = new Map<z.ZodTypeAny, string>()
for (const [name, value] of Object.entries(circe)) {
  if (!(value instanceof z.ZodType)) continue
  const short = name.replace(/Schema$/, '')
  if (!exportedName.has(value)) exportedName.set(value, short)
  const inner = unwrap(value)
  if (!exportedName.has(inner)) exportedName.set(inner, short)
}

const anonymousLabels = new Map<z.ZodTypeAny, string>()

function labelOf(schema: z.ZodObject<z.ZodRawShape>): string {
  const exported = exportedName.get(schema)
  if (exported) return exported
  const cached = anonymousLabels.get(schema)
  if (cached) return cached
  const keys = Object.keys(schema.shape)
  const label = keys.length === 1 ? `${keys[0]}Wrapper` : `Anonymous${anonymousLabels.size}`
  anonymousLabels.set(schema, label)
  return label
}

interface SchemaSurface {
  /** `<OwnerSchema>.<fieldName>` for every field the schema models, each listed once. */
  slots: Map<string, z.ZodTypeAny>
  fieldNames: Set<string>
  /** Widest union or enum found, which is how many synthetic variants it takes to cover them all. */
  maxBranching: number
}

function describeSchema(root: z.ZodTypeAny): SchemaSurface {
  const slots = new Map<string, z.ZodTypeAny>()
  const fieldNames = new Set<string>()
  const visited = new Set<z.ZodTypeAny>()
  let maxBranching = 1

  const walk = (schema: z.ZodTypeAny): void => {
    const type = unwrap(schema)
    if (visited.has(type)) return
    visited.add(type)

    if (isObjectSchema(type)) {
      const label = labelOf(type)
      for (const [key, field] of Object.entries(shapeOf(type))) {
        slots.set(`${label}.${key}`, field)
        fieldNames.add(key)
        walk(field)
      }
      return
    }
    if (type instanceof z.ZodArray) return walk(type.element as z.ZodTypeAny)
    if (type instanceof z.ZodUnion) {
      const options = type.options as z.ZodTypeAny[]
      maxBranching = Math.max(maxBranching, options.length)
      for (const option of options) walk(option)
      return
    }
    if (type instanceof z.ZodIntersection) {
      walk(type._def.left as z.ZodTypeAny)
      walk(type._def.right as z.ZodTypeAny)
      return
    }
    if (type instanceof z.ZodEnum) {
      maxBranching = Math.max(maxBranching, (type.options as string[]).length)
    }
  }

  walk(root)
  return { slots, fieldNames, maxBranching }
}

/** Records which schema slots a concrete expression actually populates. */
function measureCoverage(schema: z.ZodTypeAny, data: unknown, covered: Set<string>): void {
  if (data === null || data === undefined) return
  const type = unwrap(schema)

  if (isObjectSchema(type)) {
    if (typeof data !== 'object') return
    const label = labelOf(type)
    for (const [key, field] of Object.entries(shapeOf(type))) {
      const value = (data as Record<string, unknown>)[key]
      if (value === undefined) continue
      covered.add(`${label}.${key}`)
      measureCoverage(field, value, covered)
    }
    return
  }
  if (type instanceof z.ZodArray) {
    if (!Array.isArray(data)) return
    for (const item of data) measureCoverage(type.element as z.ZodTypeAny, item, covered)
    return
  }
  if (type instanceof z.ZodUnion) {
    for (const option of type.options as z.ZodTypeAny[]) {
      const inner = unwrap(option)
      if (isObjectSchema(inner) && Object.keys(inner.shape).some(key => key in (data as object))) {
        measureCoverage(option, data, covered)
      }
    }
    return
  }
  if (type instanceof z.ZodIntersection) {
    measureCoverage(type._def.left as z.ZodTypeAny, data, covered)
    measureCoverage(type._def.right as z.ZodTypeAny, data, covered)
  }
}

function sortedStringify(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(sortedStringify).join(',') + ']'
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value as object).sort().map(
      key => JSON.stringify(key) + ':' + sortedStringify((value as Record<string, unknown>)[key]),
    ).join(',') + '}'
  }
  return JSON.stringify(value)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function collectDiffs(original: unknown, parsed: unknown, path: string, out: Set<string>): void {
  if (sortedStringify(original) === sortedStringify(parsed)) return

  if (Array.isArray(original) && Array.isArray(parsed)) {
    if (original.length !== parsed.length) {
      out.add(`${path}.length`)
      return
    }
    original.forEach((item, index) => collectDiffs(item, parsed[index], `${path}[]`, out))
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

function roundTripDiff(expression: Record<string, unknown>): string[] {
  const parsed = circe.CohortExpressionSchema.parse(expression) as Record<string, unknown>
  const diffs = new Set<string>()
  collectDiffs(expression, parsed, '', diffs)
  return [...diffs].sort()
}

const SURFACE = describeSchema(circe.CohortExpressionSchema)

const SYNTHETIC = Array.from(
  { length: SURFACE.maxBranching },
  (_unused, variant) => synthesise(circe.CohortExpressionSchema, { variant }) as Record<string, unknown>,
)

/**
 * Slots reachable from the root schema that no synthetic expression can populate.
 * A non-empty list is a finding for the phase, not something to route around.
 */
const KNOWN_UNEXERCISED: readonly string[] = []

interface Fixture {
  cohortId: string
  name: string
  json: string
}

const FIXTURES = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../e2e/phenotype-library/fixtures/phenotypes.json'),
    'utf-8',
  ),
) as Fixture[]

const CORPUS_COVERAGE = (() => {
  const covered = new Set<string>()
  for (const fixture of FIXTURES) {
    measureCoverage(circe.CohortExpressionSchema, JSON.parse(fixture.json), covered)
  }
  return covered
})()

describe('CohortExpressionSchema field enumeration', () => {
  it('enumerates every field slot the schema models', () => {
    expect(SURFACE.slots.size).toBe(386)
    expect(SURFACE.fieldNames.size).toBe(206)
    expect(SURFACE.maxBranching).toBe(16)
  })

  it('reaches the recursive, union and intersection parts of the schema', () => {
    const leaf = z.object({ leafField: z.string().nullish() })
    interface Node {
      name?: string | null
      child?: Node | null
      items?: z.infer<typeof leaf>[] | null
    }
    const node: z.ZodType<Node> = z.lazy(() => z.object({
      name: z.string().nullish(),
      child: node.nullish(),
      items: z.array(leaf).nullish(),
    }) as z.ZodType<Node>)
    const root = z.object({ head: leaf }).and(
      z.object({ tail: z.union([z.object({ A: leaf }), z.object({ B: node })]).nullish() }),
    )

    const names = [...describeSchema(root).slots.keys()].map(slot => slot.split('.').pop()).sort()
    expect(names).toEqual(['A', 'B', 'child', 'head', 'items', 'leafField', 'name', 'tail'])
  })

  it('models the fields the phenotype corpus never exercises', () => {
    for (const slot of [
      'TextFilter.Text',
      'TextFilter.Op',
      'ProcedureOccurrence.Quantity',
      'DeviceExposure.Quantity',
      'Specimen.Quantity',
      'DrugExposure.Quantity',
      'ConditionOccurrence.StopReason',
      'DrugExposure.StopReason',
      'Observation.ValueAsString',
      'ConditionOccurrence.DateAdjustment',
      'LocationRegion.CodesetId',
      'PayerPlanPeriod.PayerConcept',
    ]) {
      expect(SURFACE.slots.has(slot), `${slot} is no longer modelled by the schema`).toBe(true)
      expect(CORPUS_COVERAGE.has(slot), `${slot} is now exercised by the corpus`).toBe(false)
    }
  })

  it('pins how little of the schema the phenotype corpus reaches', () => {
    expect(FIXTURES.length).toBeGreaterThan(1000)
    expect(CORPUS_COVERAGE.size).toBe(161)
    expect([...CORPUS_COVERAGE].every(slot => SURFACE.slots.has(slot))).toBe(true)
  })
})

describe('synthetic coverage of every schema field', () => {
  it('populates every slot the schema models', () => {
    const covered = new Set<string>()
    for (const expression of SYNTHETIC) {
      measureCoverage(circe.CohortExpressionSchema, expression, covered)
    }
    const missing = [...SURFACE.slots.keys()].filter(slot => !covered.has(slot)).sort()

    expect(missing, `slots no synthetic expression reaches:\n    ${missing.join('\n    ')}`)
      .toEqual([...KNOWN_UNEXERCISED])
    expect(covered.size).toBe(SURFACE.slots.size - KNOWN_UNEXERCISED.length)
  })

  it('reports a slot that a generated expression fails to populate', () => {
    const stripped = { ...SYNTHETIC[0] }
    delete stripped.PrimaryCriteria
    const covered = new Set<string>()
    measureCoverage(circe.CohortExpressionSchema, stripped, covered)

    expect(covered.has('CohortExpression.PrimaryCriteria')).toBe(false)
    expect(covered.has('PrimaryCriteria.CriteriaList')).toBe(false)
    expect(covered.has('CohortExpression.CensoringCriteria')).toBe(true)
  })

  it('round-trips every synthetic expression through CohortExpressionSchema', () => {
    const failures = new Map<string, number>()

    SYNTHETIC.forEach((expression, variant) => {
      try {
        for (const diff of roundTripDiff(expression)) {
          failures.set(diff, (failures.get(diff) ?? 0) + 1)
        }
      } catch (error) {
        const details = error instanceof z.ZodError
          ? [...new Set(error.issues.map(issue => `${issue.code} @ ${issue.path.join('.')}`))]
          : [String(error).slice(0, 200)]
        for (const detail of details) {
          failures.set(`variant ${variant}: ${detail}`, (failures.get(detail) ?? 0) + 1)
        }
      }
    })

    const message = [
      `${failures.size} field(s) did not survive the round-trip,`
        + ` across ${SYNTHETIC.length} synthetic expressions covering ${SURFACE.slots.size} slots:`,
      ...[...failures.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([field, count]) => `    ${String(count).padStart(3)}x  ${field}`),
    ].join('\n')

    expect([...failures.keys()], message).toEqual([])
  })

  it('reports a field the schema does not model, at the root and nested', () => {
    const base = SYNTHETIC[0] as Record<string, unknown>

    expect(roundTripDiff({ ...base, UnmodelledAtlasField: 42 })).toContain('UnmodelledAtlasField')

    expect(roundTripDiff({
      ...base,
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 3, UnmodelledNestedField: 'x' } }],
      },
    })).toContain('PrimaryCriteria.CriteriaList[].ConditionOccurrence.UnmodelledNestedField')
  })

  /**
   * The six criteria editors that offer a text-filter attribute all construct
   * `{ Value: '', Op: 'contains' }`, which commit 0833da3 left behind when it renamed
   * `TextFilterSchema.Value` to `Text`. This pins both halves of that: `Text` survives,
   * and the `Value` the editors write is silently dropped.
   */
  it('keeps Text on a text filter and drops the Value the criteria editors write', () => {
    const withCriteria = (stopReason: Record<string, unknown>) => ({
      PrimaryCriteria: {
        CriteriaList: [{ ConditionOccurrence: { CodesetId: 1, StopReason: stopReason } }],
      },
    })
    const path = 'PrimaryCriteria.CriteriaList[].ConditionOccurrence.StopReason'

    expect(roundTripDiff(withCriteria({ Text: 'discontinued', Op: 'contains' }))).toEqual([])
    expect(roundTripDiff(withCriteria({ Value: 'discontinued', Op: 'contains' })))
      .toEqual([`${path}.Value`])
  })
})
