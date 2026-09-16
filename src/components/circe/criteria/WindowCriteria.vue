<template>
  <v-card
    class="window-criteria-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text class="window-criteria-editor__body d-flex">
      <div class="flex-grow-1 window-criteria-editor__content">
        <CriteriaRenderer
          :criteria="innerCriteria"
          :concept-sets="conceptSets"
          class="mb-3"
          @select-concept-set="emit('select-concept-set', $event)"
          @edit-concept-set="emit('edit-concept-set', $event)"
          @clear-concept-set="emit('clear-concept-set')"
        />

        <AtlasMenu
          v-model="showWindowMenu"
          :close-on-content-click="false"
          location="bottom"
          offset="10"
        >
          <template #activator="{ props: menuProps }">
            <div class="window-criteria-editor__temporal mt-3">
              <AtlasChip
                class="window-criteria-editor__window-chip"
                color="primary"
                prepend-icon="mdi-calendar-range"
                variant="tonal"
                v-bind="menuProps"
              >
                {{ windowSummaryLabel }}
              </AtlasChip>
            </div>
          </template>

          <v-card
            class="window-criteria-editor__window-menu"
            rounded="lg"
          >
            <v-card-text class="d-flex flex-column ga-4">
              <AtlasSelect
                :items="windowPresetOptions"
                item-title="label"
                item-value="value"
                :label="quickPresetsLabel"
                variant="outlined"
                density="compact"
                hide-details
                @update:model-value="(value) => applyWindowPreset(value as WindowPresetValue | null)"
              />

              <Window :window="ensureStartWindow()" />

              <template v-if="criteria.EndWindow">
                <div class="window-criteria-editor__window-separator">
                  {{ andLabel }}
                </div>

                <Window :window="criteria.EndWindow">
                  <template #actions>
                    <AtlasButton
                      icon="mdi-delete"
                      color="error"
                      variant="ghost"
                      size="sm"
                      @click="removeEndWindow"
                    />
                  </template>
                </Window>
              </template>
            </v-card-text>

            <v-card-actions>
              <AtlasButton
                v-if="!criteria.EndWindow"
                variant="tonal"
                @click="ensureEndWindow()"
              >
                {{ addTimeBoxLabel }}
              </AtlasButton>

              <AtlasSpacer />

              <AtlasButton
                variant="ghost"
                @click="showWindowMenu = false"
              >
                {{ closeLabel }}
              </AtlasButton>
            </v-card-actions>
          </v-card>
        </AtlasMenu>

        <div class="window-criteria-editor__flags mt-3">
          <AtlasChip
            class="mr-2"
            :variant="criteria.RestrictVisit ? 'tonal' : 'outlined'"
            :color="criteria.RestrictVisit ? 'success' : 'primary'"
            @click="criteria.RestrictVisit = !criteria.RestrictVisit"
          >
            {{ restrictVisitLabel }}
          </AtlasChip>

          <AtlasChip
            :variant="criteria.IgnoreObservationPeriod ? 'tonal' : 'outlined'"
            :color="criteria.IgnoreObservationPeriod ? 'success' : 'primary'"
            @click="criteria.IgnoreObservationPeriod = !criteria.IgnoreObservationPeriod"
          >
            {{ ignoreObservationLabel }}
          </AtlasChip>
        </div>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AtlasButton, AtlasChip, AtlasMenu, AtlasSelect, AtlasSpacer } from '@/components/ui'
import CriteriaRenderer from '@/components/circe/criteria/CriteriaRenderer.vue'
import Window from '@/components/circe/criteria/Window.vue'
import { useI18n } from '@/composables/useI18n'
import { cloneWindow, createDefaultWindow, formatWindowExpression, getWindowPresetOptions, type WindowPresetValue } from '@/components/circe/criteria/window-utils'
import { CRITERIA_TYPE_BY_KEY } from '@/components/circe/criteria/criteria-registry'
import type { ConceptSetOption, ConceptSetSelectionTarget } from '@/components/circe/criteria/criteria-editor.types'
import type { Criteria, WindowedCriteria, Window as CirceWindow } from '@/models/circe-types'

defineOptions({ name: 'WindowCriteria' })

const props = defineProps<{
  criteria: WindowedCriteria
  conceptSets: ConceptSetOption[]
}>()

const emit = defineEmits<{
  'select-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'edit-concept-set': [target: ConceptSetSelectionTarget | undefined]
  'clear-concept-set': []
}>()

const { t } = useI18n()
const showWindowMenu = ref(false)
const windowPresetOptions = getWindowPresetOptions()

const windowSummaryLabel = computed(() => {
  const startSummary = formatWindowExpression(props.criteria.StartWindow)
  const endSummary = props.criteria.EndWindow ? formatWindowExpression(props.criteria.EndWindow) : ''

  return endSummary ? `${startSummary} ${andLabel.value} ${endSummary}` : startSummary
})
const quickPresetsLabel = computed(() => t('common.presets', 'Quick Presets').value)
const addTimeBoxLabel = computed(() => t('components.eventCard.addTemporalWindow', 'Add Temporal Window').value)
const closeLabel = computed(() => t('common.close', 'Close').value)
const andLabel = computed(() => t('common.and', 'and').value)
const restrictVisitLabel = computed(() => t('components.windowedCriteria.windowedCriteriaText_5', 'restrict to the same visit occurrence').value)
const ignoreObservationLabel = computed(() => t('components.windowedCriteria.windowedCriteriaText_6', 'ignore observation period').value)

function ensureInnerCriteria(): Criteria {
  if (!props.criteria.Criteria) {
    props.criteria.Criteria = CRITERIA_TYPE_BY_KEY.ConditionOccurrence.create() as Criteria
  }
  return props.criteria.Criteria
}

ensureInnerCriteria()

const innerCriteria = computed<Criteria>(() => props.criteria.Criteria as Criteria)

function ensureStartWindow(): CirceWindow {
  if (!props.criteria.StartWindow) {
    props.criteria.StartWindow = createDefaultWindow()
  }
  return props.criteria.StartWindow
}

function ensureEndWindow() {
  if (!props.criteria.EndWindow) {
    props.criteria.EndWindow = createDefaultWindow()
  }
}

function applyWindowPreset(preset: WindowPresetValue | null) {
  if (!preset) {
    return
  }

  props.criteria.StartWindow = cloneWindow(preset.startWindow)

  if (preset.endWindow) {
    props.criteria.EndWindow = cloneWindow(preset.endWindow)
  } else {
    delete props.criteria.EndWindow
  }
}

function removeEndWindow() {
  delete props.criteria.EndWindow
}
</script>

<style scoped>
.window-criteria-editor {
  margin-bottom: 12px;
}

.window-criteria-editor__body {
  align-items: stretch;
}

.window-criteria-editor__content {
  padding-left: 12px;
}

.window-criteria-editor__temporal {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.window-criteria-editor__window-chip {
  max-width: 100%;
  white-space: normal;
  height: auto;
}
</style>