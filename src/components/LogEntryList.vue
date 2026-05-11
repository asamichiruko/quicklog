<script setup lang="ts">
import TimeDistributionStrip from "@/components/TimeDistributionStrip.vue"
import { formatRelativeDate, groupLogEntriesByDate, type DateGroup } from "@/lib/logEntries"
import type { LogEntry } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  items: LogEntry[]
  showTimeDistributionStrip: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

const absoluteDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
})

const absoluteDateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
})

const groupedItems = computed<DateGroup[]>(() => {
  return groupLogEntriesByDate(props.items)
})

function formatDate(createdAt: string) {
  return absoluteDateTimeFormatter.format(new Date(createdAt))
}

function formatDateHeading(date: Date) {
  return `${formatRelativeDate(date)} - ${absoluteDateFormatter.format(date)}`
}
</script>

<template>
  <template v-if="items.length === 0">
    <p class="empty">まだメモがありません</p>
  </template>
  <template v-else>
    <div class="date-groups">
      <section v-for="group in groupedItems" :key="group.key" class="date-group">
        <h2 class="date-heading">
          {{ formatDateHeading(group.date) }} / {{ group.items.length }} 件
        </h2>
        <div class="time-distribution-strip" v-if="props.showTimeDistributionStrip">
          <TimeDistributionStrip :items="group.items" />
        </div>
        <ul class="entries">
          <li v-for="item in group.items" :key="item.id" class="entry">
            <p class="date">{{ formatDate(item.createdAt) }}</p>
            <p class="text">{{ item.text }}</p>
            <button class="delete-button" type="button" @click="emit('remove', item.id)">
              削除
            </button>
          </li>
        </ul>
      </section>
    </div>
  </template>
</template>

<style lang="css" scoped>
.empty {
  margin: 0;
  color: var(--color-text-muted);
}

.date-groups {
  display: grid;
  gap: var(--space-2);
}

.date-group {
  display: grid;
  gap: var(--space-2);
}

.date-heading {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  color: var(--color-text-muted);
  justify-self: center;
}

.entries {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.entry {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
}

.date {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.delete-button {
  justify-self: end;
  width: fit-content;
  font-size: var(--font-size-sm);
  padding: 6px 14px;
  min-height: var(--control-min-size);
  border: 1px solid var(--color-border);
  background: #eeeeee;
  color: #555555;
}
.delete-button:hover,
.delete-button:focus {
  background: #e0e0e0;
}
</style>
