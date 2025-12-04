/**
 * Unit Tests: Plugin Isolation
 * Tests for src/plugins/core/PluginIsolation.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('Plugin Isolation', () => {
  let setupPluginIsolation: typeof import('@/plugins/core/PluginIsolation').setupPluginIsolation
  let createPluginErrorBoundary: typeof import('@/plugins/core/PluginIsolation').createPluginErrorBoundary
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(async () => {
    vi.clearAllMocks()
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')

    // Reset modules to get fresh imports
    vi.resetModules()
    const module = await import('@/plugins/core/PluginIsolation')
    setupPluginIsolation = module.setupPluginIsolation
    createPluginErrorBoundary = module.createPluginErrorBoundary
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('setupPluginIsolation', () => {
    it('registers routing event listener', () => {
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:routing-event',
        expect.any(Function)
      )
    })

    it('registers app change event listener', () => {
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:app-change',
        expect.any(Function)
      )
    })

    it('registers global error handler', () => {
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('registers unhandled rejection handler', () => {
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )
    })

    it('logs routing events', async () => {
      const { logger } = await import('@/utils/logger')
      setupPluginIsolation()

      // Get the routing event handler
      const routingHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'single-spa:routing-event'
      )?.[1] as EventListener

      // Trigger the handler
      routingHandler(new Event('single-spa:routing-event'))

      expect(logger.debug).toHaveBeenCalledWith(
        'PluginIsolation',
        'Routing event',
        expect.any(Event)
      )
    })

    it('logs app change events with active/inactive apps', async () => {
      const { logger } = await import('@/utils/logger')
      setupPluginIsolation()

      // Get the app change handler
      const appChangeHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'single-spa:app-change'
      )?.[1] as EventListener

      // Create custom event with detail
      const event = new CustomEvent('single-spa:app-change', {
        detail: {
          appsThatBecameActive: ['plugin-a'],
          appsThatBecameInactive: ['plugin-b'],
        },
      })

      appChangeHandler(event)

      expect(logger.debug).toHaveBeenCalledWith('PluginIsolation', 'App change', {
        appsThatBecameActive: ['plugin-a'],
        appsThatBecameInactive: ['plugin-b'],
      })
    })

    it('handles plugin errors and prevents bubbling', async () => {
      const { logger } = await import('@/utils/logger')
      setupPluginIsolation()

      // Get the error handler
      const errorHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1] as EventListener

      // Create error event from plugin
      const errorEvent = new ErrorEvent('error', {
        error: new Error('Plugin error'),
        filename: '/plugins/test-plugin/main.js',
      })

      const preventDefaultSpy = vi.spyOn(errorEvent, 'preventDefault')

      errorHandler(errorEvent)

      expect(logger.error).toHaveBeenCalledWith(
        'PluginIsolation',
        'Uncaught plugin error',
        expect.any(Error)
      )
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('does not handle non-plugin errors', async () => {
      const { logger } = await import('@/utils/logger')
      setupPluginIsolation()

      // Get the error handler
      const errorHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1] as EventListener

      // Create error event from non-plugin source
      const errorEvent = new ErrorEvent('error', {
        error: new Error('App error'),
        filename: '/src/main.js',
      })

      const preventDefaultSpy = vi.spyOn(errorEvent, 'preventDefault')

      errorHandler(errorEvent)

      // Should not log or prevent default for non-plugin errors
      expect(logger.error).not.toHaveBeenCalledWith(
        'PluginIsolation',
        'Uncaught plugin error',
        expect.anything()
      )
      expect(preventDefaultSpy).not.toHaveBeenCalled()
    })

    it('handles unhandled promise rejections', async () => {
      const { logger } = await import('@/utils/logger')
      setupPluginIsolation()

      // Get the rejection handler
      const rejectionHandler = addEventListenerSpy.mock.calls.find(
        (call) => call[0] === 'unhandledrejection'
      )?.[1] as EventListener

      // Create a rejected promise and catch it to avoid unhandled rejection
      const rejectedPromise = Promise.reject('test rejection')
      rejectedPromise.catch(() => {}) // Prevent unhandled rejection

      const rejectionEvent = new PromiseRejectionEvent('unhandledrejection', {
        promise: rejectedPromise,
        reason: 'Test rejection reason',
      })

      rejectionHandler(rejectionEvent)

      expect(logger.error).toHaveBeenCalledWith(
        'PluginIsolation',
        'Unhandled promise rejection',
        'Test rejection reason'
      )
    })
  })

  describe('createPluginErrorBoundary', () => {
    it('logs error boundary creation', async () => {
      const { logger } = await import('@/utils/logger')

      createPluginErrorBoundary()

      expect(logger.debug).toHaveBeenCalledWith(
        'PluginIsolation',
        'Error boundary created'
      )
    })
  })
})
