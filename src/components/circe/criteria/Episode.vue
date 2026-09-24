<template>
  <v-card
    class="episode-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="episode-editor__header d-flex align-center ga-3 py-3">
      <div class="episode-editor__title-block d-flex align-center ga-3 flex-wrap">
        <div class="episode-editor__type">
          {{ episodeTitle }}
        </div>

        <EventConceptSet
          compact
          :concept-sets="conceptSets"
          :model-value="episodeConceptSetModel"
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
            class="episode-editor__add-attribute-button"
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
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { Criteria, CriteriaGroup, DateAdjustment, DateRange, Episode, NumericRange, ConceptSetSelection } from '@/models/circe-types'
import {
  AtlasButton,
  AtlasDivider,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
} from '@/components/ui'
import EventConceptSet from '../input/EventConceptSet.vue'
import type { ConceptSetOption, ConceptSetSelectionTarget } from './criteria-editor.types'
import CriteriaAttributes from './CriteriaAttributes.vue'
import type { CriteriaAttributeSpec } from './criteria-editor.types'
import { createConceptSetComponentProps, createDefaultCriteriaGroup, createConceptSetModel, createDefaultDateAdjustment, createSchemaFieldProps, ensureObjectField } from './criteria-editor-helper'

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

const episodeTitle = computed(() => t('components.episode.criteriaText_1', 'an episode of').value)
const addAttributeLabel = computed(() => t('components.episode.addAttribute', 'Add attribute...').value)
const selectConceptSetLabel = computed(() =>
  t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value
)

const attributeSpecs = computed<CriteriaAttributeSpec[]>(() => [
  {
    key: 'First',
    label: 'First Episode',
    description: 'Limit to first episode in history',
    init: () => {
      episodeData.value.First = true
    },
    clear: () => {
      delete episodeData.value.First
    },
    isActive: () => episodeData.value.First === true,
  },
  {
    key: 'Age',
    label: 'Age',
    description: 'Filter by age at episode start',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(episodeData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'Age', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete episodeData.value.Age
    },
    isActive: () => episodeData.value.Age != null,
  },
  {
    key: 'GenderCS',
    label: 'Gender Concept Set',
    description: 'Filter gender by a concept set',
    kind: 'conceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(episodeData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'GenderCS', () => ({ CodesetId: undefined, IsExclusion: false }))
    },
    clear: () => {
      delete episodeData.value.GenderCS
    },
    isActive: () => episodeData.value.GenderCS != null,
  },
  {
    key: 'EpisodeStartDate',
    label: 'Start Date',
    description: 'Filter by episode start date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(episodeData.value, 'EpisodeStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'EpisodeStartDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete episodeData.value.EpisodeStartDate
    },
    isActive: () => episodeData.value.EpisodeStartDate != null,
  },
  {
    key: 'EpisodeEndDate',
    label: 'End Date',
    description: 'Filter by episode end date',
    kind: 'dateRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(episodeData.value, 'EpisodeEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined })) as DateRange
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'EpisodeEndDate', () => ({ Value: '', Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete episodeData.value.EpisodeEndDate
    },
    isActive: () => episodeData.value.EpisodeEndDate != null,
  },
  {
    key: 'EpisodeNumber',
    label: 'Episode Number',
    description: 'Filter by episode number',
    kind: 'numericRange',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(episodeData.value, 'EpisodeNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined })) as NumericRange
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'EpisodeNumber', () => ({ Value: undefined, Op: 'gte', Extent: undefined }))
    },
    clear: () => {
      delete episodeData.value.EpisodeNumber
    },
    isActive: () => episodeData.value.EpisodeNumber != null,
  },
  {
    key: 'EpisodeObjectConceptCS',
    label: 'Episode Object Concept Set',
    description: 'Filter episode object concept by a concept set',
    kind: 'eventConceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(episodeData.value, 'EpisodeObjectConceptCS', () => ({ CodesetId: undefined })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'EpisodeObjectConceptCS', () => ({ CodesetId: undefined }))
    },
    clear: () => {
      delete episodeData.value.EpisodeObjectConceptCS
    },
    isActive: () => episodeData.value.EpisodeObjectConceptCS != null,
  },
  {
    key: 'EpisodeTypeCS',
    label: 'Episode Type Concept Set',
    description: 'Filter episode type by a concept set',
    kind: 'eventConceptSet',
    componentProps: () => createConceptSetComponentProps(
      ensureObjectField(episodeData.value, 'EpisodeTypeCS', () => ({ CodesetId: undefined })) as ConceptSetSelection,
      props.conceptSets,
      t('components.conceptAddBox.selectConceptSet', 'Select Concept Set').value,
      target => emit('select-concept-set', target),
      target => emit('edit-concept-set', target),
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'EpisodeTypeCS', () => ({ CodesetId: undefined }))
    },
    clear: () => {
      delete episodeData.value.EpisodeTypeCS
    },
    isActive: () => episodeData.value.EpisodeTypeCS != null,
  },
  {
    key: 'DateAdjustment',
    label: 'Date Adjustment',
    description: 'Adjust event dates',
    kind: 'dateAdjustment',
    componentProps: () => createSchemaFieldProps(
      ensureObjectField(episodeData.value, 'DateAdjustment', createDefaultDateAdjustment) as DateAdjustment
    ),
    init: () => {
      ensureObjectField(episodeData.value, 'DateAdjustment', createDefaultDateAdjustment)
    },
    clear: () => {
      delete episodeData.value.DateAdjustment
    },
    isActive: () => episodeData.value.DateAdjustment != null,
  },
  {
    key: 'CorrelatedCriteria',
    label: 'Nested Criteria',
    description: 'Add nested criteria group',
    kind: 'criteriaGroup',
    componentProps: () => ({
      group: ensureObjectField(episodeData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup) as CriteriaGroup,
    }),
    init: () => {
      ensureObjectField(episodeData.value, 'CorrelatedCriteria', createDefaultCriteriaGroup)
    },
    clear: () => {
      delete episodeData.value.CorrelatedCriteria
    },
    isActive: () => episodeData.value.CorrelatedCriteria != null,
  },
])

const activeAttributes = computed(() => attributeSpecs.value.filter(attribute => attribute.isActive()))
const availableAttributes = computed(() => attributeSpecs.value.filter(attribute => !attribute.isActive()))
const canAddAttribute = computed(() => availableAttributes.value.length > 0)

const episodeData = computed<Episode>(() => {
  const criteria = props.criteria as { Episode?: Episode }
  if (!criteria.Episode) {
    criteria.Episode = {} as Episode
  }
  return criteria.Episode
})

const episode = () => episodeData.value
const episodeConceptSetModel = createConceptSetModel(episode, 'CodesetId') as ConceptSetSelection

function addAttribute(row: CriteriaAttributeSpec) {
  row.init()
}
</script>

<style scoped>
.episode-editor__type {
  font-weight: 600;
}

.episode-editor__add-attribute-button {
  text-transform: none;
  letter-spacing: 0;
}
</style>