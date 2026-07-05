<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="SETTINGS"
    :title="
      isEditMode
        ? t('components.config.permissions.editRole', 'Edit Role').value
        : t('components.config.permissions.createNewRole', 'Create New Role').value
    "
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <v-form
      ref="formRef"
      v-model="formValid"
      @submit.prevent="handleSubmit"
    >
      <AtlasTextField
        v-model="form.name"
        :label="tv('components.config.permissions.roleNameRequiredLabel', 'Role Name *')"
        :rules="nameRules"
        :error="errors.name"
        variant="outlined"
        required
        class="mb-2"
        :disabled="saving"
      />

      <AtlasTextField
        v-model="form.description"
        :label="tv('common.description', 'Description')"
        :rows="3"
        multiline
        :error="errors.description"
        variant="outlined"
        class="mt-2"
        :disabled="saving"
      />
    </v-form>

    <AtlasAlert
      v-if="serverError"
      severity="danger"
      class="mt-4"
      :closable="true"
      @close="serverError = null"
    >
      {{ serverError }}
    </AtlasAlert>
    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="saving"
        @click="handleClose"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        :disabled="!formValid || saving"
        :loading="saving"
        @click="handleSubmit"
      >
        {{
          isEditMode
            ? t('common.save', 'Save').value
            : t('common.create', 'Create').value
        }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasTextField } from '@/components/ui'
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'
import type { Role } from '@/models/role.types'

const { t, tv } = useI18n()

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
  (v: string) => !!v || tv('components.config.permissions.roleNameRequired', 'Role name is required'),
  (v: string) =>
    (v && v.trim().length > 0) ||
    tv('components.config.permissions.roleNameEmpty', 'Role name cannot be empty'),
  (v: string) =>
    (v && v.length <= 255) ||
    tv('components.config.permissions.roleNameTooLong', 'Role name must be less than 255 characters'),
  // FR-006: Check for duplicate names
  (v: string) => {
    if (!v) return true // Let required rule handle empty

    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(
      r => r.name.toLowerCase() === trimmedName && r.id !== props.role?.id
    )

    return (
      !isDuplicate ||
      tv('components.config.permissions.roleNameExists', 'A role with this name already exists')
    )
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
        ? tv('components.config.permissions.updateRoleError', 'Failed to update role. Please try again.')
        : tv('components.config.permissions.createRoleError', 'Failed to create role. Please try again.')
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.unexpectedError', 'An unexpected error occurred')
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
