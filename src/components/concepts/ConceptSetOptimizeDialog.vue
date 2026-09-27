<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('cs.manager.optimize', 'Optimize').value"
    :title="t('cs.manager.conceptSetOptimization', 'Concept Set Optimization').value"
    max-width="960"
    @update:model-value="emit('update:modelValue', $event)"
    @close="close"
  >
    <div
      v-if="state === 'loading'"
      class="d-flex align-center py-8"
      data-testid="cs-optimize-loading"
    >
      <AtlasProgressCircular
        indeterminate
        color="primary"
        size="28"
        class="mr-3"
      />
      <span>{{
        t(
          'cs.manager.attemptingToFindMessage',
          'Attempting to find an optimal definition for this concept set...'
        ).value
      }}</span>
    </div>

    <AtlasAlert
      v-else-if="state === 'error'"
      severity="danger"
      data-testid="cs-optimize-error"
    >
      {{ errorMessage }}
    </AtlasAlert>

    <p
      v-else-if="state === 'optimal'"
      data-testid="cs-optimize-optimal"
    >
      {{
        t(
          'cs.manager.fullyOptimizedMessage',
          'The current concept set definition is fully optimized.'
        ).value
      }}
    </p>

    <template v-else-if="state === 'result'">
      <p class="cs-optimize__intro">
        {{
          t(
            'cs.manager.pleaseReviewMessage',
            'Please review the optimized definition and options for saving.'
          ).value
        }}
      </p>

      <div
        v-if="naming"
        class="cs-optimize__naming"
      >
        <AtlasTextField
          v-model="newName"
          :label="
            t('cs.manager.pleaseProvideNameMessage', 'Please provide a name for your new concept set:')
              .value
          "
          :disabled="busy"
          data-testid="cs-optimize-new-name"
        />
      </div>

      <h3 class="cs-optimize__heading">
        {{ t('cs.manager.optimizedConceptSetHeading', 'Optimized Concept Set').value }}
        <AtlasChip
          size="sm"
          tone="primary"
        >
          {{ optimizedItems.length }}
        </AtlasChip>
      </h3>
      <AtlasDataTable
        :headers="headers"
        :items="optimizedItems"
        :items-per-page="10"
        :hide-default-footer="optimizedItems.length <= 10"
        data-testid="cs-optimize-optimized"
      >
        <template #item.includeDescendants="{ item }">
          <AtlasIcon
            v-if="item.includeDescendants"
            icon="mdi-check"
            size="18"
          />
        </template>
        <template #item.isExcluded="{ item }">
          <AtlasIcon
            v-if="item.isExcluded"
            icon="mdi-check"
            size="18"
          />
        </template>
      </AtlasDataTable>

      <h3 class="cs-optimize__heading">
        {{ t('cs.manager.conceptsRemovedHeading', 'Concepts Removed').value }}
        <AtlasChip
          size="sm"
          tone="danger"
        >
          {{ removedItems.length }}
        </AtlasChip>
      </h3>
      <p class="cs-optimize__hint">
        {{
          t(
            'cs.manager.conceptsRemovedMessage',
            'The following concepts were removed since the optimized version already includes them.'
          ).value
        }}
      </p>
      <AtlasDataTable
        :headers="headers"
        :items="removedItems"
        :items-per-page="10"
        :hide-default-footer="removedItems.length <= 10"
        data-testid="cs-optimize-removed"
      >
        <template #item.includeDescendants="{ item }">
          <AtlasIcon
            v-if="item.includeDescendants"
            icon="mdi-check"
            size="18"
          />
        </template>
        <template #item.isExcluded="{ item }">
          <AtlasIcon
            v-if="item.isExcluded"
            icon="mdi-check"
            size="18"
          />
        </template>
      </AtlasDataTable>
    </template>

    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="busy"
        @click="naming ? (naming = false) : close()"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <template v-if="state === 'error'">
        <AtlasButton @click="run">
          {{ t('common.retry', 'Retry').value }}
        </AtlasButton>
      </template>
      <template v-else-if="state === 'result'">
        <template v-if="naming">
          <AtlasButton
            :disabled="!newName.trim()"
            :loading="busy"
            data-testid="cs-optimize-save-new"
            @click="emit('create', { name: newName.trim(), items: optimizedItems })"
          >
            {{ t('cs.manager.saveButton', 'Save').value }}
          </AtlasButton>
        </template>
        <template v-else>
          <AtlasButton
            v-if="canCreateNew"
            variant="secondary"
            data-testid="cs-optimize-create"
            @click="startNaming"
          >
            {{ t('cs.manager.createOption', 'Create New Concept Set').value }}
          </AtlasButton>
          <AtlasButton
            data-testid="cs-optimize-overwrite"
            @click="emit('overwrite', optimizedItems)"
          >
            {{ t('cs.manager.overwriteOption', 'Overwrite Current Concept Set').value }}
          </AtlasButton>
        </template>
      </template>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { optimizeConceptSet } from '@/services/concept-set.service'
