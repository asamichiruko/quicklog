<script setup lang="ts">
import CalendarDialog from "@/components/CalendarDialog.vue"
import LogEntryForm from "@/components/LogEntryForm.vue"
import LogEntryList from "@/components/LogEntryList.vue"
import SettingsDialog from "@/components/SettingsDialog.vue"
import {
  changePassword,
  clearLocalAuthSession,
  deleteCurrentAccount,
  getCurrentSession,
  resendSignUpCode,
  sendPasswordResetCode,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  updatePasswordAfterRecovery,
  verifyPasswordResetCode,
  verifySignUpCode,
} from "@/lib/auth"
import { downloadTextFile, readQuicklogImportFile } from "@/lib/browserFile"
import { deleteCloudSyncData } from "@/lib/cloudSyncAccountDeletion"
import { createCloudSyncQueue } from "@/lib/cloudSyncQueue"
import { createCloudSyncScheduler } from "@/lib/cloudSyncScheduler"
import { activateCloudSync } from "@/lib/cloudSyncActivation"
import { createQuicklogExportFile } from "@/lib/createQuicklogExportFile"
import { getDateGroupId, getLocalDateKey } from "@/lib/date"
import { CloudSyncDeletionError, SizeError } from "@/errors"
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
import { moveAnonymousQuicklogDataToUser } from "@/lib/anonymousDataMigration"
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
import type {
  AnonymousDataState,
  AppSettings,
  DataScope,
  ExportType,
  QuicklogDataImportResult,
  LogEntry,
  QuicklogData,
  RuntimeSessionState,
} from "@/types"
import { type Session, type User } from "@supabase/supabase-js"
import { computed, nextTick, onMounted, onUnmounted, ref, toRaw } from "vue"
import type { CloudSyncAccountActions } from "@/components/CloudSyncAccountPanel.vue"

const session = ref<Session | null>(null)

let unsubscribeAuth: (() => void) | undefined
const deletedCloudUserIds = new Set<string>()
let passwordRecoveryInProgress = false
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

const cloudSyncAccountActions = {
  syncLogEntries: handleCloudSync,
  signInWithEmail: handleSignInWithEmail,
  signUpWithEmail: handleSignUpWithEmail,
  signOut: handleSignOut,
  deleteCloudSync,
  sendPasswordResetCode: handleSendPasswordResetCode,
  verifyPasswordResetCode: handleVerifyPasswordResetCode,
  updatePasswordAfterRecovery: handleUpdatePasswordAfterRecovery,
  changePassword: handleChangePassword,
  verifySignUpCode: handleVerifySignUpCode,
  resendSignUpCode: handleResendSignUpCode,
  cancelPasswordRecovery: handleCancelPasswordRecovery,
} satisfies CloudSyncAccountActions

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

  const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
    if (passwordRecoveryInProgress) return

    applyResolvedSession(nextSession)
  })
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
  const acceptedSession =
    sessionUserId && deletedCloudUserIds.has(sessionUserId) ? null : nextSession

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
  // 削除フローを開始できるかの事前チェック
  const user = getActiveCloudUser()
  if (!user) {
    throw new CloudSyncDeletionError("サインイン状態を確認できませんでした")
  }

  await syncCloudDataBeforeDeletion(user)
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

