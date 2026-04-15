<script setup lang="ts">
import type { QuickLogItem } from "@/types"

defineProps<{
  items: QuickLogItem[]
}>()

const emit = defineEmits<{
  remove: [id: string]
}>()

function formatDate(createdAt: string) {
  return new Date(createdAt).toLocaleString()
}
</script>

<template>
  <section class="list-section">
    <h2 class="heading">メモ一覧</h2>

    <p v-if="items.length === 0" class="empty">まだメモがありません</p>

    <ul v-else class="list">
      <li v-for="item in items" :key="item.id" class="item">
        <p class="date">{{ formatDate(item.createdAt) }}</p>
        <p class="text">{{ item.text }}</p>
        <button class="button" type="button" @click="emit('remove', item.id)">削除</button>
      </li>
    </ul>
  </section>
</template>

<style lang="css" scoped>
.list-section {
  margin-top: 32px;
}

.heading {
  margin: 0 0 16px;
}

.empty {
  margin: 0;
  color: #666;
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
</style>
