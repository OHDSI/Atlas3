<template>
  <AtlasDialog
    :model-value="modelValue"
    :eyebrow="t('reusables.insert.eyebrow').value"
    :title="selected ? selected.name : t('reusables.insert.title').value"
    max-width="900"
    data-testid="reusable-insert-dialog"
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('update:modelValue', false)"
  >
    <!-- Step 1: pick a reusable of the matching type -->
    <div v-if="!selected">
      <p class="text-body-2 text-medium-emphasis mb-3">
        {{ typeHelp }}
      </p>
      <AtlasTextField
        v-model="search"
        :placeholder="t('reusables.insert.search').value"
        prepend-inner-icon="mdi-magnify"
        hide-details
        clearable
        class="mb-3"
        data-testid="reusable-insert-search"
      />
      <AtlasAlert
        v-if="loadError"
        severity="danger"
        density="compact"
        class="mb-3"
      >
        {{ loadError }}
      </AtlasAlert>
      <AtlasDataTable
        :headers="headers"
        :items="visibleReusables"
        :loading="loading"
        :items-per-page="10"
        :no-data-text="t('reusables.insert.empty').value"
        data-testid="reusable-insert-table"
      >
        <template #item.name="{ item }">
          <button
            type="button"
            class="reusable-insert__link"
            :data-testid="`reusable-insert-pick-${(item as Reusable).id}`"
            @click="pick(item as ListedReusable)"
          >
            {{ (item as Reusable).name }}
          </button>
        </template>
        <template #item.createdBy="{ item }">
          {{ authorName((item as Reusable).createdBy) }}
        </template>
        <template #item.modifiedDate="{ item }">
          {{ formatDate((item as Reusable).modifiedDate ?? (item as Reusable).createdDate) }}
        </template>
      </AtlasDataTable>
    </div>

    <!-- Step 2: bind parameters, then insert -->
    <div
      v-else
      data-testid="reusable-insert-selected"
    >
      <p
        v-if="selected.description"
        class="text-body-2 mb-4"
      >
        {{ selected.description }}
      </p>

      <template v-if="selectedDesign && selectedDesign.parameters.length > 0">
        <h4 class="text-subtitle-2 mb-1">
          {{ t('reusables.insert.parametersTitle') }}
        </h4>
        <p class="text-body-2 text-medium-emphasis mb-3">
          {{ t('reusables.insert.parametersHelp') }}
        </p>
        <div
          v-for="parameter in selectedDesign.parameters"
          :key="parameter.id"
          class="reusable-insert__parameter"
          :data-testid="`reusable-insert-parameter-${parameter.id}`"
        >
          <span class="reusable-insert__parameter-name">{{ parameter.name }}</span>
          <AtlasChip
            :tone="bindingLabels[parameter.id] ? 'primary' : 'neutral'"
            size="sm"
            :data-testid="`reusable-insert-parameter-${parameter.id}-value`"
          >
            {{ bindingLabels[parameter.id] ?? t('reusables.insert.anyConcept').value }}
          </AtlasChip>
          <AtlasSpacer />
          <AtlasButton
            variant="ghost"
            size="sm"
            :loading="bindingParameterId === parameter.id && resolvingBinding"
            :data-testid="`reusable-insert-parameter-${parameter.id}-choose`"
            @click="chooseConceptSet(parameter.id)"
          >
            {{ t('reusables.insert.chooseConceptSet') }}
          </AtlasButton>
          <AtlasIconButton
            v-if="bindings[parameter.id]"
            icon="mdi-close"
            size="sm"
            variant="text"
            :aria-label="t('reusables.insert.clearParameter').value"
            :data-testid="`reusable-insert-parameter-${parameter.id}-clear`"
            @click="clearBinding(parameter.id)"
          />
        </div>
      </template>
      <AtlasAlert
        v-if="selectedDesign"
        :tone="insertsByReference ? 'severity' : 'neutral'"
        density="compact"
        class="mt-3"
        data-testid="reusable-insert-mode"
      >
        {{ insertModeText }}
      </AtlasAlert>
    </div>

    <template #actions>
      <AtlasButton
        v-if="selected"
        variant="ghost"
        data-testid="reusable-insert-back"
        @click="selected = null"
      >
        {{ t('common.back') }}
      </AtlasButton>
      <AtlasSpacer />
      <AtlasButton
        variant="ghost"
        @click="emit('update:modelValue', false)"
      >
        {{ t('common.cancel') }}
      </AtlasButton>
      <AtlasButton
        variant="primary"
        :disabled="!selectedDesign || resolvingBinding"
        :loading="inserting"
        data-testid="reusable-insert-confirm"
        @click="confirm"
      >
        {{ t('reusables.insert.confirm') }}
      </AtlasButton>
    </template>
  </AtlasDialog>

  <ConceptSetSelectionDialog
    v-model="conceptSetPickerOpen"
    :local-concept-sets="localConceptSets"
    @local-concept-set-selected="onLocalConceptSetSelected"
    @concept-set-selected="onRepositoryConceptSetSelected"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  AtlasAlert,
  AtlasButton,
  AtlasChip,
  AtlasDataTable,
  AtlasDialog,
  AtlasIconButton,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import { useI18n } from '@/composables/useI18n'
import { useNotifications } from '@/stores/notifications'
import { listReusables } from '@/services/reusable.service'
import { getConceptSetById } from '@/services/concept-set.service'
import { convertAtlasItemToCirce } from '@/components/cohort-editor/atlas-concept-set'
import { formatDateTime } from '@/utils/format'
import { matchesTerms } from '@/utils/list-filters'
import type { ConceptSet } from '@/models/circe-types'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { Reusable, ReusableDesign, ReusableType } from '@/models/reusable.types'
import {
  canInsertByReference,
  canInsertIntoGroup,
  instantiateReusable,
  parseReusableDesign,
  type ParameterBinding,
  type ReusableInstance,
} from './reusable-design'
import { referenceFor } from './reusable-reference'
import { reusableAuthorName } from './reusable-display'

