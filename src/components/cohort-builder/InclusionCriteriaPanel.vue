<template>
  <v-card class="inclusion-criteria-panel">
    <v-card-title class="text-h6">Inclusion Criteria</v-card-title>

    <v-card-text>
      <!-- Empty State -->
      <v-alert v-if="modelValue.length === 0" type="info" variant="tonal" class="mb-4">
        No inclusion rules defined. Inclusion rules allow you to specify additional requirements
        for patients to be included in the cohort beyond the entry events.
      </v-alert>

      <!-- Inclusion Rules List -->
      <v-expansion-panels v-else>
        <v-expansion-panel
          v-for="(rule, index) in modelValue"
          :key="rule.id"
          :title="rule.name"
        >
          <v-expansion-panel-text>
            <!-- Rule Description -->
            <p v-if="rule.description" class="text-body-2 mb-3">
              {{ rule.description }}
            </p>

            <!-- Criteria Groups -->
            <div v-for="(group, groupIndex) in rule.criteriaGroups" :key="group.id" class="mb-3">
              <CriteriaGroupEditor
                :model-value="group"
                @update:model-value="updateGroup(index, groupIndex, $event)"
                @remove="removeGroup(index, groupIndex)"
                @select-concept-set="handleSelectConceptSet(index, groupIndex, $event)"
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

            <!-- Remove Rule Button -->
            <v-divider class="my-3" />
            <v-btn
              variant="text"
              color="error"
              prepend-icon="mdi-delete"
              size="small"
              data-testid="remove-inclusion-rule"
              @click="removeRule(index)"
            >
              Remove Inclusion Rule
            </v-btn>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>

      <!-- Add Inclusion Rule Dialog -->
      <v-dialog v-model="showAddDialog" max-width="500px">
        <v-card>
          <v-card-title>Add Inclusion Rule</v-card-title>
          <v-card-text>
            <v-text-field
              v-model="newRuleName"
              label="Rule Name"
              data-testid="inclusion-rule-name"
              placeholder="e.g., Diabetes Treatment Criteria"
            />

            <v-textarea
              v-model="newRuleDescription"
              label="Description (optional)"
              rows="3"
              placeholder="Describe the purpose of this inclusion rule"
            />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="cancelAdd">Cancel</v-btn>
            <v-btn color="primary" :disabled="!newRuleName" @click="confirmAdd">Add</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>

      <!-- Add Rule Button -->
      <v-btn
        class="mt-4"
        color="primary"
        variant="outlined"
        prepend-icon="mdi-plus"
        data-testid="add-inclusion-rule"
        @click="showAddDialog = true"
      >
        Add Inclusion Rule
      </v-btn>

      <!-- Qualifying Limit Selector -->
      <v-divider class="my-4" />
      <div class="mt-4">
        <div class="text-subtitle-2 mb-2">Qualifying Event Limit</div>
        <v-select
          :model-value="qualifyingLimit"
          :items="qualifyingLimitOptions"
          item-title="label"
          item-value="value"
          label="Which entry events qualify?"
          hint="Determines which entry events count when multiple events occur"
          persistent-hint
          @update:model-value="$emit('update:qualifyingLimit', $event)"
        />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { v4 as uuidv4 } from 'uuid'
import type { InclusionRule, CriteriaGroup, QualifyingLimit } from '@/models/cohort.types'
import CriteriaGroupEditor from './CriteriaGroupEditor.vue'

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
}>()

// Local state
const showAddDialog = ref(false)
const newRuleName = ref('')
const newRuleDescription = ref('')

// Qualifying limit options
const qualifyingLimitOptions = [
  { value: 'ALL', label: 'All Events - Every entry event qualifies (parallel cohorts)' },
  { value: 'EARLIEST', label: 'Earliest Event - Only the first entry event qualifies' },
  { value: 'LATEST', label: 'Latest Event - Only the last entry event qualifies' },
]

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

function confirmAdd() {
  if (!newRuleName.value.trim()) return

  const newRule: InclusionRule = {
    id: uuidv4(),
    name: newRuleName.value,
    description: newRuleDescription.value || undefined,
    criteriaGroups: [],
  }

  emit('update:modelValue', [...props.modelValue, newRule])
  cancelAdd()
}

function cancelAdd() {
  showAddDialog.value = false
  newRuleName.value = ''
  newRuleDescription.value = ''
}

function handleSelectConceptSet(ruleIndex: number, groupIndex: number, eventIndex: number) {
  emit('select-concept-set', { ruleIndex, groupIndex, eventIndex })
}
</script>

<style scoped>
.inclusion-criteria-panel {
  margin-top: 16px;
}
</style>
