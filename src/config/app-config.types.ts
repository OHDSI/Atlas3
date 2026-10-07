import type { AuthProvider } from '@/models/auth.types'

/**
 * Browser telemetry settings. Runtime-configured so a single Atlas image can
 * ship to a site that wants usage telemetry and a site that forbids it.
 *
 * Exports OpenTelemetry spans to the same collector as the WebAPI agent, so
 * nothing leaves the deployment.
 */
export interface AnalyticsConfig {
  /** `none` disables all browser telemetry and skips loading the SDK entirely. */
  provider: 'none' | 'otlp'
  /**
   * Base path or URL of the OTLP/HTTP collector. `/otlp` keeps it same-origin
   * via Caddy, which avoids CORS and means the collector needs no public port.
   * `/v1/traces` is appended.
   */
  endpoint: string
  /** Head sampling, 0..1. */
  sampleRatio: number
  /** Trace fetch/XHR calls, giving browser-to-SQL traces via `traceparent`. */
  traceApiCalls: boolean
  /** Trace initial page load timing. */
  traceDocumentLoad: boolean
  /** Attach the Atlas login as `enduser.id` (pseudonymous). */
  identifyUsers: boolean
  /**
   * Remove query strings from every URL attribute before export. On whenever
   * omitted, off only for a literal `false`: Atlas puts free-text concept
   * searches and filter values in query strings, so dropping this protection
   * has to be a deliberate act rather than something an absent key causes.
   */
  scrubUrlQueryStrings: boolean
}

export interface AppConfig {
  /** WebAPI connection */
  api: {
    url: string
  }

  /** Authentication */
  userAuthenticationEnabled: boolean
  enableSkipLogin: boolean
  enablePermissionManagement: boolean
  authProviders: AuthProvider[]
  refreshTokenThreshold: number
  enableIAPSession: boolean

  /** Feature flags */
  enableTermsAndConditions: boolean
  enablePythia: boolean
  enablePersonCount: boolean
  enableTaggingSection: boolean

  /** Locale */
  defaultLocale: string

  /** Polling */
  pollInterval: number

  /** Browser telemetry */
  analytics: AnalyticsConfig
}
