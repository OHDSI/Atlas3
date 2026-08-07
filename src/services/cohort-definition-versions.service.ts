/**
 * Cohort Definition Versions Service
 * API service for cohort definition version history
 */
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'
import type { CohortDefinition } from '@/models/cohort.types'
import type { AtlasCohortDefinitionInput } from '@/models/atlas.types'
import {
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
  commentUpdateSchema,
} from '@/components/versions/schemas'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { httpGet, httpPut } from '@/services/http-client'

// Use pass-through validation for cohort definition data
const cohortDefinitionSchema = z.any()

/**
 * Get all versions for a cohort definition
 * @param cohortDefinitionId Cohort definition ID
 * @returns Array of versions ordered by version number descending
 */
export async function getVersions(cohortDefinitionId: number): Promise<Version[]> {
  try {
    const data = await httpGet<unknown>(`/cohortdefinition/${cohortDefinitionId}/version/`)
    const parsed = versionArraySchema.safeParse(data)

    if (!parsed.success) {
      logger.error('CohortDefinitionVersionsService', 'Version list validation error', parsed.error)
      throw new Error('Failed to validate version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CohortDefinitionVersionsService',
      `Failed to fetch versions for cohort definition ${cohortDefinitionId}`,
      error
    )
    throw error
  }
}

/**
 * Get a specific version of a cohort definition
 *
 * `entityDTO` is the raw Atlas-shaped DTO the WebAPI returns for a historical
 * version (id/name/description/expression-as-JSON-string) — not an internal
 * `CohortDefinition`. Callers must run it through the same
 * convertAtlasToInternal path used for the current-version WebAPI fetch.
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export async function getVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<VersionedAsset<AtlasCohortDefinitionInput>> {
  try {
    const data = await httpGet<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}`
    )

    const parsed = versionedAssetSchema(cohortDefinitionSchema).safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CohortDefinitionVersionsService',
        'Versioned asset validation error',
        parsed.error
      )
      throw new Error('Failed to validate version data')
    }

    return parsed.data as VersionedAsset<AtlasCohortDefinitionInput>
  } catch (error) {
    logger.error(
      'CohortDefinitionVersionsService',
      `Failed to fetch version ${versionNumber} for cohort definition ${cohortDefinitionId}`,
      error
    )
    throw error
  }
}

/**
 * Update version comment or archived status
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export async function updateVersion(
  cohortDefinitionId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  try {
    // Validate payload
    const validatedPayload = commentUpdateSchema.parse(payload)

    const data = await httpPut<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}`,
      validatedPayload
    )

    const parsed = versionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('CohortDefinitionVersionsService', 'Version validation error', parsed.error)
      throw new Error('Failed to validate updated version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CohortDefinitionVersionsService',
      `Failed to update version ${versionNumber} for cohort definition ${cohortDefinitionId}`,
      error
    )
    throw error
  }
}

/**
 * Create a copy of a cohort definition from a specific version
 * @param cohortDefinitionId Source cohort definition ID
 * @param versionNumber Version number to copy from
 * @returns Newly created cohort definition
 */
export async function copyVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<CohortDefinition> {
  try {
    const data = await httpPut<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}/createAsset`
    )

    const parsed = cohortDefinitionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CohortDefinitionVersionsService',
        'Cohort definition validation error',
        parsed.error
      )
      throw new Error('Failed to validate created cohort definition')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CohortDefinitionVersionsService',
      `Failed to copy version ${versionNumber} for cohort definition ${cohortDefinitionId}`,
      error
    )
    throw error
  }
}
