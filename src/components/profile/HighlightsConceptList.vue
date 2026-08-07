<template>
  <div class="highlights-concept-list">
    <AtlasTextField
      v-model="search"
      :label="tv('profiles.searchConceptsToHighlight', 'Search concepts to highlight')"
      hide-details
      clearable
    />
    <AtlasList
      density="compact"
      class="overflow-auto"
      max-height="320"
    >
      <AtlasListItem
        v-for="c in items"
        :key="c.conceptId"
      >
        <v-list-item-title>
          {{ c.conceptName }}
        </v-list-item-title>
        <v-list-item-subtitle>
          {{ c.domain }} — {{ c.count }}
        </v-list-item-subtitle>
        <template #append>
          <AtlasMenu :close-on-content-click="true">
            <template #activator="{ props: activatorProps }">
              <button
                v-bind="activatorProps"
                type="button"
                class="color-dot"
                :class="{ 'color-dot--empty': !currentColor(c.conceptId) }"
                :style="dotStyle(c.conceptId)"
                :data-test="`highlight-color-dot-${c.conceptId}`"
                :aria-label="dotAriaLabel(c.conceptId)"
              />
            </template>
            <div class="color-popover">
              <div class="color-popover__swatches">
                <AtlasTooltip
                  v-for="entry in paletteEntries"
                  :key="entry.color"
                  :text="entry.label"
                  location="top"
                >
                  <template #activator="{ props: tipProps }">
                    <button
                      v-bind="tipProps"
                      type="button"
                      class="swatch"
                      :class="{ 'swatch--active': currentColor(c.conceptId) === entry.color }"
                      :style="{ background: entry.color }"
                      :data-test="`highlight-color-swatch-${entry.color}`"
                      :aria-label="entry.label"
                      @click="apply(c.conceptId, entry.color)"
                    />
                  </template>
                </AtlasTooltip>
                <AtlasTooltip
                  :text="tv('profiles.highlightNone', 'None')"
                  location="top"
                >
                  <template #activator="{ props: tipProps }">
                    <button
                      v-bind="tipProps"
                      type="button"
                      class="swatch swatch--none"
                      data-test="highlight-color-swatch-none"
                      :aria-label="tv('profiles.highlightNone', 'None')"
                      @click="apply(c.conceptId, 'none')"
                    >
                      <AtlasIcon
                        size="18"
                        icon="mdi-close-circle-outline"
                      />
                    </button>
                  </template>
                </AtlasTooltip>
              </div>
            </div>
          </AtlasMenu>
        </template>
      </AtlasListItem>
    </AtlasList>
  </div>
</template>

<script setup lang="ts">
import { AtlasIcon, AtlasList, AtlasListItem, AtlasMenu, AtlasTextField, AtlasTooltip } from '@/components/ui'
import { computed, ref } from 'vue'
import { useTimelineFilters } from '@/composables/useTimelineFilters'
import { useProfileStore } from '@/stores/profile'
import { useI18n } from '@/composables/useI18n'
import { HIGHLIGHT_PALETTE, type HighlightColor } from '@/models/profile.types'

const { uniqueConcepts } = useTimelineFilters()
const { tv } = useI18n()
const store = useProfileStore()

const search = ref('')

// Per-row inline picker — no batch selection state. Names line up
// 1:1 with HIGHLIGHT_PALETTE in src/models/profile.types.ts.
const PALETTE_LABELS = [
  tv('components.highlightsConceptList.colorCoral', 'Coral'),
  tv('components.highlightsConceptList.colorSky', 'Sky'),
  tv('components.highlightsConceptList.colorMint', 'Mint'),
  tv('components.highlightsConceptList.colorAmber', 'Amber'),
  tv('components.highlightsConceptList.colorLavender', 'Lavender'),
  tv('components.highlightsConceptList.colorRose', 'Rose'),
] as const
const paletteEntries = HIGHLIGHT_PALETTE.map((color, i) => ({
  color,
  label: PALETTE_LABELS[i] ?? color,
}))

const items = computed(() => {
  const q = search.value.trim().toLowerCase()
  const list = uniqueConcepts.value.slice().sort((a, b) => b.count - a.count)
  if (!q) return list
  return list.filter(c => c.conceptName.toLowerCase().includes(q))
})

function currentColor(conceptId: number): HighlightColor | undefined {
  return store.highlights.get(conceptId)
}

function dotStyle(conceptId: number): Record<string, string> {
  const color = currentColor(conceptId)
  return color ? { background: color, borderColor: color } : {}
}

function dotAriaLabel(conceptId: number): string {
  const color = currentColor(conceptId)
  if (!color) return tv('profiles.setHighlightColor', 'Set highlight color')
  const entry = paletteEntries.find(e => e.color === color)
  return entry?.label ?? tv('profiles.setHighlightColor', 'Set highlight color')
}

function apply(conceptId: number, color: HighlightColor) {
  store.applyHighlight([conceptId], color)
}
</script>

<style scoped>
.color-dot {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid rgba(15, 23, 42, 0.15);
  background: transparent;
  cursor: pointer;
  padding: 0;
  transition:
    transform 0.12s ease,
    box-shadow 0.12s ease;
}
.color-dot:hover {
  transform: scale(1.1);
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.08);
}
.color-dot--empty {
  background: rgb(var(--v-theme-surface-variant));
}

.color-popover {
  background: rgb(var(--v-theme-surface));
  border-radius: 8px;
  padding: 10px;
  box-shadow:
    0 1px 3px rgba(15, 23, 42, 0.1),
    0 8px 24px rgba(15, 23, 42, 0.12);
}
.color-popover__swatches {
  display: flex;
  gap: 8px;
  align-items: center;
}

.swatch {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.08);
  cursor: pointer;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition:
    box-shadow 0.12s ease,
    transform 0.12s ease;
}
.swatch:hover {
  box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.12);
  transform: scale(1.05);
}
.swatch--active {
  box-shadow: 0 0 0 2px rgb(var(--v-theme-primary));
}
.swatch--none {
  background: rgb(var(--v-theme-surface-variant));
  color: rgb(var(--v-theme-on-surface-variant));
}

:global(.v-theme--dark) .color-dot {
  border-color: var(--atlas-color-outline-strong);
}
:global(.v-theme--dark) .color-dot:hover {
  box-shadow: 0 0 0 2px var(--atlas-color-outline-strong);
}
:global(.v-theme--dark) .swatch {
  border-color: var(--atlas-color-outline-strong);
}
:global(.v-theme--dark) .swatch:hover {
  box-shadow: 0 0 0 2px var(--atlas-color-outline-strong);
}
</style>
