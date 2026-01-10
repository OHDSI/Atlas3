/**
 * Tests for HostMessageBus
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { HostMessageBus, createHostMessageBus, getHostMessageBus, setupGlobalMessageHandler } from '@/plugins/messaging/HostMessageBus'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('HostMessageBus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('constructor', () => {
    it('should create instance with plugin ID', () => {
      const bus = new HostMessageBus('test-plugin')
      expect(bus).toBeDefined()
    })
  })

  describe('send', () => {
    it('should dispatch custom event with message details', () => {
      const bus = new HostMessageBus('test-plugin')
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      bus.send('test:message', { data: 'test' })

      expect(dispatchSpy).toHaveBeenCalledTimes(1)
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent
      expect(event.type).toBe('plugin-message')
      expect(event.detail.type).toBe('test:message')
      expect(event.detail.sourcePluginId).toBe('test-plugin')
      expect(event.detail.payload).toEqual({ data: 'test' })
      expect(event.detail.timestamp).toBeInstanceOf(Date)
    })
  })

  describe('request', () => {
    it('should create request with callback ID', async () => {
      const bus = new HostMessageBus('test-plugin')
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      // Start the request but don't await yet
      const requestPromise = bus.request('data:request', { query: 'test' })

      expect(dispatchSpy).toHaveBeenCalledTimes(1)
      const event = dispatchSpy.mock.calls[0][0] as CustomEvent
      expect(event.detail.callbackId).toMatch(/^req-test-plugin-\d+$/)

      // Resolve the request via handleResponse
      const callbackId = event.detail.callbackId
      bus.handleResponse(callbackId, { success: true })

      const result = await requestPromise
      expect(result).toEqual({ success: true })
    })

    it('should timeout after 30 seconds', async () => {
      const bus = new HostMessageBus('test-plugin')

      const requestPromise = bus.request('data:request', {})

      // Advance timer past 30 seconds
      vi.advanceTimersByTime(30001)

      await expect(requestPromise).rejects.toThrow('Request timeout for data:request')
    })

    it('should increment request ID counter', () => {
      const bus = new HostMessageBus('test-plugin')
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      bus.request('test:1', {})
      bus.request('test:2', {})

      const event1 = (dispatchSpy.mock.calls[0][0] as CustomEvent).detail
      const event2 = (dispatchSpy.mock.calls[1][0] as CustomEvent).detail

      expect(event1.callbackId).toBe('req-test-plugin-1')
      expect(event2.callbackId).toBe('req-test-plugin-2')
    })
  })

  describe('subscribe', () => {
    it('should register callback for message type', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback = vi.fn()

      bus.subscribe('test:event', callback)
      bus.handleIncomingMessage('test:event', { value: 42 })

      expect(callback).toHaveBeenCalledWith({ value: 42 })
    })

    it('should support multiple subscribers for same type', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      bus.subscribe('test:event', callback1)
      bus.subscribe('test:event', callback2)
      bus.handleIncomingMessage('test:event', { value: 'test' })

      expect(callback1).toHaveBeenCalledWith({ value: 'test' })
      expect(callback2).toHaveBeenCalledWith({ value: 'test' })
    })

    it('should return unsubscribe function', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback = vi.fn()

      const unsubscribe = bus.subscribe('test:event', callback)

      // Unsubscribe
      unsubscribe()

      // Should not be called after unsubscribing
      bus.handleIncomingMessage('test:event', {})
      expect(callback).not.toHaveBeenCalled()
    })

    it('should only unsubscribe the specific callback', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsubscribe1 = bus.subscribe('test:event', callback1)
      bus.subscribe('test:event', callback2)

      // Unsubscribe first callback only
      unsubscribe1()

      bus.handleIncomingMessage('test:event', {})

      expect(callback1).not.toHaveBeenCalled()
      expect(callback2).toHaveBeenCalled()
    })
  })

  describe('handleResponse', () => {
    it('should resolve pending request with response', async () => {
      const bus = new HostMessageBus('test-plugin')
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      const requestPromise = bus.request('test:request', {})
      const callbackId = (dispatchSpy.mock.calls[0][0] as CustomEvent).detail.callbackId

      bus.handleResponse(callbackId, { result: 'success' })

      const result = await requestPromise
      expect(result).toEqual({ result: 'success' })
    })

    it('should reject pending request with error', async () => {
      const bus = new HostMessageBus('test-plugin')
      const dispatchSpy = vi.spyOn(window, 'dispatchEvent')

      const requestPromise = bus.request('test:request', {})
      const callbackId = (dispatchSpy.mock.calls[0][0] as CustomEvent).detail.callbackId

      bus.handleResponse(callbackId, null, new Error('Test error'))

      await expect(requestPromise).rejects.toThrow('Test error')
    })

    it('should do nothing for unknown callback ID', () => {
      const bus = new HostMessageBus('test-plugin')

      // Should not throw
      expect(() => bus.handleResponse('unknown-id', {})).not.toThrow()
    })
  })

  describe('handleIncomingMessage', () => {
    it('should call registered callbacks with payload', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback = vi.fn()

      bus.subscribe('test:type', callback)
      bus.handleIncomingMessage('test:type', { data: 'test' })

      expect(callback).toHaveBeenCalledWith({ data: 'test' })
    })

    it('should do nothing for unsubscribed message types', () => {
      const bus = new HostMessageBus('test-plugin')
      const callback = vi.fn()

      bus.subscribe('subscribed:type', callback)

      // Send message for different type
      bus.handleIncomingMessage('unsubscribed:type', {})

      expect(callback).not.toHaveBeenCalled()
    })
  })
})

describe('createHostMessageBus', () => {
  it('should create new instance for new plugin ID', () => {
    const bus1 = createHostMessageBus('plugin-1')
    const bus2 = createHostMessageBus('plugin-2')

    expect(bus1).not.toBe(bus2)
  })

  it('should return same instance for same plugin ID', () => {
    const bus1 = createHostMessageBus('shared-plugin')
    const bus2 = createHostMessageBus('shared-plugin')

    expect(bus1).toBe(bus2)
  })
})

describe('getHostMessageBus', () => {
  it('should return undefined for unknown plugin ID', () => {
    const bus = getHostMessageBus('unknown-plugin-id-xyz')
    expect(bus).toBeUndefined()
  })

  it('should return existing bus instance', () => {
    const created = createHostMessageBus('get-test-plugin')
    const retrieved = getHostMessageBus('get-test-plugin')

    expect(retrieved).toBe(created)
  })
})

describe('setupGlobalMessageHandler', () => {
  let eventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    eventListenerSpy = vi.spyOn(window, 'addEventListener')
  })

  afterEach(() => {
    eventListenerSpy.mockRestore()
  })

  it('should add event listener for plugin-message events', () => {
    setupGlobalMessageHandler(null)

    expect(eventListenerSpy).toHaveBeenCalledWith(
      'plugin-message',
      expect.any(Function)
    )
  })

  it('should handle navigation:request message', () => {
    const mockRouter = {
      push: vi.fn(),
      back: vi.fn(),
    }

    setupGlobalMessageHandler(mockRouter)

    // Get the registered handler
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    // Dispatch a navigation request
    handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'navigation:request',
        sourcePluginId: 'test',
        payload: { path: '/test-route' },
        timestamp: new Date(),
      },
    }))

    expect(mockRouter.push).toHaveBeenCalledWith('/test-route')
  })

  it('should handle navigation:back message', () => {
    const mockRouter = {
      push: vi.fn(),
      back: vi.fn(),
    }

    setupGlobalMessageHandler(mockRouter)
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'navigation:back',
        sourcePluginId: 'test',
        payload: {},
        timestamp: new Date(),
      },
    }))

    expect(mockRouter.back).toHaveBeenCalled()
  })

  it('should handle notification:show message', () => {
    const mockNotificationService = {
      show: vi.fn(),
    }

    setupGlobalMessageHandler(null, mockNotificationService)
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'notification:show',
        sourcePluginId: 'test',
        payload: { message: 'Test notification' },
        timestamp: new Date(),
      },
    }))

    expect(mockNotificationService.show).toHaveBeenCalledWith({ message: 'Test notification' })
  })

  it('should handle data:request message', () => {
    // Create a message bus for the plugin first
    const bus = createHostMessageBus('data-test-plugin')
    const handleResponseSpy = vi.spyOn(bus, 'handleResponse')

    setupGlobalMessageHandler(null)
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'data:request',
        sourcePluginId: 'data-test-plugin',
        callbackId: 'test-callback',
        payload: {},
        timestamp: new Date(),
      },
    }))

    expect(handleResponseSpy).toHaveBeenCalledWith('test-callback', { success: true, data: {} })
  })

  it('should handle error:report message', () => {
    setupGlobalMessageHandler(null)
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    // Should not throw
    expect(() => handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'error:report',
        sourcePluginId: 'test',
        payload: { error: 'Test error' },
        timestamp: new Date(),
      },
    }))).not.toThrow()
  })

  it('should handle unknown message types gracefully', () => {
    setupGlobalMessageHandler(null)
    const handler = eventListenerSpy.mock.calls[0][1] as EventListener

    // Should not throw for unknown message type
    expect(() => handler(new CustomEvent('plugin-message', {
      detail: {
        type: 'unknown:type',
        sourcePluginId: 'test',
        payload: {},
        timestamp: new Date(),
      },
    }))).not.toThrow()
  })
})
