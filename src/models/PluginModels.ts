import { z } from 'zod';

export type PluginLifecycleState = 
  | 'not-loaded'
  | 'loading'
  | 'loaded'
  | 'bootstrapping'
  | 'not-mounted'
  | 'mounting'
  | 'mounted'
  | 'unmounting'
  | 'error';

export type HostMessageType = 
  | 'navigation:request'
  | 'navigation:back'
  | 'auth:refresh'
  | 'notification:show'
  | 'data:request'
  | 'data:update'
  | 'error:report'
  | 'custom';

export interface MenuItemConfiguration {
  id: string;
  name: string;
  route: string;
  icon?: string;
  order?: number;
  parentId?: string;
  visible?: boolean;
  badge?: {
    content: string | number;
    color?: string;
  };
}

export interface PluginRegistration {
  id: string;
  name: string;
  version: string;
  entryPoint: string;
  menuItems: MenuItemConfiguration[];
  activationConditions?: Record<string, any>;
  metadata?: {
    author?: string;
    description?: string;
    homepage?: string;
    icon?: string;
  };
}

export interface PluginManifest {
  version: string;
  plugins: PluginRegistration[];
  settings?: {
    enableHotReload?: boolean;
    loadTimeout?: number;
    pluginsPath?: string;
    showLoadingIndicators?: boolean;
  };
}

export interface AuthContext {
  user: {
    id: string;
    username: string;
    email?: string;
    permissions: string[];
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  hasPermission(permission: string): boolean;
}

export interface PluginMessageBus {
  send<T = any>(type: string, payload: T): void;
  request<TRequest = any, TResponse = any>(
    type: string,
    payload: TRequest
  ): Promise<TResponse>;
  subscribe<T = any>(
    type: string,
    callback: (payload: T) => void
  ): () => void;
}

export interface PluginProps {
  name: string;
  mountParcel: any;
  singleSpa: any;
  authContext: AuthContext;
  messageBus: PluginMessageBus;
}

export interface PluginLifecycleExports {
  bootstrap(props: PluginProps): Promise<void> | void;
  mount(props: PluginProps): Promise<void> | void;
  unmount(props: PluginProps): Promise<void> | void;
  update?(props: PluginProps): Promise<void> | void;
}

export interface PluginInstance {
  registration: PluginRegistration;
  state: PluginLifecycleState;
  application?: any;
  container?: HTMLElement;
  messageBus: PluginMessageBus;
  authContext: AuthContext;
  error?: {
    message: string;
    stack?: string;
    timestamp: Date;
    recoverable: boolean;
  };
  metrics?: {
    loadTime?: number;
    bootstrapTime?: number;
    mountTime?: number;
    lastMounted?: Date;
  };
}

export interface HostMessage<T = any> {
  type: HostMessageType | string;
  sourcePluginId: string;
  payload: T;
  callbackId?: string;
  timestamp: Date;
  correlationId?: string;
}

export interface NavigationRequestPayload {
  path: string;
  replace?: boolean;
}

export interface NotificationPayload {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  duration?: number;
}

export interface DataRequestPayload {
  resource: string;
  params?: Record<string, any>;
}

export interface ErrorReportPayload {
  error: Error;
  context?: Record<string, any>;
}

// Zod Validation Schemas
export const MenuItemConfigurationSchema = z.object({
  id: z.string(),
  name: z.string(),
  route: z.string(),
  icon: z.string().optional(),
  order: z.number().optional(),
  parentId: z.string().optional(),
  visible: z.boolean().optional(),
  badge: z.object({
    content: z.union([z.string(), z.number()]),
    color: z.string().optional(),
  }).optional(),
});

export const PluginRegistrationSchema = z.object({
  id: z.string().regex(/^[a-z0-9-_]+$/),
  name: z.string().min(1),
  version: z.string(),
  entryPoint: z.string(),
  menuItems: z.array(MenuItemConfigurationSchema),
  activationConditions: z.record(z.any()).optional(),
  metadata: z.object({
    author: z.string().optional(),
    description: z.string().optional(),
    homepage: z.string().url().optional(),
    icon: z.string().optional(),
  }).optional(),
});

export const PluginManifestSchema = z.object({
  version: z.string(),
  plugins: z.array(PluginRegistrationSchema),
  settings: z.object({
    enableHotReload: z.boolean().optional(),
    loadTimeout: z.number().optional(),
    pluginsPath: z.string().optional(),
    showLoadingIndicators: z.boolean().optional(),
  }).optional(),
});

export const DEFAULT_MANIFEST_SETTINGS = {
  enableHotReload: import.meta.env.DEV,
  loadTimeout: 30000,
  pluginsPath: 'plugins',
  showLoadingIndicators: true,
};
