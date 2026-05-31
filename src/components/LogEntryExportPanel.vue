<script setup lang="ts">
import type { ExportType } from "@/types"
import { ref } from "vue"

const emit = defineEmits<{
  export: [exportType: ExportType]
}>()

const exportType = ref<ExportType>("json")

function exportData() {
  emit("export", exportType.value)
}

function reset() {
  exportType.value = "json"
}

defineExpose({ reset })
</script>

<template>
  <div class="container">
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
</template>

<style lang="css" scoped>
.container {
  display: grid;
  gap: var(--space-2);
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
</style>
