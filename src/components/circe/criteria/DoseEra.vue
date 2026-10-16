<template>
  <v-card
    class="dose-era-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="dose-era-editor__header d-flex align-center ga-3 py-3">
      <div class="dose-era-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="dose-era-editor__type">
          {{ eraTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="doseEraConceptSetModel"
          :select-label="selectConceptSetLabel"
          @select="emit('select-concept-set', $event)"
          @edit="emit('edit-concept-set', $event)"
          @clear="emit('clear-concept-set')"
        />
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
            class="dose-era-editor__add-attribute-button"
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
            @click="addAttribute(attr)"
          />
        </AtlasList>
      </AtlasMenu>

      <AtlasButton
        icon="mdi-delete"
        variant="ghost"
        color="error"
        size="sm"
        @click="emit('remove')"
      />
    </v-card-text>

    <AtlasDivider />

    <v-card-text>
      <CriteriaAttributes
        :attributes="activeAttributes"
        :concept-sets="conceptSets"
        @select-concept-set="emit('select-concept-set', $event)"
        @edit-concept-set="emit('edit-concept-set', $event)"
        @clear-concept-set="emit('clear-concept-set')"
      />
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, toRef } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import type { ConceptArray, Criteria, CriteriaGroup, DateRange, DoseEra, NumericRange, ConceptSetSelection } from '@/models/circe-types'
import EventConceptSet from '../input/EventConceptSet.vue'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import type { CriteriaAttributeSpec } from './criteria-editor.types'

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
const eraTitle = computed(() => t('components.doseEra.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.criteria.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.doseEra.attributes.first.label').value,
    description: t('components.doseEra.attributes.first.description').value,
    init: () => {
      doseEraData.value.First = true
    },
    clear: () => {
      delete doseEraData.value.First
    },
    isActive: () => doseEraData.value.First === true,
  },
  {
    key: 'AgeAtStart',
    label: t('criteriaAttributes.ageAtStart.label').value,
    description: t('criteriaAttributes.ageAtStart.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'AgeAtStart', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.AgeAtStart
    },
    isActive: () => doseEraData.value.AgeAtStart != null,
  },
  {
    key: 'AgeAtEnd',
    label: t('criteriaAttributes.ageAtEnd.label').value,
    description: t('criteriaAttributes.ageAtEnd.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'AgeAtEnd', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.AgeAtEnd
    },
    isActive: () => doseEraData.value.AgeAtEnd != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(doseEraData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
      domainFilter: 'Gender',
    }),
    init: () => {
      doseEraData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete doseEraData.value.Gender
    },
    isActive: () => doseEraData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(doseEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete doseEraData.value.GenderCS
    },
    isActive: () => doseEraData.value.GenderCS != null,
  },
  {
    key: 'EraStartDate',
    label: t('criteriaAttributes.eraStartDate.label').value,
    description: t('criteriaAttributes.eraStartDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraStartDate
    },
    isActive: () => doseEraData.value.EraStartDate != null,
  },
  {
    key: 'EraEndDate',
    label: t('criteriaAttributes.eraEndDate.label').value,
    description: t('criteriaAttributes.eraEndDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraEndDate
    },
    isActive: () => doseEraData.value.EraEndDate != null,
  },
  {
    key: 'DoseValue',
    label: t('criteriaAttributes.doseValue.label').value,
    description: t('criteriaAttributes.doseValue.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'DoseValue', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'DoseValue', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.DoseValue
    },
    isActive: () => doseEraData.value.DoseValue != null,
  },
  {
    key: 'EraLength',
    label: t('criteriaAttributes.eraLength.label').value,
    description: t('criteriaAttributes.eraLength.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(doseEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'EraLength', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete doseEraData.value.EraLength
    },
    isActive: () => doseEraData.value.EraLength != null,
  },
  {
    key: 'Unit',
    label: t('criteriaAttributes.unit.label').value,
    description: t('components.doseEra.attributes.unit.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(doseEraData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      doseEraData.value.Unit = [] as ConceptArray
    },
    clear: () => {
      delete doseEraData.value.Unit
    },
    isActive: () => doseEraData.value.Unit != null,
  },
  {
    key: 'UnitCS',
    label: t('criteriaAttributes.unitCS.label').value,
    description: t('criteriaAttributes.unitCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(doseEraData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      'Select Concept Set',
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(doseEraData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete doseEraData.value.UnitCS
    },
    isActive: () => doseEraData.value.UnitCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(doseEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(doseEraData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete doseEraData.value.CorrelatedCriteria
    },
    isActive: () => doseEraData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const doseEraData = computed<DoseEra>(() => {
  const criteria = props.criteria as { DoseEra?: DoseEra }
  if (!criteria.DoseEra) {
    criteria.DoseEra = {} as DoseEra
  }
  return criteria.DoseEra
})

const doseEra = () => doseEraData.value

const doseEraConceptSetModel = createConceptSetModel(doseEra, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.dose-era-editor__type {
  font-weight: 600;
}

.dose-era-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>