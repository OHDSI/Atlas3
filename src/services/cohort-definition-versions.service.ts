/**
 * Cohort Definition Versions Service
 * API service for cohort definition version history
 */
import { z } from 'zod'
import { createVersionsService } from '@/services/versions-service.factory'
import { commentUpdateSchema } from '@/components/versions/schemas'
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'
import type { CohortDefinition } from '@/models/cohort.types'
import type { AtlasCohortDefinitionInput } from '@/models/atlas.types'

// entityDTO is the raw Atlas-shaped DTO (expression as a JSON string), for
// which there is no Zod schema in src/models - CohortDefinition describes the
// converted internal shape instead.
const passthroughCohortDefinition = z.any()

const service = createVersionsService({
  pathPrefix: '/cohortdefinition',
  logTag: 'CohortDefinitionVersionsService',
  entitySchema: passthroughCohortDefinition,
  copySchema: passthroughCohortDefinition,
  payloadSchema: commentUpdateSchema,
  messages: {
    invalidList: 'Failed to validate version data',
    invalidAsset: 'Failed to validate version data',
    invalidUpdate: 'Failed to validate updated version data',
    invalidCopy: 'Failed to validate created cohort definition',
  },
})

/**
 * Get all versions for a cohort definition
 * @param cohortDefinitionId Cohort definition ID
 * @returns Array of versions ordered by version number descending
 */
export function getVersions(cohortDefinitionId: number): Promise<Version[]> {
  return service.getVersions(cohortDefinitionId)
}

/**
 * Get a specific version of a cohort definition
 *
 * `entityDTO` is the raw Atlas-shaped DTO the WebAPI returns for a historical
 * version (id/name/description/expression-as-JSON-string), not an internal
 * `CohortDefinition`. Callers must run it through the same
 * convertAtlasToInternal path used for the current-version WebAPI fetch.
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export function getVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<VersionedAsset<CohortDefinition>> {
  return service.getVersion<AtlasCohortDefinitionInput>(cohortDefinitionId, versionNumber).then(asset => {
    const entityDTO =
      typeof asset.entityDTO === 'object' && asset.entityDTO !== null && 'expression' in asset.entityDTO
        ? {
            ...asset.entityDTO,
            expression:
              typeof asset.entityDTO.expression === 'string'
                ? JSON.parse(asset.entityDTO.expression)
                : asset.entityDTO.expression,
          }
        : (asset.entityDTO as CohortDefinition)

    return {
      ...asset,
      entityDTO,
    }
  })
}

/**
 * Update version comment or archived status
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export function updateVersion(
  cohortDefinitionId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  return service.updateVersion(cohortDefinitionId, versionNumber, payload)
}

/**
 * Create a copy of a cohort definition from a specific version
 * @param cohortDefinitionId Source cohort definition ID
 * @param versionNumber Version number to copy from
 * @returns Newly created cohort definition
 */
export function copyVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<CohortDefinition> {
  return service.copyVersion<CohortDefinition>(cohortDefinitionId, versionNumber)
}
