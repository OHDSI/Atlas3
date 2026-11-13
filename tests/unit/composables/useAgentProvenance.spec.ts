/**
 * Unit Tests: useAgentProvenance
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { nextTick, ref } from 'vue'
import { useAgentProvenance } from '@/composables/useAgentProvenance'
import type { ProvenanceEntry } from '@/services/mcp-provenance.service'

const getProvenance = vi.fn()

vi.mock('@/services/mcp-provenance.service', async importOriginal => ({
  ...(await importOriginal<typeof import('@/services/mcp-provenance.service')>()),
  getProvenance: (...args: unknown[]) => getProvenance(...args),
}))

vi.mock('@/utils/logger', () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

function entry(id: number, traceId = 'a'.repeat(32)): ProvenanceEntry {
  return {
    id,
    traceId,
    spanId: 'b'.repeat(16),
    tool: 'create_cohort_definition',
    outcome: 'SUCCESS',
    startedAt: id * 1000,
  }
}

async function settle() {
  await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('useAgentProvenance', () => {
  beforeEach(() => {
    getProvenance.mockReset()
  })

  it('loads the history of a saved artifact and counts its calls', async () => {
    getProvenance.mockResolvedValue([entry(1), entry(2)])

    const { count, traces, loading } = useAgentProvenance('cohortdefinition', ref(42))
    expect(loading.value).toBe(true)
    await settle()

    expect(getProvenance).toHaveBeenCalledWith('cohortdefinition', 42)
    expect(count.value).toBe(2)
    expect(traces.value).toHaveLength(1)
    expect(loading.value).toBe(false)
  })

  it('does not call WebAPI for an unsaved artifact', async () => {
    const { count } = useAgentProvenance('conceptset', ref(null))
    await settle()

    expect(getProvenance).not.toHaveBeenCalled()
    expect(count.value).toBe(0)
  })

  it('reports a failure and clears the history', async () => {
    getProvenance.mockRejectedValue(new Error('HTTP 500: boom'))

    const { count, error } = useAgentProvenance('cohortdefinition', ref(42))
    await settle()

    expect(count.value).toBe(0)
    expect(error.value).toBe('HTTP 500: boom')
  })

  it('drops a slow response for an id that is no longer shown', async () => {
    let resolveFirst: (value: ProvenanceEntry[]) => void = () => {}
    getProvenance
      .mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve }))
      .mockResolvedValueOnce([entry(9)])

    const id = ref<number | null>(1)
    const { entries } = useAgentProvenance('cohortdefinition', id)
    id.value = 2
    await settle()
    resolveFirst([entry(1), entry(2), entry(3)])
    await settle()

    expect(entries.value.map(e => e.id)).toEqual([9])
  })
})
