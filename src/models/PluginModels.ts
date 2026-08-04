import { z } from 'zod'

export type PluginLifecycleState =
  | 'not-loaded'
  | 'loading'
  | 'loaded'
  | 'bootstrapping'
  | 'not-mounted'
  | 'mounting'
  | 'mounted'
  | 'unmounting'
  | 'error'

export type HostMessageType =
  | 'navigation:request'
  | 'navigation:back'
  | 'auth:refresh'
  | 'notification:show'
  | 'data:request'
  | 'data:update'
  | 'error:report'
  | 'custom'

export interface MenuItemConfiguration {
  id: string
  name: string
  route: string
  icon?: string
  order?: number
  parentId?: string
  insertBefore?: string
  insertAfter?: string
  visible?: boolean
  badge?: {
    content: string | number
    color?: string
  }
}

export type FabPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export interface FabMount {
  id: string
  label: string
  icon: string
  color?: string
  position?: FabPosition
}

export type PluginMountSurface =
  | 'main-nav'
  | 'datasource-sidebar'
  | 'analysis-tabs'
  | 'admin-tabs'
  | 'account-menu'

export interface PluginMountPoint {
  id: string
  surface: PluginMountSurface
  name: string
  icon?: string
  path?: string
  group?: string
  hint?: string
  order?: number
  insertBefore?: string
  insertAfter?: string
  requiredPermissions?: string[]
  visible?: boolean
}

export interface PluginRegistration {
  id: string
  name: string
  version: string
  entryPoint: string
  menuItems: MenuItemConfiguration[]
  fabMounts?: FabMount[]
  mountPoints?: PluginMountPoint[]
  activationConditions?: Record<string, unknown>
  metadata?: {
    author?: string
    description?: string
    homepage?: string
    icon?: string
  }
}

export interface PluginManifest {
  version: string
  plugins: PluginRegistration[]
  settings?: {
    enableHotReload?: boolean
    loadTimeout?: number
    pluginsPath?: string
    showLoadingIndicators?: boolean
    navigation?: {
      enabledCoreItems?: string[] // List of core navigation items to show (e.g., ['datasources', 'concepts', 'cohorts'])
      disabledCoreItems?: string[] // List of core navigation items to hide (takes precedence over enabledCoreItems)
    }
    theme?: {
      primaryColor?: string // Primary theme color override (hex color code, e.g., '#1f425a')
      logoUrl?: string // Custom logo URL/path (replaces default OHDSI + ATLAS logos)
      logoNavigateTo?: string // Route to navigate to when clicking the logo (default: '/')
      landingLogoUrl?: string // Custom landing-page hero logo URL/path (replaces bundled atlas-loading.svg)
    }
    header?: {
      showNavBar?: boolean // Show/hide the entire navigation bar (default: true)
      showFeedbackButton?: boolean // Show/hide the feedback button (default: true)
      showLanguageSelector?: boolean // Show/hide the language selector (default: true)
      showConfigButton?: boolean // Show/hide the configuration panel button (default: true)
      showUserMenu?: boolean // Show/hide the user menu (default: true)
      feedbackUrl?: string // Custom feedback URL (default: Microsoft Forms URL)
    }
  }
}

export interface AuthContext {
  user: {
    id: string
    username: string
    email?: string
    permissions: string[]
  } | null
  token: string | null
  isAuthenticated: boolean
  hasPermission(permission: string): boolean
}

export interface PluginMessageBus {
  send<T = unknown>(type: string, payload: T): void
  request<TRequest = unknown, TResponse = unknown>(
    type: string,
    payload: TRequest
  ): Promise<TResponse>
  subscribe<T = unknown>(type: string, callback: (payload: T) => void): () => void
}

export interface PluginProps {
  name: string
  mountParcel: unknown
  singleSpa: unknown
  authContext: AuthContext
  messageBus: PluginMessageBus
}

export interface PluginLifecycleExports {
  bootstrap(props: PluginProps): Promise<void> | void
  mount(props: PluginProps): Promise<void> | void
  unmount(props: PluginProps): Promise<void> | void
  update?(props: PluginProps): Promise<void> | void
}

