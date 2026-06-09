import type { AppConfig } from './app-config.types'
import { defaultAppConfig } from './app-config.defaults'
import { appConfigOverridesSchema } from './app-config.schema'

let resolvedConfig: AppConfig | null = null

/**
 * Loads application configuration at startup.
 * Fetches an optional `config-local.json` from the same directory as index.html.
 * If not found, defaults are used. Overrides are shallow-merged; arrays replace entirely.
 */
export async function loadAppConfig(): Promise<AppConfig> {
  try {
    const response = await fetch('./config-local.json')
    if (response.ok) {
      const raw = await response.json()
      const parsed = appConfigOverridesSchema.safeParse(raw)
      if (!parsed.success) {
        // eslint-disable-next-line no-console -- runs before app bootstrap; logger not yet available
        console.warn(
          '[AppConfig] config-local.json failed validation, using defaults.',
          parsed.error.issues
        )
        resolvedConfig = { ...defaultAppConfig }
        return resolvedConfig
      }
      const overrides = parsed.data
      resolvedConfig = {
        ...defaultAppConfig,
        ...overrides,
        api: { ...defaultAppConfig.api, ...overrides.api },
      }
    } else {
      // eslint-disable-next-line no-console -- runs before app bootstrap; logger not yet available
      console.warn(
        '[AppConfig] No config-local.json found (HTTP %d). Using default configuration.',
        response.status
      )
      resolvedConfig = { ...defaultAppConfig }
    }
  } catch (error) {
    // eslint-disable-next-line no-console -- runs before app bootstrap; logger not yet available
    console.warn('[AppConfig] Failed to load config-local.json, using defaults.', error)
    resolvedConfig = { ...defaultAppConfig }
  }
  return resolvedConfig
}

/**
 * Returns the resolved application configuration.
 * Must be called after `loadAppConfig()` has completed.
 */
export function getAppConfig(): AppConfig {
  if (!resolvedConfig) {
    throw new Error(
      '[AppConfig] getAppConfig() called before loadAppConfig(). Ensure config is loaded at startup.'
    )
  }
  return resolvedConfig
}
