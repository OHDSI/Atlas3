import type { TemporalWindow, Window } from '@/models/event.types'

interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export function useTemporalWindows() {
  /**
   * Validate temporal windows
   */
  function validateTemporalWindows(temporalWindow: TemporalWindow): ValidationResult {
    const errors: string[] = []

    // Validate start window
    if (temporalWindow.startWindow) {
      const startErrors = validateSingleWindow(temporalWindow.startWindow, 'Start window')
      errors.push(...startErrors)
    }

    // Validate end window
    if (temporalWindow.endWindow) {
      const endErrors = validateSingleWindow(temporalWindow.endWindow, 'End window')
      errors.push(...endErrors)
    }

    // Validate start comes before end
    if (temporalWindow.startWindow && temporalWindow.endWindow) {
      const startOffset = calculateOffset(temporalWindow.startWindow)
      const endOffset = calculateOffset(temporalWindow.endWindow)

      if (startOffset !== null && endOffset !== null && startOffset > endOffset) {
        errors.push('Start window must come before end window')
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  /**
   * Validate a single window
   */
  function validateSingleWindow(window: Window, label: string): string[] {
    const errors: string[] = []

    // Days must be >= 0 or null for "all time"
    if (window.days !== null && window.days < 0) {
      errors.push(`${label}: Days must be >= 0 or null for "all time"`)
    }

    return errors
  }

  /**
   * Calculate offset from index in days (null for "all time")
   */
  function calculateOffset(window: Window): number | null {
    if (window.days === null) {
      return null
    }
    const coeff = window.beforeAfter === 'AFTER' ? 1 : -1
    return window.days * coeff
  }

  /**
   * Format temporal windows for display
   */
  function formatTemporalWindowDisplay(temporalWindow: TemporalWindow): string {
    const { startWindow, endWindow } = temporalWindow

    if (!startWindow && !endWindow) {
      return 'No temporal constraints'
    }

    // Single window cases
    if (startWindow && !endWindow) {
      // Special case for "any time before/after"
      if (startWindow.days === null) {
        const direction = startWindow.beforeAfter === 'AFTER' ? 'after' : 'before'
        return `Any time ${direction} index`
      }
      return formatSingleWindow(startWindow, 'From')
    }

    if (!startWindow && endWindow) {
      // Special case for "any time before/after"
      if (endWindow.days === null) {
        const direction = endWindow.beforeAfter === 'AFTER' ? 'after' : 'before'
        return `Any time ${direction} index`
      }
      return formatSingleWindow(endWindow, 'Up to')
    }

    // Both windows - format as range
    if (startWindow && endWindow) {
      // Check if "any time before"
      if (startWindow.days === null && startWindow.beforeAfter === 'BEFORE') {
        return 'Any time before index'
      }

      // Check if "any time after"
      if (endWindow.days === null && endWindow.beforeAfter === 'AFTER') {
        return 'Any time after index'
      }

      // Format as range - handle mixed directions
      if (startWindow.beforeAfter !== endWindow.beforeAfter) {
        // Mixed directions: "30 days before to 0 days after index"
        const startDays = startWindow.days
        const endDays = endWindow.days
        const startDir = startWindow.beforeAfter === 'AFTER' ? 'after' : 'before'
        const endDir = endWindow.beforeAfter === 'AFTER' ? 'after' : 'before'
        const ref = formatReferencePoint(startWindow.referencePoint)
        return `${startDays} days ${startDir} to ${endDays} days ${endDir} ${ref}`
      }

      // Same direction
      const startStr = formatWindowValue(startWindow)
      const endStr = formatWindowValue(endWindow)
      const referenceStr = formatReference(startWindow, endWindow)

      return `${startStr} to ${endStr} ${referenceStr}`
    }

    return ''
  }

  /**
   * Format a single window with prefix
   */
  function formatSingleWindow(window: Window, prefix: string): string {
    if (window.days === null) {
      const direction = window.beforeAfter === 'AFTER' ? 'after' : 'before'
      return `${prefix} any time ${direction} index`
    }

    const dayStr = window.days === 1 ? '1 day' : `${window.days} days`
    const direction = window.beforeAfter === 'AFTER' ? 'after' : 'before'
    const reference = formatReferencePoint(window.referencePoint)

    return `${prefix} ${dayStr} ${direction} ${reference}`
  }

  /**
   * Format window value (just the number for ranges)
   */
  function formatWindowValue(window: Window): string {
    if (window.days === null) {
      return 'any time'
    }
    return `${window.days}`
  }

  /**
   * Format reference point (INDEX_START, INDEX_END, etc.)
   */
  function formatReferencePoint(referencePoint: Window['referencePoint']): string {
    switch (referencePoint) {
      case 'INDEX_START':
        return 'index start'
      case 'INDEX_END':
        return 'index end'
      case 'EVENT_START':
        return 'event start'
      case 'EVENT_END':
        return 'event end'
      default:
        return 'index'
    }
  }

  /**
   * Format reference point with direction for ranges
   */
  function formatReference(startWindow: Window, endWindow: Window): string {
    // Determine the common direction
    const direction = startWindow.beforeAfter === 'AFTER' && endWindow.beforeAfter === 'AFTER' ? 'days after' :
                     startWindow.beforeAfter === 'BEFORE' && endWindow.beforeAfter === 'BEFORE' ? 'days before' :
                     'days' // mixed directions

    // If both use same reference, show it once
    if (startWindow.referencePoint === endWindow.referencePoint) {
      const ref = formatReferencePoint(startWindow.referencePoint)
      return `${direction} ${ref}`
    }

    // Otherwise show "index" (most common)
    return `${direction} index`
  }

  /**
   * Provide default window values
   */
  function defaultWindow(
    direction: 'before' | 'after' = 'after',
    days: number | null = 0,
    referencePoint: Window['referencePoint'] = 'INDEX_START'
  ): Window {
    return {
      days,
      beforeAfter: direction === 'after' ? 'AFTER' : 'BEFORE',
      referencePoint,
    }
  }

  /**
   * Create common temporal window presets
   */
  function getTemporalWindowPresets(): Array<{
    label: string
    value: TemporalWindow
  }> {
    return [
      {
        label: 'Any time before index',
        value: {
          startWindow: {
            days: null,
            beforeAfter: 'BEFORE',
            referencePoint: 'INDEX_START',
          },
        },
      },
      {
        label: '0 to 30 days after index',
        value: {
          startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
          endWindow: { days: 30, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        },
      },
      {
        label: '0 to 90 days after index',
        value: {
          startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
          endWindow: { days: 90, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        },
      },
      {
        label: '30 days before to 0 days after index',
        value: {
          startWindow: { days: 30, beforeAfter: 'BEFORE', referencePoint: 'INDEX_START' },
          endWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        },
      },
      {
        label: '0 to 365 days after index',
        value: {
          startWindow: { days: 0, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
          endWindow: { days: 365, beforeAfter: 'AFTER', referencePoint: 'INDEX_START' },
        },
      },
    ]
  }

  return {
    validateTemporalWindows,
    formatTemporalWindowDisplay,
    defaultWindow,
    getTemporalWindowPresets,
  }
}
