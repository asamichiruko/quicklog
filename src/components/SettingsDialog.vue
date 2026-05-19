<script setup lang="ts">
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, ExportType } from "@/types"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const exportType = ref<ExportType>("json")
const importFile = ref<File | null>(null)

const props = defineProps<{
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
  importFile.value = null

  dialog.value?.showModal()
}

function saveAndClose() {
  emit("save", { ...nextSettings.value })
  close()
}

function close() {
  dialog.value?.close()
}

function exportData() {
  emit("export", exportType.value)
}

function handleImportFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files

  if (files && files.length > 0) {
    importFile.value = files[0]
  } else {
    importFile.value = null
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
  <dialog ref="dialog" class="dialog">
    <form method="dialog" class="dialog-form">
      <h2 class="dialog-heading">設定</h2>
      <section class="section">
        <h3 class="section-heading">表示</h3>
        <ul class="setting-items">
          <li>
            <label class="setting-item">
              <input
                class="setting-checkbox"
                type="checkbox"
                name="showDailySummary"
                v-model="nextSettings.showDailySummary"
              />
              <span class="setting-label">日別サマリーを表示</span>
            </label>
          </li>
        </ul>
      </section>
      <section class="section">
        <h3 class="section-heading">記録のエクスポート</h3>
        <div class="settings-panel">
          <fieldset class="export-type-selector">
            <legend class="export-type-selector-label">ファイル形式</legend>
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
      </section>
      <section class="section">
        <h3 class="section-heading">記録のインポート</h3>
        <div class="settings-panel">
          <p class="import-description">
            事前にエクスポートした JSON
            ファイルを読み込みます。既存のメモは残り、重複するものは取り込まれません。
          </p>
          <label class="import-file-label">
            <span class="import-file-label-text">インポートする JSON ファイルを選択</span>
            <input
              type="file"
              accept="application/json"
              name="import-file"
              class="import-file"
              @change="handleImportFileChange"
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
      </section>
      <menu class="confirm-actions">
        <button class="button-primary" type="button" @click="saveAndClose">設定を保存</button>
        <button class="button-secondary" type="button" @click="close">キャンセル</button>
      </menu>
    </form>
  </dialog>
</template>

<style lang="css" scoped>
.dialog {
  width: min(90vw, 480px);
  border: none;
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  padding: var(--space-2);
}

.dialog-form {
  display: grid;
  gap: var(--space-4);
}

.dialog-heading {
  margin: 0;
  padding: 0;
  color: var(--color-text);
  font-size: 1.5em;
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
  display: grid;
  min-width: 0;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
}

.export-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1) var(--space-2);
  border: none;
  margin: 0;
  padding: 0;
}

.export-type-selector-label {
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

.import-file-label {
  display: grid;
  min-width: 0;
  gap: var(--space-1);
}

.import-file-label-text {
  font-weight: var(--font-weight-bold);
}

.import-file {
  align-content: center;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  min-height: var(--control-min-size);
  padding: 0 var(--space-1);
  border-radius: var(--radius-surface);
  border: 1px solid var(--color-border);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.import-file::file-selector-button {
  font: inherit;
  font-size: var(--font-size-small);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  padding: 4px 12px;
  margin-right: var(--space-2);
  background: var(--color-control);
  color: var(--color-on-control);
}

@media (hover: hover) {
  .import-file::file-selector-button:hover {
    background: var(--color-control-hover);
  }
}
@media (hover: none) {
  .import-file::file-selector-button:active {
    background: var(--color-control-hover);
  }
}

.import-button {
  width: fit-content;
}

.confirm-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
}
</style>
