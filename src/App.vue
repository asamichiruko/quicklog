<script setup lang="ts">
import CalendarDialog from "@/components/CalendarDialog.vue"
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsButton from "@/components/SettingsButton.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import {
  clearLocalAuthSession,
  deleteCurrentAccount,
  getCurrentSession,
  signInWithEmail,
  signOut,
  signUpWithEmail,
} from "@/lib/auth"
import { downloadTextFile, readQuicklogImportFile } from "@/lib/browserFile"
import { deleteCloudSyncData } from "@/lib/cloudSyncDeletion"
import { createCloudSyncQueue } from "@/lib/cloudSyncQueue"
import { createCloudSyncScheduler } from "@/lib/cloudSyncScheduler"
import { startCloudSync } from "@/lib/cloudSyncStart"
import { createQuicklogExportFile } from "@/lib/createQuicklogExportFile"
import { getDateGroupId, getLocalDateKey } from "@/lib/date"
import { CloudSyncDeletionError, SchemaValidationError, SizeError } from "@/lib/errors"
import { isValidLogEntryText } from "@/lib/logEntrySchema"
import {
  appendLogEntry,
  createLogEntry,
  createLogEntryDeletion,
  removeLogEntry,
} from "@/lib/quicklogDataEditing"
import {
  mergeImportedQuicklogData,
  pruneQuicklogDataLogEntryDeletions,
} from "@/lib/quicklogDataMerge"
import { parseAsQuicklogData } from "@/lib/quicklogDataMigration"
import { moveAnonymousQuicklogDataToUser } from "@/lib/quicklogDataScopeMigration"
import { syncQuicklogDataWithCloud, type CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import {
  canUseCloud,
  getDataUserId,
  isAnonymous,
  isAuthPending,
  isSessionLost,
  syncStatusMessage,
} from "@/lib/runtimeSessionState"
import { resolveSessionTransition, type SessionTransitionEvent } from "@/lib/sessionTransition"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import {
  clearQuicklogData,
  loadQuicklogData,
  loadSettings,
  loadStoredDataScope,
  saveQuicklogData,
  saveSettings,
  saveStoredDataScope,
} from "@/lib/storage"
import { migrateStorageLayout } from "@/lib/storageLayoutMigration"
import { supabase } from "@/lib/supabase"
import type { AnonymousDataState, AppSettings, DataScope, ExportType, LogEntry, QuicklogData, RuntimeSessionState } from "@/types"
import { type Session, type User } from "@supabase/supabase-js"
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue"

const session = ref<Session | null>(null)

let unsubscribeAuth: (() => void) | undefined
const deletedCloudUserIds = new Set<string>()
let quicklogDataRevision = 0
let dataScopeRevision = 0

const quicklogData = ref<QuicklogData>({
  version: 3,
  logEntries: [],
  logEntryDeletions: [],
})
const logEntries = computed<LogEntry[]>(() => quicklogData.value.logEntries)
const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const runtimeSessionState = ref<RuntimeSessionState>({
  scope: { type: "anonymous" },
  syncStatus: "disabled",
})

const showNewLogEntryButton = ref(false)
const newLogEntryButtonShowScrollY = 320
const newLogEntryButtonHideScrollY = 120

const authPendingTimeoutMs = 10_000
let authPendingTimeoutId: ReturnType<typeof window.setTimeout> | undefined

const initialDate = ref<Date>(new Date())
const logEntryCountsByDate = computed(() => {
  const counts = new Map<string, number>()

  logEntries.value.forEach((logEntry) => {
    const key = getLocalDateKey(new Date(logEntry.createdAt))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })

  return counts
})

const anonymousQuicklogDataState = ref<AnonymousDataState>({
  logEntryCount: 0,
  logEntryDeletionCount: 0,
})

const cloudSyncQueue = createCloudSyncQueue({
  getContext() {
    return {
      user: getActiveCloudUser(),
      data: quicklogData.value,
      dataRevision: quicklogDataRevision,
      scopeRevision: dataScopeRevision,
    }
  },
  sync: syncQuicklogDataWithCloud,
  applyResult: (result, context) => {
    const currentUser = getActiveCloudUser()

    if (!currentUser || !context.user || currentUser.id !== context.user.id) return
    if (context.dataRevision !== quicklogDataRevision) {
      cloudSyncScheduler.scheduleAfterLocalChange()
      return
    }
    if (context.scopeRevision !== dataScopeRevision) return

    saveActiveQuicklogData(result.data)
    setActiveQuicklogData(result.data)
  },
  onError(error) {
    console.warn("Failed to sync quicklog data", error)
  },
})

const cloudSyncScheduler = createCloudSyncScheduler({
  canSync: () => Boolean(getActiveCloudUser()),
  requestSync: () => cloudSyncQueue.request(),
  autoSyncDelayMs: 1_000,
})

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null)
const calendarDialog = ref<InstanceType<typeof CalendarDialog> | null>(null)
const logEntryForm = ref<InstanceType<typeof LogEntryForm> | null>(null)
const logEntryFormArea = ref<HTMLElement | null>(null)

