<template>
  <div class="cohort-builder__steps">
    <section
      class="section-step mb-4"
      data-step="1"
    >
      <span class="section-step-badge">1</span>
      <div class="section-wrapper section-wrapper--step">
        <div class="section-header">
          <h3 class="section-title">
            {{ cohortEntryEventsLabel }}
          </h3>
          <span class="section-state-chip section-state-chip--primary">
            {{ entryEventsState }}
          </span>
          <div class="section-controls">
            <div class="section-controls__label">
              {{ cohortEntryOnLabel }}
            </div>

            <v-btn-toggle
              v-model="expression.PrimaryCriteria.PrimaryCriteriaLimit.Type"
              mandatory
              variant="outlined"
              density="compact"
              divided
            >
              <AtlasButton value="First">
                {{ earliestLabel }}
              </AtlasButton>
              <AtlasButton value="All">
                {{ allLabel }}
              </AtlasButton>
              <AtlasButton value="Last">
                {{ latestLabel }}
              </AtlasButton>
            </v-btn-toggle>
          </div>
        </div>

        <div class="events-container">
          <div class="events-container__layout">
            <div
              class="entry-any-label"
              data-testid="entry-any-label"
              aria-disabled="true"
              :title="entryEventsAnyHintLabel"
            >
              <span class="entry-any-label__text">{{ anyLabel }}</span>
            </div>

            <div class="events-container__body">
              <div class="entry-events-toolbar">
                <AtlasMenu>
                  <template #activator="{ props: menuProps }">
                    <AtlasButton
                      v-bind="menuProps"
                      variant="secondary"
                      size="sm"
                      prepend-icon="mdi-plus"
                    >
                      {{ addCriteriaLabel }}
                    </AtlasButton>
                  </template>

                  <AtlasList density="compact">
                    <AtlasListItem
                      v-for="type in criteriaTypeOptions"
                      :key="type.key"
                      :title="type.title"
                      @click="addPrimaryCriteria(type.key)"
                    />
                  </AtlasList>
                </AtlasMenu>

                <AtlasSpacer />

                <AtlasMenu
                  :close-on-content-click="false"
                  location="bottom end"
                  offset="8"
                >
                  <template #activator="{ props: chipProps }">
                    <AtlasChip
                      v-bind="chipProps"
                      class="obs-period-chip"
                      tone="warning"
                      variant="outlined"
                      size="sm"
                    >
                      <AtlasIcon
                        start
                        size="small"
                      >
                        mdi-clock-outline
                      </AtlasIcon>
                      <span class="d-none d-md-inline">
                        {{ continuousObservationLabel }}: {{ observationPriorDays }}d {{ t('options.before', 'before').value }} · {{ observationPostDays }}d {{ t('options.after', 'after').value }}
                      </span>
                      <span class="d-md-none">
                        {{ observationPriorDays }}d / {{ observationPostDays }}d
                      </span>
                    </AtlasChip>
                  </template>

                  <v-card
                    class="obs-period-popover"
                    rounded="lg"
                  >
                    <v-card-title class="text-subtitle-2">
                      {{ continuousObservationLabel }}
                    </v-card-title>
                    <v-card-text class="obs-period-popover__fields">
                      <AtlasTextField
                        v-model="observationPriorDays"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        min="0"
                        :label="daysBeforeLabel"
                      />
                      <AtlasTextField
                        v-model="observationPostDays"
                        type="number"
                        variant="outlined"
                        density="compact"
                        hide-details
                        min="0"
                        :label="daysAfterLabel"
                      />
                    </v-card-text>
                  </v-card>
                </AtlasMenu>
              </div>

              <div class="entry-events-list">
                <AtlasAlert
                  v-if="!expression.PrimaryCriteria.CriteriaList.length"
                  type="info"
                  variant="tonal"
                  density="compact"
                  class="mb-3"
                >
                  {{ noPrimaryCriteriaLabel }}
                </AtlasAlert>

                <CriteriaRenderer
                  v-for="(criteria, index) in expression.PrimaryCriteria.CriteriaList"
                  :key="`criteria-${index}`"
                  :criteria="criteria"
                  :concept-sets="conceptSets"
                  class="mb-2"
                  @remove="removePrimaryCriteria(criteria)"
                  @select-concept-set="emit('select-concept-set', $event)"
                  @edit-concept-set="emit('edit-concept-set', $event)"
                  @clear-concept-set="emit('clear-concept-set')"
                />

                <div class="additional-criteria-section mt-4">
                  <AtlasButton
                    v-if="!expression.AdditionalCriteria"
                    variant="secondary"
                    prepend-icon="mdi-filter-plus"
                    @click="addAdditionalCriteria"
                  >
                    {{ restrictInitialEventsLabel }}
                  </AtlasButton>

                  <CriteriaGroup
                    v-else
                    :group="expression.AdditionalCriteria"
                    :concept-sets="conceptSets"
                    @remove="removeAdditionalCriteria"
                    @select-concept-set="emit('select-concept-set', $event)"
                    @edit-concept-set="emit('edit-concept-set', $event)"
                    @clear-concept-set="emit('clear-concept-set')"
                  />

                  <div
                    v-if="expression.AdditionalCriteria"
                    class="additional-criteria-section__limit section-controls align-self-end mt-3"
                  >
                    <div class="section-controls__label">
                      {{ limitRestrictedEventsLabel }}
                    </div>

                    <v-btn-toggle
                      v-model="expression.QualifiedLimit.Type"
                      mandatory
                      variant="outlined"
                      density="compact"
                      divided
                    >
                      <AtlasButton value="First">
                        {{ earliestLabel }}
                      </AtlasButton>
                      <AtlasButton value="All">
                        {{ allLabel }}
                      </AtlasButton>
                      <AtlasButton value="Last">
                        {{ latestLabel }}
                      </AtlasButton>
                    </v-btn-toggle>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section
      class="section-step mb-4"
      data-step="2"
    >
      <span class="section-step-badge">2</span>
      <div class="section-wrapper section-wrapper--step">
        <div class="section-header">
          <h3 class="section-title">
            {{ inclusionCriteriaLabel }}
          </h3>
          <span
            :class="['section-state-chip', `section-state-chip--${inclusionRulesStateTone}`]"
          >
            {{ inclusionRulesState }}
          </span>
        </div>
        <InclusionRulesPanel
          v-model="expression.InclusionRules"
          :concept-sets="conceptSets"
          :expression-limit="expression.ExpressionLimit"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />
      </div>
    </section>

    <section
      class="section-step"
      data-step="3"
    >
      <span class="section-step-badge">3</span>
      <div class="section-wrapper section-wrapper--step">
        <div class="section-header">
          <h3 class="section-title">
            {{ exitCriteriaLabel }}
          </h3>
        </div>
        <EndStrategyPanel
          :expression="expression"
          :concept-sets="conceptSets"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />

        <div class="section-subheader mt-4">
          <span class="text-eyebrow">{{ cohortErasLabel }}</span>
          <span class="section-subheader__rule" />
        </div>
        <CensorWindowEditor
          :censor-window="expression.CensorWindow ?? null"
          :collapse-settings="expression.CollapseSettings ?? null"
          @update:censor-window="expression.CensorWindow = $event"
          @update:collapse-settings="expression.CollapseSettings = $event"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { normalizeDefaults } from '@/utils/normalize'
