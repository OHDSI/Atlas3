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
}
