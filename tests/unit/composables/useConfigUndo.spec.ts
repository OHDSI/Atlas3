/**
 * Configuration Undo Composable Tests (T098)
 * Tests for undo functionality with TTL expiration
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useConfigUndo } from '@/composables/useConfigUndo'

describe('useConfigUndo', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // Mock crypto.randomUUID for predictable IDs
    vi.stubGlobal('crypto', {
      randomUUID: () => `test-uuid-${Date.now()}`
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  describe('pushUndo', () => {
    it('should add operation to undo stack', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      pushUndo('vocabularySchema', 'old_value', 'new_value')

      expect(undoStack.value).toHaveLength(1)
      expect(undoStack.value[0]).toMatchObject({
        field: 'vocabularySchema',
        previousValue: 'old_value',
        newValue: 'new_value'
      })
      expect(undoStack.value[0].id).toBeTruthy()
      expect(undoStack.value[0].timestamp).toBeTypeOf('number')
    })

    it('should add operations to the front of the stack (LIFO)', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      pushUndo('field1', 'old1', 'new1')
      vi.advanceTimersByTime(100)
      pushUndo('field2', 'old2', 'new2')
      vi.advanceTimersByTime(100)
      pushUndo('field3', 'old3', 'new3')

      expect(undoStack.value).toHaveLength(3)
      expect(undoStack.value[0].field).toBe('field3') // Most recent
      expect(undoStack.value[1].field).toBe('field2')
      expect(undoStack.value[2].field).toBe('field1') // Oldest
    })

    it('should maintain maximum of 5 operations', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      // Add 6 operations
      for (let i = 1; i <= 6; i++) {
        pushUndo(`field${i}`, `old${i}`, `new${i}`)
        vi.advanceTimersByTime(10)
      }

      expect(undoStack.value).toHaveLength(5)
      // Oldest operation (field1) should be removed
      expect(undoStack.value.find(op => op.field === 'field1')).toBeUndefined()
      // Most recent 5 should remain
      expect(undoStack.value[0].field).toBe('field6')
      expect(undoStack.value[4].field).toBe('field2')
    })

    it('should handle different value types', () => {
      const { undoStack: stringStack, pushUndo: pushStringUndo } = useConfigUndo<string>()
      pushStringUndo('stringField', 'old', 'new')
      expect(stringStack.value[0].previousValue).toBe('old')

      const { undoStack: numberStack, pushUndo: pushNumberUndo } = useConfigUndo<number>()
      pushNumberUndo('numberField', 10, 20)
      expect(numberStack.value[0].previousValue).toBe(10)

      const { undoStack: objectStack, pushUndo: pushObjectUndo } = useConfigUndo<{name: string}>()
      pushObjectUndo('objectField', { name: 'old' }, { name: 'new' })
      expect(objectStack.value[0].previousValue).toEqual({ name: 'old' })
    })
  })

  describe('TTL Expiration', () => {
    it('should remove operation after 30 seconds TTL', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      pushUndo('field1', 'old', 'new')
      expect(undoStack.value).toHaveLength(1)

      // Advance time by 29 seconds (should still be there)
      vi.advanceTimersByTime(29000)
      expect(undoStack.value).toHaveLength(1)

      // Advance by 1 more second (30 total, should expire)
      vi.advanceTimersByTime(1000)
      expect(undoStack.value).toHaveLength(0)
    })

    it('should expire multiple operations independently', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      pushUndo('field1', 'old1', 'new1')
      vi.advanceTimersByTime(10000) // 10s later
      pushUndo('field2', 'old2', 'new2')
      vi.advanceTimersByTime(10000) // 20s total, 10s for field2
      pushUndo('field3', 'old3', 'new3')

      expect(undoStack.value).toHaveLength(3)

      // Advance 11 seconds (field1 expires at 30s total)
      vi.advanceTimersByTime(11000) // 31s total
      expect(undoStack.value).toHaveLength(2)
      expect(undoStack.value.find(op => op.field === 'field1')).toBeUndefined()

      // Advance 10 more seconds (field2 expires at 40s total)
      vi.advanceTimersByTime(10000) // 41s total
      expect(undoStack.value).toHaveLength(1)
      expect(undoStack.value[0].field).toBe('field3')

      // Advance 10 more seconds (field3 expires at 50s total)
      vi.advanceTimersByTime(10000) // 51s total
      expect(undoStack.value).toHaveLength(0)
    })
  })

  describe('removeOperation', () => {
    it('should remove operation by ID', () => {
      const { undoStack, pushUndo, removeOperation } = useConfigUndo<string>()

      pushUndo('field1', 'old1', 'new1')
      vi.advanceTimersByTime(10)
      pushUndo('field2', 'old2', 'new2')
      vi.advanceTimersByTime(10)
      pushUndo('field3', 'old3', 'new3')

      const idToRemove = undoStack.value[1].id // field2

      removeOperation(idToRemove)

      expect(undoStack.value).toHaveLength(2)
      expect(undoStack.value.find(op => op.id === idToRemove)).toBeUndefined()
      expect(undoStack.value[0].field).toBe('field3')
      expect(undoStack.value[1].field).toBe('field1')
    })

    it('should do nothing if operation not found', () => {
      const { undoStack, pushUndo, removeOperation } = useConfigUndo<string>()

      pushUndo('field1', 'old1', 'new1')
      const originalLength = undoStack.value.length

      removeOperation('non-existent-id')

      expect(undoStack.value).toHaveLength(originalLength)
    })
  })

  describe('performUndo', () => {
    it('should call revert function with previous value and remove operation', async () => {
      const { undoStack, pushUndo, performUndo } = useConfigUndo<string>()
      const revertFn = vi.fn().mockResolvedValue(undefined)

      pushUndo('vocabularySchema', 'old_schema', 'new_schema')
      const operationId = undoStack.value[0].id

      await performUndo(operationId, revertFn)

      expect(revertFn).toHaveBeenCalledWith('old_schema')
      expect(undoStack.value).toHaveLength(0)
    })

    it('should handle multiple undos sequentially', async () => {
      const { undoStack, pushUndo, performUndo } = useConfigUndo<string>()
      const revertFn = vi.fn().mockResolvedValue(undefined)

      pushUndo('field1', 'old1', 'new1')
      pushUndo('field2', 'old2', 'new2')
      pushUndo('field3', 'old3', 'new3')

      // Undo most recent (field3)
      await performUndo(undoStack.value[0].id, revertFn)
      expect(revertFn).toHaveBeenLastCalledWith('old3')
      expect(undoStack.value).toHaveLength(2)

      // Undo next (field2)
      await performUndo(undoStack.value[0].id, revertFn)
      expect(revertFn).toHaveBeenLastCalledWith('old2')
      expect(undoStack.value).toHaveLength(1)

      // Undo last (field1)
      await performUndo(undoStack.value[0].id, revertFn)
      expect(revertFn).toHaveBeenLastCalledWith('old1')
      expect(undoStack.value).toHaveLength(0)

      expect(revertFn).toHaveBeenCalledTimes(3)
    })

    it('should do nothing if operation not found', async () => {
      const { pushUndo, performUndo } = useConfigUndo<string>()
      const revertFn = vi.fn().mockResolvedValue(undefined)

      pushUndo('field1', 'old1', 'new1')

      // Try to undo non-existent operation
      await performUndo('non-existent-id', revertFn)

      expect(revertFn).not.toHaveBeenCalled()
    })

    it('should throw error if revert function fails', async () => {
      const { undoStack, pushUndo, performUndo } = useConfigUndo<string>()
      const errorMessage = 'Revert failed'
      const revertFn = vi.fn().mockRejectedValue(new Error(errorMessage))

      pushUndo('field1', 'old1', 'new1')
      const operationId = undoStack.value[0].id

      await expect(performUndo(operationId, revertFn)).rejects.toThrow(errorMessage)

      // Operation should NOT be removed on failure
      expect(undoStack.value).toHaveLength(1)
    })

    it('should work with complex object types', async () => {
      interface TagGroup {
        id: number
        name: string
        color?: string
      }

      const { undoStack, pushUndo, performUndo } = useConfigUndo<TagGroup>()
      const revertFn = vi.fn().mockResolvedValue(undefined)

      const oldValue: TagGroup = { id: 1, name: 'Old Name', color: '#FF0000' }
      const newValue: TagGroup = { id: 1, name: 'New Name', color: '#00FF00' }

      pushUndo('tagGroup', oldValue, newValue)

      await performUndo(undoStack.value[0].id, revertFn)

      expect(revertFn).toHaveBeenCalledWith(oldValue)
      expect(undoStack.value).toHaveLength(0)
    })
  })

  describe('clearUndoStack', () => {
    it('should clear all operations', () => {
      const { undoStack, pushUndo, clearUndoStack } = useConfigUndo<string>()

      pushUndo('field1', 'old1', 'new1')
      pushUndo('field2', 'old2', 'new2')
      pushUndo('field3', 'old3', 'new3')

      expect(undoStack.value).toHaveLength(3)

      clearUndoStack()

      expect(undoStack.value).toHaveLength(0)
    })

    it('should not throw on empty stack', () => {
      const { clearUndoStack } = useConfigUndo<string>()

      expect(() => clearUndoStack()).not.toThrow()
    })
  })

  describe('isSaving State', () => {
    it('should expose isSaving ref', () => {
      const { isSaving } = useConfigUndo<string>()

      expect(isSaving.value).toBe(false)

      isSaving.value = true
      expect(isSaving.value).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle rapid consecutive pushes', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      // Push 10 operations rapidly (should only keep last 5)
      for (let i = 0; i < 10; i++) {
        pushUndo(`field${i}`, `old${i}`, `new${i}`)
      }

      expect(undoStack.value).toHaveLength(5)
      expect(undoStack.value[0].field).toBe('field9')
      expect(undoStack.value[4].field).toBe('field5')
    })

    it('should handle undo of expired operation gracefully', async () => {
      const { undoStack, pushUndo, performUndo } = useConfigUndo<string>()
      const revertFn = vi.fn().mockResolvedValue(undefined)

      pushUndo('field1', 'old1', 'new1')
      const operationId = undoStack.value[0].id

      // Expire the operation
      vi.advanceTimersByTime(31000)
      expect(undoStack.value).toHaveLength(0)

      // Try to undo expired operation
      await performUndo(operationId, revertFn)

      // Should not call revert function
      expect(revertFn).not.toHaveBeenCalled()
    })

    it('should handle same value push (no actual change)', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      pushUndo('field1', 'same_value', 'same_value')

      expect(undoStack.value).toHaveLength(1)
      expect(undoStack.value[0].previousValue).toBe('same_value')
      expect(undoStack.value[0].newValue).toBe('same_value')
    })

    it('should handle null and undefined values', () => {
      const { undoStack, pushUndo } = useConfigUndo<string | null | undefined>()

      pushUndo('field1', null, 'new_value')
      expect(undoStack.value[0].previousValue).toBeNull()

      pushUndo('field2', undefined, 'new_value')
      expect(undoStack.value[0].previousValue).toBeUndefined()

      pushUndo('field3', 'old_value', null)
      expect(undoStack.value[0].newValue).toBeNull()
    })
  })

  describe('Memory Management', () => {
    it('should prevent memory leaks by limiting stack size', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      // Create large value to test memory
      const largeValue = 'x'.repeat(1000)

      // Push 100 operations (should only keep 5)
      for (let i = 0; i < 100; i++) {
        pushUndo(`field${i}`, largeValue, largeValue)
      }

      expect(undoStack.value).toHaveLength(5)
    })

    it('should clean up expired operations to free memory', () => {
      const { undoStack, pushUndo } = useConfigUndo<string>()

      // Push 5 operations
      for (let i = 0; i < 5; i++) {
        pushUndo(`field${i}`, `old${i}`, `new${i}`)
        vi.advanceTimersByTime(1000) // 1s between each
      }

      expect(undoStack.value).toHaveLength(5)

      // Advance past all TTLs
      vi.advanceTimersByTime(30000)

      expect(undoStack.value).toHaveLength(0)
    })
  })
})
