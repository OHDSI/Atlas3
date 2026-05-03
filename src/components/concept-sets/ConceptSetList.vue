<template>
  <v-card>
    <v-card-title>
      <div class="d-flex justify-space-between align-center">
        <span>{{ t('cs.browser.caption') }}</span>
        <AtlasButton
          icon="mdi-plus"
          data-testid="create-concept-set"
          @click="$emit('create')"
        >
          {{ t('components.conceptSetBuilder.newConceptSet') }}
        </AtlasButton>
      </div>
    </v-card-title>

    <v-card-text>
      <!-- Search Filter -->
      <AtlasTextField
        v-model="searchFilter"
        :label="tv('common.search')"
        prepend-icon="mdi-magnify"
        clearable
        data-testid="search-concept-sets"
        class="mb-4"
      />

      <!-- Concept Sets List -->
      <AtlasList
        v-if="filteredConceptSets.length > 0"
        data-testid="concept-set-list"
      >
        <AtlasListItem
          v-for="conceptSet in filteredConceptSets"
          :key="conceptSet.id"
          :title="conceptSet.name"
          :subtitle="
            tv('conceptSetList.subtitle', {
              id: conceptSet.id ?? 0,
              count: getConceptCount(conceptSet),
            })
          "
        >
          <template #append>
            <div class="d-flex gap-2">
              <AtlasIconButton
                icon="mdi-pencil"
                aria-label="Edit"
                variant="text"
                tone="primary"
                size="sm"
                :data-testid="`edit-concept-set-${conceptSet.id}`"
                @click="conceptSet.id && $emit('edit', conceptSet.id)"
              />
              <AtlasIconButton
                icon="mdi-delete"
                aria-label="Delete"
                variant="text"
                tone="danger"
                size="sm"
                :data-testid="`delete-concept-set-${conceptSet.id}`"
                @click="conceptSet.id && handleDelete(conceptSet.id)"
              />
            </div>
          </template>

          <!-- Concept Count Badge -->
          <template #prepend>
            <AtlasBadge
              :content="getConceptCount(conceptSet)"
              color="primary"
              :data-testid="`concept-count-${conceptSet.id}`"
            >
              <AtlasIcon>mdi-set-center</AtlasIcon>
            </AtlasBadge>
          </template>
        </AtlasListItem>
      </AtlasList>

      <!-- Empty State -->
      <AtlasAlert
        v-else
        severity="info"
        data-testid="empty-concept-sets"
      >
        <template v-if="searchFilter">
          {{ t('search.noResultsFoundFor', { query: searchFilter }) }}
        </template>
        <template v-else>
          {{ t('cohortDefinitions.noConceptSets') }}
        </template>
      </AtlasAlert>
    </v-card-text>

    <!-- Delete Confirmation Dialog -->
    <AtlasDialog
      v-model="showDeleteDialog"
      eyebrow="CONFIRM"
      :title="t('conceptSetList.confirmDeleteTitle').value"
      max-width="400"
      @close="showDeleteDialog = false"
    >
      {{ t('cs.manager.csDeleteConfirmMessage') }}
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showDeleteDialog = false"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="danger"
          @click="confirmDelete"
        >
          {{ t('common.delete') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasBadge, AtlasDialog, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasTextField } from '@/components/ui'
import { ref, computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { ConceptSet } from '@/models/concept-set.types'

const { t, tv } = useI18n()

interface Props {
  conceptSets: ConceptSet[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  create: []
  edit: [id: number | string]
  delete: [id: number | string]
}>()

const searchFilter = ref('')
const showDeleteDialog = ref(false)
const pendingDeleteId = ref<number | string | null>(null)

const filteredConceptSets = computed(() => {
  if (!searchFilter.value) {
    return props.conceptSets
  }

  const query = searchFilter.value.toLowerCase()
  return props.conceptSets.filter(
    cs => cs.name.toLowerCase().includes(query) || (cs.id?.toString() || '').includes(query)
  )
})

function getConceptCount(conceptSet: ConceptSet): number {
  return conceptSet.items?.length || 0
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
