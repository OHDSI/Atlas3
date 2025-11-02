<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center">
        <span>Concept Sets</span>
        <v-btn
          prepend-icon="mdi-plus"
          color="primary"
          data-testid="create-concept-set"
          @click="$emit('create')"
        >
          Create New
        </v-btn>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Search Filter -->
      <v-text-field
        v-model="searchFilter"
        label="Search Concept Sets"
        prepend-inner-icon="mdi-magnify"
        clearable
        density="compact"
        data-testid="search-concept-sets"
        class="mb-4"
      />

      <!-- Concept Sets List -->
      <v-list v-if="filteredConceptSets.length > 0" data-testid="concept-set-list">
        <v-list-item
          v-for="conceptSet in filteredConceptSets"
          :key="conceptSet.id"
          :title="conceptSet.name"
          :subtitle="`ID: ${conceptSet.id} | ${getConceptCount(conceptSet)} concepts`"
        >
          <template #append>
            <div class="d-flex gap-2">
              <v-btn
                icon="mdi-pencil"
                size="small"
                variant="text"
                color="primary"
                :data-testid="`edit-concept-set-${conceptSet.id}`"
                @click="$emit('edit', conceptSet.id)"
              />
              <v-btn
                icon="mdi-delete"
                size="small"
                variant="text"
                color="error"
                :data-testid="`delete-concept-set-${conceptSet.id}`"
                @click="handleDelete(conceptSet.id)"
              />
            </div>
          </template>

          <!-- Concept Count Badge -->
          <template #prepend>
            <v-badge
              :content="getConceptCount(conceptSet)"
              color="primary"
              :data-testid="`concept-count-${conceptSet.id}`"
            >
              <v-icon>mdi-set-center</v-icon>
            </v-badge>
          </template>
        </v-list-item>
      </v-list>

      <!-- Empty State -->
      <v-alert
        v-else
        type="info"
        variant="tonal"
        data-testid="empty-concept-sets"
      >
        <template v-if="searchFilter">
          No concept sets match "{{ searchFilter }}"
        </template>
        <template v-else>
          No concept sets created yet. Click "Create New" to get started.
        </template>
      </v-alert>
    </v-card-text>

    <!-- Delete Confirmation Dialog -->
    <v-dialog v-model="showDeleteDialog" max-width="400">
      <v-card>
        <v-card-title>Confirm Delete</v-card-title>
        <v-card-text>
          Are you sure you want to delete this concept set? This action cannot be undone.
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn variant="text" @click="showDeleteDialog = false">Cancel</v-btn>
          <v-btn color="error" variant="elevated" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import type { ConceptSet } from '@/models/concept-set.types'

interface Props {
  conceptSets: ConceptSet[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'create': []
  'edit': [id: number | string]
  'delete': [id: number | string]
}>()

const searchFilter = ref('')
const showDeleteDialog = ref(false)
const pendingDeleteId = ref<number | string | null>(null)

const filteredConceptSets = computed(() => {
  if (!searchFilter.value) {
    return props.conceptSets
  }

  const query = searchFilter.value.toLowerCase()
  return props.conceptSets.filter((cs) =>
    cs.name.toLowerCase().includes(query) ||
    cs.id.toString().includes(query)
  )
})

function getConceptCount(conceptSet: ConceptSet): number {
  return conceptSet.expression?.items?.length || 0
}

function handleDelete(id: number | string) {
  pendingDeleteId.value = id
  showDeleteDialog.value = true
}

function confirmDelete() {
  if (pendingDeleteId.value !== null) {
    emit('delete', pendingDeleteId.value)
    showDeleteDialog.value = false
    pendingDeleteId.value = null
  }
}
</script>
