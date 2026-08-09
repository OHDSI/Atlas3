/**
 * Versions Service Factory
 * Builds the shared version-history API surface (list, get, update, copy) that
 * every versioned asset exposes at /{prefix}/{id}/version/...
 */
import { z } from 'zod'
import { httpGet, httpPut } from '@/services/http-client'
import { logger } from '@/utils/logger'
import {
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
} from '@/components/versions/schemas'
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'

export interface VersionsServiceMessages {
  invalidList: string
  invalidAsset: string
  invalidUpdate: string
  invalidCopy: string
}

export interface VersionsServiceConfig<
  TEntity extends z.ZodTypeAny,
  TCopy extends z.ZodTypeAny,
  TPayload extends z.ZodTypeAny | undefined,
> {
  pathPrefix: string
  logTag: string
  entitySchema: TEntity
  copySchema: TCopy
  /** Omit for endpoints that accept a partial (comment-only) update payload. */
  payloadSchema?: TPayload
  messages: VersionsServiceMessages
}

type UpdatePayload<TPayload> = TPayload extends z.ZodTypeAny
  ? z.infer<TPayload>
  : Partial<CommentUpdatePayload>

export function createVersionsService<
  TEntity extends z.ZodTypeAny,
  TCopy extends z.ZodTypeAny,
  TPayload extends z.ZodTypeAny | undefined = undefined,
>(config: VersionsServiceConfig<TEntity, TCopy, TPayload>) {
  const { pathPrefix, logTag, entitySchema, copySchema, payloadSchema, messages } = config
  const assetSchema = versionedAssetSchema(entitySchema)

  async function getVersions(assetId: number): Promise<Version[]> {
    try {
      const data = await httpGet<unknown>(`${pathPrefix}/${assetId}/version/`)
      const parsed = versionArraySchema.safeParse(data)

      if (!parsed.success) {
        logger.error(logTag, 'Version list validation error', parsed.error)
        throw new Error(messages.invalidList)
      }

      return parsed.data
    } catch (error) {
      logger.error(logTag, `Failed to fetch versions for ${assetId}`, error)
      throw error
    }
  }

  async function getVersion<T = z.infer<TEntity>>(
    assetId: number,
    versionNumber: number
  ): Promise<VersionedAsset<T>> {
    try {
      const data = await httpGet<unknown>(`${pathPrefix}/${assetId}/version/${versionNumber}`)
      const parsed = assetSchema.safeParse(data)

      if (!parsed.success) {
        logger.error(logTag, 'Versioned asset validation error', parsed.error)
        throw new Error(messages.invalidAsset)
      }

      return parsed.data as VersionedAsset<T>
    } catch (error) {
      logger.error(logTag, `Failed to fetch version ${versionNumber} for ${assetId}`, error)
      throw error
    }
  }

  async function updateVersion(
    assetId: number,
    versionNumber: number,
    payload: UpdatePayload<TPayload>
  ): Promise<Version> {
    try {
      const body = payloadSchema ? payloadSchema.parse(payload) : payload

      const data = await httpPut<unknown>(`${pathPrefix}/${assetId}/version/${versionNumber}`, body)

      const parsed = versionSchema.safeParse(data)

      if (!parsed.success) {
        logger.error(logTag, 'Version validation error', parsed.error)
        throw new Error(messages.invalidUpdate)
      }

      return parsed.data
    } catch (error) {
      logger.error(logTag, `Failed to update version ${versionNumber} for ${assetId}`, error)
      throw error
    }
  }

  async function copyVersion<T = z.infer<TCopy>>(
    assetId: number,
    versionNumber: number
  ): Promise<T> {
    try {
      const data = await httpPut<unknown>(
        `${pathPrefix}/${assetId}/version/${versionNumber}/createAsset`
      )

      const parsed = copySchema.safeParse(data)

      if (!parsed.success) {
        logger.error(logTag, 'Created asset validation error', parsed.error)
        throw new Error(messages.invalidCopy)
      }

      return parsed.data as T
    } catch (error) {
      logger.error(logTag, `Failed to copy version ${versionNumber} for ${assetId}`, error)
      throw error
    }
  }

  return { getVersions, getVersion, updateVersion, copyVersion }
}
