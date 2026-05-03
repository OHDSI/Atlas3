<!-- src/components/ui/AtlasDialog.vue -->
<template>
  <v-dialog
    :model-value="modelValue"
    :max-width="maxWidth"
    :persistent="persistent"
    @update:model-value="onModelValueUpdate"
  >
    <v-card class="atlas-dialog__card">
      <header class="atlas-dialog__header">
        <div class="atlas-dialog__title-block">
          <div class="atlas-dialog__eyebrow-row">
            <span class="text-eyebrow">{{ eyebrow }}</span>
            <span class="atlas-dialog__accent-rule" />
          </div>
          <h2
            v-if="title"
            class="atlas-dialog__title"
          >
            {{ title }}
          </h2>
          <p
            v-if="subtitle"
            class="atlas-dialog__subtitle"
          >
            {{ subtitle }}
          </p>
        </div>
        <AtlasIconButton
          v-if="showClose"
          icon="mdi-close"
          variant="text"
          size="sm"
          tone="neutral"
          v-bind="{ ariaLabel: closeLabel }"
          @click="closeFromButton"
        />
      </header>

      <v-divider />

      <div class="atlas-dialog__body">
        <slot />
      </div>

      <div
        v-if="$slots.actions"
        class="atlas-dialog__actions"
      >
        <slot name="actions" />
      </div>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { VDialog, VCard, VDivider } from 'vuetify/components'
import AtlasIconButton from './AtlasIconButton.vue'

interface Props {
  modelValue: boolean
  eyebrow: string
  title?: string
  subtitle?: string
  maxWidth?: number | string
  persistent?: boolean
  showClose?: boolean
  closeLabel?: string
}

withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  maxWidth: 560,
  persistent: false,
  showClose: true,
  closeLabel: 'Close',
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  close: []
}>()

defineOptions({ inheritAttrs: false })

function onModelValueUpdate(open: boolean) {
  emit('update:modelValue', open)
  if (!open) emit('close')
}

function closeFromButton() {
  emit('update:modelValue', false)
  emit('close')
}
</script>

<style scoped>
.atlas-dialog__card {
  background-color: rgb(var(--v-theme-surface));
}

.atlas-dialog__header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 14px;
}

.atlas-dialog__title-block {
  flex: 1;
  min-width: 0;
}

.atlas-dialog__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.atlas-dialog__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.atlas-dialog__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.atlas-dialog__subtitle {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 0;
}

.atlas-dialog__body {
  padding: 20px 24px;
}

.atlas-dialog__actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 12px 24px 20px;
}
</style>
