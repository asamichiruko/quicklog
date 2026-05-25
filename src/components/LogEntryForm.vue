<script setup lang="ts">
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
  text.value = ""
}

function onKeydownEnter(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault()
    onSubmit()
  }
}

function focus(options?: FocusOptions) {
  textarea.value?.focus(options)
}

defineExpose({ focus })
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="label" for="log-entry-form-content">メモ</label>
    <textarea
      ref="textarea"
      id="log-entry-form-content"
      v-model="text"
      class="textarea"
      rows="3"
      placeholder="メモを書く"
      @keydown.enter="onKeydownEnter"
    ></textarea>
    <button class="button-primary submit-button" type="submit">記録</button>
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
