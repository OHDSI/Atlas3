import type { AuthProvider } from '@/models/auth.types'

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
}
