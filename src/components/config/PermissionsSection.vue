<template>
  <div class="permissions-section">
    <!-- Role List View -->
    <div
      v-if="!selectedRoleId"
      class="permissions-section__list"
    >
      <!-- Header -->
      <div class="permissions-section__header">
        <AtlasTextField
          v-model="searchQuery"
          :placeholder="tv('components.config.permissions.searchRoles', 'Search roles...')"
          prepend-icon="mdi-magnify"
          variant="outlined"
          hide-details
          clearable
          class="permissions-section__search"
        />
        <AtlasSpacer />
        <AtlasButton
          icon="mdi-plus"
          @click="showCreateDialog = true"
        >
          {{ t('components.config.permissions.newRole', 'New Role').value }}
        </AtlasButton>
      </div>

      <!-- Loading -->
      <AtlasProgressLinear
        v-if="isLoadingRoles"
        indeterminate
        color="primary"
        class="my-4"
      />

      <!-- Error (hidden for 401 when not authenticated) -->
      <AtlasAlert
        v-if="visibleError"
        severity="danger"
        class="my-4"
        :closable="true"
      >
        {{ visibleError }}
      </AtlasAlert>

      <!-- Empty State -->
      <div
        v-if="!isLoadingRoles && roles.length === 0"
        class="permissions-section__empty"
      >
        <AtlasIcon
          size="64"
          color="grey-lighten-1"
        >
          mdi-shield-account-outline
        </AtlasIcon>
        <p class="text-body-2 text-medium-emphasis mt-4">
          {{
            t(
              'components.config.permissions.noRolesFound',
              'No roles found. Create your first role to get started.'
            ).value
          }}
        </p>
      </div>

      <!-- Role List -->
      <AtlasList
        v-else
        class="permissions-section__role-list"
      >
        <AtlasListItem
          v-for="role in filteredRoles"
          :key="role.id"
          :title="role.name"
          :subtitle="role.description || tv('components.config.permissions.noDescription', 'No description')"
          @click="selectRole(role.id)"
        >
          <template #prepend>
            <AtlasIcon color="primary">
              mdi-shield-account
            </AtlasIcon>
          </template>
          <template #append>
            <AtlasIcon size="small">
              mdi-chevron-right
            </AtlasIcon>
          </template>
        </AtlasListItem>
      </AtlasList>
    </div>

    <!-- Role Details View -->
    <div
      v-else
      class="permissions-section__details"
    >
      <!-- Back Button -->
      <AtlasButton
        variant="ghost"
        icon="mdi-arrow-left"
        class="mb-4"
        @click="selectedRoleId = null"
      >
        {{ t('components.config.permissions.backToRoles', 'Back to Roles').value }}
      </AtlasButton>

      <!-- Role Header -->
      <div class="permissions-section__role-header">
        <div>
          <h3 class="text-h6">
            {{ currentRole?.name }}
          </h3>
          <p class="text-body-2 text-medium-emphasis">
            {{ currentRole?.description || t('components.config.permissions.noDescription', 'No description').value }}
          </p>
        </div>
        <div class="permissions-section__role-actions">
          <AtlasIconButton
            icon="mdi-pencil"
            v-bind="{ ariaLabel: tv('components.config.permissions.editRoleAria', 'Edit role') }"
            variant="text"
            size="sm"
            @click="handleEditRole"
          />
          <AtlasIconButton
            icon="mdi-delete"
            v-bind="{ ariaLabel: tv('components.config.permissions.deleteRoleAria', 'Delete role') }"
            variant="text"
            size="sm"
            tone="danger"
            @click="showDeleteDialog = true"
          />
        </div>
      </div>

      <!-- Tabs for Users/Permissions -->
      <AtlasTabs
        v-model="detailsTab"
        class="mt-4 permissions-section__details-tabs"
      >
        <AtlasTab value="users">
          {{ t('configuration.roles.tabs.users', 'Users').value }}
        </AtlasTab>
        <AtlasTab value="permissions">
          {{ t('configuration.roles.tabs.permissions', 'Permissions').value }}
        </AtlasTab>
      </AtlasTabs>

      <v-window
        v-model="detailsTab"
        class="mt-4"
      >
        <v-window-item value="users">
          <RoleUsersTab :role-id="selectedRoleId" />
        </v-window-item>
        <v-window-item value="permissions">
          <RolePermissionsTab :role-id="selectedRoleId" />
        </v-window-item>
      </v-window>
    </div>

    <!-- Create/Edit Dialog -->
    <RoleCreateDialog
      v-model="showCreateDialog"
      :role="editingRole"
      @success="handleRoleSaved"
    />

    <!-- Delete Dialog -->
    <RoleDeleteDialog
      v-model="showDeleteDialog"
      :role="currentRole"
      @deleted="handleRoleDeleted"
    />
  </div>
