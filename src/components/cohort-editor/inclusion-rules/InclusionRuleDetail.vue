<template>
  <div
    v-if="rule === null"
    class="rule-detail rule-detail--empty"
    data-testid="inclusion-detail-empty"
  >
    {{ t('inclusionRail.selectRule', 'Select a rule on the left to edit it.').value }}
  </div>

  <div
    v-else
    class="rule-detail"
  >
    <!-- Header: name/description display with edit/delete buttons and inline edit overlay -->
    <div
      ref="headerRef"
      class="rule-detail__header"
    >
      <AtlasMenu
        :close-on-content-click="false"
        location="bottom start"
        :min-width="menuMinWidth"
      >
        <template #activator="{ props: menuProps }">
          <div
            class="rule-detail__header-info"
            v-bind="menuProps"
            :title="t('common.edit', 'Edit rule name and description').value"
          >
            <div class="rule-detail__name">
              {{ ruleName || t('inclusionRail.unnamedRule', 'Unnamed Rule').value }}
            </div>
            <div
              class="rule-detail__description"
              :class="{ 'rule-detail__description--placeholder': !ruleDescription }"
            >
              {{ ruleDescription || t('cohortDefinitions.noRuleDescription', 'No description').value }}
            </div>
          </div>
        </template>

        <v-card rounded="lg">
          <v-card-text class="rule-detail__edit-menu-body">
            <AtlasTextField
              :model-value="rule?.name ?? ''"
              :label="t('cohortDefinitions.ruleName', 'Rule name').value"
              variant="outlined"
              density="compact"
              hide-details="auto"
              autofocus
              @update:model-value="val => { if (rule) rule.name = String(val).trim() || undefined }"
            />
            <AtlasTextField
              multiline
              :model-value="rule?.description ?? ''"
              :label="t('cohortDefinitions.ruleDescription', 'Description').value"
              variant="outlined"
              density="compact"
              hide-details
              :rows="2"
              auto-grow
              @update:model-value="val => { if (rule) rule.description = String(val).trim() || undefined }"
            />
          </v-card-text>
        </v-card>
      </AtlasMenu>

      <div class="rule-detail__header-actions">
        <AtlasButton
          variant="ghost"
          size="sm"
          icon="mdi-delete"
          color="error"
          :title="t('common.delete', 'Delete rule').value"
          @click="emit('remove')"
        />
      </div>
    </div>

    <!-- Expression section -->
    <div class="rule-detail__expression">
      <div
        v-if="expressionGroup === null"
        class="rule-detail__empty-groups"
      >
        <AtlasButton
          variant="secondary"
          size="sm"
          prepend-icon="mdi-plus"
          @click="addExpressionGroup"
        >
          {{ t('inclusionRail.addCriteriaGroup', 'Add Group Criteria to Inclusion Rule').value }}
        </AtlasButton>
      </div>

      <CriteriaGroup
        v-else
        :group="expressionGroup"
        :concept-sets="conceptSets"
        @remove="clearExpressionGroup"
        @select-concept-set="forwardConceptSetSelection"
        @edit-concept-set="forwardConceptSetEdit"
        @clear-concept-set="forwardConceptSetClear"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { AtlasButton, AtlasMenu, AtlasTextField } from '@/components/ui'
import CriteriaGroup from '@/components/circe/criteria/CriteriaGroup.vue'
import type { CriteriaGroup as CriteriaGroupType, InclusionRule } from '@/models/circe-types'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'

const { t } = useI18n()

interface Props {
  rule: InclusionRule | null
  conceptSets: ConceptSetOption[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  remove: []
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const ruleName = computed(() => props.rule?.name ?? '')
const ruleDescription = computed(() => props.rule?.description ?? '')

const headerRef = ref<HTMLElement | null>(null)
const menuMinWidth = computed(() => headerRef.value?.offsetWidth ?? 360)

const expressionGroup = computed<CriteriaGroupType | null>(() => props.rule?.expression ?? null)

function addExpressionGroup() {
  if (!props.rule || props.rule.expression) return
  props.rule.expression = createDefaultCriteriaGroup()
}

function clearExpressionGroup() {
  if (!props.rule) return
  props.rule.expression = undefined
}

function forwardConceptSetSelection(target: ConceptSetSelectionTarget | undefined) {
  emit('select-concept-set', target)
}

function forwardConceptSetEdit(target: ConceptSetSelectionTarget | undefined) {
  emit('edit-concept-set', target)
}

function forwardConceptSetClear() {
  emit('clear-concept-set')
}

function createDefaultCriteriaGroup(): CriteriaGroupType {
  return {
    Type: 'ALL',
    CriteriaList: [],
    DemographicCriteriaList: [],
    Groups: [],
  }
}
</script>

<style scoped>
.rule-detail--empty {
  padding: 24px;
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  text-align: center;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}

.rule-detail {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rule-detail__header {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 8px;
}

.rule-detail__header-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
  border-radius: 4px;
  padding: 2px 4px;
  margin: -2px -4px;
  transition: background 0.15s ease;
}

.rule-detail__header-info:hover {
  background: rgba(var(--v-theme-on-surface), 0.06);
}

.rule-detail__name {
  font-size: 15px;
  font-weight: 600;
  line-height: 1.3;
  color: rgb(var(--v-theme-on-surface));
}

.rule-detail__description {
  font-size: 12px;
  line-height: 1.4;
  margin-top: 3px;
  color: rgb(var(--v-theme-on-surface-variant));
}

.rule-detail__description--placeholder {
  font-style: italic;
  opacity: 0.55;
}

.rule-detail__header-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
  margin-top: -4px;
}

.rule-detail__edit-menu-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rule-detail__empty-groups {
  padding: 12px 14px;
  border-radius: 8px;
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
}
</style>
