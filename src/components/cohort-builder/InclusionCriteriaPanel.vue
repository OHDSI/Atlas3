<template>
  <div class="events-container">
    <!-- Vertical "ALL" Label -->
    <div class="vertical-label-container">
      <div class="vertical-label">
        ALL
      </div>
    </div>

    <!-- Main Content Area -->
    <div class="flex-grow-1">
      <!-- Add Rule Button (at top) -->
      <div class="add-button-container-top">
        <v-btn
          color="primary"
          variant="outlined"
          prepend-icon="mdi-plus"
          size="small"
          data-testid="add-inclusion-rule"
          @click="addNewRule"
        >
          {{ t('components.cohortExpressionEditor.newInclusionCriteria', 'New Inclusion Criteria') }}
        </v-btn>
      </div>

      <!-- Empty State -->
      <v-alert
        v-if="modelValue.length === 0"
        color="grey-lighten-4"
        variant="outlined"
        class="mb-4"
      >
        <div style="color: #666;">
          {{ t('components.cohortExpressionEditor.inclusionCriteriaText', 'No inclusion rules defined. Inclusion rules allow you to specify additional requirements for patients to be included in the cohort beyond the entry events.') }}
        </div>
      </v-alert>

      <!-- Inclusion Rules Accordion -->
      <v-expansion-panels
        v-else
        v-model="expandedPanel"
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
                  icon
                  size="small"
                  variant="text"
                  @click.stop="openEditDialog(index)"
                >
                  <v-icon size="small">
                    mdi-pencil
                  </v-icon>
                </v-btn>
                <v-btn
                  icon
                  size="small"
                  variant="text"
                  color="primary"
                  data-testid="remove-inclusion-rule"
                  @click.stop="removeRule(index)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </div>
            </div>
          </v-expansion-panel-title>

          <v-expansion-panel-text>
            <!-- Rule Description (editable) -->
            <div class="rule-description-container mb-3">
              <input
                v-model="rule.description"
                class="rule-description-input"
                placeholder="Enter a description for this inclusion rule..."
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
              variant="outlined"
              prepend-icon="mdi-plus"
              size="small"
              @click="addGroup(index)"
            >
              Add Criteria Group
            </v-btn>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </div>

    <!-- Edit Name Dialog -->
    <v-dialog
      v-model="showEditDialog"
      max-width="500"
    >
      <v-card>
        <v-card-title>Edit Inclusion Rule Name</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="editingName"
            label="Rule Name"
            variant="outlined"
            autofocus
            @keyup.enter="saveEditedName"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showEditDialog = false"
          >
            Cancel
          </v-btn>
          <v-btn
            color="primary"
            @click="saveEditedName"
          >
            Save
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
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
  'select-concept': [context: { ruleIndex: number; groupIndex: number; eventIndex: number; attributeIndex: number; domainFilter: string | undefined }]
  'edit-concept-set': [conceptSet: any]
}>()

// Local state - single expanded panel index (undefined = all closed)
const expandedPanel = ref<number | undefined>(undefined)
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

function addNewRule() {
  const newRule: InclusionRule = {
    id: uuidv4(),
    name: `New Inclusion Rule ${ruleCounter.value}`,
    description: undefined,
    criteriaGroups: [],
  }

  ruleCounter.value++

  // Add at the beginning of the array (top)
  const updatedRules = [newRule, ...props.modelValue]
  emit('update:modelValue', updatedRules)

  // Automatically expand the new rule (index 0 since it's added at the beginning)
  expandedPanel.value = 0
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

function handleSelectConceptSet(ruleIndex: number, groupIndex: number, eventIndexOrContext: number | { eventIndex: number; eventId: string }) {
  const eventIndex = typeof eventIndexOrContext === 'number' ? eventIndexOrContext : eventIndexOrContext.eventIndex
  emit('select-concept-set', { ruleIndex, groupIndex, eventIndex })
}

function handleSelectConcept(ruleIndex: number, groupIndex: number, context: { eventIndex: number; attributeIndex: number; domainFilter: string | undefined }) {
  emit('select-concept', { ruleIndex, groupIndex, ...context })
}
</script>

<style scoped>
.events-container {
  display: flex;
  background: white;
}

.vertical-label-container {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  border: 1px solid #1f425a;
  position: relative;
}

.vertical-label-container::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 30%;
  background: #1f425a;
}

.vertical-label {
  writing-mode: sideways-lr;
  text-orientation: sideways;
  font-size: 14px;
  font-weight: 700;
  color: #1f425a;
  user-select: none;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  padding-left: 8px;
  position: relative;
  z-index: 1;
  width: 100%;
  text-align: center;
}

.flex-grow-1 {
  flex: 1;
  padding: 24px 16px;
}

.add-button-container-top {
  display: flex;
  justify-content: center;
  margin-bottom: 16px;
}

.inclusion-rule-panel {
  margin-bottom: 8px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
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

/* Override Vuetify expansion panel styles for better appearance */
:deep(.v-expansion-panel-title) {
  padding: 12px 16px;
  min-height: 56px;
}

:deep(.v-expansion-panel-text__wrapper) {
  padding: 16px;
}

:deep(.v-expansion-panel--active) {
  border-color: #2196F3;
}
</style>
