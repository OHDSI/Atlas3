<template>
  <v-dialog
    :model-value="modelValue"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title> Import Role </v-card-title>

      <v-card-text>
        <!-- File Upload -->
        <div v-if="!jsonData">
          <p class="text-body-2 mb-4">
            Select a JSON file to import a role configuration. The file should be in Atlas 2.x
            compatible format.
          </p>

          <v-file-input
            v-model="selectedFile"
            label="Select JSON file"
            accept=".json,application/json"
            prepend-icon="mdi-file-upload"
            variant="outlined"
            :error-messages="fileError"
            show-size
            @update:model-value="handleFileSelect"
          />
        </div>

        <!-- Conflict Resolution -->
        <div v-else-if="hasConflict">
          <v-alert
            type="warning"
            variant="tonal"
            class="mb-4"
          >
            <div class="text-h6 mb-2">
              Role Name Conflict
            </div>
            <p class="text-body-2">
              A role with the name <strong>"{{ parsedRoleName }}"</strong> already exists.
            </p>
          </v-alert>

          <p class="text-body-2 mb-4">
            How would you like to proceed?
          </p>

          <v-radio-group
            v-model="conflictResolution"
            class="mb-4"
          >
            <v-radio
              value="skip"
              label="Skip - Cancel the import"
            />
            <v-radio
              value="rename"
              label="Rename - Import with a new name"
            />
          </v-radio-group>

          <v-text-field
            v-if="conflictResolution === 'rename'"
            v-model="newRoleName"
            label="New Role Name"
            variant="outlined"
            :rules="nameRules"
            hint="Enter a unique name for the imported role"
            persistent-hint
          />
        </div>

        <!-- Preview -->
        <div v-else-if="isValidating">
          <v-progress-circular
            indeterminate
            color="primary"
          />
          <span class="ml-2">Validating import data...</span>
        </div>

        <div v-else-if="validationComplete">
          <v-alert
            type="info"
            variant="tonal"
            class="mb-4"
          >
            <div class="text-h6 mb-2">
              Ready to Import
            </div>
            <p class="text-body-2">
              The following role configuration will be imported:
            </p>
          </v-alert>

          <div class="import-preview">
            <div class="import-preview__item">
              <strong>Role Name:</strong> {{ displayRoleName }}
            </div>
            <div
              v-if="parsedDescription"
              class="import-preview__item"
            >
              <strong>Description:</strong> {{ parsedDescription }}
            </div>
            <div class="import-preview__item">
              <strong>Permissions:</strong> {{ permissionCount }}
            </div>
            <div class="import-preview__item">
              <strong>Users:</strong> {{ userCount }}
            </div>
          </div>

          <v-alert
            v-if="validationWarnings.length > 0"
            type="warning"
            variant="tonal"
            class="mt-4"
          >
            <div class="text-body-2 font-weight-bold mb-2">
              Warnings:
            </div>
            <ul class="text-body-2">
              <li
                v-for="(warning, index) in validationWarnings"
                :key="index"
              >
                {{ warning }}
              </li>
            </ul>
          </v-alert>
        </div>

        <!-- Error Message -->
        <v-alert
          v-if="errorMessage"
          type="error"
          variant="tonal"
          class="mt-4"
          closable
          @click:close="errorMessage = null"
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-card-actions>
        <v-spacer />
        <v-btn
          variant="text"
          :disabled="importing"
          @click="handleClose"
        >
          Cancel
        </v-btn>
        <v-btn
          v-if="!jsonData"
          color="primary"
          disabled
        >
          Next
        </v-btn>
        <v-btn
          v-else-if="hasConflict"
          color="primary"
          :disabled="conflictResolution === 'rename' && !isNewNameValid"
          @click="handleConflictResolution"
        >
          Continue
        </v-btn>
        <v-btn
          v-else-if="validationComplete"
          color="primary"
          :loading="importing"
          @click="handleImport"
        >
          Import Role
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useRoles } from '@/composables/useRoles'

interface Props {
  modelValue: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [roleName: string]
}>()

const { roles, importRole } = useRoles()

// State
const selectedFile = ref<File[] | null>(null)
const jsonData = ref<string | null>(null)
const fileError = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

// Parsed data
const parsedRoleName = ref('')
const parsedDescription = ref('')
const permissionCount = ref(0)
const userCount = ref(0)

// Conflict resolution
const hasConflict = ref(false)
const conflictResolution = ref<'skip' | 'rename'>('skip')
const newRoleName = ref('')

// Validation
const isValidating = ref(false)
const validationComplete = ref(false)
const validationWarnings = ref<string[]>([])

// Import state
const importing = ref(false)

