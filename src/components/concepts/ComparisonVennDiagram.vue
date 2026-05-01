<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from '@/composables/useI18n'

interface Props {
  leftOnly: number
  rightOnly: number
  both: number
  leftLabel: string
  rightLabel: string
}

const props = defineProps<Props>()

const { tv } = useI18n()

function truncate(s: string, max = 24): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s
}

const leftLabelDisplay = computed(() => truncate(props.leftLabel))
const rightLabelDisplay = computed(() => truncate(props.rightLabel))

const total = computed(() => props.leftOnly + props.rightOnly + props.both)

const totalLabel = computed(() => {
  const template = tv(
    'cs.browser.compare.vennDiagramTotalAmountConcepts',
    'The total amount of concepts: <count>'
  )
  return template
    .replace('<%=count%>', String(total.value))
    .replace('<count>', String(total.value))
})
</script>

<template>
  <div class="comparison-venn">
    <svg
      data-testid="venn-svg"
      viewBox="0 0 480 260"
      width="100%"
      height="auto"
      preserveAspectRatio="xMidYMid meet"
      role="img"
    >
      <text
        x="130"
        y="30"
        text-anchor="middle"
        class="venn-name venn-name-left"
      >
        {{ leftLabelDisplay }}
        <title>{{ leftLabel }}</title>
      </text>
      <text
        x="350"
        y="30"
        text-anchor="middle"
        class="venn-name venn-name-right"
      >
        {{ rightLabelDisplay }}
        <title>{{ rightLabel }}</title>
      </text>

      <g class="venn-circles">
        <circle
          cx="180"
          cy="150"
          r="90"
          class="venn-circle venn-circle-left"
        />
        <circle
          cx="300"
          cy="150"
          r="90"
          class="venn-circle venn-circle-right"
        />
      </g>

      <text
        data-testid="venn-left-count"
        x="130"
        y="155"
        text-anchor="middle"
        class="venn-count"
      >
        {{ leftOnly }}
      </text>
      <text
        data-testid="venn-both-count"
        x="240"
        y="155"
        text-anchor="middle"
        class="venn-count"
      >
        {{ both }}
      </text>
      <text
        data-testid="venn-right-count"
        x="350"
        y="155"
        text-anchor="middle"
        class="venn-count"
      >
        {{ rightOnly }}
      </text>
    </svg>

    <div
      data-testid="venn-total"
      class="text-caption venn-total"
    >
      {{ totalLabel }}
    </div>
  </div>
</template>

<style scoped>
.comparison-venn {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.venn-circles {
  mix-blend-mode: multiply;
}

.venn-circle {
  fill-opacity: 0.35;
  stroke-width: 1;
}

.venn-circle-left {
  fill: rgb(var(--v-theme-primary));
  stroke: rgb(var(--v-theme-primary));
}

.venn-circle-right {
  fill: rgb(var(--v-theme-secondary));
  stroke: rgb(var(--v-theme-secondary));
}

.venn-name {
  font-size: 14px;
  font-weight: 500;
  fill: rgb(var(--v-theme-on-surface));
}

.venn-count {
  font-size: 22px;
  font-weight: 600;
  fill: rgb(var(--v-theme-on-surface));
  pointer-events: none;
}

.venn-total {
  margin-top: 8px;
}
</style>
