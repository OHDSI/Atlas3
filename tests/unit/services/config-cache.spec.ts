/**
 * Configuration Cache Service Tests (T096)
 * Tests for IndexedDB cache management and localStorage vocabulary schema
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as configCache from '@/services/config-cache'
import 'fake-indexeddb/auto'

describe('Config Cache Service', () => {
  beforeEach(() => {
    // Clear all stores before each test
    // eslint-disable-next-line no-global-assign
    indexedDB = new IDBFactory()
    localStorage.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('IndexedDB Operations', () => {
    describe('clearConfigCache', () => {
      it('should clear the config cache successfully', async () => {
        // First, populate the cache with some data
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('atlas3_config_cache', 1)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains('config')) {
              db.createObjectStore('config')
            }
          }
        })

        // Add some test data
        const transaction = db.transaction('config', 'readwrite')
        const store = transaction.objectStore('config')
        store.add({ value: 'test1' }, 'key1')
        store.add({ value: 'test2' }, 'key2')
        await new Promise((resolve) => {
          transaction.oncomplete = resolve
        })
        db.close()

        // Now clear the cache
        await configCache.clearConfigCache()

        // Verify cache is empty
        const stats = await configCache.getCacheStats()
        expect(stats.itemCount).toBe(0)
      })

      it('should handle errors when clearing cache fails', async () => {
        // Mock indexedDB.open to fail
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          const request = {} as IDBOpenDBRequest
          setTimeout(() => {
            if (request.onerror) {
              request.onerror({} as Event)
            }
          }, 0)
          Object.defineProperty(request, 'error', {
            value: new Error('Database error'),
            writable: false
          })
          return request
        })

        await expect(configCache.clearConfigCache()).rejects.toThrow()

        // Restore original
        indexedDB.open = originalOpen
      })
    })

    describe('getCacheStats', () => {
      it('should return correct cache statistics', async () => {
        // Populate cache with known data
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('atlas3_config_cache', 1)
          request.onerror = () => reject(request.error)
          request.onsuccess = () => resolve(request.result)
          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result
            if (!db.objectStoreNames.contains('config')) {
              db.createObjectStore('config')
            }
          }
        })

        const transaction = db.transaction('config', 'readwrite')
        const store = transaction.objectStore('config')
        store.add({ value: 'test1' }, 'key1')
        store.add({ value: 'test2' }, 'key2')
        store.add({ value: 'test3' }, 'key3')
        await new Promise((resolve) => {
          transaction.oncomplete = resolve
        })
        db.close()

        const stats = await configCache.getCacheStats()

        expect(stats.itemCount).toBe(3)
        expect(stats.estimatedSize).toBe(3 * 1024) // 3 items * 1KB estimate
      })

      it('should return zero stats for empty cache', async () => {
        const stats = await configCache.getCacheStats()

        expect(stats.itemCount).toBe(0)
        expect(stats.estimatedSize).toBe(0)
      })

      it('should handle errors when getting stats fails', async () => {
        const originalOpen = indexedDB.open
        indexedDB.open = vi.fn(() => {
          const request = {} as IDBOpenDBRequest
          setTimeout(() => {
            if (request.onerror) {
              request.onerror({} as Event)
            }
          }, 0)
          Object.defineProperty(request, 'error', {
            value: new Error('Database error'),
            writable: false
          })
          return request
        })

        await expect(configCache.getCacheStats()).rejects.toThrow()

        indexedDB.open = originalOpen
      })
    })
  })

  describe('LocalStorage Operations', () => {
    describe('getVocabularySchema', () => {
      it('should return stored schema from localStorage', () => {
        localStorage.setItem('atlas3-vocabulary-schema', 'custom_schema')

        const schema = configCache.getVocabularySchema()

        expect(schema).toBe('custom_schema')
      })

      it('should return default "public" when no schema stored', () => {
        const schema = configCache.getVocabularySchema()

        expect(schema).toBe('public')
      })

      it('should return default "public" on localStorage error', () => {
        // Mock localStorage.getItem to throw
        const originalGetItem = localStorage.getItem
        localStorage.getItem = vi.fn(() => {
          throw new Error('localStorage error')
        })

        const schema = configCache.getVocabularySchema()

        expect(schema).toBe('public')

        // Restore
        localStorage.getItem = originalGetItem
      })
    })

    describe('setVocabularySchema', () => {
      it('should save schema to localStorage', () => {
        configCache.setVocabularySchema('new_schema')

        const stored = localStorage.getItem('atlas3-vocabulary-schema')
        expect(stored).toBe('new_schema')
      })

      it('should overwrite existing schema', () => {
        localStorage.setItem('atlas3-vocabulary-schema', 'old_schema')

        configCache.setVocabularySchema('new_schema')

        const stored = localStorage.getItem('atlas3-vocabulary-schema')
        expect(stored).toBe('new_schema')
      })

      it('should throw error on localStorage failure', () => {
        // Mock localStorage.setItem to throw
        const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
          throw new Error('localStorage full')
        })

        expect(() => configCache.setVocabularySchema('schema')).toThrow('Failed to save vocabulary schema')

        // Restore
        setItemSpy.mockRestore()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle multiple cache operations sequentially', async () => {
      // Set vocabulary schema
      configCache.setVocabularySchema('test_schema')
      expect(configCache.getVocabularySchema()).toBe('test_schema')

      // Get stats (should be empty initially)
      let stats = await configCache.getCacheStats()
      expect(stats.itemCount).toBe(0)

      // Populate cache
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('atlas3_config_cache', 1)
        request.onerror = () => reject(request.error)
        request.onsuccess = () => resolve(request.result)
        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result
          if (!db.objectStoreNames.contains('config')) {
            db.createObjectStore('config')
          }
        }
      })

      const transaction = db.transaction('config', 'readwrite')
      const store = transaction.objectStore('config')
      store.add({ value: 'data' }, 'key1')
      await new Promise((resolve) => {
        transaction.oncomplete = resolve
      })
      db.close()

      // Get stats (should show 1 item)
      stats = await configCache.getCacheStats()
      expect(stats.itemCount).toBe(1)

      // Clear cache
      await configCache.clearConfigCache()

      // Verify empty
      stats = await configCache.getCacheStats()
      expect(stats.itemCount).toBe(0)

      // Vocabulary schema should still be there (localStorage, not IndexedDB)
      expect(configCache.getVocabularySchema()).toBe('test_schema')
    })
  })
})
