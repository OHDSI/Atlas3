/**
 * Pathway Versions Service
 * API service for cohort pathway analysis version history
 */
import { z } from 'zod'
import { httpGet, httpPut } from '@/services/http-client'
import { logger } from '@/utils/logger'
import {
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
} from '@/components/versions/schemas'
import type { Version, VersionedAsset } from '@/components/versions/types'
import type { Pathway } from '@/models/pathway.types'

// Use pass-through validation for pathway entity data
const passthroughPathway = z.any()

/**
 * Get all versions for a pathway analysis
 * @param pathwayId Pathway analysis ID
 * @returns Array of versions ordered by version number descending
 */
export async function getPathwayVersions(pathwayId: number): Promise<Version[]> {
  try {
    const data = await httpGet<unknown>(`/pathway-analysis/${pathwayId}/version/`)
    const parsed = versionArraySchema.safeParse(data)
    if (!parsed.success) {
      logger.error('PathwayVersions', 'list validation', parsed.error)
      throw new Error('Invalid version list')
    }
    return parsed.data
  } catch (err) {
    logger.error('PathwayVersions', `list(${pathwayId}) failed`, err)
    throw err
  }
}

/**
 * Get a specific version of a pathway analysis
 * @param pathwayId Pathway analysis ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical pathway data
 */
export async function getPathwayVersion(
  pathwayId: number,
  versionNumber: number
): Promise<VersionedAsset<Pathway>> {
  try {
    const data = await httpGet<unknown>(
      `/pathway-analysis/${pathwayId}/version/${versionNumber}`
    )
    const parsed = versionedAssetSchema(passthroughPathway).safeParse(data)
    if (!parsed.success) {
      logger.error('PathwayVersions', 'asset validation', parsed.error)
      throw new Error('Invalid version asset')
    }
    return parsed.data as VersionedAsset<Pathway>
  } catch (err) {
    logger.error('PathwayVersions', `get(${pathwayId},${versionNumber}) failed`, err)
    throw err
  }
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
export async function updatePathwayVersion(
  pathwayId: number,
  versionNumber: number,
  payload: PathwayVersionUpdate
): Promise<Version> {
  try {
    const data = await httpPut<unknown>(
      `/pathway-analysis/${pathwayId}/version/${versionNumber}`,
      payload
    )
    const parsed = versionSchema.safeParse(data)
    if (!parsed.success) throw new Error('Invalid version update response')
    return parsed.data
  } catch (err) {
    logger.error('PathwayVersions', 'update failed', err)
    throw err
  }
}

/**
 * Create a copy of a pathway analysis from a specific version
 * @param pathwayId Source pathway analysis ID
 * @param versionNumber Version number to copy from
 * @returns Newly created pathway analysis reference
 */
export async function copyPathwayVersion(
  pathwayId: number,
  versionNumber: number
): Promise<{ id: number }> {
  try {
    const data = await httpPut<unknown>(
      `/pathway-analysis/${pathwayId}/version/${versionNumber}/createAsset`,
      undefined
    )
    const parsed = z.object({ id: z.number() }).passthrough().safeParse(data)
    if (!parsed.success) throw new Error('Invalid copyVersion response')
    return parsed.data
  } catch (err) {
    logger.error('PathwayVersions', 'copyVersion failed', err)
    throw err
  }
}
