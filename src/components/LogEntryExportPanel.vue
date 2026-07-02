<script setup lang="ts">
import { SchemaValidationError, SizeError } from "@/errors"
import type { ExportType } from "@/types"
import { ref } from "vue"

const props = defineProps<{
  downloadLogEntries: (exportType: ExportType) => void
}>()

const exportType = ref<ExportType>("json")

type FeedbackKind = "success" | "error"

const feedbackKind = ref<FeedbackKind | null>(null)
const feedbackMessage = ref("")
const isLoading = ref(false)

function handleExport() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = true

  try {
    props.downloadLogEntries(exportType.value)

    feedbackMessage.value = "エクスポートに成功しました"
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getExportErrorMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function getExportErrorMessage(error: unknown) {
  if (error instanceof SizeError) {
    return "エクスポートに失敗しました。エクスポートするデータのサイズが大きすぎます"
  } else if (error instanceof SchemaValidationError) {
    return "エクスポートに失敗しました。データの一部が破損しています"
  } else {
    return "エクスポートに失敗しました"
  }
}

function reset() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = false
  exportType.value = "json"
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <p class="description">
      メモ全件をファイル形式を指定してダウンロードします。JSON
      形式のファイルは記録のインポートに使用できます。
    </p>
    <fieldset class="export-type-selector">
      <legend class="export-type-selector-legend">ファイル形式</legend>
      <label class="export-type-option">
        <input
          v-model="exportType"
          type="radio"
          name="export-type"
          value="json"
          class="export-type-radio"
        />
        <span class="export-type-label">JSON</span>
      </label>
      <label class="export-type-option">
        <input
          v-model="exportType"
          type="radio"
          name="export-type"
          value="markdown"
          class="export-type-radio"
        />
        <span class="export-type-label">Markdown</span>
      </label>
    </fieldset>
    <button
      :disabled="isLoading"
      class="button-primary export-button"
      type="button"
      @click="handleExport"
    >
      ファイルをダウンロード
    </button>
    <output v-if="feedbackMessage" class="feedback" :class="feedbackKind">
      {{ feedbackMessage }}
    </output>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-3);
}

.export-type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-3);
  border: none;
  margin: 0;
  padding: 0;
}

.export-type-selector-legend {
  width: 100%;
  margin: var(--space-2) 0;
  font-weight: var(--font-weight-bold);
}

.export-type-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--control-min-size);
  padding: 0 var(--space-3);
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

.feedback {
  display: block;
  width: fit-content;
  max-width: 100%;
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-surface);
  background: var(--color-output);
  color: var(--color-text-muted);
  font-size: var(--font-size-small);
}

.feedback.error {
  color: var(--color-text-error);
}
</style>
