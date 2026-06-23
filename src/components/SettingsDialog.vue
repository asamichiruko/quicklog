<script setup lang="ts">
import CloudSyncPanel from "@/components/CloudSyncAccountPanel.vue"
import LocalDataManagementPanel from "@/components/LocalDataManagementPanel.vue"
import LogEntryCopyPanel from "@/components/LogEntryCopyPanel.vue"
import LogEntryExportPanel from "@/components/LogEntryExportPanel.vue"
import LogEntryImportPanel from "@/components/LogEntryImportPanel.vue"
import type { CloudQuicklogDataSyncResult } from "@/lib/quicklogDataSync"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type {
  AnonymousDataState,
  AppSettings,
  ExportType,
  LogEntry,
  RuntimeSessionState,
} from "@/types"
import type { Session } from "@supabase/supabase-js"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

const cloudSyncPanel = ref<InstanceType<typeof CloudSyncPanel> | null>(null)
const cloudSyncPanelDetails = ref<HTMLDetailsElement | null>(null)
const copyPanel = ref<InstanceType<typeof LogEntryCopyPanel> | null>(null)
const copyPanelDetails = ref<HTMLDetailsElement | null>(null)
const importPanel = ref<InstanceType<typeof LogEntryImportPanel> | null>(null)
const importPanelDetails = ref<HTMLDetailsElement | null>(null)
const exportPanel = ref<InstanceType<typeof LogEntryExportPanel> | null>(null)
const exportPanelDetails = ref<HTMLDetailsElement | null>(null)
const localDataManagementPanel = ref<InstanceType<typeof LocalDataManagementPanel> | null>(null)
const localDataManagementPanelDetails = ref<HTMLDetailsElement | null>(null)

const props = defineProps<{
  session: Session | null
  runtimeSessionState: RuntimeSessionState
  logEntries: LogEntry[]
  settings: AppSettings
  syncLogEntries?: () => Promise<CloudQuicklogDataSyncResult>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  anonymousDataState: AnonymousDataState
  deleteAnonymousData: () => void
  deleteCloudSync: () => Promise<void>
  sendPasswordResetCode: (email: string) => Promise<void>
  verifyPasswordResetCode: (email: string, code: string) => Promise<void>
  updatePasswordAfterRecovery: (password: string) => Promise<void>
  changePassword: (newPassword: string, currentPassword: string) => Promise<void>
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
  export: [exportType: ExportType]
  import: [file: File]
  cancelPasswordRecovery: []
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

  cloudSyncPanel.value?.prepareForDialogOpen()
  if (cloudSyncPanelDetails.value) {
    cloudSyncPanelDetails.value.open = Boolean(cloudSyncPanel.value?.hasActivePasswordResetFlow)
  }

  copyPanel.value?.reset()
  if (copyPanelDetails.value) copyPanelDetails.value.open = false

  exportPanel.value?.reset()
  if (exportPanelDetails.value) exportPanelDetails.value.open = false

  importPanel.value?.reset()
  if (importPanelDetails.value) importPanelDetails.value.open = false

  localDataManagementPanel.value?.reset()
  if (localDataManagementPanelDetails.value) localDataManagementPanelDetails.value.open = false

  dialog.value.showModal()
}

function saveAndClose() {
  emit("save", { ...nextSettings.value })
  close()
}

