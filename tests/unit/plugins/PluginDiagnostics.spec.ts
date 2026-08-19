/**
 * Plugin Diagnostics Tests
 * Tests for plugin error logging
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

describe('PluginDiagnostics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  describe('setupPluginDiagnostics', () => {
    it('should setup routing event listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:routing-event',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should setup app change listener', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'single-spa:app-change',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should setup error handler', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should not register an unhandledrejection handler (main.ts owns the global one)', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

      expect(addEventListenerSpy).not.toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      )

      addEventListenerSpy.mockRestore()
    })

    it('should log plugin errors from /plugins/ path', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

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
        'PluginDiagnostics',
        'Uncaught plugin error',
        mockEvent.error
      )
      expect(mockEvent.preventDefault).toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
    })

    it('should not intercept non-plugin errors', async () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener')

      const { setupPluginDiagnostics } = await import('@/plugins/core/PluginDiagnostics')
      setupPluginDiagnostics()

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
        'PluginDiagnostics',
        'Uncaught plugin error',
        expect.anything()
      )
      expect(mockEvent.preventDefault).not.toHaveBeenCalled()

      addEventListenerSpy.mockRestore()
    })
  })
})
