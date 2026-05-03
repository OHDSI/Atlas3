<template>
  <div
    ref="panelRoot"
    class="inclusion-criteria-panel"
  >
    <!-- Add-rule action moved up into the surrounding section
         header (next to the qualifying-limit toggle) so we don't
         burn a whole row on a single button. -->

    <!-- Empty state — single quiet line; the section header
         already hosts the "Add rule" CTA. -->
    <div
      v-if="modelValue.length === 0"
      class="inclusion-criteria-panel__empty"
    >
      <AtlasIcon
        icon="mdi-filter-variant-plus"
        size="20"
        class="inclusion-criteria-panel__empty-icon"
      />
      <span class="inclusion-criteria-panel__empty-text">
        {{
          t(
            'components.cohortExpressionEditor.inclusionCriteriaTextShort',
            'No inclusion rules — adding one narrows which patients qualify beyond the entry events.'
          ).value
        }}
      </span>
    </div>

    <!-- Inclusion Rules Accordion. Still uses v-expansion-panels
         but the per-panel chrome was retired in favour of plain
         SurfaceCard-style rows. -->
    <v-expansion-panels
      v-else
      v-model="expandedPanel"
      flat
      class="inclusion-criteria-panel__rules"
    >
      <v-expansion-panel
        v-for="(rule, index) in modelValue"
        :key="rule.id"
        :value="index"
        class="inclusion-rule-panel"
      >
        <v-expansion-panel-title>
          <div class="rule-title-container">
            <span class="rule-title-display">{{ rule.name }}</span>
            <div class="rule-actions">
              <v-btn
                icon="mdi-pencil-outline"
                size="small"
                variant="text"
                :aria-label="t('common.edit', 'Edit').value"
                @click.stop="openEditDialog(index)"
              />
              <v-btn
                icon="mdi-delete-outline"
                size="small"
                variant="text"
                color="error"
                data-testid="remove-inclusion-rule"
                :aria-label="t('common.delete', 'Delete').value"
                @click.stop="removeRule(index)"
              />
            </div>
          </div>
        </v-expansion-panel-title>

        <v-expansion-panel-text>
          <!-- Rule Description (editable) -->
          <div class="rule-description-container mb-3">
            <input
              v-model="rule.description"
              class="rule-description-input"
              placeholder="Add a description for this inclusion rule…"
              @blur="updateRuleDescription(index, $event)"
            >
          </div>

          <!-- Criteria Groups -->
          <div
            v-for="(group, groupIndex) in rule.criteriaGroups"
            :key="group.id"
            class="mb-3"
          >
            <CriteriaGroupEditor
              :model-value="group"
              @update:model-value="updateGroup(index, groupIndex, $event)"
              @remove="removeGroup(index, groupIndex)"
              @select-concept-set="handleSelectConceptSet(index, groupIndex, $event)"
              @select-concept="handleSelectConcept(index, groupIndex, $event)"
              @edit-concept-set="$emit('edit-concept-set', $event)"
            />
          </div>

          <!-- Add Group Button -->
          <v-btn
            variant="tonal"
            color="primary"
            prepend-icon="mdi-plus"
            size="small"
            @click="addGroup(index)"
          >
            {{
              t('components.cohortExpressionEditor.addCriteriaGroup', 'Add criteria group').value
            }}
          </v-btn>
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Edit Name Dialog: refreshed header (eyebrow + accent rule
         + clean title), matching the rest of the modernised dialogs. -->
    <v-dialog
      v-model="showEditDialog"
      max-width="500"
    >
      <v-card>
        <div class="inclusion-criteria-panel__dialog-header">
          <div class="inclusion-criteria-panel__dialog-title-block">
            <div class="inclusion-criteria-panel__dialog-eyebrow-row">
              <span class="text-eyebrow">{{
                t('components.cohortExpressionEditor.inclusionCriteriaTitle', 'Inclusion criteria')
                  .value
              }}</span>
              <span class="inclusion-criteria-panel__dialog-accent-rule" />
            </div>
            <h2 class="inclusion-criteria-panel__dialog-title">
              {{ t('common.editName', 'Rename rule').value }}
            </h2>
          </div>
        </div>
        <AtlasDivider />
        <v-card-text>
          <AtlasTextField
            v-model="editingName"
            :label="t('cohortDefinitions.ruleName', 'Rule name').value"
            variant="outlined"
            autofocus
            @keyup.enter="saveEditedName"
          />
        </v-card-text>
        <v-card-actions>
          <AtlasSpacer />
          <v-btn
            variant="text"
            @click="showEditDialog = false"
          >
            {{ t('common.cancel', 'Cancel').value }}
          </v-btn>
          <v-btn
            color="primary"
            variant="flat"
            @click="saveEditedName"
          >
            {{ t('common.save', 'Save').value }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { AtlasDivider, AtlasIcon, AtlasSpacer, AtlasTextField } from '@/components/ui'
import { ref, nextTick } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import { useI18n } from '@/composables/useI18n'
import type { InclusionRule, CriteriaGroup, QualifyingLimit } from '@/models/cohort.types'
import CriteriaGroupEditor from './CriteriaGroupEditor.vue'

const { t } = useI18n()

interface Props {
  modelValue: InclusionRule[]
  qualifyingLimit?: QualifyingLimit
}

const props = withDefaults(defineProps<Props>(), {
  qualifyingLimit: 'ALL',
})

const emit = defineEmits<{
  'update:modelValue': [value: InclusionRule[]]
  'update:qualifyingLimit': [value: QualifyingLimit]
  'select-concept-set': [context: { ruleIndex: number; groupIndex: number; eventIndex: number }]
  'select-concept': [
    context: {
      ruleIndex: number
      groupIndex: number
      eventIndex: number
      attributeIndex: number
      domainFilter: string | undefined
    },
  ]
  'edit-concept-set': [conceptSet: { id: number | string; name: string; items?: unknown[] }]
}>()

// Local state - single expanded panel index (undefined = all closed)
const expandedPanel = ref<number | undefined>(undefined)
const panelRoot = ref<HTMLElement | null>(null)
let ruleCounter = ref(1)

// Edit dialog state
const showEditDialog = ref(false)
const editingName = ref('')
const editingRuleIndex = ref<number | null>(null)

// Methods
function addGroup(ruleIndex: number) {
  const newGroup: CriteriaGroup = {
    id: uuidv4(),
    logicType: 'ALL',
    events: [],
  }

  const updatedRules = [...props.modelValue]
  const rule = updatedRules[ruleIndex]
  if (!rule) return
  rule.criteriaGroups.push(newGroup)
  emit('update:modelValue', updatedRules)
}

function updateGroup(ruleIndex: number, groupIndex: number, group: CriteriaGroup) {
  const updatedRules = [...props.modelValue]
  const rule = updatedRules[ruleIndex]
  if (!rule) return
  rule.criteriaGroups[groupIndex] = group
  emit('update:modelValue', updatedRules)
}

function removeGroup(ruleIndex: number, groupIndex: number) {
  const updatedRules = [...props.modelValue]
  const rule = updatedRules[ruleIndex]
  if (!rule) return
  rule.criteriaGroups.splice(groupIndex, 1)
  emit('update:modelValue', updatedRules)
}

function removeRule(index: number) {
  const updatedRules = [...props.modelValue]
  updatedRules.splice(index, 1)
  emit('update:modelValue', updatedRules)
}

async function addNewRule() {
  // Create a default criteria group automatically
  const defaultGroup: CriteriaGroup = {
    id: uuidv4(),
    logicType: 'ALL',
    events: [],
  }

  const newRule: InclusionRule = {
    id: uuidv4(),
    name: `New Inclusion Rule ${ruleCounter.value}`,
    description: undefined,
    criteriaGroups: [defaultGroup],
  }

  ruleCounter.value++

  // Add at the beginning of the array (top)
  const updatedRules = [newRule, ...props.modelValue]
  emit('update:modelValue', updatedRules)

  // Automatically expand the new rule (index 0 since it's added at the beginning)
  expandedPanel.value = 0

  // Auto-open the criteria-type picker inside the new rule's
  // empty group so the user lands directly in the next step
  // instead of having to find the "Add criteria" button. Two
  // nextTick()s: one for the new rule to render, another for
  // the expansion-panel-text to mount its inner content.
  await nextTick()
  await nextTick()
  const addCriteriaBtn = panelRoot.value?.querySelector<HTMLButtonElement>(
    '[data-testid="add-event-to-group"]'
  )
  addCriteriaBtn?.click()
}

function openEditDialog(index: number) {
  editingRuleIndex.value = index
  const rule = props.modelValue[index]
  if (rule) {
    editingName.value = rule.name
    showEditDialog.value = true
  }
}

function saveEditedName() {
  if (editingRuleIndex.value === null) return

  const updatedRules = [...props.modelValue]
  const rule = updatedRules[editingRuleIndex.value]
  if (rule) {
    rule.name = editingName.value || `New Inclusion Rule ${editingRuleIndex.value + 1}`
    emit('update:modelValue', updatedRules)
  }

  showEditDialog.value = false
  editingRuleIndex.value = null
  editingName.value = ''
}

function updateRuleDescription(index: number, event: Event) {
  const updatedRules = [...props.modelValue]
  const rule = updatedRules[index]
  if (rule) {
    const input = event.target as HTMLInputElement
    rule.description = input.value || undefined
    emit('update:modelValue', updatedRules)
  }
}

function handleSelectConceptSet(
  ruleIndex: number,
  groupIndex: number,
  eventIndexOrContext: number | { eventIndex: number; eventId: string }
) {
  const eventIndex =
    typeof eventIndexOrContext === 'number' ? eventIndexOrContext : eventIndexOrContext.eventIndex
  emit('select-concept-set', { ruleIndex, groupIndex, eventIndex })
}

function handleSelectConcept(
  ruleIndex: number,
  groupIndex: number,
  context: { eventIndex: number; attributeIndex: number; domainFilter: string | undefined }
) {
  emit('select-concept', { ruleIndex, groupIndex, ...context })
}

// Exposed so the surrounding section header can host the
// "Add rule" button and call into the panel directly.
defineExpose({ addNewRule })
</script>

<style scoped>
.inclusion-criteria-panel {
  padding: 12px 20px 16px;
}

/* Single-line quiet hint instead of the previous large filled
 * container — the "Add rule" button already sits in the section
 * header, so the empty state just needs to explain WHY it's empty. */
.inclusion-criteria-panel__empty {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
}
.inclusion-criteria-panel__empty-icon {
  color: rgb(var(--v-theme-on-surface-variant));
  opacity: 0.7;
  flex-shrink: 0;
}
.inclusion-criteria-panel__empty-text {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  line-height: 1.5;
}

.inclusion-criteria-panel__rules {
  background: transparent !important;
}

.inclusion-rule-panel {
  margin-bottom: 8px;
  border-radius: 12px !important;
  background: rgb(var(--v-theme-surface));
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.08),
    0 8px 24px rgba(15, 23, 42, 0.08);
}

