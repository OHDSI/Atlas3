import { registerApplication, start } from 'single-spa';
import { PluginRegistry } from './PluginRegistry';
import { PluginInstance } from '@/models/PluginModels';

export class PluginLoader {
  private registry: PluginRegistry;
  private loadingTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly LOADING_TIMEOUT = 30000;

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  async loadPlugin(plugin: PluginInstance): Promise<void> {
    const { registration } = plugin;
    const pluginUrl = `/plugins/${registration.entryPoint}`;

    console.log(`[PluginLoader] Loading plugin: ${registration.id} from ${pluginUrl}`);

    try {
      this.registry.updatePluginState(registration.id, 'loading');
      
      const startTime = performance.now();
      
      // Set loading timeout
      const timeoutId = setTimeout(() => {
        const error = new Error(`Plugin ${registration.id} loading timeout after ${this.LOADING_TIMEOUT}ms`);
        this.registry.setPluginError(registration.id, error, true);
      }, this.LOADING_TIMEOUT);
      
      this.loadingTimeouts.set(registration.id, timeoutId);

      // Register with single-spa
      registerApplication({
        name: registration.id,
        app: async () => {
          try {
            // Use SystemJS import
            const module = await (window as any).System.import(pluginUrl);
            
            const loadTime = performance.now() - startTime;
            this.registry.updatePluginMetrics(registration.id, { loadTime });
            
            clearTimeout(timeoutId);
            this.loadingTimeouts.delete(registration.id);
            
            this.registry.updatePluginState(registration.id, 'loaded');
            
            return module;
          } catch (error) {
            clearTimeout(timeoutId);
            this.loadingTimeouts.delete(registration.id);
            throw error;
          }
        },
        activeWhen: (location) => {
          // Match any route that starts with /plugins/{pluginId}/
          return location.pathname.startsWith(`/plugins/${registration.id}/`);
        },
        customProps: {
          name: registration.name,
          authContext: plugin.authContext,
          messageBus: plugin.messageBus,
        },
      });

      // Store application reference
      plugin.application = { name: registration.id };
      
    } catch (error) {
      console.error(`[PluginLoader] Failed to load plugin ${registration.id}:`, error);
      this.handleLoadError(registration.id, error as Error);
    }
  }

  private handleLoadError(pluginId: string, error: Error): void {
    const attempts = this.retryAttempts.get(pluginId) || 0;
    
    if (attempts < this.MAX_RETRIES) {
      this.retryAttempts.set(pluginId, attempts + 1);
      console.log(`[PluginLoader] Retry ${attempts + 1}/${this.MAX_RETRIES} for plugin ${pluginId}`);
      
      setTimeout(() => {
        const plugin = this.registry.getPlugin(pluginId);
        if (plugin) {
          this.loadPlugin(plugin);
        }
      }, 1000 * (attempts + 1)); // Exponential backoff
    } else {
      this.registry.setPluginError(pluginId, error, false);
      this.retryAttempts.delete(pluginId);
    }
  }

  async retryPlugin(pluginId: string): Promise<void> {
    const plugin = this.registry.getPlugin(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }

    if (plugin.error) {
      plugin.error = undefined;
    }

    this.retryAttempts.delete(pluginId);
    await this.loadPlugin(plugin);
  }

  startPluginFramework(): void {
    start({
      urlRerouteOnly: true,
    });
    console.log('[PluginLoader] Plugin framework started');
  }
}
