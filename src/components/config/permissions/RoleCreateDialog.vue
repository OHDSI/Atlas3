<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title>
        {{ isEditMode ? 'Edit Role' : 'Create New Role' }}
      </v-card-title>

      <v-card-text>
        <v-form
          ref="formRef"
          v-model="formValid"
          @submit.prevent="handleSubmit"
        >
          <!-- Name Field -->
          <v-text-field
            v-model="form.name"
            label="Role Name *"
            :rules="nameRules"
            :error-messages="errors.name"
            variant="outlined"
            required
            class="mb-2"
            autofocus
            :disabled="saving"
          />

          <!-- Description Field -->
          <v-textarea
            v-model="form.description"
            label="Description"
            rows="3"
            :error-messages="errors.description"
            variant="outlined"
            class="mt-2"
            :disabled="saving"
          />
        </v-form>

        <!-- Server Error Message -->
        <v-alert
          v-if="serverError"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="serverError = null"
        >
          {{ serverError }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="saving"
          @click="handleClose"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          :disabled="!formValid || saving"
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
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

interface Props {
  modelValue: boolean
  role: Role | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [role: Role]
}>()

const { createRole, updateRole, roles } = useRoles()

const formRef = ref()
const formValid = ref(false)
const saving = ref(false)
const serverError = ref<string | null>(null)

const form = ref<{
  name: string
  description?: string
}>({
  name: '',
  description: '',
})

const isEditMode = computed(() => !!props.role?.id)

// Validation rules (FR-007: non-empty, 1-255 chars)
const nameRules = [
  (v: string) => !!v || 'Role name is required',
  (v: string) => (v && v.trim().length > 0) || 'Role name cannot be empty',
  (v: string) => (v && v.length <= 255) || 'Role name must be less than 255 characters',
  // FR-006: Check for duplicate names
  (v: string) => {
    if (!v) return true // Let required rule handle empty

    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(
      r => r.name.toLowerCase() === trimmedName && r.id !== props.role?.id
    )

    return !isDuplicate || 'A role with this name already exists'
  },
]

const errors = ref<Record<string, string>>({})

// Watch for role changes to populate form
watch(
  () => props.role,
  role => {
    serverError.value = null
    errors.value = {}

    if (role) {
      // Edit mode: populate form with role data
      form.value = {
        name: role.name,
        description: role.description || '',
      }
    } else {
      // Create mode: reset form
      form.value = {
        name: '',
        description: '',
      }
    }
  },
  { immediate: true }
)

async function handleSubmit() {
  serverError.value = null
  errors.value = {}

  // Validate form
  const valid = await formRef.value?.validate()
  if (!valid.valid) return

  saving.value = true

  try {
    let result: Role | null = null

    if (isEditMode.value && props.role) {
      // Build payload with only changed fields
      const payload: { name?: string; description?: string } = {}
      const trimmedName = form.value.name.trim()
      const trimmedDescription = form.value.description?.trim() || ''
      const originalDescription = props.role.description || ''

      if (trimmedName !== props.role.name) {
        payload.name = trimmedName
      }

      if (trimmedDescription !== originalDescription) {
        payload.description = trimmedDescription || undefined
      }

      // No changes - close dialog
      if (Object.keys(payload).length === 0) {
        emit('update:modelValue', false)
        return
      }

      const success = await updateRole(props.role.id, payload)

      if (success) {
        // Get the updated role from the store
        result = { ...props.role, ...form.value }
      }
    } else {
      // Create new role
      result = await createRole({
        name: form.value.name.trim(),
        description: form.value.description?.trim() || undefined,
      })
    }

    if (result) {
      emit('success', result)
      emit('update:modelValue', false)
    } else {
      serverError.value = isEditMode.value
        ? 'Failed to update role. Please try again.'
        : 'Failed to create role. Please try again.'
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred'
    serverError.value = message
  } finally {
    saving.value = false
  }
}

function handleClose() {
  if (!saving.value) {
    serverError.value = null
    errors.value = {}
    emit('update:modelValue', false)
  }
}
</script>

<style scoped>
/* No custom styles needed - using Vuetify defaults */
</style>
