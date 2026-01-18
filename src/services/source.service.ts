/**
 * Data Source CRUD Service
 * Handles create, read, update, delete operations for data sources.
 */
import { logger } from '@/utils/logger'
import { httpGet, httpPost, httpPut, httpDelete, getBaseUrl } from '@/services/http-client'
import type { DataSource, SourceRequest, SourceDetails, DaimonRequest } from '@/models/datasource.types'

/**
 * Get detailed information about a source
 */
export async function getSourceDetails(sourceId: number): Promise<SourceDetails> {
  try {
    logger.debug('SourceService', `Fetching source details for ID ${sourceId}`)
    const response = await httpGet<SourceDetails>(`/source/${sourceId}`)
    logger.debug('SourceService', `Successfully fetched source details for ID ${sourceId}`)
    return response
  } catch (error) {
    logger.error('SourceService', 'Failed to fetch source details', { sourceId, error })
    throw new Error('Unable to load source details. Please try again.')
  }
}

/**
 * Create a new data source
 * Uses multipart/form-data when a keyfile is provided
 */
export async function createSource(request: SourceRequest, keyfile?: File): Promise<DataSource> {
  try {
    logger.debug('SourceService', 'Creating new source', { name: request.name })

    let response: DataSource

    if (keyfile) {
      // Use multipart/form-data for keyfile upload
      response = await uploadSourceWithKeyfile('/source', 'POST', request, keyfile)
    } else {
      response = await httpPost<DataSource>('/source', mapRequestToApiPayload(request))
    }

    logger.debug('SourceService', `Successfully created source: ${response.sourceName}`)
    return response
  } catch (error) {
    logger.error('SourceService', 'Failed to create source', { name: request.name, error })
    throw new Error('Unable to create data source. Please try again.')
  }
}

/**
 * Update an existing data source
 * Uses multipart/form-data when a keyfile is provided
 */
export async function updateSource(sourceId: number, request: SourceRequest, keyfile?: File): Promise<DataSource> {
  try {
    logger.debug('SourceService', `Updating source ID ${sourceId}`, { name: request.name })

    let response: DataSource

    if (keyfile) {
      // Use multipart/form-data for keyfile upload
      response = await uploadSourceWithKeyfile(`/source/${sourceId}`, 'PUT', request, keyfile)
    } else {
      response = await httpPut<DataSource>(`/source/${sourceId}`, mapRequestToApiPayload(request))
    }

    logger.debug('SourceService', `Successfully updated source: ${response.sourceName}`)
    return response
  } catch (error) {
    logger.error('SourceService', 'Failed to update source', { sourceId, name: request.name, error })
    throw new Error('Unable to update data source. Please try again.')
  }
}

/**
 * Delete a data source
 */
export async function deleteSource(sourceId: number): Promise<void> {
  try {
    logger.debug('SourceService', `Deleting source ID ${sourceId}`)
    await httpDelete(`/source/${sourceId}`)
    logger.debug('SourceService', `Successfully deleted source ID ${sourceId}`)
  } catch (error) {
    logger.error('SourceService', 'Failed to delete source', { sourceId, error })
    throw new Error('Unable to delete data source. Please try again.')
  }
}

/**
 * Test connection to a data source
 */
export async function testConnection(sourceKey: string): Promise<boolean> {
  try {
    logger.debug('SourceService', `Testing connection for source: ${sourceKey}`)
    await httpGet(`/source/${sourceKey}/connectionCheck`)
    logger.debug('SourceService', `Connection test successful for source: ${sourceKey}`)
    return true
  } catch (error) {
    logger.error('SourceService', 'Connection test failed', { sourceKey, error })
    return false
  }
}

/**
 * Refresh source cache
 */
export async function refreshSourceCache(sourceKey: string): Promise<void> {
  try {
    logger.debug('SourceService', `Refreshing cache for source: ${sourceKey}`)
    await httpPost(`/source/${sourceKey}/refreshSourceCache`)
    logger.debug('SourceService', `Cache refresh started for source: ${sourceKey}`)
  } catch (error) {
    logger.error('SourceService', 'Failed to refresh source cache', { sourceKey, error })
    throw new Error('Unable to refresh source cache. Please try again.')
  }
}

/**
 * Map SourceRequest to API payload format
 */
function mapRequestToApiPayload(request: SourceRequest): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    sourceName: request.name,
    sourceDialect: request.dialect,
    sourceKey: request.key,
    connectionString: request.connectionString
  }

  if (request.username) {
    payload.username = request.username
  }

  if (request.password) {
    payload.password = request.password
  }

  if (request.krbAuthMethod) {
    payload.krbAuthMethod = request.krbAuthMethod
  }

  if (request.krbAdminServer) {
    payload.krbAdminServer = request.krbAdminServer
  }

  if (request.daimons && request.daimons.length > 0) {
    payload.daimons = request.daimons.map((daimon: DaimonRequest, index: number) => ({
      daimonType: daimon.daimonType,
      tableQualifier: daimon.tableQualifier,
      priority: daimon.priority ?? index
    }))
  }

  return payload
}

/**
 * Upload source with keyfile using multipart/form-data
 */
async function uploadSourceWithKeyfile(
  endpoint: string,
  method: 'POST' | 'PUT',
  request: SourceRequest,
  keyfile: File
): Promise<DataSource> {
  const formData = new FormData()

  // Add source data as JSON blob
  const sourceData = mapRequestToApiPayload(request)
  formData.append('source', new Blob([JSON.stringify(sourceData)], { type: 'application/json' }))

  // Add keyfile
  formData.append('keyfile', keyfile)

  // Get auth token
  const { useAuthStore } = await import('@/stores/auth')
  const token = useAuthStore().token

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const url = `${getBaseUrl()}${endpoint}`
  const response = await fetch(url, {
    method,
    headers,
    body: formData
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  return response.json()
}

