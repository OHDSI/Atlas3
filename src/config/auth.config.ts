import type { AuthProvider } from '@/models/auth.types'

export interface AuthConfig {
  userAuthenticationEnabled: boolean
  enableSkipLogin: boolean
  authProviders: AuthProvider[]
  refreshTokenThreshold: number
  webAPIRoot: string
  enablePermissionManagement: boolean
}

/**
 * Parse providers from environment variable JSON string
 */
function parseProvidersFromEnv(): AuthProvider[] {
  const providersJson = import.meta.env.VITE_AUTH_PROVIDERS
  if (!providersJson) return []

  try {
    return JSON.parse(providersJson)
  } catch (error) {
    console.error('Failed to parse VITE_AUTH_PROVIDERS:', error)
    return []
  }
}

/**
 * Parse boolean from environment variable
 */
function parseBooleanEnv(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue
  return value === 'true' || value === '1' || value === 'yes'
}

/**
 * Parse number from environment variable
 */
function parseNumberEnv(value: string | undefined, defaultValue: number): number {
  if (value === undefined) return defaultValue
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Default configuration (fallback if no env vars set)
 */
const defaultConfig: AuthConfig = {
  userAuthenticationEnabled: false,
  enableSkipLogin: false,
  authProviders: [],
  refreshTokenThreshold: 1000 * 60 * 60 * 4, // 4 hours
  webAPIRoot: '/WebAPI',  // Use proxy in development, override with full URL in production
  enablePermissionManagement: true,
}

/**
 * Environment-driven configuration
 * Can be overridden at runtime using setAuthConfig()
 */
export const defaultAuthConfig: AuthConfig = {
  userAuthenticationEnabled: parseBooleanEnv(
    import.meta.env.VITE_AUTH_ENABLED,
    defaultConfig.userAuthenticationEnabled
  ),
  enableSkipLogin: parseBooleanEnv(
    import.meta.env.VITE_AUTH_SKIP_LOGIN,
    defaultConfig.enableSkipLogin
  ),
  authProviders: parseProvidersFromEnv(),
  refreshTokenThreshold: parseNumberEnv(
    import.meta.env.VITE_AUTH_REFRESH_THRESHOLD,
    defaultConfig.refreshTokenThreshold
  ),
  webAPIRoot:
    import.meta.env.VITE_WEBAPI_URL ||
    import.meta.env.VITE_AUTH_WEBAPI_URL ||
    defaultConfig.webAPIRoot,
  enablePermissionManagement: parseBooleanEnv(
    import.meta.env.VITE_AUTH_PERMISSION_MANAGEMENT,
    defaultConfig.enablePermissionManagement
  ),
}

export let authConfig: AuthConfig = { ...defaultAuthConfig }

export function setAuthConfig(config: Partial<AuthConfig>): void {
  authConfig = { ...authConfig, ...config }
}
