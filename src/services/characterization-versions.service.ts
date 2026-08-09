/**
 * Characterization Versions Service
 * API service for cohort-characterization version history.
 */
import { createVersionsService } from '@/services/versions-service.factory'
import { commentUpdateSchema } from '@/components/versions/schemas'
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'
import {
  CharacterizationDefinitionSchema,
  type CharacterizationDefinition,
} from '@/models/characterization.types'

const service = createVersionsService({
  pathPrefix: '/cohort-characterization',
  logTag: 'CharacterizationVersionsService',
  entitySchema: CharacterizationDefinitionSchema,
  copySchema: CharacterizationDefinitionSchema,
  payloadSchema: commentUpdateSchema,
  messages: {
    invalidList: 'Failed to validate version data',
    invalidAsset: 'Failed to validate version data',
    invalidUpdate: 'Failed to validate updated version data',
    invalidCopy: 'Failed to validate created characterization',
  },
})

/**
 * Get all versions for a characterization.
 * @param characterizationId Characterization ID
 * @returns Array of versions ordered by version number descending
 */
export function getVersions(characterizationId: number): Promise<Version[]> {
  return service.getVersions(characterizationId)
}

/**
 * Get a specific version of a characterization.
 * @param characterizationId Characterization ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export function getVersion(
  characterizationId: number,
  versionNumber: number
): Promise<VersionedAsset<CharacterizationDefinition>> {
  return service.getVersion<CharacterizationDefinition>(characterizationId, versionNumber)
}

/**
 * Update version comment or archived status.
 * @param characterizationId Characterization ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export function updateVersion(
  characterizationId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  return service.updateVersion(characterizationId, versionNumber, payload)
}

/**
 * Create a copy of a characterization from a specific version.
 * @param characterizationId Source characterization ID
 * @param versionNumber Version number to copy from
 * @returns Newly created characterization design
 */
export function copyVersion(
  characterizationId: number,
  versionNumber: number
): Promise<CharacterizationDefinition> {
  return service.copyVersion<CharacterizationDefinition>(characterizationId, versionNumber)
}
