/**
 * Storage Manager Service Tests
 * Tests for token and auth client storage operations
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { StorageManager, storageManager } from '@/services/auth/storageManager'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

import { logger } from '@/utils/logger'

describe('StorageManager', () => {
  let localStorageMock: { [key: string]: string }
  let manager: StorageManager

  beforeEach(() => {
    // Mock localStorage
    localStorageMock = {}
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key]
        }),
        clear: vi.fn(() => {
          localStorageMock = {}
        }),
      },
      configurable: true,
    })

    // Mock document.cookie
    let cookieValue = ''
    Object.defineProperty(document, 'cookie', {
      get: () => cookieValue,
      set: (v) => { cookieValue = v },
      configurable: true,
    })

    manager = new StorageManager()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Token Management', () => {
    describe('saveToken', () => {
      it('should save token to localStorage', () => {
        manager.saveToken('test-token')
        expect(localStorage.setItem).toHaveBeenCalledWith('bearerToken', 'test-token')
      })

      it('should save token to cookie', () => {
        manager.saveToken('test-token')
        expect(document.cookie).toContain('bearerToken=test-token')
      })

      it('should not mark the cookie Secure when served over http', () => {
        manager.saveToken('test-token')
        expect(document.cookie).not.toContain('Secure')
      })

      it('should mark the cookie Secure when served over https', () => {
        const originalLocation = window.location
        Object.defineProperty(window, 'location', {
          value: { ...originalLocation, protocol: 'https:' },
          configurable: true,
        })

        manager.saveToken('test-token')

        expect(document.cookie).toContain('Secure')

        Object.defineProperty(window, 'location', {
          value: originalLocation,
          configurable: true,
        })
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        manager.saveToken('test-token')

        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to save token',
          expect.any(Error)
        )
      })
    })

    describe('getToken', () => {
      it('should retrieve token from localStorage', () => {
        localStorageMock['bearerToken'] = 'stored-token'

        const token = manager.getToken()

        expect(token).toBe('stored-token')
      })

      it('should return null if no token', () => {
        const token = manager.getToken()
        expect(token).toBeNull()
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        const token = manager.getToken()

        expect(token).toBeNull()
        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to get token',
          expect.any(Error)
        )
      })
    })

    describe('clearToken', () => {
      it('should remove token from localStorage', () => {
        localStorageMock['bearerToken'] = 'stored-token'

        manager.clearToken()

        expect(localStorage.removeItem).toHaveBeenCalledWith('bearerToken')
      })

      it('should clear token cookie by setting expired date', () => {
        manager.clearToken()
        expect(document.cookie).toContain('bearerToken=')
        expect(document.cookie).toContain('expires=Thu, 01 Jan 1970')
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.removeItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        manager.clearToken()

        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to clear token',
          expect.any(Error)
        )
      })
    })
  })

  describe('Auth Client Management', () => {
    describe('saveAuthClient', () => {
      it('should save auth client to localStorage', () => {
        manager.saveAuthClient('oauth-client')
        expect(localStorage.setItem).toHaveBeenCalledWith('auth-client', 'oauth-client')
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        manager.saveAuthClient('oauth-client')

        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to save auth client',
          expect.any(Error)
        )
      })
    })

    describe('getAuthClient', () => {
      it('should retrieve auth client from localStorage', () => {
        localStorageMock['auth-client'] = 'stored-client'

        const client = manager.getAuthClient()

        expect(client).toBe('stored-client')
      })

      it('should return null if no auth client', () => {
        const client = manager.getAuthClient()
        expect(client).toBeNull()
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        const client = manager.getAuthClient()

        expect(client).toBeNull()
        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to get auth client',
          expect.any(Error)
        )
      })
    })

    describe('clearAuthClient', () => {
      it('should remove auth client from localStorage', () => {
        localStorageMock['auth-client'] = 'stored-client'

        manager.clearAuthClient()

        expect(localStorage.removeItem).toHaveBeenCalledWith('auth-client')
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.removeItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })

        manager.clearAuthClient()

        expect(logger.error).toHaveBeenCalledWith(
          'StorageManager',
          'Failed to clear auth client',
          expect.any(Error)
        )
      })
    })
  })

  describe('Logout URL Management', () => {
    describe('saveLogoutUrl', () => {
      it('should save logout URL to localStorage', () => {
        manager.saveLogoutUrl('https://example.com/logout')
        expect(localStorage.setItem).toHaveBeenCalledWith('auth-logout-url', 'https://example.com/logout')
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })
        manager.saveLogoutUrl('https://example.com/logout')
        expect(logger.error).toHaveBeenCalledWith('StorageManager', 'Failed to save logout URL', expect.any(Error))
      })
    })

    describe('getLogoutUrl', () => {
      it('should retrieve logout URL from localStorage', () => {
        localStorageMock['auth-logout-url'] = 'https://example.com/logout'
        expect(manager.getLogoutUrl()).toBe('https://example.com/logout')
      })

      it('should return null if no logout URL', () => {
        expect(manager.getLogoutUrl()).toBeNull()
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.getItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })
        expect(manager.getLogoutUrl()).toBeNull()
        expect(logger.error).toHaveBeenCalledWith('StorageManager', 'Failed to get logout URL', expect.any(Error))
      })
    })

    describe('clearLogoutUrl', () => {
      it('should remove logout URL from localStorage', () => {
        localStorageMock['auth-logout-url'] = 'https://example.com/logout'
        manager.clearLogoutUrl()
        expect(localStorage.removeItem).toHaveBeenCalledWith('auth-logout-url')
      })

      it('should handle localStorage error', () => {
        vi.mocked(localStorage.removeItem).mockImplementationOnce(() => {
          throw new Error('Storage error')
        })
        manager.clearLogoutUrl()
        expect(logger.error).toHaveBeenCalledWith('StorageManager', 'Failed to clear logout URL', expect.any(Error))
      })
    })
  })

  describe('clearAll', () => {
    it('should clear both token and auth client', () => {
      localStorageMock['bearerToken'] = 'token'
      localStorageMock['auth-client'] = 'client'

      manager.clearAll()

      expect(localStorage.removeItem).toHaveBeenCalledWith('bearerToken')
      expect(localStorage.removeItem).toHaveBeenCalledWith('auth-client')
    })
  })

  describe('Singleton Instance', () => {
    it('should export a singleton instance', () => {
      expect(storageManager).toBeInstanceOf(StorageManager)
    })
  })
})
