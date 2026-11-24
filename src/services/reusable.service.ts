/**
 * Reusable Service
 * CRUD, copy and tags for reusables (WebAPI /reusable/...).
 */
import { httpGet, httpPost, httpPut, httpDelete } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import { z } from 'zod'
import { ReusablePageSchema, ReusableSchema, type Reusable } from '@/models/reusable.types'

const CONTEXT = 'ReusableService'

/** Fields WebAPI accepts on create and update. */
export type ReusablePayload = Pick<Reusable, 'name' | 'description' | 'data'>

function toPayload(reusable: ReusablePayload): ReusablePayload {
  return { name: reusable.name, description: reusable.description ?? null, data: reusable.data ?? null }
}

/**
 * List every reusable the user can read.
 * Endpoint: GET /reusable?size=100000 (a Spring Data page; some builds return a bare array)
 */
export async function listReusables(): Promise<ApiResult<Reusable[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/reusable?size=100000')
    if (Array.isArray(data)) {
      return parseOrThrow(z.array(ReusableSchema), data, 'Invalid response from /reusable')
    }
    return parseOrThrow(ReusablePageSchema, data, 'Invalid response from /reusable').content
  }, CONTEXT)
}

/** Endpoint: GET /reusable/{id} */
export async function getReusable(id: number): Promise<ApiResult<Reusable>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>(`/reusable/${id}`)
    return parseOrThrow(ReusableSchema, data, `Invalid response from /reusable/${id}`)
  }, CONTEXT)
}

/** Endpoint: POST /reusable */
export async function createReusable(reusable: ReusablePayload): Promise<ApiResult<Reusable>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/reusable', toPayload(reusable))
    return parseOrThrow(ReusableSchema, data, 'Invalid response from POST /reusable')
  }, CONTEXT)
}

/** Endpoint: PUT /reusable/{id}. WebAPI snapshots the previous state as a version first. */
export async function updateReusable(
  id: number,
  reusable: ReusablePayload
): Promise<ApiResult<Reusable>> {
  return unwrap(async () => {
    const data = await httpPut<unknown>(`/reusable/${id}`, toPayload(reusable))
    return parseOrThrow(ReusableSchema, data, `Invalid response from PUT /reusable/${id}`)
  }, CONTEXT)
}

/** Server-side copy. Endpoint: POST /reusable/{id} (the body is ignored but must be JSON). */
export async function copyReusable(id: number): Promise<ApiResult<Reusable>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>(`/reusable/${id}`, {})
    return parseOrThrow(ReusableSchema, data, `Invalid response from POST /reusable/${id}`)
  }, CONTEXT)
}

/** Endpoint: DELETE /reusable/{id} */
export async function deleteReusable(id: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/reusable/${id}`)
  }, CONTEXT)
}

/** Endpoint: POST /reusable/{id}/tag */
export async function assignReusableTag(id: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpPost(`/reusable/${id}/tag`, tagId)
  }, CONTEXT)
}

/** Endpoint: DELETE /reusable/{id}/tag/{tagId} */
export async function unassignReusableTag(id: number, tagId: number): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete(`/reusable/${id}/tag/${tagId}`)
  }, CONTEXT)
}