const props = defineProps<{
  modelValue: boolean
  type: ReusableType
  hostConceptSets: ConceptSet[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  insert: [instance: ReusableInstance]
}>()

const { t, tv } = useI18n()
const notify = useNotifications()

type ListedReusable = Reusable & { design: ReusableDesign }

const reusables = ref<ListedReusable[]>([])
const loading = ref(false)
const loadError = ref<string | null>(null)
const search = ref('')
const selected = ref<ListedReusable | null>(null)
const bindings = reactive<Record<number, ParameterBinding | undefined>>({})
const bindingLabels = reactive<Record<number, string | undefined>>({})
const conceptSetPickerOpen = ref(false)
const bindingParameterId = ref<number | null>(null)
const resolvingBinding = ref(false)

const selectedDesign = computed(() => selected.value?.design ?? null)
const inserting = ref(false)

const insertsByReference = computed(
  () => !!selectedDesign.value && canInsertByReference(selectedDesign.value)
)

const insertModeText = computed(() => {
  const design = selectedDesign.value
  if (!design) return ''
  if (insertsByReference.value) return t('reusables.insert.byReference').value
  if (design.parameters.length > 0) return t('reusables.insert.copyParameters').value
  return t('reusables.insert.copyEventList').value
})

const typeHelp = computed(() =>
  props.type === 'INITIAL_EVENT'
    ? t('reusables.insert.helpInitialEvent').value
    : t('reusables.insert.helpCriteriaGroup').value
)

const headers = computed(() => [
  { title: t('columns.id').value, key: 'id' },
  { title: t('columns.name').value, key: 'name' },
  { title: t('columns.author').value, key: 'createdBy', sortable: false },
  { title: t('columns.updated').value, key: 'modifiedDate' },
])

const visibleReusables = computed(() =>
  reusables.value.filter(
    r => !search.value || matchesTerms([r.name, r.description, String(r.id ?? '')], search.value)
  )
)

const localConceptSets = computed<ConceptSetReference[]>(() =>
  props.hostConceptSets
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({ id: cs.id, name: cs.name ?? '', items: cs.expression?.items ?? [] }))
)

function authorName(createdBy: Reusable['createdBy']): string {
  return reusableAuthorName(createdBy)
}

function formatDate(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  const date = new Date(value)
  return isNaN(date.getTime()) ? '—' : formatDateTime(date)
}

async function load() {
  loading.value = true
  loadError.value = null
  const result = await listReusables()
  loading.value = false
  if (!result.success) {
    loadError.value = result.error.message
    return
  }
  // A criteria group also takes a single event from an Initial/Censoring Event
  // reusable, as one of its criteria.
  reusables.value = result.data
    .map(r => ({ ...r, design: parseReusableDesign(r.data) }))
    .filter(r =>
      props.type === 'CRITERIA_GROUP' ? canInsertIntoGroup(r.design) : r.design.type === props.type
    )
}

function pick(reusable: ListedReusable) {
  selected.value = reusable
  for (const key of Object.keys(bindings)) {
    delete bindings[Number(key)]
    delete bindingLabels[Number(key)]
  }
}

function chooseConceptSet(parameterId: number) {
  bindingParameterId.value = parameterId
  conceptSetPickerOpen.value = true
}

function clearBinding(parameterId: number) {
  delete bindings[parameterId]
  delete bindingLabels[parameterId]
}

function onLocalConceptSetSelected(conceptSet: ConceptSetReference) {
  conceptSetPickerOpen.value = false
  const parameterId = bindingParameterId.value
  const id = typeof conceptSet.id === 'string' ? Number(conceptSet.id) : conceptSet.id
  if (parameterId === null || !Number.isFinite(id)) return
  bindings[parameterId] = { kind: 'existing', id }
  bindingLabels[parameterId] = conceptSet.name
}

async function onRepositoryConceptSetSelected(conceptSet: { id: number | string; name: string }) {
  conceptSetPickerOpen.value = false
  const parameterId = bindingParameterId.value
  if (parameterId === null) return
  resolvingBinding.value = true
  const full = await getConceptSetById(conceptSet.id)
  resolvingBinding.value = false
  if (!full) {
    notify.danger(tv('components.cohortBuilder.conceptSetLoadFailed', { name: conceptSet.name }))
    return
  }
  bindings[parameterId] = {
    kind: 'new',
    conceptSet: {
      name: full.name ?? conceptSet.name,
      expression: { items: (full.items ?? []).map(convertAtlasItemToCirce) },
    },
  }
  bindingLabels[parameterId] = full.name ?? conceptSet.name
}

async function confirm() {
  const design = selectedDesign.value
  if (!design || !selected.value) return
  let reference
  if (canInsertByReference(design)) {
    inserting.value = true
    reference = await referenceFor(selected.value)
    inserting.value = false
  }
  emit(
    'insert',
    instantiateReusable(design, props.hostConceptSets, { ...bindings }, { reference })
  )
  emit('update:modelValue', false)
}

onMounted(load)
</script>

<style scoped>
.reusable-insert__link {
  color: rgb(var(--v-theme-primary));
  text-align: left;
  cursor: pointer;
}

.reusable-insert__link:hover {
  text-decoration: underline;
}

.reusable-insert__parameter {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--atlas-color-outline-subtle, rgba(0, 0, 0, 0.08));
}

.reusable-insert__parameter-name {
  font-weight: 500;
  min-width: 140px;
}
</style>
