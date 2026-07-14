<template>
  <div
    data-testid="criteria-event-card"
    class="event-card"
  >
    <!-- Optional cardinality sidebar (inclusion / nested criteria). Click to
         change "At least / Exactly / At most N". Hidden for entry events. -->
    <AtlasMenu
      v-if="showCardinality"
      :close-on-content-click="false"
      location="end"
    >
      <template #activator="{ props: menuProps }">
        <div
          class="cardinality-sidebar"
          :class="`cardinality-${cardinalityType}`"
          v-bind="menuProps"
          :title="t('components.nestedCriteria.clickToChange', 'Click to change').value"
        >
          <div class="cardinality-label">
            {{ cardinalityDisplay }}
          </div>
        </div>
      </template>
      <v-card class="cardinality-menu">
        <v-card-text class="pa-3">
          <div class="segmented-buttons">
            <AtlasButton
              :variant="cardinalityType === 'at_least' ? 'tonal' : 'secondary'"
              :tone="cardinalityType === 'at_least' ? undefined : 'neutral'"
              size="sm"
              class="flex-1 cardinality-chip cardinality-chip--at_least"
              @click="setCardinalityType('AT_LEAST')"
            >
              {{ t('options.atLeast', 'At least') }}
            </AtlasButton>
            <AtlasButton
              :variant="cardinalityType === 'exactly' ? 'tonal' : 'secondary'"
              :tone="cardinalityType === 'exactly' ? undefined : 'neutral'"
              size="sm"
              class="flex-1 cardinality-chip cardinality-chip--exactly"
              @click="setCardinalityType('EXACTLY')"
            >
              {{ t('options.exactly', 'Exactly') }}
            </AtlasButton>
            <AtlasButton
              :variant="cardinalityType === 'at_most' ? 'tonal' : 'secondary'"
              :tone="cardinalityType === 'at_most' ? undefined : 'neutral'"
              size="sm"
              class="flex-1 cardinality-chip cardinality-chip--at_most"
              @click="setCardinalityType('AT_MOST')"
            >
              {{ t('options.atMost', 'At most') }}
            </AtlasButton>
          </div>
          <AtlasTextField
            :model-value="event.cardinality?.count ?? 1"
            type="number"
            :label="t('columns.count', 'Count').value"
            min="1"
            class="mt-3"
            @update:model-value="(v) => setCardinalityCount(Number(v))"
          />
        </v-card-text>
      </v-card>
    </AtlasMenu>

    <!-- Event content -->
    <div class="event-content">
      <!-- Header: type label + concept-set picker (moved here) + actions -->
      <div class="event-header">
        <div class="event-header__left">
          <span class="event-type-label">{{ eventTypeLabel }}</span>
          <EventConceptSetField
            v-if="eventRequiresConceptSet"
            compact
            :concept-set="event.conceptSet"
            :select-label="t('components.conceptSetBuilder.selectConceptSet', 'Select Concept Set').value"
            @select="onSelectConceptSet"
            @edit="onEditConceptSet"
            @clear="removeConceptSet"
          />
          <template v-if="eventHasSourceConcept">
            <span class="source-concept-label">
              {{ t('components.eventCard.sourceConceptLabel', 'Source concept') }}
            </span>
            <EventConceptSetField
              compact
              :concept-set="sourceConceptDisplay"
              :select-label="t('components.eventCard.selectSourceConcept', 'Select Source Concept').value"
              picker-test-id="source-concept-picker"
              chip-test-id="source-concept-selected"
              @select="onSelectSourceConcept"
              @edit="onSelectSourceConcept"
              @clear="removeSourceConcept"
            />
          </template>
        </div>
        <div class="event-header__right">
          <AtlasMenu>
            <template #activator="{ props: menuProps }">
              <AtlasButton
                v-bind="menuProps"
                icon="mdi-plus"
                size="sm"
                variant="ghost"
                data-testid="add-attribute-button"
              >
                {{ t('components.common.addAttribute') }}
              </AtlasButton>
            </template>
            <AtlasList>
              <AtlasListItem
                v-for="attr in availableAttributes"
                :key="attr.key"
                :title="attr.label"
                :subtitle="attr.description"
                :disabled="attr.type === 'nested' && !!event.nestedCriteria"
                @click="addAttribute(attr.key, attr.type)"
              />
            </AtlasList>
          </AtlasMenu>
          <AtlasIconButton
            v-bind="{ ariaLabel: t('common.remove', 'Remove').value }"
            icon="mdi-delete"
            size="sm"
            variant="text"
            tone="primary"
            data-testid="remove-criteria-event"
            @click="emit('remove')"
          />
        </div>
      </div>

      <!-- Body -->
      <div class="event-body">
        <!-- Optional temporal window (inclusion / nested criteria). -->
        <div
          v-if="showTemporal"
          class="temporal-window-section"
        >
          <AtlasMenu
            v-if="event.temporalWindow"
            :close-on-content-click="false"
            location="end"
          >
            <template #activator="{ props: menuProps }">
              <TemporalFilterChip
                v-bind="menuProps"
                :label="formatTemporalWindowDisplay(event.temporalWindow)"
                @close="removeTemporalWindow"
              />
            </template>
            <v-card
              class="temporal-window-menu"
              style="min-width: 500px"
            >
              <v-card-text class="pa-3">
                <TemporalWindowEditor
                  :model-value="event.temporalWindow"
                  @update:model-value="updateTemporalWindow"
                />
              </v-card-text>
            </v-card>
          </AtlasMenu>
          <AtlasButton
            v-else
            size="sm"
            variant="secondary"
            icon="mdi-calendar-range"
            @click="addTemporalWindow"
          >
            {{ t('components.criteriaGroup.addTemporalWindow', 'Add Temporal Window') }}
          </AtlasButton>
        </div>

        <!-- Optional end-date constraint (endTemporalWindow). Constrains the
             event's END date, independently of the start-date temporalWindow
             above — e.g. "drug exposure must END within 30 days after index". -->
        <div
          v-if="showTemporal"
          class="end-window-section mt-2"
        >
          <div
            v-if="event.endTemporalWindow"
            class="end-window-editor"
            data-testid="end-window-editor-wrapper"
          >
            <div class="d-flex align-center justify-space-between mb-2">
              <span class="text-subtitle-2">
                {{ t('components.eventCard.endWindowLabel', 'End window') }}
              </span>
              <AtlasIconButton
                v-bind="{ ariaLabel: t('components.eventCard.removeEndWindow', 'Remove end-date constraint').value }"
                icon="mdi-close"
                size="sm"
                variant="text"
                density="compact"
                data-testid="remove-end-window"
                @click="removeEndTemporalWindow"
              />
            </div>
            <TemporalWindowEditor
              :model-value="event.endTemporalWindow"
              data-testid="end-window-editor"
              @update:model-value="updateEndTemporalWindow"
            />
          </div>
          <AtlasButton
            v-else
            size="sm"
            variant="secondary"
            icon="mdi-calendar-end"
            density="compact"
            data-testid="add-end-window"
            @click="addEndTemporalWindow"
          >
            {{ t('components.eventCard.addEndWindow', 'Add End-Date Constraint') }}
          </AtlasButton>
        </div>

        <!-- Attributes -->
        <div class="attributes-section mt-3">
          <AttributesEditor
            :model-value="event.attributes || []"
            :criteria-type="event.criteriaType"
            :section="section"
            :has-nested-criteria="!!event.nestedCriteria"
            @update:model-value="updateAttributes"
            @add-nested-criteria="addNestedCriteria"
            @select-concept-set-for-attribute="
              attributeIndex => emit('select-concept-set-for-attribute', attributeIndex)
            "
            @select-concept-for-attribute="
              (attributeIndex, domainFilter) =>
                emit('select-concept-for-attribute', attributeIndex, domainFilter)
            "
          />
        </div>

        <!-- Per-criteria option switches (wrapped criteria only). These map to
             CIRCE Criteria.IgnoreObservationPeriod / RestrictVisit and are
             irrelevant to entry events, so they're gated on showCriteriaOptions. -->
        <div
          v-if="showCriteriaOptions"
          class="criteria-options mt-3"
          data-testid="criteria-options"
        >
          <AtlasSwitch
            :model-value="event.ignoreObservationPeriod ?? false"
            :label="t('components.criteriaGroup.criteriaGroupText_2', 'allow events from outside observation period').value"
            density="compact"
            hide-details
            @update:model-value="(v) => setIgnoreObservationPeriod(!!v)"
          />
          <AtlasSwitch
            :model-value="event.restrictVisit ?? false"
            :label="t('components.criteriaGroup.criteriaGroupText_1', 'restrict to the same visit occurrence').value"
            density="compact"
            hide-details
            @update:model-value="(v) => setRestrictVisit(!!v)"
          />
        </div>

        <!-- Nested criteria (recursive) -->
        <div
          v-if="event.nestedCriteria"
          class="nested-criteria-section mt-3"
        >
          <GroupCriteriaUI
            :model-value="event.nestedCriteria"
            :depth="depth + 1"
            @update:model-value="updateNestedCriteria"
            @remove="removeNestedCriteria"
            @select-concept-set="onNestedSelectConceptSet"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasIconButton, AtlasList, AtlasListItem, AtlasMenu, AtlasSwitch, AtlasTextField } from '@/components/ui'
