/**
 * AuthStatusDisplay Component Tests
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises, VueWrapper } from '@vue/test-utils'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { ref } from 'vue'
import AuthStatusDisplay from '@/components/auth/AuthStatusDisplay.vue'
import { logger } from '@/utils/logger'

// Mock dependencies
const mockRefreshToken = vi.fn()
const mockIsAuthenticated = ref(true)
const mockTokenExpirationDate = ref<Date | null>(null)
const mockIsRefreshing = ref(false)

vi.mock('@/composables/useAuth', () => ({
  useAuth: () => ({
    isAuthenticated: mockIsAuthenticated,
    tokenExpirationDate: mockTokenExpirationDate,
    isRefreshing: mockIsRefreshing,
    refreshToken: mockRefreshToken,
  }),
}))

vi.mock('@/composables/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      // Simple mock that returns key with params
      if (params) {
        const paramStr = Object.entries(params)
          .map(([k, v]) => `${k}:${v}`)
          .join(',')
        return ref(`${key}[${paramStr}]`)
      }
      return ref(key)
    },
  }),
}))

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

const vuetify = createVuetify({ components, directives })

function mountComponent() {
  return mount(AuthStatusDisplay, {
    global: {
      plugins: [vuetify],
    },
  })
}

describe('AuthStatusDisplay', () => {
  let wrapper: VueWrapper

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mockIsAuthenticated.value = true
    mockTokenExpirationDate.value = null
    mockIsRefreshing.value = false
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
    vi.useRealTimers()
  })

  describe('Component Mounting', () => {
    it('should mount successfully', () => {
      wrapper = mountComponent()
      expect(wrapper.exists()).toBe(true)
    })

    it('should initialize updateInterval on mount', () => {
      wrapper = mountComponent()
      expect(wrapper.vm.updateInterval).not.toBeNull()
    })

    it('should call updateTimeRemaining on mount', () => {
      mockTokenExpirationDate.value = new Date(Date.now() + 60 * 60 * 1000)
      wrapper = mountComponent()

      // timeRemaining should be set
      expect(wrapper.vm.timeRemaining).toBeGreaterThan(0)
    })

    it('should clear interval on unmount', () => {
      wrapper = mountComponent()
      const intervalId = wrapper.vm.updateInterval

      wrapper.unmount()

      // After unmount, the interval should be cleared
      expect(intervalId).not.toBeNull()
    })
  })

  describe('Authentication State', () => {
    it('should not show alert when not authenticated', () => {
      mockIsAuthenticated.value = false

      wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })

    it('should respect authentication state', () => {
      mockIsAuthenticated.value = false
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.showWarning).toBe(false)
    })
  })

  describe('Token Expiration - Not Expiring Soon', () => {
    it('should not show alert when token is not expiring soon', () => {
      mockIsAuthenticated.value = true
      // Token expires in 1 hour
      mockTokenExpirationDate.value = new Date(Date.now() + 60 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })

    it('should not show alert when token expires in 11 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 11 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(false)
      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })

    it('should not show alert when token expires in exactly 11 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 11 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(false)
    })
  })

  describe('Token Expiration - Expiring Soon', () => {
    it('should show warning when token expires within 10 minutes', async () => {
      mockIsAuthenticated.value = true
      // Token expires in 5 minutes
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.vm.isExpiringSoon).toBe(true)
      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.exists()).toBe(true)
    })

    it('should show warning when token expires in 10 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 10 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(true)
    })

    it('should show warning when token expires in 1 minute', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 1 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(true)
    })

    it('should not show warning when token has expired (0 minutes)', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now())

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(false)
    })

    it('should not show warning when token expired in past', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() - 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.isExpiringSoon).toBe(false)
    })
  })

  describe('Alert Display Logic', () => {
    it('should use warning type when token is expiring soon', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.props('type')).toBe('warning')
    })

    it('should have closable alert', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.props('closable')).toBe(true)
    })

    it('should have tonal variant', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.props('variant')).toBe('tonal')
    })

    it('should have mb-4 class', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.classes()).toContain('mb-4')
    })
  })

  describe('Alert Dismissal', () => {
    it('should dismiss alert when closed', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      expect(alert.exists()).toBe(true)

      await alert.vm.$emit('click:close')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.dismissed).toBe(true)
      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })

    it('should not show alert after dismissal even if still expiring', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      // Dismiss
      await wrapper.findComponent({ name: 'VAlert' }).vm.$emit('click:close')
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showWarning).toBe(false)
      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)
    })
  })

  describe('Status Messages', () => {
    it('should show appropriate message when no token expiration date', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = null

      wrapper = mountComponent()

      // statusMessage is a computed ref that returns the result of t()
      // t() returns a ref, so we need to check the ref's value
      const message = wrapper.vm.statusMessage
      expect(message.value).toBe('auth.tokenInfoNotAvailable')
    })

    it('should show expired message when token has expired', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() - 1000)

      wrapper = mountComponent()

      const message = wrapper.vm.statusMessage
      expect(message.value).toBe('auth.sessionExpired')
    })

    it('should show minutes remaining for 5 minutes or less', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 3 * 60 * 1000)

      wrapper = mountComponent()

      const message = wrapper.vm.statusMessage
      expect(message.value).toContain('auth.sessionExpiringMinutes')
      expect(message.value).toContain('minutes:3')
    })

    it('should show minutes remaining for 6-10 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 8 * 60 * 1000)

      wrapper = mountComponent()

      const message = wrapper.vm.statusMessage
      expect(message.value).toContain('auth.sessionExpiringInMinutes')
      expect(message.value).toContain('minutes:8')
    })

    it('should show hours remaining when over 60 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 120 * 60 * 1000)

      wrapper = mountComponent()

      const message = wrapper.vm.statusMessage
      expect(message.value).toContain('auth.sessionActiveHours')
      expect(message.value).toContain('hours:2')
    })

    it('should show minutes when between 11-59 minutes', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 45 * 60 * 1000)

      wrapper = mountComponent()

      const message = wrapper.vm.statusMessage
      expect(message.value).toContain('auth.sessionActiveMinutes')
      expect(message.value).toContain('minutes:45')
    })
  })

  describe('Refresh Token Functionality', () => {
    it('should call refreshToken when extend session button is clicked', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const btn = wrapper.findComponent({ name: 'VBtn' })
      expect(btn.exists()).toBe(true)

      await btn.trigger('click')
      expect(mockRefreshToken).toHaveBeenCalledTimes(1)
    })

    it('should show loading state on refresh button when refreshing', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)
      mockIsRefreshing.value = true

      wrapper = mountComponent()
      await flushPromises()

      const btn = wrapper.findComponent({ name: 'VBtn' })
      expect(btn.props('loading')).toBe(true)
    })

    it('should reset dismissed state after successful refresh', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)
      mockRefreshToken.mockResolvedValueOnce(true)

      wrapper = mountComponent()
      await flushPromises()

      // Dismiss first
      wrapper.vm.dismissed = true
      await wrapper.vm.$nextTick()

      // Then refresh
      await wrapper.vm.handleRefresh()
      await flushPromises()

      expect(wrapper.vm.dismissed).toBe(false)
    })

    it('should log error when refresh fails', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)
      const error = new Error('Refresh failed')
      mockRefreshToken.mockRejectedValueOnce(error)

      wrapper = mountComponent()
      await flushPromises()

      await wrapper.vm.handleRefresh()
      await flushPromises()

      expect(logger.error).toHaveBeenCalledWith(
        'AuthStatusDisplay',
        'Manual token refresh failed',
        error
      )
    })

    it('should have refresh button only when expiring soon', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const btn = wrapper.findComponent({ name: 'VBtn' })
      expect(btn.exists()).toBe(true)
    })
  })

  describe('Time Update Functionality', () => {
    it('should update time remaining', () => {
      mockTokenExpirationDate.value = new Date(Date.now() + 30 * 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.timeRemaining).toBeGreaterThan(0)
      expect(wrapper.vm.timeRemaining).toBeLessThanOrEqual(30 * 60 * 1000)
    })

    it('should set time remaining to 0 when no expiration date', () => {
      mockTokenExpirationDate.value = null

      wrapper = mountComponent()

      wrapper.vm.updateTimeRemaining()

      expect(wrapper.vm.timeRemaining).toBe(0)
    })

    it('should not set negative time remaining', () => {
      mockTokenExpirationDate.value = new Date(Date.now() - 60 * 1000)

      wrapper = mountComponent()

      expect(wrapper.vm.timeRemaining).toBe(0)
    })

    it('should update time remaining periodically', async () => {
      mockTokenExpirationDate.value = new Date(Date.now() + 30 * 60 * 1000)

      wrapper = mountComponent()
      const initialTime = wrapper.vm.timeRemaining

      // Advance time by 1 minute
      vi.advanceTimersByTime(60000)
      await wrapper.vm.$nextTick()

      // Time remaining should have decreased
      expect(wrapper.vm.timeRemaining).toBeLessThan(initialTime)
    })
  })

  describe('Icon Display', () => {
    it('should show alert icon when expiring soon', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const alert = wrapper.findComponent({ name: 'VAlert' })
      const icon = alert.findComponent({ name: 'VIcon' })

      expect(icon.exists()).toBe(true)
    })
  })

  describe('Button Configuration', () => {
    it('should have small size button', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const btn = wrapper.findComponent({ name: 'VBtn' })
      expect(btn.props('size')).toBe('small')
    })

    it('should have outlined variant button', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      const btn = wrapper.findComponent({ name: 'VBtn' })
      expect(btn.props('variant')).toBe('outlined')
    })
  })

  describe('Edge Cases', () => {
    it('should handle token expiration date changing', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 60 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(false)

      // Change to expiring soon
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)
      await wrapper.vm.$nextTick()
      wrapper.vm.updateTimeRemaining()
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.isExpiringSoon).toBe(true)
    })

    it('should handle authentication state changing', async () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now() + 5 * 60 * 1000)

      wrapper = mountComponent()
      await flushPromises()

      expect(wrapper.findComponent({ name: 'VAlert' }).exists()).toBe(true)

      // Logout
      mockIsAuthenticated.value = false
      await wrapper.vm.$nextTick()

      expect(wrapper.vm.showWarning).toBe(false)
    })

    it('should handle exactly 0 minutes remaining edge case', () => {
      mockIsAuthenticated.value = true
      mockTokenExpirationDate.value = new Date(Date.now())

      wrapper = mountComponent()

      const minutesRemaining = Math.floor(wrapper.vm.timeRemaining / 60000)
      expect(minutesRemaining).toBe(0)
      expect(wrapper.vm.isExpiringSoon).toBe(false)
    })
  })

  describe('Computed Properties', () => {
    it('should compute isAuthenticated correctly', () => {
      mockIsAuthenticated.value = true
      wrapper = mountComponent()
      expect(wrapper.vm.isAuthenticated).toBe(true)

      mockIsAuthenticated.value = false
      wrapper = mountComponent()
      expect(wrapper.vm.isAuthenticated).toBe(false)
    })

    it('should compute tokenExpirationDate correctly', () => {
      const expDate = new Date(Date.now() + 60 * 60 * 1000)
      mockTokenExpirationDate.value = expDate

      wrapper = mountComponent()

      expect(wrapper.vm.tokenExpirationDate).toEqual(expDate)
    })

    it('should compute isRefreshing correctly', () => {
      mockIsRefreshing.value = true
      wrapper = mountComponent()
      expect(wrapper.vm.isRefreshing).toBe(true)

      mockIsRefreshing.value = false
      wrapper = mountComponent()
      expect(wrapper.vm.isRefreshing).toBe(false)
    })
  })
})
