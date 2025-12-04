import {
  PluginManifest,
  PluginManifestSchema,
  DEFAULT_MANIFEST_SETTINGS
} from '@/models/PluginModels';
import { logger } from '@/utils/logger';

export class PluginConfigService {
  private manifest: PluginManifest | null = null;
  private listeners: Array<(manifest: PluginManifest) => void> = [];

  async loadConfig(): Promise<PluginManifest> {
    try {
      const pluginsUrl = `${import.meta.env.BASE_URL}config/plugins.json`;
      const response = await fetch(pluginsUrl);

      // If plugins.json doesn't exist (404), return empty manifest with defaults
      if (response.status === 404) {
        logger.warn('PluginConfig', 'plugins.json not found, using default configuration');
        this.manifest = this.createDefaultManifest();
        return this.manifest;
      }

      if (!response.ok) {
        throw new Error(`Failed to load plugins.json: ${response.statusText}`);
      }

      let data: unknown
      try {
        data = await response.json()
      } catch (parseError) {
        logger.error('PluginConfig', 'Failed to parse JSON response', parseError)
        throw new Error('Invalid JSON in plugins.json')
      }

      // Validate with Zod schema using safeParse
      const result = PluginManifestSchema.safeParse(data)
      if (!result.success) {
        logger.error('PluginConfig', 'Plugin manifest validation failed', result.error)
        throw new Error('Invalid plugin manifest format')
      }
      const validated = result.data

      // Apply defaults
      this.manifest = {
        ...validated,
        settings: {
          ...DEFAULT_MANIFEST_SETTINGS,
          ...validated.settings,
        },
      };

      // Validate plugin IDs are unique
      const ids = new Set<string>();
      for (const plugin of this.manifest.plugins) {
        if (ids.has(plugin.id)) {
          throw new Error(`Duplicate plugin ID: ${plugin.id}`);
        }
        ids.add(plugin.id);

        // Validate routes start with /plugins/{pluginId}/
        for (const menuItem of plugin.menuItems) {
          if (!menuItem.route.startsWith(`/plugins/${plugin.id}/`)) {
            throw new Error(
              `Invalid route "${menuItem.route}" for plugin "${plugin.id}". ` +
              `Must start with "/plugins/${plugin.id}/"`
            );
          }
        }
      }

      // Validate no route conflicts
      const routes = new Set<string>();
      for (const plugin of this.manifest.plugins) {
        for (const menuItem of plugin.menuItems) {
          if (routes.has(menuItem.route)) {
            throw new Error(`Duplicate route: ${menuItem.route}`);
          }
          routes.add(menuItem.route);
        }
      }

      return this.manifest;
    } catch (error) {
      logger.error('PluginConfig', 'Failed to load config', error);

      // If parsing/validation failed, use default manifest as fallback
      if (error instanceof Error && !error.message.includes('Failed to load plugins.json')) {
        logger.warn('PluginConfig', 'Using default configuration due to validation error');
        this.manifest = this.createDefaultManifest();
        return this.manifest;
      }

      throw error;
    }
  }

  private createDefaultManifest(): PluginManifest {
    return {
      version: '1.0',
      plugins: [],
      settings: {
        ...DEFAULT_MANIFEST_SETTINGS,
      },
    };
  }

  getManifest(): PluginManifest | null {
    return this.manifest;
  }

  getNavigationSettings(): { enabledCoreItems?: string[], disabledCoreItems?: string[] } | null {
    return this.manifest?.settings?.navigation || null;
  }

  getPrimaryColor(): string | null {
    return this.manifest?.settings?.theme?.primaryColor || null;
  }

  getLogoUrl(): string | null {
    const logoUrl = this.manifest?.settings?.theme?.logoUrl || null;
    logger.debug('PluginConfig', 'getLogoUrl called, returning', logoUrl);
    return logoUrl;
  }

  isCoreNavigationItemEnabled(itemId: string): boolean {
    const navSettings = this.getNavigationSettings();

    // If no navigation settings, all items are enabled by default
    if (!navSettings) {
      return true;
    }

    // If item is in disabledCoreItems, it's disabled (takes precedence)
    if (navSettings.disabledCoreItems?.includes(itemId)) {
      return false;
    }

    // If enabledCoreItems is specified and item is not in it, it's disabled
    if (navSettings.enabledCoreItems && !navSettings.enabledCoreItems.includes(itemId)) {
      return false;
    }

    // Otherwise, enabled
    return true;
  }

  onChange(callback: (manifest: PluginManifest) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  private notifyListeners(): void {
    if (this.manifest) {
      this.listeners.forEach(cb => cb(this.manifest!));
    }
  }

  setupHotReload(): void {
    if (import.meta.hot && this.manifest?.settings?.enableHotReload) {
      const pluginsUrl = `${import.meta.env.BASE_URL}config/plugins.json`;
      import.meta.hot.accept(pluginsUrl, async () => {
        try {
          const oldManifest = this.manifest;
          await this.loadConfig();
          
          if (oldManifest) {
            this.handleConfigChange(oldManifest, this.manifest!);
          }
          
          this.notifyListeners();
          logger.info('PluginConfig', 'Hot reload: Config updated');
        } catch (error) {
          logger.error('PluginConfig', 'Hot reload failed', error);
        }
      });
    }
  }

  private handleConfigChange(oldManifest: PluginManifest, newManifest: PluginManifest): void {
    const oldIds = new Set(oldManifest.plugins.map(p => p.id));
    const newIds = new Set(newManifest.plugins.map(p => p.id));

    // Detect added plugins
    const added = newManifest.plugins.filter(p => !oldIds.has(p.id));
    if (added.length > 0) {
      logger.info('PluginConfig', 'Added plugins', added.map(p => p.id));
    }

    // Detect removed plugins
    const removed = oldManifest.plugins.filter(p => !newIds.has(p.id));
    if (removed.length > 0) {
      logger.info('PluginConfig', 'Removed plugins', removed.map(p => p.id));
    }

    // Detect updated plugins (warn only, don't reload)
    const updated = newManifest.plugins.filter(p => {
      const oldPlugin = oldManifest.plugins.find(op => op.id === p.id);
      return oldPlugin && JSON.stringify(oldPlugin) !== JSON.stringify(p);
    });
    if (updated.length > 0) {
      logger.warn('PluginConfig', 'Updated plugins (reload required)', updated.map(p => p.id));
    }
  }
}

export const pluginConfigService = new PluginConfigService();
