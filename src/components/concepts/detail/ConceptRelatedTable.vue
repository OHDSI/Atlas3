<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { RelatedConcept } from '@/models/concept-detail.types'

const props = defineProps<{ related: RelatedConcept[] }>()

const route = useRoute()
const sourceKey = computed(() => (route.params.sourceKey as string) ?? '')

interface Row {
  conceptId: number
  conceptName: string
  conceptCode: string
  vocabularyId: string
  domainId: string
  standardConcept: string | null
  relationship: string
}

const rows = computed<Row[]>(() => {
  const out: Row[] = []
  for (const c of props.related) {
    for (const r of c.relationships) {
      out.push({
        conceptId: c.conceptId,
        conceptName: c.conceptName,
        conceptCode: c.conceptCode,
        vocabularyId: c.vocabularyId,
        domainId: c.domainId,
        standardConcept: c.standardConcept,
        relationship: r.relationshipName,
      })
    }
  }
  return out
})

const headers = [
  { title: 'Relationship', key: 'relationship', sortable: true },
  { title: 'Concept Name', key: 'conceptName', sortable: true },
  { title: 'Vocabulary', key: 'vocabularyId', sortable: true },
  { title: 'Code', key: 'conceptCode', sortable: true },
  { title: 'Domain', key: 'domainId', sortable: true },
  { title: 'Standard', key: 'standardConcept', sortable: true, width: 80 },
]
</script>

<template>
  <v-card
    density="compact"
    variant="outlined"
    data-testid="concept-related-table"
  >
    <v-card-title class="card-title">
      Related Concepts
      <v-spacer />
      <span class="muted">{{ rows.length }} relationships</span>
    </v-card-title>
    <p
      v-if="rows.length === 0"
      class="empty"
    >
      No related concepts found.
    </p>
    <v-data-table
      v-else
      density="compact"
      :headers="headers"
      :items="rows"
      :items-per-page="25"
    >
      <template #[`item.relationship`]="{ item }">
        <v-chip
          density="compact"
          size="small"
          variant="tonal"
        >
          {{ item.relationship }}
        </v-chip>
      </template>
      <template #[`item.conceptName`]="{ item }">
        <router-link
          :to="`/concept/${sourceKey}/${item.conceptId}`"
          class="concept-link"
        >
          {{ item.conceptName }}
        </router-link>
      </template>
      <template #[`item.standardConcept`]="{ item }">
        <v-chip
          v-if="item.standardConcept === 'S'"
          density="compact"
          size="x-small"
          color="success"
          variant="tonal"
        >S</v-chip>
        <v-chip
          v-else-if="item.standardConcept === 'C'"
          density="compact"
          size="x-small"
          variant="tonal"
        >C</v-chip>
        <span
          v-else
          class="muted"
        >—</span>
      </template>
    </v-data-table>
  </v-card>
</template>

<style scoped>
.card-title {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.12);
  display: flex;
  align-items: center;
}
.muted { color: rgba(0, 0, 0, 0.4); font-size: 11px; }
.empty { padding: 16px; color: rgba(0, 0, 0, 0.6); font-size: 12px; margin: 0; text-align: center; }
.concept-link {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.concept-link:hover { text-decoration: underline; }
</style>
