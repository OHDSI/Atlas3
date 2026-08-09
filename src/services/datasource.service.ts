/**
 * Data Source API Service
 */
import { logger } from '@/utils/logger'
import {
  DataSourceSchema,
  DashboardReportSchema,
  type DataSource,
  type DashboardReport,
  type DataDensityReport,
  type PersonReport,
  type DashboardAPIResponse,
  type ClinicalDomainAPIResponse,
  type PrevalenceData,
  type ReportType,
} from '@/models/datasource.types'
import {
  transformDashboardReport,
  transformClinicalDomainReport,
  transformDataDensityReport,
  transformPersonReport,
} from '@/utils/datasource-formatters'
import { getAppConfig } from '@/config/app-config.loader'
import { ApiError } from '@/services/api-error'

function getBaseUrl(): string {
  return getAppConfig().api.url
}

const MAX_RETRY_ATTEMPTS = 3
const INITIAL_RETRY_DELAY_MS = 500

// Request cancellation support - use a Map to track multiple requests
const activeRequests = new Map<string, AbortController>()

function cancelRequest(endpoint: string) {
  const controller = activeRequests.get(endpoint)
  if (controller) {
    controller.abort()
    activeRequests.delete(endpoint)
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRetryableError(statusCode?: number): boolean {
  if (statusCode && statusCode >= 500 && statusCode < 600) return true
  if (statusCode === 429) return true
  return false
}

async function getAuthToken(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('@/stores/auth')
    return useAuthStore().token
  } catch {
    return null
  }
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${getBaseUrl()}${endpoint}`
  let lastError: Error | null = null

  // Cancel previous request to the same endpoint
  cancelRequest(endpoint)

  // Create new abort controller for this endpoint
  const abortController = new AbortController()
  activeRequests.set(endpoint, abortController)
  const signal = abortController.signal

  // Get auth token
  const token = await getAuthToken()
  const authHeaders: Record<string, string> = {}
  if (token) {
    authHeaders['Authorization'] = `Bearer ${token}`
  }

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options?.headers,
        },
        signal,
      })

      if (!response.ok) {
        const status = response.status
        const errorText = await response.text().catch(() => 'Unknown error')

        if (isRetryableError(status) && attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
          logger.warn(
            'DataSource',
            `Retrying ${endpoint} after ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`
          )
          await sleep(delayMs)
          continue
        }

        throw new ApiError(`HTTP ${status}: ${errorText}`, status, errorText)
      }

      // Parse JSON response with error handling
      try {
        const data = await response.json()
        activeRequests.delete(endpoint)
        return data
      } catch (parseError) {
        logger.error('DataSource', 'Failed to parse JSON response', parseError)
        throw new Error('Invalid response format')
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        logger.debug('DataSource', 'Request cancelled', endpoint)
        throw error
      }

      lastError = error instanceof Error ? error : new Error('Unknown error')

      // The status check above only escapes this catch by throwing, so without
      // re-checking here every 4xx would be retried anyway.
      if (lastError instanceof ApiError && !isRetryableError(lastError.status)) {
        break
      }

      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
        logger.warn(
          'DataSource',
          `Retrying ${endpoint} after ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`
        )
        await sleep(delayMs)
        continue
      }
    }
  }

  activeRequests.delete(endpoint)
  throw lastError || new Error('Request failed')
}

// In-flight de-duplication for the sources list. Several callers fetch this on
// app start (the TrexSQL availability check in App.vue and the data sources view).
// Because fetchJSON cancels any previous request to the same endpoint, those
// concurrent callers would abort each other, surfacing a spurious
// "Unable to load data sources" error and an empty/"not implemented" report on
// reload/deep-link. Coalescing the concurrent calls into a single request fixes it.
let sourcesInFlight: Promise<DataSource[]> | null = null

/**
 * List all available data sources
 */
export async function listDataSources(): Promise<DataSource[]> {
  if (sourcesInFlight) return sourcesInFlight

  sourcesInFlight = (async () => {
    try {
      logger.debug('DataSource', 'Fetching sources from /source/sources')
      const response = await fetchJSON<DataSource[]>('/source/sources')

      const validated: DataSource[] = []
      for (const source of response) {
        const result = DataSourceSchema.safeParse(source)
        if (result.success) {
          validated.push(result.data)
        } else {
          logger.error('DataSource', 'Data source validation failed', result.error)
        }
      }

      // If no sources passed validation, throw error to maintain backward compatibility
      if (response.length > 0 && validated.length === 0) {
        throw new Error('All data sources failed validation')
      }

      logger.debug('DataSource', `Successfully fetched ${validated.length} sources`)
      return validated
    } catch (error) {
      logger.error('DataSource', 'Failed to fetch sources', error)
      throw new Error('Unable to load data sources. Please try again.')
    } finally {
      // Allow the next (post-completion) call to fetch fresh data.
      sourcesInFlight = null
    }
  })()

  return sourcesInFlight
}

/**
 * Get Dashboard Report
 */
export async function getDashboardReport(sourceKey: string): Promise<DashboardReport> {
  try {
    logger.debug('DataSource', `Fetching dashboard report for ${sourceKey}`)
    const response = await fetchJSON<DashboardAPIResponse>(`/cdmresults/${sourceKey}/dashboard`)

    const transformed = transformDashboardReport(response)
    const result = DashboardReportSchema.safeParse(transformed)

    if (!result.success) {
      logger.error('DataSource', 'Dashboard report validation failed', result.error)
      throw new Error('Invalid dashboard report format')
    }

    logger.debug('DataSource', `Successfully fetched dashboard report for ${sourceKey}`)
    return result.data
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch dashboard report', { sourceKey, error })
    throw new Error('Unable to load Dashboard report. Please try again.')
  }
}

/**
 * Get Data Density Report
 */
export async function getDataDensityReport(sourceKey: string): Promise<DataDensityReport> {
  try {
    logger.debug('DataSource', `Fetching data density report for ${sourceKey}`)
    const response = await fetchJSON<unknown>(`/cdmresults/${sourceKey}/datadensity`)

    const transformed = transformDataDensityReport(
      response as Parameters<typeof transformDataDensityReport>[0]
    )

    logger.debug('DataSource', `Successfully fetched data density report for ${sourceKey}`)
    return transformed
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch data density report', { sourceKey, error })
    throw new Error('Unable to load Data Density report. Please try again.')
  }
}

/**
 * Get Person Report
 */
export async function getPersonReport(sourceKey: string): Promise<PersonReport> {
  try {
    logger.debug('DataSource', `Fetching person report for ${sourceKey}`)
    const response = await fetchJSON<unknown>(`/cdmresults/${sourceKey}/person`)

    const transformed = transformPersonReport(
      response as Parameters<typeof transformPersonReport>[0]
    )

    logger.debug('DataSource', `Successfully fetched person report for ${sourceKey}`)
    return transformed
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch person report', { sourceKey, error })
    throw new Error('Unable to load Person report. Please try again.')
  }
}

/**
 * Get Clinical Domain Report
 */
export async function getClinicalDomainReport(
  sourceKey: string,
  reportType: ReportType
): Promise<PrevalenceData> {
  try {
    const endpoint = getReportEndpoint(reportType)
    logger.debug('DataSource', `Fetching ${reportType} report for ${sourceKey}`)

    const response = await fetchJSON<ClinicalDomainAPIResponse[]>(
      `/cdmresults/${sourceKey}/${endpoint}`
    )
    const transformed = transformClinicalDomainReport(response, reportType)

    logger.debug('DataSource', `Successfully fetched ${reportType} report for ${sourceKey}`)
    return transformed
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch clinical domain report', {
      sourceKey,
      reportType,
      error,
    })
    throw new Error(`Unable to load ${reportType} report. Please try again.`)
  }
}

/**
 * Get Observation Period Report
 * Specialized method for observation period data
 */
export async function getObservationPeriodReport(
  sourceKey: string
): Promise<import('@/models/datasource.types').ObservationPeriodReport> {
  try {
    logger.debug('DataSource', `Fetching observation period report for ${sourceKey}`)
    const response = await fetchJSON<unknown>(`/cdmresults/${sourceKey}/observationPeriod`)

    const { transformObservationPeriodReport } = await import('@/utils/datasource-formatters')
    const transformed = transformObservationPeriodReport(
      response as Parameters<typeof transformObservationPeriodReport>[0]
    )

    logger.debug('DataSource', `Successfully fetched observation period report for ${sourceKey}`)
    return transformed
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch observation period report', { sourceKey, error })
    throw new Error('Unable to load Observation Period report. Please try again.')
  }
}

/**
 * Get Death Report
 * Specialized method for death data
 */
export async function getDeathReport(
  sourceKey: string
): Promise<import('@/models/datasource.types').DeathReport> {
  try {
    logger.debug('DataSource', `Fetching death report for ${sourceKey}`)
    const response = await fetchJSON<unknown>(`/cdmresults/${sourceKey}/death`)

    const { transformDeathReport } = await import('@/utils/datasource-formatters')
    const transformed = transformDeathReport(response as Parameters<typeof transformDeathReport>[0])

    logger.debug('DataSource', `Successfully fetched death report for ${sourceKey}`)
    return transformed
  } catch (error) {
    logger.error('DataSource', 'Failed to fetch death report', { sourceKey, error })
    throw new Error('Unable to load Death report. Please try again.')
  }
}

/**
 * Map report type to API endpoint
 */
function getReportEndpoint(reportType: ReportType): string {
  const mapping: Record<ReportType, string> = {
    dashboard: 'dashboard',
    datadensity: 'datadensity',
    person: 'person',
    visit: 'visit',
    conditionOccurrence: 'condition',
    conditionEra: 'conditionera',
    procedure: 'procedure',
    drugExposure: 'drug',
    drugEra: 'drugera',
    measurement: 'measurement',
    observation: 'observation',
    observationPeriod: 'observationPeriod',
    death: 'death',
  }

  return mapping[reportType] || reportType
}
