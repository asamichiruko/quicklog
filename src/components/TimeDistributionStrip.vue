<script setup lang="ts">
import type { LogEntry } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  logEntries: LogEntry[]
}>()

const marks = computed(() =>
  props.logEntries.map((logEntry) => ({
    id: logEntry.id,
    positionPercent: getPositionPercent(logEntry.createdAt),
  })),
)

const timeLabels = [
  { label: "0", positionPercent: 0 },
  { label: "6", positionPercent: 25 },
  { label: "12", positionPercent: 50 },
  { label: "18", positionPercent: 75 },
  { label: "24", positionPercent: 100 },
]

function getPositionPercent(createdAt: string): number {
  const date = new Date(createdAt)
  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60

  return (minutes / (24 * 60)) * 100
}
</script>

<template>
  <div
    class="time-distribution-strip"
    role="img"
    :aria-label="`記録時刻分布。${logEntries.length}件の記録があります。`"
  >
    <div
      class="time-track-scale"
      aria-hidden="true"
    >
      <span
        v-for="mark in marks"
        :key="mark.id"
        class="time-mark"
        :style="{ left: `${mark.positionPercent}%` }"
      />
    </div>

    <div
      class="time-label-scale"
      aria-hidden="true"
    >
      <span
        v-for="label in timeLabels"
        :key="label.label"
        class="time-label"
        :style="{ left: `${label.positionPercent}%` }"
      >
        {{ label.label }}
      </span>
    </div>
  </div>
</template>

<style lang="css" scoped>
.time-distribution-strip {
  --time-distribution-strip-padding: 4px;
  --time-mark-width: 2px;
  --time-mark-height: 14px;
  --time-mark-padding: 2px;
  --time-scale-height: 16px;
  --time-scale-font-size: 11px;
  --edge-inset: calc(var(--time-mark-width) / 2);

  padding: var(--time-distribution-strip-padding) calc(var(--space-3) + var(--edge-inset));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
}

.time-track-scale {
  position: relative;
  height: calc(var(--time-mark-height) + var(--time-mark-padding) * 2);
  overflow: visible;
}

.time-mark {
  position: absolute;
  top: var(--time-mark-padding);
  bottom: var(--time-mark-padding);
  width: var(--time-mark-width);
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  opacity: 0.45;
}

.time-label-scale {
  position: relative;
  height: var(--time-scale-height);
  font-size: var(--time-scale-font-size);
  color: var(--color-text-muted);
}

.time-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
