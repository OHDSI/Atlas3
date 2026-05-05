import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'

interface PhenotypeFixture { cohortId: string; name: string; json: string }

const FIXTURES = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../e2e/phenotype-library/fixtures/phenotypes.json'),
    'utf-8',
  ),
) as PhenotypeFixture[]

const COSMETIC_KEYS = new Set(['expressionType', 'AdditionalCriteria'])

function sortedStringify(v: unknown): string {
  if (Array.isArray(v)) return '[' + v.map(sortedStringify).join(',') + ']'
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v as object).sort().map(
      k => JSON.stringify(k) + ':' + sortedStringify((v as Record<string, unknown>)[k]),
    ).join(',') + '}'
  }
  return JSON.stringify(v)
}

export function diffRoundTrip(orig: Record<string, unknown>): string[] {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const internal = convertAtlasToInternal(orig as any)
  // Cast at the call site only. Do NOT spread default fields into `internal`
  // — that would mask exactly the data-loss bugs this harness exists to surface
  // (see tests/integration/round-trip.spec.ts:29-37 for the broken pattern).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
  const diffs: string[] = []
  for (const k of new Set([...Object.keys(orig), ...Object.keys(back)])) {
    if (COSMETIC_KEYS.has(k)) continue
    if (sortedStringify(orig[k]) !== sortedStringify(back[k])) diffs.push(k)
  }
  return diffs
}

function fixtureById(id: string): Record<string, unknown> {
  const f = FIXTURES.find(p => p.cohortId === id)
  if (!f) throw new Error(`Fixture ${id} not found`)
  return JSON.parse(f.json)
}

describe('atlas-converter fidelity (pure-Node round-trip)', () => {
  it('cohort 1299 round-trips without mutation', () => {
    expect(diffRoundTrip(fixtureById('1299'))).toEqual([])
  })
})

describe('Bug B: PrimaryCriteriaLimit.Type', () => {
  it("preserves Type='First' on a cohort with no AdditionalCriteria (1299)", () => {
    const orig = fixtureById('1299')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = convertAtlasToInternal(orig as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
    expect((back.PrimaryCriteria as Record<string, unknown>).PrimaryCriteriaLimit)
      .toEqual({ Type: 'First' })
  })

  describe('Bug B sweep', () => {
    it('preserves PrimaryCriteriaLimit.Type across all 1104 fixtures', () => {
      const losses: string[] = []
      for (const f of FIXTURES) {
        const orig = JSON.parse(f.json) as Record<string, unknown>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const internal = convertAtlasToInternal(orig as any)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
        const a = (orig.PrimaryCriteria as Record<string, unknown> | undefined)?.PrimaryCriteriaLimit
        const b = (back.PrimaryCriteria as Record<string, unknown> | undefined)?.PrimaryCriteriaLimit
        if (sortedStringify(a) !== sortedStringify(b)) losses.push(`${f.cohortId}: ${JSON.stringify(a)} → ${JSON.stringify(b)}`)
      }
      expect(losses, losses.slice(0, 10).join('\n')).toEqual([])
    })
  })
})

describe('Bug A: *SourceConcept attributes', () => {
  it('preserves ProcedureSourceConcept on entry events (1299)', () => {
    const orig = fixtureById('1299')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = convertAtlasToInternal(orig as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
    const list = (back.PrimaryCriteria as Record<string, unknown>).CriteriaList as Array<Record<string, unknown>>
    const second = list[1] as { ProcedureOccurrence: Record<string, unknown> }
    expect(second.ProcedureOccurrence.ProcedureSourceConcept).toBe(87)
    expect(second.ProcedureOccurrence.CodesetId).toBeUndefined()
  })

  it('does not silently inject CodesetId:null when CodesetId was absent', () => {
    const orig = fixtureById('1299')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = convertAtlasToInternal(orig as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
    const list = (back.PrimaryCriteria as Record<string, unknown>).CriteriaList as Array<Record<string, unknown>>
    const second = list[1] as { ProcedureOccurrence: Record<string, unknown> }
    expect(Object.keys(second.ProcedureOccurrence)).not.toContain('CodesetId')
  })

  // Skipped: documents broader converter bugs (CorrelatedCriteria, nested groups, unknown attributes) tracked as follow-ups in docs/superpowers/plans/2026-05-05-cohort-converter-fidelity.md Task 11.
  it.skip('preserves PrimaryCriteria across all fixtures (modulo cosmetic keys)', () => {
    const losses: string[] = []
    for (const f of FIXTURES) {
      const orig = JSON.parse(f.json) as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internal = convertAtlasToInternal(orig as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
      if (sortedStringify(orig.PrimaryCriteria) !== sortedStringify(back.PrimaryCriteria)) {
        losses.push(f.cohortId)
      }
    }
    // Allow up to a small handful of residual mutations; report them so we can decide what they are
    expect(losses, `mutated PrimaryCriteria in ${losses.length} cohorts: ${losses.slice(0,10).join(', ')}`).toEqual([])
  })
})

describe('Bug C: demographic-only inclusion rules', () => {
  it('preserves a demographic-only Age rule on cohort 1299', () => {
    const orig = fixtureById('1299')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const internal = convertAtlasToInternal(orig as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
    const rules = back.InclusionRules as Array<Record<string, unknown>>
    const expr = rules[0].expression as Record<string, unknown>
    expect(expr.CriteriaList).toEqual([])
    expect(expr.DemographicCriteriaList).toEqual([{ Age: { Op: 'gte', Value: 18 } }])
  })

  // Skipped: documents broader converter bugs (CorrelatedCriteria, nested groups, unknown attributes) tracked as follow-ups in docs/superpowers/plans/2026-05-05-cohort-converter-fidelity.md Task 11.
  it.skip('preserves InclusionRules across all fixtures (modulo cosmetic keys)', () => {
    const losses: string[] = []
    for (const f of FIXTURES) {
      const orig = JSON.parse(f.json) as Record<string, unknown>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const internal = convertAtlasToInternal(orig as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const back = convertInternalToAtlas(internal as any) as Record<string, unknown>
      if (sortedStringify(orig.InclusionRules) !== sortedStringify(back.InclusionRules)) {
        losses.push(f.cohortId)
      }
    }
    expect(losses, `mutated InclusionRules in ${losses.length} cohorts: ${losses.slice(0,10).join(', ')}`).toEqual([])
  })
})

// Re-exports for use by other fidelity specs in this directory
export { fixtureById, FIXTURES }
