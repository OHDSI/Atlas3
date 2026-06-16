<template>
  <div class="included-source-codes-table">
    <AtlasAlert
      v-if="store.sourceCodeError"
      severity="danger"
      variant="tonal"
      class="included-source-codes-table__error"
    >
      <div class="d-flex align-center">
        <span class="flex-grow-1">{{ store.sourceCodeError }}</span>
        <AtlasButton
          size="sm"
          variant="ghost"
          data-testid="source-codes-retry-btn"
          @click="store.resolveSourceCodes(props.sourceKey)"
        >
          {{ t('common.retry', 'Retry').value }}
        </AtlasButton>
      </div>
    </AtlasAlert>

    <AtlasCard
      v-if="store.sourceCodeLoading || store.sourceCodeItems.length > 0"
      padding="none"
    >
      <AtlasDataTable
        v-model:sort-by="sortBy"
        :headers="headers"
        :items="store.sourceCodeItems"
        :loading="store.sourceCodeLoading"
        :items-per-page="50"
        hover
        class="included-source-codes-table__table"
      >
        <template
          v-if="props.sourceKey"
          #item.conceptName="{ item }"
        >
          <a
            href="#"
            :data-testid="`source-code-name-link-${item.conceptId}`"
            class="concept-name-link"
            @click.prevent="onView(item)"
          >
            {{ item.conceptName }}
          </a>
        </template>

        <template
          v-else
          #item.conceptName="{ item }"
        >
          {{ item.conceptName }}
        </template>

        <template #item.domainId="{ item }">
          <AtlasChip
            v-if="item.domainId"
            :color="getDomainColor(item.domainId)"
            size="xs"
            variant="tonal"
          >
            {{ item.domainId }}
          </AtlasChip>
        </template>

        <template #item.vocabularyId="{ item }">
          <AtlasChip
            v-if="item.vocabularyId"
            size="xs"
            variant="outlined"
          >
            {{ item.vocabularyId }}
          </AtlasChip>
        </template>

        <template #loading>
          <AtlasSkeleton
            v-for="i in 5"
            :key="i"
            type="table-row"
            class="mx-2"
          />
        </template>
      </AtlasDataTable>
    </AtlasCard>

    <div
      v-else
      class="included-source-codes-table__empty"
    >
      <AtlasIcon
        icon="mdi-barcode-scan"
        size="36"
        class="included-source-codes-table__empty-icon"
      />
      <p class="included-source-codes-table__empty-text">
        {{ emptyMessage }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Concept } from '@/models/concept-set.types'
import { useConceptSetsStore } from '@/stores/concept-sets'
import {
  AtlasAlert,
  AtlasButton,
  AtlasCard,
  AtlasChip,
  AtlasDataTable,
  AtlasIcon,
  AtlasSkeleton,
} from '@/components/ui'
import { getDomainColor } from '@/utils/domain-colors'

const { t } = useI18n()
const store = useConceptSetsStore()

interface Props {
  active: boolean
  sourceKey?: string
}
const props = defineProps<Props>()

const emit = defineEmits<{
  'view-concept': [payload: { conceptId: number; sourceKey: string }]
}>()

const sortBy = ref([{ key: 'conceptId', order: 'asc' as const }])

const headers = [
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', sortable: true, width: '90px' },
  { title: t('columns.conceptCode', 'Code').value, key: 'conceptCode', sortable: true, width: '110px' },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName', sortable: true },
  { title: t('columns.class', 'Class').value, key: 'conceptClassId', sortable: true, width: '150px' },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', sortable: true, width: '120px' },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', sortable: true, width: '120px' },
]

// Signature of the included concept ids — re-resolve when it changes while active.
const includedSignature = computed(() =>
  store.includedItems.map((c) => c.conceptId).join(','),
)

const emptyMessage = computed(() => {
  if (store.includedItems.length === 0) {
    return t(
      'cs.manager.sourceCodesEmptyNoIncluded',
      'No source codes — add concepts to see their mapped source codes here.',
    ).value
  }
  return t(
    'cs.manager.sourceCodesEmpty',
    'No source codes map to the included concepts.',
  ).value
})

watch(
  () => [props.active, includedSignature.value, props.sourceKey] as const,
  ([active], prev) => {
    if (!active) return
    const [prevActive, prevSig, prevKey] = prev ?? [false, '', undefined]
    if (active !== prevActive || includedSignature.value !== prevSig || props.sourceKey !== prevKey) {
      void store.resolveSourceCodes(props.sourceKey)
    }
  },
  { immediate: true },
)

function onView(c: Concept) {
  emit('view-concept', { conceptId: c.conceptId, sourceKey: props.sourceKey! })
}
</script>

<style scoped>
.included-source-codes-table {
  width: 100%;
}

.included-source-codes-table__error {
  margin-bottom: 12px;
}

.included-source-codes-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 24px;
  border-radius: 12px;
  background: rgb(var(--v-theme-surface-variant));
}

.included-source-codes-table__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
}

.included-source-codes-table__empty-text {
  margin: 0;
  font-size: 14px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  max-width: 480px;
}

.concept-name-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.concept-name-link:hover {
  text-decoration: underline;
}
</style>
