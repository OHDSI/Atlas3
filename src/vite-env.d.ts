/// <reference types="vite/client" />

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
    import<T = any>(moduleId: string): Promise<T>
    register(deps: string[], declare: Function): void
  }
}
