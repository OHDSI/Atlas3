/**
 * OHDSI WebAPI Client
 * HTTP client for Atlas WebAPI endpoints
 *
 * In development: Uses Vite proxy (/WebAPI -> https://atlas-demo.ohdsi.org/WebAPI)
 * In production: Override with VITE_WEBAPI_URL environment variable
 */
import { httpClient, type HttpClientOptions } from '@/services/http-client'

/**
 * @deprecated Use httpClient from '@/services/http-client' for new code
 */
export async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const clientOptions: HttpClientOptions = {
    method: options?.method,
    headers: options?.headers,
  }

  if (options?.body) {
    clientOptions.body = options.body
  }

  return httpClient<T>(endpoint, clientOptions)
}

export { fetchCDMSources } from '@/services/source.service'

export { searchConceptsResult as searchConcepts } from '@/services/concept-search.service'

export {
  getCohortDefinition,
  type CohortSavePayload,
  saveCohortDefinition,
  deleteCohortDefinition,
  assignTagToCohort,
  unassignTagFromCohort,
  generateCohort,
  getCohortGenerationInfo,
  getCohorts,
  deleteCohort,
  validateCohortDefinition,
  getCohortPrintFriendly,
} from '@/services/cohort-definition.service'

export {
  listCohortSamples,
  hasCohortSamples,
  getCohortSample,
  createCohortSample,
  refreshCohortSample,
  deleteCohortSample,
} from '@/services/cohort-sample.service'

export {
  getCohortReport,
  getInclusionRuleReport,
  getPersonReport,
  getConditionErasReport,
  getConditionReport,
  getDrugErasReport,
  getCohortSpecificReport,
  triggerFullAnalysis,
  triggerQuickAnalysis,
  triggerUtilization,
  getPersonsExposureBaselineReport,
  getPersonsExposureCohortReport,
  getVisitsBaselineReport,
  getVisitDatesBaselineReport,
  getCareSiteVisitDatesBaselineReport,
  getVisitsCohortReport,
  getVisitDatesCohortReport,
  getCareSiteVisitDatesCohortReport,
  getDrugUtilizationBaselineReport,
  getDrugUtilizationCohortReport,
  getHeraclesHeelReport,
  getCompletedAnalyses,
  getConditionsByIndexReport,
  getDeathReport,
  getDrugExposureReport,
  getDrugsByIndexReport,
  getObservationPeriodsReport,
  getProcedureReport,
  getProceduresByIndexReport,
  getDataCompletenessReport,
  getEntropyReport,
  getTornadoReport,
  getCDMDrilldown,
  getConditionDrilldown,
  getConditionEraDrilldown,
  getDrugDrilldown,
  getDrugEraDrilldown,
  getMeasurementDrilldown,
  getObservationDrilldown,
  getProcedureDrilldown,
} from '@/services/report.service'

export {
  listCharacterizations,
  getCharacterization,
  createCharacterization,
  updateCharacterization,
  deleteCharacterization,
  copyCharacterization,
  characterizationNameExists,
  exportCharacterization,
  importCharacterization,
  listCharacterizationExecutions,
  getCharacterizationExecution,
  generateCharacterization,
  cancelCharacterizationGeneration,
  getCharacterizationDesignSnapshot,
  getCharacterizationResultCount,
  type CharacterizationResultsBody,
  getCharacterizationResults,
  explorePrevalence,
} from '@/services/characterization.service'

export {
  listFeatureAnalyses,
  getFeatureAnalysis,
  createFeatureAnalysis,
  updateFeatureAnalysis,
  deleteFeatureAnalysis,
  copyFeatureAnalysis,
  featureAnalysisNameExists,
  listFeatureAnalysisDomains,
  listFeatureAnalysisAggregates,
  getDefaultCovariateSettings,
} from '@/services/feature-analysis.service'

export * from '@/services/pathway.service'

export * from '@/services/incidence-rate.service'
