<template>
  <v-card
    class="custom-era-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="custom-era-editor__header d-flex align-center ga-3 py-3">
      <div class="custom-era-editor__title-block d-flex align-center ga-2 flex-wrap">
        <div class="custom-era-editor__type">
          {{ eraPrefixLabel }}
        </div>

        <AtlasMenu
          :close-on-content-click="false"
          location="bottom start"
          offset="8"
        >
          <template #activator="{ props: menuProps }">
            <AtlasChip
              v-bind="menuProps"
              class="custom-era-editor__gap-days-chip"
              tone="primary"
              variant="outlined"
              size="sm"
            >
              {{ gapDaysChipLabel }}
            </AtlasChip>
          </template>

          <v-card rounded="lg">
            <v-card-text class="custom-era-editor__gap-days-popover">
              <AtlasTextField
                v-model.number="gapDays"
                type="number"
                label="Gap days"
                variant="outlined"
                density="compact"
                hide-details
                min="0"
              />
            </v-card-text>
          </v-card>
        </AtlasMenu>

        <div class="custom-era-editor__type">
          {{ eraSuffixLabel }}
        </div>
      </div>

      <AtlasSpacer />

      <AtlasButton
        icon="mdi-delete"
        variant="ghost"
        color="error"
        size="sm"
        @click="emit('remove')"
      />
    </v-card-text>

    <AtlasDivider />

    <v-card-text class="custom-era-editor__body">
      <section class="custom-era-editor__section">
        <div class="custom-era-editor__section-header">
          <div class="custom-era-editor__section-title">
            {{ criteriaListLabel }}
          </div>

          <AtlasSpacer />

          <AtlasMenu
            :close-on-content-click="true"
            location="bottom end"
            offset="8"
          >
            <template #activator="{ props: menuProps }">
              <AtlasButton
                v-bind="menuProps"
                class="custom-era-editor__add-criteria-button"
                variant="secondary"
                size="sm"
                icon="mdi-plus"
              >
                {{ addCriteriaLabel }}
              </AtlasButton>
            </template>

            <AtlasList density="compact">
              <AtlasListItem
                v-for="criteriaType in criteriaTypeOptions"
                :key="criteriaType.value"
                :title="criteriaType.title"
                @click="addCriteria(criteriaType.value)"
              />
            </AtlasList>
          </AtlasMenu>
        </div>

        <AtlasAlert
          v-if="criteriaList.length === 0"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ noCriteriaLabel }}
        </AtlasAlert>

        <CriteriaRenderer
          v-for="(criteriaItem, index) in criteriaList"
          :key="getObjectKey(criteriaItem)"
          :criteria="criteriaItem"
          :concept-sets="conceptSets"
          class="mb-3"
          @remove="removeCriteria(index)"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />
      </section>

      <section class="custom-era-editor__section">
        <div class="custom-era-editor__section-header">
          <div class="custom-era-editor__section-title">
            {{ additionalAttributesLabel }}
          </div>

          <AtlasSpacer />

          <AtlasMenu
            :close-on-content-click="true"
            location="bottom end"
            offset="8"
          >
            <template #activator="{ props: menuProps }">
              <AtlasButton
                v-bind="menuProps"
                class="custom-era-editor__add-attribute-button"
                variant="secondary"
                size="sm"
                icon="mdi-plus"
                :disabled="!canAddAttribute"
              >
                {{ addAttributeLabel }}
              </AtlasButton>
            </template>

            <AtlasList density="compact">
              <AtlasListItem
                v-for="attr in availableAttributes"
                :key="attr.key"
                :title="attr.label"
                :subtitle="attr.description"
                @click="addAttribute(attr)"
              />
            </AtlasList>
          </AtlasMenu>
        </div>

        <AtlasAlert
          v-if="activeAttributes.length === 0"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          {{ noOptionalAttributesLabel }}
        </AtlasAlert>

        <CriteriaAttributes
          :attributes="activeAttributes"
          :concept-sets="conceptSets"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />
      </section>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CustomEra, DateRange, NumericRange, ConceptSetSelection } from '@/models/circe-types'
