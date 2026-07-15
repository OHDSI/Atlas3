<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="Tag Group"
    :title="
      isEditMode
        ? t('config.tags.dialog.editTitle', 'Edit Tag Group').value
        : t('config.tags.dialog.createTitle', 'Create Tag Group').value
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
        :label="tv('config.tags.dialog.fields.color.label', 'Color')"
        type="color"
        :hint="tv('components.config.tags.colorHexHint', 'Hex color code for visual identification')"
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
        :label="tv('config.tags.dialog.fields.icon.label', 'Icon')"
        :hint="tv('components.config.tags.iconMdiFolderHint', 'Material Design Icon name (e.g., mdi-tag, mdi-folder)')"
        persistent-hint
        :error="errors.icon"
        variant="outlined"
        class="mb-2"
      />

      <AtlasCheckbox
        v-model="form.mandatory"
        :label="tv('config.tags.dialog.fields.mandatory.label', 'Mandatory')"
        :hint="tv('config.tags.dialog.fields.mandatory.hint', 'Tags from this group are required on all assets')"
        persistent-hint
      />

      <AtlasCheckbox
        v-model="form.showGroup"
        :label="tv('config.tags.dialog.fields.showColumn.label', 'Show as Column')"
        :hint="tv('config.tags.dialog.fields.showColumn.hint', 'Display as a column in asset tables')"
        persistent-hint
      />

      <AtlasCheckbox
        v-model="form.multiSelection"
        :label="tv('config.tags.dialog.fields.multiple.label', 'Allow Multiple')"
        :hint="tv('config.tags.dialog.fields.multiple.hint', 'Allow multiple tags from this group per asset')"
        persistent-hint
      />

      <AtlasCheckbox
        v-model="form.allowCustom"
        :label="tv('config.tags.dialog.fields.freeForm.label', 'Free-form')"
        :hint="tv('config.tags.dialog.fields.freeForm.hint', 'Allow users to create custom tags in this group')"
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
import { tagGroupSchema, type TagGroup } from '@/models/config.types'
import { AtlasButton, AtlasCheckbox, AtlasDialog, AtlasTextField } from '@/components/ui'

const { t, tv } = useI18n()

interface Props {
  modelValue: boolean
  tagGroup: TagGroup | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [tagGroup: TagGroup]
}>()

const formValid = ref(false)
const saving = ref(false)
const errors = ref<Record<string, string>>({})

const form = ref<Partial<TagGroup>>({
  name: '',
  color: '#1976D2',
  icon: '',
  mandatory: false,
  showGroup: true,
  multiSelection: false,
  allowCustom: false,
  description: '',
  groups: [],
})

const isEditMode = computed(() => !!props.tagGroup?.id)


const nameRules = [
  (v: string) => !!v || tv('config.tags.dialog.fields.name.required', 'Name is required'),
  (v: string) =>
    v?.length <= 255 ||
    tv('components.config.tags.nameTooLong', 'Name must be less than 255 characters'),
]

// Watch for tag group changes to populate form
watch(
  () => props.tagGroup,
  tagGroup => {
    if (tagGroup) {
      // Edit mode: populate form with tag group data
      form.value = { ...tagGroup }
    } else {
      // Create mode: reset form
      form.value = {
        name: '',
        color: '#1976D2',
        icon: '',
        mandatory: false,
        showGroup: true,
        multiSelection: false,
        allowCustom: false,
        description: '',
        groups: [],
      }
    }
    errors.value = {}
  },
  { immediate: true }
)

async function handleSubmit() {
  errors.value = {}

  // Validate with Zod
  const result = tagGroupSchema.safeParse(form.value)

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
    emit('save', result.data as TagGroup)
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