function close() {
  dialog.value?.close()
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
      <h2 id="settings-dialog-heading" class="dialog-heading">設定</h2>
      <section class="section">
        <h3 class="section-heading">表示</h3>
        <div class="display-setting-body">
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
        </div>
      </section>
      <section class="section">
        <h3 class="section-heading">アカウントと同期</h3>
        <details
          ref="cloudSyncPanelDetails"
          class="settings-panel"
          aria-labelledby="settings-panel-cloud-sync"
        >
          <summary id="settings-panel-cloud-sync" class="settings-panel-summary">
            アカウントと同期
          </summary>
          <div class="settings-panel-body">
            <CloudSyncPanel
              ref="cloudSyncPanel"
              :session="props.session"
              :runtime-session-state="props.runtimeSessionState"
              :sync-log-entries="props.syncLogEntries"
              :sign-in-with-email="props.signInWithEmail"
              :sign-up-with-email="props.signUpWithEmail"
              :sign-out="props.signOut"
              :delete-cloud-sync="props.deleteCloudSync"
              :send-password-reset-code="props.sendPasswordResetCode"
              :verify-password-reset-code="props.verifyPasswordResetCode"
              :update-password-after-recovery="props.updatePasswordAfterRecovery"
              :change-password="props.changePassword"
              @cancel-password-recovery="emit('cancelPasswordRecovery')"
            />
          </div>
        </details>
      </section>
      <section class="section">
        <h3 class="section-heading">データの管理</h3>
        <details
          ref="copyPanelDetails"
          class="settings-panel"
          aria-labelledby="settings-panel-copy"
        >
          <summary id="settings-panel-copy" class="settings-panel-summary">記録のコピー</summary>
          <div class="settings-panel-body">
            <LogEntryCopyPanel ref="copyPanel" :log-entries="props.logEntries" />
          </div>
        </details>
        <details
          ref="exportPanelDetails"
          class="settings-panel"
          aria-labelledby="settings-panel-export"
        >
          <summary id="settings-panel-export" class="settings-panel-summary">
            記録のエクスポート
          </summary>
          <div class="settings-panel-body">
            <LogEntryExportPanel ref="exportPanel" @export="emit('export', $event)" />
          </div>
        </details>
        <details
          ref="importPanelDetails"
          class="settings-panel"
          aria-labelledby="settings-panel-import"
        >
          <summary id="settings-panel-import" class="settings-panel-summary">
            記録のインポート
          </summary>
          <div class="settings-panel-body">
            <LogEntryImportPanel ref="importPanel" @import="emit('import', $event)" />
          </div>
        </details>
        <details
          ref="localDataManagementPanelDetails"
          class="settings-panel"
          aria-labelledby="settings-panel-local-data-management"
        >
          <summary id="settings-panel-local-data-management" class="settings-panel-summary">
            ローカルデータの管理
          </summary>
          <div class="settings-panel-body">
            <LocalDataManagementPanel
              ref="localDataManagementPanel"
              :anonymous-data-state="props.anonymousDataState"
              :delete-anonymous-data="props.deleteAnonymousData"
            />
          </div>
        </details>
      </section>
      <div class="confirm-actions">
        <button class="button-primary" type="button" @click="saveAndClose">設定を保存</button>
        <button class="button-secondary" type="button" @click="close">キャンセル</button>
      </div>
    </div>
  </dialog>
</template>

<style lang="css" scoped>
.dialog {
  width: min(90vw, 480px);
  border: none;
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  padding: 0;
}

.container {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2);
}

.dialog-heading {
  margin: 0;
  padding: 0;
  color: var(--color-text);
  font-size: 1.4em;
  font-weight: var(--font-weight-bold);
}

.section {
  display: grid;
  gap: var(--space-1);
}

.section-heading {
  margin: 0;
  padding: 0;
  color: var(--color-text);
  font-size: 1.2em;
  font-weight: var(--font-weight-bold);
}

.display-setting-body {
  display: grid;
  gap: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

.settings-panel {
  min-width: 0;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
}

.settings-panel-summary {
  min-height: var(--control-min-size);
  padding: 0 var(--space-2);
  align-content: center;
  color: var(--color-text);
  font-size: 1em;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.settings-panel-body {
  display: grid;
  gap: var(--space-2);
  padding: 0 0 var(--space-1);
}

.settings-panel[open] .settings-panel-body {
  padding-top: var(--space-1);
  border-top: 1px solid var(--color-border);
}

.confirm-actions {
  margin-top: var(--space-2);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
