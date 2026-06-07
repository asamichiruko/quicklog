<script setup lang="ts">
import CalendarDialog from "@/components/CalendarDialog.vue"
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import { getCurrentSession } from "@/lib/auth"
import { downloadTextFile, readQuicklogImportFile } from "@/lib/browserFile"
import { createQuicklogExportFile } from "@/lib/createQuicklogExportFile"
import { getDateGroupId, getLocalDateKey } from "@/lib/date"
import { SchemaValidationError, SizeError } from "@/lib/errors"
import { recordLogEntryDeletion } from "@/lib/logEntryDeletionRepository"
import { upsertCloudLogEntry } from "@/lib/logEntryRepository"
import { isValidLogEntryText } from "@/lib/logEntrySchema"
import {
  mergeQuicklogData,
  pruneExpiredLogEntryDeletions,
  pruneQuicklogDataLogEntryDeletions,
} from "@/lib/quicklogDataMerge"
import { parseAsQuicklogData } from "@/lib/quicklogDataMigration"
import { syncQuicklogDataWithCloud, type CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import {
  loadQuicklogData,
  loadSettings,
  loadStoredDataScope,
  saveQuicklogData,
  saveSettings,
  saveStoredDataScope,
} from "@/lib/storage"
import { migrateStorageLayout } from "@/lib/storageLayoutMigration"
import { supabase } from "@/lib/supabase"
import type {
  AppSettings,
  ExportType,
  LogEntry,
  LogEntryDeletion,
  QuicklogData,
  RuntimeSessionState,
} from "@/types"
import { type Session, type User } from "@supabase/supabase-js"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"

const session = ref<Session | null>(null)

let unsubscribeAuth: (() => void) | undefined

const logEntries = ref<LogEntry[]>([])
const logEntryDeletions = ref<LogEntryDeletion[]>([])
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const runtimeSessionState = ref<RuntimeSessionState>({
  scope: { type: "anonymous" },
  syncStatus: "disabled",
})
const syncStatusMessage = computed(() => {
  if (isAuthenticated.value) return "クラウド同期中"
  if (isSessionLost.value) return "同期停止中"
  return ""
})
const isAuthenticated = computed(() => runtimeSessionState.value.syncStatus === "authenticated")
const isSessionLost = computed(() => runtimeSessionState.value.syncStatus === "sessionLost")

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
  migrateStorageLayout()

  const storedDataScope = loadStoredDataScope()
  session.value = await getCurrentSession()

  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    session.value = nextSession
    if (nextSession) {
      switchToUser(nextSession.user.id, "authenticated")
      return
    }

    const nextStoredDataScope = loadStoredDataScope()
    if (nextStoredDataScope.type === "anonymous") {
      switchToAnonymous()
    } else {
      switchToUser(nextStoredDataScope.userId, "sessionLost")
    }
  })
  unsubscribeAuth = () => {
    data.subscription.unsubscribe()
  }

  if (session.value) {
    switchToUser(session.value.user.id, "authenticated")
  } else if (storedDataScope.type === "user") {
    switchToUser(storedDataScope.userId, "sessionLost")
  } else {
    switchToAnonymous()
  }

  const quicklogData = loadActiveQuicklogData()
  const prunedQuicklogData = pruneQuicklogDataLogEntryDeletions(quicklogData, new Date())
  logEntries.value = prunedQuicklogData.logEntries
  logEntryDeletions.value = prunedQuicklogData.logEntryDeletions
  saveActiveQuicklogData(prunedQuicklogData)

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

function loadActiveQuicklogData(): QuicklogData {
  return loadQuicklogData(getActiveDataUserId())
}

function saveActiveQuicklogData(data: QuicklogData) {
  saveQuicklogData(data, getActiveDataUserId())
}

function getActiveCloudUser(): User | null {
  if (
    session.value &&
    runtimeSessionState.value.syncStatus === "authenticated" &&
    runtimeSessionState.value.scope.userId === session.value.user.id
  ) {
    return session.value.user
  } else {
    return null
  }
}

function getActiveDataUserId(): string | undefined {
  if (runtimeSessionState.value.scope.type === "anonymous") return undefined

  return runtimeSessionState.value.scope.userId
}

function setDisplayedQuicklogData(quicklogData: QuicklogData) {
  logEntries.value = quicklogData.logEntries
  logEntryDeletions.value = quicklogData.logEntryDeletions
}

function loadDisplayedQuicklogData() {
  setDisplayedQuicklogData(loadActiveQuicklogData())
}

function switchToAnonymous() {
  runtimeSessionState.value = { scope: { type: "anonymous" }, syncStatus: "disabled" }
  saveStoredDataScope({ type: "anonymous" })
  loadDisplayedQuicklogData()
}

