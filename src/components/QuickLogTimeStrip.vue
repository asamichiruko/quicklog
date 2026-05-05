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

function getPositionPercent(createdAt: string): number {
  const date = new Date(createdAt)

  const minutes = date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60

  return (minutes / (24 * 60)) * 100
}
</script>

<template>
  <div class="time-strip" role="img" aria-label="記録時刻の分布グラフ">
    <div class="time-track">
      <span
        v-for="mark in marks"
        :key="mark.id"
        class="time-mark"
        :style="{ left: `${mark.positionPercent}%` }"
        aria-hidden="true"
      ></span>
    </div>
    <div class="time-labels" aria-hidden="true">
      <span>0</span>
      <span>6</span>
      <span>12</span>
      <span>18</span>
      <span>24</span>
    </div>
  </div>
</template>

<style lang="css" scoped>
.time-strip {
  border: 1px solid var(--color-border);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  background: var(--color-surface);
}

.time-track {
  position: relative;
  height: 18px;
  overflow: hidden;
}

.time-mark {
  position: absolute;
  top: 3px;
  bottom: 3px;
  width: 2px;
  transform: translateX(-50%);
  border-radius: var(--radius-pill);
  background: currentColor;
  color: #555555;
  opacity: 0.45;
}

.time-labels {
  display: flex;
  justify-content: space-between;
  padding: 2px 12px 0;
  font-size: 11px;
  color: #888888;
}
</style>