// Name validation rules
const nameRules = [
  (v: string) => !!v || 'Role name is required',
  (v: string) => (v && v.trim().length > 0) || 'Role name cannot be empty',
  (v: string) => (v && v.length <= 255) || 'Role name must be less than 255 characters',
  (v: string) => {
    if (!v) return true
    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(r => r.name.toLowerCase() === trimmedName)
    return !isDuplicate || 'A role with this name already exists'
  },
]

const isNewNameValid = computed(() => {
  if (!newRoleName.value) return false
  return nameRules.every(rule => rule(newRoleName.value) === true)
})

const displayRoleName = computed(() => {
  if (conflictResolution.value === 'rename' && newRoleName.value) {
    return newRoleName.value
  }
  return parsedRoleName.value
})

/**
 * Handle file selection
 */
async function handleFileSelect(files: File | File[] | null) {
  fileError.value = null
  errorMessage.value = null
  jsonData.value = null

  if (!files) return

  const file = Array.isArray(files) ? files[0] : files
  if (!file) return

  // Validate file type
  if (!file.name.endsWith('.json')) {
    fileError.value = 'Please select a JSON file'
    selectedFile.value = null
    return
  }

  // Read file
  try {
    const text = await file.text()
    jsonData.value = text

    // Validate and parse
    await validateImportData(text)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to read file'
    selectedFile.value = null
  }
}

/**
 * Validate import data
 */
async function validateImportData(data: string) {
  isValidating.value = true
  validationComplete.value = false
  validationWarnings.value = []

  try {
    // Parse JSON
    const parsed = JSON.parse(data)

    // Validate structure
    if (!parsed.role || !parsed.role.name) {
      throw new Error('Invalid role import format: missing role name')
    }

    // Extract data
    parsedRoleName.value = parsed.role.name
    parsedDescription.value = parsed.role.description || ''
    permissionCount.value = parsed.role.permissions?.length || 0
    userCount.value = parsed.role.users?.length || 0

    // Check for name conflict (FR-027)
    const existingRole = roles.value.find(
      r => r.name.toLowerCase() === parsedRoleName.value.toLowerCase()
    )

    if (existingRole) {
      hasConflict.value = true
      isValidating.value = false
      return
    }

    // Validate permissions and users exist (FR-062)
    // Note: We can't validate if permissions/users exist in the system without fetching them
    // The import service will handle this validation
    if (permissionCount.value === 0) {
      validationWarnings.value.push('Role has no permissions assigned')
    }
    if (userCount.value === 0) {
      validationWarnings.value.push('Role has no users assigned')
    }

    validationComplete.value = true
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorMessage.value = 'Invalid JSON format. Please check the file and try again.'
    } else {
      errorMessage.value = error instanceof Error ? error.message : 'Failed to validate import data'
    }
  } finally {
    isValidating.value = false
  }
}

/**
 * Handle conflict resolution
 */
function handleConflictResolution() {
  if (conflictResolution.value === 'skip') {
    handleClose()
    return
  }

  if (conflictResolution.value === 'rename') {
    if (!isNewNameValid.value) return

    // Update the JSON data with new name
    try {
      const parsed = JSON.parse(jsonData.value!)
      parsed.role.name = newRoleName.value
      jsonData.value = JSON.stringify(parsed)

      // Move to validation
      hasConflict.value = false
      validationComplete.value = true
    } catch (error) {
      errorMessage.value = 'Failed to update role name'
    }
  }
}

/**
 * Handle import
 */
async function handleImport() {
  if (!jsonData.value) return

  importing.value = true
  errorMessage.value = null

  try {
    const result = await importRole(jsonData.value)

    if (result) {
      emit('success', result.name)
      handleClose()
    } else {
      errorMessage.value = 'Failed to import role. Please try again.'
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Failed to import role'
  } finally {
    importing.value = false
  }
}

/**
 * Handle close
 */
function handleClose() {
  if (!importing.value) {
    // Reset state
    selectedFile.value = null
    jsonData.value = null
    fileError.value = null
    errorMessage.value = null
    parsedRoleName.value = ''
    parsedDescription.value = ''
    permissionCount.value = 0
    userCount.value = 0
    hasConflict.value = false
    conflictResolution.value = 'skip'
    newRoleName.value = ''
    validationComplete.value = false
    validationWarnings.value = []

    emit('update:modelValue', false)
  }
}

// Reset state when dialog closes
watch(
  () => props.modelValue,
  isOpen => {
    if (!isOpen) {
      // Reset will happen in handleClose
    }
  }
)
</script>

<style scoped>
.import-preview {
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 4px;
  padding: 16px;
}

.import-preview__item {
  margin-bottom: 8px;
}

.import-preview__item:last-child {
  margin-bottom: 0;
}
</style>