function switchToUser(userId: string, syncStatus: "authenticated" | "sessionLost") {
  runtimeSessionState.value = { scope: { type: "user", userId }, syncStatus }
  saveStoredDataScope({ type: "user", userId })
  loadDisplayedQuicklogData()
}

async function handleSubmit(text: string) {
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
    const nextQuicklogData = {
      version: 3,
      logEntries: nextEntries,
      logEntryDeletions: logEntryDeletions.value,
    } satisfies QuicklogData

    saveActiveQuicklogData(nextQuicklogData)

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

  const user = getActiveCloudUser()
  if (user) {
    try {
      await upsertCloudLogEntry(logEntry, user)
    } catch (error) {
      console.warn("Failed to save log entry to Supabase", error)
    }
  }
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

async function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  const logEntryDeletion: LogEntryDeletion = {
    createdAt: new Date().toISOString(),
    logEntryId: id,
  }

  try {
    const nextLogEntries = logEntries.value.filter((logEntry) => logEntry.id !== id)
    const nextLogEntryDeletions = [...logEntryDeletions.value, logEntryDeletion]
    const nextQuicklogData = {
      version: 3,
      logEntries: nextLogEntries,
      logEntryDeletions: nextLogEntryDeletions,
    } satisfies QuicklogData

    saveActiveQuicklogData(nextQuicklogData)

    logEntries.value = nextLogEntries
    logEntryDeletions.value = nextLogEntryDeletions
  } catch (error) {
    if (error instanceof SizeError) {
      alert("削除に失敗しました。削除履歴が多すぎます")
    } else {
      alert("削除に失敗しました")
    }
    return
  }

  const user = getActiveCloudUser()
  if (user) {
    try {
      await recordLogEntryDeletion(logEntryDeletion, user)
    } catch (error) {
      console.warn("Failed to delete log entry from Supabase", error)
    }
  }
}

function handleExport(exportType: ExportType) {
  try {
    const exportFile = createQuicklogExportFile(
      {
        version: 3,
        logEntries: logEntries.value,
        logEntryDeletions: logEntryDeletions.value,
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
    const incoming = pruneQuicklogDataLogEntryDeletions(parseAsQuicklogData(data), now)
    const result = mergeQuicklogData(
      {
        version: 3,
        logEntries: logEntries.value,
        logEntryDeletions: pruneExpiredLogEntryDeletions(logEntryDeletions.value, now),
      },
      incoming,
    )

    saveActiveQuicklogData(result.data)

    logEntries.value = result.data.logEntries
    logEntryDeletions.value = result.data.logEntryDeletions

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

async function handleCloudSync(): Promise<CloudQuicklogDataSyncResult> {
  const user = getActiveCloudUser()
  if (!user) {
    throw new Error("User is not signed in.")
  }

  const localData = {
    version: 3,
    logEntries: logEntries.value,
    logEntryDeletions: logEntryDeletions.value,
  } satisfies QuicklogData

  const result = await syncQuicklogDataWithCloud(localData, user)

  saveActiveQuicklogData(result.data)
  logEntries.value = result.data.logEntries
  logEntryDeletions.value = result.data.logEntryDeletions

  return result
}

function handleSelectDate(selectedDate: Date) {
  const target = document.getElementById(getDateGroupId(selectedDate))
  target?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function handleSaveSettings(nextSettings: AppSettings) {
  settings.value = nextSettings
  saveSettings(nextSettings)
}

async function handleSignIn() {
  session.value = await getCurrentSession()
  if (!session.value) return

  switchToUser(session.value.user.id, "authenticated")
}

function handleSignOut() {
  switchToAnonymous()
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1 class="title">quicklog</h1>
    </header>

    <div class="content">
      <p v-if="isSessionLost" class="session-lost-warn">
        クラウド同期が停止しています。メモはこの端末に保存されています
      </p>
      <div ref="logEntryFormArea" class="log-entry-form-anchor">
        <LogEntryForm ref="logEntryForm" @submit="handleSubmit" />
      </div>
      <div class="app-actions">
        <p class="sync-status" :class="{ 'session-lost': isSessionLost }" v-if="syncStatusMessage">
          {{ syncStatusMessage }}
        </p>
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
    @sign-in="handleSignIn"
    @sign-out="handleSignOut"
    :sync-log-entries="handleCloudSync"
    :runtime-session-state="runtimeSessionState"
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
  display: flex;
  align-items: center;
}

.sync-status {
  padding: 0;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.sync-status.session-lost {
  color: var(--color-error);
}

.content {
  display: grid;
  gap: var(--space-3);
}

.session-lost-warn {
  padding: 0;
  margin: 0;
  color: var(--color-error);
  font-size: var(--font-size-small);
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
