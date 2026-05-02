/**
 * Type Definitions for Authentication Enhancements
 *
 * Complete TypeScript type system for token refresh, expiry detection,
 * cross-tab sync, and wildcard permission matching features.
 *
 * @packageDocumentation
 */

// ============================================================================
// Token Refresh Types
// ============================================================================

/**
 * State of an ongoing or completed token refresh operation
 */
export interface TokenRefreshState {
  /** Whether a refresh operation is currently in progress */
  isRefreshing: boolean

  /** Promise reference for in-flight refresh (prevents duplicate requests) */
  refreshPromise: Promise<boolean> | null

  /** Number of retry attempts for current refresh (max 3) */
  retryCount: number

  /** Timestamp of last successful refresh */
  lastRefreshTime: Date | null

  /** Timestamp of last failed refresh attempt */
  lastFailureTime: Date | null

  /** Error from last failed refresh */
  lastError: Error | null
}

/**
 * Configuration for token refresh service
 */
export interface TokenRefreshConfig {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries: number

  /** Base delay in milliseconds for exponential backoff (default: 1000ms) */
  baseDelayMs: number

  /** Buffer time in minutes before expiration to trigger refresh (default: 5) */
  refreshBufferMinutes: number

  /** API endpoint for token refresh (default: '/user/refresh') */
  refreshEndpoint: string

  /** Header name containing new token (default: 'bearer') */
  tokenHeader: string
}

/**
 * Result of a token refresh attempt
 */
export interface TokenRefreshResult {
  /** Whether refresh was successful */
  success: boolean

  /** New token if successful */
  token?: string

  /** Error if unsuccessful */
  error?: Error

  /** Number of retries attempted */
  retriesAttempted: number

  /** Total time taken in milliseconds */
  durationMs: number
}

// ============================================================================
// Token Expiry Detection Types
// ============================================================================

/**
 * Scheduled timeout for triggering session expiry warning
 */
export interface ExpiryTimer {
  /** Timer ID from setTimeout (for cancellation) */
  timerId: NodeJS.Timeout | null

  /** When the token will expire */
  expirationTime: Date | null

  /** When the warning should appear (5 min before expiration) */
  warningTime: Date | null

  /** Whether warning modal has been shown for current token */
  warningShown: boolean

  /** Whether warning modal is currently visible */
  modalOpen: boolean
}

/**
 * Configuration for expiry detection service
 */
export interface ExpiryDetectionConfig {
  /** Minutes before expiration to show warning (default: 5) */
  warningMinutes: number

  /** Whether to auto-logout on expiration (default: true) */
  autoLogoutOnExpiry: boolean

  /** Whether to attempt auto-refresh before showing warning (default: true) */
  autoRefreshBeforeWarning: boolean
}

/**
 * Parsed JWT payload with expiration info
 */
export interface JWTPayload {
  /** Subject (usually username) */
  sub?: string

  /** Expiration time (Unix timestamp in seconds) */
  exp?: number

  /** Issued at time (Unix timestamp in seconds) */
  iat?: number

  /** Additional custom claims */
  [key: string]: unknown
}

// ============================================================================
// Cross-Tab Session Sync Types
// ============================================================================

/**
 * Type of authentication event detected in storage
 */
export type AuthEventType = 'login' | 'logout' | 'refresh' | 'unknown'

/**
 * Auth state change detected from localStorage event
 */
export interface StorageSyncEvent {
  /** Type of event detected */
  eventType: AuthEventType

  /** Previous token value */
  oldValue: string | null

  /** New token value */
  newValue: string | null

  /** When the event was detected */
  timestamp: Date

  /** Storage key that changed */
  key: string
}

/**
 * Configuration for session sync service
 */
export interface SessionSyncConfig {
  /** localStorage key for token (default: 'auth_token') */
  storageKey: string

  /** Whether to sync login events (default: true) */
  syncLogin: boolean