onMounted(() => {
  migrateStorageLayout()

  applySessionTransition({ type: "startAuthCheck" }, null)
  pruneActiveQuicklogData()
  settings.value = loadSettings()

  updateNewLogEntryButtonVisibility()
  window.addEventListener("scroll", updateNewLogEntryButtonVisibility, { passive: true })
  document.addEventListener("visibilitychange", handleVisibilityChange)
  window.addEventListener("online", handleOnline)

  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) =>
    applyResolvedSession(nextSession),
  )
  unsubscribeAuth = () => {
    data.subscription.unsubscribe()
  }

  void reloadAuthState()
})

onUnmounted(() => {
  unsubscribeAuth?.()
  clearAuthPendingTimeout()
  cloudSyncScheduler.cancelScheduled()
  window.removeEventListener("scroll", updateNewLogEntryButtonVisibility)
  document.removeEventListener("visibilitychange", handleVisibilityChange)
  window.removeEventListener("online", handleOnline)
})

function openSettings() {
  refreshAnonymousQuicklogDataState()
  settingsDialog.value?.open()
}

function isSameDataScope(a: DataScope, b: DataScope): boolean {
  if (a.type !== b.type) return false
  if (a.type === "anonymous" || b.type === "anonymous") return true
  return a.userId === b.userId
}

function applySessionTransition(event: SessionTransitionEvent, nextSession: Session | null) {
  const previousScope = runtimeSessionState.value.scope
  const nextState = resolveSessionTransition({
    event,
    storedDataScope: loadStoredDataScope(),
    ignoredUserIds: deletedCloudUserIds,
  })

  session.value = nextSession
  runtimeSessionState.value = nextState
  if (!isSameDataScope(previousScope, nextState.scope)) dataScopeRevision += 1

  saveStoredDataScope(nextState.scope)
  setActiveQuicklogData(loadActiveQuicklogData())

  applySessionSideEffects(nextState)
}

function applySessionSideEffects(nextState: RuntimeSessionState) {
  clearAuthPendingTimeout()

  if (isAuthPending(nextState)) {
    scheduleAuthPendingTimeout()
    return
  }

  if (isAnonymous(nextState) || isSessionLost(nextState)) {
    cloudSyncScheduler.cancelScheduled()
    return
  }

  cloudSyncScheduler.requestIfDue()
}

function refreshAnonymousQuicklogDataState() {
  const data = loadQuicklogData()
  anonymousQuicklogDataState.value = {
    logEntryCount: data.logEntries.length,
    logEntryDeletionCount: data.logEntryDeletions.length,
  }
}

function deleteAnonymousQuicklogData() {
  clearQuicklogData()
  if (isAnonymous(runtimeSessionState.value)) {
    setActiveQuicklogData({
      version: 3,
      logEntries: [],
      logEntryDeletions: [],
    } satisfies QuicklogData)
  }
  refreshAnonymousQuicklogDataState()
}

function loadActiveQuicklogData(): QuicklogData {
  return loadQuicklogData(getDataUserId(runtimeSessionState.value))
}

function saveActiveQuicklogData(data: QuicklogData) {
  saveQuicklogData(data, getDataUserId(runtimeSessionState.value))
}

