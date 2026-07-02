<script setup lang="ts">
import CloudSyncPanel, {
  type CloudSyncAccountActions,
} from "@/components/CloudSyncAccountPanel.vue"
import LocalDataManagementPanel from "@/components/LocalDataManagementPanel.vue"
import LogEntryCopyPanel from "@/components/LogEntryCopyPanel.vue"
import LogEntryExportPanel from "@/components/LogEntryExportPanel.vue"
import LogEntryImportPanel from "@/components/LogEntryImportPanel.vue"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type {
  AnonymousDataState,
  AppSettings,
  ExportType,
  QuicklogDataImportResult,
  LogEntry,
  RuntimeSessionState,
} from "@/types"
import type { Session } from "@supabase/supabase-js"
import { computed, ref } from "vue"

const props = defineProps<{
  session: Session | null
  runtimeSessionState: RuntimeSessionState
  logEntries: LogEntry[]
  settings: AppSettings
  anonymousDataState: AnonymousDataState
  deleteAnonymousData: () => void
  cloudSyncAccountActions: CloudSyncAccountActions
  downloadLogEntries: (exportType: ExportType) => void
  importQuicklogDataFromFile: (file: File) => Promise<QuicklogDataImportResult>
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
}>()

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

const cloudSyncPanel = ref<InstanceType<typeof CloudSyncPanel> | null>(null)
const copyPanel = ref<InstanceType<typeof LogEntryCopyPanel> | null>(null)
const importPanel = ref<InstanceType<typeof LogEntryImportPanel> | null>(null)
const exportPanel = ref<InstanceType<typeof LogEntryExportPanel> | null>(null)
const localDataManagementPanel = ref<InstanceType<typeof LocalDataManagementPanel> | null>(null)

type SettingsView = "index" | "display" | "account" | "copy" | "export" | "import" | "localData"
const headingLabels: Record<SettingsView, string> = {
  index: "設定",
  display: "表示",
  account: "アカウントと同期",
  copy: "記録のコピー",
  export: "記録のエクスポート",
  import: "記録のインポート",
  localData: "ローカルデータの管理",
}
const settingsView = ref<SettingsView>("index")
const headingLabel = computed(() => headingLabels[settingsView.value])

const hasDisplaySettingsChanges = computed(
  () => !areSettingsEqual(nextSettings.value, props.settings),
)

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

  copyPanel.value?.reset()
  exportPanel.value?.reset()
  importPanel.value?.reset()
  localDataManagementPanel.value?.reset()
  cloudSyncPanel.value?.prepareForDialogOpen()

  if (cloudSyncPanel.value?.shouldShowActiveFlow) {
    settingsView.value = "account"
  } else {
    settingsView.value = "index"
  }

  dialog.value.showModal()
}

function areSettingsEqual(a: AppSettings, b: AppSettings) {
  return a.showDailySummary === b.showDailySummary
}

function resetDisplaySettings() {
  nextSettings.value = { ...props.settings }
}

function saveDisplaySettings() {
  emit("save", { ...nextSettings.value })
}

function close() {
  dialog.value?.close()
}

const shouldShowBackButton = computed(() => {
  return (
    settingsView.value !== "index" &&
    (cloudSyncPanel.value === null ||
      (cloudSyncPanel.value && !cloudSyncPanel.value.shouldShowActiveFlow))
  )
})

function showDisplayView() {
  settingsView.value = "display"
}

function showAccountView() {
  settingsView.value = "account"
}

function showCopyView() {
  copyPanel.value?.reset()
  settingsView.value = "copy"
}

function showExportView() {
  exportPanel.value?.reset()
  settingsView.value = "export"
}

function showImportView() {
  importPanel.value?.reset()
  settingsView.value = "import"
}

function showLocalDataManagementView() {
  localDataManagementPanel.value?.reset()
  settingsView.value = "localData"
}

function handleBackView() {
  if (settingsView.value === "account") {
    const backed = cloudSyncPanel.value?.handleBack()
    if (backed) return
    settingsView.value = "index"
  } else {
    settingsView.value = "index"
  }
}

function handleDialogClick(event: MouseEvent) {
  if (event.target === dialog.value) {
    close()
  }
}

defineExpose({ open })
</script>

