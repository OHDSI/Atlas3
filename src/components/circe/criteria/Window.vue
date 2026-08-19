<template>
  <v-card
    class="window-editor"
    rounded="lg"
    variant="outlined"
  >
    <v-card-text>
      <div class="window-editor__row">
        <AtlasChip
          class="window-editor__chip"
          color="primary"
          variant="tonal"
          @click="toggleEventAnchor"
        >
          {{ eventAnchorLabel }}
        </AtlasChip>

        <span class="window-editor__connector">{{ betweenLabel }}</span>

        <AtlasMenu
          v-model="startDaysMenu"
          :close-on-content-click="false"
          location="bottom"
          offset="8"
          width="260"
        >
          <template #activator="{ props: menuProps }">
            <AtlasChip
              class="window-editor__chip"
              color="primary"
              variant="tonal"
              v-bind="menuProps"
              @click="openDaysEditor('Start')"
            >
              {{ startDaysLabel }}

              <AtlasIcon
                v-if="hasStartDays"
                class="window-editor__clear-icon"
                icon="mdi-close"
                size="14"
                @click.stop="clearDays('Start')"
              />
            </AtlasChip>
          </template>

          <v-card
            class="window-editor__editor-popover"
            rounded="lg"
          >
            <v-card-text class="pa-3">
              <AtlasTextField
                v-model="startDaysValue"
                :label="daysLabel"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                hide-details
                @blur="startDaysMenu = false"
                @keyup.enter="startDaysMenu = false"
              />
            </v-card-text>
          </v-card>
        </AtlasMenu>

        <AtlasChip
          class="window-editor__chip"
          color="primary"
          variant="tonal"
          @click="toggleStartDirection"
        >
          {{ startDirectionLabel }}
        </AtlasChip>

        <span class="window-editor__connector">{{ andLabel }}</span>

        <AtlasMenu
          v-model="endDaysMenu"
          :close-on-content-click="false"
          location="bottom"
          offset="8"
          width="260"
        >
          <template #activator="{ props: menuProps }">
            <AtlasChip
              class="window-editor__chip"
              color="primary"
              variant="tonal"
              v-bind="menuProps"
              @click="openDaysEditor('End')"
            >
              {{ endDaysLabel }}

              <AtlasIcon
                v-if="hasEndDays"
                class="window-editor__clear-icon"
                icon="mdi-close"
                size="14"
                @click.stop="clearDays('End')"
              />
            </AtlasChip>
          </template>

          <v-card
            class="window-editor__editor-popover"
            rounded="lg"
          >
            <v-card-text class="pa-3">
              <AtlasTextField
                v-model="endDaysValue"
                :label="daysLabel"
                type="number"
                min="0"
                variant="outlined"
                density="compact"
                hide-details
                @blur="endDaysMenu = false"
                @keyup.enter="endDaysMenu = false"
              />
            </v-card-text>
          </v-card>
        </AtlasMenu>

        <AtlasChip
          class="window-editor__chip"
          color="primary"
          variant="tonal"
          @click="toggleEndDirection"
        >
          {{ endDirectionLabel }}
        </AtlasChip>

        <AtlasChip
          class="window-editor__chip"
          color="primary"
          variant="tonal"
          @click="toggleIndexAnchor"
        >
          {{ indexAnchorLabel }}
        </AtlasChip>

        <slot name="actions" />
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  AtlasChip,
  AtlasIcon,
  AtlasMenu,
  AtlasTextField,
} from '@/components/ui'
import { isClearedInput, toFiniteNumber } from '@/components/circe/input/bindings'
import type { Window } from '@/models/circe-types'

const props = defineProps<{
  window: Window
}>()

const { t } = useI18n()

const startDaysMenu = ref(false)
const endDaysMenu = ref(false)

