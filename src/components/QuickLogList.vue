<script setup lang="ts">
import QuickLogTimeStrip from "@/components/QuickLogTimeStrip.vue"
import type { LogEntry } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  items: LogEntry[]
  showTimeStrip: boolean
}>()

const emit = defineEmits<{
  remove: [id: string]
  export: []
}>()

type DateGroup = {
  key: string
  label: string
  items: LogEntry[]
}

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
  const groups = new Map<string, DateGroup>()

  for (const item of props.items) {
    const date = new Date(item.createdAt)
    const key = getLocalDateKey(date)
    const group = groups.get(key)

    if (group) {
      group.items.push(item)
      continue
    }

    groups.set(key, {
      key,
      label: formatDateHeading(date),
      items: [item],
    })
  }

  return [...groups.values()]
})

function formatDate(createdAt: string) {
  return absoluteDateTimeFormatter.format(new Date(createdAt))
}

function getLocalDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatDateHeading(date: Date) {
  return `${formatRelativeDate(date)} - ${absoluteDateFormatter.format(date)}`
}

function formatRelativeDate(date: Date) {
  const today = startOfLocalDay(new Date())
  const target = startOfLocalDay(date)
  const diffDays = Math.round((target.getTime() - today.getTime()) / 86400000)

  if (diffDays === 0) return "今日"
  if (diffDays === -1) return "昨日"
  if (diffDays === 1) return "明日"
  if (diffDays < 0) return `${Math.abs(diffDays)}日前`

  return `${diffDays}日後`
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
</script>

<template>
  <section class="list-section">
    <template v-if="items.length === 0">
      <p class="empty">まだメモがありません</p>
    </template>
    <template v-else>
      <div class="date-groups">
        <section v-for="group in groupedItems" :key="group.key" class="date-group">
          <h2 class="date-heading">{{ group.label }} / {{ group.items.length }} 件</h2>
          <div class="time-strip" v-if="props.showTimeStrip">
            <QuickLogTimeStrip :items="group.items" />
          </div>
          <ul class="list">
            <li v-for="item in group.items" :key="item.id" class="item">
              <p class="date">{{ formatDate(item.createdAt) }}</p>
              <p class="text">{{ item.text }}</p>
              <button
                class="delete-button button-danger"
                type="button"
                @click="emit('remove', item.id)"
              >
                削除
              </button>
            </li>
          </ul>
        </section>
      </div>
      <div class="footer">
        <button class="export-button" type="button" @click="emit('export')">
          データをエクスポート
        </button>
      </div>
    </template>
  </section>
</template>

<style lang="css" scoped>
.list-section {
  margin-top: var(--space-4);
}

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

.list {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.item {
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
  color: var(--color-danger-muted);
}
.delete-button:hover,
.delete-button:focus {
  background: #e0e0e0;
}

.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.export-button {
  padding: 0;
  border: none;
  border-radius: 0px;
  background: none;
  font: inherit;
  color: var(--color-text-muted);
  text-decoration: underline;
}
</style>
