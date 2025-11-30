/**
 * Configuration Undo Composable
 *
 * Provides undo functionality for configuration changes with automatic expiration.
 * Maintains a stack of recent operations that can be undone within a time window.
 */

import { ref, type Ref } from 'vue'
import { logger } from '@/utils/logger'

const UNDO_TTL = 30000 // 30 seconds
const MAX_UNDO_OPERATIONS = 5

/**
 * Represents a single undoable operation
 */
export interface UndoOperation<T = unknown> {
  id: string
  timestamp: number
  previousValue: T
  newValue: T
  field: string
}

/**
 * Composable for managing undo operations in configuration
 *
 * @template T - The type of value being managed
 * @returns Undo management functions and state
 */
export function useConfigUndo<T = unknown>() {
  const undoStack: Ref<UndoOperation<T>[]> = ref([])
  const isSaving = ref(false)

  /**
   * Pushes a new operation onto the undo stack
   *
   * @param field - The field that was changed
   * @param previous - The previous value before the change
   * @param current - The new value after the change
   */
  function pushUndo(field: string, previous: T, current: T): void {
    const operation: UndoOperation<T> = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      previousValue: previous,
      newValue: current,
      field
    }

    undoStack.value.unshift(operation)

    // Maintain max buffer size
    if (undoStack.value.length > MAX_UNDO_OPERATIONS) {
      undoStack.value.pop()
    }

    // Auto-expire after TTL
    setTimeout(() => {
      removeOperation(operation.id)
    }, UNDO_TTL)
  }

  /**
   * Removes an operation from the undo stack by ID
   *
   * @param id - The operation ID to remove
   */
  function removeOperation(id: string): void {
    const index = undoStack.value.findIndex(op => op.id === id)
    if (index !== -1) {
      undoStack.value.splice(index, 1)
    }
  }

  /**
   * Performs an undo operation by reverting to the previous value
   *
   * @param id - The operation ID to undo
   * @param revertFn - Async function that performs the revert operation
   */
  async function performUndo(id: string, revertFn: (value: T) => Promise<void>): Promise<void> {
    const operation = undoStack.value.find(op => op.id === id)
    if (!operation) {
      logger.warn('ConfigUndo', 'Operation not found or expired', id)
      return
    }

    try {
      await revertFn(operation.previousValue)
      removeOperation(id)
    } catch (error) {
      logger.error('ConfigUndo', 'Undo failed', error)
      // Error toast should be shown by revertFn
      throw error
    }
  }

  /**
   * Clears all operations from the undo stack
   */
  function clearUndoStack(): void {
    undoStack.value = []
  }

  return {
    undoStack,
    isSaving,
    pushUndo,
    performUndo,
    removeOperation,
    clearUndoStack
  }
}
