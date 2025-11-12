import { PluginMessageBus, HostMessage } from '@/models/PluginModels';

type MessageCallback<T = any> = (payload: T) => void;

export class HostMessageBus implements PluginMessageBus {
  private pluginId: string;
  private subscribers: Map<string, MessageCallback[]> = new Map();
  private pendingRequests: Map<string, { resolve: Function; reject: Function }> = new Map();
  private requestIdCounter = 0;

  constructor(pluginId: string) {
    this.pluginId = pluginId;
  }

  send<T = any>(type: string, payload: T): void {
    const message: HostMessage<T> = {
      type,
      sourcePluginId: this.pluginId,
      payload,
      timestamp: new Date(),
    };

    console.log(`[HostMessageBus] Plugin ${this.pluginId} sent message:`, message);

    // Dispatch custom event for host to handle
    window.dispatchEvent(
      new CustomEvent('plugin-message', { detail: message })
    );
  }

  async request<TRequest = any, TResponse = any>(
    type: string,
    payload: TRequest
  ): Promise<TResponse> {
    return new Promise((resolve, reject) => {
      const callbackId = `req-${this.pluginId}-${++this.requestIdCounter}`;
      
      const message: HostMessage<TRequest> = {
        type,
        sourcePluginId: this.pluginId,
        payload,
        callbackId,
        timestamp: new Date(),
      };

      this.pendingRequests.set(callbackId, { resolve, reject });

      console.log(`[HostMessageBus] Plugin ${this.pluginId} sent request:`, message);

      window.dispatchEvent(
        new CustomEvent('plugin-message', { detail: message })
      );

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(callbackId)) {
          this.pendingRequests.delete(callbackId);
          reject(new Error(`Request timeout for ${type}`));
        }
      }, 30000);
    });
  }

  subscribe<T = any>(type: string, callback: MessageCallback<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, []);
    }
    this.subscribers.get(type)!.push(callback);

    return () => {
      const callbacks = this.subscribers.get(type);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  handleResponse<T = any>(callbackId: string, response: T, error?: Error): void {
    const pending = this.pendingRequests.get(callbackId);
    if (pending) {
      this.pendingRequests.delete(callbackId);
      if (error) {
        pending.reject(error);
      } else {
        pending.resolve(response);
      }
    }
  }

  handleIncomingMessage<T = any>(type: string, payload: T): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach(callback => callback(payload));
    }
  }
}

const messageBusInstances: Map<string, HostMessageBus> = new Map();

export function createHostMessageBus(pluginId: string): HostMessageBus {
  if (messageBusInstances.has(pluginId)) {
    return messageBusInstances.get(pluginId)!;
  }

  const instance = new HostMessageBus(pluginId);
  messageBusInstances.set(pluginId, instance);
  return instance;
}

export function getHostMessageBus(pluginId: string): HostMessageBus | undefined {
  return messageBusInstances.get(pluginId);
}

// Setup global message handler
export function setupGlobalMessageHandler(router: any, notificationService?: any): void {
  window.addEventListener('plugin-message', ((event: CustomEvent<HostMessage>) => {
    const message = event.detail;
    
    console.log('[HostMessageBus] Received message from plugin:', message);

    switch (message.type) {
      case 'navigation:request':
        if (router) {
          router.push(message.payload.path);
        }
        break;

      case 'navigation:back':
        if (router) {
          router.back();
        }
        break;

      case 'notification:show':
        if (notificationService) {
          notificationService.show(message.payload);
        } else {
          console.log('[HostMessageBus] Notification:', message.payload);
        }
        break;

      case 'data:request':
        // Handle data requests
        const messageBus = getHostMessageBus(message.sourcePluginId);
        if (messageBus && message.callbackId) {
          // Mock response for now
          const response = { success: true, data: {} };
          messageBus.handleResponse(message.callbackId, response);
        }
        break;

      case 'error:report':
        console.error(`[Plugin ${message.sourcePluginId}] Error:`, message.payload);
        break;

      default:
        console.log(`[HostMessageBus] Unhandled message type: ${message.type}`);
    }
  }) as EventListener);
}
