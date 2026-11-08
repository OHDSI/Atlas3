import type { Pathway, PathwayResults } from '@/models/pathway.types'
import { isComboCode, decomposeCombo } from '@/utils/pathway-hierarchy'

export interface PathStatsInput {
  design: Pathway
  results: PathwayResults
  targetCohortId: number
  selectedPath: { path: string } | null
}

export interface PathStatsStep {
  name: string
  colorKey: string
  entered: number
  retentionPct: number
}

export interface PathStatsOutput {
  summary: {
    chips: { name: string; colorKey: string }[]
    persons: number
    pctOfCohort: number
    pctOfPathways: number
  }
  steps: PathStatsStep[]
}

export function computePathStats(input: PathStatsInput): PathStatsOutput | null {
  const { results, targetCohortId, selectedPath } = input
  if (!selectedPath) return null

  const group = results.pathwayGroups.find(g => g.targetCohortId === targetCohortId)
  if (!group) return null

  const segments = selectedPath.path.split('-')
  const endsHere = segments[segments.length - 1] === 'end'
  const codeStrs = segments.filter(s => s !== 'end')
  const cleanPath = codeStrs.join('-')
  const codes = codeStrs.map(c => Number(c)).filter(n => Number.isFinite(n))
  if (codes.length === 0) return null

  // Matches the sunburst: a step counts everyone who reached it, including
  // those who went on to later steps. The "end" slice counts only those who stopped.
  const pathways = group.pathways
  const reachedCount = (prefix: string): number =>
    pathways
      .filter(p => p.path === prefix || p.path.startsWith(prefix + '-'))
      .reduce((sum, p) => sum + p.personCount, 0)

  const persons = endsHere
    ? (pathways.find(p => p.path === cleanPath)?.personCount ?? 0)
    : reachedCount(cleanPath)
  if (persons === 0) return null

  const codeToName = new Map<number, string>()
  for (const ec of results.eventCodes) codeToName.set(ec.code, ec.name)

  function resolveCodeName(code: number): string {
    const direct = codeToName.get(code)
    if (direct) return direct
    if (isComboCode(code)) {
      return decomposeCombo(code)
        .map(b => codeToName.get(b) ?? String(b))
        .join(' + ')
    }
    return String(code)
  }

  const chips = codes.map(code => {
    return { name: resolveCodeName(code), colorKey: String(code) }
  })

  const steps: PathStatsStep[] = codes.map((code, i) => {
    const entered = reachedCount(codes.slice(0, i + 1).join('-'))
    const name = resolveCodeName(code)
    return {
      name,
      colorKey: String(code),
      entered,
      retentionPct: 0,
    }
  })
  for (let i = 0; i < steps.length; i++) {
    const prev = i === 0 ? steps[0]!.entered : steps[i - 1]!.entered
    steps[i]!.retentionPct = prev === 0 ? 0 : (steps[i]!.entered / prev) * 100
  }

  const pctOfCohort = group.targetCohortCount === 0 ? 0 : (persons / group.targetCohortCount) * 100
  const pctOfPathways =
    group.totalPathwaysCount === 0 ? 0 : (persons / group.totalPathwaysCount) * 100

  return {
    summary: { chips, persons, pctOfCohort, pctOfPathways },
    steps,
  }
}