function applyLocalQuicklogDataChange(nextData: QuicklogData) {
  saveActiveQuicklogData(nextData)
  setActiveQuicklogData(nextData)
  cloudSyncScheduler.scheduleAfterLocalChange()
}

function getActiveCloudUser(): User | null {
  if (session.value && canUseCloud(runtimeSessionState.value, session.value.user.id)) {
    return session.value.user
  } else {
    return null
  }
}

function applyResolvedSession(nextSession: Session | null) {
  const sessionUserId = nextSession?.user.id ?? null
  const acceptedSession = sessionUserId && deletedCloudUserIds.has(sessionUserId) ? null : nextSession

  applySessionTransition({ type: "authResolved", sessionUserId }, acceptedSession)
}

function pruneActiveQuicklogData() {
  const pruned = pruneQuicklogDataLogEntryDeletions(loadActiveQuicklogData(), new Date())
  setActiveQuicklogData(pruned)
  saveActiveQuicklogData(pruned)
}

async function reloadAuthState() {
  try {
    applyResolvedSession(await getCurrentSession())
  } catch (error) {
    console.warn("Failed to reload auth state", error)
    applySessionTransition({ type: "authReloadFailed" }, null)
  }
}

function scheduleAuthPendingTimeout() {
  clearAuthPendingTimeout()
  if (!isAuthPending(runtimeSessionState.value)) return

  authPendingTimeoutId = window.setTimeout(() => {
    if (!isAuthPending(runtimeSessionState.value)) return

    applySessionTransition({ type: "authCheckTimedOut" }, null)
  }, authPendingTimeoutMs)
}

function clearAuthPendingTimeout() {
  if (authPendingTimeoutId === undefined) return

  window.clearTimeout(authPendingTimeoutId)
  authPendingTimeoutId = undefined
}

function activateAnonymousScope() {
  applySessionTransition({ type: "signedOut" }, null)
}

function setActiveQuicklogData(nextData: QuicklogData) {
  quicklogData.value = nextData
  quicklogDataRevision += 1
}

function updateNewLogEntryButtonVisibility() {
  const scrollY = window.scrollY

  if (showNewLogEntryButton.value) {
    showNewLogEntryButton.value = scrollY > newLogEntryButtonHideScrollY
    return
  }

  showNewLogEntryButton.value = scrollY > newLogEntryButtonShowScrollY
}

function moveToLogEntryForm() {
  logEntryFormArea.value?.scrollIntoView({ behavior: "smooth", block: "start" })
  logEntryForm.value?.focus({ preventScroll: true }) // focus の副作用によるスクロールを抑える
}

function moveAnonymousDataToUser(user: User) {
  const result = moveAnonymousQuicklogDataToUser(user.id, new Date())
  setActiveQuicklogData(result.data)

  if (result.moved) {
    cloudSyncScheduler.scheduleAfterLocalChange()
  }
}

async function rollbackCloudSyncStart() {
  await signOut()
  activateAnonymousScope()
}

async function deleteCloudSync() {
  const user = getActiveCloudUser()
  if (!user) {
    throw new CloudSyncDeletionError("サインイン状態を確認できませんでした")
  }
  const userId = user.id

  await deleteCloudSyncData({
    loadAnonymousData: () => loadQuicklogData(),
    loadUserData: () => loadQuicklogData(userId),
    saveAnonymousData: (data) => saveQuicklogData(data),
    clearUserData: () => clearQuicklogData(userId),
    deleteCurrentAccount,
    clearLocalAuthSession,
    onLocalAuthSessionClearError: (error) => {
      console.warn("Failed to clear local auth session after account deletion", error)
    },
  })

  deletedCloudUserIds.add(userId)
  applySessionTransition({ type: "accountDeleted", userId }, null)
  refreshAnonymousQuicklogDataState()
}

function handleVisibilityChange() {
  if (document.visibilityState !== "visible") return
  cloudSyncScheduler.requestIfDue()
}

function handleOnline() {
  cloudSyncScheduler.requestIfDue()
}

