<script setup lang="ts">
import QuickLogForm from "@/components/QuickLogForm.vue"

function handleSubmit(text: string) {
  console.log(text)
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1>quicklog</h1>
      <p>即座にメモを取るためのアプリ</p>
    </header>

    <QuickLogForm @submit="handleSubmit" />
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
