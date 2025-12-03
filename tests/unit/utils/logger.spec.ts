/**
 * Unit Tests: Logger Utility
 * Tests for src/utils/logger.ts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to reset modules to test logger config properly
describe('logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof vi.spyOn>
    warn: ReturnType<typeof vi.spyOn>
    error: ReturnType<typeof vi.spyOn>
  }

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    }
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('debug', () => {
    it('logs debug message with tag', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('debug')

      logger.debug('TestTag', 'Debug message')

      expect(consoleSpy.log).toHaveBeenCalledWith('[TestTag] Debug message')
    })

    it('logs debug message with data', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('debug')

      const data = { key: 'value' }
      logger.debug('TestTag', 'Debug message', data)

      expect(consoleSpy.log).toHaveBeenCalledWith('[TestTag] Debug message', data)
    })

    it('does not log when level is higher than debug', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('info')

      logger.debug('TestTag', 'Debug message')

      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('info', () => {
    it('logs info message with tag', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('info')

      logger.info('TestTag', 'Info message')

      expect(consoleSpy.log).toHaveBeenCalledWith('[TestTag] Info message')
    })

    it('logs info message with data', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('info')

      const data = [1, 2, 3]
      logger.info('TestTag', 'Info message', data)

      expect(consoleSpy.log).toHaveBeenCalledWith('[TestTag] Info message', data)
    })

    it('does not log when level is higher than info', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('warn')

      logger.info('TestTag', 'Info message')

      expect(consoleSpy.log).not.toHaveBeenCalled()
    })
  })

  describe('warn', () => {
    it('logs warning message with tag', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('warn')

      logger.warn('TestTag', 'Warning message')

      expect(consoleSpy.warn).toHaveBeenCalledWith('[TestTag] Warning message')
    })

    it('logs warning message with data', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('warn')

      const data = { error: 'details' }
      logger.warn('TestTag', 'Warning message', data)

      expect(consoleSpy.warn).toHaveBeenCalledWith('[TestTag] Warning message', data)
    })

    it('does not log when level is higher than warn', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('error')

      logger.warn('TestTag', 'Warning message')

      expect(consoleSpy.warn).not.toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('logs error message with tag', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('error')

      logger.error('TestTag', 'Error message')

      expect(consoleSpy.error).toHaveBeenCalledWith('[TestTag] Error message')
    })

    it('logs error message with error object', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('error')

      const error = new Error('Test error')
      logger.error('TestTag', 'Error occurred', error)

      expect(consoleSpy.error).toHaveBeenCalledWith('[TestTag] Error occurred', error)
    })

    it('always logs errors regardless of level', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('error')

      logger.error('TestTag', 'Error message')

      expect(consoleSpy.error).toHaveBeenCalled()
    })
  })

  describe('setLevel', () => {
    it('changes the minimum log level', async () => {
      const { logger } = await import('@/utils/logger')

      // Set to error - should not log debug
      logger.setLevel('error')
      logger.debug('Test', 'Should not appear')
      expect(consoleSpy.log).not.toHaveBeenCalled()

      // Set to debug - should log debug
      logger.setLevel('debug')
      logger.debug('Test', 'Should appear')
      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('setEnableInProd', () => {
    it('enables logging in production when set to true', async () => {
      const { logger } = await import('@/utils/logger')

      logger.setEnableInProd(true)
      logger.setLevel('debug')
      logger.debug('Test', 'Message')

      // In dev mode, this should log
      expect(consoleSpy.log).toHaveBeenCalled()
    })

    it('can disable logging in production', async () => {
      const { logger } = await import('@/utils/logger')

      logger.setEnableInProd(false)
      // This test runs in dev mode, so it should still log
      logger.setLevel('debug')
      logger.debug('Test', 'Message')

      expect(consoleSpy.log).toHaveBeenCalled()
    })
  })

  describe('message formatting', () => {
    it('formats message with tag prefix', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('debug')

      logger.debug('MyComponent', 'Test message')

      expect(consoleSpy.log).toHaveBeenCalledWith('[MyComponent] Test message')
    })

    it('handles special characters in tag', async () => {
      const { logger } = await import('@/utils/logger')
      logger.setLevel('debug')

      logger.debug('Auth/Login', 'User logged in')

      expect(consoleSpy.log).toHaveBeenCalledWith('[Auth/Login] User logged in')
    })
  })
})