export interface PluginInstance {
  registration: PluginRegistration
  state: PluginLifecycleState
  application?: unknown
  container?: HTMLElement
  messageBus: PluginMessageBus
  authContext: AuthContext
  error?: {
    message: string
    stack?: string
    timestamp: Date
    recoverable: boolean
  }
  metrics?: {
    loadTime?: number
    bootstrapTime?: number
    mountTime?: number
    lastMounted?: Date
  }
}

export interface HostMessage<T = unknown> {
  type: HostMessageType | string
  sourcePluginId: string
  payload: T
  callbackId?: string
  timestamp: Date
  correlationId?: string
}

export interface NavigationRequestPayload {
  path: string
  replace?: boolean
}

export interface NotificationPayload {
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  duration?: number
}

export interface DataRequestPayload {
  resource: string
  params?: Record<string, unknown>
}

export interface ErrorReportPayload {
  error: Error
  context?: Record<string, unknown>
}

// Zod Validation Schemas
export const MenuItemConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  icon: z.string().optional(),
  order: z.number().optional(),
  parentId: z.string().optional(),
  insertBefore: z.string().optional(),
  insertAfter: z.string().optional(),
  visible: z.boolean().optional(),
  badge: z
    .object({
      content: z.union([z.string(), z.number()]),
      color: z.string().optional(),
    })
    .optional(),
})

export const FabMountSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string(),
  color: z.string().optional(),
  position: z.enum(['bottom-right', 'bottom-left', 'top-right', 'top-left']).optional(),
})

export const PluginMountSurfaceSchema = z.enum([
  'main-nav',
  'datasource-sidebar',
  'analysis-tabs',
  'admin-tabs',
  'account-menu',
])

export const PluginMountPointSchema = z.object({
  id: z.string().regex(/^[a-z0-9-_]+$/),
  surface: PluginMountSurfaceSchema,
  name: z.string().min(1),
  icon: z.string().optional(),
  path: z.string().optional(),
  group: z.string().optional(),
  hint: z.string().optional(),
  order: z.number().optional(),
  insertBefore: z.string().optional(),
  insertAfter: z.string().optional(),
  requiredPermissions: z.array(z.string()).optional(),
  visible: z.boolean().optional(),
})

export const PluginRegistrationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1),
  version: z.string(),
  entryPoint: z.string(),
  menuItems: z.array(MenuItemConfigurationSchema),
  fabMounts: z.array(FabMountSchema).optional(),
  mountPoints: z.array(PluginMountPointSchema).optional(),
  activationConditions: z.record(z.unknown()).optional(),
  metadata: z
    .object({
      author: z.string().optional(),
      description: z.string().optional(),
      homepage: z.string().url().optional(),
      icon: z.string().optional(),
    })
    .optional(),
})

// Hex color validation regex (supports 3, 4, 6, and 8 digit hex codes)
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{8}|[A-Fa-f0-9]{4})$/

export const PluginManifestSchema = z.object({
  version: z.string(),
  plugins: z.array(PluginRegistrationSchema),
  settings: z
    .object({
      enableHotReload: z.boolean().optional(),
      loadTimeout: z.number().optional(),
      pluginsPath: z.string().optional(),
      showLoadingIndicators: z.boolean().optional(),
      navigation: z
        .object({
          enabledCoreItems: z.array(z.string()).optional(),
          disabledCoreItems: z.array(z.string()).optional(),
        })
        .optional(),
      theme: z
        .object({
          primaryColor: z
            .string()
            .regex(hexColorRegex, 'Invalid hex color for primaryColor')
            .optional(),
          logoUrl: z.string().optional(),
          logoNavigateTo: z.string().optional(),
          landingLogoUrl: z.string().optional(),
        })
        .optional(),
      header: z
        .object({
          showNavBar: z.boolean().optional(),
          showFeedbackButton: z.boolean().optional(),
          showLanguageSelector: z.boolean().optional(),
          showConfigButton: z.boolean().optional(),
          showUserMenu: z.boolean().optional(),
          feedbackUrl: z.string().url().optional(),
        })
        .optional(),
    })
    .optional(),
})

export const DEFAULT_MANIFEST_SETTINGS = {
  enableHotReload: import.meta.env.DEV,
  loadTimeout: 30000,
  pluginsPath: 'plugins',
  showLoadingIndicators: true,
}