const eventAnchorLabel = computed(() => (props.window.UseEventEnd ? t('common.eventEnds', 'Event ends').value : t('common.eventStarts', 'Event starts').value))
const indexAnchorLabel = computed(() => (props.window.UseIndexEnd ? t('common.indexEnds', 'Index ends').value : t('common.indexStarts', 'Index starts').value))
const startDirectionLabel = computed(() => (windowDirection('Start') === -1 ? t('options.before', 'Before').value : t('options.after', 'After').value))
const endDirectionLabel = computed(() => (windowDirection('End') === -1 ? t('options.before', 'Before').value : t('options.after', 'After').value))
const startDaysLabel = computed(() => daysChipLabel('Start'))
const endDaysLabel = computed(() => daysChipLabel('End'))
const daysLabel = computed(() => t('common.days', 'Days').value)
const betweenLabel = computed(() => t('common.between', 'between').value)
const andLabel = computed(() => t('common.and', 'and').value)
const hasStartDays = computed(() => props.window.Start?.Days !== null && props.window.Start?.Days !== undefined)
const hasEndDays = computed(() => props.window.End?.Days !== null && props.window.End?.Days !== undefined)
const startDaysValue = computed<string>({
  get: () => windowDays('Start'),
  set: value => setWindowDays('Start', value),
})

const endDaysValue = computed<string>({
  get: () => windowDays('End'),
  set: value => setWindowDays('End', value),
})

const useEventEnd = computed({
  get: () => props.window.UseEventEnd ?? false,
  set: value => {
    props.window.UseEventEnd = value
  },
})

const useIndexEnd = computed({
  get: () => props.window.UseIndexEnd ?? false,
  set: value => {
    props.window.UseIndexEnd = value
  },
})

function openDaysEditor(side: 'Start' | 'End') {
  if (side === 'Start') {
    endDaysMenu.value = false
    startDaysMenu.value = true
    return
  }

  startDaysMenu.value = false
  endDaysMenu.value = true
}

function clearDays(side: 'Start' | 'End') {
  setWindowDays(side, '')
}

function toggleEventAnchor() {
  useEventEnd.value = !useEventEnd.value
}

function toggleIndexAnchor() {
  useIndexEnd.value = !useIndexEnd.value
}

function toggleStartDirection() {
  ensureEndpoint('Start').Coeff = windowDirection('Start') === -1 ? 1 : -1
}

function toggleEndDirection() {
  ensureEndpoint('End').Coeff = windowDirection('End') === -1 ? 1 : -1
}

function windowDays(side: 'Start' | 'End') {
  const endpoint = props.window[side]
  const days = endpoint?.Days
  return days === null || days === undefined ? '' : String(days)
}

function setWindowDays(side: 'Start' | 'End', value: string) {
  if (isClearedInput(value)) {
    ensureEndpoint(side).Days = null
    return
  }
  const parsed = toFiniteNumber(value)
  if (parsed === undefined) return
  ensureEndpoint(side).Days = parsed
}

function windowDirection(side: 'Start' | 'End') {
  return props.window[side]?.Coeff === -1 ? -1 : 1
}

function daysChipLabel(side: 'Start' | 'End') {
  const endpoint = props.window[side]
  const days = endpoint?.Days
  if (days === null || days === undefined) {
    return t('common.allDays', 'all days').value
  }

  return `${days} ${days === 1 ? t('common.day', 'day').value : t('common.days', 'days').value}`
}

function ensureEndpoint(side: 'Start' | 'End') {
  if (!props.window[side]) {
    props.window[side] = {
      Days: null,
      Coeff: side === 'Start' ? -1 : 1,
    }
  }

  return props.window[side]!
}
</script>

<style scoped>
.window-editor {
  background: rgb(var(--v-theme-surface));
}

.window-editor__row {
  display: inline-flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 10px;
  white-space: nowrap;
  width: max-content;
}

.window-editor__chip {
  cursor: pointer;
  white-space: nowrap;
}

.window-editor__clear-icon {
  margin-left: 4px;
}

.window-editor__chip :deep(.v-chip__content) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.window-editor__connector {
  font-weight: 700;
  text-transform: lowercase;
  color: rgb(var(--v-theme-on-surface));
  opacity: 0.72;
  white-space: nowrap;
}

.window-editor__editor-popover {
  min-width: 220px;
}
</style>