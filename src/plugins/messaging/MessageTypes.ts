/**
 * Host-Plugin Messaging Type Definitions
 *
 * Defines the contract for communication between the host application
 * and plugin micro-frontends using a host-mediated messaging pattern.
 */

// ============================================================================
// Message Types
// ============================================================================

/**
 * Standard message types for host-plugin communication
 */
export type HostMessageType =
  | 'navigation:request' // Plugin requests navigation to a route
  | 'navigation:back' // Plugin requests back navigation
  | 'auth:refresh' // Plugin requests auth token refresh
  | 'auth:check' // Plugin requests current auth status
  | 'notification:show' // Plugin requests to show notification
  | 'notification:hide' // Plugin requests to hide notification
  | 'data:request' // Plugin requests data from host
  | 'data:update' // Plugin notifies host of data change
  | 'state:get' // Plugin requests global state
  | 'state:set' // Plugin requests to update global state
  | 'error:report' // Plugin reports an error
  | 'plugin:ready' // Plugin signals it's ready
  | 'custom' // Custom plugin-specific message

/**
 * Base message structure for all host-plugin messages
 */
export interface HostMessage<TPayload = unknown> {
  /** Message type identifier */
  type: HostMessageType | string

  /** ID of the plugin that sent the message */
  sourcePluginId: string

  /** Message payload (type varies by message type) */
  payload: TPayload

  /** Optional callback ID for request-response pattern */
  callbackId?: string

  /** Timestamp when message was created */
  timestamp: Date

  /** Optional correlation ID for message tracing */
  correlationId?: string

  /** Optional priority (higher = more urgent) */
  priority?: number
}

/**
 * Response message from host to plugin
 */
export interface HostMessageResponse<TData = unknown> {
  /** Callback ID from the original request */
  callbackId: string

  /** Whether the request was successful */
  success: boolean

  /** Response data if successful */
  data?: TData

  /** Error information if unsuccessful */
  error?: {
    code: string
    message: string
    details?: unknown
  }

  /** Timestamp of response */
  timestamp: Date
}

// ============================================================================
// Message Payload Types
// ============================================================================

/**
 * Payload for navigation:request messages
 */
export interface NavigationRequestPayload {
  /** Target path to navigate to */
  path: string

  /** Whether to replace current history entry */
  replace?: boolean

  /** Query parameters to include */
  query?: Record<string, string | number | boolean>

  /** Optional state to pass with navigation */
  state?: Record<string, unknown>
}

/**
 * Payload for notification:show messages
 */
export interface NotificationPayload {
  /** Notification message text */
  message: string

  /** Notification type/severity */
  type: 'info' | 'success' | 'warning' | 'error'

  /** Optional title */
  title?: string

  /** Duration in milliseconds (0 = persistent) */
  duration?: number

  /** Optional action buttons */
  actions?: Array<{
    label: string
    callback: string // Message type to send when clicked
  }>
}

/**
 * Payload for data:request messages
 */
export interface DataRequestPayload {
  /** Resource identifier (e.g., 'users', 'cohorts', 'concepts') */
  resource: string

  /** Optional resource ID for specific item */
  id?: string | number

  /** Optional query parameters */
  params?: Record<string, unknown>

  /** Optional cache options */
  cache?: {
    enabled: boolean
    ttl?: number // Time to live in seconds
  }
}

/**
 * Payload for data:update messages
 */
export interface DataUpdatePayload {
  /** Resource that was updated */
  resource: string

  /** ID of the updated item */
  id: string | number

  /** Type of update operation */
  operation: 'create' | 'update' | 'delete'

  /** Updated data (for create/update) */
  data?: Record<string, unknown>
}

/**
 * Payload for state:get messages
 */
export interface StateGetPayload {
  /** State key to retrieve */
  key: string

  /** Optional namespace for scoped state */
  namespace?: string

  /** Whether to include history */
  includeHistory?: boolean
}

/**
 * Payload for state:set messages
 */
export interface StateSetPayload {
  /** State key to set */
  key: string

  /** Value to set */
  value: unknown

  /** Optional namespace for scoped state */
  namespace?: string

