/**
 * Feature Analysis Service
 *
 * Thin façade over the WebAPI feature-analysis endpoints. Adds friendly
 * error logging on top of the validated WebAPI wrappers — validation,
 * Zod parsing, and retry/backoff already happen in `webapi.ts`.
 */
import { logger } from '@/utils/logger'
import * as webapi from '@/services/webapi'
import type {
  FeatureAnalysis,
  FeatureAnalysisListItem,
  FeatureAnalysisAggregate,
  CovariateSetting,
} from '@/models/feature-analysis.types'

/**
 * List all feature analyses available to the current user.
 */
export async function listFeatureAnalyses(): Promise<FeatureAnalysisListItem[]> {
  try {
    return await webapi.listFeatureAnalyses()
  } catch (error) {
    logger.error('FeatureAnalysisService', 'Failed to list feature analyses', error)
    throw error
  }
}

/**
 * Get a feature analysis by id.
 */
export async function getFeatureAnalysis(id: number): Promise<FeatureAnalysis | null> {
  try {
    return await webapi.getFeatureAnalysis(id)
  } catch (error) {
    logger.error('FeatureAnalysisService', `Failed to load feature analysis ${id}`, error)
    throw error
  }
}

/**
 * Create a feature analysis.
 */
export async function createFeatureAnalysis(
  fa: FeatureAnalysis
): Promise<FeatureAnalysis> {
  try {
    return await webapi.createFeatureAnalysis(fa)
  } catch (error) {
    logger.error('FeatureAnalysisService', 'Failed to create feature analysis', error)
    throw error
  }
}

/**
 * Update a feature analysis.
 */
export async function updateFeatureAnalysis(
  fa: FeatureAnalysis
): Promise<FeatureAnalysis> {
  try {
    return await webapi.updateFeatureAnalysis(fa)
  } catch (error) {
    logger.error(
      'FeatureAnalysisService',
      `Failed to update feature analysis ${fa.id ?? '<new>'}`,
      error
    )
    throw error
  }
}

/**
 * Delete a feature analysis.
 */
export async function deleteFeatureAnalysis(id: number): Promise<void> {
  try {
    await webapi.deleteFeatureAnalysis(id)
  } catch (error) {
    logger.error('FeatureAnalysisService', `Failed to delete feature analysis ${id}`, error)
    throw error
  }
}

/**
 * Server-side copy of a feature analysis.
 */
export async function copyFeatureAnalysis(id: number): Promise<FeatureAnalysis> {
  try {
    return await webapi.copyFeatureAnalysis(id)
  } catch (error) {
    logger.error('FeatureAnalysisService', `Failed to copy feature analysis ${id}`, error)
    throw error
  }
}

/**
 * Whether a feature analysis with the given name already exists.
 */
export async function featureAnalysisNameExists(
  id: number,
  name: string
): Promise<boolean> {
  try {
    return await webapi.featureAnalysisNameExists(id, name)
  } catch (error) {
    logger.error(
      'FeatureAnalysisService',
      `Failed to check name existence for ${id}/${name}`,
      error
    )
    throw error
  }
}

/**
 * List the CDM domains supported by feature analyses.
 */
export async function listFeatureAnalysisDomains(): Promise<string[]> {
  try {
    return await webapi.listFeatureAnalysisDomains()
  } catch (error) {
    logger.error('FeatureAnalysisService', 'Failed to list feature analysis domains', error)
    throw error
  }
}

/**
 * List FeatureExtraction aggregate options.
 */
export async function listFeatureAnalysisAggregates(): Promise<FeatureAnalysisAggregate[]> {
  try {
    return await webapi.listFeatureAnalysisAggregates()
  } catch (error) {
    logger.error(
      'FeatureAnalysisService',
      'Failed to list feature analysis aggregates',
      error
    )
    throw error
  }
}

/**
 * Default FeatureExtraction covariate settings (toggled by `temporal`).
 */
export async function getDefaultCovariateSettings(
  temporal: boolean
): Promise<CovariateSetting> {
  try {
    return await webapi.getDefaultCovariateSettings(temporal)
  } catch (error) {
    logger.error(
      'FeatureAnalysisService',
      `Failed to load default covariate settings (temporal=${temporal})`,
      error
    )
    throw error
  }
}
