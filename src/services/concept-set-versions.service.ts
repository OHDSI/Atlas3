/**
 * Concept Set Versions Service
 * API service for concept set version history
 */
import type { Version, CommentUpdatePayload } from '@/components/versions/types'
import type { ConceptSet, ConceptSetItem } from '@/models/concept-set.types'
import { versionSchema, commentUpdateSchema } from '@/components/versions/schemas'
import { createVersionsService } from '@/services/versions-service.factory'
import { mapExpressionItemsFromAPI, type ConceptSetAPIExpression } from '@/utils/api-mappers'
import { z } from 'zod'
import { logger } from '@/utils/logger'
import { httpGet } from '@/services/http-client'

// entityDTO is the WebAPI ConceptSetDTO, whose `createdBy`/`modifiedBy` are
// user objects; ConceptSetSchema in src/models types them as strings, so it
// would reject a valid payload.
const conceptSetSchema = z.any()

const LOG_TAG = 'ConceptSetVersionsService'

const service = createVersionsService({
  pathPrefix: '/conceptset',
  logTag: LOG_TAG,
  entitySchema: conceptSetSchema,
  copySchema: conceptSetSchema,
  payloadSchema: commentUpdateSchema,
  messages: {
    invalidList: 'Failed to validate version data',
    invalidAsset: 'Failed to validate version data',
    invalidUpdate: 'Failed to validate updated version data',
    invalidCopy: 'Failed to validate created concept set',
  },
})

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
    // WebAPI can send null instead of [] for "no items" - tolerate it rather
    // than hard-failing; treated the same as [] wherever items.length matters.
    items: z.array(z.unknown()).nullable(),
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
    // WebAPI sends items: null instead of [] for empty item lists (see the
    // sibling schema above) - tolerate both here too.
    .nullish(),
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
export function getVersions(conceptSetId: number): Promise<Version[]> {
  return service.getVersions(conceptSetId)
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
      logger.error(LOG_TAG, 'Versioned asset validation error', parsed.error)
      throw new Error('Failed to validate version data')
    }

    const expressionData = await getVersionExpression(conceptSetId, versionNumber)
    const parsedExpression = conceptSetExpressionResponseSchema.safeParse(expressionData)

    if (!parsedExpression.success) {
      logger.error(
        LOG_TAG,
        'Version expression validation error',
        parsedExpression.error
      )
      throw new Error('Failed to validate version items')
    }

    const mappedItems = mapExpressionItemsFromAPI(parsedExpression.data as ConceptSetAPIExpression)

    // The sibling `items` field is the discriminator: a version that legitimately
    // has zero items reports [] (or null) there too. If the sibling reports items
    // but the expression endpoint's mapping produced none, the response body isn't
    // the shape we expect (a different envelope, a partial serialization, an error
    // rendered as `{}`) - fail loudly instead of silently writing an empty set.
    const siblingItemCount = parsed.data.items?.length ?? 0
    if (siblingItemCount > 0 && mappedItems.length === 0) {
      logger.error(
        LOG_TAG,
        `Version ${versionNumber} reports ${siblingItemCount} sibling items but the expression endpoint mapped none`
      )
      throw new Error('Failed to validate version items')
    }

    return {
      versionDTO: parsed.data.versionDTO,
      entityDTO: parsed.data.entityDTO as Omit<ConceptSet, 'items'>,
      items: mappedItems,
    }
  } catch (error) {
    logger.error(
      LOG_TAG,
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
      LOG_TAG,
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
export function updateVersion(
  conceptSetId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  return service.updateVersion(conceptSetId, versionNumber, payload)
}

/**
 * Create a copy of a concept set from a specific version
 * @param conceptSetId Source concept set ID
 * @param versionNumber Version number to copy from
 * @returns Newly created concept set
 */
export function copyVersion(conceptSetId: number, versionNumber: number): Promise<ConceptSet> {
  return service.copyVersion<ConceptSet>(conceptSetId, versionNumber)
}