</template>

<script setup lang="ts">
import { AtlasAlert, AtlasButton, AtlasIcon, AtlasIconButton, AtlasList, AtlasListItem, AtlasProgressLinear, AtlasSpacer, AtlasTab, AtlasTabs, AtlasTextField } from '@/components/ui'
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from '@/composables/useI18n'
import { useRoles } from '@/composables/useRoles'
import { useAuth } from '@/composables/useAuth'
import type { Role } from '@/models/role.types'
import RolePermissionsTab from '@/components/config/permissions/RolePermissionsTab.vue'
import RoleUsersTab from '@/components/config/permissions/RoleUsersTab.vue'
import RoleCreateDialog from '@/components/config/permissions/RoleCreateDialog.vue'
import RoleDeleteDialog from '@/components/config/permissions/RoleDeleteDialog.vue'

const { t, tv } = useI18n()
const { roles, currentRole, isLoadingRoles, rolesError, fetchRoles, fetchRoleById } = useRoles()

const auth = useAuth()

// Only show errors if user is authenticated (suppress 401 errors when not logged in)
const visibleError = computed(() => {
  if (!rolesError.value) return null
  if (!auth.isAuthenticated.value && rolesError.value.includes('401')) return null
  return rolesError.value
})

const searchQuery = ref('')
const selectedRoleId = ref<number | null>(null)
const detailsTab = ref('users')
const showCreateDialog = ref(false)
const showDeleteDialog = ref(false)
const editingRole = ref<Role | null>(null)

const filteredRoles = computed(() => {
  if (!searchQuery.value) return roles.value
  const query = searchQuery.value.toLowerCase()
  return roles.value.filter(
    role =>
      role.name.toLowerCase().includes(query) || role.description?.toLowerCase().includes(query)
  )
})

function selectRole(roleId: number) {
  selectedRoleId.value = roleId
  fetchRoleById(roleId)
}

function handleEditRole() {
  editingRole.value = currentRole.value
  showCreateDialog.value = true
}

function handleRoleSaved() {
  editingRole.value = null
  fetchRoles()
  if (selectedRoleId.value) {
    fetchRoleById(selectedRoleId.value)
  }
}

function handleRoleDeleted() {
  selectedRoleId.value = null
  fetchRoles()
}

watch(showCreateDialog, isOpen => {
  if (!isOpen) {
    editingRole.value = null
  }
})

onMounted(() => {
  fetchRoles()
})
</script>

<style scoped>
.permissions-section {
  min-height: 400px;
}

.permissions-section__header {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
}

.permissions-section__search {
  flex: 1;
  max-width: 300px;
}

.permissions-section__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
  text-align: center;
}

.permissions-section__role-list {
  border: 1px solid var(--atlas-color-outline-strong);
  border-radius: 4px;
}

.permissions-section__role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 16px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
}

.v-theme--dark .permissions-section__role-header {
  background: rgba(255, 255, 255, 0.04);
}

.permissions-section__role-actions {
  display: flex;
  gap: 4px;
}

/* Pin the Users/Permissions tab bar while a long role detail (many users or
 * permissions) scrolls inside ConfigPanel's scroll container, so the tabs stay
 * visible instead of scrolling out of view above the content. */
.permissions-section__details-tabs {
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgb(var(--v-theme-surface));
}
</style>
