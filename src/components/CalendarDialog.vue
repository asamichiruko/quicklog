<script setup lang="ts">
import { createCalendarDays } from "@/lib/calendar"
import { addMonths, startOfLocalDay, startOfMonth } from "@/lib/date"
import { computed, ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const displayedMonth = ref(startOfMonth(new Date()))

const props = defineProps<{
  initialDate: Date
  recordCounts: Map<string, number>
}>()

const emit = defineEmits<{
  select: [selectedDate: Date]
}>()

const weekdayLabels = ["日", "月", "火", "水", "木", "金", "土"]

const calendarDays = computed(() => {
  return createCalendarDays(displayedMonth.value, props.initialDate, props.recordCounts)
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

function formatDayLabel(date: Date, hasRecords: boolean) {
  const dateLabel = new Intl.DateTimeFormat("ja-JP", {
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Tokyo",
  }).format(date)

  return hasRecords ? `${dateLabel}、記録あり、移動` : `${dateLabel}、記録なし`
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    @click="handleDialogClick"
    aria-labelledby="calendar-dialog-heading"
  >
    <div class="container">
      <header class="dialog-header">
        <h2 id="calendar-dialog-heading" class="dialog-heading">表示する日付を選択</h2>
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
            aria-hidden="true"
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
            aria-hidden="true"
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
            aria-hidden="true"
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
              'is-initial-day': day.isInitialDay,
            },
          ]"
          :disabled="!day.hasRecords"
          :aria-label="formatDayLabel(day.date, day.hasRecords)"
          :data-count="day.count"
          @click="selectAndClose(day.date)"
        >
          <span class="day-number">{{ day.date.getDate() }}</span>
          <span v-if="day.hasRecords" class="day-count" aria-hidden="true"></span>
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
  gap: var(--space-1);
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
  display: flex;
  align-items: center;
  justify-content: center;
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
  place-self: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  font-weight: var(--font-weight-regular);
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
  background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
}

@media (hover: hover) {
  .day-button:not(:disabled):hover {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 17%, var(--color-surface));
  }
}

@media (hover: none) {
  .day-button:not(:disabled):active {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 17%, var(--color-surface));
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

.is-outside-month.has-records {
  opacity: 0.45;
}

.is-today {
  text-decoration: underline;
}

.is-initial-day {
  box-shadow: inset 0 0 0 2px color-mix(in srgb, var(--color-primary) 35%, transparent);
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
  inline-size: 9px;
}

.count-high .day-count {
  background: var(--color-primary);
  inline-size: 12px;
}

.count-max .day-count {
  inline-size: 15px;
  background: var(--color-primary);
}
</style>
