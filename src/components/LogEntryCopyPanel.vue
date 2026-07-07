<script setup lang="ts">
import { formatLogEntriesAsMarkdown } from "@/lib/createQuicklogExportFile"
import { addDays, getLocalDateKey, parseLocalDateKey } from "@/lib/date"
import { SchemaValidationError, SizeError } from "@/errors"
import type { LogEntry } from "@/types"
import { computed, ref, watch } from "vue"
import { isValidLogEntry } from "@/lib/logEntrySchema"

const props = defineProps<{
  logEntries: LogEntry[]
}>()

const startDate = ref<string>(getLocalDateKey(new Date()))
const endDate = ref<string>(getLocalDateKey(new Date()))
const copyText = ref("")
const feedbackMessage = ref("")

type CopySelectionState =
  | { status: "invalidDate" }
  | { status: "invalidRange" }
  | { status: "invalidData" }
  | { status: "empty" }
  | { status: "ready"; logEntries: LogEntry[] }

const copySelectionState = computed<CopySelectionState>(() => {
  let start: number
  let endExclusive: number

  try {
    start = parseLocalDateKey(startDate.value).getTime()
    endExclusive = addDays(parseLocalDateKey(endDate.value), 1).getTime()
  } catch {
    return { status: "invalidDate" }
  }

  if (endExclusive <= start) {
    return { status: "invalidRange" }
  }

  if (props.logEntries.some((logEntry) => !isValidLogEntry(logEntry))) {
    return { status: "invalidData" }
  }

  const targets = props.logEntries.filter((logEntry) => {
    const createdAt = new Date(logEntry.createdAt).getTime()
    return start <= createdAt && createdAt < endExclusive
  })

  if (targets.length === 0) {
    return { status: "empty" }
  }

  return { status: "ready", logEntries: targets }
})

const targetCount = computed(() => {
  if (copySelectionState.value.status === "ready") {
    return copySelectionState.value.logEntries.length
  } else {
    return 0
  }
})

const selectionStatusMessage = computed(() => {
  switch (copySelectionState.value.status) {
    case "invalidDate":
      return "有効な日付を指定してください"
    case "invalidRange":
      return "開始日が終了日より後です"
    case "invalidData":
      return "データが破損しています"
    case "empty":
      return "指定範囲に記録がありません"
    case "ready":
      return `対象: ${targetCount.value} 件 / Markdown 形式`
    default:
      return ""
  }
})

function getCopyTextErrorMessage(error: unknown) {
  if (error instanceof SizeError) {
    return "記録のサイズが大きすぎます"
  }
  if (error instanceof SchemaValidationError) {
    return "データが破損しています"
  }
  return "コピーテキストの生成に失敗しました"
}

const canPrepareCopyText = computed(() => {
  return copySelectionState.value.status === "ready"
})

function prepareCopyText() {
  copyText.value = ""
  feedbackMessage.value = ""

  if (copySelectionState.value.status !== "ready") return false

  try {
    copyText.value = formatLogEntriesAsMarkdown(copySelectionState.value.logEntries)
    return true
  } catch (error) {
    feedbackMessage.value = getCopyTextErrorMessage(error)
    return false
  }
}

async function handleCopy() {
  if (!canPrepareCopyText.value) return
  if (!prepareCopyText()) return

  try {
    await window.navigator.clipboard.writeText(copyText.value)
    feedbackMessage.value = "クリップボードにコピーしました"
  } catch {
    feedbackMessage.value = "クリップボードにコピーできません。下の内容を手動でコピーしてください"
  }
}

function refreshCopyText() {
  if (!prepareCopyText()) {
    feedbackMessage.value = ""
    copyText.value = ""
  }
}

watch(copySelectionState, refreshCopyText, { immediate: true })

function reset() {
  startDate.value = getLocalDateKey(new Date())
  endDate.value = getLocalDateKey(new Date())
  refreshCopyText()
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <p class="description">期間を指定して Markdown 形式のメモをクリップボードにコピーします。</p>
    <fieldset class="copy-period">
      <label class="copy-date-field">
        <span class="copy-date-label">開始日</span>
        <input
          id="copy-start-date"
          v-model="startDate"
          name="copy-start-date"
          class="date-input"
          type="date"
          required
        />
      </label>

      <label class="copy-date-field">
        <span class="copy-date-label">終了日</span>
        <input
          id="copy-end-date"
          v-model="endDate"
          name="copy-end-date"
          class="date-input"
          type="date"
          required
        />
      </label>
    </fieldset>
    <output class="copy-selection-status" for="copy-start-date copy-end-date">
      {{ selectionStatusMessage }}
    </output>
    <button
      class="button-primary copy-button"
      type="button"
      :disabled="targetCount === 0"
      @click="handleCopy"
    >
      クリップボードにコピー
    </button>
    <p v-if="feedbackMessage" class="feedback-message" role="status" aria-live="polite">
      {{ feedbackMessage }}
    </p>
    <details v-if="copyText" class="copy-preview-panel">
      <summary class="copy-preview-toggle">コピー内容を確認</summary>
      <textarea
        class="copy-preview"
        name="copy-preview"
        readonly
        :value="copyText"
        aria-label="コピーする Markdown テキスト"
      />
    </details>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-3);
}

.description {
  margin: 0;
  padding: 0;
}

.copy-period {
  display: grid;
  gap: var(--space-3);
  border: none;
  margin: 0;
  padding: 0;
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

.date-input {
  min-width: 0;
  min-height: var(--control-min-size);
  width: fit-content;
  padding: var(--space-2);
}

.copy-selection-status {
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

.copy-button {
  width: fit-content;
}

.feedback-message {
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

.copy-preview-toggle {
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
  padding: var(--space-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
}

.copy-preview-panel[open] .copy-preview {
  margin-top: var(--space-3);
}
</style>
