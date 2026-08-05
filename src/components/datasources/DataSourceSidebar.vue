<template>
  <AtlasList
    nav
    density="compact"
    class="datasource-sidebar"
    color="primary"
  >
    <template
      v-for="(group, gi) in groups"
      :key="group.label"
    >
      <v-list-subheader
        :class="[
          'datasource-sidebar__group-label',
          gi === 0 && 'datasource-sidebar__group-label--first',
        ]"
      >
        {{ group.label }}
      </v-list-subheader>
      <AtlasListItem
        v-for="item in group.items"
        :key="item.value"
        :prepend-icon="item.icon"
        :title="item.label"
        :active="item.value === modelValue"
        :disabled="disabled"
        :data-testid="`datasource-sidebar-${item.value}`"
        rounded="0"
        class="datasource-sidebar__item"
        @click="select(item.value)"
      />
    </template>
  </AtlasList>
</template>

<script setup lang="ts">
import { AtlasList, AtlasListItem } from '@/components/ui'
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'
import type { AnyReportType } from '@/models/datasource.types'
import { usePluginMounts } from '@/composables/usePluginMounts'
import { interleaveMenuItems } from '@/plugins/navigation/PluginMenuIntegration'
import type { ResolvedMountItem } from '@/plugins/navigation/PluginMountPoints'

interface Props {
  modelValue: AnyReportType | null
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: AnyReportType]
}>()

const { t } = useI18n()

interface SidebarItem {
  value: AnyReportType
  label: string
  icon: string
}

interface SidebarGroup {
  label: string
  items: SidebarItem[]
}

const coreGroups = computed<SidebarGroup[]>(() => [
  {
    label: t('dataSources.sidebar.overview', 'Overview').value,
    items: [
      {
        value: 'dashboard',
        label: t('dataSources.reportTypes.dashboard', 'Dashboard').value,
        icon: 'mdi-view-dashboard-outline',
      },
      {
        value: 'datadensity',
        label: t('dataSources.reportTypes.datadensity', 'Data Density').value,
        icon: 'mdi-chart-bell-curve-cumulative',
      },
    ],
  },
  {
    label: t('dataSources.sidebar.demographics', 'Demographics').value,
    items: [
      {
        value: 'person',
        label: t('dataSources.reportTypes.person', 'Person').value,
        icon: 'mdi-account-outline',
      },
      {
        value: 'observationPeriod',
        label: t('dataSources.reportTypes.observationPeriod', 'Observation Period').value,
        icon: 'mdi-calendar-range-outline',
      },
      {
        value: 'death',
        label: t('dataSources.reportTypes.death', 'Death').value,
        icon: 'mdi-grave-stone',
      },
    ],
  },
  {
    label: t('dataSources.sidebar.clinicalDomains', 'Clinical Domains').value,
    items: [
      {
        value: 'visit',
        label: t('dataSources.reportTypes.visit', 'Visit').value,
        icon: 'mdi-hospital-building',
      },
      {
        value: 'conditionOccurrence',
        label: t('dataSources.reportTypes.conditionOccurrence', 'Condition Occurrence').value,
        icon: 'mdi-stethoscope',
      },
      {
        value: 'conditionEra',
        label: t('dataSources.reportTypes.conditionEra', 'Condition Era').value,
        icon: 'mdi-clock-outline',
      },
      {
        value: 'procedure',
        label: t('dataSources.reportTypes.procedure', 'Procedure').value,
        icon: 'mdi-medical-bag',
      },
      {
        value: 'drugExposure',
        label: t('dataSources.reportTypes.drugExposure', 'Drug Exposure').value,
        icon: 'mdi-pill',
      },
      {
        value: 'drugEra',
        label: t('dataSources.reportTypes.drugEra', 'Drug Era').value,
        icon: 'mdi-pill-multiple',
      },
      {
        value: 'measurement',
        label: t('dataSources.reportTypes.measurement', 'Measurement').value,
        icon: 'mdi-test-tube',
      },
      {
        value: 'observation',
        label: t('dataSources.reportTypes.observation', 'Observation').value,
        icon: 'mdi-eye-outline',
      },
    ],
  },
])

const { items: pluginItems } = usePluginMounts('datasource-sidebar')

const PLUGIN_GROUP_FALLBACK = 'Plugins'

function toSidebarItem(item: ResolvedMountItem): SidebarItem {
  return {
    value: item.key as AnyReportType,
    label: item.name,
    icon: item.icon ?? 'mdi-puzzle-outline',
  }
}

const groups = computed<SidebarGroup[]>(() => {
  const merged = coreGroups.value.map(group => ({ ...group, items: [...group.items] }))
  const byGroup = new Map<string, ResolvedMountItem[]>()

  for (const item of pluginItems.value) {
    const label = item.group ?? PLUGIN_GROUP_FALLBACK
    byGroup.set(label, [...(byGroup.get(label) ?? []), item])
  }

  for (const [label, items] of byGroup) {
    const target = merged.find(g => g.label.toLowerCase() === label.toLowerCase())
    if (!target) {
      merged.push({ label, items: items.map(toSidebarItem) })
      continue
    }
    // interleaveMenuItems anchors on `id`; sidebar items are keyed by `value`.
    target.items = interleaveMenuItems(
      target.items.map(i => ({ ...i, id: i.value })),
      items.map(i => ({
        id: i.key,
        pluginId: i.pluginId,
        name: i.name,
        route: '',
        icon: i.icon,
        order: i.order,
        insertBefore: i.insertBefore,
        insertAfter: i.insertAfter,
        visible: true,
      })),
      p => ({ ...toSidebarItem(pluginItems.value.find(x => x.key === p.id)!), id: p.id })
    ).map(({ id: _id, ...rest }) => rest as SidebarItem)
  }

  return merged
})

function select(value: AnyReportType) {
  if (props.disabled) return
  if (value !== props.modelValue) {
    emit('update:modelValue', value)
  }
}
</script>

<style scoped>
.datasource-sidebar {
  background: rgb(var(--v-theme-surface));
  padding: 8px 8px 16px;
}

.datasource-sidebar__group-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgb(var(--v-theme-on-surface-variant));
  padding-inline: 12px;
  margin-top: 12px;
  height: 28px;
  min-height: 28px;
}

.datasource-sidebar__group-label--first {
  margin-top: 0;
}

/* Slim, full-width-of-rail items with primary-tinted active state */
.datasource-sidebar__item {
  border-radius: 6px !important;
  margin: 2px 0;
  min-height: 36px;
  font-size: 13px;
}

.datasource-sidebar__item :deep(.v-list-item__prepend) {
  margin-inline-end: 12px;
}

.datasource-sidebar__item :deep(.v-list-item-title) {
  font-size: 13px;
  letter-spacing: 0;
}
</style>
