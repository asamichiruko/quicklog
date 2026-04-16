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
    <label class="label" for="quicklog-text"> メモ </label>
    <textarea
      id="quicklog-text"
      v-model="text"
      class="textarea"
      rows="4"
      placeholder="いま記録したいことは？"
    ></textarea>
    <button class="button" type="submit">保存</button>
  </form>
</template>

<style lang="css" scoped>
.form {
  display: grid;
  gap: 12px;
}

.label {
  font-weight: 600;
}

.textarea {
  width: 100%;
  resize: vertical;
  padding: 12px;
}

.button {
  width: fit-content;
  padding: 8px 16px;
  justify-self: end;
}
</style>
