/**
 * Plugin Isolation Tests
 * Tests for plugin error isolation
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { logger } from '@/utils/logger'

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}))

describe('PluginIsolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('setupPluginIsolation', () => {
    it('should setup routing event listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:routing-event',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should setup app change listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:app-change',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should setup error handler', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should setup unhandled rejection handler', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should log plugin errors from /plugins/ path', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      // Get the error handler
      const errorHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as (event: ErrorEvent) => void

      expect(errorHandler).toBeDefined()

      const mockEvent = {
        filename: '/plugins/test-plugin/index.js',
        error: new Error('Test error'),
        preventDefault: vi.fn()
      } as unknown as ErrorEvent

      errorHandler(mockEvent)

      expect(logger.error).toHaveBeenCalledWith(
        'PluginIsolation',
        'Uncaught plugin error',
        mockEvent.error
      )
      expect(mockEvent.preventDefault).toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
    })

    it('should not intercept non-plugin errors', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      const errorHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'error'
      )?.[1] as (event: ErrorEvent) => void

      expect(errorHandler).toBeDefined()

      const mockEvent = {
        filename: '/src/main.js',
        error: new Error('Test error'),
        preventDefault: vi.fn()
      } as unknown as ErrorEvent

      errorHandler(mockEvent)

      expect(logger.error).not.toHaveBeenCalledWith(
        'PluginIsolation',
        'Uncaught plugin error',
        expect.anything()
      )
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
    })

    it('should log unhandled promise rejections', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginIsolation } = await import('@/plugins/core/PluginIsolation')
      setupPluginIsolation()

      const rejectionHandler = addEventListenerSpy.mock.calls.find(
        call => call[0] === 'unhandledrejection'
      )?.[1] as (event: PromiseRejectionEvent) => void

      expect(rejectionHandler).toBeDefined()

      const mockEvent = {
        reason: 'Test rejection'
      } as PromiseRejectionEvent

      rejectionHandler(mockEvent)

      expect(logger.error).toHaveBeenCalledWith(
        'PluginIsolation',
        'Unhandled promise rejection',
        'Test rejection'
      )

      addEventListenerSpy.mockRestore()
    })
  })

  describe('createPluginErrorBoundary', () => {
    it('should log debug message when called', async () => {
      const { createPluginErrorBoundary } = await import('@/plugins/core/PluginIsolation')
      createPluginErrorBoundary()

      expect(logger.debug).toHaveBeenCalledWith(
        'PluginIsolation',
        'Error boundary created'
      )
    })
  })
})
