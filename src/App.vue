<script setup lang="ts">
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { loadLogEntries, loadSettings, saveLogEntries, saveSettings } from "@/lib/storage"
import { type AppSettings, type LogEntry } from "@/types"
import { onMounted, ref } from "vue"

const items = ref<LogEntry[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)

function openSettings() {
  settingsDialog.value?.open()
}

onMounted(() => {
  items.value = loadLogEntries()
  settings.value = loadSettings()
})

function handleSubmit(text: string) {
  const item: LogEntry = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }

  items.value.unshift(item)
  saveLogEntries(items.value)
}

function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  items.value = items.value.filter((item) => item.id !== id)
  saveLogEntries(items.value)
}

function handleExport() {
  const json = JSON.stringify(items.value, null, 2)
  const blob = new Blob([json], { type: "application/json" })
  const url = URL.createObjectURL(blob)

  const a = document.createElement("a")
  const date = new Date().toISOString().split("T")[0]
  a.href = url
  a.download = `quicklog-${date}.json`
  a.click()

  URL.revokeObjectURL(url)
}

function handleSaveSettings(nextSettings: AppSettings) {
  settings.value = nextSettings
  saveSettings(nextSettings)
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1 class="title">quicklog</h1>
      <p class="header-actions">
        <SettingsButton @click="openSettings" />
      </p>
    </header>

    <LogEntryForm @submit="handleSubmit" />
    <LogEntryList
      :items="items"
      :show-time-strip="settings.showTimeStrip"
      @remove="handleRemove"
      @export="handleExport"
    />
    <SettingsDialog ref="settingsDialog" :settings="settings" @save="handleSaveSettings" />
  </main>
</template>

<style lang="css" scoped>
.app {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-2);
}

.header {
  position: relative;
  margin-bottom: var(--space-3);
  padding-right: 40px;
}

.title {
  font-size: 2em;
  font-weight: var(--font-weight-bold);
  margin: 0;
}

.header-actions {
  position: absolute;
  top: 0;
  right: 0;
  margin: 0;
}
</style>
