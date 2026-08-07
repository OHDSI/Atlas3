/**
 * Concept Set Versions Service
 * API service for concept set version history
 */
import type { Version, CommentUpdatePayload } from '@/components/versions/types'
import type { ConceptSet, ConceptSetItem } from '@/models/concept-set.types'
import { versionSchema, versionArraySchema, commentUpdateSchema } from '@/components/versions/schemas'
import { mapExpressionItemsFromAPI, type ConceptSetAPIExpression } from '@/utils/api-mappers'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { httpGet, httpPut } from '@/services/http-client'

// Use pass-through validation for concept set data
const conceptSetSchema = z.any()

/**
 * ConceptSetVersionFullDTO (WebAPI) puts `items` alongside `entityDTO`, not
 * inside it — unlike cohort/pathway/IR, which have no such field — so concept
 * sets need their own schema instead of loosening the shared strict one.
 * The sibling `items` themselves are the bare ConceptSetItem entity (conceptId
 * + flags, no concept metadata), so we only validate their shape here; the
 * enriched data used to populate a preview comes from the expression endpoint.
 */
const conceptSetVersionedAssetSchema = z
  .object({
    versionDTO: versionSchema,
    entityDTO: conceptSetSchema,
    items: z.array(z.unknown()),
  })
  .strict()

const conceptSetExpressionResponseSchema = z.object({
  items: z
    .array(
      z.object({
        concept: z.object({
          CONCEPT_ID: z.number(),
          CONCEPT_NAME: z.string(),
          CONCEPT_CODE: z.string(),
          DOMAIN_ID: z.string(),
          VOCABULARY_ID: z.string(),
          CONCEPT_CLASS_ID: z.string(),
          STANDARD_CONCEPT: z.string().nullable(),
          INVALID_REASON: z.string().nullable(),
        }),
        isExcluded: z.boolean(),
        includeDescendants: z.boolean(),
        includeMapped: z.boolean(),
      })
    )
    .optional(),
})

/**
 * Versioned asset for a concept set: entityDTO never carries items (WebAPI's
 * ConceptSetDTO has none), so historical items are surfaced as their own field
 * rather than shoehorned into entityDTO's shape.
 */
export interface ConceptSetVersionedAsset {
  versionDTO: Version
  entityDTO: Omit<ConceptSet, 'items'>
  items: ConceptSetItem[]
}

/**
 * Get all versions for a concept set
 * @param conceptSetId Concept set ID
 * @returns Array of versions ordered by version number descending
 */
export async function getVersions(conceptSetId: number): Promise<Version[]> {
  try {
    const data = await httpGet<unknown>(`/conceptset/${conceptSetId}/version/`)
    const parsed = versionArraySchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSetVersionsService', 'Version list validation error', parsed.error)
      throw new Error('Failed to validate version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'ConceptSetVersionsService',
      `Failed to fetch versions for concept set ${conceptSetId}`,
      error
    )
    throw error
  }
}

/**
 * Get a specific version of a concept set
 * @param conceptSetId Concept set ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export async function getVersion(
  conceptSetId: number,
  versionNumber: number
): Promise<ConceptSetVersionedAsset> {
  try {
    const data = await httpGet<unknown>(`/conceptset/${conceptSetId}/version/${versionNumber}`)

    const parsed = conceptSetVersionedAssetSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSetVersionsService', 'Versioned asset validation error', parsed.error)
      throw new Error('Failed to validate version data')
    }

    const expressionData = await getVersionExpression(conceptSetId, versionNumber)
    const parsedExpression = conceptSetExpressionResponseSchema.safeParse(expressionData)

    if (!parsedExpression.success) {
      logger.error(
        'ConceptSetVersionsService',
        'Version expression validation error',
        parsedExpression.error
      )
      throw new Error('Failed to validate version items')
    }

    return {
      versionDTO: parsed.data.versionDTO,
      entityDTO: parsed.data.entityDTO as Omit<ConceptSet, 'items'>,
      items: mapExpressionItemsFromAPI(parsedExpression.data as ConceptSetAPIExpression),
    }
  } catch (error) {
    logger.error(
      'ConceptSetVersionsService',
      `Failed to fetch version ${versionNumber} for concept set ${conceptSetId}:`,
      error
    )
    throw error
  }
}

/**
 * Get the expression for a specific version of a concept set
 * This is specific to concept sets (FR-035) - cohort definitions don't have this
 * @param conceptSetId Concept set ID
 * @param versionNumber Version number
 * @returns Expression data for the version
 */
export async function getVersionExpression(
  conceptSetId: number,
  versionNumber: number
): Promise<unknown> {
  try {
    const data = await httpGet<unknown>(
      `/conceptset/${conceptSetId}/version/${versionNumber}/expression`
    )
    return data
  } catch (error) {
    logger.error(
      'ConceptSetVersionsService',
      `Failed to fetch expression for version ${versionNumber} of concept set ${conceptSetId}:`,
      error
    )
    throw error
  }
}

/**
 * Update version comment or archived status
 * @param conceptSetId Concept set ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export async function updateVersion(
  conceptSetId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  try {
    // Validate payload
    const validatedPayload = commentUpdateSchema.parse(payload)

    const data = await httpPut<unknown>(
      `/conceptset/${conceptSetId}/version/${versionNumber}`,
      validatedPayload
    )

    const parsed = versionSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSetVersionsService', 'Version validation error', parsed.error)
      throw new Error('Failed to validate updated version data')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'ConceptSetVersionsService',
      `Failed to update version ${versionNumber} for concept set ${conceptSetId}:`,
      error
    )
    throw error
  }
}

/**
 * Create a copy of a concept set from a specific version
 * @param conceptSetId Source concept set ID
 * @param versionNumber Version number to copy from
 * @returns Newly created concept set
 */
export async function copyVersion(
  conceptSetId: number,
  versionNumber: number
): Promise<ConceptSet> {
  try {
    const data = await httpPut<unknown>(
      `/conceptset/${conceptSetId}/version/${versionNumber}/createAsset`
    )

    const parsed = conceptSetSchema.safeParse(data)

    if (!parsed.success) {
      logger.error('ConceptSetVersionsService', 'Concept set validation error', parsed.error)
      throw new Error('Failed to validate created concept set')
    }

    return parsed.data
  } catch (error) {
    logger.error(
      'ConceptSetVersionsService',
      `Failed to copy version ${versionNumber} for concept set ${conceptSetId}:`,
      error
    )
    throw error
  }
}
