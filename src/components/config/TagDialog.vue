<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="Tag"
    :title="
      isEditMode
        ? t('configuration.tagManagement.editTag').value
        : t('configuration.tagManagement.createTag').value
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
        :label="tv('config.tags.dialog.fields.name.label')"
        :rules="nameRules"
        :error="errors.name"
        variant="outlined"
        required
        class="mb-2"
      />

      <AtlasTextField
        v-model="form.color"
        :label="tv('components.tags.colorOptional')"
        type="color"
        :hint="tv('components.config.tags.inheritColorHint')"
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
        :label="tv('components.tags.iconOptional')"
        :hint="tv('components.config.tags.iconInheritHint')"
        persistent-hint
        :error="errors.icon"
        variant="outlined"
        class="mb-2"
      />

      <AtlasCheckbox
        v-model="form.permissionProtected"
        :label="tv('components.tags.permissionProtected')"
        :hint="tv('components.tags.permissionProtectedHint')"
        persistent-hint
      />

      <AtlasTextField
        v-model="form.description"
        :label="tv('config.tags.dialog.fields.description.label')"
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
        {{ t('common.cancel').value }}
      </AtlasButton>
      <AtlasButton
        :disabled="!formValid"
        :loading="saving"
        @click="handleSubmit"
      >
        {{
          isEditMode
            ? t('common.save').value
            : t('common.create').value
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
  (v: string) => !!v || tv('commonErrors.nameRequired'),
  (v: string) =>
    v?.length <= 255 ||
    tv('components.config.tags.nameTooLong'),
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
      errors.value[field] = tv(err.message)
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
  border: 1px solid var(--atlas-color-outline-strong);
}
</style>
