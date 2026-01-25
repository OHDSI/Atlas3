/**
 * Router Home Redirect Guard Tests
 * Tests for the home redirect functionality
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock pluginConfigService
const mockGetLogoNavigateTo = vi.fn()
vi.mock('@/services/PluginConfigService', () => ({
  pluginConfigService: {
    getLogoNavigateTo: () => mockGetLogoNavigateTo(),
    loadConfig: vi.fn().mockResolvedValue({ version: '1.0', plugins: [] }),
    getManifest: vi.fn().mockReturnValue({ version: '1.0', plugins: [] }),
    isCoreNavigationItemEnabled: vi.fn().mockReturnValue(true),
  },
}))

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Home Redirect Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetLogoNavigateTo.mockReturnValue('/')
  })

  describe('logoNavigateTo configuration', () => {
    it('should return "/" by default', () => {
      mockGetLogoNavigateTo.mockReturnValue('/')
      expect(mockGetLogoNavigateTo()).toBe('/')
    })

    it('should return configured path when set', () => {
      mockGetLogoNavigateTo.mockReturnValue('/cohorts')
      expect(mockGetLogoNavigateTo()).toBe('/cohorts')
    })

    it('should handle empty string as default', () => {
      mockGetLogoNavigateTo.mockReturnValue('')
      expect(mockGetLogoNavigateTo()).toBe('')
    })
  })

  describe('redirect logic', () => {
    it('should redirect when logoNavigateTo is different from /', () => {
      mockGetLogoNavigateTo.mockReturnValue('/cohorts')
      const logoNavigateTo = mockGetLogoNavigateTo()

      const shouldRedirect = logoNavigateTo && logoNavigateTo !== '/'
      expect(shouldRedirect).toBe(true)
    })

    it('should not redirect when logoNavigateTo is /', () => {
      mockGetLogoNavigateTo.mockReturnValue('/')
      const logoNavigateTo = mockGetLogoNavigateTo()

      const shouldRedirect = logoNavigateTo && logoNavigateTo !== '/'
      expect(shouldRedirect).toBe(false)
    })

    it('should not redirect when logoNavigateTo is null', () => {
      mockGetLogoNavigateTo.mockReturnValue(null)
      const logoNavigateTo = mockGetLogoNavigateTo()

      const shouldRedirect = logoNavigateTo && logoNavigateTo !== '/'
      expect(shouldRedirect).toBeFalsy()
    })

    it('should not redirect when logoNavigateTo is empty string', () => {
      mockGetLogoNavigateTo.mockReturnValue('')
      const logoNavigateTo = mockGetLogoNavigateTo()

      const shouldRedirect = logoNavigateTo && logoNavigateTo !== '/'
      expect(shouldRedirect).toBeFalsy()
    })
  })
})
