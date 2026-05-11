<script setup lang="ts">
import { DEFAULT_SETTINGS } from "@/lib/settings"
import type { AppSettings, ExportType } from "@/types"
import { ref } from "vue"

const dialog = ref<HTMLDialogElement | null>(null)
const nextSettings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
const exportType = ref<ExportType>("json")

const props = defineProps<{
  settings: AppSettings
}>()

const emit = defineEmits<{
  save: [nextSettings: AppSettings]
  export: [exportType: ExportType]
}>()

function open() {
  if (!dialog.value || dialog.value.open) return

  nextSettings.value = { ...props.settings }

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
                name="showTimeDistributionStrip"
                v-model="nextSettings.showTimeDistributionStrip"
              />
              <span class="setting-label">記録時刻の分布グラフを表示</span>
            </label>
          </li>
        </ul>
      </section>
      <section class="section">
        <h3 class="section-heading">記録のエクスポート</h3>
        <div class="export-panel">
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
  min-height: 48px;
  cursor: pointer;
}

.setting-label {
  font-size: var(--font-size-md);
}

.setting-checkbox {
  width: 20px;
  height: 20px;
  accent-color: var(--color-primary);
}

.export-panel {
  display: grid;
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
  font-size: var(--font-size-md);
}

.export-button {
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
