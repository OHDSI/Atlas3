<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="Tag"
    :title="
      isEditMode
        ? t('configuration.tagManagement.editTag', 'Edit Tag').value
        : t('configuration.tagManagement.createTag', 'Create Tag').value
    "
    max-width="600"
    persistent
    :show-close="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form
      v-model="formValid"
      @submit.prevent="handleSubmit"
    >
      <AtlasTextField
        v-model="form.name"
        :label="tv('config.tags.dialog.fields.name.label', 'Name')"
        :rules="nameRules"
        :error="errors.name"
        variant="outlined"
        required
        class="mb-2"
      />

      <AtlasTextField
        v-model="form.color"
        :label="tv('components.config.tags.colorOptional', 'Color (optional)')"
        type="color"
        :hint="tv('components.config.tags.inheritColorHint', 'Leave empty to inherit from group')"
        persistent-hint
        :error="errors.color"
        variant="outlined"
        class="mb-2"
      >
        <template #prepend-inner>
          <div
            v-if="form.color"
            class="color-preview"
            :style="{ backgroundColor: form.color }"
          />
        </template>
      </AtlasTextField>

      <AtlasTextField
        v-model="form.icon"
        :label="tv('components.config.tags.iconOptional', 'Icon (optional)')"
        :hint="tv('components.config.tags.iconInheritHint', 'Material Design Icon name or leave empty to inherit from group')"
        persistent-hint
        :error="errors.icon"
        variant="outlined"
        class="mb-2"
      />

      <AtlasCheckbox
        v-model="form.permissionProtected"
        :label="tv('components.config.tags.permissionProtected', 'Permission Protected')"
        :hint="tv('components.config.tags.permissionProtectedHint', 'Require special permissions to assign/unassign this tag')"
        persistent-hint
      />

      <AtlasTextField
        v-model="form.description"
        :label="tv('config.tags.dialog.fields.description.label', 'Description')"
        :rows="3"
        multiline
        :error="errors.description"
        variant="outlined"
        class="mt-2"
      />
    </v-form>

    <template #actions>
      <AtlasButton
        variant="ghost"
        @click="handleClose"
      >
        {{ t('config.tags.dialog.actions.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        :disabled="!formValid"
        :loading="saving"
        @click="handleSubmit"
      >
        {{
          isEditMode
            ? t('config.tags.dialog.actions.save', 'Save').value
            : t('config.tags.dialog.actions.create', 'Create').value
        }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { tagSchema, type Tag, type TagGroup } from '@/models/config.types'
import { AtlasButton, AtlasCheckbox, AtlasDialog, AtlasTextField } from '@/components/ui'

const { t, tv } = useI18n()

interface Props {
  modelValue: boolean
  tag: Tag | null
  tagGroup: TagGroup // The parent group for this tag
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [tag: Tag]
}>()

const formValid = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref<Partial<Tag>>({
  name: '',
  color: '',
  icon: '',
  permissionProtected: false,
  description: '',
  groups: [],
})

const isEditMode = computed(() => !!props.tag?.id)


const nameRules = [
  (v: string) => !!v || tv('config.tags.dialog.fields.name.required', 'Name is required'),
  (v: string) =>
    v?.length <= 255 ||
    tv('components.config.tags.nameTooLong', 'Name must be less than 255 characters'),
]

// Watch for tag changes to populate form
watch(
  () => props.tag,
  tag => {
    if (tag) {
      // Edit mode: populate form with tag data
      form.value = { ...tag }
    } else {
      // Create mode: reset form with parent group
      form.value = {
        name: '',
        color: '',
        icon: '',
        permissionProtected: false,
        description: '',
        groups: [props.tagGroup],
      }
    }
    errors.value = {}
  },
  { immediate: true }
)

async function handleSubmit() {
  errors.value = {}

  // Ensure groups array contains the parent group
  const tagData = {
    ...form.value,
    groups: [props.tagGroup],
  }

  // Validate with Zod
  const result = tagSchema.safeParse(tagData)

  if (!result.success) {
    // Map Zod errors to form fields
    result.error.errors.forEach(err => {
      const field = err.path[0] as string
      errors.value[field] = err.message
    })
    return
  }

  saving.value = true

  try {
    emit('save', result.data as Tag)
    // Parent handles actual save and closes dialog
  } finally {
    saving.value = false
  }
}

function handleClose() {
  emit('update:modelValue', false)
}
</script>

<style scoped>
.color-preview {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(0, 0, 0, 0.12);
}
</style>