async function handleSubmit(text: string) {
  if (!isValidLogEntryText(text)) {
    alert("メモの記録に失敗しました。メモ内容が長すぎます")
    return
  }

  const logEntry = createLogEntry(text, new Date(), crypto.randomUUID())

  try {
    applyLocalQuicklogDataChange(appendLogEntry(quicklogData.value, logEntry))
    logEntryForm.value?.clear()
  } catch (error) {
    if (error instanceof SizeError) {
      alert("メモの記録に失敗しました。記録が多すぎます")
    } else {
      alert("メモの記録に失敗しました")
    }
  }
}

async function handleOpenCalendar(date: Date) {
  initialDate.value = date
  await nextTick() // 確実に currentDate が更新されるように待つ
  calendarDialog.value?.open()
}

async function handleRemove(id: string) {
  const ok = confirm("メモを削除しますか？")
  if (!ok) return

  const logEntryDeletion = createLogEntryDeletion(id, new Date())

  try {
    applyLocalQuicklogDataChange(removeLogEntry(quicklogData.value, logEntryDeletion))
  } catch (error) {
    if (error instanceof SizeError) {
      alert("削除に失敗しました。削除履歴が多すぎます")
    } else {
      alert("削除に失敗しました")
    }
  }
}

function handleExport(exportType: ExportType) {
  try {
    const exportFile = createQuicklogExportFile(quicklogData.value, exportType)
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
    const data = await readQuicklogImportFile(file)
    const result = mergeImportedQuicklogData(
      quicklogData.value,
      parseAsQuicklogData(data),
      new Date(),
    )

    applyLocalQuicklogDataChange(result.data)

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
  const result = await cloudSyncScheduler.requestNow()
  if (!result) throw new Error("Cloud sync is not available.")
  return result
}

function requestCloudSyncNowSilently() {
  void cloudSyncScheduler.requestNow().catch((error) => {
    console.warn("Failed to sync quicklog data", error)
  })
}

function handleSelectDate(selectedDate: Date) {
  const target = document.getElementById(getDateGroupId(selectedDate))
  target?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function handleSaveSettings(nextSettings: AppSettings) {
  settings.value = nextSettings
  saveSettings(nextSettings)
}

async function startCloudSyncWithEmail(authenticate: () => Promise<void>) {
  await startCloudSync({
    authenticate,
    reloadAuthState,
    getActiveUser: getActiveCloudUser,
    moveAnonymousDataToUser,
    rollback: rollbackCloudSyncStart,
  })

  requestCloudSyncNowSilently()
}

async function handleSignUpWithEmail(email: string, password: string) {
  await startCloudSyncWithEmail(() => signUpWithEmail(email, password))
}

async function handleSignInWithEmail(email: string, password: string) {
  await startCloudSyncWithEmail(() => signInWithEmail(email, password))
}

async function handleSignOut() {
  await signOut()
  activateAnonymousScope()
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1 class="title">
        quicklog
      </h1>
    </header>

    <div class="content">
      <p
        v-if="isSessionLost(runtimeSessionState)"
        class="session-lost-warn"
      >
        クラウド同期が停止しています。メモはこの端末に保存されています
      </p>
      <div
        ref="logEntryFormArea"
        class="log-entry-form-anchor"
      >
        <LogEntryForm
          ref="logEntryForm"
          @submit="handleSubmit"
        />
      </div>
      <div class="app-actions">
        <p
          v-if="syncStatusMessage(runtimeSessionState)"
          class="sync-status"
          :class="{ 'session-lost': isSessionLost(runtimeSessionState) }"
        >
          {{ syncStatusMessage(runtimeSessionState) }}
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
    :sync-log-entries="handleCloudSync"
    :sign-in-with-email="handleSignInWithEmail"
    :sign-up-with-email="handleSignUpWithEmail"
    :sign-out="handleSignOut"
    :runtime-session-state="runtimeSessionState"
    :anonymous-data-state="anonymousQuicklogDataState"
    :delete-anonymous-data="deleteAnonymousQuicklogData"
    :delete-cloud-sync="deleteCloudSync"
    @save="handleSaveSettings"
    @export="handleExport"
    @import="handleImport"
  />

  <CalendarDialog
    ref="calendarDialog"
    :initial-date="initialDate"
    :log-entry-counts-by-date="logEntryCountsByDate"
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
