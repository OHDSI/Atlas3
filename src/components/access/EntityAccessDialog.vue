<template>
  <AtlasDialog
    :model-value="modelValue"
    :max-width="1120"
    persistent
    chromeless
    @update:model-value="emit('update:modelValue', $event)"
    @close="emit('close')"
  >
    <v-card class="entity-access-dialog__card">
      <header class="entity-access-dialog__header">
        <div class="entity-access-dialog__title-block">
          <div class="entity-access-dialog__eyebrow-row">
            <span class="text-eyebrow">{{ t('components.access.configureAccess', 'Configure access').value }}</span>
            <span class="entity-access-dialog__accent-rule" />
          </div>
          <h2 class="entity-access-dialog__title">
            {{ title || t('common.configureAccess', 'Configure access').value }}
          </h2>
          <p
            v-if="subtitle"
            class="entity-access-dialog__subtitle"
          >
            {{ subtitle }}
          </p>
        </div>
        <AtlasIconButton
          icon="mdi-close"
          v-bind="{ ariaLabel: t('common.close', 'Close').value }"
          variant="text"
          size="sm"
          @click="emit('update:modelValue', false)"
        />
      </header>

      <AtlasDivider />

      <div class="entity-access-dialog__scroll">
        <div class="entity-access-dialog__body">
          <AtlasAlert
            v-if="!entityId"
            severity="warning"
            class="mb-4"
          >
            {{
              t(
                'components.access.entityMissing',
                'Save the asset before assigning permissions.'
              ).value
            }}
          </AtlasAlert>

          <AtlasProgressLinear
            v-if="isLoading"
            indeterminate
            color="primary"
            class="mb-4"
          />

          <AtlasAlert
            v-else-if="errorMessage"
            severity="danger"
            class="mb-4"
            :closable="true"
            @close="errorMessage = null"
          >
            {{ errorMessage }}
          </AtlasAlert>

          <template v-else>
            <div class="entity-access-dialog__intro text-body-2 text-medium-emphasis mb-4">
              {{
                t(
                  'components.access.intro',
                  'Grant READ or WRITE access to this asset by assigning roles. WRITE implies READ.'
                ).value
              }}
            </div>

            <section class="entity-access-dialog__section">
              <div class="entity-access-dialog__section-header">
                <h3 class="text-h6">
                  {{ t('common.read', 'Read').value }}
                </h3>
                <AtlasChip
                  tone="primary"
                  size="sm"
                >
                  {{ readAccessRoles.length }}
                </AtlasChip>
              </div>

              <div class="entity-access-dialog__grant-row">
                <AtlasAutocomplete
                  v-model="readRoleName"
                  :items="readRoleSuggestionNames"
                  :label="t('components.access.addReadAccess', 'Add READ access to role').value"
                  :placeholder="t('components.access.searchRoles', 'Search roles...').value"
                  clearable
                  no-filter
                  class="entity-access-dialog__search"
                  @update:search="scheduleSuggestionLoad('READ', $event)"
                />

                <AtlasButton
                  variant="primary"
                  :disabled="!readRoleName.trim() || isLoadingRead || !entityId"
                  :loading="isLoadingRead"
                  @click="grantReadAccess"
                >
                  {{ t('common.add', 'Add').value }}
                </AtlasButton>
              </div>

              <AtlasDataTable
                :headers="accessHeaders"
                :items="readAccessRoles"
                :items-per-page="10"
                :items-per-page-options="[10, 25, 50]"
                class="entity-access-dialog__table elevation-1"
              >
                <template #item.description="{ item }">
                  {{ item.description || '—' }}
                </template>

                <template #item.actions="{ item }">
                  <AtlasIconButton
                    v-if="canRevokeRoleForItem(item)"
                    icon="mdi-delete-outline"
                    v-bind="{ ariaLabel: t('common.configureAccessModal.revoke', 'Revoke').value }"
                    variant="text"
                    size="sm"
                    tone="danger"
                    :disabled="isLoadingRead || !entityId"
                    @click="revokeAccess('READ', item)"
                  />
                  <span v-else>—</span>
                </template>
              </AtlasDataTable>
            </section>

            <section class="entity-access-dialog__section">
              <div class="entity-access-dialog__section-header">
                <h3 class="text-h6">
                  {{ t('common.write', 'Write').value }}
                </h3>
                <AtlasChip
                  tone="primary"
                  size="sm"
                >
                  {{ writeAccessRoles.length }}
                </AtlasChip>
              </div>

              <div class="entity-access-dialog__grant-row">
                <AtlasAutocomplete
                  v-model="writeRoleName"
                  :items="writeRoleSuggestionNames"
                  :label="t('components.access.addWriteAccess', 'Add WRITE access to role').value"
                  :placeholder="t('components.access.searchRoles', 'Search roles...').value"
                  clearable
                  no-filter
                  class="entity-access-dialog__search"
                  @update:search="scheduleSuggestionLoad('WRITE', $event)"
                />

                <AtlasButton
                  variant="primary"
                  :disabled="!writeRoleName.trim() || isLoadingWrite || !entityId"
                  :loading="isLoadingWrite"
                  @click="grantWriteAccess"
                >
                  {{ t('common.add', 'Add').value }}
                </AtlasButton>
              </div>

              <AtlasDataTable
                :headers="accessHeaders"
                :items="writeAccessRoles"
                :items-per-page="10"
                :items-per-page-options="[10, 25, 50]"
                class="entity-access-dialog__table elevation-1"
              >
                <template #item.description="{ item }">
                  {{ item.description || '—' }}
                </template>

                <template #item.actions="{ item }">
                  <AtlasIconButton
                    v-if="canRevokeRoleForItem(item)"
                    icon="mdi-delete-outline"
                    v-bind="{ ariaLabel: t('common.configureAccessModal.revoke', 'Revoke').value }"
                    variant="text"
                    size="sm"
                    tone="danger"
                    :disabled="isLoadingWrite || !entityId"
                    @click="revokeAccess('WRITE', item)"
                  />
                  <span v-else>—</span>
                </template>
              </AtlasDataTable>
            </section>
          </template>
        </div>
      </div>
    </v-card>
  </AtlasDialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  AtlasAlert,
  AtlasAutocomplete,
  AtlasButton,
  AtlasChip,
  AtlasDataTable,
  AtlasDialog,
  AtlasIconButton,
  AtlasProgressLinear,
  AtlasDivider,
} from '@/components/ui'
import { useI18n } from '@/composables/useI18n'
import { grantEntityAccess, loadRoleSuggestions, fetchEntityAccessRoles, revokeEntityAccess } from '@/services/access.service'
import type { AccessEntityType, AccessType } from '@/models/access.types'
import type { Role } from '@/models/role.types'

