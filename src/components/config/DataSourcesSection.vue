<template>
  <div class="data-sources-section">
    <!-- Priority Scope Selector -->
    <v-card class="mb-4">
      <v-card-text>
        <div class="d-flex align-center justify-space-between">
          <span class="text-subtitle-1">Change source priorities in:</span>
          <v-btn-toggle
            v-model="priorityScope"
            mandatory
            color="primary"
            density="compact"
          >
            <v-btn value="session">
              Current Session
            </v-btn>
            <v-btn value="application">
              Whole Application
            </v-btn>
          </v-btn-toggle>
        </div>
      </v-card-text>
    </v-card>

    <!-- Data Sources Table -->
    <v-card>
      <v-card-title>Data Sources</v-card-title>
      <v-card-text>
        <v-table>
          <thead>
            <tr>
              <th>Source Name</th>
              <th>Dialect</th>
              <th>Vocabulary</th>
              <th>Evidence</th>
              <th>Results</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="source in dataSources"
              :key="source.sourceKey"
            >
              <td>
                <div class="d-flex align-center">
                  <v-icon
                    :color="source.initialized ? 'success' : 'error'"
                    size="small"
                    class="mr-2"
                  >
                    {{ source.initialized ? 'mdi-check-circle' : 'mdi-alert-circle' }}
                  </v-icon>
                  {{ source.sourceName }}
                  <span class="text-grey ml-1">[{{ source.sourceKey }}]</span>
                </div>
              </td>
              <td>{{ source.sourceDialect }}</td>
              <td>
                <div class="d-flex align-center">
                  <input
                    v-model="selectedVocabulary"
                    type="radio"
                    :value="source.sourceKey"
                    :disabled="!source.hasVocabulary"
                    class="mr-2"
                  >
                  <span>{{ source.vocabularyVersion || source.version || '-' }}</span>
                </div>
              </td>
              <td>
                <input
                  v-model="selectedEvidence"
                  type="radio"
                  :value="source.sourceKey"
                  :disabled="!source.hasEvidence"
                >
              </td>
              <td>
                <input
                  v-model="selectedResults"
                  type="radio"
                  :value="source.sourceKey"
                  :disabled="!source.hasResults"
                >
              </td>
              <td>
                <div class="d-flex gap-2">
                  <v-btn
                    size="small"
                    variant="tonal"
                    @click="checkConnection(source)"
                  >
                    Check
                  </v-btn>
                  <v-btn
                    size="small"
                    variant="tonal"
                    :disabled="!source.hasResults"
                    @click="refreshCache(source)"
                  >
                    Refresh
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-alert
          v-if="dataSources.length === 0"
          type="info"
          variant="tonal"
          class="mt-4"
        >
          No data sources configured. Contact your administrator to add data sources.
        </v-alert>
      </v-card-text>
    </v-card>

    <!-- Action Buttons -->
    <v-card class="mt-4">
      <v-card-title>Configuration Actions</v-card-title>
      <v-card-text>
        <div class="d-flex flex-wrap gap-2">
          <v-btn
            color="primary"
            prepend-icon="mdi-delete-sweep"
            @click="clearLocalCache"
          >
            Clear Local Cache
          </v-btn>
          <v-btn
            color="primary"
            prepend-icon="mdi-server"
            @click="clearServerCache"
          >
            Clear Server Cache
          </v-btn>
        </div>
      </v-card-text>
    </v-card>

    <!-- Success Toast -->
    <v-snackbar
      v-model="showToast"
      :timeout="5000"
      color="success"
      location="bottom"
    >
      {{ toastMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>

    <!-- Error Toast -->
    <v-snackbar
      v-model="showErrorToast"
      :timeout="5000"
      color="error"
      location="bottom"
    >
      {{ errorMessage }}
      <template #actions>
        <v-btn
          variant="text"
          @click="showErrorToast = false"
        >
          Close
        </v-btn>
      </template>
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

interface DataSource {
  sourceKey: string
  sourceName: string
  sourceDialect: string
  version?: string
  vocabularyVersion?: string
  initialized: boolean
  hasVocabulary: boolean
  hasEvidence: boolean
  hasResults: boolean
}

// State
const priorityScope = ref<'session' | 'application'>('session')
const dataSources = ref<DataSource[]>([])
const selectedVocabulary = ref<string>('')
const selectedEvidence = ref<string>('')
const selectedResults = ref<string>('')
const showToast = ref(false)
const showErrorToast = ref(false)
const toastMessage = ref('')
const errorMessage = ref('')

// Watch for changes in selectedVocabulary and persist to localStorage
watch(selectedVocabulary, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedVocabulary', newValue)
  }
})

