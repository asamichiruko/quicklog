<script setup lang="ts">
import TimeDistributionStrip from "@/components/TimeDistributionStrip.vue"
import { getDateGroupId } from "@/lib/date"
import { formatLongJapaneseDate, formatRelativeDate } from "@/lib/dateFormat"
import {
  groupLogEntriesByDate,
  sortLogEntriesByCreatedAtDesc,
  type DateGroup,
} from "@/lib/logEntryCollection"
import type { LogEntry } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  logEntries: LogEntry[]
  showDailySummary: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  openCalendar: [initialDate: Date]
}>()

const groupedLogEntries = computed<DateGroup[]>(() => {
  return groupLogEntriesByDate(sortLogEntriesByCreatedAtDesc(props.logEntries))
})

function formatDateTime(createdAt: string) {
  const date = new Date(createdAt)
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${hour}:${minute}:${second}`
}

function formatDateHeading(date: Date) {
  return `${formatRelativeDate(date)} - ${formatLongJapaneseDate(date)}`
}
</script>

<template>
  <template v-if="logEntries.length === 0">
    <p class="empty">
      まだメモがありません
    </p>
  </template>
  <template v-else>
    <div class="date-groups">
      <section
        v-for="group in groupedLogEntries"
        :id="getDateGroupId(group.date)"
        :key="group.key"
        class="date-group"
      >
        <header class="date-header">
          <h2 class="date-heading">
            <span class="date-heading-date">{{ formatDateHeading(group.date) }}</span>
            <span
              v-if="props.showDailySummary"
              class="date-heading-count"
            >
              {{ group.logEntries.length }} 件
            </span>
          </h2>
          <div class="date-header-actions">
            <button
              type="button"
              class="button-icon calendar-button"
              aria-label="日付を選択"
              title="日付を選択"
              @click="emit('openCalendar', group.date)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                fill="currentColor"
                class="bi bi-calendar"
                viewBox="0 0 16 16"
                aria-hidden="true"
              >
                <path
                  d="M3.5 0a.5.5 0 0 1 .5.5V1h8V.5a.5.5 0 0 1 1 0V1h1a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V3a2 2 0 0 1 2-2h1V.5a.5.5 0 0 1 .5-.5M1 4v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V4z"
                />
              </svg>
            </button>
          </div>
          <div
            v-if="props.showDailySummary"
            class="time-distribution-strip"
          >
            <TimeDistributionStrip :log-entries="group.logEntries" />
          </div>
        </header>
        <ul class="entries">
          <li
            v-for="logEntry in group.logEntries"
            :key="logEntry.id"
            class="entry"
          >
            <div class="entry-header">
              <time
                :datetime="logEntry.createdAt"
                class="entry-time"
              >{{
                formatDateTime(logEntry.createdAt)
              }}</time>
              <button
                class="button-icon delete-button"
                type="button"
                aria-label="削除"
                title="削除"
                @click="emit('remove', logEntry.id)"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  fill="currentColor"
                  class="bi bi-trash3"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path
                    d="M6.5 1h3a.5.5 0 0 1 .5.5v1H6v-1a.5.5 0 0 1 .5-.5M11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3A1.5 1.5 0 0 0 5 1.5v1H1.5a.5.5 0 0 0 0 1h.538l.853 10.66A2 2 0 0 0 4.885 16h6.23a2 2 0 0 0 1.994-1.84l.853-10.66h.538a.5.5 0 0 0 0-1zm1.958 1-.846 10.58a1 1 0 0 1-.997.92h-6.23a1 1 0 0 1-.997-.92L3.042 3.5zm-7.487 1a.5.5 0 0 1 .528.47l.5 8.5a.5.5 0 0 1-.998.06L5 5.03a.5.5 0 0 1 .47-.53Zm5.058 0a.5.5 0 0 1 .47.53l-.5 8.5a.5.5 0 1 1-.998-.06l.5-8.5a.5.5 0 0 1 .528-.47M8 4.5a.5.5 0 0 1 .5.5v8.5a.5.5 0 0 1-1 0V5a.5.5 0 0 1 .5-.5"
                  />
                </svg>
              </button>
            </div>
            <p class="entry-text">
              {{ logEntry.text }}
            </p>
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
}

.date-header {
  display: grid;
  grid-template-columns: var(--control-min-size) minmax(0, 1fr) var(--control-min-size);
  gap: var(--space-1);
  align-items: center;
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--color-page);
  padding: var(--space-2) 0;
}

.date-heading {
  grid-column: 2;
  min-width: 0;
  margin: 0;
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
  color: var(--color-text-muted);
  place-self: center;
}

.date-heading-count::before {
  content: " / ";
}

.date-header-actions {
  grid-column: 3;
  justify-self: end;
}

.time-distribution-strip {
  grid-column: 1 / -1;
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

.entry-time {
  margin: 0;
  font-size: var(--font-size-small);
  line-height: 1.5;
  color: var(--color-text-muted);
  min-width: 0;
}

.entry-text {
  margin: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.delete-button {
  --delete-icon-size: 18px;
  --hit-area-extra: calc((var(--control-min-size) - var(--delete-icon-size)) / 2);

  margin-block: calc(var(--hit-area-extra) * -1);
  margin-inline: calc(var(--hit-area-extra) * -1);
}

.delete-button svg {
  inline-size: var(--delete-icon-size);
  block-size: var(--delete-icon-size);
}
</style>
