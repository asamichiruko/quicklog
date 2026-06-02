<script setup lang="ts">
import CalendarDialog from "@/components/CalendarDialog.vue"
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { downloadTextFile, readQuicklogImportFile } from "@/lib/browserFile"
import { createQuicklogExportFile } from "@/lib/createQuicklogExportFile"
import { getDateGroupId, getLocalDateKey } from "@/lib/date"
import { SchemaValidationError, SizeError } from "@/lib/errors"
import { isValidLogEntryText } from "@/lib/logEntrySchema"
import { parseAsQuicklogData } from "@/lib/quicklogDataMigration"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import { loadQuicklogData, loadSettings, saveQuicklogData, saveSettings } from "@/lib/storage"
import {
  mergeQuicklogData,
  pruneExpiredSyncOperations,
  pruneQuicklogDataSyncOperations,
} from "@/lib/syncQuicklogData"
import type { AppSettings, ExportType, LogEntry, QuicklogData, SyncOperation } from "@/types"
import { type Session } from "@supabase/supabase-js"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"
import { getCurrentSession } from "./lib/auth"
import { supabase } from "./lib/supabase"

const session = ref<Session | null>(null)

let unsubscribeAuth: (() => void) | undefined

const logEntries = ref<LogEntry[]>([])
const syncOperations = ref<SyncOperation[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

const showNewLogEntryButton = ref(false)
const newLogEntryButtonShowScrollY = 320
const newLogEntryButtonHideScrollY = 120

const initialDate = ref<Date>(new Date())
const recordCounts = computed(() => {
  const counts = new Map<string, number>()

  for (const logEntry of logEntries.value) {
    const key = getLocalDateKey(new Date(logEntry.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return counts
})

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const calendarDialog = ref<InstanceType<typeof CalendarDialog> | null>(null)
const logEntryForm = ref<InstanceType<typeof LogEntryForm> | null>(null)
const logEntryFormArea = ref<HTMLElement | null>(null)

onMounted(async () => {
  session.value = await getCurrentSession()
  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
  })
  unsubscribeAuth = () => {
    data.subscription.unsubscribe()
  }

  const quicklogData = pruneQuicklogDataSyncOperations(loadQuicklogData(), new Date())
  logEntries.value = quicklogData.logEntries
  syncOperations.value = quicklogData.syncOperations
  saveQuicklogData(quicklogData)

  settings.value = loadSettings()
  updateNewLogEntryButtonVisibility()
  window.addEventListener("scroll", updateNewLogEntryButtonVisibility, { passive: true })
})

onUnmounted(() => {
  unsubscribeAuth?.()
  window.removeEventListener("scroll", updateNewLogEntryButtonVisibility)
})

function openSettings() {
  settingsDialog.value?.open()
}

function openCalendar() {
  calendarDialog.value?.open()
}

function handleSubmit(text: string) {
  if (!isValidLogEntryText(text)) {
    alert("メモの記録に失敗しました。メモ内容が長すぎます")
    return
  }

  const logEntry: LogEntry = {
    id: crypto.randomUUID(),
    text,
    createdAt: new Date().toISOString(),
  }

  try {
    const nextEntries = [...logEntries.value, logEntry]

    saveQuicklogData({
      version: 2,
      logEntries: nextEntries,
      syncOperations: syncOperations.value,
    } satisfies QuicklogData)

    logEntries.value = nextEntries
  } catch (error) {
    if (error instanceof SizeError) {
      alert("メモの記録に失敗しました。記録が多すぎます")
    } else {
      alert("メモの記録に失敗しました")
    }
    return
  }

  logEntryForm.value?.clear()
}

function updateNewLogEntryButtonVisibility() {
  const scrollY = window.scrollY

  // hide < show とする
  // shortcut が表示されているとき: hide より下にスクロールしていたら表示（より緩い条件で表示）
  if (showNewLogEntryButton.value) {
    showNewLogEntryButton.value = scrollY > newLogEntryButtonHideScrollY
    return
  }

  //shortcut が表示されていないとき: show より下にスクロールしていたら表示（より厳しい条件で表示）
  showNewLogEntryButton.value = scrollY > newLogEntryButtonShowScrollY
}

function moveToLogEntryForm() {
  logEntryFormArea.value?.scrollIntoView({ behavior: "smooth", block: "start" })
  logEntryForm.value?.focus({ preventScroll: true }) // focus の副作用によるスクロールを抑える
}

async function handleOpenCalendar(date: Date) {
  initialDate.value = date
  await nextTick() // 確実に currentDate が更新されるように待つ
  openCalendar()
}

function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  try {
    const nextLogEntries = logEntries.value.filter((logEntry) => logEntry.id !== id)
    const deleteOperation: SyncOperation = {
      id: crypto.randomUUID(),
      type: "delete",
      createdAt: new Date().toISOString(),
      entryId: id,
    }
    const nextSyncOperations = [...syncOperations.value, deleteOperation]

    saveQuicklogData({
      version: 2,
      logEntries: nextLogEntries,
      syncOperations: nextSyncOperations,
    } satisfies QuicklogData)

    logEntries.value = nextLogEntries
    syncOperations.value = nextSyncOperations
  } catch (error) {
    if (error instanceof SizeError) {
      alert("削除に失敗しました。同期データが多すぎます")
    } else {
      alert("削除に失敗しました")
    }
    return
  }
}

function handleExport(exportType: ExportType) {
  try {
    const exportFile = createQuicklogExportFile(
      {
        version: 2,
        logEntries: logEntries.value,
        syncOperations: syncOperations.value,
      },
      exportType,
    )
    const dateKey = getLocalDateKey(new Date())

    downloadTextFile({
      content: exportFile.content,
      mimeType: exportFile.mimeType,
      filename: `quicklog-${dateKey}${exportFile.extension}`,
    })
  } catch (error) {
    if (error instanceof SizeError) {
      alert("エクスポートに失敗しました。エクスポートするデータのサイズが大きすぎます")
    } else if (error instanceof SchemaValidationError) {
      alert("エクスポートに失敗しました。データの一部が破損しています")
    } else {
      alert("エクスポートに失敗しました")
    }
  }
}

async function handleImport(file: File) {
  if (file.type && file.type !== "application/json") {
    alert("ファイル形式が JSON ではありません。JSON 形式のファイルを選択してください")
    return
  }

  try {
    const now = new Date()
    const data = await readQuicklogImportFile(file)
    const incoming = pruneQuicklogDataSyncOperations(parseAsQuicklogData(data), now)
    const result = mergeQuicklogData(
      {
        version: 2,
        logEntries: logEntries.value,
        syncOperations: pruneExpiredSyncOperations(syncOperations.value, now),
      },
      incoming,
    )

    saveQuicklogData(result.data)
    logEntries.value = result.data.logEntries
    syncOperations.value = result.data.syncOperations

    alert(`${result.addedCount} 件のメモを追加、${result.deletedCount} 件のメモを削除しました`)
  } catch (error) {
    if (error instanceof SizeError) {
      alert("インポートに失敗しました。ファイルサイズが大きすぎます")
    } else if (error instanceof SyntaxError) {
      alert("インポートに失敗しました。ファイル内容が JSON 形式であることを確認してください")
    } else if (error instanceof SchemaValidationError) {
      alert("インポートに失敗しました。異常なデータが含まれています")
    } else {
      alert("インポートに失敗しました")
    }
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
      <div ref="logEntryFormArea" class="log-entry-form-anchor">
        <LogEntryForm ref="logEntryForm" @submit="handleSubmit" />
      </div>
      <div class="app-actions">
        <SettingsButton @click="openSettings" />
      </div>
      <LogEntryList
        :log-entries="logEntries"
        :show-daily-summary="settings.showDailySummary"
        @remove="handleRemove"
        @open-calendar="handleOpenCalendar"
      />
    </div>
  </main>

  <button
    v-if="showNewLogEntryButton"
    class="button-primary new-log-entry-button"
    type="button"
    @click="moveToLogEntryForm"
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
    :session="session"
    :settings="settings"
    :log-entries="logEntries"
    @save="handleSaveSettings"
    @export="handleExport"
    @import="handleImport"
  />

  <CalendarDialog
    ref="calendarDialog"
    :initial-date="initialDate"
    :record-counts="recordCounts"
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
  margin-bottom: var(--space-3);
  padding-right: var(--control-min-size);
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
}

.content {
  display: grid;
  gap: var(--space-3);
}

.log-entry-form-anchor {
  scroll-margin-top: var(--space-2);
}

.new-log-entry-button {
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
