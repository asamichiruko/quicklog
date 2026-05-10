<script setup lang="ts">
import { ref } from "vue"

const text = ref("")

const emit = defineEmits<{
  submit: [text: string]
}>()

function onSubmit() {
  const value = text.value.trim()
  if (!value) return

  emit("submit", value)
  text.value = ""
}
</script>

<template>
  <form class="form" @submit.prevent="onSubmit">
    <label class="label" for="log-content">メモ</label>
    <textarea
      name="log-content"
      v-model="text"
      class="textarea"
      rows="3"
      placeholder="メモを書く"
    ></textarea>
    <button class="button-primary submit-button" type="submit">記録</button>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
}

.label {
  font-weight: var(--font-weight-medium);
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
