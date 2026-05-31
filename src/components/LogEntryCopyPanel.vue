<script setup lang="ts">
import { addDays, getLocalDateKey, parseLocalDateKey } from "@/lib/date"
import { SchemaValidationError, SizeError } from "@/lib/errors"
import { formatLogEntriesAsMarkdown } from "@/lib/logEntryExport"
import type { LogEntry } from "@/types"
import { computed, ref } from "vue"

const startDate = ref<string>(getLocalDateKey(new Date()))
const endDate = ref<string>(getLocalDateKey(new Date()))
const resultMessage = ref<string>("")
const previewDetails = ref<HTMLDetailsElement | null>(null)

const props = defineProps<{
  logEntries: LogEntry[]
}>()

const targetLogEntries = computed<LogEntry[]>(() => {
  let start
  let endExclusive

  try {
    start = parseLocalDateKey(startDate.value).getTime()
    endExclusive = addDays(parseLocalDateKey(endDate.value), 1).getTime()
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

const targetCount = computed(() => {
  return targetLogEntries.value.length
})

const copyTextResult = computed<{ text: string; errorMessage: string }>(() => {
  if (targetCount.value === 0) {
    return { text: "", errorMessage: "" }
  }

  try {
    return {
      text: formatLogEntriesAsMarkdown(targetLogEntries.value),
      errorMessage: "",
    }
  } catch (error) {
    if (error instanceof SizeError) {
      return { text: "", errorMessage: "記録のサイズが大きすぎます" }
    }
    if (error instanceof SchemaValidationError) {
      return { text: "", errorMessage: "データが破損しています" }
    }
    return { text: "", errorMessage: "コピーテキストの生成に失敗しました" }
  }
})

const copyText = computed(() => {
  return copyTextResult.value.text
})

const canCopy = computed(() => {
  return targetCount.value > 0 && copyText.value !== ""
})

const selectionStatusMessage = computed(() => {
  let start
  let endExclusive

  try {
    start = parseLocalDateKey(startDate.value).getTime()
    endExclusive = addDays(parseLocalDateKey(endDate.value), 1).getTime()
  } catch {
    return "有効な日付を指定してください"
  }

  if (endExclusive <= start) return "開始日が終了日より後です"
  if (targetCount.value === 0) return "指定範囲に記録がありません"
  return `対象: ${targetCount.value} 件 / Markdown 形式`
})

const feedbackMessage = computed(() => {
  return copyTextResult.value.errorMessage || resultMessage.value
})

async function handleCopy() {
  if (!canCopy.value) return

  try {
    await window.navigator.clipboard.writeText(copyText.value)
    resultMessage.value = "クリップボードにコピーしました"
  } catch {
    resultMessage.value = "クリップボードにコピーできません。下の内容を手動でコピーしてください"
  }
}

function reset() {
  startDate.value = getLocalDateKey(new Date())
  endDate.value = getLocalDateKey(new Date())
  resultMessage.value = ""
  if (previewDetails.value) previewDetails.value.open = false
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
    <fieldset class="copy-period">
      <legend class="copy-period-legend">期間</legend>

      <label class="copy-date-field">
        <span class="copy-date-label">開始</span>
        <input
          id="copy-start-date"
          name="copy-start-date"
          class="date-input"
          type="date"
          v-model="startDate"
          required
        />
      </label>

      <label class="copy-date-field">
        <span class="copy-date-label">終了</span>
        <input
          id="copy-end-date"
          name="copy-end-date"
          class="date-input"
          type="date"
          v-model="endDate"
          required
        />
      </label>
    </fieldset>
    <output class="copy-selection-status" for="copy-start-date copy-end-date">
      {{ selectionStatusMessage }}
    </output>
    <button
      class="button-secondary copy-button"
      type="button"
      @click="handleCopy"
      :disabled="!canCopy"
    >
      クリップボードにコピー
    </button>
    <p v-if="feedbackMessage" class="feedback-message" role="status" aria-live="polite">
      {{ feedbackMessage }}
    </p>
    <details v-if="canCopy" class="copy-preview-panel" ref="previewDetails">
      <summary class="copy-preview-toggle">コピー内容</summary>
      <textarea
        class="copy-preview"
        name="copy-preview"
        readonly
        :value="copyText"
        aria-label="コピーする Markdown テキスト"
      ></textarea>
    </details>
  </div>
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-2);
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

.date-input {
  min-width: 0;
  min-height: var(--control-min-size);
  padding: var(--space-1);
}

.copy-selection-status {
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

.feedback-message {
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
  padding: var(--space-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-surface);
  background: var(--color-surface);
  color: var(--color-text);
}

.copy-preview-panel[open] .copy-preview {
  margin-top: var(--space-2);
}
</style>
