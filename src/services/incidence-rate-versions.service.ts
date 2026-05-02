/**
 * Incidence Rate Versions Service
 * API service for incidence rate version history.
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
import type { IncidenceRate } from '@/models/incidence-rate.types'

const passthroughIR = z.any()

export async function getIncidenceRateVersions(irId: number): Promise<Version[]> {
  try {
    const data = await httpGet<unknown>(`/ir/${irId}/version/`)
    const parsed = versionArraySchema.safeParse(data)
    if (!parsed.success) {
      logger.error('IRVersions', 'list validation', parsed.error)
      throw new Error('Invalid version list')
    }
    return parsed.data
  } catch (err) {
    logger.error('IRVersions', `list(${irId}) failed`, err)
    throw err
  }
}

export async function getIncidenceRateVersion(
  irId: number,
  versionNumber: number
): Promise<VersionedAsset<IncidenceRate>> {
  try {
    const data = await httpGet<unknown>(`/ir/${irId}/version/${versionNumber}`)
    const parsed = versionedAssetSchema(passthroughIR).safeParse(data)
    if (!parsed.success) {
      logger.error('IRVersions', 'asset validation', parsed.error)
      throw new Error('Invalid version asset')
    }
    return parsed.data as VersionedAsset<IncidenceRate>
  } catch (err) {
    logger.error('IRVersions', `get(${irId},${versionNumber}) failed`, err)
    throw err
  }
}

export interface IncidenceRateVersionUpdate {
  comment?: string
  archived?: boolean
}

export async function updateIncidenceRateVersion(
  irId: number,
  versionNumber: number,
  payload: IncidenceRateVersionUpdate
): Promise<Version> {
  try {
    const data = await httpPut<unknown>(`/ir/${irId}/version/${versionNumber}`, payload)
    const parsed = versionSchema.safeParse(data)
    if (!parsed.success) throw new Error('Invalid version update response')
    return parsed.data
  } catch (err) {
    logger.error('IRVersions', 'update failed', err)
    throw err
  }
}

export async function copyIncidenceRateVersion(
  irId: number,
  versionNumber: number
): Promise<{ id: number }> {
  try {
    const data = await httpPut<unknown>(
      `/ir/${irId}/version/${versionNumber}/createAsset`,
      undefined
    )
    const parsed = z.object({ id: z.number() }).passthrough().safeParse(data)
    if (!parsed.success) throw new Error('Invalid copyVersion response')
    return parsed.data
  } catch (err) {
    logger.error('IRVersions', 'copyVersion failed', err)
    throw err
  }
}
