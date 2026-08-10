/**
 * useExecutionPolling
 *
 * Generic polling helper for long-running executions (cohort generation,
 * characterization generation, etc.). Issues `fetcher()` immediately on
 * `start()`, then keeps polling until either `isTerminal` returns true,
 * the consumer calls `stop()`, or the surrounding effect scope disposes.
 *
 * Uses `setTimeout` (not `setInterval`) so a slow fetch can't queue up
 * concurrent calls: the next tick is scheduled only after the previous
 * fetch settles.
 *
 * `T` is whatever the fetcher returns, so callers that poll a list (or a
 * derived summary) can use this too. When no effect scope is active (a store
 * action, a watcher callback) the caller owns `stop()`.
 */
import { getCurrentScope, onScopeDispose, ref, type Ref } from 'vue'

import { logger } from '@/utils/logger'
import type { GenerationStatus } from '@/models/characterization.types'

export const TERMINAL_STATUSES: readonly GenerationStatus[] = [
  'COMPLETED',
  'FAILED',
  'CANCELED',
] as const

export function isTerminalStatus(status: GenerationStatus): boolean {
  return TERMINAL_STATUSES.includes(status)
}

export interface UseExecutionPollingOptions<T> {
  fetcher: () => Promise<T | null>
  isTerminal: (item: T) => boolean
  intervalMs?: number
  onUpdate?: (item: T) => void
  /** Set false when the caller has just fetched and only wants the schedule. */
  immediate?: boolean
}

export interface UseExecutionPollingReturn<T> {
  data: Ref<T | null>
  isPolling: Ref<boolean>
  start: () => Promise<void>
  stop: () => void
}

const DEFAULT_INTERVAL_MS = 3000

export function useExecutionPolling<T>(
  opts: UseExecutionPollingOptions<T>
): UseExecutionPollingReturn<T> {
  const data = ref<T | null>(null) as Ref<T | null>
  const isPolling = ref<boolean>(false)
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS

  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let cancelled = false

  function clearTimer(): void {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }

  function stop(): void {
    cancelled = true
    clearTimer()
    isPolling.value = false
  }

  async function tick(): Promise<void> {
    if (cancelled) {
      return
    }

    let item: T | null
    try {
      item = await opts.fetcher()
    } catch (error) {
      logger.error('useExecutionPolling', 'Fetcher threw, stopping poll', error)
      stop()
      return
    }

    if (cancelled) {
      return
    }

    data.value = item

    if (item) {
      try {
        opts.onUpdate?.(item)
      } catch (error) {
        logger.error('useExecutionPolling', 'onUpdate handler threw', error)
      }

      if (opts.isTerminal(item)) {
        stop()
        return
      }
    }

    // Schedule the next tick only if we're still polling.
    if (!cancelled) {
      scheduleTick()
    }
  }

  function scheduleTick(): void {
    timeoutId = setTimeout(() => {
      timeoutId = null
      void tick()
    }, intervalMs)
  }

  async function start(): Promise<void> {
    if (isPolling.value) {
      return
    }
    cancelled = false
    isPolling.value = true
    if (opts.immediate === false) {
      scheduleTick()
      return
    }
    await tick()
  }

  if (getCurrentScope()) {
    onScopeDispose(() => {
      stop()
    })
  }

  return {
    data,
    isPolling,
    start,
    stop,
  }
}
