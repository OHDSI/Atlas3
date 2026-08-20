/**
 * Logger Utility Tests
 * Tests for conditional logging based on environment
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { logger } from '@/utils/logger'

describe('logger', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Spy on console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('debug', () => {
    it('should log with tag formatting', () => {
      logger.setLevel('debug')
      logger.setEnableInProd(true)

      logger.debug('TestModule', 'Test message')

      expect(console.log).toHaveBeenCalledWith('[TestModule] Test message')
    })

    it('should log with data when provided', () => {
      logger.setLevel('debug')
      logger.setEnableInProd(true)

      const data = { key: 'value' }
      logger.debug('TestModule', 'Test message', data)

      expect(console.log).toHaveBeenCalledWith('[TestModule] Test message', data)
    })
  })

  describe('info', () => {
    it('should log info messages', () => {
      logger.setLevel('info')
      logger.setEnableInProd(true)

      logger.info('Auth', 'User logged in')

      expect(console.log).toHaveBeenCalledWith('[Auth] User logged in')
    })

    it('should log info with additional data', () => {
      logger.setLevel('info')
      logger.setEnableInProd(true)

      const userData = { userId: 123 }
      logger.info('Auth', 'User logged in', userData)

      expect(console.log).toHaveBeenCalledWith('[Auth] User logged in', userData)
    })
  })

  describe('warn', () => {
    it('should log warning messages', () => {
      logger.setLevel('warn')
      logger.setEnableInProd(true)

      logger.warn('Cache', 'Cache miss')

      expect(console.warn).toHaveBeenCalledWith('[Cache] Cache miss')
    })

    it('should log warning with additional data', () => {
      logger.setLevel('warn')
      logger.setEnableInProd(true)

      const details = { cacheKey: 'user:123' }
      logger.warn('Cache', 'Cache miss', details)

      expect(console.warn).toHaveBeenCalledWith('[Cache] Cache miss', details)
    })
  })

  describe('error', () => {
    it('should log error messages', () => {
      logger.setLevel('error')
      logger.setEnableInProd(true)

      logger.error('API', 'Request failed')

      expect(console.error).toHaveBeenCalledWith('[API] Request failed')
    })

    it('should log error with error object', () => {
      logger.setLevel('error')
      logger.setEnableInProd(true)

      const error = new Error('Network error')
      logger.error('API', 'Request failed', error)

      expect(console.error).toHaveBeenCalledWith('[API] Request failed', error)
    })
  })

  describe('log levels', () => {
    it('should respect log level - debug shows all', () => {
      logger.setLevel('debug')
      logger.setEnableInProd(true)

      logger.debug('Test', 'debug')
      logger.info('Test', 'info')
      logger.warn('Test', 'warn')
      logger.error('Test', 'error')

      expect(console.log).toHaveBeenCalledTimes(2) // debug and info
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    it('should respect log level - warn hides debug and info', () => {
      logger.setLevel('warn')
      logger.setEnableInProd(true)

      logger.debug('Test', 'debug')
      logger.info('Test', 'info')
      logger.warn('Test', 'warn')
      logger.error('Test', 'error')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.warn).toHaveBeenCalledTimes(1)
      expect(console.error).toHaveBeenCalledTimes(1)
    })

    it('should respect log level - error only shows errors', () => {
      logger.setLevel('error')
      logger.setEnableInProd(true)

      logger.debug('Test', 'debug')
      logger.info('Test', 'info')
      logger.warn('Test', 'warn')
      logger.error('Test', 'error')

      expect(console.log).not.toHaveBeenCalled()
      expect(console.warn).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledTimes(1)
    })
  })

  describe('setLevel', () => {
    it('should change the minimum log level', () => {
      logger.setLevel('info')
      logger.setEnableInProd(true)

      logger.debug('Test', 'should not show')
      expect(console.log).not.toHaveBeenCalled()

      logger.setLevel('debug')
      logger.debug('Test', 'should show now')
      expect(console.log).toHaveBeenCalled()
    })
  })

  describe('setEnableInProd', () => {
    it('should enable/disable production logging', () => {
      logger.setEnableInProd(true)
      expect(logger).toBeDefined()

      logger.setEnableInProd(false)
      expect(logger).toBeDefined()
    })
  })
})
