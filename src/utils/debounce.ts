/**
 * Debounce and Throttle Utilities
 * Consolidated debounce/throttle logic for rate-limiting function calls
 */

/**
 * Function with cancel method for cleanup
 */
export interface DebouncedFunction<T extends (...args: Parameters<T>) => ReturnType<T>> {
  (...args: Parameters<T>): void
  cancel(): void
}

/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked.
 *
 * @param func - The function to debounce
 * @param wait - The number of milliseconds to delay
 * @returns A debounced function with a cancel method
 *
 * @example
 * const debouncedSearch = debounce((query: string) => {
 *   console.log('Searching for:', query)
 * }, 300)
 *
 * debouncedSearch('hello')  // Will execute after 300ms of inactivity
 * debouncedSearch.cancel()  // Cancel pending execution
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  const debounced = function (this: unknown, ...args: Parameters<T>): void {
    // Cancel previous pending call
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }

    // Schedule new call
    timeoutId = setTimeout(() => {
      timeoutId = null
      func.apply(this, args)
    }, wait)
  }

  // Add cancel method
  debounced.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  return debounced
}

/**
 * Creates a throttled function that only invokes func at most once per every limit milliseconds.
 * The function will execute immediately on the first call, then limit subsequent calls.
 *
 * @param func - The function to throttle
 * @param limit - The minimum number of milliseconds between invocations
 * @returns A throttled function with a cancel method
 *
 * @example
 * const throttledScroll = throttle((event: Event) => {
 *   console.log('Scroll event:', event)
 * }, 100)
 *
 * window.addEventListener('scroll', throttledScroll)
 * throttledScroll.cancel()  // Cancel pending execution
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): DebouncedFunction<T> {
  let inThrottle = false
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastCall: { context: unknown; args: Parameters<T> } | null = null

  const executeThrottled = (context: unknown, args: Parameters<T>) => {
    func.apply(context, args)
    inThrottle = true
    lastCall = null

    timeoutId = setTimeout(() => {
      inThrottle = false
      timeoutId = null

      // Execute with last received arguments if any were queued
      if (lastCall !== null) {
        const { context: savedContext, args: savedArgs } = lastCall
        executeThrottled(savedContext, savedArgs)
      }
    }, limit)
  }

  const throttled = function (this: unknown, ...args: Parameters<T>): void {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    lastCall = { context: this, args }

    if (!inThrottle) {
      // Execute immediately on first call
      // eslint-disable-next-line @typescript-eslint/no-this-alias
      executeThrottled(this, args)
    }
  }

  // Add cancel method
  throttled.cancel = () => {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    inThrottle = false
    lastCall = null
  }

  return throttled
}
