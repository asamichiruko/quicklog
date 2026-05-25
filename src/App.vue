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
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"

const items = ref<LogEntry[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const showComposeShortcut = ref(false)
const composeShortcutShowScrollY = 320
const composeShortcutHideScrollY = 120

const _currentDate = ref<Date | null>(null)
const currentDate = computed<Date>(() => {
  return _currentDate.value ?? new Date()
})

const recordCounts = computed(() => {
  const counts = new Map<string, number>()

  for (const item of items.value) {
    const key = getLocalDateKey(new Date(item.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
})

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const calendarDialog = ref<InstanceType<typeof CalendarDialog> | null>(null)
const logEntryForm = ref<InstanceType<typeof LogEntryForm> | null>(null)
const logEntryFormArea = ref<HTMLElement | null>(null)

onMounted(() => {
  items.value = loadLogEntries()
  settings.value = loadSettings()
  updateComposeShortcutVisibility()
  window.addEventListener("scroll", updateComposeShortcutVisibility, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener("scroll", updateComposeShortcutVisibility)
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

function updateComposeShortcutVisibility() {
  const scrollY = window.scrollY

  if (showComposeShortcut.value) {
    showComposeShortcut.value = scrollY > composeShortcutHideScrollY
    return
  }

  showComposeShortcut.value = scrollY > composeShortcutShowScrollY
}

function moveToComposer() {
  logEntryFormArea.value?.scrollIntoView({ behavior: "smooth", block: "start" })
  logEntryForm.value?.focus({ preventScroll: true })
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
      <div ref="logEntryFormArea" class="compose-area">
        <LogEntryForm ref="logEntryForm" @submit="handleSubmit" />
      </div>
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

  <button
    v-if="showComposeShortcut"
    class="button-primary compose-shortcut"
    type="button"
    @click="moveToComposer"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      fill="currentColor"
      class="bi bi-pencil"
      viewBox="0 0 16 16"
      aria-hidden="true"
    >
      <path
        d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"
      />
    </svg>
    <span>メモを書く</span>
  </button>

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
    :recordCounts="recordCounts"
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

.compose-area {
  scroll-margin-top: var(--space-2);
}

.compose-shortcut {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-2) + env(safe-area-inset-bottom));
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  transform: translateX(-50%);
}
</style>