  /** Whether to merge with existing value (for objects) */
  merge?: boolean
}

/**
 * Payload for error:report messages
 */
export interface ErrorReportPayload {
  /** Error message */
  message: string

  /** Error stack trace if available */
  stack?: string

  /** Error severity */
  severity: 'low' | 'medium' | 'high' | 'critical'

  /** Error code/type */
  code?: string

  /** Additional context */
  context?: Record<string, unknown>

  /** Whether error is recoverable */
  recoverable: boolean
}

/**
 * Payload for auth:check response
 */
export interface AuthCheckResponsePayload {
  /** Whether user is authenticated */
  isAuthenticated: boolean

  /** User information if authenticated */
  user?: {
    id: string
    username: string
    email?: string
    permissions: string[]
    roles?: string[]
  }

  /** Token expiration time if applicable */
  tokenExpiration?: Date
}

// ============================================================================
// Plugin Message Bus Interface
// ============================================================================

/**
 * Message bus interface provided to plugins for host communication
 */
export interface PluginMessageBus {
  /**
   * Send a one-way message to the host
   * @param type - Message type
   * @param payload - Message payload
   */
  send<TPayload = unknown>(type: HostMessageType | string, payload: TPayload): void

  /**
   * Send a request and wait for response
   * @param type - Message type
   * @param payload - Request payload
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise resolving to response data
   */
  request<TRequest = unknown, TResponse = unknown>(
    type: HostMessageType | string,
    payload: TRequest,
    timeout?: number
  ): Promise<TResponse>

  /**
   * Subscribe to messages from host (bidirectional communication)
   * @param type - Message type to listen for
   * @param callback - Callback function to handle messages
   * @returns Unsubscribe function
   */
  subscribe<TPayload = unknown>(
    type: HostMessageType | string,
    callback: (payload: TPayload) => void
  ): () => void

  /**
   * Check if message type is supported by host
   * @param type - Message type to check
   * @returns True if supported
   */
  supports(type: HostMessageType | string): boolean
}

// ============================================================================
// Host Message Handler Interface
// ============================================================================

/**
 * Interface for host-side message handling
 */
export interface HostMessageHandler {
  /**
   * Handle incoming message from plugin
   * @param message - The message to handle
   * @returns Optional response data
   */
  handle<TPayload = unknown, TResponse = unknown>(
    message: HostMessage<TPayload>
  ): Promise<TResponse> | TResponse | void

  /**
   * Check if handler supports this message type
   * @param type - Message type
   * @returns True if supported
   */
  supports(type: HostMessageType | string): boolean
}

// ============================================================================
// Message Validation
// ============================================================================

/**
 * Validation result for messages
 */
export interface MessageValidationResult {
  valid: boolean
  errors?: string[]
}

/**
 * Message validator interface
 */
export interface MessageValidator {
  /**
   * Validate a message
   * @param message - Message to validate
   * @returns Validation result
   */
  validate(message: HostMessage): MessageValidationResult
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if object is a valid HostMessage
 */
export function isHostMessage(obj: unknown): obj is HostMessage {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'type' in obj &&
    typeof obj.type === 'string' &&
    'sourcePluginId' in obj &&
    typeof obj.sourcePluginId === 'string' &&
    'payload' in obj &&
    'timestamp' in obj &&
    obj.timestamp instanceof Date
  )
}

/**
 * Type guard to check if object is a valid HostMessageResponse
 */
export function isHostMessageResponse(obj: unknown): obj is HostMessageResponse {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'callbackId' in obj &&
    typeof obj.callbackId === 'string' &&
    'success' in obj &&
    typeof obj.success === 'boolean' &&
    'timestamp' in obj &&
    obj.timestamp instanceof Date
  )
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default timeout for request-response pattern (5 seconds)
 */
export const DEFAULT_REQUEST_TIMEOUT = 5000

/**
 * Maximum message payload size (1MB)
 */
export const MAX_PAYLOAD_SIZE = 1024 * 1024

/**
 * Standard message priorities
 */
export const MESSAGE_PRIORITY = {
  LOW: 0,
  NORMAL: 50,
  HIGH: 100,
  CRITICAL: 200,
} as const
