/**
 * Characterization Versions Service
 * API service for cohort-characterization version history.
 */
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'
import type { CharacterizationDefinition } from '@/models/characterization.types'
import {
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
  commentUpdateSchema,
} from '@/components/versions/schemas'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { httpGet, httpPut } from '@/services/http-client'

// Use pass-through validation for characterization design data — its full
// shape is enforced when fetched through `getCharacterization` in webapi.ts;
// here we only care that the version envelope is valid.
const characterizationDesignSchema = z.any()

/**
 * Get all versions for a characterization.
 * @param characterizationId Characterization ID
 * @returns Array of versions ordered by version number descending
 */
export async function getVersions(characterizationId: number): Promise<Version[]> {
  try {
    const data = await httpGet<unknown>(
      `/cohort-characterization/${characterizationId}/version/`
    )
    const parsed = versionArraySchema.safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CharacterizationVersionsService',
        'Version list validation error',
        parsed.error
      )
      throw new Error('Failed to validate version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CharacterizationVersionsService',
      `Failed to fetch versions for characterization ${characterizationId}`,
      error
    )
    throw error
  }
}

/**
 * Get a specific version of a characterization.
 * @param characterizationId Characterization ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export async function getVersion(
  characterizationId: number,
  versionNumber: number
): Promise<VersionedAsset<CharacterizationDefinition>> {
  try {
    const data = await httpGet<unknown>(
      `/cohort-characterization/${characterizationId}/version/${versionNumber}`
    )

    const parsed = versionedAssetSchema(characterizationDesignSchema).safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CharacterizationVersionsService',
        'Versioned asset validation error',
        parsed.error
      )
      throw new Error('Failed to validate version data')
    }

    return parsed.data as VersionedAsset<CharacterizationDefinition>
  } catch (error) {
    logger.error(
      'CharacterizationVersionsService',
      `Failed to fetch version ${versionNumber} for characterization ${characterizationId}`,
      error
    )
    throw error
  }
}

/**
 * Update version comment or archived status.
 * @param characterizationId Characterization ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export async function updateVersion(
  characterizationId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  try {
    const validatedPayload = commentUpdateSchema.parse(payload)

    const data = await httpPut<unknown>(
      `/cohort-characterization/${characterizationId}/version/${versionNumber}`,
      validatedPayload
    )

    const parsed = versionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CharacterizationVersionsService',
        'Version validation error',
        parsed.error
      )
      throw new Error('Failed to validate updated version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CharacterizationVersionsService',
      `Failed to update version ${versionNumber} for characterization ${characterizationId}`,
      error
    )
    throw error
  }
}

/**
 * Create a copy of a characterization from a specific version.
 * @param characterizationId Source characterization ID
 * @param versionNumber Version number to copy from
 * @returns Newly created characterization design
 */
export async function copyVersion(
  characterizationId: number,
  versionNumber: number
): Promise<CharacterizationDefinition> {
  try {
    const data = await httpPut<unknown>(
      `/cohort-characterization/${characterizationId}/version/${versionNumber}/createAsset`
    )

    const parsed = characterizationDesignSchema.safeParse(data)

    if (!parsed.success) {
      logger.error(
        'CharacterizationVersionsService',
        'Characterization validation error',
        parsed.error
      )
      throw new Error('Failed to validate created characterization')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'CharacterizationVersionsService',
      `Failed to copy version ${versionNumber} for characterization ${characterizationId}`,
      error
    )
    throw error
  }
}