import {
  AtlasButton,
  AtlasAlert,
  AtlasChip,
  AtlasIcon,
  AtlasList,
  AtlasListItem,
  AtlasMenu,
  AtlasSpacer,
  AtlasTextField,
} from '@/components/ui'
import {
  CRITERIA_TYPE_BY_KEY,
  EDITABLE_CRITERIA_TYPES,
  type EditableCriteriaKey,
} from '@/components/circe/criteria/criteria-registry'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import InclusionRulesPanel from './inclusion-rules/InclusionRulesPanel.vue'
import EndStrategyPanel from './end-strategy/EndStrategyPanel.vue'
import CensorWindowEditor from './CensorWindowEditor.vue'
import type {
  CohortExpression,
  Criteria,
  CriteriaGroup as CriteriaGroupType,
  InclusionRule,
  ObservationFilter,
  PrimaryCriteria,
  ResultLimit,
} from '@/models/circe-types'
import type {
  ConceptSetOption,
  ConceptSetSelectionTarget,
} from '@/components/circe/criteria/criteria-editor.types'

/**
 * This component always presents editing controls for these portions
 * of the CIRCE expression, so it guarantees that they exist while
 * the expression is being edited here.
 */
type EditablePrimaryCriteria =
  PrimaryCriteria & {
    CriteriaList: Criteria[]
    ObservationWindow: ObservationFilter & {
      PriorDays: number
      PostDays: number
    }
    PrimaryCriteriaLimit: ResultLimit & {
      Type: NonNullable<ResultLimit['Type']>
    }
  }

