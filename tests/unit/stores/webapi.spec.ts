/**
 * WebAPI Store Tests
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useWebAPIStore } from '@/stores/webapi'
import type { CDMSource } from '@/models/webapi.types'

describe('WebAPI Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('Initial State', () => {
    it('should have empty sources initially', () => {
      const store = useWebAPIStore()
      expect(store.sources).toEqual([])
      expect(store.selectedSource).toBeNull()
    })

    it('should have empty generation jobs initially', () => {
      const store = useWebAPIStore()
      expect(store.generationJobs.size).toBe(0)
    })
  })

  describe('Sources Management', () => {
    it('should set sources', () => {
      const store = useWebAPIStore()
      const sources: CDMSource[] = [
        {
          sourceKey: 'source1',
          sourceName: 'Test Source 1',
          sourceDialect: 'postgresql',
          daimons: [],
        },
        {
          sourceKey: 'source2',
          sourceName: 'Test Source 2',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      store.setSources(sources)

      expect(store.sources).toEqual(sources)
      expect(store.selectedSource).toBe('source1') // Auto-selects first
    })

    it('should not auto-select if source already selected', () => {
      const store = useWebAPIStore()
      store.setSelectedSource('existing-source')

      const sources: CDMSource[] = [
        {
          sourceKey: 'source1',
          sourceName: 'Test Source 1',
          sourceDialect: 'postgresql',
          daimons: [],
        },
      ]

      store.setSources(sources)

      expect(store.selectedSource).toBe('existing-source')
    })

    it('should set selected source', () => {
      const store = useWebAPIStore()

      store.setSelectedSource('test-source')
      expect(store.selectedSource).toBe('test-source')
    })
  })

  describe('Generation Jobs Management', () => {
    it('should add generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)

      expect(store.generationJobs.size).toBe(1)
      expect(store.generationJobs.get(123)).toEqual(job)
    })

    it('should update generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)

      const updatedJob = {
        ...job,
        status: 'RUNNING' as const,
      }

      store.updateGenerationJob(123, updatedJob)

      expect(store.generationJobs.get(123)?.status).toBe('RUNNING')
    })

    it('should remove generation job', () => {
      const store = useWebAPIStore()
      const job = {
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test-source',
        status: 'PENDING' as const,
      }

      store.addGenerationJob(job)
      expect(store.generationJobs.size).toBe(1)

      store.removeGenerationJob(123)
      expect(store.generationJobs.size).toBe(0)
    })

    it('should clear generation jobs', () => {
      const store = useWebAPIStore()
      store.addGenerationJob({
        id: 123,
        cohortDefinitionId: 456,
        sourceKey: 'test',
        status: 'PENDING',
      })

      store.clearJobs()

      expect(store.generationJobs.size).toBe(0)
    })
  })
})
