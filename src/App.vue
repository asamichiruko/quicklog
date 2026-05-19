<script setup lang="ts">
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { createLogEntriesExportFile } from "@/lib/export"
import { mergeLogEntries, parseAsLogEntries } from "@/lib/import"
import { getLocalDateKey } from "@/lib/logEntries"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { loadLogEntries, loadSettings, saveLogEntries, saveSettings } from "@/lib/storage"
import { type AppSettings, type ExportType, type LogEntry } from "@/types"
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
  items.value.push(item)
  saveLogEntries(items.value)
}

function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  items.value = items.value.filter((item) => item.id !== id)
  saveLogEntries(items.value)
}

function handleExport(exportType: ExportType) {
  const exportFile = createLogEntriesExportFile(items.value, exportType)
  const blob = new Blob([exportFile.content], { type: exportFile.mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const dateKey = getLocalDateKey(new Date())
  a.href = url
  a.download = `quicklog-${dateKey}${exportFile.extension}`
  a.click()

  URL.revokeObjectURL(url)
}

async function handleImport(file: File) {
  if (file.type && file.type !== "application/json") {
    alert("ファイル形式が JSON ではありません。JSON 形式のファイルを選択してください。")
    return
  }

  var data: unknown

  try {
    const text = await file.text()
    data = JSON.parse(text)
  } catch {
    alert("ファイルの読み込みに失敗しました。ファイル内容が JSON であることを確認してください。")
    return
  }

  try {
    const previousCount = items.value.length
    const incoming = parseAsLogEntries(data)
    const merged = mergeLogEntries(items.value, incoming)
    const addedCount = merged.length - previousCount

    items.value = merged
    saveLogEntries(merged)

    alert(`${addedCount} 件のメモをインポートしました。`)
  } catch {
    alert(
      "インポートに失敗しました。quicklog からエクスポートしたファイルであることを確認してください。",
    )
  }
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
    </header>

    <div class="content">
      <LogEntryForm @submit="handleSubmit" />
      <div class="app-actions">
        <SettingsButton @click="openSettings" />
      </div>
      <LogEntryList
        :items="items"
        :showDailySummary="settings.showDailySummary"
        @remove="handleRemove"
      />
    </div>
  </main>

  <SettingsDialog
    ref="settingsDialog"
    :settings="settings"
    @save="handleSaveSettings"
    @export="handleExport"
    @import="handleImport"
  />
</template>

<style lang="css" scoped>
.app {
  position: relative;
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-2);
}

.header {
  position: relative;
  margin-bottom: var(--space-3);
  padding-right: 44px;
}

.title {
  font-size: 2em;
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.app-actions {
  position: absolute;
  top: var(--space-3);
  right: var(--space-2);
  margin: 0;
}

.content {
  display: grid;
  gap: var(--space-4);
}
</style>