  /** Whether to sync logout events (default: true) */
  syncLogout: boolean

  /** Whether to sync token refresh events (default: true) */
  syncRefresh: boolean

  /** Debounce time in ms for rapid changes (default: 100) */
  debounceMs: number
}

// ============================================================================
// Permission System Types
// ============================================================================

/**
 * Parsed permission string with wildcard components
 */
export interface PermissionRule {
  /** Original permission string */
  original: string

  /** Resource type (first level) */
  resource: string

  /** Instance identifier (second level) */
  instance: string

  /** Action/operation (third level) */
  action: string

  /** Whether this rule contains wildcards */
  hasWildcard: boolean

  /** Array of level indexes with wildcards */
  wildcardLevels: number[]
}

/**
 * Cached permission check result
 */
export interface PermissionCacheEntry {
  /** Result of the permission check */
  result: boolean

  /** When this was cached */
  cachedAt: Date

  /** When this expires */
  expiresAt: Date

  /** Number of cache hits for this entry */
  hitCount: number
}

/**
 * Permission cache with metrics
 */
export interface PermissionCache {
  /** Map of permission string to cache entry */
  entries: Map<string, PermissionCacheEntry>

  /** Total cache hits */
  totalHits: number

  /** Total cache misses */
  totalMisses: number

  /** When cache was last cleared */
  lastClearedAt: Date | null

  /** Maximum cache size before LRU eviction */
  maxSize: number

  /** TTL in milliseconds */
  ttlMs: number
}

/**
 * Configuration for permission service
 */
export interface PermissionConfig {
  /** Enable permission caching (default: true) */
  enableCache: boolean

  /** Cache TTL in minutes (default: 5) */
  cacheTtlMinutes: number

  /** Maximum cache entries (default: 1000) */
  maxCacheSize: number

  /** Permission string separator (default: ':') */
  separator: string

  /** Wildcard character (default: '*') */
  wildcardChar: string
}

/**
 * Result of a permission check with metadata
 */
export interface PermissionCheckResult {
  /** Whether permission is granted */
  granted: boolean

  /** Matching user permission that granted access (if any) */
  matchedPermission?: string

  /** Whether result came from cache */
  fromCache: boolean

  /** Time taken to check in milliseconds */
  checkTimeMs: number
}

// ============================================================================
// UI Component Types
// ============================================================================

/**
 * Props for SessionExpiryModal component
 */
export interface SessionExpiryModalProps {
  /** Whether modal is visible */
  visible: boolean

  /** When session expires */
  expiresAt: Date

  /** Remaining seconds until expiration */
  remainingSeconds: number

  /** Handler for "Extend Session" button */
  onExtend: () => Promise<void>

  /** Handler for "Logout" button */
  onLogout: () => void

  /** Handler for modal dismissal (X button, ESC) */
  onDismiss: () => Promise<void>

  /** Whether extend operation is in progress */
  isExtending: boolean

  /** Error message if extension failed */
  extensionError: string | null
}

/**
 * Emits from SessionExpiryModal component
 */
export interface SessionExpiryModalEmits {
  /** Emitted when user requests session extension */
  extend: []

  /** Emitted when user chooses to logout */
  logout: []

  /** Emitted when modal is dismissed */
  dismiss: []

  /** Emitted when time runs out */
  expired: []
}

// ============================================================================
// Composable Types
// ============================================================================

/**
 * Return type for useTokenRefresh composable
 */
export interface UseTokenRefreshReturn {
  /** Manually trigger token refresh */
  refreshToken: () => Promise<boolean>

  /** Whether refresh is in progress */
  isRefreshing: Ref<boolean>

  /** Last refresh error */
  refreshError: Ref<Error | null>

  /** Seconds until token expires */
  timeUntilExpiry: Ref<number | null>

  /** Whether expiry warning should show */
  shouldShowWarning: Ref<boolean>
}

