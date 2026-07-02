<script setup lang="ts">
import { SchemaValidationError, SizeError } from "@/errors"
import type { QuicklogDataImportResult } from "@/types"
import { ref } from "vue"

const importFile = ref<File | null>(null)
const importFileInput = ref<HTMLInputElement | null>(null)
const feedbackMessage = ref("")
const isLoading = ref(false)

type FeedbackKind = "success" | "error" | null
const feedbackKind = ref<FeedbackKind>(null)

const props = defineProps<{
  importQuicklogDataFromFile: (file: File) => Promise<QuicklogDataImportResult>
}>()

function getImportErrorMessage(error: unknown) {
  if (error instanceof SizeError) {
    return "インポートに失敗しました。ファイルサイズが大きすぎます"
  } else if (error instanceof SyntaxError) {
    return "インポートに失敗しました。ファイル内容が JSON 形式であることを確認してください"
  } else if (error instanceof SchemaValidationError) {
    return "インポートに失敗しました。異常なデータが含まれています"
  } else {
    return "インポートに失敗しました"
  }
}

async function importSelectedFile(file: File): Promise<void> {
  if (!file) return

  feedbackMessage.value = ""
  feedbackKind.value = null

  if (file.type && file.type !== "application/json") {
    feedbackMessage.value =
      "ファイル形式が JSON ではありません。JSON 形式のファイルを選択してください"
    feedbackKind.value = "error"
    return
  }

  isLoading.value = true

  try {
    const result = await props.importQuicklogDataFromFile(file)

    feedbackMessage.value = `${result.addedCount} 件のメモを追加、${result.deletedCount} 件のメモを削除しました`
    feedbackKind.value = "success"
  } catch (error) {
    feedbackMessage.value = getImportErrorMessage(error)
    feedbackKind.value = "error"
  } finally {
    isLoading.value = false
  }
}

function handleImportButtonClick() {
  if (!importFile.value) return

  void importSelectedFile(importFile.value)
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

function reset() {
  feedbackMessage.value = ""
  feedbackKind.value = null
  isLoading.value = false
  importFile.value = null

  if (importFileInput.value) {
    importFileInput.value.value = ""
  }
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
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
        aria-label="インポートする JSON ファイル"
        aria-describedby="import-file-name"
        @change="handleImportFileChange"
      />
    </label>
    <button
      class="button-primary import-button"
      :disabled="!importFile || isLoading"
      type="button"
      @click="handleImportButtonClick"
    >
      ファイルをインポート
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

.import-description {
  margin: 0;
}

.import-file-field {
  display: grid;
  min-width: 0;
  gap: var(--space-2);
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
  gap: var(--space-3);
  padding: var(--space-2);
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