<template>
  <dialog
    ref="dialog"
    class="dialog"
    aria-labelledby="settings-dialog-heading"
    @click="handleDialogClick"
  >
    <div class="container">
      <header class="header">
        <button
          v-if="shouldShowBackButton"
          class="button-icon back-button"
          type="button"
          aria-label="戻る"
          @click="handleBackView"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"
            />
          </svg>
        </button>
        <h2 id="settings-dialog-heading" class="heading">{{ headingLabel }}</h2>
        <button
          class="button-icon close-button"
          type="button"
          aria-label="閉じる"
          title="閉じる"
          @click="close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            fill="currentColor"
            viewBox="0 0 16 16"
            aria-hidden="true"
          >
            <path
              d="M2.146 2.146a.5.5 0 0 1 .708 0L8 7.293l5.146-5.147a.5.5 0 0 1 .708.708L8.707 8l5.147 5.146a.5.5 0 0 1-.708.708L8 8.707l-5.146 5.147a.5.5 0 0 1-.708-.708L7.293 8 2.146 2.854a.5.5 0 0 1 0-.708"
            />
          </svg>
        </button>
      </header>
      <div v-show="settingsView === 'index'" class="index-body">
        <section class="index-section">
          <h3 class="index-heading">表示</h3>
          <button type="button" class="button-menu list-item-button" @click="showDisplayView">
            <span class="list-item-button-label">表示</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
        </section>
        <section class="index-section">
          <h3 class="index-heading">アカウントと同期</h3>
          <button type="button" class="button-menu list-item-button" @click="showAccountView">
            <span class="list-item-button-label">アカウントと同期</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
        </section>
        <section class="index-section">
          <h3 class="index-heading">データの管理</h3>
          <button type="button" class="button-menu list-item-button" @click="showCopyView">
            <span class="list-item-button-label">記録のコピー</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
          <button type="button" class="button-menu list-item-button" @click="showExportView">
            <span class="list-item-button-label">記録のエクスポート</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
          <button type="button" class="button-menu list-item-button" @click="showImportView">
            <span class="list-item-button-label">記録のインポート</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
          <button
            type="button"
            class="button-menu list-item-button"
            @click="showLocalDataManagementView"
          >
            <span class="list-item-button-label">ローカルデータの管理</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path
                d="M4.646 1.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1 0 .708l-6 6a.5.5 0 0 1-.708-.708L10.293 8 4.646 2.354a.5.5 0 0 1 0-.708"
              />
            </svg>
          </button>
        </section>
      </div>

      <div v-show="settingsView === 'display'" class="view-body">
        <div class="display-setting-item">
          <label class="checkbox-label">
            <input
              v-model="nextSettings.showDailySummary"
              class="checkbox"
              type="checkbox"
              name="show-daily-summary"
            />
            <span class="checkbox-label-text">日別サマリーを表示</span>
          </label>
        </div>
        <div class="confirm-actions">
          <button
            class="button-primary"
            type="button"
            :disabled="!hasDisplaySettingsChanges"
            @click="saveDisplaySettings"
          >
            設定を保存
          </button>
          <button
            class="button-secondary"
            type="button"
            :disabled="!hasDisplaySettingsChanges"
            @click="resetDisplaySettings"
          >
            リセット
          </button>
        </div>
      </div>

      <CloudSyncPanel
        v-show="settingsView === 'account'"
        ref="cloudSyncPanel"
        :session="props.session"
        :runtime-session-state="props.runtimeSessionState"
        :actions="props.cloudSyncAccountActions"
      />
      <LogEntryCopyPanel
        v-show="settingsView === 'copy'"
        ref="copyPanel"
        :log-entries="props.logEntries"
      />
      <LogEntryExportPanel
        v-show="settingsView === 'export'"
        ref="exportPanel"
        :download-log-entries="props.downloadLogEntries"
      />
      <LogEntryImportPanel
        v-show="settingsView === 'import'"
        ref="importPanel"
        :import-quicklog-data-from-file="props.importQuicklogDataFromFile"
      />
      <LocalDataManagementPanel
        v-show="settingsView === 'localData'"
        ref="localDataManagementPanel"
        :anonymous-data-state="props.anonymousDataState"
        :delete-anonymous-data="props.deleteAnonymousData"
      />
    </div>
  </dialog>
</template>

<style lang="css" scoped>
.dialog {
  width: min(90vw, 480px);
  max-height: min(80dvh, 720px);
  margin: 8dvh auto auto;
  overflow: auto;

  border: none;
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  padding: 0;
}

.container {
  padding: var(--space-3);
}

.index-body {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-2);
}

.header {
  display: flex;
  align-items: center;
}

.heading {
  margin: 0;
  padding: 0 var(--space-1);
  color: var(--color-text);
  font-size: 1.4em;
  font-weight: var(--font-weight-bold);
}

.close-button {
  margin-inline-start: auto;
}

.view-body {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: var(--control-min-size);
  cursor: pointer;
}

.checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
}

.checkbox-label-text {
  font-size: var(--font-size-medium);
}

.index-heading {
  font-size: 1.2em;
  font-weight: var(--font-weight-bold);
  margin: 0;
  padding: 0;
}

.index-section {
  display: grid;
  gap: var(--space-2);
}

.list-item-button {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-radius: var(--radius-surface);
}

.list-item-button svg {
  margin-inline-start: auto;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}
</style>