async function syncCloudDataBeforeDeletion(user: User) {
  const scopeRevisionBeforeSync = dataScopeRevision

  let result: CloudQuicklogDataSyncResult | null
  try {
    result = await cloudSyncScheduler.requestNow()
  } catch (error) {
    console.warn("Failed to sync quicklog data before account deletion", error)
    throw new CloudSyncDeletionError("クラウド同期に失敗しました")
  }

  const currentUser = getActiveCloudUser()
  if (!result || !currentUser || currentUser.id !== user.id) {
    throw new CloudSyncDeletionError("サインイン状態を確認できませんでした")
  }

  if (scopeRevisionBeforeSync !== dataScopeRevision || toRaw(quicklogData.value) !== result.data) {
    throw new CloudSyncDeletionError("クラウド同期に失敗しました")
  }
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

function downloadLogEntries(exportType: ExportType) {
  const exportFile = createQuicklogExportFile(quicklogData.value, exportType)
  const dateKey = getLocalDateKey(new Date())

  downloadTextFile({
    content: exportFile.content,
    mimeType: exportFile.mimeType,
    filename: `quicklog-${dateKey}${exportFile.extension}`,
  })
}

async function importQuicklogDataFromFile(file: File): Promise<QuicklogDataImportResult> {
  const data = await readQuicklogImportFile(file)
  const result = mergeImportedQuicklogData(
    quicklogData.value,
    parseAsQuicklogData(data),
    new Date(),
  )

  applyLocalQuicklogDataChange(result.data)
  return {
    addedCount: result.addedCount,
    deletedCount: result.deletedCount,
  } satisfies QuicklogDataImportResult
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

async function activateCloudSyncAfterAuth(authenticate: () => Promise<void>) {
  await activateCloudSync({
    authenticate,
    reloadAuthState,
    getActiveUser: getActiveCloudUser,
    moveAnonymousDataToUser,
    rollback: rollbackCloudSyncStart,
  })

  requestCloudSyncNowSilently()
}

async function handleSignUpWithEmail(email: string, password: string) {
  await signUpWithEmail(email, password)
}

async function handleVerifySignUpCode(email: string, code: string) {
  await activateCloudSyncAfterAuth(() => verifySignUpCode(email, code))
}

async function handleResendSignUpCode(email: string) {
  await resendSignUpCode(email)
}

async function handleSignInWithEmail(email: string, password: string) {
  await activateCloudSyncAfterAuth(() => signInWithEmail(email, password))
}

async function handleSignOut() {
  await signOut()
  activateAnonymousScope()
}

async function handleChangePassword(newPassword: string, currentPassword: string) {
  await changePassword(newPassword, currentPassword)
}

async function handleSendPasswordResetCode(email: string) {
  await sendPasswordResetCode(email)
}

async function handleVerifyPasswordResetCode(email: string, code: string) {
  passwordRecoveryInProgress = true
  try {
    await verifyPasswordResetCode(email, code)
  } catch (error) {
    passwordRecoveryInProgress = false
    throw error
  }
}

async function handleUpdatePasswordAfterRecovery(password: string) {
  await updatePasswordAfterRecovery(password)
  try {
    await clearLocalAuthSession()
  } catch (error) {
    console.warn("Failed to clear local auth session after password recovery", error)
  }
  passwordRecoveryInProgress = false
  activateAnonymousScope()
}

async function handleCancelPasswordRecovery() {
  try {
    await clearLocalAuthSession()
  } catch (error) {
    console.warn("Failed to clear local auth session when password recovery cancelled", error)
  }
  passwordRecoveryInProgress = false
  activateAnonymousScope()
}
</script>

<template>
  <main class="app">
    <header class="header">
      <h1 class="title">quicklog</h1>
      <div class="app-actions">
        <p
          v-if="syncStatusMessage(runtimeSessionState)"
          class="sync-status"
          :class="{ 'session-lost': isSessionLost(runtimeSessionState) }"
        >
          {{ syncStatusMessage(runtimeSessionState) }}
        </p>
        <button
          class="button-icon settings-button"
          type="button"
          aria-label="設定"
          title="設定"
          @click="openSettings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            fill="currentColor"
            class="bi bi-gear"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492M5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0"
            />
            <path
              d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.42 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.42-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115z"
            />
          </svg>
        </button>
      </div>
    </header>

    <div class="content">
      <p v-if="isSessionLost(runtimeSessionState)" class="session-lost-warn">
        クラウド同期が停止しています。メモはこの端末に保存されています
      </p>
      <div ref="logEntryFormArea" class="log-entry-form-anchor">
        <LogEntryForm ref="logEntryForm" @submit="handleSubmit" />
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
    :runtime-session-state="runtimeSessionState"
    :anonymous-data-state="anonymousQuicklogDataState"
    :delete-anonymous-data="deleteAnonymousQuicklogData"
    :cloud-sync-account-actions="cloudSyncAccountActions"
    :download-log-entries="downloadLogEntries"
    :import-quicklog-data-from-file="importQuicklogDataFromFile"
    @save="handleSaveSettings"
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
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-4) var(--space-3);
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-4);
}

.title {
  font-size: 2em;
  font-weight: var(--font-weight-semibold);
  margin: 0;
}

.app-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-width: 0;
  margin-inline-start: auto;
}

.settings-button svg {
  flex: 0 0 auto;
}

.sync-status {
  padding: 0;
  margin: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  text-align: right;
  overflow-wrap: anywhere;
}

.sync-status.session-lost {
  color: var(--color-text-error);
}

.content {
  display: grid;
  gap: var(--space-4);
}

.session-lost-warn {
  padding: 0;
  margin: 0;
  color: var(--color-text-error);
  font-size: var(--font-size-small);
}

.log-entry-form-anchor {
  scroll-margin-top: var(--space-3);
}

.new-log-entry-button {
  position: fixed;
  left: 50%;
  bottom: calc(var(--space-3) + env(safe-area-inset-bottom));
  z-index: 2;
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  transform: translateX(-50%);
}
</style>
