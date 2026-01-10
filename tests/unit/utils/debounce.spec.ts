/**
 * Unit Tests: Debounce and Throttle Utilities
 * Tests for src/utils/debounce.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { debounce, throttle } from '@/utils/debounce'

describe('Debounce and Throttle Utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('debounce', () => {
    it('should delay execution until after wait time', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 200)

      debouncedFunc('test')
      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(199)
      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      expect(func).toHaveBeenCalledTimes(1)
      expect(func).toHaveBeenCalledWith('test')
    })

    it('should cancel previous pending calls when called again', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 200)

      debouncedFunc('first')
      vi.advanceTimersByTime(100)

      debouncedFunc('second')
      vi.advanceTimersByTime(100)

      debouncedFunc('third')
      vi.advanceTimersByTime(200)

      // Should only execute once with the last argument
      expect(func).toHaveBeenCalledTimes(1)
      expect(func).toHaveBeenCalledWith('third')
    })

    it('should support cancel method to prevent execution', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 200)

      debouncedFunc('test')
      vi.advanceTimersByTime(100)

      debouncedFunc.cancel()
      vi.advanceTimersByTime(200)

      expect(func).not.toHaveBeenCalled()
    })

    it('should preserve this context', () => {
      const context = { value: 42 }
      let capturedContext: unknown = null
      const func = vi.fn(function (this: { value: number }) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        capturedContext = this
        return this.value
      })
      const debouncedFunc = debounce(func, 200)

      debouncedFunc.call(context)
      vi.advanceTimersByTime(200)

      expect(func).toHaveBeenCalledTimes(1)
      expect(capturedContext).toBe(context)
    })

    it('should preserve multiple arguments', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 200)

      debouncedFunc('arg1', 'arg2', 'arg3')
      vi.advanceTimersByTime(200)

      expect(func).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')
    })

    it('should handle multiple calls after debounce period', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc('first')
      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)

      debouncedFunc('second')
      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(2)

      expect(func).toHaveBeenNthCalledWith(1, 'first')
      expect(func).toHaveBeenNthCalledWith(2, 'second')
    })

    it('should handle cancel on non-pending debounce', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc.cancel() // Should not throw
      expect(func).not.toHaveBeenCalled()

      debouncedFunc('test')
      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)

      debouncedFunc.cancel() // Should not throw after execution
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should work with zero wait time', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 0)

      debouncedFunc('test')
      expect(func).not.toHaveBeenCalled()

      vi.advanceTimersByTime(0)
      expect(func).toHaveBeenCalledTimes(1)
    })
  })

  describe('throttle', () => {
    it('should execute immediately on first call', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 200)

      throttledFunc('first')
      expect(func).toHaveBeenCalledTimes(1)
      expect(func).toHaveBeenCalledWith('first')
    })

    it('should limit subsequent calls within throttle period', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 200)

      // First call executes immediately
      throttledFunc('first')
      expect(func).toHaveBeenCalledTimes(1)

      // Calls within throttle period are queued
      vi.advanceTimersByTime(50)
      throttledFunc('second')
      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(50)
      throttledFunc('third')
      expect(func).toHaveBeenCalledTimes(1)

      // After throttle period, queued call executes
      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(2)
      expect(func).toHaveBeenNthCalledWith(2, 'third')
    })

    it('should execute at most once per limit period', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc('call1')
      expect(func).toHaveBeenCalledTimes(1)

      // Multiple calls within period
      vi.advanceTimersByTime(50)
      throttledFunc('call2')
      throttledFunc('call3')
      throttledFunc('call4')
      expect(func).toHaveBeenCalledTimes(1)

      // After period, last queued call executes
      vi.advanceTimersByTime(50)
      expect(func).toHaveBeenCalledTimes(2)
      expect(func).toHaveBeenNthCalledWith(2, 'call4')
    })

    it('should support cancel method', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 200)

      throttledFunc('first')
      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(50)
      throttledFunc('second')

      throttledFunc.cancel()
      vi.advanceTimersByTime(200)

      // Should not execute the queued call
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('should preserve this context', () => {
      const context = { value: 42 }
      const capturedContexts: unknown[] = []
      const func = vi.fn(function (this: { value: number }) {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        capturedContexts.push(this)
        return this.value
      })
      const throttledFunc = throttle(func, 200)

      throttledFunc.call(context)
      expect(func).toHaveBeenCalledTimes(1)
      expect(capturedContexts[0]).toBe(context)

      // Test queued call preserves context
      throttledFunc.call(context, 'arg')
      vi.advanceTimersByTime(200)
      expect(func).toHaveBeenCalledTimes(2)
      expect(capturedContexts[1]).toBe(context)
    })

    it('should preserve multiple arguments', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 200)

      throttledFunc('arg1', 'arg2', 'arg3')
      expect(func).toHaveBeenCalledWith('arg1', 'arg2', 'arg3')

      throttledFunc('arg4', 'arg5', 'arg6')
      vi.advanceTimersByTime(200)
      expect(func).toHaveBeenNthCalledWith(2, 'arg4', 'arg5', 'arg6')
    })

    it('should allow calls after throttle period expires', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc('first')
      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)

      throttledFunc('second')
      expect(func).toHaveBeenCalledTimes(2)

      vi.advanceTimersByTime(100)

      throttledFunc('third')
      expect(func).toHaveBeenCalledTimes(3)
    })

    it('should handle cancel on non-pending throttle', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc.cancel() // Should not throw before any calls

      throttledFunc('test')
      expect(func).toHaveBeenCalledTimes(1)

      vi.advanceTimersByTime(100)
      throttledFunc.cancel() // Should not throw after throttle period
    })

    it('should handle continuous rapid calls correctly', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      // Simulate continuous rapid calls
      for (let i = 0; i < 10; i++) {
        throttledFunc(`call${i}`)
        vi.advanceTimersByTime(10)
      }

      // First call executes immediately
      // After 100ms, last queued call executes
      expect(func).toHaveBeenCalledTimes(2)
      expect(func).toHaveBeenNthCalledWith(1, 'call0')
      expect(func).toHaveBeenNthCalledWith(2, 'call9')
    })

    it('should work with zero limit time', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 0)

      throttledFunc('first')
      expect(func).toHaveBeenCalledTimes(1)

      throttledFunc('second')
      vi.advanceTimersByTime(0)
      expect(func).toHaveBeenCalledTimes(2)
    })
  })

  describe('edge cases', () => {
    it('debounce should handle function with no arguments', () => {
      const func = vi.fn()
      const debouncedFunc = debounce(func, 100)

      debouncedFunc()
      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('throttle should handle function with no arguments', () => {
      const func = vi.fn()
      const throttledFunc = throttle(func, 100)

      throttledFunc()
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('debounce should handle functions that return values', () => {
      const func = vi.fn(() => 'result')
      const debouncedFunc = debounce(func, 100)

      // Note: debounced functions don't return values since execution is delayed
      const result = debouncedFunc()
      expect(result).toBeUndefined()

      vi.advanceTimersByTime(100)
      expect(func).toHaveBeenCalledTimes(1)
    })

    it('throttle should handle functions that return values', () => {
      const func = vi.fn(() => 'result')
      const throttledFunc = throttle(func, 100)

      // Note: throttled functions don't return values to maintain consistent interface
      const result = throttledFunc()
      expect(result).toBeUndefined()

      expect(func).toHaveBeenCalledTimes(1)
    })
  })
})
