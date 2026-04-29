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

/**
 * Per-entity grant returned by /user/me for resources that support ownership
 * (cohort definitions, concept sets, characterizations, etc.).
 */
export interface EntityGrant {
  accessTypes: string[]
  isOwner: boolean
}

export type EntityAccessMap = Record<string, EntityGrant>

/** Source access uses a flat list of access types (no ownership concept). */
export type SourceAccessMap = Record<string, string[]>

/**
 * Per-entity access maps surfaced from /user/me's authz block.
 * Keys are entity ids (as strings); values describe what the user can do
 * with that specific entity, independently of the global permission list.
 */
export interface EntityAccess {
  cohortDefinition: EntityAccessMap
  conceptSet: EntityAccessMap
  cohortCharacterization: EntityAccessMap
  feAnalysis: EntityAccessMap
  pathway: EntityAccessMap
  incidenceRate: EntityAccessMap
  reusable: EntityAccessMap
  source: SourceAccessMap
}

export type EntityAccessKind = Exclude<keyof EntityAccess, 'source'>

export function emptyEntityAccess(): EntityAccess {
  return {
    cohortDefinition: {},
    conceptSet: {},
    cohortCharacterization: {},
    feAnalysis: {},
    pathway: {},
    incidenceRate: {},
    reusable: {},
    source: {},
  }
}

export interface UserInfo {
  login: string
  name?: string
  displayName: string
  email?: string
  permissionIdx: PermissionIndex
  /**
   * Per-entity access maps. Optional on UserInfo for test ergonomics — the
   * auth store always materialises a full {@link EntityAccess} via
   * {@link emptyEntityAccess} when storing the user.
   */
  entityAccess?: EntityAccess
  /** Whether TrexSQL cache feature is enabled on the server (derived from perms) */
  trexsqlCacheEnabled?: boolean
}

export interface AuthState {
  token: string | null
  user: UserInfo | null
  permissions: PermissionIndex
  entityAccess: EntityAccess
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