type EditableCohortExpression =
  CohortExpression & {
    PrimaryCriteria: EditablePrimaryCriteria
    QualifiedLimit: NonNullable<ResultLimit> & {
      Type: NonNullable<ResultLimit['Type']>
    }
    ExpressionLimit: NonNullable<ResultLimit> & {
      Type: NonNullable<ResultLimit['Type']>
    }
    InclusionRules: InclusionRule[]
  }

const props = defineProps<{
  expression: CohortExpression
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

/**
 * Normalize the portion of the CIRCE graph this component owns.
 *
 * AdditionalCriteria deliberately remains optional because its absence
 * represents a meaningful UI state.
 *
 * ExpressionLimit and EndStrategy are left to their child editors.
 */
const expression = computed<EditableCohortExpression>(() =>
  normalizeDefaults<EditableCohortExpression>(
    {
      ConceptSets: [],
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: {
          PriorDays: 0,
          PostDays: 0,
        },
        PrimaryCriteriaLimit: {
          Type: 'First',
        },
      },
      QualifiedLimit: {
        Type: 'First',
      },
      ExpressionLimit: {
        Type: 'First'
      },
      InclusionRules: [],
    },
    props.expression,
  ),
)

const { t } = useI18n()

const cohortEntryEventsLabel = computed(() => t('components.cohortExpressionEditor.entryEvents', 'Cohort Entry Events').value)
const cohortEntryOnLabel = computed(() => t('components.cohortExpressionEditor.entryOn', 'Cohort Entry On').value)
const earliestLabel = computed(() => t('options.earliest', 'Earliest').value)
const allLabel = computed(() => t('options.all', 'All').value)
const latestLabel = computed(() => t('options.latest', 'Latest').value)
const anyLabel = computed(() => t('options.any', 'any').value)
const entryEventsAnyHintLabel = computed(() => t('components.cohortExpressionEditor.entryEventsAnyHint', 'Entry events are matched with ANY (or)').value)
const addCriteriaLabel = computed(() => t('components.cohortExpressionEditor.addCriteriaToGroup', 'Add Criteria to Group').value)
const continuousObservationLabel = computed(() => t('components.cohortExpressionEditor.continuousObservation', 'Continuous observation').value)
const daysBeforeLabel = computed(() => t('components.cohortExpressionEditor.daysBefore', 'Days before').value)
const daysAfterLabel = computed(() => t('components.cohortExpressionEditor.daysAfter', 'Days after').value)
const noPrimaryCriteriaLabel = computed(() => t('components.cohortExpressionEditor.noPrimaryCriteria', 'No primary criteria yet. Click "Add Criteria to Group" to start.').value)
const restrictInitialEventsLabel = computed(() => t('components.cohortExpressionEditor.restrictInitialEvents', 'Restrict Initial Events').value)
const limitRestrictedEventsLabel = computed(() => 'Limit Restricted Events to')
const inclusionCriteriaLabel = computed(() => t('components.cohortExpressionEditor.inclusionCriteria', 'Inclusion Criteria').value)
const exitCriteriaLabel = computed(() => t('components.cohortExpressionEditor.exitCriteria', 'Exit & Eras').value)
const cohortErasLabel = computed(() => t('components.cohortExpressionEditor.cohortEras', 'Cohort Eras').value)

// Same list, same wording and same initial shapes as the criteria-group menu,
// because both read the registry. This menu previously showed raw wrapper keys
// ("ConditionOccurrence") while the group menu showed proper names.
const criteriaTypeOptions = computed(() =>
  EDITABLE_CRITERIA_TYPES.map(type => ({ key: type.key, title: t(type.i18nKey, type.label).value }))
)

const entryEventsState = computed(() => {
  const count = expression.value.PrimaryCriteria.CriteriaList.length
  return count > 0 ? `${count} event${count === 1 ? '' : 's'}` : 'Empty'
})

const inclusionRulesState = computed(() => {
  const count = expression.value.InclusionRules.length
  return count > 0 ? `${count} rule${count === 1 ? '' : 's'}` : 'Empty'
})

const inclusionRulesStateTone = computed(() => (expression.value.InclusionRules.length > 0 ? 'primary' : 'muted'))

const observationPriorDays = computed<number>({
  get: () => expression.value.PrimaryCriteria.ObservationWindow.PriorDays,
  set: value => {
    expression.value.PrimaryCriteria.ObservationWindow.PriorDays = Number(value) || 0
  }
})