import { computed, ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import { useFilterConfig } from '@/composables/useFilterConfig'
import { useAttributeConfig } from '@/composables/useAttributeConfig'
import { useCriteriaSelection } from '@/composables/useCriteriaSelection'
import { useTemporalWindows } from '@/composables/useTemporalWindows'
import { SOURCE_CONCEPT_KEYS } from '@/services/atlas-converter'
import type { CohortEvent, NestedCriteria, TemporalWindow } from '@/models/cohort.types'
import type {
  EventAttribute,
  NumericAttributeKey,
  ConceptAttributeKey,
  DateAttributeKey,
  TextAttributeKey,
  BooleanAttributeKey,
  TemporalAttributeKey,
  DateAdjustmentAttributeKey,
  UserDefinedPeriodAttributeKey,
  Concept,
} from '@/models/event.types'
import AttributesEditor from '@/components/cohort-builder/AttributesEditor.vue'
import EventConceptSetField from '@/components/cohort-builder/EventConceptSetField.vue'
import GroupCriteriaUI from '@/components/cohort-builder/GroupCriteriaUI.vue'
import TemporalFilterChip from '@/components/cohort-builder/TemporalFilterChip.vue'
import TemporalWindowEditor from '@/components/cohort-builder/TemporalWindowEditor.vue'

interface Props {
  event: CohortEvent
  /** Config section for filter/attribute lookups. */
  section?: string
  /** Show the cardinality sidebar (inclusion / nested criteria). */
  showCardinality?: boolean
  /** Show the temporal-window control (inclusion / nested criteria). */
  showTemporal?: boolean
  /**
   * Show the per-criteria option switches (allow events outside observation
   * period / restrict to same visit as index). These map to CIRCE wrapped-
   * criteria flags and only apply to additional/inclusion/nested criteria.
   */
  showCriteriaOptions?: boolean
  /** Nesting depth, forwarded to the recursive nested GroupCriteriaUI. */
  depth?: number
}

const props = withDefaults(defineProps<Props>(), {
  section: 'initialEvents',
  showCardinality: false,
  showTemporal: false,
  showCriteriaOptions: false,
  depth: 0,
})

const { t } = useI18n()
const { formatTemporalWindowDisplay } = useTemporalWindows()

const emit = defineEmits<{
  update: [event: CohortEvent]
  remove: []
  'select-concept-set': []
  /** A nested-criteria child requested a concept set; payload is the child index. */
  'select-concept-set-nested': [nestedEventIndex: number]
  'select-concept-set-for-attribute': [attributeIndex: number]
  'select-concept-for-attribute': [attributeIndex: number, domainFilter: string | undefined]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
  'select-source-concept': []
}>()

const sectionRef = computed(() => props.section)

const { availableFilters, requiresConceptSet } = useFilterConfig(sectionRef)

const toCamelCase = (str: string): string => str.charAt(0).toLowerCase() + str.slice(1)
const criteriaTypeKey = computed(() => toCamelCase(props.event.criteriaType))

// Some OMOP entities (e.g. Observation Period) have no concept_id, so the
// concept-set picker is hidden for them (issue #98).
const eventRequiresConceptSet = computed(() => requiresConceptSet(criteriaTypeKey.value))

const eventTypeLabel = computed(() => {
  const filter = availableFilters.value.find(f => f.criteriaType === props.event.criteriaType)
  return filter?.name ?? t('components.cohortExpressionEditor.cohortEntryEvents').value
})

const { attributes: availableAttributes } = useAttributeConfig(criteriaTypeKey, sectionRef)

// ── Cardinality ───────────────────────────────────────────────────────────
const cardinalityType = computed(() =>
  (props.event.cardinality?.type ?? 'AT_LEAST').toLowerCase(),
)
const cardinalityDisplay = computed(() => {
  const typeMap: Record<string, string> = {
    AT_LEAST: t('options.atLeast', 'At least').value,
    EXACTLY: t('options.exactly', 'Exactly').value,
    AT_MOST: t('options.atMost', 'At most').value,
  }
  const type = props.event.cardinality?.type ?? 'AT_LEAST'
  return `${typeMap[type] ?? typeMap.AT_LEAST} ${props.event.cardinality?.count ?? 1}`
})

function setCardinalityType(type: 'AT_LEAST' | 'EXACTLY' | 'AT_MOST') {
  emit('update', {
    ...props.event,
    cardinality: {
      type,
      count: props.event.cardinality?.count ?? 1,
      countingMethod: props.event.cardinality?.countingMethod ?? 'ALL',
    },
  })
}
function setCardinalityCount(count: number) {
  emit('update', {
    ...props.event,
    cardinality: {
      type: props.event.cardinality?.type ?? 'AT_LEAST',
      count,
      countingMethod: props.event.cardinality?.countingMethod ?? 'ALL',
    },
  })
}

// ── Temporal window ───────────────────────────────────────────────────────
function addTemporalWindow() {
  // OHDSI long-term baseline: 365 days before index up to the index event.
  emit('update', {
    ...props.event,
    temporalWindow: {
      startWindow: { days: 365, beforeAfter: 'BEFORE', useIndexEnd: false, useEventEnd: false },
      endWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
    },
  })
}
function updateTemporalWindow(temporalWindow: TemporalWindow) {
  emit('update', { ...props.event, temporalWindow })
}
function removeTemporalWindow() {
  const updated = { ...props.event }
  delete updated.temporalWindow
  emit('update', updated)
}

// ── End-date constraint (endTemporalWindow) ───────────────────────────────
function addEndTemporalWindow() {
  emit('update', {
    ...props.event,
    endTemporalWindow: {
      startWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
      endWindow: { days: 0, beforeAfter: 'AFTER', useIndexEnd: false, useEventEnd: false },
    },
  })
}
function updateEndTemporalWindow(endTemporalWindow: TemporalWindow) {
  emit('update', { ...props.event, endTemporalWindow })
}
function removeEndTemporalWindow() {
  const updated = { ...props.event }
  delete updated.endTemporalWindow
  emit('update', updated)
}

// ── Criteria options (wrapped-criteria flags) ─────────────────────────────
function setIgnoreObservationPeriod(value: boolean) {
  emit('update', { ...props.event, ignoreObservationPeriod: value })
}
function setRestrictVisit(value: boolean) {
  emit('update', { ...props.event, restrictVisit: value })
}

// ── Concept set / attributes / nested ─────────────────────────────────────
// Prefer the injected criteria-selection service (works at any nesting
// depth); fall back to the legacy index-context emit chain without one.
const selection = useCriteriaSelection()

function onSelectConceptSet() {
  if (selection) {
    selection.requestConceptSet(conceptSet => {
      emit('update', { ...props.event, conceptSet })
    })
    return
  }
  emit('select-concept-set')
}

function onEditConceptSet(conceptSet: { id: number | string; name: string; items?: unknown[] }) {
  if (selection) {
    selection.editConceptSet(conceptSet)
    return
  }
  emit('edit-concept-set', conceptSet)
}

function removeConceptSet() {
  emit('update', { ...props.event, conceptSet: undefined })
}

// ── Source concept (CIRCE `<CriteriaType>SourceConcept`) ─────────────────
// Only applies to the criteria types the converter maps in SOURCE_CONCEPT_KEYS.
const eventHasSourceConcept = computed(() => !!SOURCE_CONCEPT_KEYS[props.event.criteriaType])

// sourceConceptId is stored as a bare numeric codeset id (no embedded name),
// so the picked concept set's name is cached locally purely for display —
// re-selecting the same event after a reload shows the id until re-picked.
const sourceConceptNames = ref<Record<number, string>>({})
const sourceConceptDisplay = computed(() => {
  const id = props.event.sourceConceptId
  if (typeof id !== 'number') return undefined
  return { id, name: sourceConceptNames.value[id] ?? `#${id}` }
})

function onSelectSourceConcept() {
  if (selection) {
    selection.requestConceptSet(conceptSet => {
      if (typeof conceptSet.id !== 'number') return
      sourceConceptNames.value = { ...sourceConceptNames.value, [conceptSet.id]: conceptSet.name }
      emit('update', { ...props.event, sourceConceptId: conceptSet.id })
    })
    return
  }
  emit('select-source-concept')
}

function removeSourceConcept() {
  const updated = { ...props.event }
  delete updated.sourceConceptId
  emit('update', updated)
}
function updateAttributes(attributes: EventAttribute[]) {
  emit('update', { ...props.event, attributes })
}
function addNestedCriteria() {
  emit('update', {
    ...props.event,
    nestedCriteria: { id: uuidv4(), logicType: 'ALL', events: [] },
  })
}
function updateNestedCriteria(nested: NestedCriteria) {
  emit('update', { ...props.event, nestedCriteria: nested })
}
function removeNestedCriteria() {
  const updated = { ...props.event }
  delete updated.nestedCriteria
  emit('update', updated)
}
// GroupCriteriaUI reports concept-set selection as either the child event index
// (number) or a richer object for deeper nesting; forward the immediate child
// index, matching the prior NestedCriteriaEditor contract.
function onNestedSelectConceptSet(payload: number | { eventIndex: number }) {
  const index = typeof payload === 'number' ? payload : payload.eventIndex
  emit('select-concept-set-nested', index)
}

function addAttribute(attributeKey: string, attributeType: string) {
  if (attributeType === 'nested') {
    addNestedCriteria()
    return
  }

  let newAttribute: EventAttribute | null = null
  if (attributeType === 'numericRange') {
    newAttribute = {
      type: 'numericRange',
      attributeKey: attributeKey as NumericAttributeKey,
      operator: 'GREATER_THAN_OR_EQUAL',
      value: 0,
    }
  } else if (attributeType === 'conceptSet') {
    newAttribute = {
      type: 'conceptSet',
      attributeKey: attributeKey as ConceptAttributeKey,
      conceptSet: { id: '', name: '' },
    }
  } else if (attributeType === 'dateRange') {
    newAttribute = {
      type: 'dateRange',
      attributeKey: attributeKey as DateAttributeKey,
      operator: 'AFTER',
      value: new Date().toISOString().split('T')[0] || '',
    }
  } else if (attributeType === 'text') {
    newAttribute = {
      type: 'text',
      attributeKey: attributeKey as TextAttributeKey,
      operator: 'CONTAINS',
      value: '',
    }
  } else if (attributeType === 'boolean') {
    newAttribute = {
      type: 'boolean',
      attributeKey: attributeKey as BooleanAttributeKey,
      value: true,
    }
  } else if (attributeType === 'concept') {
    newAttribute = {
      type: 'concept',
      attributeKey: attributeKey as ConceptAttributeKey,
      concepts: [] as Concept[],
    }
  } else if (attributeType === 'temporalRelationship') {
    newAttribute = {
      type: 'temporalRelationship',
      attributeKey: attributeKey as TemporalAttributeKey,
      temporalWindow: { startWindow: undefined, endWindow: undefined },
    }
  } else if (attributeType === 'dateAdjustment') {
    newAttribute = {
      type: 'dateAdjustment',
      attributeKey: attributeKey as DateAdjustmentAttributeKey,
      dateAdjustment: { startWith: 'START_DATE', startOffset: 0, endWith: 'END_DATE', endOffset: 0 },
    }
  } else if (attributeType === 'userDefinedPeriod') {
    const today = new Date()
    const tomorrow = new Date(today.getTime() + 86400000)
    newAttribute = {
      type: 'userDefinedPeriod',
      attributeKey: attributeKey as UserDefinedPeriodAttributeKey,
      period: {
        startDate: today.toISOString().split('T')[0] || '',
        endDate: tomorrow.toISOString().split('T')[0] || '',
      },
    }
  }

  if (!newAttribute) return
  emit('update', {
    ...props.event,
    attributes: [...(props.event.attributes || []), newAttribute],
  })
}
</script>

<style scoped>
.event-card {
  display: flex;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

/* Cardinality sidebar. Color-coded by type, using the same palette as the
 * group match-type rail (GroupCriteriaUI): AT_LEAST light blue, AT_MOST
 * darker blue; EXACTLY gets green (its own semantic — an exact-count match,
 * including "exactly 0" exclusions). */
.cardinality-sidebar {
  width: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}
.cardinality-at_least {
  border-right: 1px solid #69aed5;
  background: linear-gradient(to right, #69aed5 30%, #ebf2fa 30%);
}
.cardinality-at_least .cardinality-label {
  color: #336b91;
}
.cardinality-exactly {
  border-right: 1px solid #2e7d32;
  background: linear-gradient(to right, #2e7d32 30%, #e8f5e9 30%);
}
.cardinality-exactly .cardinality-label {
  color: #2e7d32;
}
.cardinality-at_most {
  border-right: 1px solid #336b91;
  background: linear-gradient(to right, #336b91 30%, #e3ecf3 30%);
}
.cardinality-at_most .cardinality-label {
  color: #336b91;
}
.cardinality-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  padding-left: 8px;
}

.event-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.event-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 10px 16px;
  background: rgb(var(--v-theme-surface-variant), 0.4);
  border-bottom: 1px solid rgb(var(--v-theme-outline-variant));
}
.event-header__left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  min-width: 0;
}
.event-type-label {
  font-weight: 600;
  font-size: 14px;
}
.source-concept-label {
  font-size: 12px;
  color: rgb(var(--v-theme-on-surface-variant));
}
.event-header__right {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.event-body {
  padding: 12px 16px 16px;
}
.temporal-window-section {
  display: flex;
}

.segmented-buttons {
  display: flex;
  gap: 4px;
}
.cardinality-menu {
  min-width: 300px;
}

/* Selected cardinality chip carries its type color (Vuetify's tonal variant
 * derives both text and tint from currentColor). !important is needed to
 * outrank the .text-primary utility that color="primary" stamps on v-btn. */
.cardinality-chip--at_least.v-btn--variant-tonal {
  color: #4a90ba !important;
}
.cardinality-chip--exactly.v-btn--variant-tonal {
  color: #2e7d32 !important;
}
.cardinality-chip--at_most.v-btn--variant-tonal {
  color: #336b91 !important;
}
</style>
