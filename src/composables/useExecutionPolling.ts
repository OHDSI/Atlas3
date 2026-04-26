/**
 * useExecutionPolling
 *
 * Generic polling helper for long-running executions (cohort generation,
 * characterization generation, etc.). Issues `fetcher()` immediately on
 * `start()`, then keeps polling until either `isTerminal` returns true,
 * the consumer calls `stop()`, or the surrounding effect scope disposes.
 *
 * Uses `setTimeout` (not `setInterval`) so a slow fetch can't queue up
 * concurrent calls — the next tick is scheduled only after the previous
 * fetch settles.
 */
import { onScopeDispose, ref, type Ref } from 'vue'

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

export interface UseExecutionPollingOptions<T extends { status: GenerationStatus }> {
  fetcher: () => Promise<T | null>
  isTerminal: (item: T) => boolean
  intervalMs?: number
  onUpdate?: (item: T) => void
}

export interface UseExecutionPollingReturn<T extends { status: GenerationStatus }> {
  data: Ref<T | null>
  isPolling: Ref<boolean>
  start: () => Promise<void>
  stop: () => void
}

const DEFAULT_INTERVAL_MS = 3000

export function useExecutionPolling<T extends { status: GenerationStatus }>(
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
      logger.error('useExecutionPolling', 'Fetcher threw — stopping poll', error)
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
      timeoutId = setTimeout(() => {
        timeoutId = null
        void tick()
      }, intervalMs)
    }
  }

  async function start(): Promise<void> {
    if (isPolling.value) {
      return
    }
    cancelled = false
    isPolling.value = true
    await tick()
  }

  onScopeDispose(() => {
    stop()
  })

  return {
    data,
    isPolling,
    start,
    stop,
  }
}