/**
 * Return type for useSessionSync composable
 */
export interface UseSessionSyncReturn {
  /** Whether session sync is active */
  isActive: Ref<boolean>

  /** Last sync event */
  lastEvent: Ref<StorageSyncEvent | null>

  /** Initialize session sync */
  initialize: () => void

  /** Stop session sync */
  stop: () => void
}

/**
 * Return type for usePermissions composable
 */
export interface UsePermissionsReturn {
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean

  /** Check if user has any of the given permissions */
  hasAnyPermission: (permissions: string[]) => boolean

  /** Check if user has all of the given permissions */
  hasAllPermissions: (permissions: string[]) => boolean

  /** Current cache hit rate percentage */
  cacheHitRate: Ref<number>

  /** Clear permission cache */
  clearCache: () => void
}

// ============================================================================
// Service Interface Types
// ============================================================================

/**
 * Token Refresh Service interface
 */
export interface ITokenRefreshService {
  /** Refresh the authentication token */
  refreshToken(retryCount?: number): Promise<boolean>

  /** Get current refresh state */
  getState(): TokenRefreshState

  /** Check if token should be refreshed */
  shouldRefresh(token: string): boolean
}

/**
 * Token Expiry Service interface
 */
export interface ITokenExpiryService {
  /** Setup expiry warning for a token */
  setupExpiryWarning(token: string): void

  /** Cancel current expiry warning */
  cancelExpiryWarning(): void

  /** Show the expiry warning modal */
  showExpiryWarning(expiresAt: Date): void

  /** Dismiss the expiry warning modal */
  dismissExpiryWarning(): void

  /** Get current expiry timer state */
  getTimerState(): ExpiryTimer
}

/**
 * Session Sync Service interface
 */
export interface ISessionSyncService {
  /** Initialize cross-tab session sync */
  initialize(): void

  /** Stop session sync */
  stop(): void

  /** Manually sync state from localStorage */
  syncNow(): void

  /** Check if sync is active */
  isActive(): boolean
}

/**
 * Permission Service interface
 */
export interface IPermissionService {
  /** Check if user has permission */
  hasPermission(permission: string): boolean

  /** Check wildcard match between user perm and required perm */
  checkWildcardMatch(userPerm: string, requiredPerm: string): boolean

  /** Parse permission string into rule */
  parsePermission(permission: string): PermissionRule

  /** Clear permission cache */
  clearCache(): void

  /** Get cache statistics */
  getCacheStats(): { hitRate: number; size: number; totalChecks: number }
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard for checking if error is a token refresh error
 */
export function isTokenRefreshError(error: unknown): error is Error {
  return error instanceof Error && 'refreshToken' in error
}

/**
 * Type guard for checking if JWT payload is valid
 */
export function isValidJWTPayload(payload: unknown): payload is JWTPayload {
  if (typeof payload !== 'object' || payload === null) {
    return false
  }
  const obj = payload as Record<string, unknown>
  return 'exp' in obj && typeof obj.exp === 'number'
}

/**
 * Type guard for storage sync event
 */
export function isAuthStorageEvent(event: StorageEvent): boolean {
  return event.key === 'auth_token' && event.storageArea === localStorage
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Ref type from Vue (for completeness)
 */
import type { Ref } from 'vue'

/**
 * Deep readonly version of permission cache
 */
export type ReadonlyPermissionCache = Readonly<
  Omit<PermissionCache, 'entries'> & {
    entries: ReadonlyMap<string, Readonly<PermissionCacheEntry>>
  }
>

/**
 * Partial configuration types for service initialization
 */
export type PartialTokenRefreshConfig = Partial<TokenRefreshConfig>
export type PartialExpiryDetectionConfig = Partial<ExpiryDetectionConfig>
export type PartialSessionSyncConfig = Partial<SessionSyncConfig>
export type PartialPermissionConfig = Partial<PermissionConfig>
