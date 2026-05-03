<template>
  <v-form
    ref="formRef"
    v-model="formValid"
    @submit.prevent="handleSubmit"
  >
    <!-- Tag Group Selector -->
    <AtlasSelect
      v-model="form.selectedGroup"
      :items="tagGroups"
      item-title="name"
      item-value="id"
      label="Tag Group *"
      :rules="groupRules"
      :error="errors.groups"
      variant="outlined"
      return-object
      required
      class="mb-2"
    >
      <template #prepend-inner>
        <AtlasIcon>mdi-folder</AtlasIcon>
      </template>
    </AtlasSelect>

    <!-- Tag Name -->
    <AtlasTextField
      v-model="form.name"
      label="Tag Name *"
      :rules="nameRules"
      :error="errors.name"
      variant="outlined"
      required
      class="mb-2"
    />

    <!-- Color Picker -->
    <v-text-field
      v-model="form.color"
      label="Color (optional)"
      type="color"
      :hint="
        form.selectedGroup
          ? `Defaults to group color (${form.selectedGroup.color || '#1976D2'})`
          : 'Select a tag group first'
      "
      persistent-hint
      :error-messages="errors.color"
      variant="outlined"
      class="mb-2"
    >
      <template #prepend-inner>
        <div
          class="color-preview"
          :style="{ backgroundColor: effectiveColor }"
        />
      </template>
    </v-text-field>

    <!-- Advanced Options -->
    <v-expansion-panels
      v-model="showAdvanced"
      class="mb-4"
    >
      <v-expansion-panel>
        <v-expansion-panel-title>
          <AtlasIcon start>
            mdi-cog
          </AtlasIcon>
          Show Advanced Options
        </v-expansion-panel-title>
        <v-expansion-panel-text>
          <!-- Icon Field -->
          <v-text-field
            v-model="form.icon"
            label="Icon (optional)"
            hint="Material Design Icon name (e.g., mdi-star)"
            persistent-hint
            :error-messages="errors.icon"
            variant="outlined"
            class="mb-2"
          >
            <template #prepend-inner>
              <AtlasIcon v-if="form.icon && isValidIcon">
                {{ form.icon }}
              </AtlasIcon>
            </template>
          </v-text-field>

          <!-- Permission Protected -->
          <AtlasCheckbox
            v-model="form.permissionProtected"
            label="Permission Protected"
            hint="Require special permissions to assign/unassign this tag"
            persistent-hint
            class="mb-2"
          />

          <!-- Description Field -->
          <AtlasTextField
            v-model="form.description"
            label="Description"
            :rows="2"
            multiline
            :error="errors.description"
            variant="outlined"
          />
        </v-expansion-panel-text>
      </v-expansion-panel>
    </v-expansion-panels>

    <!-- Action Buttons -->
    <div class="d-flex justify-end gap-2">
      <AtlasButton
        variant="ghost"
        :disabled="saving"
        @click="handleCancel"
      >
        Cancel
      </AtlasButton>
      <AtlasButton
        type="submit"
        :disabled="!formValid"
        :loading="saving"
      >
        Create Tag
      </AtlasButton>
    </div>

    <!-- Success/Error Messages -->
    <v-alert
      v-if="successMessage"
      type="success"
      variant="tonal"
      density="compact"
      closable
      class="mt-4"
      @click:close="successMessage = ''"
    >
      {{ successMessage }}
    </v-alert>

    <v-alert
      v-if="errorMessage"
      type="error"
      variant="tonal"
      density="compact"
      closable
      class="mt-4"
      @click:close="errorMessage = ''"
    >
      {{ errorMessage }}
    </v-alert>
  </v-form>
</template>

<script setup lang="ts">
import { AtlasButton, AtlasCheckbox, AtlasIcon, AtlasSelect, AtlasTextField } from '@/components/ui'
import { ref, computed } from 'vue'
import { tagSchema, type Tag as ConfigTag, type TagGroup } from '@/models/config.types'
import type { Tag } from '@/models/cohort.types'
import { useConfigStore } from '@/stores/config'
import { logger } from '@/utils/logger'

interface Props {
  tagGroups: TagGroup[]
}

defineProps<Props>()
const emit = defineEmits<{
  created: [tag: Tag]
  cancel: []
}>()

const configStore = useConfigStore()

const formRef = ref()
const formValid = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})
const successMessage = ref('')
const errorMessage = ref('')
const showAdvanced = ref<number | undefined>(undefined)

const form = ref<{
  selectedGroup: TagGroup | null
  name: string
  color: string
  icon: string
  permissionProtected: boolean
  description: string
}>({
  selectedGroup: null,
  name: '',
  color: '',
  icon: '',
  permissionProtected: false,
  description: '',
})

const effectiveColor = computed(() => {
  if (form.value.color) {
    return form.value.color
  }
  if (form.value.selectedGroup?.color) {
    return form.value.selectedGroup.color
  }
  return '#1976D2' // Default primary color
})

const isValidIcon = computed(() => {
  return !form.value.icon || form.value.icon.startsWith('mdi-') || form.value.icon.startsWith('fa-')
})

const nameRules = [
  (v: string) => !!v || 'Tag name is required',
  (v: string) => v?.length <= 255 || 'Tag name must be less than 255 characters',
]

const groupRules = [(v: TagGroup | null) => !!v || 'Tag group is required']

function resetForm() {
  form.value = {
    selectedGroup: null,
    name: '',
    color: '',
    icon: '',
    permissionProtected: false,
    description: '',
  }
  errors.value = {}
  showAdvanced.value = undefined
  formRef.value?.resetValidation()
}

async function handleSubmit() {
  errors.value = {}
  successMessage.value = ''
  errorMessage.value = ''

  if (!form.value.selectedGroup) {
    errors.value.groups = 'Tag group is required'
    return
  }

  const tagData: Partial<ConfigTag> = {
    name: form.value.name,
    color: form.value.color || form.value.selectedGroup.color,
    icon: form.value.icon || undefined,
    permissionProtected: form.value.permissionProtected || undefined,
    description: form.value.description || undefined,
    groups: [form.value.selectedGroup],
  }

  const result = tagSchema.safeParse(tagData)

  if (!result.success) {
    result.error.errors.forEach(err => {
      const field = err.path[0] as string
      errors.value[field] = err.message
    })
    return
  }

  saving.value = true

  try {
    const createdTag = await configStore.createTag(result.data as ConfigTag)

    const cohortTag: Tag = {
      id: createdTag.id,
      name: createdTag.name,
      color: createdTag.color,
    }

    successMessage.value = `Tag "${createdTag.name}" created successfully!`
    emit('created', cohortTag)

    setTimeout(() => {
      resetForm()
      successMessage.value = ''
    }, 2000)
  } catch (error) {
    logger.error('CreateTagForm', 'Failed to create tag', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Failed to create tag. Please try again.'
  } finally {
    saving.value = false
  }
}

function handleCancel() {
  resetForm()
  emit('cancel')
}
</script>

<style scoped>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}

.gap-2 {
  gap: 8px;
}
</style>
