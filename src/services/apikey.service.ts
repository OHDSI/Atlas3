/**
 * API Key Service
 * Personal API key management (WebAPI /user/apikeys). Create/list/revoke/delete
 * for keys owned by the currently authenticated user.
 */
import { httpGet, httpPost, httpDelete } from '@/services/http-client'
import { unwrap, parseOrThrow } from '@/services/api-error'
import { type ApiResult } from '@/types/api'
import {
  ApiKeyInfoListSchema,
  ApiKeyResultSchema,
  type ApiKeyInfo,
  type ApiKeyResult,
  type CreateApiKeyRequest,
} from '@/models/apikey.types'

const CONTEXT = 'ApiKeyService'

export async function listApiKeys(): Promise<ApiResult<ApiKeyInfo[]>> {
  return unwrap(async () => {
    const data = await httpGet<unknown>('/user/apikeys')
    return parseOrThrow(ApiKeyInfoListSchema, data, 'Invalid API key list response format')
  }, CONTEXT)
}

export async function createApiKey(request: CreateApiKeyRequest): Promise<ApiResult<ApiKeyResult>> {
  return unwrap(async () => {
    const data = await httpPost<unknown>('/user/apikeys', request)
    return parseOrThrow(ApiKeyResultSchema, data, 'Invalid API key creation response format')
  }, CONTEXT)
}

/** Soft-disables a key: it stops authenticating but stays listed. */
export async function revokeApiKey(keyIdentifier: string): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete<void>(`/user/apikeys/${encodeURIComponent(keyIdentifier)}`)
  }, CONTEXT)
}

/** Permanently removes the key record. */
export async function deleteApiKey(keyIdentifier: string): Promise<ApiResult<void>> {
  return unwrap(async () => {
    await httpDelete<void>(`/user/apikeys/${encodeURIComponent(keyIdentifier)}?remove=true`)
  }, CONTEXT)
}
