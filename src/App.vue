<script setup lang="ts">
import QuickLogForm from "@/components/QuickLogForm.vue"
import QuickLogList from "@/components/QuickLogList.vue"
import { loadItems, saveItems } from "@/lib/storage"
import type { QuickLogItem } from "@/types"
import { Analytics } from "@vercel/analytics/vue"
import { onMounted, ref } from "vue"

const items = ref<QuickLogItem[]>([])

onMounted(() => {
  items.value = loadItems()
})

function handleSubmit(text: string) {
  const item: QuickLogItem = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }

  items.value.unshift(item)
  saveItems(items.value)
}

function handleRemove(id: string) {
  items.value = items.value.filter((item) => item.id !== id)
  saveItems(items.value)
}
</script>

<template>
  <Analytics />
  <main class="app">
    <header class="header">
      <h1>quicklog</h1>
      <p>即座にメモを取るためのアプリ</p>
    </header>

    <QuickLogForm @submit="handleSubmit" />
    <QuickLogList :items="items" @remove="handleRemove" />
  </main>
</template>

<style lang="css" scoped>
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: 24px 16px;
}

.header {
  margin-bottom: 24px;
}
</style>
