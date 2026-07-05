<template>
  <AtlasDialog
    :model-value="modelValue"
    eyebrow="IMPORT"
    :title="t('components.config.permissions.importRole', 'Import Role').value"
    max-width="600"
    persistent
    @update:model-value="$emit('update:modelValue', $event)"
    @close="handleClose"
  >
    <div>
      <!-- File Upload -->
      <div v-if="!jsonData">
        <p class="text-body-2 mb-4">
          {{
            t(
              'components.config.permissions.importSelectFileHelp',
              'Select a JSON file to import a role configuration. The file should be in Atlas 2.x compatible format.'
            ).value
          }}
        </p>

        <v-file-input
          v-model="selectedFile"
          :label="tv('components.config.permissions.selectJsonFile', 'Select JSON file')"
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
        <AtlasAlert
          severity="warning"
          class="mb-4"
        >
          <div class="text-h6 mb-2">
            {{ t('components.config.permissions.roleNameConflict', 'Role Name Conflict').value }}
          </div>
          <p class="text-body-2">
            {{ t('components.config.permissions.roleWithNamePrefix', 'A role with the name').value }}
            <strong>"{{ parsedRoleName }}"</strong>
            {{ t('components.config.permissions.alreadyExistsSuffix', 'already exists.').value }}
          </p>
        </AtlasAlert>

        <p class="text-body-2 mb-4">
          {{ t('components.config.permissions.howToProceed', 'How would you like to proceed?').value }}
        </p>

        <AtlasRadioGroup
          v-model="conflictResolution"
          class="mb-4"
        >
          <AtlasRadio
            value="skip"
            :label="tv('components.config.permissions.conflictSkip', 'Skip - Cancel the import')"
          />
          <AtlasRadio
            value="rename"
            :label="tv('components.config.permissions.conflictRename', 'Rename - Import with a new name')"
          />
        </AtlasRadioGroup>

        <AtlasTextField
          v-if="conflictResolution === 'rename'"
          v-model="newRoleName"
          :label="tv('components.config.permissions.newRoleName', 'New Role Name')"
          variant="outlined"
          :rules="nameRules"
          :hint="tv('components.config.permissions.newRoleNameHint', 'Enter a unique name for the imported role')"
          persistent-hint
        />
      </div>

      <!-- Preview -->
      <div v-else-if="isValidating">
        <AtlasProgressCircular
          indeterminate
          color="primary"
        />
        <span class="ml-2">{{ t('components.config.permissions.validatingImport', 'Validating import data...').value }}</span>
      </div>

      <div v-else-if="validationComplete">
        <AtlasAlert
          severity="info"
          class="mb-4"
        >
          <div class="text-h6 mb-2">
            {{ t('components.config.permissions.readyToImport', 'Ready to Import').value }}
          </div>
          <p class="text-body-2">
            {{
              t(
                'components.config.permissions.importPreviewIntro',
                'The following role configuration will be imported:'
              ).value
            }}
          </p>
        </AtlasAlert>

        <div class="import-preview">
          <div class="import-preview__item">
            <strong>{{ t('components.config.permissions.roleNameLabel', 'Role Name:').value }}</strong> {{ displayRoleName }}
          </div>
          <div
            v-if="parsedDescription"
            class="import-preview__item"
          >
            <strong>{{ t('components.config.permissions.descriptionLabel', 'Description:').value }}</strong> {{ parsedDescription }}
          </div>
          <div class="import-preview__item">
            <strong>{{ t('components.config.permissions.permissionsLabel', 'Permissions:').value }}</strong> {{ permissionCount }}
          </div>
          <div class="import-preview__item">
            <strong>{{ t('components.config.permissions.usersLabel', 'Users:').value }}</strong> {{ userCount }}
          </div>
        </div>

        <AtlasAlert
          v-if="validationWarnings.length > 0"
          severity="warning"
          class="mt-4"
        >
          <div class="text-body-2 font-weight-bold mb-2">
            {{ t('components.config.permissions.warningsLabel', 'Warnings:').value }}
          </div>
          <ul class="text-body-2">
            <li
              v-for="(warning, index) in validationWarnings"
              :key="index"
            >
              {{ warning }}
            </li>
          </ul>
        </AtlasAlert>
      </div>

      <!-- Error Message -->
      <AtlasAlert
        v-if="errorMessage"
        severity="danger"
        class="mt-4"
        :closable="true"
        @close="errorMessage = null"
      >
        {{ errorMessage }}
      </AtlasAlert>
    </div>
    <template #actions>
      <AtlasButton
        variant="ghost"
        :disabled="importing"
        @click="handleClose"
      >
        {{ t('common.cancel', 'Cancel').value }}
      </AtlasButton>
      <AtlasButton
        v-if="!jsonData"
        disabled
      >
        {{ t('components.config.permissions.next', 'Next').value }}
      </AtlasButton>
      <AtlasButton
        v-else-if="hasConflict"
        :disabled="conflictResolution === 'rename' && !isNewNameValid"
        @click="handleConflictResolution"
      >
        {{ t('components.config.permissions.continue', 'Continue').value }}
      </AtlasButton>
      <AtlasButton
        v-else-if="validationComplete"
        :loading="importing"
        @click="handleImport"
      >
        {{ t('components.config.permissions.importRole', 'Import Role').value }}
      </AtlasButton>
    </template>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDialog, AtlasProgressCircular, AtlasRadio, AtlasRadioGroup, AtlasTextField } from '@/components/ui'
import { ref, computed, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'

const { t, tv } = useI18n()

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
  (v: string) => !!v || tv('components.config.permissions.roleNameRequired', 'Role name is required'),
  (v: string) =>
    (v && v.trim().length > 0) ||
    tv('components.config.permissions.roleNameEmpty', 'Role name cannot be empty'),
  (v: string) =>
    (v && v.length <= 255) ||
    tv('components.config.permissions.roleNameTooLong', 'Role name must be less than 255 characters'),
  (v: string) => {
    if (!v) return true
    const trimmedName = v.trim().toLowerCase()
    const isDuplicate = roles.value.some(r => r.name.toLowerCase() === trimmedName)
    return (
      !isDuplicate ||
      tv('components.config.permissions.roleNameExists', 'A role with this name already exists')
    )
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
    fileError.value = tv('components.config.permissions.selectJsonFileError', 'Please select a JSON file')
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
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.readFileError', 'Failed to read file')
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
      throw new Error(
        tv(
          'components.config.permissions.invalidImportFormat',
          'Invalid role import format: missing role name'
        )
      )
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
      validationWarnings.value.push(
        tv('components.config.permissions.warnNoPermissions', 'Role has no permissions assigned')
      )
    }
    if (userCount.value === 0) {
      validationWarnings.value.push(
        tv('components.config.permissions.warnNoUsers', 'Role has no users assigned')
      )
    }

    validationComplete.value = true
  } catch (error) {
    if (error instanceof SyntaxError) {
      errorMessage.value = tv(
        'components.config.permissions.invalidJsonFormat',
        'Invalid JSON format. Please check the file and try again.'
      )
    } else {
      errorMessage.value =
        error instanceof Error
          ? error.message
          : tv('components.config.permissions.validateImportError', 'Failed to validate import data')
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
      errorMessage.value = tv(
        'components.config.permissions.updateRoleNameFailed',
        'Failed to update role name'
      )
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
      errorMessage.value = tv(
        'components.config.permissions.importRoleRetry',
        'Failed to import role. Please try again.'
      )
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.importRoleError', 'Failed to import role')
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
