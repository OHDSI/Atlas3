import type { InclusionRuleReport, InclusionTreemapNode } from '@/models/report.types'

export interface AttritionStep {
  label: string
  remaining: number
  excluded: number
  percentOfInitial: number
}

export const DEFAULT_INITIAL_POPULATION_LABEL = 'Initial Population'

export type IntersectMode = 'all' | 'any'

function parseTreemapGroups(root: InclusionTreemapNode | null): Map<string, number> {
  const groups = new Map<string, number>()
  if (!root) return groups
  const walk = (node: InclusionTreemapNode) => {
    if (typeof node.size === 'number' && node.name && /^[01]+$/.test(node.name)) {
      groups.set(node.name, node.size)
    }
    if (Array.isArray(node.children)) {
      for (const child of node.children) walk(child)
    }
  }
  walk(root)
  return groups
}

function computeSequentialCounts(groups: Map<string, number>, ruleCount: number): number[] {
  const counts: number[] = []
  for (let i = 0; i < ruleCount; i++) {
    let remaining = 0
    for (const [code, size] of groups) {
      let allSet = true
      for (let bit = 0; bit <= i; bit++) {
        if (bit >= code.length || code[bit] !== '1') {
          allSet = false
          break
        }
      }
      if (allSet) remaining += size
    }
    counts.push(remaining)
  }
  return counts
}

export function computeAttritionSteps(
  report: InclusionRuleReport,
  initialLabel: string = DEFAULT_INITIAL_POPULATION_LABEL
): AttritionStep[] {
  const { summary, inclusionRuleStats, treemap } = report
  if (inclusionRuleStats.length === 0) return []

  const initial = summary.baseCount
  const steps: AttritionStep[] = [
    {
      label: initialLabel,
      remaining: initial,
      excluded: 0,
      percentOfInitial: 100,
    },
  ]

  const groups = parseTreemapGroups(treemap)
  const sequentialCounts =
    groups.size > 0 ? computeSequentialCounts(groups, inclusionRuleStats.length) : null

  let prev = initial
  for (let i = 0; i < inclusionRuleStats.length; i++) {
    const rule = inclusionRuleStats[i]!
    const remaining = sequentialCounts ? sequentialCounts[i]! : rule.countSatisfying
    const excluded = prev - remaining
    steps.push({
      label: rule.name,
      remaining,
      excluded: Math.max(0, excluded),
      percentOfInitial: initial > 0 ? (remaining / initial) * 100 : 0,
    })
    prev = remaining
  }

  return steps
}

/**
 * Whether a treemap leaf (bit-string, '1' = rule satisfied, rule 0 first)
 * satisfies all / any of the selected rule indexes. An empty selection
 * matches everyone in 'all' mode and no one in 'any' mode.
 */
export function leafMatchesSelection(
  bitString: string,
  selectedRules: readonly number[],
  mode: IntersectMode
): boolean {
  const satisfied = (rule: number) => bitString[rule] === '1'
  return mode === 'all' ? selectedRules.every(satisfied) : selectedRules.some(satisfied)
}

/**
 * Intersect view (Atlas 2 parity): the number of people whose rule results
 * satisfy all / any of the selected rules, ignoring the unselected ones.
 * Returns null when the report carries no treemap breakdown to count from.
 */
export function computeIntersectCount(
  report: InclusionRuleReport,
  selectedRules: readonly number[],
  mode: IntersectMode
): number | null {
  const groups = parseTreemapGroups(report.treemap)
  if (groups.size === 0) return null
  let count = 0
  for (const [code, size] of groups) {
    if (leafMatchesSelection(code, selectedRules, mode)) count += size
  }
  return count
}
