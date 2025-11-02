/**
 * useCohorts Composable
 * Manages cohort list state, fetching, filtering, and sorting
 */
import { ref, computed } from 'vue'
import type { Ref } from 'vue'
import { getCohorts } from '@/services/webapi'
import type { CohortDefinitionSummary } from '@/models/webapi.types'

export function useCohorts() {
  // State
  const cohorts: Ref<CohortDefinitionSummary[]> = ref([])
  const loading = ref(false)
  const error: Ref<Error | null> = ref(null)
  const searchQuery = ref('')

  /**
   * Fetch all cohorts from WebAPI
   * Automatically sorts by most recent first
   */
  async function fetchCohorts() {
    loading.value = true
    error.value = null

    try {
      const response = await getCohorts()
      
      // Sort by modifiedDate descending (most recent first)
      cohorts.value = response.sort((a, b) => {
        const aDate = a.modifiedDate ? new Date(a.modifiedDate).getTime() : 0
        const bDate = b.modifiedDate ? new Date(b.modifiedDate).getTime() : 0
        return bDate - aDate
      })
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to load cohorts')
      console.error('Failed to fetch cohorts:', err)
    } finally {
      loading.value = false
    }
  }

  /**
   * Filtered cohorts based on search query
   * Searches cohort name (case-insensitive)
   */
  const filteredCohorts = computed(() => {
    if (!searchQuery.value) {
      return cohorts.value
    }

    const query = searchQuery.value.toLowerCase().trim()
    return cohorts.value.filter(cohort => 
      cohort.name.toLowerCase().includes(query)
    )
  })

  /**
   * Refresh cohorts list (refetch from API)
   */
  async function refreshCohorts() {
    await fetchCohorts()
  }

  return {
    // State
    cohorts,
    loading,
    error,
    searchQuery,
    
    // Computed
    filteredCohorts,
    
    // Actions
    fetchCohorts,
    refreshCohorts,
  }
}