watch(selectedEvidence, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedEvidence', newValue)
  }
})

watch(selectedResults, (newValue) => {
  if (newValue) {
    localStorage.setItem('selectedResults', newValue)
  }
})

/**
 * Load data sources on mount
 */
onMounted(async () => {
  await loadDataSources()
})

/**
 * Load data sources from API
 */
async function loadDataSources() {
  try {
    const response = await fetch('/WebAPI/source/sources')

    if (!response.ok) {
      throw new Error('Failed to load data sources')
    }

    const sources = await response.json()

    // Load each source and fetch vocabulary version if it has vocabulary
    const sourcesWithVersions = await Promise.all(
      sources.map(async (s: any) => {
        const hasVocab = s.daimons?.some((d: any) => d.daimonType === 'Vocabulary') ?? false
        let vocabularyVersion = s.version

        // If source has vocabulary, try to fetch the vocabulary info
        if (hasVocab && s.sourceKey) {
          try {
            const vocabResponse = await fetch(`/WebAPI/vocabulary/${s.sourceKey}/info`)
            if (vocabResponse.ok) {
              const vocabData = await vocabResponse.json()
              vocabularyVersion = vocabData.version || s.version
            }
          } catch {
            // Fallback to source version if vocabulary info fetch fails
            vocabularyVersion = s.version
          }
        }

        return {
          sourceKey: s.sourceKey,
          sourceName: s.sourceName,
          sourceDialect: s.sourceDialect,
          version: s.version,
          vocabularyVersion,
          initialized: true,
          hasVocabulary: hasVocab,
          hasEvidence: s.daimons?.some((d: any) => d.daimonType === 'CEM') ?? false,
          hasResults: s.daimons?.some((d: any) => d.daimonType === 'Results') ?? false
        }
      })
    )

    dataSources.value = sourcesWithVersions

    // Set initial selections from localStorage or first available source
    const savedVocab = localStorage.getItem('selectedVocabulary')
    const savedEvidence = localStorage.getItem('selectedEvidence')
    const savedResults = localStorage.getItem('selectedResults')

    selectedVocabulary.value = savedVocab || dataSources.value.find(s => s.hasVocabulary)?.sourceKey || ''
    selectedEvidence.value = savedEvidence || dataSources.value.find(s => s.hasEvidence)?.sourceKey || ''
    selectedResults.value = savedResults || dataSources.value.find(s => s.hasResults)?.sourceKey || ''
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to load data sources'
    showErrorToast.value = true
  }
}

/**
 * Check source connection
 */
async function checkConnection(source: DataSource) {
  try {
    const response = await fetch(`/WebAPI/source/${source.sourceKey}/connectionCheck`)

    if (!response.ok) {
      throw new Error('Connection check failed')
    }

    toastMessage.value = `Connection to ${source.sourceName} successful`
    showToast.value = true
  } catch (error: any) {
    errorMessage.value = `Failed to connect to ${source.sourceName}`
    showErrorToast.value = true
  }
}

/**
 * Refresh source cache
 */
async function refreshCache(source: DataSource) {
  try {
    const response = await fetch(`/WebAPI/source/${source.sourceKey}/refreshSourceCache`, {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Cache refresh failed')
    }

    toastMessage.value = `Cache refresh started for ${source.sourceName}`
    showToast.value = true
  } catch (error: any) {
    errorMessage.value = `Failed to refresh cache for ${source.sourceName}`
    showErrorToast.value = true
  }
}

/**
 * Clear local storage cache
 */
function clearLocalCache() {
  localStorage.clear()
  toastMessage.value = 'Local cache cleared. Please refresh the page to reload configuration.'
  showToast.value = true
}

/**
 * Clear server cache
 */
async function clearServerCache() {
  if (!confirm('Are you sure you want to clear the server cache?')) {
    return
  }

  try {
    const response = await fetch('/WebAPI/cache/clear', {
      method: 'POST'
    })

    if (!response.ok) {
      throw new Error('Failed to clear server cache')
    }

    toastMessage.value = 'Server cache cleared successfully'
    showToast.value = true
  } catch (error: any) {
    errorMessage.value = error.message || 'Failed to clear server cache'
    showErrorToast.value = true
  }
}
</script>

<style scoped>
.data-sources-section {
  max-width: 1200px;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
