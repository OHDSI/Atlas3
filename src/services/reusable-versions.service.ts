/**
 * Reusable Versions Service
 * Version history for reusables (WebAPI /reusable/{id}/version/...).
 */
import { z } from 'zod'
import { createVersionsService } from '@/services/versions-service.factory'
import type { Version, VersionedAsset } from '@/components/versions/types'
import { ReusableSchema, type Reusable } from '@/models/reusable.types'

const service = createVersionsService({
  pathPrefix: '/reusable',
  logTag: 'ReusableVersions',
  entitySchema: ReusableSchema,
  copySchema: z.object({ id: z.number() }).passthrough(),
  messages: {
    invalidList: 'Invalid version list',
    invalidAsset: 'Invalid version asset',
    invalidUpdate: 'Invalid version update response',
    invalidCopy: 'Invalid copyVersion response',
  },
})

export function getReusableVersions(id: number): Promise<Version[]> {
  return service.getVersions(id)
}

export function getReusableVersion(
  id: number,
  versionNumber: number
): Promise<VersionedAsset<Reusable>> {
  return service.getVersion<Reusable>(id, versionNumber)
}

export interface ReusableVersionUpdate {
  comment?: string
  archived?: boolean
}

export function updateReusableVersion(
  id: number,
  versionNumber: number,
  payload: ReusableVersionUpdate
): Promise<Version> {
  return service.updateVersion(id, versionNumber, payload)
}

export function copyReusableVersion(id: number, versionNumber: number): Promise<{ id: number }> {
  return service.copyVersion<{ id: number }>(id, versionNumber)
}
