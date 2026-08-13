import { z } from 'zod'

/**
 * Zod schema for User entity
 */
export const userSchema = z.object({
  id: z.number().int(),
  name: z.string().min(1),
  email: z.string().email().optional(),
})

/**
 * Zod schema for Version entity
 * Note: createdBy and comment are optional as they may not be returned by all API endpoints
 * createdDate can be either ISO string or Unix timestamp (milliseconds)
 */
export const versionSchema = z.object({
  version: z.number().int().positive(),
  assetId: z.number().int().positive(),
  createdBy: userSchema.optional(),
  createdDate: z.union([z.string().datetime(), z.number()]),
  comment: z.string().max(500).nullable().optional(),
  archived: z.boolean(),
})

/**
 * Zod schema for array of Version entities
 */
export const versionArraySchema = z.array(versionSchema)

/**
 * Factory function to create a Zod schema for VersionedAsset
 * @param entitySchema - Zod schema for the entity type (e.g., cohortDefinitionSchema)
 */
export const versionedAssetSchema = <T extends z.ZodTypeAny>(entitySchema: T) =>
  z
    .object({
      versionDTO: versionSchema,
      entityDTO: entitySchema,
    })
    .strict()

/**
 * Zod schema for comment update payload
 */
export const commentUpdateSchema = z.object({
  comment: z.string().max(500),
  archived: z.boolean(),
})

// Export types inferred from schemas for convenience
export type UserSchema = z.infer<typeof userSchema>
export type VersionSchema = z.infer<typeof versionSchema>
export type VersionArraySchema = z.infer<typeof versionArraySchema>
export type CommentUpdateSchema = z.infer<typeof commentUpdateSchema>
