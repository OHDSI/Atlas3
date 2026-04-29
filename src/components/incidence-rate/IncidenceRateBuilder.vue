<template>
  <AnalysisBuilderShell
    :title="title"
    :subtitle="subtitle"
    :show-back="true"
    testid="ir-builder"
    @back="handleBack"
  >
    <template #actions>
      <v-btn
        v-if="store.currentIR?.id"
        variant="outlined"
        prepend-icon="mdi-content-copy"
        :disabled="!store.currentIR?.id || !canCopy"
        data-testid="ir-builder-copy"
        @click="onCopy"
      >
        {{ t('common.copy', 'Copy') }}
      </v-btn>
      <v-btn
        v-if="store.currentIR?.id"
        variant="outlined"
        color="error"
        prepend-icon="mdi-delete"
        :disabled="!store.currentIR?.id || !canDelete"
        data-testid="ir-builder-delete"
        @click="askDelete = true"
      >
        {{ t('common.delete', 'Delete') }}
      </v-btn>
      <v-btn
        color="primary"
        variant="elevated"
        prepend-icon="mdi-content-save"
        :disabled="!store.canSave || saving || !canSave"
        :loading="saving"
        data-testid="ir-builder-save"
        @click="onSave"
      >
        {{ t('common.save', 'Save') }}
      </v-btn>
    </template>

    <div class="ir-builder">
      <v-text-field
        :model-value="store.currentIR?.name ?? ''"
        :label="t('columns.name', 'Name').value"
        density="compact"
        variant="outlined"
        hide-details
        class="ir-builder__name-field"
        :readonly="store.isReadOnly || store.isPreviewMode"
        @update:model-value="(v: string) => store.updateMeta({ name: v })"
      />

      <v-tabs
        v-model="activeTab"
        color="primary"
        density="compact"
        class="ir-builder__tabs"
      >
        <v-tab value="definition">
          {{ t('ir.tabs.definition', 'Definition') }}
        </v-tab>
        <v-tab value="conceptSets">
          {{ t('ir.tabs.conceptSets', 'Concept Sets') }}
        </v-tab>
        <v-tab
          value="generation"
          :disabled="!store.currentIR?.id"
        >
          {{ t('ir.tabs.generation', 'Generation') }}
        </v-tab>
        <v-tab
          value="versions"
          :disabled="!store.currentIR?.id"
        >
          {{ t('ir.tabs.versions', 'Versions') }}
        </v-tab>
      </v-tabs>

      <v-window
        v-model="activeTab"
        class="ir-builder__window"
      >
        <v-window-item value="definition">
          <IncidenceRateDefinitionPanel />
        </v-window-item>
        <v-window-item value="conceptSets">
          <IncidenceRateConceptSetsPanel />
        </v-window-item>
        <v-window-item value="generation">
          <IncidenceRateGenerationPanel
            v-if="store.currentIR?.id"
            :ir-id="store.currentIR.id"
          />
        </v-window-item>
        <v-window-item value="versions">
          <IncidenceRateVersionsPanel
            v-if="store.currentIR?.id"
            :ir-id="store.currentIR.id"
          />
        </v-window-item>
      </v-window>
    </div>

    <v-dialog
      v-model="askDelete"
      max-width="400"
    >
      <v-card>
        <v-card-title>{{ t('common.delete', 'Delete incidence rate') }}</v-card-title>
        <v-card-text>{{ t('ir.deleteConfirmation', 'Delete incidence rate analysis? Warning: deletion can not be undone!') }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="askDelete = false">
            {{ t('common.cancel', 'Cancel') }}
          </v-btn>
          <v-btn
            color="error"
            @click="onDelete"
          >
            {{ t('common.delete', 'Delete') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar
      :model-value="!!feedback"
      :color="feedback?.color ?? 'info'"
      :timeout="3000"
      @update:model-value="(open: boolean) => { if (!open) feedback = null }"
    >
      {{ feedback?.message }}
    </v-snackbar>
  </AnalysisBuilderShell>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useI18n'
import { useIncidenceRateStore } from '@/stores/incidence-rate'
import { useIncidenceRateBuilder } from '@/composables/useIncidenceRateBuilder'
import { usePermissions } from '@/composables/usePermissions'
import { useEntityAccess } from '@/composables/useEntityAccess'
import AnalysisBuilderShell from '@/components/analysis/AnalysisBuilderShell.vue'
import IncidenceRateDefinitionPanel from '@/components/incidence-rate/IncidenceRateDefinitionPanel.vue'
import IncidenceRateConceptSetsPanel from '@/components/incidence-rate/IncidenceRateConceptSetsPanel.vue'
import IncidenceRateGenerationPanel from '@/components/incidence-rate/IncidenceRateGenerationPanel.vue'
import IncidenceRateVersionsPanel from '@/components/incidence-rate/IncidenceRateVersionsPanel.vue'

const { t } = useI18n()
const store = useIncidenceRateStore()
const router = useRouter()
const { save, copy, remove, feedback } = useIncidenceRateBuilder()
const activeTab = ref<'definition' | 'conceptSets' | 'generation' | 'versions'>('definition')
const saving = ref(false)
const askDelete = ref(false)

// Permission gating for save/copy/delete buttons.
const irId = computed<number | null>(() => store.currentIR?.id ?? null)
const { hasPermission } = usePermissions()
const { canWrite, canDelete } = useEntityAccess('incidenceRate', irId)
const canCopy = computed<boolean>(() => hasPermission('create:incidence'))
const canSave = computed<boolean>(() =>
  irId.value === null ? hasPermission('create:incidence') : canWrite.value,
)

const title = computed(() => {
  const ir = store.currentIR
  if (!ir) return t('navigation.incidenceRates', 'Incidence rate analysis').value
  return ir.name?.trim() || t('home.newEntityNames.incidenceRate', 'New incidence rate').value
})

const subtitle = computed(() => {
  const ir = store.currentIR
  if (!ir?.id) return undefined
  return `#${ir.id}${ir.description ? ` · ${ir.description}` : ''}`
})

function handleBack() {
  router.push('/analysis/incidence-rates')
}

async function onSave() {
  saving.value = true
  try { await save() } finally { saving.value = false }
}
async function onCopy() { await copy() }
async function onDelete() { askDelete.value = false; await remove() }
</script>

<style scoped>
.ir-builder {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ir-builder__name-field {
  max-width: 480px;
}

.ir-builder__tabs {
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
}

.ir-builder__window {
  padding: 16px 0;
}
</style>
