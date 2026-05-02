/**
 * Characterization Service
 *
 * Thin façade over the WebAPI characterization endpoints. Adds friendly
 * error logging on top of the validated WebAPI wrappers — validation,
 * Zod parsing, and retry/backoff already happen in `webapi.ts`.
 */
import { logger } from '@/utils/logger'
import * as webapi from '@/services/webapi'
import type {
  CharacterizationDefinition,
  CharacterizationListItem,
  CharacterizationExecution,
} from '@/models/characterization.types'

/**
 * List all characterizations available to the current user.
 */
export async function listCharacterizations(): Promise<CharacterizationListItem[]> {
  try {
    return await webapi.listCharacterizations()
  } catch (error) {
    logger.error('CharacterizationService', 'Failed to list characterizations', error)
    throw error
  }
}

/**
 * Get the full design of a characterization.
 */
export async function getCharacterization(id: number): Promise<CharacterizationDefinition | null> {
  try {
    return await webapi.getCharacterization(id)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to load characterization ${id}`, error)
    throw error
  }
}

/**
 * Create a new characterization.
 */
export async function createCharacterization(
  def: CharacterizationDefinition
): Promise<CharacterizationDefinition> {
  try {
    return await webapi.createCharacterization(def)
  } catch (error) {
    logger.error('CharacterizationService', 'Failed to create characterization', error)
    throw error
  }
}

/**
 * Update an existing characterization.
 */
export async function updateCharacterization(
  def: CharacterizationDefinition
): Promise<CharacterizationDefinition> {
  try {
    return await webapi.updateCharacterization(def)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to update characterization ${def.id ?? '<new>'}`,
      error
    )
    throw error
  }
}

/**
 * Delete a characterization.
 */
export async function deleteCharacterization(id: number): Promise<void> {
  try {
    await webapi.deleteCharacterization(id)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to delete characterization ${id}`, error)
    throw error
  }
}

/**
 * Server-side copy of a characterization.
 */
export async function copyCharacterization(id: number): Promise<CharacterizationDefinition> {
  try {
    return await webapi.copyCharacterization(id)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to copy characterization ${id}`, error)
    throw error
  }
}

/**
 * Whether a characterization with the given name already exists.
 */
export async function characterizationNameExists(id: number, name: string): Promise<boolean> {
  try {
    return await webapi.characterizationNameExists(id, name)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to check name existence for ${id}/${name}`,
      error
    )
    throw error
  }
}

/**
 * Export a characterization design.
 */
export async function exportCharacterization(id: number): Promise<unknown> {
  try {
    return await webapi.exportCharacterization(id)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to export characterization ${id}`, error)
    throw error
  }
}

/**
 * Import a characterization design.
 */
export async function importCharacterization(design: unknown): Promise<CharacterizationDefinition> {
  try {
    return await webapi.importCharacterization(design)
  } catch (error) {
    logger.error('CharacterizationService', 'Failed to import characterization', error)
    throw error
  }
}

/**
 * List executions (generations) for a characterization.
 */
export async function listCharacterizationExecutions(
  id: number
): Promise<CharacterizationExecution[]> {
  try {
    return await webapi.listCharacterizationExecutions(id)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to list executions for characterization ${id}`,
      error
    )
    throw error
  }
}

/**
 * Get a specific characterization execution.
 */
export async function getCharacterizationExecution(
  generationId: number
): Promise<CharacterizationExecution | null> {
  try {
    return await webapi.getCharacterizationExecution(generationId)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to load execution ${generationId}`, error)
    throw error
  }
}

/**
 * Trigger a characterization generation against a given source.
 */
export async function generateCharacterization(
  id: number,
  sourceKey: string
): Promise<CharacterizationExecution> {
  try {
    return await webapi.generateCharacterization(id, sourceKey)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to start generation ${id}/${sourceKey}`, error)
    throw error
  }
}

/**
 * Cancel an in-progress characterization generation.
 */
export async function cancelCharacterizationGeneration(
  id: number,
  sourceKey: string
): Promise<void> {
  try {
    await webapi.cancelCharacterizationGeneration(id, sourceKey)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to cancel generation ${id}/${sourceKey}`, error)
    throw error
  }
}

/**
 * Fetch the design that was active at the time a generation was created.
 */
export async function getCharacterizationDesignSnapshot(generationId: number): Promise<unknown> {
  try {
    return await webapi.getCharacterizationDesignSnapshot(generationId)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to load design snapshot for ${generationId}`,
      error
    )
    throw error
  }
}

/**
 * Get the total count of result rows for a generation.
 */
export async function getCharacterizationResultCount(generationId: number): Promise<number> {
  try {
    return await webapi.getCharacterizationResultCount(generationId)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to load result count for ${generationId}`,
      error
    )
    throw error
  }
}

/**
 * Fetch result rows for a generation.
 */
export async function getCharacterizationResults(
  generationId: number,
  body: webapi.CharacterizationResultsBody
): Promise<unknown[]> {
  try {
    return await webapi.getCharacterizationResults(generationId, body)
  } catch (error) {
    logger.error('CharacterizationService', `Failed to load results for ${generationId}`, error)
    throw error
  }
}

/**
 * Drill into prevalence values for a single covariate / cohort cell.
 */
export async function explorePrevalence(
  generationId: number,
  analysisId: number,
  cohortId: number,
  covariateId: number
): Promise<unknown> {
  try {
    return await webapi.explorePrevalence(generationId, analysisId, cohortId, covariateId)
  } catch (error) {
    logger.error(
      'CharacterizationService',
      `Failed to explore prevalence (${generationId}, ${analysisId}, ${cohortId}, ${covariateId})`,
      error
    )
    throw error
  }
}
