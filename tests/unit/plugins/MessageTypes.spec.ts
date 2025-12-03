/**
 * Unit Tests: Plugin Message Types
 * Tests for src/plugins/messaging/MessageTypes.ts
 */

import { describe, it, expect } from 'vitest'
import {
  isHostMessage,
  isHostMessageResponse,
  DEFAULT_REQUEST_TIMEOUT,
  MAX_PAYLOAD_SIZE,
  MESSAGE_PRIORITY,
  type HostMessage,
  type HostMessageResponse,
} from '@/plugins/messaging/MessageTypes'

describe('MessageTypes', () => {
  describe('Constants', () => {
    it('has correct default request timeout', () => {
      expect(DEFAULT_REQUEST_TIMEOUT).toBe(5000)
    })

    it('has correct max payload size (1MB)', () => {
      expect(MAX_PAYLOAD_SIZE).toBe(1024 * 1024)
    })

    it('has correct message priorities', () => {
      expect(MESSAGE_PRIORITY.LOW).toBe(0)
      expect(MESSAGE_PRIORITY.NORMAL).toBe(50)
      expect(MESSAGE_PRIORITY.HIGH).toBe(100)
      expect(MESSAGE_PRIORITY.CRITICAL).toBe(200)
    })
  })

  describe('isHostMessage', () => {
    it('returns true for valid HostMessage', () => {
      const validMessage: HostMessage = {
        type: 'navigation:request',
        sourcePluginId: 'test-plugin',
        payload: { path: '/home' },
        timestamp: new Date(),
      }

      expect(isHostMessage(validMessage)).toBe(true)
    })

    it('returns true for message with optional fields', () => {
      const validMessage: HostMessage = {
        type: 'custom',
        sourcePluginId: 'test-plugin',
        payload: { data: 'test' },
        timestamp: new Date(),
        callbackId: 'cb-123',
        correlationId: 'corr-456',
        priority: MESSAGE_PRIORITY.HIGH,
      }

      expect(isHostMessage(validMessage)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isHostMessage(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isHostMessage(undefined)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isHostMessage('string')).toBe(false)
      expect(isHostMessage(123)).toBe(false)
      expect(isHostMessage([])).toBe(false)
    })

    it('returns false when type is missing', () => {
      const invalid = {
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when type is not a string', () => {
      const invalid = {
        type: 123,
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when sourcePluginId is missing', () => {
      const invalid = {
        type: 'navigation:request',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when sourcePluginId is not a string', () => {
      const invalid = {
        type: 'navigation:request',
        sourcePluginId: 123,
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when payload is missing', () => {
      const invalid = {
        type: 'navigation:request',
        sourcePluginId: 'test-plugin',
        timestamp: new Date(),
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when timestamp is missing', () => {
      const invalid = {
        type: 'navigation:request',
        sourcePluginId: 'test-plugin',
        payload: {},
      }

      expect(isHostMessage(invalid)).toBe(false)
    })

    it('returns false when timestamp is not a Date', () => {
      const invalid = {
        type: 'navigation:request',
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: '2024-01-01',
      }

      expect(isHostMessage(invalid)).toBe(false)
    })
  })

  describe('isHostMessageResponse', () => {
    it('returns true for valid success response', () => {
      const validResponse: HostMessageResponse = {
        callbackId: 'cb-123',
        success: true,
        data: { result: 'success' },
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(validResponse)).toBe(true)
    })

    it('returns true for valid error response', () => {
      const validResponse: HostMessageResponse = {
        callbackId: 'cb-123',
        success: false,
        error: {
          code: 'ERR_001',
          message: 'Something went wrong',
        },
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(validResponse)).toBe(true)
    })

    it('returns false for null', () => {
      expect(isHostMessageResponse(null)).toBe(false)
    })

    it('returns false for undefined', () => {
      expect(isHostMessageResponse(undefined)).toBe(false)
    })

    it('returns false for non-object', () => {
      expect(isHostMessageResponse('string')).toBe(false)
      expect(isHostMessageResponse(123)).toBe(false)
    })

    it('returns false when callbackId is missing', () => {
      const invalid = {
        success: true,
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })

    it('returns false when callbackId is not a string', () => {
      const invalid = {
        callbackId: 123,
        success: true,
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })

    it('returns false when success is missing', () => {
      const invalid = {
        callbackId: 'cb-123',
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })

    it('returns false when success is not a boolean', () => {
      const invalid = {
        callbackId: 'cb-123',
        success: 'true',
        timestamp: new Date(),
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })

    it('returns false when timestamp is missing', () => {
      const invalid = {
        callbackId: 'cb-123',
        success: true,
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })

    it('returns false when timestamp is not a Date', () => {
      const invalid = {
        callbackId: 'cb-123',
        success: true,
        timestamp: 'invalid-date',
      }

      expect(isHostMessageResponse(invalid)).toBe(false)
    })
  })

  describe('Message Type Values', () => {
    it('supports navigation message types', () => {
      const navRequest: HostMessage = {
        type: 'navigation:request',
        sourcePluginId: 'plugin-1',
        payload: { path: '/home' },
        timestamp: new Date(),
      }

      const navBack: HostMessage = {
        type: 'navigation:back',
        sourcePluginId: 'plugin-1',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(navRequest)).toBe(true)
      expect(isHostMessage(navBack)).toBe(true)
    })

    it('supports auth message types', () => {
      const authRefresh: HostMessage = {
        type: 'auth:refresh',
        sourcePluginId: 'plugin-1',
        payload: {},
        timestamp: new Date(),
      }

      const authCheck: HostMessage = {
        type: 'auth:check',
        sourcePluginId: 'plugin-1',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(authRefresh)).toBe(true)
      expect(isHostMessage(authCheck)).toBe(true)
    })

    it('supports notification message types', () => {
      const showNotification: HostMessage = {
        type: 'notification:show',
        sourcePluginId: 'plugin-1',
        payload: {
          message: 'Test notification',
          type: 'info',
        },
        timestamp: new Date(),
      }

      expect(isHostMessage(showNotification)).toBe(true)
    })

    it('supports data message types', () => {
      const dataRequest: HostMessage = {
        type: 'data:request',
        sourcePluginId: 'plugin-1',
        payload: { resource: 'cohorts' },
        timestamp: new Date(),
      }

      const dataUpdate: HostMessage = {
        type: 'data:update',
        sourcePluginId: 'plugin-1',
        payload: { resource: 'cohorts', id: 1, operation: 'update' },
        timestamp: new Date(),
      }

      expect(isHostMessage(dataRequest)).toBe(true)
      expect(isHostMessage(dataUpdate)).toBe(true)
    })

    it('supports state message types', () => {
      const stateGet: HostMessage = {
        type: 'state:get',
        sourcePluginId: 'plugin-1',
        payload: { key: 'theme' },
        timestamp: new Date(),
      }

      const stateSet: HostMessage = {
        type: 'state:set',
        sourcePluginId: 'plugin-1',
        payload: { key: 'theme', value: 'dark' },
        timestamp: new Date(),
      }

      expect(isHostMessage(stateGet)).toBe(true)
      expect(isHostMessage(stateSet)).toBe(true)
    })

    it('supports error and custom message types', () => {
      const errorReport: HostMessage = {
        type: 'error:report',
        sourcePluginId: 'plugin-1',
        payload: {
          message: 'Error occurred',
          severity: 'high',
          recoverable: true,
        },
        timestamp: new Date(),
      }

      const customMessage: HostMessage = {
        type: 'custom',
        sourcePluginId: 'plugin-1',
        payload: { custom: 'data' },
        timestamp: new Date(),
      }

      const pluginReady: HostMessage = {
        type: 'plugin:ready',
        sourcePluginId: 'plugin-1',
        payload: {},
        timestamp: new Date(),
      }

      expect(isHostMessage(errorReport)).toBe(true)
      expect(isHostMessage(customMessage)).toBe(true)
      expect(isHostMessage(pluginReady)).toBe(true)
    })
  })
})
