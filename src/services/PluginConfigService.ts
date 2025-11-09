import { 
  PluginManifest, 
  PluginManifestSchema, 
  DEFAULT_MANIFEST_SETTINGS 
} from '@/models/PluginModels';

export class PluginConfigService {
  private manifest: PluginManifest | null = null;
  private listeners: Array<(manifest: PluginManifest) => void> = [];

  async loadConfig(): Promise<PluginManifest> {
    try {
      const response = await fetch('/src/config/plugins.json');
      if (!response.ok) {
        throw new Error(`Failed to load plugins.json: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Validate with Zod schema
      const validated = PluginManifestSchema.parse(data);
      
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
      console.error('[PluginConfigService] Failed to load config:', error);
      throw error;
    }
  }

  getManifest(): PluginManifest | null {
    return this.manifest;
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
      import.meta.hot.accept('/src/config/plugins.json', async () => {
        try {
          const oldManifest = this.manifest;
          await this.loadConfig();
          
          if (oldManifest) {
            this.handleConfigChange(oldManifest, this.manifest!);
          }
          
          this.notifyListeners();
          console.log('[PluginConfigService] Hot reload: Config updated');
        } catch (error) {
          console.error('[PluginConfigService] Hot reload failed:', error);
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
      console.log('[PluginConfigService] Added plugins:', added.map(p => p.id));
    }

    // Detect removed plugins
    const removed = oldManifest.plugins.filter(p => !newIds.has(p.id));
    if (removed.length > 0) {
      console.log('[PluginConfigService] Removed plugins:', removed.map(p => p.id));
    }

    // Detect updated plugins (warn only, don't reload)
    const updated = newManifest.plugins.filter(p => {
      const oldPlugin = oldManifest.plugins.find(op => op.id === p.id);
      return oldPlugin && JSON.stringify(oldPlugin) !== JSON.stringify(p);
    });
    if (updated.length > 0) {
      console.warn('[PluginConfigService] Updated plugins (reload required):', updated.map(p => p.id));
    }
  }
}

export const pluginConfigService = new PluginConfigService();
