<template>
  <div
    v-if="groupedAggregateOptions.length > 0"
    class="feature-analysis-aggregate-select"
  >
    <AtlasMenu
      v-model="showMenu"
      :close-on-content-click="true"
      location="bottom start"
      offset="8"
    >
      <template #activator="{ props: menuProps }">
        <AtlasButton
          v-bind="menuProps"
          class="feature-analysis-aggregate-select__button"
          variant="outlined"
          size="sm"
          append-icon="mdi-chevron-down"
        >
          {{ selectedAggregate?.name ?? label }}
        </AtlasButton>
      </template>

      <v-card
        class="feature-analysis-aggregate-select__menu"
        rounded="lg"
      >
        <AtlasList density="compact">
          <template
            v-for="(group, groupIndex) in groupedAggregateOptions"
            :key="group.key"
          >
            <div
              class="feature-analysis-aggregate-select__group-label"
              :data-testid="`feature-analysis-aggregate-group-${group.key}`"
            >
              {{ group.label }}
            </div>

            <AtlasListItem
              v-for="aggregate in group.items"
              :key="aggregate.id"
              :active="selectedAggregateId === aggregate.id"
              class="feature-analysis-aggregate-select__item"
              :data-testid="`feature-analysis-aggregate-option-${aggregate.id}`"
              @click="selectAggregate(aggregate)"
            >
              <v-list-item-title>{{ aggregate.name }}</v-list-item-title>
            </AtlasListItem>

            <AtlasDivider v-if="groupIndex < groupedAggregateOptions.length - 1" />
          </template>
        </AtlasList>
      </v-card>
    </AtlasMenu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { AtlasButton, AtlasDivider, AtlasList, AtlasListItem, AtlasMenu } from '@/components/ui'
import { CRITERIA_TYPE_BY_KEY } from '@/components/circe/criteria/criteria-registry'
import { getCriteriaWrapperKey, type Criteria } from '@/models/circe-types'
import type { FeatureAnalysisAggregate, FeatureAnalysisDistributionItem } from '@/models/feature-analysis.types'
import { useI18n } from '@/composables/useI18n'

defineOptions({ name: 'AggrecateSelect' })

const props = defineProps<{
  criteria: FeatureAnalysisDistributionItem
  aggregates: FeatureAnalysisAggregate[]
  label: string
}>()

const { tv } = useI18n()

const showMenu = ref(false)

const selectedAggregateId = computed<number | null>({
  get: () => props.criteria.aggregate?.id ?? null,
  set: value => {
    props.criteria.aggregate = value === null ? undefined : props.aggregates.find(aggregate => aggregate.id === value)
  },
})

const selectedAggregate = computed(() => props.criteria.aggregate ?? null)

const aggregateOptions = computed(() => {
  if (props.criteria.criteriaType === 'DemographicCriteria') {
    return props.aggregates
  }

  const innerCriteria = (props.criteria.expression as { Criteria?: Criteria }).Criteria
  if (!innerCriteria) return props.aggregates

  const wrapperKey = getCriteriaWrapperKey(innerCriteria)
  const domains = CRITERIA_TYPE_BY_KEY[wrapperKey]?.domains ?? []
  if (domains.length === 0) return props.aggregates

  const normalizedDomains = domains.map(domain => domain.toUpperCase())

  return props.aggregates.filter(aggregate => aggregate.domain == null || normalizedDomains.includes(aggregate.domain))
})

type AggregateGroup = {
  key: string
  label: string
  items: FeatureAnalysisAggregate[]
}

const groupedAggregateOptions = computed<AggregateGroup[]>(() => {
  const groups = new Map<string, AggregateGroup>()
  const addGroup = (key: string, label: string) => {
    if (!groups.has(key)) {
      groups.set(key, { key, label, items: [] })
    }
    return groups.get(key)!
  }

  for (const aggregate of aggregateOptions.value) {
    const key = aggregate.domain ?? 'ANY'
    const label = aggregate.domain ? domainLabel(aggregate.domain) : tv('options.any')
    addGroup(key, label).items.push(aggregate)
  }

  const orderedGroups = [...groups.values()].sort((left, right) => {
    if (left.key === 'ANY') return -1
    if (right.key === 'ANY') return 1
    return left.label.localeCompare(right.label)
  })

  return orderedGroups
})

function domainLabel(domain: NonNullable<FeatureAnalysisAggregate['domain']>) {
  switch (domain) {
    case 'CONDITION':
      return tv('featureAnalyses.aggregateDomain.condition')
    case 'CONDITION_ERA':
      return tv('featureAnalyses.aggregateDomain.conditionEra')
    case 'DEMOGRAPHICS':
      return tv('featureAnalyses.aggregateDomain.demographics')
    case 'DEVICE':
      return tv('featureAnalyses.aggregateDomain.device')
    case 'DRUG':
      return tv('featureAnalyses.aggregateDomain.drug')
    case 'DRUG_ERA':
      return tv('featureAnalyses.aggregateDomain.drugEra')
    case 'MEASUREMENT':
      return tv('featureAnalyses.aggregateDomain.measurement')
    case 'OBSERVATION':
      return tv('featureAnalyses.aggregateDomain.observation')
    case 'PROCEDURE':
      return tv('featureAnalyses.aggregateDomain.procedure')
    case 'VISIT':
      return tv('featureAnalyses.aggregateDomain.visit')
    default:
      return domain
  }
}

function selectAggregate(aggregate: FeatureAnalysisAggregate) {
  selectedAggregateId.value = aggregate.id
  showMenu.value = false
}
</script>

<style scoped>
.feature-analysis-aggregate-select {
  min-width: 220px;
}

.feature-analysis-aggregate-select__button {
  min-width: 220px;
  justify-content: space-between;
}

.feature-analysis-aggregate-select__menu {
  min-width: 280px;
}

.feature-analysis-aggregate-select__group-label {
  padding-inline: 16px;
}

.feature-analysis-aggregate-select__item {
  padding-inline-start: 24px;
}
</style>