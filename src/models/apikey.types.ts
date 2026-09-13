/**
 * API Key Models
 * Shapes returned by WebAPI's personal API key endpoints (/user/apikeys).
 */
import { z } from 'zod'

// WebAPI's `write-dates-as-timestamps` Jackson setting serializes java.time.Instant
// as a numeric (fractional seconds since epoch), unlike the java.util.Date fields
// elsewhere in the API which serialize as epoch milliseconds. Accept either shape.
const InstantSchema = z.union([z.string(), z.number()])

export const ApiKeyInfoSchema = z.object({
  name: z.string(),
  description: z.string().nullable().optional(),
  keyIdentifier: z.string(),
  createdAt: InstantSchema,
  expiresAt: InstantSchema.nullable().optional(),
  disabled: z.boolean(),
  lastUsedAt: InstantSchema.nullable().optional(),
})
export type ApiKeyInfo = z.infer<typeof ApiKeyInfoSchema>

export const ApiKeyInfoListSchema = z.array(ApiKeyInfoSchema)

export const ApiKeyResultSchema = z.object({
  name: z.string(),
  keyIdentifier: z.string(),
  rawKey: z.string(),
  createdAt: InstantSchema,
  expiresAt: InstantSchema.nullable().optional(),
})
export type ApiKeyResult = z.infer<typeof ApiKeyResultSchema>

/** Mirrors WebAPI's `ApiKeyController.CreateRequest`. */
export interface CreateApiKeyRequest {
  name: string
  description?: string | null
  expiresInDays?: number | null
}

/**
 * Converts a WebAPI Instant value (fractional epoch seconds, or an ISO
 * string) into a `Date`. Returns null for missing/invalid input.
 */
export function apiKeyInstantToDate(value: string | number | null | undefined): Date | null {
  if (value === null || value === undefined) return null
  const date = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  return isNaN(date.getTime()) ? null : date
}
