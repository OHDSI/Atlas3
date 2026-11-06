export type FeatureAnalysisCreateKind =
  | { type: 'CRITERIA_SET'; statType: 'PREVALENCE' | 'DISTRIBUTION' }
  | { type: 'CUSTOM_FE' }

export function parseCreateKind(type: unknown, statType: unknown): FeatureAnalysisCreateKind | null {
  if (type === 'CUSTOM_FE') return { type: 'CUSTOM_FE' }
  if (type === 'CRITERIA_SET' && statType === 'PREVALENCE') {
    return { type: 'CRITERIA_SET', statType: 'PREVALENCE' }
  }
  if (type === 'CRITERIA_SET' && statType === 'DISTRIBUTION') {
    return { type: 'CRITERIA_SET', statType: 'DISTRIBUTION' }
  }
  return null
}
