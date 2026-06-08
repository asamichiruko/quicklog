<script setup lang="ts">
import { MAX_LOG_ENTRY_TEXT_BYTES } from "@/lib/sizeLimits"
import { ref } from "vue"

const text = ref("")
const textarea = ref<HTMLTextAreaElement | null>(null)

const emit = defineEmits<{
  submit: [text: string]
}>()

function onSubmit() {
  const value = text.value.trim()
  if (!value) return

  emit("submit", value)
}

function onKeydownEnter(e: KeyboardEvent) {
  if (e.isComposing) return

  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    onSubmit()
  }
}

function focus(options?: FocusOptions) {
  textarea.value?.focus(options)
}

function clear() {
  text.value = ""
}

defineExpose({ focus, clear })
</script>

<template>
  <form
    class="form"
    @submit.prevent="onSubmit"
  >
    <label
      class="label"
      for="log-entry-form-text"
    >メモ</label>
    <textarea
      id="log-entry-form-text"
      ref="textarea"
      v-model="text"
      name="text"
      class="textarea"
      rows="3"
      placeholder="メモを書く"
      required
      :maxlength="MAX_LOG_ENTRY_TEXT_BYTES"
      @keydown.enter="onKeydownEnter"
    />
    <button
      class="button-primary submit-button"
      type="submit"
    >
      記録
    </button>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
}

.label {
  font-weight: var(--font-weight-regular);
  margin-bottom: var(--space-1);
}

.textarea {
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

.textarea::placeholder {
  color: var(--color-text-subtle);
}

.submit-button {
  margin-top: var(--space-2);
  width: fit-content;
  justify-self: end;
}
</style>
