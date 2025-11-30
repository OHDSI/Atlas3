import { registerApplication, start } from 'single-spa';
import { PluginRegistry } from './PluginRegistry';
import { PluginInstance } from '@/models/PluginModels';
import { logger } from '@/utils/logger';

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
    const pluginUrl = `${import.meta.env.BASE_URL}plugins/${registration.entryPoint}`;

    logger.info('PluginLoader', `Loading plugin: ${registration.id} from ${pluginUrl}`);

    try {
      this.registry.updatePluginState(registration.id, 'loading');

      const startTime = performance.now();

      // Set loading timeout
      const timeoutId = setTimeout(() => {
        const error = new Error(`Plugin ${registration.id} loading timeout after ${this.LOADING_TIMEOUT}ms`);
        this.registry.setPluginError(registration.id, error, true);
      }, this.LOADING_TIMEOUT);

      this.loadingTimeouts.set(registration.id, timeoutId);

      // Load the plugin module immediately using SystemJS
      // This happens BEFORE registering with single-spa so we can detect load failures early
      let pluginModule: any;

      try {
        // Check if SystemJS is available
        if (!window.System) {
          throw new Error('SystemJS is not available on window.System');
        }

        logger.debug('PluginLoader', `Starting System.import for ${pluginUrl}`);

        // Use SystemJS import with additional error context
        pluginModule = await window.System.import(pluginUrl).catch((err: Error) => {
          logger.error('PluginLoader', `System.import failed for ${pluginUrl}`, err);
          throw new Error(`Failed to import plugin module: ${err.message}`);
        });

        logger.debug('PluginLoader', `System.import succeeded for ${registration.id}`, pluginModule);

        // Validate the module has required lifecycle methods
        if (!pluginModule.bootstrap || !pluginModule.mount || !pluginModule.unmount) {
          throw new Error(
            `Plugin ${registration.id} is missing required lifecycle methods (bootstrap, mount, unmount)`
          );
        }

        const loadTime = performance.now() - startTime;
        this.registry.updatePluginMetrics(registration.id, { loadTime });

        clearTimeout(timeoutId);
        this.loadingTimeouts.delete(registration.id);

        this.registry.updatePluginState(registration.id, 'loaded');
        logger.info('PluginLoader', `Plugin ${registration.id} loaded successfully in ${loadTime}ms`);
      } catch (error) {
        clearTimeout(timeoutId);
        this.loadingTimeouts.delete(registration.id);
        logger.error('PluginLoader', `Error loading plugin ${registration.id}`, error);
        throw error;
      }

      // Now register with single-spa using the already-loaded module
      registerApplication({
        name: registration.id,
        app: () => Promise.resolve(pluginModule),
        activeWhen: (location) => {
          // Match any route that starts with /plugins/{pluginId}/
          // Need to account for the base path
          const basePath = import.meta.env.BASE_URL;
          const pluginPath = `${basePath}plugins/${registration.id}/`.replace(/\/+/g, '/');
          const isActive = location.pathname.startsWith(pluginPath);
          logger.debug('PluginLoader', `activeWhen check for ${registration.id}: pathname=${location.pathname}, pluginPath=${pluginPath}, isActive=${isActive}`);
          return isActive;
        },
        customProps: () => {
          const domElement = document.getElementById(`plugin-${registration.id}`);
          logger.debug('PluginLoader', `customProps for ${registration.id}: domElement=`, domElement);
          return {
            name: registration.name,
            authContext: plugin.authContext,
            messageBus: plugin.messageBus,
            domElement: domElement,
          };
        },
      });

      // Store application reference
      plugin.application = { name: registration.id };

    } catch (error) {
      logger.error('PluginLoader', `Failed to load plugin ${registration.id}`, error);
      this.handleLoadError(registration.id, error as Error);
    }
  }

  private handleLoadError(pluginId: string, error: Error): void {
    const attempts = this.retryAttempts.get(pluginId) || 0;
    
    if (attempts < this.MAX_RETRIES) {
      this.retryAttempts.set(pluginId, attempts + 1);
      logger.info('PluginLoader', `Retry ${attempts + 1}/${this.MAX_RETRIES} for plugin ${pluginId}`);
      
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
    logger.info('PluginLoader', 'Plugin framework started');
  }
}
