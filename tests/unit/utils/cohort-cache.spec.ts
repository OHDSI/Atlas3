/**
 * Unit Tests for Cohort Cache Utility
 * Tests browser-based caching using IndexedDB
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  saveCohortToCache,
  getCohortFromCache,
  clearCache,
  deleteCohortFromCache,
  clearExpiredCache,
  getCacheStats,
} from '@/utils/cohort-cache'
import type { CohortDefinition } from '@/models/cohort.types'

// Mock IndexedDB for testing
import 'fake-indexeddb/auto'

describe('Cohort Cache Utility', () => {
  const mockCohort: CohortDefinition = {
    id: 123,
    name: 'Test Cohort',
    entryEvents: [
      {
        id: 'event-1',
        criteriaType: 'ConditionOccurrence',
        attributes: [],
      },
    ],
    qualifyingLimit: 'ALL',
    inclusionRules: [],
    conceptSets: [],
    expressionType: 'SIMPLE_EXPRESSION',
    cdmVersionRange: '>=5.0.0',
  }

  const mockCohort2: CohortDefinition = {
    id: 456,
    name: 'Second Test Cohort',
    entryEvents: [],
    qualifyingLimit: 'FIRST',
    inclusionRules: [],
    conceptSets: [],
  }

  beforeEach(async () => {
    // Clear cache before each test
    await clearCache()
  })

  afterEach(async () => {
    // Clean up after each test
    await clearCache()
  })

  describe('saveCohortToCache', () => {
    it('should save a cohort to cache successfully', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.name).toBe('Test Cohort')
      expect(retrieved?.id).toBe(123)
    })

    it('should update an existing cached cohort', async () => {
      await saveCohortToCache(mockCohort)

      const updatedCohort = { ...mockCohort, name: 'Updated Cohort' }
      await saveCohortToCache(updatedCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved?.name).toBe('Updated Cohort')
    })

    it('should not cache cohort without ID', async () => {
      const cohortWithoutId = { ...mockCohort }
      delete cohortWithoutId.id

      await saveCohortToCache(cohortWithoutId)

      // Should return null since cohort wasn't cached
      const retrieved = await getCohortFromCache(123)
      expect(retrieved).toBeNull()
    })

    it('should cache cohort with webapi source', async () => {
      await saveCohortToCache(mockCohort, 'webapi')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })

    it('should cache cohort with local source', async () => {
      await saveCohortToCache(mockCohort, 'local')

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('getCohortFromCache', () => {
    it('should retrieve a cached cohort', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).not.toBeNull()
      expect(retrieved?.id).toBe(123)
      expect(retrieved?.name).toBe('Test Cohort')
    })

    it('should return null for non-existent cohort', async () => {
      const retrieved = await getCohortFromCache(999)
      expect(retrieved).toBeNull()
    })

    it('should preserve all cohort properties', async () => {
      await saveCohortToCache(mockCohort)

      const retrieved = await getCohortFromCache(123)
      expect(retrieved?.expressionType).toBe('SIMPLE_EXPRESSION')
      expect(retrieved?.cdmVersionRange).toBe('>=5.0.0')
      expect(retrieved?.entryEvents).toHaveLength(1)
      expect(retrieved?.entryEvents[0].criteriaType).toBe('ConditionOccurrence')
    })

    it('should return null for expired cache (mocked)', async () => {
      // Save cohort
      await saveCohortToCache(mockCohort)

      // Mock the timestamp to be older than 24 hours
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const retrieved = await getCohortFromCache(123)
      expect(retrieved).toBeNull()
    })
  })

  describe('clearCache', () => {
    it('should clear all cached cohorts', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      await clearCache()

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      expect(retrieved1).toBeNull()
      expect(retrieved2).toBeNull()
    })

    it('should allow saving after clearing', async () => {
      await saveCohortToCache(mockCohort)
      await clearCache()
      await saveCohortToCache(mockCohort2)

      const retrieved = await getCohortFromCache(456)
      expect(retrieved).not.toBeNull()
    })
  })

  describe('deleteCohortFromCache', () => {
    it('should delete a specific cohort from cache', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      await deleteCohortFromCache(123)

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      expect(retrieved1).toBeNull()
      expect(retrieved2).not.toBeNull()
    })

    it('should not error when deleting non-existent cohort', async () => {
      await expect(deleteCohortFromCache(999)).resolves.not.toThrow()
    })
  })

  describe('clearExpiredCache', () => {
    it('should remove expired entries only', async () => {
      // Save fresh cohort
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      // Manually expire one cohort
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000 // 25 hours ago

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      // Clear expired
      await clearExpiredCache()

      const retrieved1 = await getCohortFromCache(123)
      const retrieved2 = await getCohortFromCache(456)

      // Expired cohort should be gone, fresh one should remain
      expect(retrieved1).toBeNull()
      expect(retrieved2).not.toBeNull()
    })
  })

  describe('getCacheStats', () => {
    it('should return correct cache statistics', async () => {
      await saveCohortToCache(mockCohort)
      await saveCohortToCache(mockCohort2)

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(2)
      expect(stats.expiredCohorts).toBe(0)
      expect(stats.cacheSize).toBeGreaterThan(0)
    })

    it('should count expired cohorts correctly', async () => {
      await saveCohortToCache(mockCohort)

      // Manually expire cohort
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_cohort_cache', 1)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

      const transaction = db.transaction('cohorts', 'readwrite')
      const store = transaction.objectStore('cohorts')
      const getRequest = store.get(123)

      await new Promise<void>((resolve) => {
        getRequest.onsuccess = () => {
          const cachedData = getRequest.result
          cachedData.timestamp = Date.now() - 25 * 60 * 60 * 1000

          const putRequest = store.put(cachedData)
          putRequest.onsuccess = () => resolve()
        }
        transaction.oncomplete = () => db.close()
      })

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(1)
      expect(stats.expiredCohorts).toBe(1)
    })

    it('should return zeros for empty cache', async () => {
      await clearCache()

      const stats = await getCacheStats()

      expect(stats.totalCohorts).toBe(0)
      expect(stats.expiredCohorts).toBe(0)
      expect(stats.cacheSize).toBe(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // This test depends on implementation details
      // For now, just ensure methods don't throw
      await expect(getCohortFromCache(123)).resolves.not.toThrow()
    })

    it('should handle large cohort definitions', async () => {
      const largeCohort: CohortDefinition = {
        ...mockCohort,
        id: 789,
        entryEvents: Array.from({ length: 100 }, (_, i) => ({
          id: `event-${i}`,
          criteriaType: 'ConditionOccurrence' as const,
          attributes: [],
        })),
        inclusionRules: Array.from({ length: 50 }, (_, i) => ({
          id: `rule-${i}`,
          name: `Rule ${i}`,
          criteriaGroups: [],
        })),
      }

      await expect(saveCohortToCache(largeCohort)).resolves.not.toThrow()

      const retrieved = await getCohortFromCache(789)
      expect(retrieved?.entryEvents).toHaveLength(100)
      expect(retrieved?.inclusionRules).toHaveLength(50)
    })
  })
})
