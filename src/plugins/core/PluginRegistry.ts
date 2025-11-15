import { 
  PluginInstance, 
  PluginRegistration, 
  PluginLifecycleState,
  AuthContext,
  PluginMessageBus 
} from '@/models/PluginModels';

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private stateListeners: Map<string, Array<(state: PluginLifecycleState) => void>> = new Map();
  private changeListeners: Array<(changeType: 'added' | 'removed', pluginId: string) => void> = [];

  registerPlugin(
    registration: PluginRegistration,
    authContext: AuthContext,
    messageBus: PluginMessageBus
  ): PluginInstance {
    if (this.plugins.has(registration.id)) {
      throw new Error(`Plugin ${registration.id} is already registered`);
    }

    const instance: PluginInstance = {
      registration,
      state: 'not-loaded',
      authContext,
      messageBus,
    };

    this.plugins.set(registration.id, instance);
    console.log(`[PluginRegistry] Registered plugin: ${registration.id}`);
    
    return instance;
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  unregisterPlugin(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      this.plugins.delete(pluginId);
      this.stateListeners.delete(pluginId);
      this.notifyChangeListeners('removed', pluginId);
      console.log(`[PluginRegistry] Unregistered plugin: ${pluginId}`);
    }
  }

  onPluginChange(callback: (changeType: 'added' | 'removed', pluginId: string) => void): () => void {
    this.changeListeners.push(callback);
    return () => {
      const index = this.changeListeners.indexOf(callback);
      if (index > -1) {
        this.changeListeners.splice(index, 1);
      }
    };
  }

  private notifyChangeListeners(changeType: 'added' | 'removed', pluginId: string): void {
    this.changeListeners.forEach(callback => callback(changeType, pluginId));
  }

  updatePluginState(pluginId: string, state: PluginLifecycleState): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.state = state;
      this.notifyStateListeners(pluginId, state);
      console.log(`[PluginRegistry] Plugin ${pluginId} state: ${state}`);
    }
  }

  setPluginError(
    pluginId: string, 
    error: Error, 
    recoverable: boolean = true
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.state = 'error';
      plugin.error = {
        message: error.message,
        stack: error.stack,
        timestamp: new Date(),
        recoverable,
      };
      this.notifyStateListeners(pluginId, 'error');
      console.error(`[PluginRegistry] Plugin ${pluginId} error:`, error);
    }
  }

  updatePluginMetrics(
    pluginId: string,
    metrics: Partial<PluginInstance['metrics']>
  ): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.metrics = {
        ...plugin.metrics,
        ...metrics,
      };
    }
  }

  onStateChange(
    pluginId: string,
    callback: (state: PluginLifecycleState) => void
  ): () => void {
    if (!this.stateListeners.has(pluginId)) {
      this.stateListeners.set(pluginId, []);
    }

    this.stateListeners.get(pluginId)!.push(callback);

    // Immediately call the callback with the current state if plugin exists
    // This handles the case where the plugin is already loaded when the listener is attached
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      callback(plugin.state);
    }

    return () => {
      const listeners = this.stateListeners.get(pluginId);
      if (listeners) {
        const index = listeners.indexOf(callback);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  private notifyStateListeners(pluginId: string, state: PluginLifecycleState): void {
    const listeners = this.stateListeners.get(pluginId);
    if (listeners) {
      listeners.forEach(callback => callback(state));
    }
  }

  getPluginsByState(state: PluginLifecycleState): PluginInstance[] {
    return Array.from(this.plugins.values()).filter(p => p.state === state);
  }

  getFailedPlugins(): PluginInstance[] {
    return this.getPluginsByState('error');
  }
}

export const pluginRegistry = new PluginRegistry();
