<script setup lang="ts">
import { getLocalDateKey, startOfLocalDay } from "@/lib/date"
import type { LogEntry } from "@/types"
import { computed, ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const displayedMonth = ref(startOfMonth(new Date()))

const props = defineProps<{
  initialDate: Date
  items: LogEntry[]
}>()

const emit = defineEmits<{
  select: [selectedDate: Date]
}>()

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"]

const recordCounts = computed(() => {
  const counts = new Map<string, number>()

  for (const item of props.items) {
    const key = getLocalDateKey(new Date(item.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
})

const calendarDays = computed(() => {
  const firstDay = startOfMonth(displayedMonth.value)
  const startDate = addDays(firstDay, -firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(startDate, index)
    const dateKey = getLocalDateKey(date)
    const count = recordCounts.value.get(dateKey) ?? 0

    return {
      date,
      dateKey,
      count,
      isCurrentMonth: date.getMonth() === displayedMonth.value.getMonth(),
      isToday: dateKey === getLocalDateKey(new Date()),
      countLevel: getCountLevel(count),
      hasRecords: count > 0,
      isSelectable: count > 0 && date.getMonth() === displayedMonth.value.getMonth(),
    }
  })
})

const displayedMonthLabel = computed(() => {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    timeZone: "Asia/Tokyo",
  }).format(displayedMonth.value)
})

function open() {
  if (!dialog.value || dialog.value.open) return

  displayedMonth.value = startOfMonth(props.initialDate)
  dialog.value?.showModal()
}

function selectAndClose(selectedDate: Date) {
  emit("select", startOfLocalDay(selectedDate))
  close()
}

function close() {
  dialog.value?.close()
}

function handleDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) {
    close()
  }
}

function showPreviousMonth() {
  displayedMonth.value = addMonths(displayedMonth.value, -1)
}

function showNextMonth() {
  displayedMonth.value = addMonths(displayedMonth.value, 1)
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function addMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date)
  nextDate.setDate(nextDate.getDate() + amount)
  return startOfLocalDay(nextDate)
}

function getCountLevel(count: number) {
  if (count === 0) return "none"
  if (count <= 5) return "low"
  if (count <= 10) return "medium"
  if (count <= 20) return "high"
  return "max"
}

function formatDayLabel(date: Date, hasRecords: boolean, isCurrentMonth: boolean) {
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo",
  }).format(date)

  if (!isCurrentMonth) {
    return `${dateLabel}、表示月外`
  }

  return hasRecords ? `${dateLabel}、記録あり、移動` : `${dateLabel}、記録なし`
}

defineExpose({ open })
</script>

<template>
  <dialog ref="dialog" class="dialog" @click="handleDialogClick">
    <div class="container">
      <header class="dialog-header">
        <h2 class="dialog-heading">表示する日付を選択</h2>
        <button
          class="close-button"
          type="button"
          aria-label="閉じる"
          title="閉じる"
          @click="close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M2.146 2.146a.5.5 0 0 1 .708 0L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854a.5.5 0 0 1 0-.708"
            />
          </svg>
        </button>
      </header>

      <div class="month-navigation">
        <button
          class="month-button"
          type="button"
          aria-label="前月を表示"
          @click="showPreviousMonth"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
            />
          </svg>
        </button>
        <p class="month-label" aria-live="polite">{{ displayedMonthLabel }}</p>
        <button class="month-button" type="button" aria-label="翌月を表示" @click="showNextMonth">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
          >
            <path
              d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
            />
          </svg>
        </button>
      </div>

      <div class="calendar" role="group" :aria-label="`${displayedMonthLabel}の記録日カレンダー`">
        <div v-for="weekday in weekdayLabels" :key="weekday" class="weekday">
          {{ weekday }}
        </div>
        <button
          v-for="day in calendarDays"
          :key="day.dateKey"
          class="day-button"
          type="button"
          :class="[
            `count-${day.countLevel}`,
            {
              'is-outside-month': !day.isCurrentMonth,
              'is-today': day.isToday && day.isCurrentMonth,
              'has-records': day.hasRecords,
            },
          ]"
          :disabled="!day.isSelectable"
          :aria-label="formatDayLabel(day.date, day.hasRecords, day.isCurrentMonth)"
          :data-count="day.count"
          @click="selectAndClose(day.date)"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <span
            v-if="day.hasRecords && day.isCurrentMonth"
            class="day-count"
            aria-hidden="true"
          ></span>
        </button>
      </div>
    </div>
  </dialog>
</template>

<style lang="css" scoped>
.dialog {
  padding: 0;
  width: min(94vw, 480px);
  max-height: calc(100dvh - 32px);
  border: none;
  border-radius: var(--radius-surface);
  background: var(--color-surface);
}

.container {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2);
}

.dialog-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--control-min-size);
  align-items: center;
  gap: var(--space-1);
}

.dialog-heading {
  margin: 0;
  padding: 0;
  color: var(--color-text);
  font-size: 1.5em;
  font-weight: var(--font-weight-bold);
}

.close-button,
.month-button {
  display: inline-grid;
  place-items: center;
  inline-size: var(--control-min-size);
  block-size: var(--control-min-size);
  padding: 0;
  border: none;
  background: transparent;
  color: var(--color-text-muted);
}

@media (hover: hover) {
  .close-button:hover,
  .month-button:hover {
    background: var(--color-ghost-hover);
  }
}

@media (hover: none) {
  .close-button:active,
  .month-button:active {
    background: var(--color-ghost-hover);
  }
}

.month-navigation {
  display: grid;
  grid-template-columns: var(--control-min-size) minmax(0, 1fr) var(--control-min-size);
  align-items: center;
  gap: var(--space-1);
}

.month-label {
  margin: 0;
  color: var(--color-text);
  font-size: 1.1em;
  font-weight: var(--font-weight-bold);
  text-align: center;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.weekday {
  display: grid;
  place-items: center;
  min-block-size: 28px;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-bold);
}

.day-button {
  display: grid;
  grid-template-rows: 1fr 8px;
  justify-items: center;
  align-items: center;
  min-width: 0;
  min-height: var(--control-min-size);
  padding: 4px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
}

.day-button.has-records:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 7%, var(--color-surface));
}

@media (hover: hover) {
  .day-button:not(:disabled):hover {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  }
}

@media (hover: none) {
  .day-button:not(:disabled):active {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
  }
}

.day-button:disabled {
  cursor: not-allowed;
  color: var(--color-text-subtle);
  background: var(--color-page);
}

.is-outside-month:disabled {
  border-color: transparent;
  background: transparent;
}

.is-outside-month.has-records:disabled {
  border-color: transparent;
  background: transparent;
}

.is-today {
  outline: 1px solid color-mix(in srgb, var(--color-primary) 25%, var(--color-border) 75%);
  outline-offset: -3px;
}

.day-number {
  font-weight: var(--font-weight-semibold);
}

.day-count {
  inline-size: 6px;
  block-size: 6px;
  border-radius: var(--radius-pill);
}

.count-low .day-count {
  background: var(--color-primary);
}

.count-medium .day-count {
  background: var(--color-primary);
}

.count-high .day-count,
.count-max .day-count {
  background: var(--color-primary);
}
</style>
