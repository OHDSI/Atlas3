import type { AuthProvider } from '@/models/auth.types'
import { getAppConfig } from '@/config/app-config.loader'
import { logger } from '@/utils/logger'

export interface AuthConfig {
  userAuthenticationEnabled: boolean
  enableSkipLogin: boolean
  authProviders: AuthProvider[]
  refreshTokenThreshold: number
  webAPIRoot: string
  enablePermissionManagement: boolean
}

/**
 * Build auth configuration from the runtime AppConfig.
 * Called lazily (not at module load) so that loadAppConfig() has completed first.
 */
function buildAuthConfig(): AuthConfig {
  const appConfig = getAppConfig()
  return {
    userAuthenticationEnabled: appConfig.userAuthenticationEnabled,
    enableSkipLogin: appConfig.enableSkipLogin,
    authProviders: appConfig.authProviders,
    refreshTokenThreshold: appConfig.refreshTokenThreshold,
    webAPIRoot: appConfig.api.url,
    enablePermissionManagement: appConfig.enablePermissionManagement,
  }
}

/**
 * Auth configuration — initialized on first access after AppConfig is loaded.
 * Can be overridden at runtime using setAuthConfig().
 */
let _authConfig: AuthConfig | null = null

export function getAuthConfig(): AuthConfig {
  if (!_authConfig) {
    _authConfig = buildAuthConfig()
    logger.debug('AuthConfig', 'Final authConfig', _authConfig)
    logger.debug('AuthConfig', 'Auth providers count', _authConfig.authProviders.length)
  }
  return _authConfig
}

export function setAuthConfig(config: Partial<AuthConfig>): void {
  _authConfig = { ...getAuthConfig(), ...config }
}
