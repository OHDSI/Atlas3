/**
 * Message Types Tests
 * Tests for plugin messaging type guards and constants
 */
import { describe, it, expect } from 'vitest'
import {
  isHostMessage,
  isHostMessageResponse,
  DEFAULT_REQUEST_TIMEOUT,
  MAX_PAYLOAD_SIZE,
  MESSAGE_PRIORITY
} from '@/plugins/messaging/MessageTypes'

describe('MessageTypes', () => {
  describe('isHostMessage', () => {
    it('should return true for valid HostMessage', () => {
      const validMessage = {
        type: 'navigation:request',
        sourcePluginId: 'test-plugin',
        payload: { path: '/test' },
        timestamp: new Date()
      }

      expect(isHostMessage(validMessage)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isHostMessage(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isHostMessage(undefined)).toBe(false)
    })

    it('should return false for primitive', () => {
      expect(isHostMessage('string')).toBe(false)
      expect(isHostMessage(123)).toBe(false)
    })

    it('should return false when missing type', () => {
      const invalidMessage = {
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: new Date()
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when type is not string', () => {
      const invalidMessage = {
        type: 123,
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: new Date()
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when missing sourcePluginId', () => {
      const invalidMessage = {
        type: 'test',
        payload: {},
        timestamp: new Date()
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when sourcePluginId is not string', () => {
      const invalidMessage = {
        type: 'test',
        sourcePluginId: 123,
        payload: {},
        timestamp: new Date()
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when missing payload', () => {
      const invalidMessage = {
        type: 'test',
        sourcePluginId: 'test-plugin',
        timestamp: new Date()
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when missing timestamp', () => {
      const invalidMessage = {
        type: 'test',
        sourcePluginId: 'test-plugin',
        payload: {}
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })

    it('should return false when timestamp is not Date', () => {
      const invalidMessage = {
        type: 'test',
        sourcePluginId: 'test-plugin',
        payload: {},
        timestamp: '2024-01-01'
      }

      expect(isHostMessage(invalidMessage)).toBe(false)
    })
  })

  describe('isHostMessageResponse', () => {
    it('should return true for valid HostMessageResponse', () => {
      const validResponse = {
        callbackId: 'callback-123',
        success: true,
        data: { result: 'ok' },
        timestamp: new Date()
      }

      expect(isHostMessageResponse(validResponse)).toBe(true)
    })

    it('should return true for error response', () => {
      const errorResponse = {
        callbackId: 'callback-123',
        success: false,
        error: { code: 'ERR001', message: 'Error occurred' },
        timestamp: new Date()
      }

      expect(isHostMessageResponse(errorResponse)).toBe(true)
    })

    it('should return false for null', () => {
      expect(isHostMessageResponse(null)).toBe(false)
    })

    it('should return false for undefined', () => {
      expect(isHostMessageResponse(undefined)).toBe(false)
    })

    it('should return false when missing callbackId', () => {
      const invalidResponse = {
        success: true,
        timestamp: new Date()
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })

    it('should return false when callbackId is not string', () => {
      const invalidResponse = {
        callbackId: 123,
        success: true,
        timestamp: new Date()
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })

    it('should return false when missing success', () => {
      const invalidResponse = {
        callbackId: 'callback-123',
        timestamp: new Date()
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })

    it('should return false when success is not boolean', () => {
      const invalidResponse = {
        callbackId: 'callback-123',
        success: 'yes',
        timestamp: new Date()
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })

    it('should return false when missing timestamp', () => {
      const invalidResponse = {
        callbackId: 'callback-123',
        success: true
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })

    it('should return false when timestamp is not Date', () => {
      const invalidResponse = {
        callbackId: 'callback-123',
        success: true,
        timestamp: Date.now()
      }

      expect(isHostMessageResponse(invalidResponse)).toBe(false)
    })
  })

  describe('Constants', () => {
    it('should have DEFAULT_REQUEST_TIMEOUT of 5000ms', () => {
      expect(DEFAULT_REQUEST_TIMEOUT).toBe(5000)
    })

    it('should have MAX_PAYLOAD_SIZE of 1MB', () => {
      expect(MAX_PAYLOAD_SIZE).toBe(1024 * 1024)
    })

    it('should have MESSAGE_PRIORITY levels', () => {
      expect(MESSAGE_PRIORITY.LOW).toBe(0)
      expect(MESSAGE_PRIORITY.NORMAL).toBe(50)
      expect(MESSAGE_PRIORITY.HIGH).toBe(100)
      expect(MESSAGE_PRIORITY.CRITICAL).toBe(200)
    })
  })
})
