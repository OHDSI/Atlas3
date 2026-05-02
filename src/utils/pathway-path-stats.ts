import type { Pathway, PathwayResults } from '@/models/pathway.types'

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
  stats: {
    medianDurationDays: number | null
    medianStepGapDays: number | null
    daysToStep1: number | null
    continuedPastLastStep: number | null
  }
}

export function computePathStats(input: PathStatsInput): PathStatsOutput | null {
  const { design, results, targetCohortId, selectedPath } = input
  if (!selectedPath) return null

  const group = results.pathwayGroups.find(g => g.targetCohortId === targetCohortId)
  if (!group) return null

  const pathRecord = group.pathways.find(p => p.path === selectedPath.path)
  if (!pathRecord) return null

  const codeStrs = selectedPath.path.split('-')
  const codes = codeStrs.map(c => Number(c)).filter(n => Number.isFinite(n))

  const cohortIndexByCode = new Map<number, number>()
  design.eventCohorts.forEach((_, i) => {
    cohortIndexByCode.set(1 << i, i)
  })

  const chips = codes.map(code => {
    const idx = cohortIndexByCode.get(code) ?? -1
    const name = idx >= 0 ? (design.eventCohorts[idx]?.name ?? '(unknown)') : '(combo)'
    return { name, colorKey: String(code) }
  })

  const steps: PathStatsStep[] = codes.map((code, i) => {
    const prefix = codes.slice(0, i + 1).join('-')
    const pathWithPrefix = group.pathways.find(p => p.path === prefix)
    const entered = pathWithPrefix?.personCount ?? 0
    const idx = cohortIndexByCode.get(code) ?? -1
    const name = idx >= 0 ? (design.eventCohorts[idx]?.name ?? '(unknown)') : '(combo)'
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

  const persons = pathRecord.personCount
  const pctOfCohort = group.targetCohortCount === 0 ? 0 : (persons / group.targetCohortCount) * 100
  const pctOfPathways =
    group.totalPathwaysCount === 0 ? 0 : (persons / group.totalPathwaysCount) * 100

  return {
    summary: { chips, persons, pctOfCohort, pctOfPathways },
    steps,
    stats: {
      medianDurationDays: null,
      medianStepGapDays: null,
      daysToStep1: null,
      continuedPastLastStep: null,
    },
  }
}
