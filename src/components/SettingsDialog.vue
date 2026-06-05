<script setup lang="ts">
import CloudSyncPanel from "@/components/CloudSyncPanel.vue"
import LogEntryCopyPanel from "@/components/LogEntryCopyPanel.vue"
import LogEntryExportPanel from "@/components/LogEntryExportPanel.vue"
import LogEntryImportPanel from "@/components/LogEntryImportPanel.vue"
import type { CloudLogEntrySyncResult } from "@/lib/cloudLogEntrySync"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, ExportType, LogEntry } from "@/types"
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

const props = defineProps<{
  session: Session | null
  logEntries: LogEntry[]
  settings: AppSettings
  syncLogEntries?: () => Promise<CloudLogEntrySyncResult>
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
  export: [exportType: ExportType]
  import: [file: File]
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

  cloudSyncPanel.value?.reset()
  if (cloudSyncPanelDetails.value) cloudSyncPanelDetails.value.open = false

  copyPanel.value?.reset()
  if (copyPanelDetails.value) copyPanelDetails.value.open = false

  exportPanel.value?.reset()
  if (exportPanelDetails.value) exportPanelDetails.value.open = false

  importPanel.value?.reset()
  if (importPanelDetails.value) importPanelDetails.value.open = false

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
    @click="handleDialogClick"
    aria-labelledby="settings-dialog-heading"
  >
    <form class="dialog-form" @submit.prevent="saveAndClose">
      <h2 id="settings-dialog-heading" class="dialog-heading">設定</h2>
      <section class="section">
        <h3 class="section-heading">表示</h3>
        <ul class="setting-items">
          <li>
            <label class="setting-item">
              <input
                class="setting-checkbox"
                type="checkbox"
                name="show-daily-summary"
                v-model="nextSettings.showDailySummary"
              />
              <span class="setting-label">日別サマリーを表示</span>
            </label>
          </li>
        </ul>
      </section>
      <details
        class="settings-panel"
        aria-labelledby="settings-panel-cloud-sync"
        ref="cloudSyncPanelDetails"
      >
        <summary class="settings-panel-summary" id="settings-panel-cloud-sync">
          クラウド同期
        </summary>
        <div class="settings-panel-body">
          <CloudSyncPanel
            :session="props.session"
            :sync-log-entries="props.syncLogEntries"
            ref="cloudSyncPanel"
          />
        </div>
      </details>
      <details class="settings-panel" aria-labelledby="settings-panel-copy" ref="copyPanelDetails">
        <summary class="settings-panel-summary" id="settings-panel-copy">記録のコピー</summary>
        <div class="settings-panel-body">
          <LogEntryCopyPanel :log-entries="props.logEntries" ref="copyPanel" />
        </div>
      </details>
      <details
        class="settings-panel"
        aria-labelledby="settings-panel-export"
        ref="exportPanelDetails"
      >
        <summary class="settings-panel-summary" id="settings-panel-export">
          記録のエクスポート
        </summary>
        <div class="settings-panel-body">
          <LogEntryExportPanel @export="emit('export', $event)" ref="exportPanel" />
        </div>
      </details>
      <details
        class="settings-panel"
        aria-labelledby="settings-panel-import"
        ref="importPanelDetails"
      >
        <summary class="settings-panel-summary" id="settings-panel-import">
          記録のインポート
        </summary>
        <div class="settings-panel-body">
          <LogEntryImportPanel @import="emit('import', $event)" ref="importPanel" />
        </div>
      </details>
      <div class="confirm-actions">
        <button class="button-primary" type="submit" @click="saveAndClose">設定を保存</button>
        <button class="button-secondary" type="button" @click="close">キャンセル</button>
      </div>
    </form>
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

.dialog-form {
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

.setting-items {
  display: grid;
  gap: var(--space-2);
  padding: 0;
  margin: 0;
  list-style: none;
}

.setting-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-min-size);
  cursor: pointer;
}

.setting-label {
  font-size: var(--font-size-medium);
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
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
  padding: 0 var(--space-2) var(--space-2);
}

.settings-panel[open] .settings-panel-body {
  padding-top: var(--space-2);
}

.confirm-actions {
  margin-top: var(--space-2);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
