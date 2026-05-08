<script setup lang="ts">
import type { QuickLogItem } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  items: QuickLogItem[]
}>()

const marks = computed(() =>
  props.items.map((item) => ({
    id: item.id,
    positionPercent: getPositionPercent(item.createdAt),
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
    class="time-strip"
    role="img"
    :aria-label="`記録時刻分布。${items.length}件の記録があります。`"
  >
    <div class="time-track-scale" aria-hidden="true">
      <span
        v-for="mark in marks"
        :key="mark.id"
        class="time-mark"
        :style="{ left: `${mark.positionPercent}%` }"
      ></span>
    </div>

    <div class="time-label-scale" aria-hidden="true">
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
.time-strip {
  --mark-width: 2px;
  --edge-inset: calc(var(--mark-width) / 2);

  padding: 4px calc(16px + var(--edge-inset));
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
}

.time-track-scale {
  position: relative;
  height: 18px;
  overflow: visible;
}

.time-mark {
  position: absolute;
  top: 2px;
  bottom: 2px;
  width: var(--mark-width);
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background: var(--color-primary);
  opacity: 0.45;
}

.time-label-scale {
  position: relative;
  height: 14px;
  padding: 2px 0 0;
  font-size: 11px;
  color: var(--color-text-muted);
}

.time-label {
  position: absolute;
  top: 0;
  transform: translateX(-50%);
  white-space: nowrap;
}
</style>
