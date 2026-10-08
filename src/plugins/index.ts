import { pluginConfigService } from '@/services/PluginConfigService'
import { PluginRegistry, pluginRegistry } from './core/PluginRegistry'
import { PluginLoader } from './core/PluginLoader'
import { setupPluginDiagnostics } from './core/PluginDiagnostics'
import { createHostMessageBus } from './messaging/HostMessageBus'
import { AuthContext } from '@/models/PluginModels'
import { logger } from '@/utils/logger'

let pluginLoader: PluginLoader | null = null
let initialized = false

let resolveFrameworkReady: () => void
const frameworkReady = new Promise<void>(resolve => {
  resolveFrameworkReady = resolve
})

/**
 * Resolves once initialization has finished (successfully or not), i.e. every
 * configured plugin has been registered. Lookups that miss before this point
 * should wait rather than report "not found".
 */
export function whenPluginFrameworkReady(): Promise<void> {
  return frameworkReady
}

export async function initializePluginFramework(authContext: AuthContext): Promise<void> {
  if (initialized) {
    logger.warn('PluginFramework', 'Already initialized')
    return
  }

  try {
    logger.info('PluginFramework', 'Initializing...')

    setupPluginDiagnostics()

    // Load plugin configuration
    const manifest = await pluginConfigService.loadConfig()
    logger.info('PluginFramework', `Loaded ${manifest.plugins.length} plugin(s)`)

    // If no plugins configured, skip plugin loading but mark as initialized
    if (manifest.plugins.length === 0) {
      logger.info('PluginFramework', 'No plugins configured, skipping plugin loading')
      initialized = true
      return
    }

    pluginLoader = new PluginLoader(pluginRegistry)
    ;(window as unknown as { __pluginLoader: PluginLoader }).__pluginLoader = pluginLoader
    ;(window as unknown as { __pluginRegistry: PluginRegistry }).__pluginRegistry = pluginRegistry

    // Register every plugin up front so containers can find them (in
    // not-loaded/loading state) while their bundles are still downloading.
    const instances = manifest.plugins.map(registration =>
      pluginRegistry.registerPlugin(
        registration,
        authContext,
        createHostMessageBus(registration.id)
      )
    )
    resolveFrameworkReady()

    const loader = pluginLoader
    await Promise.allSettled(instances.map(instance => loader.loadPlugin(instance)))

    // Start single-spa
    pluginLoader.startPluginFramework()

    // Setup hot reload if enabled
    pluginConfigService.setupHotReload()

    initialized = true
    logger.info('PluginFramework', 'Initialization complete')
  } catch (error) {
    logger.error('PluginFramework', 'Initialization failed', error)
    // Don't throw error - allow app to continue without plugins
    logger.warn('PluginFramework', 'Continuing without plugin support')
    initialized = true
  } finally {
    resolveFrameworkReady()
  }
}

export function getPluginRegistry(): PluginRegistry {
  return pluginRegistry
}

export function getPluginLoader(): PluginLoader | null {
  return pluginLoader
}

export { pluginRegistry }
