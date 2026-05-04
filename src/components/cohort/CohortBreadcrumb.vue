<template>
  <nav class="cohort-breadcrumb">
    <span
      class="cohort-breadcrumb__item cohort-breadcrumb__item--link"
      @click="$emit('navigate-back')"
    >{{ t('navigation.cohortdefinitions') }}</span>
    <span class="cohort-breadcrumb__separator">›</span>
    <span class="cohort-breadcrumb__item cohort-breadcrumb__item--active">
      {{ modelValue || t('cohortDefinitions.newDefinition') }}
    </span>
    <AtlasTooltip
      :text="t('columns.name', 'Name').value"
      location="bottom"
    >
      <template #activator="{ props: tooltipProps }">
        <AtlasIcon
          v-bind="tooltipProps"
          size="small"
          class="cohort-breadcrumb__edit-icon"
          @click="showEditDialog = true"
        >
          mdi-pencil
        </AtlasIcon>
      </template>
    </AtlasTooltip>

    <!-- Edit Name Dialog -->
    <AtlasDialog
      v-model="showEditDialog"
      eyebrow="COHORT"
      :title="t('columns.name', 'Edit Cohort Name').value"
      max-width="600"
      @close="showEditDialog = false"
    >
      <AtlasTextField
        v-model="editingName"
        :label="t('columns.name', 'Name').value"
        :placeholder="tv('cohortDefinitions.newDefinitionTitle')"
        variant="outlined"
        autofocus
        @keyup.enter="saveEditedName"
      />
      <template #actions>
        <AtlasButton
          variant="ghost"
          @click="showEditDialog = false"
        >
          {{ t('common.cancel', 'Cancel') }}
        </AtlasButton>
        <AtlasButton
          @click="saveEditedName"
        >
          {{ t('common.save', 'Save') }}
        </AtlasButton>
      </template>
    </AtlasDialog>
  </nav>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasDialog, AtlasIcon, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { ref, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'

interface Props {
  modelValue: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'navigate-back'): void
}>()

const { t, tv } = useI18n()

const showEditDialog = ref(false)
const editingName = ref('')

// Initialize editing name when dialog opens
watch(showEditDialog, isOpen => {
  if (isOpen) {
    editingName.value = props.modelValue
  }
})

function saveEditedName() {
  if (editingName.value.trim()) {
    emit('update:modelValue', editingName.value.trim())
  }
  showEditDialog.value = false
}
</script>

<style scoped lang="scss">
.cohort-breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));

  &__item {
    font-size: 14px;
    color: rgba(var(--v-theme-on-surface), 0.7);

    &--link {
      cursor: pointer;
      &:hover {
        color: rgb(var(--v-theme-primary));
        text-decoration: underline;
      }
    }

    &--active {
      color: rgb(var(--v-theme-on-surface));
      font-weight: 500;
    }
  }

  &__separator {
    color: rgba(var(--v-theme-on-surface), 0.5);
  }

  &__edit-icon {
    cursor: pointer;
    margin-left: 4px;
    color: rgba(var(--v-theme-on-surface), 0.5);
    &:hover {
      color: rgb(var(--v-theme-primary));
    }
  }
}
</style>