.rule-title-container {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 12px;
}

.rule-title-display {
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.rule-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.rule-description-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.rule-description-label {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rule-description-input {
  font-size: 14px;
  color: #333;
  border: 1px solid #e0e0e0;
  background: white;
  outline: none;
  padding: 8px 12px;
  border-radius: 4px;
  transition: all 0.2s;
  font-family: inherit;
  width: 100%;
}

.rule-description-input:hover {
  border-color: #1f425a;
}

.rule-description-input:focus {
  border-color: #1f425a;
  box-shadow: 0 0 0 2px rgba(31, 66, 90, 0.1);
}

.rule-description-input::placeholder {
  color: #999;
}

/* Override Vuetify expansion panel styles for tighter padding and
 * to drop the Material Blue active border (#2196F3) which clashed
 * with the navy/Tableau palette. */
:deep(.v-expansion-panel-title) {
  padding: 8px 16px;
  min-height: 44px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 8px 16px 12px;
}

/* Modernised rename-rule dialog header. */
.inclusion-criteria-panel__dialog-header {
  padding: 20px 24px 14px;
}
.inclusion-criteria-panel__dialog-title-block {
  flex: 1;
}
.inclusion-criteria-panel__dialog-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}
.inclusion-criteria-panel__dialog-accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}
.inclusion-criteria-panel__dialog-title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}
</style>
