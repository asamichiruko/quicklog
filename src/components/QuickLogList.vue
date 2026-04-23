<script setup lang="ts">
import type { QuickLogItem } from "@/types"

defineProps<{
  items: QuickLogItem[]
}>()

const emit = defineEmits<{
  remove: [id: string]
  export: []
}>()

function formatDate(createdAt: string) {
  return new Date(createdAt).toLocaleString()
}
</script>

<template>
  <section class="list-section">
    <template v-if="items.length === 0">
      <p class="empty">まだメモがありません</p>
    </template>
    <template v-else>
      <ul class="list">
        <li v-for="item in items" :key="item.id" class="item">
          <p class="date">{{ formatDate(item.createdAt) }}</p>
          <p class="text">{{ item.text }}</p>
          <button class="button" type="button" @click="emit('remove', item.id)">削除</button>
        </li>
      </ul>
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
