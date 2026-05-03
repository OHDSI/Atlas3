<template>
  <v-dialog
    :model-value="modelValue"
    max-width="800"
    persistent
    scrollable
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <v-card>
      <v-card-title class="d-flex align-center justify-space-between">
        <span>{{
          isEditing ? t('configuration.tagManagement.edit') : t('configuration.newSource')
        }}</span>
        <v-btn
          icon
          variant="text"
          @click="handleClose"
        >
          <AtlasIcon>mdi-close</AtlasIcon>
        </v-btn>
      </v-card-title>

      <AtlasDivider />

      <v-card-text class="pa-4">
        <v-form
          ref="formRef"
          v-model="isFormValid"
          @submit.prevent="handleSave"
        >
          <!-- Basic Info Section -->
          <div class="text-subtitle-1 font-weight-medium mb-2">
            {{ t('columns.name') }}
          </div>

          <AtlasRow>
            <AtlasCol
              cols="12"
              md="6"
            >
              <v-text-field
                v-model="form.name"
                :label="tv('columns.name')"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
              />
            </AtlasCol>
            <AtlasCol
              cols="12"
              md="6"
            >
              <v-text-field
                v-model="form.key"
                :label="tv('configuration.viewEdit.source.label')"
                :rules="[rules.required, rules.validKey]"
                :disabled="isEditing"
                persistent-hint
                variant="outlined"
                density="comfortable"
              />
            </AtlasCol>
          </AtlasRow>

          <AtlasRow>
            <AtlasCol cols="12">
              <v-select
                v-model="form.dialect"
                :label="tv('configuration.viewEdit.dialect.label')"
                :items="dialectItems"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
              />
            </AtlasCol>
          </AtlasRow>

          <!-- Connection Section -->
          <div class="text-subtitle-1 font-weight-medium mb-2 mt-4">
            {{ t('configuration.viewEdit.connectionString.title') }}
          </div>

          <AtlasRow>
            <AtlasCol cols="12">
              <v-textarea
                v-model="form.connectionString"
                :label="tv('configuration.viewEdit.connectionString.label')"
                :rules="[rules.required]"
                variant="outlined"
                density="comfortable"
                rows="3"
                auto-grow
              />
            </AtlasCol>
          </AtlasRow>

          <AtlasRow v-if="showCredentials">
            <AtlasCol
              cols="12"
              md="6"
            >
              <v-text-field
                v-model="form.username"
                :label="tv('configuration.viewEdit.username.label')"
                variant="outlined"
                density="comfortable"
              />
            </AtlasCol>
            <AtlasCol
              cols="12"
              md="6"
            >
              <v-text-field
                v-model="form.password"
                :label="tv('configuration.viewEdit.password.label')"
                type="password"
                variant="outlined"
                density="comfortable"
              />
            </AtlasCol>
          </AtlasRow>

          <!-- Kerberos Settings (for Impala) -->
          <v-expand-transition>
            <div v-if="showKerberos">
              <div class="text-subtitle-1 font-weight-medium mb-2 mt-4">
                {{ t('configuration.viewEdit.krb.authenticationMethod.label') }}
              </div>

              <v-radio-group
                v-model="form.krbAuthMethod"
                inline
              >
                <v-radio
                  :label="tv('configuration.viewEdit.krb.keytab.label')"
                  value="KEYTAB"
                />
                <v-radio
                  :label="tv('configuration.viewEdit.krb.userPassword.label')"
                  value="PASSWORD"
                />
              </v-radio-group>

              <AtlasRow>
                <AtlasCol
                  cols="12"
                  md="6"
                >
                  <v-text-field
                    v-model="form.krbAdminServer"
                    :label="tv('configuration.viewEdit.krb.adminServer.label')"
                    variant="outlined"
                    density="comfortable"
                  />
                </AtlasCol>
                <AtlasCol
                  v-if="form.krbAuthMethod === 'KEYTAB'"
                  cols="12"
                  md="6"
                >
                  <v-file-input
                    v-model="keytabFile"
                    :label="tv('configuration.viewEdit.krb.keytab.label')"
                    variant="outlined"
                    density="comfortable"
                    prepend-icon=""
                    prepend-inner-icon="mdi-file-key"
                    accept=".keytab"
                  />
                </AtlasCol>
              </AtlasRow>
            </div>
          </v-expand-transition>

          <!-- BigQuery Settings -->
          <v-expand-transition>
            <div v-if="showBigQuery">
              <div class="text-subtitle-1 font-weight-medium mb-2 mt-4">
                {{ t('configuration.viewEdit.bigQuery.password.label') }}
              </div>

              <AtlasRow>
                <AtlasCol cols="12">
                  <v-file-input
                    v-model="keyfile"
                    :label="tv('configuration.viewEdit.bigQuery.password.label')"
                    variant="outlined"
                    density="comfortable"
                    prepend-icon=""
                    prepend-inner-icon="mdi-file-key"
                    accept=".json"
                    persistent-hint
                  />
                </AtlasCol>
              </AtlasRow>
            </div>
          </v-expand-transition>

          <!-- Daimons Section -->
          <div class="text-subtitle-1 font-weight-medium mb-2 mt-4">
            {{ t('configuration.viewEdit.krb.sourceDaimons.label') }}
          </div>

          <v-table density="comfortable">
            <thead>
              <tr>
                <th style="width: 50px">
                  {{ t('columns.enabled') }}
                </th>
                <th style="width: 150px">
                  {{ t('columns.type') }}
                </th>
                <th>{{ t('columns.schema') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="daimonType in DAIMON_TYPES"
                :key="daimonType"
              >
                <td>
                  <v-checkbox
                    v-model="daimonEnabled[daimonType]"
                    hide-details
                    density="compact"
                  />
                </td>
                <td>{{ daimonType }}</td>
                <td>
                  <v-text-field
                    v-model="daimonSchemas[daimonType]"
                    :disabled="!daimonEnabled[daimonType]"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                </td>
              </tr>
            </tbody>
          </v-table>

          <!-- Options Section -->
          <div class="mt-4">
            <v-checkbox
              v-model="form.checkConnection"
              :label="tv('columns.checkConnection')"
              hide-details
            />
          </div>
        </v-form>
      </v-card-text>

      <AtlasDivider />

      <v-card-actions class="pa-4">
        <v-btn
          v-if="isEditing"
          color="error"
          variant="outlined"
          @click="handleDelete"
        >
          {{ t('common.delete') }}
        </v-btn>
        <AtlasSpacer />
        <v-btn
          variant="text"
          @click="handleClose"
        >
          {{ t('common.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="elevated"
          :disabled="!isFormValid"
          :loading="isSaving"
          @click="handleSave"
        >
          {{ t('common.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>

    <!-- Delete Confirmation Dialog -->
    <v-dialog
      v-model="showDeleteConfirm"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('common.delete') }}</v-card-title>
        <v-card-text>{{ t('configuration.viewEdit.source.confirms.delete') }}</v-card-text>
        <v-card-actions>
          <AtlasSpacer />
          <v-btn
            variant="text"
            @click="showDeleteConfirm = false"
          >
            {{ t('common.cancel') }}
          </v-btn>
          <v-btn
            color="error"
            variant="elevated"
            :loading="isDeleting"
            @click="confirmDelete"
          >
            {{ t('common.delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-dialog>
</template>

<script setup lang="ts">
import { AtlasCol, AtlasDivider, AtlasIcon, AtlasRow, AtlasSpacer } from '@/components/ui'
import { ref, computed, watch, reactive } from 'vue'
import { useI18n } from '@/composables/useI18n'
import {
  SUPPORTED_DIALECTS,
  DAIMON_TYPES,
  type SourceRequest,
  type SourceDetails,
  type DaimonType,
  type DaimonRequest,
} from '@/models/datasource.types'
import {
  createSource,
  updateSource,
  deleteSource,
  getSourceDetails,
} from '@/services/source.service'

const props = defineProps<{
  modelValue: boolean
  sourceKey?: string | null
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'saved'): void
  (e: 'deleted'): void
  (e: 'error', message: string): void
}>()

const { t, tv } = useI18n()

// Form state
const isFormValid = ref(false)
const isSaving = ref(false)
const isDeleting = ref(false)
const showDeleteConfirm = ref(false)

const form = reactive({
  name: '',
  key: '',
  dialect: '',
  connectionString: '',
  username: '',
  password: '',
  krbAuthMethod: 'KEYTAB' as 'KEYTAB' | 'PASSWORD',
  krbAdminServer: '',
  checkConnection: false,
})

const keyfile = ref<File[]>([])
const keytabFile = ref<File[]>([])

// Daimon configuration
const daimonEnabled = reactive<Record<DaimonType, boolean>>({
  CDM: false,
  Vocabulary: false,
  Results: false,
  CEM: false,
  CEMResults: false,
  Temp: false,
})

const daimonSchemas = reactive<Record<DaimonType, string>>({
  CDM: '',
  Vocabulary: '',
  Results: '',
  CEM: '',
  CEMResults: '',
  Temp: '',
})

// Computed properties
const isEditing = computed(() => props.sourceKey != null)

const dialectItems = computed(() =>
  SUPPORTED_DIALECTS.map(d => ({
    title: d.label,
    value: d.value,
  }))
)

const showCredentials = computed(() => {
  const noCredentialDialects = ['BIGQUERY']
  return !noCredentialDialects.includes(form.dialect)
})

const showKerberos = computed(() => form.dialect === 'IMPALA')

const showBigQuery = computed(() => form.dialect === 'BIGQUERY')

// Validation rules (use tv for non-reactive string values)
const rules = {
  required: (v: string) => !!v || tv('configuration.viewEdit.source.validation.empty'),
  validKey: (v: string) =>
    /^[a-zA-Z0-9_-]+$/.test(v) || tv('configuration.viewEdit.source.validation.empty'),
}

// Watch for dialog open/close
watch(
  () => props.modelValue,
  async isOpen => {
    if (isOpen) {
      resetForm()
      if (props.sourceKey) {
        await loadSourceDetails(props.sourceKey)
      }
    }
  }
)

// Reset form to initial state
function resetForm() {
  form.name = ''
  form.key = ''
  form.dialect = ''
  form.connectionString = ''
  form.username = ''
  form.password = ''
  form.krbAuthMethod = 'KEYTAB'
  form.krbAdminServer = ''
  form.checkConnection = false
  keyfile.value = []
  keytabFile.value = []

  // Reset daimons
  for (const type of DAIMON_TYPES) {
    daimonEnabled[type] = false
    daimonSchemas[type] = ''
  }
}

// Load existing source details for editing
async function loadSourceDetails(sourceKey: string) {
  try {
    const details: SourceDetails = await getSourceDetails(sourceKey)

    form.name = details.sourceName
    form.key = details.sourceKey
    form.dialect = details.sourceDialect
    form.connectionString = details.connectionString || ''
    form.username = details.username || ''
    form.password = details.password || ''
    form.krbAuthMethod = (details.krbAuthMethod as 'KEYTAB' | 'PASSWORD') || 'KEYTAB'
    form.krbAdminServer = details.krbAdminServer || ''

    // Load daimons
    for (const daimon of details.daimons) {
      daimonEnabled[daimon.daimonType] = true
      daimonSchemas[daimon.daimonType] = daimon.tableQualifier
    }
  } catch (error) {
    emit('error', tv('executionStatus.values.FAILED'))
    handleClose()
  }
}

// Build daimons array from form state
function buildDaimons(): DaimonRequest[] {
  const daimons: DaimonRequest[] = []
  let priority = 0

  for (const type of DAIMON_TYPES) {
    if (daimonEnabled[type] && daimonSchemas[type]) {
      daimons.push({
        daimonType: type,
        tableQualifier: daimonSchemas[type],
        priority: priority++,
      })
    }
  }

  return daimons
}

// Build request object from form state
function buildRequest(): SourceRequest {
  const request: SourceRequest = {
    name: form.name,
    key: form.key,
    dialect: form.dialect,
    connectionString: form.connectionString,
    daimons: buildDaimons(),
    checkConnection: form.checkConnection,
  }

  if (showCredentials.value) {
    if (form.username) request.username = form.username
    if (form.password) request.password = form.password
  }

  if (showKerberos.value) {
    request.krbAuthMethod = form.krbAuthMethod
    if (form.krbAdminServer) request.krbAdminServer = form.krbAdminServer
  }

  return request
}

// Save handler
async function handleSave() {
  if (!isFormValid.value) return

  isSaving.value = true

  try {
    const request = buildRequest()
    const file =
      showBigQuery.value && keyfile.value.length > 0
        ? keyfile.value[0]
        : showKerberos.value && form.krbAuthMethod === 'KEYTAB' && keytabFile.value.length > 0
          ? keytabFile.value[0]
          : undefined

    if (isEditing.value && props.sourceKey) {
      await updateSource(props.sourceKey, request, file)
    } else {
      await createSource(request, file)
    }

    emit('saved')
    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : tv('executionStatus.values.FAILED')
    emit('error', message)
  } finally {
    isSaving.value = false
  }
}

// Delete handler
function handleDelete() {
  showDeleteConfirm.value = true
}

async function confirmDelete() {
  if (!props.sourceKey) return

  isDeleting.value = true

  try {
    await deleteSource(props.sourceKey)
    showDeleteConfirm.value = false
    emit('deleted')
    handleClose()
  } catch (error) {
    const message = error instanceof Error ? error.message : tv('executionStatus.values.FAILED')
    emit('error', message)
  } finally {
    isDeleting.value = false
  }
}

// Close handler
function handleClose() {
  emit('update:modelValue', false)
}
</script>