import type { ConceptSetItem } from '@/models/concept-set.types'
import { logger } from '@/utils/logger'
import {
  AtlasAlert,
  AtlasButton,
  AtlasChip,
  AtlasDataTable,
  AtlasDialog,
  AtlasIcon,
  AtlasProgressCircular,
  AtlasTextField,
} from '@/components/ui'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    items: ConceptSetItem[]
    sourceKey: string
    conceptSetName: string
    canCreateNew?: boolean
    busy?: boolean
  }>(),
  { canCreateNew: false, busy: false }
)

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  overwrite: [items: ConceptSetItem[]]
  create: [payload: { name: string; items: ConceptSetItem[] }]
}>()

const { t } = useI18n()

const state = ref<'loading' | 'error' | 'optimal' | 'result'>('loading')
const errorMessage = ref('')
const optimizedItems = ref<ConceptSetItem[]>([])
const removedItems = ref<ConceptSetItem[]>([])
const naming = ref(false)
const newName = ref('')
let runId = 0

const headers = computed(() => [
  { title: t('columns.conceptId', 'ID').value, key: 'conceptId', width: '100px' },
  { title: t('columns.conceptName', 'Name').value, key: 'conceptName' },
  { title: t('columns.domain', 'Domain').value, key: 'domainId', width: '120px' },
  { title: t('columns.vocabulary', 'Vocabulary').value, key: 'vocabularyId', width: '120px' },
  {
    title: t('columns.descendants', 'Desc.').value,
    key: 'includeDescendants',
    sortable: false,
    width: '72px',
  },
  { title: t('columns.exclude', 'Excl.').value, key: 'isExcluded', sortable: false, width: '64px' },
])

async function run() {
  const id = ++runId
  state.value = 'loading'
  naming.value = false
  try {
    const result = await optimizeConceptSet(props.sourceKey, props.items)
    if (id !== runId) return
    optimizedItems.value = result.optimizedItems
    removedItems.value = result.removedItems
    // Every original item survives unchanged only when nothing was removed.
    state.value = result.removedItems.length === 0 ? 'optimal' : 'result'
  } catch (err) {
    if (id !== runId) return
    logger.error('ConceptSetOptimizeDialog', 'Optimization failed', err)
    errorMessage.value = err instanceof Error ? err.message : String(err)
    state.value = 'error'
  }
}

function startNaming() {
  newName.value = `${props.conceptSetName} - OPTIMIZED`
  naming.value = true
}

function close() {
  runId++
  emit('update:modelValue', false)
}

watch(
  () => props.modelValue,
  open => {
    if (open) run()
  },
  { immediate: true }
)
</script>

<style scoped>
.cs-optimize__intro {
  margin: 0 0 12px;
}
.cs-optimize__heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  margin: 16px 0 8px;
}
.cs-optimize__hint {
  margin: 0 0 8px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.cs-optimize__naming {
  margin-bottom: 8px;
}
</style>
