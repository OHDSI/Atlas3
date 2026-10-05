import type { AppConfig } from './app-config.types'

export const defaultAppConfig: AppConfig = {
  api: {
    url: '/WebAPI',
  },
  userAuthenticationEnabled: false,
  enableSkipLogin: false,
  enablePermissionManagement: true,
  authProviders: [],
  refreshTokenThreshold: 1000 * 60 * 15, // 15 minutes
  enableIAPSession: false,
  enableTermsAndConditions: false,
  enablePythia: false,
  enablePersonCount: true,
  enableTaggingSection: false,
  defaultLocale: 'en',
  pollInterval: 60000,
  // Telemetry is opt-in: a deployment that never writes an `analytics` block
  // into config-local.json sends nothing and never fetches the SDK chunk.
  analytics: {
    provider: 'none',
    endpoint: '/otlp',
    sampleRatio: 1,
    traceApiCalls: true,
    traceDocumentLoad: true,
    identifyUsers: true,
    // Safe side of the switch. Flipping it requires a literal `false`.
    scrubUrlQueryStrings: true,
  },
}
