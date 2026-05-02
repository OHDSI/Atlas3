/**
 * Characterization result mapper
 *
 * Converts the raw `unknown[]` rows returned by
 * `getCharacterizationResults` into typed `PrevalenceStat[]` and
 * `DistributionStat[]` rows, grouping by `(analysisId, covariateId)` so
 * multiple cohorts/strata for the same covariate collapse into one row.
 *
 * Unlike Atlas 2.15's full `BaseStatConverter` family, this mapper aims
 * only at the data the new viewer needs to display rows — temporal /
 * annual breakdowns are intentionally ignored at this layer (Phase 5
 * defers temporal visualisations).
 */
import type {
  DistributionStat,
  LinkedCohort,
  PrevalenceStat,
} from '@/models/characterization.types'
import type { FeatureAnalysisType } from '@/models/feature-analysis.types'
import { logger } from '@/utils/logger'

/** Default stratum key used when a row is not stratified. */
export const DEFAULT_STRATA_KEY = 'overall'

/** Result type discriminator returned alongside the typed rows. */
export type CharacterizationStatType = 'PREVALENCE' | 'DISTRIBUTION'

export interface MappedCharacterizationResults {
  prevalence: PrevalenceStat[]
  distribution: DistributionStat[]
}

/** Internal: a single raw row before classification. */
interface RawRow {
  analysisId?: number
  analysisName?: string
  covariateId?: number
  covariateName?: string
  conceptId?: number
  conceptName?: string
  domainId?: string
  faType?: FeatureAnalysisType
  cohortId?: number
  cohortName?: string
  strataId?: number | string
  strataName?: string
  resultType?: string
  // Prevalence fields
  count?: number
  pct?: number
  // Distribution fields
  avg?: number
  stdDev?: number
  min?: number
  p10?: number
  p25?: number
  median?: number
  p75?: number
  p90?: number
  max?: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toRawRow(value: unknown): RawRow | null {
  if (!isRecord(value)) {
    return null
  }
  // Minimum viable shape: needs an analysis + covariate + concept id.
  if (typeof value.analysisId !== 'number' || typeof value.covariateId !== 'number') {
    return null
  }
  return value as RawRow
}

function classifyRow(row: RawRow): CharacterizationStatType | null {
  const explicit = typeof row.resultType === 'string' ? row.resultType.toUpperCase() : null
  if (explicit === 'PREVALENCE' || explicit === 'DISTRIBUTION') {
    return explicit
  }
  // Inferred: distribution stats carry summary fields; prevalence carries
  // count/pct. We check distribution first because a few WebAPI reports
  // emit both `count` and the distribution stats (count = persons).
  if (
    typeof row.avg === 'number' ||
    typeof row.stdDev === 'number' ||
    typeof row.median === 'number' ||
    typeof row.p25 === 'number' ||
    typeof row.p75 === 'number'
  ) {
    return 'DISTRIBUTION'
  }
  if (typeof row.count === 'number' || typeof row.pct === 'number') {
    return 'PREVALENCE'
  }
  return null
}

function strataKey(row: RawRow): string {
  if (row.strataId === undefined || row.strataId === null || row.strataId === '') {
    return DEFAULT_STRATA_KEY
  }
  return String(row.strataId)
}

function cohortKey(row: RawRow): string | null {
  if (typeof row.cohortId !== 'number') {
    return null
  }
  return String(row.cohortId)
}

function setNested(
  target: Record<string, Record<string, number>>,
  strata: string,
  cohort: string,
  value: number | undefined
): void {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return
  }
  if (!target[strata]) {
    target[strata] = {}
  }
  target[strata][cohort] = value
}

function ensureCohort(cohorts: LinkedCohort[], row: RawRow): void {
  if (typeof row.cohortId !== 'number') {
    return
  }
  if (cohorts.some(c => c.id === row.cohortId)) {
    return
  }
  cohorts.push({ id: row.cohortId, name: row.cohortName ?? `Cohort ${row.cohortId}` })
}

function newPrevalenceStat(row: RawRow): PrevalenceStat {
  return {
    analysisId: row.analysisId as number,
    analysisName: row.analysisName ?? `Analysis ${row.analysisId}`,
    covariateId: row.covariateId as number,
    covariateName: row.covariateName ?? `Covariate ${row.covariateId}`,
    conceptId: typeof row.conceptId === 'number' ? row.conceptId : 0,
    conceptName: row.conceptName,
    domainId: row.domainId,
    faType: row.faType,
    cohorts: [],
    count: {},
    pct: {},
  }
}

