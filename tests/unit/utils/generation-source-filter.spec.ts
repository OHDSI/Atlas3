import { describe, expect, it } from 'vitest'
import { filterGeneratedSources } from '@/utils/generation-source-filter'

describe('filterGeneratedSources', () => {
  it('keeps only sources with a completed result', () => {
    const sources = [
      { sourceId: 1, sourceKey: 'completed', sourceName: 'Completed' },
      { sourceId: 2, sourceKey: 'running', sourceName: 'Running' },
      { sourceId: 3, sourceKey: 'failed', sourceName: 'Failed' },
      { sourceId: 4, sourceKey: 'not-run', sourceName: 'Not run' },
    ]
    const executions = [
      { id: 1, sourceKey: 'completed', status: 'COMPLETED' as const },
      { id: 2, sourceKey: 'running', status: 'RUNNING' as const },
      { id: 3, sourceKey: 'failed', status: 'FAILED' as const },
    ]

    expect(filterGeneratedSources(sources, executions)).toEqual([
      { sourceId: 1, sourceKey: 'completed', sourceName: 'Completed' },
    ])
  })
})
