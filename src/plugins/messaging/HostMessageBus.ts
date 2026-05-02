import { PluginMessageBus, HostMessage } from '@/models/PluginModels'
import { logger } from '@/utils/logger'

type MessageCallback<T = unknown> = (payload: T) => void

export class HostMessageBus implements PluginMessageBus {
  private pluginId: string
  private subscribers: Map<string, MessageCallback<unknown>[]> = new Map()
  private pendingRequests: Map<
    string,
    { resolve: (value: unknown) => void; reject: (reason?: unknown) => void }
  > = new Map()
  private requestIdCounter = 0

  constructor(pluginId: string) {
    this.pluginId = pluginId
  }

  send<T = unknown>(type: string, payload: T): void {
    const message: HostMessage<T> = {
      type,
      sourcePluginId: this.pluginId,
      payload,
      timestamp: new Date(),
    }

    logger.debug('HostMessageBus', `Plugin ${this.pluginId} sent message`, message)

    // Dispatch custom event for host to handle
    window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }))
  }

  async request<TRequest = unknown, TResponse = unknown>(
    type: string,
    payload: TRequest
  ): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
      const callbackId = `req-${this.pluginId}-${++this.requestIdCounter}`

      const message: HostMessage<TRequest> = {
        type,
        sourcePluginId: this.pluginId,
        payload,
        callbackId,
        timestamp: new Date(),
      }

      this.pendingRequests.set(callbackId, {
        resolve: resolve as (value: unknown) => void,
        reject,
      })

      logger.debug('HostMessageBus', `Plugin ${this.pluginId} sent request`, message)

      window.dispatchEvent(new CustomEvent('plugin-message', { detail: message }))

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(callbackId)) {
          this.pendingRequests.delete(callbackId)
          reject(new Error(`Request timeout for ${type}`))
        }
      }, 30000)
    })
  }

  subscribe<T = unknown>(type: string, callback: MessageCallback<T>): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, [])
    }
    // Cast to unknown callback type for storage
    const untypedCallback = callback as MessageCallback<unknown>
    this.subscribers.get(type)!.push(untypedCallback)

    return () => {
      const callbacks = this.subscribers.get(type)
      if (callbacks) {
        const index = callbacks.indexOf(untypedCallback)
        if (index > -1) {
          callbacks.splice(index, 1)
        }
      }
    }
  }

  handleResponse<T = unknown>(callbackId: string, response: T, error?: Error): void {
    const pending = this.pendingRequests.get(callbackId)
    if (pending) {
      this.pendingRequests.delete(callbackId)
      if (error) {
        pending.reject(error)
      } else {
        pending.resolve(response)
      }
    }
  }

  handleIncomingMessage<T = unknown>(type: string, payload: T): void {
    const callbacks = this.subscribers.get(type)
    if (callbacks) {
      callbacks.forEach(callback => callback(payload))
    }
  }
}

const messageBusInstances: Map<string, HostMessageBus> = new Map()

export function createHostMessageBus(pluginId: string): HostMessageBus {
  if (messageBusInstances.has(pluginId)) {
    return messageBusInstances.get(pluginId)!
  }

  const instance = new HostMessageBus(pluginId)
  messageBusInstances.set(pluginId, instance)
  return instance
}

export function getHostMessageBus(pluginId: string): HostMessageBus | undefined {
  return messageBusInstances.get(pluginId)
}

// Router interface for navigation
interface RouterLike {
  push: (path: string) => void
  back: () => void
}

// Notification service interface
interface NotificationServiceLike {
  show: (payload: unknown) => void
}

// Setup global message handler
export function setupGlobalMessageHandler(
  router: RouterLike | null,
  notificationService?: NotificationServiceLike
): void {
  window.addEventListener('plugin-message', ((event: CustomEvent<HostMessage>) => {
    const message = event.detail

    logger.debug('HostMessageBus', 'Received message from plugin', message)

    switch (message.type) {
      case 'navigation:request':
        if (router) {
          const payload = message.payload as { path: string }
          router.push(payload.path)
        }
        break

      case 'navigation:back':
        if (router) {
          router.back()
        }
        break

      case 'notification:show':
        if (notificationService) {
          notificationService.show(message.payload)
        } else {
          logger.debug('HostMessageBus', 'Notification', message.payload)
        }
        break

      case 'data:request': {
        // Handle data requests
        const messageBus = getHostMessageBus(message.sourcePluginId)
        if (messageBus && message.callbackId) {
          // Mock response for now
          const response = { success: true, data: {} }
          messageBus.handleResponse(message.callbackId, response)
        }
        break
      }

      case 'error:report':
        logger.error('HostMessageBus', `Plugin ${message.sourcePluginId} error`, message.payload)
        break

      default:
        logger.debug('HostMessageBus', `Unhandled message type: ${message.type}`)
    }
  }) as EventListener)
}
