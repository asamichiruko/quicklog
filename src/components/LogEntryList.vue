<script setup lang="ts">
import TimeDistributionStrip from "@/components/TimeDistributionStrip.vue"
import {
  formatRelativeDate,
  groupLogEntriesByDate,
  sortLogEntriesByCreatedAtDesc,
  type DateGroup,
} from "@/lib/logEntries"
import type { LogEntry } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  items: LogEntry[]
  showDailySummary: boolean
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
  return groupLogEntriesByDate(sortLogEntriesByCreatedAtDesc(props.items))
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
          <span class="date-heading-date">{{ formatDateHeading(group.date) }}</span>
          <span class="date-heading-count" v-if="props.showDailySummary">
            {{ group.items.length }} 件
          </span>
        </h2>
        <div class="time-distribution-strip" v-if="props.showDailySummary">
          <TimeDistributionStrip :items="group.items" />
        </div>
        <ul class="entries">
          <li v-for="item in group.items" :key="item.id" class="entry">
            <div class="entry-header">
              <span class="date">{{ formatDate(item.createdAt) }}</span>
              <button
                class="delete-button"
                type="button"
                aria-label="削除"
                title="削除"
                @click="emit('remove', item.id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-trash3"
                  viewBox="0 0 16 16"
                >
                  <path
                    d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"
                  />
                </svg>
              </button>
            </div>
            <p class="text">{{ item.text }}</p>
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
  gap: var(--space-4);
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

.date-heading-count::before {
  content: " / ";
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

.entry-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  justify-content: space-between;
  gap: var(--space-2);
}

.date {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text-muted);
  min-width: 0;
}

.text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.delete-button {
  --icon-size: 18px;
  --hit-area-extra: calc((var(--control-min-size) - var(--icon-size)) / 2);

  display: inline-grid;
  place-items: center;
  inline-size: var(--control-min-size);
  block-size: var(--control-min-size);
  min-block-size: var(--control-min-size);
  margin-block: calc(var(--hit-area-extra) * -1);
  margin-inline: calc(var(--hit-area-extra) * -1);
  padding: 0;
  background: transparent;
  color: var(--color-text-muted);
}
@media (hover: hover) {
  .delete-button:hover {
    background: #eeeeee;
  }
}
@media (hover: none) {
  .delete-button:active {
    background: #eeeeee;
  }
}

.delete-button svg {
  inline-size: var(--icon-size);
  block-size: var(--icon-size);
}
</style>
