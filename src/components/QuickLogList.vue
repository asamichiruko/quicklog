<script setup lang="ts">
import type { QuickLogItem } from "@/types"
import { computed } from "vue"

const props = defineProps<{
  items: QuickLogItem[]
}>()

const emit = defineEmits<{
  remove: [id: string]
  export: []
}>()

type DateGroup = {
  key: string
  label: string
  items: QuickLogItem[]
}

const absoluteDateFormatter = new Intl.DateTimeFormat("ja-JP", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "short",
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
  return new Date(createdAt).toLocaleString()
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
          <h2 class="date-heading">{{ group.label }}</h2>
          <ul class="list">
            <li v-for="item in group.items" :key="item.id" class="item">
              <p class="date">{{ formatDate(item.createdAt) }}</p>
              <p class="text">{{ item.text }}</p>
              <button class="button" type="button" @click="emit('remove', item.id)">削除</button>
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
  margin-top: 32px;
}

.empty {
  margin: 0;
  color: #666;
}

.date-groups {
  display: grid;
  gap: 24px;
}

.date-group {
  display: grid;
  gap: 8px;
}

.date-heading {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #777;
  justify-self: center;
}

.list {
  display: grid;
  gap: 16px;
  padding: 0;
  margin: 0;
  list-style: none;
}

.item {
  display: grid;
  gap: 8px;
  padding: 16px;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.date {
  margin: 0;
  font-size: 0.875rem;
  color: #666;
}

.text {
  margin: 0;
  white-space: pre-wrap;
}

.button {
  width: fit-content;
}

.footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.export-button {
  padding: 0;
  border: none;
  background: none;
  font: inherit;
  color: #666;
  text-decoration: underline;
}
</style>
