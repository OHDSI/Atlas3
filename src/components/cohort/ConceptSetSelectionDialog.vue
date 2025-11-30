<template>
  <v-navigation-drawer
    :model-value="modelValue"
    location="right"
    temporary
    :width="drawerWidth"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <v-card
      flat
      class="h-100 d-flex flex-column"
    >
      <!-- Header -->
      <v-card-title class="d-flex align-center bg-primary pa-4">
        <span class="text-h6">{{ t('components.conceptSetBuilder.selectConceptSet', 'Select Concept Set') }}</span>
        <v-spacer />
        <v-btn
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>

      <!-- Content -->
      <v-card-text class="flex-grow-1 overflow-y-auto pa-6">
        <!-- Search -->
        <v-text-field
          v-model="searchTerm"
          :placeholder="tv('datatable.language.searchPlaceholder')"
          prepend-inner-icon="mdi-magnify"
          clearable
          variant="outlined"
          density="comfortable"
          hide-details
          class="mb-4"
        />

        <!-- Loading -->
        <v-progress-linear
          v-if="loading"
          indeterminate
          class="mb-2"
        />

        <!-- Empty State -->
        <div
          v-if="!loading && filteredSets.length === 0"
          class="text-center py-8"
        >
          <v-icon
            size="64"
            color="grey-lighten-1"
            class="mb-4"
          >
            mdi-book-open-variant
          </v-icon>
          <p class="text-body-1 text-medium-emphasis">
            {{ searchTerm ? t('cs.manager.search.noResults') : t('cs.manager.noConceptSets') }}
          </p>
          <v-btn
            color="primary"
            variant="outlined"
            class="mt-4"
            @click="onCreateNew"
          >
            <v-icon start>
              mdi-plus
            </v-icon>
            {{ t('cs.manager.new') }}
          </v-btn>
        </div>

        <!-- Concept Sets List -->
        <v-list
          v-else
          class="border rounded"
        >
          <v-list-item
            v-for="conceptSet in paginatedSets"
            :key="conceptSet.id"
            @click="selectConceptSet(conceptSet)"
          >
            <template #prepend>
              <v-avatar
                color="primary"
                size="40"
              >
                <v-icon>mdi-book-open-variant</v-icon>
              </v-avatar>
            </template>

            <v-list-item-title class="font-weight-medium">
              {{ conceptSet.name }}
            </v-list-item-title>
            <v-list-item-subtitle>
              {{ t('components.conceptSetBuilder.conceptSet', 'Concept Set') }}
            </v-list-item-subtitle>

            <template #append>
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                @click.stop="onEditClick(conceptSet)"
              />
              <v-icon>mdi-chevron-right</v-icon>
            </template>
          </v-list-item>
        </v-list>

        <!-- Pagination -->
        <div
          v-if="!loading && filteredSets.length > itemsPerPage"
          class="mt-4 d-flex align-center justify-space-between"
        >
          <div class="text-caption text-medium-emphasis">
            {{ t('datatable.pagination.showing', { 
              from: ((page - 1) * itemsPerPage) + 1, 
              to: Math.min(page * itemsPerPage, filteredSets.length), 
              total: filteredSets.length 
            }) }}
          </div>
          <v-pagination
            v-model="page"
            :length="totalPages"
            :total-visible="5"
            size="small"
          />
        </div>
      </v-card-text>

      <!-- Actions -->
      <v-card-actions class="pa-4 border-t">
        <v-btn
          color="primary"
          variant="outlined"
          @click="onCreateNew"
        >
          <v-icon start>
            mdi-plus
          </v-icon>
          {{ t('common.create') }}
        </v-btn>
        <v-spacer />
        <v-btn
          variant="text"
          @click="close"
        >
          {{ t('common.close') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-navigation-drawer>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSetListItem } from '@/models/concept-set.types'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const { t, tv } = useI18n()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'concept-set-selected': [conceptSet: ConceptSetListItem]
  'edit-concept-set': [conceptSet: ConceptSetListItem]
  'create-new': []
}>()

const conceptSetsStore = useConceptSetsStore()
const searchTerm = ref('')
const loading = computed(() => conceptSetsStore.loading)
const page = ref(1)
const itemsPerPage = ref(50)

// Fixed width to match ConceptSetEditor (85% of viewport)
const drawerWidth = computed(() => {
  return Math.min(window.innerWidth * 0.85, 1400)
})

// Filter concept sets based on search term
const filteredSets = computed(() => {
  const sets = conceptSetsStore.conceptSets
  if (!searchTerm.value) {
    return sets
  }

  const term = searchTerm.value.toLowerCase()
  return sets.filter((set) =>
    set.name.toLowerCase().includes(term)
  )
})

// Paginated sets to prevent rendering thousands of items
const paginatedSets = computed(() => {
  const start = (page.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredSets.value.slice(start, end)
})

const totalPages = computed(() => 
  Math.ceil(filteredSets.value.length / itemsPerPage.value)
)

// Watch for dialog opening to refresh data
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen && conceptSetsStore.conceptSets.length === 0) {
    await conceptSetsStore.fetchAll()
  }
})

// Reset page when search changes
watch(searchTerm, () => {
  page.value = 1
})

function selectConceptSet(conceptSet: ConceptSetListItem) {
  emit('concept-set-selected', conceptSet)
  close()
}

function onEditClick(conceptSet: ConceptSetListItem) {
  emit('edit-concept-set', conceptSet)
}

function onCreateNew() {
  emit('create-new')
}

function close() {
  emit('update:modelValue', false)
  searchTerm.value = ''
}
</script>

<style scoped>
.border-t {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
