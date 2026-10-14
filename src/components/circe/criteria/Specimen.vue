<template>
  <v-card
    class="specimen-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="specimen-editor__header d-flex align-center ga-3 py-3">
      <div class="specimen-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="specimen-editor__type">
          {{ specimenTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="specimenConceptSetModel"
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
            class="specimen-editor__add-attribute-button"
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
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import type { ConceptArray, Criteria, CriteriaGroup, ConceptSetSelection, DateAdjustment, DateRange, NumericRange, Specimen, TextFilter } from '@/models/circe-types'
import type { ConceptArrayBinding, ConceptSetOption, ConceptSetSelectionTarget, CriteriaAttributeSpec } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'
import EventConceptSet from '../input/EventConceptSet.vue'

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

const specimenTitle = computed(() => t('components.specimen.title').value)
const addAttributeLabel = computed(() => t('components.criteria.addAttribute').value)
const selectConceptSetLabel = computed(() => t('components.conceptAddBox.selectConceptSet').value)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: t('components.specimen.attributes.first.label').value,
    description: t('components.specimen.attributes.first.description').value,
    init: () => {
      specimenData.value.First = true
    },
    clear: () => {
      delete specimenData.value.First
    },
    isActive: () => specimenData.value.First === true,
  },
  {
    key: 'OccurrenceStartDate',
    label: t('components.specimen.attributes.occurrenceStartDate.label').value,
    description: t('components.specimen.attributes.occurrenceStartDate.description').value,
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'OccurrenceStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.OccurrenceStartDate
    },
    isActive: () => specimenData.value.OccurrenceStartDate != null,
  },
  {
    key: 'SpecimenType',
    label: t('criteriaAttributes.specimenType.label').value,
    description: t('criteriaAttributes.specimenType.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'SpecimenType'),
        exclude: toRef(specimenData.value, 'SpecimenTypeExclude'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.SpecimenType = [] as ConceptArray
      specimenData.value.SpecimenTypeExclude = false
    },
    clear: () => {
      delete specimenData.value.SpecimenType
      delete specimenData.value.SpecimenTypeExclude
    },
    isActive: () => specimenData.value.SpecimenType != null,
  },
  {
    key: 'SpecimenTypeCS',
    label: t('criteriaAttributes.specimenTypeCS.label').value,
    description: t('criteriaAttributes.specimenTypeCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'SpecimenTypeCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'SpecimenTypeCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.SpecimenTypeCS
    },
    isActive: () => specimenData.value.SpecimenTypeCS != null,
  },
  {
    key: 'Quantity',
    label: t('criteriaAttributes.quantity.label').value,
    description: t('criteriaAttributes.quantity.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'Quantity', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.Quantity
    },
    isActive: () => specimenData.value.Quantity != null,
  },
  {
    key: 'Unit',
    label: t('criteriaAttributes.unit.label').value,
    description: t('criteriaAttributes.unit.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'Unit'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.Unit = [] as ConceptArray
    },
    clear: () => {
      delete specimenData.value.Unit
    },
    isActive: () => specimenData.value.Unit != null,
  },
  {
    key: 'UnitCS',
    label: t('criteriaAttributes.unitCS.label').value,
    description: t('criteriaAttributes.unitCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'UnitCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.UnitCS
    },
    isActive: () => specimenData.value.UnitCS != null,
  },
  {
    key: 'AnatomicSite',
    label: t('criteriaAttributes.anatomicSite.label').value,
    description: t('criteriaAttributes.anatomicSite.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'AnatomicSite'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.AnatomicSite = [] as ConceptArray
    },
    clear: () => {
      delete specimenData.value.AnatomicSite
    },
    isActive: () => specimenData.value.AnatomicSite != null,
  },
  {
    key: 'AnatomicSiteCS',
    label: t('criteriaAttributes.anatomicSiteCS.label').value,
    description: t('criteriaAttributes.anatomicSiteCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'AnatomicSiteCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'AnatomicSiteCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.AnatomicSiteCS
    },
    isActive: () => specimenData.value.AnatomicSiteCS != null,
  },
  {
    key: 'DiseaseStatus',
    label: t('criteriaAttributes.diseaseStatus.label').value,
    description: t('criteriaAttributes.diseaseStatus.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'DiseaseStatus'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.DiseaseStatus = [] as ConceptArray
    },
    clear: () => {
      delete specimenData.value.DiseaseStatus
    },
    isActive: () => specimenData.value.DiseaseStatus != null,
  },
  {
    key: 'DiseaseStatusCS',
    label: t('criteriaAttributes.diseaseStatusCS.label').value,
    description: t('criteriaAttributes.diseaseStatusCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'DiseaseStatusCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'DiseaseStatusCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.DiseaseStatusCS
    },
    isActive: () => specimenData.value.DiseaseStatusCS != null,
  },
  {
    key: 'SourceId',
    label: t('criteriaAttributes.sourceId.label').value,
    description: t('criteriaAttributes.sourceId.description').value,
    kind: 'textFilter',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'SourceId', (): TextFilter => ({ Text: '', Op: 'contains' })) as TextFilter
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'SourceId', (): TextFilter => ({ Text: '', Op: 'contains' }))
    },
    clear: () => {
      delete specimenData.value.SourceId
    },
    isActive: () => specimenData.value.SourceId != null,
  },
  {
    key: 'DateAdjustment',
    label: t('criteriaAttributes.dateAdjustment.label').value,
    description: t('criteriaAttributes.dateAdjustment.description').value,
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete specimenData.value.DateAdjustment
    },
    isActive: () => specimenData.value.DateAdjustment != null,
  },
  {
    key: 'SpecimenSourceConcept',
    label: t('criteriaAttributes.specimenSourceConcept.label').value,
    description: t('criteriaAttributes.specimenSourceConcept.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      specimenSourceConceptModel as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      specimenSourceConceptModel.activate()
    },
    clear: () => {
      specimenSourceConceptModel.deactivate()
    },
    isActive: () => specimenSourceConceptModel.isActive(),
  },
  {
    key: 'Age',
    label: t('criteriaAttributes.age.label').value,
    description: t('criteriaAttributes.age.description').value,
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(specimenData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete specimenData.value.Age
    },
    isActive: () => specimenData.value.Age != null,
  },
  {
    key: 'Gender',
    label: t('criteriaAttributes.gender.label').value,
    description: t('criteriaAttributes.gender.description').value,
    kind: 'conceptArray',
    componentProps: () => ({
      binding: {
        concepts: toRef(specimenData.value, 'Gender'),
      } satisfies ConceptArrayBinding,
    }),
    init: () => {
      specimenData.value.Gender = [] as ConceptArray
    },
    clear: () => {
      delete specimenData.value.Gender
    },
    isActive: () => specimenData.value.Gender != null,
  },
  {
    key: 'GenderCS',
    label: t('criteriaAttributes.genderCS.label').value,
    description: t('criteriaAttributes.genderCS.description').value,
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(specimenData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      selectConceptSetLabel.value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(specimenData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete specimenData.value.GenderCS
    },
    isActive: () => specimenData.value.GenderCS != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: t('criteriaAttributes.correlatedCriteria.label').value,
    description: t('criteriaAttributes.correlatedCriteria.description').value,
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(specimenData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(specimenData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete specimenData.value.CorrelatedCriteria
    },
    isActive: () => specimenData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const specimenData = computed<Specimen>(() => {
  const criteria = props.criteria as { Specimen?: Specimen }
  if (!criteria.Specimen) {
    criteria.Specimen = {} as Specimen
  }
  return criteria.Specimen
})

const specimen = () => specimenData.value

const specimenConceptSetModel = createConceptSetModel(specimen, 'CodesetId') as ConceptSetSelection
const specimenSourceConceptModel = createConceptSetModel(specimen, 'SpecimenSourceConcept')

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.specimen-editor__type {
  font-weight: 600;
}

.specimen-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>