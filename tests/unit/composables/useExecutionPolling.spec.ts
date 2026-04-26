/**
 * useExecutionPolling tests
 *
 * Smoke tests: polls until terminal, can be cancelled mid-flight, and
 * propagates each fetched value through onUpdate.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { effectScope } from 'vue'

import {
  useExecutionPolling,
  isTerminalStatus,
  TERMINAL_STATUSES,
} from '@/composables/useExecutionPolling'
import type { GenerationStatus } from '@/models/characterization.types'

vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

interface FakeItem {
  id: number
  status: GenerationStatus
}

describe('useExecutionPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('TERMINAL_STATUSES contains COMPLETED, FAILED, CANCELED', () => {
    expect(TERMINAL_STATUSES).toContain('COMPLETED')
    expect(TERMINAL_STATUSES).toContain('FAILED')
    expect(TERMINAL_STATUSES).toContain('CANCELED')
  })

  it('isTerminalStatus returns true for terminal states', () => {
    expect(isTerminalStatus('COMPLETED')).toBe(true)
    expect(isTerminalStatus('FAILED')).toBe(true)
    expect(isTerminalStatus('CANCELED')).toBe(true)
    expect(isTerminalStatus('RUNNING')).toBe(false)
    expect(isTerminalStatus('PENDING')).toBe(false)
  })

  it('stops polling when fetcher returns a terminal item', async () => {
    const scope = effectScope()
    const fetcher = vi
      .fn<[], Promise<FakeItem | null>>()
      .mockResolvedValueOnce({ id: 1, status: 'RUNNING' })
      .mockResolvedValueOnce({ id: 1, status: 'RUNNING' })
      .mockResolvedValueOnce({ id: 1, status: 'COMPLETED' })

    const onUpdate = vi.fn<[FakeItem], void>()

    let polling!: ReturnType<typeof useExecutionPolling<FakeItem>>
    scope.run(() => {
      polling = useExecutionPolling<FakeItem>({
        fetcher,
        isTerminal: (item) => isTerminalStatus(item.status),
        intervalMs: 100,
        onUpdate,
      })
    })

    // First tick.
    await polling.start()
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(onUpdate).toHaveBeenCalledTimes(1)

    // Tick 2 (still RUNNING)
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(0)
    expect(fetcher).toHaveBeenCalledTimes(2)

    // Tick 3 -> COMPLETED -> stop
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(0)

    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(polling.isPolling.value).toBe(false)
    expect(polling.data.value).toEqual({ id: 1, status: 'COMPLETED' })
    expect(onUpdate).toHaveBeenCalledTimes(3)

    // Advancing further doesn't trigger more fetches.
    await vi.advanceTimersByTimeAsync(500)
    expect(fetcher).toHaveBeenCalledTimes(3)

    scope.stop()
  })

  it('stop() halts further polling immediately', async () => {
    const scope = effectScope()
    const fetcher = vi
      .fn<[], Promise<FakeItem | null>>()
      .mockResolvedValue({ id: 7, status: 'RUNNING' })

    let polling!: ReturnType<typeof useExecutionPolling<FakeItem>>
    scope.run(() => {
      polling = useExecutionPolling<FakeItem>({
        fetcher,
        isTerminal: (item) => isTerminalStatus(item.status),
        intervalMs: 50,
      })
    })

    await polling.start()

    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(polling.isPolling.value).toBe(true)

    polling.stop()
    expect(polling.isPolling.value).toBe(false)

    await vi.advanceTimersByTimeAsync(500)
    expect(fetcher).toHaveBeenCalledTimes(1)

    scope.stop()
  })

  it('cleans up automatically when its effect scope disposes', async () => {
    const fetcher = vi
      .fn<[], Promise<FakeItem | null>>()
      .mockResolvedValue({ id: 9, status: 'RUNNING' })

    const scope = effectScope()
    let polling!: ReturnType<typeof useExecutionPolling<FakeItem>>
    scope.run(() => {
      polling = useExecutionPolling<FakeItem>({
        fetcher,
        isTerminal: (item) => isTerminalStatus(item.status),
        intervalMs: 50,
      })
    })

    await polling.start()
    expect(fetcher).toHaveBeenCalledTimes(1)

    scope.stop()
    await vi.advanceTimersByTimeAsync(500)
    // No more fetches after the scope went away.
    expect(fetcher).toHaveBeenCalledTimes(1)
    expect(polling.isPolling.value).toBe(false)
  })

  it('calls onUpdate for every fetched value', async () => {
    const scope = effectScope()
    const fetcher = vi
      .fn<[], Promise<FakeItem | null>>()
      .mockResolvedValueOnce({ id: 1, status: 'PENDING' })
      .mockResolvedValueOnce({ id: 1, status: 'RUNNING' })
      .mockResolvedValueOnce({ id: 1, status: 'COMPLETED' })

    const onUpdate = vi.fn<[FakeItem], void>()

    let polling!: ReturnType<typeof useExecutionPolling<FakeItem>>
    scope.run(() => {
      polling = useExecutionPolling<FakeItem>({
        fetcher,
        isTerminal: (item) => isTerminalStatus(item.status),
        intervalMs: 50,
        onUpdate,
      })
    })

    await polling.start()
    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(50)
    await vi.advanceTimersByTimeAsync(0)

    expect(onUpdate).toHaveBeenCalledTimes(3)
    expect(onUpdate.mock.calls[0]?.[0].status).toBe('PENDING')
    expect(onUpdate.mock.calls[1]?.[0].status).toBe('RUNNING')
    expect(onUpdate.mock.calls[2]?.[0].status).toBe('COMPLETED')

    scope.stop()
  })
})
