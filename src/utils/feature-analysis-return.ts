import type { LocationQueryValue, RouteLocationRaw } from 'vue-router'

export type FeatureAnalysisCreateKind =
  | { type: 'CRITERIA_SET'; statType: 'PREVALENCE' | 'DISTRIBUTION' }
  | { type: 'CUSTOM_FE' }

export const RETURN_TO_QUERY = 'returnTo'
export const ADD_FEATURE_ANALYSIS_QUERY = 'addFeatureAnalysis'

const POSITIVE_ID_PATTERN = /^[1-9]\d*$/

export function parsePositiveId(value: LocationQueryValue | LocationQueryValue[] | undefined): number | null {
  const raw = Array.isArray(value) ? (value.length === 1 ? value[0] : undefined) : value
  if (typeof raw !== 'string' || !POSITIVE_ID_PATTERN.test(raw)) {
    return null
  }
  const id = Number(raw)
  return Number.isSafeInteger(id) ? id : null
}

export function createFeatureAnalysisRoute(
  kind: FeatureAnalysisCreateKind,
  characterizationId: number,
): RouteLocationRaw {
  const query: Record<string, string> =
    kind.type === 'CRITERIA_SET'
      ? { type: kind.type, statType: kind.statType }
      : { type: kind.type }
  return {
    path: '/feature-analyses/new',
    query: { ...query, [RETURN_TO_QUERY]: String(characterizationId) },
  }
}

export function returnToCharacterizationRoute(
  characterizationId: number,
  addedFeatureAnalysisId?: number,
): RouteLocationRaw {
  const route: RouteLocationRaw = {
    name: 'characterization-edit',
    params: { id: String(characterizationId) },
  }
  if (addedFeatureAnalysisId === undefined) {
    return route
  }
  return { ...route, query: { [ADD_FEATURE_ANALYSIS_QUERY]: String(addedFeatureAnalysisId) } }
}