import {
  AtlasAlert,
  AtlasButton,
  AtlasDivider,
  AtlasChip,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import CriteriaAttributes from './CriteriaAttributes.vue'
import type { CriteriaAttributeSpec, ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import { createObjectKeyGenerator, createConceptSetComponentProps, createDefaultCriteriaGroup, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import { CRITERIA_TYPE_BY_KEY, EDITABLE_CRITERIA_TYPES, type EditableCriteriaKey } from './criteria-registry'

const props = defineProps<{
  criteria: Criteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const { t } = useI18n()
const getObjectKey = createObjectKeyGenerator()
const CriteriaRenderer = defineAsyncComponent(() => import('./CriteriaRenderer.vue'))

const eraPrefixLabel = computed(() => t('components.customEra.criteriaPrefix', 'a custom era using').value)
const eraSuffixLabel = computed(() => t('components.customEra.criteriaSuffix', 'gap of:').value)
const gapDaysChipLabel = computed(() => `${gapDays.value} days`)
const criteriaListLabel = computed(() => t('components.customEra.criteriaList', 'Criteria List').value)
const addCriteriaLabel = computed(() => t('components.customEra.addCriteria', 'Add Criteria...').value)
const additionalAttributesLabel = computed(() => t('components.customEra.additionalAttributes', 'Additional Attributes').value)
const addAttributeLabel = computed(() => t('components.customEra.addAttribute', 'Add Attribute...').value)
const noCriteriaLabel = computed(() => t('components.customEra.noCriteria', 'No criteria yet.').value)
const noOptionalAttributesLabel = computed(() => t('components.customEra.noOptionalAttributes', 'No additional attributes yet.').value)

const criteriaTypeOptions = computed(() =>
  EDITABLE_CRITERIA_TYPES.map(type => ({
    value: type.key as EditableCriteriaKey,
    title: t(type.i18nKey, type.label).value,
  }))
)

const customEraData = computed<CustomEra>(() => {
  const criteria = props.criteria as { CustomEra?: CustomEra }
  if (!criteria.CustomEra) {
    criteria.CustomEra = {}
  }
  return criteria.CustomEra
})

const criteriaList = computed(() => customEraData.value.CriteriaList ?? [])

const gapDays = computed<number>({
  get: () => customEraData.value.GapDays ?? 0,
  set: value => {
    customEraData.value.GapDays = Number(value) || 0
  },
})

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Era',
    description: 'Limit to the first qualifying era',
    init: () => {
      customEraData.value.First = true
    },
    clear: () => {
      delete customEraData.value.First
    },
    isActive: () => customEraData.value.First === true,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(customEraData.value, 'DateAdjustment', createDefaultDateAdjustment)
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete customEraData.value.DateAdjustment
    },
    isActive: () => customEraData.value.DateAdjustment != null,
  },
  {
    key: 'StartDate',
    label: 'Start Date',
    description: 'Filter by custom era start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(customEraData.value, 'StartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'StartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete customEraData.value.StartDate
    },
    isActive: () => customEraData.value.StartDate != null,
  },
  {
    key: 'EndDate',
    label: 'End Date',
    description: 'Filter by custom era end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(customEraData.value, 'EndDate', () => ({ Value: '', Op: 'lte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'EndDate', () => ({ Value: '', Op: 'lte', Extent: undefined }))
    },
    clear: () => {
      delete customEraData.value.EndDate
    },
    isActive: () => customEraData.value.EndDate != null,
  },
  {
    key: 'AgeAtStart',
    label: 'Age at Start',
    description: 'Filter by age at era start',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(customEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete customEraData.value.AgeAtStart
    },
    isActive: () => customEraData.value.AgeAtStart != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(customEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete customEraData.value.GenderCS
    },
    isActive: () => customEraData.value.GenderCS != null,
  },
  {
    key: 'Duration',
    label: 'Duration',
    description: 'Filter by era duration',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(customEraData.value, 'Duration', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(customEraData.value, 'Duration', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete customEraData.value.Duration
    },
    isActive: () => customEraData.value.Duration != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Filter using nested criteria',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(customEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup),
    }),
    init: () => {
      ensureObjectField(customEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete customEraData.value.CorrelatedCriteria
    },
    isActive: () => customEraData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(spec => spec.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(spec => !spec.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

function addAttribute(attribute: CriteriaAttributeSpec) {
  attribute.init()
}

function ensureCriteriaList() {
  if (!customEraData.value.CriteriaList) {
    customEraData.value.CriteriaList = []
  }
  return customEraData.value.CriteriaList
}

function addCriteria(type: EditableCriteriaKey) {
  ensureCriteriaList().push(CRITERIA_TYPE_BY_KEY[type].create())
}

function removeCriteria(index: number) {
  const list = customEraData.value.CriteriaList
  if (!list) return
  list.splice(index, 1)
}
</script>

<style scoped>
.custom-era-editor__type {
  font-weight: 600;
}

.custom-era-editor__gap-days-chip {
  min-width: 88px;
  justify-content: center;
}

.custom-era-editor__gap-days-popover {
  min-width: 180px;
}

.custom-era-editor__body {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.custom-era-editor__section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.custom-era-editor__section-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-era-editor__section-title {
  color: rgb(var(--v-theme-on-surface));
  font-size: 14px;
  font-weight: 600;
}

.custom-era-editor__add-criteria-button,
.custom-era-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}

.custom-era-editor__section :deep(.criteria-attributes-editor) {
  margin-top: 0;
}
</style>