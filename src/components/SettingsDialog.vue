<script setup lang="ts">
import { addDays, getLocalDateKey, parseLocalDateKey } from "@/lib/date"
import { SchemaValidationError, SizeError } from "@/lib/error"
import { formatLogEntriesAsMarkdown } from "@/lib/logEntryExport"
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, ExportType, LogEntry } from "@/types"
import { computed, ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const copyStartDate = ref<string>(getLocalDateKey(new Date()))
const copyEndDate = ref<string>(getLocalDateKey(new Date()))
const copyResultMessage = ref<string>("")
const exportType = ref<ExportType>("json")
const importFile = ref<File | null>(null)

const props = defineProps<{
  logEntries: LogEntry[]
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
  export: [exportType: ExportType]
  import: [file: File]
}>()

const copyRecordsTarget = computed<LogEntry[]>(() => {
  let start
  let endExclusive

  try {
    start = parseLocalDateKey(copyStartDate.value).getTime()
    endExclusive = addDays(parseLocalDateKey(copyEndDate.value), 1).getTime()
  } catch {
    return []
  }

  if (endExclusive <= start) return []

  const targets = props.logEntries.filter((logEntry) => {
    const createdAt = new Date(logEntry.createdAt).getTime()
    return start <= createdAt && createdAt < endExclusive
  })

  return targets
})

const copyRecordsCount = computed(() => {
  return copyRecordsTarget.value.length
})

const copyTextResult = computed<{ text: string; errorMessage: string }>(() => {
  if (copyRecordsCount.value === 0) {
    return { text: "", errorMessage: "" }
  }

  try {
    return {
      text: formatLogEntriesAsMarkdown(copyRecordsTarget.value),
      errorMessage: "",
    }
  } catch (error) {
    if (error instanceof SizeError) {
      return { text: "", errorMessage: "記録のサイズが大きすぎます。" }
    }
    if (error instanceof SchemaValidationError) {
      return { text: "", errorMessage: "データが破損しています。" }
    }
    return { text: "", errorMessage: "コピーテキストの生成に失敗しました。" }
  }
})

const copyText = computed(() => {
  return copyTextResult.value.text
})

const canCopyRecords = computed(() => {
  return copyRecordsCount.value > 0 && copyText.value !== ""
})

const copySummaryText = computed(() => {
  let start
  let endExclusive

  try {
    start = parseLocalDateKey(copyStartDate.value).getTime()
    endExclusive = addDays(parseLocalDateKey(copyEndDate.value), 1).getTime()
  } catch {
    return "有効な日付を指定してください"
  }

  if (endExclusive <= start) return "開始日が終了日より後です"
  if (copyRecordsCount.value === 0) return "指定範囲に記録がありません"
  return `対象: ${copyRecordsCount.value} 件 / Markdown 形式`
})

const copyFeedbackMessage = computed(() => {
  return copyTextResult.value.errorMessage || copyResultMessage.value
})

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }
  resetImportFile()
  resetCopyPanel()

  dialog.value?.showModal()
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

function resetCopyPanel() {
  copyResultMessage.value = ""
  copyStartDate.value = getLocalDateKey(new Date())
  copyEndDate.value = getLocalDateKey(new Date())
}

async function copyRecords() {
  if (!canCopyRecords.value) return

  try {
    await navigator.clipboard.writeText(copyText.value)
    copyResultMessage.value = "クリップボードにコピーしました。"
  } catch {
    copyResultMessage.value =
      "クリップボードにコピーできません。下の内容を手動でコピーしてください。"
  }
}

function exportData() {
  emit("export", exportType.value)
}

function handleImportFileChange(event: Event) {
  const input = event.currentTarget as HTMLInputElement
  const files = input.files

  if (files && files.length > 0) {
    importFile.value = files[0]
  } else {
    importFile.value = null
  }
}

function resetImportFile() {
  importFile.value = null

  if (importFileInput.value) {
    importFileInput.value.value = ""
  }
}

