<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="Tag"
    :title="`${isEditMode ? 'Edit' : 'Create'} Tag`"
    max-width="600"
    persistent
    :show-close="false"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-form
      ref="formRef"
      v-model="formValid"
      @submit.prevent="handleSubmit"
    >
      <AtlasTextField
        v-model="form.name"
        label="Name"
        :rules="nameRules"
        :error="errors.name"
        variant="outlined"
        required
        class="mb-2"
      />

      <v-text-field
        v-model="form.color"
        label="Color (optional)"
        type="color"
        hint="Leave empty to inherit from group"
        persistent-hint
        :error-messages="errors.color"
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
      </v-text-field>

      <AtlasTextField
        v-model="form.icon"
        label="Icon (optional)"
        hint="Material Design Icon name or leave empty to inherit from group"
        persistent-hint
        :error="errors.icon"
        variant="outlined"
        class="mb-2"
      />

      <AtlasCheckbox
        v-model="form.permissionProtected"
        label="Permission Protected"
        hint="Require special permissions to assign/unassign this tag"
        persistent-hint
      />

      <AtlasTextField
        v-model="form.description"
        label="Description"
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
        Cancel
      </AtlasButton>
      <AtlasButton
        :disabled="!formValid"
        :loading="saving"
        @click="handleSubmit"
      >
        {{ isEditMode ? 'Save' : 'Create' }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { tagSchema, type Tag, type TagGroup } from '@/models/config.types'
import { AtlasButton, AtlasCheckbox, AtlasDialog, AtlasTextField } from '@/components/ui'

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

const formRef = ref()
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
  (v: string) => !!v || 'Name is required',
  (v: string) => v?.length <= 255 || 'Name must be less than 255 characters',
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
