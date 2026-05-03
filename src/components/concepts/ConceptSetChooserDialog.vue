<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('cs.browser.compare.compare', 'Compare').value"
    :title="dialogTitle"
    :close-label="t('common.close', 'Close').value"
    max-width="720"
    @update:model-value="onDialogUpdate"
    @close="onCancel"
  >
    <v-progress-linear
      v-if="store.loading"
      indeterminate
      color="primary"
    />

    <div class="chooser-body">
      <v-text-field
        v-model="searchTerm"
        :placeholder="t('common.search', 'Search…').value"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="comfortable"
        hide-details
        clearable
        data-testid="chooser-search"
        class="mb-3"
      />

      <div
        v-if="filteredRows.length === 0 && !store.loading"
        class="chooser-empty"
        data-testid="chooser-empty"
      >
        {{ t('cs.browser.compare.noMatches', 'No concept sets match').value }}
      </div>

      <v-data-table
        v-else-if="filteredRows.length > 0"
        :headers="headers"
        :items="filteredRows"
        :items-per-page="10"
        density="compact"
        hover
        class="chooser-table"
      >
        <template #item="{ item }">
          <tr :data-testid="`chooser-row-${item.id}`">
            <td>{{ item.id }}</td>
            <td>{{ item.name }}</td>
            <td>{{ getAuthorName(item.createdBy) }}</td>
            <td class="text-right">
              <v-btn
                size="small"
                variant="flat"
                color="primary"
                :data-testid="`chooser-select-${item.id}`"
                @click="onSelect(item.id)"
              >
                {{ t('common.select', 'Select').value }}
              </v-btn>
            </td>
          </tr>
        </template>
      </v-data-table>
    </div>

    <template #actions>
      <v-btn
        variant="text"
        data-testid="chooser-cancel"
        @click="onCancel"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </v-btn>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import type { ConceptSetListItem } from '@/models/concept-set.types'
import { AtlasDialog } from '@/components/ui'

interface Props {
  modelValue: boolean
  excludeId?: number | string
  title?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  select: [conceptSetId: number]
}>()

const { t } = useI18n()
const store = useConceptSetsStore()

const searchTerm = ref<string>('')

const dialogTitle = computed(
  () => props.title ?? t('cs.browser.compare.modalTitle', 'Choose a concept set').value
)

const headers = [
  { title: t('columns.id', 'ID').value, key: 'id', sortable: true, width: '90px' },
  { title: t('columns.name', 'Name').value, key: 'name', sortable: true },
  { title: t('columns.author', 'Author').value, key: 'createdBy', sortable: true, width: '160px' },
  { title: '', key: 'actions', sortable: false, width: '110px', align: 'end' as const },
]

const filteredRows = computed<ConceptSetListItem[]>(() => {
  const term = searchTerm.value?.toLowerCase().trim() ?? ''
  return store.conceptSets.filter(row => {
    if (props.excludeId !== undefined && row.id === props.excludeId) return false
    if (!term) return true
    return row.name.toLowerCase().includes(term)
  })
})

watch(
  () => props.modelValue,
  open => {
    if (open && store.conceptSets.length === 0 && !store.loading) {
      void store.fetchAll()
    }
    if (open) {
      searchTerm.value = ''
    }
  },
  { immediate: true }
)

function getAuthorName(
  author: string | { id: number; name: string | null; login: string } | undefined
): string {
  if (!author) return ''
  if (typeof author === 'string') return author
  return author.login || author.name || ''
}

function onDialogUpdate(value: boolean) {
  emit('update:modelValue', value)
}

function onCancel() {
  emit('update:modelValue', false)
}

function onSelect(id: number | string | undefined) {
  if (typeof id !== 'number') return
  emit('select', id)
  emit('update:modelValue', false)
}
</script>

<style scoped>
.chooser-body {
  padding-top: 12px;
}

.chooser-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 16px;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.chooser-table {
  background: transparent;
}
</style>
