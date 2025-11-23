/**
 * Cohort Definition Versions Service
 * API service for cohort definition version history
 */
import type { Version, VersionedAsset, CommentUpdatePayload } from '@/components/versions/types'
import type { CohortDefinition } from '@/models/cohort.types'
import {
  versionSchema,
  versionArraySchema,
  versionedAssetSchema,
  commentUpdateSchema,
} from '@/components/versions/schemas'
import { z } from 'zod'

// Use pass-through validation for cohort definition data
const cohortDefinitionSchema = z.any()

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

/**
 * Internal fetch wrapper with error handling and retry logic
 */
async function fetchWithRetry<T>(
  endpoint: string,
  options?: RequestInit,
  retries = 3,
  delay = 500
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      })

      if (!response.ok) {
        // Don't retry 4xx errors (client errors)
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        // Retry 5xx errors (server errors)
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
          continue
        }

        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null as T
      }

      return await response.json() as T
    } catch (error) {
      if (attempt < retries && !(error instanceof Error && error.message.includes('HTTP 4'))) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)))
        continue
      }
      throw error
    }
  }

  throw new Error('Max retries exceeded')
}

/**
 * Get all versions for a cohort definition
 * @param cohortDefinitionId Cohort definition ID
 * @returns Array of versions ordered by version number descending
 */
export async function getVersions(cohortDefinitionId: number): Promise<Version[]> {
  try {
    const data = await fetchWithRetry<unknown>(`/cohortdefinition/${cohortDefinitionId}/version/`)
    const parsed = versionArraySchema.safeParse(data)

    if (!parsed.success) {
      console.error('Version list validation error:', parsed.error)
      throw new Error('Failed to validate version data')
    }

    return parsed.data
  } catch (error) {
    console.error(`Failed to fetch versions for cohort definition ${cohortDefinitionId}:`, error)
    throw error
  }
}

/**
 * Get a specific version of a cohort definition
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to retrieve
 * @returns Versioned asset containing version metadata and historical data
 */
export async function getVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<VersionedAsset<CohortDefinition>> {
  try {
    const data = await fetchWithRetry<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}`
    )

    const parsed = versionedAssetSchema(cohortDefinitionSchema).safeParse(data)

    if (!parsed.success) {
      console.error('Versioned asset validation error:', parsed.error)
      throw new Error('Failed to validate version data')
    }

    return parsed.data as VersionedAsset<CohortDefinition>
  } catch (error) {
    console.error(
      `Failed to fetch version ${versionNumber} for cohort definition ${cohortDefinitionId}:`,
      error
    )
    throw error
  }
}

/**
 * Update version comment or archived status
 * @param cohortDefinitionId Cohort definition ID
 * @param versionNumber Version number to update
 * @param payload Comment and archived status
 * @returns Updated version metadata
 */
export async function updateVersion(
  cohortDefinitionId: number,
  versionNumber: number,
  payload: CommentUpdatePayload
): Promise<Version> {
  try {
    // Validate payload
    const validatedPayload = commentUpdateSchema.parse(payload)

    const data = await fetchWithRetry<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}`,
      {
        method: 'PUT',
        body: JSON.stringify(validatedPayload),
      }
    )

    const parsed = versionSchema.safeParse(data)

    if (!parsed.success) {
      console.error('Version validation error:', parsed.error)
      throw new Error('Failed to validate updated version data')
    }

    return parsed.data
  } catch (error) {
    console.error(
      `Failed to update version ${versionNumber} for cohort definition ${cohortDefinitionId}:`,
      error
    )
    throw error
  }
}

/**
 * Create a copy of a cohort definition from a specific version
 * @param cohortDefinitionId Source cohort definition ID
 * @param versionNumber Version number to copy from
 * @returns Newly created cohort definition
 */
export async function copyVersion(
  cohortDefinitionId: number,
  versionNumber: number
): Promise<CohortDefinition> {
  try {
    const data = await fetchWithRetry<unknown>(
      `/cohortdefinition/${cohortDefinitionId}/version/${versionNumber}/createAsset`,
      {
        method: 'PUT',
      }
    )

    const parsed = cohortDefinitionSchema.safeParse(data)

    if (!parsed.success) {
      console.error('Cohort definition validation error:', parsed.error)
      throw new Error('Failed to validate created cohort definition')
    }

    return parsed.data
  } catch (error) {
    console.error(
      `Failed to copy version ${versionNumber} for cohort definition ${cohortDefinitionId}:`,
      error
    )
    throw error
  }
}
