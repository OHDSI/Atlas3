import type { JWTPayload as JoseJWTPayload } from 'jose'

export interface JWTPayload extends JoseJWTPayload {
  sub?: string
  exp?: number
  iat?: number
  iss?: string
  [key: string]: unknown
}

export interface AuthToken {
  token: string
  payload: JWTPayload
  expirationDate: Date
  isExpired: boolean
}

export interface AuthProvider {
  name: string
  url: string
  ajax: boolean
  icon: string
  isUseCredentialsForm?: boolean
  logoutUrl?: string
  loginPlaceholder?: string
  passwordPlaceholder?: string
}

export interface PermissionIndex {
  [resource: string]: string[]
}

export interface UserInfo {
  login: string
  name?: string
  displayName: string
  email?: string
  permissionIdx: PermissionIndex
  /** Whether TrexSQL cache feature is enabled on the server */
  trexsqlCacheEnabled?: boolean
}

export interface AuthState {
  token: string | null
  user: UserInfo | null
  permissions: PermissionIndex
  authProvider: string | null
  authClient: string | null
  tokenExpirationDate: Date | null
  isAuthenticated: boolean
  isRefreshing: boolean
  tokenExpired: boolean
  loginModalOpen: boolean
  errorMessage: string | null
  isAuthenticating: boolean
}

export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  token?: string
  permissions?: PermissionIndex
  error?: string
}

export interface RunAsRequest {
  targetUsername: string
}

export interface RunAsState {
  isRunningAs: boolean
  originalUser: UserInfo | null
  targetUser: UserInfo | null
}

export interface TokenRefreshState {
  isRefreshing: boolean
  retryAttempt: number
  nextRetryDelay: number
  refreshTimeoutId: number | null
  refreshPromise: Promise<boolean> | null
}

export interface BackoffConfig {
  initialDelay: number
  multiplier: number
  maxDelay: number
  jitter: number
  maxRetries: number
}

export interface PermissionCheckResult {
  granted: boolean
  matchedGrants?: string[]
}

export enum AuthProviderType {
  DATABASE = 'DB',
  LDAP = 'LDAP',
  ACTIVE_DIRECTORY = 'AD',
  WINDOWS = 'Windows',
  KERBEROS = 'Kerberos',
  OAUTH_GOOGLE = 'Google',
  OAUTH_FACEBOOK = 'Facebook',
  OAUTH_GITHUB = 'Github',
  OPENID = 'OpenID',
  SAML = 'SAML',
}
