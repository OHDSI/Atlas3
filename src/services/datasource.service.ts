/**
 * Data Source API Service
 * Feature: 006-datasources
 */
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
  type ReportType
} from '@/models/datasource.types'
import { 
  transformDashboardReport, 
  transformClinicalDomainReport,
  transformDataDensityReport,
  transformPersonReport
} from '@/utils/datasource-formatters'

const BASE_URL = import.meta.env.VITE_WEBAPI_URL || '/WebAPI'

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

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${BASE_URL}${endpoint}`
  let lastError: Error | null = null

  // Cancel previous request to the same endpoint
  cancelRequest(endpoint)
  
  // Create new abort controller for this endpoint
  const abortController = new AbortController()
  activeRequests.set(endpoint, abortController)
  const signal = abortController.signal

  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        signal
      })

      if (!response.ok) {
        const status = response.status
        const errorText = await response.text().catch(() => 'Unknown error')
        
        if (isRetryableError(status) && attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
          console.warn(`[DataSource] Retrying ${endpoint} after ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`)
          await sleep(delayMs)
          continue
        }
        
        throw new Error(`HTTP ${status}: ${errorText}`)
      }

      const data = await response.json()
      activeRequests.delete(endpoint)
      return data
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('[DataSource] Request cancelled:', endpoint)
        throw error
      }
      
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt < MAX_RETRY_ATTEMPTS - 1) {
        const delayMs = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[DataSource] Retrying ${endpoint} after ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS})`)
        await sleep(delayMs)
        continue
      }
    }
  }

  activeRequests.delete(endpoint)
  throw lastError || new Error('Request failed')
}

/**
 * List all available data sources
 */
export async function listDataSources(): Promise<DataSource[]> {
  try {
    console.log('[DataSource] Fetching sources from /source/sources')
    const response = await fetchJSON<DataSource[]>('/source/sources')
    
    const validated = response.map(source => DataSourceSchema.parse(source))
    console.log('[DataSource] Successfully fetched', validated.length, 'sources')
    
    return validated
  } catch (error) {
    console.error('[DataSource] Failed to fetch sources:', error)
    throw new Error('Unable to load data sources. Please try again.')
  }
}

/**
 * Get Dashboard Report
 */
export async function getDashboardReport(sourceKey: string): Promise<DashboardReport> {
  try {
    console.log('[DataSource] Fetching dashboard report for', sourceKey)
    const response = await fetchJSON<DashboardAPIResponse>(`/cdmresults/${sourceKey}/dashboard`)
    
    const transformed = transformDashboardReport(response)
    const validated = DashboardReportSchema.parse(transformed)
    
    console.log('[DataSource] Successfully fetched dashboard report for', sourceKey)
    return validated
  } catch (error) {
    console.error('[DataSource] Failed to fetch dashboard report:', { sourceKey, error })
    throw new Error('Unable to load Dashboard report. Please try again.')
  }
}

/**
 * Get Data Density Report
 */
export async function getDataDensityReport(sourceKey: string): Promise<DataDensityReport> {
  try {
    console.log('[DataSource] Fetching data density report for', sourceKey)
    const response = await fetchJSON<any>(`/cdmresults/${sourceKey}/datadensity`)
    
    const transformed = transformDataDensityReport(response)
    
    console.log('[DataSource] Successfully fetched data density report for', sourceKey)
    return transformed
  } catch (error) {
    console.error('[DataSource] Failed to fetch data density report:', { sourceKey, error })
    throw new Error('Unable to load Data Density report. Please try again.')
  }
}

/**
 * Get Person Report  
 */
export async function getPersonReport(sourceKey: string): Promise<PersonReport> {
  try {
    console.log('[DataSource] Fetching person report for', sourceKey)
    const response = await fetchJSON<any>(`/cdmresults/${sourceKey}/person`)
    
    const transformed = transformPersonReport(response)
    
    console.log('[DataSource] Successfully fetched person report for', sourceKey)
    return transformed
  } catch (error) {
    console.error('[DataSource] Failed to fetch person report:', { sourceKey, error })
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
    console.log('[DataSource] Fetching', reportType, 'report for', sourceKey)
    
    const response = await fetchJSON<ClinicalDomainAPIResponse[]>(`/cdmresults/${sourceKey}/${endpoint}`)
    const transformed = transformClinicalDomainReport(response, reportType)
    
    console.log('[DataSource] Successfully fetched', reportType, 'report for', sourceKey)
    return transformed
  } catch (error) {
    console.error('[DataSource] Failed to fetch clinical domain report:', { sourceKey, reportType, error })
    throw new Error(`Unable to load ${reportType} report. Please try again.`)
  }
}

/**
 * Get Observation Period Report
 * Specialized method for observation period data
 */
export async function getObservationPeriodReport(sourceKey: string): Promise<import('@/models/datasource.types').ObservationPeriodReport> {
  try {
    console.log('[DataSource] Fetching observation period report for', sourceKey)
    const response = await fetchJSON<any>(`/cdmresults/${sourceKey}/observationPeriod`)
    
    const { transformObservationPeriodReport } = await import('@/utils/datasource-formatters')
    const transformed = transformObservationPeriodReport(response)
    
    console.log('[DataSource] Successfully fetched observation period report for', sourceKey)
    return transformed
  } catch (error) {
    console.error('[DataSource] Failed to fetch observation period report:', { sourceKey, error })
    throw new Error('Unable to load Observation Period report. Please try again.')
  }
}

/**
 * Get Death Report
 * Specialized method for death data
 */
export async function getDeathReport(sourceKey: string): Promise<import('@/models/datasource.types').DeathReport> {
  try {
    console.log('[DataSource] Fetching death report for', sourceKey)
    const response = await fetchJSON<any>(`/cdmresults/${sourceKey}/death`)
    
    const { transformDeathReport } = await import('@/utils/datasource-formatters')
    const transformed = transformDeathReport(response)
    
    console.log('[DataSource] Successfully fetched death report for', sourceKey)
    return transformed
  } catch (error) {
    console.error('[DataSource] Failed to fetch death report:', { sourceKey, error })
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
    death: 'death'
  }
  
  return mapping[reportType] || reportType
}
