import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { convertAtlasToInternal, convertInternalToAtlas } from '@/services/atlas-converter'

interface PhenotypeFixture {
  cohortId: string
  name: string
  json: string
}

const FIXTURES = JSON.parse(
  readFileSync(resolve(__dirname, '../../e2e/phenotype-library/fixtures/phenotypes.json'), 'utf-8'),
) as PhenotypeFixture[]

/**
 * Known converter losses, enumerated so nothing can drop silently. Entries
 * match as a suffix of the generalized loss path (array indices stripped).
 * Every entry is a conscious, reviewed decision: fix the converter and the
 * stale-entry test below forces removal; add an entry only with a reason.
 *
 * Occurrence counts are from the 1104-cohort phenotype-library corpus.
 */
const KNOWN_LOSSY: { pattern: string; reason: string }[] = [
  {
    pattern: 'EndWindow.UseEventEnd',
    reason:
      'EndWindow Use* flags are derived from the start window referencePoint on export; an explicit UseEventEnd=true is lost (13x)',
  },
  {
    pattern: 'ConditionOccurrence.ConditionTypeExclude',
    reason: 'type-exclude flags are not modeled; export hardcodes false (4x)',
  },
  {
    pattern: 'AdditionalCriteria.Count',
    reason: 'group count on AdditionalCriteria is not round-tripped (3x)',
  },
  {
    pattern: 'AdditionalCriteria.DemographicCriteriaList',
    reason: 'demographic criteria under AdditionalCriteria are dropped (2x)',
  },
  {
    pattern: 'expression.Groups',
    reason: 'nested subgroups inside inclusion-rule groups are partially dropped (2x)',
  },
  {
    pattern: 'AdditionalCriteria.Groups',
    reason: 'nested subgroups under AdditionalCriteria are dropped (2x)',
  },
  {
    pattern: 'expression.Type',
    reason: 'group logic type can mutate ALL -> ANY (1x, cohort 1091)',
  },
  {
    pattern: 'Observation.ObservationSourceConcept',
    reason: 'source-concept attribute inside correlated criteria is dropped (1x)',
  },
  {
    pattern: 'VisitOccurrence.VisitSourceConcept',
    reason: 'known gap: VisitSourceConcept does not round-trip (1x)',
  },
  {
    pattern: 'VisitDetail.VisitDetailSourceConcept',
    reason: 'known gap: VisitDetailSourceConcept does not round-trip (1x)',
  },
]

/**
 * Containment check: every value present in `orig` must survive into `back`,
 * recursively. Additions in `back` are allowed (the converter injects circe
 * NPE-shield defaults); deletions and mutations are violations. Explicit
 * nulls and empty arrays/objects in `orig` may be dropped, since absent is
 * equivalent for CIRCE's deserializer.
 */
function collectLosses(orig: unknown, back: unknown, path: string, out: string[]): void {
  if (orig === null || orig === undefined) return

  if (Array.isArray(orig)) {
    if (orig.length === 0) return
    if (!Array.isArray(back) || back.length < orig.length) {
      out.push(
        `${path} (array of ${orig.length} -> ${Array.isArray(back) ? back.length : typeof back})`,
      )
      return
    }
    orig.forEach((item, i) => collectLosses(item, back[i], `${path}[${i}]`, out))
    return
  }

  if (typeof orig === 'object') {
    const keys = Object.keys(orig as Record<string, unknown>)
    if (keys.length === 0) return
    if (back === null || back === undefined || typeof back !== 'object' || Array.isArray(back)) {
      out.push(`${path} (object -> ${Array.isArray(back) ? 'array' : typeof back})`)
      return
    }
    for (const key of keys) {
      collectLosses(
        (orig as Record<string, unknown>)[key],
        (back as Record<string, unknown>)[key],
        path ? `${path}.${key}` : key,
        out,
      )
    }
    return
  }

  if (orig !== back) {
    out.push(`${path} (${JSON.stringify(orig)} -> ${JSON.stringify(back)})`)
  }
}

/** Strip indices and the value diff so losses aggregate by structural position. */
function generalize(path: string): string {
  return path.replace(/\[\d+\]/g, '[]').replace(/ \(.*\)$/, '')
}

function isKnownLossy(pattern: string): boolean {
  return KNOWN_LOSSY.some(e => pattern === e.pattern || pattern.endsWith(`.${e.pattern}`))
}

function roundTripLossesByPattern(): Map<string, { count: number; cohorts: string[]; sample: string }> {
  const byPattern = new Map<string, { count: number; cohorts: string[]; sample: string }>()

  for (const f of FIXTURES) {
    const orig = JSON.parse(f.json) as Record<string, unknown>
    const internal = convertAtlasToInternal(orig as never)
    const back = convertInternalToAtlas(internal as never) as unknown as Record<string, unknown>

    const losses: string[] = []
    collectLosses(orig, back, '', losses)
    for (const loss of losses) {
      const pattern = generalize(loss)
      const entry = byPattern.get(pattern) ?? { count: 0, cohorts: [], sample: loss }
      entry.count++
      if (entry.cohorts.length < 3 && !entry.cohorts.includes(f.cohortId)) {
        entry.cohorts.push(f.cohortId)
      }
      byPattern.set(pattern, entry)
    }
  }
  return byPattern
}

describe('atlas-converter containment fidelity (phenotype library corpus)', () => {
  it('loads the full corpus', () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(1104)
  })

  it('never drops or mutates a field on round-trip, outside the known-lossy registry', () => {
    const byPattern = roundTripLossesByPattern()

    const report = [...byPattern.entries()]
      .filter(([pattern]) => !isKnownLossy(pattern))
      .sort((a, b) => b[1].count - a[1].count)
      .map(([p, e]) => `${e.count}x ${p} (e.g. cohorts ${e.cohorts.join(', ')}: ${e.sample})`)

    expect(report, `fields lost on round-trip:\n${report.join('\n')}`).toEqual([])
  })

  it('has no stale entries in the known-lossy registry', () => {
    const byPattern = roundTripLossesByPattern()
    const patterns = [...byPattern.keys()]

    const stale = KNOWN_LOSSY.filter(
      e => !patterns.some(p => p === e.pattern || p.endsWith(`.${e.pattern}`)),
    ).map(e => e.pattern)

    expect(
      stale,
      `registry entries no longer observed as losses (remove them): ${stale.join(', ')}`,
    ).toEqual([])
  })
})