function importData() {
  if (importFile.value) {
    emit("import", importFile.value)
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
      <details class="settings-panel" aria-labelledby="settings-panel-copy">
        <summary class="settings-panel-summary" id="settings-panel-copy">記録のコピー</summary>
        <div class="settings-panel-body">
          <fieldset class="copy-period">
            <legend class="copy-period-legend">期間</legend>

            <label class="copy-date-field">
              <span class="copy-date-label">開始</span>
              <input
                id="copy-start-date"
                class="copy-date-input"
                type="date"
                v-model="copyStartDate"
                required
              />
            </label>

            <label class="copy-date-field">
              <span class="copy-date-label">終了</span>
              <input
                id="copy-end-date"
                class="copy-date-input"
                type="date"
                v-model="copyEndDate"
                required
              />
            </label>
          </fieldset>
          <output class="copy-summary" for="copy-start-date copy-end-date">
            {{ copySummaryText }}
          </output>
          <button
            class="button-secondary copy-button"
            type="button"
            @click="copyRecords"
            :disabled="!canCopyRecords"
          >
            クリップボードにコピー
          </button>
          <p v-if="copyFeedbackMessage" class="copy-result" role="status" aria-live="polite">
            {{ copyFeedbackMessage }}
          </p>
          <details v-if="canCopyRecords" class="copy-preview-panel">
            <summary class="copy-preview-summary">コピー内容</summary>
            <textarea
              class="copy-preview"
              readonly
              :value="copyText"
              aria-label="コピーする Markdown テキスト"
            ></textarea>
          </details>
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
      <details class="settings-panel" aria-labelledby="settings-panel-import">
        <summary class="settings-panel-summary" id="settings-panel-import">
          記録のインポート
        </summary>
        <div class="settings-panel-body">
          <p class="import-description">
            事前にエクスポートした JSON
            ファイルを読み込みます。既存のメモは残り、重複するものは取り込まれません。
          </p>
          <label class="import-file-field">
            <span class="import-file-label">インポートする JSON ファイルを選択</span>
            <span class="import-file-control">
              <span class="import-file-button" aria-hidden="true">ファイルを選択</span>
              <span id="import-file-name" class="import-file-name">
                {{ importFile?.name ?? "選択されていません" }}
              </span>
            </span>
            <input
              ref="importFileInput"
              type="file"
              accept="application/json"
              name="import-file"
              class="import-file"
              @change="handleImportFileChange"
              aria-label="インポートする JSON ファイル"
              aria-describedby="import-file-name"
            />
          </label>
          <button
            class="button-secondary import-button"
            :disabled="!importFile"
            type="button"
            @click="importData"
          >
            ファイルをインポート
          </button>
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

.copy-period {
  display: grid;
  gap: var(--space-2);
  border: none;
  margin: 0;
  padding: 0;
}

.copy-period-legend {
  margin-bottom: var(--space-1);
  font-weight: var(--font-weight-bold);
}

.copy-date-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-2);
}

.copy-date-label {
  font-weight: var(--font-weight-bold);
}

.copy-date-input {
  min-width: 0;
  min-height: var(--control-min-size);
}

.copy-summary {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-surface);
  background: var(--color-page);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.copy-button {
  width: fit-content;
}

.copy-result {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-surface);
  background: var(--color-page);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.copy-preview-summary {
  min-height: var(--control-min-size);
  padding: 0;
  align-content: center;
  color: var(--color-text);
  font-size: 1em;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.copy-preview {
  width: 100%;
  resize: vertical;
  min-height: 120px;
  line-height: 1.5;
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
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

.import-description {
  margin: 0;
  font-size: var(--font-size-small);
}

.import-file-field {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
  cursor: pointer;
}

.import-file-label {
  font-weight: var(--font-weight-bold);
}

.import-file-control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: var(--control-min-size);
  gap: var(--space-2);
  padding: var(--space-1);
  border-radius: var(--radius-surface);
  border: 1px solid var(--color-border);
}

.import-file-field:focus-within .import-file-control {
  outline: 2px solid var(--color-primary);
}

.import-file-button {
  display: inline-grid;
  place-items: center;
  min-height: 32px;
  padding: 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-control);
  color: var(--color-on-control);
  font-size: var(--font-size-small);
}

.import-file-name {
  min-width: 0;
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import-file {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

@media (hover: hover) {
  .import-file-field:hover .import-file-button {
    background: var(--color-control-hover);
  }
}
@media (hover: none) {
  .import-file-field:active .import-file-button {
    background: var(--color-control-hover);
  }
}

.import-button {
  width: fit-content;
}

.confirm-actions {
  margin-top: var(--space-2);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}
</style>
