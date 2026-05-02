<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <AppDialogHeader
        eyebrow="Tag Group"
        :title="`${isEditMode ? 'Edit' : 'Create'} Tag Group`"
      />

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="formValid"
          @submit.prevent="handleSubmit"
        >
          <!-- Name Field -->
          <v-text-field
            v-model="form.name"
            label="Name *"
            :rules="nameRules"
            :error-messages="errors.name"
            variant="outlined"
            required
            class="mb-2"
          />

          <!-- Color Field -->
          <v-text-field
            v-model="form.color"
            label="Color"
            type="color"
            hint="Hex color code for visual identification"
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

          <!-- Icon Field -->
          <v-text-field
            v-model="form.icon"
            label="Icon"
            hint="Material Design Icon name (e.g., mdi-tag, mdi-folder)"
            persistent-hint
            :error-messages="errors.icon"
            variant="outlined"
            class="mb-2"
          >
            <template #prepend-inner>
              <v-icon v-if="form.icon && isValidIcon">
                {{ form.icon }}
              </v-icon>
            </template>
          </v-text-field>

          <!-- Boolean Flags -->
          <v-checkbox
            v-model="form.mandatory"
            label="Mandatory"
            hint="Tags from this group are required on all assets"
            persistent-hint
            density="compact"
          />

          <v-checkbox
            v-model="form.showGroup"
            label="Show as Column"
            hint="Display as a column in asset tables"
            persistent-hint
            density="compact"
          />

          <v-checkbox
            v-model="form.multiSelection"
            label="Allow Multiple"
            hint="Allow multiple tags from this group per asset"
            persistent-hint
            density="compact"
          />

          <v-checkbox
            v-model="form.allowCustom"
            label="Free-form"
            hint="Allow users to create custom tags in this group"
            persistent-hint
            density="compact"
          />

          <!-- Description Field -->
          <v-textarea
            v-model="form.description"
            label="Description"
            rows="3"
            :error-messages="errors.description"
            variant="outlined"
            class="mt-2"
          />
        </v-form>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid"
          :loading="saving"
          @click="handleSubmit"
        >
          {{ isEditMode ? 'Save' : 'Create' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { tagGroupSchema, type TagGroup } from '@/models/config.types'
import AppDialogHeader from '@/components/shared/AppDialogHeader.vue'

interface Props {
  modelValue: boolean
  tagGroup: TagGroup | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  save: [tagGroup: TagGroup]
}>()

const formRef = ref()
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

const isValidIcon = computed(() => {
  return form.value.icon?.startsWith('mdi-')
})

const nameRules = [
  (v: string) => !!v || 'Name is required',
  (v: string) => v?.length <= 255 || 'Name must be less than 255 characters',
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
