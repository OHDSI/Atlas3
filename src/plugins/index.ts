import { pluginConfigService } from '@/services/PluginConfigService';
import { PluginRegistry, pluginRegistry } from './core/PluginRegistry';
import { PluginLoader } from './core/PluginLoader';
import { setupPluginIsolation } from './core/PluginIsolation';
import { createHostMessageBus } from './messaging/HostMessageBus';
import { AuthContext } from '@/models/PluginModels';

let pluginLoader: PluginLoader | null = null;
let initialized = false;

export async function initializePluginFramework(authContext: AuthContext): Promise<void> {
  if (initialized) {
    console.warn('[PluginFramework] Already initialized');
    return;
  }

  try {
    console.log('[PluginFramework] Initializing...');

    // Setup error isolation
    setupPluginIsolation();

    // Load plugin configuration
    const manifest = await pluginConfigService.loadConfig();
    console.log(`[PluginFramework] Loaded ${manifest.plugins.length} plugin(s)`);

    // If no plugins configured, skip plugin loading but mark as initialized
    if (manifest.plugins.length === 0) {
      console.log('[PluginFramework] No plugins configured, skipping plugin loading');
      initialized = true;
      return;
    }

    // Create plugin loader
    pluginLoader = new PluginLoader(pluginRegistry);

    // Register and load all plugins
    for (const registration of manifest.plugins) {
      // Create message bus for this plugin
      const messageBus = createHostMessageBus(registration.id);

      // Register plugin
      const instance = pluginRegistry.registerPlugin(
        registration,
        authContext,
        messageBus
      );

      // Load plugin
      await pluginLoader.loadPlugin(instance);
    }

    // Start single-spa
    pluginLoader.startPluginFramework();

    // Setup hot reload if enabled
    pluginConfigService.setupHotReload();

    initialized = true;
    console.log('[PluginFramework] Initialization complete');
  } catch (error) {
    console.error('[PluginFramework] Initialization failed:', error);
    // Don't throw error - allow app to continue without plugins
    console.warn('[PluginFramework] Continuing without plugin support');
    initialized = true;
  }
}

export function getPluginRegistry(): PluginRegistry {
  return pluginRegistry;
}

export function getPluginLoader(): PluginLoader | null {
  return pluginLoader;
}

export { pluginRegistry };
