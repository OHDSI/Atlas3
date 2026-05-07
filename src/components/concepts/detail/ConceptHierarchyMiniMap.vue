<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Concept } from '@/models/concept-set.types'
import type { RelatedConcept } from '@/models/concept-detail.types'

const props = defineProps<{
  concept: Concept
  parents: RelatedConcept[]
  children: RelatedConcept[]
}>()

const route = useRoute()
const sourceKey = computed(() => (route.params.sourceKey as string) ?? '')

const isEmpty = computed(() => props.parents.length === 0 && props.children.length === 0)

const visibleParents = computed(() => props.parents.slice(0, 3))
const visibleChildren = computed(() => props.children.slice(0, 6))
</script>

<template>
  <v-card
    density="compact"
    variant="outlined"
    data-testid="concept-hierarchy-minimap"
  >
    <v-card-title class="card-title">
      Hierarchy
      <v-spacer />
      <a
        v-if="!isEmpty"
        href="#"
        class="view-full"
      >View full →</a>
    </v-card-title>
    <v-card-text class="card-body">
      <p
        v-if="isEmpty"
        class="empty"
      >
        No hierarchy found for this concept.
      </p>
      <template v-else>
        <ul class="tree">
          <li
            v-for="p in visibleParents"
            :key="p.conceptId"
            class="node faded"
          >
            <span class="chev">▸</span>
            <router-link
              :to="`/concept/${sourceKey}/${p.conceptId}`"
              class="node-link"
            >
              {{ p.conceptName }}
            </router-link>
          </li>
          <li
            class="node current"
            data-testid="hierarchy-current"
          >
            <span class="chev">●</span>
            <span class="node-link">{{ concept.conceptName }}</span>
          </li>
          <li
            v-for="c in visibleChildren"
            :key="c.conceptId"
            class="node child"
          >
            <span class="chev">▸</span>
            <router-link
              :to="`/concept/${sourceKey}/${c.conceptId}`"
              class="node-link"
            >
              {{ c.conceptName }}
            </router-link>
          </li>
          <li
            v-if="children.length > visibleChildren.length"
            class="node muted"
          >
            … {{ children.length - visibleChildren.length }} more descendants
          </li>
        </ul>
      </template>
    </v-card-text>
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
.view-full {
  font-size: 11px;
  text-transform: none;
  font-weight: 400;
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}
.card-body { padding: 12px; }
.tree { list-style: none; padding: 0; margin: 0; font-size: 12px; }
.node { display: flex; align-items: center; gap: 4px; padding: 2px 0; }
.node.faded { color: rgba(0, 0, 0, 0.6); }
.node.current {
  background: rgba(25, 118, 210, 0.12);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
  padding: 4px 6px;
  border-radius: 3px;
  margin: 2px 0;
}
.node.child { padding-left: 16px; }
.node.muted { color: rgba(0, 0, 0, 0.4); padding-left: 16px; font-size: 11px; }
.chev { width: 14px; color: rgba(0, 0, 0, 0.4); flex-shrink: 0; }
.node-link {
  color: inherit;
  text-decoration: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.node-link:hover { text-decoration: underline; }
.empty { color: rgba(0, 0, 0, 0.6); font-size: 12px; margin: 0; }
</style>