const observationPostDays = computed<number>({
  get: () => expression.value.PrimaryCriteria.ObservationWindow.PostDays,
  set: value => {
    expression.value.PrimaryCriteria.ObservationWindow.PostDays = Number(value) || 0
  },
})

function addPrimaryCriteria(type: EditableCriteriaKey) {
  const criteria = CRITERIA_TYPE_BY_KEY[type].create()

  expression.value.PrimaryCriteria.CriteriaList.push(criteria)
}

function createEmptyCriteriaGroup(): CriteriaGroupType {
  return {
    Type: 'ALL',
    CriteriaList: [],
    Groups: [],
  }
}

function addAdditionalCriteria() {
  expression.value.AdditionalCriteria = createEmptyCriteriaGroup()
}

function removeAdditionalCriteria() {
  delete expression.value.AdditionalCriteria
}

function removePrimaryCriteria(
  criteriaToRemove: Criteria,
) {
  expression.value.PrimaryCriteria.CriteriaList =
    expression.value.PrimaryCriteria.CriteriaList.filter(
      criteria => criteria !== criteriaToRemove,
    )
}
</script>

<style scoped>
.cohort-builder__steps {
  position: relative;
}

.cohort-builder__steps::before {
  content: '';
  position: absolute;
  left: 13px;
  top: 20px;
  bottom: 20px;
  width: 2px;
  background: rgb(var(--v-theme-outline-variant, 224, 224, 224));
  border-radius: 1px;
  pointer-events: none;
}

.events-container {
  display: block;
  background: rgb(var(--v-theme-surface));
}

.events-container__layout {
  display: flex;
  align-items: stretch;
}

.entry-any-label {
  position: relative;
  width: 30px;
  flex: 0 0 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #d4d9e0;
  border-radius: 0 0 0 8px;
  background: #f6f7f9;
  user-select: none;
  cursor: default;
}

.entry-any-label::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #aab2bf;
  border-radius: 0 0 0 6px;
}

.entry-any-label__text {
  position: relative;
  z-index: 1;
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-weight: 700;
  font-size: 14px;
  letter-spacing: 0.5px;
  padding-left: 8px;
  text-align: center;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  color: #79828f;
}

.entry-events-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.obs-period-chip {
  white-space: nowrap;
}

.obs-period-popover {
  min-width: 420px;
}

.obs-period-popover__fields {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.additional-criteria-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.entry-events-list {
  min-width: 0;
}

.events-container__body {
  flex: 1;
  min-width: 0;
  padding: 12px 20px 16px;
}

.section-step {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  position: relative;
}

.section-step-badge {
  position: relative;
  z-index: 1;
  width: 28px;
  height: 28px;
  margin-top: 6px;
  border-radius: 50%;
  background: rgb(var(--v-theme-surface));
  border: 2px solid rgb(var(--v-theme-outline-variant, 224, 224, 224));
  color: rgb(var(--v-theme-on-surface-variant));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.section-wrapper {
  flex: 1;
  min-width: 0;
}

.section-wrapper--step {
  border-radius: 16px;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  background: rgb(var(--v-theme-surface));
  padding: 16px;
}

.section-header {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

.section-state-chip {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--v-theme-on-surface), 0.08);
  color: rgb(var(--v-theme-on-surface));
}

.section-state-chip--primary {
  background: rgba(var(--v-theme-primary), 0.12);
  color: rgb(var(--v-theme-primary));
}

.section-state-chip--muted {
  background: rgba(var(--v-theme-on-surface), 0.06);
  color: rgba(var(--v-theme-on-surface), 0.7);
}

.section-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

.section-controls__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgb(var(--v-theme-on-surface-variant));
}

.section-controls :deep(.v-btn-toggle) {
  border-radius: 999px;
  overflow: hidden;
}

.section-controls :deep(.v-btn-toggle > .v-btn) {
  min-width: 0;
  border-radius: 0 !important;
}

.section-controls :deep(.v-btn-toggle > .v-btn:first-child) {
  border-top-left-radius: 999px !important;
  border-bottom-left-radius: 999px !important;
}

.section-controls :deep(.v-btn-toggle > .v-btn:last-child) {
  border-top-right-radius: 999px !important;
  border-bottom-right-radius: 999px !important;
}

.section-controls :deep(.v-btn-toggle > .v-btn) {
  min-height: 28px;
  padding-inline: 10px;
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0;
  text-transform: none;
}
</style>
