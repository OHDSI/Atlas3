import type { LinkedFeatureAnalysis } from '@/models/characterization.types'
import type { FeatureAnalysisListItem } from '@/models/feature-analysis.types'

export interface DesignFlags {
  includeAnnual: boolean
  includeTemporal: boolean
}

export function designFlags(linked: LinkedFeatureAnalysis[]): DesignFlags {
  return {
    includeAnnual: linked.some(fa => fa.includeAnnual === true),
    includeTemporal: linked.some(fa => fa.includeTemporal === true),
  }
}

export function toLinkedFeatureAnalysis(
  fa: FeatureAnalysisListItem,
  flags: DesignFlags
): LinkedFeatureAnalysis {
  return {
    id: fa.id,
    name: fa.name,
    description: fa.description,
    statType: fa.statType,
    supportsAnnual: fa.supportsAnnual,
    supportsTemporal: fa.supportsTemporal,
    includeAnnual: flags.includeAnnual,
    includeTemporal: flags.includeTemporal,
  }
}
