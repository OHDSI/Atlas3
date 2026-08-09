/**
 * Incidence Rate Versions Service
 * API service for incidence rate version history.
 */
import { z } from 'zod'
import { createVersionsService } from '@/services/versions-service.factory'
import type { Version, VersionedAsset } from '@/components/versions/types'
import type { IncidenceRate } from '@/models/incidence-rate.types'

// The version endpoint's entityDTO is neither the editor shape
// (IncidenceRateSchema, expression as an object) nor reliably the wire shape
// (IncidenceRateWireSchema, expression as a JSON string), so neither existing
// schema can be applied without risking a false rejection.
const passthroughIR = z.any()

const service = createVersionsService({
  pathPrefix: '/ir',
  logTag: 'IRVersions',
  entitySchema: passthroughIR,
  copySchema: z.object({ id: z.number() }).passthrough(),
  messages: {
    invalidList: 'Invalid version list',
    invalidAsset: 'Invalid version asset',
    invalidUpdate: 'Invalid version update response',
    invalidCopy: 'Invalid copyVersion response',
  },
})

export function getIncidenceRateVersions(irId: number): Promise<Version[]> {
  return service.getVersions(irId)
}

export function getIncidenceRateVersion(
  irId: number,
  versionNumber: number
): Promise<VersionedAsset<IncidenceRate>> {
  return service.getVersion<IncidenceRate>(irId, versionNumber)
}

export interface IncidenceRateVersionUpdate {
  comment?: string
  archived?: boolean
}

export function updateIncidenceRateVersion(
  irId: number,
  versionNumber: number,
  payload: IncidenceRateVersionUpdate
): Promise<Version> {
  return service.updateVersion(irId, versionNumber, payload)
}

export function copyIncidenceRateVersion(
  irId: number,
  versionNumber: number
): Promise<{ id: number }> {
  return service.copyVersion<{ id: number }>(irId, versionNumber)
}
