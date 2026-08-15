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
import { ApiError } from '@/services/api-error'
import { httpClient, type HttpClientOptions } from '@/services/http-client'

// Request cancellation support - use a Map to track multiple requests
const activeRequests = new Map<string, AbortController>()

function cancelRequest(endpoint: string) {
  const controller = activeRequests.get(endpoint)
  if (controller) {
    controller.abort()
    activeRequests.delete(endpoint)
  }
}

/**
 * Every CDM-results request goes through the shared httpClient. This used to be
 * a second copy of that client's retry/auth loop, which silently drifted: a 401
 * never cleared the session or opened the login modal, so an expired token
 * turned every dashboard and report into a dead-end error instead of a login
 * prompt; no User-Language header went out, so WebAPI answered untranslated;
 * and the error body was not unwrapped, discarding the server's explanation
 * (#132). Everything here beyond cancellation is now the shared client's job.
 */
async function fetchJSON<T>(endpoint: string, options?: HttpClientOptions): Promise<T> {
  // A newer request for the same endpoint supersedes the one in flight — the
  // reports switch source faster than WebAPI answers. /source/sources is exempt
  // via listDataSources' coalescing below.
  cancelRequest(endpoint)

  const abortController = new AbortController()
  activeRequests.set(endpoint, abortController)

  try {
    return await httpClient<T>(endpoint, { ...options, signal: abortController.signal })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logger.debug('DataSource', 'Request cancelled', endpoint)
    }
    throw error
  } finally {
    // Only clear our own entry: a superseding request has already replaced it.
    if (activeRequests.get(endpoint) === abortController) {
      activeRequests.delete(endpoint)
    }
  }
}

// A WebAPI error body can be a full stack trace; the toast only has room for
// the gist of it.
const MAX_DETAIL_LENGTH = 200

/**
 * "Unable to load Person report. Please try again." is the same sentence whether
 * the results daimon is missing, the cache is detached or the session expired —
 * retrying fixes none of them. Append what WebAPI actually said, now that the
 * shared client preserves it, and keep the generic advice only when there is
 * nothing to append.
 */
function reportFailure(summary: string, error: unknown): Error {
  const detail = error instanceof ApiError ? (error.body ?? '').trim() : ''
  if (!detail) return new Error(`${summary}. Please try again.`)
  const capped =
    detail.length > MAX_DETAIL_LENGTH ? `${detail.slice(0, MAX_DETAIL_LENGTH)}…` : detail
  return new Error(`${summary}: ${capped}`)
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
      throw reportFailure('Unable to load data sources', error)
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
    throw reportFailure('Unable to load Dashboard report', error)
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
    throw reportFailure('Unable to load Data Density report', error)
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
    throw reportFailure('Unable to load Person report', error)
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
    throw reportFailure(`Unable to load ${reportType} report`, error)
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
    throw reportFailure('Unable to load Observation Period report', error)
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
    throw reportFailure('Unable to load Death report', error)
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
