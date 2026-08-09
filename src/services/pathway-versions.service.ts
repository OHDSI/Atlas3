/**
 * Pathway Versions Service
 * API service for cohort pathway analysis version history
 */
import { z } from 'zod'
import { createVersionsService } from '@/services/versions-service.factory'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { PathwaySchema, type Pathway } from '@/models/pathway.types'

const service = createVersionsService({
  pathPrefix: '/pathway-analysis',
  logTag: 'PathwayVersions',
  entitySchema: PathwaySchema,
  copySchema: z.object({ id: z.number() }).passthrough(),
  messages: {
    invalidList: 'Invalid version list',
    invalidAsset: 'Invalid version asset',
    invalidUpdate: 'Invalid version update response',
    invalidCopy: 'Invalid copyVersion response',
  },
})

/**
 * Get all versions for a pathway analysis
 * @param pathwayId Pathway analysis ID
 * @returns Array of versions ordered by version number descending
 */
export function getPathwayVersions(pathwayId: number): Promise<Version[]> {
  return service.getVersions(pathwayId)
}

/**
 * Get a specific version of a pathway analysis
 * @param pathwayId Pathway analysis ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical pathway data
 */
export function getPathwayVersion(
  pathwayId: number,
  versionNumber: number
): Promise<VersionedAsset<Pathway>> {
  return service.getVersion<Pathway>(pathwayId, versionNumber)
}

export interface PathwayVersionUpdate {
  comment?: string
  archived?: boolean
}

/**
 * Update version comment or archived status
 * @param pathwayId Pathway analysis ID
 * @param versionNumber Version number to update
 * @param payload Comment and/or archived status
 * @returns Updated version metadata
 */
export function updatePathwayVersion(
  pathwayId: number,
  versionNumber: number,
  payload: PathwayVersionUpdate
): Promise<Version> {
  return service.updateVersion(pathwayId, versionNumber, payload)
}

/**
 * Create a copy of a pathway analysis from a specific version
 * @param pathwayId Source pathway analysis ID
 * @param versionNumber Version number to copy from
 * @returns Newly created pathway analysis reference
 */
export function copyPathwayVersion(
  pathwayId: number,
  versionNumber: number
): Promise<{ id: number }> {
  return service.copyVersion<{ id: number }>(pathwayId, versionNumber)
}
