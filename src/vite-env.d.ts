/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_WEBAPI_URL: string
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

// SystemJS type declaration
interface Window {
  System?: {
    import<T = unknown>(moduleId: string): Promise<T>
    register(deps: string[], declare: (...args: unknown[]) => unknown): void
  }
  // Plugin loader for retry functionality (set by PluginManager)
  __pluginLoader?: import('@/plugins/core/PluginLoader').PluginLoader
}
