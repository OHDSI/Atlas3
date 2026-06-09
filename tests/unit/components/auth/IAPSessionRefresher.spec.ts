/**
 * IAPSessionRefresher Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, VueWrapper } from '@vue/test-utils'
import IAPSessionRefresher from '@/components/auth/IAPSessionRefresher.vue'

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock getAppConfig
const mockEnableIAPSession = vi.fn(() => false)
vi.mock('@/config/app-config.loader', () => ({
  getAppConfig: () => ({
    get enableIAPSession() {
      return mockEnableIAPSession()
    },
  }),
}))

describe('IAPSessionRefresher', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  describe('Component Mounting', () => {
    it('should not render iframe when IAP is disabled', () => {
      // Set IAP disabled
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      const iframe = wrapper.find('iframe')
      expect(iframe.exists()).toBe(false)
    })

    it('should render iframe when IAP is enabled', () => {
      // Set IAP enabled
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      const iframe = wrapper.find('iframe')
      expect(iframe.exists()).toBe(true)
    })

    it('should set correct iframe src for IAP session refresher', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      const iframe = wrapper.find('iframe')
      expect(iframe.attributes('src')).toBe('/_gcp_iap/session_refresher')
    })

    it('should have display:none style on iframe', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      const iframe = wrapper.find('iframe')
      expect(iframe.attributes('style')).toContain('display: none')
    })
  })

  describe('IAP Detection', () => {
    it('should detect IAP from environment variable', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.isIAPEnabled).toBe(true)
    })

    it('should return false when IAP env var is not set', () => {
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.isIAPEnabled).toBe(false)
    })

    it('should return false when IAP env var is explicitly false', () => {
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.isIAPEnabled).toBe(false)
    })
  })

  describe('Iframe Load Handler', () => {
    it('should handle iframe load event', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      const { logger } = await import('@/utils/logger')

      wrapper = mount(IAPSessionRefresher)

      const iframe = wrapper.find('iframe')
      await iframe.trigger('load')

      expect(logger.debug).toHaveBeenCalledWith(
        'IAP',
        'Session refresher iframe loaded'
      )
    })
  })

  describe('Session Refresh Scheduling', () => {
    it('should schedule refresh when IAP is enabled', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      // Check that interval was set
      expect(wrapper.vm.refreshInterval).not.toBeNull()
    })

    it('should not schedule refresh when IAP is disabled', () => {
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      // Check that interval was not set
      expect(wrapper.vm.refreshInterval).toBeNull()
    })

    it('should refresh every 45 minutes', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      const { logger } = await import('@/utils/logger')

      wrapper = mount(IAPSessionRefresher)

      // Fast-forward 45 minutes
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)

      expect(logger.debug).toHaveBeenCalledWith('IAP', 'Refreshing IAP session')
    })

    it('should refresh iframe by resetting src', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      const { logger } = await import('@/utils/logger')

      wrapper = mount(IAPSessionRefresher)

      // Fast-forward 45 minutes to trigger refresh
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)

      // Should log refresh
      expect(logger.debug).toHaveBeenCalledWith('IAP', 'Refreshing IAP session')

      // Fast-forward the 100ms delay
      await vi.advanceTimersByTimeAsync(100)
      await wrapper.vm.$nextTick()

      // Iframe src should end with the IAP session refresher path
      const iframe = wrapper.find('iframe')
      expect(iframe.element.src).toContain('/_gcp_iap/session_refresher')
    })

    it('should handle multiple refresh cycles', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      const { logger } = await import('@/utils/logger')

      wrapper = mount(IAPSessionRefresher)

      // First refresh
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)
      expect(logger.debug).toHaveBeenCalledWith('IAP', 'Refreshing IAP session')

      // Clear mock calls
      vi.clearAllMocks()

      // Second refresh
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)
      expect(logger.debug).toHaveBeenCalledWith('IAP', 'Refreshing IAP session')
    })
  })

  describe('Lifecycle Hooks', () => {
    it('should clear interval on unmount', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      const intervalId = wrapper.vm.refreshInterval

      wrapper.unmount()

      // Verify no timers remain
      expect(vi.getTimerCount()).toBe(0)
      expect(intervalId).not.toBeNull()
    })

    it('should not crash on unmount when interval is not set', () => {
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      expect(() => wrapper.unmount()).not.toThrow()
    })

    it('should set up refresh on mount when IAP is enabled', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.refreshInterval).not.toBeNull()
      expect(vi.getTimerCount()).toBeGreaterThan(0)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing iframe ref during refresh', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      // Manually set iframe ref to null
      wrapper.vm.iapFrame = null

      // Fast-forward to trigger refresh
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)

      // Should not throw error
      expect(wrapper.exists()).toBe(true)
    })

    it('should restore src even if iframe is removed during delay', async () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      // Fast-forward to start refresh
      await vi.advanceTimersByTimeAsync(45 * 60 * 1000)

      // Remove iframe ref during the 100ms delay
      wrapper.vm.iapFrame = null

      // Fast-forward the delay
      await vi.advanceTimersByTimeAsync(100)

      // Should not throw error
      expect(wrapper.exists()).toBe(true)
    })
  })

  describe('AppConfig Integration', () => {
    it('should be enabled when enableIAPSession is true', () => {
      mockEnableIAPSession.mockReturnValue(true)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.isIAPEnabled).toBe(true)
    })

    it('should be disabled when enableIAPSession is false', () => {
      mockEnableIAPSession.mockReturnValue(false)

      wrapper = mount(IAPSessionRefresher)

      expect(wrapper.vm.isIAPEnabled).toBe(false)
    })
  })
})