interface Props {
  modelValue: boolean
  entityType: AccessEntityType
  entityId: number | null
  title?: string
  subtitle?: string
  canRevokeRole?: (role: Role) => boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  subtitle: undefined,
  canRevokeRole: () => true,
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  close: []
}>()

const { t } = useI18n()

const isLoading = ref(false)
const isLoadingRead = ref(false)
const isLoadingWrite = ref(false)
const errorMessage = ref<string | null>(null)

const readAccessRoles = ref<Role[]>([])
const writeAccessRoles = ref<Role[]>([])

const readSearch = ref('')
const writeSearch = ref('')
const readRoleName = ref('')
const writeRoleName = ref('')
const readSuggestions = ref<Role[]>([])
const writeSuggestions = ref<Role[]>([])

const accessHeaders = [
  { title: t('columns.id', 'ID').value, key: 'id', width: '100px' },
  { title: t('columns.permission', 'Role').value, key: 'name' },
  { title: t('columns.description', 'Description').value, key: 'description' },
  { title: t('columns.action', 'Action').value, key: 'actions', sortable: false, width: '110px' },
]

const readRoleSuggestionNames = computed(() => readSuggestions.value.map(role => role.name))
const writeRoleSuggestionNames = computed(() => writeSuggestions.value.map(role => role.name))

let readSearchDebounce: ReturnType<typeof setTimeout> | null = null
let writeSearchDebounce: ReturnType<typeof setTimeout> | null = null

function canRevokeRoleForItem(role: Role): boolean {
  return props.canRevokeRole(role)
}

async function refreshReadAccess() {
  if (!props.entityId) {
    readAccessRoles.value = []
    return
  }
  isLoadingRead.value = true
  try {
    const result = await fetchEntityAccessRoles(props.entityType, props.entityId, 'READ')
    if (!result.success) throw result.error
    readAccessRoles.value = result.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoadingRead.value = false
  }
}

async function refreshWriteAccess() {
  if (!props.entityId) {
    writeAccessRoles.value = []
    return
  }
  isLoadingWrite.value = true
  try {
    const result = await fetchEntityAccessRoles(props.entityType, props.entityId, 'WRITE')
    if (!result.success) throw result.error
    writeAccessRoles.value = result.data
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : String(error)
  } finally {
    isLoadingWrite.value = false
  }
}