function newDistributionStat(row: RawRow): DistributionStat {
  return {
    analysisId: row.analysisId as number,
    analysisName: row.analysisName ?? `Analysis ${row.analysisId}`,
    covariateId: row.covariateId as number,
    covariateName: row.covariateName ?? `Covariate ${row.covariateId}`,
    conceptId: typeof row.conceptId === 'number' ? row.conceptId : 0,
    conceptName: row.conceptName,
    domainId: row.domainId,
    faType: row.faType,
    cohorts: [],
    avg: {},
    stdDev: {},
    min: {},
    p10: {},
    p25: {},
    median: {},
    p75: {},
    p90: {},
    max: {},
  }
}

/**
 * Compute the (binary) standardised mean difference between two
 * prevalence proportions. Returns `undefined` if the denominator is
 * zero or either value is missing.
 *
 * Formula (matches Atlas 2.15):
 *   stdDiff = (p1 - p2) / sqrt(((p1*(1-p1)) + (p2*(1-p2))) / 2)
 */
export function computeBinaryStdDiff(
  p1: number | undefined,
  p2: number | undefined
): number | undefined {
  if (typeof p1 !== 'number' || typeof p2 !== 'number') {
    return undefined
  }
  // p1, p2 may arrive as raw percentages (0-100) or as proportions (0-1).
  // Normalise to proportions when input looks like a percentage.
  const norm = (v: number): number => (v > 1 ? v / 100 : v)
  const a = norm(p1)
  const b = norm(p2)
  const denom = Math.sqrt((a * (1 - a) + b * (1 - b)) / 2)
  if (denom === 0 || !Number.isFinite(denom)) {
    return undefined
  }
  const result = (a - b) / denom
  return Number.isFinite(result) ? result : undefined
}

/**
 * Map raw WebAPI result rows to typed prevalence + distribution rows.
 */
export function mapCharacterizationResults(raw: unknown[]): MappedCharacterizationResults {
  const prevalenceMap = new Map<string, PrevalenceStat>()
  const distributionMap = new Map<string, DistributionStat>()
  let skipped = 0

  for (const value of raw) {
    const row = toRawRow(value)
    if (!row) {
      skipped++
      continue
    }
    const type = classifyRow(row)
    if (type === null) {
      skipped++
      continue
    }
    const groupKey = `${row.analysisId}::${row.covariateId}`
    const cKey = cohortKey(row)
    if (!cKey) {
      skipped++
      continue
    }
    const sKey = strataKey(row)

    if (type === 'PREVALENCE') {
      let stat = prevalenceMap.get(groupKey)
      if (!stat) {
        stat = newPrevalenceStat(row)
        prevalenceMap.set(groupKey, stat)
      }
      ensureCohort(stat.cohorts, row)
      setNested(stat.count, sKey, cKey, row.count)
      setNested(stat.pct, sKey, cKey, row.pct)
    } else {
      let stat = distributionMap.get(groupKey)
      if (!stat) {
        stat = newDistributionStat(row)
        distributionMap.set(groupKey, stat)
      }
      ensureCohort(stat.cohorts, row)
      setNested(stat.avg, sKey, cKey, row.avg)
      setNested(stat.stdDev, sKey, cKey, row.stdDev)
      setNested(stat.min, sKey, cKey, row.min)
      setNested(stat.p10, sKey, cKey, row.p10)
      setNested(stat.p25, sKey, cKey, row.p25)
      setNested(stat.median, sKey, cKey, row.median)
      setNested(stat.p75, sKey, cKey, row.p75)
      setNested(stat.p90, sKey, cKey, row.p90)
      setNested(stat.max, sKey, cKey, row.max)
    }
  }

  // Compute std-diff for two-cohort prevalence rows (using the default
  // / first stratum). With more than two cohorts there is no canonical
  // pair, so we leave stdDiff unset and let the UI decide.
  for (const stat of prevalenceMap.values()) {
    if (stat.cohorts.length !== 2) {
      continue
    }
    const stratumKeys = Object.keys(stat.pct)
    if (stratumKeys.length === 0) {
      continue
    }
    const sKey: string = stratumKeys.includes(DEFAULT_STRATA_KEY)
      ? DEFAULT_STRATA_KEY
      : (stratumKeys[0] as string)
    const stratumPct = stat.pct[sKey]
    if (!stratumPct) {
      continue
    }
    const c1 = stat.cohorts[0]
    const c2 = stat.cohorts[1]
    if (!c1 || !c2) {
      continue
    }
    const diff = computeBinaryStdDiff(stratumPct[String(c1.id)], stratumPct[String(c2.id)])
    if (diff !== undefined) {
      stat.stdDiff = diff
    }
  }

  if (skipped > 0) {
    logger.debug('CharacterizationResultMapper', `Skipped ${skipped} unclassifiable result row(s)`)
  }

  return {
    prevalence: Array.from(prevalenceMap.values()),
    distribution: Array.from(distributionMap.values()),
  }
}
