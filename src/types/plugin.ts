/**
 * Plugin System Type Definitions
 *
 * Types for SystemJS module loader interface
 * Note: Window interface extensions are in vite-env.d.ts
 */

/**
 * SystemJS module loader interface
 * Provides dynamic module loading capabilities
 */
export interface SystemJS {
  /**
   * Dynamically import a module by URL
   * @param moduleUrl - URL of the module to import
   * @returns Promise resolving to the module exports
   */
  import<T = unknown>(moduleUrl: string): Promise<T>
}