async function refreshReadSuggestions(search = readSearch.value) {
  const result = await loadRoleSuggestions(search)
  if (!result.success) {
    errorMessage.value = result.error.message
    return
  }
  readSuggestions.value = result.data
}

async function refreshWriteSuggestions(search = writeSearch.value) {
  const result = await loadRoleSuggestions(search)
  if (!result.success) {
    errorMessage.value = result.error.message
    return
  }
  writeSuggestions.value = result.data
}

function scheduleSuggestionLoad(accessType: AccessType, search: string) {
  if (accessType === 'READ') {
    readSearch.value = search
    if (readSearchDebounce) clearTimeout(readSearchDebounce)
    readSearchDebounce = setTimeout(() => {
      void refreshReadSuggestions(search)
    }, 250)
    return
  }

  writeSearch.value = search
  if (writeSearchDebounce) clearTimeout(writeSearchDebounce)
  writeSearchDebounce = setTimeout(() => {
    void refreshWriteSuggestions(search)
  }, 250)
}

async function grantAccess(accessType: AccessType, roleName: string, suggestions: Role[]) {
  if (!props.entityId) return
  const role = suggestions.find(candidate => candidate.name === roleName.trim())
  if (!role) {
    errorMessage.value = t('components.access.roleNotFound', 'Select a role from the list.').value
    return
  }

  const result = await grantEntityAccess(props.entityType, props.entityId, role.id, accessType)
  if (!result.success) {
    errorMessage.value = result.error.message
    return
  }

  errorMessage.value = null
  await Promise.all([refreshReadAccess(), refreshWriteAccess()])
}

async function grantReadAccess() {
  const roleName = readRoleName.value
  readRoleName.value = ''
  await grantAccess('READ', roleName, readSuggestions.value)
  await refreshReadSuggestions(readSearch.value)
}

async function grantWriteAccess() {
  const roleName = writeRoleName.value
  writeRoleName.value = ''
  await grantAccess('WRITE', roleName, writeSuggestions.value)
  await refreshWriteSuggestions(writeSearch.value)
}

async function revokeAccess(accessType: AccessType, role: Role) {
  if (!props.entityId) return
  const result = await revokeEntityAccess(props.entityType, props.entityId, role.id, accessType)
  if (!result.success) {
    errorMessage.value = result.error.message
    return
  }

  errorMessage.value = null
  await Promise.all([refreshReadAccess(), refreshWriteAccess()])
}

async function loadDialogData() {
  if (!props.modelValue) return
  isLoading.value = true
  errorMessage.value = null
  try {
    await Promise.all([
      refreshReadAccess(),
      refreshWriteAccess(),
      refreshReadSuggestions(readSearch.value),
      refreshWriteSuggestions(writeSearch.value),
    ])
  } finally {
    isLoading.value = false
  }
}

watch(
  () => [props.modelValue, props.entityId, props.entityType],
  () => {
    void loadDialogData()
  },
  { immediate: true }
)
</script>

<style scoped>
.entity-access-dialog__card {
  display: flex;
  flex-direction: column;
  max-height: min(90vh, 980px);
  background-color: rgb(var(--v-theme-surface));
}

.entity-access-dialog__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 20px 24px 14px;
  flex: none;
}

.entity-access-dialog__title-block {
  flex: 1;
  min-width: 0;
}

.entity-access-dialog__eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.entity-access-dialog__accent-rule {
  display: inline-block;
  width: 28px;
  height: 2px;
  background-color: rgb(var(--v-theme-orange));
  border-radius: 2px;
}

.entity-access-dialog__title {
  font-size: 22px;
  font-weight: 500;
  line-height: 1.3;
  margin: 0;
  color: rgb(var(--v-theme-primary));
}

.entity-access-dialog__subtitle {
  font-size: 13px;
  color: rgb(var(--v-theme-on-surface-variant));
  margin: 4px 0 0;
}

.entity-access-dialog__scroll {
  overflow-y: auto;
  flex: 1 1 auto;
}

.entity-access-dialog__body {
  padding: 20px 24px 24px;
}

.entity-access-dialog {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.entity-access-dialog__intro {
  max-width: 960px;
}

.entity-access-dialog__section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  border: 1px solid rgb(var(--v-theme-outline-variant));
  border-radius: 12px;
  background: rgba(var(--v-theme-surface-variant), 0.32);
}

.entity-access-dialog__section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.entity-access-dialog__grant-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.entity-access-dialog__search {
  flex: 1;
}

.entity-access-dialog__table {
  border-radius: 8px;
  overflow: hidden;
}
</style>