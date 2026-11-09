<!--
  Reusable design editor: the reusable's type, its concept-set parameters,
  its own concept sets, and the logic itself (a criteria group, or a list of
  initial/censoring events). Mutates `design` in place, like the other circe
  editors do with their expressions.
-->
<template>
  <div
    class="reusable-design"
    :inert="readonly || undefined"
    data-testid="reusable-design"
  >
    <!-- Type -->
    <section class="reusable-design__section">
      <h3 class="reusable-design__title">
        {{ t('reusables.design.typeTitle') }}
      </h3>
      <p class="text-body-2 text-medium-emphasis mb-1">
        {{ t('reusables.design.typeHelpInitialEvent') }}
      </p>
      <p class="text-body-2 text-medium-emphasis mb-3">
        {{ t('reusables.design.typeHelpCriteriaGroup') }}
      </p>
      <v-btn-toggle
        :model-value="design.type"
        mandatory
        density="compact"
        variant="outlined"
        divided
        data-testid="reusable-design-type"
        @update:model-value="design.type = $event"
      >
        <AtlasButton
          value="CRITERIA_GROUP"
          data-testid="reusable-design-type-criteria-group"
        >
          {{ t('reusables.types.CRITERIA_GROUP') }}
        </AtlasButton>
        <AtlasButton
          value="INITIAL_EVENT"
          data-testid="reusable-design-type-initial-event"
        >
          {{ t('reusables.types.INITIAL_EVENT') }}
        </AtlasButton>
      </v-btn-toggle>
      <p class="text-caption text-medium-emphasis mt-2">
        {{ t('reusables.design.typeSwitchNote') }}
      </p>
    </section>

    <!-- Parameters -->
    <section class="reusable-design__section">
      <div class="reusable-design__section-header">
        <h3 class="reusable-design__title">
          {{ t('reusables.design.parametersTitle') }}
        </h3>
        <AtlasButton
          variant="secondary"
          size="sm"
          prepend-icon="mdi-plus"
          data-testid="reusable-design-add-parameter"
          @click="addParameter"
        >
          {{ t('reusables.design.newParameter') }}
        </AtlasButton>
      </div>
      <p class="text-body-2 text-medium-emphasis mb-3">
        {{ t('reusables.design.parametersHelp') }}
      </p>
      <p
        v-if="design.parameters.length === 0"
        class="text-body-2"
        data-testid="reusable-design-no-parameters"
      >
        {{ t('reusables.design.noParameters') }}
      </p>
      <div
        v-for="parameter in design.parameters"
        :key="parameter.id"
        class="reusable-design__row"
        :data-testid="`reusable-design-parameter-${parameter.id}`"
      >
        <AtlasTextField
          :model-value="parameter.name"
          :label="t('columns.name').value"
          density="compact"
          hide-details
          class="reusable-design__row-name"
          :data-testid="`reusable-design-parameter-${parameter.id}-name`"
          @update:model-value="renameParameter(parameter, String($event ?? ''))"
        />
        <AtlasIconButton
          icon="mdi-delete-outline"
          size="sm"
          variant="text"
          tone="danger"
          :aria-label="t('common.delete').value"
          :data-testid="`reusable-design-parameter-${parameter.id}-remove`"
          @click="removeParameter(design, parameter.id)"
        />
      </div>
    </section>

    <!-- The reusable's own concept sets -->
    <section
      v-if="design.conceptSets.length > 0"
      class="reusable-design__section"
    >
      <h3 class="reusable-design__title">
        {{ t('reusables.design.conceptSetsTitle') }}
      </h3>
      <div
        v-for="conceptSet in design.conceptSets"
        :key="String(conceptSet.id)"
        class="reusable-design__row"
        :data-testid="`reusable-design-concept-set-${conceptSet.id}`"
      >
        <span class="reusable-design__row-name">{{ conceptSet.name }}</span>
        <span class="text-caption text-medium-emphasis">
          {{ t('reusables.design.conceptCount', { count: conceptSet.expression?.items?.length ?? 0 }) }}
        </span>
        <AtlasIconButton
          icon="mdi-pencil-outline"
          size="sm"
          variant="text"
          :aria-label="t('common.edit').value"
          @click="editConceptSet(conceptSet)"
        />
        <AtlasIconButton
          icon="mdi-delete-outline"
          size="sm"
          variant="text"
          tone="danger"
          :aria-label="t('common.delete').value"
          :data-testid="`reusable-design-concept-set-${conceptSet.id}-remove`"
          @click="typeof conceptSet.id === 'number' && removeConceptSet(design, conceptSet.id)"
        />
      </div>
    </section>

    <!-- Logic -->
    <section class="reusable-design__section">
      <h3 class="reusable-design__title">
        {{ t('reusables.design.expressionTitle') }}
      </h3>

      <CriteriaGroup
        v-if="design.type === 'CRITERIA_GROUP'"
        :group="design.criteriaGroupExpression"
        :concept-sets="conceptSetOptions"
        data-testid="reusable-design-criteria-group"
        @remove="clearCriteriaGroup"
        @select-concept-set="selectConceptSet"
        @edit-concept-set="editConceptSetFromTarget"
      />

      <div
        v-else
        data-testid="reusable-design-events"
      >
        <AtlasMenu>
          <template #activator="{ props: menuProps }">
            <AtlasButton
              v-bind="menuProps"
              variant="secondary"
              size="sm"
              prepend-icon="mdi-plus"
              data-testid="reusable-design-add-event"
            >
              {{ t('reusables.design.addEvent') }}
            </AtlasButton>
          </template>
          <AtlasList density="compact">
            <AtlasListItem
              v-for="option in criteriaTypeOptions"
              :key="option.key"
              :title="option.title"
              @click="addEvent(option.key)"
            />
          </AtlasList>
        </AtlasMenu>

        <AtlasAlert
          v-if="events.length === 0"
          variant="tonal"
          density="compact"
          class="mt-3"
        >
          {{ t('reusables.design.noEvents') }}
        </AtlasAlert>

        <CriteriaRenderer
          v-for="criteria in events"
          :key="getObjectKey(criteria)"
          :criteria="criteria"
          :concept-sets="conceptSetOptions"
          class="mt-3"
          @remove="removeEvent(criteria)"
          @select-concept-set="selectConceptSet"
          @edit-concept-set="editConceptSetFromTarget"
        />
      </div>
    </section>

    <!-- Parameter or concept set? Asked first whenever parameters exist. -->
    <AtlasDialog
      v-model="parameterPickerOpen"
      :title="t('reusables.design.assignTitle').value"
      max-width="480"
      data-testid="reusable-design-assign-dialog"
      @close="cancelAssign"
    >
      <p class="text-body-2 mb-3">
        {{ t('reusables.design.assignHelp') }}
      </p>
      <AtlasList density="compact">
        <AtlasListItem
          v-for="parameter in design.parameters"
          :key="parameter.id"
          :title="parameter.name"
          prepend-icon="mdi-variable"
          :data-testid="`reusable-design-assign-parameter-${parameter.id}`"
          @click="assignParameter(parameter.id)"
        />
      </AtlasList>
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="cancelAssign"
        >
          {{ t('common.cancel') }}
        </AtlasButton>
        <AtlasButton
          variant="secondary"
          data-testid="reusable-design-assign-concept-set"
          @click="assignConceptSet"
        >
          {{ t('reusables.design.assignConceptSet') }}
        </AtlasButton>
      </template>
    </AtlasDialog>

    <ConceptSetSelectionDialog
      v-model="pickerOpen"
      :local-concept-sets="localConceptSets"
      @local-concept-set-selected="onLocalConceptSetSelected"
      @concept-set-selected="onConceptSetSelected"
      @create-new="createConceptSet"
    />
    <ConceptSearchDialog
      v-model="conceptSearchOpen"
      :domain-filter="conceptSearchDomainFilter"
      @concepts-selected="onConceptsSelected"
    />
    <ConceptSetEditor
      v-if="conceptSetsStore.editorOpen"
      :model-value="conceptSetsStore.editorOpen"
      :concept-set="conceptSetsStore.currentSet"
      embedded
      @update:model-value="
        value => {
          if (!value) {
            conceptSetsStore.closeEditor()
            cancelSelection()
          }
        }
      "
      @apply="onConceptSetApplied"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  AtlasAlert,
  AtlasButton,
  AtlasDialog,
  AtlasIconButton,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasTextField,
} from '@/components/ui'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
import ConceptSetSelectionDialog from '@/components/cohort/ConceptSetSelectionDialog.vue'
import ConceptSearchDialog from '@/components/cohort/ConceptSearchDialog.vue'
import ConceptSetEditor from '@/components/concepts/ConceptSetEditor.vue'
import { CRITERIA_TYPE_BY_KEY, EDITABLE_CRITERIA_TYPES, type EditableCriteriaKey } from '@/components/circe/criteria/criteria-registry'
import { createObjectKeyGenerator } from '@/components/circe/criteria/criteria-editor-helper'
import type { ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'
import {
  convertAtlasItemToCirce,
  convertCirceItemToAtlas,
  type AtlasConceptSetItem,
} from '@/components/cohort-editor/atlas-concept-set'
import { useCirceConceptSetPicker } from '@/composables/useCirceConceptSetPicker'
import { useCriteriaConceptSearch } from '@/composables/useCriteriaConceptSearch'
import { useI18n } from '@/composables/useI18n'
import { useConceptSetsStore } from '@/stores/concept-sets'
import { useNotifications } from '@/stores/notifications'
import type { ConceptSet, Criteria } from '@/models/circe-types'
import type { ConceptSetReference } from '@/models/cohort.types'
import type { ConceptSetItem as ConceptSetEditorItem } from '@/models/concept-set.types'
import type { ReusableDesign } from '@/models/reusable.types'
import { nextConceptSetId } from '@/utils/concept-set-id'
import {
  createParameter,
  parameterConceptSetId,
  removeConceptSet,
  removeParameter,
  renameParameter,
} from './reusable-design'

const props = withDefaults(
  defineProps<{
    design: ReusableDesign
    readonly?: boolean
  }>(),
  { readonly: false }
)

const { t, tv } = useI18n()
const notify = useNotifications()
const conceptSetsStore = useConceptSetsStore()
const getObjectKey = createObjectKeyGenerator()
const { conceptSearchOpen, conceptSearchDomainFilter, onConceptsSelected } = useCriteriaConceptSearch()

// Criteria list the parameters alongside the reusable's own concept sets, so
// a criterion pointing at a parameter shows the parameter's name.
const {
  pickerOpen,
  conceptSetOptions,
  onSelectConceptSet,
  onLocalConceptSetSelected,
  onConceptSetSelected,
  hideSelectionDialog,
  resolveSelection,
  cancelSelection,
} = useCirceConceptSetPicker({
  getConceptSets: () => [...props.design.conceptSets, ...props.design.parameters.map(p => p.data)],
  addConceptSet: conceptSet => props.design.conceptSets.push(conceptSet),
})

const localConceptSets = computed<ConceptSetReference[]>(() =>
  props.design.conceptSets
    .filter((cs): cs is ConceptSet & { id: number } => typeof cs.id === 'number')
    .map(cs => ({ id: cs.id, name: cs.name ?? '', items: cs.expression?.items ?? [] }))
)

const criteriaTypeOptions = computed(() =>
  EDITABLE_CRITERIA_TYPES.map(type => ({ key: type.key, title: t(type.i18nKey, type.label).value }))
)

const events = computed(() => props.design.initialEventExpression.CriteriaList ?? [])

function addParameter() {
  props.design.parameters.push(createParameter(props.design.parameters))
}

function addEvent(type: EditableCriteriaKey) {
  if (!props.design.initialEventExpression.CriteriaList) {
    props.design.initialEventExpression.CriteriaList = []
  }
  props.design.initialEventExpression.CriteriaList.push(CRITERIA_TYPE_BY_KEY[type].create())
}

function removeEvent(criteria: Criteria) {
  const list = props.design.initialEventExpression.CriteriaList
  const index = list?.indexOf(criteria) ?? -1
  if (list && index !== -1) list.splice(index, 1)
}

function clearCriteriaGroup() {
  props.design.criteriaGroupExpression = {
    Type: 'ALL',
    CriteriaList: [],
    DemographicCriteriaList: [],
    Groups: [],
  }
}

// Selecting a concept set for a criterion: offer the parameters first when
// there are any, and fall through to the usual concept set picker otherwise.
const parameterPickerOpen = ref(false)

function selectConceptSet(target: ConceptSetSelectionTarget | undefined) {
  onSelectConceptSet(target)
  if (target && props.design.parameters.length > 0) {
    hideSelectionDialog()
    parameterPickerOpen.value = true
  }
}

function assignParameter(parameterId: number) {
  parameterPickerOpen.value = false
  resolveSelection(parameterConceptSetId(parameterId))
}

function assignConceptSet() {
  parameterPickerOpen.value = false
  pickerOpen.value = true
}

function cancelAssign() {
  parameterPickerOpen.value = false
  cancelSelection()
}

function editConceptSetFromTarget(target: ConceptSetSelectionTarget | undefined) {
  const id = target?.targetRef.value
  if (id === undefined || id === null) return
  if (id < 0) {
    notify.info(tv('reusables.design.parameterNotEditable'))
    return
  }
  const conceptSet = props.design.conceptSets.find(cs => cs.id === id)
  if (conceptSet) editConceptSet(conceptSet)
}

function editConceptSet(conceptSet: ConceptSet) {
  if (typeof conceptSet.id !== 'number') return
  hideSelectionDialog()
  conceptSetsStore.openEmbeddedEditor({
    id: conceptSet.id,
    name: conceptSet.name ?? '',
    // The editor's item type marks a few captions required that the circe
    // conversion leaves optional; it fills them in itself.
    items: (conceptSet.expression?.items ?? []).map(convertCirceItemToAtlas) as ConceptSetEditorItem[],
  })
}

function createConceptSet() {
  hideSelectionDialog()
  conceptSetsStore.openCreateEditor()
}

function onConceptSetApplied(set: { id?: number | string; name: string; items?: unknown[] }) {
  const items = JSON.parse(JSON.stringify(set.items ?? [])) as AtlasConceptSetItem[]
  const id =
    set.id === undefined || set.id === null
      ? nextConceptSetId(props.design.conceptSets.filter(cs => typeof cs.id === 'number') as { id: number }[])
      : Number(set.id)
  const updated: ConceptSet = {
    id,
    name: set.name,
    expression: { items: items.map(convertAtlasItemToCirce) },
  }
  const index = props.design.conceptSets.findIndex(cs => cs.id === id)
  if (index === -1) {
    props.design.conceptSets.push(updated)
  } else {
    props.design.conceptSets[index] = updated
  }
  resolveSelection(id)
}
</script>

<style scoped>
.reusable-design__section {
  margin-bottom: 32px;
}

.reusable-design__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.reusable-design__title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 8px;
}

.reusable-design__row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
}

.reusable-design__row-name {
  flex: 1 1 auto;
  max-width: 420px;
}
</style>
