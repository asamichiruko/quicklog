<script setup lang="ts">
import LogEntryCopyPanel from "@/components/LogEntryCopyPanel.vue"
import LogEntryImportPanel from "@/components/LogEntryImportPanel.vue"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, ExportType, LogEntry } from "@/types"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })

const copyPanel = ref<InstanceType<typeof LogEntryCopyPanel> | null>(null)
const copyPanelDetails = ref<HTMLDetailsElement | null>(null)
const importPanel = ref<InstanceType<typeof LogEntryImportPanel> | null>(null)
const importPanelDetails = ref<HTMLDetailsElement | null>(null)

const exportType = ref<ExportType>("json")

const props = defineProps<{
  logEntries: LogEntry[]
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
  export: [exportType: ExportType]
  import: [file: File]
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

  importPanel.value?.reset()
  if (importPanelDetails.value) importPanelDetails.value.open = false

  copyPanel.value?.reset()
  if (copyPanelDetails.value) copyPanelDetails.value.open = false

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

function exportData() {
  emit("export", exportType.value)
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
      <details class="settings-panel" aria-labelledby="settings-panel-copy" ref="copyPanelDetails">
        <summary class="settings-panel-summary" id="settings-panel-copy">記録のコピー</summary>
        <div class="settings-panel-body">
          <LogEntryCopyPanel :log-entries="props.logEntries" ref="copyPanel" />
        </div>
      </details>
      <details class="settings-panel" aria-labelledby="settings-panel-export">
        <summary class="settings-panel-summary" id="settings-panel-export">
          記録のエクスポート
        </summary>
        <div class="settings-panel-body">
          <fieldset class="export-type-selector">
            <legend class="export-type-selector-legend">ファイル形式</legend>
            <label class="export-type-option">
              <input
                type="radio"
                name="export-type"
                value="json"
                class="export-type-radio"
                v-model="exportType"
              />
              <span class="export-type-label">JSON</span>
            </label>
            <label class="export-type-option">
              <input
                type="radio"
                name="export-type"
                value="markdown"
                class="export-type-radio"
                v-model="exportType"
              />
              <span class="export-type-label">Markdown</span>
            </label>
          </fieldset>
          <button class="button-secondary export-button" type="button" @click="exportData">
            ファイルをダウンロード
          </button>
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
  font-size: 1.3em;
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
  font-size: 1em;
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

.export-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  border: none;
  margin: 0;
  padding: 0;
}

.export-type-selector-legend {
  width: 100%;
  margin: var(--space-1) 0;
  font-weight: var(--font-weight-bold);
}

.export-type-option {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: var(--control-min-size);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
}

.export-type-option:has(.export-type-radio:checked) {
  border-color: var(--color-primary);
}

.export-type-option:has(.export-type-radio:focus-visible) {
  outline: 2px solid var(--color-primary);
}

.export-type-radio {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--color-primary);
}

.export-type-label {
  font-size: var(--font-size-medium);
}

.export-button {
  width: fit-content;
}

.confirm-actions {
  margin-top: var(--space-2);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
