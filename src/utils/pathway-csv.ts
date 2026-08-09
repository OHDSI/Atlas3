import type { PathwayEventCode, PathwayGroup } from '@/models/pathway.types'
import { arrayToCsv } from '@/utils/csv'

export { downloadCsv } from '@/utils/csv'

const codeToName = (codes: PathwayEventCode[], code: string): string => {
  const c = codes.find(x => x.code === Number(code))
  return c ? c.name : code
}

export function toAllPathwaysRows(
  group: PathwayGroup,
  eventCodes: PathwayEventCode[],
  maxDepth: number
): Array<Record<string, string | number>> {
  return group.pathways.map(p => {
    const steps = p.path.split('-')
    const row: Record<string, string | number> = {}
    for (let i = 0; i < maxDepth; i++) {
      const step = steps[i]
      row[`Step ${i + 1}`] = step ? codeToName(eventCodes, step) : ''
    }
    row['Count'] = p.personCount
    row['% with Pathway'] =
      group.totalPathwaysCount === 0 ? 0 : Math.round((p.personCount / group.totalPathwaysCount) * 10000) / 100
    row['% of Cohort'] =
      group.targetCohortCount === 0 ? 0 : Math.round((p.personCount / group.targetCohortCount) * 10000) / 100
    return row
  })
}

export function toCountsByRankRows(
  group: PathwayGroup,
  eventCodes: PathwayEventCode[]
): Array<Record<string, string | number>> {
  const tally = new Map<string, number>()
  for (const p of group.pathways) {
    const steps = p.path.split('-')
    steps.forEach((step, i) => {
      const k = `${step}|${i + 1}`
      tally.set(k, (tally.get(k) ?? 0) + p.personCount)
    })
  }
  return [...tally.entries()].map(([k, count]) => {
    const parts = k.split('|')
    const code = parts[0] ?? ''
    const rank = parts[1] ?? '0'
    return {
      'Event Cohort': codeToName(eventCodes, code),
      Rank: Number(rank),
      Count: count,
      '%': group.totalPathwaysCount === 0 ? 0 : Math.round((count / group.totalPathwaysCount) * 10000) / 100,
    }
  })
}

export function toEventCohortCountRows(
  group: PathwayGroup,
  eventCodes: PathwayEventCode[]
): Array<Record<string, string | number>> {
  const tally = new Map<string, number>()
  for (const p of group.pathways) {
    // Count each person once per event cohort. A treatment pathway can repeat
    // an event (e.g. A → B → A when repeats are allowed), but this report is
    // person-level — its '%' divides by totalPathwaysCount (persons) — so a
    // recurring event must not add personCount more than once per path.
    // Mirrors the deduping in toDistinctEventCountRows below.
    const steps = new Set(p.path.split('-'))
    for (const s of steps) {
      const c = eventCodes.find(x => x.code === Number(s))
      if (!c || c.isCombo) continue
      tally.set(c.name, (tally.get(c.name) ?? 0) + p.personCount)
    }
  }
  return [...tally.entries()].map(([name, count]) => ({
    'Event Cohort': name,
    Count: count,
    '%': group.totalPathwaysCount === 0 ? 0 : Math.round((count / group.totalPathwaysCount) * 10000) / 100,
  }))
}

export function toDistinctEventCountRows(
  group: PathwayGroup,
  _eventCodes: PathwayEventCode[]
): Array<Record<string, string | number>> {
  const buckets = new Map<number, number>()
  buckets.set(0, group.targetCohortCount - group.totalPathwaysCount)
  for (const p of group.pathways) {
    const distinct = new Set(p.path.split('-')).size
    buckets.set(distinct, (buckets.get(distinct) ?? 0) + p.personCount)
  }
  return [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([n, count]) => ({
      'Distinct Events': n,
      Count: count,
    }))
}

export function toCsv(rows: Array<Record<string, string | number>>): string {
  const firstRow = rows[0]
  if (!firstRow) return ''
  return arrayToCsv(
    rows,
    Object.keys(firstRow).map(key => ({ key, label: key }))
  )
}
