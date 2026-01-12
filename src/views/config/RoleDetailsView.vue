<template>
  <div class="page-wrapper">
    <div class="page-card">
      <v-container
        fluid
        class="role-details-view"
      >
        <!-- Loading State -->
        <div
          v-if="isLoadingRoles"
          class="role-details-view__loading"
        >
          <v-progress-circular
            indeterminate
            color="primary"
            size="64"
          />
        </div>

        <!-- Error State -->
        <v-alert
          v-else-if="rolesError"
          type="error"
          variant="tonal"
          class="mb-4"
        >
          {{ rolesError }}
        </v-alert>

        <!-- Role Not Found -->
        <v-alert
          v-else-if="!currentRole"
          type="warning"
          variant="tonal"
          class="mb-4"
        >
          Role not found
        </v-alert>

        <!-- Role Details -->
        <template v-else>
          <v-row>
            <v-col cols="12">
              <!-- Header with Back Button -->
              <div class="role-details-view__header">
                <v-btn
                  variant="text"
                  prepend-icon="mdi-arrow-left"
                  class="mb-4"
                  @click="handleBack"
                >
                  Back to Roles
                </v-btn>

                <div class="role-details-view__title-section">
                  <h1 class="text-h4">
                    {{ currentRole.name }}
                  </h1>
                  <p
                    v-if="currentRole.description"
                    class="text-body-1 text-medium-emphasis mt-2"
                  >
                    {{ currentRole.description }}
                  </p>
                </div>
              </div>
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <!-- Role Details Card -->
              <role-details
                :role="currentRole"
                class="mb-4"
              />
            </v-col>
          </v-row>

          <v-row>
            <v-col cols="12">
              <!-- Tabs for Users, Permissions, and Utilities -->
              <v-tabs
                v-model="activeTab"
                color="primary"
                class="mb-4"
              >
                <v-tab value="users">
                  Users
                </v-tab>
                <v-tab value="permissions">
                  Permissions
                </v-tab>
                <v-tab value="utilities">
                  Utilities
                </v-tab>
              </v-tabs>

              <!-- Tab Content -->
              <v-window v-model="activeTab">
                <!-- Users Tab -->
                <v-window-item value="users">
                  <role-users-tab :role-id="currentRole.id" />
                </v-window-item>

                <!-- Permissions Tab -->
                <v-window-item value="permissions">
                  <role-permissions-tab :role-id="currentRole.id" />
                </v-window-item>

                <!-- Utilities Tab -->
                <v-window-item value="utilities">
                  <role-utilities-tab
                    :role-id="currentRole.id"
                    :role-name="currentRole.name"
                  />
                </v-window-item>
              </v-window>
            </v-col>
          </v-row>
        </template>
      </v-container>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRoles } from '@/composables/useRoles'
import RoleDetails from '@/components/config/permissions/RoleDetails.vue'
import RolePermissionsTab from '@/components/config/permissions/RolePermissionsTab.vue'
import RoleUsersTab from '@/components/config/permissions/RoleUsersTab.vue'
import RoleUtilitiesTab from '@/components/config/permissions/RoleUtilitiesTab.vue'

const router = useRouter()
const route = useRoute()
const { currentRole, isLoadingRoles, rolesError, fetchRoleById } = useRoles()

const activeTab = ref('users')

// Load role on mount
onMounted(async () => {
  const roleId = parseInt(route.params.id as string)
  if (!isNaN(roleId)) {
    await fetchRoleById(roleId)
  }
})

/**
 * Navigate back to role list
 */
function handleBack() {
  router.push({ name: 'role-management' })
}
</script>

<style scoped>
.role-details-view {
  padding: 24px;
}

.role-details-view__loading {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.role-details-view__header {
  margin-bottom: 24px;
}

.role-details-view__title-section {
  margin-top: 16px;
}
</style>
