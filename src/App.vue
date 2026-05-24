<script setup lang="ts">
import CalendarDialog from "@/components/CalendarDialog.vue"
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { downloadTextFile, readJsonFile } from "@/lib/browserFile"
import { getDateGroupId, getLocalDateKey } from "@/lib/date"
import { mergeLogEntries } from "@/lib/logEntryCollection"
import { createLogEntriesExportFile } from "@/lib/logEntryExport"
import { parseAsLogEntries } from "@/lib/logEntrySchema"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { loadLogEntries, loadSettings, saveLogEntries, saveSettings } from "@/lib/storage"
import { type AppSettings, type ExportType, type LogEntry } from "@/types"
import { computed, nextTick, onMounted, ref } from "vue"

const items = ref<LogEntry[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

const _currentDate = ref<Date | null>(null)
const currentDate = computed<Date>(() => {
  return _currentDate.value ?? new Date()
})

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const calendarDialog = ref<InstanceType<typeof CalendarDialog> | null>(null)

onMounted(() => {
  items.value = loadLogEntries()
  settings.value = loadSettings()
})

function openSettings() {
  settingsDialog.value?.open()
}

function openCalendar() {
  calendarDialog.value?.open()
}

function handleSubmit(text: string) {
  const item: LogEntry = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }
  items.value.push(item)
  saveLogEntries(items.value)
}

async function handleOpenCalendar(initialDate: Date) {
  _currentDate.value = initialDate
  await nextTick()
  openCalendar()
}

function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  items.value = items.value.filter((item) => item.id !== id)
  saveLogEntries(items.value)
}

function handleExport(exportType: ExportType) {
  const exportFile = createLogEntriesExportFile(items.value, exportType)
  const dateKey = getLocalDateKey(new Date())

  downloadTextFile({
    content: exportFile.content,
    mimeType: exportFile.mimeType,
    filename: `quicklog-${dateKey}${exportFile.extension}`,
  })
}

async function handleImport(file: File) {
  if (file.type && file.type !== "application/json") {
    alert("ファイル形式が JSON ではありません。JSON 形式のファイルを選択してください。")
    return
  }

  try {
    const data = await readJsonFile(file)
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

function handleSelectDate(selectedDate: Date) {
  const target = document.getElementById(getDateGroupId(selectedDate))
  target?.scrollIntoView({ behavior: "smooth", block: "start" })
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
        @open-calendar="handleOpenCalendar"
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

  <CalendarDialog
    ref="calendarDialog"
    :initialDate="currentDate"
    :items="items"
    @select="handleSelectDate"
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
