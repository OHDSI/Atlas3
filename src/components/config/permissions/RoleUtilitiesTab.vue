<template>
  <v-card class="role-utilities-tab">
    <v-card-text>
      <p class="text-body-1 mb-6">
        {{
          t(
            'components.config.permissions.utilitiesIntro',
            'Import and export role configurations for backup, deployment, or sharing across environments.'
          ).value
        }}
      </p>

      <!-- Export Section -->
      <div class="role-utilities-tab__section">
        <div class="role-utilities-tab__section-header">
          <AtlasIcon
            size="large"
            color="primary"
            class="mr-3"
          >
            mdi-download
          </AtlasIcon>
          <div>
            <h3 class="text-h6">
              {{ t('components.config.permissions.exportRole', 'Export Role').value }}
            </h3>
            <p class="text-body-2 text-medium-emphasis">
              {{
                t(
                  'components.config.permissions.exportRoleDescription',
                  "Download this role's configuration as a JSON file, including all permissions and user assignments."
                ).value
              }}
            </p>
          </div>
        </div>

        <div class="role-utilities-tab__section-content">
          <AtlasAlert
            severity="info"
            class="mb-4"
          >
            {{
              t(
                'components.config.permissions.exportCompatNote',
                'The exported file will be compatible with Atlas 2.x and can be imported into any Atlas instance.'
              ).value
            }}
          </AtlasAlert>

          <AtlasButton
            icon="mdi-download"
            :loading="isExporting"
            @click="handleExport"
          >
            {{ t('components.config.permissions.exportRoleAsJson', 'Export Role as JSON').value }}
          </AtlasButton>
        </div>
      </div>

      <AtlasDivider class="my-6" />

      <!-- Import Section -->
      <div class="role-utilities-tab__section">
        <div class="role-utilities-tab__section-header">
          <AtlasIcon
            size="large"
            color="primary"
            class="mr-3"
          >
            mdi-upload
          </AtlasIcon>
          <div>
            <h3 class="text-h6">
              {{ t('components.config.permissions.importRole', 'Import Role').value }}
            </h3>
            <p class="text-body-2 text-medium-emphasis">
              {{
                t(
                  'components.config.permissions.importRoleDescription',
                  'Import a role configuration from a JSON file. This will create a new role with the specified permissions and users.'
                ).value
              }}
            </p>
          </div>
        </div>

        <div class="role-utilities-tab__section-content">
          <AtlasAlert
            severity="warning"
            class="mb-4"
          >
            <strong>{{ t('components.config.permissions.noteLabel', 'Note:').value }}</strong>
            {{
              t(
                'components.config.permissions.importRoleNote',
                'Importing a role will create a new role. If a role with the same name exists, you will be prompted to rename it.'
              ).value
            }}
          </AtlasAlert>

          <AtlasButton
            icon="mdi-upload"
            @click="importDialogOpen = true"
          >
            {{ t('components.config.permissions.importRoleFromJson', 'Import Role from JSON').value }}
          </AtlasButton>
        </div>
      </div>

      <!-- Success Message -->
      <AtlasAlert
        v-if="successMessage"
        severity="success"
        class="mt-6"
        :closable="true"
        @close="successMessage = null"
      >
        {{ successMessage }}
      </AtlasAlert>

      <AtlasAlert
        v-if="errorMessage"
        severity="danger"
        class="mt-6"
        :closable="true"
        @close="errorMessage = null"
      >
        {{ errorMessage }}
      </AtlasAlert>
    </v-card-text>

    <!-- Import Dialog -->
    <role-import-dialog
      v-model="importDialogOpen"
      @success="handleImportSuccess"
    />
  </v-card>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasDivider, AtlasIcon } from '@/components/ui'
import { ref } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'
import RoleImportDialog from './RoleImportDialog.vue'

const { t, tv } = useI18n()

interface Props {
  roleId: number
  roleName: string
}

const props = defineProps<Props>()

const { exportRole } = useRoles()

// State
const isExporting = ref(false)
const importDialogOpen = ref(false)
const successMessage = ref<string | null>(null)
const errorMessage = ref<string | null>(null)

/**
 * Handle export
 */
async function handleExport() {
  isExporting.value = true
  successMessage.value = null
  errorMessage.value = null

  try {
    const jsonData = await exportRole(props.roleId)

    if (!jsonData) {
      throw new Error(tv('components.config.permissions.exportRoleError', 'Failed to export role'))
    }

    // Create blob and download
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url

    // Generate filename: role-name-YYYY-MM-DD.json
    const date = new Date().toISOString().split('T')[0]
    const safeName = props.roleName.replace(/[^a-z0-9]/gi, '-').toLowerCase()
    link.download = `role-${safeName}-${date}.json`

    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    successMessage.value = tv(
      'components.config.permissions.roleExported',
      'Role "{name}" exported successfully',
      { name: props.roleName }
    )
  } catch (error) {
    errorMessage.value =
      error instanceof Error
        ? error.message
        : tv('components.config.permissions.exportRoleError', 'Failed to export role')
  } finally {
    isExporting.value = false
  }
}

/**
 * Handle import success
 */
function handleImportSuccess(roleName: string) {
  successMessage.value = tv(
    'components.config.permissions.roleImported',
    'Role "{name}" imported successfully',
    { name: roleName }
  )
  // Could emit event to parent to refresh role list if needed
}
</script>

<style scoped>
.role-utilities-tab {
  border-radius: 4px;
}

.role-utilities-tab__section {
  padding: 16px 0;
}

.role-utilities-tab__section-header {
  display: flex;
  align-items: flex-start;
  margin-bottom: 16px;
}

.role-utilities-tab__section-content {
  margin-left: 52px;
}
</style>
